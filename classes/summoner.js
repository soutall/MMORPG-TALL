// classes/summoner.js — Renderização do Summoner e do GOLEM DE PEDRA (pet)
// ============================================================================
// v2: visual refeito para casar com a folha de conceito do Summoner
//     (invocadora de capuz roxo/violeta com acabamento dourado, cabelo claro e
//     cajado de cristal; Golem de Pedra com olhos azuis e núcleo de cristal).
//
// INTERFACES PÚBLICAS IDÊNTICAS (nada fora deste arquivo mudou):
//     window.desenharLacaio(lacaio)
//     window.desenharSummoner(x, y, isMoving, angulo, hp, maxHp)
//     window.enviarAtaqueSummoner(ws)
// Estado externo lido: window.ctx, window.walkCycle, window.danoFlashTimer;
//     o lacaio continua usando lacaio.x / y / hp / maxHp / isJumping.
//
// NOVO: window.desenharCorpoGolem(x, y, escala) é o desenho do golem sozinho,
//       compartilhado com a animação de salto (efeitos.js) — antes o salto
//       redesenhava o ogro à mão (e ia ficar dessincronizado do visual novo).
// ============================================================================

// Paleta da Pedra Flutuante: rocha roxa + cristal violeta + aura
const GOLEM_COR = {
    faceClara: '#9a86c9',
    faceMedia: '#6f5aa0',
    faceEscura: '#463a70',
    faceSombra: '#2a2245',
    rachadura: '#1e1833',
    cristalClaro: '#efd9ff',
    cristal: '#b878ff',
    cristalEscuro: '#7c2fe0',
    glow: '#a94fff',
    brilho: '#e9ccff'
};

// ---------------------------------------------------------------------------
// Pedra Flutuante (pet do Summoner) — rocha roxa levitando com cristais,
// aura de invocação e uma pedra menor orbitando ao redor (referencial local)
// ---------------------------------------------------------------------------
window.desenharCorpoGolem = function (x, y, escala) {
    const ctx = window.ctx;
    if (!ctx) return;
    const e = escala || 1;
    const t = Date.now() / 1000;
    const flutua = Math.sin(t * 1.8) * 4.2;         // balanço de flutuação
    const pulso = 0.75 + Math.sin(t * 2.4) * 0.25;  // pulso dos cristais
    const balanca = Math.sin(t * 1.15) * 0.06;      // leve inclinação

    ctx.save();
    ctx.translate(x, y - flutua);
    ctx.scale(e, e);
    ctx.rotate(balanca);

    // ---------- AURA roxa ao redor da pedra ----------
    const gAura = ctx.createRadialGradient(0, -12, 2, 0, -12, 46 * pulso);
    gAura.addColorStop(0, 'rgba(170,90,255,0.30)');
    gAura.addColorStop(0.6, 'rgba(140,60,230,0.12)');
    gAura.addColorStop(1, 'rgba(140,60,230,0)');
    ctx.save();
    ctx.fillStyle = gAura;
    ctx.beginPath();
    ctx.arc(0, -12, 46 * pulso, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ---------- cascalhos pequenos flutuando na aura ----------
    const detritos = [
        { ang: 0.9, dist: 30, yy: -26, tam: 2.6, fase: 0.0 },
        { ang: 2.9, dist: 33, yy: -10, tam: 2.1, fase: 1.7 },
        { ang: 4.6, dist: 29, yy: 2, tam: 2.3, fase: 3.2 },
        { ang: 5.8, dist: 34, yy: -20, tam: 1.9, fase: 4.8 }
    ];
    ctx.fillStyle = GOLEM_COR.faceMedia;
    ctx.strokeStyle = GOLEM_COR.faceSombra;
    ctx.lineWidth = 0.7;
    for (let i = 0; i < detritos.length; i++) {
        const s = detritos[i];
        const sx = Math.cos(s.ang + t * 0.5) * s.dist;
        const sy = s.yy + Math.sin(t * 1.4 + s.fase) * 3;
        ctx.save();
        ctx.shadowColor = GOLEM_COR.glow;
        ctx.shadowBlur = 6 * pulso;
        ctx.beginPath();
        ctx.moveTo(sx - s.tam, sy + s.tam * 0.6);
        ctx.lineTo(sx, sy - s.tam);
        ctx.lineTo(sx + s.tam, sy + s.tam * 0.4);
        ctx.lineTo(sx + s.tam * 0.2, sy + s.tam);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    // ---------- PEDRA MENOR orbitando a rocha principal ----------
    const orbAng = t * 0.85;
    const oxOrb = Math.cos(orbAng) * 40;
    const oyOrb = -12 + Math.sin(orbAng * 1.35) * 10;
    // rastro roxo atrás da pedra menor
    for (let r = 1; r <= 3; r++) {
        const angRastro = orbAng - r * 0.055;
        const rx = Math.cos(angRastro) * 40;
        const ry = -12 + Math.sin(angRastro * 1.35) * 10;
        ctx.fillStyle = 'rgba(170,90,255,' + (0.16 / r).toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(rx, ry, 4.4 - r * 1.1, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.save();
    ctx.translate(oxOrb, oyOrb);
    ctx.rotate(orbAng * 0.5);
    ctx.shadowColor = GOLEM_COR.glow;
    ctx.shadowBlur = 10 * pulso;
    const gOrb = ctx.createLinearGradient(-6, -3, 6, 4);
    gOrb.addColorStop(0, GOLEM_COR.faceClara);
    gOrb.addColorStop(0.5, GOLEM_COR.faceMedia);
    gOrb.addColorStop(1, GOLEM_COR.faceEscura);
    ctx.fillStyle = gOrb;
    ctx.strokeStyle = GOLEM_COR.faceSombra;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-6, 1);
    ctx.lineTo(-3, -5);
    ctx.lineTo(3, -5);
    ctx.lineTo(6, 2);
    ctx.lineTo(2, 5);
    ctx.lineTo(-4, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // cristalzinho roxo cravado na pedra menor
    ctx.fillStyle = GOLEM_COR.cristal;
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(2.6, -1.5);
    ctx.lineTo(0, 2);
    ctx.lineTo(-2.6, -1.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // ---------- ROCHA PRINCIPAL FLUTUANTE ----------
    ctx.save();
    ctx.shadowColor = 'rgba(150,60,255,0.85)';
    ctx.shadowBlur = 16 * pulso;

    const gRocha = ctx.createLinearGradient(-22, -32, 22, 4);
    gRocha.addColorStop(0, GOLEM_COR.faceClara);
    gRocha.addColorStop(0.45, GOLEM_COR.faceMedia);
    gRocha.addColorStop(1, GOLEM_COR.faceEscura);
    ctx.fillStyle = gRocha;
    ctx.strokeStyle = GOLEM_COR.faceSombra;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -33);
    ctx.lineTo(9, -31);
    ctx.lineTo(17, -25);
    ctx.lineTo(22, -16);
    ctx.lineTo(23, -7);
    ctx.lineTo(17, 0);
    ctx.lineTo(9, 3);
    ctx.lineTo(0, 4);
    ctx.lineTo(-8, 3);
    ctx.lineTo(-16, -1);
    ctx.lineTo(-21, -8);
    ctx.lineTo(-22, -17);
    ctx.lineTo(-16, -26);
    ctx.lineTo(-8, -31);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // facetas de luz (topo/lado esquerdo)
    ctx.fillStyle = 'rgba(233,204,255,0.35)';
    ctx.beginPath();
    ctx.moveTo(-8, -30);
    ctx.lineTo(1, -31);
    ctx.lineTo(-2, -24);
    ctx.lineTo(-12, -22);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(233,204,255,0.22)';
    ctx.beginPath();
    ctx.moveTo(8, -28);
    ctx.lineTo(15, -20);
    ctx.lineTo(6, -15);
    ctx.lineTo(2, -22);
    ctx.closePath();
    ctx.fill();

    // sombreado da base
    ctx.fillStyle = 'rgba(30,24,50,0.40)';
    ctx.beginPath();
    ctx.moveTo(-16, -3);
    ctx.lineTo(-7, 3);
    ctx.lineTo(6, 3);
    ctx.lineTo(15, -2);
    ctx.lineTo(10, -8);
    ctx.lineTo(-8, -6);
    ctx.closePath();
    ctx.fill();

    // rachaduras
    ctx.strokeStyle = GOLEM_COR.rachadura;
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(-8, -26); ctx.lineTo(-10, -16); ctx.lineTo(-5, -10);
    ctx.moveTo(6, -22); ctx.lineTo(10, -13); ctx.lineTo(14, -8);
    ctx.moveTo(-2, 2); ctx.lineTo(3, -4);
    ctx.stroke();

    // crateras com brilho roxo interior
    const crateras = [[-11, -13, 3.4], [12, -10, 2.8], [-4, 1, 2.4], [4, -20, 2.2]];
    ctx.fillStyle = GOLEM_COR.faceSombra;
    for (let i = 0; i < crateras.length; i++) {
        const c = crateras[i];
        ctx.beginPath();
        ctx.ellipse(c[0], c[1], c[2], c[2] * 0.72, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.fillStyle = 'rgba(169,79,255,' + (0.30 * pulso).toFixed(3) + ')';
    for (let i = 0; i < crateras.length; i++) {
        const c = crateras[i];
        ctx.beginPath();
        ctx.ellipse(c[0], c[1], c[2] * 0.55, c[2] * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // ---------- CRISTAIS ROXOS cravados na rocha ----------
    const cristais = [
        { cx: -9, cy: -20, altura: 6.5, base: 2.8, fase: 0 },
        { cx: 13, cy: -12, altura: 5.2, base: 2.2, fase: 2.1 },
        { cx: -3, cy: -6, altura: 4.4, base: 2.0, fase: 4.0 }
    ];
    for (let i = 0; i < cristais.length; i++) {
        const cr = cristais[i];
        const brilho = 0.75 + Math.sin(t * 2.4 + cr.fase) * 0.25;
        ctx.save();
        ctx.shadowColor = GOLEM_COR.cristal;
        ctx.shadowBlur = 10 * brilho;
        const gCr = ctx.createLinearGradient(cr.cx, cr.cy - cr.altura, cr.cx, cr.cy);
        gCr.addColorStop(0, GOLEM_COR.cristalClaro);
        gCr.addColorStop(0.5, GOLEM_COR.cristal);
        gCr.addColorStop(1, GOLEM_COR.cristalEscuro);
        ctx.fillStyle = gCr;
        ctx.beginPath();
        ctx.moveTo(cr.cx - cr.base, cr.cy);
        ctx.lineTo(cr.cx, cr.cy - cr.altura);
        ctx.lineTo(cr.cx + cr.base, cr.cy);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    ctx.restore(); // fim da rocha (reseta glow)
    ctx.restore();
};

// ---------------------------------------------------------------------------
// Pet: Pedra Flutuante (aura no chão + sombra + corpo + energia + vida)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// VFX DAS SKILLS DO GOLEM — fissuras, impacto de salto e aura profana
// ---------------------------------------------------------------------------
window.golemEfeitosAtivos = window.golemEfeitosAtivos || [];
window._golemJumpStates = window._golemJumpStates || {};
window._golemSkillStates = window._golemSkillStates || {};

function _golemPushEffect(effect) {
    if (window.golemEfeitosAtivos.length < 80) {
        window.golemEfeitosAtivos.push(effect);
    }
}

function _golemHash(v) {
    const s = String(v == null ? '' : v);
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return h >>> 0;
}

// Skill 1: Esmagamento Sísmico — SUPER PISÃO
window.criarEfeitoGolemEsmagamento = function (x, y, raio) {
    const r = raio || 92;
    _golemPushEffect({
        tipo: 'esmagamento', x, y, raio: 8, maxRaio: r,
        alpha: 1, idade: 0, vida: 850,
        seed: _golemHash((x * 31) + ':' + (y * 17) + ':' + Date.now())
    });
};

// Skill 2: Salto do Golem — impacto de aterrissagem
window.criarEfeitoGolemSalto = function (x, y) {
    _golemPushEffect({
        tipo: 'salto', x, y, raio: 12, maxRaio: 105,
        alpha: 1, idade: 0, vida: 900,
        seed: _golemHash('salto:' + x + ':' + y + ':' + Date.now())
    });
};

function _desenharEfeitosGolem() {
    const ctx = window.ctx;
    if (!ctx || !window.golemEfeitosAtivos) return;
    const agora = Date.now();

    for (let i = window.golemEfeitosAtivos.length - 1; i >= 0; i--) {
        const ef = window.golemEfeitosAtivos[i];
        const dt = 16.67;
        ef.idade += dt;
        const p = Math.max(0, Math.min(1, ef.idade / ef.vida));
        ef.alpha = 1 - p;

        if (p >= 1) {
            window.golemEfeitosAtivos.splice(i, 1);
            continue;
        }

        ctx.save();

        if (ef.tipo === 'esmagamento' || ef.tipo === 'salto') {
            const salto = ef.tipo === 'salto';
            const eased = 1 - Math.pow(1 - p, 2);
            const raio = ef.raio + (ef.maxRaio - ef.raio) * eased;

            // Fissuras principais no chão.
            ctx.globalAlpha = ef.alpha * (salto ? 0.95 : 0.9);
            ctx.lineWidth = salto ? 2.8 : 2.4;
            ctx.strokeStyle = salto ? '#b878ff' : '#c47a45';
            ctx.shadowColor = salto ? '#9b4dff' : '#8a5a35';
            ctx.shadowBlur = salto ? 10 : 7;

            const branches = salto ? 14 : 11;
            const seed = ef.seed || 1;
            for (let b = 0; b < branches; b++) {
                const baseA = (b / branches) * Math.PI * 2 + ((seed % 1000) / 1000) * 0.35;
                const len = raio * (0.70 + ((b * 37 + seed) % 31) / 100);
                let px = ef.x + Math.cos(baseA) * (raio * 0.10);
                let py = ef.y + Math.sin(baseA) * (raio * 0.10);
                ctx.beginPath();
                ctx.moveTo(px, py);
                const segs = 3 + (b % 2);
                for (let k = 1; k <= segs; k++) {
                    const dist = (len / segs) * k;
                    const jitter = Math.sin((seed + b * 19 + k * 7) * 0.13) * (4 + k * 0.6);
                    const a2 = baseA + jitter * 0.012;
                    px = ef.x + Math.cos(a2) * dist;
                    py = ef.y + Math.sin(a2) * dist;
                    ctx.lineTo(px, py);
                }
                ctx.stroke();

                if (b % 2 === 0) {
                    const side = baseA + 0.34;
                    const bx = ef.x + Math.cos(baseA) * (len * 0.45);
                    const by = ef.y + Math.sin(baseA) * (len * 0.45);
                    ctx.beginPath();
                    ctx.moveTo(bx, by);
                    ctx.lineTo(
                        bx + Math.cos(side) * len * 0.26,
                        by + Math.sin(side) * len * 0.26
                    );
                    ctx.stroke();
                }
            }

            // Anel de impacto.
            ctx.globalAlpha = ef.alpha * (salto ? 0.75 : 0.6);
            ctx.lineWidth = salto ? 3.5 : 3;
            ctx.strokeStyle = salto ? '#d8b1ff' : '#f0a45b';
            ctx.beginPath();
            ctx.ellipse(ef.x, ef.y + 16, raio * 0.86, raio * 0.30, 0, 0, Math.PI * 2);
            ctx.stroke();

            // Flash no centro no começo do impacto.
            if (p < 0.25) {
                const flash = 1 - p / 0.25;
                ctx.globalAlpha = flash * (salto ? 0.38 : 0.26);
                const g = ctx.createRadialGradient(ef.x, ef.y + 8, 0, ef.x, ef.y + 8, 58);
                g.addColorStop(0, salto ? 'rgba(226,188,255,0.9)' : 'rgba(255,220,160,0.9)');
                g.addColorStop(1, 'rgba(255,255,255,0)');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(ef.x, ef.y + 8, 58, 0, Math.PI * 2);
                ctx.fill();
            }

            // Poeira volumosa em forma de partículas escalonadas.
            const nPoeira = salto ? 26 : 20;
            ctx.globalAlpha = ef.alpha * 0.85;
            for (let q = 0; q < nPoeira; q++) {
                const a = (q / nPoeira) * Math.PI * 2 + (ef.seed % 17) * 0.07;
                const speed = 18 + ((q * 13 + ef.seed) % 35);
                const dist = eased * speed;
                const px = ef.x + Math.cos(a) * dist;
                const py = ef.y + 12 + Math.sin(a) * dist * 0.45 - eased * 18;
                const s = (1 - p) * (salto ? 3.8 : 3.2) + 0.8;
                ctx.fillStyle = q % 3 === 0 ? '#c9aa8b' : '#8b735d';
                ctx.beginPath();
                ctx.fillRect(Math.round(px - s / 2), Math.round(py - s / 2), Math.max(1, Math.round(s)), Math.max(1, Math.round(s)));
            }

            // Pedras que voam para os lados após o salto.
            if (salto) {
                ctx.globalAlpha = ef.alpha;
                const nPedras = 11;
                for (let q = 0; q < nPedras; q++) {
                    const a = (q / nPedras) * Math.PI * 2 + 0.18;
                    const dist = eased * (36 + ((q * 23 + ef.seed) % 50));
                    const px = ef.x + Math.cos(a) * dist;
                    const py = ef.y + 8 + Math.sin(a) * dist * 0.58 - eased * 24 + Math.sin((agora / 90) + q) * 3;
                    const s = 2 + ((q + (ef.seed % 3)) % 3);
                    ctx.fillStyle = q % 2 ? '#6f5a55' : '#9b8274';
                    ctx.strokeStyle = '#3a2f35';
                    ctx.lineWidth = 0.8;
                    ctx.beginPath();
                    ctx.moveTo(px - s, py + s * 0.3);
                    ctx.lineTo(px - s * 0.15, py - s);
                    ctx.lineTo(px + s, py - s * 0.1);
                    ctx.lineTo(px + s * 0.2, py + s);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                }
            }
        }

        ctx.restore();
    }
}

// Detecta propriedades opcionais caso o código de combate já exponha a skill ativa.
// Se não existir nenhuma dessas propriedades, as APIs públicas acima continuam disponíveis.
function _atualizarEfeitosSkillGolem(lacaio) {
    if (!lacaio) return;
    const id = lacaio.pid || lacaio.id || 'golem';
    const skill = lacaio.skillId || lacaio.skillAtiva || lacaio.acaoSkill || lacaio.acao || null;
    const anterior = window._golemSkillStates[id];
    window._golemSkillStates[id] = skill;

    if (skill === 'esmagamento' && anterior !== skill) {
        window.criarEfeitoGolemEsmagamento(lacaio.x, lacaio.y, 92);
    }
}

window.desenharLacaio = function (lacaio) {
    if (!lacaio || !window.ctx) return;
    const ctx = window.ctx;
    
    // Se estiver transformado no Golem Sísmico, a representação colossal é desenhada pelo módulo VFX
    const petKey = lacaio.pid || lacaio.id;
    if (window.golemsSismicosAtivos && petKey && window.golemsSismicosAtivos[petKey]) {
        if (typeof window.desenharBarraHp === "function") {
            window.desenharBarraHp(lacaio.x - 18, lacaio.y - 90, lacaio.hp, lacaio.maxHp);
        }
        ctx.save();
        ctx.font = "bold 11px sans-serif";
        ctx.fillStyle = "#ffd700";
        ctx.textAlign = "center";
        ctx.shadowColor = "rgba(0,0,0,0.85)";
        ctx.shadowBlur = 4;
        ctx.fillText("🛡️ IMUNE", lacaio.x, lacaio.y - 97);
        ctx.restore();
        return;
    }
    const t = Date.now() / 1000;
    const pulso = 0.78 + Math.sin(t * 2.2) * 0.22;

    _atualizarEfeitosSkillGolem(lacaio);

    // Detecta aterrissagem: enquanto isJumping era true e agora virou false,
    // cria o grande impacto visual. A mecânica do salto não é alterada.
    const jumpKey = lacaio.pid || lacaio.id || 'golem';
    const estavaPulando = window._golemJumpStates[jumpKey] === true;
    if (lacaio.isJumping) {
        window._golemJumpStates[jumpKey] = true;
        _desenharEfeitosGolem();
        return;
    }
    if (estavaPulando) {
        window.criarEfeitoGolemSalto(lacaio.x, lacaio.y);
    }
    window._golemJumpStates[jumpKey] = false;

    // Fissuras/impactos são desenhados antes do corpo, para parecerem presos ao chão.
    _desenharEfeitosGolem();

    // ---------- aura roxa no chão (círculo de invocação) ----------
    ctx.save();
    const gAuraChao = ctx.createRadialGradient(lacaio.x, lacaio.y + 18, 2, lacaio.x, lacaio.y + 18, 30);
    gAuraChao.addColorStop(0, 'rgba(150,70,255,' + (0.34 * pulso).toFixed(3) + ')');
    gAuraChao.addColorStop(0.6, 'rgba(120,50,220,0.14)');
    gAuraChao.addColorStop(1, 'rgba(120,50,220,0)');
    ctx.fillStyle = gAuraChao;
    ctx.beginPath();
    ctx.ellipse(lacaio.x, lacaio.y + 18, 30 * pulso, 9 * pulso, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(180,110,255,' + (0.5 * pulso).toFixed(3) + ')';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(lacaio.x, lacaio.y + 18, 22, 6.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // ---------- sombra da rocha flutuante (mais fraca, no chão) ----------
    const gSombra = ctx.createRadialGradient(lacaio.x, lacaio.y + 18, 1, lacaio.x, lacaio.y + 18, 21);
    gSombra.addColorStop(0, 'rgba(6,4,10,0.55)');
    gSombra.addColorStop(0.7, 'rgba(6,4,10,0.28)');
    gSombra.addColorStop(1, 'rgba(6,4,10,0)');
    ctx.fillStyle = gSombra;
    ctx.beginPath();
    ctx.ellipse(lacaio.x, lacaio.y + 18, 21, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    let estaColossal = (window.lacaioColossal && lacaio.pid && window.lacaioColossal[lacaio.pid]) ? true : false;
    let escalaGolem = estaColossal ? 1.4 : 1;

    // Skill 3: Golem Colossal — aura profana permanente enquanto o estado colossal estiver ativo.
    if (estaColossal) {
        ctx.save();
        const profPulse = 0.72 + Math.sin(t * 2.6) * 0.28;
        const profR = 54 + Math.sin(t * 1.7) * 5;
        const gProf = ctx.createRadialGradient(lacaio.x, lacaio.y + 4, 4, lacaio.x, lacaio.y + 4, profR);
        gProf.addColorStop(0, 'rgba(70,10,100,' + (0.38 * profPulse).toFixed(3) + ')');
        gProf.addColorStop(0.42, 'rgba(105,25,150,' + (0.20 * profPulse).toFixed(3) + ')');
        gProf.addColorStop(1, 'rgba(20,0,35,0)');
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = gProf;
        ctx.beginPath();
        ctx.arc(lacaio.x, lacaio.y + 4, profR, 0, Math.PI * 2);
        ctx.fill();

        // Anéis profanos no chão.
        ctx.globalAlpha = 0.30 + profPulse * 0.22;
        ctx.shadowColor = '#8f3dff';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = '#8f3dff';
        ctx.lineWidth = 1.8;
        for (let ring = 0; ring < 2; ring++) {
            const rr = 32 + ring * 11 + Math.sin(t * 1.5 + ring) * 2;
            ctx.beginPath();
            ctx.ellipse(lacaio.x, lacaio.y + 18, rr, rr * 0.30, 0, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Chamas/sombras verticais subindo continuamente.
        for (let p = 0; p < 9; p++) {
            const a = t * (0.7 + p * 0.01) + p * (Math.PI * 2 / 9);
            const dist = 18 + (p % 3) * 7;
            const px = lacaio.x + Math.cos(a) * dist;
            const py = lacaio.y + 13 - ((t * (22 + p * 1.8) + p * 13) % 54);
            const alpha = 0.16 + 0.16 * Math.abs(Math.sin(t * 2.4 + p));
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p % 2 ? '#a94fff' : '#5b238e';
            ctx.shadowColor = '#a94fff';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.ellipse(px, py, 2.2, 5.0, a * 0.2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    window.desenharCorpoGolem(lacaio.x, lacaio.y, escalaGolem);

    // ---------- energia roxa subindo pela rocha ----------
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) {
        const a = t * 0.9 + i * (Math.PI * 2 / 5);
        const px = lacaio.x + Math.cos(a) * 24;
        const py = lacaio.y + 14 + Math.sin(a) * 6 - ((t * 30 + i * 32) % 60) * 0.55;
        ctx.fillStyle = 'rgba(190,120,255,' + (0.28 + Math.sin(t * 3 + i) * 0.12).toFixed(3) + ')';
        ctx.shadowColor = '#a94fff';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.ellipse(px, py, 2.2, 3.4, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();

    if (typeof window.desenharBarraHp === "function") {
        window.desenharBarraHp(lacaio.x - 18, lacaio.y - 44, lacaio.hp, lacaio.maxHp);
    }
};

// ---------------------------------------------------------------------------
// Summoner (personagem) — invocadora de capuz com cajado de cristal
// ---------------------------------------------------------------------------
window.desenharSummoner = function (x, y, isMoving, angulo, hp, maxHp) {
    if (hp <= 0 || !window.ctx) return;
    const ctx = window.ctx;

    const t = Date.now() / 1000;
    const ciclo = window.walkCycle || 0;
    const passo = isMoving ? Math.sin(ciclo) : 0;
    const sobe = isMoving ? Math.abs(Math.sin(ciclo)) * 1.2
                          : Math.sin(t * 2.0) * 0.45 + 0.45;
    const ang = angulo || 0;
    const dano = (window.danoFlashTimer || 0) > 0;
    const cor = (normal, flash) => (dano ? flash : normal);

    const CAPA_TOPO   = cor('#7b57b5', '#ff8f7d');
    const CAPA_MEIO   = cor('#553a86', '#e74c3c');
    const CAPA_BASE   = cor('#2f1f4d', '#a93226');
    const CAPUZ_TOPO  = cor('#6b4a9e', '#e04b3a');
    const CAPUZ_BASE  = cor('#2a1a45', '#8e2a1f');
    const OURO        = cor('#e5c15c', '#ffe08a');
    const OURO_ESCURO = cor('#a8862c', '#c9a227');
    const CABELO      = cor('#e9e2f5', '#ffd9d0');
    const PELE        = cor('#f2d6bd', '#ffb3a7');
    const CONTORNO    = 'rgba(14,8,24,0.85)';

    ctx.save();
    ctx.translate(x, y);

    // ---------- aura de invocação no chão ----------
    const pulsoAura = 1 + Math.sin(t * 2.3) * 0.07;
    const gAura = ctx.createRadialGradient(12, 31.0, 0.5, 12, 31.0, 10.4);
    gAura.addColorStop(0, 'rgba(122,84,208,0.30)');
    gAura.addColorStop(0.55, 'rgba(85,58,134,0.12)');
    gAura.addColorStop(1, 'rgba(47,31,77,0)');
    ctx.fillStyle = gAura;
    ctx.beginPath();
    ctx.ellipse(12, 31.0, 10.4 * pulsoAura, 3.7 * pulsoAura, 0, 0, Math.PI * 2);
    ctx.fill();

    // ---------- sombra ----------
    const gSombra = ctx.createRadialGradient(12, 32.3, 0.5, 12, 32.3, 10.2);
    gSombra.addColorStop(0, 'rgba(8,4,16,0.58)');
    gSombra.addColorStop(0.7, 'rgba(8,4,16,0.32)');
    gSombra.addColorStop(1, 'rgba(8,4,16,0)');
    ctx.fillStyle = gSombra;
    ctx.beginPath();
    ctx.ellipse(12, 32.3, 10.2, 3.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // ---------- botas ----------
    ctx.fillStyle = cor('#241a33', '#6b1f16');
    ctx.beginPath();
    ctx.ellipse(9.3, 30.8 + passo * 1.0, 3.0, 1.9, 0, 0, Math.PI * 2);
    ctx.ellipse(14.7, 30.8 - passo * 1.0, 3.0, 1.9, 0, 0, Math.PI * 2);
    ctx.fill();

    // ---------- corpo (respira) ----------
    ctx.save();
    ctx.translate(0, -sobe * 0.55);

    // vestido inferior (aparece pela abertura da capa)
    const gVestido = ctx.createLinearGradient(0, 14, 0, 31);
    gVestido.addColorStop(0, cor('#5a6fc4', '#e05b48'));
    gVestido.addColorStop(1, cor('#26305e', '#7b2318'));
    ctx.fillStyle = gVestido;
    ctx.beginPath();
    ctx.moveTo(9.0, 15.0);
    ctx.quadraticCurveTo(7.6, 24.0, 7.2, 30.0);
    ctx.quadraticCurveTo(12.0, 31.4, 16.8, 30.0);
    ctx.quadraticCurveTo(16.4, 24.0, 15.0, 15.0);
    ctx.closePath();
    ctx.fill();

    // capa externa
    const gCapa = ctx.createLinearGradient(0, 10, 0, 31.5);
    gCapa.addColorStop(0, CAPA_TOPO);
    gCapa.addColorStop(0.45, CAPA_MEIO);
    gCapa.addColorStop(1, CAPA_BASE);
    ctx.fillStyle = gCapa;
    ctx.beginPath();
    ctx.moveTo(7.0, 12.0);
    ctx.quadraticCurveTo(4.0, 20.0, 2.8 + passo * 0.7, 30.4);
    ctx.quadraticCurveTo(12.0, 33.1, 21.2 - passo * 0.7, 30.4);
    ctx.quadraticCurveTo(20.0, 20.0, 17.0, 12.0);
    ctx.quadraticCurveTo(12.0, 9.2, 7.0, 12.0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = CONTORNO;
    ctx.lineWidth = 0.9;
    ctx.stroke();

    // abertura frontal
    ctx.fillStyle = cor('#233060', '#7b2318');
    ctx.beginPath();
    ctx.moveTo(10.2, 13.6);
    ctx.quadraticCurveTo(9.4, 22.0, 9.6, 29.4);
    ctx.quadraticCurveTo(12.0, 30.2, 14.4, 29.4);
    ctx.quadraticCurveTo(14.6, 22.0, 13.8, 13.6);
    ctx.closePath();
    ctx.fill();

    // dobras
    ctx.strokeStyle = 'rgba(26,12,44,0.55)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(6.6, 16.0); ctx.quadraticCurveTo(5.2, 23.0, 5.8, 29.0);
    ctx.moveTo(17.4, 16.0); ctx.quadraticCurveTo(18.8, 23.0, 18.2, 29.0);
    ctx.stroke();

    // barra da capa + filete dourado
    ctx.strokeStyle = cor('#1e1230', '#8e2a1f');
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(3.3, 29.9); ctx.quadraticCurveTo(12.0, 32.5, 20.7, 29.9);
    ctx.stroke();
    ctx.strokeStyle = OURO;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(3.7, 28.8); ctx.quadraticCurveTo(12.0, 31.2, 20.3, 28.8);
    ctx.stroke();

    // acabamento dourado nas laterais (assinatura da folha de conceito)
    ctx.beginPath();
    ctx.moveTo(7.2, 12.4); ctx.quadraticCurveTo(4.4, 20.0, 3.3, 29.2);
    ctx.moveTo(16.8, 12.4); ctx.quadraticCurveTo(19.6, 20.0, 20.7, 29.2);
    ctx.stroke();
    // luz de borda (sol de noroeste)
    ctx.strokeStyle = 'rgba(226,200,255,0.30)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(7.4, 12.8); ctx.quadraticCurveTo(5.0, 20.0, 3.9, 28.8);
    ctx.stroke();

    // cinto + fecho dourado
    ctx.fillStyle = cor('#2b1c46', '#8e2a1f');
    ctx.beginPath();
    ctx.moveTo(7.6, 18.6); ctx.quadraticCurveTo(12.0, 19.8, 16.4, 18.6);
    ctx.lineTo(16.7, 20.9); ctx.quadraticCurveTo(12.0, 22.1, 7.3, 20.9);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = OURO;
    ctx.beginPath();
    ctx.ellipse(12.0, 20.2, 1.5, 1.1, 0, 0, Math.PI * 2);
    ctx.fill();

    // ---------- mangas (a direita acompanha o cajado) ----------
    const DESLOC_CAJADO = 14.0, PEGADA = 5.0;
    const maoX = 12.0 + Math.cos(ang) * DESLOC_CAJADO - Math.sin(ang) * PEGADA;
    const maoY = 16.0 + Math.sin(ang) * DESLOC_CAJADO + Math.cos(ang) * PEGADA;

    ctx.fillStyle = CAPA_MEIO;
    ctx.strokeStyle = CONTORNO;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(7.0, 12.4);
    ctx.quadraticCurveTo(3.8, 16.8, 4.7, 21.0);
    ctx.quadraticCurveTo(7.0, 22.2, 7.8, 19.8);
    ctx.quadraticCurveTo(6.9, 16.2, 8.9, 13.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(16.6, 12.4);
    ctx.quadraticCurveTo(maoX + 2.2, maoY - 4.6, maoX + 1.2, maoY - 0.8);
    ctx.quadraticCurveTo(maoX - 2.6, maoY + 1.4, maoX - 3.2, maoY - 1.8);
    ctx.quadraticCurveTo(14.0, 14.2, 14.6, 12.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore(); // fim do "respirar"

    // ---------- capuz ----------
    const gCapuz = ctx.createLinearGradient(0, 4.4, 0, 13.6);
    gCapuz.addColorStop(0, CAPUZ_TOPO);
    gCapuz.addColorStop(1, CAPUZ_BASE);
    ctx.fillStyle = gCapuz;
    ctx.beginPath();
    ctx.moveTo(6.8, 12.4);
    ctx.quadraticCurveTo(5.9, 5.2, 12.0, 4.8);
    ctx.quadraticCurveTo(18.1, 5.2, 17.2, 12.4);
    ctx.quadraticCurveTo(12.0, 14.6, 6.8, 12.4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = CONTORNO;
    ctx.lineWidth = 0.9;
    ctx.stroke();

    // rosto
    ctx.fillStyle = PELE;
    ctx.beginPath();
    ctx.ellipse(12.0, 9.9, 3.3, 3.0, 0, 0, Math.PI * 2);
    ctx.fill();

    // cabelo claro emoldurando o rosto
    ctx.fillStyle = CABELO;
    ctx.beginPath();
    ctx.moveTo(8.4, 11.4);
    ctx.quadraticCurveTo(8.0, 6.6, 12.0, 6.4);
    ctx.quadraticCurveTo(16.0, 6.6, 15.6, 11.4);
    ctx.quadraticCurveTo(14.6, 8.6, 12.0, 8.5);
    ctx.quadraticCurveTo(9.4, 8.6, 8.4, 11.4);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(8.5, 10.0);
    ctx.quadraticCurveTo(7.2, 13.4, 7.8, 15.6);
    ctx.quadraticCurveTo(9.0, 14.4, 9.3, 11.2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(15.5, 10.0);
    ctx.quadraticCurveTo(16.8, 13.4, 16.2, 15.6);
    ctx.quadraticCurveTo(15.0, 14.4, 14.7, 11.2);
    ctx.closePath();
    ctx.fill();

    // olhos (traço delicado — é uma humana, não um ser mágico)
    ctx.fillStyle = cor('#3a2a52', '#5a1f14');
    ctx.beginPath();
    ctx.ellipse(10.5, 10.2, 0.75, 1.0, 0, 0, Math.PI * 2);
    ctx.ellipse(13.5, 10.2, 0.75, 1.0, 0, 0, Math.PI * 2);
    ctx.fill();

    // ---------- cajado de invocação (mesmo mecanismo de mira) ----------
    ctx.save();
    ctx.translate(12, 16);
    ctx.rotate(ang);
    ctx.translate(DESLOC_CAJADO, 0);

    let wp = window.inventario ? window.inventario.arma : null;
    let armaV = null;
    if (x === window.meuX && y === window.meuY) { 
        if (wp && wp.customVisual) armaV = wp;
    }
    if (typeof window.desenharOrbeExposta === 'function') window.desenharOrbeExposta(ctx, armaV);

    // mão (depois da haste, para parecer que agarra)
    ctx.fillStyle = PELE;
    ctx.strokeStyle = 'rgba(70,45,30,0.5)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.ellipse(0, PEGADA, 1.9, 1.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore(); // fim do cajado
    ctx.restore(); // fim do translate do personagem

    // Barra de Vida (posição idêntica à v1)
    if (typeof window.desenharBarraHp === "function") {
        window.desenharBarraHp(x - 3, y - 8, hp, maxHp);
    }
};

window.enviarAtaqueSummoner = function(ws) {
    if (window.estaMorto) return;
    if (typeof window.tocarSomOrbe === 'function') window.tocarSomOrbe();
    let alvoDetectado = typeof window.obterAlvoNaMira === 'function' ? window.obterAlvoNaMira() : null;
    let anguloDisparo = alvoDetectado ? alvoDetectado.angulo : window.meuAngulo;
    let focoAlvoTipo = null, focoAlvoId = null;
    if (alvoDetectado) {
        if (alvoDetectado.slime) { focoAlvoTipo = 'slime'; focoAlvoId = alvoDetectado.slime.id; }
        else if (alvoDetectado.boss) { focoAlvoTipo = 'boss'; focoAlvoId = alvoDetectado.boss.id; }
    }
    if (ws && ws.readyState === 1) { ws.send(JSON.stringify({ action: 'ataque_summoner', angulo: anguloDisparo, alvoTipo: focoAlvoTipo, alvoId: focoAlvoId })); }
};

window.desenharOrbeExposta = function(ctx, armaVisualCustom) {
    const t = Date.now() / 1000;
    const OURO = '#e5c15c';
    const OURO_ESCURO = '#a8862c';
    
    let cBase = '#5f2fa8';
    let cMeio = '#a86fe0';
    let cPonta = '#d7b8ff';
    let cFio = '#8a7f8e';
    let hasteC2 = '#5f5468';
    let hasteC3 = '#332b3a';
    let tam = 1.0;
    let larg = 1.0;

    if (armaVisualCustom && armaVisualCustom.customVisual) {
        let v = armaVisualCustom.customVisual;
        if (v.cBase) cBase = v.cBase;
        if (v.cMeio) cMeio = v.cMeio;
        if (v.cPonta) cPonta = v.cPonta;
        if (v.cFio) cFio = v.cFio;
        if (v.tamanho) tam = v.tamanho;
        if (v.largura) larg = v.largura;
    }

    ctx.save();
    ctx.scale(larg, tam);

    const gHaste = ctx.createLinearGradient(-1.6, 0, 1.4, 0);
    gHaste.addColorStop(0, cFio);
    gHaste.addColorStop(0.45, hasteC2);
    gHaste.addColorStop(1, hasteC3);
    ctx.fillStyle = gHaste;
    ctx.beginPath();
    ctx.moveTo(-1.3, -12.0);
    ctx.quadraticCurveTo(-1.8, 0.5, -1.2, 12.8);
    ctx.quadraticCurveTo(0, 14.1, 1.2, 12.8);
    ctx.quadraticCurveTo(1.8, 0.5, 1.3, -12.0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(20,12,26,0.75)';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    ctx.fillStyle = OURO;
    ctx.fillRect(-1.8, -2.4, 3.6, 1.3);
    ctx.fillStyle = OURO_ESCURO;
    ctx.fillRect(-1.8, 2.0, 3.6, 1.1);

    // gavinhas douradas
    ctx.strokeStyle = OURO;
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(-1.2, -11.8); ctx.quadraticCurveTo(-4.6, -14.6, -2.8, -17.4);
    ctx.moveTo(1.2, -11.8);  ctx.quadraticCurveTo(4.6, -14.6, 2.8, -17.4);
    ctx.stroke();

    // CRISTAL
    const pulsoCristal = 0.74 + Math.sin(t * 2.8) * 0.26;
    ctx.save();
    ctx.shadowColor = cMeio;
    ctx.shadowBlur = 13 * pulsoCristal;
    const gCristal = ctx.createLinearGradient(0, -21.5, 0, -11.0);
    gCristal.addColorStop(0, cPonta);
    gCristal.addColorStop(0.45, cMeio);
    gCristal.addColorStop(1, cBase);
    ctx.fillStyle = gCristal;
    ctx.beginPath();
    ctx.moveTo(0, -21.8);
    ctx.lineTo(3.6, -16.0);
    ctx.lineTo(0, -10.6);
    ctx.lineTo(-3.6, -16.0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.moveTo(0, -20.8); ctx.lineTo(1.7, -16.0); ctx.lineTo(0, -11.6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(40,0,70,0.30)';
    ctx.beginPath();
    ctx.moveTo(0, -20.8); ctx.lineTo(-1.7, -16.0); ctx.lineTo(0, -11.6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,' + pulsoCristal.toFixed(3) + ')';
    ctx.beginPath();
    ctx.ellipse(0, -16.0, 1.0, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // lascas de cristal orbitando a ponta
    ctx.save();
    ctx.shadowColor = cMeio;
    ctx.shadowBlur = 6;
    for (let i = 0; i < 3; i++) {
        const a = t * 1.5 + i * (Math.PI * 2 / 3);
        const sx = Math.cos(a) * 5.4;
        const sy = -16.0 + Math.sin(a) * 2.4;
        const br = 0.30 + 0.70 * Math.abs(Math.sin(a * 0.5 + t * 1.2));
        ctx.globalAlpha = br;
        ctx.fillStyle = cPonta;
        ctx.beginPath();
        ctx.ellipse(sx, sy, 0.9, 1.3, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();

    ctx.restore();
};
