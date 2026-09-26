// ============================================================================
// dash-vfx.js — DASH v2 (v1.50.0): efeitos visuais do dash
//
// Separado do index.html de propósito: o index já passa de 500KB e este
// arquivo é 100% cosmético (nenhuma regra de jogo mora aqui). Se ele falhar
// para carregar, o dash continua funcionando — só não há efeito.
//
// ORDEM DE DESENHO IMPORTANTE
//   VFX (atrás) → escudo do guerreiro (frente)
// O escudo é desenhado por último para ficar SEMPRE visível na frente do
// personagem — o corpo do Guerreiro já desenha o escudo real na mão
// (classes/guerreiro.js); aqui só entra o arco de proteção e o baque.
// ============================================================================
(function () {
    'use strict';

    const vfx = [];        // efeitos transitórios

    // ------------------------------------------------------------------
    // API: called pelo index.html
    // ------------------------------------------------------------------
    window.dashAdicionarVfxReal = function (tipo, x, y, ang, extra) {
        vfx.push(Object.assign({ tipo: tipo, x: x, y: y, ang: ang || 0, t: 0, dur: 520 }, extra || {}));
        if (vfx.length > 60) vfx.shift();   // teto de segurança
    };

    // Evento vindo do SERVIDOR (action_dash / action_dash_fim / etc).
    // Para o teleporte desenhamos em DUAS pontas: o sumiço (origem) e o
    //aparicao (destino). Sem o par, o char "pisca" em vez de teleportar.
    window.dashAdicionarVfxApos = function (dados) {
        if (dados.tipo === 'curandeiro_escudo_area') {
            // O domo da Curandeira dura o escudo INTEIRO (10s), não 0,9s: é
            // assim que o jogador enxerga que ainda está protegido.
            const dur = Math.max(900, Math.min(10000, dados.duracaoMs || 900));
            vfx.push({ tipo: 'curandeiro_escudo_area', x: dados.x, y: dados.y, t: 0, dur: dur, raio: 170 });
            return;
        }
        if (dados.tipo === 'curandeiro_escudo_area_carga') {
            vfx.push({ tipo: 'curandeiro_escudo_area_carga', x: dados.x, y: dados.y, t: 0, dur: 700, raio: dados.raio || 160 });
            return;
        }
        if (dados.tipo === 'summoner_pet_teleporte') {
            vfx.push({ tipo: 'summoner_pet_teleporte', x: dados.x, y: dados.y, t: 0, dur: 480 });
            return;
        }
        if (dados.vfx) {
            const ehTeleporte = (dados.x0 === undefined);
            if (ehTeleporte) {
                // Teleporte: origem e destino (o cliente aplicou a predicao)
                vfx.push({ tipo: dados.vfx, x: dados.x, y: dados.y, ang: dados.angulo || 0, t: 0, dur: 620, chegada: true });
            } else {
                // Corrida/investida/arranque: o rastro segue o caminho
                vfx.push({ tipo: dados.vfx, x: dados.x0, y: dados.y0, x0: dados.x0, y0: dados.y0, x1: dados.x1, y1: dados.y1, ang: dados.angulo || 0, t: 0, dur: dados.duracaoMs || 400, caminho: true });
            }
        }
    };

    // ------------------------------------------------------------------
    // ESCUDO DO GUERREIRO (v1.50.0)
    //
    // O escudo NÃO é desenhado aqui: quem desenha é o próprio personagem
    // (classes/guerreiro.js), com a placa de verdade, na mão e virado para a
    // espada. Aqui fica só a leitura de "para onde eu protejo": o arco de
    // bloqueio e uma borda de energia na placa. Sem duplicar o escudo, o
    // jogador vê UM escudo só.
    // ------------------------------------------------------------------
    window.desenharEscudoGuerreiro = function (ctx) {
        if (window.meuX === undefined) return;
        // o ângulo vivo é o da ESPADA (window.meuAngulo): o servidor reenvia
        // `action_guerreiro_escudo_ang` quando ele muda, e aqui a interpolação
        // local mantém a resposta instantânea entre dois pacotes.
        const ang = window.escudoGuerreiroAng || 0;
        const alvo = window.meuAngulo || 0;
        const dif = Math.atan2(Math.sin(alvo - ang), Math.cos(alvo - ang));
        const angSuave = ang + dif * 0.35;   // suaviza sem "puxar" o arco
        const ox = window.meuX + 12, oy = window.meuY + 16;
        const pulso = 0.5 + 0.5 * Math.sin(Date.now() / 140);
        const meiaArco = 0.575;   // = arco/2 (66° de largura) — igual ao servidor

        ctx.save();
        ctx.translate(ox, oy);
        ctx.rotate(angSuave);

        // arco protegido: chão radial suave (é a zona de -70% de dano)
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, 62, -meiaArco, meiaArco);
        ctx.closePath();
        const g = ctx.createRadialGradient(0, 0, 12, 0, 0, 62);
        g.addColorStop(0, 'rgba(52,152,219,0)');
        g.addColorStop(1, 'rgba(52,152,219,' + (0.20 + 0.08 * pulso) + ')');
        ctx.fillStyle = g;
        ctx.fill();

        // borda externa do arco: dá a leitura de "cobertura" sem virar um blob
        ctx.beginPath();
        ctx.arc(0, 0, 62, -meiaArco, meiaArco);
        ctx.strokeStyle = 'rgba(133,193,233,' + (0.30 + 0.20 * pulso) + ')';
        ctx.lineWidth = 2;
        ctx.stroke();

        // nervuras de energia dentro do arco (3 raios, pulsando)
        ctx.strokeStyle = 'rgba(174,214,241,' + (0.16 + 0.12 * pulso) + ')';
        ctx.lineWidth = 1.5;
        for (let k = -1; k <= 1; k++) {
            const a = (meiaArco / 2) * k;
            ctx.beginPath();
            ctx.moveTo(18, 0);
            ctx.lineTo(Math.cos(a) * 60, Math.sin(a) * 60);
            ctx.stroke();
        }
        ctx.restore();
    };

    // ------------------------------------------------------------------
    // VFX TRANSITÓRIOS
    // Cada tipo tem seu desenho; o avanço é por `t / dur` (0..1).
    // ------------------------------------------------------------------
    window.desenharDashVfx = function (ctx) {
        const agora = Date.now();
        for (let i = vfx.length - 1; i >= 0; i--) {
            const e = vfx[i];
            e.t += 16;
            const p = e.t / e.dur;
            if (p >= 1.2) { vfx.splice(i, 1); continue; }
            const fade = Math.max(0, 1 - p);

            ctx.save();

            if (e.tipo === 'mago_teleporte') {
                // Anel roxo + partículas subindo (surgimento arcano)
                ctx.translate(e.x, e.y);
                const r = 12 + p * 62;
                ctx.beginPath();
                ctx.arc(0, 0, r, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(155,89,182,' + (fade * 0.9) + ')';
                ctx.lineWidth = 6 * fade + 1;
                ctx.stroke();
                for (let k = 0; k < 8; k++) {
                    const a = (k / 8) * Math.PI * 2 + p * 2;
                    const rr = r * 0.75;
                    ctx.beginPath();
                    ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr * 0.5, 4 * fade + 1, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(214,112,255,' + fade + ')';
                    ctx.fill();
                }
            } else if (e.tipo === 'summoner_teleporte') {
                // Portal verde-arroxeado do Summoner
                ctx.translate(e.x, e.y);
                const r = 10 + p * 58;
                ctx.beginPath();
                ctx.ellipse(0, 0, r, r * 0.55, 0, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(39,174,96,' + (fade * 0.9) + ')';
                ctx.lineWidth = 5 * fade + 1;
                ctx.stroke();
                ctx.beginPath();
                ctx.ellipse(0, 0, r * 0.6, r * 0.33, 0, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(46,204,113,' + (fade * 0.35) + ')';
                ctx.fill();
            } else if (e.tipo === 'buraco_necro') {
                // Buraco NECRÓTICO: disco preto com anel roxo girando
                ctx.translate(e.x, e.y);
                const r = 8 + p * 48;
                ctx.save();
                ctx.rotate(p * 3);
                for (let k = 0; k < 3; k++) {
                    ctx.beginPath();
                    ctx.ellipse(0, 0, r, r * 0.42, (k / 3) * Math.PI, 0, Math.PI * 2);
                    ctx.strokeStyle = 'rgba(142,68,173,' + (fade * 0.85) + ')';
                    ctx.lineWidth = 4;
                    ctx.stroke();
                }
                ctx.restore();
                const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
                g.addColorStop(0, 'rgba(0,0,0,' + (fade * 0.9) + ')');
                g.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.ellipse(0, 0, r, r * 0.42, 0, 0, Math.PI * 2);
                ctx.fill();
            } else if (e.tipo === 'arqueiro_dash') {
                // Arqueiro (v1.50.0): rastro VERDE e BEM opaco. O jogador pediu
                // "mais opaco e na cor verde" — nada de azul translúcido.
                // São 4 leques de folhas de flecha, quase sólidos, que
                // desaparecem rápido para não virar borrão.
                ctx.translate(e.x, e.y);
                ctx.rotate(e.ang);
                const tons = ['#1b7a3a', '#219a4a', '#2ecc71', '#6ee7a0'];
                for (let k = 0; k < 4; k++) {
                    const alt = k % 2 === 0 ? 1.06 : 0.92;   // ímpar/par = trilha dupla
                    const r = 27 * fade * (1 - k * 0.16);
                    ctx.beginPath();
                    ctx.ellipse(-k * 14, (k - 1.5) * 1.6, r, r * 0.52 * alt, 0, 0, Math.PI * 2);
                    ctx.fillStyle = tons[k];
                    ctx.globalAlpha = Math.min(1, fade * 1.25);   // bem opaco
                    ctx.fill();
                    // pena clara no miolo da folha (dá volume, não "borrão")
                    ctx.beginPath();
                    ctx.ellipse(-k * 14 - 3, (k - 1.5) * 1.6, r * 0.42, r * 0.2 * alt, 0, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(180,255,205,' + (fade * 0.55) + ')';
                    ctx.fill();
                }
                ctx.globalAlpha = fade * 0.9;
                // fiapos de vento no rastro
                ctx.strokeStyle = '#2ecc71';
                ctx.lineWidth = 2;
                for (let k = 0; k < 3; k++) {
                    const yy = (k - 1) * 8;
                    ctx.beginPath();
                    ctx.moveTo(-8 - k * 10, yy);
                    ctx.lineTo(-46 - k * 14, yy);
                    ctx.stroke();
                }
            } else if (e.tipo === 'roqueiro_dash') {
                // Roqueiro (v1.50.0): um MONTE DE NOTAS MUSICAIS soltas para
                // TRÁS (na direção oposta à corrida) + respingo de pedra.
                ctx.translate(e.x, e.y);
                ctx.rotate(e.ang);
                const glifos = ['\u266A', '\u266B', '\u266C', '\u266A', '\u266B'];
                const tons = ['#f9e79f', '#f5b041', '#ecf0f1', '#fad390', '#f1948a'];
                for (let k = 0; k < 7; k++) {
                    // nasce ATRÁS do char (x negativo) e sai jogado para trás
                    const atraso = k * 0.075;
                    const pk = Math.max(0, Math.min(1, (p - atraso) / 0.75));
                    if (pk <= 0) continue;
                    const fadeK = Math.max(0, 1 - pk);
                    const recuo = 12 + pk * 96;                    // vai para trás
                    const subida = -10 - pk * 52 + (k % 3) * 7;   // sobe enquanto sai
                    const lateral = (k - 3) * 11 + Math.sin(pk * 7 + k) * 5;
                    const tam = (15 + (k % 3) * 5) * (0.6 + fadeK * 0.6);
                    ctx.save();
                    ctx.translate(-recuo, subida);
                    ctx.rotate(-pk * 1.5 + (k % 2 ? 0.35 : -0.35));
                    ctx.globalAlpha = fadeK * 0.95;
                    ctx.font = 'bold ' + tam.toFixed(1) + 'px "Segoe UI Symbol", system-ui, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.lineWidth = 3;
                    ctx.strokeStyle = 'rgba(60,40,10,' + (fadeK * 0.5) + ')';
                    ctx.strokeText(glifos[k], lateral, 0);
                    ctx.fillStyle = tons[k];
                    ctx.fillText(glifos[k], lateral, 0);
                    ctx.restore();
                }
                // respingo de pedra no chão (o "arrancão" do Roqueiro)
                ctx.globalAlpha = fade;
                for (let k = 0; k < 5; k++) {
                    const a = e.ang + Math.PI + (k - 2) * 0.38;
                    const d = (1 - p) * 40 + 5;
                    const sz = 2.6 + (k % 3) * 2;
                    ctx.save();
                    ctx.translate(Math.cos(a) * d, Math.sin(a) * d * 0.6);
                    ctx.rotate(p * 4 + k);
                    ctx.fillStyle = k % 2 ? '#95a5a6' : '#7f8c8d';
                    ctx.fillRect(-sz / 2, -sz / 2, sz, sz);
                    ctx.restore();
                }
                ctx.beginPath();
                ctx.ellipse(0, 11, 32 * fade + 8, 11 * fade + 4, 0, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(190,180,160,' + (fade * 0.35) + ')';
                ctx.fill();
            } else if (e.tipo === 'guerreiro_baque') {
                // BAQUE DE ESCUDO (1x a cada 2s): onda de impacto em arco na
                // direção da espada + faíscas metálicas na borda da placa.
                ctx.translate(e.x, e.y);
                ctx.rotate(e.ang);
                const meia = 0.575;
                // onda em arco (só a frente, é o lado que ele protege)
                ctx.beginPath();
                ctx.arc(0, 0, (e.raio || 62) * (0.35 + p * 0.75), -meia, meia);
                ctx.arc(0, 0, (e.raio || 62) * (0.2 + p * 0.6), meia, -meia, true);
                ctx.closePath();
                ctx.strokeStyle = 'rgba(174,214,241,' + (fade * 0.9) + ')';
                ctx.lineWidth = 7 * fade + 1.5;
                ctx.shadowColor = '#85c1e9';
                ctx.shadowBlur = 16;
                ctx.stroke();
                ctx.shadowBlur = 0;
                // ponta do arco mais brilhante (o impacto em si)
                ctx.beginPath();
                ctx.arc(0, 0, (e.raio || 62) * (0.35 + p * 0.75), -0.16, 0.16);
                ctx.strokeStyle = 'rgba(255,255,255,' + (fade * 0.85) + ')';
                ctx.lineWidth = 4 * fade + 1;
                ctx.stroke();
                // faíscas indo pra frente
                ctx.fillStyle = 'rgba(236,240,241,' + (fade * 0.8) + ')';
                for (let k = 0; k < 6; k++) {
                    const a = (k / 5 - 0.5) * 2 * meia;
                    const d = 26 + p * 40;
                    ctx.beginPath();
                    ctx.arc(Math.cos(a) * d, Math.sin(a) * d, 2.4 * fade + 0.6, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else if (e.tipo === 'sniper_camo') {
                // SNIPER ao VESTIR a roupa de camuflagem: onda de folhas
                // verdes subindo + o uniforme "se fechando" sobre o corpo.
                ctx.translate(e.x, e.y);
                const r = 16 + p * 46;
                ctx.beginPath();
                ctx.arc(0, 0, r, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(39,174,96,' + (fade * 0.85) + ')';
                ctx.lineWidth = 5 * fade + 1;
                ctx.stroke();
                for (let k = 0; k < 10; k++) {
                    const a = (k / 10) * Math.PI * 2 + p * 2.2;
                    const rr = r * (0.55 + 0.4 * ((k % 3) / 3));
                    ctx.save();
                    ctx.translate(Math.cos(a) * rr, Math.sin(a) * rr * 0.6 - p * 18);
                    ctx.rotate(a + p * 3);
                    ctx.globalAlpha = fade;
                    ctx.fillStyle = k % 2 ? '#2ecc71' : '#1e8e4e';
                    ctx.beginPath();
                    ctx.ellipse(0, 0, 5.5, 2.4, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            } else if (e.tipo === 'barbaro_investida') {
                // Bárbaro: INVESTIDA DE FÚRIA SANGUINÁRIA (onda de choque vermelha + labaredas e faíscas de fúria)
                ctx.translate(e.x, e.y);
                ctx.rotate(e.ang);
                // Onda de choque frontal vermelha
                ctx.beginPath();
                ctx.arc(0, 0, (25 + p * 45), -0.85, 0.85);
                ctx.strokeStyle = 'rgba(231,76,60,' + (fade * 0.95) + ')';
                ctx.lineWidth = 6 * fade + 2;
                ctx.shadowColor = '#e74c3c';
                ctx.shadowBlur = 18;
                ctx.stroke();
                ctx.shadowBlur = 0;

                // Anel secundário de fogo carmesim
                ctx.beginPath();
                ctx.arc(0, 0, (15 + p * 30), -0.6, 0.6);
                ctx.strokeStyle = 'rgba(255,107,107,' + (fade * 0.85) + ')';
                ctx.lineWidth = 4 * fade + 1;
                ctx.stroke();

                // Rastros e labaredas de fúria para trás
                for (let k = 0; k < 6; k++) {
                    const off = (k - 2.5) * 12;
                    const ln = (35 + (k % 3) * 15) * fade;
                    ctx.beginPath();
                    ctx.moveTo(-10, off * 0.5);
                    ctx.lineTo(-ln, off * 0.8);
                    ctx.strokeStyle = (k % 2 === 0) ? 'rgba(231,76,60,' + (fade * 0.8) + ')' : 'rgba(243,156,18,' + (fade * 0.7) + ')';
                    ctx.lineWidth = 3.5 * fade + 1;
                    ctx.stroke();
                }

                // Brasas / faíscas ardentes saltando
                for (let k = 0; k < 7; k++) {
                    const d = 10 + p * 50 + (k * 6);
                    const a = Math.PI + (k - 3) * 0.28;
                    ctx.beginPath();
                    ctx.arc(Math.cos(a) * d, Math.sin(a) * (d * 0.45), 2.5 * fade + 0.8, 0, Math.PI * 2);
                    ctx.fillStyle = (k % 2 === 0) ? '#ff4d4d' : '#ff9f43';
                    ctx.shadowColor = '#ff4d4d';
                    ctx.shadowBlur = 8;
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }

                // Poeira de terra queimada
                ctx.beginPath();
                ctx.ellipse(-15, 8, 38 * fade + 12, 12 * fade + 4, 0, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(120,40,30,' + (fade * 0.40) + ')';
                ctx.fill();
            } else if (e.tipo === 'ladino_sombra' || e.tipo === 'pikeman_fantasma') {
                // Arranque: cópias de sombra que somem
                const cor = e.tipo === 'ladino_sombra' ? '155,89,182' : '41,128,185';
                ctx.translate(e.x, e.y);
                ctx.globalAlpha = fade * 0.8;
                ctx.fillStyle = 'rgba(' + cor + ',0.7)';
                for (let k = 1; k <= 4; k++) {
                    ctx.beginPath();
                    ctx.ellipse(-k * 11, 0, 20 - k * 3, 11 - k * 2, e.ang, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else if (e.tipo === 'curandeiro_escudo_area_carga') {
                // Escudo do grupo: onda verde expansiva
                ctx.translate(e.x, e.y);
                const r = (e.raio || 160) * Math.min(1, p * 1.15);
                ctx.beginPath();
                ctx.arc(0, 0, r, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(46,204,113,' + (fade * 0.95) + ')';
                ctx.lineWidth = 8;
                ctx.shadowColor = '#2ecc71';
                ctx.shadowBlur = 20;
                ctx.stroke();
                ctx.fillStyle = 'rgba(46,204,113,' + (fade * 0.14) + ')';
                ctx.fill();
            } else if (e.tipo === 'curandeiro_escudo_area') {
                // Escudo já ativo num aliado: domo pulsante
                ctx.translate(e.x, e.y);
                const pulso = 0.5 + 0.5 * Math.sin(agora / 220);
                ctx.beginPath();
                ctx.arc(0, 0, 44, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(46,204,113,' + (0.45 + 0.25 * pulso) + ')';
                ctx.lineWidth = 3;
                ctx.shadowColor = '#2ecc71';
                ctx.shadowBlur = 14;
                ctx.stroke();
            } else if (e.tipo === 'summoner_pet_teleporte') {
                // Pet do Summoner: flash verde
                ctx.translate(e.x, e.y);
                const r = 8 + p * 40;
                ctx.beginPath();
                ctx.arc(0, 0, r, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(155,89,182,' + (fade * 0.5) + ')';
                ctx.fill();
                ctx.strokeStyle = 'rgba(46,204,113,' + fade + ')';
                ctx.lineWidth = 3;
                ctx.stroke();
            } else if (e.tipo === 'guerreiro_escudo') {
                // Flash ao erguer o escudo
                ctx.translate(e.x, e.y);
                const r = 20 + p * 40;
                ctx.beginPath();
                ctx.arc(0, 0, r, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(52,152,219,' + (fade * 0.8) + ')';
                ctx.lineWidth = 4;
                ctx.stroke();
            } else if (e.tipo === 'dronemaster_escudo') {
                // Escudo de energia do DroneMaster: expansão de onda cibernética ciano/azul
                ctx.translate(e.x, e.y);
                const r = 16 + p * 34;
                ctx.beginPath();
                ctx.arc(0, 0, r, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(0, 195, 255, ' + (fade * 0.95) + ')';
                ctx.lineWidth = 4 * fade + 1;
                ctx.shadowColor = '#00c3ff';
                ctx.shadowBlur = 14;
                ctx.stroke();
                ctx.shadowBlur = 0;
                // Anel cibernético pontilhado
                ctx.setLineDash([4, 6]);
                ctx.beginPath();
                ctx.arc(0, 0, r * 0.75, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(255, 255, 255, ' + (fade * 0.8) + ')';
                ctx.lineWidth = 1.5;
                ctx.stroke();
                ctx.setLineDash([]);
            }

            ctx.restore();
        }
    };
})();
