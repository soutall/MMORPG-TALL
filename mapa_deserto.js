// ============================================================================
// mapa_deserto.js — FASE 2: "Deserto com Oásis" (Bioma de Deserto Realista)
// Módulo isomórfico: roda no NAVEGADOR (window) e no SERVIDOR (module.exports).
//
//   • Fase 1 (mapa verde)  : x em [0, 18000)
//   • Fase 2 (deserto)     : x em [18000, 50000) × y em [0, 36000).
//   • Tile = 40px → COLS=800, ROWS=900.
//   • Alturas: 0=livre, 1=pequena (bloqueia entidades, projéteis passam),
//     2=média (bloqueia entidades E projéteis), 3=alta (bloqueia tudo).
// ============================================================================
(function (global) {
    'use strict';

    const TILE = 40;
    const DES_X0 = 18000;
    const DES_X1 = 50000;
    const DES_Y1 = 36000;
    const COLS = (DES_X1 - DES_X0) / TILE;   // 800
    const ROWS = DES_Y1 / TILE;              // 900

    const ALT_LIVRE = 0, ALT_PEQUENA = 1, ALT_MEDIA = 2, ALT_ALTA = 3;
    const TIPOS_ALT = {
        areia: 0,
        duna: 0,
        solo_rachado: 0,
        caminho: 0,
        areia_molhada: 0,
        flor: 0,
        agua: ALT_PEQUENA,
        palma: ALT_PEQUENA,
        cacto: ALT_PEQUENA,
        cacto_menor: ALT_PEQUENA,
        pedrag: ALT_PEQUENA,
        pedrap: ALT_PEQUENA,
        esqueleto: ALT_PEQUENA,
        tenda: ALT_MEDIA,
        ruina: ALT_MEDIA,
        mont: ALT_ALTA
    };

    // Vórtices espaciais (marcos visuais + teleporte) próximos à divisa
    const PORTA_VERDE = { x: 17080, y: 4500, r: 58, alvo: { x: 18080, y: 4500 } };
    const PORTA_DESERTO = { x: 18090, y: 4500, r: 58, alvo: { x: 17020, y: 4500 } };
    const BORDA_ESTE = 17980;   // verde: cruzou a leste -> deserto
    const BORDA_OESTE = 18020;  // deserto: cruzou a oeste -> verde

    // Desfiladeiro leste (acesso ao Pântano)
    const GATE_L0 = 200;   // y 8000
    const GATE_L1 = 215;   // y 8600
    const ALVO_PANTANO = { x: 50080, y: 8300 };

    let grid = null;
    let sortables = [];
    let decor = [];
    let acampamentos = [];
    let esqueletos = [];
    let ruinasComplexas = [];

    // ---------- PRNG determinístico ----------
    function mulberry32(seed) {
        return function () {
            seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
            let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function hash2(a, b) {
        let n = (a * 374761393 + b * 668265263) | 0;
        n = Math.imul(n ^ (n >>> 13), 1274126177);
        return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
    }

    function ruidoDuna(c, l) {
        let s1 = Math.sin(c * 0.05 + l * 0.013 + 1.7);
        let s2 = Math.sin(c * 0.021 - l * 0.047 + 4.2);
        let s3 = Math.sin((c + l) * 0.011 + 0.6);
        return s1 * 0.55 + s2 * 0.30 + s3 * 0.15;
    }

    function marcar(c, l, tipo) {
        if (!grid[l] || !grid[l][c]) return;
        grid[l][c] = { tipo: tipo, alt: TIPOS_ALT[tipo] || 0 };
    }

    // ========================================================================
    // GERAÇÃO DO MAPA DO DESERTO
    // ========================================================================
    function gerarDeserto() {
        if (grid) return grid;

        grid = [];
        for (let l = 0; l < ROWS; l++) {
            grid[l] = [];
            for (let c = 0; c < COLS; c++) {
                grid[l][c] = { tipo: 'areia', alt: 0 };
            }
        }

        const rnd = mulberry32(20260925);

        // 1. Dunas onduladas e áreas de solo árido rachado
        for (let l = 0; l < ROWS; l++) {
            for (let c = 0; c < COLS; c++) {
                const rd = ruidoDuna(c, l);
                if (rd > 0.70) {
                    marcar(c, l, 'duna');
                } else if (rd < -0.65 && hash2(c, l) > 0.60) {
                    marcar(c, l, 'solo_rachado');
                }
            }
        }

        // 2. Caminhos batidos de caravanas
        // Estrada principal Oeste-Leste ligando o portal em y=4500 até a rota central
        for (let c = 0; c < 300; c++) {
            const desvY = Math.floor(Math.sin(c * 0.04) * 8);
            const lCentro = Math.floor(4500 / TILE) + desvY;
            for (let dl = -1; dl <= 1; dl++) {
                if (lCentro + dl >= 0 && lCentro + dl < ROWS) {
                    marcar(c, lCentro + dl, 'caminho');
                }
            }
        }

        // Rota ligando ao desfiladeiro leste (y ~ 8300)
        for (let c = 400; c < COLS; c++) {
            const desvY = Math.floor(Math.sin(c * 0.03) * 6);
            const lCentro = Math.floor(8300 / TILE) + desvY;
            for (let dl = -1; dl <= 1; dl++) {
                if (lCentro + dl >= 0 && lCentro + dl < ROWS) {
                    marcar(c, lCentro + dl, 'caminho');
                }
            }
        }

        // 3. Montanhas / "Espinhos" / Cânions: REMOVIDOS de todo o mapa do deserto conforme solicitação do usuário.
        // O deserto agora é 100% aberto, amplo e plano em suaves dunas de areia para movimentação fluida e visual limpo.

        // 4. Grandes Oásis de Águas Cristalinas Turquesa (5 Oásis espalhados pelo deserto)
        const oases = [
            { cx: 100, cy: 200, r: 8, nome: "Oásis do Poço Ocidental" },
            { cx: 405, cy: 560, r: 12, nome: "Grande Oásis Central de Davahl" },
            { cx: 625, cy: 130, r: 8, nome: "Oásis das Tamareiras do Norte" },
            { cx: 230, cy: 800, r: 7, nome: "Oásis das Dunas do Sul" },
            { cx: 510, cy: 350, r: 7, nome: "Oásis Escondido das Areias Rubras" }
        ];

        for (let k = 0; k < oases.length; k++) {
            const O = oases[k];
            for (let l = Math.max(0, Math.floor(O.cy - O.r - 4)); l <= Math.min(ROWS - 1, Math.ceil(O.cy + O.r + 4)); l++) {
                for (let c = Math.max(0, Math.floor(O.cx - O.r - 4)); c <= Math.min(COLS - 1, Math.ceil(O.cx + O.r + 4)); c++) {
                    const d = Math.hypot(c + 0.5 - O.cx, l + 0.5 - O.cy);
                    if (d <= O.r) {
                        marcar(c, l, 'agua');
                    } else if (d <= O.r + 1.6) {
                        marcar(c, l, 'areia_molhada');
                    }
                }
            }
        }

        // 5. Tamareiras frondosas contornando os oásis
        for (let k = 0; k < oases.length; k++) {
            const O = oases[k];
            for (let l = Math.max(0, Math.floor(O.cy - O.r - 4)); l <= Math.min(ROWS - 1, Math.ceil(O.cy + O.r + 4)); l++) {
                for (let c = Math.max(0, Math.floor(O.cx - O.r - 4)); c <= Math.min(COLS - 1, Math.ceil(O.cx + O.r + 4)); c++) {
                    if (grid[l][c].tipo !== 'areia' && grid[l][c].tipo !== 'areia_molhada') continue;
                    const d = Math.hypot(c + 0.5 - O.cx, l + 0.5 - O.cy);
                    if (d > O.r + 1.2 && d < O.r + 3.2 && hash2(c, l) > 0.45) {
                        marcar(c, l, 'palma');
                    }
                }
            }
        }

        // 6. Acampamentos Nômades Beduínos e Cabanas Próximo aos Lagos (12 assentamentos)
        acampamentos = [
            // A. Recepção da fronteira
            { x: 18700, y: 4520, nome: "Caravançarai da Fronteira", corTecido: '#e2cbab', corListra: '#9c4126' },

            // B. Lagos / Oásis 1 — Oásis do Poço Ocidental (cx: 100, cy: 200)
            { x: 22480, y: 8000, nome: "Feitoria Nômade do Poço Ocidental", corTecido: '#e2cbab', corListra: '#9c4126', corTapete: '#9b2226' },
            { x: 21600, y: 7640, nome: "Cabanas dos Pescadores do Oásis Ocidental", corTecido: '#d8caa8', corListra: '#1d7074', corTapete: '#0a9396' },

            // C. Lagos / Oásis 2 — Grande Oásis Central de Davahl (cx: 405, cy: 560)
            { x: 34200, y: 21740, nome: "Aldeia Real do Grande Oásis", corTecido: '#eedca5', corListra: '#6a1b9a', corTecidoM: '#f4e4bc', corListraM: '#d4af37', corTapete: '#581845' },
            { x: 34820, y: 22880, nome: "Acampamento dos Mercadores do Grande Oásis", corTecido: '#cfb997', corListra: '#2b506e', corTapete: '#1d3557' },
            { x: 33500, y: 22400, nome: "Refúgio Beduíno das Águas Centrais", corTecido: '#ded0b6', corListra: '#c55d38', corTapete: '#9b2226' },

            // D. Lagos / Oásis 3 — Oásis das Tamareiras do Norte (cx: 625, cy: 130)
            { x: 43480, y: 5200, nome: "Posto Nômade das Tamareiras do Norte", corTecido: '#e2cbab', corListra: '#2d5a3f', corTapete: '#2a9d8f' },
            { x: 43000, y: 5680, nome: "Cabana dos Coletores de Tâmaras", corTecido: '#d8caa8', corListra: '#b25d3a', corTapete: '#b25d3a' },

            // E. Lagos / Oásis 4 — Oásis das Dunas do Sul (cx: 230, cy: 800)
            { x: 27200, y: 31540, nome: "Acampamento Beduíno das Dunas do Sul", corTecido: '#cfb997', corListra: '#9c4126', corTapete: '#9b2226' },
            { x: 27640, y: 32000, nome: "Cabana do Vigia das Águas do Sul", corTecido: '#ded0b6', corListra: '#264653', corTapete: '#264653' },

            // F. Lagos / Oásis 5 — Oásis Escondido das Areias Rubras (cx: 510, cy: 350)
            { x: 38780, y: 13740, nome: "Feitoria do Oásis das Areias Rubras", corTecido: '#eedca5', corListra: '#b23a22', corTapete: '#c0392b' },

            // G. Garganta do Pântano no extremo leste
            { x: 48600, y: 8250, nome: "Acampamento Guardião da Garganta", corTecido: '#d8caa8', corListra: '#7f2a1d', corTapete: '#8b0000' }
        ];
        if (typeof window !== 'undefined') window.desertoAcampamentos = acampamentos;

        for (let i = 0; i < acampamentos.length; i++) {
            const acp = acampamentos[i];
            const acC = Math.floor((acp.x - DES_X0) / TILE);
            const acL = Math.floor(acp.y / TILE);
            for (let dl = -2; dl <= 2; dl++) {
                for (let dc = -2; dc <= 2; dc++) {
                    const tc = acC + dc;
                    const tl = acL + dl;
                    if (tl >= 0 && tl < ROWS && tc >= 0 && tc < COLS) {
                        // Não substitui a água do lago, preserva a margem natural!
                        if (grid[tl][tc].tipo !== 'agua') {
                            marcar(tc, tl, 'caminho');
                        }
                    }
                }
            }
            // Bloqueio das tendas no grid de colisão (apenas se for solo seco)
            if (grid[acL - 1] && grid[acL - 1][acC] && grid[acL - 1][acC].tipo !== 'agua') {
                marcar(acC, acL - 1, 'tenda');
            }
            if (grid[acL] && grid[acL][acC + 2] && grid[acL][acC + 2].tipo !== 'agua') {
                marcar(acC + 2, acL, 'tenda');
            }
        }

        // 7. Esqueletos e Ossadas de Feras Colossais
        esqueletos = [
            { x: 19600, y: 6200, tipo: 'cranio_gigante', ang: -0.2 },
            { x: 25400, y: 14200, tipo: 'costelas_gigantes', numCostelas: 6, ang: 0.1 },
            { x: 31200, y: 9400, tipo: 'ossada_dispersa' },
            { x: 37800, y: 18600, tipo: 'costelas_gigantes', numCostelas: 5, ang: -0.15 },
            { x: 41500, y: 28400, tipo: 'cranio_gigante', ang: 0.3 },
            { x: 46200, y: 12500, tipo: 'costelas_gigantes', numCostelas: 6, ang: 0.05 },
            { x: 28500, y: 31000, tipo: 'cranio_gigante', ang: -0.4 }
        ];

        for (let i = 0; i < esqueletos.length; i++) {
            const esq = esqueletos[i];
            const ec = Math.floor((esq.x - DES_X0) / TILE);
            const el = Math.floor(esq.y / TILE);
            if (grid[el] && grid[el][ec]) marcar(ec, el, 'esqueleto');
        }

        // 8. Ruínas Antigas de Arenito e Santuários do Sol
        ruinasComplexas = [
            { c: 220, l: 120, nome: "Templo do Sol Esquecido" },
            { c: 500, l: 700, nome: "Colunata das Areias Vermelhas" },
            { c: 120, l: 620, nome: "Santuário Antigo de Davahl" },
            { c: 700, l: 300, nome: "Arcos de Arenito de Khor" },
            { c: 350, l: 400, nome: "Obelisco Imperial Soterrado" }
        ];

        for (let k = 0; k < ruinasComplexas.length; k++) {
            const R = ruinasComplexas[k];
            for (let dy = -1; dy <= 2; dy++) {
                for (let dx = -1; dx <= 2; dx++) {
                    const c = R.c + dx, l = R.l + dy;
                    if (grid[l] && grid[l][c] && grid[l][c].tipo === 'areia') {
                        marcar(c, l, 'ruina');
                    }
                }
            }
        }

        // 9. Cactos Saguaros gigantes, cactos menores e pedras
        let cactosCount = 180;
        let cactosMenoresCount = 220;
        let pedrasGCount = 45;
        let pedrasPCount = 140;

        let tent = 0;
        while (cactosCount > 0 && tent < 15000) {
            tent++;
            let c = 4 + Math.floor(rnd() * (COLS - 8));
            let l = 4 + Math.floor(rnd() * (ROWS - 8));
            if (grid[l][c].tipo === 'areia' || grid[l][c].tipo === 'duna') {
                marcar(c, l, 'cacto');
                cactosCount--;
            }
        }

        tent = 0;
        while (cactosMenoresCount > 0 && tent < 15000) {
            tent++;
            let c = 3 + Math.floor(rnd() * (COLS - 6));
            let l = 3 + Math.floor(rnd() * (ROWS - 6));
            if (grid[l][c].tipo === 'areia' || grid[l][c].tipo === 'duna') {
                marcar(c, l, 'cacto_menor');
                cactosMenoresCount--;
            }
        }

        tent = 0;
        while (pedrasGCount > 0 && tent < 10000) {
            tent++;
            let c = 3 + Math.floor(rnd() * (COLS - 6));
            let l = 3 + Math.floor(rnd() * (ROWS - 6));
            if (grid[l][c].tipo === 'areia' || grid[l][c].tipo === 'duna') {
                marcar(c, l, 'pedrag');
                pedrasGCount--;
            }
        }

        tent = 0;
        while (pedrasPCount > 0 && tent < 10000) {
            tent++;
            let c = 2 + Math.floor(rnd() * (COLS - 4));
            let l = Math.floor(rnd() * ROWS);
            if (grid[l][c].tipo === 'areia') {
                marcar(c, l, 'pedrap');
                pedrasPCount--;
            }
        }

        // 10. Decoração leve de pedrinhas no chão
        decor = [];
        const nDecor = 1200;
        for (let i = 0; i < nDecor; i++) {
            let c = Math.floor(rnd() * COLS);
            let l = Math.floor(rnd() * ROWS);
            if (grid[l][c].tipo !== 'areia' && grid[l][c].tipo !== 'duna') continue;
            decor.push({
                x: DES_X0 + c * TILE + 5 + rnd() * (TILE - 10),
                y: l * TILE + 5 + rnd() * (TILE - 10),
                r: 1.5 + rnd() * 2,
                tonal: rnd()
            });
        }

        // 11. Compilação da lista de Sortables (Z-Sorting Real 2.5D)
        sortables = [];

        // Adiciona acampamentos nômades à lista de sortables
        for (let i = 0; i < acampamentos.length; i++) {
            const acp = acampamentos[i];
            sortables.push({
                tipo: 'acampamento_tenda_principal',
                x: acp.x,
                base: acp.y + 15,
                obj: acp
            });
            sortables.push({
                tipo: 'acampamento_tenda_mercador',
                x: acp.x + 95,
                base: acp.y + 25,
                obj: acp
            });
            sortables.push({
                tipo: 'acampamento_fogueira',
                x: acp.x + 35,
                base: acp.y + 70,
                obj: acp
            });
        }

        // Adiciona esqueletos e ossadas
        for (let i = 0; i < esqueletos.length; i++) {
            const esq = esqueletos[i];
            sortables.push({
                tipo: 'esqueleto',
                x: esq.x,
                base: esq.y,
                obj: esq
            });
        }

        // Adiciona elementos de grade (tamareiras, cactos, ruínas, pedras)
        for (let l = 0; l < ROWS; l++) {
            for (let c = 0; c < COLS; c++) {
                let tipo = grid[l][c].tipo;
                if (tipo !== 'palma' && tipo !== 'cacto' && tipo !== 'cacto_menor' && tipo !== 'ruina' && tipo !== 'pedrag' && tipo !== 'pedrap') {
                    continue;
                }
                const seedVal = hash2(c, l);
                sortables.push({
                    tipo: tipo,
                    c: c,
                    l: l,
                    x: DES_X0 + c * TILE + TILE / 2,
                    base: l * TILE + TILE,
                    seed: seedVal,
                    h: tipo === 'cacto' ? (85 + Math.floor(seedVal * 40)) : (110 + Math.floor(seedVal * 30)),
                    bracos: 1 + Math.floor(seedVal * 4)
                });
            }
        }

        return grid;
    }

    // ========================================================================
    // COLISÃO E CONSULTAS ISOMÓRFICAS (CLIENTE & SERVIDOR)
    // ========================================================================
    function isDeserto(x, y) { return x >= DES_X0 && x < DES_X1; }

    function alvoEmDeserto(x, y) {
        if (x < DES_X0 || x >= DES_X1) return null;
        let c = Math.floor((x - DES_X0) / TILE);
        let l = Math.floor(y / TILE);
        if (c < 0 || c >= COLS || l < 0 || l >= ROWS) return null;
        return grid[l][c];
    }

    function alcanceAltura(x, y, minimo, raio) {
        let amostras = [[0, 0], [raio, 0], [-raio, 0], [0, raio], [0, -raio]];
        for (let i = 0; i < amostras.length; i++) {
            let px = x + amostras[i][0], py = y + amostras[i][1];
            if (px < DES_X0 || px >= DES_X1) continue;
            let c = Math.floor((px - DES_X0) / TILE);
            let l = Math.floor(py / TILE);
            if (c < 0 || c >= COLS || l < 0 || l >= ROWS) continue;
            if (grid[l] && grid[l][c] && grid[l][c].alt >= minimo) return true;
        }
        return false;
    }

    function colideDeserto(x, y, raio) {
        if (!grid || x < DES_X0 || x >= DES_X1) return false;
        return alcanceAltura(x, y, ALT_PEQUENA, (typeof raio === 'number') ? raio : 12);
    }

    function colideProjetilDeserto(x, y) {
        if (!grid || x < DES_X0 || x >= DES_X1) return false;
        return alcanceAltura(x, y, ALT_MEDIA, 8);
    }

    // ========================================================================
    // TRANSIÇÕES E PORTAIS
    // ========================================================================
    let transicaoAtiva = false;
    let overlayEl = null;

    function obterOverlay() {
        if (overlayEl) return overlayEl;
        if (typeof document === 'undefined') return null;
        overlayEl = document.createElement('div');
        overlayEl.id = 'overlay-mapa';
        overlayEl.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;background:#0a0e12;z-index:99999;opacity:0;pointer-events:none;transition:opacity .35s ease;';
        document.body.appendChild(overlayEl);
        return overlayEl;
    }

    function infoPortalDeserto(x, y) {
        if (x < DES_X0) {
            if (Math.hypot(x - PORTA_VERDE.x, y - PORTA_VERDE.y) < PORTA_VERDE.r) {
                return { via: 'portal', mapa: 'desert', alvo: PORTA_VERDE.alvo };
            }
        } else {
            if (Math.hypot(x - PORTA_DESERTO.x, y - PORTA_DESERTO.y) < PORTA_DESERTO.r) {
                return { via: 'portal', mapa: 'green', alvo: PORTA_DESERTO.alvo };
            }
        }
        return null;
    }

    function switchMapaFade(cb) {
        if (typeof document === 'undefined' || !document.body) { cb(); return; }
        let ov = obterOverlay();
        if (ov) ov.style.opacity = '1';
        setTimeout(function () {
            cb();
            if (ov) ov.style.opacity = '0';
        }, 380);
    }

    function onUpdatePosicao(x, y) {
        if (transicaoAtiva || global.estaMorto) return;
        if (typeof global.portalMapaPodeDisparar === 'function' && !global.portalMapaPodeDisparar(x, y)) return;
        let info = infoPortalDeserto(x, y);
        if (!info) return;
        if (typeof global.solicitarTeleporteMapa === 'function') {
            global.solicitarTeleporteMapa(info.mapa, 'deserto_' + info.mapa);
            return;
        }
        transicaoAtiva = true;
        switchMapaFade(function () {
            global.meuX = info.alvo.x;
            global.meuY = info.alvo.y;
            global.currentMap = (info.mapa === 'pantano') ? 'pantano' : ((info.alvo.x >= DES_X0) ? 'desert' : 'green');
            transicaoAtiva = false;
        });
    }

    function depositarPosicaoSegura(x0, y0) {
        if (!colideDeserto(x0, y0, 10)) return { x: x0, y: y0 };
        for (let r = 1; r <= 4; r++) {
            for (let a = 0; a < 8; a++) {
                let ang = (a / 8) * Math.PI * 2;
                let x = x0 + Math.cos(ang) * r * TILE;
                let y = y0 + Math.sin(ang) * r * TILE;
                if (x < DES_X0) x = DES_X0 + 20;
                if (!colideDeserto(x, y, 10)) return { x: x, y: y };
            }
        }
        return { x: 18080, y: 4500 };
    }

    // ========================================================================
    // TORNADOS DE VENTO PROCEDURAIS (DUST DEVILS NO DESERTO)
    // ========================================================================
    const TORNADOS_DESERTO = [];
    const NUM_TORNADOS = 6;

    for (let ti = 0; ti < NUM_TORNADOS; ti++) {
        TORNADOS_DESERTO.push({
            x: DES_X0 + 2000 + Math.random() * 28000,
            y: 2000 + Math.random() * 32000,
            targetX: 0,
            targetY: 0,
            raioBase: 20 + Math.random() * 12,
            altura: 100 + Math.random() * 50,
            velocidadeGiro: 4.5 + Math.random() * 3.0,
            vida: Math.random() * 20,
            vidaMax: 22 + Math.random() * 10
        });
    }

    // ========================================================================
    // ELEMENTO EXTRA 1: PLANTAS-DO-DESERTO ROLANTES (TUMBLEWEEDS)
    // ========================================================================
    const TUMBLEWEEDS = [];
    const NUM_TUMBLEWEEDS = 8;

    for (let twi = 0; twi < NUM_TUMBLEWEEDS; twi++) {
        TUMBLEWEEDS.push({
            x: DES_X0 + Math.random() * 30000,
            y: Math.random() * 35000,
            vx: 1.8 + Math.random() * 2.2,
            vy: 0.2 + Math.random() * 0.4,
            bounceTimer: Math.random() * Math.PI * 2,
            rot: Math.random() * Math.PI * 2,
            r: 9 + Math.random() * 6
        });
    }

    // ========================================================================
    // ELEMENTO EXTRA 2: SOMBRAS DE URUBUS PLANANDO NAS DUNAS
    // ========================================================================
    const URUBUS = [
        { ang: 0, raioOrbita: 180, vel: 0.6, centroX: 19500, centroY: 4800 },
        { ang: 2, raioOrbita: 220, vel: 0.5, centroX: 25000, centroY: 12000 },
        { ang: 4, raioOrbita: 190, vel: 0.7, centroX: 35000, centroY: 21000 },
        { ang: 1, raioOrbita: 240, vel: 0.55, centroX: 42000, centroY: 7000 },
        { ang: 3, raioOrbita: 200, vel: 0.65, centroX: 46000, centroY: 10000 }
    ];

    // ========================================================================
    // BRISA E POEIRA DOURADA SUSPENSA
    // ========================================================================
    const POEIRA_BRISA = [];
    for (let pi = 0; pi < 40; pi++) {
        POEIRA_BRISA.push({
            relX: Math.random() * 1400,
            relY: Math.random() * 1000,
            vx: 2.4 + Math.random() * 2.8,
            vy: 0.2 + Math.random() * 0.5,
            tam: 1.5 + Math.random() * 2.2,
            alfa: 0.25 + Math.random() * 0.4
        });
    }

    // ========================================================================
    // RENDERIZAÇÃO CLIENT-SIDE DO CENÁRIO DO DESERTO
    // ========================================================================
    function alturaRelevo(tipo) {
        if (tipo === 'duna') return 4;
        if (tipo === 'ruina') return 8;
        if (tipo === 'mont') return 14;
        return 0;
    }

    function desenharDesertoCenario(t) {
        const ctx = global.ctx;
        if (!ctx || !grid) return;

        let camX = global.camX || 0;
        let camY = global.camY || 0;
        let cw = (global.canvas && global.canvas.width) || (global.innerWidth || 800);
        let ch = (global.canvas && global.canvas.height) || (global.innerHeight || 600);
        cw = cw / (global.ZOOM_CAMERA || 1);
        ch = ch / (global.ZOOM_CAMERA || 1);

        let c0 = Math.max(0, Math.floor((camX - DES_X0 - 80) / TILE));
        let c1 = Math.min(COLS - 1, Math.ceil((camX - DES_X0 + cw + 80) / TILE));
        let l0 = Math.max(0, Math.floor((camY - 80) / TILE));
        let l1 = Math.min(ROWS - 1, Math.ceil((camY + ch + 80) / TILE));

        // 1. DESENHO DOS TILES DO TERRENO (Dunas, Ondulações, Caminhos, Argila e Oásis)
        for (let l = l0; l <= l1; l++) {
            for (let c = c0; c <= c1; c++) {
                let cel = grid[l][c];
                let x = DES_X0 + c * TILE;
                let y = l * TILE;
                let eh = alturaRelevo(cel.tipo);
                if (cel.tipo === 'mont') {
                    desenharMontanhaArenito(ctx, x, y, c, l, eh);
                } else {
                    desenharAreiaRealista(ctx, x, y, c, l, cel.tipo, eh, t);
                }
            }
        }

        // 2. DETALHES DE SOLO DO ACAMPAMENTO NÔMADE (Tapetes geométricos e esteiras)
        desenharChaoAcampamentos(ctx, camX, camY, cw, ch);

        // 3. PEDRINHAS E DETRITOS LEVES
        for (let i = 0; i < decor.length; i++) {
            let d = decor[i];
            if (d.x < camX - 20 || d.x > camX + cw + 20 || d.y < camY - 20 || d.y > camY + ch + 20) continue;
            desenharDecor(ctx, d);
        }

        // 4. ELEMENTO EXTRA 2: SOMBRAS DE URUBUS PLANANDO ALTO
        desenharSombrasUrubus(ctx, t, camX, camY, cw, ch);

        // 5. ELEMENTO EXTRA 1: PLANTAS-DO-DESERTO ROLANTES (TUMBLEWEEDS)
        atualizarEdesenharTumbleweeds(ctx, t, camX, camY, cw, ch);

        // 6. TORNADOS DE VENTO PROCEDURAIS (DUST DEVILS)
        atualizarEdesenharTornadosDeserto(ctx, t, camX, camY, cw, ch);

        // 7. POEIRA E GRÃOS DE AREIA EM SUSPENSÃO NA BRISA
        desenharPoeiraBrisa(ctx, t, camX, camY, cw, ch);
    }

    // Ladrilho de Areia Dourada com Ondulações de Vento (Ripple Marks)
    function desenharAreiaRealista(ctx, x, y, c, l, tipo, eh, t) {
        eh = eh || 0;
        let ty = y - eh;
        let hTom = hash2(c, l);
        let corBase = hTom > 0.65 ? '#deb06c' : (hTom > 0.35 ? '#d9a75f' : '#d29d53');
        if (tipo === 'duna') corBase = '#e2be79';

        ctx.fillStyle = corBase;
        ctx.fillRect(x, ty, TILE + 1, TILE + 1);

        // Ondulações de vento (Ripple Marks) esculpidas no solo
        ctx.strokeStyle = 'rgba(180, 120, 50, 0.32)';
        ctx.lineWidth = 1.3;
        const rippleOffset = Math.sin(c * 0.4 + l * 0.3) * 3;
        ctx.beginPath();
        ctx.moveTo(x + 2, ty + 10 + rippleOffset);
        ctx.quadraticCurveTo(x + 20, ty + 6 + rippleOffset, x + 38, ty + 11 + rippleOffset);
        ctx.stroke();

        // Crista iluminada pelo sol
        ctx.strokeStyle = 'rgba(255, 235, 180, 0.28)';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(x + 2, ty + 8 + rippleOffset);
        ctx.quadraticCurveTo(x + 20, ty + 4 + rippleOffset, x + 38, ty + 9 + rippleOffset);
        ctx.stroke();

        // Solo de argila árido rachado
        if (tipo === 'solo_rachado') {
            ctx.fillStyle = 'rgba(125, 80, 40, 0.38)';
            ctx.fillRect(x, ty, TILE + 1, TILE + 1);

            ctx.strokeStyle = '#5a3416';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(x + 5, ty + 7);
            ctx.lineTo(x + 18, ty + 17);
            ctx.lineTo(x + 23, ty + 33);
            ctx.moveTo(x + 18, ty + 17);
            ctx.lineTo(x + 35, ty + 13);
            ctx.stroke();
        }

        // Caminho de caravana compactado
        if (tipo === 'caminho') {
            ctx.fillStyle = 'rgba(170, 125, 75, 0.45)';
            ctx.fillRect(x, ty, TILE + 1, TILE + 1);

            ctx.fillStyle = 'rgba(110, 70, 25, 0.22)';
            ctx.fillRect(x + 6, ty + 8, 28, 4);
            ctx.fillRect(x + 6, ty + 26, 28, 4);
        }

        // Margem arenosa úmida do Oásis
        if (tipo === 'areia_molhada') {
            ctx.fillStyle = '#9e793e';
            ctx.fillRect(x, ty, TILE + 1, TILE + 1);
            if (hTom > 0.5) {
                ctx.fillStyle = '#2d6a4f';
                ctx.fillRect(x + 12, ty + 14, 3, 6);
                ctx.fillRect(x + 16, ty + 11, 3, 9);
            }
        }

        // Água do Oásis (Turquesa cristalina com marolas e reflexos)
        if (tipo === 'agua') {
            let f = Math.sin((x + y) * 0.06 + performance.now() * 0.002) * 2.5;
            ctx.fillStyle = '#2a9d8f';
            ctx.fillRect(x, ty, TILE + 1, TILE + 1);

            ctx.fillStyle = '#48cae4';
            ctx.fillRect(x + 5 + f, ty + 8, 14, 4);
            ctx.fillStyle = '#90e0ef';
            ctx.fillRect(x + 20 - f, ty + 24, 12, 3);

            ctx.fillStyle = 'rgba(255,255,255,0.65)';
            ctx.beginPath();
            ctx.arc(x + 26 + f, ty + 14, 2.2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Montanha / Cânion de Arenito com Camadas Sedimentares Estratificadas (Mesa Contínua)
    function desenharMontanhaArenito(ctx, x, y, c, l, eh) {
        eh = eh || 0;
        let ty = y - eh;

        // Verifica os vizinhos (Norte, Leste, Sul, Oeste)
        const temN = (l > 0 && grid[l - 1] && grid[l - 1][c] && grid[l - 1][c].tipo === 'mont');
        const temS = (l < ROWS - 1 && grid[l + 1] && grid[l + 1][c] && grid[l + 1][c].tipo === 'mont');
        const temO = (c > 0 && grid[l] && grid[l][c - 1] && grid[l][c - 1].tipo === 'mont');
        const temL = (c < COLS - 1 && grid[l] && grid[l][c + 1] && grid[l][c + 1].tipo === 'mont');

        // 1. Sombra projetada na base da mesa sobre a areia se for borda Sul
        if (!temS) {
            ctx.fillStyle = 'rgba(70, 35, 10, 0.45)';
            ctx.fillRect(x - (temO ? 0 : 4), ty + TILE, TILE + (!temL ? 8 : 4), 9);
        }

        // 2. Base maciça de arenito avermelhado
        ctx.fillStyle = '#8c4627';
        ctx.fillRect(x, ty, TILE + 1, TILE + 1);

        // 3. Camadas sedimentares geológicas contínuas que atravessam os blocos
        ctx.fillStyle = '#a85a36';
        ctx.fillRect(x, ty + 6, TILE + 1, 8);
        ctx.fillStyle = '#6a2e16';
        ctx.fillRect(x, ty + 18, TILE + 1, 9);
        ctx.fillStyle = '#c7784f';
        ctx.fillRect(x, ty + 31, TILE + 1, 5);

        // 4. Textura rochosa e micro-camadas naturais
        const hRoch = hash2(c, l);
        if (hRoch > 0.4) {
            ctx.fillStyle = 'rgba(255, 235, 180, 0.12)';
            ctx.fillRect(x, ty + 2, TILE + 1, 2);
            ctx.fillRect(x, ty + 16, TILE + 1, 2);
        }

        // 5. Acabamento das Bordas da Mesa/Cânion:
        // Borda Norte: crista superior iluminada pelo sol
        if (!temN) {
            ctx.fillStyle = '#d48b65';
            ctx.fillRect(x, ty, TILE + 1, 4);
            ctx.fillStyle = '#f3b08c';
            ctx.fillRect(x, ty, TILE + 1, 1.5);
        }

        // Borda Sul: escarpa sombreada de queda na duna
        if (!temS) {
            ctx.fillStyle = '#52220f';
            ctx.fillRect(x, ty + TILE - 5, TILE + 1, 5);
            ctx.fillStyle = '#3a170a';
            ctx.fillRect(x, ty + TILE - 2, TILE + 1, 2);
        }

        // Borda Oeste: face lateral sombreada
        if (!temO) {
            ctx.fillStyle = '#5a2612';
            ctx.fillRect(x, ty, 4, TILE + 1);
        }

        // Borda Leste: face lateral com realce solar
        if (!temL) {
            ctx.fillStyle = '#b3613a';
            ctx.fillRect(x + TILE - 4, ty, 4, TILE + 1);
            ctx.fillStyle = '#e08f6b';
            ctx.fillRect(x + TILE - 1.5, ty, 1.5, TILE + 1);
        }

        // 6. Fissuras geológicas suaves esparsas (orgânicas e sem pontas verticais)
        if (hRoch > 0.82) {
            ctx.strokeStyle = '#36150a';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(x + 8, ty + 8);
            ctx.lineTo(x + 14, ty + 18);
            ctx.lineTo(x + 10, ty + 28);
            ctx.stroke();
        }
    }

    function desenharDecor(ctx, d) {
        ctx.fillStyle = d.tonal > 0.5 ? 'rgba(140, 100, 45, 0.55)' : 'rgba(180, 140, 70, 0.65)';
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
    }

    // Tapetes e esteiras no chão dos acampamentos nômades
    function desenharChaoAcampamentos(ctx, camX, camY, cw, ch) {
        for (let i = 0; i < acampamentos.length; i++) {
            const acp = acampamentos[i];
            if (acp.x + 200 < camX || acp.x - 200 > camX + cw || acp.y + 200 < camY || acp.y - 200 > camY + ch) {
                continue;
            }

            // Tapete ornamental carmim e dourado
            const rugX = acp.x - 30;
            const rugY = acp.y + 36;
            const rugW = 56;
            const rugH = 32;

            ctx.fillStyle = '#d4a373';
            ctx.fillRect(rugX - 3, rugY - 2, rugW + 6, rugH + 4);
            ctx.fillStyle = acp.corTapete || '#9b2226';
            ctx.fillRect(rugX, rugY, rugW, rugH);

            ctx.fillStyle = '#ee9b00';
            ctx.fillRect(rugX + 4, rugY + 3, rugW - 8, 3);
            ctx.fillRect(rugX + 4, rugY + rugH - 6, rugW - 8, 3);

            // Diamante central
            ctx.fillStyle = '#0a9396';
            ctx.beginPath();
            ctx.moveTo(acp.x, rugY + rugH / 2 - 6);
            ctx.lineTo(acp.x + 6, rugY + rugH / 2);
            ctx.lineTo(acp.x, rugY + rugH / 2 + 6);
            ctx.lineTo(acp.x - 6, rugY + rugH / 2);
            ctx.closePath();
            ctx.fill();

            // Ânforas de barro com água
            desenharAnforaSimples(ctx, acp.x - 45, acp.y + 40, 7, '#b25d3a');
            desenharAnforaSimples(ctx, acp.x - 54, acp.y + 44, 9, '#8f4728');
        }
    }

    function desenharAnforaSimples(ctx, x, y, r, cor) {
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.beginPath();
        ctx.ellipse(x + 2, y + r * 0.7, r * 0.8, r * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = cor;
        ctx.beginPath();
        ctx.ellipse(x, y, r, r * 1.15, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#4a2411';
        ctx.fillRect(x - r * 0.4, y - r * 1.3, r * 0.8, r * 0.4);
    }

    // ========================================================================
    // ATUALIZAÇÃO E DESENHO DOS EFEITOS ESPECIAIS E EXTRAS
    // ========================================================================

    // Tumbleweeds (Plantas-do-Deserto Rolando ao Vento)
    function atualizarEdesenharTumbleweeds(ctx, t, camX, camY, cw, ch) {
        for (let i = 0; i < TUMBLEWEEDS.length; i++) {
            const tw = TUMBLEWEEDS[i];
            tw.x += tw.vx;
            tw.y += tw.vy;
            tw.bounceTimer += 0.08;
            tw.rot += 0.06;

            // Mantém os tumbleweeds nas redondezas do campo de visão da câmera
            if (tw.x > camX + cw + 400 || tw.x > DES_X1) {
                tw.x = camX - 300;
                tw.y = camY + Math.random() * ch;
            }
            if (tw.y > DES_Y1 || tw.y < 0) tw.y = camY + Math.random() * ch;

            if (tw.x + 40 < camX || tw.x - 40 > camX + cw || tw.y + 40 < camY || tw.y - 40 > camY + ch) {
                continue;
            }

            const bounce = Math.abs(Math.sin(tw.bounceTimer)) * 12;
            const drawY = tw.y - bounce;

            ctx.save();
            // Sombra no chão
            ctx.fillStyle = 'rgba(70, 40, 15, ' + (0.35 - (bounce / 12) * 0.2) + ')';
            ctx.beginPath();
            ctx.ellipse(tw.x, tw.y + 2, tw.r * (1 + bounce * 0.03), tw.r * 0.45, 0, 0, Math.PI * 2);
            ctx.fill();

            // Arbusto seco esférico girando
            ctx.translate(tw.x, drawY);
            ctx.rotate(tw.rot);
            ctx.strokeStyle = '#9c7a4c';
            ctx.lineWidth = 1.4;

            ctx.beginPath();
            ctx.arc(0, 0, tw.r, 0, Math.PI * 2);
            ctx.stroke();

            // Galhos emaranhados internos
            for (let g = 0; g < 4; g++) {
                ctx.beginPath();
                ctx.ellipse(0, 0, tw.r * 0.85, tw.r * 0.35, (g * Math.PI) / 4, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.restore();
        }
    }

    // Sombras de Urubus Planando Alto no Céu
    function desenharSombrasUrubus(ctx, t, camX, camY, cw, ch) {
        ctx.save();
        for (let i = 0; i < URUBUS.length; i++) {
            const u = URUBUS[i];
            const angAtual = t * u.vel + u.ang;
            const sx = u.centroX + Math.cos(angAtual) * u.raioOrbita;
            const sy = u.centroY + Math.sin(angAtual) * (u.raioOrbita * 0.6);

            if (sx + 80 < camX || sx - 80 > camX + cw || sy + 80 < camY || sy - 80 > camY + ch) {
                continue;
            }

            // Sombra suave da ave projetada no solo
            ctx.save();
            ctx.translate(sx, sy);
            ctx.rotate(angAtual + Math.PI / 2);
            ctx.fillStyle = 'rgba(60, 35, 10, 0.28)';

            // Corpo
            ctx.beginPath();
            ctx.ellipse(0, 0, 4, 14, 0, 0, Math.PI * 2);
            ctx.fill();

            // Asas abertas em V planando
            ctx.beginPath();
            ctx.moveTo(-22, -2);
            ctx.quadraticCurveTo(-10, 4, 0, 1);
            ctx.quadraticCurveTo(10, 4, 22, -2);
            ctx.quadraticCurveTo(12, -4, 0, -2);
            ctx.quadraticCurveTo(-12, -4, -22, -2);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
        ctx.restore();
    }

    // Tornados de Vento Procedurais (Dust Devils)
    function atualizarEdesenharTornadosDeserto(ctx, t, camX, camY, cw, ch) {
        for (let i = 0; i < TORNADOS_DESERTO.length; i++) {
            const tor = TORNADOS_DESERTO[i];
            tor.vida += 0.016;

            if (tor.vida > tor.vidaMax) {
                tor.vida = 0;
                // Reposiciona inteligentemente próximo ao horizonte do jogador
                tor.x = camX - 200 + Math.random() * (cw + 400);
                tor.y = camY - 200 + Math.random() * (ch + 400);
                tor.targetX = tor.x + (Math.random() * 300 - 150);
                tor.targetY = tor.y + (Math.random() * 300 - 150);
            }

            // Movimentação suave
            const dx = tor.targetX - tor.x;
            const dy = tor.targetY - tor.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 30) {
                tor.targetX = tor.x + (Math.random() * 400 - 200);
                tor.targetY = tor.y + (Math.random() * 400 - 200);
            } else {
                tor.x += (dx / dist) * 1.1 + Math.sin(t * 1.4 + i) * 0.4;
                tor.y += (dy / dist) * 0.8 + Math.cos(t * 1.2 + i) * 0.4;
            }

            if (tor.x + 80 < camX || tor.x - 80 > camX + cw || tor.y + 30 < camY || tor.y - tor.altura - 30 > camY + ch) {
                continue;
            }

            let alpha = 1;
            if (tor.vida < 2.0) alpha = tor.vida / 2.0;
            else if (tor.vida > tor.vidaMax - 2.5) alpha = Math.max(0, (tor.vidaMax - tor.vida) / 2.5);

            ctx.save();
            ctx.globalAlpha = alpha;

            // Sombra e turbilhão na base
            ctx.fillStyle = 'rgba(90, 50, 15, 0.28)';
            ctx.beginPath();
            ctx.ellipse(tor.x, tor.y, tor.raioBase * 1.4, tor.raioBase * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();

            // Camadas concêntricas do cone do tornado
            const numCamadas = 8;
            for (let c = 0; c < numCamadas; c++) {
                const frac = c / (numCamadas - 1);
                const altCamada = tor.y - frac * tor.altura;
                const raioCamada = tor.raioBase * (0.35 + frac * 1.3);
                const wobble = Math.sin(t * 5.0 + frac * 4.0 + i) * (4 + frac * 8);
                const rotCamada = t * tor.velocidadeGiro * (1.2 - frac * 0.4) + frac * Math.PI;

                ctx.save();
                ctx.translate(tor.x + wobble, altCamada);
                ctx.rotate(rotCamada);

                const gradVento = ctx.createLinearGradient(-raioCamada, 0, raioCamada, 0);
                gradVento.addColorStop(0, 'rgba(233, 196, 106, 0.08)');
                gradVento.addColorStop(0.5, 'rgba(224, 159, 62, 0.40)');
                gradVento.addColorStop(1, 'rgba(186, 133, 84, 0.12)');

                ctx.fillStyle = gradVento;
                ctx.beginPath();
                ctx.ellipse(0, 0, raioCamada, raioCamada * 0.35, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            ctx.restore();
        }
    }

    // Brisa e grãos de areia suspensos
    function desenharPoeiraBrisa(ctx, t, camX, camY, cw, ch) {
        ctx.save();
        for (let i = 0; i < POEIRA_BRISA.length; i++) {
            const p = POEIRA_BRISA[i];
            p.relX += p.vx;
            p.relY += p.vy + Math.sin(t * 2.2 + i) * 0.3;

            if (p.relX > cw + 100) p.relX = -50;
            if (p.relY > ch + 100) p.relY = -50;

            const px = camX + p.relX;
            const py = camY + p.relY;

            ctx.fillStyle = '#f4a261';
            ctx.globalAlpha = p.alfa;
            ctx.beginPath();
            ctx.arc(px, py, p.tam, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    // ========================================================================
    // PROFUNDIDADE 2.5D: COLETOR DE SORTABLES (Z-SORTING REAL)
    // ========================================================================
    function coletarDesertSortables(t, arr) {
        if (!grid) gerarDeserto();
        const camX = global.camX || 0;
        const camY = global.camY || 0;
        const cw = (global.canvas && global.canvas.width) ? (global.canvas.width / (global.ZOOM_CAMERA || 1)) : 900;
        const ch = (global.canvas && global.canvas.height) ? (global.canvas.height / (global.ZOOM_CAMERA || 1)) : 600;

        for (let i = 0; i < sortables.length; i++) {
            let s = sortables[i];
            if (s.x < camX - 160 || s.x > camX + cw + 160 || s.base < camY - 200 || s.base > camY + ch + 60) {
                continue;
            }

            arr.push({
                y: s.base,
                draw: (function (spr, tm) {
                    return function () {
                        if (spr.tipo === 'palma') desenharTamareiraRealista(global.ctx, spr, tm);
                        else if (spr.tipo === 'cacto') desenharSaguaroRealista(global.ctx, spr, tm);
                        else if (spr.tipo === 'cacto_menor') desenharCactoMenorRealista(global.ctx, spr, tm);
                        else if (spr.tipo === 'acampamento_tenda_principal') desenharTendaNomadeRealista(global.ctx, spr.x, spr.base - 15, 130, 80, (spr.obj && spr.obj.corTecido) || '#e2cbab', (spr.obj && spr.obj.corListra) || '#9c4126', tm);
                        else if (spr.tipo === 'acampamento_tenda_mercador') desenharTendaNomadeRealista(global.ctx, spr.x, spr.base - 10, 90, 65, (spr.obj && spr.obj.corTecidoM) || '#cfb997', (spr.obj && spr.obj.corListraM) || '#2b506e', tm);
                        else if (spr.tipo === 'acampamento_fogueira') desenharFogueiraNomadeRealista(global.ctx, spr.x, spr.base, tm);
                        else if (spr.tipo === 'esqueleto') desenharEsqueletoRealista(global.ctx, spr.obj);
                        else if (spr.tipo === 'ruina') desenharRuinaArenitoRealista(global.ctx, spr, tm);
                        else if (spr.tipo === 'pedrag') desenharPedraGrandeRealista(global.ctx, spr, tm);
                        else if (spr.tipo === 'pedrap') desenharPedraPequenaRealista(global.ctx, spr, tm);
                    };
                })(s, t)
            });
        }
    }

    // ========================================================================
    // DESENHO DETALHADO DOS OBJETOS Z-SORTED
    // ========================================================================

    // Cacto Saguaro Gigante Realista (Canelado 3D, ramos e flores)
    function desenharSaguaroRealista(ctx, s, t) {
        if (!ctx) return;
        ctx.save();
        const x = s.x, y = s.base, h = s.h || 100;
        const troncoL = 18;

        // Sombra alongada no chão
        ctx.fillStyle = 'rgba(70, 40, 10, 0.35)';
        ctx.beginPath();
        ctx.ellipse(x + 18, y + 5, troncoL * 1.5, troncoL * 0.5, 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Tronco principal
        ctx.fillStyle = '#2d6a4f';
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(x - troncoL / 2, y - h, troncoL, h + 4, [troncoL / 2, troncoL / 2, 4, 4])
                      : ctx.rect(x - troncoL / 2, y - h, troncoL, h + 4);
        ctx.fill();

        // Nervuras verticais com luz e sombra
        const numNervuras = 4;
        for (let ni = 0; ni < numNervuras; ni++) {
            const nx = x - troncoL / 2 + (ni + 0.5) * (troncoL / numNervuras);
            ctx.fillStyle = '#1b4332';
            ctx.fillRect(nx - 1, y - h + 6, 1.2, h - 8);
            ctx.fillStyle = '#52b788';
            ctx.fillRect(nx + 0.5, y - h + 6, 1.0, h - 8);
        }

        // Braços característicos
        const bracos = s.bracos || 2;
        for (let bi = 0; bi < bracos; bi++) {
            const lado = (bi % 2 === 0) ? -1 : 1;
            const altBraço = y - h * (0.35 + bi * 0.22);
            const braçoW = troncoL * 0.65;
            const braçoH = h * 0.38;
            const extensão = troncoL * 1.25 * lado;

            ctx.fillStyle = '#2d6a4f';
            ctx.beginPath();
            ctx.roundRect ? ctx.roundRect(x + (lado < 0 ? extensão : 0), altBraço - braçoW / 2, Math.abs(extensão), braçoW, 3)
                          : ctx.rect(x + (lado < 0 ? extensão : 0), altBraço - braçoW / 2, Math.abs(extensão), braçoW);
            ctx.fill();

            const pontaX = x + extensão + (lado < 0 ? braçoW / 2 : -braçoW / 2);
            ctx.beginPath();
            ctx.roundRect ? ctx.roundRect(pontaX - braçoW / 2, altBraço - braçoH, braçoW, braçoH, [braçoW / 2, braçoW / 2, 2, 2])
                          : ctx.rect(pontaX - braçoW / 2, altBraço - braçoH, braçoW, braçoH);
            ctx.fill();

            ctx.fillStyle = '#52b788';
            ctx.fillRect(pontaX - braçoW / 4, altBraço - braçoH + 4, 1.5, braçoH - 8);
        }

        // Flor do topo
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(x, y - h - 2, 3.8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e9c46a';
        ctx.beginPath(); ctx.arc(x, y - h - 2, 1.8, 0, Math.PI * 2); ctx.fill();

        ctx.restore();
    }

    // Cacto Palma (Prickly Pear com figos-da-índia) ou Barril
    function desenharCactoMenorRealista(ctx, s, t) {
        if (!ctx) return;
        ctx.save();
        const x = s.x, y = s.base;

        ctx.fillStyle = 'rgba(70, 40, 10, 0.3)';
        ctx.beginPath(); ctx.ellipse(x + 4, y + 2, 14, 6, 0, 0, Math.PI * 2); ctx.fill();

        if (s.seed > 0.5) {
            // Palma com figos-da-índia
            ctx.fillStyle = '#2d6a4f';
            ctx.beginPath(); ctx.ellipse(x, y - 12, 9, 13, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#40916c';
            ctx.beginPath(); ctx.ellipse(x - 9, y - 22, 7, 10, -0.4, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(x + 8, y - 24, 8, 11, 0.35, 0, Math.PI * 2); ctx.fill();

            ctx.fillStyle = '#e63946';
            ctx.beginPath(); ctx.arc(x - 12, y - 30, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(x + 6, y - 34, 2.5, 0, Math.PI * 2); ctx.fill();
        } else {
            // Cacto Bola/Barril
            ctx.fillStyle = '#40916c';
            ctx.beginPath(); ctx.ellipse(x, y - 10, 12, 11, 0, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#e9c46a';
            ctx.lineWidth = 1.2;
            for (let i = -2; i <= 2; i++) {
                ctx.beginPath(); ctx.ellipse(x + i * 4, y - 10, 2, 10, 0, 0, Math.PI * 2); ctx.stroke();
            }
            ctx.fillStyle = '#f4a261';
            ctx.beginPath(); ctx.arc(x, y - 21, 3, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }

    // Tamareira Esguia com Frondes Arqueadas e Cachos de Tâmaras
    function desenharTamareiraRealista(ctx, s, t) {
        if (!ctx) return;
        ctx.save();
        const x = s.x, y = s.base, h = s.h || 120;
        const sway = Math.sin(t * 1.6 + (s.seed || 1)) * 3.5;

        // Sombra
        ctx.fillStyle = 'rgba(70, 40, 10, 0.35)';
        ctx.beginPath(); ctx.ellipse(x + 12, y + 6, 26, 10, 0, 0, Math.PI * 2); ctx.fill();

        // Tronco escamoso curvado
        ctx.strokeStyle = '#6f4e37';
        ctx.lineWidth = 9;
        ctx.beginPath();
        ctx.moveTo(x, y + 4);
        ctx.quadraticCurveTo(x + 8, y - h * 0.5, x + sway, y - h);
        ctx.stroke();

        ctx.strokeStyle = '#4a2f1c';
        ctx.lineWidth = 1.6;
        for (let i = 1; i <= 6; i++) {
            const ty = y - i * (h / 7);
            const tx = x + (i / 7) * 8 * 0.7;
            ctx.beginPath(); ctx.moveTo(tx - 4, ty); ctx.lineTo(tx + 4, ty); ctx.stroke();
        }

        // Frondes
        const topoX = x + sway;
        const topoY = y - h;
        ctx.save();
        ctx.translate(topoX, topoY);
        const numFrondes = 7;
        for (let fi = 0; fi < numFrondes; fi++) {
            const angFrond = (fi / numFrondes) * Math.PI * 2;
            const frondSway = Math.sin(t * 2.0 + fi) * 4;

            ctx.strokeStyle = (fi % 2 === 0) ? '#2d6a4f' : '#40916c';
            ctx.lineWidth = 3.2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            const fx = Math.cos(angFrond) * 36;
            const fy = Math.sin(angFrond) * 22 + frondSway;
            ctx.quadraticCurveTo(fx * 0.6, fy * 0.3 - 8, fx, fy);
            ctx.stroke();
        }

        // Cacho de tâmaras
        ctx.fillStyle = '#b07228';
        ctx.beginPath();
        ctx.arc(-2, 4, 3.5, 0, Math.PI * 2);
        ctx.arc(3, 5, 3.5, 0, Math.PI * 2);
        ctx.arc(0, 8, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.restore();
    }

    // Tenda Nômade Beduína com Lonas de Linho/Pelo de Camelo
    function desenharTendaNomadeRealista(ctx, x, y, w, h, corTecido, corListra, t) {
        if (!ctx) return;
        ctx.save();
        const halfW = w / 2;

        // Sombra projetada
        ctx.fillStyle = 'rgba(70, 35, 10, 0.45)';
        ctx.beginPath();
        ctx.ellipse(x + 8, y + 14, halfW * 1.15, h * 0.38, 0, 0, Math.PI * 2);
        ctx.fill();

        // Interior escuro
        ctx.fillStyle = '#1e1108';
        ctx.beginPath();
        ctx.moveTo(x - halfW * 0.7, y + 10);
        ctx.lineTo(x, y - h * 0.65);
        ctx.lineTo(x + halfW * 0.7, y + 10);
        ctx.closePath();
        ctx.fill();

        // Teto de tecido
        ctx.fillStyle = corTecido;
        ctx.beginPath();
        ctx.moveTo(x - halfW, y + 5);
        ctx.lineTo(x, y - h);
        ctx.lineTo(x + halfW, y + 5);
        ctx.lineTo(x + halfW * 0.8, y + 10);
        ctx.lineTo(x, y - h * 0.55);
        ctx.lineTo(x - halfW * 0.8, y + 10);
        ctx.closePath();
        ctx.fill();

        // Listras decorativas
        ctx.fillStyle = corListra;
        ctx.beginPath();
        ctx.moveTo(x - halfW * 0.5, y + 6);
        ctx.lineTo(x - 5, y - h + 6);
        ctx.lineTo(x - 12, y - h + 6);
        ctx.lineTo(x - halfW * 0.65, y + 6);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(x + halfW * 0.5, y + 6);
        ctx.lineTo(x + 5, y - h + 6);
        ctx.lineTo(x + 12, y - h + 6);
        ctx.lineTo(x + halfW * 0.65, y + 6);
        ctx.closePath();
        ctx.fill();

        // Mastros e cordas com estacas fincadas
        ctx.strokeStyle = '#5a3818';
        ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x, y + 10); ctx.stroke();

        ctx.strokeStyle = 'rgba(90, 56, 24, 0.65)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x - halfW, y + 5); ctx.lineTo(x - halfW - 14, y + 15);
        ctx.moveTo(x + halfW, y + 5); ctx.lineTo(x + halfW + 14, y + 15);
        ctx.stroke();

        ctx.fillStyle = '#3a200e';
        ctx.fillRect(x - halfW - 16, y + 13, 3, 5);
        ctx.fillRect(x + halfW + 13, y + 13, 3, 5);

        // Lanterna de latão
        const lanternSway = Math.sin(t * 2.2) * 2;
        ctx.strokeStyle = '#cca43b'; ctx.lineWidth = 1.0;
        ctx.beginPath(); ctx.moveTo(x, y - h * 0.6); ctx.lineTo(x + lanternSway, y - h * 0.6 + 12); ctx.stroke();
        ctx.fillStyle = '#ffb703';
        ctx.beginPath(); ctx.arc(x + lanternSway, y - h * 0.6 + 14, 2.8, 0, Math.PI * 2); ctx.fill();

        ctx.restore();
    }

    // Fogueira Nômade com Tripé e Caldeirão
    function desenharFogueiraNomadeRealista(ctx, fx, fy, t) {
        if (!ctx) return;
        ctx.save();

        // Iluminação dinâmica suave
        const pulsar = 1 + Math.sin(t * 5.0) * 0.08 + Math.cos(t * 7.5) * 0.05;
        const raioLuz = 170 * pulsar;
        const gLuz = ctx.createRadialGradient(fx, fy, 15, fx, fy, raioLuz);
        gLuz.addColorStop(0, 'rgba(255, 150, 40, 0.45)');
        gLuz.addColorStop(0.5, 'rgba(230, 90, 20, 0.18)');
        gLuz.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gLuz;
        ctx.beginPath(); ctx.arc(fx, fy, raioLuz, 0, Math.PI * 2); ctx.fill();

        // Anel de pedras
        const numPedras = 10;
        for (let pi = 0; pi < numPedras; pi++) {
            const ang = (pi / numPedras) * Math.PI * 2;
            const px = fx + Math.cos(ang) * 19;
            const py = fy + Math.sin(ang) * 12;
            ctx.fillStyle = '#6c584c';
            ctx.beginPath(); ctx.ellipse(px, py, 5.5, 4, ang, 0, Math.PI * 2); ctx.fill();
        }

        // Brasas
        ctx.fillStyle = '#22150d';
        ctx.beginPath(); ctx.ellipse(fx, fy, 13, 8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#c5221f';
        ctx.beginPath(); ctx.ellipse(fx, fy, 9, 5, 0, 0, Math.PI * 2); ctx.fill();

        // Labaredas
        const fOff1 = Math.sin(t * 12) * 2.5;
        ctx.fillStyle = '#f77f00';
        ctx.beginPath();
        ctx.moveTo(fx - 9, fy + 2);
        ctx.quadraticCurveTo(fx - 5 + fOff1, fy - 16, fx, fy - 24);
        ctx.quadraticCurveTo(fx + 5, fy - 16, fx + 9, fy + 2);
        ctx.fill();

        // Tripé e caldeirão
        ctx.strokeStyle = '#2b2d42'; ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(fx - 14, fy + 4); ctx.lineTo(fx, fy - 28);
        ctx.moveTo(fx + 14, fy + 4); ctx.lineTo(fx, fy - 28);
        ctx.stroke();

        ctx.fillStyle = '#1b1b1e';
        ctx.beginPath(); ctx.arc(fx, fy - 10, 5, 0, Math.PI); ctx.fill();

        ctx.restore();
    }

    // Esqueletos, Crânios Colossais e Costelas
    function desenharEsqueletoRealista(ctx, esq) {
        if (!ctx) return;
        ctx.save();
        const x = esq.x, y = esq.y;

        if (esq.tipo === 'cranio_gigante') {
            ctx.fillStyle = 'rgba(70, 35, 10, 0.4)';
            ctx.beginPath(); ctx.ellipse(x + 4, y + 4, 22, 10, 0, 0, Math.PI * 2); ctx.fill();

            // Chifres curvos
            ctx.strokeStyle = '#4a3b32'; ctx.lineWidth = 4.0;
            ctx.beginPath();
            ctx.moveTo(x - 8, y - 8); ctx.quadraticCurveTo(x - 24, y - 22, x - 32, y - 10);
            ctx.moveTo(x + 8, y - 8); ctx.quadraticCurveTo(x + 24, y - 22, x + 32, y - 10);
            ctx.stroke();

            // Crânio marfim
            ctx.fillStyle = '#eeddc3';
            ctx.beginPath(); ctx.ellipse(x, y - 6, 14, 11, esq.ang || 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#2b1b11';
            ctx.beginPath();
            ctx.ellipse(x - 5, y - 6, 3.2, 4.2, -0.2, 0, Math.PI * 2);
            ctx.ellipse(x + 5, y - 6, 3.2, 4.2, 0.2, 0, Math.PI * 2);
            ctx.fill();
        } else if (esq.tipo === 'costelas_gigantes') {
            const numC = esq.numCostelas || 5;
            for (let c = 0; c < numC; c++) {
                const cx = x - 25 + c * 11;
                const cy = y - 4 + c * 3;
                const altCostela = 26 + Math.sin((c / numC) * Math.PI) * 14;

                ctx.strokeStyle = '#eeddc3'; ctx.lineWidth = 3.8;
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.quadraticCurveTo(cx - 8, cy - altCostela * 0.7, cx + 6, cy - altCostela);
                ctx.stroke();
            }
        } else {
            // Ossada dispersa
            ctx.strokeStyle = '#eeddc3'; ctx.lineWidth = 3.5;
            ctx.beginPath(); ctx.moveTo(x - 10, y - 2); ctx.lineTo(x + 10, y + 2); ctx.stroke();
        }
        ctx.restore();
    }

    // Ruínas Antigas de Arenito e Santuários (Colunas e Capitéis)
    function desenharRuinaArenitoRealista(ctx, s, t) {
        if (!ctx) return;
        ctx.save();
        ctx.translate(s.x, s.base);

        ctx.fillStyle = 'rgba(70, 35, 10, 0.35)';
        ctx.beginPath(); ctx.ellipse(0, -4, 32, 11, 0, 0, Math.PI * 2); ctx.fill();

        // Duas colunas esculpidas de arenito com capitel clássico
        for (let lado = -1; lado <= 1; lado += 2) {
            let px = lado * 14;
            // Base da coluna
            ctx.fillStyle = '#c7784f';
            ctx.fillRect(px - 7, -4, 14, 4);

            // Tronco canelado da coluna
            ctx.fillStyle = '#a85a36';
            ctx.fillRect(px - 5, -36, 10, 32);
            ctx.fillStyle = '#8c4627';
            ctx.fillRect(px - 3, -36, 2, 32);
            ctx.fillStyle = '#c7784f';
            ctx.fillRect(px + 2, -36, 1.5, 32);

            // Capitel ornamentado
            ctx.fillStyle = '#d48b65';
            ctx.fillRect(px - 8, -40, 16, 5);
        }

        // Arquitrave / dintel tombado
        ctx.fillStyle = '#9c4c28';
        ctx.fillRect(-16, -14, 14, 10);
        ctx.fillStyle = '#c7784f';
        ctx.fillRect(-16, -14, 14, 3);

        ctx.restore();
    }

    function desenharPedraGrandeRealista(ctx, s, t) {
        if (!ctx) return;
        ctx.save();
        ctx.translate(s.x, s.base);
        ctx.fillStyle = 'rgba(70, 35, 10, 0.28)';
        ctx.beginPath(); ctx.ellipse(0, -4, 22, 8, 0, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = '#8c4627';
        ctx.beginPath();
        ctx.moveTo(-22, 0); ctx.lineTo(-16, -8); ctx.lineTo(-4, -22); ctx.lineTo(12, -18); ctx.lineTo(22, -6); ctx.lineTo(20, 0);
        ctx.closePath(); ctx.fill();

        ctx.fillStyle = '#c7784f';
        ctx.beginPath(); ctx.moveTo(-8, -20); ctx.lineTo(6, -20); ctx.lineTo(10, -10); ctx.lineTo(-10, -10); ctx.closePath(); ctx.fill();
        ctx.restore();
    }

    function desenharPedraPequenaRealista(ctx, s, t) {
        if (!ctx) return;
        ctx.save();
        ctx.translate(s.x, s.base);
        ctx.fillStyle = 'rgba(70, 35, 10, 0.22)';
        ctx.beginPath(); ctx.ellipse(0, -2, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#9c4c28';
        ctx.beginPath(); ctx.moveTo(-13, 0); ctx.lineTo(-9, -9); ctx.lineTo(4, -11); ctx.lineTo(13, -3); ctx.lineTo(11, 0); ctx.closePath(); ctx.fill();
        ctx.restore();
    }

    // Vórtices espaciais
    function desenharPortalVerde(t) {
        const ctx = global.ctx;
        if (ctx) desenharVortex(ctx, PORTA_VERDE.x, PORTA_VERDE.y, t, '#a55eea');
    }

    function desenharPortalDeserto(t) {
        const ctx = global.ctx;
        if (ctx) desenharVortex(ctx, PORTA_DESERTO.x, PORTA_DESERTO.y, t, '#f4a261');
    }

    function desenharVortex(ctx, x, y, t, cor) {
        ctx.save();
        ctx.shadowColor = cor;
        ctx.shadowBlur = 18;
        ctx.fillStyle = 'rgba(20, 10, 40, 0.55)';
        ctx.beginPath(); ctx.arc(x, y, 54, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 26;
        ctx.strokeStyle = cor;
        ctx.globalAlpha = 0.85;
        for (let i = 0; i < 5; i++) {
            let raio = 18 + i * 8;
            let a0 = t * 1.4 + i * 1.25;
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(x, y, raio, a0, a0 + Math.PI * 0.8); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = cor;
        ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    // ---------- Reset de instância ----------
    function resetarDeserto() {
        grid = null;
        sortables = [];
        decor = [];
        acampamentos = [];
        esqueletos = [];
        ruinasComplexas = [];
    }

    // ---------------- API EXPORTADA ----------------
    const api = {
        TILE: TILE,
        DES_X0: DES_X0, DES_X1: DES_X1, DES_Y1: DES_Y1,
        COLS: COLS, ROWS: ROWS,
        ALT_LIVRE: ALT_LIVRE, ALT_PEQUENA: ALT_PEQUENA, ALT_MEDIA: ALT_MEDIA, ALT_ALTA: ALT_ALTA,
        porcoes: { PORTA_VERDE: PORTA_VERDE, PORTA_DESERTO: PORTA_DESERTO, BORDA_ESTE: BORDA_ESTE, BORDA_OESTE: BORDA_OESTE },
        get acampamentos() { return acampamentos; },
        get esqueletos() { return esqueletos; },
        get ruinasComplexas() { return ruinasComplexas; },
        gerarDeserto: gerarDeserto,
        resetarDeserto: resetarDeserto,
        grid: function () { return grid; },
        isDeserto: isDeserto,
        colideDeserto: colideDeserto,
        colideProjetilDeserto: colideProjetilDeserto,
        infoPortalDeserto: infoPortalDeserto,
        onUpdatePosicao: onUpdatePosicao,
        depositarPosicaoSegura: depositarPosicaoSegura,
        desenharDesertoCenario: desenharDesertoCenario,
        coletarDesertSortables: coletarDesertSortables,
        desenharPortalVerde: desenharPortalVerde,
        desenharPortalDeserto: desenharPortalDeserto,
        sortables: function () { return sortables; }
    };

    // Exportação para o navegador
    if (typeof window !== 'undefined') {
        gerarDeserto();
        global.desenharDesertoCenario = desenharDesertoCenario;
        global.coletarDesertSortables = coletarDesertSortables;
        global.colideDeserto = colideDeserto;
        global.desenharPortalVerde = desenharPortalVerde;
        global.desenharPortalDeserto = desenharPortalDeserto;
        global.resetarDeserto = resetarDeserto;
        global.mapaDeserto = api;
    }

    // Exportação para o Node.js
    if (typeof module !== 'undefined' && module.exports) {
        if (!grid) gerarDeserto();
        module.exports = api;
    }
})(typeof window !== 'undefined' ? window : globalThis);