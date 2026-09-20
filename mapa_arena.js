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
        if (m === 'arena') return !isArena(x, y) || colideArena(x, y, raio);
        if (m === 'cidade') return (global.colideCidade ? global.colideCidade(x, y, raio) : false);
        if (m === 'caverna') return (global.colideCaverna ? global.colideCaverna(x, y, raio) : false);
        if (m === 'pantano') return (global.colidePantano ? global.colidePantano(x, y, raio) : false);
        if (m === 'desert') return (global.colideDeserto ? global.colideDeserto(x, y, raio) : false);
        return false;
    }

    function colideProjetilMapaAtivo(x, y) {
        const m = global.currentMap;
        if (m === 'arena') return !isArena(x, y) || colideProjetilArena(x, y);
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
    }

    function desenharPortalArenaRetorno(ctx, t, camX, camY, cw, ch) {
        const p = PORTAL_ARENA_RETORNO;
        if (p.x + p.r + 60 < camX || p.x - p.r - 60 > camX + cw || p.y + p.r + 60 < camY || p.y - p.r - 60 > camY + ch) return;
        const pulsar = 1 + Math.sin(t * 3.2) * 0.14;
        const R = p.r * pulsar + 6;
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + 12, R * 1.15, R * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 3.5;
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 22;
        ctx.beginPath();
        ctx.arc(p.x, p.y, R, 0, Math.PI * 2);
        ctx.stroke();
        const grad = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, R);
        grad.addColorStop(0, '#e0f7fa');
        grad.addColorStop(0.35, '#00b0ff');
        grad.addColorStop(0.75, '#1565c0');
        grad.addColorStop(1, '#050c18');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, R - 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 2.5;
        for (let i = 0; i < 4; i++) {
            const rot = t * 2.2 + (i * Math.PI) / 2;
            ctx.strokeStyle = (i % 2 === 0) ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 229, 255, 0.75)';
            ctx.beginPath();
            ctx.arc(p.x, p.y, (R * 0.75) - i * 6, rot, rot + 1.2);
            ctx.stroke();
        }
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#00e5ff';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('PORTAL DA ARENA', p.x, p.y + R + 22);
        ctx.fillStyle = '#80d8ff';
        ctx.font = '11px Arial';
        ctx.fillText('Voltar a Davahl', p.x, p.y + R + 36);
        ctx.restore();
    }

    function coletarArenaSortables(t, arr) {}


    function infoPortalArena(x, y) {
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



