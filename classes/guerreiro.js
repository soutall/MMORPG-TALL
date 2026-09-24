// classes/guerreiro.js — Renderização completa do Guerreiro (TANQUE MEDIEVAL PESADO)
// 100% procedural em Canvas 2D (polígonos, gradientes, sombras, luz, partículas).
// NENHUMA mecânica alterada: apenas representação visual + animações/VFX.
(function () {
    function _agora() { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); }

    // ---- estados visuais por jogador ----
    window.guerreiroPrepTimers = window.guerreiroPrepTimers || {}; // recuo elástico do Grito de Provocação
    window.guerreiroCortes = window.guerreiroCortes || {};         // inicio (ms) da estocada / pid
    window.guerreiroDefesas = window.guerreiroDefesas || {};       // inicio (ms) da postura defensiva / pid

    window.registrarCorteGuerreiro = function (pid) { if (pid) window.guerreiroCortes[pid] = _agora(); };
    window.registrarDefesaGuerreiro = function (pid) { if (pid) window.guerreiroDefesas[pid] = _agora(); };

    // partículas locais (poeira / faíscas de bloqueio / glints metálicos) — só do próprio jogador
    let dust = [], sparks = [], glints = [];
    let lastDust = 0;

    /* ---------- utilitários de desenho ---------- */
    function _grad(ctx, x1, y1, x2, y2, stops) {
        let g = ctx.createLinearGradient(x1, y1, x2, y2);
        for (let i = 0; i < stops.length; i += 2) g.addColorStop(stops[i], stops[i + 1]);
        return g;
    }
    function _rr(ctx, x, y, w, h, r) {
        r = Math.min(r === undefined ? 3 : r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }
    function _lin(ctx, x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }

    /* ============ CAPA (atrás) ============ */
    function desenharCapa(ctx, corCapa, resp, mov) {
        let v = resp * 1.4 + (mov ? 2.2 : 0.4);
        // manto grande esvoaçando para trás (−x)
        ctx.fillStyle = corCapa;
        ctx.beginPath();
        ctx.moveTo(4.5, 8.2);
        ctx.quadraticCurveTo(3.2, 11 + v, -2.5, 14 + v * 1.6);
        ctx.quadraticCurveTo(-9, 21 + v * 0.8, -8.5, 27);
        ctx.lineTo(12.5, 27.6);
        ctx.lineTo(15.5, 23.8);
        ctx.lineTo(17.5, 9.4);
        ctx.closePath();
        ctx.fill();
        // sombra interna (dobra tecida)
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.moveTo(6.5, 9.6);
        ctx.quadraticCurveTo(4.2, 15, -0.5, 19.5);
        ctx.quadraticCurveTo(-5.4, 24.5, -5.2, 26.2);
        ctx.lineTo(2.4, 26.6);
        ctx.lineTo(6.2, 13.2);
        ctx.closePath();
        ctx.fill();
        // borda reforçada (fio mais escuro)
        ctx.strokeStyle = 'rgba(0,0,0,0.45)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(12.5, 27.6);
        ctx.quadraticCurveTo(-9, 23, -8.5, 27);
        ctx.stroke();
        // rasgos de batalha no manto
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 1;
        _lin(ctx, -2.5, 21 + v, 0.5, 23.2);
        _lin(ctx, 8.5, 19.5, 9.6, 23.2);
    }

    /* ============ PERNAS (curtas e fortes) ============ */
    // PERNAS (curtas e grossas — tanque baixo e sólido)
    function desenharPernas(ctx, passo, mov, defesa) {
        let amp = mov ? 2.7 : 0.8;      // passos mais suaves (menos intensos)
        let f1 = Math.sin(passo * Math.PI * 2) * amp;       // frente (direita)
        let f2 = Math.sin(passo * Math.PI * 2 + Math.PI) * amp;
        let crouch = defesa ? 1.7 : 0;
        ctx.lineCap = 'round';
        let pernas = [
            { base: 14.2, f: f1 },   // perna da frente
            { base: 8.6,  f: f2 }    // perna de trás
        ];
        pernas.forEach(function (pl) {
            let hx = pl.base, hy = 20.0 - crouch;      // quadril (um pouco mais baixo)
            let kx = hx + pl.f * 2.1, ky = 22.8;       // joelho ALTO (perna curta)
            let ax = hx + pl.f * 3.1, ay = 25.4;       // tornozelo alto
            let fx = hx + pl.f * 4.5, fy = 29.8;       // pé firme no chão
            // silhueta/volumão da perna (forte e grossa)
            ctx.strokeStyle = '#2b3540';
            ctx.lineWidth = 6.8;
            _lin(ctx, hx, hy, ax, ay);
            // coxa (placa)
            ctx.strokeStyle = '#3d4a57';
            ctx.lineWidth = 4.9;
            _lin(ctx, hx, hy, kx, ky);
            // joelheira bem definida (grossa)
            ctx.fillStyle = '#8a9bb0';
            ctx.beginPath();
            ctx.arc(kx, ky - 0.2, 2.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(220,232,244,0.75)';
            ctx.beginPath();
            ctx.arc(kx - 0.6, ky - 0.9, 0.8, 0, Math.PI * 2);
            ctx.fill();
            // greva (canelaria metálica curta, grossa)
            ctx.strokeStyle = '#5b6d7e';
            ctx.lineWidth = 4.2;
            _lin(ctx, kx, ky, ax, ay);
            ctx.strokeStyle = 'rgba(215,228,240,0.45)';
            ctx.lineWidth = 1;
            _lin(ctx, kx + 0.9, ky + 0.4, ax + 0.8, ay);
            // bota pesada e grossa (preenche até o chão)
            ctx.fillStyle = '#2f3a44';
            ctx.beginPath();
            ctx.moveTo(fx - 3.0, ay - 0.6);
            ctx.lineTo(fx + 2.8, ay - 0.8);
            ctx.lineTo(fx + 4.0, fy - 0.4);
            ctx.lineTo(fx + 2.4, fy);
            ctx.lineTo(fx - 3.4, fy);
            ctx.lineTo(fx - 3.8, fy - 0.8);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = 'rgba(200,214,228,0.5)';
            ctx.lineWidth = 0.8;
            ctx.stroke();
            // dedo de aço da bota
            ctx.fillStyle = 'rgba(230,238,246,0.35)';
            ctx.beginPath();
            ctx.arc(fx + 2.6, fy - 1.0, 1.3, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    /* ============ TRONCO (peitoral espesso + placas sobrepostas) ============ */
    function desenharTronco(ctx, dano, resp) {
        // saia de placas (defende a cintura) — 3 tassets com bainha irregular
        let tassets = [
            [4.9, 20.8, 7.6, 23.4], [8.0, 20.8, 11.4, 23.9], [11.8, 20.8, 15.4, 23.6], [15.8, 20.8, 19.6, 23.0]
        ];
        tassets.forEach(function (t, i) {
            let g = _grad(ctx, t[0], t[1], t[2], t[3], [0, '#7c8fa2', 0.7, '#4d5f70', 1, '#39464f']);
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.moveTo(t[0], t[1]);
            ctx.lineTo(t[2], t[1]);
            ctx.lineTo(t[2] + (i % 2 ? 0.5 : -0.4), t[3]);
            ctx.lineTo(t[0] - (i % 2 ? -0.4 : 0.5), t[3]);
            ctx.closePath();
            ctx.fill();
            // separação escura entre placas
            ctx.strokeStyle = 'rgba(10,14,20,0.65)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(t[2] + 0.3, t[1] + 0.4);
            ctx.lineTo(t[2] + 0.3, t[3]);
            ctx.stroke();
        });
        // cinto de couro com fivela dourada
        ctx.fillStyle = '#2c2620';
        ctx.fillRect(4.7, 19.7, 14.9, 1.6);
        ctx.fillStyle = '#c9a227';
        _rr(ctx, 11.3, 19.55, 3.1, 1.9, 0.6);
        ctx.fill();
        // PEITORAL — grande, espesso e curvado (breastplate orgânico)
        let gP = _grad(ctx, 4, 7.2, 20, 18, [0, '#9fb3c6', 0.45, '#66798c', 1, '#333f4c']);
        ctx.fillStyle = gP;
        ctx.beginPath();
        ctx.moveTo(5.2, 8.8 + resp * 0.2);
        ctx.quadraticCurveTo(11.4, 7.0, 19.3, 8.8 + resp * 0.2);
        ctx.lineTo(20.2, 18.4);
        ctx.quadraticCurveTo(12.6, 20.2, 4.6, 18.2);
        ctx.quadraticCurveTo(4.2, 13.0, 5.2, 8.8 + resp * 0.2);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(215,227,240,0.35)';
        ctx.lineWidth = 0.9;
        ctx.stroke();
        // luz superior (iluminação cinematográfica)
        ctx.fillStyle = 'rgba(225,236,246,0.28)';
        ctx.beginPath();
        ctx.moveTo(6.2, 9.2 + resp * 0.2);
        ctx.quadraticCurveTo(11.8, 7.8, 18.4, 9.4 + resp * 0.2);
        ctx.quadraticCurveTo(12.2, 10.4, 6.2, 9.2 + resp * 0.2);
        ctx.closePath();
        ctx.fill();
        // placas sobrepostas (separações horizontais com brilho)
        [11.5, 14.1, 16.7].forEach(function (yb) {
            ctx.strokeStyle = 'rgba(10,14,20,0.55)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(5.1, yb);
            ctx.quadraticCurveTo(12.0, yb + 0.7, 19.8, yb);
            ctx.stroke();
            ctx.strokeStyle = 'rgba(220,232,244,0.28)';
            ctx.lineWidth = 0.9;
            ctx.beginPath();
            ctx.moveTo(5.4, yb + 0.6);
            ctx.quadraticCurveTo(12.0, yb + 1.3, 19.5, yb + 0.6);
            ctx.stroke();
        });
        // crista central do peitoral (deixa o peito largo)
        ctx.strokeStyle = 'rgba(200,215,230,0.4)';
        ctx.lineWidth = 1.3;
        _lin(ctx, 12.2, 8.2 + resp * 0.2, 12.2, 18.9);
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = 1;
        _lin(ctx, 12.9, 8.4 + resp * 0.2, 12.9, 18.8);
        // detalhes dourados discretos
        ctx.fillStyle = '#d8b23c';
        ctx.beginPath(); ctx.arc(6.4, 10.6 + resp * 0.2, 1.0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(18.3, 10.6 + resp * 0.2, 1.0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(216,178,60,0.9)';
        _rr(ctx, 10.5, 17.8, 3.2, 1.0, 0.4);
        ctx.fill();
        // arranhões de batalha
        ctx.strokeStyle = 'rgba(25,32,40,0.6)';
        ctx.lineWidth = 0.9;
        _lin(ctx, 14.2, 13.6, 17.4, 14.8);
        _lin(ctx, 15.6, 14.9, 18.4, 15.6);
        ctx.fillStyle = 'rgba(255,255,255,0.10)';
        ctx.beginPath();
        ctx.moveTo(14.3, 13.3); ctx.lineTo(17.5, 14.5); ctx.lineTo(17.3, 14.6); ctx.lineTo(14.2, 13.5);
        ctx.closePath();
        ctx.fill();
        // flash vermelho ao tomar dano + glints
        if (dano) {
            ctx.fillStyle = 'rgba(214,64,52,0.32)';
            ctx.beginPath();
            ctx.moveTo(5.2, 8.8);
            ctx.quadraticCurveTo(11.4, 7.0, 19.3, 8.8);
            ctx.lineTo(20.2, 18.4);
            ctx.quadraticCurveTo(12.6, 20.2, 4.6, 18.2);
            ctx.quadraticCurveTo(4.2, 13.0, 5.2, 8.8);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.5)';
            ctx.lineWidth = 1;
            _lin(ctx, 7.0, 11.5, 12.5, 13.0);
            _lin(ctx, 9.5, 14.5, 15.0, 15.8);
        }
    }

    /* ============ OMBREIRAS (grandes, proporcionais) ============ */
    function desenharOmbros(ctx, dano) {
        function omb(x, y, w, h) {
            let g = _grad(ctx, x, y, x + w, y + h, [0, '#a3b5c6', 0.5, '#637588', 1, '#333f4b']);
            ctx.fillStyle = g;
            _rr(ctx, x, y, w, h, 3.4);
            ctx.fill();
            ctx.strokeStyle = 'rgba(214,226,240,0.5)';
            ctx.lineWidth = 1;
            ctx.stroke();
            // placa superior sobreposta
            ctx.fillStyle = 'rgba(224,236,246,0.3)';
            _rr(ctx, x + 0.9, y + 0.6, w - 2.6, h * 0.34, 2.2);
            ctx.fill();
            // rebites
            ctx.fillStyle = '#e6d59c';
            ctx.beginPath(); ctx.arc(x + 1.8, y + h - 1.6, 0.7, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(x + w - 1.8, y + h - 1.6, 0.7, 0, Math.PI * 2); ctx.fill();
            // marca de batalha
            ctx.strokeStyle = 'rgba(20,26,33,0.55)';
            ctx.lineWidth = 0.9;
            _lin(ctx, x + w * 0.35, y + h * 0.5, x + w * 0.65, y + h * 0.78);
        }
        omb(2.2, 7.0, 6.6, 6.6);   // ombreira esquerda (atrás)
        omb(15.6, 7.0, 6.8, 6.6);  // ombreira direita (à frente)
    }

    /* ============ CAPACETE (fechado, visor estreito) ============ */
    function desenharCapacete(ctx, resp, corPluma) {
        // elmo principal
        let g = _grad(ctx, 8.4, -1.6, 17.0, 7.6, [0, '#92a6b9', 0.5, '#54687c', 1, '#2d3843']);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(8.8, 4.6);
        ctx.quadraticCurveTo(8.4, -1.8, 13.2, -1.6);
        ctx.quadraticCurveTo(17.4, -1.2, 17.0, 5.2);
        ctx.quadraticCurveTo(16.6, 7.2, 14.6, 7.3);
        ctx.quadraticCurveTo(12.0, 7.9, 9.7, 6.9);
        ctx.quadraticCurveTo(8.5, 6.2, 8.8, 4.6);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(220,232,244,0.4)';
        ctx.lineWidth = 0.9;
        ctx.stroke();
        // luz da coroa (brilho contido)
        ctx.fillStyle = 'rgba(222,234,246,0.30)';
        ctx.beginPath();
        ctx.ellipse(10.6, 0.4, 1.8, 0.9, -0.35, 0, Math.PI * 2);
        ctx.fill();
        // crista central do elmo
        ctx.strokeStyle = 'rgba(190,208,226,0.4)';
        ctx.lineWidth = 1.2;
        _lin(ctx, 12.2, -1.4, 12.2, 7.0);
        ctx.strokeStyle = 'rgba(0,0,0,0.28)';
        ctx.lineWidth = 0.9;
        _lin(ctx, 12.8, -1.3, 12.8, 6.9);
        // rebitão no topo
        ctx.fillStyle = '#d8c38c';
        ctx.beginPath(); ctx.arc(12.2, -1.5, 1.0, 0, Math.PI * 2); ctx.fill();

        // PROTEÇÃO LATERAL (guarda-queixo) — placa que envolve o rosto
        ctx.fillStyle = _grad(ctx, 6.6, 4.8, 12.4, 9.0, [0, '#5e7286', 1, '#3a4754']);
        ctx.beginPath();
        ctx.moveTo(9.0, 4.2);
        ctx.lineTo(6.6, 8.4);
        ctx.lineTo(9.8, 9.0);
        ctx.lineTo(12.4, 7.6);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = _grad(ctx, 13.2, 4.4, 18.8, 8.6, [0, '#6a7d91', 1, '#3c4956']);
        ctx.beginPath();
        ctx.moveTo(16.4, 4.6);
        ctx.lineTo(18.6, 7.8);
        ctx.lineTo(15.9, 8.4);
        ctx.lineTo(13.4, 7.0);
        ctx.closePath();
        ctx.fill();
        // aberturas de ventilação na proteção lateral
        ctx.fillStyle = '#0c1116';
        [10.4, 11.6].forEach(function (vx) { ctx.beginPath(); ctx.arc(vx, 7.15, 0.55, 0, Math.PI * 2); ctx.fill(); });
        [14.6, 15.8].forEach(function (vx) { ctx.beginPath(); ctx.arc(vx, 7.15, 0.55, 0, Math.PI * 2); ctx.fill(); });

        // VISOR — fenda estreita e agressiva na frente
        ctx.fillStyle = '#05070b';
        ctx.beginPath();
        ctx.moveTo(13.5, 0.9);
        ctx.quadraticCurveTo(15.6, 0.7, 17.1, 1.3);
        ctx.lineTo(16.9, 2.6);
        ctx.quadraticCurveTo(15.4, 2.1, 13.3, 2.2);
        ctx.closePath();
        ctx.fill();
        // aberturas do visor (linhas finas)
        ctx.strokeStyle = 'rgba(20,26,34,0.9)';
        ctx.lineWidth = 0.8;
        _lin(ctx, 14.0, 1.5, 16.6, 1.9);
        // brilho interno contido (energia azulada — olhos)
        ctx.fillStyle = 'rgba(70,170,255,0.30)';
        ctx.beginPath();
        ctx.moveTo(14.2, 1.35);
        ctx.lineTo(16.0, 1.65);
        ctx.lineTo(15.9, 1.95);
        ctx.lineTo(14.0, 1.7);
        ctx.closePath();
        ctx.fill();
        // respiradouros pequenos no focinho
        ctx.fillStyle = '#0b1016';
        ctx.beginPath(); ctx.arc(13.0, 4.6, 0.6, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(15.6, 4.8, 0.6, 0, Math.PI * 2); ctx.fill();

        // PLUMA — crista na cor da capa (quem é aliado/self)
        ctx.fillStyle = corPluma;
        ctx.beginPath();
        ctx.moveTo(11.6, -0.6);
        ctx.quadraticCurveTo(8.0, -7.8, 4.4, -8.6);
        ctx.quadraticCurveTo(5.4, -5.7, 8.5, -2.2);
        ctx.quadraticCurveTo(10.8, 0.4, 12.6, 1.2);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.beginPath();
        ctx.moveTo(10.6, -1.2);
        ctx.quadraticCurveTo(8.0, -6.4, 5.4, -7.6);
        ctx.lineTo(6.2, -5.6);
        ctx.quadraticCurveTo(8.6, -2.6, 11.4, 0.4);
        ctx.closePath();
        ctx.fill();
    }

    /* ============ BRAÇO + ESPADA LARGA (mão livre) ============ */
    // desenhado no frame do braço (origem = punho, +x para a frente)
    window.desenharLaminaLargaExposta = desenharLaminaLarga;
    function desenharLaminaLarga(ctx, off, armaVisual) {
        let bx = 5.2, by = -1.15;
        let dirx = 0.93, diry = -0.37;         // direção da lâmina
        let px = 0.37, py = 0.93;              // perpendicular (arestas)
        let L = 15.5 + (off || 0);             // lâmina LONGA
        let wBase = 2.7;                       // meia-largura na base (LARGA)

        // Cores base da lâmina (Aço padrão)
        let cBase = '#b8c9db', cMeio = '#6b7e92', cPonta = '#39434f';
        let fioLuz = 'rgba(238,246,255,0.85)';

        if (armaVisual && armaVisual.customVisual) {
            let cv = armaVisual.customVisual;
            L = (Number(cv.tamanho) || 15.5) + (off || 0);
            wBase = Number(cv.largura) || 2.7;
            cBase = cv.cBase || '#b8c9db';
            cMeio = cv.cMeio || '#6b7e92';
            cPonta = cv.cPonta || '#39434f';
            fioLuz = cv.cFio || 'rgba(238,246,255,0.85)';
        } else if (armaVisual) {
            if (armaVisual.raridade === 'raro') {
                cBase = '#a8c8ff'; cMeio = '#4d88ff'; cPonta = '#003399';
                L += 2; wBase = 2.9; // Ligeiramente maior
            } else if (armaVisual.raridade === 'epico') {
                cBase = '#dcb8ff'; cMeio = '#a64dff'; cPonta = '#4a0099';
                L += 4; wBase = 3.2; // Maior e mais grossa
            } else if (armaVisual.raridade === 'lendario') {
                cBase = '#ffe0b8'; cMeio = '#ff9900'; cPonta = '#cc3300';
                L += 6; wBase = 3.6; // Espadão gigante
            }
        }

        let tipx = bx + dirx * L, tipy = by + diry * L;
        let g = _grad(ctx, bx, by, tipx, tipy, [0, cBase, 0.45, cMeio, 1, cPonta]);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(bx - px * wBase, by - py * wBase);
        ctx.lineTo(tipx, tipy);
        ctx.lineTo(bx + px * wBase, by + py * wBase);
        ctx.closePath();
        ctx.fill();
        // ranhura central (fuller) da lâmina larga
        ctx.strokeStyle = 'rgba(24,32,40,0.6)';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + dirx * L * 0.74, by + diry * L * 0.74);
        ctx.stroke();
        // fios de luz nas duas arestas (aço polido)
        ctx.strokeStyle = fioLuz;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(bx - px * (wBase - 0.5), by - py * (wBase - 0.5));
        ctx.lineTo(tipx - 1.5, tipy - 0.4);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(205,220,236,0.5)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(bx + px * (wBase - 0.7), by + py * (wBase - 0.7));
        ctx.lineTo(tipx - 1.7, tipy + 0.7);
        ctx.stroke();
        // brilho azulado sutil (energia da classe)
        ctx.strokeStyle = 'rgba(70,170,255,0.16)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(bx + 2, by + 0.2);
        ctx.lineTo(tipx - 1.5, tipy + 0.5);
        ctx.stroke();
    }

    function desenharBracoEspada(ctx, atk, armaVisual) {
        ctx.lineCap = 'round';
        // braço grosso (manga de malha + braçadeira)
        ctx.strokeStyle = '#39454f';
        ctx.lineWidth = 5.0;
        _lin(ctx, -4.6, -5.4, -1.2, -2.4);
        ctx.strokeStyle = '#63768a';
        ctx.lineWidth = 4.1;
        _lin(ctx, -1.2, -2.4, 1.4, -0.9);
        ctx.strokeStyle = 'rgba(220,232,244,0.5)';
        ctx.lineWidth = 0.9;
        _lin(ctx, -0.8, -2.8, 1.0, -1.5);
        // luva pesada (punho)
        ctx.fillStyle = '#262e36';
        ctx.beginPath(); ctx.arc(2.0, -0.5, 2.0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(205,218,232,0.45)';
        ctx.lineWidth = 0.7;
        ctx.stroke();

        // GOLPE LARGO: a espada erguida varre pra frente (slash em arco)
        let rot = -0.95 + Math.sin(atk * Math.PI) * 1.45;
        ctx.save();
        ctx.translate(2.0, -0.5);
        ctx.rotate(rot);
        ctx.translate(-2.0, 0.5);

        // rastro do corte (fantasmas da lâmina no arco de movimento)
        if (atk > 0.12 && atk < 0.92) {
            for (let i = 0; i < 3; i++) {
                let back = 0.5 + i * 0.6;
                ctx.save();
                ctx.translate(2.0, -0.5);
                ctx.rotate(-back);
                ctx.translate(-2.0, 0.5);
                ctx.globalAlpha = 0.16 - i * 0.045;
                desenharLaminaLarga(ctx, i * 2, armaVisual);
                ctx.restore();
            }
            ctx.globalAlpha = 1;
        }
        // cabo reforçado
        ctx.strokeStyle = '#4a3326';
        ctx.lineWidth = 2.4;
        _lin(ctx, 2.0, -0.5, 5.2, -1.15);
        // guarda LONGA (escura com pontas douradas)
        ctx.strokeStyle = '#39454f';
        ctx.lineWidth = 1.9;
        _lin(ctx, 4.9, -3.6, 6.2, 1.2);
        ctx.fillStyle = '#d8b23c';
        ctx.beginPath(); ctx.arc(4.7, -3.7, 1.0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(6.4, 1.4, 1.0, 0, Math.PI * 2); ctx.fill();
        // pomo facetado
        ctx.fillStyle = '#2a323a';
        ctx.beginPath(); ctx.arc(5.9, -1.5, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(216,178,60,0.8)';
        ctx.beginPath(); ctx.arc(5.9, -1.6, 0.6, 0, Math.PI * 2); ctx.fill();
        // LÂMINA LARGA
        desenharLaminaLarga(ctx, 0, armaVisual);

        // flash de impacto no fim do golpe
        if (atk >= 0.78) {
            let f = 1 - (atk - 0.78) / 0.22;
            let tx = 5.2 + 0.93 * 15.5, ty = -1.15 - 0.37 * 15.5;
            ctx.fillStyle = 'rgba(235,246,255,' + (0.9 * f) + ')';
            ctx.beginPath();
            ctx.arc(tx, ty, 3.0 * f + 0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(140,190,255,' + (0.6 * f) + ')';
            ctx.lineWidth = 1.1;
            ctx.beginPath();
            ctx.arc(tx, ty, 6.2 * f, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();
    }

    // espada larga preparada na postura defensiva (atrás do escudo)
    function desenharEspadaDefesa(ctx, armaVisual) {
        ctx.lineCap = 'round';
        // braço
        ctx.strokeStyle = '#3a4652';
        ctx.lineWidth = 4.8;
        _lin(ctx, 22.6, 9.2, 26.0, 12.4);
        ctx.strokeStyle = '#617488';
        ctx.lineWidth = 4.0;
        _lin(ctx, 26.0, 12.4, 28.4, 14.0);
        // punho
        ctx.fillStyle = '#262e36';
        ctx.beginPath(); ctx.arc(29.0, 14.6, 1.9, 0, Math.PI * 2); ctx.fill();
        // cabo + pomo
        ctx.strokeStyle = '#4a3326';
        ctx.lineWidth = 2.2;
        _lin(ctx, 29.0, 14.6, 31.8, 13.9);
        ctx.fillStyle = '#2a323a';
        ctx.beginPath(); ctx.arc(32.4, 13.7, 1.4, 0, Math.PI * 2); ctx.fill();
        // guarda escura com pontos dourados
        ctx.strokeStyle = '#39454f';
        ctx.lineWidth = 1.8;
        _lin(ctx, 31.4, 12.2, 32.2, 15.4);
        ctx.fillStyle = '#d8b23c';
        ctx.beginPath(); ctx.arc(31.5, 12.0, 0.8, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(32.2, 15.6, 0.8, 0, Math.PI * 2); ctx.fill();
        // LÂMINA LARGA apontando levemente pra frente/baixo (pronta ao lado do escudo)
        let cBase = '#b8c9db', cMeio = '#6b7e92', cPonta = '#39434f';
        let fioLuz = 'rgba(238,246,255,0.85)';
        
        if (armaVisual && armaVisual.customVisual) {
            cBase = armaVisual.customVisual.cBase || cBase;
            cMeio = armaVisual.customVisual.cMeio || cMeio;
            cPonta = armaVisual.customVisual.cPonta || cPonta;
            fioLuz = armaVisual.customVisual.cFio || fioLuz;
            // Opcionalmente podemos aplicar tamanho aqui tbm, mas a pose def não estica tanto
        } else if (armaVisual) {
            if (armaVisual.raridade === 'raro') { cBase = '#a8c8ff'; cMeio = '#4d88ff'; cPonta = '#003399'; }
            else if (armaVisual.raridade === 'epico') { cBase = '#dcb8ff'; cMeio = '#a64dff'; cPonta = '#4a0099'; }
            else if (armaVisual.raridade === 'lendario') { cBase = '#ffe0b8'; cMeio = '#ff9900'; cPonta = '#cc3300'; }
        }
        ctx.fillStyle = _grad(ctx, 31.6, 12.6, 44.5, 9.8, [0, cBase, 0.45, cMeio, 1, cPonta]);
        ctx.beginPath();
        ctx.moveTo(31.6, 12.4);
        ctx.lineTo(44.8, 9.4);
        ctx.lineTo(43.4, 12.6);
        ctx.lineTo(31.9, 15.6);
        ctx.closePath();
        ctx.fill();
        // fuller + fios de luz
        ctx.strokeStyle = 'rgba(24,32,40,0.6)';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(32.0, 14.0);
        ctx.lineTo(43.8, 11.4);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(238,246,255,0.7)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(32.1, 12.8);
        ctx.lineTo(44.2, 9.9);
        ctx.stroke();
    }

    /* ============ ESCUDO TORRE GRANDE (elemento principal) ============ */
    // desenhado "encarando" a câmera (face frontal inclinada), forma de torre vertical
    // escudo: maior e mais quadrado (slab retangular com cantos leves)
    function desenharEscudo(ctx, defesa, resp) {
        let x0 = defesa ? 1.0 : -7.2;       // encosta no tronco em defesa
        let top = defesa ? 0.4 : -2.4;
        let bot = defesa ? 26.2 : 13.0;     // idle: cobre peito/cintura — defesa: cobre até as pernas
        let W = 15.4;                       // ESCUDO GRANDE
        // face principal — quase retangular (topo reto, cantos suaves, base reta)
        let face = _grad(ctx, x0, top, x0 + W, bot, [0, '#8b9fb2', 0.4, '#56697b', 1, '#2f3b47']);
        ctx.fillStyle = face;
        ctx.beginPath();
        ctx.moveTo(x0 + 1.2, top + 0.4);
        ctx.lineTo(x0 + W - 1.2, top + 0.4);
        ctx.quadraticCurveTo(x0 + W, top + 0.4, x0 + W, top + 1.8);
        ctx.lineTo(x0 + W, bot - 1.2);
        ctx.quadraticCurveTo(x0 + W, bot, x0 + W - 1.2, bot);
        ctx.lineTo(x0 + 1.2, bot);
        ctx.quadraticCurveTo(x0, bot, x0, bot - 1.2);
        ctx.lineTo(x0, top + 1.8);
        ctx.quadraticCurveTo(x0, top + 0.4, x0 + 1.2, top + 0.4);
        ctx.closePath();
        ctx.fill();
        // borda metálica reforçada (espessura)
        ctx.strokeStyle = _grad(ctx, x0, top, x0 + W, bot, [0, '#3e4b58', 0.6, '#1e2730', 1, '#0d1216']);
        ctx.lineWidth = 2.4;
        ctx.stroke();
        // luz do topo (volume) — faixa reta
        ctx.fillStyle = 'rgba(228,238,248,0.25)';
        ctx.beginPath();
        ctx.moveTo(x0 + 2.0, top + 2.2);
        ctx.lineTo(x0 + W - 2.0, top + 2.4);
        ctx.lineTo(x0 + W - 3.2, top + 4.2);
        ctx.lineTo(x0 + 1.8, top + 4.0);
        ctx.closePath();
        ctx.fill();
        // PLACA METÁLICA CENTRAL (placa grande elevada)
        ctx.fillStyle = _grad(ctx, x0 + 2.6, top + 3.4, x0 + W - 2.6, bot - 2.6, [0, '#7f93a6', 0.5, '#4d6072', 1, '#2a3440']);
        ctx.beginPath();
        ctx.moveTo(x0 + 3.0, top + 5.2);
        ctx.lineTo(x0 + W - 3.2, top + 5.6);
        ctx.lineTo(x0 + W - 4.0, bot - 4.4);
        ctx.lineTo(x0 + 2.6, bot - 4.8);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(10,14,20,0.6)';
        ctx.lineWidth = 1;
        ctx.stroke();
        // filete dourado discreto no centro vertical
        ctx.fillStyle = 'rgba(216,178,60,0.85)';
        ctx.fillRect(x0 + W * 0.5 - 0.55, top + 4.6, 1.1, bot - 9.6);
        // boss (umbão) central — placa redonda pequena
        ctx.fillStyle = _grad(ctx, x0 + W * 0.5 - 3, bot - 10.5, x0 + W * 0.5 + 3, bot - 4.5, [0, '#b9c8d6', 1, '#5d6f80']);
        ctx.beginPath();
        ctx.arc(x0 + W * 0.5, bot - 7.4, 2.9, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(10,14,20,0.7)';
        ctx.lineWidth = 0.8;
        ctx.stroke();
        // rebites nas bordas
        ctx.fillStyle = 'rgba(230,238,246,0.8)';
        [
            [x0 + 1.6, top + 4.8], [x0 + W - 1.8, top + 5.2],
            [x0 + 1.8, bot - 2.6], [x0 + W - 2.0, bot - 3.0],
            [x0 + W * 0.5, top + 1.6]
        ].forEach(function (p) { ctx.beginPath(); ctx.arc(p[0], p[1], 0.7, 0, Math.PI * 2); ctx.fill(); });
        // arranhões e marcas de batalha
        ctx.strokeStyle = 'rgba(18,24,32,0.6)';
        ctx.lineWidth = 0.9;
        _lin(ctx, x0 + 3.6, top + 8.4, x0 + W * 0.55, top + 10.0);
        _lin(ctx, x0 + W * 0.6, bot - 8.8, x0 + W * 0.9, bot - 6.4);
        ctx.strokeStyle = 'rgba(255,255,255,0.10)';
        _lin(ctx, x0 + 3.8, top + 8.1, x0 + W * 0.55, top + 9.7);
        // alça/empunhadura (correias) — mão segura por trás
        ctx.strokeStyle = 'rgba(40,30,22,0.8)';
        ctx.lineWidth = 1.4;
        _lin(ctx, x0 + 2.0, bot - 12.8, x0 + 4.4, bot - 4.2);
        _lin(ctx, x0 + W - 2.2, bot - 12.8, x0 + W - 4.6, bot - 4.4);
        // pequena luva da mão esquerda espiando na borda (segura o escudo)
        ctx.fillStyle = '#262e36';
        ctx.beginPath();
        ctx.ellipse(x0 + W + 0.5, bot - 6.2, 1.6, 1.1, 0.5, 0, Math.PI * 2);
        ctx.fill();
    }

    // braço esquerdo que sustenta o escudo (desenhado no frame do escudo, atrás dele)
    function desenharBracoEscudante(ctx, resp, mov) {
        ctx.lineCap = 'round';
        let v = resp * 0.7 + (mov ? 1.0 : 0.3);
        ctx.strokeStyle = '#313d49';
        ctx.lineWidth = 5.0;
        _lin(ctx, -5.6, -6.0, -2.0, -2.2 + v * 0.4);
        ctx.strokeStyle = '#5c6f83';
        ctx.lineWidth = 3.8;
        _lin(ctx, -2.0, -2.2 + v * 0.4, 3.2, 0.8 + v * 0.3);
        // luva grossa segurando a alça (atrás da face do escudo)
        ctx.fillStyle = '#2a323a';
        ctx.beginPath();
        ctx.arc(5.4, 2.4 + v * 0.3, 1.9, 0, Math.PI * 2);
        ctx.fill();
    }

    /* ---------- atualização e desenho de partículas locais (só self) ---------- */
    function atualizarParticulas(ctx, agora) {
        for (let i = dust.length - 1; i >= 0; i--) {
            let d = dust[i];
            d.x += d.vx; d.y += d.vy; d.vy -= 0.012; d.life -= 0.022; d.r += 0.12;
            if (d.life <= 0) { dust.splice(i, 1); continue; }
            ctx.fillStyle = 'rgba(170,150,130,' + (d.life * 0.24) + ')';
            ctx.beginPath();
            ctx.ellipse(d.x, d.y, d.r, d.r * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        for (let i = sparks.length - 1; i >= 0; i--) {
            let s = sparks[i];
            s.x += s.vx; s.y += s.vy; s.vy += 0.22; s.life -= 0.055;
            if (s.life <= 0) { sparks.splice(i, 1); continue; }
            ctx.strokeStyle = s.cor;
            ctx.globalAlpha = s.life;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(s.x, s.y);
            ctx.lineTo(s.x - s.vx * 2, s.y - s.vy * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
        for (let i = glints.length - 1; i >= 0; i--) {
            let gl = glints[i];
            gl.life -= 0.045;
            if (gl.life <= 0) { glints.splice(i, 1); continue; }
            ctx.fillStyle = 'rgba(120,190,255,' + (gl.life * 0.55) + ')';
            ctx.beginPath();
            ctx.arc(gl.x, gl.y, 1.0 + gl.life * 0.8, 0, Math.PI * 2);
            ctx.fill();
        }
        // glint ambiente esporádico na armadura (metal discreto)
        if (agora % 1500 < 30 && glints.length < 4) {
            glints.push({ x: 9 + Math.random() * 9, y: 8 + Math.random() * 7, life: 1 });
        }
        // poeira dos passos (self)
        if ((agora - lastDust) > 130) {
            lastDust = agora;
            if ((typeof window.walkCycle === 'number') && Math.abs(Math.sin(window.walkCycle * Math.PI * 2)) > 0.65) {
                let lado = (Math.sin(window.walkCycle * Math.PI * 2) > 0) ? 1 : -1;
                dust.push({ x: 12 + lado * 3 + (Math.random() - 0.5), y: 29, vx: -0.5 - Math.random() * 0.5, vy: -0.25 - Math.random() * 0.3, life: 0.9, r: 1.6 + Math.random() * 1.6 });
            }
        }
    }

    /* ============================================================
       DESENHADOR PRINCIPAL — assinatura inalterada
       (x, y, corCapa, isMoving, anguloBase, hp, maxHp, isSpinning, spinTimer, pid)
       ============================================================ */
    window.desenharGuerreiro = function (x, y, corCapa, isMoving, anguloBase, hp, maxHp, isSpinning, spinTimer, pid) {
        if (hp <= 0 || !window.ctx) return;
        let ctx = window.ctx;
        ctx.save();
        ctx.translate(x, y);

        // v1.39.6: Extrair informação visual da arma equipada
        let armaVisual = null;
        if (pid === window.meuId) {
            if (window.inventario && window.inventario.arma) {
                armaVisual = {
                    nome: window.inventario.arma.nome,
                    raridade: window.inventario.arma.raridade,
                    customVisual: window.inventario.arma.customVisual || null
                };
            }
        } else if (pid && window.players && window.players[pid] && window.players[pid].armaVisual) {
            armaVisual = window.players[pid].armaVisual;
        }

        let agora = _agora();
        let pctHp = (maxHp && maxHp > 0) ? (hp / maxHp) : 1;
        let resp = Math.sin(agora / 720);
        let passo = (typeof window.walkCycle === 'number') ? window.walkCycle : 0;
        let dano = (window.danoFlashTimer || 0) > 0;
        let pidK = pid || '';

        // recuo elástico do Grito de Provocação (mantido)
        let prepTimer = window.guerreiroPrepTimers[pidK] || 0;
        if (prepTimer > 0) {
            let fPrep = Math.min(1.0, prepTimer / 10);
            ctx.translate(12, 16);
            ctx.scale(1.0 + Math.sin(fPrep * Math.PI) * 0.12, 1.0 - Math.sin(fPrep * Math.PI) * 0.16);
            ctx.translate(-12, -16);
        }

        let angulo = anguloBase;
        let progressoGiro = 0;
        if (isSpinning) {
            progressoGiro = (30 - (spinTimer || 0)) / 30;
            angulo = anguloBase + (progressoGiro * Math.PI * 10);
        }

        // postura defensiva (escudo à frente): durante o recuo do Grito ou anim de defesa
        let defIni = window.guerreiroDefesas[pidK] || 0;
        let defesa = (prepTimer > 0) || (defIni && (agora - defIni) < 620);

        // Aura da Passiva Resistência do Último Fôlego (intacta)
        if (pctHp <= 0.50) desenharAuraUltimoFolego(ctx, pctHp, Date.now());

        // sombra no chão (tanque pesado)
        ctx.fillStyle = "rgba(0,0,0,0.42)";
        ctx.beginPath();
        ctx.ellipse(11, 31, 13, 3.6, 0, 0, Math.PI * 2);
        ctx.fill();

        // tomada de postura defensiva: corpo abaixa leve e inclina
        if (defesa) ctx.translate(0.8, 1.3);

        // TORNADO: o corpo inteiro gira (arma + escudo acompanham)
        if (isSpinning) {
            ctx.save();
            ctx.translate(12, 16);
            ctx.rotate(angulo);
            ctx.translate(-12, -16);
        }

        // ---- atrás → frente ----
        desenharCapa(ctx, corCapa, resp, isMoving);
        desenharPernas(ctx, passo, isMoving, defesa);
        desenharTronco(ctx, dano, resp);
        desenharOmbros(ctx, dano);
        desenharCapacete(ctx, resp, corCapa);

        let atk = 0;
        let corteIni = window.guerreiroCortes[pidK] || 0;
        if (corteIni) atk = Math.max(0, Math.min(1, (agora - corteIni) / 340));

        if (isSpinning) {
            // giro: escudo no braço esquerdo (fixo ao corpo que gira) + espada erguida
            ctx.save();
            ctx.translate(-11.5, 0);
            desenharBracoEscudante(ctx, 0, isMoving);
            desenharEscudo(ctx, false, resp);
            ctx.restore();
            desenharEspadaDefesa(ctx, armaVisual);
        } else if (defesa) {
            // DEFESA: escudo torre erguido cobrindo a frente; espada preparada atrás
            desenharEspadaDefesa(ctx, armaVisual);
            desenharEscudo(ctx, true, resp);
        } else {
            // IDLE / CAMINHADA: escudo (braço esquerdo, atrás) gira com a direção
            ctx.save();
            ctx.translate(12, 16);
            ctx.rotate(angulo);
            ctx.translate(-11.5, 0);
            desenharBracoEscudante(ctx, resp, isMoving);
            desenharEscudo(ctx, false, resp);
            ctx.restore();
            // mão direita: braço + ESPADA DE ESTOCADA (gira com a direção)
            ctx.save();
            ctx.translate(12, 16);
            ctx.rotate(angulo);
            ctx.translate(14.0, 0);
            desenharBracoEspada(ctx, atk, armaVisual);
            ctx.restore();
        }

        // faíscas de bloqueio (escudo/armadura) + partículas locais — só do próprio jogador
        if (pidK === window.meuId) {
            if (dano) {
                let n = 3 + Math.floor(Math.random() * 2);
                for (let i = 0; i < n; i++) {
                    sparks.push({
                        x: (defesa ? 4 : 8) + Math.random() * (defesa ? 10 : 8),
                        y: (defesa ? 3 : 9) + Math.random() * (defesa ? 17 : 9),
                        vx: (Math.random() - 0.5) * 2.8,
                        vy: -1.2 - Math.random() * 1.8,
                        life: 1, cor: Math.random() > 0.5 ? '#f6d565' : '#dfe9f4'
                    });
                }
            }
            atualizarParticulas(ctx, agora);
        }

        if (isSpinning) ctx.restore(); // fim da rotação do corpo

        // anel do Tornado (mantido, polido)
        if (isSpinning) {
            ctx.save();
            ctx.translate(12, 16);
            ctx.globalAlpha = 1.0 - (progressoGiro * 0.3);
            ctx.strokeStyle = "#4aa3ff";
            ctx.lineWidth = 6;
            ctx.shadowColor = "#3498db";
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(0, 0, 35, 0, Math.PI * 1.5);
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, 24, Math.PI, Math.PI * 2.5);
            ctx.stroke();
            ctx.restore();
        }

        ctx.restore();

        // Barra de Vida (padrão do jogo)
        if (typeof window.desenharBarraHp === "function") {
            window.desenharBarraHp(x - 3, y - 8, hp, maxHp);
        }
    };

    window.enviarAtaqueGuerreiro = function (ws) {
        if (window.estaMorto) return;
        if (typeof window.registrarCorteGuerreiro === 'function') window.registrarCorteGuerreiro(window.meuId);
        if (typeof window.tocarSomCorte === 'function') window.tocarSomCorte();
        if (typeof window.criarEfeitoCorte === 'function') window.criarEfeitoCorte(window.meuX + 12, window.meuY + 16, window.meuAngulo);
        if (ws && ws.readyState === 1) { ws.send(JSON.stringify({ action: 'corte' })); }
    };

    /* ============================================================
       Passiva: Resistência do Último Fôlego — 3 níveis de aura
       (mantida integralmente do visual anterior)
       ============================================================ */
    function desenharAuraUltimoFolego(ctx, pctHp, agora) {
        ctx.save();

        let cx = 12;
        let cy = 20;

        if (pctHp <= 0.10) {
            // NÍVEL 3 (HP <= 10%): FÚRIA DA SOBREVIVÊNCIA (-15% Dano Recebido)
            let pulsoCoracao = Math.sin(agora / 80) * 3.5;
            let raio3 = 24 + pulsoCoracao;
            for (let i = 0; i < 5; i++) {
                let offsetChama = Math.sin((agora / 120) + i * 1.3) * 6;
                let altChama = 14 + Math.sin((agora / 90) + i) * 8;
                ctx.fillStyle = (i % 2 === 0) ? "rgba(231, 76, 60, 0.4)" : "rgba(241, 196, 15, 0.4)";
                ctx.beginPath();
                ctx.ellipse(cx + (i - 2) * 6, cy + 8 - altChama / 2, 4, altChama / 2, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.beginPath();
            ctx.ellipse(cx, cy + 10, raio3, raio3 * 0.58, 0, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(231, 76, 60, 0.9)";
            ctx.lineWidth = 3.2;
            ctx.stroke();
            ctx.beginPath();
            ctx.ellipse(cx, cy + 10, raio3 - 4, (raio3 - 4) * 0.58, 0, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(241, 196, 15, 0.85)";
            ctx.lineWidth = 1.8;
            ctx.stroke();
            let qtdShards = 3;
            let angBase = agora / 280;
            for (let s = 0; s < qtdShards; s++) {
                let ang = angBase + s * (Math.PI * 2 / qtdShards);
                let sx = cx + Math.cos(ang) * 26;
                let sy = cy + 4 + Math.sin(ang) * 16;
                ctx.save();
                ctx.translate(sx, sy);
                ctx.rotate(ang + Math.PI / 2);
                ctx.fillStyle = "rgba(241, 196, 15, 0.9)";
                ctx.strokeStyle = "#e74c3c";
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(0, -6);
                ctx.lineTo(4, 0);
                ctx.lineTo(0, 6);
                ctx.lineTo(-4, 0);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            }
        } else if (pctHp <= 0.30) {
            // NÍVEL 2 (HP <= 30%): POSTURA INABALÁVEL (-10% Dano Recebido)
            let pulsoMedio = Math.sin(agora / 160) * 2.2;
            let raio2 = 20 + pulsoMedio;
            ctx.beginPath();
            ctx.ellipse(cx, cy + 8, raio2, raio2 * 0.55, 0, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(230, 126, 34, 0.75)";
            ctx.lineWidth = 2.4;
            ctx.stroke();
            ctx.fillStyle = "rgba(243, 156, 18, 0.14)";
            ctx.fill();
            let angBase2 = agora / 550;
            for (let s = 0; s < 2; s++) {
                let ang = angBase2 + s * Math.PI;
                let sx = cx + Math.cos(ang) * 22;
                let sy = cy + 4 + Math.sin(ang) * 12;
                ctx.fillStyle = "rgba(243, 156, 18, 0.85)";
                ctx.beginPath();
                ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
                ctx.fill();
            }
            let sparkY = (agora / 25) % 24;
            ctx.fillStyle = "rgba(255, 230, 100, 0.7)";
            ctx.beginPath();
            ctx.arc(cx - 7, cy + 12 - sparkY, 1.5, 0, Math.PI * 2);
            ctx.arc(cx + 7, cy + 16 - ((sparkY + 12) % 24), 1.5, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // NÍVEL 1 (HP <= 50%): ESCUDO DE VONTADE (-5% Dano Recebido)
            let pulsoSuave = Math.sin(agora / 260) * 1.5;
            let raio1 = 16 + pulsoSuave;
            ctx.beginPath();
            ctx.ellipse(cx, cy + 8, raio1, raio1 * 0.52, 0, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(243, 156, 18, 0.4)";
            ctx.lineWidth = 1.8;
            ctx.stroke();
            ctx.fillStyle = "rgba(243, 156, 18, 0.08)";
            ctx.fill();
        }

        ctx.restore();
    }
})();