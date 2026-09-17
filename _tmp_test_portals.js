const cidade = require('./mapa_cidade.js');
const gridJson = require('./_tmp_arena_grid.json');
const ARENA_X0 = 63800, TILE = 40;

console.log('--- cidade colide tests ---');
console.log('(63780,620):', cidade.colideCidade(63780,620));
console.log('(63760,620):', cidade.colideCidade(63760,620));
console.log('(63780,600):', cidade.colideCidade(63780,600));
console.log('(63780,640):', cidade.colideCidade(63780,640));
console.log('(63740,620):', cidade.colideCidade(63740,620));
console.log('(63800,620):', cidade.colideCidade(63800,620));

console.log('--- arena grid sample near center (15,15) ---');
for (let dy = -2; dy <= 2; dy++) {
  const row = [];
  for (let dx = -2; dx <= 2; dx++) {
    const c = 15 + dx, l = 15 + dy;
    const v = (gridJson[l] && gridJson[l][c]);
    row.push(v ? '#' : '.');
  }
  console.log(row.join(' '));
}

const c = 15, l = 15;
console.log('arena world center tile (15,15):', ARENA_X0 + (c + 0.5) * TILE, (l + 0.5) * TILE);
console.log('arena grid size:', gridJson.length, 'x', gridJson[0].length);
