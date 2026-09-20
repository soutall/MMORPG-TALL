/* ===== ATRIBUTOS (distribuição de pontos de status) — client-side =====
   Janela de Status com os 8 atributos do jogo. A validação é 100% no servidor. */

const ATRIBUTOS_INFO = [
    { chave: 'forca',        icone: '⚔️', nome: 'Força',        bonus: '+Dano físico | +HP por ponto' },
    { chave: 'inteligencia', icone: '🔮', nome: 'Inteligência',  bonus: '+Dano mágico | +regen de MP' },
    { chave: 'agilidade',    icone: '💨', nome: 'Agilidade',     bonus: '+Velocidade de movimento' },
    { chave: 'destreza',     icone: '🎯', nome: 'Destreza',      bonus: '+Chance e dano crítico' },
    { chave: 'vida',         icone: '❤️', nome: 'Vida',          bonus: '+Vida máxima direta' },
    { chave: 'profanidade',  icone: '☠️', nome: 'Profanidade',   bonus: '+Dano de DoT (veneno/sangramento)' },
    { chave: 'divindade',    icone: '✨', nome: 'Divindade',     bonus: '+Cura/escudo recebidos e dados' },
    { chave: 'afinidade',    icone: '🐾', nome: 'Afinidade',     bonus: '+Dano e vida de pets/lacaios' }
];

const ATRIBUTOS_SCREEN = document.getElementById("atributos-screen");
window.atributosAberto = false;
window.meusAtributos = window.meusAtributos || { forca: 1, inteligencia: 1, agilidade: 1, destreza: 1, vida: 1, profanidade: 1, divindade: 1, afinidade: 1 };
window.pontosDisponiveis = window.pontosDisponiveis || 0;
window.meuMaxHp = window.meuMaxHp || 100;

function abrirAtributos() {
    if (window.estaMorto) return;
    if (charSelectScreen && charSelectScreen.style.display === "flex") return;
    window.atributosAberto = true;
    ATRIBUTOS_SCREEN.style.display = "flex";
    renderizarAtributos();
}

function fecharAtributos() {
    window.atributosAberto = false;
    ATRIBUTOS_SCREEN.style.display = "none";
}

function toggleAtributos() {
    if (window.atributosAberto) fecharAtributos(); else abrirAtributos();
}

function renderizarAtributos() {
    let lista = document.getElementById("atributos-lista");
    if (!lista) return;
    renderizarDetalhes();
    let pts = window.pontosDisponiveis || 0;
    let elPontos = document.getElementById("atributos-pontos");
    if (elPontos) elPontos.innerText = "Pontos disponíveis: " + pts;

    let elResumo = document.getElementById("atributos-hp-resumo");
    if (elResumo) elResumo.innerText = "❤️ Vida: " + Math.round(window.meuHp || 100) + " / " + (window.meuMaxHp || 100);

    let btnReset = document.getElementById("btn-atributos-resetar");
    if (btnReset) { btnReset.disabled = false; btnReset.textContent = "RESETAR"; }

    lista.innerHTML = "";
    ATRIBUTOS_INFO.forEach(attr => {
        let valor = (window.meusAtributos && window.meusAtributos[attr.chave]) || 1;
        let bonus = 0;
        if (window.atributosTotais && window.atributosTotais[attr.chave] !== undefined) {
            bonus = window.atributosTotais[attr.chave] - valor;
        }

        let btnPlus = document.createElement("button");
        btnPlus.className = "atributo-btn-mais";
        btnPlus.textContent = "+";
        btnPlus.disabled = pts <= 0;
        btnPlus.onclick = function () {
            if ((window.pontosDisponiveis || 0) <= 0) return;
            btnPlus.disabled = true;
            btnPlus.textContent = "...";
            distribuirPontoAtributo(attr.chave);
        };

        let colunaInfo = document.createElement("div");
        colunaInfo.className = "atributo-info";
        colunaInfo.innerHTML =
            '<div class="atributo-icone">' + attr.icone + '</div>' +
            '<div class="atributo-texto">' +
                '<div class="atributo-nome">' + attr.nome + ' <span class="atributo-valor">' + valor
                    + (bonus > 0 ? ' <b class="atributo-bonus-equip">+' + bonus + '</b>' : '') + '</span></div>' +
                '<div class="atributo-bonus">' + attr.bonus + '</div>' +
            '</div>';

        let linha = document.createElement("div");
        linha.className = "atributo-linha";
        linha.appendChild(btnPlus);
        linha.appendChild(colunaInfo);

        lista.appendChild(linha);
    });
}

function distribuirPontoAtributo(chave) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'distribuir_ponto', atributo: chave }));
    }
}

// Janela ao lado de STATUS: status detalhados calculados (mesmas fórmulas do servidor)
function renderizarDetalhes() {
    let lista = document.getElementById("detalhes-lista");
    if (!lista) return;
    let a = window.atributosTotais || window.meusAtributos || {};
    let g = function (k) { return a[k] || 1; };
    let maxHp = Math.round(100 + (g('vida') - 1) * 20 + (g('forca') - 1) * 4);
    let maxMana = Math.round(50 + (g('inteligencia') - 1) * 10);
    let critChance = Math.round((0.05 + (g('destreza') - 1) * 0.01) * 100);
    let critMult = Math.round((1.5 + (g('destreza') - 1) * 0.03) * 100) / 100;
    let danoFisico = Math.round((g('forca') - 1) * 0.05 * 100);
    let danoMagico = Math.round((g('inteligencia') - 1) * 0.05 * 100);
    let curaBonus = Math.round((g('divindade') - 1) * 0.05 * 100);
    let dotBonus = Math.round((g('profanidade') - 1) * 0.05 * 100);
    let petDano = Math.round((g('afinidade') - 1) * 0.05 * 100);
    let petVida = Math.round(90 + (g('afinidade') - 1) * 15);
    let veloc = Math.round((g('agilidade') - 1) * 0.03 * 100);

    // Velocidade de ataque (mesma fórmula do servidor: buff Grito de Guerra + equipamentos)
    let multAtaqueLocal = 1;
    if ((window.meusEfeitos || []).some(function (e) { return e && e.id === 'gritoDeGuerra' && e.tempo > 0; })) multAtaqueLocal *= 0.90;
    let invAtual = window.inventario || {};
    for (let ch in invAtual) {
        let it = invAtual[ch];
        if (it && it.status && typeof it.status.velocidadeAtaque === 'number' && it.status.velocidadeAtaque > 0) {
            multAtaqueLocal *= (1 - Math.min(0.20, it.status.velocidadeAtaque / 100));
        }
    }
    multAtaqueLocal = Math.max(0.4, Math.min(1, multAtaqueLocal));
    let velAtaquePct = Math.round((1 - multAtaqueLocal) * 100);

    let linhas = [
        { nome: '❤️ Vida Máx', valor: maxHp },
        { nome: '🔋 Mana Máx', valor: maxMana },
        { nome: '🎯 Crít. chance', valor: critChance + '%' },
        { nome: '💥 Dano crítico', valor: 'x' + critMult },
        { nome: '⚔️ Dano físico', valor: '+' + danoFisico + '%' },
        { nome: '🔮 Dano mágico', valor: '+' + danoMagico + '%' },
        { nome: '✨ Cura', valor: '+' + curaBonus + '%' },
        { nome: '☠️ DoT', valor: '+' + dotBonus + '%' },
        { nome: '🐾 Pet dano', valor: '+' + petDano + '%' },
        { nome: '🐾 Pet vida', valor: petVida },
        { nome: '💨 Velocidade', valor: '+' + veloc + '%' },
        { nome: '⚡ Vel. de ataque', valor: '+' + velAtaquePct + '%' }
    ];

    lista.innerHTML = "";
    linhas.forEach(function (ln) {
        let div = document.createElement("div");
        div.className = "detalhe-linha";
        div.innerHTML = '<span class="detalhe-nome">' + ln.nome + '</span><span class="detalhe-valor">' + ln.valor + '</span>';
        lista.appendChild(div);
    });
}

// Confirmação própria do jogo (sem confirm() nativo, que quebra o fullscreen/orientação no celular)
let acaoConfirmada = null;

function mostrarConfirmacao(mensagem, onOk) {
    acaoConfirmada = onOk;
    let elMsg = document.getElementById("confirm-mensagem");
    let elScreen = document.getElementById("confirm-screen");
    if (elMsg) elMsg.innerText = mensagem;
    if (elScreen) elScreen.style.display = "flex";
    if (typeof tentarHorizontalAutomatico === "function") tentarHorizontalAutomatico();
}

function fecharConfirmacao() {
    acaoConfirmada = null;
    let elScreen = document.getElementById("confirm-screen");
    if (elScreen) elScreen.style.display = "none";
}

function confirmarAcao() {
    let fn = acaoConfirmada;
    fecharConfirmacao();
    if (fn) fn();
}

function resetarAtributos() {
    mostrarConfirmacao("Resetar todos os status? Todos os pontos gastos serão devolvidos.", function () {
        let btn = document.getElementById("btn-atributos-resetar");
        if (btn) { btn.disabled = true; btn.textContent = "..."; }
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ action: 'resetar_atributos' }));
        }
    });
}

document.addEventListener("DOMContentLoaded", function () {
    if (ATRIBUTOS_SCREEN) {
        ATRIBUTOS_SCREEN.addEventListener("click", function (e) {
            if (e.target === ATRIBUTOS_SCREEN) fecharAtributos();
        });
    }
});