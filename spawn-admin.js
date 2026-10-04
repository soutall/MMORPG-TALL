// spawn-admin.js - Painel de Gerenciamento de Bandeiras de Spawn (modo admin)
// Registra o botão no HUD, a janela de configuração, o desenho das bandeiras no Canvas
// e o clique/toque em cima de uma bandeira para editá-la.

window.listaBandeiras = window.listaBandeiras || [];
window.spawnAdminAberto = false;
window.spawnAdminEditando = null;
window.ehAdmin = false;

var SPAWN_TIPOS = [
    { key: 'slime', nome: '🟢 Slime (Nível 1 · Planície das Plantas)', baseHp: 80, boss: false, cor: '#7fcf45' },
    { key: 'slime_elite', nome: '👑 Slime Elite (Planície das Plantas)', baseHp: 8000, boss: false, cor: '#b6ff55' },
    { key: 'besouro_dourado', nome: '🪲 Besouro Dourado (Deserto Escaldante)', baseHp: 1800, boss: false, cor: '#d6ad35' },
    { key: 'escorpiao_escaldante', nome: '🦂 Escorpião Escaldante (Deserto Escaldante)', baseHp: 2200, boss: false, cor: '#b87545' },
    { key: 'formiga_sauva', nome: '🐜 Formiga Saúva (Deserto Escaldante)', baseHp: 1100, boss: false, cor: '#815033' },
    { key: 'besouro_negro_deserto', nome: '👑 Besouro Negro Elite (Deserto Escaldante)', baseHp: 30000, boss: false, cor: '#282a2d' },
    { key: 'cogumelo_proibido', nome: '🍄 Cogumelo Proibido (Selva Proibida)', baseHp: 1600, boss: false, cor: '#ba59d1' },
    { key: 'anaconda_selvagem', nome: '🐍 Anaconda Selvagem (Selva Proibida)', baseHp: 2600, boss: false, cor: '#4c9b45' },
    { key: 'jararaca', nome: '🐍 Jararaca (Selva Proibida)', baseHp: 1900, boss: false, cor: '#a36b3f' },
    { key: 'louvadermi', nome: '🦗 Louvadermi (Selva Proibida)', baseHp: 2100, boss: false, cor: '#76a63b' }
];

function spawnTipoInfo(key) {
    for (var i = 0; i < SPAWN_TIPOS.length; i++) if (SPAWN_TIPOS[i].key === key) return SPAWN_TIPOS[i];
    return null;
}

(function montarSpawnAdminUI() {
    var barra = document.getElementById('util-buttons');
    if (barra) {
        var btn = document.createElement('button');
        btn.id = 'btn-admin-spawn';
        btn.className = 'btn-util btn-admin-spawn';
        btn.innerHTML = '🚩';
        btn.setAttribute('ontouchstart', 'toggleSpawnAdmin(); event.stopPropagation();');
        btn.setAttribute('onclick', 'toggleSpawnAdmin();');
        barra.appendChild(btn);
    }

    var scr = document.createElement('div');
    scr.id = 'spawn-admin-screen';
    scr.innerHTML =
        '<div id="spawn-admin-window">' +
            '<div id="spawn-admin-title">🚩 ADMIN · MONSTROS</div>' +
            '<div id="spawn-admin-tabs">' +
                '<button id="sab-tab-bandeira" class="sab-tab active" onclick="window.setAbaSpawnAdmin(\'bandeira\')">🚩 BANDEIRAS</button>' +
                '<button id="sab-tab-mob" class="sab-tab" onclick="window.setAbaSpawnAdmin(\'mob\')">🐾 EDIT MOOB</button>' +
            '</div>' +
            '<div id="sab-panel-bandeira">' +
            '<div class="spawn-campo"><label>MONSTRO / BOSS</label>' +
                '<select id="spawn-tipo"></select></div>' +
            '<div class="spawn-campo"><label>QUANTIDADE MÁXIMA</label>' +
                '<input id="spawn-qtd" type="number" min="1" max="50" value="3"></div>' +
            '<div class="spawn-campo"><label>COMPORTAMENTO</label>' +
                '<select id="spawn-comportamento">' +
                    '<option value="agressivo">Agressivo</option>' +
                    '<option value="passivo">Passivo / Não-agressivo</option>' +
                '</select></div>' +
            '<div class="spawn-campo"><label>HP BASE</label>' +
                '<input id="spawn-hp" type="number" min="10" step="10"></div>' +
            '<div class="spawn-campo"><label>RESPAWN APÓS MORTE: <span id="spawn-respawn-label">5s</span></label>' +
                '<input id="spawn-respawn" type="range" min="1" max="10" step="1" value="5"></div>' +
            '<div id="spawn-posicao">X: - · Y: -</div>' +
            '<div id="spawn-status" style="font-family:Courier New,monospace;font-size:11px;font-weight:bold;color:#2ecc71;min-height:14px;margin-bottom:8px;"></div>' +
            '</div>' +
            '<div id="sab-panel-mob" style="display:none;"></div>' +
            '<div id="spawn-admin-botoes">' +
                '<button id="spawn-btn-aplicar" class="spawn-btn" onclick="aplicarSpawnAdmin()">APLICAR / SALVAR</button>' +
                '<button id="spawn-btn-excluir" class="spawn-btn" onclick="excluirSpawnAdminBandeira()">🗑 DELETAR BANDEIRA</button>' +
                '<button id="spawn-btn-fechar" class="spawn-btn" onclick="fecharSpawnAdmin()">FECHAR</button>' +
            '</div>' +
        '</div>';
    document.body.appendChild(scr);
})();

window.setAbaSpawnAdmin = function (aba) {
    var pb = document.getElementById('sab-panel-bandeira');
    var pm = document.getElementById('sab-panel-mob');
    var tb = document.getElementById('sab-tab-bandeira');
    var tm = document.getElementById('sab-tab-mob');
    if (pb) pb.style.display = aba === 'bandeira' ? 'block' : 'none';
    if (pm) pm.style.display = aba === 'mob' ? 'block' : 'none';
    if (tb) tb.classList.toggle('active', aba === 'bandeira');
    if (tm) tm.classList.toggle('active', aba === 'mob');
    if (aba === 'mob' && typeof window.abrirEditorMob === 'function') window.abrirEditorMob();
};

window.mudarAbaSpawnAdmin = window.setAbaSpawnAdmin;

var SPAWN_ADMIN_SCREEN = document.getElementById('spawn-admin-screen');
var SPAWN_TIPO = document.getElementById('spawn-tipo');
var SPAWN_QTD = document.getElementById('spawn-qtd');
var SPAWN_COMP = document.getElementById('spawn-comportamento');
var SPAWN_HP = document.getElementById('spawn-hp');
var SPAWN_RESPAWN = document.getElementById('spawn-respawn');
var SPAWN_RESPAWN_LABEL = document.getElementById('spawn-respawn-label');
var SPAWN_POS = document.getElementById('spawn-posicao');
var SPAWN_STATUS = document.getElementById('spawn-status');
var SPAWN_BTN_EXCLUIR = document.getElementById('spawn-btn-excluir');

(function preencherSelectTipos() {
    if (!SPAWN_TIPOS.length) {
        var vazio = document.createElement('option');
        vazio.value = '';
        vazio.textContent = '— Nenhum monstro cadastrado —';
        vazio.disabled = true;
        vazio.selected = true;
        SPAWN_TIPO.appendChild(vazio);
        SPAWN_TIPO.disabled = true;
        return;
    }
    for (var i = 0; i < SPAWN_TIPOS.length; i++) {
        var op = document.createElement('option');
        op.value = SPAWN_TIPOS[i].key;
        op.textContent = SPAWN_TIPOS[i].nome + (SPAWN_TIPOS[i].boss ? ' (BOSS)' : '');
        SPAWN_TIPO.appendChild(op);
    }
    SPAWN_TIPO.addEventListener('change', function () {
        SPAWN_HP.value = spawnTipoInfo(SPAWN_TIPO.value).baseHp;
    });
    SPAWN_RESPAWN.addEventListener('input', function () {
        SPAWN_RESPAWN_LABEL.textContent = SPAWN_RESPAWN.value + 's';
    });
})();

function mostrarBotaoSpawnAdmin() {
    window.ehAdmin = true;
    var btn = document.getElementById('btn-admin-spawn');
    if (btn) btn.style.display = 'flex';
}

function preencherPainelSpawnAdmin() {
    var editando = window.spawnAdminEditando;
    SPAWN_STATUS.textContent = '';
    var btnAplicar = document.getElementById('spawn-btn-aplicar');
    if (!SPAWN_TIPOS.length) {
        if (btnAplicar) btnAplicar.disabled = true;
        SPAWN_STATUS.textContent = 'Nenhum monstro cadastrado. Envie os arquivos para integrar.';
        SPAWN_POS.textContent = 'Sem monstros disponíveis';
        SPAWN_BTN_EXCLUIR.style.display = 'none';
        return;
    }
    if (btnAplicar) btnAplicar.disabled = false;

    if (editando) {
        var info = spawnTipoInfo(editando.tipo);
        if (info.boss) SPAWN_TIPO.value = 'golem_pedra'; else SPAWN_TIPO.value = editando.tipo;
        SPAWN_QTD.value = editando.maxQtd;
        SPAWN_COMP.value = editando.comportamento === 'passivo' ? 'passivo' : 'agressivo';
        SPAWN_HP.value = editando.hpBase;
        SPAWN_RESPAWN.value = Math.max(1, Math.min(10, editando.respawnSeg || 5));
        SPAWN_RESPAWN_LABEL.textContent = SPAWN_RESPAWN.value + 's';
        SPAWN_POS.textContent = '📍 Bandeira em X: ' + Math.round(editando.x) + ' · Y: ' + Math.round(editando.y);
        SPAWN_BTN_EXCLUIR.style.display = 'block';
    } else {
        var primeiroTipo = SPAWN_TIPOS[0];
        SPAWN_TIPO.value = primeiroTipo.key;
        SPAWN_QTD.value = 3;
        SPAWN_COMP.value = 'agressivo';
        SPAWN_HP.value = primeiroTipo.baseHp;
        SPAWN_RESPAWN.value = 5;
        SPAWN_RESPAWN_LABEL.textContent = '5s';
        var px = Math.round((window.meuX || 144000) + 12), py = Math.round((window.meuY || 14018) + 16);
        SPAWN_POS.textContent = '🏁 Planta na sua posição: X: ' + px + ' · Y: ' + py;
        SPAWN_BTN_EXCLUIR.style.display = 'none';
    }
}

window.abrirSpawnAdmin = function (bandeira) {
    if (window.estaMorto) return;
    if (typeof iniciarAudio === 'function') iniciarAudio();
    window.spawnAdminEditando = bandeira || null;
    preencherPainelSpawnAdmin();
    SPAWN_ADMIN_SCREEN.style.display = 'flex';
    window.spawnAdminAberto = true;
};

window.fecharSpawnAdmin = function () {
    SPAWN_ADMIN_SCREEN.style.display = 'none';
    window.spawnAdminAberto = false;
    window.spawnAdminEditando = null;
};

window.toggleSpawnAdmin = function () {
    if (window.spawnAdminAberto) { window.fecharSpawnAdmin(); } else { window.abrirSpawnAdmin(null); }
};

window.atualizarPainelSpawnAdmin = function () {
    if (window.spawnAdminEditando) {
        var atual = null;
        if (window.listaBandeiras) {
            for (var i = 0; i < window.listaBandeiras.length; i++) {
                if (window.listaBandeiras[i].id === window.spawnAdminEditando.id) { atual = window.listaBandeiras[i]; break; }
            }
        }
        if (!atual) {
            // bandeira foi excluída em outra aba/admin
            window.fecharSpawnAdmin();
            return;
        }
        window.spawnAdminEditando = atual;
        preencherPainelSpawnAdmin();
    }
};

window.aplicarSpawnAdmin = function () {
    if (!SPAWN_TIPOS.length) {
        SPAWN_STATUS.textContent = 'Nenhum monstro cadastrado para invocar.';
        return;
    }
    if (typeof ws === 'undefined' || !ws || ws.readyState !== 1) { SPAWN_STATUS.textContent = 'Sem conexão com o servidor.'; return; }
    var editando = window.spawnAdminEditando;
    var qtd = Math.max(1, Math.min(50, Math.floor(Number(SPAWN_QTD.value) || 1)));
    var hp = Math.max(10, Math.floor(Number(SPAWN_HP.value) || spawnTipoInfo(SPAWN_TIPO.value).baseHp));
    var respawn = Math.max(1, Math.min(10, Math.floor(Number(SPAWN_RESPAWN.value) || 5)));

    var payload = {
        action: 'admin_spawn',
        sub: editando ? 'editar' : 'criar',
        flagId: editando ? editando.id : undefined,
        tipo: SPAWN_TIPO.value,
        maxQtd: qtd,
        comportamento: SPAWN_COMP.value === 'passivo' ? 'passivo' : 'agressivo',
        hpBase: hp,
        respawnSeg: respawn
    };
    if (!editando) {
        payload.x = Math.round((window.meuX || 144000) + 12);
        payload.y = Math.round((window.meuY || 14018) + 16);
    }
    try {
        ws.send(JSON.stringify(payload));
    } catch (e) { return; }

    SPAWN_STATUS.textContent = 'Enviando solicitação...';
};

window.receberResultadoSpawnAdmin = function (dados) {
    if (!dados || !SPAWN_STATUS) return;
    SPAWN_STATUS.textContent = dados.message || (dados.success ? 'Solicitação concluída.' : 'Não foi possível criar a bandeira.');
    SPAWN_STATUS.style.color = dados.success ? '#2ecc71' : '#ff7675';
    if (!dados.success) return;
    window.spawnAdminEditando = null;
    SPAWN_BTN_EXCLUIR.style.display = 'none';
    window._confirmaExclusaoSpawn = false;
    SPAWN_ADMIN_SCREEN.style.display = 'none';
    window.spawnAdminAberto = false;
};

window.excluirSpawnAdminBandeira = function () {
    var editando = window.spawnAdminEditando;
    if (!editando) { fecharSpawnAdmin(); return; }
    if (typeof ws === 'undefined' || !ws || ws.readyState !== 1) return;
    if (window._confirmaExclusaoSpawn !== true) {
        window._confirmaExclusaoSpawn = true;
        SPAWN_STATUS.textContent = '⚠️ Toque de novo para CONFIRMAR exclusão.';
        SPAWN_BTN_EXCLUIR.textContent = '⚠️ CONFIRMAR EXCLUSÃO';
        setTimeout(function () {
            window._confirmaExclusaoSpawn = false;
            var b = document.getElementById('spawn-btn-excluir');
            if (b) b.textContent = '🗑 DELETAR BANDEIRA';
        }, 3000);
        return;
    }
    window._confirmaExclusaoSpawn = false;
    try {
        ws.send(JSON.stringify({ action: 'admin_spawn_excluir', flagId: editando.id }));
    } catch (e) { return; }
    window._confirmaExclusaoSpawn = false;
    fecharSpawnAdmin();
};

// ===== TOQUE EM CIMA DA BANDEIRA =====
window.tentarAbrirBandeira = function (wx, wy) {
    if (!window.ehAdmin || !window.listaBandeiras || !window.listaBandeiras.length) return false;
    if (window.spawnAdminAberto || window.estaMorto || window.inventarioAberto || window.skillsAberto || window.configAberto || window.atributosAberto) return false;
    var perto = null, melhor = 40;
    for (var i = 0; i < window.listaBandeiras.length; i++) {
        var b = window.listaBandeiras[i];
        var d = Math.hypot(b.x - wx, b.y - wy);
        if (d < melhor) { melhor = d; perto = b; }
    }
    if (perto) { window.abrirSpawnAdmin(perto); return true; }
    return false;
};

// ===== DESENHO DAS BANDEIRAS NO CANVAS (só admin enxerga) =====
window.desenharBandeirasSpawn = function () {
    if (!window.ehAdmin || !window.listaBandeiras || !window.listaBandeiras.length) return;
    var ctx = window.ctx;
    var camX = window.camX || 0, camY = window.camY || 0;
    var zoom = (typeof ZOOM_CAMERA !== 'undefined') ? ZOOM_CAMERA : 0.45;
    var raioVis = Math.max(600, Math.max(window.innerWidth, window.innerHeight) / zoom + 100);

    ctx.font = 'bold 11px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (var i = 0; i < window.listaBandeiras.length; i++) {
        var b = window.listaBandeiras[i];
        if (Math.abs(b.x - camX) > raioVis || Math.abs(b.y - camY) > raioVis) continue;
        var conf = spawnTipoInfo(b.tipo);
        if (!conf) continue;
        var ehBoss = conf.boss;
        var cor = conf.cor;

        ctx.save();
        // disco no chão
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.ellipse(b.x, b.y + 4, ehBoss ? 26 : 17, ehBoss ? 9 : 6, 0, 0, Math.PI * 2);
        ctx.fill();
        // halo de seleção pulsante
        var pulso = 0.6 + Math.sin(Date.now() / 400) * 0.25;
        ctx.strokeStyle = cor;
        ctx.globalAlpha = pulso * 0.7;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(b.x, b.y, ehBoss ? 34 : 24, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // mastro
        ctx.strokeStyle = '#8a6d3b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x, b.y - (ehBoss ? 46 : 32));
        ctx.stroke();

        // bandeirinha
        ctx.fillStyle = cor;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y - (ehBoss ? 46 : 32));
        ctx.lineTo(b.x + (ehBoss ? 30 : 22), b.y - (ehBoss ? 38 : 26));
        ctx.lineTo(b.x, b.y - (ehBoss ? 30 : 20));
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // ícone do monstro no topo
        ctx.font = (ehBoss ? 22 : 15) + 'px serif';
        ctx.fillText(conf.emoji, b.x, b.y - (ehBoss ? 54 : 38));

        // rótulo
        ctx.font = 'bold 11px "Courier New", monospace';
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillText(conf.nome, b.x + 1, b.y + 23 + 1);
        ctx.fillText('Qtd: ' + b.maxQtd, b.x + 1, b.y + 36 + 1);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(conf.nome, b.x, b.y + 23);
        ctx.fillStyle = (b.comportamento === 'passivo') ? '#58d68d' : '#e74c3c';
        ctx.fillText('Qtd: ' + b.maxQtd + ' · ' + (b.comportamento === 'passivo' ? 'PASSIVO' : 'AGRESSIVO'), b.x, b.y + 36);
        ctx.restore();
    }
};

// Fecha ao tocar fora da janela
SPAWN_ADMIN_SCREEN.addEventListener('click', function (e) {
    if (e.target === SPAWN_ADMIN_SCREEN) fecharSpawnAdmin();
});