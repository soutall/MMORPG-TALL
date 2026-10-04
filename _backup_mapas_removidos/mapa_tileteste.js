// ============================================================================
// mapa_tileteste.js — Mapa Procedural "TileTeste" v1.0.0
// Réplica idêntica do gerador procedural de terreno e ambiente de
// E:\PIXELART\procedural-pixel-creatures (TestMap.cs, TerrainRelief.cs, EnvironmentArt.cs)
//
// Módulo isomórfico: Seguro para Node.js (server.js) e Navegador (window).
//
// CARACTERÍSTICAS DA ENGINE PROCEDURAL PORTADA:
//   • Dimensão e Formato: 960 × 600 px (Preset Medium nativo)
//   • Faixa de Coordenadas: x em [128000, 128960) × y em [0, 600)
//   • Relevo 2.5D Terraciado: Elevação com degraus (Floor(raw / 12) * 12),
//     rampas de acesso suaves integradas às estradas e sombreamento solar de encostas.
//   • Falésias Estratificadas (Cliffs): Tiras verticais de rocha estratificada com Y-sorting.
//   • Lagos e Lagoas com enseadas Perlin, orlas arenosas e borda de espuma (Foam).
//   • Água multi-profundidade: Tons turquesa rasa / azul marinho profundo,
//     linhas de cáusticas em movimento e 4 quadros de reflexos luminosos animados (Glints).
//   • Caminhos de terra orgânicos e sinuosos (Horizontal + Vertical) com ruído Perlin.
//   • Grama multi-tom com campos claros (Meadows), manchas escuras e tufos com flores coloridas.
//   • Props Procedurais: Árvores com copas esféricas e sombreamento de normais 3D,
//     rochas com musgo e arbustos com bagas.
//   • Matriz de Desobstrução (Chebyshev Clearance): Colisão sólida para águas profundas,
//     quedas abruptas de relevo e troncos de árvores/rochas.
//   • Portal de entrada em Davahl e Portal de retorno seguro no início da trilha oeste.
// ============================================================================
(function (global) {
    'use strict';

    const TILE_X0 = 128000;
    const WIDTH = 960;
    const HEIGHT = 600;
    const TILE_X1 = TILE_X0 + WIDTH; // 128960
    const SEED = 9001;

    // Ponto de Spawn seguro na trilha oeste (longe do portal de retorno para evitar loop)
    const SPAWN_PONTO = { x: TILE_X0 + 100, y: 426 };
    // Portal de retorno para a Cidade de Davahl no início da trilha
    const PORTAL_RETORNO = { x: TILE_X0 + 38, y: 426, r: 32 };

    // Constantes de terreno
    const Grass = 0, Path = 1, Sand = 2, Water = 3;

    // Paletas de Cores (RGB)
    const Grass0 = [58, 100, 58];
    const Grass1 = [80, 132, 66];
    const Grass2 = [101, 154, 74];
    const Grass3 = [132, 180, 90];
    const Dirt0 = [104, 78, 60];
    const Dirt1 = [132, 102, 74];
    const Dirt2 = [158, 126, 90];
    const Sand0 = [178, 154, 106];
    const Sand1 = [206, 184, 130];
    const Sand2 = [226, 208, 156];
    const Water0 = [40, 76, 122];
    const Water1 = [52, 100, 150];
    const Water2 = [78, 138, 180];
    const Foam = [196, 228, 236];
    const Stone0 = [78, 80, 92];
    const Stone1 = [108, 110, 120];
    const Stone2 = [142, 142, 148];
    const Stone3 = [178, 176, 176];
    const Flowers = [
        [238, 206, 88],
        [238, 234, 222],
        [222, 128, 158],
        [126, 152, 224]
    ];

    // ========================================================================
    // MATEMÁTICA DETERMINÍSTICA E GERADORES DE RUÍDO (PCG32 / Perlin2 / Fbm2)
    // ========================================================================
    function hash3(seed, x, y, z = 0) {
        let h = (seed ^ Math.imul(x, 0x9E3779B1) ^ Math.imul(y, 0xC2B2AE3D) ^ Math.imul(z, 0x165667B1)) | 0;
        h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
        h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
        return ((h ^ (h >>> 16)) >>> 0);
    }

    function hash01(seed, x, y = 0, z = 0) {
        return hash3(seed, x, y, z) / 4294967296.0;
    }

    class Rng {
        constructor(seed) {
            this.state = seed >>> 0;
            this.inc = ((Math.imul(seed, 1812433253) + 1) | 1) >>> 0;
            this.nextUInt();
        }
        nextUInt() {
            let old = this.state;
            this.state = (Math.imul(old, 747796405) + this.inc) >>> 0;
            let word = ((old >>> ((old >>> 28) + 4)) ^ old) >>> 0;
            return (Math.imul(word, 277803737) ^ (word >>> 22)) >>> 0;
        }
        nextDouble() {
            return this.nextUInt() / 4294967296.0;
        }
        nextInt(n) {
            if (n <= 1) return 0;
            return Math.floor(this.nextDouble() * n);
        }
        range(lo, hi) { return hi <= lo ? lo : lo + this.nextInt(hi - lo + 1); }
        rangeF(lo, hi) { return lo + (hi - lo) * this.nextDouble(); }
        chance(p) { return this.nextDouble() < p; }
    }

    function fade(t) { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }
    function lerp(a, b, t) { return a + (b - a) * t; }
    function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

    function grad2(seed, ix, iy, fx, fy) {
        let h = hash3(seed, ix, iy, 0) & 7;
        switch (h) {
            case 0: return fx + fy;
            case 1: return -fx + fy;
            case 2: return fx - fy;
            case 3: return -fx - fy;
            case 4: return fx;
            case 5: return -fx;
            case 6: return fy;
            default: return -fy;
        }
    }

    function perlin2(seed, x, y) {
        let ix = Math.floor(x), iy = Math.floor(y);
        let fx = x - ix, fy = y - iy;
        let u = fade(fx), v = fade(fy);
        let n00 = grad2(seed, ix, iy, fx, fy);
        let n10 = grad2(seed, ix + 1, iy, fx - 1, fy);
        let n01 = grad2(seed, ix, iy + 1, fx, fy - 1);
        let n11 = grad2(seed, ix + 1, iy + 1, fx - 1, fy - 1);
        let nx0 = lerp(n00, n10, u);
        let nx1 = lerp(n01, n11, u);
        return lerp(nx0, nx1, v) * 0.9;
    }

    function fbm2(seed, x, y, octaves, lacunarity = 2.0, gain = 0.5) {
        let sum = 0, amp = 1, norm = 0;
        for (let i = 0; i < octaves; i++) {
            sum += amp * perlin2(seed + i * 1013904223, x, y);
            norm += amp;
            amp *= gain;
            x *= lacunarity;
            y *= lacunarity;
        }
        return sum / norm;
    }

    function putClip(buf, w, h, x, y, r, g, b, a = 255) {
        if (x < 0 || y < 0 || x >= w || y >= h) return;
        let i = (y * w + x) * 4;
        if (a < 255) {
            let fa = a / 255;
            buf[i] = Math.round(buf[i] * (1 - fa) + r * fa);
            buf[i + 1] = Math.round(buf[i + 1] * (1 - fa) + g * fa);
            buf[i + 2] = Math.round(buf[i + 2] * (1 - fa) + b * fa);
            buf[i + 3] = Math.max(buf[i + 3], a);
            return;
        }
        buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = 255;
    }

    function drawEllipse(buf, w, h, cx, cy, rx, ry, r, g, b, a = 255) {
        for (let y = cy - ry; y <= cy + ry; y++) {
            for (let x = cx - rx; x <= cx + rx; x++) {
                let dx = (x + 0.5 - cx) / Math.max(1, rx), dy = (y + 0.5 - cy) / Math.max(1, ry);
                if (dx * dx + dy * dy <= 1) putClip(buf, w, h, x, y, r, g, b, a);
            }
        }
    }

    // ========================================================================
    // GERADORES PROCEDURAIS DE PROPS (EnvironmentArt.cs)
    // ========================================================================
    function generateTree(seed, scale = 1.0) {
        const rng = new Rng(seed);
        const w = Math.floor(44 * scale), h = Math.floor(64 * scale);
        const buf = new Uint8ClampedArray(w * h * 4);
        const baseX = Math.floor(w / 2), baseY = h - 5;
        const origin = { x: baseX, y: baseY };

        drawEllipse(buf, w, h, baseX + 3, baseY, Math.floor(15 * scale), Math.floor(5 * scale), 20, 26, 31, Math.round(0.35 * 255));

        const trunkH = Math.floor(rng.rangeF(15, 20) * scale);
        const tw = Math.max(3, Math.floor(4 * scale));
        const bark0 = [62, 44, 38], bark1 = [96, 68, 50], bark2 = [124, 92, 64];
        for (let y = baseY - trunkH; y <= baseY; y++) {
            let flare = y > baseY - 3 ? (baseY - y === 0 ? 2 : 1) : 0;
            for (let x = baseX - Math.floor(tw / 2) - flare; x <= baseX + Math.floor(tw / 2) + flare; x++) {
                let c = (x <= baseX - Math.floor(tw / 2) - flare || x >= baseX + Math.floor(tw / 2) + flare) ? bark0 : (x < baseX ? bark2 : bark1);
                if (((y * 7 + x * 3) % 11) === 0 && x > baseX - Math.floor(tw / 2) - flare && x < baseX + Math.floor(tw / 2) + flare) c = bark0;
                putClip(buf, w, h, x, y, c[0], c[1], c[2]);
            }
        }

        const leaf0 = [36, 70, 48], leaf1 = [52, 98, 56], leaf2 = [74, 128, 62], leaf3 = [112, 162, 76], leafOut = [26, 48, 40];
        const n = rng.range(6, 8);
        const cx = new Float64Array(n), cy = new Float64Array(n), cr = new Float64Array(n);
        const top = baseY - trunkH - 12 * scale;
        for (let i = 0; i < n; i++) {
            let a = i / n * Math.PI * 2 + rng.rangeF(-0.3, 0.3);
            let dist = i === 0 ? 0 : rng.rangeF(6.0, 10.0) * scale;
            cx[i] = baseX + Math.cos(a) * dist;
            cy[i] = top + Math.sin(a) * dist * 0.75;
            cr[i] = rng.rangeF(7.0, 10.0) * scale * (i === 0 ? 1.2 : 1.0);
        }

        const mask = new Uint8Array(w * h);
        const shade = new Uint8Array(w * h);
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                let best = -1, bestD = 1e9;
                for (let i = 0; i < n; i++) {
                    let dx = x + 0.5 - cx[i], dy = (y + 0.5 - cy[i]) * 1.1;
                    let d = Math.sqrt(dx * dx + dy * dy) / cr[i];
                    if (d < 1 && d < bestD) { bestD = d; best = i; }
                }
                if (best < 0) continue;
                mask[y * w + x] = 1;
                let nx = (x + 0.5 - cx[best]) / cr[best], ny = (y + 0.5 - cy[best]) / cr[best];
                let nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
                let l = -0.55 * nx - 0.6 * ny + 0.58 * nz;
                let g = (y - top) / (baseY - top);
                l -= g * 0.25;
                shade[y * w + x] = l > 0.62 ? 3 : (l > 0.3 ? 2 : (l > -0.05 ? 1 : 0));
            }
        }

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                let i = y * w + x;
                if (!mask[i]) {
                    let edge = (x > 0 && mask[i - 1]) || (x < w - 1 && mask[i + 1]) || (y > 0 && mask[i - w]) || (y < h - 1 && mask[i + w]);
                    if (edge) putClip(buf, w, h, x, y, leafOut[0], leafOut[1], leafOut[2]);
                    continue;
                }
                let s = shade[i];
                let c = s === 3 ? leaf3 : (s === 2 ? leaf2 : (s === 1 ? leaf1 : leaf0));
                if (s >= 2 && hash01(seed, Math.floor(x / 3), Math.floor(y / 3)) < 0.28 && (x + y) % 3 === 0) {
                    c = s === 3 ? leaf2 : leaf1;
                }
                putClip(buf, w, h, x, y, c[0], c[1], c[2]);
            }
        }

        if (rng.chance(0.5)) {
            let fc = rng.chance(0.5) ? [214, 84, 70] : [236, 222, 150];
            for (let k = 0; k < 5; k++) {
                let fx = Math.floor(baseX + rng.rangeF(-12.0, 12.0) * scale);
                let fy = Math.floor(top + rng.rangeF(-6.0, 8.0) * scale);
                if (fx > 0 && fy > 0 && fx < w && fy < h && mask[fy * w + fx]) {
                    putClip(buf, w, h, fx, fy, fc[0], fc[1], fc[2]);
                }
            }
        }

        return { w, h, origin, rgba: buf };
    }

    function generateRock(seed, scale = 1.0) {
        const rng = new Rng(seed);
        const w = Math.floor(20 * scale) + 4, h = Math.floor(15 * scale) + 4;
        const buf = new Uint8ClampedArray(w * h * 4);
        const bx = Math.floor(w / 2), by = h - 3;
        const origin = { x: bx, y: by };

        drawEllipse(buf, w, h, bx + 1, by, Math.floor(8 * scale), Math.floor(3 * scale), 20, 26, 31, Math.round(0.35 * 255));

        const rx = rng.rangeF(6.0, 8.5) * scale, ry = rng.rangeF(4.5, 6.5) * scale;
        const cxr = bx, cyr = by - ry * 0.8;
        const mask = new Uint8Array(w * h);
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                let dx = (x + 0.5 - cxr) / rx, dy = (y + 0.5 - cyr) / ry;
                let wob = perlin2(seed, x * 0.35, y * 0.35) * 0.18;
                if (dx * dx + dy * dy < 1 + wob && y <= by) mask[y * w + x] = 1;
            }
        }

        const moss = rng.chance(0.4);
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                let i = y * w + x;
                if (!mask[i]) {
                    let edge = (x > 0 && mask[i - 1]) || (x < w - 1 && mask[i + 1]) || (y > 0 && mask[i - w]) || (y < h - 1 && mask[i + w]);
                    if (edge) putClip(buf, w, h, x, y, 46, 46, 58);
                    continue;
                }
                let nx = (x + 0.5 - cxr) / rx, ny = (y + 0.5 - cyr) / ry;
                let l = -0.6 * nx - 0.7 * ny + perlin2((seed + 5) | 0, x * 0.5, y * 0.5) * 0.25;
                let c = l > 0.55 ? Stone3 : (l > 0.15 ? Stone2 : (l > -0.25 ? Stone1 : Stone0));
                if (moss && ny < -0.35 && hash01(seed, x, y) < 0.7) {
                    c = l > 0.3 ? Grass2 : Grass1;
                }
                putClip(buf, w, h, x, y, c[0], c[1], c[2]);
            }
        }
        return { w, h, origin, rgba: buf };
    }

    function generateBush(seed, scale = 1.0) {
        const rng = new Rng(seed);
        const w = Math.floor(24 * scale) + 4, h = Math.floor(18 * scale) + 4;
        const buf = new Uint8ClampedArray(w * h * 4);
        const bx = Math.floor(w / 2), by = h - 3;
        const origin = { x: bx, y: by };

        drawEllipse(buf, w, h, bx + 1, by, Math.floor(10 * scale), Math.floor(3 * scale), 20, 26, 31, Math.round(0.35 * 255));

        const l0 = [40, 76, 50], l1 = [58, 106, 58], l2 = [82, 136, 66], l3 = [120, 170, 80], outC = [28, 52, 42];
        const n = rng.range(3, 5);
        const cx = new Float64Array(n), cy = new Float64Array(n), cr = new Float64Array(n);
        for (let i = 0; i < n; i++) {
            cx[i] = bx + rng.rangeF(-6.0, 6.0) * scale;
            cy[i] = by - rng.rangeF(4.0, 8.0) * scale;
            cr[i] = rng.rangeF(4.5, 7.0) * scale;
        }

        const mask = new Uint8Array(w * h);
        const sh = new Uint8Array(w * h);
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                let best = -1, bd = 1e9;
                for (let i = 0; i < n; i++) {
                    let dx = x + 0.5 - cx[i], dy = y + 0.5 - cy[i];
                    let d = Math.sqrt(dx * dx + dy * dy) / cr[i];
                    if (d < 1 && d < bd) { bd = d; best = i; }
                }
                if (best < 0 || y > by) continue;
                mask[y * w + x] = 1;
                let nx = (x + 0.5 - cx[best]) / cr[best], ny = (y + 0.5 - cy[best]) / cr[best];
                let l = -0.6 * nx - 0.7 * ny;
                sh[y * w + x] = l > 0.5 ? 3 : (l > 0.1 ? 2 : (l > -0.35 ? 1 : 0));
            }
        }

        const berries = rng.chance(0.5);
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                let i = y * w + x;
                if (!mask[i]) {
                    let edge = (x > 0 && mask[i - 1]) || (x < w - 1 && mask[i + 1]) || (y > 0 && mask[i - w]) || (y < h - 1 && mask[i + w]);
                    if (edge) putClip(buf, w, h, x, y, outC[0], outC[1], outC[2]);
                    continue;
                }
                let s = sh[i];
                let c = s === 3 ? l3 : (s === 2 ? l2 : (s === 1 ? l1 : l0));
                if (berries && s >= 1 && hash01(seed, x, y) < 0.05) {
                    c = [196, 70, 90];
                }
                putClip(buf, w, h, x, y, c[0], c[1], c[2]);
            }
        }
        return { w, h, origin, rgba: buf };
    }

    // ========================================================================
    // PIPELINE PRINCIPAL DE GERAÇÃO DO MAPA (TestMap.cs & TerrainRelief.cs)
    // ========================================================================
    let _mapData = null;

    function buildTestMap() {
        if (_mapData) return _mapData;

        const w = WIDTH, h = HEIGHT, seed = SEED;
        const map = {
            w: w,
            h: h,
            seed: seed,
            terrain: new Uint8Array(w * h),
            groundRgba: new Uint8ClampedArray(w * h * 4),
            elevation: new Float32Array(w * h),
            waterDepth: new Float32Array(w * h),
            waterSurfaceRgba: new Uint8ClampedArray(w * h * 4),
            clearance: new Uint8Array(w * h),
            cliffs: [],
            ponds: [],
            props: []
        };

        // 1. Ponds
        const pondRng = new Rng(seed ^ 0x504F4E44);
        let count = Math.round(w * h / 300000.0);
        if (count <= 1) {
            map.ponds.push({ cx: w * 0.69, cy: h * 0.61, rx: w * 0.235, ry: h * 0.285 });
        } else {
            for (let attempts = 0; map.ponds.length < count && attempts < count * 80; attempts++) {
                let s = map.ponds.length === 0 ? (count >= 3 ? pondRng.rangeF(1.6, 1.9) : 1.55) : pondRng.rangeF(1.2, 1.4);
                let rx = 108 * s, ry = 80 * s;
                if (2 * rx + 60 >= w || 2 * ry + 70 >= h) continue;
                let cx = pondRng.rangeF(rx + 30, w - rx - 30), cy = pondRng.rangeF(ry + 44, h - ry - 26);
                let free = true;
                for (let p of map.ponds) {
                    let dx = (cx - p.cx) / (rx + p.rx + 56), dy = (cy - p.cy) / (ry + p.ry + 44);
                    if (dx * dx + dy * dy < 1) { free = false; break; }
                }
                if (free) map.ponds.push({ cx, cy, rx, ry });
            }
        }

        for (let i = 0; i < map.ponds.length; i++) {
            let p = map.ponds[i];
            p.shapeSeed = (seed + 31 + i * 977) | 0;
            let x0 = Math.max(0, Math.floor(p.cx - p.rx * 1.6));
            let x1 = Math.min(w, Math.ceil(p.cx + p.rx * 1.6));
            let y0 = Math.max(0, Math.floor(p.cy - p.ry * 1.6));
            let y1 = Math.min(h, Math.ceil(p.cy + p.ry * 1.6));
            p.bounds = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
        }

        // 2. Paths
        let numRows = Math.max(1, Math.round(h / 400.0));
        let bandH = h / numRows;
        let rowPaths = [];
        for (let k = 0; k < numRows; k++) {
            let baseY = bandH * k + bandH * 0.42;
            let amp = Math.min(bandH * 0.14, 64);
            let phase = 0.6 + k * 1.7;
            let s = (seed + 3 + k * 101) | 0;
            let c = new Float64Array(w);
            for (let x = 0; x < w; x++) {
                c[x] = baseY + Math.sin(x * 0.018 + phase) * amp + perlin2(s, x * 0.03, 0.5) * 8;
            }
            rowPaths.push(c);
        }

        let numCols = Math.floor(w / 900);
        let bandW = numCols > 0 ? w / numCols : w;
        let colPaths = [];
        for (let k = 0; k < numCols; k++) {
            let baseX = bandW * k + bandW * 0.5;
            let phase = 1.3 + k * 2.1;
            let s = (seed + 7 + k * 101) | 0;
            let c = new Float64Array(h);
            for (let y = 0; y < h; y++) {
                c[y] = baseX + Math.sin(y * 0.02 + phase) * 48 + perlin2(s, y * 0.03, 0.5) * 10;
            }
            colPaths.push(c);
        }

        function onPath(x, y) {
            for (let c of rowPaths) {
                let d = Math.abs(y - c[x]);
                if (d < 10 && d - 7 - perlin2((seed + 4) | 0, x * 0.1, y * 0.1) * 2.5 < 0) return true;
            }
            for (let c of colPaths) {
                let d = Math.abs(x - c[y]);
                if (d < 16 && d - 12 - perlin2((seed + 5) | 0, x * 0.1, y * 0.1) * 3 < 0) return true;
            }
            return false;
        }

        function meadow(x, y) { return perlin2((seed + 60) | 0, x / 150.0, y / 95.0); }
        function meadowLift(m) { return clamp((m - 0.2) * 2.5, 0, 1); }
        function meadowShade(m) { return clamp((-m - 0.3) * 2.5, 0, 1); }

        // 3. Ground Row Generation
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                let t = Grass;
                let jitter = NaN;
                for (let p of map.ponds) {
                    let b = p.bounds;
                    if (x < b.x || y < b.y || x >= b.x + b.w || y >= b.y + b.h) continue;
                    if (isNaN(jitter)) jitter = perlin2(seed, x * 0.06, y * 0.09) * 3.5;
                    let dx = (x - p.cx) / p.rx, dy = (y - p.cy) / p.ry;
                    let v = Math.sqrt(dx * dx + dy * dy) + perlin2(p.shapeSeed, dx * 1.7, dy * 1.7) * 0.3 + jitter / p.rx;
                    if (v < 1.0) { t = Water; break; }
                    if (v < 1.0 + 10.0 / p.rx) t = Sand;
                }
                if (t === Grass && onPath(x, y)) t = Path;
                map.terrain[y * w + x] = t;

                let n = fbm2((seed + 9) | 0, x / 14.0, y / 10.0, 2) * 0.5 + 0.5;
                let c;
                switch (t) {
                    case Water: c = n < 0.45 ? Water0 : Water1; break;
                    case Sand: c = n < 0.4 ? Sand0 : (n > 0.72 ? Sand2 : Sand1); break;
                    case Path: c = n < 0.4 ? Dirt0 : (n > 0.7 ? Dirt2 : Dirt1); break;
                    default: {
                        let m = meadow(x, y), lift = meadowLift(m), shade = meadowShade(m);
                        let lo = 0.38 - lift * 0.14 + shade * 0.2, hi = 0.63 - lift * 0.2 + shade * 0.15;
                        c = n < lo ? Grass0 : (n > hi ? (lift > 0.6 && n > hi + 0.24 ? Grass3 : Grass2) : Grass1);
                        break;
                    }
                }
                let idx = (y * w + x) * 4;
                map.groundRgba[idx] = c[0];
                map.groundRgba[idx + 1] = c[1];
                map.groundRgba[idx + 2] = c[2];
                map.groundRgba[idx + 3] = 255;
            }
        }

        // 4. Tufts & Flowers
        const tuftCell = 5;
        function grassPixel(x, y, col) {
            if (x < 0 || y < 0 || x >= w || y >= h || map.terrain[y * w + x] !== Grass) return;
            let idx = (y * w + x) * 4;
            map.groundRgba[idx] = col[0];
            map.groundRgba[idx + 1] = col[1];
            map.groundRgba[idx + 2] = col[2];
        }

        for (let cy = 0; cy < Math.floor(h / tuftCell); cy++) {
            for (let cx = 0; cx < Math.floor(w / tuftCell); cx++) {
                let r = hash01((seed + 11) | 0, cx, cy);
                let x = cx * tuftCell + Math.floor(hash01((seed + 12) | 0, cx, cy) * (tuftCell - 2)) + 1;
                let y = cy * tuftCell + Math.floor(hash01((seed + 13) | 0, cx, cy) * (tuftCell - 2)) + 1;
                let flowerRate = 0.012 + meadowLift(meadow(x, y)) * 0.07;
                if (r < 0.34) {
                    grassPixel(x, y + 1, Grass0);
                    grassPixel(x - 1, y + 1, Grass0);
                    grassPixel(x, y, Grass2);
                    if (r < 0.14) grassPixel(x - 1, y, Grass3);
                } else if (r < 0.34 + flowerRate) {
                    let fcIdx = Math.floor(hash01((seed + 14) | 0, cx, cy) * Flowers.length) % Flowers.length;
                    let fc = Flowers[fcIdx];
                    grassPixel(x, y, fc);
                    grassPixel(x, y + 1, Grass0);
                    if (r < 0.34 + flowerRate * 0.4) {
                        grassPixel(x + 1, y, [Math.round(fc[0] * 0.8), Math.round(fc[1] * 0.8), Math.round(fc[2] * 0.8)]);
                    }
                }
            }
        }

        // 5. Shore Row Foam
        for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
                let i = y * w + x;
                if (map.terrain[i] !== Water) continue;
                if (map.terrain[i - 1] === Water && map.terrain[i + 1] === Water &&
                    map.terrain[i - w] === Water && map.terrain[i + w] === Water) continue;
                let c = map.terrain[i - w] !== Water ? Water0 : Foam;
                let idx = i * 4;
                map.groundRgba[idx] = c[0];
                map.groundRgba[idx + 1] = c[1];
                map.groundRgba[idx + 2] = c[2];
            }
        }

        // 6. Relief & Elevation
        let pathDist = new Uint8Array(w * h);
        for (let i = 0; i < pathDist.length; i++) pathDist[i] = map.terrain[i] === Path ? 0 : 100;
        for (let y = 1; y < h; y++) {
            for (let x = 1; x < w; x++) {
                let i = y * w + x;
                pathDist[i] = Math.min(pathDist[i], 1 + Math.min(pathDist[i - 1], pathDist[i - w]));
            }
        }
        for (let y = h - 2; y >= 0; y--) {
            for (let x = w - 2; x >= 0; x--) {
                let i = y * w + x;
                pathDist[i] = Math.min(pathDist[i], 1 + Math.min(pathDist[i + 1], pathDist[i + w]));
            }
        }

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                let i = y * w + x;
                let shore = 1e6;
                for (let p of map.ponds) {
                    let dx = (x - p.cx) / p.rx, dy = (y - p.cy) / p.ry;
                    let v = Math.sqrt(dx * dx + dy * dy) + perlin2(p.shapeSeed, dx * 1.7, dy * 1.7) * 0.3;
                    shore = Math.min(shore, (v - 1) * Math.min(p.rx, p.ry));
                }
                if (map.terrain[i] === Water) {
                    let depth = clamp(-shore / 42, 0, 1);
                    map.waterDepth[i] = depth;
                    let grain = hash01((seed + 601) | 0, Math.floor(x / 2), Math.floor(y / 2));
                    let shallow = [75, 151, 145];
                    let deep = [21, 61, 89];
                    let cr = lerp(shallow[0], deep[0], depth * 0.9);
                    let cg = lerp(shallow[1], deep[1], depth * 0.9);
                    let cb = lerp(shallow[2], deep[2], depth * 0.9);
                    let gl = grain * 0.055;
                    cr = Math.round(cr * (1 + gl));
                    cg = Math.round(cg * (1 + gl));
                    cb = Math.round(cb * (1 + gl));
                    let caustic = Math.sin(x * 0.17 + Math.sin(y * 0.13) * 2.4) + Math.cos(y * 0.26 + x * 0.04);
                    if (caustic > 1.82) {
                        let boost = 0.14 * (1 - depth * 0.6);
                        cr = Math.min(255, Math.round(cr * (1 + boost)));
                        cg = Math.min(255, Math.round(cg * (1 + boost)));
                        cb = Math.min(255, Math.round(cb * (1 + boost)));
                    }
                    putClip(map.groundRgba, w, h, x, y, cr, cg, cb);
                    let j = i * 4;
                    map.waterSurfaceRgba[j] = 39;
                    map.waterSurfaceRgba[j + 1] = 125;
                    map.waterSurfaceRgba[j + 2] = 151;
                    map.waterSurfaceRgba[j + 3] = Math.round(30 + depth * 22);
                    continue;
                }

                let n = perlin2((seed + 702) | 0, x / 210.0, y / 155.0);
                let hx = (x - w * 0.27) / Math.min(190, w * 0.25);
                let hy = (y - h * 0.29) / Math.min(130, h * 0.25);
                let mound = Math.max(0, 1 - Math.sqrt(hx * hx + hy * hy));
                let raw = Math.max(mound * 45, Math.max(0, n + 0.08) * 65);
                let terrace = Math.floor(raw / 12) * 12;

                let rampCenter = w * 0.27 + Math.sin(y * 0.012) * 12;
                let ramp = clamp((Math.abs(x - rampCenter) - 20) / 22, 0, 1);
                ramp = Math.min(ramp, clamp(pathDist[i] / 24.0, 0, 1));
                ramp = ramp * ramp * (3 - 2 * ramp);
                let elevation = raw * (1 - ramp) + terrace * ramp;
                let bank = clamp((shore - 16) / 40, 0, 1);
                bank = bank * bank * (3 - 2 * bank);
                let edge = clamp(Math.min(Math.min(x, w - x - 1), Math.min(y, h - y - 1)) / 42.0, 0, 1);
                map.elevation[i] = elevation * bank * edge;
            }
        }

        // 7. Projected Relief & Cliff Faces
        let source = map.groundRgba;
        let projected = new Uint8ClampedArray(source);
        for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
                let i = y * w + x;
                let top = y - Math.round(map.elevation[i]);
                if (top < 0) continue;
                let slope = (map.elevation[i + 1] - map.elevation[i - 1]) * 0.035 + (map.elevation[i + w] - map.elevation[i - w]) * 0.055;
                let light = clamp(1.0 + slope + map.elevation[i] * 0.0017, 0.77, 1.16);
                let target = (top * w + x) * 4;
                for (let c = 0; c < 3; c++) {
                    projected[target + c] = clamp(Math.round(source[i * 4 + c] * light), 0, 255);
                }
                projected[target + 3] = 255;

                let next = y + 1 - Math.round(map.elevation[i + w]);
                for (let fy = top + 1; fy < next && fy < h; fy++) {
                    if (map.elevation[i] - map.elevation[i + w] < 2.5) {
                        let srcIdx = target;
                        let dstIdx = (fy * w + x) * 4;
                        projected[dstIdx] = projected[srcIdx];
                        projected[dstIdx + 1] = projected[srcIdx + 1];
                        projected[dstIdx + 2] = projected[srcIdx + 2];
                        projected[dstIdx + 3] = 255;
                        continue;
                    }
                    let grain = hash01((seed + 710) | 0, Math.floor(x / 3), Math.floor(fy / 2));
                    let rock = grain > 0.6 ? [116, 102, 76] : [86, 84, 67];
                    if ((fy - top) % 5 === 0) rock = [67, 71, 59];
                    if (fy === top + 1) rock = [146, 139, 92];
                    putClip(projected, w, h, x, fy, rock[0], rock[1], rock[2]);
                }
            }
        }

        // Gather Cliffs for Y-Sorting
        for (let y = 1; y < h - 1; y += 2) {
            let start = -1;
            for (let x = 1; x < w; x++) {
                let cliff = x < w - 1 && (map.elevation[y * w + x] - map.elevation[(y + 1) * w + x] > 4);
                if (cliff && start < 0) start = x;
                if ((!cliff || x === w - 1) && start >= 0) {
                    let minTop = y, maxBottom = 0;
                    for (let xx = start; xx < x; xx++) {
                        minTop = Math.min(minTop, y - Math.round(map.elevation[y * w + xx]));
                        maxBottom = Math.max(maxBottom, y + 2 - Math.round(map.elevation[Math.min(h - 1, y + 2) * w + xx]));
                    }
                    let fh = maxBottom - minTop;
                    if (fh > 2 && minTop >= 0) {
                        let fw = x - start;
                        let faceRgba = new Uint8ClampedArray(fw * fh * 4);
                        for (let xx = start; xx < x; xx++) {
                            let t = y - Math.round(map.elevation[y * w + xx]);
                            let b = y + 2 - Math.round(map.elevation[Math.min(h - 1, y + 2) * w + xx]);
                            for (let yy = t; yy < b; yy++) {
                                let srcIdx = (yy * w + xx) * 4;
                                let dstIdx = ((yy - minTop) * fw + (xx - start)) * 4;
                                faceRgba[dstIdx] = projected[srcIdx];
                                faceRgba[dstIdx + 1] = projected[srcIdx + 1];
                                faceRgba[dstIdx + 2] = projected[srcIdx + 2];
                                faceRgba[dstIdx + 3] = projected[srcIdx + 3];
                            }
                        }
                        map.cliffs.push({ x: start, y: maxBottom, w: fw, h: fh, rgba: faceRgba });
                    }
                    start = -1;
                }
            }
        }
        map.groundRgba = projected;

        // 8. Water Glints (4 frames per pond)
        for (let pond of map.ponds) {
            let b = pond.bounds;
            let bw = b.w, bh = b.h;
            pond.glintFrames = [];
            const glintCell = 9;
            for (let k = 0; k < 4; k++) {
                let ov = new Uint8ClampedArray(bw * bh * 4);
                let startCy = Math.floor(b.y / glintCell), endCy = Math.floor((b.y + bh) / glintCell);
                let startCx = Math.floor(b.x / glintCell), endCx = Math.floor((b.x + bw) / glintCell);
                for (let cy = startCy; cy <= endCy; cy++) {
                    for (let cx = startCx; cx <= endCx; cx++) {
                        let r = hash01((seed + 40) | 0, cx, cy);
                        if (r > 0.16) continue;
                        let ph = Math.floor(hash01((seed + 41) | 0, cx, cy) * 4);
                        let age = (k - ph + 4) % 4;
                        if (age > 1) continue;
                        let x = cx * glintCell + Math.floor(hash01((seed + 42) | 0, cx, cy) * 5);
                        let y = cy * glintCell + Math.floor(hash01((seed + 43) | 0, cx, cy) * 6);
                        if (x < 0 || y < 0 || x + 3 >= w || y + 2 >= h) continue;
                        if (map.terrain[y * w + x] !== Water || map.terrain[y * w + (x + 3)] !== Water ||
                            map.terrain[(y - 2) * w + x] !== Water || map.terrain[(y + 2) * w + x] !== Water) continue;
                        let len = age === 0 ? 2 : 3;
                        let c = age === 0 ? Foam : Water2;
                        for (let j = 0; j < len; j++) {
                            putClip(ov, bw, bh, x + j + age - b.x, y - b.y, c[0], c[1], c[2]);
                        }
                    }
                }
                pond.glintFrames.push(ov);
            }
        }

        // 9. Clearance (Obstáculos e Distância Chebyshev)
        let d = new Uint8Array(w * h);
        d.fill(250);
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                let i = y * w + x;
                let water = map.terrain[i] === Water;
                if (x === 0 || y === 0 || x === w - 1 || y === h - 1 ||
                    (map.terrain[i - 1] === Water) !== water || (map.terrain[i + 1] === Water) !== water ||
                    (map.terrain[i - w] === Water) !== water || (map.terrain[i + w] === Water) !== water ||
                    (!water && (Math.abs(map.elevation[i] - map.elevation[i - w]) > 2 || Math.abs(map.elevation[i] - map.elevation[i - 1]) > 2))) {
                    d[i] = 0;
                }
            }
        }

        // 10. Props
        const propRng = new Rng(seed ^ 0x50524F50);
        const propArea = 5600;
        let targetProps = Math.round(w * h / propArea);
        const grid = 12;
        let gw = Math.floor(w / grid) + 1, gh = Math.floor(h / grid) + 1;
        let occupied = new Uint8Array(gw * gh);

        function isGrassArea(x, y, margin) {
            for (let dy = -Math.floor(margin / 2); dy <= Math.floor(margin / 2); dy += 2) {
                for (let dx = -margin; dx <= margin; dx += 3) {
                    let xx = x + dx, yy = y + dy;
                    if (xx < 0 || yy < 0 || xx >= w || yy >= h || map.terrain[yy * w + xx] !== Grass) return false;
                }
            }
            return true;
        }

        for (let attempts = 0; map.props.length < targetProps && attempts < targetProps * 25; attempts++) {
            let x = propRng.range(8, w - 9), y = propRng.range(20, h - 5);
            if (!isGrassArea(x, y, 10)) continue;
            let gx = Math.floor(x / grid), gy = Math.floor(y / grid);
            let free = true;
            for (let oy = Math.max(0, gy - 1); oy <= Math.min(gh - 1, gy + 1) && free; oy++) {
                for (let ox = Math.max(0, gx - 1); ox <= Math.min(gw - 1, gx + 1); ox++) {
                    if (occupied[oy * gw + ox]) { free = false; break; }
                }
            }
            if (!free) continue;
            occupied[gy * gw + gx] = 1;
            let r = propRng.nextDouble();
            let kind = r < 0.45 ? 'Tree' : (r < 0.75 ? 'Bush' : 'Rock');
            let variants = kind === 'Tree' ? 10 : (kind === 'Bush' ? 8 : 8);
            map.props.push({ x, y, kind, variant: propRng.nextInt(variants) });
        }

        for (let p of map.props) {
            let r = p.kind === 'Tree' ? 3 : (p.kind === 'Rock' ? 4 : 2);
            for (let y = Math.max(0, p.y - r); y <= Math.min(h - 1, p.y + r); y++) {
                for (let x = Math.max(0, p.x - r); x <= Math.min(w - 1, p.x + r); x++) {
                    d[y * w + x] = 0;
                }
            }
        }

        for (let y = 1; y < h; y++) {
            for (let x = 1; x < w - 1; x++) {
                let i = y * w + x;
                d[i] = Math.min(d[i], 1 + Math.min(Math.min(d[i - 1], d[i - w]), Math.min(d[i - w - 1], d[i - w + 1])));
            }
        }
        for (let y = h - 2; y >= 0; y--) {
            for (let x = w - 2; x > 0; x--) {
                let i = y * w + x;
                d[i] = Math.min(d[i], 1 + Math.min(Math.min(d[i + 1], d[i + w]), Math.min(d[i + w - 1], d[i + w + 1])));
            }
        }
        map.clearance = d;

        _mapData = map;
        return map;
    }

    // ========================================================================
    // CACHE GRÁFICO (CANVAS 2D OFFSCREEN)
    // ========================================================================
    let _canvasGround = null;
    let _canvasWaterSurface = null;
    let _pondsGlintCanvases = [];
    let _cliffCanvases = [];
    let _treeVariants = [];
    let _bushVariants = [];
    let _rockVariants = [];
    let _graficosInicializados = false;

    function createOffscreenCanvas(w, h, rgba) {
        if (typeof document === 'undefined') return null;
        let c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        let ctx = c.getContext('2d');
        if (rgba) {
            let imgData = ctx.createImageData(w, h);
            imgData.data.set(rgba);
            ctx.putImageData(imgData, 0, 0);
        }
        return c;
    }

    function inicializarGraficos() {
        if (_graficosInicializados || typeof document === 'undefined') return;
        const map = buildTestMap();

        _canvasGround = createOffscreenCanvas(WIDTH, HEIGHT, map.groundRgba);
        _canvasWaterSurface = createOffscreenCanvas(WIDTH, HEIGHT, map.waterSurfaceRgba);

        // Prepara frames de reflexo dos lagos
        _pondsGlintCanvases = map.ponds.map(p => {
            return p.glintFrames.map(gf => createOffscreenCanvas(p.bounds.w, p.bounds.h, gf));
        });

        // Prepara tiras de falésias
        _cliffCanvases = map.cliffs.map(f => {
            return {
                x: f.x,
                y: f.y,
                w: f.w,
                h: f.h,
                canvas: createOffscreenCanvas(f.w, f.h, f.rgba)
            };
        });

        // Prepara variantes dos props
        const vRng = new Rng(SEED ^ 0x56415249);
        _treeVariants = [];
        for (let i = 0; i < 10; i++) {
            let p = generateTree(vRng.nextUInt(), vRng.rangeF(0.85, 1.2));
            _treeVariants.push({ canvas: createOffscreenCanvas(p.w, p.h, p.rgba), origin: p.origin });
        }
        _bushVariants = [];
        for (let i = 0; i < 8; i++) {
            let p = generateBush(vRng.nextUInt(), vRng.rangeF(0.8, 1.2));
            _bushVariants.push({ canvas: createOffscreenCanvas(p.w, p.h, p.rgba), origin: p.origin });
        }
        _rockVariants = [];
        for (let i = 0; i < 8; i++) {
            let p = generateRock(vRng.nextUInt(), vRng.rangeF(0.7, 1.3));
            _rockVariants.push({ canvas: createOffscreenCanvas(p.w, p.h, p.rgba), origin: p.origin });
        }

        _graficosInicializados = true;
    }

    // ========================================================================
    // COLISÃO, ALTURA E NAVEGAÇÃO
    // ========================================================================
    function heightAt(worldX, worldY) {
        const lx = worldX - TILE_X0;
        const ly = worldY;
        if (lx < 0 || ly < 0 || lx >= WIDTH - 1 || ly >= HEIGHT - 1) return 0;
        const map = buildTestMap();
        const x = Math.max(0, Math.min(WIDTH - 2, Math.floor(lx)));
        const y = Math.max(0, Math.min(HEIGHT - 2, Math.floor(ly)));
        const fx = clamp(lx - x, 0, 1), fy = clamp(ly - y, 0, 1);
        const i = y * WIDTH + x;
        const e00 = map.elevation[i], e10 = map.elevation[i + 1];
        const e01 = map.elevation[i + WIDTH], e11 = map.elevation[i + WIDTH + 1];
        return lerp(lerp(e00, e10, fx), lerp(e01, e11, fx), fy);
    }

    function isTileTeste(x, y) {
        return x >= TILE_X0 && x < TILE_X1 && y >= 0 && y < HEIGHT;
    }

    function colideTileTeste(worldX, worldY, raio = 8) {
        const lx = Math.floor(worldX - TILE_X0);
        const ly = Math.floor(worldY);

        // Limites do mundo do mapa
        if (lx < 10 || lx >= WIDTH - 10 || ly < 10 || ly >= HEIGHT - 10) return true;

        // Perto do portal de retorno o trânsito é sempre desimpedido
        const distPortal = Math.hypot(worldX - PORTAL_RETORNO.x, worldY - PORTAL_RETORNO.y);
        if (distPortal < PORTAL_RETORNO.r + 15) return false;

        const map = buildTestMap();
        const idx = ly * WIDTH + lx;

        // Água profunda é intransponível para caminhantes
        if (map.terrain[idx] === Water) return true;

        // Clearance Chebyshev: bordas de falésia acentuadas, troncos e pedras sólidas
        if (map.clearance[idx] < 2) return true;

        return false;
    }

    function colideProjetilTileTeste(worldX, worldY) {
        const lx = Math.floor(worldX - TILE_X0);
        const ly = Math.floor(worldY);
        if (lx < 0 || lx >= WIDTH || ly < 0 || ly >= HEIGHT) return true;
        const map = buildTestMap();
        const idx = ly * WIDTH + lx;
        if (map.clearance[idx] === 0 && map.terrain[idx] !== Water) return true;
        return false;
    }

    function infoPortalTileTeste(worldX, worldY) {
        if (!isTileTeste(worldX, worldY)) return null;
        const dist = Math.hypot(worldX - PORTAL_RETORNO.x, worldY - PORTAL_RETORNO.y);
        if (dist <= PORTAL_RETORNO.r) {
            return {
                via: 'portal',
                mapa: 'cidade',
                alvo: { x: 60474, y: 660 }
            };
        }
        return null;
    }

    let transicaoAtiva = false;
    let tiletesteChainAnterior = null;

    function onUpdatePosicao(x, y) {
        if (transicaoAtiva || global.estaMorto) return;
        if (typeof global.portalMapaPodeDisparar === 'function' && !global.portalMapaPodeDisparar(x, y)) return;

        let info = null;
        if (isTileTeste(x, y)) {
            info = infoPortalTileTeste(x, y);
        }

        if (!info && tiletesteChainAnterior && typeof tiletesteChainAnterior.onUpdatePosicao === 'function') {
            tiletesteChainAnterior.onUpdatePosicao(x, y);
            return;
        }
        if (!info) return;

        if (typeof global.solicitarTeleporteMapa === 'function') {
            global.solicitarTeleporteMapa(info.mapa, 'tileteste_' + info.mapa);
            return;
        }
        transicaoAtiva = true;
    }

    // ========================================================================
    // RENDERIZAÇÃO DO CENÁRIO (CANVAS 2D)
    // ========================================================================
    function desenharCenarioTileTeste(t) {
        const ctx = global.ctx;
        if (!ctx) return;

        inicializarGraficos();
        if (!_canvasGround) return;

        let camX = global.camX || 0;
        let camY = global.camY || 0;
        let cw = ((global.canvas && global.canvas.width) || 800) / (global.ZOOM_CAMERA || 1);
        let ch = ((global.canvas && global.canvas.height) || 600) / (global.ZOOM_CAMERA || 1);

        // Culling
        if (TILE_X1 < camX || TILE_X0 > camX + cw || HEIGHT < camY || 0 > camY + ch) return;

        // 1. Chão com relevo, cores de grama, caminhos e margens (ZIndex = -10)
        ctx.drawImage(_canvasGround, TILE_X0, 0);

        // 2. Reflexos animados da água (Glints) - 3 fps (ZIndex = -1)
        const map = buildTestMap();
        const wf = Math.floor(t * 3) % 4;
        for (let i = 0; i < map.ponds.length; i++) {
            let p = map.ponds[i];
            let glintCanv = _pondsGlintCanvases[i] && _pondsGlintCanvases[i][wf];
            if (glintCanv) {
                ctx.drawImage(glintCanv, TILE_X0 + p.bounds.x, p.bounds.y);
            }
        }

        // 3. Superfície da Água semi-transparente (ZIndex = -1)
        if (_canvasWaterSurface) {
            ctx.drawImage(_canvasWaterSurface, TILE_X0, 0);
        }

        // 4. Portal de Retorno para Davahl
        desenharPortalRetorno(ctx, t);
    }

    function desenharPortalRetorno(ctx, t) {
        const px = PORTAL_RETORNO.x, py = PORTAL_RETORNO.y, r = PORTAL_RETORNO.r;
        ctx.save();
        const pulsar = 1 + Math.sin(t * 3) * 0.08;
        const R = r * pulsar;

        // Sombra suave no chão
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.ellipse(px, py + 4, R * 1.1, R * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Anel de luz esmeralda
        const grad = ctx.createRadialGradient(px, py, 2, px, py, R);
        grad.addColorStop(0, 'rgba(46, 204, 113, 0.85)');
        grad.addColorStop(0.5, 'rgba(39, 174, 96, 0.45)');
        grad.addColorStop(1, 'rgba(26, 188, 156, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(px, py, R, R * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Runas giratórias
        ctx.strokeStyle = '#a8ffb2';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(px, py, R * 0.7, R * 0.4, t * 1.5, 0, Math.PI * 2);
        ctx.stroke();

        // Texto do Portal
        ctx.font = "bold 9px 'Rajdhani', Arial, sans-serif";
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 4;
        ctx.fillText("🏛️ RETORNO: Davahl", px, py - R * 0.6 - 6);
        ctx.restore();
    }

    // ========================================================================
    // Y-SORTING DOS PROPS E FALÉSIAS (spritesSort)
    // ========================================================================
    function coletarTileTesteSortables(t, spritesSort) {
        if (!spritesSort) return;
        inicializarGraficos();
        const map = buildTestMap();

        // 1. Falésias Estratificadas (ReliefFace)
        for (let i = 0; i < _cliffCanvases.length; i++) {
            let c = _cliffCanvases[i];
            let faceX = TILE_X0 + c.x;
            let faceY = c.y; // bottom da face para Y-Sort
            spritesSort.push({
                y: faceY,
                draw: function () {
                    global.ctx.drawImage(c.canvas, faceX, faceY - c.h);
                }
            });
        }

        // 2. Props com Projeção e Sombreamento (Árvores, Rochas e Arbustos)
        for (let i = 0; i < map.props.length; i++) {
            let p = map.props[i];
            let elev = map.elevation[p.y * WIDTH + p.x];
            let projX = TILE_X0 + p.x;
            let projY = p.y - elev; // projeção y - elevation

            let v = null;
            if (p.kind === 'Tree') v = _treeVariants[p.variant % _treeVariants.length];
            else if (p.kind === 'Bush') v = _bushVariants[p.variant % _bushVariants.length];
            else v = _rockVariants[p.variant % _rockVariants.length];

            if (v && v.canvas) {
                let ox = v.origin.x, oy = v.origin.y;
                spritesSort.push({
                    y: projY, // contato do solo com relevo projetado
                    draw: function () {
                        global.ctx.drawImage(v.canvas, projX - ox, projY - oy);
                    }
                });
            }
        }
    }

    // ========================================================================
    // EXPORTAÇÃO ISOMÓRFICA
    // ========================================================================
    const api = {
        WIDTH: WIDTH,
        HEIGHT: HEIGHT,
        TILE_X0: TILE_X0,
        TILE_X1: TILE_X1,
        SEED: SEED,
        SPAWN_PONTO: SPAWN_PONTO,
        PORTAL_RETORNO: PORTAL_RETORNO,
        buildTestMap: buildTestMap,
        heightAt: heightAt,
        isTileTeste: isTileTeste,
        colideTileTeste: colideTileTeste,
        colideProjetilTileTeste: colideProjetilTileTeste,
        infoPortalTileTeste: infoPortalTileTeste,
        desenharCenarioTileTeste: desenharCenarioTileTeste,
        coletarTileTesteSortables: coletarTileTesteSortables,
        onUpdatePosicao: onUpdatePosicao
    };

    if (typeof window !== 'undefined') {
        buildTestMap();
        tiletesteChainAnterior = global.chainMapas;
        global.chainMapas = { onUpdatePosicao: onUpdatePosicao };
        global.LARGURA_TILETESTE = TILE_X0;
        global.FIM_TILETESTE = TILE_X1;
        global.ALTO_TILETESTE = HEIGHT;
        global.desenharCenarioTileTeste = desenharCenarioTileTeste;
        global.coletarTileTesteSortables = coletarTileTesteSortables;

        const prevColide = global.colideMapaAtivo;
        global.colideMapaAtivo = function (x, y, raio) {
            if (global.currentMap === 'tileteste') return !isTileTeste(x, y) || colideTileTeste(x, y, raio);
            return typeof prevColide === 'function' ? prevColide(x, y, raio) : false;
        };

        const prevColideP = global.colideProjetilMapaAtivo;
        global.colideProjetilMapaAtivo = function (x, y) {
            if (global.currentMap === 'tileteste') return !isTileTeste(x, y) || colideProjetilTileTeste(x, y);
            return typeof prevColideP === 'function' ? prevColideP(x, y) : false;
        };

        global.mapaTileTeste = api;
    }

    if (typeof module !== 'undefined' && module.exports) {
        buildTestMap();
        module.exports = api;
    }

})(typeof window !== 'undefined' ? window : globalThis);
