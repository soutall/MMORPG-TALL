const fs = require('fs');
const zlib = require('zlib');
const path = 'e:/Jogo CELULAR/sprites/arena.png';
const buf = fs.readFileSync(path);

let pos = 8;
let idat = Buffer.alloc(0);
let width = 0, height = 0, colorType = 0, bitDepth = 0;

while (pos + 8 <= buf.length) {
  const len = buf.readUInt32BE(pos);
  const type = buf.toString('ascii', pos + 4, pos + 8);
  const data = buf.slice(pos + 8, pos + 8 + len);
  if (type === 'IHDR') {
    width = data.readUInt32BE(0);
    height = data.readUInt32BE(4);
    bitDepth = data[8];
    colorType = data[9];
  }
  if (type === 'IDAT') {
    idat = Buffer.concat([idat, data]);
  }
  pos += 12 + len;
}

if (!width) {
  console.log('ERRO: IHDR nao encontrado');
  process.exit(1);
}
console.log('width', width, 'height', height, 'bitDepth', bitDepth, 'colorType', colorType);

if (colorType !== 2 && colorType !== 6) {
  console.log('ColorType nao suportado (só RGB ou RGBA)');
  process.exit(1);
}
const bpp = colorType === 2 ? 3 : 4;
const rowBytes = 1 + width * bpp;

const inflated = zlib.inflateSync(idat);
if (inflated.length !== height * rowBytes) {
  console.log('Tamanho descomprimido inesperado:', inflated.length, 'esperado:', height * rowBytes);
  process.exit(1);
}

const pixels = new Uint8Array(width * height * bpp);

function paethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

for (let y = 0; y < height; y++) {
  const rowStart = y * rowBytes;
  const filter = inflated[rowStart];
  const prevRowStart = y > 0 ? rowStart - rowBytes : null;
  for (let x = 0; x < width; x++) {
    const dstIdx = (y * width + x) * bpp;
    const srcIdx = rowStart + 1 + x * bpp;
    for (let c = 0; c < bpp; c++) {
      let a = 0, b = 0, cbyte = 0;
      if (x > 0) { const pi = (y * width + (x - 1)) * bpp; a = pixels[pi + c]; }
      if (prevRowStart !== null) { const pi = ((y - 1) * width + x) * bpp; b = pixels[pi + c]; }
      if (x > 0 && prevRowStart !== null) { const pi = ((y - 1) * width + (x - 1)) * bpp; cbyte = pixels[pi + c]; }
      let pred = 0;
      if (filter === 0) pred = 0;
      else if (filter === 1) pred = a;
      else if (filter === 2) pred = b;
      else if (filter === 3) pred = Math.floor((a + b) / 2);
      else if (filter === 4) pred = paethPredictor(a, b, cbyte);
      pixels[dstIdx + c] = (inflated[srcIdx + c] + pred) & 0xFF;
    }
  }
}

const lum = new Float32Array(width * height);
for (let i = 0; i < width * height; i++) {
  const r = pixels[i * 3], g = pixels[i * 3 + 1], b = pixels[i * 3 + 2];
  lum[i] = 0.299 * r + 0.587 * g + 0.114 * b;
}

const TILE = 40;
const coverW = Math.floor(width / TILE) * TILE;
const coverH = Math.floor(height / TILE) * TILE;
const offX = Math.floor((width - coverW) / 2);
const offY = Math.floor((height - coverH) / 2);
const COLS = Math.floor(coverW / TILE);
const ROWS = Math.floor(coverH / TILE);

console.log('coverW', coverW, 'coverH', coverH, 'offX', offX, 'offY', offY, 'COLS', COLS, 'ROWS', ROWS);

const samp = new Float32Array(coverW * coverH);
for (let y = 0; y < coverH; y++) {
  for (let x = 0; x < coverW; x++) {
    samp[y * coverW + x] = lum[(offY + y) * width + (offX + x)];
  }
}

function kmeans1d(arr, k, maxIter) {
  k = k || 2; maxIter = maxIter || 20;
  const n = arr.length;
  let idx0 = Math.floor(n * 0.25), idx1 = Math.floor(n * 0.75);
  let c0 = arr[idx0], c1 = arr[idx1];
  for (let it = 0; it < maxIter; it++) {
    let s0 = 0, s1 = 0, n0 = 0, n1 = 0;
    for (let i = 0; i < n; i++) {
      const v = arr[i];
      if (Math.abs(v - c0) <= Math.abs(v - c1)) { s0 += v; n0++; }
      else { s1 += v; n1++; }
    }
    const nc0 = n0 ? s0 / n0 : c0;
    const nc1 = n1 ? s1 / n1 : c1;
    if (Math.abs(nc0 - c0) < 1e-4 && Math.abs(nc1 - c1) < 1e-4) break;
    c0 = nc0; c1 = nc1;
  }
  const paredeCluster = c0 < c1 ? c0 : c1;
  const chaoCluster = c0 < c1 ? c1 : c0;
  return { c0, c1, paredeCluster, chaoCluster };
}

const km = kmeans1d(samp, 2);
console.log('centroides:', km.c0, km.c1, 'paredeCluster:', km.paredeCluster, 'chaoCluster:', km.chaoCluster);

const grid = [];
for (let l = 0; l < ROWS; l++) {
  const row = [];
  for (let c = 0; c < COLS; c++) {
    let cnt = 0, total = 0;
    for (let dy = 0; dy < TILE; dy++) {
      for (let dx = 0; dx < TILE; dx++) {
        const px = offX + c * TILE + dx;
        const py = offY + l * TILE + dy;
        const v = lum[py * width + px];
        const pertenceParede = Math.abs(v - km.paredeCluster) <= Math.abs(v - km.chaoCluster);
        if (pertenceParede) cnt++;
        total++;
      }
    }
    row.push(cnt / total > 0.5);
  }
  grid.push(row);
}

function ascii(v) { return v ? '#' : '.'; }
let out = '';
for (let l = 0; l < ROWS; l++) {
  let line = '';
  for (let c = 0; c < COLS; c++) line += ascii(grid[l][c]);
  out += line + '\n';
}
console.log('--- GRID ASCII (parede=#) ---');
console.log(out);

const json = JSON.stringify(grid);
console.log('--- JSON GRID (primeiros 500 chars) ---');
console.log(json.slice(0, 500));
fs.writeFileSync('e:/Jogo CELULAR/_tmp_arena_grid.json', json);
console.log('Grid salvo em _tmp_arena_grid.json');
