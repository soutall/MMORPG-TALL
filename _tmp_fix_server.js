const fs = require('fs');
let s = fs.readFileSync('server.js', 'utf8');
const changed = s.replace(/^[ ]{5,}if \(x < FIM_CIDADE\) \{/m, '    if (x < FIM_CIDADE) {');
fs.writeFileSync('server.js', changed);
console.log('podeAndar fix changed:', changed !== s);
// sanity: show the cidade block
const idx = changed.indexOf('if (x < FIM_ARENA)');
console.log('--- snippet ---\n' + changed.slice(idx - 160, idx + 120));
