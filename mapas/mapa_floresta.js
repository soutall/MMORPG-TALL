// ============================================================================
// mapa_floresta.js — "Floresta dos Sussurros" (Bioma de Floresta)
// Módulo isomórfico: roda no NAVEGADOR (expõe funções em window) E no SERVIDOR
// (module.exports), então o MESMO grid de colisão vale para os dois lados.
//
// MAPA POR ID ÚNICA — coordenadas EXCLUSIVAS desta floresta:
//   • faixa própria : x em [90000, 98000) × y em [0, 6000).
//   • tile = 40px   → COLS=200, ROWS=150 (8.000 × 6.000 px).
//   • Nenhum outro mapa do registry invade esta faixa (garantido pelo
//     mapas-registry.js) e a floresta é SELADA por um anel de árvores
//     gigantes: qualquer ponto fora do retângulo colide.
//
// ALTURAS (mesma convenção do projeto):
//   0 = livre · 1 = pequena (bloqueia entidade, projétil passa) ·
//   2 = média (bloqueia entidade e projétil) · 3 = alta (bloqueia tudo)
//
// Conteúdo:
//   • Spawn central EXATO do mapa: (94000, 3000) — Clareira do Acampamento.
//   • Vila central com 4 CABANAS elaboradas (paredes, porta, janelas acesas,
//     telhado com cumeeira e chaminé com fumaça).
//   • FOGUEIRAS (vila + 3 acampamentos) com chamas animadas, brasas, fumaça e
//     iluminação quente que fura a penumbra da floresta.
//   • Rio dos Sussurros (curva senoidal N→S) + 2 lagos, todos com PONTES de
//     madeira nos cruzamentos de trilha (água bloqueia; ponte é livre).
//   • ÁRVORES animadas (copa balança com o tempo), arbustos, pedras, flores.
//   • Trilhas de terra ligando o portal oeste → vila → lagos e clareiras.
// ============================================================================
(function (global) {
    'use strict';

    const TILE = 40;
    const FOR_X0 = 90000;
    const FOR_X1 = 98000;
    const FOR_Y1 = 6000;
    const COLS = (FOR_X1 - FOR_X0) / TILE;   // 200
    const ROWS = FOR_Y1 / TILE;              // 150

    const ALT_LIVRE = 0, ALT_PEQUENA = 1, ALT_MEDIA = 2, ALT_ALTA = 3;
    const TIPOS_ALT = {
        grama: ALT_LIVRE,
        flor: ALT_LIVRE,
        trilha: ALT_LIVRE,
        terra: ALT_LIVRE,
        ponte: ALT_LIVRE,
        cabana_chao: ALT_LIVRE,
        fogueira: ALT_PEQUENA,
        pedra: ALT_PEQUENA,
        arbusto: ALT_PEQUENA,
        arvore: ALT_MEDIA,
        agua: ALT_MEDIA,
        cabana_parede: ALT_MEDIA,
        arvore_gigante: ALT_ALTA
    };

    // Portal de retorno no limiar OESTE (x0 + 130, tile c=3, fora do anel de
    // borda c<=1) — leva de volta a Davahl. A trilha oeste passa por ele.
    const PORTAL_FLORESTA_RETORNO = null; // Portal de retorno para a cidade desativado no design atual.
    // SPAWN/CHEGADA: centro EXATO do mapa (c=100, l=75) — longe do portal (faixa
    // de segurança exigida pelo servidor: chegada fora do raio do portal).
    const FOR_SPAWN = { x: FOR_X0 + 4000, y: 3000 };
    const PONTO_CHEGADA = { x: FOR_X0 + 4000, y: 3000 };

    // Centro em tiles (vila/clareira central)
    const CC = 100, CL = 75;

    let grid = null;
    let sortables = [];
    let cabanasInfo = [];
    let foguerasInfo = [];
    let vagalumes = [];
    let florestaChainAnterior = null;
    let prevColide = null;
    let prevColideP = null;

    // ---------- PRNG determinístico (mesmo padrão do projeto) ----------
    function mulberry32(seed) {
        return function () {
            seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
            let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
            t = Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    function hash2(a, b) {
        let n = (a * 374761393 + b * 668265263) | 0;
        n = Math.imul(n ^ (n >>> 13), 1274126177);
        return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
    }

    function marcar(c, l, tipo) {
        if (l >= 0 && l < ROWS && c >= 0 && c < COLS) {
            grid[l][c] = { tipo: tipo, alt: TIPOS_ALT[tipo] !== undefined ? TIPOS_ALT[tipo] : ALT_LIVRE };
        }
    }
    function tipoEm(c, l) {
        if (l < 0 || l >= ROWS || c < 0 || c >= COLS) return null;
        return grid[l][c].tipo;
    }

    // ---------- Cabanas elaboradas ----------
    // Ring de paredes com vão de porta no lado indicado + piso interno.
    function construirCabana(c0, l0, w, h, doorSide, nome) {
        for (let l = l0; l < l0 + h; l++) {
            for (let c = c0; c < c0 + w; c++) {
                const borda = (l === l0 || l === l0 + h - 1 || c === c0 || c === c0 + w - 1);
                if (!borda) { marcar(c, l, 'cabana_chao'); continue; }
                marcar(c, l, 'cabana_parede');
            }
        }
        // Vão da porta (2 tiles) no centro do lado indicado
        if (doorSide === 'S' || doorSide === 'N') {
            const dl = (doorSide === 'S') ? l0 + h - 1 : l0;
            const dc = c0 + Math.floor(w / 2) - 1;
            marcar(dc, dl, 'cabana_chao'); marcar(dc + 1, dl, 'cabana_chao');
        } else {
            const dc = (doorSide === 'E') ? c0 + w - 1 : c0;
            const dl = l0 + Math.floor(h / 2) - 1;
            marcar(dc, dl, 'cabana_chao'); marcar(dc, dl + 1, 'cabana_chao');
        }
        cabanasInfo.push({ c0: c0, l0: l0, w: w, h: h, doorSide: doorSide, nome: nome || 'Cabana' });
    }

    // ---------- Geração completa do bioma ----------
    function gerarFloresta() {
        if (grid) return grid;

        grid = [];
        for (let l = 0; l < ROWS; l++) {
            grid[l] = [];
            for (let c = 0; c < COLS; c++) grid[l][c] = { tipo: 'grama', alt: ALT_LIVRE };
        }
        cabanasInfo = [];
        foguerasInfo = [];
        vagalumes = [];

        // 1) ANEL DE ÁRVORES GIGANTES (2 tiles) — sela o mapa por completo
        for (let l = 0; l < ROWS; l++) {
            for (let c = 0; c < COLS; c++) {
                if (c <= 1 || c >= COLS - 2 || l <= 1 || l >= ROWS - 2) marcar(c, l, 'arvore_gigante');
            }
        }

        // 2) RIO DOS SUSSURROS — faixa vertical com curva senoidal (N→S)
        for (let l = 2; l < ROWS - 2; l++) {
            const centro = 71 + Math.round(Math.sin(l * 0.11) * 3);
            for (let c = centro - 1; c <= centro + 1; c++) marcar(c, l, 'agua');
            marcar(centro - 2, l, 'terra'); marcar(centro + 2, l, 'terra'); // margens de areia
        }

        // 3) LAGOS
        const lagos = [
            { cx: 152, cy: 104, rx: 18, ry: 11, nome: 'Lago Espelho' },
            { cx: 40, cy: 30, rx: 11, ry: 7, nome: 'Lago das Ninfas' },
            { cx: 160, cy: 40, rx: 8, ry: 6, nome: 'Poço dos Corujos' }
        ];
        for (let k = 0; k < lagos.length; k++) {
            const L = lagos[k];
            for (let l = Math.max(2, L.cy - L.ry - 2); l <= Math.min(ROWS - 3, L.cy + L.ry + 2); l++) {
                for (let c = Math.max(2, L.cx - L.rx - 2); c <= Math.min(COLS - 3, L.cx + L.rx + 2); c++) {
                    const dx = (c - L.cx) / (L.rx + 0.35), dy = (l - L.cy) / (L.ry + 0.35);
                    const d = dx * dx + dy * dy;
                    if (d <= 1) marcar(c, l, 'agua');
                    else if (d <= 1.35 && tipoEm(c, l) === 'grama') marcar(c, l, 'terra'); // praia
                }
            }
        }

        // 4) TRILHAS DE TERRA (livres; sobre o rio viram PONTE)
        function trilhaH(cA, cB, lA, lB) {
            for (let c = Math.min(cA, cB); c <= Math.max(cA, cB); c++) {
                for (let l = Math.min(lA, lB); l <= Math.max(lA, lB); l++) {
                    marcar(c, l, tipoEm(c, l) === 'agua' ? 'ponte' : 'trilha');
                }
            }
        }
        trilhaH(3, CC, CL - 1, CL + 1);      // portal oeste → vila (cruza o rio → ponte)
        trilhaH(CC + 1, 136, CL - 1, CL + 1); // vila → margem do Lago Espelho
        trilhaH(CC - 1, CC + 1, 28, CL - 1);  // vila → clareira norte
        trilhaH(CC - 1, CC + 1, CL + 2, 118); // vila → clareira sul
        // PONTE extra sobre o rio na trilha norte-sul leste (c 118, l 60..80)
        trilhaH(118, 118, 60, 80);
        for (let l = 60; l <= 80; l++) { if (tipoEm(118, l) === 'agua') marcar(118, l, 'ponte'); }
        // trilha que liga o fim da ponte ao acampamento nordeste
        trilhaH(118, 158, 60, 60);

        // 5) CLAREIRA CENTRAL (vila) — raio 14 tiles ao redor do centro
        for (let l = CL - 14; l <= CL + 14; l++) {
            for (let c = CC - 14; c <= CC + 14; c++) {
                const d = Math.hypot(c - CC, l - CL);
                if (d <= 14 && l > 2 && l < ROWS - 3 && c > 2 && c < COLS - 3) {
                    const atual = tipoEm(c, l);
                    // Preserva pontes E trilhas (a trilha oeste→vila→lago atravessa a clareira)
                    if (atual !== 'ponte' && atual !== 'trilha') marcar(c, l, 'grama');
                }
            }
        }

        // 6) CABANAS DA VILA (bem elaboradas) — ao redor do spawn central
        // Posições NÃO sobrepõem as trilhas (linhas 74..76 e colunas 99..101):
        construirCabana(90, 64, 9, 6, 'S', 'Cabana do Guarda Florestal');   // norte
        construirCabana(96, 84, 9, 6, 'N', 'Cabana dos Viajantes');         // sul
        construirCabana(88, 78, 7, 7, 'E', 'Cabana do Ervas-Mestras');      // sudoeste
        construirCabana(107, 78, 7, 7, 'W', 'Cabana do Marceneiro');        // sudeste

        // 7) FOGUEIRAS — vila + 3 acampamentos
        const fogs = [
            { c: CC, l: 80, nome: 'Fogueira da Vila' },
            { c: 44, l: 44, nome: 'Acampamento das Ninfas' },
            { c: 134, l: 98, nome: 'Acampamento da Margem' },
            { c: 156, l: 30, nome: 'Acampamento dos Corujos' }
        ];
        for (let k = 0; k < fogs.length; k++) {
            const F = fogs[k];
            marcar(F.c, F.l, 'fogueira');
            // círculo de pedras ao redor fica no render; libera aproximação
            foguerasInfo.push({ x: FOR_X0 + F.c * TILE + TILE / 2, y: F.l * TILE + TILE / 2, nome: F.nome });
        }

        // 8) ZONA SEGURA DO SPAWN (centro do mapa) — sempre livre
        for (let l = CL - 3; l <= CL + 3; l++) {
            for (let c = CC - 3; c <= CC + 3; c++) {
                const t = tipoEm(c, l);
                if (t === 'cabana_parede' || t === 'cabana_chao' || t === 'fogueira') continue;
                marcar(c, l, 'grama');
            }
        }
        // Zona segura do portal (oeste, inclui o tile c=3 onde o portal fica)
        for (let l = CL - 4; l <= CL + 4; l++) {
            for (let c = 2; c <= 9; c++) {
                if (tipoEm(c, l) === 'arvore_gigante') marcar(c, l, 'grama');
            }
        }

        // 9) VEGETAÇÃO PROCEDURAL (árvores animadas, arbustos, pedras, flores)
        //    Zonas seguras do SPAWN central e do PORTAL nunca recebem vegetação.
        for (let l = 2; l < ROWS - 2; l++) {
            for (let c = 2; c < COLS - 2; c++) {
                if (c >= CC - 4 && c <= CC + 4 && l >= CL - 4 && l <= CL + 4) continue;
                if (c >= 2 && c <= 9 && l >= CL - 5 && l <= CL + 5) continue;
                const t = tipoEm(c, l);
                if (t !== 'grama' && t !== 'terra') continue;
                const h = hash2(c * 17, l * 43);
                // Não vegetar colado na trilha (respiro visual + passagem limpa)
                const pertoDeTrilha = tipoEm(c - 1, l) === 'trilha' || tipoEm(c + 1, l) === 'trilha' ||
                    tipoEm(c, l - 1) === 'trilha' || tipoEm(c, l + 1) === 'trilha';
                if (pertoDeTrilha) {
                    if (h > 0.88) marcar(c, l, 'flor');
                    continue;
                }
                if (h < 0.26) marcar(c, l, 'arvore');
                else if (h < 0.30) marcar(c, l, 'arbusto');
                else if (h > 0.97) marcar(c, l, 'pedra');
                else if (h > 0.36 && h < 0.44 && t === 'grama') marcar(c, l, 'flor');
                if (hash2(c * 7 + 3, l * 13 + 5) > 0.992) marcar(c, l, 'arvore_gigante');
            }
        }

        // 10) VAGALUMES (partículas de iluminação, determinísticos)
        const rnd = mulberry32(20261001);
        for (let i = 0; i < 26; i++) {
            vagalumes.push({
                x: FOR_X0 + (60 + rnd() * (COLS - 120)) * TILE,
                y: (20 + rnd() * (ROWS - 40)) * TILE,
                fase: rnd() * Math.PI * 2,
                raio: 26 + rnd() * 34
            });
        }

        return grid;
    }

    function resetarFloresta() {
        grid = null; sortables = []; cabanasInfo = []; foguerasInfo = []; vagalumes = [];
    }

    function isFloresta(x, y) { return x >= FOR_X0 && x < FOR_X1 && y >= 0 && y < FOR_Y1; }

    // Verifica se algum tile sob o círculo (x,y,raio) tem altura >= minAlt
    function alcanceAltura(x, y, minAlt, r) {
        if (!grid) gerarFloresta();
        const r2 = (typeof r === 'number') ? r : 8;
        const c0 = Math.max(0, Math.floor((x - FOR_X0 - r2) / TILE));
        const c1 = Math.min(COLS - 1, Math.floor((x - FOR_X0 + r2) / TILE));
        const l0 = Math.max(0, Math.floor((y - r2) / TILE));
        const l1 = Math.min(ROWS - 1, Math.floor((y + r2) / TILE));
        for (let l = l0; l <= l1; l++) {
            for (let c = c0; c <= c1; c++) {
                if (grid[l][c].alt >= minAlt) return true;
            }
        }
        return false;
    }

    // Ponto de chegada (spawn central) é SEMPRE seguro — evita tela preta falsa
    function zonaSeguraChegada(x, y) {
        return x >= PONTO_CHEGADA.x - 60 && x <= PONTO_CHEGADA.x + 60 &&
            y >= PONTO_CHEGADA.y - 60 && y <= PONTO_CHEGADA.y + 60;
    }

    function colideFloresta(x, y, raio) {
        if (!isFloresta(x, y)) return false;
        if (zonaSeguraChegada(x, y)) return false;
        return alcanceAltura(x, y, ALT_PEQUENA, raio);
    }

    function colideProjetilFloresta(x, y) {
        if (!isFloresta(x, y)) return false;
        if (!grid) gerarFloresta();
        const c = Math.floor((x - FOR_X0) / TILE);
        const l = Math.floor(y / TILE);
        if (c < 0 || c >= COLS || l < 0 || l >= ROWS) return true;
        return grid[l][c].alt >= ALT_MEDIA;
    }

    function colideMapaAtivo(x, y, raio) {
        const m = global.currentMap;
        if (m === 'floresta') return !isFloresta(x, y) || colideFloresta(x, y, raio);
        if (isFloresta(x, y)) return false;
        return typeof prevColide === 'function' ? prevColide(x, y, raio) : false;
    }

    function colideProjetilMapaAtivo(x, y) {
        const m = global.currentMap;
        if (m === 'floresta') return !isFloresta(x, y) || colideProjetilFloresta(x, y);
        if (isFloresta(x, y)) return false;
        return typeof prevColideP === 'function' ? prevColideP(x, y) : false;
    }

    function depositarPosicaoSegura(x0, y0) {
        if (!colideFloresta(x0, y0, 10)) return { x: x0, y: y0 };
        for (let r = 1; r <= 5; r++) {
            for (let a = 0; a < 10; a++) {
                const ang = (a / 10) * Math.PI * 2;
                const x = x0 + Math.cos(ang) * r * TILE;
                const y = y0 + Math.sin(ang) * r * TILE;
                if (!colideFloresta(x, y, 10)) return { x: x, y: y };
            }
        }
        return { x: PONTO_CHEGADA.x, y: PONTO_CHEGADA.y };
    }

    function infoPortalFloresta(x, y) {
        if (global.currentMap !== 'floresta') return null;
        if (PORTAL_FLORESTA_RETORNO && Math.hypot(x - PORTAL_FLORESTA_RETORNO.x, y - PORTAL_FLORESTA_RETORNO.y) < PORTAL_FLORESTA_RETORNO.r) {
            return { via: 'portal', mapa: 'cidade', alvo: PORTAL_FLORESTA_RETORNO.alvo };
        }
        return null;
    }

    function determinarMapaPorX(x) {
        if (global.MAPAS_REGISTRY) {
            const ids = Object.keys(global.MAPAS_REGISTRY);
            for (let i = 0; i < ids.length; i++) {
                const m = global.MAPAS_REGISTRY[ids[i]];
                if (x >= m.x0 && x < m.x0 + m.w) return m.id;
            }
        }
        return 'floresta';
    }

    function onUpdatePosicao(x, y) {
        if (global.estaMorto) return;
        if (typeof global.portalMapaPodeDisparar === 'function' && !global.portalMapaPodeDisparar(x, y)) return;
        let info = null;
        if (x >= FOR_X0) {
            info = infoPortalFloresta(x, y);
        } else if (florestaChainAnterior && typeof florestaChainAnterior.onUpdatePosicao === 'function') {
            florestaChainAnterior.onUpdatePosicao(x, y);
            return;
        }
        if (!info) return;
        if (typeof global.solicitarTeleporteMapa === 'function') {
            global.solicitarTeleporteMapa(info.mapa, 'floresta_' + info.mapa);
        }
    }

    function coletarFlorestaSortables(t, arr) { /* decor é desenhado no cenário */ }

    // ============================================================================
    // RENDERIZAÇÃO DO CLIENTE — desenharCenarioFloresta(t)
    // ============================================================================
    function desenharCenarioFloresta(t) {
        const ctx = global.ctx;
        if (!ctx) return;
        if (!grid) gerarFloresta();
        const camX = global.camX || 0, camY = global.camY || 0;
        const cw = ((global.canvas && global.canvas.width) || 900) / (global.ZOOM_CAMERA || 1);
        const ch = ((global.canvas && global.canvas.height) || 600) / (global.ZOOM_CAMERA || 1);
        const c0 = Math.max(0, Math.floor((camX - FOR_X0 - 240) / TILE));
        const c1 = Math.min(COLS - 1, Math.ceil((camX - FOR_X0 + cw + 240) / TILE));
        const l0 = Math.max(0, Math.floor((camY - 260) / TILE));
        const l1 = Math.min(ROWS - 1, Math.ceil((camY + ch + 260) / TILE));

        // ---------- PASSO 1: CHÃO ----------
        for (let l = l0; l <= l1; l++) {
            for (let c = c0; c <= c1; c++) {
                const x = FOR_X0 + c * TILE, y = l * TILE;
                const tl = grid[l][c].tipo;
                const h = hash2(c * 31, l * 57);
                if (tl === 'agua') {
                    // Água animada: base + ondas senoidais + brilhos
                    const g = ctx.createLinearGradient(x, y, x, y + TILE);
                    g.addColorStop(0, '#1b5e70');
                    g.addColorStop(1, '#123d4c');
                    ctx.fillStyle = g;
                    ctx.fillRect(x, y, TILE, TILE);
                    const onda = Math.sin(t * 1.8 + (c * 0.9 + l * 0.6)) * 0.5 + 0.5;
                    ctx.fillStyle = 'rgba(120, 210, 230,' + (0.10 + onda * 0.12).toFixed(3) + ')';
                    ctx.fillRect(x, y + 6 + onda * 10, TILE, 3);
                    ctx.fillStyle = 'rgba(200, 240, 250,' + (onda * 0.16).toFixed(3) + ')';
                    ctx.fillRect(x + 4 + onda * 8, y + TILE - 12, TILE * 0.35, 2);
                    // espuma nas bordas
                    if (l + 1 < ROWS && grid[l + 1][c].tipo !== 'agua') {
                        ctx.fillStyle = 'rgba(220, 245, 250, 0.35)';
                        ctx.fillRect(x, y + TILE - 3, TILE, 3);
                    }
                    if (l - 1 >= 0 && grid[l - 1][c].tipo !== 'agua') {
                        ctx.fillStyle = 'rgba(220, 245, 250, 0.28)';
                        ctx.fillRect(x, y, TILE, 3);
                    }
                } else if (tl === 'ponte') {
                    ctx.fillStyle = '#5a3d24';
                    ctx.fillRect(x, y, TILE, TILE);
                    ctx.fillStyle = '#6e4c2e';
                    for (let i = 0; i < 4; i++) ctx.fillRect(x, y + 2 + i * 10, TILE, 6);
                    ctx.fillStyle = '#3e2a18';
                    ctx.fillRect(x, y, TILE, 2);
                    ctx.fillRect(x, y + TILE - 2, TILE, 2);
                } else if (tl === 'trilha' || tl === 'terra') {
                    ctx.fillStyle = tl === 'trilha' ? '#8a6b47' : '#c2b280';
                    ctx.fillRect(x, y, TILE, TILE);
                    ctx.fillStyle = 'rgba(0,0,0,0.08)';
                    if (h > 0.5) ctx.fillRect(x + 6, y + 10, 8, 4);
                    if (h < 0.3) ctx.fillRect(x + 22, y + 24, 10, 4);
                } else if (tl === 'cabana_chao') {
                    ctx.fillStyle = '#7a5a38';
                    ctx.fillRect(x, y, TILE, TILE);
                    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
                } else {
                    // grama com 3 tons + flores
                    const tons = ['#2f6b33', '#35753a', '#2a5f2e'];
                    ctx.fillStyle = tons[Math.floor(h * 3) % 3];
                    ctx.fillRect(x, y, TILE, TILE);
                    if (tl === 'flor') {
                        const cores = ['#e8d44d', '#d980e0', '#e8e8e8'];
                        ctx.fillStyle = cores[Math.floor(h * 97) % 3];
                        ctx.beginPath(); ctx.arc(x + 10 + h * 12, y + 12, 2.2, 0, Math.PI * 2); ctx.fill();
                        ctx.beginPath(); ctx.arc(x + 26, y + 28 - h * 8, 2, 0, Math.PI * 2); ctx.fill();
                    }
                }
            }
        }

        // ---------- PASSO 2: OBJETOS (ordem por linha = painter's algorithm) ----------
        for (let l = l0; l <= l1; l++) {
            for (let c = c0; c <= c1; c++) {
                const x = FOR_X0 + c * TILE, y = l * TILE;
                const tl = grid[l][c].tipo;
                const cxTile = x + TILE / 2, cyBase = y + TILE - 6;
                const h = hash2(c * 17, l * 43);

                if (tl === 'arvore' || tl === 'arvore_gigante') {
                    const gig = tl === 'arvore_gigante';
                    const escala = gig ? 1.9 : (0.85 + h * 0.35);
                    const fase = h * Math.PI * 2;
                    const balanco = Math.sin(t * 1.3 + fase) * (gig ? 3.2 : 2.2);
                    // sombra
                    ctx.fillStyle = 'rgba(0,0,0,0.25)';
                    ctx.beginPath();
                    ctx.ellipse(cxTile, cyBase + 3, 13 * escala, 5 * escala, 0, 0, Math.PI * 2);
                    ctx.fill();
                    // tronco
                    ctx.fillStyle = gig ? '#4a3320' : '#5b4028';
                    ctx.fillRect(cxTile - 4 * escala, cyBase - 26 * escala, 8 * escala, 26 * escala);
                    ctx.fillStyle = 'rgba(0,0,0,0.2)';
                    ctx.fillRect(cxTile + 1 * escala, cyBase - 26 * escala, 3 * escala, 26 * escala);
                    // copa (3 camadas) — balança com o vento
                    const copaCores = gig ? ['#1e4d22', '#27632b', '#317a35'] : ['#2a5c2e', '#347038', '#3f8543'];
                    for (let k = 0; k < 3; k++) {
                        const rr = (gig ? 26 : 17) * escala - k * 6 * escala;
                        const yy = cyBase - (gig ? 40 : 30) * escala - k * 12 * escala;
                        ctx.fillStyle = copaCores[k];
                        ctx.beginPath();
                        ctx.ellipse(cxTile + balanco * (0.4 + k * 0.3), yy, rr, rr * 0.82, 0, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    // luz do topo
                    ctx.fillStyle = 'rgba(180, 235, 150, 0.18)';
                    ctx.beginPath();
                    ctx.ellipse(cxTile + balanco * 1.0 - 4, cyBase - (gig ? 66 : 52) * escala, (gig ? 14 : 9) * escala, (gig ? 8 : 5) * escala, -0.5, 0, Math.PI * 2);
                    ctx.fill();
                } else if (tl === 'arbusto') {
                    const fase = h * Math.PI * 2;
                    const balanco = Math.sin(t * 1.6 + fase) * 1.4;
                    ctx.fillStyle = 'rgba(0,0,0,0.18)';
                    ctx.beginPath(); ctx.ellipse(cxTile, cyBase + 2, 11, 4, 0, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#2e6b34';
                    ctx.beginPath(); ctx.ellipse(cxTile + balanco * 0.4, y + 22, 12, 9, 0, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#3c8442';
                    ctx.beginPath(); ctx.ellipse(cxTile + balanco * 0.6 - 2, y + 17, 8, 6, 0, 0, Math.PI * 2); ctx.fill();
                    if (h > 0.6) {
                        ctx.fillStyle = '#d94949';
                        ctx.beginPath(); ctx.arc(cxTile + balanco + 3, y + 16, 1.6, 0, Math.PI * 2); ctx.fill();
                        ctx.beginPath(); ctx.arc(cxTile + balanco - 4, y + 20, 1.4, 0, Math.PI * 2); ctx.fill();
                    }
                } else if (tl === 'pedra') {
                    ctx.fillStyle = 'rgba(0,0,0,0.2)';
                    ctx.beginPath(); ctx.ellipse(cxTile, cyBase + 2, 12, 5, 0, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#8d8d86';
                    ctx.beginPath();
                    ctx.moveTo(x + 6, y + 30); ctx.lineTo(x + 12, y + 14); ctx.lineTo(x + 26, y + 12);
                    ctx.lineTo(x + 34, y + 28); ctx.lineTo(x + 24, y + 34); ctx.lineTo(x + 10, y + 33);
                    ctx.closePath(); ctx.fill();
                    ctx.fillStyle = 'rgba(255,255,255,0.18)';
                    ctx.beginPath();
                    ctx.moveTo(x + 12, y + 14); ctx.lineTo(x + 26, y + 12); ctx.lineTo(x + 22, y + 20);
                    ctx.lineTo(x + 14, y + 21); ctx.closePath(); ctx.fill();
                } else if (tl === 'fogueira') {
                    desenharFogueira(ctx, cxTile, cyBase, t, h);
                }
            }
        }

        // ---------- PASSO 3: CABANAS (unidades completas, ordenadas por y) ----------
        for (let k = 0; k < cabanasInfo.length; k++) {
            const C = cabanasInfo[k];
            const px = FOR_X0 + C.c0 * TILE, py = C.l0 * TILE;
            const pw = C.w * TILE, ph = C.h * TILE;
            if (px + pw + 120 < camX || px - 120 > camX + cw || py + ph + 160 < camY || py - 160 > camY + ch) continue;
            desenharCabana(ctx, px, py, pw, ph, t, C);
        }

        // ---------- PASSO 4: PENUMBRA DA FLORESTA + ILUMINAÇÃO ----------
        const gx0 = Math.max(FOR_X0, camX - 80), gy0 = Math.max(0, camY - 80);
        const gx1 = Math.min(FOR_X1, camX + cw + 80), gy1 = Math.min(FOR_Y1, camY + ch + 80);
        if (gx1 > gx0 && gy1 > gy0) {
            // penumbra suave (clima de floresta densa)
            ctx.fillStyle = 'rgba(8, 22, 14, 0.20)';
            ctx.fillRect(gx0, gy0, gx1 - gx0, gy1 - gy0);

            // brilho quente das fogueiras + janelas das cabanas (aditivo)
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            for (let k = 0; k < foguerasInfo.length; k++) {
                const F = foguerasInfo[k];
                if (F.x + 200 < camX || F.x - 200 > camX + cw || F.y + 200 < camY || F.y - 200 > camY + ch) continue;
                const flick = 1 + Math.sin(t * 11 + k * 2.4) * 0.08 + Math.sin(t * 23 + k) * 0.04;
                const R = 150 * flick;
                const gF = ctx.createRadialGradient(F.x, F.y, 6, F.x, F.y, R);
                gF.addColorStop(0, 'rgba(255, 176, 64, 0.34)');
                gF.addColorStop(0.4, 'rgba(255, 120, 30, 0.16)');
                gF.addColorStop(1, 'rgba(255, 90, 20, 0)');
                ctx.fillStyle = gF;
                ctx.beginPath(); ctx.arc(F.x, F.y, R, 0, Math.PI * 2); ctx.fill();
            }
            for (let k = 0; k < cabanasInfo.length; k++) {
                const C = cabanasInfo[k];
                const px = FOR_X0 + C.c0 * TILE, py = C.l0 * TILE;
                const jx = px + C.w * TILE * 0.30, jy = py + C.h * TILE * 0.52;
                const jx2 = px + C.w * TILE * 0.70;
                const gJ = ctx.createRadialGradient(jx, jy, 2, jx, jy, 52);
                gJ.addColorStop(0, 'rgba(255, 205, 110, 0.30)');
                gJ.addColorStop(1, 'rgba(255, 170, 60, 0)');
                ctx.fillStyle = gJ;
                ctx.beginPath(); ctx.arc(jx, jy, 52, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = gJ;
                ctx.beginPath(); ctx.arc(jx2, jy, 40, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
        }

        // ---------- PASSO 5: VAGALUMES ----------
        for (let i = 0; i < vagalumes.length; i++) {
            const V = vagalumes[i];
            if (V.x < camX - 40 || V.x > camX + cw + 40 || V.y < camY - 40 || V.y > camY + ch + 40) continue;
            const fx = V.x + Math.sin(t * 0.7 + V.fase) * V.raio;
            const fy = V.y + Math.cos(t * 0.53 + V.fase * 1.7) * V.raio * 0.6;
            const alfa = 0.35 + Math.sin(t * 2.2 + V.fase * 3) * 0.35;
            if (alfa <= 0.05) continue;
            const gV = ctx.createRadialGradient(fx, fy, 0, fx, fy, 7);
            gV.addColorStop(0, 'rgba(220, 255, 120,' + alfa.toFixed(3) + ')');
            gV.addColorStop(1, 'rgba(180, 255, 80, 0)');
            ctx.fillStyle = gV;
            ctx.beginPath(); ctx.arc(fx, fy, 7, 0, Math.PI * 2); ctx.fill();
        }

        // ---------- PASSO 6: PORTAL DE RETORNO ----------
        desenharPortalFlorestaRetorno(ctx, t, camX, camY, cw, ch);
    }

    // ---- Fogueira: pedras + lenha + chamas animadas + brasas + fumaça ----
    function desenharFogueira(ctx, x, y, t, h) {
        // círculo de pedras
        ctx.fillStyle = '#6f6f68';
        for (let i = 0; i < 7; i++) {
            const a = (i / 7) * Math.PI * 2;
            ctx.beginPath();
            ctx.arc(x + Math.cos(a) * 13, y + Math.sin(a) * 7 + 2, 3.4, 0, Math.PI * 2);
            ctx.fill();
        }
        // lenha cruzada
        ctx.strokeStyle = '#5b4028';
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(x - 9, y + 6); ctx.lineTo(x + 9, y - 4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x - 9, y - 4); ctx.lineTo(x + 9, y + 6); ctx.stroke();
        // carvão aceso
        ctx.fillStyle = 'rgba(255, 120, 30,' + (0.5 + Math.sin(t * 9 + h * 9) * 0.25).toFixed(3) + ')';
        ctx.beginPath(); ctx.ellipse(x, y + 1, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
        // 3 línguas de chama com flicker
        for (let k = 0; k < 3; k++) {
            const alt = (12 - k * 3.4) * (1 + Math.sin(t * (7 + k * 2.3) + k * 1.7) * 0.25);
            const dx = (k - 1) * 3.2;
            const grad = ctx.createLinearGradient(x + dx, y - alt, x + dx, y + 4);
            grad.addColorStop(0, k === 1 ? 'rgba(255, 235, 120, 0.95)' : 'rgba(255, 160, 40, 0.9)');
            grad.addColorStop(0.6, 'rgba(255, 100, 20, 0.85)');
            grad.addColorStop(1, 'rgba(200, 40, 10, 0.4)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(x + dx - 4, y + 3);
            ctx.quadraticCurveTo(x + dx - 5, y - alt * 0.5, x + dx + Math.sin(t * 9 + k) * 2, y - alt);
            ctx.quadraticCurveTo(x + dx + 5, y - alt * 0.5, x + dx + 4, y + 3);
            ctx.closePath();
            ctx.fill();
        }
        // brasas subindo
        for (let i = 0; i < 4; i++) {
            const prog = (t * 0.55 + i / 4 + h) % 1;
            const bx = x + Math.sin(t * 3 + i * 2.1) * 6 * prog;
            const by = y - prog * 34;
            ctx.fillStyle = 'rgba(255, 140, 40,' + (Math.sin(prog * Math.PI) * 0.75).toFixed(3) + ')';
            ctx.beginPath(); ctx.arc(bx, by, 1.6 - prog, 0, Math.PI * 2); ctx.fill();
        }
        // fumaça
        for (let i = 0; i < 3; i++) {
            const prog = (t * 0.28 + i / 3 + h * 0.5) % 1;
            const sx = x + Math.sin(t * 1.1 + i * 2.4) * 10 * prog;
            const sy = y - 18 - prog * 46;
            ctx.fillStyle = 'rgba(120, 120, 120,' + (Math.sin(prog * Math.PI) * 0.16).toFixed(3) + ')';
            ctx.beginPath(); ctx.arc(sx, sy, 4 + prog * 9, 0, Math.PI * 2); ctx.fill();
        }
    }

    // ---- Cabana elaborada: paredes de tábuas, cantos, telhado, porta, janelas, chaminé ----
    function desenharCabana(ctx, px, py, pw, ph, t, C) {
        // sombra no chão
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.beginPath();
        ctx.ellipse(px + pw / 2, py + ph + 6, pw * 0.62, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        // paredes de madeira (tábuas horizontais)
        const gParede = ctx.createLinearGradient(px, py, px, py + ph);
        gParede.addColorStop(0, '#7c5836');
        gParede.addColorStop(1, '#5d3f26');
        ctx.fillStyle = gParede;
        ctx.fillRect(px, py, pw, ph);
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = 1.4;
        for (let yy = py + 8; yy < py + ph; yy += 10) {
            ctx.beginPath(); ctx.moveTo(px + 2, yy); ctx.lineTo(px + pw - 2, yy); ctx.stroke();
        }
        // vigas dos cantos
        ctx.fillStyle = '#4a3018';
        ctx.fillRect(px, py, 6, ph); ctx.fillRect(px + pw - 6, py, 6, ph);
        ctx.fillRect(px, py, pw, 6);

        // PORTA (do lado indicado) com moldura
        const dw = 26, dh = 34;
        let dxp, dyp;
        if (C.doorSide === 'S') { dxp = px + pw / 2 - dw / 2; dyp = py + ph - dh - 2; }
        else if (C.doorSide === 'N') { dxp = px + pw / 2 - dw / 2; dyp = py + 4; }
        else if (C.doorSide === 'E') { dxp = px + pw - 30; dyp = py + ph / 2 - dh / 2; }
        else { dxp = px + 4; dyp = py + ph / 2 - dh / 2; }
        ctx.fillStyle = '#3c2712';
        ctx.fillRect(dxp - 3, dyp - 3, dw + 6, dh + 6);
        const gPorta = ctx.createLinearGradient(dxp, dyp, dxp + dw, dyp + dh);
        gPorta.addColorStop(0, '#8a6134'); gPorta.addColorStop(1, '#6b4826');
        ctx.fillStyle = gPorta;
        ctx.fillRect(dxp, dyp, dw, dh);
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.moveTo(dxp + dw / 2, dyp); ctx.lineTo(dxp + dw / 2, dyp + dh); ctx.stroke();
        ctx.fillStyle = '#d9b45c';
        ctx.beginPath(); ctx.arc(dxp + dw - 6, dyp + dh / 2, 2.4, 0, Math.PI * 2); ctx.fill();

        // JANELAS com vidro aceso (o brilho aditivo fica na passada de luz)
        const wy = py + ph * 0.30;
        const winSpots = [[px + pw * 0.30, wy], [px + pw * 0.70, wy]];
        for (let i = 0; i < winSpots.length; i++) {
            const wx = winSpots[i][0];
            ctx.fillStyle = '#3c2712';
            ctx.fillRect(wx - 12, wy - 10, 24, 20);
            const pulsa = 0.75 + Math.sin(t * 2.1 + i * 2 + px) * 0.12;
            ctx.fillStyle = 'rgba(255, 200, 110,' + pulsa.toFixed(3) + ')';
            ctx.fillRect(wx - 9, wy - 7, 18, 14);
            ctx.strokeStyle = 'rgba(60, 39, 18, 0.9)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(wx, wy - 7); ctx.lineTo(wx, wy + 7);
            ctx.moveTo(wx - 9, wy); ctx.lineTo(wx + 9, wy);
            ctx.stroke();
        }

        // TELHADO (duas águas com cumeeira) + beiral
        const topoY = py - 14;
        const gTel = ctx.createLinearGradient(px - 10, topoY, px + pw + 10, topoY + 30);
        gTel.addColorStop(0, '#a8442e');
        gTel.addColorStop(0.5, '#8f3524');
        gTel.addColorStop(1, '#6e2818');
        ctx.fillStyle = gTel;
        ctx.beginPath();
        ctx.moveTo(px - 12, py + 4);          // beiral esquerdo
        ctx.lineTo(px + pw / 2, topoY);       // cumeeira
        ctx.lineTo(px + pw + 12, py + 4);     // beiral direito
        ctx.lineTo(px + pw + 4, py + 12);
        ctx.lineTo(px + pw / 2, topoY + 10);
        ctx.lineTo(px - 4, py + 12);
        ctx.closePath();
        ctx.fill();
        // telhas (linhas)
        ctx.strokeStyle = 'rgba(0,0,0,0.22)';
        ctx.lineWidth = 1;
        for (let i = 1; i <= 4; i++) {
            const yy = topoY + 10 + i * 7;
            const half = Math.max(0, (yy - topoY) * 0.42);
            ctx.beginPath();
            ctx.moveTo(px + pw / 2 - half * 1.9, yy);
            ctx.lineTo(px + pw / 2 + half * 1.9, yy);
            ctx.stroke();
        }
        // cumeeira clara
        ctx.strokeStyle = '#c96a4a';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(px + pw / 2, topoY);
        ctx.lineTo(px + pw / 2, topoY + 10);
        ctx.stroke();

        // CHAMINÉ com fumaça animada
        const chx = px + pw - 18, chy = topoY + 6;
        ctx.fillStyle = '#6d6d68';
        ctx.fillRect(chx, chy - 10, 12, 20);
        ctx.fillStyle = '#575752';
        ctx.fillRect(chx - 2, chy - 14, 16, 6);
        for (let i = 0; i < 3; i++) {
            const prog = (t * 0.3 + i / 3) % 1;
            ctx.fillStyle = 'rgba(150, 150, 150,' + (Math.sin(prog * Math.PI) * 0.22).toFixed(3) + ')';
            ctx.beginPath();
            ctx.arc(chx + 6 + Math.sin(t * 1.4 + i) * 6 * prog, chy - 18 - prog * 40, 4 + prog * 8, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // ---- Portal de retorno (vórtice verde-esmeralda) ----
    function desenharPortalFlorestaRetorno(ctx, t, camX, camY, cw, ch) {
        const p = PORTAL_FLORESTA_RETORNO;
        if (!p) return;
        if (p.x + p.r + 120 < camX || p.x - p.r - 120 > camX + cw || p.y + p.r + 120 < camY || p.y - p.r - 120 > camY + ch) return;
        const pulsar = 1 + Math.sin(t * 2.2) * 0.06;
        const R = p.r * pulsar;

        ctx.save();
        // aura
        const haloR = R * 1.8 + Math.sin(t * 3.1) * 4;
        const gHalo = ctx.createRadialGradient(p.x, p.y, R * 0.4, p.x, p.y, haloR);
        gHalo.addColorStop(0, 'rgba(60, 220, 130, 0.16)');
        gHalo.addColorStop(0.55, 'rgba(30, 140, 90, 0.08)');
        gHalo.addColorStop(1, 'rgba(20, 90, 60, 0)');
        ctx.fillStyle = gHalo;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, haloR, haloR * 0.62, 0, 0, Math.PI * 2); ctx.fill();

        // anéis
        ctx.strokeStyle = 'rgba(120, 240, 170, 0.9)';
        ctx.lineWidth = 3;
        ctx.setLineDash([R * 0.6, R * 0.3]);
        ctx.beginPath(); ctx.ellipse(p.x, p.y, R * 1.25, R * 0.66, t * 0.9, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([R * 0.45, R * 0.42]);
        ctx.strokeStyle = 'rgba(70, 200, 130, 0.75)';
        ctx.beginPath(); ctx.ellipse(p.x, p.y, R * 1.4, R * 0.72, -t * 0.65, Math.PI * 0.3, Math.PI * 2.3); ctx.stroke();
        ctx.setLineDash([]);

        // vórtice
        const gV = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, R);
        gV.addColorStop(0, 'rgba(240, 255, 245, 0.95)');
        gV.addColorStop(0.3, 'rgba(130, 240, 180, 0.85)');
        gV.addColorStop(0.65, 'rgba(40, 160, 100, 0.6)');
        gV.addColorStop(1, 'rgba(10, 60, 40, 0.4)');
        ctx.fillStyle = gV;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, R - 1, R * 0.55, 0, 0, Math.PI * 2); ctx.fill();

        // partículas subindo
        for (let i = 0; i < 10; i++) {
            const prog = (t * 0.8 + i / 10) % 1;
            const swayX = Math.sin(t * 1.6 + i * 1.7) * R * 0.4;
            ctx.fillStyle = 'rgba(190, 250, 210,' + (Math.sin(prog * Math.PI) * 0.85).toFixed(3) + ')';
            ctx.beginPath();
            ctx.arc(p.x + swayX, p.y + R * 0.45 - prog * R * 1.5, 1.2 + (1 - prog) * 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // folhas orbitando (tema floresta)
        for (let i = 0; i < 5; i++) {
            const ang = t * 1.8 + i * (Math.PI * 2 / 5);
            const rx = p.x + Math.cos(ang) * R * 1.15;
            const ry = p.y + Math.sin(ang) * R * 0.6;
            ctx.save();
            ctx.translate(rx, ry);
            ctx.rotate(ang * 2);
            ctx.fillStyle = 'rgba(110, 220, 130, 0.9)';
            ctx.beginPath();
            ctx.ellipse(0, 0, 4, 1.8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // rótulos
        ctx.font = 'bold 13px Arial';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#1e8c5a';
        ctx.shadowBlur = 14;
        ctx.fillStyle = '#ffffff';
        ctx.fillText('PORTAL DA FLORESTA', p.x, p.y + R + 26);
        ctx.shadowBlur = 8;
        ctx.font = '11px Arial';
        ctx.fillStyle = '#b8f5cf';
        ctx.fillText('Voltar a Davahl', p.x, p.y + R + 39);
        ctx.restore();
    }

    // ============================================================================
    // API
    // ============================================================================
    const api = {
        TILE: TILE,
        FOR_X0: FOR_X0, FOR_X1: FOR_X1, FOR_Y1: FOR_Y1,
        COLS: COLS, ROWS: ROWS,
        ALT_LIVRE: ALT_LIVRE, ALT_PEQUENA: ALT_PEQUENA, ALT_MEDIA: ALT_MEDIA, ALT_ALTA: ALT_ALTA,
        PORTAL_FLORESTA_RETORNO: PORTAL_FLORESTA_RETORNO,
        PONTO_CHEGADA: PONTO_CHEGADA,
        FOR_SPAWN: FOR_SPAWN,
        LARGURA_FLORESTA: FOR_X0,
        FIM_FLORESTA: FOR_X1,
        ALTO_FLORESTA: FOR_Y1,
        gerarFloresta: gerarFloresta,
        resetarFloresta: resetarFloresta,
        grid: function () { return grid; },
        isFloresta: isFloresta,
        colideFloresta: colideFloresta,
        colideProjetilFloresta: colideProjetilFloresta,
        infoPortalFloresta: infoPortalFloresta,
        depositarPosicaoSegura: depositarPosicaoSegura,
        desenharCenarioFloresta: desenharCenarioFloresta,
        coletarFlorestaSortables: coletarFlorestaSortables,
        colideMapaAtivo: colideMapaAtivo,
        colideProjetilMapaAtivo: colideProjetilMapaAtivo,
        onUpdatePosicao: onUpdatePosicao
    };

    if (typeof window !== 'undefined') {
        gerarFloresta();
        florestaChainAnterior = global.chainMapas;
        global.chainMapas = { onUpdatePosicao: onUpdatePosicao };
        global.desenharCenarioFloresta = desenharCenarioFloresta;
        global.coletarFlorestaSortables = coletarFlorestaSortables;
        global.colideFloresta = colideFloresta;
        global.colideProjetilFloresta = colideProjetilFloresta;
        global.infoPortalFloresta = infoPortalFloresta;
        // Encadeia colisão ativa com o mapa carregado anteriormente (padrão castelo)
        prevColide = global.colideMapaAtivo;
        global.colideMapaAtivo = function (x, y, raio) {
            if (global.currentMap === 'floresta') return !isFloresta(x, y) || colideFloresta(x, y, raio);
            if (isFloresta(x, y)) return false;
            return typeof prevColide === 'function' ? prevColide(x, y, raio) : false;
        };
        prevColideP = global.colideProjetilMapaAtivo;
        global.colideProjetilMapaAtivo = function (x, y) {
            if (global.currentMap === 'floresta') return !isFloresta(x, y) || colideProjetilFloresta(x, y);
            if (isFloresta(x, y)) return false;
            return typeof prevColideP === 'function' ? prevColideP(x, y) : false;
        };
        global.mapaFloresta = api;
    }

    if (typeof module !== 'undefined' && module.exports) {
        if (!grid) gerarFloresta();
        module.exports = api;
    }

})(typeof window !== 'undefined' ? window : this);
