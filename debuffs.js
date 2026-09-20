// ============================================================
// SISTEMA DE DEBUFFS/BUFFS (efeito de status em jogadores e mobs)
// Módulo puro: estado é um array `efeitos` em cada entidade.
//   efeito = { id, tempo, intensidade }
//   id único por categoria; reaplicar renova + soma intensidade.
// ============================================================

const EFEITOS = {
    // ===== DEBUFFS =====
    stun:       { nome: 'Atordoado',     classe: 'debuff', icon: '⚡', cor: '#f1c40f', desc: 'Não pode agir nem se mover.', formato: (ef) => '' + ef.tempo },
    lentidao:   { nome: 'Lentidão',      classe: 'debuff', icon: '🐌', cor: '#00ffff', desc: 'Velocidade de movimento reduzida em 50%.', formato: (ef) => '' + ef.tempo },
    paralisia:  { nome: 'Paralisia',     classe: 'debuff', icon: '⛓️', cor: '#9b59b6', desc: 'Não pode se mover (skills ainda sim).', formato: (ef) => '' + ef.tempo },
    sono:       { nome: 'Sono',          classe: 'debuff', icon: '💤', cor: '#5d6d7e', desc: 'Não pode agir nem se mover. Qualquer dano acorda.', formato: (ef) => '' + ef.tempo },
    cortaCura:  { nome: 'Corta-cura',    classe: 'debuff', icon: '🩹', cor: '#c0392b', desc: 'Cura recebida reduzida em 50%.', formato: (ef) => ('' + Math.round(ef.intensidade * 100) + '%') },
    reducaoDef: { nome: 'Defesa Quebrada', classe: 'debuff', icon: '🥀', cor: '#8e44ad', desc: 'Dano recebido aumentado em 25%.', formato: (ef) => ('' + Math.round(ef.intensidade * 100) + '%') },
    reducaoAtk: { nome: 'Enfraquecido',  classe: 'debuff', icon: '💪', cor: '#e67e22', desc: 'Dano causado reduzido em 25%.', formato: (ef) => ('' + Math.round(ef.intensidade * 100) + '%') },
    veneno:     { nome: 'Envenenado',    classe: 'debuff', icon: '☠️', cor: '#2ecc71', desc: 'Recebe dano ao longo do tempo (água venenosa do pântano).', formato: (ef) => ('' + Math.round(ef.tempo)) },
    sangramento:{ nome: 'Sangramento',   classe: 'debuff', icon: '🩸', cor: '#c0392b', desc: 'Perde vida ao longo do tempo por ferimentos profundos.', formato: (ef) => ('' + Math.round(ef.tempo)) },
    cegueira:   { nome: 'Cego(a)',        classe: 'debuff', icon: '👁️‍🗨️', cor: '#2ecc71', desc: 'Névoa venenosa! Ataques normais erram (magia ainda acerta).', formato: (ef) => ('' + Math.ceil((ef.tempo || 0) / 20) + 's') },
    queimadura: { nome: 'Queimadura',    classe: 'debuff', icon: '🔥', cor: '#e74c3c', desc: 'Queimando! Recebe dano de fogo ao longo do tempo.', formato: (ef) => ('' + Math.round(ef.tempo)) },
    gelo:       { nome: 'Congelado',     classe: 'debuff', icon: '🧊', cor: '#00cfff', desc: 'Congelado! Velocidade reduzida e vulnerável a reações elementais.', formato: (ef) => ('' + Math.round(ef.tempo)) },
    congelado:  { nome: 'Congelado',     classe: 'debuff', icon: '🧊', cor: '#00e5ff', desc: 'Congelado por completo! Não pode agir nem se mover.', formato: (ef) => ('' + Math.ceil((ef.tempo || 0) / 20) + 's') },
    rede:       { nome: 'Arame Prendedor', classe: 'debuff', icon: '🕸️', cor: '#95a5a6', desc: 'Preso pelo arame do Sniper! Não pode se mover.', formato: (ef) => ('' + Math.ceil((ef.tempo || 0) / 20) + 's') },
    queimaduraCongelante: { nome: 'Queimadura Congelante', classe: 'debuff', icon: '💠', cor: '#b266ff', desc: 'Dano contínuo extremo de fogo e gelo combinados.', formato: (ef) => ('' + Math.round(ef.tempo)) },

    // ===== BUFFS =====
    furia:      { nome: 'Fúria Berserker', classe: 'buff', icon: '🩸', cor: '#e74c3c', desc: 'Lifesteal e dano aumentado durante a fúria.', formato: (ef) => ('' + Math.ceil((ef.tempo || 0) / 20) + 's') },
    escudo:     { nome: 'Escudo',        classe: 'buff',   icon: '🛡️', cor: '#2ecc71', desc: 'Dano recebido reduzido em 20%.', formato: (ef) => ('' + Math.round(ef.intensidade * 100) + '%') },
    fogo:       { nome: 'Ardente',       classe: 'buff',   icon: '🔥', cor: '#e74c3c', desc: 'Causa dano extra '+ 'por tick.', formato: (ef) => ('' + Math.round(ef.intensidade) + '/tick') },
    fervor:     { nome: 'Fervor',        classe: 'buff',   icon: '💢', cor: '#e74c3c', desc: 'Dano causado aumentado em 25%.', formato: (ef) => ('' + Math.round(ef.intensidade * 100) + '%') },
    velocidade: { nome: 'Velocidade',    classe: 'buff',   icon: '💨', cor: '#00bcd4', desc: 'Velocidade de movimento aumentada em 50%.', formato: (ef) => ('' + Math.round(ef.intensidade * 100) + '%') },
    gritoDeGuerra: { nome: 'Grito de Guerra', classe: 'buff', icon: '📣', cor: '#f1c40f', desc: 'Crítico maior, velocidade de ataque aumentada e vida máxima ampliada.', formato: (ef) => ('' + Math.ceil((ef.tempo || 0) / 20) + 's') },
    sedento:    { nome: 'Sede de Sangue', classe: 'buff',  icon: '🩸', cor: '#ff4757', desc: 'Cura uma fração do dano causado.', formato: () => '' },
    invisivel:  { nome: 'Camuflagem Sombria', classe: 'buff', icon: '🌑', cor: '#9b59b6', desc: 'Invisível! Inimigos não atacam (perdem o alvo). O primeiro dano causado é dobrado. Ataques ativos quebram a invisibilidade.', formato: (ef) => ('' + Math.ceil((ef.tempo || 0) / 20) + 's') },
    camuflagem: { nome: 'Camuflagem',    classe: 'buff',   icon: '🌿', cor: '#27ae60', desc: 'Escondido no mato! Inimigos não atacam. Dura enquanto estiver na moita (o primeiro tiro quebra).', formato: () => '∞' }
};

// Aplica um efeito (id) numa entidade. `tempo` em ticks de 50ms.
// `intensidade` entre 0 e 1 (proporção) ou valor bruto p/ dano por tick.
function aplicarEfeito(entidade, id, tempo, intensidade) {
    if (!entidade || !EFEITOS[id]) return false;
    if (!Array.isArray(entidade.efeitos)) entidade.efeitos = [];
    let ef = entidade.efeitos.find(e => e.id === id);
    if (ef) {
        ef.tempo = Math.max(ef.tempo || 0, Math.floor(tempo || 0));
        if (intensidade !== undefined) ef.intensidade = intensidade;
    } else {
        entidade.efeitos.push({ id: id, tempo: Math.floor(tempo || 0), intensidade: intensidade !== undefined ? intensidade : 1 });
    }
    return true;
}

// Decrementa os timers e remove efeitos expirados. Retorna true se algo mudou.
function atualizarEfeitos(entidade) {
    if (!entidade || !Array.isArray(entidade.efeitos)) return false;
    let mudou = false;
    for (let i = entidade.efeitos.length - 1; i >= 0; i--) {
        let ef = entidade.efeitos[i];
        ef.tempo = (ef.tempo || 0) - 1;
        if (ef.tempo <= 0) {
            entidade.efeitos.splice(i, 1);
            mudou = true;
        }
    }
    return mudou;
}

function temEfeito(entidade, id) {
    if (!entidade || !Array.isArray(entidade.efeitos)) return false;
    return entidade.efeitos.some(e => e.id === id && e.tempo > 0);
}

function pegarEfeito(entidade, id) {
    if (!entidade || !Array.isArray(entidade.efeitos)) return null;
    return entidade.efeitos.find(e => e.id === id && e.tempo > 0) || null;
}

// Remove um efeito imediato (usado quando o dano acorda quem está dormindo)
function removerEfeito(entidade, id) {
    if (!entidade || !Array.isArray(entidade.efeitos)) return false;
    let ini = entidade.efeitos.length;
    entidade.efeitos = entidade.efeitos.filter(e => e.id !== id);
    return entidade.efeitos.length !== ini;
}

function exporEfeitos(entidade) {
    if (!entidade || !Array.isArray(entidade.efeitos)) return [];
    return entidade.efeitos.map(e => {
        const meta = EFEITOS[e.id] || {};
        return {
            id: e.id,
            nome: meta.nome || e.id,
            icon: meta.icon || '✦',
            cor: meta.cor || '#ffffff',
            classe: meta.classe || 'buff',
            tempo: e.tempo,
            intensidade: e.intensidade,
            formatado: (meta.formato ? meta.formato(e) : (String(e.tempo || '')))
        };
    });
}

// Compatibilidade navegador/servidor: no Node expomos via module.exports;
// no browser (index.html) `EFEITOS` vira global e `module` não existe.
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        EFEITOS: EFEITOS,
        aplicarEfeito: aplicarEfeito,
        atualizarEfeitos: atualizarEfeitos,
        temEfeito: temEfeito,
        pegarEfeito: pegarEfeito,
        removerEfeito: removerEfeito,
        exporEfeitos: exporEfeitos
    };
}
if (typeof window !== 'undefined') {
    window.EFEITOS = EFEITOS;
}