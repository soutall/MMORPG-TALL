// ====================================================================
// TESTE CONSOLE (CLI): SIMPLEX NOISE + AUTOTILING
// Execute via terminal: node teste_simplex_cli.js
// ====================================================================

const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;

class SimplexNoise2D {
    constructor(seed = 12345) {
        this.p = new Uint8Array(256);
        let s = seed;
        for (let i = 0; i < 256; i++) this.p[i] = i;
        for (let i = 255; i > 0; i--) {
            s = (s * 9301 + 49297) % 233280;
            let j = Math.floor((s / 233280) * (i + 1));
            let tmp = this.p[i]; this.p[i] = this.p[j]; this.p[j] = tmp;
        }
        this.perm = new Uint8Array(512);
        this.permMod12 = new Uint8Array(512);
        for (let i = 0; i < 512; i++) {
            this.perm[i] = this.p[i & 255];
            this.permMod12[i] = this.perm[i] % 12;
        }
        this.grad3 = [
            [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
            [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
            [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
        ];
    }

    noise(xin, yin) {
        let n0, n1, n2;
        let s = (xin + yin) * F2;
        let i = Math.floor(xin + s);
        let j = Math.floor(yin + s);
        let t = (i + j) * G2;
        let X0 = i - t;
        let Y0 = j - t;
        let x0 = xin - X0;
        let y0 = yin - Y0;
        let i1, j1;
        if (x0 > y0) { i1 = 1; j1 = 0; }
        else { i1 = 0; j1 = 1; }
        let x1 = x0 - i1 + G2;
        let y1 = y0 - j1 + G2;
        let x2 = x0 - 1.0 + 2.0 * G2;
        let y2 = y0 - 1.0 + 2.0 * G2;
        let ii = i & 255;
        let jj = j & 255;
        let gi0 = this.permMod12[ii + this.perm[jj]];
        let gi1 = this.permMod12[ii + i1 + this.perm[jj + j1]];
        let gi2 = this.permMod12[ii + 1 + this.perm[jj + 1]];
        let t0 = 0.5 - x0*x0 - y0*y0;
        if (t0 < 0) n0 = 0.0;
        else { t0 *= t0; n0 = t0 * t0 * (this.grad3[gi0][0] * x0 + this.grad3[gi0][1] * y0); }
        let t1 = 0.5 - x1*x1 - y1*y1;
        if (t1 < 0) n1 = 0.0;
        else { t1 *= t1; n1 = t1 * t1 * (this.grad3[gi1][0] * x1 + this.grad3[gi1][1] * y1); }
        let t2 = 0.5 - x2*x2 - y2*y2;
        if (t2 < 0) n2 = 0.0;
        else { t2 *= t2; n2 = t2 * t2 * (this.grad3[gi2][0] * x2 + this.grad3[gi2][1] * y2); }
        return 70.0 * (n0 + n1 + n2);
    }
}

// Configuração da Grade de Teste
const COLS = 40;
const ROWS = 16;
const SCALE = 0.09;
const WATER_LEVEL = -0.05;

const simplex = new SimplexNoise2D(Date.now() % 100000);
const grid = [];

// 1. Gera Biomas via Simplex Noise
for (let y = 0; y < ROWS; y++) {
    const row = [];
    for (let x = 0; x < COLS; x++) {
        const val = simplex.noise(x * SCALE, y * SCALE * 1.8);
        if (val < WATER_LEVEL) row.push('W');       // Água
        else if (val < WATER_LEVEL + 0.14) row.push('S'); // Areia
        else if (val < WATER_LEVEL + 0.50) row.push('G'); // Grama
        else row.push('R');                               // Rocha
    }
    grid.push(row);
}

// 2. Calcula Autotiling Bitmask (N=1, E=2, S=4, W=8)
function getBitmask(x, y, biome) {
    let mask = 0;
    const isSolid = (bx, by) => {
        if (bx < 0 || bx >= COLS || by < 0 || by >= ROWS) return false;
        const t = grid[by][bx];
        if (biome === 'W') return t === 'W';
        if (biome === 'S') return t === 'S' || t === 'G' || t === 'R';
        if (biome === 'G') return t === 'G' || t === 'R';
        return t === 'R';
    };
    if (isSolid(x, y - 1)) mask |= 1; // Norte
    if (isSolid(x + 1, y)) mask |= 2; // Leste
    if (isSolid(x, y + 1)) mask |= 4; // Sul
    if (isSolid(x - 1, y)) mask |= 8; // Oeste
    return mask;
}

// Cores ANSI para o terminal
const BLUE = '\x1b[34m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const WHITE = '\x1b[37m';
const RESET = '\x1b[0m';

console.log('\n============================================================');
console.log('🗺️  MAPA PROCEDURAL GERADO COM SIMPLEX NOISE + AUTOTILING');
console.log('============================================================\n');

// Imprime Mapa Colorido
for (let y = 0; y < ROWS; y++) {
    let line = '';
    for (let x = 0; x < COLS; x++) {
        const t = grid[y][x];
        const mask = getBitmask(x, y, t);
        
        if (t === 'W') {
            line += `${BLUE}~~${RESET}`;
        } else if (t === 'S') {
            line += `${YELLOW}..${RESET}`;
        } else if (t === 'G') {
            // Se for centro (mask 15) ou borda
            if (mask === 15) line += `${GREEN}██${RESET}`;
            else line += `${GREEN}▓▓${RESET}`;
        } else {
            line += `${WHITE}▲▲${RESET}`;
        }
    }
    console.log(line);
}

console.log('\nLegenda:');
console.log(`  ${BLUE}~~${RESET} Água`);
console.log(`  ${YELLOW}..${RESET} Areia / Praia`);
console.log(`  ${GREEN}██${RESET} Grama (Centro, Mask=15)`);
console.log(`  ${GREEN}▓▓${RESET} Grama (Borda autotiled, Mask < 15)`);
console.log(`  ${WHITE}▲▲${RESET} Montanha / Rocha`);
console.log('\nPara abrir a versão interativa visual com sliders e pintura manual:');
console.log('Abra o arquivo no seu navegador: teste_simplex_autotile.html\n');
