// Teste automatizado para validar a reconstrução completa da Florim v2.0
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

console.log('🧪 Iniciando testes de validação da Florim v2.0...');

// 1. Validar sintaxe dos arquivos alterados
const arquivos = [
    'server.js',
    'skills.js',
    'personagens-historias.js',
    'classes/florim.js',
    'efeitos/florim_efeitos.js'
];

arquivos.forEach(arq => {
    const conteudo = fs.readFileSync(arq, 'utf8');
    assert.doesNotThrow(() => {
        new vm.Script(conteudo);
    }, `Erro de sintaxe em ${arq}`);
    console.log(`✅ Sintaxe OK: ${arq}`);
});

// 2. Validar skills.js
const skillsCode = fs.readFileSync('skills.js', 'utf8');
const contextSkills = {
    window: {},
    console: console,
    document: {
        getElementById: () => null,
        querySelector: () => null,
        querySelectorAll: () => []
    }
};
vm.createContext(contextSkills);
vm.runInContext(skillsCode, contextSkills);
const skillsFlorim = vm.runInContext('typeof SKILLS_INFO !== "undefined" ? SKILLS_INFO.florim : null', contextSkills);
assert(Array.isArray(skillsFlorim), 'SKILLS_INFO.florim deve ser um array');
assert.strictEqual(skillsFlorim.length, 5, 'Florim deve ter 5 skills (4 ativas + 1 passiva)');

const skillIds = skillsFlorim.map(s => s.id);
assert.strictEqual(skillIds.join(','), 'arvore,semente,espinhos,parede,aura_florescente', 'IDs das skills incorretos');

// Validar Skill 2 (Semente) e Skill 3 (Espinhos)
const semente = skillsFlorim.find(s => s.id === 'semente');
assert(semente.desc.includes('5s') || semente.extras.some(e => e.includes('5s')), 'Skill 2 deve indicar 5s de Planta Carnívora');

const espinhos = skillsFlorim.find(s => s.id === 'espinhos');
assert.strictEqual(espinhos.cd, 13, 'Skill 3 deve ter CD de 13 segundos');

console.log('✅ skills.js validado com sucesso (5 skills, IDs e valores corretos)');

// 3. Validar index.html
const indexHtml = fs.readFileSync('index.html', 'utf8');
assert(indexHtml.includes('btn-florim-arvore'), 'Botão da árvore não encontrado no index.html');
assert(indexHtml.includes('btn-florim-semente'), 'Botão da semente não encontrado no index.html');
assert(indexHtml.includes('btn-florim-espinhos'), 'Botão de espinhos não encontrado no index.html');
assert(indexHtml.includes('btn-florim-parede'), 'Botão da parede não encontrado no index.html');
assert(indexHtml.includes('v1.67.2'), 'Versão v1.67.2 deve constar no index.html');
assert(indexHtml.includes('ativarArvoreFlorimSmartCast'), 'SmartCast da árvore ausente no index.html');
assert(indexHtml.includes('ativarSementeFlorimSmartCast'), 'SmartCast da semente ausente no index.html');
assert(indexHtml.includes('ativarEspinhosFlorimSmartCast'), 'SmartCast de espinhos ausente no index.html');
assert(indexHtml.includes('ativarParedeFlorimSmartCast'), 'SmartCast da parede ausente no index.html');

console.log('✅ index.html validado com sucesso (botões de ação e versão)');

// 4. Validar server.js coleções e handlers
const serverCode = fs.readFileSync('server.js', 'utf8');
assert(serverCode.includes('florimArvores'), 'server.js deve conter florimArvores');
assert(serverCode.includes('florimSementes'), 'server.js deve conter florimSementes');
assert(serverCode.includes('florimEspinhos'), 'server.js deve conter florimEspinhos');
assert(serverCode.includes('florimParedes'), 'server.js deve conter florimParedes');
assert(serverCode.includes("data.action === 'florim_arvore'"), 'Handler florim_arvore ausente no server.js');
assert(serverCode.includes("data.action === 'florim_semente'"), 'Handler florim_semente ausente no server.js');
assert(serverCode.includes("data.action === 'florim_espinhos'"), 'Handler florim_espinhos ausente no server.js');
assert(serverCode.includes("data.action === 'florim_parede'"), 'Handler florim_parede ausente no server.js');

console.log('✅ server.js validado com sucesso (coleções e handlers das 4 skills)');

console.log('\n🎉 TODOS OS TESTES DA FLORIM V2.0 PASSARAM COM SUCESSO!');
