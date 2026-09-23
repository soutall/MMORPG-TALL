// mapa_arena.js — FASE 6: "Arena de Davahl" (chao baseado em sprites/arena.png)
// Modulo top-down: navegador (window) e servidor (module.exports).
// Arena: x em [63800, 65040) x y em [0, 1240), tile=40 -> 31x31 tiles.
//
// ACESSO: somente pelo Portal de Viagem da Cidade de Davahl (PORTAL_MAPAS da
// cidade -> opcao "Arena de Davahl" na janela de teleporte). A muralha leste da
// cidade fecha o lado oeste da arena, logo nao existe caminhada cidade->arena.
//   • chegada  -> PONTO_CHEGADA (64180,460): corredor oeste (row 11, todo livre).
//   • retorno  -> PORTAL_ARENA_RETORNO (63980,460), no portao oeste da arena,
//                 leva para a cidade em (63740,620).
// A arena e' SELADA: qualquer ponto fora do retangulo colide, assim o jogador
// nao escapa para o vazio nem para dentro da muralha da cidade.
// ============================================================================
(function (global) {
    'use strict';

    const TILE = 40;
    const ARENA_X0 = 63800;
    const ARENA_X1 = 65040;
    const ARENA_Y1 = 1240;
    const COLS = 31;
    const ROWS = 31;

    const ALT_LIVRE = 0;
    const ALT_MEDIA = 2;
    const ALT_ALTA = 3;

    const OFF_X = 7;
    const OFF_Y = 7;

    // Portal de retorno no portao OESTE (e nao no centro da arena, para nao
    // expulsar o jogador que estiver lutando no medalhao central).
    const PORTAL_ARENA_RETORNO = { x: 63980, y: 460, r: 62, alvo: { x: 60487, y: 660 } };
    // Ponto de chegada usado pelo teleporte do servidor (PONTOS_TELEPORTE.arena).
    // Row 11 da grade e' um corredor 100% livre: 200px a leste do portal, ou seja
    // bem fora do raio 62 (com a folga de ±10 do servidor a distancia minima e' 190).
    const PONTO_CHEGADA = { x: 64180, y: 460 };

    const gridData = [[true,true,true,false,true,true,true,true,true,true,true,true,true,false,true,true,true,false,true,true,true,true,true,true,true,true,true,true,true,true,true],[true,false,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,false,true],[true,true,true,true,true,true,true,false,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,false,true,true,true,true,true,true,true],[false,true,true,false,false,false,false,false,true,false,true,true,true,false,false,false,false,false,true,true,true,false,false,false,false,false,false,false,true,true,false],[true,true,true,false,false,false,true,false,false,false,true,true,true,false,false,true,false,false,true,true,true,false,false,false,true,false,false,false,true,true,true],[false,true,false,false,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,false,false,true,true],[false,true,false,true,true,false,true,true,true,true,false,false,true,true,false,false,false,true,true,false,false,true,true,true,true,true,true,true,false,true,false],[false,true,true,true,true,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,true,true,true,false,false],[true,true,true,true,false,false,false,false,false,false,false,false,false,false,false,true,false,false,false,false,false,false,false,false,false,false,false,true,true,false,true],[true,true,true,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,true,true,true],[true,true,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,true,true,true],[false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false],[false,true,true,true,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,true,true,true,false],[false,true,true,true,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,true,true,true,false],[true,true,true,false,true,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,true,false,true,true,true],[false,true,false,false,true,false,true,true,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,true,true,false,true,false,false,true,false],[false,true,true,false,true,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,true,false,true,true,false],[false,true,true,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,true,true,false],[false,false,true,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,true,false,false],[false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false],[true,true,true,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,true,true,true],[false,true,true,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,true,true,false],[false,false,true,false,false,false,false,false,false,false,false,false,false,false,false,true,false,false,false,false,false,false,false,false,false,false,false,false,true,false,false],[false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,true],[false,false,false,true,true,true,false,false,false,false,false,false,false,true,true,true,true,false,false,false,false,false,false,false,false,true,true,true,false,false,false],[true,false,true,false,false,false,true,true,false,false,false,false,true,true,true,false,true,false,true,false,false,false,false,true,true,false,false,true,true,false,true],[true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,false,true],[true,true,true,true,true,true,true,true,true,false,true,true,true,true,true,true,true,true,true,true,true,false,true,true,true,true,true,true,true,true,true],[true,true,false,false,false,true,true,true,true,false,true,true,true,true,true,false,true,true,true,true,true,false,true,true,true,true,false,false,false,false,true],[true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true],[true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true]];

    let grid = null;
    let sortables = [];
    let decor = [];
    let _imgArena = null;
    let _overlayArena = null;
    let arenaChainAnterior = null;

    function gerarArena() {
        if (grid) return grid;
        grid = [];
        for (let l = 0; l < ROWS; l++) {
            const row = [];
            for (let c = 0; c < COLS; c++) {
                const parede = !!(gridData[l] && gridData[l][c]);
                row.push({ tipo: parede ? 'parede' : 'chao', alt: parede ? ALT_MEDIA : ALT_LIVRE });
            }
            grid.push(row);
        }
        return grid;
    }

    function isArena(x, y) { return x >= ARENA_X0 && x < ARENA_X1 && y >= 0 && y < ARENA_Y1; }

    function colideArena(x, y, raio) {
        if (!grid || !isArena(x, y)) return false;
        let c = Math.floor((x - ARENA_X0) / TILE);
        let l = Math.floor(y / TILE);
        if (c < 0 || c >= COLS || l < 0 || l >= ROWS) return true;
        return grid[l][c].alt >= ALT_MEDIA;
    }

    function colideProjetilArena(x, y) {
        if (!grid || !isArena(x, y)) return false;
        let c = Math.floor((x - ARENA_X0) / TILE);
        let l = Math.floor(y / TILE);
        if (c < 0 || c >= COLS || l < 0 || l >= ROWS) return true;
        return grid[l][c].alt >= ALT_MEDIA;
    }

    function colideMapaAtivo(x, y, raio) {
        const m = global.currentMap;
        // 'solari' compartilha EXATAMENTE a geometria da Arena (faixa leste)
        if (m === 'arena' || m === 'solari') return !isArena(x, y) || colideArena(x, y, raio);
        if (m === 'cidade') return (global.colideCidade ? global.colideCidade(x, y, raio) : false);
        if (m === 'caverna') return (global.colideCaverna ? global.colideCaverna(x, y, raio) : false);
        if (m === 'pantano') return (global.colidePantano ? global.colidePantano(x, y, raio) : false);
        if (m === 'desert') return (global.colideDeserto ? global.colideDeserto(x, y, raio) : false);
        return false;
    }

    function colideProjetilMapaAtivo(x, y) {
        const m = global.currentMap;
        if (m === 'arena' || m === 'solari') return !isArena(x, y) || colideProjetilArena(x, y);
        if (m === 'cidade') return (global.colideProjetilCidade ? global.colideProjetilCidade(x, y) : false);
        if (m === 'caverna') return (global.colideProjetilCaverna ? global.colideProjetilCaverna(x, y) : false);
        if (m === 'pantano') return (global.colideProjetilPantano ? global.colideProjetilPantano(x, y) : false);
        if (m === 'desert') return (global.colideProjetilDeserto ? global.colideProjetilDeserto(x, y) : false);
        return false;
    }

    function depositarPosicaoSegura(x0, y0) {
        if (!colideArena(x0, y0, 10)) return { x: x0, y: y0 };
        for (let r = 1; r <= 4; r++) {
            for (let a = 0; a < 8; a++) {
                let ang = (a / 8) * Math.PI * 2;
                let x = x0 + Math.cos(ang) * r * TILE;
                let y = y0 + Math.sin(ang) * r * TILE;
                if (!colideArena(x, y, 10)) return { x: x, y: y };
            }
        }
        return { x: PONTO_CHEGADA.x, y: PONTO_CHEGADA.y };
    }

    function resetarArena() { grid = null; sortables = []; decor = []; _imgArena = null; }


    function garantirImagem() {
        if (_imgArena) return _imgArena;
        if (typeof document === 'undefined') return null;
        _imgArena = new Image();
        _imgArena.src = 'sprites/arena.png';
        return _imgArena;
    }

    function desenharCenarioArena(t) {
        const ctx = global.ctx;
        if (!ctx) return;
        if (!grid) gerarArena();
        const camX = global.camX || 0, camY = global.camY || 0;
        const cw = ((global.canvas && global.canvas.width) || 900) / (global.ZOOM_CAMERA || 1);
        const ch = ((global.canvas && global.canvas.height) || 600) / (global.ZOOM_CAMERA || 1);
        const c0 = Math.max(0, Math.floor((camX - ARENA_X0 - 240) / TILE));
        const c1 = Math.min(COLS - 1, Math.ceil((camX - ARENA_X0 + cw + 240) / TILE));
        const l0 = Math.max(0, Math.floor((camY - 240) / TILE));
        const l1 = Math.min(ROWS - 1, Math.ceil((camY + ch + 240) / TILE));
        const img = garantirImagem();
        for (let l = l0; l <= l1; l++) {
            for (let c = c0; c <= c1; c++) {
                const x = ARENA_X0 + c * TILE;
                const y = l * TILE;
                if (img && img.complete && img.naturalWidth) {
                    ctx.drawImage(img, OFF_X + c * TILE, OFF_Y + l * TILE, TILE, TILE, x, y, TILE, TILE);
                } else {
                    ctx.fillStyle = grid[l][c].alt >= ALT_MEDIA ? '#443' : '#2a2a2a';
                    ctx.fillRect(x, y, TILE, TILE);
                }
            }
        }
        desenharPortalArenaRetorno(ctx, t, camX, camY, cw, ch);
        // Arena de Solari: leve brilho roxo no cenário para diferenciar da Arena normal
        if (global.currentMap === 'solari') {
            const gx0 = Math.max(ARENA_X0, camX - 80), gy0 = Math.max(0, camY - 80);
            const gx1 = Math.min(ARENA_X1, camX + cw + 80), gy1 = Math.min(ARENA_Y1, camY + ch + 80);
            if (gx1 > gx0 && gy1 > gy0) {
                const tg = ctx.createLinearGradient(gx0, gy0, gx1, gy1);
                tg.addColorStop(0, 'rgba(124, 58, 237, 0.10)');
                tg.addColorStop(0.5, 'rgba(168, 85, 247, 0.06)');
                tg.addColorStop(1, 'rgba(88, 28, 135, 0.14)');
                ctx.fillStyle = tg;
                ctx.fillRect(gx0, gy0, gx1 - gx0, gy1 - gy0);
            }
        }
    }

    // Paletas do Portal Vortex (vermelho = Solari / ciano = Arena normal)
    const PALETA_PORTAL_CYAN = {
        halo0: 'rgba(0,200,255,0.14)', halo1: 'rgba(30,90,240,0.08)', halo2: 'rgba(30,60,160,0)',
        solo0: 'rgba(0,229,255,0.85)', solo1: 'rgba(64,120,255,0.55)', solo2: 'rgba(0,60,180,0.85)',
        anel1: 'rgba(120,220,255,0.9)', anel2: 'rgba(80,140,255,0.75)',
        vortex0: 'rgba(235,255,255,0.95)', vortex1: 'rgba(120,230,255,0.85)', vortex2: 'rgba(40,120,255,0.6)', vortex3: 'rgba(12,40,140,0.5)', vortex4: 'rgba(2,8,30,0.35)',
        espiral: 'rgba(190,240,255,0.75)',
        nucleo0: '#ffffff', nucleo1: 'rgba(150,235,255,0.95)', nucleo2: 'rgba(30,120,255,0)',
        part: 'rgba(190,245,255,', partRastro: 'rgba(120,220,255,',
        runa: 'rgba(170,235,255,0.95)', runaSombra: '#00e5ff',
        raio: 'rgba(160,235,255,0.28)',
        sombra: '#00ccff', lab1: '#ffffff', lab2: '#80d8ff',
        rotulo1: 'PORTAL DA ARENA', rotulo2: 'Voltar a Davahl'
    };
    const PALETA_PORTAL_RED = {
        halo0: 'rgba(255,70,60,0.16)', halo1: 'rgba(180,30,40,0.08)', halo2: 'rgba(120,10,20,0)',
        solo0: 'rgba(255,120,110,0.85)', solo1: 'rgba(220,60,60,0.55)', solo2: 'rgba(140,10,30,0.85)',
        anel1: 'rgba(255,120,110,0.9)', anel2: 'rgba(255,60,60,0.75)',
        vortex0: 'rgba(255,235,230,0.95)', vortex1: 'rgba(255,120,110,0.85)', vortex2: 'rgba(220,50,50,0.6)', vortex3: 'rgba(120,10,20,0.5)', vortex4: 'rgba(40,2,8,0.35)',
        espiral: 'rgba(255,200,190,0.75)',
        nucleo0: '#ffffff', nucleo1: 'rgba(255,170,150,0.95)', nucleo2: 'rgba(220,60,60,0)',
        part: 'rgba(255,190,180,', partRastro: 'rgba(255,120,110,',
        runa: 'rgba(255,170,160,0.95)', runaSombra: '#ff5a4d',
        raio: 'rgba(255,180,170,0.28)',
        sombra: '#ff4d4d', lab1: '#ffffff', lab2: '#ffb3ab',
        rotulo1: 'PORTAL DA SOLARI', rotulo2: 'Selo Arcano'
    };

    function desenharPortalArenaRetorno(ctx, t, camX, camY, cw, ch) {
        const p = PORTAL_ARENA_RETORNO;
        if (p.x + p.r + 120 < camX || p.x - p.r - 120 > camX + cw || p.y + p.r + 120 < camY || p.y - p.r - 120 > camY + ch) return;
        // FIX v1.33.4 mantido: o portal da Solari é DECORATIVO (não teleporta) —
        // a saída da partida continua pelo painel da Solari / Renascer.
        const ehSolari = global.currentMap === 'solari';
        const pal = ehSolari ? PALETA_PORTAL_RED : PALETA_PORTAL_CYAN;

        const pulsar = 1 + Math.sin(t * 2.2) * 0.06;
        const R = p.r * pulsar;             // raio principal do vórtice
        const ry = R * 0.52;                // achatamento vertical

        ctx.save();

        // ---- SOMBRA NO CHÃO ----
        const gSombra = ctx.createRadialGradient(p.x, p.y + 8, 4, p.x, p.y + 8, R * 1.15);
        gSombra.addColorStop(0, 'rgba(0,0,0,0.55)');
        gSombra.addColorStop(0.6, 'rgba(8,8,20,0.35)');
        gSombra.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gSombra;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + 8, R * 1.15, R * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();

        // ---- AURA EXTERNA (halo pulsante) ----
        const haloR = R * 1.9 + Math.sin(t * 3.1) * 4;
        const gHalo = ctx.createRadialGradient(p.x, p.y, R * 0.4, p.x, p.y, haloR);
        gHalo.addColorStop(0, pal.halo0);
        gHalo.addColorStop(0.55, pal.halo1);
        gHalo.addColorStop(1, pal.halo2);
        ctx.fillStyle = gHalo;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, haloR, haloR * 0.62, 0, 0, Math.PI * 2);
        ctx.fill();

        // ---- ANEL DE LUZ NO CHÃO ----
        ctx.save();
        ctx.translate(p.x, p.y + 8);
        const gsolo = ctx.createLinearGradient(0, -R * 0.32, 0, R * 0.32);
        gsolo.addColorStop(0, pal.solo0);
        gsolo.addColorStop(0.5, pal.solo1);
        gsolo.addColorStop(1, pal.solo2);
        ctx.strokeStyle = gsolo;
        ctx.lineWidth = 2.4;
        ctx.setLineDash([R * 0.34, R * 0.18]);
        ctx.beginPath();
        ctx.ellipse(0, 0, R * 1.12, R * 0.5, t * 0.7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // ---- ANÉIS GIROS (sentidos opostos) ----
        ctx.shadowColor = pal.sombra;
        ctx.shadowBlur = 12;
        ctx.lineWidth = 3;
        ctx.setLineDash([R * 0.6, R * 0.3]);
        ctx.strokeStyle = pal.anel1;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, R * 1.3, R * 0.68, t * 0.9, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([R * 0.45, R * 0.42]);
        ctx.strokeStyle = pal.anel2;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, R * 1.42, R * 0.74, -t * 0.65, Math.PI * 0.3, Math.PI * 2.3);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;

        // ---- VÓRTICE INTERNO (nebulosa espiralada) ----
        const gV = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, R);
        gV.addColorStop(0, pal.vortex0);
        gV.addColorStop(0.25, pal.vortex1);
        gV.addColorStop(0.55, pal.vortex2);
        gV.addColorStop(0.85, pal.vortex3);
        gV.addColorStop(1, pal.vortex4);
        ctx.fillStyle = gV;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, R - 1, ry - 1, 0, 0, Math.PI * 2);
        ctx.fill();

        // espirais internas (4 braços de energia)
        for (let i = 0; i < 4; i++) {
            const baseA = t * 2.6 + (i * Math.PI) / 2;
            const gBr = ctx.createLinearGradient(p.x, p.y - ry, p.x, p.y + ry);
            gBr.addColorStop(0, 'rgba(255,255,255,0)');
            gBr.addColorStop(0.5, pal.espiral);
            gBr.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.strokeStyle = gBr;
            ctx.lineWidth = 2.6;
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, R * 0.85, ry * 0.85, baseA, 0, Math.PI * 0.85);
            ctx.stroke();
        }

        // ---- FUNIL CENTRAL (núcleo que "respira") ----
        const breathe = R * (0.32 + Math.sin(t * 4.2) * 0.06);
        ctx.shadowColor = pal.runaSombra;
        ctx.shadowBlur = 18;
        const gN = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, breathe);
        gN.addColorStop(0, pal.nucleo0);
        gN.addColorStop(0.55, pal.nucleo1);
        gN.addColorStop(1, pal.nucleo2);
        ctx.fillStyle = gN;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, breathe, breathe * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // ---- PARTÍCULAS SUBINDO ----
        for (let i = 0; i < 12; i++) {
            const prog = (t * 0.9 + i / 12) % 1;
            const swayX = Math.sin(t * 1.6 + i * 1.7) * R * 0.42;
            const pxp = p.x + swayX * (0.35 + prog * 0.65);
            const pyp = p.y + ry * 0.85 - prog * (ry * 1.9);
            const alfa = Math.sin(prog * Math.PI) * 0.9;
            const sz = 1.2 + (1 - prog) * 2.2;
            ctx.fillStyle = pal.part + alfa.toFixed(3) + ')';
            ctx.beginPath();
            ctx.arc(pxp, pyp, sz, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = pal.partRastro + (alfa * 0.35).toFixed(3) + ')';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(pxp, pyp + 3);
            ctx.lineTo(pxp, pyp + 6 + prog * 4);
            ctx.stroke();
        }

        // ---- PARTÍCULAS ORBITANDO o núcleo ----
        for (let i = 0; i < 7; i++) {
            const ang = t * 2.2 + i * (Math.PI * 2 / 7);
            const rad = R * (0.55 + Math.sin(t * 3 + i * 2.1) * 0.1);
            const ox = p.x + Math.cos(ang) * rad;
            const oy = p.y + Math.sin(ang) * rad * 0.55;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.beginPath();
            ctx.arc(ox, oy, 1.8, 0, Math.PI * 2);
            ctx.fill();
        }

        // ---- RUNAS ORBITANDO A BORDA ----
        for (let i = 0; i < 4; i++) {
            const angR = -t * 1.1 + i * (Math.PI / 2);
            const rrR = R * 1.32;
            const rx = p.x + Math.cos(angR) * rrR;
            const ryy = p.y + Math.sin(angR) * rrR * 0.62;
            ctx.save();
            ctx.translate(rx, ryy);
            ctx.rotate(t * 2.4 + i * 0.6);
            ctx.strokeStyle = pal.runa;
            ctx.lineWidth = 1.6;
            ctx.shadowColor = pal.runaSombra;
            ctx.shadowBlur = 8;
            ctx.strokeRect(-3.2, -3.2, 6.4, 6.4);
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.beginPath();
            ctx.arc(0, 0, 1.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        ctx.shadowBlur = 0;

        // ---- RAIOS DE LUZ girando ----
        ctx.strokeStyle = pal.raio;
        ctx.lineWidth = 1.4;
        for (let i = 0; i < 3; i++) {
            const ba = t * 1.2 + i * (Math.PI * 2 / 3);
            const c1 = p.x + Math.cos(ba) * R * 0.5;
            const s1 = p.y + Math.sin(ba) * R * 0.3;
            const c2 = p.x + Math.cos(ba) * haloR * 0.9;
            const s2 = p.y + Math.sin(ba) * haloR * 0.55;
            ctx.beginPath();
            ctx.moveTo(c1, s1);
            ctx.lineTo(c2, s2);
            ctx.stroke();
        }

        // ---- LABELS (abaixo do portal) ----
        ctx.font = 'bold 13px Arial';
        ctx.textAlign = 'center';
        ctx.shadowColor = pal.sombra;
        ctx.shadowBlur = 14;
        ctx.fillStyle = pal.lab1;
        ctx.fillText(pal.rotulo1, p.x, p.y + R + 26);
        ctx.shadowBlur = 8;
        ctx.fillStyle = pal.lab2;
        ctx.font = '11px Arial';
        ctx.fillText(pal.rotulo2, p.x, p.y + R + 39);
        ctx.restore();
    }

    function coletarArenaSortables(t, arr) {}


    function infoPortalArena(x, y) {
        // FIX v1.33.4: sem portal de retorno dentro da Solari — não dispara
        // teleporte pra cidade no meio da partida.
        if (global.currentMap === 'solari') return null;
        if (x >= ARENA_X0) {
            if (Math.hypot(x - PORTAL_ARENA_RETORNO.x, y - PORTAL_ARENA_RETORNO.y) < PORTAL_ARENA_RETORNO.r) {
                return { via: 'portal', mapa: 'cidade', alvo: PORTAL_ARENA_RETORNO.alvo };
            }
            return null;
        }
        return null;
    }

    function obterOverlayArena() {
        if (_overlayArena) return _overlayArena;
        if (typeof document === 'undefined') return null;
        _overlayArena = document.createElement('div');
        _overlayArena.id = 'overlay-mapa-arena';
        _overlayArena.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;background:#000;z-index:99999;opacity:0;pointer-events:none;transition:opacity .35s ease;';
        document.body.appendChild(_overlayArena);
        return _overlayArena;
    }

    function transicaoArenaFade(cb) {
        if (typeof document === 'undefined' || !document.body) { cb(); return; }
        const ov = obterOverlayArena();
        ov.style.opacity = '1';
        setTimeout(function () { cb(); ov.style.opacity = '0'; }, 380);
    }

    function determinarMapaArena(x) {
        const LW = global.LARGURA_VERDE || 18000, LD = global.LARGURA_DESERTO || 50000, LP = global.LARGURA_PANTANO || 58000, LC = global.LARGURA_CIDADE || 59800, LA = global.LARGURA_ARENA || ARENA_X0;
        if (x >= LA) return 'arena';
        if (x >= LC) return 'cidade';
        if (x >= LP) return 'caverna';
        if (x >= LD) return 'pantano';
        if (x >= LW) return 'desert';
        return 'green';
    }

    function onUpdatePosicao(x, y) {
        if (global.estaMorto) return;
        if (typeof global.portalMapaPodeDisparar === 'function' && !global.portalMapaPodeDisparar(x, y)) return;
        let info = null;
        if (x >= ARENA_X0) {
            info = infoPortalArena(x, y);
        } else if (arenaChainAnterior && typeof arenaChainAnterior.onUpdatePosicao === 'function') {
            arenaChainAnterior.onUpdatePosicao(x, y);
            return;
        }
        if (!info) return;
        if (typeof global.solicitarTeleporteMapa === 'function') {
            global.solicitarTeleporteMapa(info.mapa, 'arena_' + info.mapa);
            return;
        }
        transicaoAtiva = true;
        transicaoArenaFade(function () {
            global.meuX = info.alvo.x;
            global.meuY = info.alvo.y;
            global.currentMap = determinarMapaArena(info.alvo.x);
        });
    }


    const api = {
        TILE: TILE,
        ARENA_X0: ARENA_X0, ARENA_X1: ARENA_X1, ARENA_Y1: ARENA_Y1,
        COLS: COLS, ROWS: ROWS,
        ALT_LIVRE: ALT_LIVRE, ALT_MEDIA: ALT_MEDIA, ALT_ALTA: ALT_ALTA,
        PORTAL_ARENA_RETORNO: PORTAL_ARENA_RETORNO,
        PONTO_CHEGADA: PONTO_CHEGADA,
        LARGURA_ARENA: ARENA_X0,
        FIM_ARENA: ARENA_X1,
        ALTO_ARENA: ARENA_Y1,
        gerarArena: gerarArena,
        resetarArena: resetarArena,
        grid: function () { return grid; },
        isArena: isArena,
        colideArena: colideArena,
        colideProjetilArena: colideProjetilArena,
        infoPortalArena: infoPortalArena,
        depositarPosicaoSegura: depositarPosicaoSegura,
        desenharCenarioArena: desenharCenarioArena,
        coletarArenaSortables: coletarArenaSortables,
        colideMapaAtivo: colideMapaAtivo,
        colideProjetilMapaAtivo: colideProjetilMapaAtivo,
        onUpdatePosicao: onUpdatePosicao
    };

    if (typeof window !== 'undefined') {
        gerarArena();
        arenaChainAnterior = global.chainMapas;
        global.chainMapas = { onUpdatePosicao: onUpdatePosicao };
        global.desenharCenarioArena = desenharCenarioArena;
        global.coletarArenaSortables = coletarArenaSortables;
        global.colideArena = colideArena;
        global.colideProjetilArena = colideProjetilArena;
        global.infoPortalArena = infoPortalArena;
        global.colideMapaAtivo = colideMapaAtivo;
        global.colideProjetilMapaAtivo = colideProjetilMapaAtivo;
        global.mapaArena = api;
    }

    if (typeof module !== 'undefined' && module.exports) {
        if (!grid) gerarArena();
        module.exports = api;
    }

})(typeof window !== 'undefined' ? window : this);



