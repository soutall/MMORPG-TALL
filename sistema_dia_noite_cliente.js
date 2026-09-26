// ============================================================================
// SISTEMA DE CICLO DIA E NOITE - CLIENTE (v1.52.0)
// Renderização de iluminação dinâmica, nebulosidade e relógio do minimapa.
// ============================================================================

(function (global) {
    'use strict';

    var _luzCanvas = null;
    var _luzCtx = null;

    /**
     * Atualiza o badge do relógio posicionado ao lado do minimapa.
     * @param {object} tm Dados do tempo recebidos do servidor no world_update
     */
    function atualizarRelogioMinimapa(tm) {
        if (!tm) return;
        var txt = document.getElementById('relogio-texto');
        var ico = document.getElementById('relogio-icone');
        var badge = document.getElementById('minimap-relogio');

        if (txt && txt.innerText !== tm.horaFormatada) {
            txt.innerText = tm.horaFormatada;
        }
        if (ico && ico.innerText !== tm.icone) {
            ico.innerText = tm.icone;
        }

        if (badge) {
            var faseClass = 'clock-' + (tm.fase || 'dia');
            if (!badge.classList.contains(faseClass)) {
                badge.classList.remove('clock-dia', 'clock-entardecer', 'clock-noite', 'clock-amanhecer', 'clock-madrugada');
                badge.classList.add(faseClass);
            }
            var nomeFase = tm.fase === 'dia' ? 'Dia' : (tm.fase === 'madrugada' ? 'Madrugada (100% Breu Total)' : (tm.fase === 'noite' ? 'Noite' : (tm.fase === 'entardecer' ? 'Entardecer' : 'Amanhecer')));
            badge.title = 'Horário do Mundo: ' + tm.horaFormatada + ' (' + nomeFase + ')\nFogueiras e tochas iluminam seu caminho à noite!';
        }
    }

    /**
     * Disparado ao clicar no relógio do minimapa.
     */
    function notificarCicloDiaNoite() {
        var tm = global.tempoMundo;
        if (!tm) return;
        var nomeFase = tm.fase === 'dia' ? 'Pleno Dia ☀️' : (tm.fase === 'madrugada' ? 'Madrugada Profunda 🌑 (100% Breu Total)' : (tm.fase === 'noite' ? 'Noite 🌙' : (tm.fase === 'entardecer' ? 'Entardecer 🌆' : 'Amanhecer 🌅')));
        var detalhe = (tm.fase === 'dia' || tm.fase === 'amanhecer') 
            ? 'O sol ilumina o mundo. O entardecer começará às 18:00h.' 
            : (tm.fase === 'madrugada' ? 'Breu de 100%! Fora da luz é impossível enxergar o mapa!' : 'Escuridão cobre a terra (visão reduzida em até 70%). Fogueiras e tochas são vitais!');
        
        if (global.floatingTexts && typeof global.meuX === 'number' && typeof global.meuY === 'number') {
            global.floatingTexts.push({
                x: global.meuX + 12,
                y: global.meuY - 35,
                text: '⏰ ' + tm.horaFormatada + ' — ' + nomeFase,
                color: tm.fase === 'madrugada' ? '#d1b3ff' : (tm.fase === 'noite' ? '#9ee8ff' : (tm.fase === 'entardecer' ? '#ffaa55' : '#ffd966')),
                alpha: 1.0
            });
        }
    }

    /**
     * Retorna se as fontes de luz do ambiente (lâmpadas, holofotes, lamparinas, tochas)
     * devem estar ligadas no momento do ciclo.
     * Regra oficial: Acesas a partir das 19:00h até as 06:00 da manhã. Apagadas durante o dia.
     * @param {object} [tm] Tempo do mundo (opcional, consulta global.tempoMundo por padrão)
     * @returns {boolean}
     */
    function isLuzMapaAtiva(tm) {
        var t = tm || global.tempoMundo;
        if (!t || typeof t.horaDecimal !== 'number') return true;
        var h = t.horaDecimal;
        return (h >= 19.0 || h < 6.0);
    }

    /**
     * Retorna o fator de intensidade de luz (0.0 a 1.0) para transição contínua.
     * - 19:00 às 06:00: 1.0 (Totalmente acesa)
     * - 18:50 às 19:00: 0.0 -> 1.0 (Acendendo suavemente ao anoitecer)
     * - 06:00 às 06:05: 1.0 -> 0.0 (Apagando ao amanhecer)
     * - 06:05 às 18:50: 0.0 (Totalmente apagada de dia)
     * @param {object} [tm]
     * @returns {number}
     */
    function obterFatorLuzDiaNoite(tm) {
        var t = tm || global.tempoMundo;
        if (!t || typeof t.horaDecimal !== 'number') return 1.0;
        var h = t.horaDecimal;
        if (h >= 19.0 || h < 6.0) return 1.0;
        if (h >= 18.83 && h < 19.0) {
            return (h - 18.83) / (19.0 - 18.83);
        }
        if (h >= 6.0 && h <= 6.08) {
            return Math.max(0, 1.0 - ((h - 6.0) / 0.08));
        }
        return 0.0;
    }

    /**
     * Verifica se o tipo ou efeito corresponde a uma fonte de luz artificial/fogo.
     * @param {string} tipo
     * @returns {boolean}
     */
    function isEfeitoLuz(tipo) {
        if (!tipo) return false;
        var t = String(tipo).toLowerCase();
        return (t === 'lampada' || t === 'holofote' || t === 'tocha' || t === 'fogo' || t === 'fogueira' || t === 'brasa' || t === 'lamparina' || t === 'poste' || t === 'estaca_flamejante');
    }

    /**
     * Renderizador principal do ciclo dia/noite com iluminação dinâmica.
     * Chamado após a renderização do mundo do jogo e antes dos elementos fixos de HUD.
     */
    function renderizarCicloDiaNoite(ctx, camX, camY, shakeX, shakeY, zoom) {
        var tm = global.tempoMundo;
        if (!tm) return;
        var escuridao = tm.escuridao || 0;

        // Otimização crucial: Durante pleno dia (escuridao <= 0.005), nada é executado. 0ms overhead!
        if (escuridao <= 0.005) return;

        var w = ctx.canvas.width;
        var h = ctx.canvas.height;
        if (w <= 0 || h <= 0) return;

        if (!_luzCanvas) {
            _luzCanvas = document.createElement('canvas');
            _luzCtx = _luzCanvas.getContext('2d');
        }
        if (_luzCanvas.width !== w || _luzCanvas.height !== h) {
            _luzCanvas.width = w;
            _luzCanvas.height = h;
        }

        var luzCtx = _luzCtx;
        luzCtx.clearRect(0, 0, w, h);

        // 1. Colorimetria atmosférica contínua
        var r = 5, g = 8, b = 22; // Noite padrão (índigo escuro)
        var fase = tm.fase;
        var hDec = tm.horaDecimal || 0;

        if (fase === 'entardecer') {
            // Transição 18:00 -> 19:00: do dourado/âmbar avermelhado para o azul índigo
            var p = Math.max(0, Math.min(1, (hDec - 18.0) / 1.0));
            r = Math.round(38 * (1 - p) + 5 * p);
            g = Math.round(14 * (1 - p) + 8 * p);
            b = Math.round(8 * (1 - p) + 22 * p);
        } else if (fase === 'madrugada' || escuridao > 0.70) {
            // Madrugada (00:00 às 04:00): Preto absoluto breu profundo
            var pMad = Math.min(1, Math.max(0, (escuridao - 0.70) / 0.30));
            r = Math.round(5 * (1 - pMad) + 2 * pMad);
            g = Math.round(8 * (1 - pMad) + 2 * pMad);
            b = Math.round(22 * (1 - pMad) + 6 * pMad);
        } else if (fase === 'amanhecer') {
            // Transição 05:00 -> 06:00: do índigo para o rosa/dourado do amanhecer
            var p = Math.max(0, Math.min(1, (hDec - 5.0) / 1.0));
            r = Math.round(5 * (1 - p) + 30 * p);
            g = Math.round(8 * (1 - p) + 18 * p);
            b = Math.round(22 * (1 - p) + 24 * p);
        }

        // Camada principal de escuridão (até 100% de perda de visão na madrugada de 00h às 04h)
        luzCtx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + Math.min(1.0, escuridao).toFixed(3) + ')';
        luzCtx.fillRect(0, 0, w, h);

        // Vinheta Periférica e Efeito de Nebulosidade durante a Noite
        if (escuridao >= 0.30) {
            // Vinheta escura nas bordas do campo de visão
            var vGrad = luzCtx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.32, w / 2, h / 2, Math.max(w, h) * 0.72);
            vGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
            vGrad.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',' + (escuridao * 0.22).toFixed(3) + ')');
            luzCtx.fillStyle = vGrad;
            luzCtx.fillRect(0, 0, w, h);

            // Nebulosidade sutil / névoa noturna em suave deriva
            var agora = Date.now();
            var mistTempo = agora * 0.00015;
            var mistAlpha = Math.min(0.14, (escuridao - 0.25) * 0.28);
            if (mistAlpha > 0) {
                for (var mi = 0; mi < 3; mi++) {
                    var mx = ((mistTempo * 70 + mi * (w * 0.45)) % (w + 400)) - 200;
                    var my = ((0.25 + mi * 0.28 + Math.sin(mistTempo + mi * 2) * 0.08) * h);
                    var mr = Math.max(w, h) * 0.44;
                    var mGrad = luzCtx.createRadialGradient(mx, my, mr * 0.1, mx, my, mr);
                    mGrad.addColorStop(0, 'rgba(12, 18, 38, ' + mistAlpha.toFixed(3) + ')');
                    mGrad.addColorStop(1, 'rgba(12, 18, 38, 0)');
                    luzCtx.fillStyle = mGrad;
                    luzCtx.beginPath();
                    luzCtx.arc(mx, my, mr, 0, Math.PI * 2);
                    luzCtx.fill();
                }
            }
        }

        // 2. RECORTAR AS FONTES DE LUZ (destination-out: fura a escuridão revelando o mundo nítido)
        luzCtx.globalCompositeOperation = 'destination-out';

        function paraTela(wx, wy) {
            return {
                x: (wx - camX + shakeX) * zoom,
                y: (wy - camY + shakeY) * zoom
            };
        }

        function cortarLuz(sx, sy, raio, forca, nucleo) {
            if (sx < -raio || sx > w + raio || sy < -raio || sy > h + raio) return;
            var rReal = Math.max(10, raio * zoom);
            var f = Math.min(1.0, forca || 1.0);
            var n = nucleo || 0.25;
            var grad = luzCtx.createRadialGradient(sx, sy, rReal * n, sx, sy, rReal);
            grad.addColorStop(0, 'rgba(0, 0, 0, ' + f.toFixed(3) + ')');
            grad.addColorStop(0.55, 'rgba(0, 0, 0, ' + (f * 0.70).toFixed(3) + ')');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            luzCtx.fillStyle = grad;
            luzCtx.beginPath();
            luzCtx.arc(sx, sy, rReal, 0, Math.PI * 2);
            luzCtx.fill();
        }

        var agoraLuz = Date.now();
        var pulsoFogo = Math.sin(agoraLuz / 160) * 4 + Math.cos(agoraLuz / 90) * 3;
        var fatorLuz = obterFatorLuzDiaNoite(tm);
        var cMap = global.currentMap || 'green';

        // A. Luz pessoal do Herói (lanterna pessoal que garante visibilidade ao redor do personagem)
        if (typeof global.meuX === 'number' && typeof global.meuY === 'number') {
            var pLocal = paraTela(global.meuX + 12, global.meuY + 16);
            // Na madrugada de breu total (00h às 04h), a lanterna pessoal fica concentrada ao redor do herói (~140px)
            var raioHeroi = (fase === 'madrugada' || escuridao >= 0.95) ? 140 : 160;
            cortarLuz(pLocal.x, pLocal.y, raioHeroi + pulsoFogo * 0.5, 1.0, 0.35);
        }

        // B. Luz de outros jogadores visíveis
        if (global.todosJogadores) {
            for (var pid in global.todosJogadores) {
                if (pid === global.meuId) continue;
                var pj = global.todosJogadores[pid];
                if (!pj) continue;
                var pt = paraTela(pj.x + 12, pj.y + 16);
                cortarLuz(pt.x, pt.y, 120 + pulsoFogo * 0.4, 0.88, 0.22);
            }
        }

        // C. Fogueiras do mapa principal (Campo Verde / Acampamentos Temáticos)
        var acamps = global.ACAMPAMENTOS_MAPA || (typeof ACAMPAMENTOS !== 'undefined' ? ACAMPAMENTOS : null);
        if (acamps && (cMap === 'green' || !global.currentMap)) {
            for (var ai = 0; ai < acamps.length; ai++) {
                var fog = acamps[ai].fogueira;
                if (fog) {
                    var pf = paraTela(fog.x, fog.y);
                    cortarLuz(pf.x, pf.y, 250 + pulsoFogo * 1.6, 1.0, 0.26);
                }
            }
        }

        // D. Fogueiras do Deserto
        if (global.desertoAcampamentos && cMap === 'desert') {
            for (var di = 0; di < global.desertoAcampamentos.length; di++) {
                var dcp = global.desertoAcampamentos[di];
                if (dcp) {
                    var pd = paraTela(dcp.x + 35, dcp.y + 70);
                    cortarLuz(pd.x, pd.y, 240 + pulsoFogo * 1.6, 1.0, 0.26);
                }
            }
        }

        // E. Fogueira da Zona Zero
        if (cMap === 'zonazero') {
            var pz = paraTela(74210, 1060);
            cortarLuz(pz.x, pz.y, 240 + pulsoFogo * 1.6, 1.0, 0.26);
        }

        // F. Tochas e braseiros do Castelo
        if (global.casteloLuzes && cMap === 'castelo') {
            for (var ci = 0; ci < global.casteloLuzes.length; ci++) {
                var lz = global.casteloLuzes[ci];
                if (lz) {
                    var pcl = paraTela(lz.cx, lz.cy);
                    var rCast = (lz.tipo === 'braseiro' ? 210 : 145) + pulsoFogo;
                    cortarLuz(pcl.x, pcl.y, rCast, 0.95, 0.24);
                }
            }
        }

        // G. Objetos do Editor de Mapa (fogueiras, tochas, lamparinas, lâmpadas, postes e efeitos anexados)
        if (fatorLuz > 0 && global.mapaObjetos && global.mapaObjetos.length) {
            for (var oi = 0; oi < global.mapaObjetos.length; oi++) {
                var obj = global.mapaObjetos[oi];
                if (!obj || obj.mapa !== cMap) continue;
                var tObj = obj.tipo;
                var efObj = obj.efeito;
                if (tObj === 'fogueira' || tObj === 'fogo' || efObj === 'fogo') {
                    var pObj = paraTela(obj.x + (obj.w || 40) / 2, obj.y + (obj.h || 34) / 2);
                    cortarLuz(pObj.x, pObj.y, 240 + pulsoFogo * 1.6, 1.0 * fatorLuz, 0.26);
                } else if (tObj === 'tocha' || efObj === 'tocha') {
                    var pObj = paraTela(obj.x + (obj.w || 22) / 2, obj.y + (obj.h || 48) / 2);
                    cortarLuz(pObj.x, pObj.y, 150 + pulsoFogo, 0.92 * fatorLuz, 0.22);
                } else if (tObj === 'lamparina' || tObj === 'lampada' || tObj === 'poste' || efObj === 'lampada' || efObj === 'holofote') {
                    var pObj = paraTela(obj.x + (obj.w || 30) / 2, obj.y + (obj.h || 40) / 2);
                    cortarLuz(pObj.x, pObj.y, 175 + pulsoFogo * 0.6, 0.96 * fatorLuz, 0.28);
                } else if (tObj === 'estaca_flamejante') {
                    var pObj = paraTela(obj.x + (obj.w || 24) / 2, obj.y + (obj.h || 50) / 2);
                    cortarLuz(pObj.x, pObj.y, 145 + pulsoFogo, 0.90 * fatorLuz, 0.22);
                }
            }
        }

        // H. Efeitos de Mapa VFX (global.vfxMapa - lâmpadas, holofotes, tochas, fogueiras)
        if (fatorLuz > 0 && global.vfxMapa && global.vfxMapa.length) {
            for (var vi = 0; vi < global.vfxMapa.length; vi++) {
                var vf = global.vfxMapa[vi];
                if (!vf) continue;
                if (vf.mapa && vf.mapa !== cMap) continue;
                var tVf = vf.tipo;
                if (tVf === 'fogo' || tVf === 'fogueira') {
                    var pv = paraTela(vf.x, vf.y);
                    var rF = Math.max(180, (vf.raio || 80) * (vf.escala || 1) * 2.4);
                    cortarLuz(pv.x, pv.y, rF + pulsoFogo * 1.6, 1.0 * fatorLuz, 0.26);
                } else if (tVf === 'tocha' || tVf === 'brasa') {
                    var pv = paraTela(vf.x, vf.y);
                    var rT = Math.max(130, (vf.raio || 80) * (vf.escala || 1) * 1.9);
                    cortarLuz(pv.x, pv.y, rT + pulsoFogo, 0.90 * fatorLuz, 0.20);
                } else if (tVf === 'lampada' || tVf === 'holofote') {
                    var pv = paraTela(vf.x, vf.y);
                    var rL = Math.max(140, (vf.raio || 80) * (vf.escala || 1) * 2.2);
                    cortarLuz(pv.x, pv.y, rL + pulsoFogo * 0.6, 0.96 * fatorLuz, 0.28);
                } else if (tVf === 'cristais' || tVf === 'portal') {
                    var pv = paraTela(vf.x, vf.y);
                    cortarLuz(pv.x, pv.y, 145 + pulsoFogo * 0.8, 0.88 * fatorLuz, 0.20);
                }
            }
        }

        // I. Postes / Lâmpadas da Cidade Davahl (Three.js / 2D)
        if (fatorLuz > 0 && cMap === 'cidade' && global.CIDADE_LAMPADAS && global.CIDADE_LAMPADAS.length) {
            for (var li = 0; li < global.CIDADE_LAMPADAS.length; li++) {
                var cl = global.CIDADE_LAMPADAS[li];
                if (cl) {
                    var plm = paraTela(cl.x, cl.y);
                    cortarLuz(plm.x, plm.y, 160 + pulsoFogo * 0.6, 0.94 * fatorLuz, 0.26);
                }
            }
        }

        // Restaurar modo normal do offscreen
        luzCtx.globalCompositeOperation = 'source-over';

        // 3. Aplicar o véu de escuridão com os buracos de luz no canvas principal
        ctx.drawImage(_luzCanvas, 0, 0);

        // 4. Glow caloroso sobre fogueiras, tochas e lâmpadas (iluminação quente vibrante na escuridão)
        if (escuridao >= 0.25) {
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            function desenharHaloQuente(sx, sy, raio, cor) {
                if (sx < -raio || sx > w + raio || sy < -raio || sy > h + raio) return;
                var rH = raio * zoom;
                var gH = ctx.createRadialGradient(sx, sy, 0, sx, sy, rH);
                gH.addColorStop(0, cor || 'rgba(255, 150, 40, 0.22)');
                gH.addColorStop(0.5, 'rgba(255, 120, 20, 0.08)');
                gH.addColorStop(1, 'rgba(255, 100, 0, 0)');
                ctx.fillStyle = gH;
                ctx.beginPath();
                ctx.arc(sx, sy, rH, 0, Math.PI * 2);
                ctx.fill();
            }

            // Halos de fogueiras de acampamento
            if (acamps && (cMap === 'green' || !global.currentMap)) {
                for (var ai = 0; ai < acamps.length; ai++) {
                    var fog = acamps[ai].fogueira;
                    if (fog) {
                        var pf = paraTela(fog.x, fog.y);
                        desenharHaloQuente(pf.x, pf.y, 180 + pulsoFogo * 2, 'rgba(255, 160, 45, 0.20)');
                    }
                }
            }

            // Halos de lâmpadas acesas (a partir das 19:00h até as 06:00h)
            if (fatorLuz > 0.05) {
                // Halos de lâmpadas VFX do mapa
                if (global.vfxMapa && global.vfxMapa.length) {
                    for (var vi2 = 0; vi2 < global.vfxMapa.length; vi2++) {
                        var vf2 = global.vfxMapa[vi2];
                        if (!vf2) continue;
                        if (vf2.mapa && vf2.mapa !== cMap) continue;
                        if (vf2.tipo === 'lampada' || vf2.tipo === 'holofote') {
                            var pvl = paraTela(vf2.x, vf2.y);
                            var rLampGlow = Math.max(90, (vf2.raio || 80) * (vf2.escala || 1) * 1.5);
                            desenharHaloQuente(pvl.x, pvl.y, rLampGlow, 'rgba(255, 215, 105, ' + (0.24 * fatorLuz).toFixed(3) + ')');
                        } else if (vf2.tipo === 'fogo' || vf2.tipo === 'fogueira' || vf2.tipo === 'tocha') {
                            var pvf = paraTela(vf2.x, vf2.y);
                            var rFogoGlow = Math.max(100, (vf2.raio || 80) * (vf2.escala || 1) * 1.6);
                            desenharHaloQuente(pvf.x, pvf.y, rFogoGlow + pulsoFogo * 1.5, 'rgba(255, 150, 40, ' + (0.22 * fatorLuz).toFixed(3) + ')');
                        }
                    }
                }

                // Halos de lamparinas do editor de mapa
                if (global.mapaObjetos && global.mapaObjetos.length) {
                    for (var oi2 = 0; oi2 < global.mapaObjetos.length; oi2++) {
                        var obj2 = global.mapaObjetos[oi2];
                        if (!obj2 || obj2.mapa !== cMap) continue;
                        if (obj2.tipo === 'lamparina' || obj2.tipo === 'lampada' || obj2.tipo === 'poste' || obj2.efeito === 'lampada') {
                            var pol = paraTela(obj2.x + (obj2.w || 30) / 2, obj2.y + (obj2.h || 40) / 2);
                            desenharHaloQuente(pol.x, pol.y, 110, 'rgba(255, 215, 105, ' + (0.22 * fatorLuz).toFixed(3) + ')');
                        }
                    }
                }

                // Halos dos postes de Davahl
                if (cMap === 'cidade' && global.CIDADE_LAMPADAS && global.CIDADE_LAMPADAS.length) {
                    for (var li2 = 0; li2 < global.CIDADE_LAMPADAS.length; li2++) {
                        var cl2 = global.CIDADE_LAMPADAS[li2];
                        if (cl2) {
                            var plm2 = paraTela(cl2.x, cl2.y);
                            desenharHaloQuente(plm2.x, plm2.y, 115 + pulsoFogo * 0.5, 'rgba(255, 215, 105, ' + (0.22 * fatorLuz).toFixed(3) + ')');
                        }
                    }
                }
            }

            ctx.restore();
        }
    }

    // Exportação para o ecossistema global
    global.atualizarRelogioMinimapa = atualizarRelogioMinimapa;
    global.notificarCicloDiaNoite = notificarCicloDiaNoite;
    global.renderizarCicloDiaNoite = renderizarCicloDiaNoite;
    global.isLuzMapaAtiva = isLuzMapaAtiva;
    global.obterFatorLuzDiaNoite = obterFatorLuzDiaNoite;
    global.isEfeitoLuz = isEfeitoLuz;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            atualizarRelogioMinimapa: atualizarRelogioMinimapa,
            notificarCicloDiaNoite: notificarCicloDiaNoite,
            renderizarCicloDiaNoite: renderizarCicloDiaNoite,
            isLuzMapaAtiva: isLuzMapaAtiva,
            obterFatorLuzDiaNoite: obterFatorLuzDiaNoite,
            isEfeitoLuz: isEfeitoLuz
        };
    }

})(typeof window !== 'undefined' ? window : globalThis);
