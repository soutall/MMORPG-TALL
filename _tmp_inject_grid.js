const fs = require('fs');
const src = './mapa_arena.js';
const grid = JSON.parse(fs.readFileSync('./_tmp_arena_grid.json', 'utf8'));
let out = fs.readFileSync(src, 'utf8');
if (!/_GRID_PLACEHOLDER/.test(out)) { console.log('placeholder nao encontrado'); process.exit(1); }
out = out.replace('_GRID_PLACEHOLDER', JSON.stringify(grid));
fs.writeFileSync(src, out);
console.log('grid injetado; bytes:', out.length);
const api = require('./mapa_arena.js');
console.log('require ok; COLS', api.COLS, 'ROWS', api.ROWS);
console.log('colide (64420,620):', api.colideArena(64420,620));
console.log('colide (63860,620) edge:', api.colideArena(63860,620));
