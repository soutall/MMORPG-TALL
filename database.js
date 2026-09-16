// database.js - Gerenciador persistente de progresso individual por ID
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'jogadores.json');

// Carrega todos os jogadores salvos em disco
function carregarTodos() {
    try {
        if (!fs.existsSync(DB_FILE)) {
            fs.writeFileSync(DB_FILE, JSON.stringify({}, null, 2), 'utf-8');
            return {};
        }
        const conteudo = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(conteudo || '{}');
    } catch (e) {
        console.error("Erro ao ler banco de dados JSON:", e);
        return {};
    }
}

// Salva o registro completo no arquivo JSON
function salvarTodos(dados) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(dados, null, 2), 'utf-8');
    } catch (e) {
        console.error("Erro ao gravar banco de dados JSON:", e);
    }
}

// Recupera os dados individuais de um jogador pelo ID
function carregarProgresso(userId) {
    if (!userId) return null;
    const banco = carregarTodos();
    return banco[userId] || null;
}

// Salva/Atualiza o progresso individual de um ID específico
function salvarProgresso(userId, novosDados) {
    if (!userId) return;
    const banco = carregarTodos();
    const atual = banco[userId] || {
        level: 1,
        xp: 0,
        classe: 'guerreiro',
        hp: 100,
        x: 61800,
        y: 2000
    };

    banco[userId] = {
        ...atual,
        ...novosDados,
        ultimoLogin: Date.now()
    };

    salvarTodos(banco);
}

module.exports = {
    carregarProgresso,
    salvarProgresso
};
