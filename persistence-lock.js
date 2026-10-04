// Lock síncrono de arquivo com recuperação de locks de processos encerrados.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function processoAtivo(pid) {
    if (!Number.isSafeInteger(pid) || pid <= 0) return false;
    try {
        process.kill(pid, 0);
        return true;
    } catch (erro) {
        return erro && erro.code === 'EPERM';
    }
}

function removerLockObsoleto(lockPath) {
    let dados;
    let stat;
    try {
        stat = fs.statSync(lockPath);
        dados = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    } catch (erro) {
        if (erro && erro.code === 'ENOENT') return true;
        // Um lock incompleto só pode ser removido depois de um período de graça.
        try {
            stat = stat || fs.statSync(lockPath);
            if (Date.now() - stat.mtimeMs < 5 * 60 * 1000) return false;
        } catch (_) { return true; }
    }

    if (dados && processoAtivo(Number(dados.pid))) return false;
    const tombstone = path.join(path.dirname(lockPath), path.basename(lockPath) + '.stale-' + crypto.randomUUID());
    try {
        fs.renameSync(lockPath, tombstone);
    } catch (erro) {
        if (erro && erro.code === 'ENOENT') return true;
        return false;
    }

    try {
        // Outra instância pode ter substituído o lock entre a leitura e o rename.
        // Se o arquivo movido pertence a um processo vivo, restaure-o se possível.
        let moved;
        try { moved = JSON.parse(fs.readFileSync(tombstone, 'utf8')); } catch (_) { moved = null; }
        if (moved && processoAtivo(Number(moved.pid))) {
            try { fs.linkSync(tombstone, lockPath); } catch (_) {}
            return false;
        }
        return true;
    } finally {
        try { fs.unlinkSync(tombstone); } catch (erro) { if (!erro || erro.code !== 'ENOENT') throw erro; }
    }
}

function adquirirLock(lockPath) {
    for (let tentativa = 0; tentativa < 3; tentativa++) {
        const token = crypto.randomUUID();
        let fd;
        try {
            fd = fs.openSync(lockPath, 'wx', 0o600);
            fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, createdAt: Date.now(), token }), 'utf8');
            fs.fsyncSync(fd);
            return { fd, lockPath, token };
        } catch (erro) {
            if (fd !== undefined) {
                try { fs.closeSync(fd); } catch (_) {}
                try {
                    const atual = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
                    if (atual.token === token) fs.unlinkSync(lockPath);
                } catch (_) {}
            }
            if (!erro || erro.code !== 'EEXIST') throw erro;
            if (!removerLockObsoleto(lockPath)) {
                throw new Error('Banco de dados ocupado por outra gravação; operação não foi aplicada.');
            }
        }
    }
    throw new Error('Não foi possível adquirir o lock do banco de dados.');
}

function liberarLock(lock) {
    if (!lock) return;
    try {
        if (lock.fd !== undefined) fs.closeSync(lock.fd);
    } finally {
        try {
            const atual = JSON.parse(fs.readFileSync(lock.lockPath, 'utf8'));
            if (atual.token === lock.token) fs.unlinkSync(lock.lockPath);
        } catch (erro) {
            if (!erro || erro.code !== 'ENOENT') throw erro;
        }
    }
}

module.exports = { adquirirLock, liberarLock, processoAtivo };
