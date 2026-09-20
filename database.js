// database.js - Gerenciador persistente de progresso individual por ID
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'jogadores.json');
const DB_TMP = path.join(__dirname, 'jogadores.json.tmp');

// v1.30.3: reparo automático de corrupção leve — vírgula final/sobrando no objeto
// raiz (padrão visto quando dois processos gravam o arquivo perto de uma leitura).
function repararJsonFragil(texto) {
    let t = texto;
    // vírgula antes do fechamento do objeto raiz (e.g. "},\n\n}" ou ",\n}")
    t = t.replace(/,\s*\}\s*$/, '}');
    return t;
}

// Carrega todos os jogadores salvos em disco
function carregarTodos() {
    try {
        if (!fs.existsSync(DB_FILE)) {
            fs.writeFileSync(DB_FILE, JSON.stringify({}, null, 2), 'utf-8');
            return {};
        }
        const conteudo = fs.readFileSync(DB_FILE, 'utf-8');
        try {
            return JSON.parse(conteudo || '{}');
        } catch (e) {
            console.error("Banco de dados com JSON inválido, tentando reparo leve:", e.message);
            const reparado = repararJsonFragil(conteudo || '{}');
            const banco = JSON.parse(reparado); // se falhar de novo, sobe o erro do try externo
            console.log("Reparo leve aplicado (vírgula residual). Jogadores: " + Object.keys(banco).length);
            salvarTodos(banco);
            return banco;
        }
    } catch (e) {
        console.error("Erro ao ler banco de dados JSON:", e);
        return {};
    }
}

// Salva o registro completo no arquivo JSON
function salvarTodos(dados) {
    try {
        const payload = JSON.stringify(dados, null, 2);
        // v1.30.3: gravação ATÔMICA (tmp + rename) — evita corrupção quando dois
        // processos gravam o arquivo ao mesmo tempo (ex.: teste E2E + save do jogo):
        // o rename substitui o arquivo inteiro de uma vez (vencedor leva tudo).
        fs.writeFileSync(DB_TMP, payload, 'utf-8');
        fs.renameSync(DB_TMP, DB_FILE);
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