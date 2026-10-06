// ============================================================================
// mapa_mundo.js — "Continente de Gaia Expandido v3.0": Mundo Completo (88000x28000)
// Baseado fielmente no mapa panorâmico oficial de Gaia (media_1791073115712.jpg):
// - Centro: Círculo de Gaia (Planície das Plantas / Santuário, Vulcão, Pântano,
//   Deserto, Cristais, Tundra Gélida, Terra Profanada).
// - Asa Oeste: Terras de Obsidiana (Pico de Vapor) + Floresta dos Lamentos (Altar da Necromancia).
// - Borda Norte: Taiga Boreal Gelada (Templo da Geada) + Picos de Gelo (Observatório Estelar).
// - Asa Leste: Canyon do Abreu (Garganta Dourada) + Costa da Rocha Cristalina (Recife de Mana).
// - Sul / Oceano: Oceano de Gelo (Porto Gelado / Icebergs) + Plataforma Ancestral (Ruínas Submersas).
//
// Otimização Máxima: Chunks 512px em Offscreen Canvas, renderização 2.5D procedimental,
// 60 FPS estável tanto no PC quanto no Mobile.
// ============================================================================
(function (global) {
    'use strict';

    const X0 = 100000, W = 88000, H = 28000;
    const CX = 144000, CY = 14000;          // Centro de Gaia (144000, 14000)
    const R_GAIA = 7200;                    // Raio do anel central de Gaia
    const SEED = 4242;
    const CHUNK = 512, TEXEL = 2, CT = CHUNK / TEXEL;
    const CELL = 240;                       // Célula da grade de props
    const SPAWN = { x: 144000, y: 14018 };  // Centro exato de Gaia
    const PORTAL_RETORNO = { x: 144000, y: 14018, r: 0 };

    // Centros oficiais dos biomas (viagem, minimapa e referências)
    const CENTROS_BIOMAS = {
        // Centro e anel original de Gaia
        santuario:       { id: 'santuario',       nome: 'Planície das Plantas (Santuário)',     x: 144000, y: 14018 },
        floresta:        { id: 'floresta',        nome: 'Floresta Sombria',                     x: 144000, y: 8800 },
        tempestade:      { id: 'tempestade',      nome: 'Pico dos Relâmpagos',                  x: 149500, y: 9200 },
        deserto:         { id: 'deserto',         nome: 'Deserto Escaldante (Templo de Ouro)',  x: 153000, y: 14000 },
        cristais:        { id: 'cristais',        nome: 'Vale dos Cristais',                    x: 151500, y: 19500 },
        neve:            { id: 'neve',            nome: 'Tundra Gélida (Trono Subterrâneo)',    x: 144000, y: 20000 },
        pantano:         { id: 'pantano',         nome: 'Pântano Nebuloso (Templo Santuário)',  x: 139000, y: 17500 },
        profanado:       { id: 'profanado',       nome: 'Terra Profanada (Cripta Ancestral)',   x: 136000, y: 19500 },
        vulcao:          { id: 'vulcao',          nome: 'Terras Vulcânicas (Poço de Lava)',     x: 134500, y: 14000 },
        selva:           { id: 'selva',           nome: 'Selva Proibida',                       x: 137500, y: 8800 },

        // Novos Biomas da Expansão Panorâmica
        obsidiana:       { id: 'obsidiana',       nome: 'Terras de Obsidiana (Pico de Vapor)',      x: 114000, y: 8500 },
        lamentos:        { id: 'lamentos',        nome: 'Floresta dos Lamentos (Altar da Necromancia)', x: 116000, y: 19500 },
        taiga:           { id: 'taiga',           nome: 'Taiga Boreal Gelada (Templo da Geada)',    x: 127000, y: 3600 },
        picos_gelo:      { id: 'picos_gelo',      nome: 'Picos de Gelo (Observatório Estelar)',      x: 154000, y: 3600 },
        canyon:          { id: 'canyon',          nome: 'Canyon do Abreu (Garganta Dourada)',        x: 174000, y: 8500 },
        recife_cristal:  { id: 'recife_cristal',  nome: 'Costa da Rocha Cristalina (Recife de Mana)', x: 174000, y: 20000 },
        plataforma_gelo: { id: 'plataforma_gelo', nome: 'Plataforma Ancestral (Ruínas Submersas)',  x: 163000, y: 25000 },
        oceano_gelo:     { id: 'oceano_gelo',     nome: 'Oceano de Gelo (Porto Gelado)',            x: 139000, y: 26000 }
    };

    function hash3(seed, x, y, z) {
        let h = (seed ^ Math.imul(x | 0, 0x9E3779B1) ^ Math.imul(y | 0, 0xC2B2AE3D) ^ Math.imul((z || 0) | 0, 0x165667B1)) | 0;
        h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
        h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
        return (h ^ (h >>> 16)) >>> 0;
    }
    function hash01(seed, x, y, z) { return hash3(seed, x, y, z) / 4294967296; }
    function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    function lerp(a, b, t) { return a + (b - a) * t; }
    function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
    function grad(seed, ix, iy, fx, fy) {
        switch (hash3(seed, ix, iy, 0) & 7) {
            case 0: return fx + fy; case 1: return -fx + fy; case 2: return fx - fy; case 3: return -fx - fy;
            case 4: return fx; case 5: return -fx; case 6: return fy; default: return -fy;
        }
    }
    function perlin(seed, x, y) {
        const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
        const u = fade(fx), v = fade(fy);
        return lerp(lerp(grad(seed, ix, iy, fx, fy), grad(seed, ix + 1, iy, fx - 1, fy), u),
            lerp(grad(seed, ix, iy + 1, fx, fy - 1), grad(seed, ix + 1, iy + 1, fx - 1, fy - 1), u), v) * 0.9;
    }

    // ---- 18 Biomas ----
    const B = {
        // Biomas Centrais de Gaia
        PLANTAS: 0,
        FLORESTA: 1,
        TEMPESTADE: 2,
        DESERTO: 3,
        CRISTAIS: 4,
        NEVE: 5,
        PANTANO: 6,
        PROFANADO: 7,
        VULCAO: 8,
        SELVA: 9,

        // Novos Biomas Expansão
        OBSIDIANA: 10,       // Noroeste Extremo (Pico de Vapor)
        LAMENTOS: 11,        // Sudoeste Extremo (Floresta dos Lamentos)
        TAIGA: 12,           // Norte-Noroeste (Taiga Boreal Gelada)
        PICOS_GELO: 13,      // Norte-Nordeste (Picos de Gelo)
        CANYON: 14,          // Nordeste Extremo (Canyon do Abreu)
        RECIFE_CRISTAL: 15,  // Sudeste Extremo (Costa da Rocha Cristalina)
        PLATAFORMA_GELO: 16, // Sul Extremo (Plataforma Ancestral)
        OCEANO_GELO: 17      // Mar Austral Gelado (Porto Gelado / Icebergs)
    };

    const NOMES = [
        'Planície das Plantas (Santuário)',
        'Floresta Sombria',
        'Pico dos Relâmpagos',
        'Deserto Escaldante',
        'Vale dos Cristais',
        'Tundra Gélida',
        'Pântano Nebuloso',
        'Terra Profanada',
        'Terras Vulcânicas',
        'Selva Proibida',
        'Terras de Obsidiana (Pico de Vapor)',
        'Floresta dos Lamentos (Altar da Necromancia)',
        'Taiga Boreal Gelada (Templo da Geada)',
        'Picos de Gelo (Observatório Estelar)',
        'Canyon do Abreu (Garganta Dourada)',
        'Costa da Rocha Cristalina (Recife de Mana)',
        'Plataforma Ancestral (Ruínas Submersas)',
        'Oceano de Gelo (Porto Gelado)'
    ];

    // Ordem radial contínua dos setores centrais de Gaia
    const SETORES_GAIA = [
        B.DESERTO,
        B.CRISTAIS,
        B.NEVE,
        B.PANTANO,
        B.PROFANADO,
        B.VULCAO,
        B.SELVA,
        B.FLORESTA,
        B.TEMPESTADE
    ];

    // Identificação de bioma precisa baseada nas coordenadas globais
    function biomaEm(wx, wy, d) {
        const dx = wx - CX, dy = wy - CY;
        const distCentro = Math.hypot(dx, dy);

        // Distorção orgânica de domínio para fronteiras naturais
        const warpX = perlin(SEED + 1, wx / 2800, wy / 2800) * 800 + perlin(SEED + 7, wx / 600, wy / 600) * 180;
        const warpY = perlin(SEED + 2, wx / 2800, wy / 2800) * 800 + perlin(SEED + 8, wx / 600, wy / 600) * 180;
        const effX = wx + warpX + (d || 0) * 200;
        const effY = wy + warpY + (d || 0) * 200;

        // 1. Ilha Flutuante / Plataforma Ancestral no Sul
        if (effX >= 153000 && effX <= 173000 && effY >= 21800 && effY <= 27600) {
            return B.PLATAFORMA_GELO;
        }

        // 2. Oceano Austral Gelado (Sul distante)
        if (effY > 21800 && effX < 155000) {
            return B.OCEANO_GELO;
        }

        // 3. Faixa Superior Norte: Taiga Boreal e Picos de Gelo
        if (effY < 7200) {
            if (effX >= 110000 && effX < 142000) return B.TAIGA;
            if (effX >= 142000 && effX <= 168000) return B.PICOS_GELO;
        }

        // 4. Asa Oeste (Terras de Obsidiana e Floresta dos Lamentos)
        if (effX < 131000) {
            if (effY < 14000) return B.OBSIDIANA;
            return B.LAMENTOS;
        }

        // 5. Asa Leste (Canyon do Abreu e Costa da Rocha Cristalina)
        if (effX > 157000) {
            if (effY < 15500) return B.CANYON;
            return B.RECIFE_CRISTAL;
        }

        // 6. Núcleo Central de Gaia (Círculo Original)
        const warpRadial = perlin(SEED + 3, wx / 1200, wy / 1200) * 0.12;
        const rn = distCentro / R_GAIA + warpRadial;

        if (rn < 0.26) return B.PLANTAS; // Santuário Central

        let a = (Math.atan2(dy, dx) / (Math.PI * 2) + 1 + 1 / 18 + warpRadial * 0.3) % 1;
        if (a < 0) a += 1;
        const idx = Math.floor(a * 9) % 9;
        return SETORES_GAIA[idx];
    }

    // Transição suave de paletas de cor para blending do terreno
    function biomaTransicaoInfo(wx, wy) {
        const b = biomaEm(wx, wy, 0);
        const bDir = biomaEm(wx + 220, wy, 0);
        const bAbaixo = biomaEm(wx, wy + 220, 0);
        if (bDir !== b) return { b1: b, b2: bDir, blend: 0.35 };
        if (bAbaixo !== b) return { b1: b, b2: bAbaixo, blend: 0.35 };
        return { b1: b, b2: b, blend: 0 };
    }

    // ---- MÁSCARA DA MASSA DE TERRA DO CONTINENTE EXPANDIDO ----
    // Retorna 0: terra firme, 1: praia/margem, 2: água rasa, 3: oceano profundo
    let _prof = 0;

    function distanciaMassaContinental(wx, wy) {
        // Distância até o corpo principal contínuo do continente
        // O continente é composto por:
        // - Núcleo Central Gaia: elipse centrada em (144000, 14000) raio ~9500
        // - Asa Oeste: retângulo suave (102000..133000, 4000..23500)
        // - Asa Leste: retângulo suave (155000..186000, 3000..23500)
        // - Cordilheira Norte: retângulo suave (114000..166000, 1800..7500)
        // - Plataforma Ancestral (Ilha de Gelo Sul): (155000..171000, 22600..26800)

        const noiseBorda = perlin(SEED + 10, wx / 1800, wy / 1800) * 850 +
                           perlin(SEED + 11, wx / 500, wy / 500) * 320 +
                           perlin(SEED + 12, wx / 160, wy / 160) * 90;

        const px = wx + noiseBorda;
        const py = wy + noiseBorda;

        // 1. Plataforma Ancestral (Ilha no Sul)
        if (px >= 154500 && px <= 170500 && py >= 22600 && py <= 26800) {
            const dxI = Math.max(0, Math.abs(px - 162500) - 6800);
            const dyI = Math.max(0, Math.abs(py - 24700) - 1700);
            return -Math.max(0, 1800 - Math.hypot(dxI, dyI));
        }

        // 2. Icebergs soltos no Oceano Sul (formações flutuantes)
        if (py >= 22000 && py <= 27500 && px >= 120000 && px <= 153000) {
            const ibNoise = perlin(SEED + 40, px / 1400, py / 1400) + 0.4 * perlin(SEED + 41, px / 450, py / 450);
            if (ibNoise > 0.58) {
                return -Math.max(0, (ibNoise - 0.58) * 2000);
            }
        }

        // 3. Rio Central entre Obsidiana e Lamentos no Oeste (conforme referência)
        if (px >= 101000 && px <= 130000 && Math.abs(py - 14000 - Math.sin(px / 2800) * 700) < 320) {
            return 80; // Canal de água fluindo para o mar ocidental
        }

        // 4. Massa Principal do Continente
        // A. Núcleo Gaia
        const dCentro = Math.hypot((px - CX) / 1.15, py - CY);
        if (dCentro < 9200) {
            return dCentro - 9200;
        }

        // B. Asa Oeste
        if (px >= 101500 && px <= 135000 && py >= 3800 && py <= 24200) {
            const margemY = Math.min(py - 3800, 24200 - py);
            const margemX = px - 101500;
            const distBorda = Math.min(margemX, margemY);
            return -distBorda;
        }

        // C. Asa Leste
        if (px >= 153000 && px <= 186500 && py >= 2800 && py <= 24200) {
            const margemY = Math.min(py - 2800, 24200 - py);
            const margemX = 186500 - px;
            const distBorda = Math.min(margemX, margemY);
            return -distBorda;
        }

        // D. Cordilheira Norte (Taiga e Picos)
        if (px >= 113000 && px <= 167000 && py >= 1800 && py <= 7800) {
            const margemY = Math.min(py - 1800, 7800 - py);
            return -margemY;
        }

        // Fora de qualquer terra continental: Oceano aberto
        const distMinima = Math.min(
            Math.hypot(px - 144000, py - 14000) - 9200,
            Math.hypot(Math.max(0, 101500 - px, px - 186500), Math.max(0, 2800 - py, py - 24200))
        );
        return Math.max(20, distMinima);
    }

    function liquidoEm(wx, wy, bio) {
        const d = distanciaMassaContinental(wx, wy);

        // Oceano aberto exterior
        if (d > 0) {
            _prof = clamp(d / 450, 0, 1);
            return d > 90 ? 3 : 2;
        }

        // Faixa de praia litorânea
        if (d > -90) {
            _prof = 0;
            return 1;
        }

        // Lagos e riachos de interior
        _prof = 0;
        const nAgua = perlin(SEED + 5, wx / 850, wy / 850) + 0.35 * perlin(SEED + 6, wx / 260, wy / 260);
        let thr = 0.70;
        if (bio === B.PANTANO) thr = 0.60; // Mantém canais tóxicos mais raros e estreitos
        else if (bio === B.VULCAO || bio === B.OBSIDIANA) {
            const regiaoComFissuras = perlin(SEED + 18, wx / 2600, wy / 2600) > 0.12;
            if (!regiaoComFissuras) return 0;
            thr = 0.66;
        }
        else if (bio === B.RECIFE_CRISTAL) thr = 0.64; // Reduz a quantidade de lagoas cristalinas

        if (nAgua > thr) {
            _prof = clamp((nAgua - thr) / 0.22, 0, 1);
            return nAgua > thr + 0.08 ? 3 : 2;
        }

        return 0; // Terra firme
    }

    // ---- PALETAS DE CORES PARA OS 18 BIOMAS ----
    const SOLO = [
        // 0: B.PLANTAS (Santuário de Gaia)
        [[58, 100, 58], [80, 132, 66], [101, 154, 74], [132, 180, 90]],
        // 1: B.FLORESTA (Floresta Sombria)
        [[26, 52, 38], [36, 70, 46], [48, 92, 54], [66, 114, 62]],
        // 2: B.TEMPESTADE (Pico dos Relâmpagos) ⚡
        [[42, 50, 68], [58, 70, 96], [74, 90, 126], [110, 134, 180]],
        // 3: B.DESERTO (Deserto Escaldante) 🏜️
        [[190, 158, 98], [210, 180, 118], [226, 202, 146], [238, 220, 172]],
        // 4: B.CRISTAIS (Vale dos Cristais) 💎
        [[75, 42, 88], [98, 56, 116], [128, 75, 152], [168, 105, 198]],
        // 5: B.NEVE (Tundra Gélida) ❄️
        [[188, 204, 218], [212, 226, 238], [236, 244, 250], [166, 188, 208]],
        // 6: B.PANTANO (Pântano Nebuloso) 🐊
        [[40, 54, 34], [54, 70, 42], [68, 84, 48], [34, 50, 46]],
        // 7: B.PROFANADO (Terra Profanada) 💀
        [[38, 34, 42], [52, 46, 58], [68, 60, 76], [88, 78, 96]],
        // 8: B.VULCAO (Terras Vulcânicas) 🌋
        [[34, 28, 30], [54, 42, 40], [76, 56, 48], [100, 62, 40]],
        // 9: B.SELVA (Selva Proibida) 🌴
        [[20, 60, 32], [32, 85, 44], [46, 112, 56], [68, 140, 72]],

        // 10: B.OBSIDIANA (Pico de Vapor) — Rocha vulcânica preta vítrea e cinzas
        [[22, 18, 24], [34, 28, 36], [48, 40, 50], [68, 56, 68]],
        // 11: B.LAMENTOS (Floresta dos Lamentos) — Solo necrótico cinza-amarronzado e ossadas
        [[42, 36, 32], [58, 50, 44], [74, 64, 54], [92, 80, 68]],
        // 12: B.TAIGA (Taiga Boreal Gelada) — Coníferas com geada e solo ártico
        [[62, 84, 76], [88, 112, 102], [120, 146, 134], [175, 200, 190]],
        // 13: B.PICOS_GELO (Observatório Estelar) — Gelo maciço cristalino e neve eterna
        [[185, 204, 222], [210, 226, 240], [232, 242, 250], [246, 252, 255]],
        // 14: B.CANYON (Canyon do Abreu) — Arenito estratificado ocre, dourado e terracota
        [[175, 100, 48], [200, 126, 64], [224, 152, 82], [242, 180, 108]],
        // 15: B.RECIFE_CRISTAL (Costa da Rocha Cristalina) — Solo magenta/violeta e lagoas turquesa
        [[55, 42, 82], [82, 60, 114], [70, 125, 148], [125, 185, 205]],
        // 16: B.PLATAFORMA_GELO (Plataforma Ancestral) — Lajes de gelo polar com relíquias
        [[192, 214, 230], [218, 234, 246], [238, 248, 254], [172, 198, 220]],
        // 17: B.OCEANO_GELO (Porto Gelado) — Mar glacial profundo salpicado de icebergs
        [[16, 44, 78], [28, 65, 105], [68, 118, 160], [185, 220, 240]]
    ];

    const PRAIA = [
        [206, 184, 130], // 0 PLANTAS
        [150, 140, 100], // 1 FLORESTA
        [65, 80, 105],   // 2 TEMPESTADE
        [226, 208, 156], // 3 DESERTO
        [130, 95, 150],  // 4 CRISTAIS
        [220, 232, 240], // 5 NEVE
        [85, 95, 65],    // 6 PANTANO
        [75, 70, 80],    // 7 PROFANADO
        [70, 56, 52],    // 8 VULCAO
        [160, 175, 110], // 9 SELVA

        [45, 38, 46],    // 10 OBSIDIANA (areia de basalto negro)
        [65, 58, 52],    // 11 LAMENTOS (lama fúnebre cinza)
        [145, 170, 165], // 12 TAIGA (areia congelada)
        [210, 225, 238], // 13 PICOS_GELO (cascalho glacial)
        [215, 145, 85],  // 14 CANYON (areia de arenito dourado)
        [175, 110, 200], // 15 RECIFE_CRISTAL (areia de cristal rosa/violeta)
        [220, 235, 245], // 16 PLATAFORMA_GELO (gelo cristalizado)
        [150, 190, 220]  // 17 OCEANO_GELO (beira de calota polar)
    ];

    const AGUA_RASA = [
        [75, 151, 145],  // 0 PLANTAS
        [50, 110, 100],  // 1 FLORESTA
        [80, 140, 200],  // 2 TEMPESTADE
        [70, 170, 170],  // 3 DESERTO
        [150, 90, 220],  // 4 CRISTAIS
        [160, 205, 225], // 5 NEVE
        [80, 140, 50],   // 6 PANTANO (verde tóxico)
        [60, 55, 75],    // 7 PROFANADO
        [235, 110, 30],  // 8 VULCAO (lava líquida)
        [60, 165, 130],  // 9 SELVA

        [245, 85, 15],   // 10 OBSIDIANA (fissuras de magma incandescente)
        [48, 52, 60],    // 11 LAMENTOS (lodo fétido)
        [110, 185, 210], // 12 TAIGA (rio alpino cristalino)
        [150, 215, 240], // 13 PICOS_GELO (geleira azul pura)
        [110, 180, 175], // 14 CANYON (oásis / rio do cânion)
        [80, 220, 235],  // 15 RECIFE_CRISTAL (lagoa de mana bioluminescente)
        [170, 220, 240], // 16 PLATAFORMA_GELO (água subglacial)
        [120, 175, 215]  // 17 OCEANO_GELO (águas árticas límpidas)
    ];

    const AGUA_FUNDO = [
        [21, 61, 89],    // 0 PLANTAS
        [16, 44, 60],    // 1 FLORESTA
        [25, 55, 110],   // 2 TEMPESTADE
        [24, 90, 110],   // 3 DESERTO
        [70, 30, 130],   // 4 CRISTAIS
        [96, 140, 185],  // 5 NEVE
        [40, 75, 25],    // 6 PANTANO
        [30, 25, 42],    // 7 PROFANADO
        [160, 32, 10],   // 8 VULCAO
        [20, 75, 60],    // 9 SELVA

        [140, 24, 8],    // 10 OBSIDIANA (profundeza de magma)
        [24, 26, 32],    // 11 LAMENTOS (abismo de almas)
        [42, 90, 120],   // 12 TAIGA (lago boreal profundo)
        [60, 120, 160],  // 13 PICOS_GELO (crevasse de gelo)
        [40, 95, 110],   // 14 CANYON (leito profundo do rio)
        [45, 50, 120],   // 15 RECIFE_CRISTAL (abismo místico)
        [70, 125, 165],  // 16 PLATAFORMA_GELO
        [20, 50, 90]     // 17 OCEANO_GELO (abismo polar oceânico)
    ];

    const OCEANO_RASO = [40, 120, 140], OCEANO_FUNDO = [14, 50, 84];

    function corTerra(wx, wy, bio, n) {
        const p = SOLO[bio];
        const m = perlin(SEED + 9, wx / 160, wy / 110);
        const lo = 0.36 + (m < -0.3 ? 0.15 : 0), hi = 0.62 - (m > 0.2 ? 0.1 : 0);
        let c = n < lo ? p[0] : (n > hi ? (n > hi + 0.2 ? p[3] : p[2]) : p[1]);

        if (bio === B.VULCAO || bio === B.OBSIDIANA) {
            if (Math.abs(perlin(SEED + 11, wx / 140, wy / 140)) < 0.012) c = [245, 90, 20];
        } else if (bio === B.DESERTO || bio === B.CANYON) {
            if (Math.sin(wx * 0.012 + perlin(SEED + 12, wx / 300, wy / 300) * 6) > 0.97) c = p[0];
        } else if (bio === B.LAMENTOS) {
            if (Math.abs(perlin(SEED + 16, wx / 130, wy / 130)) < 0.012) c = [120, 110, 90];
        } else if (bio === B.TAIGA) {
            if (Math.abs(perlin(SEED + 17, wx / 110, wy / 110)) < 0.012) c = [225, 240, 245];
        }
        return c;
    }

    // ---- PROPS E VEGETAÇÃO PROCEDURAL PARA OS 18 BIOMAS ----
    const SOLIDOS = {
        arvore: 15, pinheiro: 13, pinheiro_neve: 13, pinheiro_taiga: 14,
        arvore_lamentos: 15, cacto: 11, cacto_dourado: 12, morta: 12,
        salgueiro: 16, pedra: 16, rocha_lava: 18, mesa_rocha: 22,
        obsidiana_espinho: 16, vapor_geiser: 12, cristal_arcano: 16,
        cristal_celeste: 16, pilar_ancestral: 16, pilar_tempestade: 14,
        lapide: 12, palmeira_selva: 16, iceberg_prop: 20
    };

    const TABELA = [
        // 0 PLANTAS
        [['arvore', 0.34], ['arbusto', 0.52], ['pedra', 0.14]],
        // 1 FLORESTA
        [['pinheiro', 0.50], ['arbusto', 0.20], ['pedra', 0.10], ['cogumelo', 0.20]],
        // 2 TEMPESTADE
        [['pilar_tempestade', 0.35], ['pedra', 0.30], ['arbusto', 0.15], ['cristal_arcano', 0.20]],
        // 3 DESERTO
        [['cacto', 0.30], ['pedra', 0.20], ['seco', 0.30], ['osso', 0.20]],
        // 4 CRISTAIS
        [['cristal_arcano', 0.50], ['pedra', 0.40], ['arbusto', 0.10]],
        // 5 NEVE
        [['pinheiro_neve', 0.50], ['pedra', 0.20], ['cristal_arcano', 0.15], ['seco', 0.15]],
        // 6 PANTANO
        [['salgueiro', 0.32], ['juncos', 0.38], ['cogumelo', 0.15], ['pedra', 0.15]],
        // 7 PROFANADO
        [['lapide', 0.35], ['morta', 0.30], ['osso', 0.20], ['pedra', 0.15]],
        // 8 VULCAO
        [['morta', 0.32], ['rocha_lava', 0.35], ['brasa', 0.18], ['pedra', 0.15]],
        // 9 SELVA
        [['palmeira_selva', 0.45], ['arbusto', 0.43], ['pedra', 0.12]],

        // 10 OBSIDIANA (Pico de Vapor)
        [['obsidiana_espinho', 0.45], ['vapor_geiser', 0.25], ['rocha_lava', 0.20], ['brasa', 0.10]],
        // 11 LAMENTOS (Floresta dos Lamentos)
        [['arvore_lamentos', 0.50], ['morta', 0.25], ['osso', 0.15], ['pedra', 0.10]],
        // 12 TAIGA (Taiga Boreal Gelada)
        [['pinheiro_taiga', 0.55], ['arbusto', 0.20], ['pedra', 0.15], ['cristal_arcano', 0.10]],
        // 13 PICOS_GELO (Observatório Estelar)
        [['pedra', 0.40], ['cristal_arcano', 0.35], ['pinheiro_neve', 0.25]],
        // 14 CANYON (Canyon do Abreu)
        [['mesa_rocha', 0.40], ['cacto_dourado', 0.30], ['pedra', 0.20], ['osso', 0.10]],
        // 15 RECIFE_CRISTAL (Costa da Rocha Cristalina)
        [['cristal_celeste', 0.50], ['arbusto', 0.35], ['pedra', 0.15]],
        // 16 PLATAFORMA_GELO (Plataforma Ancestral)
        [['pilar_ancestral', 0.45], ['pedra', 0.35], ['cristal_arcano', 0.20]],
        // 17 OCEANO_GELO (Porto Gelado / Icebergs)
        [['iceberg_prop', 0.50], ['pedra', 0.50]]
    ];

    const DENS = [
        0.55, 0.75, 0.48, 0.38, 0.52, 0.45, 0.65, 0.50, 0.42, 0.72,
        0.48, 0.68, 0.74, 0.40, 0.42, 0.55, 0.45, 0.30
    ];

    const _cp = new Map();

    function propEm(i, j) {
        const key = i * 100003 + j;
        if (_cp.has(key)) return _cp.get(key);
        let res = null;
        const x = i * CELL + 25 + hash01(SEED + 20, i, j) * (CELL - 50);
        const y = j * CELL + 25 + hash01(SEED + 21, i, j) * (CELL - 50);

        if (x >= X0 + 60 && x < X0 + W - 60 && y >= 60 && y < H - 60) {
            const bio = biomaEm(x, y, 0);
            const liq = liquidoEm(x, y, bio);

            // Props aparecem em terra firme (liq === 0)
            if (liq === 0 && hash01(SEED + 22, i, j) < DENS[bio]) {
                let r = hash01(SEED + 23, i, j), tipo = TABELA[bio][0][0];
                for (let k = 0; k < TABELA[bio].length; k++) {
                    r -= TABELA[bio][k][1];
                    if (r <= 0) { tipo = TABELA[bio][k][0]; break; }
                }
                const esc = 0.85 + hash01(SEED + 24, i, j) * 0.5;
                res = {
                    x: x, y: y, tipo: tipo, bio: bio, esc: esc,
                    v: hash3(SEED + 25, i, j, 0),
                    r: (SOLIDOS[tipo] || 0) * esc
                };
            }
        }
        if (_cp.size > 80000) _cp.clear();
        _cp.set(key, res);
        return res;
    }

    // ---- COLISÃO & LIMITES ----
    function dentro(x, y) { return x >= X0 && x < X0 + W && y >= 0 && y < H; }

    function colideMundo(x, y, raio) {
        raio = raio || 10;
        if (!dentro(x, y)) return true;

        const bio = biomaEm(x, y, 0);
        const l = liquidoEm(x, y, bio);

        // Lava e água tóxica não bloqueiam o jogador (causam dano de ambiente)
        if ((bio === B.VULCAO || bio === B.OBSIDIANA) && l >= 2) {
            // Permite passagem com perigo de lava
        } else if (bio === B.PANTANO && l >= 2) {
            // Permite passagem com perigo de veneno
        } else if (l === 3) {
            return true; // Oceano profundo bloqueia
        }

        return false;
    }

    function colideProjetilMundo(x, y) { return !dentro(x, y); }
    function biomaNome(x, y) { return NOMES[biomaEm(x, y, 0)]; }

    // Helpers de mecânicas de ambiente
    function ehBiomaGelo(wx, wy) {
        if (!dentro(wx, wy)) return false;
        const b = biomaEm(wx, wy, 0);
        return b === B.NEVE || b === B.TAIGA || b === B.PICOS_GELO || b === B.PLATAFORMA_GELO || b === B.OCEANO_GELO;
    }

    function ehLava(wx, wy) {
        if (!dentro(wx, wy)) return false;
        const bio = biomaEm(wx, wy, 0);
        if (bio !== B.VULCAO && bio !== B.OBSIDIANA) return false;
        return liquidoEm(wx, wy, bio) >= 2 || Math.abs(perlin(SEED + 11, wx / 140, wy / 140)) < 0.012;
    }

    function ehVeneno(wx, wy) {
        if (!dentro(wx, wy)) return false;
        const bio = biomaEm(wx, wy, 0);
        if (bio !== B.PANTANO && bio !== B.LAMENTOS) return false;
        return liquidoEm(wx, wy, bio) >= 2 || perlin(SEED + 16, wx / 120, wy / 120) > 0.40;
    }

    function ehDeserto(wx, wy) {
        if (!dentro(wx, wy)) return false;
        const b = biomaEm(wx, wy, 0);
        return b === B.DESERTO || b === B.CANYON;
    }

    function ehCristal(wx, wy) {
        if (!dentro(wx, wy)) return false;
        const b = biomaEm(wx, wy, 0);
        return b === B.CRISTAIS || b === B.RECIFE_CRISTAL;
    }

    function ehTempestade(wx, wy) {
        if (!dentro(wx, wy)) return false;
        return biomaEm(wx, wy, 0) === B.TEMPESTADE;
    }

    function ehProfanado(wx, wy) {
        if (!dentro(wx, wy)) return false;
        const b = biomaEm(wx, wy, 0);
        return b === B.PROFANADO || b === B.LAMENTOS;
    }

    function ehSelva(wx, wy) {
        if (!dentro(wx, wy)) return false;
        return biomaEm(wx, wy, 0) === B.SELVA;
    }

    function corPixelRgb(wx, wy) {
        if (!dentro(wx, wy)) return OCEANO_FUNDO;
        const bio = biomaEm(wx, wy, 0);
        const l = liquidoEm(wx, wy, bio);
        if (l === 0) {
            const n = perlin(SEED + 8, wx / 48, wy / 36) * 0.5 + 0.5;
            return corTerra(wx, wy, bio, n);
        }
        if (l === 1) return PRAIA[bio];
        return l === 2 ? AGUA_RASA[bio] : AGUA_FUNDO[bio];
    }

    function obterCorMinimapa(wx, wy) {
        const c = corPixelRgb(wx, wy);
        return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
    }

    // ========================================================================
    // BIG MAP CANVAS (PREVIEW GIGANTE PANORÂMICO COM ALTA DEFINIÇÃO)
    // Reproduz fielmente o mapa panorâmico com o anel de Gaia e as novas asas
    // ========================================================================
    let _bigMapPreviewCanvas = null;

    function obterBigMapCanvas() {
        if (typeof document === 'undefined') return null;
        if (_bigMapPreviewCanvas) return _bigMapPreviewCanvas;

        try {
            const wCanvas = 1920, hCanvas = 610; // Aspect ratio proporcional ao mundo 88000x28000
            const c = document.createElement('canvas');
            c.width = wCanvas;
            c.height = hCanvas;
            const ctx = c.getContext('2d');
            if (!ctx) return null;

            const imgData = ctx.createImageData(wCanvas, hCanvas);
            const data = imgData.data;

            // Renderiza pixels do terreno com amostragem rápida
            for (let py = 0; py < hCanvas; py++) {
                const wy = (py / hCanvas) * H;
                for (let px = 0; px < wCanvas; px++) {
                    const wx = X0 + (px / wCanvas) * W;
                    const rgb = corPixelRgb(wx, wy);
                    const idx = (py * wCanvas + px) * 4;
                    data[idx] = rgb[0];
                    data[idx + 1] = rgb[1];
                    data[idx + 2] = rgb[2];
                    data[idx + 3] = 255;
                }
            }
            ctx.putImageData(imgData, 0, 0);

            ctx.save();

            // 1. Círculo Dourado Pontilhado de Gaia Central (conforme imagem oficial de referência)
            const cxG = ((CX - X0) / W) * wCanvas;
            const cyG = (CY / H) * hCanvas;
            const rG_X = (R_GAIA / W) * wCanvas;
            const rG_Y = (R_GAIA / H) * hCanvas;

            ctx.beginPath();
            ctx.ellipse(cxG, cyG, rG_X, rG_Y, 0, 0, Math.PI * 2);
            ctx.setLineDash([8, 6]);
            ctx.strokeStyle = 'rgba(255, 230, 80, 0.85)';
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.setLineDash([]);

            // 2. Marcador do Santuário / Ponto de Nascimento (Centro Exato)
            const ppx = ((SPAWN.x - X0) / W) * wCanvas;
            const ppy = (SPAWN.y / H) * hCanvas;
            const pg = ctx.createRadialGradient(ppx, ppy, 0, ppx, ppy, 20);
            pg.addColorStop(0, 'rgba(0, 255, 255, 0.95)');
            pg.addColorStop(0.5, 'rgba(0, 150, 255, 0.5)');
            pg.addColorStop(1, 'rgba(0, 50, 150, 0)');
            ctx.fillStyle = pg;
            ctx.beginPath(); ctx.arc(ppx, ppy, 20, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#00ffff';
            ctx.beginPath(); ctx.arc(ppx, ppy, 5.5, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Rótulo do Centro (Santuário de Gaia)
            ctx.font = 'bold 22px "Cinzel", Georgia, serif';
            ctx.strokeStyle = '#000000'; ctx.lineWidth = 5;
            ctx.strokeText('🌿 Planície das Plantas', cxG, cyG + 24);
            ctx.fillStyle = '#a6ff8a';
            ctx.fillText('🌿 Planície das Plantas', cxG, cyG + 24);

            ctx.font = 'bold 15px "Rajdhani", Arial, sans-serif';
            ctx.strokeText('🏛️ Santuário de Gaia (Centro)', cxG, cyG + 44);
            ctx.fillStyle = '#ffffff';
            ctx.fillText('🏛️ Santuário de Gaia (Centro)', cxG, cyG + 44);

            // 3. Rótulos Oficiais de TODOS os Biomas e POIs (Sem molduras, com contorno nítido)
            const rotulos = [
                // Asa Oeste
                { nome: '🌋 Terras de Obsidiana', poi: '♨️ Pico de Vapor', cor: '#ff8a80', corPoi: '#ffffff', x: 114000, y: 8500 },
                { nome: '🍂 Floresta dos Lamentos', poi: '💀 Altar da Necromancia', cor: '#d7ccc8', corPoi: '#ffffff', x: 116000, y: 19500 },
                { nome: '🔥 Terras Vulcânicas', poi: '🌋 Poço de Lava', cor: '#ff7043', corPoi: '#ffffff', x: 133500, y: 14000 },
                { nome: '🐊 Pântano Nebuloso', poi: '🏛️ Templo Santuário', cor: '#c5e1a5', corPoi: '#ffffff', x: 138500, y: 17500 },
                { nome: '💀 Terra Profanada', poi: '⚰️ Cripta Ancestral', cor: '#e0e0e0', corPoi: '#ffffff', x: 135000, y: 20500 },

                // Borda Norte
                { nome: '🌲 Taiga Boreal Gelada', poi: '❄️ Templo da Geada', cor: '#b2dfdb', corPoi: '#ffffff', x: 127000, y: 3500 },
                { nome: '🏔️ Picos de Gelo', poi: '🔭 Observatório Estelar', cor: '#e1f5fe', corPoi: '#ffffff', x: 154000, y: 3500 },

                // Centro / Cardeais Internos
                { nome: '🌲 Floresta Sombria', poi: '🐺 Covil do Lobo', cor: '#a8ffb5', corPoi: '#ffffff', x: 144000, y: 8800 },
                { nome: '⚡ Pico dos Relâmpagos', poi: '⚡ Obelisco do Trovão', cor: '#80d8ff', corPoi: '#ffffff', x: 149500, y: 9200 },
                { nome: '🏜️ Deserto Escaldante', poi: '🏺 Povoado no Deserto', cor: '#ffe082', corPoi: '#ffffff', x: 153000, y: 14000 },
                { nome: '💎 Vale dos Cristais', poi: '💎 Montanha de Mercúrio', cor: '#ea80fc', corPoi: '#ffffff', x: 151500, y: 19500 },
                { nome: '❄️ Tundra Gélida', poi: '👑 Trono Subterrâneo', cor: '#00e5ff', corPoi: '#ffffff', x: 144000, y: 20500 },

                // Asa Leste
                { nome: '🏜️ Canyon do Abreu', poi: '🏜️ Garganta Dourada', cor: '#ffcc80', corPoi: '#ffffff', x: 174000, y: 8500 },
                { nome: '✨ Costa da Rocha Cristalina', poi: '💎 Recife de Mana', cor: '#80deea', corPoi: '#ffffff', x: 174000, y: 20000 },

                // Sul / Ilhas
                { nome: '🏛️ Plataforma Ancestral', poi: '🌊 Ruínas Submersas', cor: '#b3e5fc', corPoi: '#ffffff', x: 163000, y: 25000 },
                { nome: '🧊 Oceano de Gelo', poi: '⚓ Porto Gelado', cor: '#81d4fa', corPoi: '#ffffff', x: 139000, y: 26000 }
            ];

            for (let i = 0; i < rotulos.length; i++) {
                const r = rotulos[i];
                const rx = ((r.x - X0) / W) * wCanvas;
                const ry = (r.y / H) * hCanvas;

                // Ponto luminoso no mapa
                const poiG = ctx.createRadialGradient(rx, ry, 0, rx, ry, 15);
                poiG.addColorStop(0, r.cor);
                poiG.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = poiG;
                ctx.beginPath(); ctx.arc(rx, ry, 15, 0, Math.PI * 2); ctx.fill();

                ctx.fillStyle = '#ffffff';
                ctx.beginPath(); ctx.arc(rx, ry, 4.5, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = '#000000'; ctx.lineWidth = 1.5; ctx.stroke();

                // Nome do Bioma com contorno nítido
                ctx.font = 'bold 20px "Cinzel", "Rajdhani", serif';
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 5;
                ctx.strokeText(r.nome, rx, ry - 16);
                ctx.fillStyle = r.cor;
                ctx.fillText(r.nome, rx, ry - 16);

                // Subtítulo do Ponto de Interesse
                ctx.font = 'bold 14px "Rajdhani", Arial, sans-serif';
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 3.5;
                ctx.strokeText(r.poi, rx, ry + 8);
                ctx.fillStyle = r.corPoi;
                ctx.fillText(r.poi, rx, ry + 8);
            }

            // Rosa dos ventos náutica estilizada no canto inferior esquerdo
            const cxB = 64, cyB = hCanvas - 64;
            ctx.strokeStyle = 'rgba(212, 175, 55, 0.8)';
            ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.arc(cxB, cyB, 32, 0, Math.PI * 2); ctx.stroke();
            ctx.fillStyle = 'rgba(212, 175, 55, 0.95)';
            ctx.font = 'bold 16px "Cinzel", Arial';
            ctx.fillText('N', cxB, cyB - 38);
            ctx.fillText('S', cxB, cyB + 40);
            ctx.fillText('L', cxB + 40, cyB);
            ctx.fillText('O', cxB - 40, cyB);

            ctx.restore();
            _bigMapPreviewCanvas = c;
            return _bigMapPreviewCanvas;
        } catch (e) {
            console.error('Erro ao gerar BigMap panorâmico:', e);
            return null;
        }
    }

    // ========================================================================
    // MINIMAPA DINÂMICO DE ALTA VELOCIDADE (60 FPS)
    // ========================================================================
    let _mmBufferCanvas = null, _mmBufferCtx = null, _mmBufferImg = null, _mmBufferData = null;
    let _lastMmX = -999999, _lastMmY = -999999, _lastMmEscala = -1, _lastMmTime = 0;

    function desenharMinimapaMundo(mmCtx, mw, mh, meuX, meuY, escala, cx0, cy0) {
        if (typeof document === 'undefined') return;
        const bw = 96, bh = 54;
        if (!_mmBufferCanvas) {
            _mmBufferCanvas = document.createElement('canvas');
            _mmBufferCanvas.width = bw;
            _mmBufferCanvas.height = bh;
            _mmBufferCtx = _mmBufferCanvas.getContext('2d');
            _mmBufferImg = _mmBufferCtx.createImageData(bw, bh);
            _mmBufferData = new Uint32Array(_mmBufferImg.data.buffer);
        }

        const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
        const distMoved = Math.hypot(meuX - _lastMmX, meuY - _lastMmY);
        const escalaDiff = Math.abs(escala - _lastMmEscala);
        const precisaAtualizar = distMoved > 4 || escalaDiff > 0.0001 || (now - _lastMmTime > 90);

        const invEscala = 1 / escala;
        if (precisaAtualizar) {
            _lastMmX = meuX;
            _lastMmY = meuY;
            _lastMmEscala = escala;
            _lastMmTime = now;

            const factorX = (mw / bw) * invEscala;
            const factorY = (mh / bh) * invEscala;
            const startWX = meuX - (cx0 * invEscala);
            const startWY = meuY - (cy0 * invEscala);

            let idx = 0;
            for (let py = 0; py < bh; py++) {
                const wy = startWY + (py + 0.5) * factorY;
                for (let px = 0; px < bw; px++) {
                    const wx = startWX + (px + 0.5) * factorX;
                    const rgb = corPixelRgb(wx, wy);
                    _mmBufferData[idx++] = (255 << 24) | (((rgb[2] | 0) & 0xff) << 16) | (((rgb[1] | 0) & 0xff) << 8) | ((rgb[0] | 0) & 0xff);
                }
            }
            _mmBufferCtx.putImageData(_mmBufferImg, 0, 0);
        }

        mmCtx.save();
        mmCtx.imageSmoothingEnabled = false;
        mmCtx.drawImage(_mmBufferCanvas, 0, 0, mw, mh);

        // Pontos de props próximos no minimapa
        const raioProps = (mw * 0.6) * invEscala;
        const i0 = Math.floor((meuX - raioProps) / CELL);
        const i1 = Math.floor((meuX + raioProps) / CELL);
        const j0 = Math.floor((meuY - raioProps) / CELL);
        const j1 = Math.floor((meuY + raioProps) / CELL);

        for (let j = j0; j <= j1; j++) {
            for (let i = i0; i <= i1; i++) {
                const p = propEm(i, j);
                if (!p) continue;
                const psx = cx0 + (p.x - meuX) * escala;
                const psy = cy0 + (p.y - meuY) * escala;
                if (psx >= 0 && psx <= mw && psy >= 0 && psy <= mh) {
                    if (p.tipo.indexOf('pinheiro') !== -1 || p.tipo.indexOf('arvore') !== -1) {
                        mmCtx.fillStyle = 'rgba(24, 72, 32, 0.85)';
                        mmCtx.fillRect(psx - 1.5, psy - 1.5, 3, 3);
                    } else if (p.tipo.indexOf('cristal') !== -1) {
                        mmCtx.fillStyle = 'rgba(120, 220, 255, 0.95)';
                        mmCtx.fillRect(psx - 1.5, psy - 1.5, 3, 3);
                    } else if (p.tipo === 'obsidiana_espinho' || p.tipo === 'rocha_lava') {
                        mmCtx.fillStyle = 'rgba(200, 60, 20, 0.9)';
                        mmCtx.fillRect(psx - 1.5, psy - 1.5, 3, 3);
                    }
                }
            }
        }
        mmCtx.restore();
    }

    const api = {
        X0: X0, W: W, H: H, CX: CX, CY: CY, R: R_GAIA, R_GAIA: R_GAIA,
        SPAWN: SPAWN, PORTAL_RETORNO: PORTAL_RETORNO,
        CENTROS_BIOMAS: CENTROS_BIOMAS,
        colideMundo: colideMundo, colideProjetilMundo: colideProjetilMundo,
        biomaNome: biomaNome, isMundo: dentro,
        ehBiomaGelo: ehBiomaGelo, ehLava: ehLava, ehVeneno: ehVeneno, ehDeserto: ehDeserto,
        ehCristal: ehCristal, ehTempestade: ehTempestade, ehProfanado: ehProfanado, ehSelva: ehSelva,
        corPixelRgb: corPixelRgb, obterCorMinimapa: obterCorMinimapa,
        obterBigMapCanvas: obterBigMapCanvas, desenharMinimapaMundo: desenharMinimapaMundo
    };

    // ========================================================================
    // CLIENTE: RENDERIZAÇÃO POR CHUNKS & PROPS PROCEDURAIS LOW-POLY 2.5D
    // ========================================================================
    if (typeof window !== 'undefined') {
        const chunks = new Map();
        const fila = [];
        let filaPrecisaOrdenar = false;
        let direcaoPreCarregamento = { x: 0, y: 0 };
        let ultimaPosicaoJogador = null;
        let ultimoMovimentoJogador = 0;

        function vistaNoCentro(x, y) {
            const cz = global.cameraZoomAtual || global.ZOOM_CAMERA || 1;
            const tilt = global.CAMERA_25D ? (global.CAMERA_TILT_Y || 0.88) : 1;
            const w = ((global.canvas && global.canvas.width) || 1280) / cz;
            const h = ((global.canvas && global.canvas.height) || 720) / (cz * tilt);
            const maxX = Math.max(0, (global.WORLD_WIDTH || 190000) - w);
            const maxY = Math.max(0, (global.WORLD_HEIGHT || 28500) - h);
            return {
                x: Math.max(0, Math.min(x - w / 2, maxX)),
                y: Math.max(0, Math.min(y - h / 2, maxY)),
                w: w,
                h: h
            };
        }

        function garantirChunksRetangulo(v, prioridade) {
            const a0 = Math.floor(v.x / CHUNK), a1 = Math.floor((v.x + v.w) / CHUNK);
            const r0 = Math.floor(v.y / CHUNK), r1 = Math.floor((v.y + v.h) / CHUNK);
            const lista = [];
            for (let cj = r0; cj <= r1; cj++) {
                for (let ci = a0; ci <= a1; ci++) {
                    const ch = chunkVisivel(ci, cj);
                    if (!ch.pronto && prioridade < ch.prioridade) {
                        ch.prioridade = prioridade;
                        filaPrecisaOrdenar = true;
                    }
                    lista.push(ch);
                }
            }
            return lista;
        }

        api.progressoAreaTeleporte = function (x, y) {
            if (!dentro(x, y)) return null;
            const area = garantirChunksRetangulo(vistaNoCentro(x, y), 0);
            let prontos = 0;
            for (let i = 0; i < area.length; i++) if (area[i].pronto) prontos++;
            return { prontos: prontos, total: area.length };
        };

        function iniciarChunk(ch) {
            const cv = document.createElement('canvas');
            cv.width = CT; cv.height = CT;
            const c2 = cv.getContext('2d');
            const rgb = ch.cor;
            c2.fillStyle = 'rgb(' + (rgb[0] | 0) + ',' + (rgb[1] | 0) + ',' + (rgb[2] | 0) + ')';
            c2.fillRect(0, 0, CT, CT);
            ch.canvas = cv;
            ch.ctx = c2;
            ch.img = c2.createImageData(CT, CT);
            ch.data = ch.img.data;
            ch.linha = 0;
        }

        function criarPreviaChunk(ch) {
            const lado = 16;
            const cv = document.createElement('canvas');
            cv.width = lado;
            cv.height = lado;
            const ctxPrevia = cv.getContext('2d');
            const img = ctxPrevia.createImageData(lado, lado);
            for (let y = 0; y < lado; y++) {
                for (let x = 0; x < lado; x++) {
                    const wx = ch.ci * CHUNK + (x + 0.5) * CHUNK / lado;
                    const wy = ch.cj * CHUNK + (y + 0.5) * CHUNK / lado;
                    const cor = corPixelRgb(wx, wy);
                    const i = (y * lado + x) * 4;
                    img.data[i] = cor[0];
                    img.data[i + 1] = cor[1];
                    img.data[i + 2] = cor[2];
                    img.data[i + 3] = 255;
                }
            }
            ctxPrevia.putImageData(img, 0, 0);
            ch.previa = cv;
        }

        function gerarChunk(ch, maxLinhas) {
            if (!ch.img) iniciarChunk(ch);
            const linhaFinal = Math.min(CT, ch.linha + maxLinhas);
            const d = ch.data;

            for (let ty = ch.linha; ty < linhaFinal; ty++) {
                for (let tx = 0; tx < CT; tx++) {
                    const wx = ch.ci * CHUNK + tx * TEXEL, wy = ch.cj * CHUNK + ty * TEXEL;
                    const dith = hash01(SEED + 30, tx + ch.ci * CT, ty + ch.cj * CT) - 0.5;
                    let col;
                    if (wx < X0 || wx >= X0 + W || wy < 0 || wy >= H) {
                        col = OCEANO_FUNDO;
                    } else {
                        const bio = biomaEm(wx, wy, dith);
                        const l = liquidoEm(wx, wy, bio);
                        const prof = _prof;
                        if (l === 0) {
                            const n = perlin(SEED + 8, wx / 32, wy / 24) * 0.5 + 0.5;
                            const trans = biomaTransicaoInfo(wx, wy);
                            col = corTerra(wx, wy, trans.b1, n);
                            if (trans.blend > 0.001 && trans.b1 !== trans.b2) {
                                const c2 = corTerra(wx, wy, trans.b2, n);
                                col = [
                                    lerp(col[0], c2[0], trans.blend) | 0,
                                    lerp(col[1], c2[1], trans.blend) | 0,
                                    lerp(col[2], c2[2], trans.blend) | 0
                                ];
                            }
                            const h = hash01(SEED + 31, wx >> 2, wy >> 2);
                            if (h < 0.04) col = SOLO[bio][0];
                            else if (h > 0.96) col = SOLO[bio][3];
                        } else if (l === 1) {
                            const pc = PRAIA[bio], f = 0.92 + hash01(SEED + 32, tx + ch.ci * CT, ty + ch.cj * CT) * 0.14;
                            col = [pc[0] * f, pc[1] * f, pc[2] * f];
                        } else {
                            const A = AGUA_RASA[bio] || OCEANO_RASO, Bc = AGUA_FUNDO[bio] || OCEANO_FUNDO;
                            const p = l === 2 ? prof * 0.5 : 0.5 + prof * 0.5;
                            const g = 1 + hash01(SEED + 33, tx + ch.ci * CT, ty + ch.cj * CT) * 0.05;
                            col = [lerp(A[0], Bc[0], p) * g, lerp(A[1], Bc[1], p) * g, lerp(A[2], Bc[2], p) * g];
                            const cau = Math.sin(wx * 0.05 + Math.sin(wy * 0.04) * 2.4) + Math.cos(wy * 0.08 + wx * 0.015);
                            if (cau > 1.82) col = [col[0] * 1.15, col[1] * 1.15, col[2] * 1.15];
                        }
                    }
                    const i4 = (ty * CT + tx) * 4;
                    d[i4] = col[0]; d[i4 + 1] = col[1]; d[i4 + 2] = col[2]; d[i4 + 3] = 255;
                }
            }
            ch.linha = linhaFinal;
            if (ch.linha < CT) return false;
            ch.ctx.putImageData(ch.img, 0, 0);
            ch.ctx = null;
            ch.img = null;
            ch.data = null;
            ch.pronto = true;
            return true;
        }

        function chunkVisivel(ci, cj) {
            const k = ci * 100000 + cj;
            let ch = chunks.get(k);
            if (!ch) {
                const cor = corPixelRgb(ci * CHUNK + CHUNK / 2, cj * CHUNK + CHUNK / 2);
                ch = { pronto: false, ci: ci, cj: cj, cor: cor, prioridade: 2 };
                chunks.set(k, ch);
                criarPreviaChunk(ch);
                fila.push(ch);
                filaPrecisaOrdenar = true;
            }
            return ch;
        }

        function processarFila(orcamentoMs) {
            if (!fila.length) return;
            if (filaPrecisaOrdenar) {
                const v = vista();
                const cx = v.x + v.w * 0.5, cy = v.y + v.h * 0.5;
                fila.sort(function (a, b) {
                    const ax = a.ci * CHUNK + CHUNK * 0.5 - cx, ay = a.cj * CHUNK + CHUNK * 0.5 - cy;
                    const bx = b.ci * CHUNK + CHUNK * 0.5 - cx, by = b.cj * CHUNK + CHUNK * 0.5 - cy;
                    if (a.prioridade !== b.prioridade) return a.prioridade - b.prioridade;
                    const distanciaA = Math.hypot(ax, ay) - Math.max(0, ax * direcaoPreCarregamento.x + ay * direcaoPreCarregamento.y) * 0.65;
                    const distanciaB = Math.hypot(bx, by) - Math.max(0, bx * direcaoPreCarregamento.x + by * direcaoPreCarregamento.y) * 0.65;
                    return distanciaA - distanciaB;
                });
                filaPrecisaOrdenar = false;
            }
            const inicio = (global.performance && global.performance.now) ? global.performance.now() : Date.now();
            while (fila.length) {
                const agora = (global.performance && global.performance.now) ? global.performance.now() : Date.now();
                if (agora - inicio >= orcamentoMs) break;
                const ch = fila[0];
                if (!chunks.has(ch.ci * 100000 + ch.cj)) {
                    fila.shift();
                    continue;
                }
                if (gerarChunk(ch, 1)) fila.shift();
            }
            if (chunks.size > 220) {
                const cx = (global.camX || 0), cy = (global.camY || 0);
                const arr = Array.from(chunks.entries());
                arr.sort(function (a, b) {
                    return Math.hypot(a[1].ci * CHUNK - cx, a[1].cj * CHUNK - cy) - Math.hypot(b[1].ci * CHUNK - cx, b[1].cj * CHUNK - cy);
                });
                for (let i = 180; i < arr.length; i++) chunks.delete(arr[i][0]);
                fila.splice(0, fila.length, ...fila.filter(function (ch) { return chunks.has(ch.ci * 100000 + ch.cj); }));
            }
        }

        function vista() {
            const cz = global.cameraZoomAtual || global.ZOOM_CAMERA || 1;
            return {
                x: global.camX || 0,
                y: global.camY || 0,
                w: ((global.canvas && global.canvas.width) || 1280) / cz,
                h: ((global.canvas && global.canvas.height) || 720) / cz
            };
        }

        function noite() {
            const f = (typeof global.obterFatorLuzDiaNoite === 'function') ? global.obterFatorLuzDiaNoite() : 1;
            return clamp(1 - f, 0, 1);
        }

        function desenharCenarioMundo(t, ctxIn) {
            const ctx = ctxIn || global.ctx || (global.canvas && global.canvas.getContext('2d'));
            if (!ctx) return;
            const v = vista();
            const agora = Date.now();
            const posicao = { x: Number(global.meuX), y: Number(global.meuY) };
            if (Number.isFinite(posicao.x) && Number.isFinite(posicao.y)) {
                if (ultimaPosicaoJogador) {
                    const dx = posicao.x - ultimaPosicaoJogador.x, dy = posicao.y - ultimaPosicaoJogador.y;
                    const distancia = Math.hypot(dx, dy);
                    if (distancia >= 0.15 && distancia < CHUNK * 3) {
                        direcaoPreCarregamento = { x: dx / distancia, y: dy / distancia };
                        ultimoMovimentoJogador = agora;
                    } else if (distancia >= CHUNK * 3) {
                        direcaoPreCarregamento = { x: 0, y: 0 };
                    }
                }
                ultimaPosicaoJogador = posicao;
            }
            const visibles = garantirChunksRetangulo(v, 0);
            if (agora - ultimoMovimentoJogador < 900 &&
                (direcaoPreCarregamento.x !== 0 || direcaoPreCarregamento.y !== 0)) {
                const distanciaAntecipacao = CHUNK * 7;
                const deslocamentoX = direcaoPreCarregamento.x * distanciaAntecipacao;
                const deslocamentoY = direcaoPreCarregamento.y * distanciaAntecipacao;
                garantirChunksRetangulo({
                    x: v.x + Math.min(0, deslocamentoX),
                    y: v.y + Math.min(0, deslocamentoY),
                    w: v.w + Math.abs(deslocamentoX),
                    h: v.h + Math.abs(deslocamentoY)
                }, 1);
            }
            processarFila(global.carregandoMapaMundo ? 6 : (agora - ultimoMovimentoJogador < 900 ? 5 : 2.5));
            ctx.save();
            for (let i = 0; i < visibles.length; i++) {
                const ch = visibles[i];
                const imagemChunk = ch.pronto ? ch.canvas : ch.previa;
                ctx.imageSmoothingEnabled = !ch.pronto;
                if (imagemChunk) {
                    const margem = TEXEL;
                    ctx.drawImage(imagemChunk, ch.ci * CHUNK - margem, ch.cj * CHUNK - margem, CHUNK + margem * 2, CHUNK + margem * 2);
                }
            }
            ctx.restore();
        }

        function elip(ctx, x, y, rx, ry, cor) {
            ctx.fillStyle = cor; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
        }
        function copa(ctx, x, y, r, c0, c1, c2) {
            elip(ctx, x, y, r, r * 0.9, c0);
            elip(ctx, x - r * 0.12, y - r * 0.14, r * 0.78, r * 0.7, c1);
            elip(ctx, x - r * 0.28, y - r * 0.32, r * 0.42, r * 0.36, c2);
        }
        function rr(ctx, x, y, w, h, r) {
            ctx.beginPath(); ctx.moveTo(x + r, y);
            ctx.arcTo(x + w, y, x + w, y + h, r);
            ctx.arcTo(x + w, y + h, x, y + h, r);
            ctx.arcTo(x, y + h, x, y, r);
            ctx.arcTo(x, y, x + w, y, r);
            ctx.closePath(); ctx.fill();
        }

        // ====================================================================
        // RENDERIZADORES PROCEDURAIS DAS NOVAS ÁRVORES E PROPS (VISUALMENTE RICOS)
        // ====================================================================

        // 1. PINHEIRO DA TAIGA BOREAL (Lush Snow Conifer com 4 Níveis Facetados)
        function desenharPinheiroTaigaLowPoly(ctx, x, y, e, vento, v) {
            // Sombra no solo
            ctx.save();
            ctx.translate(x + 16 * e, y + 5 * e);
            ctx.beginPath();
            ctx.ellipse(0, 0, 36 * e, 14 * e, 0.2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(10, 24, 20, 0.34)';
            ctx.fill();
            ctx.restore();

            // Tronco resistente
            ctx.fillStyle = '#5c4028'; ctx.fillRect(x - 5.5 * e, y - 28 * e, 5 * e, 28 * e);
            ctx.fillStyle = '#3a2717'; ctx.fillRect(x - 0.5 * e, y - 28 * e, 6 * e, 28 * e);

            // 4 Níveis de copa em pirâmides densas com manto de neve
            const niveis = [
                { yBase: y - 20 * e, w: 48 * e, h: 32 * e },
                { yBase: y - 44 * e, w: 40 * e, h: 30 * e },
                { yBase: y - 66 * e, w: 32 * e, h: 28 * e },
                { yBase: y - 86 * e, w: 22 * e, h: 30 * e }
            ];

            for (let i = 0; i < niveis.length; i++) {
                const n = niveis[i];
                const offX = vento * (0.25 + i * 0.22);
                const yb = n.yBase, yt = yb - n.h;
                const w = n.w;

                // Face folhagem luz (verde pinho escuro nórdico)
                ctx.fillStyle = '#2d5e46';
                ctx.beginPath();
                ctx.moveTo(x - w + offX * 0.4, yb);
                ctx.lineTo(x + offX * 0.7, yb + 4 * e);
                ctx.lineTo(x + offX, yt);
                ctx.closePath(); ctx.fill();

                // Face folhagem sombra
                ctx.fillStyle = '#183827';
                ctx.beginPath();
                ctx.moveTo(x + offX * 0.7, yb + 4 * e);
                ctx.lineTo(x + w + offX * 0.4, yb);
                ctx.lineTo(x + offX, yt);
                ctx.closePath(); ctx.fill();

                // Camada espessa de neve brilhante na superfície
                ctx.fillStyle = '#f0f8ff';
                ctx.beginPath();
                ctx.moveTo(x - w * 0.7 + offX * 0.5, yb - 6 * e);
                ctx.lineTo(x + offX * 0.7, yb - 2 * e);
                ctx.lineTo(x + offX, yt);
                ctx.closePath(); ctx.fill();

                ctx.fillStyle = '#c5e2f2';
                ctx.beginPath();
                ctx.moveTo(x + offX * 0.7, yb - 2 * e);
                ctx.lineTo(x + w * 0.7 + offX * 0.5, yb - 6 * e);
                ctx.lineTo(x + offX, yt);
                ctx.closePath(); ctx.fill();
            }
        }

        // 2. ÁRVORE DOS LAMENTOS (Tronco Torcido, Galhos Retorcidos, Cipós e Olhos Espectrais)
        function desenharArvoreLamentos(ctx, x, y, e, vento, v) {
            // Sombra fantasmagórica
            ctx.save();
            ctx.translate(x + 12 * e, y + 4 * e);
            ctx.beginPath();
            ctx.ellipse(0, 0, 38 * e, 14 * e, 0.1, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(18, 14, 22, 0.42)';
            ctx.fill();
            ctx.restore();

            const tx = x, ty = y;
            const hT = 72 * e;

            // Raízes retorcidas expostas
            ctx.strokeStyle = '#2b2420'; ctx.lineWidth = 6 * e; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo(tx - 24 * e, ty + 2 * e, tx - 32 * e, ty + 8 * e); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo(tx + 22 * e, ty + 3 * e, tx + 30 * e, ty + 7 * e); ctx.stroke();

            // Tronco grosso e sinuoso (madeira morta carcomida)
            ctx.fillStyle = '#3a322c';
            ctx.beginPath();
            ctx.moveTo(tx - 12 * e, ty);
            ctx.quadraticCurveTo(tx - 16 * e + vento * 0.3, ty - hT * 0.5, tx - 7 * e + vento * 0.6, ty - hT);
            ctx.lineTo(tx + 6 * e + vento * 0.6, ty - hT);
            ctx.quadraticCurveTo(tx + 14 * e + vento * 0.3, ty - hT * 0.5, tx + 11 * e, ty);
            ctx.closePath(); ctx.fill();

            // Ranhuras da casca
            ctx.strokeStyle = '#1e1814'; ctx.lineWidth = 2.5 * e;
            ctx.beginPath();
            ctx.moveTo(tx - 6 * e, ty);
            ctx.quadraticCurveTo(tx - 8 * e, ty - hT * 0.5, tx - 2 * e, ty - hT);
            ctx.stroke();

            // Galhos retorcidos espetados
            const offV = vento * 0.8;
            ctx.strokeStyle = '#2b2420'; ctx.lineWidth = 5 * e;
            ctx.beginPath();
            ctx.moveTo(tx - 4 * e, ty - hT);
            ctx.quadraticCurveTo(tx - 28 * e + offV, ty - hT - 18 * e, tx - 42 * e + offV * 1.3, ty - hT - 36 * e);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(tx + 4 * e, ty - hT);
            ctx.quadraticCurveTo(tx + 26 * e + offV, ty - hT - 22 * e, tx + 38 * e + offV * 1.3, ty - hT - 38 * e);
            ctx.stroke();

            ctx.lineWidth = 3.5 * e;
            ctx.beginPath();
            ctx.moveTo(tx - 28 * e + offV, ty - hT - 18 * e);
            ctx.quadraticCurveTo(tx - 32 * e + offV, ty - hT - 40 * e, tx - 22 * e + offV * 1.2, ty - hT - 52 * e);
            ctx.stroke();

            // Cipós secos pendendo
            ctx.strokeStyle = '#4a4036'; ctx.lineWidth = 1.8 * e;
            for (let k = -2; k <= 2; k++) {
                const vx0 = tx + k * 14 * e + offV * 0.8;
                ctx.beginPath();
                ctx.moveTo(vx0, ty - hT * 0.8);
                ctx.quadraticCurveTo(vx0 + Math.sin(k) * 10 * e, ty - hT * 0.3, vx0 + Math.sin(k + 1) * 8 * e, ty - 8 * e);
                ctx.stroke();
            }

            // Oco espectral brilhando suavemente (alma aprisionada)
            const alma = 0.5 + Math.sin(vento * 3 + tx) * 0.4;
            ctx.fillStyle = 'rgba(120, 240, 180, ' + (alma * 0.8) + ')';
            ctx.beginPath();
            ctx.ellipse(tx + vento * 0.3, ty - hT * 0.55, 3.5 * e, 6 * e, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // 3. ESPINHO DE OBSIDIANA (Agulha de Vidro Vulcânico Preto com Brilho Carmesim)
        function desenharObsidianaEspinho(ctx, x, y, e, v) {
            ctx.save();
            ctx.translate(x + 12 * e, y + 4 * e);
            ctx.beginPath();
            ctx.ellipse(0, 0, 26 * e, 10 * e, 0.2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(10, 6, 12, 0.5)';
            ctx.fill();
            ctx.restore();

            const h = (54 + (v % 18)) * e;
            const w = 18 * e;

            // Face esquerda iluminada (reflexo púrpura escuro)
            ctx.fillStyle = '#2d2232';
            ctx.beginPath();
            ctx.moveTo(x - w, y);
            ctx.lineTo(x, y + 3 * e);
            ctx.lineTo(x - 2 * e, y - h);
            ctx.closePath(); ctx.fill();

            // Face frontal média
            ctx.fillStyle = '#1c1420';
            ctx.beginPath();
            ctx.moveTo(x, y + 3 * e);
            ctx.lineTo(x + w * 0.8, y);
            ctx.lineTo(x - 2 * e, y - h);
            ctx.closePath(); ctx.fill();

            // Borda especular afiada de vidro vulcânico
            ctx.strokeStyle = '#c53860';
            ctx.lineWidth = 2 * e;
            ctx.beginPath();
            ctx.moveTo(x, y + 3 * e);
            ctx.lineTo(x - 2 * e, y - h);
            ctx.stroke();
        }

        // 4. GÊISER DE VAPOR (Pico de Vapor nas Terras de Obsidiana)
        function desenharGeiserVapor(ctx, x, y, e, t) {
            // Cratera de rocha escura
            ctx.fillStyle = '#221a22';
            ctx.beginPath(); ctx.ellipse(x, y, 22 * e, 10 * e, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#120c14';
            ctx.beginPath(); ctx.ellipse(x, y - 2 * e, 14 * e, 6 * e, 0, 0, Math.PI * 2); ctx.fill();

            // Coluna de vapor animada subindo
            ctx.save();
            for (let i = 0; i < 4; i++) {
                const fase = (t * 1.8 + i * 0.25) % 1;
                const py = y - fase * 55 * e;
                const rP = (8 + fase * 16) * e;
                const alfa = (1 - fase) * 0.45;
                const px = x + Math.sin(t * 3 + i) * 6 * e;

                ctx.fillStyle = 'rgba(235, 240, 245, ' + alfa + ')';
                ctx.beginPath();
                ctx.arc(px, py, rP, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // 5. MESA ROCHOSA DO CANYON (Formação Geológica com Estratos Terracota)
        function desenharMesaRocha(ctx, x, y, e, v) {
            ctx.save();
            ctx.translate(x + 16 * e, y + 6 * e);
            ctx.beginPath();
            ctx.ellipse(0, 0, 38 * e, 14 * e, 0.15, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(40, 20, 10, 0.35)';
            ctx.fill();
            ctx.restore();

            const w = 46 * e, h = 42 * e;

            // Camadas sedimentares horizontais
            const camadas = [
                { y0: y - h, h: h * 0.3, c: '#c97838' },
                { y0: y - h * 0.7, h: h * 0.35, c: '#9c4e20' },
                { y0: y - h * 0.35, h: h * 0.35, c: '#783814' }
            ];

            for (let i = 0; i < camadas.length; i++) {
                const c = camadas[i];
                ctx.fillStyle = c.c;
                ctx.beginPath();
                ctx.moveTo(x - w * (1 - i * 0.08), c.y0);
                ctx.lineTo(x + w * (1 - i * 0.08), c.y0);
                ctx.lineTo(x + w * (1 - (i - 1) * 0.08), c.y0 + c.h);
                ctx.lineTo(x - w * (1 - (i - 1) * 0.08), c.y0 + c.h);
                ctx.closePath();
                ctx.fill();
            }

            // Platô superior iluminado pelo sol
            ctx.fillStyle = '#e8a054';
            ctx.beginPath();
            ctx.ellipse(x, y - h, w * 0.85, 12 * e, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // 6. CACTO DOURADO DO CANYON
        function desenharCactoDourado(ctx, x, y, e, vento) {
            ctx.save();
            elip(ctx, x + 4, y, 18 * e, 7 * e, 'rgba(0,0,0,0.3)');
            ctx.fillStyle = '#5a7828';
            rr(ctx, x - 8 * e, y - 64 * e, 16 * e, 64 * e, 8 * e);
            rr(ctx, x - 26 * e, y - 46 * e, 10 * e, 26 * e, 5 * e);
            rr(ctx, x - 26 * e, y - 24 * e, 20 * e, 10 * e, 4 * e);
            rr(ctx, x + 16 * e, y - 54 * e, 10 * e, 24 * e, 5 * e);
            rr(ctx, x + 6 * e, y - 34 * e, 18 * e, 10 * e, 4 * e);

            // Flor dourada no topo
            ctx.fillStyle = '#ffcc00';
            ctx.beginPath(); ctx.arc(x, y - 66 * e, 6 * e, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ff6600';
            ctx.beginPath(); ctx.arc(x, y - 66 * e, 2.5 * e, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }

        // 7. CRISTAL CELESTE (Costa da Rocha Cristalina / Recife de Mana)
        function desenharCristalCeleste(ctx, x, y, e, t, v) {
            const pul = 0.75 + Math.sin(t * 3.5 + x * 0.1) * 0.25;

            // Halo luminoso de mana turquesa no solo
            const gAura = ctx.createRadialGradient(x, y - 20 * e, 4 * e, x, y - 20 * e, 40 * e);
            gAura.addColorStop(0, 'rgba(80, 240, 255, ' + (0.45 * pul) + ')');
            gAura.addColorStop(1, 'rgba(40, 150, 255, 0)');
            ctx.fillStyle = gAura;
            ctx.beginPath(); ctx.arc(x, y - 20 * e, 40 * e, 0, Math.PI * 2); ctx.fill();

            // Cluster de 3 agulhas pontiagudas reluzentes
            for (let k = -1; k <= 1; k++) {
                const hh = (52 - Math.abs(k) * 14) * e;
                const offX = k * 14 * e;
                const g = ctx.createLinearGradient(x + offX, y, x + offX, y - hh);
                g.addColorStop(0, 'rgba(40, 140, 220, 0.9)');
                g.addColorStop(0.5, 'rgba(80, 230, 255, 0.95)');
                g.addColorStop(1, 'rgba(235, 255, 255, ' + pul + ')');

                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.moveTo(x + offX - 7 * e, y);
                ctx.lineTo(x + offX, y - hh);
                ctx.lineTo(x + offX + 7 * e, y);
                ctx.closePath(); ctx.fill();

                // Linha de refração solar
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(x + offX - 1.5, y - hh * 0.8, 2, hh * 0.5);
            }
        }

        // 8. PILAR ANCESTRAL (Plataforma Ancestral de Gelo)
        function desenharPilarAncestral(ctx, x, y, e, v) {
            elip(ctx, x + 6, y, 22 * e, 8 * e, 'rgba(0,0,0,0.3)');
            const w = 18 * e, h = 56 * e;

            ctx.fillStyle = '#a0b0be'; ctx.fillRect(x - w * 0.5, y - h, w, h);
            ctx.fillStyle = '#d0e0ec'; ctx.fillRect(x - w * 0.5, y - h, w * 0.4, h);

            // Capitel e base esculpidos
            ctx.fillStyle = '#c0d4e4';
            ctx.fillRect(x - w * 0.7, y - h - 6 * e, w * 1.4, 7 * e);
            ctx.fillRect(x - w * 0.7, y - 6 * e, w * 1.4, 7 * e);

            // Runa mágica azul pulsando levemente
            ctx.fillStyle = 'rgba(80, 200, 255, 0.75)';
            ctx.fillRect(x - 2 * e, y - h * 0.6, 4 * e, 12 * e);
            ctx.fillRect(x - 5 * e, y - h * 0.5, 10 * e, 3 * e);
        }

        // 9. ICEBERG PROP (Bloco de gelo marinho)
        function desenharIcebergProp(ctx, x, y, e) {
            elip(ctx, x + 8, y, 32 * e, 12 * e, 'rgba(10,30,50,0.4)');
            const w = 36 * e, h = 28 * e;
            ctx.fillStyle = '#b8d8ec';
            ctx.beginPath();
            ctx.moveTo(x - w, y);
            ctx.lineTo(x - w * 0.3, y - h);
            ctx.lineTo(x + w * 0.4, y - h * 0.8);
            ctx.lineTo(x + w, y);
            ctx.closePath(); ctx.fill();

            ctx.fillStyle = '#eaf4fc';
            ctx.beginPath();
            ctx.moveTo(x - w * 0.3, y - h);
            ctx.lineTo(x + w * 0.4, y - h * 0.8);
            ctx.lineTo(x, y - h * 0.3);
            ctx.closePath(); ctx.fill();
        }

        // ---- DESPACHO DE DESENHO DE PROPS ----
        function desenharProp(ctx, p, t) {
            const e = p.esc, x = p.x, y = p.y;
            const vento = Math.sin(t * 1.4 + x * 0.013 + y * 0.007) * 3.2 * e + Math.sin(t * 2.9 + x * 0.03) * 1.1;
            ctx.save();

            switch (p.tipo) {
                // Novos Props dos Novos Biomas
                case 'pinheiro_taiga':
                    desenharPinheiroTaigaLowPoly(ctx, x, y, e, vento, p.v || 0);
                    ctx.restore();
                    return;
                case 'arvore_lamentos':
                    desenharArvoreLamentos(ctx, x, y, e, vento, p.v || 0);
                    ctx.restore();
                    return;
                case 'obsidiana_espinho':
                    desenharObsidianaEspinho(ctx, x, y, e, p.v || 0);
                    ctx.restore();
                    return;
                case 'vapor_geiser':
                    desenharGeiserVapor(ctx, x, y, e, t);
                    ctx.restore();
                    return;
                case 'mesa_rocha':
                    desenharMesaRocha(ctx, x, y, e, p.v || 0);
                    ctx.restore();
                    return;
                case 'cacto_dourado':
                    desenharCactoDourado(ctx, x, y, e, vento);
                    ctx.restore();
                    return;
                case 'cristal_celeste':
                    desenharCristalCeleste(ctx, x, y, e, t, p.v || 0);
                    ctx.restore();
                    return;
                case 'pilar_ancestral':
                    desenharPilarAncestral(ctx, x, y, e, p.v || 0);
                    ctx.restore();
                    return;
                case 'iceberg_prop':
                    desenharIcebergProp(ctx, x, y, e);
                    ctx.restore();
                    return;

                // Árvores Clássicas do Núcleo Gaia
                case 'arvore': case 'salgueiro':
                    elip(ctx, x + 4, y, 26 * e, 8 * e, 'rgba(0,0,0,0.3)');
                    ctx.fillStyle = '#5a3f2a'; ctx.fillRect(x - 7 * e, y - 52 * e, 14 * e, 52 * e);
                    ctx.fillStyle = '#7a5a3a'; ctx.fillRect(x - 7 * e, y - 52 * e, 5 * e, 52 * e);
                    copa(ctx, x + vento, y - 78 * e, 44 * e, '#2f6a32', '#43893f', '#6bb552');
                    ctx.restore();
                    return;

                case 'pinheiro': case 'pinheiro_neve':
                    elip(ctx, x + 4, y, 24 * e, 8 * e, 'rgba(0,0,0,0.3)');
                    ctx.fillStyle = '#4a3322'; ctx.fillRect(x - 6 * e, y - 30 * e, 12 * e, 30 * e);
                    for (let k = 0; k < 3; k++) {
                        const yy = y - (28 + k * 26) * e, w = (46 - k * 9) * e, off = vento * (0.4 + k * 0.35);
                        ctx.fillStyle = p.tipo === 'pinheiro_neve' ? '#2e5a4a' : '#1c3d2b';
                        ctx.beginPath(); ctx.moveTo(x - w + off * 0.3, yy); ctx.lineTo(x + w + off * 0.3, yy); ctx.lineTo(x + off, yy - 36 * e); ctx.closePath(); ctx.fill();
                    }
                    ctx.restore();
                    return;

                case 'cacto':
                    elip(ctx, x + 4, y, 16 * e, 6 * e, 'rgba(0,0,0,0.3)');
                    ctx.fillStyle = '#3f7a3a';
                    rr(ctx, x - 8 * e, y - 64 * e, 16 * e, 64 * e, 8 * e);
                    ctx.restore();
                    return;

                case 'cristal_arcano':
                    desenharCristalCeleste(ctx, x, y, e, t, p.v || 0);
                    ctx.restore();
                    return;

                case 'pilar_tempestade':
                    elip(ctx, x + 4, y, 20 * e, 7 * e, 'rgba(0,0,0,0.3)');
                    ctx.fillStyle = '#2a3444'; ctx.fillRect(x - 8 * e, y - 56 * e, 16 * e, 56 * e);
                    ctx.fillStyle = '#3f4f66'; ctx.fillRect(x - 5 * e, y - 54 * e, 4 * e, 54 * e);
                    ctx.restore();
                    return;

                case 'lapide':
                    elip(ctx, x + 4, y, 16 * e, 6 * e, 'rgba(0,0,0,0.3)');
                    ctx.fillStyle = '#3a3440'; rr(ctx, x - 12 * e, y - 36 * e, 24 * e, 36 * e, 8 * e);
                    ctx.restore();
                    return;

                case 'morta': case 'seco':
                    ctx.strokeStyle = '#3a3028'; ctx.lineWidth = 7 * e; ctx.lineCap = 'round';
                    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + vento * 0.2, y - 54 * e); ctx.stroke();
                    ctx.restore();
                    return;

                case 'pedra': case 'rocha_lava':
                    const lava = p.tipo === 'rocha_lava';
                    const r2 = (lava ? 28 : 22) * e;
                    elip(ctx, x, y - r2 * 0.6, r2, r2 * 0.7, lava ? '#2a2224' : '#5c5e66');
                    elip(ctx, x - r2 * 0.15, y - r2 * 0.75, r2 * 0.8, r2 * 0.5, lava ? '#3e3032' : '#8a8c92');
                    ctx.restore();
                    return;

                case 'arbusto':
                    copa(ctx, x + vento * 0.5, y - 12 * e, 16 * e, '#2f6a32', '#43893f', '#6bb552');
                    ctx.restore();
                    return;

                default:
                    elip(ctx, x, y, 14 * e, 6 * e, 'rgba(0,0,0,0.25)');
                    ctx.restore();
                    return;
            }
        }

        // Partículas atmosféricas com desempenho ultra-leve
        function desenharAmbiente(ctx, t) {
            const v = vista(), nt = noite();
            const bio = biomaEm(v.x + v.w / 2, v.y + v.h / 2, 0);
            ctx.save();
            const N = 36;

            for (let i = 0; i < N; i++) {
                const x0 = v.x + ((hash01(SEED + 50, i, 0) * v.w * 1.2 + t * 15 * (0.4 + hash01(SEED + 51, i, 0))) % v.w);
                let by, x = x0;

                if (bio === B.NEVE || bio === B.TAIGA || bio === B.PICOS_GELO || bio === B.PLATAFORMA_GELO) {
                    by = v.y + ((hash01(SEED + 52, i, 0) * v.h + t * 45 * (0.5 + hash01(SEED + 53, i, 0))) % v.h);
                    x = x0 + Math.sin(t + i) * 10;
                    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(x, by, 2.5, 2.5);
                } else if (bio === B.VULCAO || bio === B.OBSIDIANA) {
                    by = v.y + v.h - ((hash01(SEED + 52, i, 0) * v.h + t * 38 * (0.4 + hash01(SEED + 53, i, 0))) % v.h);
                    x = x0 + Math.sin(t * 2 + i) * 8;
                    ctx.fillStyle = 'rgba(255,' + (110 + (i * 13) % 90) + ',30,' + (0.5 + Math.sin(t * 6 + i) * 0.4) + ')';
                    ctx.fillRect(x, by, 2.5, 2.5);
                } else if (bio === B.CRISTAIS || bio === B.RECIFE_CRISTAL) {
                    if (i > 18) continue;
                    by = v.y + ((hash01(SEED + 52, i, 0) * v.h - t * 12) % v.h);
                    if (by < v.y) by += v.h;
                    ctx.fillStyle = 'rgba(100,230,255,' + (0.5 + Math.sin(t * 3 + i) * 0.3) + ')';
                    ctx.fillRect(x, by, 2.5, 2.5);
                } else if (nt > 0.15) {
                    x = v.x + hash01(SEED + 54, i, 0) * v.w + Math.sin(t * 0.7 + i * 1.7) * 30;
                    by = v.y + hash01(SEED + 52, i, 0) * v.h + Math.cos(t * 0.9 + i * 2.1) * 22;
                    const pul = 0.4 + 0.6 * Math.max(0, Math.sin(t * 2 + i * 3));
                    const c = '180,255,140';
                    const g = ctx.createRadialGradient(x, by, 0, x, by, 12);
                    g.addColorStop(0, 'rgba(' + c + ',' + (pul * nt) + ')'); g.addColorStop(1, 'rgba(' + c + ',0)');
                    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, by, 12, 0, Math.PI * 2); ctx.fill();
                }
            }
            ctx.restore();
        }

        // Estruturas & Monumentos de todos os Biomas (POIs Oficiais)
        const ESTRUTURAS_MUNDO = [
            // Centro Gaia
            {
                tipo: 'santuario', x: CX, y: CY - 60,
                nome: '🏛️ Santuário de Gaia',
                draw: function (ctx, t) {
                    const sx = CX, sy = CY - 60;
                    ctx.save();
                    elip(ctx, sx, sy + 6, 28, 12, 'rgba(0,0,0,0.35)');
                    ctx.fillStyle = '#4a5b44'; ctx.fillRect(sx - 16, sy - 36, 32, 40);
                    ctx.fillStyle = '#6a8262'; ctx.fillRect(sx - 12, sy - 34, 24, 36);
                    const pul = 0.5 + Math.sin(t * 3) * 0.5;
                    ctx.fillStyle = 'rgba(100,255,140,' + (0.7 + pul * 0.3) + ')';
                    ctx.fillRect(sx - 4, sy - 24, 8, 16);
                    ctx.fillRect(sx - 8, sy - 20, 16, 8);
                    ctx.restore();
                }
            },
            // Terras de Obsidiana (Pico de Vapor)
            {
                tipo: 'pico_vapor', x: 114000, y: 8500,
                nome: '♨️ Pico de Vapor',
                draw: function (ctx, t) {
                    const sx = 114000, sy = 8500;
                    ctx.save();
                    elip(ctx, sx, sy + 8, 42, 16, 'rgba(0,0,0,0.5)');
                    ctx.fillStyle = '#1c141c'; ctx.fillRect(sx - 24, sy - 54, 48, 56);
                    ctx.fillStyle = '#2d202d'; ctx.fillRect(sx - 18, sy - 50, 36, 50);
                    const pul = 0.5 + Math.sin(t * 4) * 0.5;
                    ctx.fillStyle = 'rgba(255,100,40,' + (0.6 + pul * 0.4) + ')';
                    ctx.fillRect(sx - 8, sy - 30, 16, 6);
                    ctx.restore();
                }
            },
            // Floresta dos Lamentos (Altar da Necromancia)
            {
                tipo: 'altar_necromancia', x: 116000, y: 19500,
                nome: '💀 Altar da Necromancia',
                draw: function (ctx, t) {
                    const sx = 116000, sy = 19500;
                    ctx.save();
                    elip(ctx, sx, sy + 8, 38, 14, 'rgba(0,0,0,0.45)');
                    ctx.fillStyle = '#25201d'; ctx.fillRect(sx - 20, sy - 44, 40, 48);
                    ctx.fillStyle = '#3a322c'; ctx.fillRect(sx - 15, sy - 40, 30, 42);
                    const pul = 0.5 + Math.sin(t * 3) * 0.5;
                    ctx.fillStyle = 'rgba(100,240,160,' + (0.6 + pul * 0.4) + ')';
                    ctx.beginPath(); ctx.arc(sx, sy - 26, 6, 0, Math.PI * 2); ctx.fill();
                    ctx.restore();
                }
            },
            // Taiga Boreal Gelada (Templo da Geada)
            {
                tipo: 'templo_geada', x: 127000, y: 3500,
                nome: '❄️ Templo da Geada',
                draw: function (ctx, t) {
                    const sx = 127000, sy = 3500;
                    ctx.save();
                    elip(ctx, sx, sy + 8, 44, 16, 'rgba(0,0,0,0.35)');
                    ctx.fillStyle = '#3a505e'; ctx.fillRect(sx - 22, sy - 48, 44, 52);
                    ctx.fillStyle = '#62849a'; ctx.fillRect(sx - 18, sy - 44, 36, 46);
                    ctx.fillStyle = '#f0f8ff';
                    for (let k = 0; k < 3; k++) ctx.fillRect(sx - 20 + k * 14, sy - 56, 12, 10);
                    ctx.restore();
                }
            },
            // Picos de Gelo (Observatório Estelar)
            {
                tipo: 'observatorio_estelar', x: 154000, y: 3500,
                nome: '🔭 Observatório Estelar',
                draw: function (ctx, t) {
                    const sx = 154000, sy = 3500;
                    ctx.save();
                    elip(ctx, sx, sy + 8, 40, 16, 'rgba(0,0,0,0.4)');
                    ctx.fillStyle = '#263445'; ctx.fillRect(sx - 18, sy - 52, 36, 56);
                    ctx.fillStyle = '#425b7a';
                    ctx.beginPath(); ctx.arc(sx, sy - 52, 18, Math.PI, 0); ctx.fill();
                    const pul = 0.5 + Math.sin(t * 5) * 0.5;
                    ctx.fillStyle = 'rgba(160,220,255,' + (0.7 + pul * 0.3) + ')';
                    ctx.beginPath(); ctx.arc(sx, sy - 52, 6, 0, Math.PI * 2); ctx.fill();
                    ctx.restore();
                }
            },
            // Canyon do Abreu (Garganta Dourada)
            {
                tipo: 'garganta_dourada', x: 174000, y: 8500,
                nome: '🏜️ Garganta Dourada',
                draw: function (ctx, t) {
                    const sx = 174000, sy = 8500;
                    ctx.save();
                    elip(ctx, sx, sy + 8, 44, 16, 'rgba(0,0,0,0.4)');
                    ctx.fillStyle = '#8a4c20'; ctx.fillRect(sx - 24, sy - 46, 48, 50);
                    ctx.fillStyle = '#b86c2e'; ctx.fillRect(sx - 18, sy - 42, 36, 44);
                    ctx.fillStyle = '#e29a4a'; ctx.fillRect(sx - 8, sy - 20, 16, 22);
                    ctx.restore();
                }
            },
            // Costa da Rocha Cristalina (Recife de Mana)
            {
                tipo: 'recife_mana', x: 174000, y: 20000,
                nome: '💎 Recife de Mana',
                draw: function (ctx, t) {
                    const sx = 174000, sy = 20000;
                    ctx.save();
                    elip(ctx, sx, sy + 8, 44, 16, 'rgba(0,0,0,0.4)');
                    const pul = 0.6 + Math.sin(t * 4) * 0.4;
                    const ig = ctx.createRadialGradient(sx, sy - 35, 2, sx, sy - 35, 34);
                    ig.addColorStop(0, 'rgba(80,240,255,' + (0.6 + pul * 0.4) + ')');
                    ig.addColorStop(1, 'rgba(30,120,220,0)');
                    ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(sx, sy - 35, 34, 0, Math.PI * 2); ctx.fill();
                    ctx.restore();
                }
            },
            // Plataforma Ancestral (Ruínas Submersas)
            {
                tipo: 'ruinas_submersas', x: 163000, y: 25000,
                nome: '🌊 Ruínas Submersas',
                draw: function (ctx, t) {
                    const sx = 163000, sy = 25000;
                    ctx.save();
                    elip(ctx, sx, sy + 8, 46, 18, 'rgba(0,0,0,0.45)');
                    ctx.fillStyle = '#5c7484'; ctx.fillRect(sx - 26, sy - 38, 52, 42);
                    ctx.fillStyle = '#829cae'; ctx.fillRect(sx - 20, sy - 34, 40, 36);
                    ctx.restore();
                }
            }
        ];

        function coletarMundoSortables() {
            // Gaia fornece somente o terreno; a decoração fica a cargo do Editor.
        }

        const prevColide = global.colideMapaAtivo;
        global.colideMapaAtivo = function (x, y, raio) {
            if (global.currentMap === 'mundo') return colideMundo(x, y, raio);
            return typeof prevColide === 'function' ? prevColide(x, y, raio) : false;
        };
        const prevColideP = global.colideProjetilMapaAtivo;
        global.colideProjetilMapaAtivo = function (x, y) {
            if (global.currentMap === 'mundo') return colideProjetilMundo(x, y);
            return typeof prevColideP === 'function' ? prevColideP(x, y) : false;
        };

        global.desenharCenarioMundo = desenharCenarioMundo;
        global.coletarMundoSortables = coletarMundoSortables;
        global.mapaMundo = api;
    }

    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
