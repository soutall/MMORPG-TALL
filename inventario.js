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
    profanidade: 'Profanidade',
    divindade: 'Divindade',
    afinidade: 'Afinidade',
    velocidadeAtaque: 'Vel. de Ataque'
};

function formatarNomeAtributo(k) {
    if (NOMES_ATRIBUTOS[k]) return NOMES_ATRIBUTOS[k];
    return k.charAt(0).toUpperCase() + k.slice(1);
}

function formatarStatsVertical(status) {
    if (!status) return '';
    let chaves = Object.keys(status).filter(k => status[k] !== undefined && status[k] !== null && status[k] !== 0);
    if (!chaves.length) return '';
    let html = '<div class="inv-stats-vertical">';
    chaves.forEach(k => {
        let v = status[k];
        let vStr = (typeof v === 'number' && v > 0) ? ('+' + v) : String(v);
        html += '<div class="stat-linha">'
            + '<span class="stat-nome">' + formatarNomeAtributo(k) + ' :</span>'
            + '<span class="stat-val">' + vStr + '</span>'
            + '</div>';
    });
    html += '</div>';
    return html;
}

function abrirInventario() {
    if (window.estaMorto) return;
    if (charSelectScreen && charSelectScreen.style.display === "flex") return;
    window.inventarioAberto = true;
    inventoryScreen.style.display = "flex";
    renderizarInventario();
    renderizarMochila();
    let infoEl = document.getElementById("inv-info");
    if (infoEl) infoEl.innerHTML = '<div class="slot-vazio-info"><span class="slot-vazio-desc">Toque em um item para inspecionar.</span></div>';
    let cmp = document.getElementById('inv-comparacao');
    if (cmp) { cmp.style.display = 'none'; cmp.innerHTML = ''; }
}

function fecharInventario() {
    window.inventarioAberto = false;
    inventoryScreen.style.display = "none";
    let cmp = document.getElementById('inv-comparacao');
    if (cmp) { cmp.style.display = 'none'; cmp.innerHTML = ''; }
}

function toggleInventario() {
    if (window.inventarioAberto) fecharInventario(); else abrirInventario();
}

function classePodeUsarItemNoCliente(item) {
    if (item && item.classe && window.minhaClasse && item.classe !== window.minhaClasse) return false;
    return true;
}

function renderizarInventario() {
    document.querySelectorAll(".inv-slot").forEach(slotEl => {
        let chave = slotEl.getAttribute("data-slot");
        let ocupado = !!window.inventario[chave];
        slotEl.classList.toggle("ocupado", ocupado);
        // auras/bloqueio/upgrade do item equipado
        slotEl.classList.remove("upg-glow-10", "upg-glow-15", "upg-glow-20");
        let badgeAntigo = slotEl.querySelector(':scope > .upg-badge');
        if (badgeAntigo) badgeAntigo.remove();
        let lockAntigo = slotEl.querySelector(':scope > .lock-ico');
        if (lockAntigo) lockAntigo.remove();
        if (ocupado) {
            let item = window.inventario[chave];
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
        let mini = slotEl.querySelector('.inv-slot-mini');
        if (mini) mini.remove();
        if (ocupado) {
            let btnMini = document.createElement("button");
            btnMini.className = "inv-slot-mini";
            btnMini.textContent = "↩️";
            btnMini.title = "Desequipar";
            btnMini.addEventListener("click", function(e) {
                e.stopPropagation();
                desequiparSlotSelecionado(chave);
            });
            slotEl.appendChild(btnMini);
        }
    });
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
    let el = document.getElementById("inv-info");
    let cmp = document.getElementById('inv-comparacao');
    if (cmp) { cmp.style.display = 'none'; cmp.innerHTML = ''; }

    if (item && item.tipo === 'equipamento') {
        window._slotEquipadoSelecionado = chave;
        let cor = item.cor || (item.raridade === 'lendario' ? '#ff7a00' : (item.raridade === 'epico' ? '#a855f7' : (item.raridade === 'raro' ? '#4da6ff' : '#ffffff')));
        let nivelUp = Math.max(0, item.upgrade || 0);

        let html = '<div class="item-card-detalhes">';
        html += '<div class="item-card-topo">';
        html +=   '<span class="item-card-ico">' + (item.icon || '🛡️') + '</span>';
        html +=   '<div class="item-card-titulos">';
        html +=     '<div class="item-card-nome" style="color:' + cor + '">' + (item.nome || info.nome) + (nivelUp > 0 ? ' <span class="upg-badge">+' + nivelUp + '</span>' : '') + '</div>';
        html +=     '<div class="item-card-tags">';
        html +=       '<span class="tag-tipo">EQUIPADO</span>';
        if (item.raridadeNome) html += ' <span class="tag-rar" style="color:' + cor + '">' + item.raridadeNome + '</span>';
        if (item.locked) html += ' <span class="tag-lock">🔒</span>';
        html +=     '</div>';
        html +=   '</div>';
        html += '</div>';

        if (item.desc) html += '<div class="item-card-desc">' + item.desc + '</div>';
        if (item.status) html += formatarStatsVertical(item.status);
        html += '</div>';

        if (el) el.innerHTML = html;
    } else if (item) {
        let html = '<div class="item-card-detalhes">';
        html += '<div class="item-card-topo">';
        html +=   '<span class="item-card-ico">' + (item.icon || '🎒') + '</span>';
        html +=   '<div class="item-card-titulos">';
        html +=     '<div class="item-card-nome">' + (item.nome || info.nome) + '</div>';
        html +=   '</div>';
        html += '</div>';
        if (item.desc) html += '<div class="item-card-desc">' + item.desc + '</div>';
        html += '</div>';
        if (el) el.innerHTML = html;
    } else {
        if (el) {
            el.innerHTML = '<div class="slot-vazio-info"><span class="slot-vazio-ico">' + (info.nome.slice(0, 2)) + '</span><span class="slot-vazio-nome">' + info.nome + ': VAZIO</span><span class="slot-vazio-desc">' + info.desc + '</span></div>';
        }
    }

    let btnEq = document.getElementById('btn-inv-equipar');
    if (btnEq) btnEq.style.display = 'none';
    let btnDeq = document.getElementById('btn-inv-desequipar');
    if (btnDeq) btnDeq.style.display = 'none';
    let btnDest = document.getElementById('btn-inv-destruir');
    if (btnDest) btnDest.style.display = 'none';
}

document.querySelectorAll(".inv-slot").forEach(slotEl => {
    slotEl.addEventListener("click", function () {
        if (window.__dndClickSuprimido && window.__dndClickSuprimido()) return;
        selecionarSlot(this.getAttribute("data-slot"));
    });
});
if (inventoryScreen) inventoryScreen.addEventListener("click", function(e) { if (e.target === inventoryScreen) fecharInventario(); });

/* ===== MOCHILA (abas: todos, consumíveis, itens, quest, cosméticos) ===== */
window.mochila = [];
let abaMochilaAtiva = 'todos';
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
    document.querySelectorAll(".mochila-aba").forEach(el => {
        el.classList.toggle("ativa", el.getAttribute("data-aba") === abaChave);
    });
    renderizarMochila();
}

function renderizarMochila() {
    let grade = document.getElementById("mochila-grade");
    if (!grade) return;
    let aba = ABAS_MOCHILA.find(a => a.chave === abaMochilaAtiva) || ABAS_MOCHILA[0];
    let itens = aba.filtro ? window.mochila.filter(i => i.tipo === aba.filtro) : window.mochila.slice();
    grade.innerHTML = "";
    itens.forEach(item => {
        let div = document.createElement("div");
        div.className = "mochila-slot" + (item.tipo === 'equipamento' ? " mochila-slot-equip" : "")
            + (item.raridade === 'raro' ? " equip-raro" : (item.raridade === 'epico' ? " equip-epico" : (item.raridade === 'lendario' ? " equip-lendario" : "")))
            + (item.tipo === 'pedra' ? " pedra-rarita" : "");
        div.title = item.nome || "";
        div.setAttribute("data-id", item.id); // usado pelo sistema Drag & Drop
        div.innerHTML = '<span class="slot-ico">' + item.icon + '</span>'
            + (item.quantidade > 1 ? '<span class="qtd-badge">' + item.quantidade + '</span>' : '');

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

        if (item.tipo === 'equipamento') {
            let podeEq = classePodeUsarItemNoCliente(item);
            let btnEq = document.createElement("button");
            btnEq.className = "mochila-mini mochila-mini-eq" + (podeEq ? "" : " bloqueado");
            btnEq.textContent = "⚔️";
            btnEq.title = podeEq ? "Equipar" : "Sua classe não pode usar esse item";
            btnEq.addEventListener("click", function(e) {
                e.stopPropagation();
                if (item.locked) {
                    invInfo.innerText = "🔒 " + (item.nome || "Item") + " bloqueado — desbloqueie antes de equipar? (itens bloqueados PODEM ser equipados)";
                    equiparItemSelecionado(item);
                    return;
                }
                if (!podeEq) {
                    invInfo.innerText = "⚠️ " + (item.nome || "Item") + " — sua classe não pode usar!";
                    window.floatingTexts.push({ x: window.meuX + 12, y: window.meuY - 30, text: "⚠️ Classe não pode usar", color: "#f39c12", alpha: 1.0 });
                    return;
                }
                equiparItemSelecionado(item);
            });
            div.appendChild(btnEq);
        }

        let btnLx = document.createElement("button");
        btnLx.className = "mochila-mini mochila-mini-lx";
        btnLx.textContent = item.locked ? "🔒" : "🗑️";
        btnLx.title = item.locked ? "Bloqueado (toque para desbloquear)" : "Destruir";
        btnLx.addEventListener("click", function(e) {
            e.stopPropagation();
            if (item.locked) {
                // desbloqueia direto (rápido) — o servidor valida de novo
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ action: 'desbloquear_item', id: item.id, uid: item.uid || null }));
                }
                invInfo.innerText = "🔓 Desbloqueando " + (item.nome || "item") + "...";
                return;
            }
            destruirItemConfirm(item);
        });
        div.appendChild(btnLx);

        div.addEventListener("click", function () {
            if (window.__dndClickSuprimido && window.__dndClickSuprimido()) return;
            selecionarItemMochila(item);
        });
        grade.appendChild(div);
    });
    let resto = Math.max(0, 16 - itens.length);
    for (let i = 0; i < resto; i++) {
        let vazio = document.createElement("div");
        vazio.className = "mochila-slot-vazio";
        grade.appendChild(vazio);
    }
}

// Comparação EQUIPADO vs INVENTÁRIO (dentro do inventário, embaixo dos slots equipados)
function renderizarComparacao(item) {
    let el = document.getElementById('inv-comparacao');
    if (!el) return;
    if (!item || item.tipo !== 'equipamento' || !item.status) { el.style.display = 'none'; el.innerHTML = ''; return; }
    let equipado = window.inventario[item.slot];
    if (!equipado || !equipado.status) { el.style.display = 'none'; el.innerHTML = ''; return; }

    let chaves = Object.keys(Object.assign({}, equipado.status || {}, item.status || {}));
    if (!chaves.length) { el.style.display = 'none'; el.innerHTML = ''; return; }

    let corEq = equipado.cor || (equipado.raridade === 'lendario' ? '#ff7a00' : (equipado.raridade === 'epico' ? '#a855f7' : (equipado.raridade === 'raro' ? '#4da6ff' : '#ffffff')));
    let corItem = item.cor || (item.raridade === 'lendario' ? '#ff7a00' : (item.raridade === 'epico' ? '#a855f7' : (item.raridade === 'raro' ? '#4da6ff' : '#ffffff')));

    let html = '<div class="cmp-bloco">';
    html += '<div class="cmp-titulo">⚔️ COMPARAÇÃO</div>';
    html += '<div class="cmp-cabecalho-itens">';
    html +=   '<div class="cmp-item-col"><span class="cmp-sub">EQUIPADO</span><span class="cmp-nome-item" style="color:' + corEq + '">' + (equipado.icon || '🛡️') + ' ' + (equipado.nome || 'Atual') + '</span></div>';
    html +=   '<div class="cmp-vs-badge">VS</div>';
    html +=   '<div class="cmp-item-col"><span class="cmp-sub">MOCHILA</span><span class="cmp-nome-item" style="color:' + corItem + '">' + (item.icon || '🎒') + ' ' + (item.nome || 'Novo') + '</span></div>';
    html += '</div>';

    html += '<div class="cmp-stats-linhas">';
    chaves.forEach(k => {
        let a = Number(equipado.status[k]) || 0;
        let b = Number(item.status[k]) || 0;
        let diff = b - a;
        let cl = (diff > 0) ? 'cmp-melhor' : (diff < 0) ? 'cmp-pior' : 'cmp-igual';
        let diffStr = (diff > 0) ? (' (+' + diff + ')') : (diff < 0) ? (' (' + diff + ')') : '';

        html += '<div class="cmp-linha-dupla">';
        html +=   '<span class="stat-nome">' + formatarNomeAtributo(k) + ' :</span>';
        html +=   '<span class="cmp-valores">';
        html +=     '<span class="stat-val-equip">' + (a > 0 ? '+' + a : a) + '</span>';
        html +=     '<span class="cmp-seta">➔</span>';
        html +=     '<span class="stat-val-novo ' + cl + '">' + (b > 0 ? '+' + b : b) + '<span class="cmp-diff">' + diffStr + '</span></span>';
        html +=   '</span>';
        html += '</div>';
    });
    html += '</div></div>';

    el.innerHTML = html;
    el.style.display = 'block';
}

function selecionarItemMochila(item) {
    window._mochilaItemSelecionado = item;
    let cor = item.cor || (item.raridade === 'lendario' ? '#ff7a00' : (item.raridade === 'epico' ? '#a855f7' : (item.raridade === 'raro' ? '#4da6ff' : '#ffffff')));
    let nivelUp = Math.max(0, item.upgrade || 0);
    let podeEq = classePodeUsarItemNoCliente(item);

    let html = '<div class="item-card-detalhes">';
    html += '<div class="item-card-topo">';
    html +=   '<span class="item-card-ico">' + (item.icon || '🎒') + '</span>';
    html +=   '<div class="item-card-titulos">';
    html +=     '<div class="item-card-nome" style="color:' + cor + '">' + (item.nome || 'Item') + (nivelUp > 0 ? ' <span class="upg-badge">+' + nivelUp + '</span>' : '') + (item.quantidade > 1 ? ' <span class="qtd-badge">x' + item.quantidade + '</span>' : '') + '</div>';
    html +=     '<div class="item-card-tags">';
    html +=       '<span class="tag-tipo">' + (item.tipo || '').toUpperCase() + '</span>';
    if (item.raridadeNome) html += ' <span class="tag-rar" style="color:' + cor + '">' + item.raridadeNome + '</span>';
    if (item.classe) html += ' <span class="tag-classe ' + (podeEq ? '' : 'tag-classe-invalida') + '">' + item.classe.toUpperCase() + (podeEq ? '' : ' ⚠️') + '</span>';
    if (item.locked) html += ' <span class="tag-lock">🔒 BLOQUEADO</span>';
    html +=     '</div>';
    html +=   '</div>';
    html += '</div>';

    if (item.desc) html += '<div class="item-card-desc">' + item.desc + '</div>';
    if (item.tipo === 'equipamento' && item.status) {
        html += formatarStatsVertical(item.status);
    }
    html += '</div>';

    let el = document.getElementById("inv-info");
    if (el) el.innerHTML = html;

    let btnDest = document.getElementById('btn-inv-destruir');
    if (btnDest) btnDest.style.display = '';
    let btnBloq = document.getElementById('btn-inv-bloquear');
    if (btnBloq) {
        if (item.tipo === 'equipamento') {
            btnBloq.style.display = '';
            btnBloq.textContent = item.locked ? "🔓" : "🔒";
            btnBloq.title = item.locked ? "Desbloquear" : "Bloquear";
        } else {
            btnBloq.style.display = 'none';
        }
    }
    renderizarComparacao(item);
}

// Bloqueia/desbloqueia o item selecionado na mochila (o SERVIDOR valida e persiste)
function mostrarMensagemInv(texto, cor) {
    let el = document.getElementById("inv-info");
    if (el) el.innerHTML = '<div class="slot-vazio-info"><span class="slot-vazio-desc"' + (cor ? ' style="color:' + cor + '"' : '') + '>' + texto + '</span></div>';
    let cmp = document.getElementById('inv-comparacao');
    if (cmp) { cmp.style.display = 'none'; cmp.innerHTML = ''; }
}

window.alternarBloqueioItemSelecionado = function() {
    let item = window._mochilaItemSelecionado;
    if (!item || item.tipo !== 'equipamento') return;
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: item.locked ? 'desbloquear_item' : 'bloquear_item', id: item.id, uid: item.uid || null }));
    }
    mostrarMensagemInv(item.locked ? "🔓 Desbloqueando..." : "🔒 Bloqueando...");
};

let _mochilaItemSelecionado = null;
window._mochilaItemSelecionado = null;
window._slotEquipadoSelecionado = null;

document.querySelectorAll(".mochila-aba").forEach(el => {
    el.addEventListener("click", function() {
        let aba = this.getAttribute("data-aba") || (this.closest('.mochila-aba') && this.closest('.mochila-aba').getAttribute('data-aba'));
        if (aba) setAbaMochila(aba);
    });
});

window.equiparItemSelecionado = function(item) {
    if (!item) item = window._mochilaItemSelecionado;
    if (!item || item.tipo !== 'equipamento') return;
    if (!classePodeUsarItemNoCliente(item)) {
        mostrarMensagemInv("⚠️ " + (item.nome || "Item") + " — sua classe não pode usar!", "#e74c3c");
        return;
    }
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'equipar_item', id: item.id }));
    }
    let btnEq = document.getElementById('btn-inv-equipar');
    if (btnEq) btnEq.style.display = 'none';
    window._mochilaItemSelecionado = null;
    mostrarMensagemInv("⚔️ Equipando...");
};

window.desequiparSlotSelecionado = function(slot) {
    if (!slot) slot = window._slotEquipadoSelecionado;
    if (!slot) return;
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'desequipar_item', slot: slot }));
    }
    window._slotEquipadoSelecionado = null;
    mostrarMensagemInv("↩️ Desequipando...");
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
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'destruir_item', id: item.id }));
    }
    window._mochilaItemSelecionado = null;
    let btnDest = document.getElementById('btn-inv-destruir');
    if (btnDest) btnDest.style.display = 'none';
    mostrarMensagemInv("🗑️ Destruindo...");
}

window.organizarMochila = function() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'organizar_mochila' }));
    }
    mostrarMensagemInv("🗂️ Organizando mochila...");
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