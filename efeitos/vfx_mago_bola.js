// =====================================================================
// VFX — MAGO «BOLA ELEMENTAL» (REFEITA DO ZERO)
// ---------------------------------------------------------------------
// Mecânica e Visuais completos:
//   • BOLA NORMAL:
//       - Bola gigante (R=30, diâmetro 60px), altamente visível.
//       - Rola fisicamente EM CONTATO DIRETO COM O CHÃO (sombra de contato,
//         poeira de rolagem na base, rotação não-deslizante proporcional
//         ao trajeto: dist / R).
//       - Núcleo energético brilhante cor de barro (terracota / âmbar).
//       - 8 pedrinhas facetadas orbitando em anéis 3D ao redor da esfera.
//       - Iluminação terrosa/âmbar projetada no chão durante o trajeto.
//       - Rastro de pequenas pedras que se soltam da bola maior, quicam
//         e permanecem no chão por ~1s antes de sumir.
//       - Empurra inimigos para trás ao colidir.
//
//   • TRANSFORMAÇÃO EM GELO (ao cruzar a NEVASCA):
//       - Detecta visualmente no frame em que toca a Nevasca (ou via rede).
//       - Troca imediata de aparência: esfera de puro gelo cristalino translúcido.
//       - Cristais pontiagudos de gelo cravados e orbitando a bola.
//       - Partículas e flocos de neve espiralando ao redor.
//       - Rastro congelante (camada de geada no chão).
//       - Pequenas partículas e lascas de gelo ficando para trás.
//       - Ao acertar: explosão de gelo, dezenas de cristais voando, círculo
//         congelante no chão persistente por ~1.5s e EFEITO VISUAL DE
//         CONGELAMENTO NO CORPO DOS INIMIGOS por 2 segundos.
//
//   • TRANSFORMAÇÃO EM FOGO (ao cruzar o METEORO):
//       - Detecta visualmente no frame em que toca o fogo do Meteoro (ou via rede).
//       - Troca imediata de aparência: esfera colossal de magma incandescente.
//       - 8 línguas de fogo espiralando em alta velocidade ao redor.
//       - Chuva contínua de brasas e faíscas incandescentes.
//       - Plumas de fumaça escura subindo da bola.
//       - Rastro incandescente (terra calcinada com rachaduras de lava viva).
//       - Forte iluminação dinâmica alaranjada e dourada no solo.
//       - Ao acertar: grande explosão massiva (raio 130), expansão circular de fogo,
//         chuva de brasas com física parabólica, fumaça volumosa e SCREEN SHAKE.
// =====================================================================

window.vfxListeners = window.vfxListeners || [];
window.vfxMagoBolas = [];
window.vfxMagoBolasHits = [];
window.vfxMagoBolasPedrasRastro = [];
window.vfxMagoBolasGeloRastro = [];
window.vfxMagoBolasFogoRastro = [];
window.vfxMagoCirculosGelo = [];
window.vfxMagoInimigosCongelados = [];

const PI2 = Math.PI * 2;
const RAIO_BOLA = 30; // Bola gigante, ultra visível (~60px diâmetro)

// ---------- GERADOR DE PEDRINHAS ORBITAIS (BOLA DE BARRO) ----------
function criarOrbitaisBarro() {
    const list = [];
    for (let i = 0; i < 8; i++) {
        list.push({
            raioX: RAIO_BOLA * (1.25 + (i % 3) * 0.18),
            raioY: RAIO_BOLA * (0.65 + (i % 2) * 0.22),
            tilt: (i * 0.42) - 0.6,
            speed: (i % 2 === 0 ? 1 : -1) * (0.0028 + (i % 4) * 0.0006),
            offset: i * (PI2 / 8),
            size: 2.8 + (i % 3) * 1.4,
            cor: i % 2 === 0 ? '#8d5b3d' : '#6f4528',
            altCor: '#b8794f'
        });
    }
    return list;
}

// ---------- CRISTAIS AO REDOR DA BOLA DE GELO ----------
function criarCristaisGelo() {
    const list = [];
    for (let i = 0; i < 6; i++) {
        list.push({
            angOffset: i * (PI2 / 6),
            distMult: 1.18 + (i % 2) * 0.16,
            comp: 9 + (i % 3) * 4,
            larg: 4 + (i % 2) * 1.5,
            rotSpeed: 0.0018 * (i % 2 === 0 ? 1 : -1)
        });
    }
    return list;
}

// ---------- LÍNGUAS DE FOGO DA BOLA DE FOGO ----------
function criarChamasFogo() {
    const list = [];
    for (let i = 0; i < 8; i++) {
        list.push({
            angOffset: i * (PI2 / 8),
            distMult: 0.95 + (i % 2) * 0.18,
            tam: 14 + (i % 3) * 5,
            larg: 6 + (i % 2) * 2,
            rotSpeed: (i % 2 === 0 ? 1 : -1) * 0.003
        });
    }
    return list;
}

// =====================================================================
// DISPATCHER DE EVENTOS DE REDE
// =====================================================================
window.vfxListeners.push(function (dados) {
    const now = Date.now();

    // 1) LANÇAMENTO DA BOLA ELEMENTAL
    if (dados.type === 'action_mago_bola_elemental') {
        if (dados.ownerId === window.meuId) {
            if (typeof window.tocarSonoro === 'function') window.tocarSonoro('mago_skill4');
        } else if (typeof window.tocarSonoroProximidade === 'function') {
            window.tocarSonoroProximidade('mago_skill4', dados.x, dados.y);
        }
        const speed = dados.speed || 12;
        const dist = dados.dist || 400; // Alcance total (400px alinhado à mira e ao servidor)
        const ang = Math.atan2(dados.targetY - dados.y, dados.targetX - dados.x);
        const destX = dados.x + Math.cos(ang) * dist;
        const destY = dados.y + Math.sin(ang) * dist;
        const duration = (dist / speed) * 50;

        window.vfxMagoBolas.push({
            id: dados.id,
            ownerId: dados.ownerId,
            x: dados.x,
            y: dados.y,
            startX: dados.x,
            startY: dados.y,
            destX: destX,
            destY: destY,
            targetX: dados.targetX,
            targetY: dados.targetY,
            ang: ang,
            speed: speed,
            distTotal: dist,
            distPercorrida: 0,
            ballType: 'normal',
            startTime: now,
            duration: duration,
            orbitaisBarro: criarOrbitaisBarro(),
            cristaisGelo: criarCristaisGelo(),
            chamasFogo: criarChamasFogo(),
            ps: [],
            dustTimer: 0,
            rastroTimer: 0
        });
    }

    // 2) TRANSFORMAÇÃO AUTORITATIVA DO SERVIDOR
    else if (dados.type === 'action_mago_bola_transform') {
        const bola = window.vfxMagoBolas.find(b => b.id === dados.id);
        if (!bola) return;
        aplicarTransformacaoBola(bola, dados.newType);
    }

    // 3) HIT / EXPLOSÃO DA BOLA
    else if (dados.type === 'action_mago_bola_hit') {
        if (typeof window.pararSomMagoSkill4 === 'function') {
            window.pararSomMagoSkill4();
        }
        if (dados.ownerId === window.meuId) {
            if (typeof window.tocarSonoro === 'function') window.tocarSonoro('mago_skill4_impacto');
        } else if (typeof window.tocarSonoroProximidade === 'function') {
            window.tocarSonoroProximidade('mago_skill4_impacto', dados.x, dados.y);
        } else if (typeof window.tocarSonoro === 'function') {
            window.tocarSonoro('mago_skill4_impacto');
        }
        const bType = dados.ballType || 'normal';
        const raio = dados.radius || (bType === 'fogo' ? 130 : (bType === 'gelo' ? 85 : 60));

        // Remove a bola que colidiu para cessar o rolamento
        if (dados.id) {
            const idx = window.vfxMagoBolas.findIndex(b => b.id === dados.id);
            if (idx !== -1) window.vfxMagoBolas.splice(idx, 1);
        } else {
            const idx = window.vfxMagoBolas.findIndex(b => Math.hypot(b.x - dados.x, b.y - dados.y) < 70);
            if (idx !== -1) window.vfxMagoBolas.splice(idx, 1);
        }

        window.vfxMagoBolasHits.push({
            x: dados.x,
            y: dados.y,
            ballType: bType,
            radius: raio,
            startTime: now,
            duration: bType === 'fogo' ? 1000 : (bType === 'gelo' ? 1200 : 550),
            ps: [],
            debris: [],
            smoke: []
        });

        if (bType === 'fogo') {
            // SCREEN SHAKE vigoroso no impacto de fogo
            window.tremorTela = Math.max(window.tremorTela || 0, 38);
        } else if (bType === 'gelo') {
            // Círculo congelante no chão persistente por ~1.5s
            window.vfxMagoCirculosGelo.push({
                x: dados.x,
                y: dados.y,
                raioMax: raio,
                startTime: now,
                duration: 1600
            });

            // Aplica congelamento visual nos inimigos dentro da área
            aplicarCongelamentoVisualEmArea(dados.x, dados.y, raio);
        }
    }

    // 4) REAÇÃO CONGELANTE DIRETA
    else if (dados.type === 'reacao_congelante') {
        aplicarCongelamentoVisualPonto(dados.x, dados.y);
    }
});

// ---------- HELPER: TRANSFORMAÇÃO DA BOLA ----------
// Mantém exatamente a mesma velocidade, tempo e trajeto constante da bola original
function aplicarTransformacaoBola(bola, novoTipo) {
    if (!bola || bola.ballType === novoTipo) return;
    bola.ballType = novoTipo;

    // Burst visual da transformação
    const n = novoTipo === 'fogo' ? 32 : 28;
    for (let i = 0; i < n; i++) {
        const a = Math.random() * PI2;
        const v = 2 + Math.random() * 4.5;
        bola.ps.push({
            x: bola.x,
            y: bola.y,
            vx: Math.cos(a) * v,
            vy: Math.sin(a) * v - 1,
            life: 0,
            max: 26 + Math.random() * 24,
            size: novoTipo === 'fogo' ? (3 + Math.random() * 4) : (2 + Math.random() * 3.5),
            tipo: novoTipo === 'fogo' ? 'burst_fogo' : 'burst_gelo'
        });
    }

    if (novoTipo === 'fogo') {
        window.tremorTela = Math.max(window.tremorTela || 0, 16);
    }
}

// ---------- HELPER: APLICAR CONGELAMENTO VISUAL NOS INIMIGOS ----------
function registrarInimigoCongelado(alvoId, x, y, raioCorpo) {
    const now = Date.now();
    // Evita duplicar se já estiver congelado
    const existente = window.vfxMagoInimigosCongelados.find(c => c.alvoId === alvoId);
    if (existente) {
        existente.startTime = now;
        existente.duration = 2000;
        return;
    }

    // Cristais decorativos no corpo do mob
    const espinhos = [];
    for (let i = 0; i < 6; i++) {
        const ang = (i * (PI2 / 6)) + (Math.random() - 0.5) * 0.3;
        espinhos.push({
            ang: ang,
            dist: (raioCorpo || 16) * (0.8 + Math.random() * 0.4),
            altura: 16 + Math.random() * 12,
            largura: 5 + Math.random() * 3,
            inclinacao: (Math.random() - 0.5) * 0.4
        });
    }

    window.vfxMagoInimigosCongelados.push({
        alvoId: alvoId,
        x: x,
        y: y,
        raioCorpo: raioCorpo || 16,
        startTime: now,
        duration: 2000, // 2 segundos completos
        espinhos: espinhos
    });
}

function aplicarCongelamentoVisualEmArea(cx, cy, raio) {
    // 1) Slimes
    if (Array.isArray(window.listaSlimes)) {
        for (let s of window.listaSlimes) {
            if (s && s.hp > 0 && Math.hypot(s.x - cx, s.y - cy) <= raio) {
                registrarInimigoCongelado(s.id, s.x, s.y, 16);
            }
        }
    }
    // 2) Bosses
    let bList = window.listaBosses || (typeof listaBosses !== 'undefined' ? listaBosses : null);
    if (Array.isArray(bList)) {
        for (let b of bList) {
            if (b && b.hp > 0 && Math.hypot(b.x - cx, b.y - cy) <= raio) {
                registrarInimigoCongelado(b.id, b.x, b.y, 32);
            }
        }
    }
}

function aplicarCongelamentoVisualPonto(px, py) {
    // Busca inimigo mais próximo deste ponto
    let alvo = null;
    let menor = 40;
    if (Array.isArray(window.listaSlimes)) {
        for (let s of window.listaSlimes) {
            if (s && s.hp > 0) {
                let d = Math.hypot(s.x - px, s.y - py);
                if (d < menor) { menor = d; alvo = s; }
            }
        }
    }
    if (alvo) {
        registrarInimigoCongelado(alvo.id, alvo.x, alvo.y, 16);
    } else {
        registrarInimigoCongelado('pt_' + Math.random(), px, py, 14);
    }
}

// =====================================================================
// RENDERIZAÇÃO: RASTROS NO CHÃO (PEDRAS, GELO E LAVA)
// =====================================================================
function atualizarEDesenharRastrosChao(ctx, now) {
    ctx.save();

    // 1) Rastro de pedras caídas da bola de barro
    for (let i = window.vfxMagoBolasPedrasRastro.length - 1; i >= 0; i--) {
        const p = window.vfxMagoBolasPedrasRastro[i];
        p.life++;
        if (p.life >= p.maxLife) {
            window.vfxMagoBolasPedrasRastro.splice(i, 1);
            continue;
        }

        // Físico: quica levemente até fixar no chão
        if (p.y < p.groundY) {
            p.vy += 0.22;
            p.x += p.vx;
            p.y += p.vy;
            p.rot += p.vrot;
            if (p.y >= p.groundY) {
                p.y = p.groundY;
                p.vx *= 0.3;
                p.vy = -p.vy * 0.25;
            }
        }

        const prog = 1 - (p.life / p.maxLife);
        const alpha = Math.min(1, prog / 0.25);

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = alpha;

        // Sombrinha sob a pedrinha
        ctx.fillStyle = 'rgba(10, 5, 2, 0.35)';
        ctx.beginPath();
        ctx.ellipse(0, p.size * 0.45, p.size * 1.1, p.size * 0.4, 0, 0, PI2);
        ctx.fill();

        // Pedrinha facetada
        ctx.fillStyle = p.cor;
        ctx.beginPath();
        ctx.moveTo(-p.size, -p.size * 0.4);
        ctx.lineTo(0, -p.size * 0.9);
        ctx.lineTo(p.size * 0.9, -p.size * 0.3);
        ctx.lineTo(p.size * 0.7, p.size * 0.7);
        ctx.lineTo(-p.size * 0.6, p.size * 0.6);
        ctx.closePath();
        ctx.fill();

        // Brilho na aresta da pedrinha
        ctx.strokeStyle = p.altCor;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
    }

    // 2) Rastro congelante (camada de geada no chão)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = window.vfxMagoBolasGeloRastro.length - 1; i >= 0; i--) {
        const g = window.vfxMagoBolasGeloRastro[i];
        g.life++;
        if (g.life >= g.maxLife) {
            window.vfxMagoBolasGeloRastro.splice(i, 1);
            continue;
        }

        const prog = 1 - (g.life / g.maxLife);
        ctx.save();
        ctx.translate(g.x, g.y);
        ctx.rotate(g.rot);

        // Mancha vitrificada de gelo
        const rad = ctx.createRadialGradient(0, 0, 2, 0, 0, g.size);
        rad.addColorStop(0, `rgba(220, 250, 255, ${0.40 * prog})`);
        rad.addColorStop(0.55, `rgba(0, 229, 255, ${0.22 * prog})`);
        rad.addColorStop(1, 'rgba(0, 150, 255, 0)');
        ctx.fillStyle = rad;
        ctx.beginPath();
        ctx.ellipse(0, 0, g.size, g.size * 0.48, 0, 0, PI2);
        ctx.fill();

        // Linhas de gelo trincado
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.55 * prog})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-g.size * 0.6, 0);
        ctx.lineTo(g.size * 0.6, 0);
        ctx.moveTo(0, -g.size * 0.3);
        ctx.lineTo(g.size * 0.3, g.size * 0.25);
        ctx.stroke();

        ctx.restore();
    }
    ctx.restore();

    // 3) Rastro incandescente (terra calcinada e veios de lava)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = window.vfxMagoBolasFogoRastro.length - 1; i >= 0; i--) {
        const f = window.vfxMagoBolasFogoRastro[i];
        f.life++;
        if (f.life >= f.maxLife) {
            window.vfxMagoBolasFogoRastro.splice(i, 1);
            continue;
        }

        const prog = 1 - (f.life / f.maxLife);
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.rot);

        // Mancha de lava quente
        const radF = ctx.createRadialGradient(0, 0, 2, 0, 0, f.size);
        radF.addColorStop(0, `rgba(255, 240, 150, ${0.60 * prog})`);
        radF.addColorStop(0.45, `rgba(255, 90, 0, ${0.35 * prog})`);
        radF.addColorStop(1, 'rgba(150, 20, 0, 0)');
        ctx.fillStyle = radF;
        ctx.beginPath();
        ctx.ellipse(0, 0, f.size, f.size * 0.48, 0, 0, PI2);
        ctx.fill();

        // Rachaduras de magma no solo
        ctx.strokeStyle = `rgba(255, 250, 180, ${0.75 * prog})`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-f.size * 0.6, -2);
        ctx.lineTo(-f.size * 0.1, 1);
        ctx.lineTo(f.size * 0.5, -1);
        ctx.stroke();

        ctx.restore();
    }
    ctx.restore();

    ctx.restore();
}

// =====================================================================
// RENDERIZAÇÃO: CÍRCULOS CONGELANTES NO CHÃO (HIT GELO)
// =====================================================================
function atualizarEDesenharCirculosGelo(ctx, now) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (let i = window.vfxMagoCirculosGelo.length - 1; i >= 0; i--) {
        const c = window.vfxMagoCirculosGelo[i];
        const elapsed = now - c.startTime;
        if (elapsed >= c.duration) {
            window.vfxMagoCirculosGelo.splice(i, 1);
            continue;
        }

        const t = elapsed / c.duration;
        const expande = Math.min(1, t * 2.5); // Expande rápido
        const fade = t > 0.65 ? 1 - (t - 0.65) / 0.35 : 1;
        const raioAtual = c.raioMax * expande;

        // Grande placa de gelo no chão
        const frost = ctx.createRadialGradient(c.x, c.y, 4, c.x, c.y, raioAtual);
        frost.addColorStop(0, `rgba(235, 255, 255, ${0.45 * fade})`);
        frost.addColorStop(0.65, `rgba(0, 229, 255, ${0.28 * fade})`);
        frost.addColorStop(0.92, `rgba(0, 120, 255, ${0.15 * fade})`);
        frost.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = frost;
        ctx.beginPath();
        ctx.ellipse(c.x, c.y + 4, raioAtual, raioAtual * 0.45, 0, 0, PI2);
        ctx.fill();

        // Borda cristalizada
        ctx.strokeStyle = `rgba(200, 250, 255, ${0.60 * fade})`;
        ctx.lineWidth = 2.5 * fade;
        ctx.beginPath();
        ctx.ellipse(c.x, c.y + 4, raioAtual, raioAtual * 0.45, 0, 0, PI2);
        ctx.stroke();

        // Fissuras radiantes de gelo trincado
        for (let k = 0; k < 8; k++) {
            const a = k * (PI2 / 8) + 0.15;
            const rLinha = raioAtual * (0.4 + (k % 2) * 0.5);
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 * fade})`;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(c.x, c.y + 4);
            ctx.lineTo(c.x + Math.cos(a) * rLinha, c.y + 4 + Math.sin(a) * rLinha * 0.45);
            ctx.stroke();
        }
    }

    ctx.restore();
}

// =====================================================================
// RENDERIZAÇÃO: EFEITO VISUAL DE CONGELAMENTO NO INIMIGO (2s)
// =====================================================================
function atualizarEDesenharInimigosCongelados(ctx, now) {
    if (!window.vfxMagoInimigosCongelados.length) return;

    for (let i = window.vfxMagoInimigosCongelados.length - 1; i >= 0; i--) {
        const item = window.vfxMagoInimigosCongelados[i];
        const elapsed = now - item.startTime;
        if (elapsed >= item.duration) {
            window.vfxMagoInimigosCongelados.splice(i, 1);
            continue;
        }

        // Atualiza posição do mob caso ainda esteja vivo na lista
        if (Array.isArray(window.listaSlimes)) {
            const s = window.listaSlimes.find(sl => sl && sl.id === item.alvoId);
            if (s && s.hp > 0) { item.x = s.x; item.y = s.y; }
        }
        let bList = window.listaBosses || (typeof listaBosses !== 'undefined' ? listaBosses : null);
        if (Array.isArray(bList)) {
            const b = bList.find(bs => bs && bs.id === item.alvoId);
            if (b && b.hp > 0) { item.x = b.x; item.y = b.y; }
        }

        const t = elapsed / item.duration;
        const fade = t > 0.8 ? 1 - (t - 0.8) / 0.2 : 1;
        const cx = item.x, cy = item.y;
        const r = item.raioCorpo || 16;

        ctx.save();

        // 1) Base congelada sob os pés do mob
        ctx.fillStyle = `rgba(180, 245, 255, ${0.40 * fade})`;
        ctx.beginPath();
        ctx.ellipse(cx, cy + r * 0.8, r * 1.35, r * 0.5, 0, 0, PI2);
        ctx.fill();
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.65 * fade})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 2) Pilares e cristais pontiagudos cercando o mob
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let sp of item.espinhos) {
            const px = cx + Math.cos(sp.ang) * sp.dist;
            const py = cy + Math.sin(sp.ang) * sp.dist * 0.5;

            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(sp.inclinacao);

            // Gradiente do cristal
            const gC = ctx.createLinearGradient(0, -sp.altura, 0, 0);
            gC.addColorStop(0, `rgba(255, 255, 255, ${0.95 * fade})`);
            gC.addColorStop(0.5, `rgba(0, 229, 255, ${0.75 * fade})`);
            gC.addColorStop(1, `rgba(2, 136, 209, ${0.45 * fade})`);
            ctx.fillStyle = gC;

            // Prisma pontiagudo
            ctx.beginPath();
            ctx.moveTo(0, -sp.altura);
            ctx.lineTo(sp.largura * 0.5, 0);
            ctx.lineTo(-sp.largura * 0.5, 0);
            ctx.closePath();
            ctx.fill();

            // Aresta branca central
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.85 * fade})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, -sp.altura);
            ctx.lineTo(0, 0);
            ctx.stroke();

            ctx.restore();
        }
        ctx.restore();

        // 3) Envoltório de gelo translúcido sobre o corpo do mob
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const auraGelo = ctx.createRadialGradient(cx, cy - r * 0.3, 2, cx, cy - r * 0.3, r * 1.4);
        auraGelo.addColorStop(0, `rgba(255, 255, 255, ${0.40 * fade})`);
        auraGelo.addColorStop(0.5, `rgba(0, 229, 255, ${0.30 * fade})`);
        auraGelo.addColorStop(1, 'rgba(0, 100, 255, 0)');
        ctx.fillStyle = auraGelo;
        ctx.beginPath();
        ctx.arc(cx, cy - r * 0.3, r * 1.35, 0, PI2);
        ctx.fill();

        // Névoa fria subindo
        const tNevoa = (now * 0.003) % PI2;
        ctx.fillStyle = `rgba(230, 250, 255, ${0.25 * fade})`;
        ctx.beginPath();
        ctx.arc(cx + Math.sin(tNevoa) * 6, cy - r - 6, 4 + Math.cos(tNevoa) * 2, 0, PI2);
        ctx.fill();

        ctx.restore();

        ctx.restore();
    }
}

// =====================================================================
// RENDERIZAÇÃO: BOLA ELEMENTAL (FÍSICA DE ROLAR NO CHÃO)
// =====================================================================
function atualizarEDesenharBola(ctx, bola, now) {
    const R = RAIO_BOLA;
    const ep = now - bola.startTime;

    // Atualiza posição ao longo do alcance total (400px)
    if (ep < bola.duration) {
        const t = Math.min(Math.max(ep / bola.duration, 0), 1);
        bola.x = bola.startX + (bola.destX - bola.startX) * t;
        bola.y = bola.startY + (bola.destY - bola.startY) * t;
        bola.distPercorrida = bola.distTotal * t;
    } else {
        bola.x = bola.destX;
        bola.y = bola.destY;
        bola.distPercorrida = bola.distTotal;
    }

    // -----------------------------------------------------------------
    // DETECÇÃO VISUAL INSTANTÂNEA DE TRANSFORMAÇÃO (CROSS-CHECK NO CLIENT)
    // -----------------------------------------------------------------
    if (bola.ballType === 'normal') {
        // A) Cruzou a área da NEVASCA?
        if (Array.isArray(window.nevascasAtivas)) {
            for (let n of window.nevascasAtivas) {
                if (n && Math.hypot(n.x - bola.x, n.y - bola.y) <= (n.radius || 115)) {
                    aplicarTransformacaoBola(bola, 'gelo');
                    break;
                }
            }
        }
        // B) Cruzou a área de FOGO deixada pelo Meteoro?
        if (bola.ballType === 'normal' && Array.isArray(window.chaoEmChamas)) {
            for (let f of window.chaoEmChamas) {
                if (f && Math.hypot(f.x - bola.x, f.y - bola.y) <= 100) {
                    aplicarTransformacaoBola(bola, 'fogo');
                    break;
                }
            }
        }
    }

    // -----------------------------------------------------------------
    // 1) SOMBRA DE CONTATO NO CHÃO (FÍSICA: BOLA ROLANDO AO CHÃO)
    // -----------------------------------------------------------------
    ctx.save();
    const groundY = bola.y + R * 0.72;

    // Sombra de contato profunda
    const sombraGrad = ctx.createRadialGradient(bola.x, groundY, 2, bola.x, groundY, R * 1.25);
    sombraGrad.addColorStop(0, 'rgba(12, 6, 2, 0.58)');
    sombraGrad.addColorStop(0.55, 'rgba(12, 6, 2, 0.28)');
    sombraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = sombraGrad;
    ctx.beginPath();
    ctx.ellipse(bola.x, groundY, R * 1.25, R * 0.42, 0, 0, PI2);
    ctx.fill();
    ctx.restore();

    // -----------------------------------------------------------------
    // 2) ILUMINAÇÃO NO CHÃO DURANTE O TRAJETO
    // -----------------------------------------------------------------
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const luzChao = ctx.createRadialGradient(bola.x, groundY, 4, bola.x, groundY, R * 2.8);

    if (bola.ballType === 'fogo') {
        // Forte iluminação alaranjada / dourada
        luzChao.addColorStop(0, 'rgba(255, 200, 100, 0.45)');
        luzChao.addColorStop(0.4, 'rgba(255, 90, 10, 0.32)');
        luzChao.addColorStop(0.8, 'rgba(200, 30, 0, 0.12)');
        luzChao.addColorStop(1, 'rgba(0, 0, 0, 0)');
    } else if (bola.ballType === 'gelo') {
        // Iluminação ciano / ártica
        luzChao.addColorStop(0, 'rgba(220, 255, 255, 0.40)');
        luzChao.addColorStop(0.45, 'rgba(0, 229, 255, 0.26)');
        luzChao.addColorStop(0.8, 'rgba(0, 120, 255, 0.10)');
        luzChao.addColorStop(1, 'rgba(0, 0, 0, 0)');
    } else {
        // Iluminação terrosa / âmbar cor de barro
        luzChao.addColorStop(0, 'rgba(255, 180, 100, 0.32)');
        luzChao.addColorStop(0.45, 'rgba(210, 105, 30, 0.20)');
        luzChao.addColorStop(0.8, 'rgba(140, 60, 15, 0.08)');
        luzChao.addColorStop(1, 'rgba(0, 0, 0, 0)');
    }
    ctx.fillStyle = luzChao;
    ctx.beginPath();
    ctx.ellipse(bola.x, groundY, R * 2.8, R * 1.35, 0, 0, PI2);
    ctx.fill();
    ctx.restore();

    // -----------------------------------------------------------------
    // 3) GERAÇÃO CONTÍNUA DE RASTROS E PARTÍCULAS NO CHÃO
    // -----------------------------------------------------------------
    bola.rastroTimer = (bola.rastroTimer || 0) + 1;
    bola.dustTimer = (bola.dustTimer || 0) + 1;

    // Puffs de poeira de rolagem na base de contato com o chão
    if (bola.dustTimer >= 3) {
        bola.dustTimer = 0;
        const pX = bola.x - Math.cos(bola.ang) * (R * 0.7) + (Math.random() - 0.5) * 8;
        const pY = groundY + (Math.random() - 0.5) * 4;

        if (bola.ballType === 'normal') {
            bola.ps.push({
                x: pX, y: pY,
                vx: -Math.cos(bola.ang) * 0.8 + (Math.random() - 0.5) * 0.5,
                vy: -0.4 - Math.random() * 0.4,
                life: 0, max: 20 + Math.random() * 12,
                size: 3 + Math.random() * 4,
                tipo: 'poeira_barro'
            });
        }
    }

    // Rastro caindo no chão
    if (bola.rastroTimer >= 4) {
        bola.rastroTimer = 0;

        if (bola.ballType === 'normal') {
            // RASTRO DE PEDRAS PEQUENAS CAINDO DA BOLA MAIOR
            window.vfxMagoBolasPedrasRastro.push({
                x: bola.x - Math.cos(bola.ang) * (R * 0.4) + (Math.random() - 0.5) * 12,
                y: bola.y + (Math.random() - 0.5) * 10,
                groundY: groundY + (Math.random() - 0.5) * 6,
                vx: -Math.cos(bola.ang) * (1.2 + Math.random() * 0.8) + (Math.random() - 0.5) * 0.8,
                vy: -0.5 - Math.random() * 0.8,
                life: 0,
                maxLife: 60 + Math.random() * 25, // Fica ~1s no chão
                size: 2.5 + Math.random() * 3.5,
                rot: Math.random() * PI2,
                vrot: (Math.random() - 0.5) * 0.2,
                cor: Math.random() > 0.5 ? '#8d5b3d' : '#6f4528',
                altCor: '#d28b57'
            });
        } else if (bola.ballType === 'gelo') {
            // Rastro congelante (geada vitrificada)
            window.vfxMagoBolasGeloRastro.push({
                x: bola.x + (Math.random() - 0.5) * 8,
                y: groundY + (Math.random() - 0.5) * 5,
                size: 16 + Math.random() * 10,
                rot: Math.random() * PI2,
                life: 0,
                maxLife: 55 + Math.random() * 20
            });
            // Lascas pequenas de gelo ficando para trás
            bola.ps.push({
                x: bola.x - Math.cos(bola.ang) * R * 0.6 + (Math.random() - 0.5) * 10,
                y: bola.y + (Math.random() - 0.5) * 10,
                vx: -Math.cos(bola.ang) * 0.8 + (Math.random() - 0.5) * 0.6,
                vy: 0.5 + Math.random() * 0.5,
                life: 0, max: 24 + Math.random() * 14,
                size: 2 + Math.random() * 2.8,
                tipo: 'lasca_gelo'
            });
        } else if (bola.ballType === 'fogo') {
            // Rastro incandescente (terra calcinada / lava)
            window.vfxMagoBolasFogoRastro.push({
                x: bola.x + (Math.random() - 0.5) * 8,
                y: groundY + (Math.random() - 0.5) * 5,
                size: 18 + Math.random() * 12,
                rot: Math.random() * PI2,
                life: 0,
                maxLife: 60 + Math.random() * 20
            });
            // Brasas voando
            for (let b = 0; b < 2; b++) {
                bola.ps.push({
                    x: bola.x - Math.cos(bola.ang) * R * 0.5 + (Math.random() - 0.5) * 10,
                    y: bola.y - 4 + (Math.random() - 0.5) * 10,
                    vx: -Math.cos(bola.ang) * (1 + Math.random() * 1.5) + (Math.random() - 0.5) * 0.8,
                    vy: -1.2 - Math.random() * 1.4,
                    life: 0, max: 22 + Math.random() * 16,
                    size: 2 + Math.random() * 2.5,
                    tipo: 'brasa'
                });
            }
            // Fumaça subindo
            if (Math.random() > 0.4) {
                bola.ps.push({
                    x: bola.x + (Math.random() - 0.5) * 14,
                    y: bola.y - R * 0.6,
                    vx: (Math.random() - 0.5) * 0.5,
                    vy: -0.9 - Math.random() * 0.6,
                    life: 0, max: 35 + Math.random() * 20,
                    size: 6 + Math.random() * 6,
                    tipo: 'fumaca'
                });
            }
        }
    }

    // -----------------------------------------------------------------
    // 4) DESENHO DAS PARTÍCULAS EM SUSPENSÃO DA PRÓPRIA BOLA
    // -----------------------------------------------------------------
    ctx.save();
    for (let i = bola.ps.length - 1; i >= 0; i--) {
        const p = bola.ps[i];
        p.life++;
        if (p.life >= p.max) { bola.ps.splice(i, 1); continue; }

        p.x += p.vx; p.y += p.vy;
        const k = 1 - (p.life / p.max);

        if (p.tipo === 'poeira_barro') {
            ctx.fillStyle = `rgba(160, 115, 75, ${0.35 * k})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * (0.8 + (1 - k) * 0.5), 0, PI2);
            ctx.fill();
        } else if (p.tipo === 'lasca_gelo') {
            ctx.fillStyle = `rgba(220, 250, 255, ${0.85 * k})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * k, 0, PI2);
            ctx.fill();
        } else if (p.tipo === 'brasa') {
            ctx.fillStyle = `rgba(255, ${Math.round(140 + 100 * k)}, 40, ${0.9 * k})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * (0.6 + k * 0.6), 0, PI2);
            ctx.fill();
        } else if (p.tipo === 'fumaca') {
            p.size += 0.12;
            ctx.fillStyle = `rgba(50, 45, 45, ${0.28 * k})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, PI2);
            ctx.fill();
        } else if (p.tipo === 'burst_fogo') {
            ctx.fillStyle = `rgba(255, ${Math.round(120 + 120 * k)}, 30, ${0.85 * k})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * k, 0, PI2);
            ctx.fill();
        } else if (p.tipo === 'burst_gelo') {
            ctx.fillStyle = `rgba(200, 250, 255, ${0.9 * k})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * k, 0, PI2);
            ctx.fill();
        }
    }
    ctx.restore();

    // -----------------------------------------------------------------
    // 5) CORPO DA ESFERA GIGANTE (FÍSICA DE ROTAÇÃO NO EIXO DE DESLOCAMENTO)
    // -----------------------------------------------------------------
    ctx.save();
    ctx.translate(bola.x, bola.y);

    // Rotação não-deslizante de rolamento: dist / R
    const rotRolamento = (bola.distPercorrida / R);

    // ---------------------- CORPO: BOLA DE BARRO ----------------------
    if (bola.ballType === 'normal') {
        // Aura externa suave cor de barro
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const auraBarro = ctx.createRadialGradient(0, 0, R * 0.4, 0, 0, R * 1.7);
        auraBarro.addColorStop(0, 'rgba(230, 120, 40, 0.22)');
        auraBarro.addColorStop(0.6, 'rgba(180, 80, 20, 0.10)');
        auraBarro.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = auraBarro;
        ctx.beginPath(); ctx.arc(0, 0, R * 1.7, 0, PI2); ctx.fill();
        ctx.restore();

        // Esfera 3D base de barro/terracota
        const gBarro = ctx.createRadialGradient(-R * 0.32, -R * 0.34, R * 0.12, 0, 0, R);
        gBarro.addColorStop(0, '#f4a261'); // Highlight barro claro
        gBarro.addColorStop(0.35, '#e76f51'); // Terracota vibrante
        gBarro.addColorStop(0.7, '#a0522d'); // Barro queimado
        gBarro.addColorStop(0.95, '#5c2c16'); // Sombra de rocha
        gBarro.addColorStop(1, '#331508'); // Borda de terra
        ctx.fillStyle = gBarro;
        ctx.beginPath(); ctx.arc(0, 0, R, 0, PI2); ctx.fill();

        // Textura rolante: meridianos e fissuras geológicas girando na direção do movimento
        ctx.save();
        ctx.rotate(bola.ang);
        ctx.beginPath(); ctx.arc(0, 0, R, 0, PI2); ctx.clip();

        const passoRolo = R * 0.52;
        const desloc = (rotRolamento * R) % (passoRolo * 4);
        ctx.lineWidth = 2.5;

        for (let k = -2; k < 6; k++) {
            const cx = k * passoRolo - desloc;
            if (Math.abs(cx) > R) continue;
            const halfH = Math.sqrt(Math.max(0, R * R - cx * cx));

            // Fissura de rocha
            ctx.strokeStyle = 'rgba(70, 30, 12, 0.65)';
            ctx.beginPath();
            ctx.ellipse(cx, 0, 3, halfH, 0, 0, PI2);
            ctx.stroke();

            // Veio luminoso cor de barro na fissura
            ctx.strokeStyle = 'rgba(255, 190, 110, 0.55)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.ellipse(cx + 1, 0, 1.5, halfH * 0.85, 0, 0, PI2);
            ctx.stroke();
        }
        ctx.restore();

        // NÚCLEO ENERGÉTICO BRILHANTE COR DE BARRO (TERRACOTA/ÂMBAR)
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const pulseNucleo = Math.sin(now * 0.008) * 0.15 + 0.85;
        const gNuc = ctx.createRadialGradient(0, 0, 1, 0, 0, R * 0.62);
        gNuc.addColorStop(0, 'rgba(255, 240, 210, 0.95)'); // Centro brilhante
        gNuc.addColorStop(0.35, `rgba(244, 162, 97, ${0.75 * pulseNucleo})`); // Luz de barro
        gNuc.addColorStop(0.7, `rgba(230, 111, 81, ${0.40 * pulseNucleo})`); // Terracota
        gNuc.addColorStop(1, 'rgba(160, 82, 45, 0)');
        ctx.fillStyle = gNuc;
        ctx.beginPath(); ctx.arc(0, 0, R * 0.62, 0, PI2); ctx.fill();
        ctx.restore();

        // PARTÍCULAS ORBITANDO COMO SE FOSSE PEDRINHAS (8 pedrinhas 3D)
        for (let orb of bola.orbitaisBarro) {
            const angOrb = (now * orb.speed) + orb.offset;
            const rawX = Math.cos(angOrb) * orb.raioX;
            const rawY = Math.sin(angOrb) * orb.raioY;

            // Rotação de inclinação 3D
            const pX = rawX * Math.cos(orb.tilt) - rawY * Math.sin(orb.tilt);
            const pY = rawX * Math.sin(orb.tilt) + rawY * Math.cos(orb.tilt);

            ctx.save();
            ctx.translate(pX, pY);
            ctx.rotate(angOrb + orb.tilt);

            // Sombra da pedrinha
            ctx.fillStyle = 'rgba(20, 10, 5, 0.5)';
            ctx.beginPath();
            ctx.ellipse(0, orb.size * 0.35, orb.size * 1.1, orb.size * 0.45, 0, 0, PI2);
            ctx.fill();

            // Pedrinha facetada em 3D
            ctx.fillStyle = orb.cor;
            ctx.beginPath();
            ctx.moveTo(-orb.size, -orb.size * 0.4);
            ctx.lineTo(0, -orb.size * 0.9);
            ctx.lineTo(orb.size * 0.85, -orb.size * 0.3);
            ctx.lineTo(orb.size * 0.6, orb.size * 0.7);
            ctx.lineTo(-orb.size * 0.7, orb.size * 0.6);
            ctx.closePath();
            ctx.fill();

            // Destaque luminoso cor de barro na aresta
            ctx.strokeStyle = orb.altCor;
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.restore();
        }
    }

    // ---------------------- CORPO: BOLA DE GELO ----------------------
    else if (bola.ballType === 'gelo') {
        // Aura ártica
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const auraGelo = ctx.createRadialGradient(0, 0, R * 0.4, 0, 0, R * 1.8);
        auraGelo.addColorStop(0, 'rgba(220, 255, 255, 0.35)');
        auraGelo.addColorStop(0.55, 'rgba(0, 229, 255, 0.20)');
        auraGelo.addColorStop(1, 'rgba(0, 100, 255, 0)');
        ctx.fillStyle = auraGelo;
        ctx.beginPath(); ctx.arc(0, 0, R * 1.8, 0, PI2); ctx.fill();
        ctx.restore();

        // Esfera 3D de gelo puro cristalino
        const gGelo = ctx.createRadialGradient(-R * 0.32, -R * 0.34, R * 0.12, 0, 0, R);
        gGelo.addColorStop(0, '#ffffff'); // Reflexo branco puro
        gGelo.addColorStop(0.3, '#e0f7fa'); // Gelo cristalino claro
        gGelo.addColorStop(0.65, '#00e5ff'); // Ciano vibrante
        gGelo.addColorStop(0.9, '#0288d1'); // Azul profundo
        gGelo.addColorStop(1, '#013a63'); // Borda glacial escura
        ctx.fillStyle = gGelo;
        ctx.beginPath(); ctx.arc(0, 0, R, 0, PI2); ctx.fill();

        // Fissuras internas de gelo trincado girando
        ctx.save();
        ctx.rotate(bola.ang);
        ctx.beginPath(); ctx.arc(0, 0, R, 0, PI2); ctx.clip();

        const passoGelo = R * 0.55;
        const deslocG = (rotRolamento * R) % (passoGelo * 4);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.lineWidth = 1.8;

        for (let k = -2; k < 6; k++) {
            const cx = k * passoGelo - deslocG;
            if (Math.abs(cx) > R) continue;
            const halfH = Math.sqrt(Math.max(0, R * R - cx * cx));
            ctx.beginPath();
            ctx.ellipse(cx, 0, 2.5, halfH, 0, 0, PI2);
            ctx.stroke();
        }
        ctx.restore();

        // Núcleo gelado brilhante
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const gNucG = ctx.createRadialGradient(0, 0, 1, 0, 0, R * 0.6);
        gNucG.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        gNucG.addColorStop(0.45, 'rgba(180, 245, 255, 0.65)');
        gNucG.addColorStop(1, 'rgba(0, 180, 255, 0)');
        ctx.fillStyle = gNucG;
        ctx.beginPath(); ctx.arc(0, 0, R * 0.6, 0, PI2); ctx.fill();
        ctx.restore();

        // CRISTAIS DE GELO AO REDOR
        for (let cr of bola.cristaisGelo) {
            const aCr = cr.angOffset + (now * cr.rotSpeed);
            const distCr = R * cr.distMult;
            const px = Math.cos(aCr) * distCr;
            const py = Math.sin(aCr) * distCr;

            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(aCr + Math.PI / 2);

            // Espícula de cristal translúcida
            ctx.fillStyle = 'rgba(220, 250, 255, 0.92)';
            ctx.beginPath();
            ctx.moveTo(0, -cr.comp);
            ctx.lineTo(cr.larg * 0.5, 0);
            ctx.lineTo(0, cr.larg * 0.3);
            ctx.lineTo(-cr.larg * 0.5, 0);
            ctx.closePath();
            ctx.fill();

            // Aresta com brilho
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(0, -cr.comp); ctx.lineTo(0, cr.larg * 0.3); ctx.stroke();

            ctx.restore();
        }

        // Flocos de neve orbitando
        for (let s = 0; s < 5; s++) {
            const sAng = now * 0.0025 + s * (PI2 / 5);
            const sDist = R * (1.35 + (s % 2) * 0.25);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.beginPath();
            ctx.arc(Math.cos(sAng) * sDist, Math.sin(sAng) * sDist, 1.8, 0, PI2);
            ctx.fill();
        }
    }

    // ---------------------- CORPO: BOLA DE FOGO ----------------------
    else if (bola.ballType === 'fogo') {
        // Aura colossal de calor
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const auraFogo = ctx.createRadialGradient(0, 0, R * 0.4, 0, 0, R * 2.1);
        auraFogo.addColorStop(0, 'rgba(255, 240, 150, 0.50)');
        auraFogo.addColorStop(0.45, 'rgba(255, 100, 20, 0.32)');
        auraFogo.addColorStop(0.85, 'rgba(200, 30, 0, 0.12)');
        auraFogo.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = auraFogo;
        ctx.beginPath(); ctx.arc(0, 0, R * 2.1, 0, PI2); ctx.fill();
        ctx.restore();

        // Esfera 3D de magma incandescente
        const gFogo = ctx.createRadialGradient(-R * 0.32, -R * 0.34, R * 0.12, 0, 0, R);
        gFogo.addColorStop(0, '#ffffff'); // Branco solar ofuscante
        gFogo.addColorStop(0.25, '#fff176'); // Amarelo incandescente
        gFogo.addColorStop(0.55, '#ff9800'); // Laranja fogo
        gFogo.addColorStop(0.85, '#ff3d00'); // Vermelho escuro
        gFogo.addColorStop(1, '#7f0000'); // Borda de magma denso
        ctx.fillStyle = gFogo;
        ctx.beginPath(); ctx.arc(0, 0, R, 0, PI2); ctx.fill();

        // Plasma solar e chamas turbulentas girando no eixo
        ctx.save();
        ctx.rotate(bola.ang);
        ctx.beginPath(); ctx.arc(0, 0, R, 0, PI2); ctx.clip();

        const passoFogo = R * 0.55;
        const deslocF = (rotRolamento * R) % (passoFogo * 4);
        ctx.strokeStyle = 'rgba(255, 255, 200, 0.85)';
        ctx.lineWidth = 2.4;

        for (let k = -2; k < 6; k++) {
            const cx = k * passoFogo - deslocF;
            if (Math.abs(cx) > R) continue;
            const halfH = Math.sqrt(Math.max(0, R * R - cx * cx));
            ctx.beginPath();
            ctx.ellipse(cx, 0, 3, halfH, 0, 0, PI2);
            ctx.stroke();
        }
        ctx.restore();

        // Núcleo solar hiper-brilhante
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const gNucF = ctx.createRadialGradient(0, 0, 1, 0, 0, R * 0.65);
        gNucF.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
        gNucF.addColorStop(0.4, 'rgba(255, 220, 100, 0.8)');
        gNucF.addColorStop(0.8, 'rgba(255, 90, 0, 0.4)');
        gNucF.addColorStop(1, 'rgba(200, 20, 0, 0)');
        ctx.fillStyle = gNucF;
        ctx.beginPath(); ctx.arc(0, 0, R * 0.65, 0, PI2); ctx.fill();
        ctx.restore();

        // CHAMAS GIRANDO AO REDOR (8 línguas de fogo espiralando)
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let ch of bola.chamasFogo) {
            const aCh = ch.angOffset + (now * ch.rotSpeed);
            const distCh = R * ch.distMult;
            const px = Math.cos(aCh) * distCh;
            const py = Math.sin(aCh) * distCh;

            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(aCh + Math.PI / 2);

            const fl = ctx.createLinearGradient(0, -ch.tam, 0, 4);
            fl.addColorStop(0, 'rgba(255, 250, 180, 0.95)');
            fl.addColorStop(0.4, 'rgba(255, 120, 0, 0.85)');
            fl.addColorStop(0.8, 'rgba(220, 30, 0, 0.45)');
            fl.addColorStop(1, 'rgba(100, 10, 0, 0)');
            ctx.fillStyle = fl;

            ctx.beginPath();
            ctx.moveTo(0, -ch.tam);
            ctx.lineTo(ch.larg * 0.6, 0);
            ctx.lineTo(0, ch.larg * 0.4);
            ctx.lineTo(-ch.larg * 0.6, 0);
            ctx.closePath();
            ctx.fill();

            ctx.restore();
        }
        ctx.restore();
    }

    ctx.restore(); // Fecha translate(bola.x, bola.y)
}

// =====================================================================
// RENDERIZAÇÃO: IMPACTOS E EXPLOSÕES (HIT)
// =====================================================================
function atualizarEDesenharHits(ctx, now) {
    for (let i = window.vfxMagoBolasHits.length - 1; i >= 0; i--) {
        const hit = window.vfxMagoBolasHits[i];
        const elapsed = now - hit.startTime;
        if (elapsed >= hit.duration) {
            window.vfxMagoBolasHits.splice(i, 1);
            continue;
        }

        const t = Math.min(elapsed / hit.duration, 1);
        const k = 1 - t;

        ctx.save();
        ctx.translate(hit.x, hit.y);

        // ------------------ IMPACTO DE FOGO (GRANDE EXPLOSÃO) ------------------
        if (hit.ballType === 'fogo') {
            // Inicializa partículas e brasas no primeiro frame
            if (hit.ps.length === 0) {
                // Brasas em arco parabólico
                for (let p = 0; p < 36; p++) {
                    const ang = Math.random() * PI2;
                    const vel = 2 + Math.random() * 6.5;
                    hit.ps.push({
                        x: 0, y: 0,
                        vx: Math.cos(ang) * vel,
                        vy: Math.sin(ang) * vel - 2.5,
                        life: 0, max: 25 + Math.random() * 30,
                        size: 2.2 + Math.random() * 3.8
                    });
                }
                // Fumaça volumosa em cogumelo
                for (let s = 0; s < 14; s++) {
                    const ang = Math.random() * PI2;
                    const vel = 0.5 + Math.random() * 1.8;
                    hit.smoke.push({
                        x: 0, y: 0,
                        vx: Math.cos(ang) * vel * 0.8,
                        vy: -1.2 - Math.random() * 2.2,
                        life: 0, max: 35 + Math.random() * 25,
                        size: 8 + Math.random() * 10
                    });
                }
            }

            // Flash solar central
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const flash = ctx.createRadialGradient(0, 0, 2, 0, 0, hit.radius * (0.6 + t * 0.4));
            flash.addColorStop(0, `rgba(255, 255, 240, ${0.95 * k})`);
            flash.addColorStop(0.3, `rgba(255, 200, 60, ${0.75 * k})`);
            flash.addColorStop(0.7, `rgba(255, 60, 0, ${0.45 * k})`);
            flash.addColorStop(1, 'rgba(100, 0, 0, 0)');
            ctx.fillStyle = flash;
            ctx.beginPath(); ctx.arc(0, 0, hit.radius * (0.6 + t * 0.4), 0, PI2); ctx.fill();

            // Expansão circular de ondas de choque no solo
            for (let r = 0; r < 3; r++) {
                const rr = hit.radius * (0.2 + t * 0.8) * (0.75 + r * 0.15);
                ctx.strokeStyle = r === 0 ? `rgba(255, 245, 180, ${0.85 * k})` : `rgba(255, ${Math.round(110 - r * 25)}, 20, ${0.55 * k})`;
                ctx.lineWidth = (4.5 - r) * 1.6 * k + 0.8;
                ctx.beginPath();
                ctx.ellipse(0, 6, rr, rr * 0.42, 0, 0, PI2);
                ctx.stroke();
            }
            ctx.restore();

            // Brasas voando com gravidade
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            for (let p of hit.ps) {
                p.life++;
                p.vy += 0.12; // Gravidade realista
                p.x += p.vx; p.y += p.vy;
                const pk = Math.max(0, 1 - p.life / p.max);
                ctx.fillStyle = `rgba(255, ${Math.round(120 + 120 * pk)}, 30, ${0.95 * pk})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * pk, 0, PI2);
                ctx.fill();
            }
            ctx.restore();

            // Fumaça densa subindo
            ctx.save();
            for (let s of hit.smoke) {
                s.life++;
                s.x += s.vx; s.y += s.vy;
                s.size += 0.15;
                const sk = Math.max(0, 1 - s.life / s.max);
                ctx.fillStyle = `rgba(55, 50, 50, ${0.30 * sk})`;
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.size, 0, PI2);
                ctx.fill();
            }
            ctx.restore();
        }

        // ------------------ IMPACTO DE GELO (NOVA CONGELANTE) ------------------
        else if (hit.ballType === 'gelo') {
            if (hit.ps.length === 0) {
                // Cristais afiados disparados em todas as direções
                for (let c = 0; c < 30; c++) {
                    const ang = Math.random() * PI2;
                    const vel = 1.5 + Math.random() * 5.5;
                    hit.ps.push({
                        x: 0, y: 0,
                        vx: Math.cos(ang) * vel,
                        vy: Math.sin(ang) * vel,
                        life: 0, max: 24 + Math.random() * 26,
                        size: 3 + Math.random() * 4,
                        rot: Math.random() * PI2,
                        vrot: (Math.random() - 0.5) * 0.25
                    });
                }
            }

            // Flash gélido
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const flashGelo = ctx.createRadialGradient(0, 0, 2, 0, 0, hit.radius * (0.5 + t * 0.5));
            flashGelo.addColorStop(0, `rgba(255, 255, 255, ${0.95 * k})`);
            flashGelo.addColorStop(0.4, `rgba(0, 229, 255, ${0.65 * k})`);
            flashGelo.addColorStop(1, 'rgba(0, 100, 255, 0)');
            ctx.fillStyle = flashGelo;
            ctx.beginPath(); ctx.arc(0, 0, hit.radius * (0.5 + t * 0.5), 0, PI2); ctx.fill();

            // Anéis de choque de gelo no chão
            for (let r = 0; r < 2; r++) {
                const rr = hit.radius * (0.2 + t * 0.8) * (0.8 + r * 0.2);
                ctx.strokeStyle = r === 0 ? `rgba(255, 255, 255, ${0.85 * k})` : `rgba(0, 229, 255, ${0.60 * k})`;
                ctx.lineWidth = (3.5 - r) * 1.5 * k + 0.8;
                ctx.beginPath();
                ctx.ellipse(0, 6, rr, rr * 0.42, 0, 0, PI2);
                ctx.stroke();
            }
            ctx.restore();

            // Cristais de gelo voando e girando
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            for (let p of hit.ps) {
                p.life++;
                p.x += p.vx; p.y += p.vy;
                p.rot += p.vrot;
                const pk = Math.max(0, 1 - p.life / p.max);

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot);
                ctx.fillStyle = `rgba(220, 250, 255, ${0.95 * pk})`;
                ctx.beginPath();
                ctx.moveTo(0, -p.size);
                ctx.lineTo(p.size * 0.5, 0);
                ctx.lineTo(0, p.size * 0.4);
                ctx.lineTo(-p.size * 0.5, 0);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
            ctx.restore();
        }

        // ------------------ IMPACTO NORMAL (BARRO / TERRA) ------------------
        else {
            if (hit.ps.length === 0) {
                for (let d = 0; d < 18; d++) {
                    const ang = Math.random() * PI2;
                    const vel = 1.2 + Math.random() * 4;
                    hit.ps.push({
                        x: 0, y: 0,
                        vx: Math.cos(ang) * vel,
                        vy: Math.sin(ang) * vel - 1,
                        life: 0, max: 20 + Math.random() * 18,
                        size: 2.5 + Math.random() * 3,
                        cor: Math.random() > 0.5 ? '#8d5b3d' : '#6f4528'
                    });
                }
            }

            // Onda de choque de terra no solo
            ctx.save();
            const rr = hit.radius * (0.3 + t * 0.7);
            ctx.strokeStyle = `rgba(210, 120, 50, ${0.75 * k})`;
            ctx.lineWidth = 3.5 * k + 0.6;
            ctx.beginPath();
            ctx.ellipse(0, 6, rr, rr * 0.42, 0, 0, PI2);
            ctx.stroke();
            ctx.restore();

            // Fragmentos de barro arremessados
            ctx.save();
            for (let p of hit.ps) {
                p.life++;
                p.vy += 0.1;
                p.x += p.vx; p.y += p.vy;
                const pk = Math.max(0, 1 - p.life / p.max);
                ctx.fillStyle = p.cor;
                ctx.globalAlpha = pk;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * pk, 0, PI2);
                ctx.fill();
            }
            ctx.restore();
        }

        ctx.restore(); // Fecha translate(hit.x, hit.y)
    }
}

// ---------- HELPER: DISSIPAÇÃO NATURAL NO FIM DO ALCANCE MÁXIMO (400px) ----------
function criarDissipacaoFimRange(bola) {
    const bType = bola.ballType || 'normal';
    window.vfxMagoBolasHits.push({
        x: bola.destX,
        y: bola.destY,
        ballType: bType,
        radius: bType === 'fogo' ? 45 : (bType === 'gelo' ? 35 : 30),
        startTime: Date.now(),
        duration: 350,
        ps: [],
        debris: [],
        smoke: []
    });
}

// =====================================================================
// DISPATCHER PRINCIPAL EXPOSTO GLOBALMENTE (RENDER LOOP)
// =====================================================================
window.desenharVfxMagoBola = function (ctx) {
    if (!ctx) return;
    const now = Date.now();

    // 1) Rastros persistentes no chão (pedras caídas, geada, lava)
    atualizarEDesenharRastrosChao(ctx, now);

    // 2) Círculos congelantes no chão (hit de gelo)
    atualizarEDesenharCirculosGelo(ctx, now);

    // 3) Efeito visual de congelamento no corpo dos inimigos (2s)
    atualizarEDesenharInimigosCongelados(ctx, now);

    // 4) Bolas ativas rolando no chão
    for (let i = window.vfxMagoBolas.length - 1; i >= 0; i--) {
        const bola = window.vfxMagoBolas[i];
        if (now - bola.startTime >= bola.duration) {
            // Fim do alcance (400px) sem colidir com nenhum mob: dissipação visual suave
            criarDissipacaoFimRange(bola);
            if (typeof window.pararSomMagoSkill4 === 'function') window.pararSomMagoSkill4();
            window.vfxMagoBolas.splice(i, 1);
            continue;
        }
        atualizarEDesenharBola(ctx, bola, now);
    }

    // 5) Impactos e explosões
    atualizarEDesenharHits(ctx, now);
};