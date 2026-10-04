// database.js - Gerenciador persistente de progresso individual por ID
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const inventoryMigration = require('./items/migrate-inventories.js');
const fileLock = require('./persistence-lock.js');

const DB_FILE = path.join(__dirname, 'jogadores.json');
const DB_LOCK = path.join(__dirname, 'jogadores.json.lock');

const adquirirLock = () => fileLock.adquirirLock(DB_LOCK);
const liberarLock = fileLock.liberarLock;

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
            return banco;
        }
    } catch (e) {
        console.error("Erro ao ler banco de dados JSON:", e);
        throw e;
    }
}

// Salva o registro completo no arquivo JSON
function salvarTodos(dados) {
    const tmpFile = DB_FILE + '.' + process.pid + '.' + crypto.randomUUID() + '.tmp';
    try {
        const payload = JSON.stringify(dados, null, 2);
        const fd = fs.openSync(tmpFile, 'wx');
        try {
            fs.writeFileSync(fd, payload, 'utf-8');
            fs.fsyncSync(fd);
        } finally {
            fs.closeSync(fd);
        }
        fs.renameSync(tmpFile, DB_FILE);
        return true;
    } catch (e) {
        console.error("Erro ao gravar banco de dados JSON:", e);
        try {
            fs.unlinkSync(tmpFile);
        } catch (cleanupError) {
            if (!cleanupError || cleanupError.code !== 'ENOENT') {
                console.error("Erro ao limpar gravação temporária do banco:", cleanupError);
            }
        }
        throw e;
    }
}

// Recupera os dados individuais de um jogador pelo ID
function carregarProgresso(userId) {
    if (!userId) return null;
    const banco = carregarTodos();
    return Object.prototype.hasOwnProperty.call(banco, userId) ? banco[userId] : null;
}

// Remove definitivamente um registro do banco (usado pela exclusão de personagem)
function removerProgresso(userId) {
    if (!userId) return false;
    const lock = adquirirLock();
    try {
        const banco = carregarTodos();
        if (!Object.prototype.hasOwnProperty.call(banco, userId)) return false;
        delete banco[userId];
        salvarTodos(banco);
        return true;
    } finally {
        liberarLock(lock);
    }
}

// Salva/Atualiza o progresso individual de um ID específico
function salvarProgresso(userId, novosDados) {
    if (!userId) return;
    salvarProgressoEmLote([{ userId: userId, dados: novosDados }]);
}

function salvarProgressoEmLote(atualizacoes) {
    if (!Array.isArray(atualizacoes) || !atualizacoes.length) return true;
    const lock = adquirirLock();
    try {
        const banco = carregarTodos();
        const now = Date.now();
        const updated = Object.assign(Object.create(null), banco);
        for (const entrada of atualizacoes) {
            if (!entrada || !entrada.userId || !entrada.dados || typeof entrada.dados !== 'object') {
                throw new TypeError('Atualização de progresso inválida.');
            }
            const atual = Object.prototype.hasOwnProperty.call(updated, entrada.userId) ? updated[entrada.userId] : {
                level: 1,
                xp: 0,
                classe: 'guerreiro',
                hp: 100,
                x: 61800,
                y: 2000
            };
            updated[entrada.userId] = Object.assign({}, atual, entrada.dados, { ultimoLogin: now });
        }
        salvarTodos(updated);
        return true;
    } finally {
        liberarLock(lock);
    }
}

function migrarIdentidadesItens() {
    const lock = adquirirLock();
    try {
        const banco = carregarTodos();
        const result = inventoryMigration.migrateInventories(banco);
        if (result.stats.migrated > 0) salvarTodos(result.records);
        return result.stats;
    } finally {
        liberarLock(lock);
    }
}

module.exports = {
    carregarProgresso,
    salvarProgresso,
    salvarProgressoEmLote,
    carregarTodos,
    removerProgresso,
    migrarIdentidadesItens
};