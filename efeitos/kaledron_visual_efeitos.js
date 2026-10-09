// efeitos/kaledron_visual_efeitos.js — Efeitos visuais completos do Guerreiro Kaledron
// Reconstrução baseada na arte oficial de referência: Onda de Magma com Rochas Voadoras, Impacto com Pilares e Monólitos,
// Redemoinho Circular com Órbita de Espada e Detritos, e Brado de Guerra com Estandartes Rúnicos Vulcânicos.
(function (root) {
    'use strict';

    const MAX_EFFECTS = 64;
    root.kaledronOndasMagma = root.kaledronOndasMagma || [];
    root.kaledronCrateras = root.kaledronCrateras || [];
    root.kaledronRedemoinhos = root.kaledronRedemoinhos || [];
    root.kaledronBrados = root.kaledronBrados || [];
    root.kaledronFlashes = root.kaledronFlashes || [];

    function timeNow() {
        return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    }

    function boundedPush(list, effect) {
        while (list.length >= MAX_EFFECTS) list.shift();
        list.push(effect);
    }

    function pathPolygon(ctx, points) {
        if (!points || points.length < 3) return;
        ctx.beginPath();
        ctx.moveTo(points[0][0], points[0][1]);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i][0], points[i][1]);
        }
        ctx.closePath();
    }

    function flash(x, y, radius, color) {
        boundedPush(root.kaledronFlashes, {
            x: x, y: y, raio: radius, cor: color, inicio: timeNow(), dur: 260
        });
    }

    root.criarFlashKaledron = function (x, y, color, radius) {
        flash(x, y, radius || 20, color || '#ff5722');
    };

    // =========================================================================
    // HABILIDADE 1: GOLPE FULMINANTE (Cone frontal de 140 unidades)
    // Onda cortante colossal de magma com rochas em órbita e rastro de fumaça
    // =========================================================================
    root.criarAnimacaoGolpeFulminanteKaledron = function (id, x, y, angle) {
        const time = timeNow();
        const duplicate = root.kaledronOndasMagma.some(function (effect) {
            return effect.id === id && time - effect.inicio < 650;
        });
        if (duplicate) return;

        if (typeof root.registrarKaledronAnim === 'function') {
            root.registrarKaledronAnim(id, 'ataque', 580, { angulo: angle || 0 });
        }

        // Gera fragmentos de rocha vulcânica / basalto que viajam junto com a lâmina
        const rochas = [];
        for (let i = 0; i < 7; i++) {
            rochas.push({
                offsetDist: (Math.random() - 0.5) * 22,
                offsetArc: (i - 3) * 0.28 + (Math.random() - 0.5) * 0.15,
                tamanho: 3 + Math.random() * 4,
                rotacao: Math.random() * Math.PI * 2,
                rotVel: (Math.random() - 0.5) * 6,
                cor: i % 2 === 0 ? '#1f1a19' : '#3d2e28'
            });
        }

        boundedPush(root.kaledronOndasMagma, {
            id: id,
            x: x,
            y: y,
            ang: Number.isFinite(angle) ? angle : 0,
            inicio: time,
            dur: 580,
            distMax: 140,
            rochas: rochas,
            particulas: []
        });

        flash(x, y, 32, '#ff6e22');
    };

    // =========================================================================
    // HABILIDADE 2: IMPACTO TERRESTRE (Raio de 110 unidades)
    // Choque vulcânico no chão, fissuras radiais, pilares verticais e monólitos
    // =========================================================================
    root.criarAnimacaoImpactoTerrestreKaledron = function (id, x, y, radius) {
        const time = timeNow();
        const duplicate = root.kaledronCrateras.some(function (effect) {
            return effect.id === id && time - effect.inicio < 650;
        });
        if (duplicate) return;

        if (typeof root.registrarKaledronAnim === 'function') {
            root.registrarKaledronAnim(id, 'impacto', 700);
        }

        const r = radius || 110;
        // Monólitos / Placas de rocha vulcânica arremessadas para cima
        const monolitos = [];
        const count = 12;
        for (let i = 0; i < count; i++) {
            const a = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
            const dist = r * (0.45 + Math.random() * 0.45);
            monolitos.push({
                x: Math.cos(a) * dist,
                y: Math.sin(a) * dist * 0.44, // perspectiva 2.5D
                alturaMax: 28 + Math.random() * 32,
                largura: 5 + Math.random() * 6,
                angulo: (Math.random() - 0.5) * 0.4,
                rot: (Math.random() - 0.5) * 0.5,
                delay: Math.random() * 0.12
            });
        }

        // Fissuras profundas de magma espalhando-se radialmente
        const fissuras = [];
        for (let i = 0; i < 10; i++) {
            fissuras.push({
                angle: (i / 10) * Math.PI * 2 + (Math.random() - 0.5) * 0.2,
                length: 0.72 + Math.random() * 0.28,
                zigzag: (Math.random() - 0.5) * 12
            });
        }

        // Brasas e faíscas verticais
        const shards = [];
        for (let i = 0; i < 22; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 25 + Math.random() * 65;
            shards.push({
                x: 0,
                y: 0,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 55, // subida forte
                age: 0,
                duration: 0.55 + Math.random() * 0.45,
                size: 2 + Math.random() * 3,
                color: i % 3 === 0 ? '#ffea78' : (i % 2 === 0 ? '#ff7018' : '#e62e08')
            });
        }

        boundedPush(root.kaledronCrateras, {
            id: id,
            x: x,
            y: y,
            raio: r,
            inicio: time,
            dur: 1500,
            fissuras: fissuras,
            monolitos: monolitos,
            shards: shards,
            lastUpdate: time
        });

        flash(x, y, r, '#ff5018');
    };

    // =========================================================================
    // HABILIDADE 3: REDEMOINHO DE AÇO (Raio de 120 unidades, ~3 segundos)
    // Vórtice dinâmico de anéis de magma, espada orbitando e detritos vulcânicos
    // =========================================================================
    root.criarAnimacaoRedemoinhoKaledron = function (id, x, y, duration) {
        const time = timeNow();
        const existing = root.kaledronRedemoinhos.find(function (effect) { return effect.id === id; });
        if (existing && time - existing.inicio < 700) return;

        const dur = duration || 3000;
        if (typeof root.registrarKaledronAnim === 'function') {
            root.registrarKaledronAnim(id, 'redemoinho', dur);
        }

        // Detritos de rocha vulcânica presos no vórtice
        const detritos = [];
        for (let i = 0; i < 8; i++) {
            detritos.push({
                distRatio: 0.35 + (i % 4) * 0.18,
                angOffset: (i / 8) * Math.PI * 2,
                velOrbita: 1.8 + (i % 3) * 0.4,
                tamanho: 2.5 + Math.random() * 3,
                cor: i % 2 === 0 ? '#2a2220' : '#4d3730'
            });
        }

        boundedPush(root.kaledronRedemoinhos, {
            id: id,
            x: x,
            y: y,
            inicio: time,
            dur: dur,
            raio: 120,
            detritos: detritos,
            lastX: x,
            lastY: y,
            lastUpdate: time,
            finished: false
        });
    };

    root.finalizarAnimacaoRedemoinhoKaledron = function (id) {
        const effect = root.kaledronRedemoinhos.find(function (item) { return item.id === id; });
        if (effect) {
            effect.dur = Math.min(effect.dur, timeNow() - effect.inicio + 180);
        }
        if (id === root.meuId && typeof root.registrarKaledronAnim === 'function') {
            root.registrarKaledronAnim(id, 'idle', 180);
        }
    };

    // =========================================================================
    // HABILIDADE 4: BRADO DE GUERRA VULCÂNICO (10s de bônus, 1200ms de ativação)
    // Estandartes rúnicos vulcânicos flamejantes subindo aos céus e selo solar
    // =========================================================================
    root.criarAnimacaoBradoGuerraKaledron = function (id, x, y) {
        const time = timeNow();
        const duplicate = root.kaledronBrados.some(function (effect) {
            return effect.id === id && time - effect.inicio < 700;
        });
        if (duplicate) return;

        if (typeof root.registrarKaledronAnim === 'function') {
            root.registrarKaledronAnim(id, 'brado', 1200);
        }

        // Faíscas radiais que explodem na ativação
        const sparks = [];
        for (let i = 0; i < 34; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 40 + Math.random() * 95;
            sparks.push({
                angle: angle,
                speed: speed,
                size: 1.5 + Math.random() * 2.5,
                color: Math.random() > 0.4 ? '#ff6622' : '#ffea70'
            });
        }

        // 3 a 5 Estandartes Rúnicos Vulcânicos subindo atrás de Kaledron
        const estandartes = [
            { xOffset: -38, yOffset: -8, altura: 65, largura: 16, delay: 0.05 },
            { xOffset: -18, yOffset: -18, altura: 85, largura: 20, delay: 0 },
            { xOffset: 0, yOffset: -26, altura: 100, largura: 24, delay: 0 }, // Estandarte Central Majestoso
            { xOffset: 18, yOffset: -18, altura: 85, largura: 20, delay: 0.02 },
            { xOffset: 38, yOffset: -8, altura: 65, largura: 16, delay: 0.08 }
        ];

        boundedPush(root.kaledronBrados, {
            id: id,
            x: x,
            y: y,
            inicio: time,
            dur: 1450,
            sparks: sparks,
            estandartes: estandartes
        });

        flash(x, y, 75, '#ffa238');
    };

    // Helper para obter centro atualizado do jogador (local ou remoto)
    function playerCenter(effect) {
        if (effect.id === root.meuId && Number.isFinite(root.meuX) && Number.isFinite(root.meuY)) {
            return { x: root.meuX + 12, y: root.meuY + 16 };
        }
        const player = root.todosJogadores && root.todosJogadores[effect.id];
        if (player && Number.isFinite(player.x) && Number.isFinite(player.y)) {
            return { x: player.x + 12, y: player.y + 16 };
        }
        return { x: effect.x, y: effect.y };
    }

    // =========================================================================
    // RENDERIZADOR: HABILIDADE 1 (Golpe Fulminante — Onda de Magma com Rochas)
    // =========================================================================
    function drawSlashWave(ctx, effect, time) {
        const p = Math.max(0, Math.min(1, (time - effect.inicio) / effect.dur));
        const currentDist = effect.distMax * p;
        const x = effect.x + Math.cos(effect.ang) * currentDist;
        const y = effect.y + Math.sin(effect.ang) * currentDist;
        const fade = Math.sin(Math.PI * p) * (1 - p * 0.3);

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(effect.ang);
        ctx.globalAlpha = Math.max(0, fade);

        // 1. Halo externo de calor avermelhado
        ctx.save();
        ctx.globalAlpha = Math.max(0, fade * 0.45);
        ctx.fillStyle = '#ff2800';
        ctx.beginPath();
        ctx.ellipse(0, 0, 36 + p * 12, 52 + p * 16, 0, -Math.PI * 0.5, Math.PI * 0.5);
        ctx.fill();
        ctx.restore();

        // 2. Onda frontal em crescente de magma líquido
        // Lâmina externa vermelha
        pathPolygon(ctx, [
            [26, 0], [10, -12], [-4, -38], [-24, -50], [-16, -20],
            [-32, 0], [-16, 20], [-24, 50], [-4, 38], [10, 12]
        ]);
        ctx.fillStyle = '#b81c10';
        ctx.fill();

        // Camada intermediária de fogo incandescente
        pathPolygon(ctx, [
            [21, 0], [4, -8], [-9, -32], [-17, -35], [-11, -12],
            [-24, 0], [-11, 12], [-17, 35], [-9, 32], [4, 8]
        ]);
        ctx.fillStyle = '#ff5418';
        ctx.fill();

        // Fio cortante frontal de puro calor solar amarelo
        ctx.strokeStyle = '#ffe76a';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(18, 0);
        if (typeof ctx.quadraticCurveTo === 'function') {
            ctx.quadraticCurveTo(-2, -22, -20, -42);
            ctx.moveTo(18, 0);
            ctx.quadraticCurveTo(-2, 22, -20, 42);
        } else {
            ctx.lineTo(-2, -22); ctx.lineTo(-20, -42);
            ctx.moveTo(18, 0);
            ctx.lineTo(-2, 22); ctx.lineTo(-20, 42);
        }
        ctx.stroke();

        // 3. Rochas vulcânicas / Lascas de basalto arremessadas na crista da onda
        for (let i = 0; i < effect.rochas.length; i++) {
            const r = effect.rochas[i];
            const rx = r.offsetDist;
            const ry = r.offsetArc * (34 + p * 15);
            ctx.save();
            ctx.translate(rx, ry);
            ctx.rotate(r.rotacao + p * r.rotVel);

            // Borda incandescente da rocha
            ctx.fillStyle = '#ff7a22';
            ctx.beginPath();
            ctx.arc(0, 0, r.tamanho + 1, 0, Math.PI * 2);
            ctx.fill();

            // Núcleo de rocha escura
            ctx.fillStyle = r.cor;
            pathPolygon(ctx, [
                [-r.tamanho, -r.tamanho * 0.6], [r.tamanho * 0.8, -r.tamanho * 0.8],
                [r.tamanho, r.tamanho * 0.6], [-r.tamanho * 0.4, r.tamanho]
            ]);
            ctx.fill();
            ctx.restore();
        }

        // 4. Brasas e fumaça na cauda da onda
        for (let i = 0; i < 6; i++) {
            const trailOffset = Math.sin(time * 0.015 + i * 1.5) * 22;
            ctx.fillStyle = i % 2 === 0 ? '#ffcf52' : '#ff4210';
            ctx.fillRect(-14 - i * 6, trailOffset, 2.5, 3.5);
        }

        ctx.restore();
    }

    // =========================================================================
    // RENDERIZADOR: HABILIDADE 2 (Impacto Terrestre — Pilares e Monólitos)
    // =========================================================================
    function drawGroundImpact(ctx, effect, time, delta) {
        const p = Math.max(0, Math.min(1, (time - effect.inicio) / effect.dur));
        const fade = 1 - p;
        const currentRadius = effect.raio * (0.25 + 0.75 * Math.min(1, p * 2.2));

        ctx.save();
        ctx.translate(effect.x, effect.y);
        ctx.globalAlpha = fade;

        // 1. Cratera incandescente de magma no chão
        ctx.fillStyle = 'rgba(125, 24, 15, 0.45)';
        ctx.beginPath();
        ctx.ellipse(0, 6, currentRadius * 0.95, currentRadius * 0.42, 0, 0, Math.PI * 2);
        ctx.fill();

        // Anel de choque exterior
        ctx.strokeStyle = '#e6320d';
        ctx.lineWidth = 6 * fade + 1;
        ctx.beginPath();
        ctx.ellipse(0, 5, currentRadius, currentRadius * 0.44, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Anel interno amarelo de alta temperatura
        ctx.strokeStyle = '#ffcf52';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 5, currentRadius * 0.85, currentRadius * 0.38, 0, 0, Math.PI * 2);
        ctx.stroke();

        // 2. Fissuras radiais profundas de magma
        for (let i = 0; i < effect.fissuras.length; i++) {
            const crack = effect.fissuras[i];
            const length = effect.raio * crack.length * Math.min(1, p * 2.4);
            const c = Math.cos(crack.angle), s = Math.sin(crack.angle);

            ctx.strokeStyle = i % 2 === 0 ? '#ff6014' : '#ffd048';
            ctx.lineWidth = i % 2 === 0 ? 2.6 : 1.6;
            ctx.beginPath();
            ctx.moveTo(c * 10, s * 5);
            ctx.lineTo(c * length * 0.45 - s * crack.zigzag, s * length * 0.22 + c * 3);
            ctx.lineTo(c * length * 0.75 + s * crack.zigzag * 0.5, s * length * 0.32 - c * 2);
            ctx.lineTo(c * length, s * length * 0.44);
            ctx.stroke();
        }

        // 3. Monólitos e placas de basalto emergindo do solo (vistos na referência!)
        const monolitoProg = Math.min(1, p * 3.5);
        const monolitoQueda = p > 0.4 ? (p - 0.4) / 0.6 : 0;

        for (let i = 0; i < effect.monolitos.length; i++) {
            const m = effect.monolitos[i];
            const lev = Math.max(0, Math.sin(monolitoProg * Math.PI) * m.alturaMax * (1 - monolitoQueda * 0.7));
            ctx.save();
            ctx.translate(m.x, m.y - lev);
            ctx.rotate(m.angulo);

            // Pilar de fogo vertical debaixo da rocha
            ctx.fillStyle = '#ff5512';
            ctx.globalAlpha = fade * 0.8;
            ctx.fillRect(-m.largura * 0.5, 0, m.largura, lev);
            ctx.fillStyle = '#ffe570';
            ctx.fillRect(-m.largura * 0.25, 0, m.largura * 0.5, lev);

            // Corpo da rocha / monólito
            ctx.globalAlpha = fade;
            ctx.fillStyle = '#26201e';
            pathPolygon(ctx, [
                [-m.largura, -m.largura * 1.6], [m.largura * 0.8, -m.largura * 1.8],
                [m.largura, m.largura * 0.8], [-m.largura * 0.9, m.largura * 0.8]
            ]);
            ctx.fill();
            ctx.strokeStyle = '#c8923a';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Borda de fogo na rocha
            ctx.fillStyle = '#ff6e1a';
            ctx.fillRect(-m.largura * 0.5, -m.largura * 1.6, m.largura, 2);
            ctx.restore();
        }

        // 4. Faíscas e fragmentos menores
        const elapsed = Math.min(0.05, Math.max(0, delta));
        for (let i = effect.shards.length - 1; i >= 0; i--) {
            const s = effect.shards[i];
            s.age += elapsed;
            if (s.age >= s.duration) {
                effect.shards.splice(i, 1);
                continue;
            }
            s.x += s.vx * elapsed;
            s.y += s.vy * elapsed;
            s.vy += 135 * elapsed; // gravidade
            ctx.globalAlpha = fade * (1 - s.age / s.duration);
            ctx.fillStyle = s.color;
            ctx.fillRect(s.x, s.y, s.size, s.size * 1.8);
        }

        ctx.restore();
    }

    // =========================================================================
    // RENDERIZADOR: HABILIDADE 3 (Redemoinho de Aço — Órbita e Anéis Concéntricos)
    // =========================================================================
    function drawWhirlwind(ctx, effect, time, delta) {
        const p = Math.max(0, Math.min(1, (time - effect.inicio) / effect.dur));
        const center = playerCenter(effect);

        if (p >= 1) {
            if (!effect.finished) {
                effect.finished = true;
                flash(center.x, center.y, 50, '#ff7428');
            }
            root.kaledronRedemoinhos.splice(root.kaledronRedemoinhos.indexOf(effect), 1);
            return;
        }

        effect.lastUpdate = time;
        effect.lastX = center.x;
        effect.lastY = center.y;

        ctx.save();
        ctx.translate(center.x, center.y);
        const fade = Math.min(1, (1 - p) * 4);

        // 1. Anéis concêntricos de fogo rodopiando no chão
        ctx.globalAlpha = 0.3 * fade;
        ctx.fillStyle = '#b82a15';
        ctx.beginPath();
        ctx.ellipse(0, 3, 115, 45, 0, 0, Math.PI * 2);
        ctx.fill();

        // Anel externo de magma giratório
        ctx.globalAlpha = 0.85 * fade;
        ctx.strokeStyle = '#ff4410';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.ellipse(0, 4, 105, 40, 0, time * 0.007, time * 0.007 + Math.PI * 1.4);
        ctx.stroke();

        // Anel médio de fogo incandescente
        ctx.strokeStyle = '#ff7b1e';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(0, 2, 85, 32, 0, -time * 0.009, -time * 0.009 + Math.PI * 1.3);
        ctx.stroke();

        // Anel interno veloz amarelo
        ctx.strokeStyle = '#ffe066';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.ellipse(0, 0, 65, 24, 0, time * 0.012, time * 0.012 + Math.PI * 1.1);
        ctx.stroke();

        // 2. Lâminas de luz e cortes de fogo em rotação
        for (let i = 0; i < 5; i++) {
            const rot = time * 0.011 + i * (Math.PI * 2 / 5);
            const dist = 55 + (i % 2) * 35;
            const sx = Math.cos(rot) * dist;
            const sy = Math.sin(rot) * dist * 0.42;
            const bladeAngle = rot + Math.PI * 0.5;

            ctx.save();
            ctx.translate(sx, sy);
            ctx.rotate(bladeAngle);
            ctx.globalAlpha = 0.9 * fade;

            // Arco cortante da lâmina
            pathPolygon(ctx, [[0, -26], [4, -8], [1, 14], [0, 26], [-3, 12], [-2, -8]]);
            ctx.fillStyle = i % 2 === 0 ? '#ffea72' : '#ff4e14';
            ctx.fill();
            ctx.restore();
        }

        // 3. Detritos e rochas vulcânicas centrifugadas no vórtice
        for (let i = 0; i < effect.detritos.length; i++) {
            const d = effect.detritos[i];
            const orbit = time * 0.008 * d.velOrbita + d.angOffset;
            const r = effect.raio * d.distRatio;
            const rx = Math.cos(orbit) * r;
            const ry = Math.sin(orbit) * r * 0.42;

            ctx.save();
            ctx.translate(rx, ry);
            ctx.globalAlpha = fade;

            // Rastro brilhante da pedra
            ctx.fillStyle = '#ff6016';
            ctx.fillRect(-d.tamanho * 0.5, -d.tamanho * 0.5, d.tamanho + 1, d.tamanho + 1);

            // Pedra vulcânica
            ctx.fillStyle = d.cor;
            ctx.fillRect(-d.tamanho * 0.5, -d.tamanho * 0.5, d.tamanho, d.tamanho);
            ctx.restore();
        }

        ctx.restore();
    }

    // =========================================================================
    // RENDERIZADOR: HABILIDADE 4 (Brado de Guerra — Estandartes Rúnicos Vulcânicos)
    // =========================================================================
    function drawWarcry(ctx, effect, time) {
        const p = Math.max(0, Math.min(1, (time - effect.inicio) / effect.dur));
        if (p >= 1) {
            root.kaledronBrados.splice(root.kaledronBrados.indexOf(effect), 1);
            return;
        }

        const center = playerCenter(effect);
        const fade = Math.sin(Math.PI * p);

        ctx.save();
        ctx.translate(center.x, center.y);

        // 1. Onda de choque expansiva de energia vulcânica
        ctx.save();
        ctx.globalAlpha = 0.75 * fade;
        ctx.strokeStyle = '#ff5512';
        ctx.lineWidth = 4.5 * (1 - p) + 1;
        ctx.beginPath();
        ctx.ellipse(0, 6, 20 + p * 220, 9 + p * 82, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#ffea72';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 6, 16 + p * 200, 7 + p * 72, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // 2. ESTANDARTES RÚNICOS VULCÂNICOS FLAMEJANTES (Vistos na referência oficial!)
        // Estandartes heráldicos de fogo subindo aos céus atrás de Kaledron
        const bannerRise = Math.sin(Math.min(1, p * 2.2) * Math.PI * 0.5);
        for (let i = 0; i < effect.estandartes.length; i++) {
            const b = effect.estandartes[i];
            const curH = b.altura * bannerRise;

            ctx.save();
            ctx.translate(b.xOffset, b.yOffset);
            ctx.globalAlpha = 0.88 * fade;

            // Halo luminoso do estandarte
            ctx.fillStyle = 'rgba(255, 68, 17, 0.28)';
            ctx.fillRect(-b.largura * 0.7, -curH, b.largura * 1.4, curH);

            // Borda do estandarte de fogo dourado
            ctx.strokeStyle = '#ffd65c';
            ctx.lineWidth = 2;
            pathPolygon(ctx, [
                [-b.largura * 0.5, -curH], [b.largura * 0.5, -curH],
                [b.largura * 0.5, 0], [0, 6], [-b.largura * 0.5, 0]
            ]);
            ctx.stroke();

            // Preenchimento de chamas translúcidas
            ctx.fillStyle = 'rgba(180, 28, 14, 0.42)';
            ctx.fill();

            // Símbolo rúnico / Estrela solar heráldica dentro do estandarte
            if (curH > b.altura * 0.5) {
                const runeY = -curH * 0.65;
                ctx.fillStyle = '#ffea7a';
                // Estrela heráldica de 4 pontas
                pathPolygon(ctx, [
                    [0, runeY - 8], [2.5, runeY - 2.5], [8, runeY],
                    [2.5, runeY + 2.5], [0, runeY + 8], [-2.5, runeY + 2.5],
                    [-8, runeY], [-2.5, runeY - 2.5]
                ]);
                ctx.fill();

                // Runas verticais (espada/lança de fogo)
                ctx.strokeStyle = '#ffd052';
                ctx.lineWidth = 1.8;
                ctx.beginPath();
                ctx.moveTo(0, runeY + 11); ctx.lineTo(0, runeY + 24);
                ctx.moveTo(-4, runeY + 15); ctx.lineTo(4, runeY + 15);
                ctx.stroke();
            }

            ctx.restore();
        }

        // 3. Faíscas radiantes e brasas em ascensão
        for (let i = 0; i < effect.sparks.length; i++) {
            const s = effect.sparks[i];
            const dist = s.speed * p;
            const sx = Math.cos(s.angle) * dist;
            const sy = Math.sin(s.angle) * dist * 0.46 - p * (16 + (i % 5) * 7); // elevação
            ctx.fillStyle = s.color;
            ctx.globalAlpha = fade * 0.95;
            ctx.fillRect(Math.round(sx), Math.round(sy), s.size, s.size * 2);
        }

        ctx.restore();
    }

    // =========================================================================
    // RENDERIZADOR: AURA PERSISTENTE DO BÔNUS (Kaledron e Aliados)
    // =========================================================================
    function drawBuffAuras(ctx, time) {
        const players = root.todosJogadores || {};
        const pids = Object.keys(players);

        for (let i = 0; i < pids.length; i++) {
            const id = pids[i];
            const player = players[id];
            if (!player || Number(player.kaledronBradoAte) <= Date.now() ||
                !Number.isFinite(player.x) || !Number.isFinite(player.y)) continue;

            const x = player.x + 12;
            const y = player.y + 16;
            const isKaledron = player.classe === 'guerreiro_kaledron';

            ctx.save();
            if (isKaledron) {
                // Aura majestosa de Kaledron: anel de fogo com pulso solar
                ctx.globalAlpha = 0.4 + Math.sin(time * 0.006 + x) * 0.15;
                ctx.strokeStyle = '#ff771a';
                ctx.lineWidth = 1.6;
                ctx.beginPath();
                ctx.ellipse(x, y + 15, 23, 7, 0, 0, Math.PI * 2);
                ctx.stroke();

                // Brasas subindo ao redor
                ctx.fillStyle = '#ffcf52';
                ctx.fillRect(Math.round(x - 6), Math.round(y - 20 + Math.sin(time * 0.008) * 4), 2, 2.5);
                ctx.fillRect(Math.round(x + 8), Math.round(y - 14 + Math.cos(time * 0.007) * 4), 2, 2.5);
            } else {
                // Aura aliada: bênção dourada vulcânica discreta (não confunde com Kaledron)
                ctx.globalAlpha = 0.35 + Math.sin(time * 0.005 + x) * 0.1;
                ctx.strokeStyle = '#e6a83d';
                ctx.lineWidth = 1.3;
                ctx.beginPath();
                ctx.ellipse(x, y + 14, 18, 5.5, 0, 0, Math.PI * 2);
                ctx.stroke();

                ctx.fillStyle = '#ffe078';
                ctx.fillRect(Math.round(x), Math.round(y - 22), 2, 2);
            }
            ctx.restore();
        }
    }

    // =========================================================================
    // LOOP PRINCIPAL DE RENDERIZAÇÃO DOS EFEITOS DO KALEDRON
    // =========================================================================
    root.desenharEfeitosKaledron = function () {
        const ctx = root.ctx;
        if (!ctx) return;

        const time = timeNow();
        let lastTime = root._kaledronEffectFrameAt || time;
        const delta = Math.min(0.05, Math.max(0, (time - lastTime) / 1000));
        root._kaledronEffectFrameAt = time;

        // 1. Crateras de Impacto Terrestre
        for (let i = root.kaledronCrateras.length - 1; i >= 0; i--) {
            const effect = root.kaledronCrateras[i];
            if (time - effect.inicio >= effect.dur) {
                root.kaledronCrateras.splice(i, 1);
                continue;
            }
            drawGroundImpact(ctx, effect, time, delta);
        }

        // 2. Ondas do Golpe Fulminante
        for (let i = root.kaledronOndasMagma.length - 1; i >= 0; i--) {
            const effect = root.kaledronOndasMagma[i];
            if (time - effect.inicio >= effect.dur) {
                root.kaledronOndasMagma.splice(i, 1);
                continue;
            }
            drawSlashWave(ctx, effect, time);
        }

        // 3. Vórtices do Redemoinho de Aço
        for (let i = root.kaledronRedemoinhos.length - 1; i >= 0; i--) {
            const effect = root.kaledronRedemoinhos[i];
            const previousUpdate = effect.lastUpdate || time;
            drawWhirlwind(ctx, effect, time, (time - previousUpdate) / 1000);
        }

        // 4. Estandartes e explosões do Brado de Guerra
        for (let i = root.kaledronBrados.length - 1; i >= 0; i--) {
            drawWarcry(ctx, root.kaledronBrados[i], time);
        }

        // 5. Flashes de impacto
        for (let i = root.kaledronFlashes.length - 1; i >= 0; i--) {
            const effect = root.kaledronFlashes[i];
            const p = (time - effect.inicio) / effect.dur;
            if (p >= 1) {
                root.kaledronFlashes.splice(i, 1);
                continue;
            }
            ctx.save();
            ctx.globalAlpha = (1 - p) * 0.24;
            ctx.fillStyle = effect.cor;
            ctx.beginPath();
            ctx.arc(effect.x, effect.y, effect.raio * (1 + p * 0.8), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // 6. Auras persistentes do bônus
        drawBuffAuras(ctx, time);
    };

})(window);
