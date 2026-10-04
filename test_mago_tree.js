const sut = require('./skill_upgrade_tree.js');

console.log('--- TESTE DA ÁRVORE DE UPGRADES DO MAGO ---');

const skills = sut.obterSkillsParticipantes('mago');
console.log('1. Skills participantes:', skills);
if (skills.length !== 4) throw new Error('Esperado 4 skills para Mago');

const expectedSkills = ['meteoro', 'nevasca', 'vulcao', 'bola_elemental'];
for (const s of expectedSkills) {
    if (!skills.includes(s)) throw new Error('Skill faltando: ' + s);
}

// Testar cada skill e seus 4 tiers A e B
for (const s of expectedSkills) {
    for (let t = 1; t <= 4; t++) {
        const arvore = sut.SKILL_UPGRADE_TREES.mago[s].tiers[t];
        if (!arvore) throw new Error(`Tier ${t} faltando em ${s}`);
        if (!arvore.A || !arvore.B) throw new Error(`Escolha A ou B faltando em ${s} Tier ${t}`);
        if (!arvore.A.id || !arvore.A.nome || !arvore.A.desc) throw new Error(`A incompleto em ${s} T${t}`);
        if (!arvore.B.id || !arvore.B.nome || !arvore.B.desc) throw new Error(`B incompleto em ${s} T${t}`);
    }
}
console.log('2. Todas as 32 opções (4 skills x 4 tiers x 2 branches) verificadas com sucesso!');

// Testar validação de compra no servidor
// Nível 10 compra Tier 1 A de meteoro
let upg = {};
let val = sut.validarCompraUpgrade('mago', 'meteoro', 1, 'A', 10, upg);
if (!val.valido) throw new Error('Falha ao validar T1 A: ' + val.motivo);

upg = sut.aplicarCompraUpgrade(upg, 'meteoro', 1, 'A');
if (!sut.temUpgrade(upg, 'meteoro', 1, 'A')) throw new Error('temUpgrade retornou false para T1 A');
if (sut.temUpgrade(upg, 'meteoro', 1, 'B')) throw new Error('temUpgrade retornou true para T1 B!');

// Tentar comprar Tier 2 sem nível 20
val = sut.validarCompraUpgrade('mago', 'meteoro', 2, 'A', 15, upg);
if (val.valido) throw new Error('Deveria falhar por nível insuficiente');

// Com nível 20
val = sut.validarCompraUpgrade('mago', 'meteoro', 2, 'A', 20, upg);
if (!val.valido) throw new Error('Falha ao validar T2 A com Nv 20: ' + val.motivo);

console.log('3. Validação Server-Authoritative e Aplicação de Upgrades testada com sucesso!');

// Testar visão cliente (Enigma / Progressive revelation)
const visao = sut.gerarVisaoCliente('mago', 'meteoro', 25, upg);
if (visao.tiers.length !== 4) throw new Error('Visão cliente deve retornar 4 tiers');
if (visao.tiers[0].status !== 'adquirido') throw new Error('T1 deve estar adquirido');
if (visao.tiers[1].status !== 'disponivel') throw new Error('T2 deve estar disponivel');
if (!visao.tiers[2].oculto) throw new Error('T3 deve estar oculto (Enigma)');
if (!visao.tiers[3].oculto) throw new Error('T4 deve estar oculto (Enigma)');

console.log('4. Visão do Cliente com Progressive Revelation / Enigma 100% correta!');
console.log('--- TODOS OS TESTES PASSARAM COM SUCESSO! ---');
