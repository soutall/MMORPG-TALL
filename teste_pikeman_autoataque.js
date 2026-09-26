// teste_pikeman_autoataque.js
// Teste automatizado para validar o auto ataque mais lento (520ms, +30%)
// e o bloqueio de auto ataque durante animações de skills do Pikeman.

const assert = require('assert');
const fs = require('fs');

console.log('--- TESTE: PIKEMAN AUTO-ATAQUE E BLOQUEIO DE ANIMAÇÃO ---');

// 1. Verificar server.js
const serverCode = fs.readFileSync('server.js', 'utf8');

// Verifica tempoBaseAtaqueBasico para pikeman
assert(serverCode.includes("if (p.classe === 'pikeman') return 520;"), 'server.js deve ter tempo base de 520ms para pikeman');
console.log('✅ server.js: tempoBaseAtaqueBasico(pikeman) == 520ms (+30% mais lento)');

// Verifica checagem de pikemanSkillAte em ataque_pikeman
assert(serverCode.includes("if (players[playerId] && players[playerId].pikemanSkillAte && agora < players[playerId].pikemanSkillAte) return;"), 'server.js deve rejeitar ataque_pikeman durante pikemanSkillAte');
console.log('✅ server.js: ataque_pikeman bloqueado durante pikemanSkillAte');

// Verifica se pikemanSkillAte é definido nas skills
assert(serverCode.includes("pk.pikemanSkillAte = Date.now() + 1200;"), 'server.js deve definir pikemanSkillAte no giro (1200ms)');
assert(serverCode.includes("pk.pikemanSkillAte = Date.now() + 860;"), 'server.js deve definir pikemanSkillAte na pirueta (860ms)');
assert(serverCode.includes("pk.pikemanSkillAte = Date.now() + 650;"), 'server.js deve definir pikemanSkillAte na geada (650ms)');
assert(serverCode.includes("pk.pikemanSkillAte = Date.now() + 3600;"), 'server.js deve definir pikemanSkillAte na execucao (3600ms)');
console.log('✅ server.js: pikemanSkillAte configurado para giro, pirueta, geada e execucao');

// 2. Verificar index.html
const indexCode = fs.readFileSync('index.html', 'utf8');

// Verifica baseAtaqueBasicoLocal para pikeman
assert(indexCode.includes("if (c === 'pikeman') return 520;"), 'index.html deve ter baseAtaqueBasicoLocal de 520ms para pikeman');
console.log('✅ index.html: baseAtaqueBasicoLocal(pikeman) == 520ms (+30% mais lento)');

// Verifica bloqueio em atualizarAutoAtaque
assert(indexCode.includes("window.minhaClasse === 'pikeman' && typeof window.pikemanEmAnimacaoSkill === 'function' && window.pikemanEmAnimacaoSkill(window.meuId)"), 'index.html deve bloquear auto ataque durante animações de skill do Pikeman');
console.log('✅ index.html: atualizarAutoAtaque bloqueia Pikeman durante animacao de skill');

// Verifica bloqueio em enviarAtaquePikeman
assert(indexCode.includes("if (typeof window.pikemanEmAnimacaoSkill === 'function' && window.pikemanEmAnimacaoSkill(window.meuId)) return;"), 'index.html deve bloquear enviarAtaquePikeman durante animações de skill do Pikeman');
assert(indexCode.includes("registrarPikemanAnim(window.meuId, 'foice', 420)"), 'index.html foice anim deve ser 420ms (+31%)');
console.log('✅ index.html: enviarAtaquePikeman bloqueia durante skill e escala foice para 420ms');

// 3. Simular lógica de pikeman.js
// Mock window environment
global.window = { meuId: 'player1' };
global.Date = Date;
global.performance = { now: () => Date.now() };

eval(fs.readFileSync('classes/pikeman.js', 'utf8'));

assert(typeof window.pikemanEmAnimacaoSkill === 'function', 'pikemanEmAnimacaoSkill deve existir');
assert.strictEqual(window.pikemanEmAnimacaoSkill('player1'), false, 'Sem animação deve retornar false');

// Teste com giro
window.registrarPikemanAnim('player1', 'giro', 1200);
assert.strictEqual(window.pikemanEstadoLocal.giroAtivo, true, 'giroAtivo deve ser true');
assert.strictEqual(window.pikemanEmAnimacaoSkill('player1'), true, 'Com giro ativo deve retornar true');

// Teste reset com idle
window.registrarPikemanAnim('player1', 'idle', 1);
assert.strictEqual(window.pikemanEstadoLocal.giroAtivo, false, 'giroAtivo deve ser false após idle');
assert.strictEqual(window.pikemanEmAnimacaoSkill('player1'), false, 'Após idle deve retornar false');

// Teste com pirueta
window.registrarPikemanAnim('player1', 'pirueta', 860);
assert.strictEqual(window.pikemanEstadoLocal.piruetaAtiva, true, 'piruetaAtiva deve ser true');
assert.strictEqual(window.pikemanEmAnimacaoSkill('player1'), true, 'Com pirueta ativa deve retornar true');
window.registrarPikemanAnim('player1', 'idle', 1);

// Teste com geada
window.registrarPikemanAnim('player1', 'geada', 650);
assert.strictEqual(window.pikemanEstadoLocal.geadaAtiva, true, 'geadaAtiva deve ser true');
assert.strictEqual(window.pikemanEmAnimacaoSkill('player1'), true, 'Com geada ativa deve retornar true');
window.registrarPikemanAnim('player1', 'idle', 1);

// Teste com execucao
window.registrarPikemanAnim('player1', 'execucao', 3000);
assert.strictEqual(window.pikemanEstadoLocal.execucaoAtiva, true, 'execucaoAtiva deve ser true');
assert.strictEqual(window.pikemanEmAnimacaoSkill('player1'), true, 'Com execucao ativa deve retornar true');
window.registrarPikemanAnim('player1', 'idle', 1);
assert.strictEqual(window.pikemanEstadoLocal.execucaoAtiva, false, 'execucaoAtiva deve ser false após idle');
assert.strictEqual(window.pikemanEmAnimacaoSkill('player1'), false, 'Após idle deve retornar false');

console.log('✅ classes/pikeman.js: pikemanEmAnimacaoSkill e pikemanEstadoLocal funcionam perfeitamente para todas as skills');

console.log('--- TODOS OS TESTES PASSARAM COM SUCESSO! ---');
