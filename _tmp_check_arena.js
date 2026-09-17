const fs = require('fs');
const path = 'e:/Jogo CELULAR/sprites/arena.png';
let info = { pngjs: false, canvas: false, bytes: null, first4: null };

try { require('pngjs'); info.pngjs = true; } catch (e) {}
try { require('canvas'); info.canvas = true; } catch (e) {}

try {
  const buf = fs.readFileSync(path);
  info.bytes = buf.length;
  info.first4 = buf.slice(0, 4).toString('hex');
} catch (e) {
  info.err = e.message;
}

console.log(JSON.stringify(info, null, 2));
