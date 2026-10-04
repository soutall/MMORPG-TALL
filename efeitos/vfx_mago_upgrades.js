// efeitos/vfx_mago_upgrades.js — Efeitos Visuais dos Upgrades do Mago
// =========================================================================================
// Renderização em Canvas 2D de alta performance (60 FPS, PC e Mobile) para Upgrades do Mago:
// 1. Meteoro:
//    - Lado A (DPS):
//      1: Chuva Quíntupla (5 meteoros sequenciais, intervalos rápidos, tremores de tela a cada queda).
//      2: Impacto Avassalador (+30% dano, crateras com brilho e fumaça densa).
//      3: Tempestade Celeste Canalizada (10 meteoros, aura canalizada no mago com runas, micro-stuns).
//      4: Cometa do Cataclismo Ancestral (descida lenta e imponente, cratera sísmica colossal,
//         explosão de fragmentos de rocha incandescentes, solo em chamas por 10s).
//    - Lado B (Controle):
//      1: Esfera Ígnea Repulsora (Bola de Fogo lançada com knockback e rastro de chamas).
//      2: Desfragmentação Incendiária (estilhaços em leque ao acertar, queimadura 5s).
//      3: Rajada Tríplice Ígnea (3 bolas de fogo velozes consecutivas).
//      4: Metamorfose Elemental: Orbe Vivo (Mago se transforma em Bola de Fogo viva por 5s,
//         +100% velocidade, queima solo e atropela inimigos com lentidão).
// 2. Nevasca:
//    - Lado A (Gelo):
//      1: Congelamento Profundo (cristais de gelo nítidos no vórtice, congelamento >3s).
//      2: Ressonância Criomântica (Aura azul nos pés do mago com até 3 camadas concêntricas).
//      3: Projéteis Árticos (ataque básico vira fragmento afiado de gelo; 3 hits congelam).
//      4: Estacas Glaciais Detonantes (estacas de gelo emergem sob inimigos e explodem no final).
//    - Lado B (Fogo / Tornado):
//      1: Fusão Piroclástica (nevasca ardente que queima em vez de lentidão).
//      2: Tornado Ígneo Devastador (vórtice cilíndrico de chamas que reduz defesa).
//      3: Vórtices Menores Perseguidores (4 mini-tornados que perseguem alvos por 5s).
//      4: Tornado Colossal Caçador (cresce em tamanho e dano ao longo de 10s e persegue).
// 3. Vulcão:
//    - Lado A (Erupção):
//      1: Erupção Acelerada (dobro de fragmentos e dobro de velocidade/cadência).
//      2: Poças de Magma Debilitante (larva no solo reduzindo ataque dos monstros).
//      3: Fragmentação Detonante Secundária (segunda explosão em cada fragmento).
//      4: Caldeira Vulcânica Suprema (+20% área, +40% dano, grande zona de calor).
//    - Lado B (Golem Lacaio):
//      1: Despertar do Golem de Fogo (lacaio vivo por 30s que segue o mago e atira bolas de fogo).
//      2: Garras Bi-Elementais (mão de gelo adicionada, alternando tiros de fogo e gelo com velocidade).
//      3: Rugido Protetor do Titã (animação de rugido a cada 10s, bolha de proteção 20% HP máx).
//      4: Chuva Bi-Elemental do Golem (meteoros de fogo e gelo periódicos a cada 5s).
// 4. Bola Elemental:
//    - Lado A: Esfera Hiper-Rolante (+25% tamanho, perfuração contínua), Pulsos Tri-Elementais,
//              Bolas Gêmeas, Supernova Elemental Primordial (raio 180px com congelamento e fogo).
//    - Lado B: Esfera Gravitacional (vórtice de atração), Orbe Bumerangue (retorno com regen MP/HP),
//              Escudo de Vanguarda (redoma protetora aliada), Singularidade do Vazio (buraco negro 6s).
// =========================================================================================

(function () {
    'use strict';

    // Arrays de entidades ativas para renderização
    window.vfxMagoMeteorosChuva = [];
    window.vfxMagoCometas = [];
    window.vfxMagoCrateras = [];
    window.vfxMagoBolasFogoProjeteis = [];
    window.vfxMagoFragmentosFogo = [];
    window.vfxMagoRastroChamas = [];
    window.vfxMagoFormaIgnea = null; // Quando o próprio mago vira bola de fogo
    window.vfxMagoFormasIgneasJogadores = {}; // Outros jogadores em forma ígnea
    window.vfxMagoAurasGeloPes = {}; // JogadorId -> { stacks, expiresAt }
    window.vfxMagoProjeteisGelo = []; // Ataques básicos gélidos
    window.vfxMagoEstacasGelo = []; // Espinhos de gelo emergindo no chão
    window.vfxMagoTornadosFogo = []; // Tornados de fogo
    window.vfxMagoMiniTornados = []; // Mini tornados perseguidores
    window.vfxMagoPocasLava = []; // Poças de larva do vulcão
    window.vfxMagoExplosoesSecundarias = []; // 2ª explosão do vulcão
    window.vfxMagoZonasCalor = []; // Zonas de calor do vulcão
    window.vfxMagoGolems = {}; // Golems de fogo do mago ativos
    window.vfxMagoGolemMeteoroDual = []; // Meteoros de fogo e gelo chamados pelo golem
    window.vfxMagoSingularidades = []; // Buraco negro da bola elemental
    window.vfxMagoSupernovas = []; // Supernovas da bola elemental

    // Variáveis locais de tracking
    let ultimoTempo = performance.now();

    // Paleta de cores temática do Mago
    const CORES_MAGO = {
        fogoBrilho: '#fff3b0',
        fogoLaranja: '#ff9d32',
        fogoVermelho: '#ef4444',
        fogoProfundo: '#b91c1c',
        cometaLuz: '#fef08a',
        geloClaro: '#e0f2fe',
        geloAzul: '#38bdf8',
        geloRuna: '#0284c7',
        geloProfundo: '#0369a1',
        vidroGelo: 'rgba(224, 242, 254, 0.75)',
        magmaLaranja: '#f97316',
        magmaEscuro: '#7c2d12',
        escudoBranco: '#ffffff',
        vazioRoxo: '#a855f7',
        vazioEscuro: '#1e1b4b'
    };

    function clamp01(v) { return Math.max(0, Math.min(1, v)); }

    // Registra listener no dispatcher global de eventos de rede
    window.vfxListeners = window.vfxListeners || [];
    window.vfxListeners.push(function (dados) {
        if (!dados || !dados.type) return;

        // 1. METEORO — Impactos da Chuva Quíntupla / Tempestade Celeste (A1 / A3)
        if (dados.type === 'action_mago_meteoro_queda') {
            criarAnimacaoMeteoroChuva(dados.x, dados.y, dados.isGrande, dados.shake || 12, dados.microStun);
        }

        // 2. METEORO — Canalização da Tempestade Celeste (A3)
        if (dados.type === 'action_mago_canalizacao') {
            if (dados.id === window.meuId && window.floatingTexts) {
                window.floatingTexts.push({ x: dados.x, y: dados.y - 45, text: '⚡ Canalizando Tempestade Celeste!', color: '#ffedd5', alpha: 1.0 });
            }
        }

        // 3. METEORO — Cometa Gigante do Cataclismo (A4)
        if (dados.type === 'action_mago_cometa_gigante') {
            criarAnimacaoCometaGigante(dados.x, dados.y, dados.raio || 140, dados.duracaoChamas || 10000);
        }

        // 4. METEORO — Disparo de Bola de Fogo (B1 / B3)
        if (dados.type === 'action_mago_bola_fogo_tiro') {
            criarProjetilBolaFogo(dados.id, dados.x, dados.y, dados.ang, dados.speed || 14, dados.danoMult || 1.0, dados.knockback || 90);
        }

        // 5. METEORO — Desfragmentação em área (B2)
        if (dados.type === 'action_mago_bola_fogo_desfragmentar') {
            criarDesfragmentacaoFogo(dados.x, dados.y, dados.qtd || 6);
        }

        // 6. METEORO — Metamorfose em Bola de Fogo Viva (B4)
        if (dados.type === 'action_mago_forma_ignea') {
            ativarFormaIgnea(dados.id, dados.duracaoMs || 5000);
        }

        // 7. NEVASCA — Aura Azul Acumulativa nos pés (A2)
        if (dados.type === 'action_mago_aura_gelo') {
            window.vfxMagoAurasGeloPes[dados.id] = {
                stacks: Math.min(3, Math.max(1, dados.stacks || 1)),
                expiresAt: Date.now() + (dados.duracaoMs || 10000)
            };
            if (dados.id === window.meuId && window.floatingTexts) {
                window.floatingTexts.push({ x: dados.x, y: dados.y - 40, text: '❄️ Ressonância Criomântica x' + (dados.stacks || 1) + ' (+ ' + ((dados.stacks || 1) * 10) + '% Dano Mágico)', color: '#38bdf8', alpha: 1.0 });
            }
        }

        // 8. NEVASCA — Ataque Básico Gélido (A3)
        if (dados.type === 'action_mago_tiro_gelo') {
            criarProjetilGeloBasico(dados.id, dados.x, dados.y, dados.targetX, dados.targetY);
        }

        // 9. NEVASCA — Estacas de Gelo sob os inimigos (A4)
        if (dados.type === 'action_mago_estacas_gelo') {
            criarEstacasGelo(dados.x, dados.y, dados.inimigosPos || [], dados.duracaoMs || 8000);
        }

        // 10. NEVASCA — Detonação das Estacas de Gelo (A4 final)
        if (dados.type === 'action_mago_estacas_detonacao') {
            detonarEstacasGelo(dados.x, dados.y, dados.raio || 120);
        }

        // 11. NEVASCA — Tornado de Fogo e Mini-Tornados (B2 / B3 / B4)
        if (dados.type === 'action_mago_tornado_fogo') {
            criarTornadoFogo(dados.id, dados.x, dados.y, dados.raio || 115, dados.duracaoMs || 8000, dados.crescente, dados.perseguidor);
        }
        if (dados.type === 'action_mago_mini_tornados' || dados.type === 'action_mago_mini_tornados_spawn') {
            criarMiniTornados(dados.x, dados.y, dados.count || dados.qtd || 4, dados.duracaoMs || 5000);
        }

        // 12. VULCÃO — Poças de Magma / Zona de Calor / 2ª Explosão (A2 / A3 / A4)
        if (dados.type === 'action_mago_vulcao_pocas') {
            criarPocasLava(dados.x, dados.y, dados.raio || 140, dados.duracaoMs || 10000);
        }
        if (dados.type === 'action_mago_vulcao_explosao2') {
            criarExplosaoSecundariaVulcao(dados.x, dados.y);
        }
        if (dados.type === 'action_mago_vulcao_zona_calor') {
            criarZonaCalorVulcao(dados.x, dados.y, dados.raio || 220, dados.duracaoMs || 10000);
        }

        // 13. VULCÃO — Despertar e Ações do Golem de Fogo e Gelo (B1 / B2 / B3 / B4)
        if (dados.type === 'action_mago_golem_spawn') {
            spawnGolemMago(dados.ownerId, dados.x, dados.y, dados.duracaoMs || 30000, dados.hasGeloHand);
        }
        if (dados.type === 'action_mago_golem_tiro') {
            dispararTiroGolem(dados.ownerId, dados.x, dados.y, dados.targetX, dados.targetY, dados.tipo || 'fogo');
        }
        if (dados.type === 'action_mago_golem_rugido') {
            executarRugidoGolem(dados.ownerId, dados.shieldVal, dados.duracaoMs || 8000);
        }
        if (dados.type === 'action_mago_golem_meteoro_dual') {
            executarMeteoroDualGolem(dados.x, dados.y, dados.targetX, dados.targetY);
        }

        // 14. BOLA ELEMENTAL — Supernova & Singularidade do Vazio (A4 / B4)
        if (dados.type === 'action_mago_bola_supernova') {
            criarSupernovaElemental(dados.x, dados.y, dados.raio || 180);
        }
        if (dados.type === 'action_mago_bola_singularidade') {
            criarSingularidadeVazio(dados.x, dados.y, dados.duracaoMs || 6000);
        }
    });

    // =========================================================================
    // 1. METEORO: CHUVA SEQUENCIAL & COMETA GIGANTE
    // =========================================================================

    // Helper para gerar o Chão em Chamas idêntico ao efeito original do meteoro (com chamas dançantes e brasas)
    function criarChaoEmChamasUpgrade(tx, ty, duracaoFrames, escala) {
        if (!window.chaoEmChamas) window.chaoEmChamas = [];
        const esc = escala || 1.0;
        const dur = duracaoFrames || 300;
        const qtdParticulas = Math.round(25 * esc);
        const particulas = [];
        for (let f = 0; f < qtdParticulas; f++) {
            particulas.push({
                x: tx + (Math.random() * 90 - 45) * esc,
                y: ty + (Math.random() * 40 - 20) * esc,
                vy: Math.random() * 1.5 + 0.8,
                vida: Math.random(),
                tamanho: (Math.random() * 5 + 4) * Math.min(1.4, esc),
                offset: Math.random() * 10,
                cor: Math.random() > 0.4 ? '#e67e22' : '#f1c40f'
            });
        }
        const qtdFumaca = Math.round(5 * esc);
        const fumacaMeteoro = [];
        for (let s = 0; s < qtdFumaca; s++) {
            fumacaMeteoro.push({
                x: tx + (Math.random() * 70 - 35) * esc,
                y: ty + (Math.random() * 24 - 12) * esc,
                vy: Math.random() * 0.6 + 0.5,
                vida: Math.random(),
                tamanho: (Math.random() * 8 + 6) * Math.min(1.5, esc)
            });
        }
        window.chaoEmChamas.push({
            x: tx,
            y: ty,
            duracao: dur,
            duracaoInicial: dur,
            particulasFogo: particulas,
            fumaça: fumacaMeteoro
        });
    }

    function criarAnimacaoMeteoroChuva(tx, ty, isGrande, shakeIntensity, microStun) {
        // Toca som original da queda e impacto
        if (typeof window.tocarSonoroProximidade === 'function') {
            window.tocarSonoroProximidade('mago_meteoro_queda', tx, ty);
        } else if (typeof window.tocarSonoro === 'function') {
            window.tocarSonoro('mago_meteoro_queda');
        } else if (typeof window.tocarSomQuedaMeteoro === 'function') {
            window.tocarSomQuedaMeteoro();
        }

        // Posição no céu bem acima do alvo (sy < ty no canvas) com queda diagonal realista
        const distanciaInicial = 450;
        const sx = tx + 140; // Ângulo diagonal vindo do alto à direita
        const sy = ty - distanciaInicial;

        // Vértices do asteróide para textura de rocha basáltica irregular
        const rockVertices = [];
        const numV = 8;
        for (let v = 0; v < numV; v++) {
            rockVertices.push(0.80 + Math.random() * 0.42);
        }

        window.vfxMagoMeteorosChuva.push({
            startX: sx,
            startY: sy,
            targetX: tx,
            targetY: ty,
            progresso: 0,
            velocidade: 0.045, // Rápido e impactante
            isGrande: !!isGrande,
            shake: shakeIntensity || 14,
            microStun: !!microStun,
            rot: Math.random() * Math.PI * 2,
            rotVel: (Math.random() - 0.5) * 4.5,
            rockVertices: rockVertices,
            rastro: [],
            impactado: false
        });
    }

    function criarAnimacaoCometaGigante(tx, ty, raio, duracaoChamas) {
        // Toca som com eco potente
        if (typeof window.tocarSonoroProximidade === 'function') {
            window.tocarSonoroProximidade('mago_meteoro_queda', tx, ty);
        } else if (typeof window.tocarSonoro === 'function') {
            window.tocarSonoro('mago_meteoro_queda');
        }

        const distancia = 580;
        const sx = tx + 180;
        const sy = ty - distancia; // No topo do céu, descendo lentamente

        // Vértices da colossal massa rochosa do cometa
        const cometVertices = [];
        const numCV = 12;
        for (let v = 0; v < numCV; v++) {
            cometVertices.push(0.78 + Math.random() * 0.44);
        }

        window.vfxMagoCometas.push({
            startX: sx,
            startY: sy,
            targetX: tx,
            targetY: ty,
            progresso: 0,
            velocidade: 0.012, // Descida LENTA, pesada e imponente como solicitado!
            raioImpacto: raio || 140,
            duracaoChamas: duracaoChamas || 10000,
            rot: Math.random() * Math.PI * 2,
            rotVel: 0.85,
            cometVertices: cometVertices,
            rastro: [],
            particulasRochas: [],
            tempoCriacao: performance.now(),
            impactado: false
        });
    }

    // =========================================================================
    // 2. METEORO RAMO B: BOLA DE FOGO, DESFRAGMENTAÇÃO E METAMORFOSE
    // =========================================================================

    function criarProjetilBolaFogo(ownerId, x, y, ang, speed, danoMult, knockback) {
        if (typeof window.tocarSonoroProximidade === 'function') {
            window.tocarSonoroProximidade('mago_skill1', x, y);
        } else if (typeof window.tocarSonoro === 'function') {
            window.tocarSonoro('mago_skill1');
        }

        window.vfxMagoBolasFogoProjeteis.push({
            ownerId: ownerId,
            x: x,
            y: y,
            startX: x,
            startY: y,
            ang: ang,
            speed: speed || 14,
            distTotal: 400,
            distPercorrida: 0,
            danoMult: danoMult || 1.0,
            knockback: knockback || 90,
            rastro: [],
            rastroChaoTimer: 0
        });
    }

    function criarDesfragmentacaoFogo(x, y, qtd) {
        if (typeof window.tocarSonoroProximidade === 'function') {
            window.tocarSonoroProximidade('mago_lava_impacto', x, y);
        }
        const quantidade = qtd || 6;
        for (let i = 0; i < quantidade; i++) {
            const ang = (Math.PI * 2 / quantidade) * i + (Math.random() * 0.3 - 0.15);
            const vel = Math.random() * 5 + 4;
            window.vfxMagoFragmentosFogo.push({
                x: x,
                y: y,
                vx: Math.cos(ang) * vel,
                vy: Math.sin(ang) * vel,
                vida: 1.0,
                decaimento: Math.random() * 0.03 + 0.02,
                tamanho: Math.random() * 5 + 4,
                rastro: []
            });
        }
    }

    function ativarFormaIgnea(jogadorId, duracaoMs) {
        const expiraEm = Date.now() + (duracaoMs || 5000);
        if (jogadorId === window.meuId) {
            window.vfxMagoFormaIgnea = { expiraEm: expiraEm, ativo: true };
            if (window.floatingTexts) {
                window.floatingTexts.push({ x: window.meuX, y: window.meuY - 45, text: '🔥 METAMORFOSE ELEMENTAL: ORBE VIVO!', color: '#f97316', alpha: 1.0 });
            }
        } else {
            window.vfxMagoFormasIgneasJogadores[jogadorId] = { expiraEm: expiraEm, ativo: true };
        }
    }

    // =========================================================================
    // 3. NEVASCA: ESTACAS DE GELO, TORNADOS DE FOGO & MINI TORNADOS
    // =========================================================================

    function criarProjetilGeloBasico(ownerId, x, y, tx, ty) {
        const ang = Math.atan2(ty - y, tx - x);
        const dist = Math.hypot(tx - x, ty - y);
        window.vfxMagoProjeteisGelo.push({
            ownerId: ownerId,
            x: x,
            y: y,
            ang: ang,
            speed: 16,
            distRestante: dist,
            vida: 1.0,
            rastro: []
        });
    }

    function criarEstacasGelo(cx, cy, posicoes, duracaoMs) {
        const duracao = duracaoMs || 8000;
        const estacas = [];
        if (Array.isArray(posicoes) && posicoes.length > 0) {
            for (let p of posicoes) {
                estacas.push({ x: p.x, y: p.y, escala: 0, altura: Math.random() * 20 + 25 });
            }
        } else {
            // Cria estacas procedurais no raio da nevasca
            for (let i = 0; i < 9; i++) {
                const a = Math.random() * Math.PI * 2;
                const d = Math.random() * 95;
                estacas.push({
                    x: cx + Math.cos(a) * d,
                    y: cy + Math.sin(a) * d,
                    escala: 0,
                    altura: Math.random() * 22 + 26
                });
            }
        }

        window.vfxMagoEstacasGelo.push({
            cx: cx,
            cy: cy,
            estacas: estacas,
            tempoCriacao: performance.now(),
            duracao: duracao,
            detonada: false
        });
    }

    function detonarEstacasGelo(cx, cy, raio) {
        // Efeito sonoro de vidro estilhaçando
        if (typeof window.tocarSonoroProximidade === 'function') {
            window.tocarSonoroProximidade('mago_skill4_impacto', cx, cy);
        }
        // Remove estacas dessa área e gera partículas estilhaçadas
        for (let i = window.vfxMagoEstacasGelo.length - 1; i >= 0; i--) {
            const e = window.vfxMagoEstacasGelo[i];
            if (Math.hypot(e.cx - cx, e.cy - cy) < raio + 40) {
                e.detonada = true;
                for (let est of e.estacas) {
                    for (let p = 0; p < 8; p++) {
                        const ang = Math.random() * Math.PI * 2;
                        const vel = Math.random() * 7 + 4;
                        window.vfxMagoFragmentosFogo.push({
                            x: est.x,
                            y: est.y,
                            vx: Math.cos(ang) * vel,
                            vy: Math.sin(ang) * vel - 2,
                            vida: 1.0,
                            decaimento: 0.04,
                            tamanho: Math.random() * 4 + 3,
                            isGelo: true,
                            rastro: []
                        });
                    }
                }
                window.vfxMagoEstacasGelo.splice(i, 1);
            }
        }
    }

    function criarTornadoFogo(id, x, y, raio, duracaoMs, crescente, perseguidor) {
        window.vfxMagoTornadosFogo.push({
            id: id || Math.random(),
            x: x,
            y: y,
            raioBase: raio || 115,
            raioAtual: raio || 115,
            tempoInicio: performance.now(),
            duracao: duracaoMs || 8000,
            crescente: !!crescente,
            perseguidor: !!perseguidor,
            rotacao: 0,
            alvoX: x,
            alvoY: y,
            particulas: []
        });
    }

    function criarMiniTornados(cx, cy, qtd, duracaoMs) {
        const quantidade = qtd || 4;
        for (let i = 0; i < quantidade; i++) {
            const ang = (Math.PI * 2 / quantidade) * i;
            const dist = 30;
            window.vfxMagoMiniTornados.push({
                x: cx + Math.cos(ang) * dist,
                y: cy + Math.sin(ang) * dist,
                vx: Math.cos(ang) * 2.5,
                vy: Math.sin(ang) * 2.5,
                tempoInicio: performance.now(),
                duracao: duracaoMs || 5000,
                rotacao: 0,
                alvoId: null
            });
        }
    }

    // =========================================================================
    // 4. VULCÃO: POÇAS DE MAGMA, 2ª EXPLOSÃO & GOLEM BI-ELEMENTAL
    // =========================================================================

    function criarPocasLava(cx, cy, raio, duracaoMs) {
        const pocas = [];
        const numPocas = 8;
        const raioBase = raio || 140;

        for (let i = 0; i < numPocas; i++) {
            const ang = (Math.PI * 2 / numPocas) * i + (Math.random() - 0.5) * 0.45;
            const dist = (raioBase * 0.38) + Math.random() * (raioBase * 0.46);
            const px = cx + Math.cos(ang) * dist;
            const py = cy + Math.sin(ang) * dist * 0.52; // perspectiva isométrica

            // Contorno orgânico irregular de lago de magma (8 pontas poligonais)
            const contorno = [];
            const rBaseX = Math.random() * 16 + 22;
            const rBaseY = rBaseX * 0.54;
            for (let k = 0; k < 8; k++) {
                const kAng = (Math.PI * 2 / 8) * k;
                const variacao = 0.76 + Math.random() * 0.48;
                contorno.push({
                    x: Math.cos(kAng) * rBaseX * variacao,
                    y: Math.sin(kAng) * rBaseY * variacao
                });
            }

            // Ilhas flutuantes de crosta de basalto (células de convecção de magma)
            const ilhas = [];
            for (let j = 0; j < 2; j++) {
                ilhas.push({
                    ox: (Math.random() - 0.5) * rBaseX * 0.55,
                    oy: (Math.random() - 0.5) * rBaseY * 0.55,
                    tamX: Math.random() * 5 + 4,
                    tamY: Math.random() * 3 + 2.5,
                    ang: Math.random() * Math.PI
                });
            }

            // Bolhas dinâmicas fervilhando no magma
            const bolhas = [];
            for (let b = 0; b < 4; b++) {
                bolhas.push({
                    ox: (Math.random() - 0.5) * rBaseX * 0.7,
                    oy: (Math.random() - 0.5) * rBaseY * 0.7,
                    raio: Math.random() * 2.5 + 2,
                    maxRaio: Math.random() * 3.8 + 3.2,
                    prog: Math.random(),
                    vel: Math.random() * 0.035 + 0.02
                });
            }

            pocas.push({
                x: px,
                y: py,
                rBaseX: rBaseX,
                rBaseY: rBaseY,
                contorno: contorno,
                ilhas: ilhas,
                bolhas: bolhas
            });
        }

        // Fissuras tectônicas ramificadas conectando o vulcão e as poças
        const fissuras = [];
        for (let f = 0; f < 10; f++) {
            const fAng = (Math.PI * 2 / 10) * f + (Math.random() - 0.5) * 0.35;
            const fDistMax = raioBase * (0.85 + Math.random() * 0.3);
            const fSegs = [{ x: cx, y: cy }];
            const passos = 5;
            for (let s = 1; s <= passos; s++) {
                const segDist = (fDistMax / passos) * s;
                const wobble = (Math.random() - 0.5) * 18;
                const nextX = cx + Math.cos(fAng) * segDist - Math.sin(fAng) * wobble;
                const nextY = cy + (Math.sin(fAng) * segDist + Math.cos(fAng) * wobble) * 0.52;
                fSegs.push({ x: nextX, y: nextY });
            }
            fissuras.push(fSegs);
        }

        // Brasas vulcânicas ascendentes
        const brasas = [];
        for (let br = 0; br < 24; br++) {
            brasas.push({
                x: cx + (Math.random() - 0.5) * raioBase * 1.6,
                y: cy + (Math.random() - 0.5) * raioBase * 0.85,
                vy: Math.random() * 0.65 + 0.45,
                vida: Math.random(),
                tam: Math.random() * 2.8 + 1.6,
                wobble: Math.random() * 10
            });
        }

        window.vfxMagoPocasLava.push({
            cx: cx,
            cy: cy,
            raio: raioBase,
            pocas: pocas,
            fissuras: fissuras,
            brasas: brasas,
            tempoInicio: performance.now(),
            duracao: duracaoMs || 10000
        });
    }

    function criarExplosaoSecundariaVulcao(x, y) {
        window.vfxMagoExplosoesSecundarias.push({
            x: x,
            y: y,
            raio: 10,
            maxRaio: 45,
            vida: 1.0,
            tempoInicio: performance.now()
        });
    }

    function criarZonaCalorVulcao(cx, cy, raio, duracaoMs) {
        const raioFinal = raio || 220;
        const fissurasBorda = [];
        for (let i = 0; i < 16; i++) {
            const ang = (Math.PI * 2 / 16) * i + (Math.random() - 0.5) * 0.3;
            fissurasBorda.push({
                x1: cx + Math.cos(ang) * (raioFinal * 0.72),
                y1: cy + Math.sin(ang) * (raioFinal * 0.72) * 0.52,
                x2: cx + Math.cos(ang) * (raioFinal * 1.05),
                y2: cy + Math.sin(ang) * (raioFinal * 1.05) * 0.52,
                largura: Math.random() * 2.5 + 1.8
            });
        }

        const cinzas = [];
        for (let c = 0; c < 32; c++) {
            cinzas.push({
                x: cx + (Math.random() - 0.5) * raioFinal * 1.8,
                y: cy + (Math.random() - 0.5) * raioFinal * 0.9,
                vy: Math.random() * 0.45 + 0.25,
                vida: Math.random(),
                tam: Math.random() * 2.5 + 1.2,
                wobbleOffset: Math.random() * 10
            });
        }

        window.vfxMagoZonasCalor.push({
            cx: cx,
            cy: cy,
            raio: raioFinal,
            fissuras: fissurasBorda,
            cinzas: cinzas,
            tempoInicio: performance.now(),
            duracao: duracaoMs || 10000
        });
    }

    function spawnGolemMago(ownerId, x, y, duracaoMs, hasGeloHand) {
        window.vfxMagoGolems[ownerId] = {
            ownerId: ownerId,
            x: x,
            y: y,
            targetX: x,
            targetY: y,
            angulo: 0,
            tempoInicio: performance.now(),
            duracao: duracaoMs || 30000,
            hasGeloHand: !!hasGeloHand,
            rugindo: false,
            rugindoTimer: 0,
            passo: 0,
            chamasCostas: []
        };
        if (ownerId === window.meuId && window.floatingTexts) {
            window.floatingTexts.push({ x: x, y: y - 50, text: '👹 Despertar do Golem Incandescente!', color: '#ff7700', alpha: 1.0 });
        }
    }

    function dispararTiroGolem(ownerId, sx, sy, tx, ty, tipo) {
        const ang = Math.atan2(ty - sy, tx - sx);
        window.vfxMagoBolasFogoProjeteis.push({
            ownerId: ownerId,
            x: sx,
            y: sy,
            startX: sx,
            startY: sy,
            ang: ang,
            speed: 15,
            distTotal: 380,
            distPercorrida: 0,
            isGolem: true,
            tipoElemento: tipo || 'fogo',
            rastro: []
        });
    }

    function executarRugidoGolem(ownerId, shieldVal, duracaoMs) {
        const golem = window.vfxMagoGolems[ownerId];
        if (golem) {
            golem.rugindo = true;
            golem.rugindoTimer = 45; // ~0.75s de animação de rugido
        }
        if (typeof window.tocarSonoro === 'function') {
            window.tocarSonoro('mago_lava_impacto');
        }

        // Aplica valor do escudo místico (barra branca sobreposta)
        if (ownerId === window.meuId) {
            window.escudoMagoValor = shieldVal || Math.round((window.meuMaxHp || 100) * 0.20);
            window.escudoMagoExpiraEm = Date.now() + (duracaoMs || 8000);
            if (window.floatingTexts) {
                window.floatingTexts.push({ x: window.meuX, y: window.meuY - 45, text: '🛡️ Barreira Mística (+ ' + window.escudoMagoValor + ' Escudo)', color: '#ffffff', alpha: 1.0 });
            }
        }
    }

    function executarMeteoroDualGolem(gx, gy, tx, ty) {
        // Dispara 1 de fogo e logo após 1 de gelo
        criarAnimacaoMeteoroChuva(tx - 20, ty - 10, false, 14, false);
        setTimeout(function () {
            window.vfxMagoGolemMeteoroDual.push({
                startX: tx + 180,
                startY: ty - 380,
                targetX: tx + 20,
                targetY: ty + 10,
                progresso: 0,
                velocidade: 0.045,
                tipo: 'gelo',
                rastro: []
            });
        }, 350);
    }

    // =========================================================================
    // 5. BOLA ELEMENTAL: SUPERNOVA & SINGULARIDADE
    // =========================================================================

    function criarSupernovaElemental(x, y, raio) {
        if (typeof window.tocarSonoroProximidade === 'function') {
            window.tocarSonoroProximidade('mago_skill4_impacto', x, y);
        }
        window.tremorTela = Math.max(window.tremorTela || 0, 22);
        window.vfxMagoSupernovas.push({
            x: x,
            y: y,
            raio: 15,
            maxRaio: raio || 180,
            vida: 1.0,
            ondas: [0, 0.3, 0.6],
            tempoInicio: performance.now()
        });
    }

    function criarSingularidadeVazio(x, y, duracaoMs) {
        window.vfxMagoSingularidades.push({
            x: x,
            y: y,
            raioVortex: 150,
            tempoInicio: performance.now(),
            duracao: duracaoMs || 6000,
            rotacao: 0,
            particulasAtracao: []
        });
    }

    // =========================================================================
    // RENDERIZADOR PRINCIPAL: desenharEfeitosMagoUpgrades()
    // Chamado a cada frame no loop gráfico (Canvas 2D, 60fps)
    // =========================================================================
    window.desenharEfeitosMagoUpgrades = function () {
        const ctx = window.ctx;
        if (!ctx) return;

        const agora = performance.now();
        const delta = Math.min(100, agora - ultimoTempo) / 1000;
        ultimoTempo = agora;

        // ---------------------------------------------------------------------
        // A) CRATERAS RESIDUAIS E SOLO EM CHAMAS DO COMETA (10 segundos)
        // ---------------------------------------------------------------------
        for (let i = window.vfxMagoCrateras.length - 1; i >= 0; i--) {
            const cr = window.vfxMagoCrateras[i];
            const decorrido = agora - cr.tempoCriacao;
            if (decorrido >= cr.duracao) {
                window.vfxMagoCrateras.splice(i, 1);
                continue;
            }

            const alphaFade = Math.min(1.0, (cr.duracao - decorrido) / 2000);

            ctx.save();
            ctx.translate(cr.x, cr.y);

            // Borda elevada e fundo da cratera afundada
            ctx.beginPath();
            ctx.ellipse(0, 0, cr.raio, cr.raio * 0.45, 0, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(20, 10, 8, ${0.75 * alphaFade})`;
            ctx.fill();

            ctx.lineWidth = 4;
            ctx.strokeStyle = `rgba(80, 30, 15, ${0.85 * alphaFade})`;
            ctx.stroke();

            // Chamas no solo queimando continuamente
            const pulso = Math.sin(agora * 0.008) * 0.15 + 0.85;
            const gradFogo = ctx.createRadialGradient(0, 0, 5, 0, 0, cr.raio * 0.9);
            gradFogo.addColorStop(0, `rgba(254, 240, 138, ${0.60 * alphaFade * pulso})`);
            gradFogo.addColorStop(0.4, `rgba(249, 115, 22, ${0.40 * alphaFade * pulso})`);
            gradFogo.addColorStop(0.85, `rgba(185, 28, 28, ${0.25 * alphaFade * pulso})`);
            gradFogo.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = gradFogo;
            ctx.fill();

            // Rochas partidas ao redor
            ctx.fillStyle = `rgba(40, 25, 20, ${0.9 * alphaFade})`;
            for (let r of cr.rochas) {
                ctx.beginPath();
                ctx.arc(r.x, r.y, r.tam, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }

        // ---------------------------------------------------------------------
        // B) METEOROS DA CHUVA QUÍNTUPLA / TEMPESTADE CELESTE
        // ---------------------------------------------------------------------
        for (let i = window.vfxMagoMeteorosChuva.length - 1; i >= 0; i--) {
            const m = window.vfxMagoMeteorosChuva[i];
            m.progresso += m.velocidade;

            const curX = m.startX + (m.targetX - m.startX) * m.progresso;
            const curY = m.startY + (m.targetY - m.startY) * m.progresso;
            const angQueda = Math.atan2(m.targetY - m.startY, m.targetX - m.startX);
            m.rot = (m.rot || 0) + (m.rotVel || 2.0) * delta;

            m.rastro.push({ x: curX, y: curY, alpha: 1.0, tam: m.isGrande ? 22 : 15 });
            if (m.rastro.length > 18) m.rastro.shift();

            ctx.save();

            // 1. Rastro incandescente em camadas com plasma e fumaça
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            for (let idx = 0; idx < m.rastro.length; idx++) {
                const r = m.rastro[idx];
                const fracRastro = (idx + 1) / m.rastro.length;
                const rAlpha = fracRastro * 0.85;

                // Fogo exterior laranja/vermelho
                ctx.beginPath();
                ctx.arc(r.x + (Math.random() * 4 - 2), r.y + (Math.random() * 4 - 2), r.tam * (0.4 + fracRastro * 0.7), 0, Math.PI * 2);
                ctx.fillStyle = `rgba(249, 115, 22, ${rAlpha * 0.6})`;
                ctx.shadowColor = '#f97316';
                ctx.shadowBlur = 12;
                ctx.fill();

                // Núcleo brilhante incandescente
                ctx.beginPath();
                ctx.arc(r.x, r.y, r.tam * 0.35 * fracRastro, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(254, 240, 138, ${rAlpha * 0.9})`;
                ctx.fill();
            }
            ctx.restore();

            // 2. Cabeça do Meteoro com Textura de Rocha Basáltica e Magma
            ctx.save();
            ctx.translate(curX, curY);

            // Halo térmico atmosférico
            const raioCabeca = m.isGrande ? 26 : 17;
            const haloGrad = ctx.createRadialGradient(0, 0, raioCabeca * 0.2, 0, 0, raioCabeca * 1.8);
            haloGrad.addColorStop(0, '#ffffff');
            haloGrad.addColorStop(0.3, '#fef08a');
            haloGrad.addColorStop(0.65, '#f97316');
            haloGrad.addColorStop(1, 'rgba(185, 28, 28, 0)');
            ctx.fillStyle = haloGrad;
            ctx.beginPath();
            ctx.arc(0, 0, raioCabeca * 1.8, 0, Math.PI * 2);
            ctx.fill();

            // Arco de choque de compressão frontal na direção do impacto
            ctx.save();
            ctx.rotate(angQueda);
            ctx.beginPath();
            ctx.arc(0, 0, raioCabeca * 1.25, -Math.PI * 0.45, Math.PI * 0.45);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3.5;
            ctx.shadowColor = '#fde047';
            ctx.shadowBlur = 14;
            ctx.stroke();
            ctx.restore();

            // Corpo rochoso irregular com fendas de lava
            ctx.save();
            ctx.rotate(m.rot);
            const verts = m.rockVertices || [1.0, 0.85, 1.15, 0.9, 1.2, 0.8, 1.1, 0.95];
            ctx.beginPath();
            for (let vIdx = 0; vIdx < verts.length; vIdx++) {
                const vAng = (Math.PI * 2 / verts.length) * vIdx;
                const vR = raioCabeca * verts[vIdx];
                const vx = Math.cos(vAng) * vR;
                const vy = Math.sin(vAng) * vR;
                if (vIdx === 0) ctx.moveTo(vx, vy);
                else ctx.lineTo(vx, vy);
            }
            ctx.closePath();

            // Gradiente de rocha de basalto vulcanizada
            const rockGrad = ctx.createLinearGradient(-raioCabeca, -raioCabeca, raioCabeca, raioCabeca);
            rockGrad.addColorStop(0, '#3a1f14');
            rockGrad.addColorStop(0.5, '#20120c');
            rockGrad.addColorStop(1, '#0e0704');
            ctx.fillStyle = rockGrad;
            ctx.fill();

            // Fissuras de magma cortando a rocha
            ctx.strokeStyle = '#ff6b00';
            ctx.lineWidth = 2.0;
            ctx.beginPath();
            ctx.moveTo(-raioCabeca * 0.6, -raioCabeca * 0.2);
            ctx.lineTo(raioCabeca * 0.1, raioCabeca * 0.1);
            ctx.lineTo(raioCabeca * 0.7, -raioCabeca * 0.3);
            ctx.moveTo(-raioCabeca * 0.2, raioCabeca * 0.6);
            ctx.lineTo(raioCabeca * 0.1, raioCabeca * 0.1);
            ctx.stroke();

            // Núcleo das fissuras em ouro superaquecido
            ctx.strokeStyle = '#fef08a';
            ctx.lineWidth = 1.0;
            ctx.stroke();

            ctx.restore(); // fim rotação rocha
            ctx.restore(); // fim translação
            ctx.restore(); // fim contexto

            // Impacto com o solo
            if (m.progresso >= 1) {
                m.impactado = true;
                window.tremorTela = Math.max(window.tremorTela || 0, m.shake || 12);

                if (typeof window.tocarSonoroProximidade === 'function') {
                    window.tocarSonoroProximidade('mago_meteoro_impacto', m.targetX, m.targetY);
                } else if (typeof window.tocarSomImpactoMeteoro === 'function') {
                    window.tocarSomImpactoMeteoro();
                }

                // Cria fumaça e faíscas de impacto
                if (typeof window.criarExplosaoSimples === 'function') {
                    window.criarExplosaoSimples(m.targetX, m.targetY, m.isGrande ? 60 : 35);
                }

                // RESTAURA O CHÃO EM CHAMAS ORIGINAL COM CHAMAS DANÇANTES E BRASAS (5s)
                criarChaoEmChamasUpgrade(m.targetX, m.targetY, 300, m.isGrande ? 1.3 : 1.0);

                window.vfxMagoMeteorosChuva.splice(i, 1);
            }
        }

        // ---------------------------------------------------------------------
        // C) COMETA DO CATACLISMO ANCESTRAL (GIGANTE, DESCIDA LENTA)
        // ---------------------------------------------------------------------
        for (let i = window.vfxMagoCometas.length - 1; i >= 0; i--) {
            const c = window.vfxMagoCometas[i];
            c.progresso += c.velocidade;

            const curX = c.startX + (c.targetX - c.startX) * c.progresso;
            const curY = c.startY + (c.targetY - c.startY) * c.progresso;
            const angCometa = Math.atan2(c.targetY - c.startY, c.targetX - c.startX);
            c.rot = (c.rot || 0) + (c.rotVel || 0.85) * delta;

            c.rastro.push({ x: curX, y: curY, alpha: 1.0, tam: 54 });
            if (c.rastro.length > 28) c.rastro.shift();

            ctx.save();

            // 1. Rastro colossal de chamas em camadas
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            for (let idx = 0; idx < c.rastro.length; idx++) {
                const r = c.rastro[idx];
                const fracR = (idx + 1) / c.rastro.length;
                const rAlpha = fracR * 0.85;

                // Fogo exterior escarlate
                ctx.beginPath();
                ctx.arc(r.x + (Math.random() * 10 - 5), r.y + (Math.random() * 10 - 5), r.tam * (0.35 + fracR * 0.75), 0, Math.PI * 2);
                ctx.fillStyle = `rgba(239, 68, 68, ${rAlpha * 0.55})`;
                ctx.shadowColor = '#dc2626';
                ctx.shadowBlur = 24;
                ctx.fill();

                // Fogo de plasma médio laranja
                ctx.beginPath();
                ctx.arc(r.x + (Math.random() * 6 - 3), r.y + (Math.random() * 6 - 3), r.tam * 0.6 * fracR, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(249, 115, 22, ${rAlpha * 0.75})`;
                ctx.fill();

                // Núcleo branco-dourado
                ctx.beginPath();
                ctx.arc(r.x, r.y, r.tam * 0.25 * fracR, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 253, 235, ${rAlpha * 0.95})`;
                ctx.fill();
            }
            ctx.restore();

            // 2. Indicador no solo pulsante com runa de impacto e calor
            const distanciaSolo = Math.max(0, 1 - c.progresso);
            const escalaSolo = 1 - distanciaSolo * 0.4;
            ctx.save();
            ctx.translate(c.targetX, c.targetY);

            // Círculo de calor no chão
            const craterGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, c.raioImpacto * escalaSolo);
            craterGrad.addColorStop(0, `rgba(254, 240, 138, ${0.45 * (1 - distanciaSolo)})`);
            craterGrad.addColorStop(0.5, `rgba(249, 115, 22, ${0.35 * (1 - distanciaSolo)})`);
            craterGrad.addColorStop(1, 'rgba(185, 28, 28, 0)');
            ctx.fillStyle = craterGrad;
            ctx.beginPath();
            ctx.ellipse(0, 0, c.raioImpacto * escalaSolo, c.raioImpacto * 0.45 * escalaSolo, 0, 0, Math.PI * 2);
            ctx.fill();

            // Anel de advertência do solo
            ctx.beginPath();
            ctx.ellipse(0, 0, c.raioImpacto * escalaSolo, c.raioImpacto * 0.45 * escalaSolo, 0, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(239, 68, 68, ${0.5 + (1 - distanciaSolo) * 0.5})`;
            ctx.lineWidth = 3.5;
            ctx.shadowColor = '#f97316';
            ctx.shadowBlur = 16;
            ctx.stroke();
            ctx.restore();

            // 3. Cabeça Colossal do Cometa com Textura de Asteroide
            ctx.save();
            ctx.translate(curX, curY);

            // Halo expansivo de plasma
            const raioCometa = 48;
            const cometaGrad = ctx.createRadialGradient(0, 0, 8, 0, 0, raioCometa * 1.9);
            cometaGrad.addColorStop(0, '#ffffff');
            cometaGrad.addColorStop(0.2, '#fef08a');
            cometaGrad.addColorStop(0.5, '#f97316');
            cometaGrad.addColorStop(0.85, '#dc2626');
            cometaGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = cometaGrad;
            ctx.beginPath();
            ctx.arc(0, 0, raioCometa * 1.9, 0, Math.PI * 2);
            ctx.fill();

            // Duplo arco de choque supersônico frontal
            ctx.save();
            ctx.rotate(angCometa);
            ctx.beginPath();
            ctx.arc(0, 0, raioCometa * 1.35, -Math.PI * 0.48, Math.PI * 0.48);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 5;
            ctx.shadowColor = '#fef08a';
            ctx.shadowBlur = 25;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(0, 0, raioCometa * 1.6, -Math.PI * 0.35, Math.PI * 0.35);
            ctx.strokeStyle = 'rgba(254, 240, 138, 0.75)';
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.restore();

            // Asteroide com placas de basalto e fendas de lava
            ctx.save();
            ctx.rotate(c.rot);
            const cVerts = c.cometVertices || [1.0, 0.85, 1.15, 0.9, 1.2, 0.8, 1.1, 0.95, 1.18, 0.86, 1.05, 0.92];
            ctx.beginPath();
            for (let cvIdx = 0; cvIdx < cVerts.length; cvIdx++) {
                const cvAng = (Math.PI * 2 / cVerts.length) * cvIdx;
                const cvR = raioCometa * cVerts[cvIdx];
                const cvx = Math.cos(cvAng) * cvR;
                const cvy = Math.sin(cvAng) * cvR;
                if (cvIdx === 0) ctx.moveTo(cvx, cvy);
                else ctx.lineTo(cvx, cvy);
            }
            ctx.closePath();

            // Textura da rocha do cometa
            const comGrad = ctx.createLinearGradient(-raioCometa, -raioCometa, raioCometa, raioCometa);
            comGrad.addColorStop(0, '#422416');
            comGrad.addColorStop(0.4, '#24130b');
            comGrad.addColorStop(0.8, '#140804');
            comGrad.addColorStop(1, '#050201');
            ctx.fillStyle = comGrad;
            ctx.fill();

            // Fendas tectônicas incandescentes na rocha do cometa
            ctx.strokeStyle = '#f97316';
            ctx.lineWidth = 3.0;
            ctx.beginPath();
            ctx.moveTo(-raioCometa * 0.7, -raioCometa * 0.3);
            ctx.lineTo(-raioCometa * 0.1, -raioCometa * 0.1);
            ctx.lineTo(raioCometa * 0.5, -raioCometa * 0.4);
            ctx.moveTo(-raioCometa * 0.3, raioCometa * 0.6);
            ctx.lineTo(-raioCometa * 0.1, -raioCometa * 0.1);
            ctx.lineTo(raioCometa * 0.6, raioCometa * 0.3);
            ctx.stroke();

            // Núcleo das fendas em ouro líquido
            ctx.strokeStyle = '#fef08a';
            ctx.lineWidth = 1.6;
            ctx.stroke();

            ctx.restore(); // fim rotação asteroide
            ctx.restore(); // fim translação
            ctx.restore(); // fim contexto

            // Colisão do Cometa Gigante
            if (c.progresso >= 1) {
                window.tremorTela = 28; // TREMOR MÁXIMO
                if (typeof window.tocarSonoroProximidade === 'function') {
                    window.tocarSonoroProximidade('mago_meteoro_impacto', c.targetX, c.targetY);
                } else if (typeof window.tocarSomImpactoMeteoro === 'function') {
                    window.tocarSomImpactoMeteoro();
                }

                // Gera pedras projetadas para todas as direções
                const rochasFixas = [];
                for (let r = 0; r < 14; r++) {
                    const ang = Math.random() * Math.PI * 2;
                    const dist = Math.random() * (c.raioImpacto * 0.85) + 20;
                    rochasFixas.push({ x: Math.cos(ang) * dist, y: Math.sin(ang) * dist * 0.45, tam: Math.random() * 8 + 5 });
                }

                // Registra Cratera com queima no chão por 10 segundos
                window.vfxMagoCrateras.push({
                    x: c.targetX,
                    y: c.targetY,
                    raio: c.raioImpacto,
                    duracao: c.duracaoChamas || 10000,
                    tempoCriacao: performance.now(),
                    rochas: rochasFixas
                });

                // RESTAURA O CHÃO EM CHAMAS ORIGINAL EM ESCALA COLOSSAL POR 10 SEGUNDOS (600 frames)
                criarChaoEmChamasUpgrade(c.targetX, c.targetY, 600, 2.4);

                // Detonação de estilhaços voadores
                criarDesfragmentacaoFogo(c.targetX, c.targetY, 16);
                if (typeof window.criarExplosaoSimples === 'function') {
                    window.criarExplosaoSimples(c.targetX, c.targetY, 120);
                }

                window.vfxMagoCometas.splice(i, 1);
            }
        }

        // ---------------------------------------------------------------------
        // D) PROJÉTEIS DE BOLA DE FOGO & RASTRO DE CHAMAS
        // ---------------------------------------------------------------------
        for (let i = window.vfxMagoBolasFogoProjeteis.length - 1; i >= 0; i--) {
            const bf = window.vfxMagoBolasFogoProjeteis[i];
            bf.x += Math.cos(bf.ang) * bf.speed;
            bf.y += Math.sin(bf.ang) * bf.speed;
            bf.distPercorrida += bf.speed;

            // Rastro de fogo no chão
            bf.rastro.push({ x: bf.x, y: bf.y, alpha: 1.0 });
            if (bf.rastro.length > 10) bf.rastro.shift();

            ctx.save();
            for (let r of bf.rastro) {
                r.alpha -= 0.1;
                if (r.alpha > 0) {
                    ctx.beginPath();
                    ctx.arc(r.x, r.y, 14 * r.alpha, 0, Math.PI * 2);
                    ctx.fillStyle = bf.tipoElemento === 'gelo'
                        ? `rgba(56, 189, 248, ${r.alpha * 0.7})`
                        : `rgba(249, 115, 22, ${r.alpha * 0.7})`;
                    ctx.fill();
                }
            }

            // Projétil
            const isGelo = bf.tipoElemento === 'gelo';
            const gradBf = ctx.createRadialGradient(bf.x, bf.y, 2, bf.x, bf.y, 18);
            if (isGelo) {
                gradBf.addColorStop(0, '#ffffff');
                gradBf.addColorStop(0.4, '#38bdf8');
                gradBf.addColorStop(1, 'rgba(2, 132, 199, 0)');
            } else {
                gradBf.addColorStop(0, '#fff3b0');
                gradBf.addColorStop(0.4, '#f97316');
                gradBf.addColorStop(1, 'rgba(239, 68, 68, 0)');
            }
            ctx.beginPath();
            ctx.arc(bf.x, bf.y, 18, 0, Math.PI * 2);
            ctx.fillStyle = gradBf;
            ctx.shadowColor = isGelo ? '#38bdf8' : '#f97316';
            ctx.shadowBlur = 16;
            ctx.fill();
            ctx.restore();

            if (bf.distPercorrida >= bf.distTotal) {
                window.vfxMagoBolasFogoProjeteis.splice(i, 1);
            }
        }

        // ---------------------------------------------------------------------
        // E) METAMORFOSE ELEMENTAL: MAGO COMO BOLA DE FOGO VIVA (B4)
        // ---------------------------------------------------------------------
        const renderizarFormaIgnea = function (posX, posY) {
            ctx.save();
            ctx.translate(posX + 12, posY + 16);

            const tempo = agora * 0.006;
            // Halo térmico
            const haloGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 36);
            haloGrad.addColorStop(0, 'rgba(255, 243, 176, 0.95)');
            haloGrad.addColorStop(0.4, 'rgba(249, 115, 22, 0.80)');
            haloGrad.addColorStop(0.85, 'rgba(220, 38, 38, 0.45)');
            haloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = haloGrad;
            ctx.beginPath();
            ctx.arc(0, 0, 36, 0, Math.PI * 2);
            ctx.fill();

            // Brasas orbitais giratórias
            for (let b = 0; b < 6; b++) {
                const bAng = tempo * 2 + (b * Math.PI / 3);
                const bDist = 24 + Math.sin(tempo * 3 + b) * 5;
                ctx.beginPath();
                ctx.arc(Math.cos(bAng) * bDist, Math.sin(bAng) * bDist, 4, 0, Math.PI * 2);
                ctx.fillStyle = '#fef08a';
                ctx.shadowColor = '#f59e0b';
                ctx.shadowBlur = 8;
                ctx.fill();
            }

            ctx.restore();
        };

        if (window.vfxMagoFormaIgnea && window.vfxMagoFormaIgnea.ativo) {
            if (Date.now() > window.vfxMagoFormaIgnea.expiraEm) {
                window.vfxMagoFormaIgnea.ativo = false;
            } else {
                renderizarFormaIgnea(window.meuX || 0, window.meuY || 0);
            }
        }

        for (let jId in window.vfxMagoFormasIgneasJogadores) {
            const fi = window.vfxMagoFormasIgneasJogadores[jId];
            if (Date.now() > fi.expiraEm) {
                delete window.vfxMagoFormasIgneasJogadores[jId];
            } else if (window.todosJogadores && window.todosJogadores[jId]) {
                const pj = window.todosJogadores[jId];
                renderizarFormaIgnea(pj.x, pj.y);
            }
        }

        // ---------------------------------------------------------------------
        // F) AURA AZUL NOS PÉS DO MAGO (1, 2 OU 3 CAMADAS CONCÊNTRICAS)
        // ---------------------------------------------------------------------
        for (let aId in window.vfxMagoAurasGeloPes) {
            const aura = window.vfxMagoAurasGeloPes[aId];
            if (Date.now() > aura.expiresAt) {
                delete window.vfxMagoAurasGeloPes[aId];
                continue;
            }

            let ax = 0, ay = 0;
            if (aId === window.meuId) {
                ax = (window.meuX || 0) + 12;
                ay = (window.meuY || 0) + 26;
            } else if (window.todosJogadores && window.todosJogadores[aId]) {
                const p = window.todosJogadores[aId];
                ax = p.x + 12;
                ay = p.y + 26;
            } else continue;

            ctx.save();
            ctx.translate(ax, ay);

            const tempoRot = agora * 0.002;
            const stacks = aura.stacks || 1;

            for (let s = 1; s <= stacks; s++) {
                const raioAura = 14 + s * 10;
                const dir = (s % 2 === 0) ? -1 : 1;
                const rot = tempoRot * dir * (0.8 + s * 0.3);

                ctx.save();
                ctx.rotate(rot);

                ctx.beginPath();
                ctx.ellipse(0, 0, raioAura, raioAura * 0.45, 0, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(56, 189, 248, ${0.45 + s * 0.15})`;
                ctx.lineWidth = 1.8;
                ctx.shadowColor = '#38bdf8';
                ctx.shadowBlur = 8;
                ctx.stroke();

                // Runas e pontas de cristal de gelo
                for (let k = 0; k < 4; k++) {
                    const kAng = (Math.PI / 2) * k;
                    const kx = Math.cos(kAng) * raioAura;
                    const ky = Math.sin(kAng) * (raioAura * 0.45);
                    ctx.beginPath();
                    ctx.arc(kx, ky, 2.5, 0, Math.PI * 2);
                    ctx.fillStyle = '#e0f2fe';
                    ctx.fill();
                }

                ctx.restore();
            }

            ctx.restore();
        }

        // ---------------------------------------------------------------------
        // G) PROJÉTEIS DE ATAQUE BÁSICO GÉLIDO (FRAGMENTO DE GELO)
        // ---------------------------------------------------------------------
        for (let i = window.vfxMagoProjeteisGelo.length - 1; i >= 0; i--) {
            const pg = window.vfxMagoProjeteisGelo[i];
            pg.x += Math.cos(pg.ang) * pg.speed;
            pg.y += Math.sin(pg.ang) * pg.speed;
            pg.distRestante -= pg.speed;

            ctx.save();
            ctx.translate(pg.x, pg.y);
            ctx.rotate(pg.ang);

            // Fragmento de gelo pontiagudo em forma de diamante/cristal
            ctx.beginPath();
            ctx.moveTo(12, 0);
            ctx.lineTo(-4, -4);
            ctx.lineTo(-8, 0);
            ctx.lineTo(-4, 4);
            ctx.closePath();
            ctx.fillStyle = '#e0f2fe';
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 12;
            ctx.fill();
            ctx.strokeStyle = '#0284c7';
            ctx.lineWidth = 1.2;
            ctx.stroke();

            ctx.restore();

            if (pg.distRestante <= 0) {
                window.vfxMagoProjeteisGelo.splice(i, 1);
            }
        }

        // ---------------------------------------------------------------------
        // H) ESTACAS DE GELO GLACIAIS NO SOLO
        // ---------------------------------------------------------------------
        for (let i = window.vfxMagoEstacasGelo.length - 1; i >= 0; i--) {
            const eg = window.vfxMagoEstacasGelo[i];
            const decorrido = agora - eg.tempoCriacao;
            if (decorrido >= eg.duracao) {
                window.vfxMagoEstacasGelo.splice(i, 1);
                continue;
            }

            for (let est of eg.estacas) {
                if (est.escala < 1.0) est.escala = Math.min(1.0, est.escala + delta * 2.5);

                ctx.save();
                ctx.translate(est.x, est.y);

                // Estaca de gelo cristalina subindo
                const alt = est.altura * est.escala;
                ctx.beginPath();
                ctx.moveTo(0, -alt);
                ctx.lineTo(6 * est.escala, 0);
                ctx.lineTo(-6 * est.escala, 0);
                ctx.closePath();

                const gradEstaca = ctx.createLinearGradient(0, -alt, 0, 0);
                gradEstaca.addColorStop(0, '#ffffff');
                gradEstaca.addColorStop(0.5, '#bae6fd');
                gradEstaca.addColorStop(1, 'rgba(2, 132, 199, 0.7)');
                ctx.fillStyle = gradEstaca;
                ctx.shadowColor = '#38bdf8';
                ctx.shadowBlur = 8;
                ctx.fill();

                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1;
                ctx.stroke();

                ctx.restore();
            }
        }

        // ---------------------------------------------------------------------
        // I) TORNADO DE FOGO & MINI-TORNADOS PERSEGUIDORES
        // ---------------------------------------------------------------------
        for (let i = window.vfxMagoTornadosFogo.length - 1; i >= 0; i--) {
            const tf = window.vfxMagoTornadosFogo[i];
            const decorrido = agora - tf.tempoInicio;
            if (decorrido >= tf.duracao) {
                window.vfxMagoTornadosFogo.splice(i, 1);
                continue;
            }

            // Alpha suave de entrada e saída
            let alphaTornado = 1.0;
            if (decorrido < 500) alphaTornado = decorrido / 500;
            else if (decorrido > tf.duracao - 1500) alphaTornado = Math.max(0, (tf.duracao - decorrido) / 1500);

            // Tier 4 B: Crescente — aumenta o cone e a força
            const crescProg = tf.crescente ? Math.min(1.0, decorrido / tf.duracao) : 0;
            const escalaCrescente = 1.0 + crescProg * 0.85;
            tf.raioAtual = tf.raioBase * escalaCrescente;

            // Tier 4 B: Perseguidor — persegue ativamente o monstro/boss mais próximo
            if (tf.perseguidor) {
                let alvoProximo = null;
                let menorDist = 380;
                const slimes = window.listaSlimes || [];
                for (let s of slimes) {
                    if (s.hp > 0) {
                        const d = Math.hypot(s.x - tf.x, s.y - tf.y);
                        if (d < menorDist) { menorDist = d; alvoProximo = s; }
                    }
                }
                const bosses = window.listaBosses || [];
                for (let b of bosses) {
                    if (b.hp > 0) {
                        const d = Math.hypot(b.x - tf.x, b.y - tf.y);
                        if (d < menorDist) { menorDist = d; alvoProximo = b; }
                    }
                }
                if (alvoProximo) {
                    const angA = Math.atan2(alvoProximo.y - tf.y, alvoProximo.x - tf.x);
                    tf.x += Math.cos(angA) * 2.8;
                    tf.y += Math.sin(angA) * 2.8;
                }
            }

            ctx.save();
            ctx.globalAlpha = alphaTornado;

            const t = agora * 0.001;
            const alturaCone = 145 * escalaCrescente;
            const raioBase = (tf.raioAtual * 0.36);

            // 1. Sombra térmica e vórtice incandescente no solo (como no deserto)
            const gradSombra = ctx.createRadialGradient(tf.x, tf.y, 4, tf.x, tf.y, tf.raioAtual * 0.75);
            gradSombra.addColorStop(0, 'rgba(255, 230, 100, 0.55)');
            gradSombra.addColorStop(0.3, 'rgba(249, 115, 22, 0.45)');
            gradSombra.addColorStop(0.7, 'rgba(120, 20, 5, 0.32)');
            gradSombra.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = gradSombra;
            ctx.beginPath();
            ctx.ellipse(tf.x, tf.y, tf.raioAtual * 0.85, tf.raioAtual * 0.38, 0, 0, Math.PI * 2);
            ctx.fill();

            // 2. Camadas concêntricas do cone do tornado (técnica idêntica à do Bioma do Deserto)
            const numCamadas = 12;
            const velGiro = 8.5;
            for (let c = 0; c < numCamadas; c++) {
                const frac = c / (numCamadas - 1);
                const altCamada = tf.y - frac * alturaCone;
                const raioCamada = raioBase * (0.35 + frac * 1.55);
                const wobble = Math.sin(t * 6.5 + frac * 4.2 + i) * (4 + frac * 11);
                const rotCamada = t * velGiro * (1.3 - frac * 0.4) + frac * Math.PI * 0.8;

                ctx.save();
                ctx.translate(tf.x + wobble, altCamada);
                ctx.rotate(rotCamada);

                const gradVento = ctx.createLinearGradient(-raioCamada, 0, raioCamada, 0);
                gradVento.addColorStop(0, 'rgba(255, 60, 0, 0.08)');
                gradVento.addColorStop(0.25, 'rgba(249, 115, 22, 0.48)');
                gradVento.addColorStop(0.5, 'rgba(254, 240, 138, 0.80)'); // Núcleo quente super brilhante
                gradVento.addColorStop(0.75, 'rgba(239, 68, 68, 0.48)');
                gradVento.addColorStop(1, 'rgba(185, 28, 28, 0.12)');

                ctx.fillStyle = gradVento;
                ctx.beginPath();
                ctx.ellipse(0, 0, raioCamada, raioCamada * 0.35, 0, 0, Math.PI * 2);
                ctx.fill();

                // Fios dinâmicos de vento/chama cortante
                ctx.strokeStyle = `rgba(255, 245, 180, ${0.45 - frac * 0.2})`;
                ctx.lineWidth = 1.8;
                ctx.stroke();

                ctx.restore();
            }

            // 3. Faíscas e brasas espiralando para cima no funil
            if (!tf.particulasFogo) {
                tf.particulasFogo = [];
                for (let p = 0; p < 22; p++) {
                    tf.particulasFogo.push({
                        hFrac: Math.random(),
                        ang: Math.random() * Math.PI * 2,
                        speed: Math.random() * 0.08 + 0.06,
                        vSubida: Math.random() * 0.35 + 0.25,
                        tam: Math.random() * 3.5 + 2
                    });
                }
            }
            for (let p of tf.particulasFogo) {
                p.hFrac += delta * p.vSubida;
                if (p.hFrac > 1) p.hFrac = 0;
                p.ang += p.speed;

                const altP = tf.y - p.hFrac * alturaCone;
                const rP = raioBase * (0.35 + p.hFrac * 1.55) * 1.05;
                const px = tf.x + Math.cos(p.ang) * rP;
                const py = altP + Math.sin(p.ang) * (rP * 0.35);

                ctx.fillStyle = (p.hFrac < 0.5) ? '#fef08a' : '#f97316';
                ctx.shadowColor = '#fbbf24';
                ctx.shadowBlur = 6;
                ctx.beginPath();
                ctx.arc(px, py, p.tam * (1 - p.hFrac * 0.5), 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }

        // Mini-tornados de fogo (Tier 3 B) — Mini dust devils com a física do deserto
        for (let i = window.vfxMagoMiniTornados.length - 1; i >= 0; i--) {
            const mt = window.vfxMagoMiniTornados[i];
            const decorrido = agora - mt.tempoInicio;
            if (decorrido >= mt.duracao) {
                window.vfxMagoMiniTornados.splice(i, 1);
                continue;
            }

            let alphaMini = 1.0;
            if (decorrido < 300) alphaMini = decorrido / 300;
            else if (decorrido > mt.duracao - 1000) alphaMini = Math.max(0, (mt.duracao - decorrido) / 1000);

            // Perseguição autônoma de inimigos
            let alvoM = null;
            let menorD = 320;
            const slimes = window.listaSlimes || [];
            for (let s of slimes) {
                if (s.hp > 0) {
                    const d = Math.hypot(s.x - mt.x, s.y - mt.y);
                    if (d < menorD) { menorD = d; alvoM = s; }
                }
            }
            const bosses = window.listaBosses || [];
            for (let b of bosses) {
                if (b.hp > 0) {
                    const d = Math.hypot(b.x - mt.x, b.y - mt.y);
                    if (d < menorD) { menorD = d; alvoM = b; }
                }
            }

            if (alvoM) {
                const angM = Math.atan2(alvoM.y - mt.y, alvoM.x - mt.x);
                mt.x += Math.cos(angM) * 3.6;
                mt.y += Math.sin(angM) * 3.6;
            } else {
                mt.x += mt.vx;
                mt.y += mt.vy;
            }

            ctx.save();
            ctx.globalAlpha = alphaMini;

            const tM = agora * 0.001;
            const alturaMini = 65;
            const raioMiniBase = 12;

            // Sombra e calor do mini tornado
            ctx.fillStyle = 'rgba(249, 115, 22, 0.28)';
            ctx.beginPath();
            ctx.ellipse(mt.x, mt.y, 22, 9, 0, 0, Math.PI * 2);
            ctx.fill();

            // Camadas concêntricas reduzidas do cone (7 camadas)
            const numCamadasMini = 7;
            for (let c = 0; c < numCamadasMini; c++) {
                const frac = c / (numCamadasMini - 1);
                const altC = mt.y - frac * alturaMini;
                const rC = raioMiniBase * (0.35 + frac * 1.5);
                const wobbleM = Math.sin(tM * 8.0 + frac * 4.5 + i) * (2 + frac * 5);
                const rotC = tM * 11.0 * (1.3 - frac * 0.4) + frac * Math.PI;

                ctx.save();
                ctx.translate(mt.x + wobbleM, altC);
                ctx.rotate(rotC);

                const gradMini = ctx.createLinearGradient(-rC, 0, rC, 0);
                gradMini.addColorStop(0, 'rgba(255, 60, 0, 0.10)');
                gradMini.addColorStop(0.3, 'rgba(249, 115, 22, 0.50)');
                gradMini.addColorStop(0.5, 'rgba(254, 240, 138, 0.75)');
                gradMini.addColorStop(0.7, 'rgba(239, 68, 68, 0.50)');
                gradMini.addColorStop(1, 'rgba(185, 28, 28, 0.12)');

                ctx.fillStyle = gradMini;
                ctx.beginPath();
                ctx.ellipse(0, 0, rC, rC * 0.35, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            ctx.restore();
        }

        // ---------------------------------------------------------------------
        // J1) VULCÃO: ZONA DE CALOR ENFRAQUECEDORA (A4) - ANEL VULCÂNICO REALISTA
        // ---------------------------------------------------------------------
        for (let i = window.vfxMagoZonasCalor.length - 1; i >= 0; i--) {
            const zc = window.vfxMagoZonasCalor[i];
            const decorrido = agora - zc.tempoInicio;
            if (decorrido >= zc.duracao) {
                window.vfxMagoZonasCalor.splice(i, 1);
                continue;
            }

            const alphaZ = Math.min(1.0, (zc.duracao - decorrido) / 1500);
            const pulsoZ = Math.sin(agora * 0.003) * 0.12 + 0.88;

            ctx.save();
            ctx.translate(zc.cx, zc.cy);

            // 1. Iluminação térmica difusa de alta temperatura no solo
            const gradZona = ctx.createRadialGradient(0, 0, zc.raio * 0.2, 0, 0, zc.raio);
            gradZona.addColorStop(0, `rgba(254, 240, 138, ${0.12 * alphaZ * pulsoZ})`);
            gradZona.addColorStop(0.45, `rgba(249, 115, 22, ${0.18 * alphaZ * pulsoZ})`);
            gradZona.addColorStop(0.85, `rgba(185, 28, 28, ${0.14 * alphaZ})`);
            gradZona.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = gradZona;
            ctx.beginPath();
            ctx.ellipse(0, 0, zc.raio, zc.raio * 0.52, 0, 0, Math.PI * 2);
            ctx.fill();

            // 2. Anel de terra calcinada e fendas térmicas no limite da zona
            ctx.strokeStyle = `rgba(249, 115, 22, ${0.45 * alphaZ * pulsoZ})`;
            ctx.lineWidth = 2.5;
            ctx.setLineDash([8, 6]);
            ctx.beginPath();
            ctx.ellipse(0, 0, zc.raio * 0.98, zc.raio * 0.52 * 0.98, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

            // 3. Fissuras radiais profundas de calor incandescente
            if (zc.fissuras) {
                ctx.lineWidth = 1.8;
                for (let f of zc.fissuras) {
                    ctx.beginPath();
                    ctx.moveTo(f.x1 - zc.cx, f.y1 - zc.cy);
                    ctx.lineTo(f.x2 - zc.cx, f.y2 - zc.cy);
                    ctx.strokeStyle = `rgba(254, 240, 138, ${0.55 * alphaZ * pulsoZ})`;
                    ctx.stroke();
                }
            }

            // 4. Cinzas e fagulhas vulcânicas subindo na atmosfera
            if (zc.cinzas) {
                for (let c of zc.cinzas) {
                    c.vida += delta * 0.35;
                    if (c.vida > 1) {
                        c.vida = 0;
                        c.x = zc.cx + (Math.random() - 0.5) * zc.raio * 1.8;
                        c.y = zc.cy + (Math.random() - 0.5) * zc.raio * 0.9;
                    }
                    const px = c.x - zc.cx + Math.sin(agora * 0.002 + c.wobbleOffset) * 6;
                    const py = c.y - zc.cy - c.vida * 45;
                    const cAlpha = (1 - c.vida) * alphaZ;
                    ctx.fillStyle = `rgba(255, 220, 120, ${cAlpha * 0.8})`;
                    ctx.beginPath();
                    ctx.arc(px, py, c.tam * (1 - c.vida * 0.4), 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            ctx.restore();
        }

        // ---------------------------------------------------------------------
        // J2) VULCÃO: TERRENO VULCÂNICO, FISSURAS E POÇAS DE MAGMA (A2)
        // ---------------------------------------------------------------------
        for (let i = window.vfxMagoPocasLava.length - 1; i >= 0; i--) {
            const pl = window.vfxMagoPocasLava[i];
            const decorrido = agora - pl.tempoInicio;
            if (decorrido >= pl.duracao) {
                window.vfxMagoPocasLava.splice(i, 1);
                continue;
            }

            const alpha = Math.min(1.0, (pl.duracao - decorrido) / 1500);
            const pulsoLava = Math.sin(agora * 0.004) * 0.15 + 0.85;

            // 1. Rede de Fissuras Tectônicas Interconectadas no Solo
            if (pl.fissuras) {
                for (let segs of pl.fissuras) {
                    if (segs.length < 2) continue;
                    ctx.save();
                    // Canal escavado na rocha
                    ctx.beginPath();
                    ctx.moveTo(segs[0].x, segs[0].y);
                    for (let s = 1; s < segs.length; s++) {
                        ctx.lineTo(segs[s].x, segs[s].y);
                    }
                    ctx.strokeStyle = `rgba(28, 14, 10, ${0.85 * alpha})`;
                    ctx.lineWidth = 5.0;
                    ctx.stroke();

                    // Rio de lava incandescente
                    ctx.strokeStyle = `rgba(234, 88, 12, ${0.85 * alpha * pulsoLava})`;
                    ctx.lineWidth = 2.8;
                    ctx.shadowColor = '#f97316';
                    ctx.shadowBlur = 8;
                    ctx.stroke();

                    // Núcleo superaquecido
                    ctx.strokeStyle = `rgba(254, 240, 138, ${0.9 * alpha * pulsoLava})`;
                    ctx.lineWidth = 1.2;
                    ctx.stroke();
                    ctx.restore();
                }
            }

            // 2. Poças Orgânicas de Lava Fervilhante com Crosta e Bolhas
            for (let poca of pl.pocas) {
                ctx.save();
                ctx.translate(poca.x, poca.y);

                // A) Margem de rocha basáltica calcinada ao redor da poça
                ctx.beginPath();
                for (let k = 0; k < poca.contorno.length; k++) {
                    const pt = poca.contorno[k];
                    if (k === 0) ctx.moveTo(pt.x * 1.25, pt.y * 1.25);
                    else ctx.lineTo(pt.x * 1.25, pt.y * 1.25);
                }
                ctx.closePath();
                ctx.fillStyle = `rgba(22, 12, 8, ${0.88 * alpha})`;
                ctx.fill();

                // B) Lago de Magma Líquido com gradiente térmico
                const gradPoca = ctx.createRadialGradient(0, 0, 2, 0, 0, poca.rBaseX);
                gradPoca.addColorStop(0, `rgba(255, 253, 235, ${0.95 * alpha})`);
                gradPoca.addColorStop(0.3, `rgba(254, 240, 138, ${0.90 * alpha * pulsoLava})`);
                gradPoca.addColorStop(0.65, `rgba(249, 115, 22, ${0.85 * alpha})`);
                gradPoca.addColorStop(0.9, `rgba(185, 28, 28, ${0.75 * alpha})`);
                gradPoca.addColorStop(1, `rgba(69, 26, 3, ${0.60 * alpha})`);

                ctx.beginPath();
                for (let k = 0; k < poca.contorno.length; k++) {
                    const pt = poca.contorno[k];
                    if (k === 0) ctx.moveTo(pt.x, pt.y);
                    else ctx.lineTo(pt.x, pt.y);
                }
                ctx.closePath();
                ctx.fillStyle = gradPoca;
                ctx.shadowColor = '#f97316';
                ctx.shadowBlur = 12;
                ctx.fill();

                // C) Borda incandescente de contato térmico
                ctx.strokeStyle = `rgba(254, 240, 138, ${0.75 * alpha * pulsoLava})`;
                ctx.lineWidth = 1.8;
                ctx.stroke();

                // D) Ilhas de crosta de basalto flutuando (células de convecção vulcânica)
                ctx.fillStyle = `rgba(45, 24, 16, ${0.92 * alpha})`;
                for (let ilha of poca.ilhas) {
                    ctx.save();
                    ctx.translate(ilha.ox, ilha.oy);
                    ctx.rotate(ilha.ang + agora * 0.0003);
                    ctx.beginPath();
                    ctx.ellipse(0, 0, ilha.tamX, ilha.tamY, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = `rgba(249, 115, 22, ${0.5 * alpha})`;
                    ctx.lineWidth = 1.0;
                    ctx.stroke();
                    ctx.restore();
                }

                // E) Bolhas de magma fervilhando e estourando
                for (let b of poca.bolhas) {
                    b.prog += b.vel;
                    if (b.prog > 1) {
                        b.prog = 0;
                        b.ox = (Math.random() - 0.5) * poca.rBaseX * 0.7;
                        b.oy = (Math.random() - 0.5) * poca.rBaseY * 0.7;
                    }
                    const bRaio = b.raio + (b.maxRaio - b.raio) * Math.sin(b.prog * Math.PI);
                    const bAlpha = Math.sin(b.prog * Math.PI) * alpha;

                    // Esfera incandescente da bolha
                    const gradBolha = ctx.createRadialGradient(b.ox - bRaio * 0.3, b.oy - bRaio * 0.3, 0.5, b.ox, b.oy, bRaio);
                    gradBolha.addColorStop(0, `rgba(255, 255, 255, ${bAlpha})`);
                    gradBolha.addColorStop(0.5, `rgba(254, 240, 138, ${bAlpha * 0.9})`);
                    gradBolha.addColorStop(1, `rgba(234, 88, 12, ${bAlpha * 0.8})`);
                    ctx.fillStyle = gradBolha;
                    ctx.beginPath();
                    ctx.arc(b.ox, b.oy, bRaio, 0, Math.PI * 2);
                    ctx.fill();
                }

                ctx.restore();
            }

            // 3. Brasas vulcânicas subindo ao redor da área de magma
            if (pl.brasas) {
                ctx.save();
                for (let br of pl.brasas) {
                    br.vida += delta * 0.45;
                    if (br.vida > 1) {
                        br.vida = 0;
                        br.x = pl.cx + (Math.random() - 0.5) * pl.raio * 1.5;
                        br.y = pl.cy + (Math.random() - 0.5) * pl.raio * 0.85;
                    }
                    const brX = br.x + Math.sin(agora * 0.003 + br.wobble) * 8;
                    const brY = br.y - br.vida * 50;
                    const brAlpha = (1 - br.vida) * alpha;

                    ctx.fillStyle = br.vida < 0.5 ? '#fef08a' : '#f97316';
                    ctx.shadowColor = '#f59e0b';
                    ctx.shadowBlur = 6;
                    ctx.beginPath();
                    ctx.arc(brX, brY, br.tam * (1 - br.vida * 0.5), 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            }
        }

        // Segundas explosões
        for (let i = window.vfxMagoExplosoesSecundarias.length - 1; i >= 0; i--) {
            const es = window.vfxMagoExplosoesSecundarias[i];
            es.raio += delta * 140;
            es.vida -= delta * 3.5;

            if (es.vida <= 0 || es.raio >= es.maxRaio) {
                window.vfxMagoExplosoesSecundarias.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.beginPath();
            ctx.arc(es.x, es.y, es.raio, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(254, 240, 138, ${es.vida})`;
            ctx.lineWidth = 3;
            ctx.shadowColor = '#f97316';
            ctx.shadowBlur = 10;
            ctx.stroke();
            ctx.restore();
        }

        // ---------------------------------------------------------------------
        // K) GOLEM DE FOGO & GELO DO MAGO (LACAIO)
        // ---------------------------------------------------------------------
        for (let gId in window.vfxMagoGolems) {
            const g = window.vfxMagoGolems[gId];
            const decorrido = agora - g.tempoInicio;
            if (decorrido >= g.duracao) {
                delete window.vfxMagoGolems[gId];
                continue;
            }

            // Segue o Mago
            let px = 0, py = 0;
            if (g.ownerId === window.meuId) {
                px = window.meuX || 0;
                py = window.meuY || 0;
            } else if (window.todosJogadores && window.todosJogadores[g.ownerId]) {
                const pj = window.todosJogadores[g.ownerId];
                px = pj.x; py = pj.y;
            }

            // Posição alvo: ombro esquerdo do Mago
            const alvoX = px - 35;
            const alvoY = py - 20;
            g.x += (alvoX - g.x) * 0.08;
            g.y += (alvoY - g.y) * 0.08;
            g.passo += delta * 4;

            ctx.save();
            ctx.translate(g.x, g.y);

            // Sombra
            ctx.beginPath();
            ctx.ellipse(0, 14, 16, 8, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.fill();

            // Animação de Rugido: recua e estremece se rugindo
            let offRugidoY = 0;
            if (g.rugindo) {
                g.rugindoTimer--;
                offRugidoY = -8;
                // Onda de choque sônica do rugido
                const raioRugido = (45 - g.rugindoTimer) * 4;
                ctx.save();
                ctx.beginPath();
                ctx.arc(0, -10, raioRugido, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255, 255, 255, ${g.rugindoTimer / 45})`;
                ctx.lineWidth = 3;
                ctx.stroke();
                ctx.restore();

                if (g.rugindoTimer <= 0) g.rugindo = false;
            }

            // Corpo de Pedra e Magma
            ctx.translate(0, offRugidoY);
            ctx.beginPath();
            ctx.arc(0, -8, 14, 0, Math.PI * 2);
            ctx.fillStyle = '#3f1f14'; // Rocha escura
            ctx.fill();
            ctx.strokeStyle = '#f97316'; // Fendas de magma
            ctx.lineWidth = 2;
            ctx.stroke();

            // Olhos brilhantes
            ctx.beginPath();
            ctx.arc(-4, -10, 2.5, 0, Math.PI * 2);
            ctx.arc(4, -10, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = '#fef08a';
            ctx.fill();

            // Mão Direita (Fogo)
            ctx.beginPath();
            ctx.arc(16, -4, 6, 0, Math.PI * 2);
            ctx.fillStyle = '#f97316';
            ctx.shadowColor = '#f97316';
            ctx.shadowBlur = 8;
            ctx.fill();

            // Mão Esquerda (Fogo ou Gelo Glacial se Tier 2+)
            ctx.beginPath();
            ctx.arc(-16, -4, 6, 0, Math.PI * 2);
            if (g.hasGeloHand) {
                ctx.fillStyle = '#38bdf8';
                ctx.shadowColor = '#38bdf8';
                ctx.shadowBlur = 10;
            } else {
                ctx.fillStyle = '#f97316';
                ctx.shadowColor = '#f97316';
                ctx.shadowBlur = 8;
            }
            ctx.fill();

            ctx.restore();
        }

        // ---------------------------------------------------------------------
        // L) SUPERNOVA & SINGULARIDADE DA BOLA ELEMENTAL
        // ---------------------------------------------------------------------
        for (let i = window.vfxMagoSupernovas.length - 1; i >= 0; i--) {
            const sn = window.vfxMagoSupernovas[i];
            sn.raio += delta * 240;
            sn.vida -= delta * 1.5;

            if (sn.vida <= 0 || sn.raio >= sn.maxRaio) {
                window.vfxMagoSupernovas.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.beginPath();
            ctx.arc(sn.x, sn.y, sn.raio, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 255, 255, ${sn.vida})`;
            ctx.lineWidth = 5;
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 25;
            ctx.stroke();

            // Halo expansivo de fogo e gelo
            const gradSn = ctx.createRadialGradient(sn.x, sn.y, 5, sn.x, sn.y, sn.raio);
            gradSn.addColorStop(0, `rgba(255, 255, 255, ${sn.vida * 0.9})`);
            gradSn.addColorStop(0.5, `rgba(56, 189, 248, ${sn.vida * 0.6})`);
            gradSn.addColorStop(0.85, `rgba(249, 115, 22, ${sn.vida * 0.4})`);
            gradSn.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = gradSn;
            ctx.fill();

            ctx.restore();
        }

        for (let i = window.vfxMagoSingularidades.length - 1; i >= 0; i--) {
            const sg = window.vfxMagoSingularidades[i];
            const decorrido = agora - sg.tempoInicio;
            if (decorrido >= sg.duracao) {
                window.vfxMagoSingularidades.splice(i, 1);
                continue;
            }

            sg.rotacao += delta * 6;

            ctx.save();
            ctx.translate(sg.x, sg.y);

            // Núcleo negro absoluto
            ctx.beginPath();
            ctx.arc(0, 0, 22, 0, Math.PI * 2);
            ctx.fillStyle = '#090514';
            ctx.shadowColor = '#a855f7';
            ctx.shadowBlur = 30;
            ctx.fill();

            // Espirais de acreção cósmica
            for (let sp = 0; sp < 4; sp++) {
                ctx.beginPath();
                ctx.arc(0, 0, 45 + sp * 18, sg.rotacao + sp * 1.5, sg.rotacao + sp * 1.5 + Math.PI);
                ctx.strokeStyle = `rgba(168, 85, 247, ${0.7 - sp * 0.15})`;
                ctx.lineWidth = 3;
                ctx.stroke();
            }

            ctx.restore();
        }

        // ---------------------------------------------------------------------
        // M) ATUALIZAÇÃO DA BARRA BRANCA DO ESCUDO DO MAGO NO HUD
        // ---------------------------------------------------------------------
        if (window.escudoMagoExpiraEm && Date.now() > window.escudoMagoExpiraEm) {
            window.escudoMagoValor = 0;
            window.escudoMagoExpiraEm = 0;
        }
        const shieldBar = document.getElementById('shield-mago-bar-fill');
        if (shieldBar) {
            if (window.escudoMagoValor && window.escudoMagoValor > 0 && window.meuMaxHp) {
                const pct = Math.min(100, (window.escudoMagoValor / window.meuMaxHp) * 100);
                shieldBar.style.width = pct + '%';
                shieldBar.style.display = 'block';
            } else {
                shieldBar.style.display = 'none';
            }
        }
    };

    console.log('✅ [VFX Mago Upgrades] Módulo carregado com sucesso.');
})();
