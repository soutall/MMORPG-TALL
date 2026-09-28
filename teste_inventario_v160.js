const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log("=== INICIANDO TESTE DO NOVO INVENTÁRIO (v1.60.1) ===");

// 1. Ler index.html
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8');

// Validar versão v1.60.1 nos 3 lugares
assert(html.includes('<div class="game-version-display">v1.60.1</div>'), "Versão v1.60.1 deve estar na tela de login");
assert(html.includes('<div id="hud-version" class="game-version-display">v1.60.1</div>'), "Versão v1.60.1 deve estar no HUD");
assert(html.includes("const GAME_VERSION = 'v1.60.1';"), "GAME_VERSION deve ser v1.60.1 no script");
console.log("✔ Versão v1.60.1 validada nos 3 pontos visuais e de código");

// Validar tags de cache-bust
assert(html.includes('inventario.css?v=160'), "inventario.css deve ter cache-bust v=160");
assert(html.includes('inventario.js?v=160'), "inventario.js deve ter cache-bust v=160");
console.log("✔ Cache bust v=160 validado nos assets");

// Validar elementos do DOM do inventário
const IDs_ESPERADOS = [
    'inventory-screen', 'inv-window', 'inv-title', 'btn-inv-fechar',
    'inv-layout-duplo', 'inv-col-esquerda', 'equip-body', 'inv-painel-inspecao',
    'inv-info', 'inv-comparacao', 'inv-divisor-vertical', 'inv-col-direita',
    'inv-mochila-linha', 'mochila-abas', 'mochila-grade-container', 'mochila-grade',
    'inv-botoes', 'btn-inv-organizar', 'btn-inv-destruir', 'btn-inv-bloquear'
];
IDs_ESPERADOS.forEach(id => {
    assert(html.includes(`id="${id}"`), `Elemento id="${id}" deve existir no HTML`);
});
console.log("✔ Todos os 20 elementos principais de ID do inventário estão presentes no HTML");

// Validar os 9 slots de equipamentos no HTML
const SLOTS = ['capacete', 'colar', 'capa', 'arma', 'peitoral', 'armaSecundaria', 'luva', 'anel', 'bota'];
SLOTS.forEach(slot => {
    assert(html.includes(`data-slot="${slot}"`), `Slot data-slot="${slot}" deve existir no HTML`);
});
console.log("✔ Todos os 9 slots de equipamentos estão presentes com data-slot");

// Validar as 5 abas verticais da mochila
const ABAS = ['todos', 'consumiveis', 'itens', 'equipamentos', 'pedras'];
ABAS.forEach(aba => {
    assert(html.includes(`data-aba="${aba}"`), `Aba data-aba="${aba}" deve existir no HTML`);
});
console.log("✔ Todas as 5 abas da mochila estão presentes com data-aba");

// 2. Ler inventario.css
const css = fs.readFileSync(path.join(__dirname, 'inventario.css'), 'utf-8');

// Validar regras de formatação de status: Nome Branco, Números Dourado
assert(css.includes('.inv-stats-vertical'), "CSS deve conter .inv-stats-vertical");
assert(css.includes('.stat-linha'), "CSS deve conter .stat-linha");
assert(css.includes('.stat-nome'), "CSS deve conter .stat-nome");
assert(css.includes('.stat-val'), "CSS deve conter .stat-val");
assert(css.includes('#ffffff') || css.includes('#fff'), "stat-nome deve conter cor branca");
assert(css.includes('#f1c40f'), "stat-val deve conter cor dourada");

// Validar layout duplo e abas verticais
assert(css.includes('#inv-layout-duplo'), "CSS deve conter #inv-layout-duplo");
assert(css.includes('#mochila-abas'), "CSS deve conter #mochila-abas");
assert(css.includes('flex-direction: column'), "mochila-abas ou colunas devem ter flex-direction column");

// Validar janela de comparação interna
assert(css.includes('#inv-comparacao'), "CSS deve conter #inv-comparacao");
assert(css.includes('.cmp-bloco'), "CSS deve conter .cmp-bloco");
assert(css.includes('.cmp-melhor'), "CSS deve conter .cmp-melhor");
assert(css.includes('.cmp-pior'), "CSS deve conter .cmp-pior");
assert(css.includes('.cmp-igual'), "CSS deve conter .cmp-igual");

// Validar responsividade mobile
assert(css.includes('@media (max-width: 520px)'), "CSS deve conter media query para mobile");
console.log("✔ inventario.css validado com regras de status verticais dourados, layout e responsividade");

// 3. Teste de Execução de Funções do inventario.js em ambiente Node
// Criar mock do DOM
global.window = {
    inventario: {
        capacete: null, peitoral: null, arma: null, armaSecundaria: null,
        colar: null, anel: null, capa: null, bota: null, luva: null
    },
    mochila: [],
    minhaClasse: 'guerreiro'
};
global.document = {
    getElementById: function(id) {
        if (!this._elements) this._elements = {};
        if (!this._elements[id]) {
            this._elements[id] = {
                id: id,
                style: {},
                classList: {
                    add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false
                },
                innerHTML: '',
                innerText: '',
                setAttribute: () => {},
                getAttribute: () => null,
                appendChild: () => {},
                addEventListener: () => {},
                querySelector: () => null,
                querySelectorAll: () => []
            };
        }
        return this._elements[id];
    },
    querySelectorAll: function() { return []; }
};

// Carregar e avaliar inventario.js
const invJsContent = fs.readFileSync(path.join(__dirname, 'inventario.js'), 'utf-8');
// Executar o script
eval(invJsContent);

// Testar formatarStatsVertical diretamente
const statsExemplo = { forca: 15, agilidade: 12, destreza: 8 };
const htmlStats = formatarStatsVertical(statsExemplo);
console.log("\nHTML Gerado para Status Verticais:\n" + htmlStats);

assert(htmlStats.includes('inv-stats-vertical'), "Deve conter o container inv-stats-vertical");
assert(htmlStats.includes('<span class="stat-nome">Força :</span>'), "Nome Força deve ser exibido com :");
assert(htmlStats.includes('<span class="stat-val">+15</span>'), "Valor de Força deve ser +15");
assert(htmlStats.includes('<span class="stat-nome">Agilidade :</span>'), "Nome Agilidade deve ser exibido com :");
assert(htmlStats.includes('<span class="stat-val">+12</span>'), "Valor de Agilidade deve ser +12");
assert(htmlStats.includes('<span class="stat-nome">Destreza :</span>'), "Nome Destreza deve ser exibido com :");
assert(htmlStats.includes('<span class="stat-val">+8</span>'), "Valor de Destreza deve ser +8");
console.log("✔ formatarStatsVertical formatou com sucesso os 3 atributos com Nome Branco e Valor Dourado");

// Testar selecionarItemMochila com item de equipamento
const itemMochila = {
    id: 101,
    nome: "Capa Lendária do Vento",
    icon: "🧥",
    tipo: "equipamento",
    slot: "capa",
    raridade: "lendario",
    raridadeNome: "LENDÁRIO",
    classe: "guerreiro",
    quantidade: 1,
    upgrade: 3,
    status: { agilidade: 9, inteligencia: 6, destreza: 6, vida: 8 }
};

selecionarItemMochila(itemMochila);
const infoElem = document.getElementById("inv-info");
assert(infoElem.innerHTML.includes("Capa Lendária do Vento"), "inv-info deve conter nome do item");
assert(infoElem.innerHTML.includes("Agilidade :"), "inv-info deve conter Agilidade :");
assert(infoElem.innerHTML.includes("+9"), "inv-info deve conter +9");
assert(infoElem.innerHTML.includes("Vida :"), "inv-info deve conter Vida :");
assert(infoElem.innerHTML.includes("+8"), "inv-info deve conter +8");
console.log("✔ selecionarItemMochila exibiu corretamente o card do item com status verticais");

// Testar comparação quando há item equipado no mesmo slot
window.inventario.capa = {
    id: 99,
    nome: "Capa Antiga",
    icon: "🧥",
    tipo: "equipamento",
    slot: "capa",
    raridade: "raro",
    raridadeNome: "RARO",
    status: { agilidade: 5, inteligencia: 4, destreza: 10, vida: 8 }
};

selecionarItemMochila(itemMochila);
const cmpElem = document.getElementById("inv-comparacao");
assert.strictEqual(cmpElem.style.display, "block", "inv-comparacao deve ficar visível");
assert(cmpElem.innerHTML.includes("COMPARAÇÃO"), "inv-comparacao deve ter cabeçalho de comparação");
assert(cmpElem.innerHTML.includes("Capa Antiga"), "inv-comparacao deve mostrar item equipado");
assert(cmpElem.innerHTML.includes("Capa Lendária do Vento"), "inv-comparacao deve mostrar item novo");
assert(cmpElem.innerHTML.includes("cmp-melhor"), "Diferenças positivas devem ter classe cmp-melhor");
assert(cmpElem.innerHTML.includes("cmp-pior"), "Diferenças negativas devem ter classe cmp-pior");
assert(cmpElem.innerHTML.includes("cmp-igual"), "Valores iguais devem ter classe cmp-igual");
console.log("✔ renderizarComparacao funcionou perfeitamente e gerou as linhas comparativas");

console.log("\n========================================================");
console.log("🎉 TODOS OS 15 TESTES DO NOVO INVENTÁRIO FORAM APROVADOS COM SUCESSO!");
console.log("========================================================\n");
