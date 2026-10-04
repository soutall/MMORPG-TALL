/* ===== INVENTÁRIO (corpo pixelado + mochila) — client-side =====
   Abre junto pelo botão 🎒. Equipamento nos 9 slots do corpo + mochila com abas. */

const inventoryScreen = document.getElementById("inventory-screen");
const invInfo = document.getElementById("inv-info");
window.inventarioAberto = false;
window.inventario = {
    capacete: null,
    peitoral: null,
    arma: null,
    armaSecundaria: null,
    colar: null,
    anel: null,
    capa: null,
    bota: null,
    luva: null
};
const SLOTS_INFO = {
    capacete:       { nome: "🪖 CAPACETE",        desc: "Protege a cabeça do herói." },
    peitoral:       { nome: "🛡️ PEITORAL",       desc: "Protege o tronco." },
    arma:           { nome: "⚔️ ARMA PRINCIPAL", desc: "Empunhada na mão direita." },
    armaSecundaria: { nome: "🔪 ARMA SECUNDÁRIA", desc: "Empunhada na mão esquerda." },
    colar:          { nome: "📿 COLAR",           desc: "Proteção no pescoço." },
    anel:           { nome: "💍 ANEL",            desc: "Energia mística no dedo." },
    capa:           { nome: "🧥 CAPA",            desc: "Voa nas costas do herói." },
    bota:           { nome: "🥾 BOTA",            desc: "Calçado resistente." },
    luva:           { nome: "🧤 LUVA",            desc: "Firmeza no punho." }
};

const NOMES_ATRIBUTOS = {
    forca: 'Força',
    agilidade: 'Agilidade',
    destreza: 'Destreza',
    inteligencia: 'Inteligência',
    vida: 'Vida',
    mana: 'Mana',
    defesa: 'Defesa',
    ataque: 'Ataque',
    attack: 'Ataque',
    defense: 'Defesa',
    profanidade: 'Profanidade',
    divindade: 'Divindade',
    afinidade: 'Afinidade',
    velocidadeAtaque: 'Vel. de Ataque',
    chanceCritica: 'Chance Crítica',
    defesaFisica: 'Defesa Física',
    defesaMagica: 'Defesa Mágica',
    danoFisico: 'Dano Físico',
    danoMagico: 'Dano Mágico',
    danoDoT: 'Dano periódico',
    danoHabilidade: 'Dano de Habilidade',
    danoContraMonstros: 'Dano contra Monstros',
    danoContraChefes: 'Dano contra Chefes',
    danoContraJogadores: 'Dano contra Jogadores',
    danoCritico: 'Dano Crítico',
    penetracaoFisica: 'Penetração Física',
    penetracaoMagica: 'Penetração Mágica',
    resistenciaCritica: 'Resistência Crítica',
    resistenciaDoT: 'Resistência a dano periódico',
    resistenciaControle: 'Resistência a Controle',
    regeneracaoVida: 'Regeneração de Vida',
    regeneracaoMana: 'Regeneração de Mana',
    poderCura: 'Poder de Cura',
    velocidadeAtaque: 'Velocidade de Ataque',
    rouboVida: 'Roubo de Vida',
    rouboMana: 'Roubo de Mana',
    atributosHerdados: 'Atributos Herdados',
    danoPet: 'Dano de Pet/Lacaio',
    vidaPet: 'Vida de Pet/Lacaio'
};

function formatarNomeAtributo(k) {
    if (NOMES_ATRIBUTOS[k]) return NOMES_ATRIBUTOS[k];
    return k.charAt(0).toUpperCase() + k.slice(1);
}

function formatarNumeroStatus(valor) {
    if (valor === null || valor === undefined || valor === '') return '—';
    if (!Number.isFinite(Number(valor))) return String(valor);
    return String(Number(Number(valor).toFixed(2)));
}

function escaparHtml(valor) {
    return String(valor == null ? '' : valor).replace(/[&<>"']/g, function (caractere) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[caractere];
    });
}

function corRaridade(item) {
    if (item && item.cor) return item.cor;
    return ({
        incomum: '#52d273',
        raro: '#4da6ff',
        epico: '#c05cff',
        lendario: '#ffb02e'
    })[item && item.raridade] || '#8ba8c2';
}

function montarTooltipItem(item) {
    if (!item) return '';
    let linhas = [item.nome || 'Item', item.tipo, item.raridadeNome, item.classe].filter(Boolean);
    if (item.itemLevel != null) linhas.push('Nível ' + item.itemLevel);
    if (item.requiredLevel != null) linhas.push('Nível necessário ' + item.requiredLevel);
    if (item.itemPower != null) linhas.push('Item Power ' + formatarNumeroStatus(item.itemPower));
    if (item.attack > 0) linhas.push('Ataque +' + item.attack);
    if (item.defense > 0) linhas.push('Defesa +' + item.defense);
    if (item.quality) linhas.push('Qualidade ' + item.quality.averagePercent + '%' + (item.isPerfect ? ' · Perfeito' : ''));
    if (Array.isArray(item.rolls)) {
        item.rolls.forEach(function (rolagem) {
            linhas.push(formatarNomeAtributo(rolagem.statId) + ': ' + formatarNumeroStatus(rolagem.value) +
                ' [' + formatarNumeroStatus(rolagem.min) + '–' + formatarNumeroStatus(rolagem.max) + '] · ' +
                rolagem.rollPercent + '%' + (rolagem.perfect ? ' ★' : ''));
        });
    }
    if (item.status) {
        Object.keys(item.status).forEach(function (atributo) {
            linhas.push(formatarNomeAtributo(atributo) + ': ' + formatarNumeroStatus(item.status[atributo]));
        });
    }
    if (item.desc) linhas.push(item.desc);
    linhas.push('ID: ' + (item.itemInstanceId || item.uid || item.id || '—'));
    return linhas.join('\n');
}

function obterSubtipoPocao(item) {
    if (!item || item.tipo !== 'consumivel') return '';
    if (item.subtipo === 'pocao_hp') return 'hp';
    if (item.subtipo === 'pocao_mp') return 'mp';
    return '';
}

const ICONES_ATRIBUTO = {
    ataque: '⚔️',
    attack: '⚔️',
    defesa: '🛡️',
    defense: '🛡️',
    vida: '❤️',
    hp: '❤️',
    mana: '💧',
    mp: '💧',
    forca: '⚔️',
    agilidade: '💨',
    destreza: '🎯',
    inteligencia: '🔮',
    profanidade: '☠️',
    divindade: '✨',
    afinidade: '🐾',
    velocidadeAtaque: '⚡',
    critico: '🎯',
    chanceCritico: '🎯',
    chanceCritica: '🎯',
    defesaFisica: '🛡️',
    defesaMagica: '🔰',
    danoFisico: '⚔️',
    danoMagico: '🔮',
    danoCritico: '💥',
    danoHabilidade: '✨',
    danoDoT: '☠️',
    danoContraMonstros: '🐉',
    danoContraChefes: '👑',
    danoContraJogadores: '⚔️',
    penetracaoFisica: '🗡️',
    penetracaoMagica: '🔮',
    resistenciaCritica: '🛡️',
    resistenciaDoT: '☠️',
    resistenciaControle: '⛓️',
    evasao: '💨',
    regeneracaoVida: '❤️',
    regeneracaoMana: '💧',
    precisao: '🎯',
    reducaoRecarga: '⌛',
    rouboVida: '🩸',
    rouboMana: '💧',
    poderCura: '✨',
    danoPet: '🐾',
    vidaPet: '🐾',
    atributosHerdados: '🐾'
};

const ORDEM_STATUS_ITEM = [
    'forca', 'inteligencia', 'agilidade', 'destreza', 'vida', 'profanidade', 'divindade', 'afinidade',
    'attack', 'ataque', 'defense', 'defesa', 'defesaFisica', 'defesaMagica', 'danoFisico', 'danoMagico',
    'chanceCritica', 'chanceCritico', 'danoCritico', 'penetracaoFisica', 'penetracaoMagica',
    'danoHabilidade', 'danoDoT', 'danoContraMonstros', 'danoContraChefes', 'danoContraJogadores',
    'resistenciaCritica', 'resistenciaDoT', 'resistenciaControle', 'evasao', 'regeneracaoVida',
    'regeneracaoMana', 'precisao', 'reducaoRecarga', 'rouboVida', 'rouboMana', 'poderCura',
    'danoPet', 'vidaPet', 'atributosHerdados', 'velocidadeAtaque'
];

function ordenarChavesStatus(chaves) {
    return chaves.sort(function (a, b) {
        let indiceA = ORDEM_STATUS_ITEM.indexOf(a);
        let indiceB = ORDEM_STATUS_ITEM.indexOf(b);
        if (indiceA === -1) indiceA = ORDEM_STATUS_ITEM.length;
        if (indiceB === -1) indiceB = ORDEM_STATUS_ITEM.length;
        return indiceA - indiceB || a.localeCompare(b, 'pt-BR');
    });
}

function obterStatsItem(item) {
    let status = Object.assign({}, item && item.status || {});
    if (item && Number.isFinite(Number(item.attack)) && Number(item.attack) !== 0 &&
        status.ataque == null && status.attack == null) status.ataque = Number(item.attack);
    if (item && Number.isFinite(Number(item.defense)) && Number(item.defense) !== 0 &&
        status.defesa == null && status.defense == null) status.defesa = Number(item.defense);
    return status;
}

function formatarStatsVertical(status, item) {
    let valores = Object.assign({}, status || {}, item ? obterStatsItem(item) : {});
    let chaves = ordenarChavesStatus(Object.keys(valores).filter(k =>
        valores[k] !== undefined && valores[k] !== null && Number.isFinite(Number(valores[k])) && Number(valores[k]) !== 0));
    if (!chaves.length) return '';
    let html = '<div class="inv-stats-vertical">';
    chaves.forEach(k => {
        let v = Number(valores[k]);
        let vFormatado = formatarNumeroStatus(v);
        let vStr = v > 0 ? ('+' + vFormatado) : vFormatado;
        html += '<div class="stat-linha">'
            + '<span class="stat-icone" aria-hidden="true">' + escaparHtml(ICONES_ATRIBUTO[k] || '•') + '</span>'
            + '<span class="stat-nome">' + escaparHtml(formatarNomeAtributo(k)) + ' :</span>'
            + '<span class="stat-val" title="' + escaparHtml(vStr) + '">' + escaparHtml(vStr) + '</span>'
            + '</div>';
    });
    html += '</div>';
    return html;
}

function abrirInventario() {
    if (window.estaMorto) return;
    if (charSelectScreen && charSelectScreen.style.display === "flex") return;
    window.inventarioAberto = true;
    window._mochilaItemSelecionado = null;
    window._slotEquipadoSelecionado = null;
    window._itemEquipadoSelecionadoId = null;
    inventoryScreen.style.display = "flex";
    renderizarInventario();
    renderizarMochila();
    let infoEl = document.getElementById("inv-info");
    if (infoEl) infoEl.innerHTML = '<div class="slot-vazio-info"><span class="slot-vazio-desc">Toque em um item para inspecionar.</span></div>';
    limparComparacao();
    atualizarAcoesInventario();
}

function fecharInventario() {
    window.inventarioAberto = false;
    inventoryScreen.style.display = "none";
    window._mochilaItemSelecionado = null;
    window._slotEquipadoSelecionado = null;
    window._itemEquipadoSelecionadoId = null;
    limparComparacao();
    renderizarMochila();
    renderizarInventario();
}

function toggleInventario() {
    if (window.inventarioAberto) fecharInventario(); else abrirInventario();
}

function classePodeUsarItemNoCliente(item) {
    if (item && item.classe && window.minhaClasse && item.classe !== window.minhaClasse) return false;
    return true;
}

function motivoItemNaoEquipavelNoCliente(item) {
    if (!item || item.tipo !== 'equipamento') return 'Selecione um equipamento.';
    if (item.locked) return 'Desbloqueie o item antes de equipá-lo.';
    if (!classePodeUsarItemNoCliente(item)) return 'Sua classe não pode usar este item.';
    if (!item.slot || !Object.prototype.hasOwnProperty.call(window.inventario, item.slot)) {
        return 'O slot deste item não está disponível.';
    }
    let nivelRequerido = Number(item.requiredLevel);
    let nivelAtual = Number(window.meuLevel || window.meuNivel) || 1;
    if (Number.isFinite(nivelRequerido) && nivelRequerido > nivelAtual) {
        return 'Este item requer nível ' + nivelRequerido + '.';
    }
    return '';
}

function renderizarStatusPersonagem() {
    let level = Number(window.meuLevel || window.meuNivel) || 1;
    let itemPowerEquipado = Object.keys(window.inventario || {}).reduce(function (soma, slot) {
        let item = window.inventario[slot];
        return soma + (item && Number.isFinite(Number(item.itemPower)) ? Number(item.itemPower) : 0);
    }, 0);
    let nivel = document.getElementById('inv-personagem-nivel');
    if (nivel) {
        nivel.textContent = 'LVL ' + level + ' · IP equipado ' + formatarNumeroStatus(itemPowerEquipado);
        nivel.title = 'Item Power somado dos equipamentos que possuem esse dado; o jogo não define Power de personagem.';
    }

    [
        { chave: 'hp', atual: window.meuHp, maximo: window.meuMaxHp },
        { chave: 'mp', atual: window.meuMp, maximo: window.meuMaxMp }
    ].forEach(function (recurso) {
        let atual = Number(recurso.atual);
        let maximo = Number(recurso.maximo);
        let percentagem = Number.isFinite(atual) && Number.isFinite(maximo) && maximo > 0
            ? Math.max(0, Math.min(100, atual / maximo * 100))
            : 100;
        let mascara = document.getElementById('inv-' + recurso.chave + '-mascara');
        let valor = document.getElementById('inv-' + recurso.chave + '-valor');
        if (mascara) mascara.style.width = (100 - percentagem) + '%';
        if (valor) valor.textContent = Number.isFinite(atual) && Number.isFinite(maximo)
            ? Math.round(atual) + ' / ' + Math.round(maximo)
            : '—';
    });

    let atributos = window.atributosTotais || window.meusAtributos || {};
    document.querySelectorAll('#inv-atributos [data-atributo]').forEach(function (el) {
        let chave = el.getAttribute('data-atributo');
        let valor = atributos[chave];
        el.textContent = valor != null && Number.isFinite(Number(valor)) ? formatarNumeroStatus(valor) : '—';
        el.title = formatarNomeAtributo(chave) + ': ' + el.textContent;
    });
}

function renderizarInventario() {
    document.querySelectorAll(".inv-slot").forEach(slotEl => {
        let chave = slotEl.getAttribute("data-slot");
        let item = window.inventario[chave] || null;
        let ocupado = !!item;
        slotEl.classList.toggle("ocupado", ocupado);
        slotEl.classList.toggle("selecionado", window._slotEquipadoSelecionado === chave);
        slotEl.classList.remove("upg-glow-10", "upg-glow-15", "upg-glow-20");
        let badgeAntigo = slotEl.querySelector(':scope > .upg-badge');
        if (badgeAntigo) badgeAntigo.remove();
        let lockAntigo = slotEl.querySelector(':scope > .lock-ico');
        if (lockAntigo) lockAntigo.remove();
        let icone = slotEl.querySelector('.slot-ico');
        if (icone) icone.textContent = item ? (item.icon || '🛡️') : '';
        slotEl.style.setProperty('--item-rarity', ocupado ? corRaridade(item) : '');
        slotEl.title = item
            ? montarTooltipItem(item) + '\nClique para inspecionar'
            : (SLOTS_INFO[chave] ? SLOTS_INFO[chave].nome.replace(/^[^ ]+ /, '') : chave) + ' — vazio';
        slotEl.setAttribute('aria-label', slotEl.title);
        if (ocupado) {
            let nivelUp = Math.max(0, item.upgrade || 0);
            if (nivelUp >= 20) slotEl.classList.add('upg-glow-20');
            else if (nivelUp >= 15) slotEl.classList.add('upg-glow-15');
            else if (nivelUp >= 10) slotEl.classList.add('upg-glow-10');
            if (nivelUp > 0) {
                let b = document.createElement("span");
                b.className = "upg-badge";
                b.textContent = "+" + nivelUp;
                slotEl.appendChild(b);
            }
            if (item.locked) {
                let c = document.createElement("span");
                c.className = "lock-ico";
                c.textContent = "🔒";
                slotEl.appendChild(c);
            }
        }
    });
    renderizarStatusPersonagem();
    atualizarAcoesInventario();
}

function inserirItemNoSlot(chave, item) {
    if (!window.inventario[chave]) window.inventario[chave] = item;
    renderizarInventario();
}

function removerItemDoSlot(chave) {
    window.inventario[chave] = null;
    renderizarInventario();
}

function selecionarSlot(chave) {
    window._slotEquipadoSelecionado = null;
    let info = SLOTS_INFO[chave] || { nome: chave, desc: "" };
    let item = window.inventario[chave];
    window._itemEquipadoSelecionadoId = item && item.id ? item.id : null;
    let el = document.getElementById("inv-info");
    limparComparacao();
    window._mochilaItemSelecionado = null;

    if (item && item.tipo === 'equipamento') {
        window._slotEquipadoSelecionado = chave;
        let cor = corRaridade(item);
        let nivelUp = Math.max(0, item.upgrade || 0);

        let html = '<div class="item-card-detalhes">';
        html += '<div class="item-card-topo">';
        html +=   '<span class="item-card-ico">' + escaparHtml(item.icon || '🛡️') + '</span>';
        html +=   '<div class="item-card-titulos">';
        html +=     '<div class="item-card-nome" style="color:' + escaparHtml(cor) + '">' + escaparHtml(item.nome || info.nome) + (nivelUp > 0 ? ' <span class="upg-badge">+' + nivelUp + '</span>' : '') + '</div>';
        html +=     '<div class="item-card-tags">';
        html +=       '<span class="tag-tipo">EQUIPADO</span>';
        if (item.raridadeNome) html += ' <span class="tag-rar" style="color:' + escaparHtml(cor) + '">' + escaparHtml(item.raridadeNome) + '</span>';
        if (item.locked) html += ' <span class="tag-lock">🔒</span>';
        html +=     '</div>';
        html +=   '</div>';
        html += '</div>';

        if (item.desc) html += '<div class="item-card-desc">' + escaparHtml(item.desc) + '</div>';
        if (item.schemaVersion === 1) {
            html += '<div class="item-card-progressao">Nível ' + escaparHtml(item.itemLevel) +
                ' · Requer nível ' + escaparHtml(item.requiredLevel) + ' · Item Power ' + escaparHtml(formatarNumeroStatus(item.itemPower)) + '</div>';
            if (item.attack > 0 || item.defense > 0) {
                html += '<div class="item-card-progressao">' +
                    (item.attack > 0 ? 'Ataque +' + escaparHtml(item.attack) : '') +
                    (item.attack > 0 && item.defense > 0 ? ' · ' : '') +
                    (item.defense > 0 ? 'Defesa +' + escaparHtml(item.defense) : '') + '</div>';
            }
            if (item.quality) {
                html += '<div class="item-card-progressao">Qualidade ' + escaparHtml(item.quality.averagePercent) +
                    '%' + (item.quality.perfectRollCount != null ? ' · Perfeitas ' + escaparHtml(item.quality.perfectRollCount) : '') +
                    (item.isPerfect ? ' · ✨ Perfeito' : '') + '</div>';
            }
            if (Array.isArray(item.rolls)) {
                item.rolls.forEach(function (rolagem) {
                    html += '<div class="item-card-progressao">' + escaparHtml(formatarNomeAtributo(rolagem.statId)) + ': ' +
                        escaparHtml(formatarNumeroStatus(rolagem.value)) + ' [' + escaparHtml(formatarNumeroStatus(rolagem.min)) +
                        '–' + escaparHtml(formatarNumeroStatus(rolagem.max)) + '] · ' + escaparHtml(rolagem.rollPercent) +
                        '%' + (rolagem.perfect ? ' ★' : '') + '</div>';
                });
            }
        }
        html += formatarStatsVertical(item.status, item);
        html += '<div class="item-card-progressao">ID: ' + escaparHtml(item.itemInstanceId || item.uid || item.id || '—') + '</div>';
        html += '</div>';

        if (el) el.innerHTML = html;
    } else if (item) {
        let html = '<div class="item-card-detalhes">';
        html += '<div class="item-card-topo">';
        html +=   '<span class="item-card-ico">' + escaparHtml(item.icon || '🎒') + '</span>';
        html +=   '<div class="item-card-titulos">';
        html +=     '<div class="item-card-nome">' + escaparHtml(item.nome || info.nome) + '</div>';
        html +=   '</div>';
        html += '</div>';
        if (item.desc) html += '<div class="item-card-desc">' + escaparHtml(item.desc) + '</div>';
        html += '<div class="item-card-progressao">ID: ' + escaparHtml(item.itemInstanceId || item.uid || item.id || '—') + '</div>';
        html += '</div>';
        if (el) el.innerHTML = html;
    } else {
        if (el) {
            el.innerHTML = '<div class="slot-vazio-info"><span class="slot-vazio-ico">' + (info.nome.slice(0, 2)) + '</span><span class="slot-vazio-nome">' + info.nome + ': VAZIO</span><span class="slot-vazio-desc">' + info.desc + '</span></div>';
        }
    }

    renderizarInventario();
    renderizarMochila();
    atualizarAcoesInventario();
}

document.querySelectorAll(".inv-slot").forEach(slotEl => {
    slotEl.addEventListener("click", function () {
        if (window.__dndClickSuprimido && window.__dndClickSuprimido()) return;
        selecionarSlot(this.getAttribute("data-slot"));
    });
    slotEl.addEventListener("dblclick", function (event) {
        event.preventDefault();
        let slot = this.getAttribute("data-slot");
        selecionarSlot(slot);
        if (window.inventario[slot]) window.desequiparSlotSelecionado(slot);
    });
});
if (inventoryScreen) inventoryScreen.addEventListener("click", function(e) { if (e.target === inventoryScreen) fecharInventario(); });

/* ===== MOCHILA (abas: todos, consumíveis, itens, quest, cosméticos) ===== */
window.mochila = [];
let abaMochilaAtiva = 'todos';
let buscaMochila = '';
let raridadeMochilaFiltro = '';
let slotMochilaFiltro = '';
let ordenacaoMochila = 0;
const ORDENACOES_MOCHILA = [
    { chave: 'servidor', nome: 'ordem recebida do servidor' },
    { chave: 'nome', nome: 'nome' },
    { chave: 'raridade', nome: 'raridade' },
    { chave: 'itemPower', nome: 'Item Power' },
    { chave: 'nivel', nome: 'nível do item' },
    { chave: 'qualidade', nome: 'qualidade da rolagem' }
];
const ABAS_MOCHILA = [
    { chave: 'todos', nome: 'TODOS', filtro: null },
    { chave: 'consumiveis', nome: 'CONSUMÍVEIS', filtro: 'consumivel' },
    { chave: 'itens', nome: 'ITENS', filtro: 'item' },
    { chave: 'equipamentos', nome: '⚔️ EQUIP.', filtro: 'equipamento' },
    { chave: 'pedras', nome: '💠 PEDRAS', filtro: 'pedra' },
    { chave: 'quest', nome: 'QUEST', filtro: 'quest' },
    { chave: 'cosmeticos', nome: 'COSMÉTICOS', filtro: 'cosmetico' }
];

// Mapeia um item do SERVIDOR para o cliente (fonte única do formato de item).
// Inclui os campos do sistema de upgrade: uid (itemInstanceId), upgrade,
// upgradeExtras, locked e pedra (empilháveis da forja).
window.mapearItemServidor = function (i) {
    return {
        id: i.id, nome: i.nome, tipo: i.tipo, icon: i.icon,
        quantidade: i.quantidade || 1, desc: i.desc || "", slot: i.slot || null,
        raridade: i.raridade || null, raridadeNome: i.raridadeNome || null,
        status: i.status || null, cor: i.cor || null,
        classe: i.classe || null, armaChave: i.armaChave || null,
        uid: i.uid || null, upgrade: i.upgrade || 0,
        upgradeExtras: i.upgradeExtras || null, locked: !!i.locked,
        pedra: i.pedra || null, stackavel: i.stackavel !== false,
        schemaVersion: i.schemaVersion || null,
        itemInstanceId: i.itemInstanceId || null,
        itemDefinitionId: i.itemDefinitionId || null,
        itemLevel: i.itemLevel || null,
        requiredLevel: i.requiredLevel || null,
        itemPower: i.itemPower || null,
        attack: i.attack || 0,
        defense: i.defense || 0,
        quality: i.quality || null,
        isPerfect: !!i.isPerfect,
        rolls: Array.isArray(i.rolls) ? i.rolls : null,
        durability: i.durability == null ? null : i.durability,
        customVisual: i.customVisual || null,
        // v1.34: poções (consumível) — subtipo + nível para o HUD HP/MP
        subtipo: i.subtipo || null, nivel: i.nivel || null, pctCura: i.pctCura || null
    };
};

function adicionarItemNaMochila(item) {
    let existente = window.mochila.find(i => i.id === item.id);
    if (existente && item.stackavel !== false) {
        existente.quantidade = (existente.quantidade || 1) + (item.quantidade || 1);
    } else {
        window.mochila.push(window.mapearItemServidor(item));
    }
    renderizarMochila();
}

function removerItemDaMochila(id, quantidade) {
    let item = window.mochila.find(i => i.id === id);
    if (!item) return;
    item.quantidade -= (quantidade || 1);
    if (item.quantidade <= 0) {
        window.mochila = window.mochila.filter(i => i.id !== id);
    }
    renderizarMochila();
}

function setAbaMochila(abaChave) {
    abaMochilaAtiva = abaChave;
    if (abaChave !== 'equipamentos') slotMochilaFiltro = '';
    document.querySelectorAll(".mochila-aba").forEach(el => {
        el.classList.toggle("ativa", el.getAttribute("data-aba") === abaChave);
        el.setAttribute('aria-selected', el.getAttribute("data-aba") === abaChave ? 'true' : 'false');
    });
    document.querySelectorAll('.mochila-filtro-slot').forEach(function (el) {
        el.classList.toggle('ativo', !slotMochilaFiltro && !el.getAttribute('data-slot-filtro'));
    });
    renderizarMochila();
}

function setFiltroSlotMochila(slot) {
    slotMochilaFiltro = slot || '';
    abaMochilaAtiva = slotMochilaFiltro ? 'equipamentos' : 'todos';
    document.querySelectorAll('.mochila-aba').forEach(function (el) {
        el.classList.toggle('ativa', el.getAttribute('data-aba') === abaMochilaAtiva);
    });
    document.querySelectorAll('.mochila-filtro-slot').forEach(function (el) {
        el.classList.toggle('ativo', (el.getAttribute('data-slot-filtro') || '') === slotMochilaFiltro);
    });
    renderizarMochila();
}

function normalizarBusca(valor) {
    return String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function compararRaridades(a, b) {
    const peso = { comum: 0, incomum: 1, raro: 2, epico: 3, lendario: 4 };
    return (peso[a.raridade] || 0) - (peso[b.raridade] || 0);
}

function renderizarMochila() {
    let grade = document.getElementById("mochila-grade");
    if (!grade) return;
    let aba = ABAS_MOCHILA.find(a => a.chave === abaMochilaAtiva) || ABAS_MOCHILA[0];
    let termoBusca = normalizarBusca(buscaMochila);
    let itens = window.mochila.filter(function (item) {
        if (aba.filtro && item.tipo !== aba.filtro) return false;
        if (slotMochilaFiltro) {
            if (item.tipo !== 'equipamento') return false;
            if (slotMochilaFiltro === 'arma') {
                if (item.slot !== 'arma' && item.slot !== 'armaSecundaria') return false;
            } else if (slotMochilaFiltro === 'armadura') {
                if (['capacete', 'peitoral', 'capa', 'bota', 'luva'].indexOf(item.slot) === -1) return false;
            } else if (item.slot !== slotMochilaFiltro) return false;
        }
        if (raridadeMochilaFiltro && item.raridade !== raridadeMochilaFiltro) return false;
        if (!termoBusca) return true;
        let texto = [item.nome, item.desc, item.slot, item.raridadeNome, item.tipo, item.classe,
            item.itemDefinitionId, item.itemInstanceId, item.uid, item.id]
            .filter(Boolean).join(' ')
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        return texto.includes(termoBusca);
    });
    let ordenacao = ORDENACOES_MOCHILA[ordenacaoMochila];
    if (ordenacao.chave !== 'servidor') {
        itens.sort(function (a, b) {
            if (ordenacao.chave === 'nome') return String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR');
            if (ordenacao.chave === 'raridade') return compararRaridades(b, a) || String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR');
            if (ordenacao.chave === 'itemPower') return (Number(b.itemPower) || 0) - (Number(a.itemPower) || 0);
            if (ordenacao.chave === 'nivel') return (Number(b.itemLevel || b.nivel) || 0) - (Number(a.itemLevel || a.nivel) || 0);
            if (ordenacao.chave === 'qualidade') return (Number(b.quality && b.quality.averagePercent) || 0) - (Number(a.quality && a.quality.averagePercent) || 0);
            return 0;
        });
    }
    grade.innerHTML = "";
    itens.forEach(item => {
        let div = document.createElement("div");
        div.className = "mochila-slot" + (item.tipo === 'equipamento' ? " mochila-slot-equip" : "")
            + (item.raridade === 'incomum' ? " equip-incomum" : (item.raridade === 'raro' ? " equip-raro" : (item.raridade === 'epico' ? " equip-epico" : (item.raridade === 'lendario' ? " equip-lendario" : ""))))
            + (item.tipo === 'pedra' ? " pedra-rarita" : "");
        div.title = montarTooltipItem(item);
        div.setAttribute('role', 'button');
        div.tabIndex = 0;
        div.setAttribute('aria-label', div.title || 'Item');
        div.setAttribute("data-id", item.id); // usado pelo sistema Drag & Drop
        if (window._mochilaItemSelecionado && window._mochilaItemSelecionado.id === item.id) {
            div.classList.add('selecionado');
        }
        div.style.setProperty('--item-rarity', corRaridade(item));
        let icone = document.createElement('span');
        icone.className = 'slot-ico';
        icone.textContent = item.icon || '🎒';
        div.appendChild(icone);
        if (item.quantidade > 1) {
            let qtd = document.createElement('span');
            qtd.className = 'qtd-badge';
            qtd.textContent = item.quantidade;
            div.appendChild(qtd);
        }

        // +N de upgrade + aura por nível (client-side, leve)
        if (item.tipo === 'equipamento') {
            let nivelUp = Math.max(0, item.upgrade || 0);
            if (nivelUp >= 20) div.classList.add('upg-glow-20');
            else if (nivelUp >= 15) div.classList.add('upg-glow-15');
            else if (nivelUp >= 10) div.classList.add('upg-glow-10');
            if (nivelUp > 0) {
                let b = document.createElement("span");
                b.className = "upg-badge";
                b.textContent = "+" + nivelUp;
                div.appendChild(b);
            }
            if (item.locked) {
                let c = document.createElement("span");
                c.className = "lock-ico";
                c.textContent = "🔒";
                div.appendChild(c);
            }
        }

        div.addEventListener("click", function () {
            if (window.__dndClickSuprimido && window.__dndClickSuprimido()) return;
            selecionarItemMochila(item);
        });
        div.addEventListener("dblclick", function (event) {
            event.preventDefault();
            selecionarItemMochila(item);
            window.executarAcaoItemSelecionado();
        });
        div.addEventListener("keydown", function (event) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                selecionarItemMochila(item);
            }
        });
        grade.appendChild(div);
    });
    let resto = Math.max(0, 36 - itens.length);
    for (let i = 0; i < resto; i++) {
        let vazio = document.createElement("div");
        vazio.className = "mochila-slot-vazio";
        grade.appendChild(vazio);
    }
    let contador = document.getElementById('inv-contagem-itens');
    if (contador) {
        contador.textContent = itens.length + ' / ' + window.mochila.length + ' itens';
    }
    let ordenar = document.getElementById('btn-inv-organizar');
    if (ordenar) ordenar.title = 'Ordenar por ' + ordenacao.nome + ' (clique para alternar)';
    atualizarAcoesInventario();
}

function renderizarComparacao(item) {
    let el = document.getElementById('inv-comparacao');
    if (!el) return;
    if (!item || item.tipo !== 'equipamento' || !item.slot) { limparComparacao(); return; }
    let equipado = window.inventario[item.slot];
    if (!equipado || equipado.tipo !== 'equipamento') { limparComparacao(); return; }

    let statsEquipado = obterStatsItem(equipado);
    let statsSelecionado = obterStatsItem(item);
    let chaves = ordenarChavesStatus(Array.from(new Set(Object.keys(statsEquipado).concat(Object.keys(statsSelecionado))))
        .filter(function (chave) {
            return Number.isFinite(Number(statsEquipado[chave] || 0)) &&
                Number.isFinite(Number(statsSelecionado[chave] || 0));
        }));

    let corEq = corRaridade(equipado);
    let corItem = corRaridade(item);
    let nivelEquipado = equipado.itemLevel != null ? equipado.itemLevel : equipado.nivel;
    let nivelSelecionado = item.itemLevel != null ? item.itemLevel : item.nivel;
    let detalhesItem = function (instancia, cor, nivel) {
        return '<div class="cmp-item-col">' +
            '<span class="cmp-icone-item" style="--item-rarity:' + escaparHtml(cor) + '" aria-hidden="true">' +
            escaparHtml(instancia.icon || '🛡️') + '</span>' +
            '<span class="cmp-nome-item" style="color:' + escaparHtml(cor) + '">' +
            escaparHtml(instancia.nome || 'Equipamento') + '</span>' +
            '<span class="cmp-sub">' + escaparHtml(instancia.raridadeNome || instancia.raridade || 'Raridade não informada') +
            (nivel != null ? ' · Nv. ' + escaparHtml(nivel) : '') + '</span>' +
            '<span class="cmp-sub">IP ' + escaparHtml(instancia.itemPower == null ? '—' : formatarNumeroStatus(instancia.itemPower)) +
            '</span></div>';
    };

    let html = '<div class="cmp-bloco">';
    html += '<div class="cmp-cabecalho-itens">';
    html +=   '<div class="cmp-item-resumo"><span class="cmp-sub">EQUIPADO</span>' + detalhesItem(equipado, corEq, nivelEquipado) + '</div>';
    html +=   '<div class="cmp-vs-badge">VS</div>';
    html +=   '<div class="cmp-item-resumo"><span class="cmp-sub">SELECIONADO</span>' + detalhesItem(item, corItem, nivelSelecionado) + '</div>';
    html += '</div>';

    html += '<div class="cmp-stats-linhas">';
    chaves.forEach(k => {
        let a = Number(statsEquipado[k]) || 0;
        let b = Number(statsSelecionado[k]) || 0;
        let diff = b - a;
        let cl = (diff > 0) ? 'cmp-melhor' : (diff < 0) ? 'cmp-pior' : 'cmp-igual';
        let diffStr = (diff > 0) ? ('+' + formatarNumeroStatus(diff)) : formatarNumeroStatus(diff);

        html += '<div class="cmp-linha-dupla">';
        html +=   '<span class="stat-icone" aria-hidden="true">' + escaparHtml(ICONES_ATRIBUTO[k] || '•') + '</span>';
        html +=   '<span class="stat-nome">' + escaparHtml(formatarNomeAtributo(k)) + ' :</span>';
        html +=   '<span class="cmp-valores">';
        html +=     '<span class="stat-val-equip">' + escaparHtml(a > 0 ? '+' + formatarNumeroStatus(a) : formatarNumeroStatus(a)) + '</span>';
        html +=     '<span class="cmp-seta">➔</span>';
        html +=     '<span class="stat-val-novo ' + cl + '">' + escaparHtml(b > 0 ? '+' + formatarNumeroStatus(b) : formatarNumeroStatus(b)) + '<span class="cmp-diff"> (' + escaparHtml(diffStr) + ')</span></span>';
        html +=   '</span>';
        html += '</div>';
    });
    if (equipado.itemPower != null && item.itemPower != null &&
        Number.isFinite(Number(equipado.itemPower)) && Number.isFinite(Number(item.itemPower))) {
        let diferencaPower = Number(item.itemPower) - Number(equipado.itemPower);
        let classePower = diferencaPower > 0 ? 'cmp-melhor' : (diferencaPower < 0 ? 'cmp-pior' : 'cmp-igual');
        html += '<div class="cmp-linha-dupla"><span class="stat-icone" aria-hidden="true">⚡</span><span class="stat-nome">Item Power:</span><span class="cmp-valores"><span class="stat-val-equip">' +
            escaparHtml(formatarNumeroStatus(equipado.itemPower)) + '</span><span class="cmp-seta">➔</span><span class="stat-val-novo ' + classePower + '">' +
            escaparHtml(formatarNumeroStatus(item.itemPower)) + '<span class="cmp-diff"> (' + escaparHtml(diferencaPower > 0 ? '+' : '') +
            escaparHtml(formatarNumeroStatus(diferencaPower)) + ')</span></span></span></div>';
    }
    html += '</div></div>';

    el.innerHTML = html;
    el.style.display = 'block';
    let empty = document.getElementById('inv-comparacao-empty');
    if (empty) empty.style.display = 'none';
}

function limparComparacao() {
    let el = document.getElementById('inv-comparacao');
    if (el) {
        el.style.display = 'none';
        el.innerHTML = '';
    }
    let empty = document.getElementById('inv-comparacao-empty');
    if (empty) empty.style.display = '';
}

function selecionarItemMochila(item) {
    if (!item) return;
    window._slotEquipadoSelecionado = null;
    window._itemEquipadoSelecionadoId = null;
    window._mochilaItemSelecionado = item;
    let cor = corRaridade(item);
    let nivelUp = Math.max(0, item.upgrade || 0);
    let podeEq = classePodeUsarItemNoCliente(item);

    let html = '<div class="item-card-detalhes">';
    html += '<div class="item-card-topo">';
    html +=   '<span class="item-card-ico">' + escaparHtml(item.icon || '🎒') + '</span>';
    html +=   '<div class="item-card-titulos">';
    html +=     '<div class="item-card-nome" style="color:' + escaparHtml(cor) + '">' + escaparHtml(item.nome || 'Item') + (nivelUp > 0 ? ' <span class="upg-badge">+' + nivelUp + '</span>' : '') + (item.quantidade > 1 ? ' <span class="qtd-badge">x' + item.quantidade + '</span>' : '') + '</div>';
    html +=     '<div class="item-card-tags">';
    html +=       '<span class="tag-tipo">' + escaparHtml((item.tipo || '').toUpperCase()) + '</span>';
    if (item.raridadeNome) html += ' <span class="tag-rar" style="color:' + escaparHtml(cor) + '">' + escaparHtml(item.raridadeNome) + '</span>';
    if (item.classe) html += ' <span class="tag-classe ' + (podeEq ? '' : 'tag-classe-invalida') + '">' + escaparHtml(item.classe.toUpperCase()) + (podeEq ? '' : ' ⚠️') + '</span>';
    if (item.locked) html += ' <span class="tag-lock">🔒 BLOQUEADO</span>';
    html +=     '</div>';
    html +=   '</div>';
    html += '</div>';

    if (item.desc) html += '<div class="item-card-desc">' + escaparHtml(item.desc) + '</div>';
    if (item.schemaVersion === 1) {
        html += '<div class="item-card-progressao">Nível ' + escaparHtml(item.itemLevel) +
            ' · Requer nível ' + escaparHtml(item.requiredLevel) + ' · Item Power ' + escaparHtml(formatarNumeroStatus(item.itemPower)) + '</div>';
        if (item.quality) {
            html += '<div class="item-card-progressao">Qualidade ' + escaparHtml(item.quality.averagePercent) +
                '%' + (item.quality.perfectRollCount != null ? ' · Perfeitas ' + escaparHtml(item.quality.perfectRollCount) : '') +
                (item.isPerfect ? ' · ✨ Perfeito' : '') + '</div>';
        }
    }
    if (Array.isArray(item.rolls)) {
        item.rolls.forEach(function (rolagem) {
            html += '<div class="item-card-progressao">' + escaparHtml(formatarNomeAtributo(rolagem.statId)) + ': ' +
                escaparHtml(formatarNumeroStatus(rolagem.value)) + ' [' + escaparHtml(formatarNumeroStatus(rolagem.min)) +
                '–' + escaparHtml(formatarNumeroStatus(rolagem.max)) + '] · ' + escaparHtml(rolagem.rollPercent) +
                '%' + (rolagem.perfect ? ' ★' : '') + '</div>';
        });
    }
    if (item.tipo === 'equipamento') {
        html += formatarStatsVertical(item.status, item);
    }
    html += '<div class="item-card-progressao">ID: ' + escaparHtml(item.itemInstanceId || item.uid || item.id || '—') + '</div>';
    if (item.durability != null) html += '<div class="item-card-progressao">Durabilidade ' + escaparHtml(item.durability) + '</div>';
    html += '</div>';

    let el = document.getElementById("inv-info");
    if (el) el.innerHTML = html;

    renderizarComparacao(item);
    renderizarMochila();
    atualizarAcoesInventario();
}

window.reconciliarSelecaoInventario = function() {
    let selecionado = window._mochilaItemSelecionado;
    if (selecionado) {
        let atualizado = window.mochila.find(function (item) {
            return item.id === selecionado.id || (item.uid && item.uid === selecionado.uid);
        });
        if (atualizado) {
            selecionarItemMochila(atualizado);
            return;
        }
        let slotAtual = Object.keys(window.inventario || {}).find(function (slot) {
            let item = window.inventario[slot];
            return item && (item.id === selecionado.id || (selecionado.uid && item.uid === selecionado.uid));
        });
        if (slotAtual) {
            selecionarSlot(slotAtual);
            return;
        }
        window._mochilaItemSelecionado = null;
        document.getElementById('inv-info').innerHTML = '<div class="slot-vazio-info">O item não está mais no inventário.</div>';
        limparComparacao();
        atualizarAcoesInventario();
        renderizarMochila();
        return;
    }
    if (window._slotEquipadoSelecionado) {
        if (window.inventario[window._slotEquipadoSelecionado]) selecionarSlot(window._slotEquipadoSelecionado);
        else {
            let desequipado = window._itemEquipadoSelecionadoId && window.mochila.find(function (item) {
                return item && item.id === window._itemEquipadoSelecionadoId;
            });
            if (desequipado) {
                selecionarItemMochila(desequipado);
                return;
            }
            window._slotEquipadoSelecionado = null;
            window._itemEquipadoSelecionadoId = null;
            limparComparacao();
            atualizarAcoesInventario();
        }
    }
};

// Bloqueia/desbloqueia o item selecionado na mochila (o SERVIDOR valida e persiste)
function mostrarMensagemInv(texto, cor) {
    let el = document.querySelector('.inv-botoes-ajuda');
    if (el) {
        el.textContent = texto;
        el.style.color = cor || '';
    }
    let mensagemVisivel = document.getElementById('inv-contagem-itens');
    if (mensagemVisivel) {
        mensagemVisivel.textContent = texto;
        mensagemVisivel.classList.add('inv-status-message');
        clearTimeout(window._invStatusTimer);
        window._invStatusTimer = setTimeout(function () {
            mensagemVisivel.classList.remove('inv-status-message');
            renderizarMochila();
        }, 4500);
    }
}

function atualizarAcoesInventario() {
    let item = window._mochilaItemSelecionado;
    let slot = window._slotEquipadoSelecionado;
    let itemEquipado = slot ? window.inventario[slot] : null;
    let principal = document.getElementById('btn-inv-acao-principal');
    let equiparComparado = document.getElementById('btn-inv-comparacao-equipar');
    let destruir = document.getElementById('btn-inv-destruir');
    let bloquear = document.getElementById('btn-inv-bloquear');
    let status = document.querySelector('.inv-botoes-ajuda');

    if (principal) {
        let acao = slot && itemEquipado ? 'desequipar' : (item && item.tipo === 'equipamento' ? 'equipar' : (item && item.tipo === 'consumivel' ? 'usar' : ''));
        let motivoEquipar = acao === 'equipar' ? motivoItemNaoEquipavelNoCliente(item) : '';
        let podeUsar = !!obterSubtipoPocao(item);
        principal.disabled = !acao || !!motivoEquipar || (acao === 'usar' && !podeUsar);
        principal.textContent = acao === 'equipar' ? 'EQUIPAR' :
            (acao === 'desequipar' ? 'DESEQUIPAR' : (acao === 'usar' && podeUsar ? 'USAR' : ''));
        principal.title = slot ? 'Desequipar item selecionado' :
            (acao === 'equipar' ? (motivoEquipar || 'Equipar item selecionado') :
                (acao === 'usar' ? (podeUsar ? 'Usar consumível selecionado' : 'Este consumível não possui tipo de uso') : 'Selecione um item'));
        principal.setAttribute('aria-label', principal.title);
    }
    if (equiparComparado) {
        let slotComparado = item && item.tipo === 'equipamento' && item.slot ? window.inventario[item.slot] : null;
        let possuiComparacao = !!(slotComparado && slotComparado.tipo === 'equipamento');
        let motivoEquipar = possuiComparacao ? motivoItemNaoEquipavelNoCliente(item) : '';
        equiparComparado.hidden = !possuiComparacao;
        equiparComparado.disabled = !possuiComparacao || !!motivoEquipar;
        equiparComparado.textContent = 'EQUIPAR';
        equiparComparado.title = motivoEquipar || 'Equipar o item selecionado nesta comparação';
        equiparComparado.setAttribute('aria-label', equiparComparado.title);
    }
    if (destruir) {
        destruir.disabled = !item || !!item.locked;
        destruir.title = item && item.locked ? 'Desbloqueie antes de destruir' : 'Destruir item selecionado';
    }
    if (bloquear) {
        bloquear.disabled = !item || item.tipo !== 'equipamento';
        bloquear.title = item && item.locked ? 'Desbloquear item' : 'Bloquear item';
        bloquear.setAttribute('aria-label', bloquear.title);
    }
    if (status && !status.textContent) {
        status.textContent = item || itemEquipado ? 'Ação sobre o item selecionado' : 'Selecione um item';
    }
}

window.equiparItemComparado = function() {
    let item = window._mochilaItemSelecionado;
    if (!item || item.tipo !== 'equipamento' || !item.slot ||
        !window.inventario[item.slot] || window.inventario[item.slot].tipo !== 'equipamento') {
        mostrarMensagemInv('Selecione um equipamento comparável antes de equipá-lo.', '#ffbf69');
        return;
    }
    window.equiparItemSelecionado(item);
};

function enviarAcaoInventario(payload, mensagem) {
    if (typeof ws === 'undefined' || !ws || ws.readyState !== WebSocket.OPEN) {
        mostrarMensagemInv('Não foi possível: sem conexão com o servidor.', '#ffbf69');
        return false;
    }
    try {
        ws.send(JSON.stringify(payload));
    } catch (erro) {
        console.error('[INVENTARIO] Falha ao enviar ação:', erro);
        mostrarMensagemInv('Falha ao enviar a ação ao servidor.', '#ff7676');
        return false;
    }
    mostrarMensagemInv(mensagem || 'Aguardando confirmação do servidor...');
    return true;
}

window.executarAcaoItemSelecionado = function() {
    let slot = window._slotEquipadoSelecionado;
    if (slot && window.inventario[slot]) {
        window.desequiparSlotSelecionado(slot);
        return;
    }
    let item = window._mochilaItemSelecionado;
    if (!item) return;
    if (item.tipo === 'equipamento') {
        window.equiparItemSelecionado(item);
        return;
    }
    if (item.tipo === 'consumivel' && item.subtipo) {
        let subtipoPocao = obterSubtipoPocao(item);
        if (!subtipoPocao || !item.id) {
            mostrarMensagemInv('Este consumível não possui uma ação de uso válida no servidor.', '#ffbf69');
            return;
        }
        enviarAcaoInventario({ action: 'usar_pocao', subtipo: subtipoPocao, id: item.id }, 'Usando item selecionado; aguardando servidor...');
    }
};

window.alternarBloqueioItemSelecionado = function() {
    let item = window._mochilaItemSelecionado;
    if (!item || item.tipo !== 'equipamento') return;
    if (!item.id) {
        mostrarMensagemInv('Item sem identificador do servidor; operação cancelada.', '#ff7676');
        return;
    }
    enviarAcaoInventario({ action: item.locked ? 'desbloquear_item' : 'bloquear_item', id: item.id, uid: item.uid || null },
        item.locked ? 'Desbloqueando; aguardando servidor...' : 'Bloqueando; aguardando servidor...');
};

let _mochilaItemSelecionado = null;
window._mochilaItemSelecionado = null;
window._slotEquipadoSelecionado = null;
window._itemEquipadoSelecionadoId = null;

document.querySelectorAll(".mochila-aba").forEach(el => {
    el.addEventListener("click", function() {
        let aba = this.getAttribute("data-aba") || (this.closest('.mochila-aba') && this.closest('.mochila-aba').getAttribute('data-aba'));
        if (aba) setAbaMochila(aba);
    });
});

const inputBuscaMochila = document.getElementById('mochila-busca');
if (inputBuscaMochila) inputBuscaMochila.addEventListener('input', function () {
    buscaMochila = this.value.trim();
    renderizarMochila();
});

const filtroRaridadeMochila = document.getElementById('mochila-filtro-raridade');
if (filtroRaridadeMochila) filtroRaridadeMochila.addEventListener('change', function () {
    raridadeMochilaFiltro = this.value;
    renderizarMochila();
});

document.querySelectorAll('.mochila-filtro-slot').forEach(function (el) {
    el.addEventListener('click', function () {
        setFiltroSlotMochila(this.getAttribute('data-slot-filtro'));
    });
});

document.querySelectorAll('[data-aba-extra]').forEach(function (el) {
    el.addEventListener('click', function () {
        document.getElementById('inv-menu-categorias').hidden = true;
        setAbaMochila(this.getAttribute('data-aba-extra'));
    });
});

document.querySelectorAll('[data-slot-filtro-extra]').forEach(function (el) {
    el.addEventListener('click', function () {
        document.getElementById('inv-menu-slots').hidden = true;
        setFiltroSlotMochila(this.getAttribute('data-slot-filtro-extra'));
    });
});

document.getElementById('btn-inv-categorias-extra').addEventListener('click', function () {
    let menu = document.getElementById('inv-menu-categorias');
    menu.hidden = !menu.hidden;
    document.getElementById('inv-menu-slots').hidden = true;
});

document.getElementById('btn-inv-slot-extra').addEventListener('click', function () {
    let menu = document.getElementById('inv-menu-slots');
    menu.hidden = !menu.hidden;
    document.getElementById('inv-menu-categorias').hidden = true;
});

document.getElementById('btn-inv-organizar').addEventListener('click', function () {
    window.alternarOrdenacaoMochila();
});

window.alternarOrdenacaoMochila = function() {
    ordenacaoMochila = (ordenacaoMochila + 1) % ORDENACOES_MOCHILA.length;
    mostrarMensagemInv('Mochila ordenada por ' + ORDENACOES_MOCHILA[ordenacaoMochila].nome + '.');
    renderizarMochila();
};

window.equiparItemSelecionado = function(item) {
    if (!item) item = window._mochilaItemSelecionado;
    if (!item || item.tipo !== 'equipamento') return;
    let motivoNaoEquipavel = motivoItemNaoEquipavelNoCliente(item);
    if (motivoNaoEquipavel) {
        mostrarMensagemInv(motivoNaoEquipavel, '#ffbf69');
        return;
    }
    if (!item.id) {
        mostrarMensagemInv('Item sem identificador do servidor; operação cancelada.', '#ff7676');
        return;
    }
    enviarAcaoInventario({ action: 'equipar_item', id: item.id, uid: item.uid || null }, 'Equipando; aguardando servidor...');
};

window.desequiparSlotSelecionado = function(slot) {
    if (!slot) slot = window._slotEquipadoSelecionado;
    if (!slot) return;
    if (!Object.prototype.hasOwnProperty.call(window.inventario, slot) || !window.inventario[slot]) {
        mostrarMensagemInv('Esse espaço não contém um item equipado.', '#ffbf69');
        return;
    }
    enviarAcaoInventario({ action: 'desequipar_item', slot: slot }, 'Desequipando; aguardando servidor...');
};

window.destruirItemConfirm = function(item) {
    if (!item) return;
    if (item.locked) {
        mostrarMensagemInv("🔒 Item bloqueado — desbloqueie antes de destruir.", "#f39c12");
        if (window.floatingTexts) window.floatingTexts.push({ x: window.meuX + 12, y: window.meuY - 30, text: "🔒 Bloqueado", color: "#f39c12", alpha: 1.0 });
        return;
    }
    if (typeof mostrarConfirmacao === 'function') {
        mostrarConfirmacao("Destruir " + (item.nome || "este item") + "? Essa ação não pode ser desfeita!", function () {
            destruirItem(item);
        });
    } else {
        destruirItem(item);
    }
};

window.destruirItemSelecionado = function() {
    destruirItemConfirm(window._mochilaItemSelecionado);
};

function destruirItem(item) {
    if (!item) return;
    if (!item.id) {
        mostrarMensagemInv('Item sem identificador do servidor; operação cancelada.', '#ff7676');
        return;
    }
    enviarAcaoInventario({ action: 'destruir_item', id: item.id }, 'Destruindo; aguardando servidor...');
}

window.organizarMochila = function() {
    window.alternarOrdenacaoMochila();
};

// ======= DESENHAR DROP NO CHÃO (efeito + partículas por raridade) =======
window.desenharDrop = function(drop) {
    if (!window.ctx || !drop || !drop.item) return;
    let ctx = window.ctx;
    let t = Date.now() / 1000;
    let cor = drop.item.cor || '#ffffff';
    let rar = drop.item.raridade || null;
    let grandao = (rar === 'epico' || rar === 'lendario');
    let x = drop.x, y = drop.y;
    let hash = 0;
    let idStr = String(drop.id || '');
    for (let i = 0; i < idStr.length; i++) hash = ((hash << 5) - hash + idStr.charCodeAt(i)) | 0;

    // Brilho circular pulsante no chão (maior e mais intenso p/ Épico/Lendário)
    let pulso = 0.55 + Math.sin(t * 4.5 + (hash % 7)) * 0.45;
    ctx.save();
    ctx.fillStyle = cor;
    ctx.globalAlpha = grandao ? (0.25 + pulso * 0.3) : (0.15 + pulso * 0.18);
    ctx.shadowColor = cor;
    ctx.shadowBlur = grandao ? 40 : 22;
    ctx.beginPath();
    ctx.ellipse(x, y + 6, grandao ? 40 : 26, grandao ? 15 : 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Coluna de partículas subindo (mais partículas e mais alto p/ Épico/Lendário)
    let np = grandao ? 16 : 7;
    for (let i = 0; i < np; i++) {
        let phase = t * 1.6 + hash * 0.3 + i * 1.9;
        let px = x + Math.sin(phase) * (grandao ? 22 : 14);
        let pct = ((t * (grandao ? 40 : 28) + i * 23 + hash) % (grandao ? 70 : 46)) / (grandao ? 70 : 46);
        let py = y + 5 - pct * (grandao ? 70 : 44);
        let alpha = Math.max(0, 0.85 - pct * 1.2);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = cor;
        ctx.shadowColor = cor;
        ctx.shadowBlur = grandao ? 12 : 7;
        ctx.beginPath();
        ctx.arc(px, py, (grandao ? 3.6 : 2.4) + (1 - pct) * (grandao ? 2.2 : 1.2), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // Pilar de luz (só Épico/Lendário)
    if (grandao) {
        ctx.save();
        let grad = ctx.createLinearGradient(0, y - 78, 0, y + 6);
        grad.addColorStop(0, 'rgba(255,255,255,0)');
        grad.addColorStop(1, cor + '55');
        ctx.globalAlpha = 0.35 + pulso * 0.25;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(x - 9, y + 6);
        ctx.lineTo(x - 4, y - 78);
        ctx.lineTo(x + 4, y - 78);
        ctx.lineTo(x + 9, y + 6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    // Ícone do item flutuando (maior p/ Épico/Lendário)
    ctx.save();
    ctx.font = Math.round((grandao ? 26 : 19) + pulso * 2) + "px Arial";
    ctx.textAlign = "center";
    ctx.shadowColor = grandao ? cor : "#000";
    ctx.shadowBlur = grandao ? 18 : 6;
    ctx.fillText(drop.item.icon || '🎒', x, y - 5 + Math.sin(t * 2.2 + (hash % 7)) * 3);
    ctx.restore();

    // Raridade label (destacada p/ Épico/Lendário)
    ctx.save();
    ctx.font = "bold " + (grandao ? 11 : 9) + "px Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = cor;
    ctx.shadowColor = "#000";
    ctx.shadowBlur = 3;
    ctx.fillText(drop.item.raridadeNome || '', x, grandao ? y - 34 : y - 20);
    ctx.restore();
};