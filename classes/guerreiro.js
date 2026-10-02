// classes/guerreiro.js — Renderização completa do Guerreiro (CAVALEIRO DA VANGUARDA / TANQUE PESADO)
// 100% procedural em Canvas 2D: Armadura completa de placas gravadas, Elmo Great Helm,
// Escudo Ogival (Kite Shield) com o Leão Rampante Dourado e Lança de Batalha com Borla Vermelha.
// NENHUMA mecânica alterada: apenas representação visual + animações/VFX fiéis à arte conceitual.
(function () {
    'use strict';

    function _agora() {
        return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    }

    // ---- estados visuais por jogador ----
    window.guerreiroPrepTimers = window.guerreiroPrepTimers || {}; // recuo elástico do Grito de Provocação
    window.guerreiroCortes = window.guerreiroCortes || {};         // início (ms) da estocada de lança / pid
    window.guerreiroDefesas = window.guerreiroDefesas || {};       // início (ms) da postura defensiva / pid

    window.registrarCorteGuerreiro = function (pid) { if (pid) window.guerreiroCortes[pid] = _agora(); };
    window.registrarDefesaGuerreiro = function (pid) { if (pid) window.guerreiroDefesas[pid] = _agora(); };

    // partículas locais (poeira / faíscas de bloqueio / glints metálicos / cruzes de cura) — só do próprio jogador
    let dust = [], sparks = [], glints = [], healCrosses = [];
    let lastDust = 0;

    /* ---------- utilitários de desenho ---------- */
    function _grad(ctx, x1, y1, x2, y2, stops) {
        let g = ctx.createLinearGradient(x1, y1, x2, y2);
        for (let i = 0; i < stops.length; i += 2) g.addColorStop(stops[i], stops[i + 1]);
        return g;
    }

    function _radGrad(ctx, x1, y1, r1, x2, y2, r2, stops) {
        let g = ctx.createRadialGradient(x1, y1, r1, x2, y2, r2);
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

    function _lin(ctx, x1, y1, x2, y2) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }

    /* ============================================================
       1. ESCUDO OGIVAL (KITE SHIELD) COM LEÃO RAMPANTE DOURADO
       Baseado diretamente na arte de referência: formato em ogiva/gota,
       borda dourada chanfrada com relevo e o Leão Heráldico Rampante.
       ============================================================ */
    function desenharPathEscudoOgival(ctx, x, y, w, h) {
        let topArc = h * 0.10;
        let sideH = h * 0.44;
        let midX = x + w / 2;
        ctx.beginPath();
        ctx.moveTo(x, y + topArc);
        ctx.quadraticCurveTo(midX, y - 1.2, x + w, y + topArc);
        ctx.lineTo(x + w, y + sideH);
        ctx.quadraticCurveTo(x + w * 0.94, y + h * 0.78, midX, y + h);
        ctx.quadraticCurveTo(x + w * 0.06, y + h * 0.78, x, y + sideH);
        ctx.closePath();
    }

    // Renderiza o Leão Rampante Dourado heráldico no centro do escudo
    function desenharLeaoRampante(ctx, cx, cy, escala) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(escala, escala);

        let gOuro = _grad(ctx, -5, -8, 6, 8, [
            0, '#fff6a6',
            0.3, '#f1c40f',
            0.7, '#d4ac0d',
            1, '#8f6b08'
        ]);

        ctx.fillStyle = gOuro;
        ctx.strokeStyle = '#634b05';
        ctx.lineWidth = 0.55;

        // Cabeça do Leão com juba e boca rugindo
        ctx.beginPath();
        ctx.moveTo(-1.8, -7.2);
        ctx.lineTo(-3.6, -7.0); // focinho
        ctx.lineTo(-4.2, -6.2); // boca aberta
        ctx.lineTo(-3.2, -5.8);
        ctx.lineTo(-4.0, -5.4); // mandíbula
        ctx.lineTo(-2.8, -4.8); // queixo
        // Juba ondulada em camadas
        ctx.lineTo(-3.4, -3.8);
        ctx.lineTo(-1.8, -3.2);
        ctx.lineTo(-2.6, -2.0);
        ctx.lineTo(-0.8, -1.5);
        // Peito musculoso
        ctx.lineTo(-1.2, 0.5);
        ctx.lineTo(-0.4, 2.2); // abdômen
        // Pata dianteira inferior (reachiing forward)
        ctx.lineTo(-2.2, 1.0);
        ctx.lineTo(-3.8, 1.4);
        ctx.lineTo(-4.2, 1.0); // garra
        ctx.lineTo(-3.2, 0.4);
        ctx.lineTo(-1.6, -0.2);
        // Pata dianteira superior (erguida atacando)
        ctx.lineTo(-2.8, -2.6);
        ctx.lineTo(-4.6, -3.2);
        ctx.lineTo(-5.2, -2.6); // garras
        ctx.lineTo(-4.8, -2.0);
        ctx.lineTo(-3.6, -1.8);
        ctx.lineTo(-2.0, -1.2);
        // Dorso e perna traseira esquerda
        ctx.lineTo(0.8, -2.5);
        ctx.lineTo(1.6, 0.0);
        ctx.lineTo(2.2, 2.8); // coxa traseira
        ctx.lineTo(1.0, 4.4);
        ctx.lineTo(-0.4, 5.8); // pata traseira apoiada
        ctx.lineTo(-1.2, 5.6);
        ctx.lineTo(0.2, 4.2);
        ctx.lineTo(1.2, 3.0);
        // Perna traseira direita (avançada)
        ctx.lineTo(1.8, 4.8);
        ctx.lineTo(2.6, 6.4);
        ctx.lineTo(3.2, 6.0);
        ctx.lineTo(2.4, 4.2);
        ctx.lineTo(1.8, 2.2);
        // Cauda sinuosa em 'S' erguida com tufo no topo
        ctx.lineTo(2.0, 0.8);
        ctx.quadraticCurveTo(3.8, -1.5, 4.2, -4.2);
        ctx.quadraticCurveTo(3.8, -6.4, 2.6, -6.8);
        // Tufo da cauda (bifurcado)
        ctx.lineTo(3.4, -7.8);
        ctx.lineTo(2.4, -8.2);
        ctx.lineTo(1.8, -7.2);
        ctx.lineTo(2.0, -6.2);
        ctx.quadraticCurveTo(3.0, -5.8, 3.0, -4.0);
        ctx.quadraticCurveTo(2.6, -1.8, 1.2, -0.4);
        // Orelha e topo da cabeça
        ctx.lineTo(0.6, -3.8);
        ctx.lineTo(0.8, -6.2);
        ctx.lineTo(-0.2, -7.4); // orelha
        ctx.lineTo(-0.8, -6.6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Olho brilhante do Leão
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-2.6, -6.4, 0.45, 0, Math.PI * 2);
        ctx.fill();

        // Filetes de luz especular nas garras e juba
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.lineWidth = 0.5;
        _lin(ctx, -1.6, -6.8, -0.8, -6.2);
        _lin(ctx, -4.2, -2.8, -3.2, -2.2);
        _lin(ctx, 2.4, -7.2, 3.0, -4.8);

        ctx.restore();
    }

    // Desenha o escudo completo no frame do braço / tronco
    function desenharEscudoOgivalLeao(ctx, x0, top, W, H, modo) {
        let midX = x0 + W / 2;

        // Sombra suave sob o escudo
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.55)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 1.5;
        ctx.shadowOffsetY = 2;

        // 1. Base / Moldura Chanfrada Dourada Externa
        desenharPathEscudoOgival(ctx, x0, top, W, H);
        let gMoldura = _grad(ctx, x0, top, x0 + W, top + H, [
            0, '#ffe57f',
            0.2, '#f1c40f',
            0.5, '#d4ac0d',
            0.8, '#9a7d0a',
            1, '#614e04'
        ]);
        ctx.fillStyle = gMoldura;
        ctx.fill();
        ctx.restore();

        // Contorno fino escuro da moldura
        ctx.strokeStyle = '#382a02';
        ctx.lineWidth = 0.8;
        desenharPathEscudoOgival(ctx, x0, top, W, H);
        ctx.stroke();

        // 2. Campo Interno de Aço Temperado (aço-cinza profundo com reflexos azuis)
        let pad = 2.1;
        let inX = x0 + pad, inY = top + pad, inW = W - pad * 2, inH = H - pad * 2.2;
        desenharPathEscudoOgival(ctx, inX, inY, inW, inH);
        let gCampo = _grad(ctx, inX, inY, inX + inW, inY + inH, [
            0, '#667d94',
            0.25, '#4a5b6c',
            0.6, '#313d49',
            1, '#1c242c'
        ]);
        ctx.fillStyle = gCampo;
        ctx.fill();

        // Filete de borda dourada interna
        ctx.strokeStyle = 'rgba(241, 196, 15, 0.65)';
        ctx.lineWidth = 0.7;
        desenharPathEscudoOgival(ctx, inX, inY, inW, inH);
        ctx.stroke();

        // 3. Reflexo Especular Diagonal (Luz no Aço)
        ctx.save();
        desenharPathEscudoOgival(ctx, inX, inY, inW, inH);
        ctx.clip();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
        ctx.beginPath();
        ctx.moveTo(inX, inY);
        ctx.lineTo(inX + inW * 0.7, inY);
        ctx.lineTo(inX, inY + inH * 0.75);
        ctx.closePath();
        ctx.fill();

        // Linha de dobra central do escudo (vinco longitudinal de reforço)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 0.8;
        _lin(ctx, midX - 0.3, inY + 0.5, midX - 0.3, inY + inH - 1);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.lineWidth = 0.8;
        _lin(ctx, midX + 0.3, inY + 0.5, midX + 0.3, inY + inH - 1);

        // 4. O BRASÃO HERÁLDICO: LEÃO RAMPANTE DOURADO
        let escalaLeao = Math.min(inW / 18, inH / 26) * 1.35;
        desenharLeaoRampante(ctx, midX, inY + inH * 0.48, escalaLeao);

        ctx.restore();

        // 5. Rebites dourados na borda superior e lateral
        ctx.fillStyle = '#fff4a3';
        let rebites = [
            [x0 + 2.5, top + 3.2],
            [midX, top + 1.2],
            [x0 + W - 2.5, top + 3.2],
            [x0 + 1.6, top + H * 0.38],
            [x0 + W - 1.6, top + H * 0.38],
            [midX, top + H - 2.2]
        ];
        rebites.forEach(function (pt) {
            ctx.beginPath();
            ctx.arc(pt[0], pt[1], 0.7, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    /* ============================================================
       2. A LANÇA DE BATALHA (ORNATE BATTLE SPEAR)
       Substitui a espada antiga. Haste de madeira escura reforçada,
       borla vermelha no pomo traseiro, asas de proteção douradas
       e lâmina afiada em folha de louro com fio de luz prateado.
       ============================================================ */
    window.desenharLancaBatalhaExposta = desenharLancaBatalha;
    window.desenharLaminaLargaExposta = desenharLancaBatalha; // retrocompatibilidade

    function desenharLancaBatalha(ctx, off, armaVisual, faseAtk) {
        // Origem no frame: mão segurando a haste em (0, 0)
        // Direção longitudinal ao longo do eixo X (+X para a ponta, -X para a traseira)
        let L_Ponta = 30.0 + (off || 0); // comprimento à frente da mão
        let L_Traseira = 16.0;          // comprimento atrás da mão

        // Paleta base (Aço de Cavaleiro Imperial)
        let cAcoClaro = '#f4f6f7';
        let cAcoMeio = '#bdc3c7';
        let cAcoEscuro = '#566573';
        let cOuro = '#f1c40f';
        let cOuroEscuro = '#9a7d0a';
        let cMadeira = '#3e2a1e';
        let cMadeiraLuz = '#5c4033';
        let cBorla = '#c0392b';
        let cBorlaLuz = '#e74c3c';

        // Apoio a customVisual / raridades
        if (armaVisual && armaVisual.customVisual) {
            let cv = armaVisual.customVisual;
            cAcoClaro = cv.cBase || cAcoClaro;
            cAcoMeio = cv.cMeio || cAcoMeio;
            cAcoEscuro = cv.cPonta || cAcoEscuro;
        } else if (armaVisual) {
            if (armaVisual.raridade === 'raro') {
                cAcoClaro = '#d4e6f1'; cAcoMeio = '#5dade2'; cAcoEscuro = '#1b4f72'; cOuro = '#85c1e9';
            } else if (armaVisual.raridade === 'epico') {
                cAcoClaro = '#ebd5f7'; cAcoMeio = '#af7ac5'; cAcoEscuro = '#512e5f'; cOuro = '#bb8fce';
            } else if (armaVisual.raridade === 'lendario') {
                cAcoClaro = '#fdebd0'; cAcoMeio = '#f39c12'; cAcoEscuro = '#784212'; cOuro = '#f39c12';
            }
        }

        // 1. HASTE DE MADEIRA (Shaft)
        let gHaste = _grad(ctx, -L_Traseira, -1.1, L_Ponta * 0.55, 1.1, [
            0, cMadeira,
            0.5, cMadeiraLuz,
            1, cMadeira
        ]);
        ctx.fillStyle = gHaste;
        ctx.fillRect(-L_Traseira, -1.0, L_Traseira + L_Ponta * 0.55, 2.0);
        ctx.strokeStyle = '#22150d';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(-L_Traseira, -1.0, L_Traseira + L_Ponta * 0.55, 2.0);

        // Abraçadeiras / Anéis de Latão Dourado na haste
        [-8.0, 4.0, 12.0].forEach(function (ax) {
            ctx.fillStyle = cOuro;
            ctx.fillRect(ax, -1.3, 2.0, 2.6);
            ctx.strokeStyle = cOuroEscuro;
            ctx.lineWidth = 0.4;
            ctx.strokeRect(ax, -1.3, 2.0, 2.6);
        });

        // 2. POMO TRASEIRO E BORLA VERMELHA CARMESIM (Tassel)
        let pomX = -L_Traseira;
        ctx.fillStyle = cOuro;
        ctx.beginPath();
        ctx.arc(pomX, 0, 1.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = cOuroEscuro;
        ctx.lineWidth = 0.5;
        ctx.stroke();

        // Anel de fixação da borla
        ctx.strokeStyle = cOuro;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(pomX - 1.6, 0, 1.0, 0, Math.PI * 2);
        ctx.stroke();

        // Fios da Borla Vermelha balançando
        let balanco = Math.sin((faseAtk || 0) * Math.PI * 2 + Date.now() / 250) * 1.5;
        let borlaX = pomX - 2.4;
        let borlaY = 0;

        // Cabeça da borla (nó esférico de seda)
        ctx.fillStyle = cBorla;
        ctx.beginPath();
        ctx.arc(borlaX, borlaY, 1.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = cOuro;
        ctx.fillRect(borlaX - 0.4, borlaY - 0.5, 0.8, 1.0); // anel dourado do nó

        // Franjas pendentes da borla
        ctx.strokeStyle = cBorlaLuz;
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(borlaX, borlaY);
        ctx.quadraticCurveTo(borlaX - 3.5, borlaY + balanco, borlaX - 6.5, borlaY + 1.2 + balanco * 1.4);
        ctx.stroke();
        ctx.strokeStyle = cBorla;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(borlaX, borlaY);
        ctx.quadraticCurveTo(borlaX - 3.0, borlaY - balanco * 0.8, borlaX - 5.8, borlaY - 1.0 - balanco);
        ctx.stroke();

        // 3. BASE DA PONTA: GUARDA ALADA (Winged Lugs / Crossguard)
        let baseBladeX = L_Ponta * 0.55;
        let wingW = 3.6;

        ctx.fillStyle = cOuro;
        ctx.beginPath();
        // Colar de encaixe
        ctx.fillRect(baseBladeX - 1.5, -1.8, 3.0, 3.6);
        // Asa superior curvada para trás
        ctx.moveTo(baseBladeX, -1.8);
        ctx.quadraticCurveTo(baseBladeX - 1.5, -wingW - 1.5, baseBladeX - 3.5, -wingW - 0.5);
        ctx.lineTo(baseBladeX - 2.8, -wingW + 0.8);
        ctx.quadraticCurveTo(baseBladeX - 0.8, -wingW, baseBladeX + 1.5, -1.5);
        // Asa inferior curvada para trás
        ctx.moveTo(baseBladeX, 1.8);
        ctx.quadraticCurveTo(baseBladeX - 1.5, wingW + 1.5, baseBladeX - 3.5, wingW + 0.5);
        ctx.lineTo(baseBladeX - 2.8, wingW - 0.8);
        ctx.quadraticCurveTo(baseBladeX - 0.8, wingW, baseBladeX + 1.5, 1.5);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = cOuroEscuro;
        ctx.lineWidth = 0.6;
        ctx.stroke();

        // 4. LÂMINA DE AÇO FOLHA-DE-LOURO (Spearhead Blade)
        let tipX = L_Ponta;
        let midBladeX = baseBladeX + (tipX - baseBladeX) * 0.42;
        let halfW = 3.1; // largura máxima da folha

        let gBlade = _grad(ctx, baseBladeX, -halfW, tipX, halfW, [
            0, cAcoClaro,
            0.4, cAcoMeio,
            1, cAcoEscuro
        ]);

        ctx.fillStyle = gBlade;
        ctx.beginPath();
        ctx.moveTo(baseBladeX + 1.5, -1.2);
        ctx.quadraticCurveTo(midBladeX, -halfW, tipX, 0); // aresta superior curvada
        ctx.quadraticCurveTo(midBladeX, halfW, baseBladeX + 1.5, 1.2); // aresta inferior
        ctx.closePath();
        ctx.fill();

        // Linha central de crista (vinco longitudinal de reforço perfurante)
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.9;
        _lin(ctx, baseBladeX + 1.0, 0, tipX - 1.0, 0);
        ctx.strokeStyle = 'rgba(40, 50, 60, 0.55)';
        ctx.lineWidth = 0.7;
        _lin(ctx, baseBladeX + 1.0, 0.5, tipX - 2.0, 0.5);

        // Fio de luz reluzente no gume superior
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 0.65;
        ctx.beginPath();
        ctx.moveTo(baseBladeX + 2.5, -1.2);
        ctx.quadraticCurveTo(midBladeX, -halfW + 0.4, tipX - 1.0, -0.2);
        ctx.stroke();
    }

    /* ============================================================
       3. PERNAS E BOTAS (GREVAS ARTICULADAS E SABATONS)
       ============================================================ */
    function desenharPernas(ctx, passo, mov, defesa) {
        let amp = mov ? 2.8 : 0.8;
        let f1 = Math.sin(passo * Math.PI * 2) * amp;
        let f2 = Math.sin(passo * Math.PI * 2 + Math.PI) * amp;
        let crouch = defesa ? 1.8 : 0;
        ctx.lineCap = 'round';

        let pernas = [
            { base: 14.5, f: f1, frente: true },
            { base: 8.5, f: f2, frente: false }
        ];

        pernas.forEach(function (pl) {
            let hx = pl.base, hy = 20.0 - crouch;
            let kx = hx + pl.f * 2.2, ky = 23.0;
            let ax = hx + pl.f * 3.2, ay = 25.8;
            let fx = hx + pl.f * 4.6, fy = 30.0;

            // Malha de aço inferior
            ctx.strokeStyle = '#1a232b';
            ctx.lineWidth = 6.5;
            _lin(ctx, hx, hy, ax, ay);

            // Coxa de placas prateadas (cuisse)
            let gCoxa = _grad(ctx, hx - 2, hy, kx + 2, ky, [0, '#95a5a6', 0.5, '#7f8c8d', 1, '#34495e']);
            ctx.strokeStyle = gCoxa;
            ctx.lineWidth = 5.0;
            _lin(ctx, hx, hy, kx, ky);

            // Joelheira de placa pontiaguda articulada (poleyn)
            ctx.fillStyle = '#bdc3c7';
            ctx.beginPath();
            ctx.moveTo(kx - 1.8, ky - 2.2);
            ctx.lineTo(kx + 2.5, ky);
            ctx.lineTo(kx - 1.8, ky + 2.2);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#2c3e50';
            ctx.lineWidth = 0.8;
            ctx.stroke();
            // Rebite da joelheira
            ctx.fillStyle = '#f1c40f';
            ctx.beginPath(); ctx.arc(kx, ky, 0.7, 0, Math.PI * 2); ctx.fill();

            // Greva (canela de placa de aço)
            let gGreva = _grad(ctx, kx, ky, ax, ay, [0, '#bdc3c7', 0.6, '#7f8c8d', 1, '#2c3e50']);
            ctx.strokeStyle = gGreva;
            ctx.lineWidth = 4.4;
            _lin(ctx, kx, ky, ax, ay);
            ctx.strokeStyle = 'rgba(255,255,255,0.6)';
            ctx.lineWidth = 0.8;
            _lin(ctx, kx + 0.8, ky + 0.3, ax + 0.8, ay);

            // Sabaton (bota de aço articulada pesada com bico pontiagudo)
            ctx.fillStyle = '#34495e';
            ctx.beginPath();
            ctx.moveTo(fx - 3.2, ay - 0.6);
            ctx.lineTo(fx + 2.6, ay - 0.8);
            ctx.lineTo(fx + 4.5, fy - 0.4);
            ctx.lineTo(fx + 3.0, fy);
            ctx.lineTo(fx - 3.4, fy);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#1b2631';
            ctx.lineWidth = 0.9;
            ctx.stroke();

            // Placas articuladas no peito do pé
            ctx.strokeStyle = 'rgba(255,255,255,0.45)';
            ctx.lineWidth = 0.7;
            _lin(ctx, fx - 1.5, ay + 1.2, fx + 2.8, fy - 0.5);
        });
    }

    /* ============================================================
       4. TRONCO, COTA DE MALHA E COURAÇA GRAVADA
       ============================================================ */
    function desenharTronco(ctx, dano, resp) {
        // 1. Saia de Cota de Malha (Fauld) sob o peitoral
        ctx.fillStyle = '#212f3d';
        ctx.beginPath();
        ctx.moveTo(4.6, 19.5);
        ctx.lineTo(19.8, 19.5);
        ctx.lineTo(20.4, 23.6);
        ctx.lineTo(4.0, 23.6);
        ctx.closePath();
        ctx.fill();
        // Textura da cota de malha
        ctx.strokeStyle = 'rgba(189, 195, 199, 0.4)';
        ctx.lineWidth = 0.8;
        for (let my = 20.2; my <= 23.2; my += 1.4) {
            ctx.beginPath();
            ctx.setLineDash([1.5, 1.5]);
            ctx.moveTo(4.6, my); ctx.lineTo(19.8, my);
            ctx.stroke();
        }
        ctx.setLineDash([]);

        // Tassets de aço articulados sobre as coxas
        let tassets = [
            [5.0, 20.2, 8.2, 23.4],
            [8.8, 20.2, 12.2, 23.8],
            [12.8, 20.2, 16.2, 23.8],
            [16.8, 20.2, 19.8, 23.4]
        ];
        tassets.forEach(function (t, i) {
            let gT = _grad(ctx, t[0], t[1], t[2], t[3], [0, '#bdc3c7', 0.5, '#7f8c8d', 1, '#2c3e50']);
            ctx.fillStyle = gT;
            ctx.beginPath();
            ctx.moveTo(t[0], t[1]);
            ctx.lineTo(t[2], t[1]);
            ctx.lineTo(t[2] + 0.4, t[3]);
            ctx.lineTo(t[0] - 0.4, t[3]);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#1b2631';
            ctx.lineWidth = 0.7;
            ctx.stroke();
            // Rebite
            ctx.fillStyle = '#f1c40f';
            ctx.beginPath(); ctx.arc((t[0] + t[2]) / 2, t[3] - 1.0, 0.6, 0, Math.PI * 2); ctx.fill();
        });

        // Cinto de couro reforçado com fivela dourada
        ctx.fillStyle = '#3e2723';
        ctx.fillRect(4.5, 18.8, 15.6, 1.8);
        ctx.fillStyle = '#f1c40f';
        _rr(ctx, 11.0, 18.6, 3.4, 2.2, 0.6);
        ctx.fill();
        ctx.strokeStyle = '#7f6000';
        ctx.lineWidth = 0.6;
        ctx.stroke();

        // 2. PEITORAL MACIÇO DE AÇO COM FILIGRANAS GRAVADAS
        let gP = _grad(ctx, 4.5, 7.5, 20.5, 18.5, [
            0, '#ecf0f1',
            0.25, '#bdc3c7',
            0.65, '#7f8c8d',
            1, '#2c3e50'
        ]);
        ctx.fillStyle = gP;
        ctx.beginPath();
        ctx.moveTo(5.2, 8.6 + resp * 0.2);
        ctx.quadraticCurveTo(12.0, 6.8, 19.4, 8.6 + resp * 0.2);
        ctx.lineTo(20.2, 18.4);
        ctx.quadraticCurveTo(12.5, 20.0, 4.6, 18.4);
        ctx.quadraticCurveTo(4.2, 13.0, 5.2, 8.6 + resp * 0.2);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#1c2833';
        ctx.lineWidth = 1.0;
        ctx.stroke();

        // Crista central vertical de reforço da couraça
        ctx.strokeStyle = 'rgba(255,255,255,0.75)';
        ctx.lineWidth = 1.2;
        _lin(ctx, 12.0, 8.0 + resp * 0.2, 12.0, 18.6);
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 0.9;
        _lin(ctx, 12.7, 8.2 + resp * 0.2, 12.7, 18.5);

        // Filigranas esculpidas em relevo nas laterais da couraça (arabescos imperiais)
        ctx.strokeStyle = 'rgba(33, 47, 61, 0.65)';
        ctx.lineWidth = 0.75;
        // Filigrana lado esquerdo
        ctx.beginPath();
        ctx.moveTo(7.0, 11.0);
        ctx.quadraticCurveTo(9.5, 10.5, 10.5, 13.0);
        ctx.quadraticCurveTo(9.0, 15.5, 7.5, 14.5);
        ctx.stroke();
        // Filigrana lado direito
        ctx.beginPath();
        ctx.moveTo(17.4, 11.0);
        ctx.quadraticCurveTo(14.9, 10.5, 13.9, 13.0);
        ctx.quadraticCurveTo(15.4, 15.5, 16.9, 14.5);
        ctx.stroke();

        // Brilho especular sutil sobre as filigranas
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 0.55;
        ctx.beginPath();
        ctx.moveTo(7.2, 10.8); ctx.quadraticCurveTo(9.6, 10.3, 10.6, 12.8);
        ctx.moveTo(17.2, 10.8); ctx.quadraticCurveTo(14.8, 10.3, 13.8, 12.8);
        ctx.stroke();

        // Flash vermelho de dano
        if (dano) {
            ctx.fillStyle = 'rgba(231, 76, 60, 0.45)';
            ctx.fill();
        }
    }

    /* ============================================================
       5. OMBREIRAS (PAULDRONS EM CAMADAS TRIPLAS)
       ============================================================ */
    function desenharOmbros(ctx, dano) {
        function omb(x, y, w, h, flip) {
            // Placa 1 (superior maior)
            let g1 = _grad(ctx, x, y, x + w, y + h, [0, '#ecf0f1', 0.45, '#bdc3c7', 1, '#34495e']);
            ctx.fillStyle = g1;
            _rr(ctx, x, y, w, h, 3.2);
            ctx.fill();
            ctx.strokeStyle = '#1b2631';
            ctx.lineWidth = 0.8;
            ctx.stroke();

            // Placa 2 (camada inferior articulada)
            ctx.fillStyle = '#7f8c8d';
            _rr(ctx, x + 0.6, y + h * 0.45, w - 1.2, h * 0.55, 2.0);
            ctx.fill();
            ctx.strokeStyle = '#2c3e50';
            ctx.lineWidth = 0.6;
            ctx.stroke();

            // Borda dourada ornamental
            ctx.strokeStyle = '#f1c40f';
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.arc(x + w / 2, y + 1.8, w * 0.38, Math.PI, 0);
            ctx.stroke();

            // Rebites dourados
            ctx.fillStyle = '#f1c40f';
            ctx.beginPath(); ctx.arc(x + 1.6, y + h - 1.4, 0.65, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(x + w - 1.6, y + h - 1.4, 0.65, 0, Math.PI * 2); ctx.fill();
        }

        omb(2.0, 6.8, 6.8, 7.0, false);  // ombreira esquerda
        omb(15.6, 6.8, 7.0, 7.0, true);  // ombreira direita
    }

    /* ============================================================
       6. CAPACETE (GREAT HELM DE CRUZADO / CAVALEIRO MEDIEVAL)
       Design 100% fiel à imagem de referência: Elmo cilíndrico de aço,
       topo plano/abaulado, T-Visor com cruz frontal e orifícios de respiração.
       ============================================================ */
    function desenharCapacete(ctx, resp) {
        let gElmo = _grad(ctx, 8.2, -2.5, 17.0, 7.8, [
            0, '#ecf0f1',
            0.2, '#bdc3c7',
            0.6, '#7f8c8d',
            1, '#2c3e50'
        ]);

        // Cúpula do Great Helm
        ctx.fillStyle = gElmo;
        ctx.beginPath();
        ctx.moveTo(8.6, 6.4);
        ctx.lineTo(8.4, 0.4);
        ctx.quadraticCurveTo(8.6, -2.8, 12.8, -2.8); // topo plano/abaulado
        ctx.quadraticCurveTo(17.0, -2.8, 17.2, 0.4);
        ctx.lineTo(17.0, 6.4);
        ctx.quadraticCurveTo(15.2, 7.8, 12.8, 7.8);
        ctx.quadraticCurveTo(10.2, 7.8, 8.6, 6.4);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#1b2631';
        ctx.lineWidth = 1.0;
        ctx.stroke();

        // Luz superior na borda da coroa
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.beginPath();
        ctx.ellipse(12.8, -2.0, 3.4, 0.8, 0, 0, Math.PI * 2);
        ctx.fill();

        // 1. Faixa Vertical Central Reforçada (Haste vertical da cruz)
        let gFaixaV = _grad(ctx, 11.8, -2.6, 13.8, 7.6, [0, '#f1c40f', 0.5, '#bdc3c7', 1, '#34495e']);
        ctx.fillStyle = gFaixaV;
        ctx.fillRect(12.0, -2.4, 1.6, 9.8);
        ctx.strokeStyle = '#1a252f';
        ctx.lineWidth = 0.55;
        ctx.strokeRect(12.0, -2.4, 1.6, 9.8);

        // 2. Fenda do Visor Horizontal (T-VISOR / Fenda de Olhar Negra Profunda)
        ctx.fillStyle = '#06090e';
        ctx.beginPath();
        ctx.moveTo(9.8, 1.8);
        ctx.lineTo(15.8, 1.8);
        ctx.lineTo(15.6, 3.0);
        ctx.lineTo(9.9, 3.0);
        ctx.closePath();
        ctx.fill();

        // Brilho azulado/aço gélido discreto dentro do visor (olhos do cavaleiro)
        ctx.fillStyle = 'rgba(133, 193, 233, 0.65)';
        ctx.fillRect(10.8, 2.1, 1.2, 0.7);
        ctx.fillRect(13.6, 2.1, 1.2, 0.7);

        // Fenda central descendente (T-Visor)
        ctx.fillStyle = '#06090e';
        ctx.fillRect(12.4, 3.0, 0.8, 3.0);

        // 3. Orifícios Circulares de Ventilação (Breathing Holes na Queixeira)
        ctx.fillStyle = '#06090e';
        // Lado esquerdo (3 furos)
        [3.8, 4.9, 6.0].forEach(function (hy) {
            ctx.beginPath(); ctx.arc(10.8, hy, 0.45, 0, Math.PI * 2); ctx.fill();
        });
        // Lado direito (3 furos)
        [3.8, 4.9, 6.0].forEach(function (hy) {
            ctx.beginPath(); ctx.arc(14.8, hy, 0.45, 0, Math.PI * 2); ctx.fill();
        });

        // 4. Rebites metálicos contornando o Great Helm
        ctx.fillStyle = '#d5dbdb';
        [
            [9.4, -1.2], [16.2, -1.2],
            [9.2, 5.2], [16.4, 5.2],
            [12.8, -2.2]
        ].forEach(function (pt) {
            ctx.beginPath(); ctx.arc(pt[0], pt[1], 0.65, 0, Math.PI * 2); ctx.fill();
        });
    }

    /* ============================================================
       7. BRAÇOS E EMPUNHADURAS (LANÇA E ESCUDO)
       ============================================================ */

    // Braço esquerdo segurando o Escudo Ogival
    function desenharBracoEscudo(ctx, resp, mov, defesa) {
        ctx.lineCap = 'round';
        let v = resp * 0.6 + (mov ? 1.0 : 0.2);

        // Braço em cota de malha + braçadeira de placas
        ctx.strokeStyle = '#212f3d';
        ctx.lineWidth = 4.8;
        _lin(ctx, -5.0, -5.4, -1.8, -2.0 + v * 0.3);
        ctx.strokeStyle = '#7f8c8d';
        ctx.lineWidth = 3.8;
        _lin(ctx, -1.8, -2.0 + v * 0.3, 3.0, 0.6 + v * 0.2);

        // Manopla de placas de aço segurando a alça do escudo
        ctx.fillStyle = '#34495e';
        ctx.beginPath();
        ctx.arc(4.8, 1.8 + v * 0.2, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f1c40f'; // anel dourado no punho
        ctx.lineWidth = 0.7;
        ctx.stroke();
    }

    // Braço direito empunhando a Lança de Batalha (Estocada Penetrante)
    function desenharBracoLanca(ctx, atk, armaVisual) {
        ctx.lineCap = 'round';

        // Cinemática da estocada (Spear Thrust):
        // 0.0 - 0.25: Recuo elástico (wind-up)
        // 0.25 - 0.70: Estocada penetrante violenta para a frente
        // 0.70 - 1.0: Impacto e recuperação suave
        let thrustX = 0;
        let rotAng = -0.22; // inclinação natural da lança em guarda

        if (atk > 0 && atk < 1) {
            if (atk < 0.25) {
                let fRecuo = atk / 0.25;
                thrustX = -5.0 * Math.sin(fRecuo * Math.PI / 2);
                rotAng = -0.22 - 0.15 * fRecuo;
            } else if (atk < 0.70) {
                let fAvanco = (atk - 0.25) / 0.45;
                thrustX = -5.0 + 20.0 * Math.sin(fAvanco * Math.PI / 2);
                rotAng = -0.37 + 0.37 * fAvanco;
            } else {
                let fRetorno = (atk - 0.70) / 0.30;
                thrustX = 15.0 * (1 - fRetorno);
                rotAng = fRetorno * -0.22;
            }
        }

        ctx.save();
        ctx.translate(thrustX, 0);

        // Braço em cota de malha
        ctx.strokeStyle = '#212f3d';
        ctx.lineWidth = 4.8;
        _lin(ctx, -4.2, -5.0, -1.0, -2.2);
        // Braçadeira de placas prateadas com cotoveleira pontiaguda
        ctx.strokeStyle = '#bdc3c7';
        ctx.lineWidth = 3.9;
        _lin(ctx, -1.0, -2.2, 2.0, -0.6);
        // Cotoveleira (couter)
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath(); ctx.arc(-1.0, -2.2, 1.2, 0, Math.PI * 2); ctx.fill();

        // Manopla articulada (mão segurando a haste da lança)
        ctx.fillStyle = '#34495e';
        ctx.beginPath(); ctx.arc(2.5, -0.4, 2.0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#1b2631';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Aplica a rotação da lança a partir da manopla
        ctx.save();
        ctx.translate(2.5, -0.4);
        ctx.rotate(rotAng);

        // Rastro de perfuração aerodinâmica da lança no ar
        if (atk >= 0.28 && atk <= 0.75) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
            ctx.lineWidth = 1.6;
            ctx.setLineDash([8, 4]);
            _lin(ctx, -8, -0.5, 34, -0.5);
            ctx.strokeStyle = 'rgba(241, 196, 15, 0.35)';
            ctx.lineWidth = 1.0;
            _lin(ctx, -4, 0.5, 38, 0.5);
            ctx.setLineDash([]);
            ctx.restore();
        }

        // DESENHO DA LANÇA
        desenharLancaBatalha(ctx, 0, armaVisual, atk);

        // Flash de impacto penetrante na ponta (Star-Burst)
        if (atk >= 0.65 && atk <= 0.85) {
            let fImp = 1 - Math.abs(atk - 0.75) / 0.10;
            let tipX = 30.0;
            ctx.save();
            ctx.translate(tipX, 0);

            // Explosão estelar na ponta da lança
            ctx.fillStyle = 'rgba(255, 255, 255, ' + (0.95 * fImp) + ')';
            ctx.beginPath();
            ctx.arc(0, 0, 3.8 * fImp + 0.5, 0, Math.PI * 2);
            ctx.fill();

            // Raios dourados cruzados
            ctx.strokeStyle = 'rgba(241, 196, 15, ' + (0.85 * fImp) + ')';
            ctx.lineWidth = 1.5;
            let rMax = 8.5 * fImp;
            _lin(ctx, -rMax, 0, rMax, 0);
            _lin(ctx, 0, -rMax, 0, rMax);
            _lin(ctx, -rMax * 0.7, -rMax * 0.7, rMax * 0.7, rMax * 0.7);
            _lin(ctx, -rMax * 0.7, rMax * 0.7, rMax * 0.7, -rMax * 0.7);
            ctx.restore();
        }

        ctx.restore(); // fim rotação da lança
        ctx.restore(); // fim translação da estocada
    }

    // Lança preparada em prontidão na Postura Defensiva / Dash (ao lado do escudo)
    function desenharLancaDefesa(ctx, armaVisual) {
        ctx.lineCap = 'round';
        // Braço recuado atrás da couraça
        ctx.strokeStyle = '#212f3d';
        ctx.lineWidth = 4.6;
        _lin(ctx, 22.0, 9.0, 25.5, 12.0);
        ctx.strokeStyle = '#bdc3c7';
        ctx.lineWidth = 3.8;
        _lin(ctx, 25.5, 12.0, 28.0, 13.6);

        // Manopla segurando a lança
        ctx.fillStyle = '#34495e';
        ctx.beginPath(); ctx.arc(28.6, 14.0, 1.9, 0, Math.PI * 2); ctx.fill();

        // Lança apontada para a frente em ângulo penetrante
        ctx.save();
        ctx.translate(28.6, 14.0);
        ctx.rotate(-0.12);
        desenharLancaBatalha(ctx, -4, armaVisual, 0);
        ctx.restore();
    }

    /* ============================================================
       8. SKILL 1: AURA DO VANGUARDA (BUFF / PROTEÇÃO - CÚPULA DOURADA)
       Fiel à arte: Cúpula translúcida dourada com arcos filigranados,
       mini-escudos heráldicos orbitando e estrelas cintilantes.
       ============================================================ */
    function desenharAuraVanguarda(ctx, agora) {
        ctx.save();
        let cx = 12.0, cy = 16.0;
        let pulso = 0.5 + 0.5 * Math.sin(agora / 180);
        let raioX = 26.0 + pulso * 2.5;
        let raioY = 30.0 + pulso * 2.0;

        // 1. Cúpula de Energia Translúcida Dourada
        let gCupula = ctx.createRadialGradient(cx, cy - 2, 4, cx, cy, raioY);
        gCupula.addColorStop(0, 'rgba(255, 245, 157, 0.08)');
        gCupula.addColorStop(0.7, 'rgba(241, 196, 15, ' + (0.16 + pulso * 0.08) + ')');
        gCupula.addColorStop(1, 'rgba(255, 215, 0, ' + (0.42 + pulso * 0.18) + ')');

        ctx.fillStyle = gCupula;
        ctx.beginPath();
        ctx.ellipse(cx, cy, raioX, raioY, 0, 0, Math.PI * 2);
        ctx.fill();

        // Borda luminosa da cúpula com glow
        ctx.strokeStyle = 'rgba(255, 235, 120, ' + (0.75 + pulso * 0.25) + ')';
        ctx.lineWidth = 1.8;
        ctx.shadowColor = '#f1c40f';
        ctx.shadowBlur = 10 + pulso * 6;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // 2. Arcos de Filigrana Gótica Entrelaçados no topo e base da cúpula
        ctx.strokeStyle = 'rgba(255, 248, 180, ' + (0.55 + pulso * 0.25) + ')';
        ctx.lineWidth = 1.0;
        for (let a = -1; a <= 1; a += 0.65) {
            ctx.beginPath();
            ctx.ellipse(cx + a * 6, cy, raioX * 0.65, raioY * 0.92, a * 0.2, 0, Math.PI * 2);
            ctx.stroke();
        }

        // 3. Mini-Escudos de Proteção Orbitando (Brasões flutuantes com runas)
        let qtdBrasoes = 4;
        let angOrbit = agora / 650;
        for (let i = 0; i < qtdBrasoes; i++) {
            let a = angOrbit + (i / qtdBrasoes) * Math.PI * 2;
            let bx = cx + Math.cos(a) * (raioX + 2);
            let by = cy + Math.sin(a) * (raioY * 0.72);

            ctx.save();
            ctx.translate(bx, by);

            // Mini Kite Shield
            ctx.fillStyle = '#f1c40f';
            ctx.beginPath();
            ctx.moveTo(-3, -4);
            ctx.lineTo(3, -4);
            ctx.lineTo(3, 1);
            ctx.lineTo(0, 5);
            ctx.lineTo(-3, 1);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#7d6608';
            ctx.lineWidth = 0.6;
            ctx.stroke();

            // Cruz central do mini-escudo
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-0.5, -3, 1, 6);
            ctx.fillRect(-2, -1, 4, 1);

            // Brilho estelar sobre o mini-escudo
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.beginPath(); ctx.arc(0, 0, 0.9 + pulso * 0.4, 0, Math.PI * 2); ctx.fill();

            ctx.restore();
        }

        // 4. Estrelas e Partículas Douradas Cintilantes (✦)
        for (let s = 0; s < 5; s++) {
            let sAng = agora / 420 + s * 1.25;
            let sx = cx + Math.cos(sAng) * (raioX * 0.85);
            let sy = cy + Math.sin(sAng) * (raioY * 0.85);
            let sTam = 1.2 + 0.8 * Math.sin(agora / 120 + s);

            ctx.fillStyle = '#fff9c4';
            ctx.beginPath();
            ctx.arc(sx, sy, sTam, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    /* ============================================================
       9. SKILL 2: GIRO DO VANGUARDA (TORNADO COM LANÇA E POEIRA)
       Fiel à arte: Varredura de lança em 360°, arcos concêntricos
       cortantes prateados e nuvens de poeira levantadas no solo.
       ============================================================ */
    function desenharGiroLanca(ctx, progresso) {
        ctx.save();
        ctx.translate(12, 16);

        let alphaGiro = 1.0 - (progresso * 0.25);

        // 1. Arco Cortante Externo (Lâmina da Lança cortando o ar)
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4.2;
        ctx.shadowColor = '#d5dbdb';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(0, 0, 36, -Math.PI * 0.2, Math.PI * 1.5);
        ctx.stroke();

        // 2. Arco Interno Prateado/Dourado com Gradiente
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(241, 196, 15, ' + (0.75 * alphaGiro) + ')';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(0, 0, 26, Math.PI * 0.6, Math.PI * 2.2);
        ctx.stroke();

        // 3. Estrias de Velocidade Cortante
        ctx.strokeStyle = 'rgba(255, 255, 255, ' + (0.85 * alphaGiro) + ')';
        ctx.lineWidth = 1.5;
        for (let k = 0; k < 6; k++) {
            let a = k * (Math.PI / 3) + progresso * Math.PI * 4;
            ctx.beginPath();
            ctx.arc(0, 0, 31 + (k % 2) * 5, a, a + 0.35);
            ctx.stroke();
        }

        ctx.restore();
    }

    /* ============================================================
       10. PASSIVA: RESISTÊNCIA DO ÚLTIMO FÔLEGO (3 NÍVEIS)
       ============================================================ */
    function desenharAuraUltimoFolego(ctx, pctHp, agora) {
        ctx.save();
        let cx = 12, cy = 20;

        if (pctHp <= 0.10) {
            let pulso = Math.sin(agora / 80) * 3.5;
            let r = 24 + pulso;
            ctx.beginPath();
            ctx.ellipse(cx, cy + 10, r, r * 0.58, 0, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(231, 76, 60, 0.9)";
            ctx.lineWidth = 3.2;
            ctx.stroke();
            ctx.beginPath();
            ctx.ellipse(cx, cy + 10, r - 4, (r - 4) * 0.58, 0, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(241, 196, 15, 0.85)";
            ctx.lineWidth = 1.8;
            ctx.stroke();
        } else if (pctHp <= 0.30) {
            let pulso = Math.sin(agora / 160) * 2.2;
            let r = 20 + pulso;
            ctx.beginPath();
            ctx.ellipse(cx, cy + 8, r, r * 0.55, 0, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(230, 126, 34, 0.75)";
            ctx.lineWidth = 2.4;
            ctx.stroke();
        } else {
            let pulso = Math.sin(agora / 260) * 1.5;
            let r = 16 + pulso;
            ctx.beginPath();
            ctx.ellipse(cx, cy + 8, r, r * 0.52, 0, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(243, 156, 18, 0.45)";
            ctx.lineWidth = 1.8;
            ctx.stroke();
        }
        ctx.restore();
    }

    /* ---------- atualização de partículas locais ---------- */
    function atualizarParticulas(ctx, agora) {
        for (let i = dust.length - 1; i >= 0; i--) {
            let d = dust[i];
            d.x += d.vx; d.y += d.vy; d.vy -= 0.012; d.life -= 0.024; d.r += 0.14;
            if (d.life <= 0) { dust.splice(i, 1); continue; }
            ctx.fillStyle = 'rgba(195, 175, 145, ' + (d.life * 0.32) + ')';
            ctx.beginPath();
            ctx.ellipse(d.x, d.y, d.r, d.r * 0.65, 0, 0, Math.PI * 2);
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
            ctx.fillStyle = 'rgba(255, 240, 150, ' + (gl.life * 0.65) + ')';
            ctx.beginPath();
            ctx.arc(gl.x, gl.y, 1.0 + gl.life * 1.0, 0, Math.PI * 2);
            ctx.fill();
        }
        if (agora % 1400 < 30 && glints.length < 4) {
            glints.push({ x: 8 + Math.random() * 10, y: 7 + Math.random() * 8, life: 1 });
        }
        if ((agora - lastDust) > 120) {
            lastDust = agora;
            if ((typeof window.walkCycle === 'number') && Math.abs(Math.sin(window.walkCycle * Math.PI * 2)) > 0.65) {
                let lado = (Math.sin(window.walkCycle * Math.PI * 2) > 0) ? 1 : -1;
                dust.push({ x: 12 + lado * 3 + (Math.random() - 0.5), y: 30, vx: -0.5 - Math.random() * 0.5, vy: -0.25 - Math.random() * 0.3, life: 0.9, r: 1.8 + Math.random() * 1.6 });
            }
        }
    }

    /* ============================================================
       DESENHADOR PRINCIPAL DO GUERREIRO — ASSINATURA INALTERADA
       (x, y, corCapa, isMoving, anguloBase, hp, maxHp, isSpinning, spinTimer, pid)
       ============================================================ */
    window.desenharGuerreiro = function (x, y, corCapa, isMoving, anguloBase, hp, maxHp, isSpinning, spinTimer, pid) {
        if (hp <= 0 || !window.ctx) return;
        let ctx = window.ctx;
        ctx.save();
        ctx.translate(x, y);

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
        let resp = Math.sin(agora / 680);
        let passo = (typeof window.walkCycle === 'number') ? window.walkCycle : 0;
        let dano = (window.danoFlashTimer || 0) > 0;
        let pidK = pid || '';
        let dadosJogador = (pidK && window.todosJogadores && window.todosJogadores[pidK]) || null;
        let guardiaoAte = dadosJogador ? (dadosJogador.guerreiroBuffAte || 0) : 0;
        if (pidK === window.meuId) guardiaoAte = Math.max(guardiaoAte, window.guerreiroBuffAte || 0);
        let guardiaoAtivo = guardiaoAte > Date.now();

        // Recuo elástico do Grito de Provocação (mantido)
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

        let defIni = window.guerreiroDefesas[pidK] || 0;
        let defesa = (prepTimer > 0) || (defIni && (agora - defIni) < 620);

        let escudoDash = false;
        if (pidK) {
            if (pidK === window.meuId) escudoDash = !!window.escudoGuerreiroAtivo;
            else {
                const reg = window.guerreiroEscudoDe;
                escudoDash = !!(reg && reg[pidK]);
            }
        }
        if (escudoDash) defesa = true;

        // Aura da Passiva
        if (pctHp <= 0.50) desenharAuraUltimoFolego(ctx, pctHp, Date.now());

        // SKILL 1: Aura do Vanguarda (Cúpula Dourada de Proteção)
        if (guardiaoAtivo) desenharAuraVanguarda(ctx, Date.now());

        // Sombra realista no chão (tanque pesado)
        ctx.fillStyle = "rgba(0, 0, 0, 0.44)";
        ctx.beginPath();
        ctx.ellipse(12, 31, 14, 4.0, 0, 0, Math.PI * 2);
        ctx.fill();

        // Postura defensiva baixa
        if (defesa) ctx.translate(0.6, 1.4);

        // ROTAÇÃO DO CORPO NO TORNADO (GIRO)
        if (isSpinning) {
            ctx.save();
            ctx.translate(12, 16);
            ctx.rotate(angulo);
            ctx.translate(-12, -16);
        }

        // RENDERIZAÇÃO DO CAVALEIRO: Pernas -> Tronco -> Ombros -> Great Helm
        desenharPernas(ctx, passo, isMoving, defesa);
        desenharTronco(ctx, dano, resp);
        desenharOmbros(ctx, dano);
        desenharCapacete(ctx, resp);

        let atk = 0;
        let corteIni = window.guerreiroCortes[pidK] || 0;
        if (corteIni) atk = Math.max(0, Math.min(1, (agora - corteIni) / 380));

        // RENDERIZAÇÃO DAS ARMAS (ESCUDO OGIVAL + LANÇA DE BATALHA)
        if (isSpinning) {
            // No Giro: Escudo protegido ao corpo + Lança estendida varrendo
            ctx.save();
            ctx.translate(-11.0, 1.0);
            desenharBracoEscudo(ctx, 0, isMoving, false);
            desenharEscudoOgivalLeao(ctx, -1.0, -1.0, 14.5, 23.0, false);
            ctx.restore();

            // Lança estendida girando na horizontal
            ctx.save();
            ctx.translate(14.0, 1.0);
            desenharBracoLanca(ctx, 0.5, armaVisual);
            ctx.restore();
        } else if (escudoDash) {
            // NO DASH: Escudo Ogival erguido frontalmente cobrindo o corpo
            desenharLancaDefesa(ctx, armaVisual);
            ctx.save();
            ctx.translate(12, 16);
            ctx.rotate(angulo);
            ctx.translate(-11.5, 0);
            desenharBracoEscudo(ctx, resp, isMoving, true);
            desenharEscudoOgivalLeao(ctx, 1.0, 0.0, 16.0, 25.0, true);
            ctx.restore();
        } else if (defesa) {
            // POSTURA DEFENSIVA: Escudo Ogival à frente e Lança em prontidão
            desenharLancaDefesa(ctx, armaVisual);
            ctx.save();
            ctx.translate(1.0, 0);
            desenharBracoEscudo(ctx, resp, isMoving, true);
            desenharEscudoOgivalLeao(ctx, 1.0, 0.0, 15.5, 24.5, true);
            ctx.restore();
        } else {
            // IDLE / ANDANDO: Escudo Ogival no braço esquerdo + Lança na mão direita
            ctx.save();
            ctx.translate(12, 16);
            ctx.rotate(angulo);
            ctx.translate(-11.5, 0);
            desenharBracoEscudo(ctx, resp, isMoving, false);
            desenharEscudoOgivalLeao(ctx, -7.0, -1.5, 15.0, 24.0, false);
            ctx.restore();

            // Mão direita: Braço + Lança de Batalha com estocada
            ctx.save();
            ctx.translate(12, 16);
            ctx.rotate(angulo);
            ctx.translate(13.5, 0);
            desenharBracoLanca(ctx, atk, armaVisual);
            ctx.restore();
        }

        // Faíscas de bloqueio locais
        if (pidK === window.meuId) {
            if (dano) {
                let n = 3 + Math.floor(Math.random() * 2);
                for (let i = 0; i < n; i++) {
                    sparks.push({
                        x: 8 + Math.random() * 8,
                        y: 8 + Math.random() * 12,
                        vx: (Math.random() - 0.5) * 2.8,
                        vy: -1.2 - Math.random() * 1.8,
                        life: 1,
                        cor: Math.random() > 0.4 ? '#f1c40f' : '#ecf0f1'
                    });
                }
            }
            atualizarParticulas(ctx, agora);
        }

        if (isSpinning) ctx.restore(); // fim da rotação do corpo

        // SKILL 2: Efeito Visual do Giro do Vanguarda (Arcos de Lança)
        if (isSpinning) desenharGiroLanca(ctx, progressoGiro);

        ctx.restore();
    };

    window.enviarAtaqueGuerreiro = function (ws) {
        if (window.estaMorto) return;
        if (typeof window.registrarCorteGuerreiro === 'function') window.registrarCorteGuerreiro(window.meuId);
        if (typeof window.tocarSomCorte === 'function') window.tocarSomCorte();
        if (typeof window.criarEfeitoCorte === 'function') window.criarEfeitoCorte(window.meuX + 12, window.meuY + 16, window.meuAngulo);
        if (ws && ws.readyState === 1) { ws.send(JSON.stringify({ action: 'corte' })); }
    };

})();