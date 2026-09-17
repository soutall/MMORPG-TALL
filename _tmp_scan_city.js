const cidade = require('./mapa_cidade.js');
const Y = 620;
console.log('Scan x at y=' + Y + ' (free = false means walkable):');
for (let x = 63700; x < 63800; x += 5) {
  const col = cidade.colideCidade(x, Y);
  if (!col) console.log('FREE', x, Y);
}
console.log('Scan y at x=63740:');
for (let y = 500; y < 700; y += 5) {
  const col = cidade.colideCidade(63740, y);
  if (!col) console.log('FREE', 63740, y);
}
console.log('Scan y at x=63720:');
for (let y = 500; y < 700; y += 5) {
  const col = cidade.colideCidade(63720, y);
  if (!col) console.log('FREE', 63720, y);
}
