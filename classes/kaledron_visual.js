// classes/kaledron_visual.js — Reconstrução visual completa do Guerreiro Kaledron
// Visual baseado na referência oficial: Cavaleiro Vulcânico Pesado, Armadura Negra com Fissuras de Magma,
// Manto Vermelho Rasgado, Capacete Chifrudo com Visor Incandescente, e Montante Colossal de Lava Flutuante.
(function (root) {
    'use strict';

    const MAX_STATES = 128;
    const MAX_PARTICLES_PER_PLAYER = 28;
    const RENDER_SCALE = 0.68;
    const GROUND_ANCHOR_Y = 29;
    const states = root.kaledronVisualStates || (root.kaledronVisualStates = Object.create(null));

    function now() {
        return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    }

    // Helper para desenhar polígonos preenchidos e contornados
    function polygon(ctx, points, fill, stroke, width) {
        if (!points || points.length < 3) return;
        ctx.beginPath();
        ctx.moveTo(points[0][0], points[0][1]);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i][0], points[i][1]);
        }
        ctx.closePath();
        if (fill) {
            ctx.fillStyle = fill;
            ctx.fill();
        }
        if (stroke) {
            ctx.strokeStyle = stroke;
            ctx.lineWidth = width || 1;
            ctx.stroke();
        }
    }

    // Gerenciador de estado visual por jogador (com limite máximo de instâncias)
    function stateFor(id, time, hp) {
        let state = states[id];
        if (!state) {
            state = states[id] = {
                lastFrame: time,
                lastHp: hp,
                hitAt: -Infinity,
                deathAt: 0,
                walkPhase: 0,
                emitAt: 0,
                particles: [],
                swordInertiaX: 0,
                swordInertiaY: 0
            };
        }
        return state;
    }

    // Emissor de brasas e faíscas vulcânicas limitadas por jogador
    function emit(state, count, x, y, speed, color, time) {
        for (let i = 0; i < count && state.particles.length < MAX_PARTICLES_PER_PLAYER; i++) {
            const angle = -Math.PI * 0.5 + (Math.random() - 0.5) * 2.2;
            const velocity = speed * (0.6 + Math.random() * 0.8);
            state.particles.push({
                x: x + (Math.random() - 0.5) * 12,
                y: y + (Math.random() - 0.5) * 8,
                vx: Math.cos(angle) * velocity,
                vy: Math.sin(angle) * velocity,
                size: 1.1 + Math.random() * 1.8,
                age: 0,
                duration: 0.45 + Math.random() * 0.45,
                color: color || (Math.random() > 0.4 ? '#ff7728' : '#ffcf48'),
                bornAt: time
            });
        }
    }

    // Atualização de partículas do personagem
    function updateParticles(ctx, state, dt, time, moving, dead, hit) {
        if (!dead && time - state.emitAt > (moving ? 180 : 380)) {
            state.emitAt = time;
            emit(state, moving ? 2 : 1, (Math.random() - 0.5) * 16, 6 + Math.random() * 10, 12, null, time);
        }
        if (hit) {
            emit(state, 6, 0, -8, 34, '#ffe078', time);
        }

        for (let i = state.particles.length - 1; i >= 0; i--) {
            const p = state.particles[i];
            if (time < p.bornAt) continue;
            p.age += dt;
            if (p.age >= p.duration || dead) {
                state.particles.splice(i, 1);
                continue;
            }
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 16 * dt; // gravidade leve
            const alpha = Math.max(0, 1 - p.age / p.duration);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size * 1.6);
        }
        ctx.globalAlpha = 1;
    }

    // Fissuras incandescentes no chão sob os pés de Kaledron
    function drawGroundCracks(ctx, dead) {
        if (dead) return;
        ctx.save();
        ctx.globalAlpha = 0.42;
        ctx.strokeStyle = '#e63e14';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        // Fissuras radiais na rocha
        ctx.moveTo(-16, 29); ctx.lineTo(-9, 27); ctx.lineTo(-2, 30); ctx.lineTo(6, 27); ctx.lineTo(15, 29);
        ctx.moveTo(-7, 27); ctx.lineTo(-11, 32);
        ctx.moveTo(4, 27); ctx.lineTo(8, 33);
        ctx.stroke();

        ctx.strokeStyle = '#ffb834';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(-8, 28); ctx.lineTo(5, 29);
        ctx.stroke();
        ctx.restore();
    }

    // Relíquia/Estandarte rúnico flutuante no ombro (visto no canto superior esquerdo da referência)
    function drawFloatingRelic(ctx, time, dead, moving) {
        if (dead) return;
        const bob = moving ? Math.sin(time * 0.0035) * 3 : 0;
        const pulse = 0.75 + Math.sin(time * 0.008) * 0.25;
        ctx.save();
        ctx.translate(-24, -28 + bob);

        // Halo de calor
        ctx.globalAlpha = pulse * 0.35;
        ctx.fillStyle = '#ff5511';
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fill();

        // Cruz rúnica / Adaga cerimonial de lava
        ctx.globalAlpha = 1;
        // Haste vertical
        polygon(ctx, [[-2, -10], [2, -10], [3, 9], [0, 14], [-3, 9]], '#2a272e', '#c8923a', 1);
        // Travessão horizontal
        polygon(ctx, [[-8, -3], [8, -3], [9, 0], [7, 2], [-7, 2], [-9, 0]], '#2a272e', '#c8923a', 1);

        // Losango/Estrela central incandescente
        ctx.globalAlpha = pulse;
        polygon(ctx, [[0, -5], [5, -0.5], [0, 4], [-5, -0.5]], '#ff3a00', '#ffd048', 1);
        ctx.fillStyle = '#fff4a0';
        ctx.fillRect(-1, -1.5, 2, 2);

        // Faíscas pontuais
        ctx.fillStyle = '#ff8820';
        ctx.fillRect(-1, -9, 2, 2);
        ctx.fillRect(-1, 8, 2, 2);
        ctx.restore();
    }

    // Manto Vermelho Rasgado (Tattered Crimson Cape)
    function drawCape(ctx, phase, moving, dead, stateName) {
        const sway = dead || !moving ? 0 : Math.sin(phase * 0.65) * 5;
        const flare = stateName === 'ataque' ? 7 : (stateName === 'redemoinho' ? 9 : 0);

        ctx.save();
        // Camada 1: Sombra profunda do tecido interno
        polygon(ctx, [
            [-8, -19], [-16, -16], [-26 - sway - flare, -6], [-33 - sway - flare, 8],
            [-29 - flare, 24], [-21, 19], [-16, 29], [-10, 21], [-4, 28], [2, 16], [-2, 2]
        ], '#480a10', '#1c0407', 1.4);

        // Camada 2: Tecido vermelho carmesim nobre com dobras
        polygon(ctx, [
            [-12, -14], [-21 - sway - flare * 0.7, -4], [-26 - sway - flare * 0.7, 9],
            [-23, 21], [-18, 12], [-14, 2], [-9, -8]
        ], '#8d141e', '#3c090e', 1);

        // Camada 3: Pontas e rasgos flamejantes na barra do manto
        polygon(ctx, [
            [-27 - sway - flare, 9], [-33 - sway - flare, 11], [-29, 24], [-24, 18]
        ], '#c9222a', '#540f14', 0.8);
        polygon(ctx, [
            [-20, 18], [-16, 29], [-11, 21]
        ], '#b81c25', '#450b0f', 0.8);
        polygon(ctx, [
            [-9, 21], [-4, 28], [2, 16]
        ], '#d82933', '#5a1016', 0.8);

        // Fivela de ouro/bronze sustentando a capa no ombro esquerdo
        polygon(ctx, [[-13, -15], [-9, -17], [-10, -11], [-14, -9]], '#d9a44e', '#5e3c15', 1);
        polygon(ctx, [[-12, -14], [-10, -15], [-11, -12]], '#ffea88', null);
        ctx.restore();
    }

    // Pernas pesadas com armadura de basalto, bordas de bronze e fissuras de lava
    function drawLeg(ctx, x, phase, front, dead, moving) {
        const kick = dead ? 4 : (moving ? Math.sin(phase + (front ? Math.PI : 0)) * 3 : 0);
        ctx.save();
        ctx.translate(x + kick, 7);

        // Coxa / Coxote (armadura de aço vulcânico)
        polygon(ctx, [[-5, -2], [5, -3], [4, 6], [6, 13], [3, 17], [-5, 16], [-7, 12], [-4, 5]],
            front ? '#26242c' : '#18171d', '#0a0a0e', 1.5);
        // Friso de bronze superior
        polygon(ctx, [[-5, 0], [4, -1], [3, 4], [-4, 5]], '#3f3944', '#b88235', 1);

        // Joelheira (spiked knee-cop com chifre angular e núcleo de magma)
        polygon(ctx, [[-6, 6], [5, 5], [7, 10], [3, 14], [-1, 15], [-6, 12]],
            '#2e2a33', '#c9933b', 1.2);
        // Fissura de magma na joelheira
        polygon(ctx, [[-2, 8], [2, 7], [3, 10], [0, 12]], '#ff4814', '#ffd048', 0.8);

        // Caneleira / Greva segmentada
        polygon(ctx, [[-6, 13], [4, 13], [5, 17], [1, 20], [-6, 19]],
            '#201e25', '#986828', 1.1);

        // Sabatão (bota de aço pontiaguda com friso de bronze e biqueira de lava)
        polygon(ctx, [[-7, 18], [4, 18], [8, 22], [5, 24], [-8, 23], [-9, 20]],
            '#18161c', '#ba8638', 1.2);
        // Bico pontiagudo da bota
        polygon(ctx, [[4, 19], [8, 22], [5, 23]], '#dfa84f', '#623f13', 0.8);

        // Fissura incandescente no calcanhar
        ctx.fillStyle = '#ff621e';
        ctx.fillRect(-2, 17, 3, 2);
        ctx.restore();
    }

    // Tronco, Peitoral, Brasão Solar, Faixa de Magma e Cinto Rúnico
    function drawTorso(ctx, time, hit, buff) {
        const pulse = 0.7 + (Math.sin(time * 0.007) + 1) * 0.15;

        // Base escura do peitoral (obsidiana / aço negro vulcânico)
        polygon(ctx, [
            [-11, -17], [-16, -13], [-15, -1], [-10, 8], [10, 8], [15, -1], [16, -13], [11, -18]
        ], hit ? '#5a463e' : '#232228', '#0a0a0f', 2);

        // Placas chanfradas com acabamento em bronze escurecido
        polygon(ctx, [
            [-11, -15], [-15, -12], [-12, -6], [-7, -8], [-4, -2], [-10, 5], [-13, 2], [-15, -2], [-16, -10]
        ], '#38343c', '#b3823d', 1.2);
        polygon(ctx, [
            [11, -15], [15, -12], [12, -6], [7, -8], [4, -2], [10, 5], [13, 2], [15, -2], [16, -10]
        ], '#1c1b22', '#7a5426', 1);

        // Gola reforçada / Placa peitoral superior em bronze dourado
        polygon(ctx, [
            [-8, -17], [8, -17], [13, -11], [9, -4], [4, -1], [0, -4], [-4, -1], [-9, -4], [-13, -11]
        ], '#2c2932', '#c99443', 1.4);

        // Cachecol / Gola interna vermelha rasgada
        polygon(ctx, [[-6, -16], [0, -18], [6, -16], [4, -11], [0, -9], [-4, -11]], '#9e1b24', '#460b10', 0.8);

        // Fissuras profundas de magma no peito (veias incandescentes)
        ctx.save();
        ctx.globalAlpha = pulse;
        // Veia central em V
        polygon(ctx, [[-4, -14], [0, -16], [4, -13], [2, -7], [0, -5], [-2, -8]], '#ff3a00', '#ffd048', 0.9);
        // Fissuras ramificadas descendo para o abdômen
        polygon(ctx, [[-6, -3], [-3, -1], [-6, 3], [-2, 5], [-4, 7], [0, 9], [4, 6], [2, 4], [5, 1], [3, -2]],
            '#ff5018', '#ffe478', 0.8);
        ctx.restore();

        // Brasão Solar no Peitoral (Broche / Medalhão circular da referência)
        ctx.save();
        ctx.translate(0, -9);
        ctx.fillStyle = '#b88235';
        ctx.beginPath();
        ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#5a3b15';
        ctx.lineWidth = 0.9;
        ctx.stroke();

        // Estrela solar de 4 pontas no centro do peito
        ctx.fillStyle = '#ff6614';
        polygon(ctx, [[0, -3.5], [1, -0.8], [3.5, 0], [1, 0.8], [0, 3.5], [-1, 0.8], [-3.5, 0], [-1, -0.8]], '#ff771a', '#fff088', 0.6);
        ctx.restore();

        // Cinto / Cinturão pesado de placas segmentadas
        polygon(ctx, [[-9, 4], [9, 4], [8, 10], [5, 14], [-5, 14], [-8, 10]], '#2a272f', '#a67635', 1.2);
        ctx.fillStyle = '#d9a44e';
        ctx.fillRect(-6, 6, 12, 2);

        // Fivela Rúnica Circular da Referência (Cinto com o símbolo da estrela solar)
        ctx.save();
        ctx.translate(0, 8.5);
        ctx.fillStyle = '#c8923a';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#623f15';
        ctx.lineWidth = 1;
        ctx.stroke();
        // Estrela de magma na fivela
        polygon(ctx, [[0, -3.5], [1, -1], [3.5, 0], [1, 1], [0, 3.5], [-1, 1], [-3.5, 0], [-1, -1]], '#ff4408', '#ffe478', 0.7);
        ctx.restore();

        // Loincloth / Avental de tecido vermelho rasgado pendurado no cinto
        polygon(ctx, [[-4, 11], [4, 11], [3, 21], [0, 24], [-3, 20]], '#9e1b24', '#460b10', 0.9);
        polygon(ctx, [[-2, 13], [2, 13], [1, 19], [-1, 18]], '#c4242e', null);

        // Aura do Brado de Guerra se estiver ativa
        if (buff) {
            ctx.save();
            ctx.globalAlpha = 0.6 + Math.sin(time * 0.012) * 0.2;
            ctx.strokeStyle = '#ff9924';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(-17, -20, 34, 42);
            ctx.restore();
        }
    }

    // Capacete Chifrudo com Visor Incandescente
    function drawHelmet(ctx, time, facingRight, hit) {
        // Crânio / Elmo Fechado de Aço Vulcânico
        polygon(ctx, [
            [-9, -19], [-11, -25], [-8, -32], [0, -35], [8, -32], [11, -25], [9, -18], [5, -14], [-5, -14]
        ], hit ? '#5e483e' : '#222127', '#08080d', 1.8);

        // Placa frontal reforçada com acabamento em bronze escurecido
        polygon(ctx, [
            [-8, -25], [-6, -31], [0, -33], [6, -31], [8, -25], [4, -23], [0, -25], [-4, -23]
        ], '#3b3840', '#9c733f', 1.1);

        // CHIFRE ESQUERDO — Curvado, imponente e pontiagudo com fissuras de magma
        polygon(ctx, [
            [-8, -27], [-14, -33], [-19, -43], [-15, -43], [-8, -37], [-5, -31]
        ], '#1c1b22', '#b3823d', 1.3);
        // Friso dourado na base do chifre
        polygon(ctx, [[-8, -28], [-11, -30], [-10, -33], [-7, -30]], '#d9a44e', '#5e3c15', 0.8);
        // Veia incandescente no chifre esquerdo
        polygon(ctx, [[-8, -27], [-14, -32], [-18, -40], [-14, -37], [-8, -33]], '#c42416', '#ff7020', 0.8);

        // CHIFRE DIREITO — Simétrico e ameaçador
        polygon(ctx, [
            [6, -31], [10, -38], [17, -44], [20, -43], [17, -34], [10, -28]
        ], '#16151c', '#c18b42', 1.4);
        // Friso dourado na base do chifre direito
        polygon(ctx, [[7, -31], [11, -34], [9, -36], [6, -32]], '#d9a44e', '#5e3c15', 0.8);
        // Veia incandescente no chifre direito
        polygon(ctx, [[7, -30], [12, -37], [17, -41], [15, -34], [10, -29]], '#c42416', '#ff7020', 0.8);

        // Queixeira / Mandíbula da armadura
        polygon(ctx, [[-8, -24], [8, -24], [6, -18], [0, -15], [-6, -18]], '#1b1a20', '#b88235', 1);

        // VISOR INCANDESCENTE — Abertura serrada com brilho vulcânico intenso
        const visorX = facingRight ? -1 : -4;
        ctx.save();
        // Glow exterior do visor
        ctx.globalAlpha = 0.5 + Math.sin(time * 0.014) * 0.2;
        ctx.fillStyle = '#ff3300';
        ctx.fillRect(visorX - 2, -27, 9, 5);

        // Fenda incandescente central
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = '#ff5a14';
        ctx.fillRect(visorX, -26, 6, 3);
        // Núcleo branco-amarelado de calor extremo
        ctx.fillStyle = '#fffa90';
        ctx.fillRect(visorX + 1, -26, 4, 1.5);
        ctx.restore();

        // Gola de malha e tecido vermelho rasgado no pescoço
        polygon(ctx, [[-4, -18], [0, -20], [4, -18], [2, -15], [-2, -15]], '#961622', '#e8ae52', 0.8);
    }

    // Ombros, Ombreiras Gigantes (Pauldrons) e Braços
    function drawArmsAndPauldrons(ctx, time, hit) {
        // OMBREIRA ESQUERDA (Maciça, camadas sobrepostas e pontas agressivas)
        polygon(ctx, [
            [-14, -15], [-22, -21], [-25, -12], [-20, -3], [-13, -5]
        ], hit ? '#58463e' : '#2a262e', '#a67637', 1.5);
        // Placa interna com chifre secundário
        polygon(ctx, [[-22, -18], [-27, -24], [-25, -12], [-20, -9]], '#961e22', '#e29b47', 1);
        // Fissura de magma na ombreira esquerda
        polygon(ctx, [[-19, -15], [-23, -19], [-21, -10]], '#ff4814', '#ffd048', 0.7);

        // OMBREIRA DIREITA (Frontal na perspectiva 2.5D)
        polygon(ctx, [
            [10, -17], [18, -22], [25, -18], [22, -7], [16, -4], [11, -9]
        ], hit ? '#5a4840' : '#2d2931', '#caa04c', 1.6);
        // Revestimento decorativo de bronze
        polygon(ctx, [[17, -19], [23, -16], [20, -11], [14, -13]], '#624f46', '#eec068', 0.9);
        // Fissura de magma na ombreira direita
        polygon(ctx, [[14, -16], [19, -14], [18, -8], [13, -10]], '#ff4814', '#ffd048', 0.7);

        // Braço esquerdo e manopla
        polygon(ctx, [
            [-18, -10], [-13, -13], [-11, -8], [-13, -2], [-18, 0], [-21, -4]
        ], '#2b272f', '#c18b42', 1.2);
        ctx.fillStyle = '#ff541c';
        ctx.fillRect(-17, -7, 3, 3); // junta de magma no punho

        // Braço direito e manopla (segurando guarda ou punho cerrado)
        polygon(ctx, [
            [13, -10], [18, -13], [21, -7], [18, 0], [13, -2], [11, -7]
        ], '#29272f', '#c9933b', 1.3);
        ctx.fillStyle = '#ff541c';
        ctx.fillRect(15, -8, 3, 3); // junta de magma no punho
    }

    // MONTANTE COLOSSAL DE LAVA (The Greatsword of Lava)
    // Elemento visual independente com núcleo de pedra vulcânica, lâmina de puro magma incandescente e gema solar
    function drawGreatsword(ctx, time, x, y, angle, active, buff, dead) {
        ctx.save();
        ctx.translate(Math.round(x), Math.round(y));
        ctx.rotate(angle);

        const glowPulse = 0.75 + Math.sin(time * 0.009) * 0.25;
        const bladeHeat = active ? 1 : (buff ? 0.9 : 0.75);

        // 1. Sombra projetada da espada no chão
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
        ctx.beginPath();
        ctx.ellipse(3, 20, 10, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 2. Halo térmico da lâmina incandescente
        ctx.save();
        ctx.globalAlpha = (dead ? 0.25 : 0.45) * glowPulse;
        ctx.fillStyle = '#ff4400';
        ctx.beginPath();
        ctx.ellipse(0, -36, 13, 38, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 3. Empunhadura e Pomo (Hilt & Pommel)
        // Pomo pesado em bronze e ouro antigo com ponta afiada
        polygon(ctx, [[-4, 26], [0, 31], [4, 26], [2, 23], [-2, 23]], '#312c36', '#d9a44e', 1.3);
        ctx.fillStyle = '#ff6018';
        ctx.fillRect(-1, 25, 2, 3); // gema no pomo

        // Cabo envolvido em couro escuro com anéis de bronze
        polygon(ctx, [[-3, 9], [3, 9], [3, 23], [-3, 23]], '#191820', '#855b25', 1);
        ctx.strokeStyle = '#c8923a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-3, 13); ctx.lineTo(3, 13);
        ctx.moveTo(-3, 17); ctx.lineTo(3, 17);
        ctx.moveTo(-3, 21); ctx.lineTo(3, 21);
        ctx.stroke();

        // 4. Guarda Colossal Alada (Massive Ornate Crossguard)
        // Estrutura de metal negro e bronze com garras recurvadas
        polygon(ctx, [
            [-5, 9], [-16, 14], [-24, 11], [-20, 5], [-8, 4], [-4, 0],
            [4, 0], [8, 4], [20, 5], [24, 11], [16, 14], [5, 9]
        ], '#222026', '#c9933b', 1.8);

        // Detalhes em bronze e fissuras de lava na guarda
        polygon(ctx, [[-23, 9], [-16, 6], [-12, 10], [-18, 12]], '#e6320d', '#ffd048', 0.8);
        polygon(ctx, [[23, 9], [16, 6], [12, 10], [18, 12]], '#e6320d', '#ffd048', 0.8);

        // 5. NÚCLEO SOLAR / GEMA INCANDESCENTE NO CENTRO DA GUARDA (Gema de Lava)
        ctx.save();
        ctx.translate(0, 5);
        ctx.fillStyle = '#b88235';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#5a3b15';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Estrela solar de 4 pontas flamejante
        ctx.globalAlpha = glowPulse;
        polygon(ctx, [[0, -4.5], [1.5, -1.2], [4.5, 0], [1.5, 1.2], [0, 4.5], [-1.5, 1.2], [-4.5, 0], [-1.5, -1.2]],
            '#ff3300', '#fff288', 0.8);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-1, -1, 2, 2);
        ctx.restore();

        // 6. LÂMINA COLOSSAL (Colossal Blade of Volcanic Rock and Molten Fire)
        // A) Bordas externas de puro MAGMA INCANDESCENTE (Fogo líquido nas bordas)
        ctx.save();
        ctx.globalAlpha = bladeHeat;
        polygon(ctx, [
            [-8, -2], [-11, -40], [-8, -62], [0, -78], [8, -62], [11, -40], [8, -2], [0, 3]
        ], '#ff3e06', '#ffe655', 1.5);
        ctx.restore();

        // B) Miolo central de pedra vulcânica / basalto negro escuro
        polygon(ctx, [
            [-6, -4], [-8, -39], [-5, -58], [0, -71], [5, -58], [8, -39], [6, -4], [0, 1]
        ], '#1c1b22', '#6b543e', 1.2);

        // C) Chanfro sombreado e facetamento da lâmina
        polygon(ctx, [
            [-6, -4], [-8, -39], [-5, -58], [0, -71], [0, -2]
        ], '#33303a', null);
        polygon(ctx, [
            [0, -2], [0, -71], [5, -58], [8, -39], [6, -4]
        ], '#141419', null);

        // D) FISSURAS PROFUNDAS DE MAGMA CORRENDO PELO MIOLO DA LÂMINA
        ctx.save();
        ctx.globalAlpha = glowPulse * bladeHeat;
        // Veia central de magma líquido
        polygon(ctx, [
            [-2, -8], [-4, -34], [-2, -54], [0, -66], [2, -54], [4, -34], [2, -8], [0, -3]
        ], '#ff4008', '#ffd44a', 0.9);

        // Ramificações e faíscas na lâmina
        ctx.fillStyle = '#fff4a0';
        ctx.fillRect(-1, -56, 2, 10);
        ctx.fillRect(0, -38, 2, 8);
        ctx.fillRect(-1, -20, 2, 7);

        // Fissuras diagonais cruzando a pedra
        ctx.strokeStyle = '#ff881a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-5, -28); ctx.lineTo(4, -32);
        ctx.moveTo(-4, -46); ctx.lineTo(3, -50);
        ctx.stroke();
        ctx.restore();

        // 7. Partículas de fogo subindo da lâmina
        if (!dead && Math.random() > 0.4) {
            ctx.fillStyle = Math.random() > 0.5 ? '#ffb438' : '#ff4408';
            ctx.fillRect((Math.random() - 0.5) * 8, -15 - Math.random() * 50, 1.8, 2.5);
        }

        ctx.restore();
    }

    // Arco de corte no Ataque Básico (Slash Trail)
    function drawSlash(ctx, phase) {
        if (phase < 0.22 || phase > 0.78) return;
        const p = (phase - 0.22) / 0.56;
        ctx.save();
        const fade = Math.sin(Math.PI * p);
        ctx.globalAlpha = fade * 0.95;

        // Arco largo de fogo externo
        ctx.lineWidth = 9 * (1 - p * 0.4);
        ctx.strokeStyle = '#f44418';
        ctx.beginPath();
        ctx.arc(14, -8, 32 + p * 10, -1.25 + p * 0.35, 1.05 + p * 0.3);
        ctx.stroke();

        // Arco de núcleo incandescente amarelo
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#ffe478';
        ctx.beginPath();
        ctx.arc(14, -8, 31 + p * 10, -1.2 + p * 0.35, 1.0 + p * 0.3);
        ctx.stroke();

        // Lascas de pedra e brasas acompanhando o corte
        for (let i = 0; i < 4; i++) {
            const a = -1.1 + p * 0.35 + i * 0.5;
            const r = 32 + p * 10;
            ctx.fillStyle = i % 2 ? '#ffcc48' : '#2d2422';
            ctx.fillRect(14 + Math.cos(a) * r, -8 + Math.sin(a) * r, 2.5, 2.5);
        }
        ctx.restore();
    }

    // Desenho composto do corpo do Kaledron
    function drawBody(ctx, time, phase, moving, stateName, dead, hit, buff, breathing) {
        ctx.save();
        if (dead) {
            ctx.rotate(0.78);
        } else if (hit) {
            ctx.translate(-2, 0);
        } else if (moving) {
            ctx.translate(0, Math.abs(Math.sin(phase)) * 1.4);
        }

        // 1. Manto por trás das pernas e do corpo
        drawCape(ctx, phase, moving, dead, stateName);

        // 2. Pernas pesadas
        drawLeg(ctx, -6, phase, false, dead, moving);
        drawLeg(ctx, 6, phase, true, dead, moving);

        // 3. Tronco, Armadura, Cinto e Brasão
        ctx.save();
        if (breathing > 0) {
            ctx.translate(0, -8);
            ctx.scale(1 + breathing * 0.022, 1 + breathing * 0.008);
            ctx.translate(0, 8);
        }
        drawTorso(ctx, time, hit, buff);
        ctx.restore();

        // 4. Ombros, Manoplas e Braços
        drawArmsAndPauldrons(ctx, time, hit);

        // 5. Capacete Chifrudo
        drawHelmet(ctx, time, true, hit);

        // 6. Relíquia rúnica flutuante
        drawFloatingRelic(ctx, time, dead, moving);

        ctx.restore();
    }

    // =========================================================================
    // FUNÇÃO PRINCIPAL DE RENDERIZAÇÃO PÚBLICA DO KALEDRON
    // =========================================================================
    root.desenharKaledron = function (x, y, isMoving, anguloBase, hp, maxHp, pid) {
        const ctx = root.ctx;
        if (!ctx) return;

        const id = pid || 'kaledron_local';
        const time = now();
        const numericHp = Number.isFinite(Number(hp)) ? Number(hp) : 1;
        const dead = numericHp <= 0;
        const state = stateFor(id, time, numericHp);
        const dt = Math.min(0.05, Math.max(0, (time - state.lastFrame) / 1000));
        state.lastFrame = time;

        if (Number.isFinite(Number(state.lastHp)) && numericHp < state.lastHp && numericHp > 0) {
            state.hitAt = time;
        }
        if (dead && state.deathAt === 0) state.deathAt = time;
        if (!dead) state.deathAt = 0;
        const hit = time - state.hitAt < 220;
        state.lastHp = numericHp;
        if (isMoving) state.walkPhase += dt * 10;

        // Recupera a animação ativa se existir
        const anim = root.kaledronAnims && root.kaledronAnims[id];
        let stateName = 'idle';
        let progress = 0;
        if (anim && time >= anim.inicio && time - anim.inicio < (anim.dur || 420)) {
            stateName = anim.estado || 'idle';
            progress = Math.max(0, Math.min(1, (time - anim.inicio) / (anim.dur || 420)));
        }

        const directionAngle = stateName === 'ataque' && Number.isFinite(anim && anim.angulo)
            ? anim.angulo : Number(anguloBase) || 0;
        const facingRight = Math.cos(directionAngle) >= 0;

        const player = root.todosJogadores && root.todosJogadores[id];
        const buff = Number(player && player.kaledronBradoAte) > Date.now() ||
            (id === root.meuId && root.kaledronEstadoLocal &&
                root.kaledronEstadoLocal.bradoAtivo && root.kaledronEstadoLocal.bradoExpira > time);

        const bob = dead || !isMoving ? 0 : Math.sin(time * 0.0035) * 0.6;
        const breathing = !dead && !isMoving && stateName === 'idle'
            ? 0.5 + Math.sin(time * 0.003) * 0.5
            : 0;

        ctx.save();
        ctx.translate(Math.round(x), Math.round(y + bob));
        ctx.translate(0, GROUND_ANCHOR_Y);
        ctx.scale(RENDER_SCALE, RENDER_SCALE);
        ctx.translate(0, -GROUND_ANCHOR_Y);
        if (!facingRight) ctx.scale(-1, 1);

        // 1. Sombra e fissuras de lava no chão
        ctx.fillStyle = 'rgba(6, 5, 8, 0.52)';
        ctx.beginPath();
        ctx.ellipse(0, GROUND_ANCHOR_Y, dead ? 24 : 17, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();
        drawGroundCracks(ctx, dead);

        // 2. Cinemática da Espada Flutuante (Montante de Lava)
        let swordX = 42;
        let swordY = -12 + (isMoving ? Math.sin(time * 0.003) * 1.2 : 0);
        let swordAngle = 0.12;

        if (stateName === 'redemoinho') {
            // A espada gira em órbita de 360° em alta velocidade ao redor do corpo
            const orbit = progress * Math.PI * 14;
            swordX = Math.cos(orbit) * 44;
            swordY = Math.sin(orbit) * 22;
            swordAngle = orbit + Math.PI * 0.5;
        } else if (stateName === 'ataque') {
            // Corte devastador para frente
            swordX = 38 + Math.sin(progress * Math.PI) * 18;
            swordY = -18 + progress * 24;
            swordAngle = -0.45 + progress * 1.35;
        } else if (stateName === 'impacto') {
            // Golpe contra o chão
            swordX = 26 + (1 - progress) * 8;
            swordY = -28 + progress * 38;
            swordAngle = -0.2 + progress * 0.6;
        } else if (stateName === 'brado') {
            // Montante erguido para o céu em triunfo
            swordX = 28;
            swordY = -36 + Math.sin(time * 0.008) * 1.5;
            swordAngle = -0.65;
        } else if (isMoving) {
            // Inércia durante a caminhada
            swordAngle += 0.15;
            swordY += Math.sin(state.walkPhase) * 1.5;
        }

        if (dead) {
            // Espada fincada na rocha ao lado do guerreiro caído
            swordX = 22;
            swordY = 6;
            swordAngle = 0.85;
        }

        // Renderiza corpo e espada
        drawBody(ctx, time, state.walkPhase, !!isMoving, stateName, dead, hit, buff, breathing);
        drawGreatsword(ctx, time, swordX, swordY, swordAngle, stateName !== 'idle' || hit, buff, dead);

        // Efeito de corte local se atacando
        if (stateName === 'ataque') {
            drawSlash(ctx, progress);
        }

        // Efeito do bônus persistente no chão
        if (buff && !dead) {
            ctx.save();
            ctx.globalAlpha = 0.38 + Math.sin(time * 0.006) * 0.14;
            ctx.strokeStyle = '#ff9924';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.ellipse(0, GROUND_ANCHOR_Y, 20, 5, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // Atualiza partículas vulcânicas do jogador
        updateParticles(ctx, state, dt, time, !!isMoving, dead, hit);

        ctx.restore();

        // Limpeza de cache de estados de jogadores remotos se exceder limite
        const ids = Object.keys(states);
        if (ids.length > MAX_STATES) {
            ids.sort(function (a, b) { return states[a].lastFrame - states[b].lastFrame; });
            for (let i = 0; i < ids.length - MAX_STATES; i++) {
                delete states[ids[i]];
            }
        }
    };

    // Limpeza explícita de estados visuais (ex: logout, respawn, etc.)
    root.limparKaledronVisuais = function (pid) {
        if (pid) delete states[pid];
        else {
            Object.keys(states).forEach(function (id) { delete states[id]; });
        }
    };

})(window);
