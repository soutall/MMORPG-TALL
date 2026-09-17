const fs = require('fs');
const path = 'e:/Jogo CELULAR/sprites/arena.png';
const buf = fs.readFileSync(path);
const sig = buf.slice(0, 8).toString('hex');
console.log('signature:', sig);

let pos = 8;
while (pos + 8 <= buf.length) {
  const length = buf.readUInt32BE(pos);
  const type = buf.toString('ascii', pos + 4, pos + 8);
  const data = buf.slice(pos + 8, pos + 8 + length);
  if (type === 'IHDR') {
    const width = data.readUInt32BE(0);
    const height = data.readUInt32BE(4);
    const bitDepth = data[8];
    const colorType = data[9];
    console.log('width:', width, 'height:', height);
    console.log('bitDepth:', bitDepth, 'colorType:', colorType);
    console.log('bytesPerPixel:', colorType === 2 ? 3 : colorType === 6 ? 4 : colorType === 0 ? 1 : colorType === 4 ? 2 : '?');
    // estimate decompressed size: rows * (1 filter + pixels)
    const bpp = colorType === 2 ? 3 : colorType === 6 ? 4 : colorType === 0 ? 1 : colorType === 4 ? 2 : null;
    if (bpp) {
      const rowBytes = 1 + width * bpp;
      console.log('approxDecompressedBytes:', height * rowBytes);
    }
    break;
  }
  pos += 12 + length;
}
