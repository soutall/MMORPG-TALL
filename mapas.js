// mapas.js - Cenario Verde 10x com Lagos, Arvores e Safe Zone Central (Protegida)
// IMPORTANTE: pintura SEMPRE limitada à região verde (0..18000) — a Fase 2
// (deserto) ocupa x>=18000 e é renderizada por outro módulo (mapa_deserto.js).
window.SAFE_X = 5000;
window.SAFE_Y = 1200;
window.SAFE_RAIO = 350;

// ---------- Relevo 2.3D do mapa verde (cosmético, SEM colisão) ----------
// Grade determinística gerada uma única vez; desenha blocos levantados com
// parede sombreada (sul + leste). O servidor NÃO usa este grid para colisão —
// o verde continua com árvores apenas (colisão client-side) e lagos acessíveis.
(function () {
    var G_TILE = 40;
    var G_COLS = 450;  // 18000 / 40
    var G_ROWS = 450;

    function mulberry32(seed) {
        return function () {
            seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
            var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function hash2(a, b, s) {
        var n = (a * 374761393 + b * 668265263 + (s || 0)) | 0;
        n = Math.imul(n ^ (n >>> 13), 1274126177);
        return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
    }

    // ---------- Lagos decorativos (acessíveis, sem colisão) ----------
    var lagos = [
        { cx: 90, cy: 70, r: 12 },
        { cx: 140, cy: 30, r: 9 },
        { cx: 160, cy: 120, r: 14 },
        { cx: 40, cy: 160, r: 10 },
        { cx: 110, cy: 200, r: 13 },
        { cx: 220, cy: 60, r: 8 },
        { cx: 280, cy: 110, r: 11 },
        { cx: 30, cy: 300, r: 12 },
        { cx: 180, cy: 340, r: 10 },
        { cx: 320, cy: 260, r: 9 },
        { cx: 380, cy: 180, r: 7 },
        { cx: 90, cy: 420, r: 8 },
        { cx: 350, cy: 390, r: 6 },
        { cx: 250, cy: 420, r: 8 }
    ];

    function dentroLago(c, l, folga) {
        for (var k = 0; k < lagos.length; k++) {
            var L = lagos[k];
            if (Math.hypot(c + 0.5 - L.cx, l + 0.5 - L.cy) <= L.r + (folga || 0)) return true;
        }
        return false;
    }

    var gridVerde = null;

    function gerarGridVerde() {
        if (gridVerde) return gridVerde;
        var rnd = mulberry32(20260914);
        gridVerde = [];
        for (var l = 0; l < G_ROWS; l++) {
            gridVerde[l] = [];
            for (var c = 0; c < G_COLS; c++) {
                var tipo = 'base';
                var r = hash2(c, l, 7);
                if (r > 0.62) tipo = 'grama';
                else if (r < 0.06) tipo = 'flor';
                gridVerde[l][c] = { tipo: tipo, eh: 0 };
            }
        }

        // Lagos (somente visual)
        for (var k = 0; k < lagos.length; k++) {
            var L = lagos[k];
            for (var ll = Math.max(0, Math.floor(L.cy - L.r - 1)); ll <= Math.min(G_ROWS - 1, Math.ceil(L.cy + L.r + 1)); ll++) {
                for (var cc = Math.max(0, Math.floor(L.cx - L.r - 1)); cc <= Math.min(G_COLS - 1, Math.ceil(L.cx + L.r + 1)); cc++) {
                    var d = Math.hypot(cc + 0.5 - L.cx, ll + 0.5 - L.cy);
                    if (d <= L.r - 1.2) gridVerde[ll][cc] = { tipo: 'agua', eh: 0 };
                    else if (d <= L.r && gridVerde[ll][cc].tipo !== 'agua') gridVerde[ll][cc] = { tipo: 'lama', eh: 0 };
                }
            }
        }

        // Manchas de terra batida e pedras (fora dos lagos)
        var terra = 420, pedra = 260;
        var tentativas = 0;
        while (terra > 0 && tentativas < 60000) {
            tentativas++;
            var c = Math.floor(rnd() * G_COLS);
            var l = Math.floor(rnd() * G_ROWS);
            if (gridVerde[l][c].tipo === 'base' && !dentroLago(c, l, 0)) { gridVerde[l][c].tipo = 'terra'; gridVerde[l][c].eh = 3; terra--; }
        }
        tentativas = 0;
        while (pedra > 0 && tentativas < 60000) {
            tentativas++;
            var c2 = Math.floor(rnd() * G_COLS);
            var l2 = Math.floor(rnd() * G_ROWS);
            if ((gridVerde[l2][c2].tipo === 'base' || gridVerde[l2][c2].tipo === 'grama') && !dentroLago(c2, l2, 0)) { gridVerde[l2][c2].tipo = 'pedra'; gridVerde[l2][c2].eh = 5; pedra--; }
        }

        // Blobs de grama mais clara (agrupamento orgânico) espalhados
        for (var i = 0; i < 240; i++) {
            var cc = Math.floor(rnd() * G_COLS);
            var ll = Math.floor(rnd() * G_ROWS);
            var dir = Math.floor(rnd() * 4);
            var dx = dir < 2 ? (dir === 0 ? 1 : -1) : 0;
            var dy = dir < 2 ? 0 : (dir === 2 ? 1 : -1);
            var nc = cc + dx, nl = ll + dy;
            if (nc >= 0 && nc < G_COLS && nl >= 0 && nl < G_ROWS && gridVerde[nl][nc].tipo === 'base' && !dentroLago(nc, nl, 0)) gridVerde[nl][nc].tipo = 'grama';
        }

        // ===== Árvores (colisão client-side, fora de lagos e da Safe Zone) =====
        var arvores = [];
        var tent = 0;
        while (arvores.length < 130 && tent < 40000) {
            tent++;
            var tx = 120 + Math.random() * (G_COLS * G_TILE - 240);
            var ty = 120 + Math.random() * (G_ROWS * G_TILE - 240);
            if (Math.hypot(tx - window.SAFE_X, ty - window.SAFE_Y) < window.SAFE_RAIO + 60) continue;
            var tc = Math.floor(tx / G_TILE), tl = Math.floor(ty / G_TILE);
            if (gridVerde[tl] && gridVerde[tl][tc] && dentroLago(tc, tl, 1.5)) continue;
            var colidiu = false;
            for (var ai = 0; ai < arvores.length; ai++) {
                if (Math.hypot(arvores[ai].x - tx, arvores[ai].y - ty) < 190) { colidiu = true; break; }
            }
            if (colidiu) continue;
            arvores.push({ x: tx, y: ty, raioColisao: 25 });
        }
        window.arvores = arvores;

        return gridVerde;
    }

    function alturaVerde(tipo) {
        if (tipo === 'terra') return 3;
        if (tipo === 'pedra') return 5;
        return 0;
    }

    function corVerde(tipo) {
        if (tipo === 'grama') return '#1d5223';
        if (tipo === 'terra') return '#2f4424';
        if (tipo === 'pedra') return '#454d3c';
        if (tipo === 'agua') return '#1b4f72';
        if (tipo === 'lama') return '#3d5a28';
        return '#163f18';
    }

    function desenharTileVerde(ctx, x, y, c, l, cel) {
        var eh = cel.eh;
        var ty = y - eh;
        var cor = corVerde(cel.tipo);

        if (eh > 0) {
            ctx.fillStyle = '#22351b';
            ctx.fillRect(x, y + G_TILE - eh, G_TILE + 1, eh);
            ctx.fillStyle = '#182a15';
            ctx.fillRect(x + G_TILE - eh, ty, eh, G_TILE + eh);
            ctx.fillStyle = cor;
            ctx.fillRect(x, ty, G_TILE + 1, G_TILE + 1);
            ctx.fillStyle = 'rgba(160, 220, 130, 0.16)';
            ctx.fillRect(x, ty, G_TILE + 1, 2);
        } else {
            ctx.fillStyle = cor;
            ctx.fillRect(x, y, G_TILE + 1, G_TILE + 1);
        }

        if (cel.tipo === 'agua') {
            var f = Math.sin((x + y) * 0.06 + Date.now() * 0.0018) * 2;
            ctx.fillStyle = '#1b4f72';
            ctx.fillRect(x, y, G_TILE + 1, G_TILE + 1);
            ctx.fillStyle = '#2471a3';
            ctx.fillRect(x + 5 + f, y + 8, 14, 4);
            ctx.fillStyle = '#5499c7';
            ctx.fillRect(x + 20 - f, y + 24, 10, 3);
            ctx.fillStyle = 'rgba(255,255,255,0.45)';
            ctx.beginPath();
            ctx.arc(x + 27 + f, y + 14, 2.2, 0, Math.PI * 2);
            ctx.fill();

            // Vitória-régia / Ninfeia aquática em alguns tiles do lago
            var hAgua = hash2(c, l, 99);
            if (hAgua > 0.62) {
                ctx.fillStyle = '#196f3d';
                ctx.beginPath();
                ctx.arc(x + 20, y + 20, 7.5, 0.3, Math.PI * 2 - 0.3);
                ctx.lineTo(x + 20, y + 20);
                ctx.fill();
                ctx.fillStyle = '#27ae60';
                ctx.beginPath();
                ctx.arc(x + 20, y + 20, 5.5, 0.3, Math.PI * 2 - 0.3);
                ctx.lineTo(x + 20, y + 20);
                ctx.fill();
                if (hAgua > 0.82) {
                    // Flor de lótus aberta
                    ctx.fillStyle = '#f8bbd0';
                    ctx.beginPath(); ctx.arc(x + 19, y + 18, 3.2, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath(); ctx.arc(x + 19, y + 18, 1.8, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#f1c40f';
                    ctx.beginPath(); ctx.arc(x + 19, y + 18, 0.9, 0, Math.PI * 2); ctx.fill();
                }
            }
            // Margem úmida sutil
            ctx.fillStyle = 'rgba(25, 55, 18, 0.45)';
            ctx.beginPath(); ctx.ellipse(x + 8 + f, y + 32, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
            return;
        }
        if (cel.tipo === 'lama') {
            ctx.fillStyle = 'rgba(25, 42, 16, 0.6)';
            ctx.beginPath(); ctx.ellipse(x + 20, y + 20, 14, 8, 0.15, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(45, 68, 28, 0.45)';
            ctx.beginPath(); ctx.ellipse(x + 18, y + 18, 8, 4, 0.1, 0, Math.PI * 2); ctx.fill();
        }
        if (cel.tipo === 'flor') {
            var hF = hash2(c, l, 53);
            // Flor 1 (dourada ou magenta suave)
            var pCor1 = hF > 0.5 ? '#f4d03f' : '#f48fb1';
            var fx1 = x + 12, fy1 = ty + 15;
            ctx.strokeStyle = '#27ae60';
            ctx.lineWidth = 1.4;
            ctx.beginPath(); ctx.moveTo(fx1, fy1 + 8); ctx.lineTo(fx1, fy1); ctx.stroke();
            ctx.fillStyle = '#2ecc71';
            ctx.beginPath(); ctx.ellipse(fx1 + 3, fy1 + 4, 3, 1.5, 0.3, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = pCor1;
            ctx.beginPath(); ctx.arc(fx1 - 3, fy1, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(fx1 + 3, fy1, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(fx1, fy1 - 3, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(fx1, fy1 + 3, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#e67e22';
            ctx.beginPath(); ctx.arc(fx1, fy1, 1.8, 0, Math.PI * 2); ctx.fill();

            // Flor 2 (azul celeste ou lavanda)
            var fx2 = x + 28, fy2 = ty + 24;
            var pCor2 = hF > 0.5 ? '#85c1e9' : '#bb8fce';
            ctx.strokeStyle = '#27ae60';
            ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.moveTo(fx2, fy2 + 6); ctx.lineTo(fx2, fy2); ctx.stroke();
            ctx.fillStyle = pCor2;
            ctx.beginPath(); ctx.arc(fx2 - 2.5, fy2, 2.2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(fx2 + 2.5, fy2, 2.2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(fx2, fy2 - 2.5, 2.2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(fx2, fy2 + 2.5, 2.2, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#f7dc6f';
            ctx.beginPath(); ctx.arc(fx2, fy2, 1.5, 0, Math.PI * 2); ctx.fill();

            // Flor 3 (pequena margarida silvestre branca)
            var fx3 = x + 8, fy3 = ty + 28;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(fx3, fy3, 2.2, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#f39c12';
            ctx.beginPath(); ctx.arc(fx3, fy3, 1, 0, Math.PI * 2); ctx.fill();
        } else if (cel.tipo === 'pedra') {
            // Sombra suave da rocha
            ctx.fillStyle = 'rgba(0,0,0,0.28)';
            ctx.beginPath(); ctx.ellipse(x + 22, ty + G_TILE - 8, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
            // Rocha principal arredondada
            ctx.fillStyle = '#565e48';
            ctx.beginPath(); ctx.ellipse(x + 20, ty + G_TILE - 12, 12, 7, -0.1, 0, Math.PI * 2); ctx.fill();
            // Brilho arredondado de luz no topo
            ctx.fillStyle = '#7d8a6a';
            ctx.beginPath(); ctx.ellipse(x + 18, ty + G_TILE - 14, 8, 3, -0.1, 0, Math.PI * 2); ctx.fill();
            // Musgo arredondado sobre a rocha
            ctx.fillStyle = '#2d572c';
            ctx.beginPath(); ctx.arc(x + 15, ty + G_TILE - 13, 3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(x + 24, ty + G_TILE - 11, 2.5, 0, Math.PI * 2); ctx.fill();
            // Seixos menores
            ctx.fillStyle = '#636c52';
            ctx.beginPath(); ctx.arc(x + 10, ty + 14, 4, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#838e6e';
            ctx.beginPath(); ctx.arc(x + 9, ty + 13, 2, 0, Math.PI * 2); ctx.fill();
        } else {
            var h1 = hash2(c, l, 11);
            if (h1 > 0.72) {
                // Trevo / tufo arredondado de folhas
                var gx = x + 10 + (c % 4) * 6;
                var gy = ty + 10 + (l % 4) * 5;
                ctx.fillStyle = '#2ecc71';
                ctx.beginPath(); ctx.arc(gx - 2.5, gy, 2.4, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(gx + 2.5, gy, 2.4, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(gx, gy - 2.5, 2.4, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#27ae60';
                ctx.beginPath(); ctx.arc(gx, gy, 1.2, 0, Math.PI * 2); ctx.fill();
            } else if (h1 > 0.45) {
                // Lâminas de grama suavemente curvadas
                var gx2 = x + 6 + (c % 3) * 8;
                var gy2 = ty + 12 + (l % 3) * 6;
                ctx.fillStyle = 'rgba(140, 210, 100, 0.32)';
                ctx.beginPath(); ctx.ellipse(gx2, gy2, 5, 2.2, -0.3, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(gx2 + 6, gy2 + 2, 4, 2, 0.35, 0, Math.PI * 2); ctx.fill();
            } else if (h1 < 0.08) {
                // Cogumelo pequeno arredondado
                var mx = x + 14 + (c % 3) * 5;
                var my = ty + 18 + (l % 3) * 4;
                ctx.fillStyle = '#fdfefe';
                ctx.fillRect(mx - 1, my, 2.5, 5);
                ctx.fillStyle = h1 < 0.04 ? '#e74c3c' : '#a0522d';
                ctx.beginPath(); ctx.arc(mx, my, 3.5, Math.PI, 0); ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.beginPath(); ctx.arc(mx - 1, my - 1.5, 0.8, 0, Math.PI * 2); ctx.fill();
            }
        }
    }

    window.desenharCenario = function () {
        if (!window.ctx) return;
        var ctx = window.ctx;

        // 1. Relevo do chão da floresta (tiles 2.3D, só visíveis na câmera)
        var mLimX = window.LARGURA_VERDE || 18000;
        var mLimY = window.ALTO_VERDE || 18000;
        ctx.fillStyle = "#163f18";
        ctx.fillRect(0, 0, mLimX, mLimY);

        gerarGridVerde();
        var camX = window.camX || 0;
        var camY = window.camY || 0;
        var cw = (window.canvas && window.canvas.width) ? window.canvas.width / (window.ZOOM_CAMERA || 1) : 900;
        var ch = (window.canvas && window.canvas.height) ? window.canvas.height / (window.ZOOM_CAMERA || 1) : 600;
        var c0 = Math.max(0, Math.floor((camX - 60) / G_TILE));
        var c1 = Math.min(G_COLS - 1, Math.ceil((camX + cw + 60) / G_TILE));
        var l0 = Math.max(0, Math.floor((camY - 60) / G_TILE));
        var l1 = Math.min(G_ROWS - 1, Math.ceil((camY + ch + 60) / G_TILE));
        for (var l = l0; l <= l1; l++) {
            for (var c = c0; c <= c1; c++) {
                var cel = gridVerde[l][c];
                cel.eh = alturaVerde(cel.tipo);
                desenharTileVerde(ctx, c * G_TILE, l * G_TILE, c, l, cel);
            }
        }

        // 2. Piso da Safe Zone Central (Praça Sagrada / Cidade)
        ctx.save();
        var gradSafe = ctx.createRadialGradient(window.SAFE_X, window.SAFE_Y, 20, window.SAFE_X, window.SAFE_Y, window.SAFE_RAIO);
        gradSafe.addColorStop(0, "#2c3e50");
        gradSafe.addColorStop(0.7, "#1f2c34");
        gradSafe.addColorStop(1, "#11181f");
        ctx.fillStyle = gradSafe;
        ctx.beginPath();
        ctx.arc(window.SAFE_X, window.SAFE_Y, window.SAFE_RAIO, 0, Math.PI * 2);
        ctx.fill();

        // Anel de runas com pulso suave delimitando a Safe Zone
        var pulsoSafe = 0.65 + 0.35 * Math.sin(Date.now() * 0.0025);
        ctx.strokeStyle = "rgba(241, 196, 15, " + pulsoSafe + ")";
        ctx.lineWidth = 4;
        ctx.setLineDash([12, 8]);
        ctx.beginPath();
        ctx.arc(window.SAFE_X, window.SAFE_Y, window.SAFE_RAIO, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Detalhe de entrada/portão ao sul da Safe
        ctx.fillStyle = "#163f18";
        ctx.fillRect(window.SAFE_X - 35, window.SAFE_Y + window.SAFE_RAIO - 10, 70, 20);
        ctx.restore();

        // 3. Árvores decorativas ao redor do mapa (Vivas, Orgânicas e Arredondadas)
        var tNow = Date.now();
        window.arvores.forEach(function (arv) {
            // Frustum culling: só renderiza árvores visíveis no viewport
            if (arv.x < camX - 90 || arv.x > camX + cw + 90 ||
                arv.y < camY - 110 || arv.y > camY + ch + 90) return;

            var r = arv.raioColisao || 25;
            // Balanço orgânico suave com o vento
            var sway = Math.sin(tNow * 0.0018 + arv.x * 0.04) * 2.2;

            // Sombra ovalada suave no solo
            ctx.fillStyle = "rgba(10, 25, 12, 0.36)";
            ctx.beginPath();
            ctx.ellipse(arv.x + 4, arv.y + r * 0.8, r * 1.5, r * 0.75, 0, 0, Math.PI * 2);
            ctx.fill();

            // Tronco de madeira arredondado com expansão de raízes
            ctx.fillStyle = "#3e2714";
            ctx.beginPath();
            ctx.moveTo(arv.x - 7, arv.y + r * 0.55);
            ctx.quadraticCurveTo(arv.x - 12, arv.y + r * 0.85, arv.x - 15, arv.y + r * 0.95);
            ctx.lineTo(arv.x + 15, arv.y + r * 0.95);
            ctx.quadraticCurveTo(arv.x + 12, arv.y + r * 0.85, arv.x + 7, arv.y + r * 0.55);
            ctx.lineTo(arv.x + 5, arv.y - 2);
            ctx.lineTo(arv.x - 5, arv.y - 2);
            ctx.closePath();
            ctx.fill();

            // Detalhe de textura da casca
            ctx.fillStyle = "#5d4037";
            ctx.beginPath();
            ctx.ellipse(arv.x - 1, arv.y + r * 0.45, 3, 7, 0, 0, Math.PI * 2);
            ctx.fill();

            // Copa da árvore — 3 camadas de domos arredondados sobrepostos (Sensação Orgânica 3D)
            // Camada 1: Base sombreada verde floresta profundo
            ctx.fillStyle = "#145a32";
            ctx.beginPath();
            ctx.arc(arv.x - r * 0.55 + sway * 0.4, arv.y + 2, r * 0.75, 0, Math.PI * 2);
            ctx.arc(arv.x + r * 0.55 + sway * 0.4, arv.y + 2, r * 0.75, 0, Math.PI * 2);
            ctx.arc(arv.x - r * 0.65 + sway * 0.7, arv.y - r * 0.5, r * 0.8, 0, Math.PI * 2);
            ctx.arc(arv.x + r * 0.65 + sway * 0.7, arv.y - r * 0.5, r * 0.8, 0, Math.PI * 2);
            ctx.arc(arv.x + sway, arv.y - r * 0.9, r * 0.9, 0, Math.PI * 2);
            ctx.fill();

            // Camada 2: Miolo verde folha vivo
            ctx.fillStyle = "#1e8449";
            ctx.beginPath();
            ctx.arc(arv.x - r * 0.45 + sway * 0.4, arv.y - 2, r * 0.68, 0, Math.PI * 2);
            ctx.arc(arv.x + r * 0.45 + sway * 0.4, arv.y - 2, r * 0.68, 0, Math.PI * 2);
            ctx.arc(arv.x - r * 0.5 + sway * 0.7, arv.y - r * 0.55, r * 0.72, 0, Math.PI * 2);
            ctx.arc(arv.x + r * 0.5 + sway * 0.7, arv.y - r * 0.55, r * 0.72, 0, Math.PI * 2);
            ctx.arc(arv.x + sway, arv.y - r * 0.95, r * 0.82, 0, Math.PI * 2);
            ctx.fill();

            // Camada 3: Iluminação solar superior arredondada (luz superior/esquerda)
            ctx.fillStyle = "#2ecc71";
            ctx.beginPath();
            ctx.arc(arv.x - r * 0.35 + sway * 0.6, arv.y - r * 0.65, r * 0.48, 0, Math.PI * 2);
            ctx.arc(arv.x + r * 0.25 + sway * 0.6, arv.y - r * 0.7, r * 0.45, 0, Math.PI * 2);
            ctx.arc(arv.x - r * 0.1 + sway * 0.9, arv.y - r * 1.15, r * 0.52, 0, Math.PI * 2);
            ctx.fill();

            // Destaque de brilho sutil na folhagem
            ctx.fillStyle = "rgba(169, 223, 142, 0.4)";
            ctx.beginPath();
            ctx.arc(arv.x - r * 0.2 + sway, arv.y - r * 1.25, r * 0.25, 0, Math.PI * 2);
            ctx.fill();

            // Frutinhas vermelhas em algumas árvores
            var sementeArv = Math.floor(arv.x + arv.y);
            if (sementeArv % 3 === 0) {
                ctx.fillStyle = "#e74c3c";
                ctx.beginPath(); ctx.arc(arv.x - r * 0.4 + sway, arv.y - r * 0.4, 2.5, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(arv.x + r * 0.35 + sway, arv.y - r * 0.6, 2.5, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(arv.x - r * 0.15 + sway, arv.y - r * 0.9, 2.5, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(arv.x + r * 0.4 + sway, arv.y - 2, 2.2, 0, Math.PI * 2); ctx.fill();
            }
        });
    };
})();