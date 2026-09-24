const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'banco_itens.json');

// Estrutura: { classe1: [item1, item2], classe2: [item3] } ou array global?
// O usuário pediu: "criar um Banco de dados de itens de cada classe. Arma Primaria... Todos itens que dropar no game... Quando o Forjador criar um Item, este item com esse status sera adicionado tem tempo REAL no banco de dados dos itens."
// Vamos guardar como um array global de itens customizados, pois cada item terá sua `classeRestrita` e `slot`.

function carregarItens() {
    try {
        if (!fs.existsSync(DB_FILE)) {
            fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2), 'utf-8');
            return [];
        }
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    } catch (e) {
        console.error("Erro ao carregar banco_itens.json:", e);
        return [];
    }
}

function salvarItens(itens) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(itens, null, 2), 'utf-8');
    } catch (e) {
        console.error("Erro ao salvar banco_itens.json:", e);
    }
}

function adicionarItem(item) {
    let itens = carregarItens();
    itens.push(item);
    salvarItens(itens);
}

module.exports = {
    carregarItens,
    adicionarItem
};
