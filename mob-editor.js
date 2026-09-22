// mob-editor.js — Aba "EDIT MOOB" dentro do ADMIN · MONSTROS
// Permite editar TODOS os stats de qualquer mob em tempo real (salva no servidor).
(function () {
    window.mobEditorConf = window.mobEditorConf || {};
    window.mobEditorDropTipos = window.mobEditorDropTipos || [];
    var construido = false;
    var selecionado = null;

    function tipos() { return Object.keys(window.mobEditorConf || {}); }

    function lintas() {
        var d = [], b = [];
        (window.EFEITOS || []).forEach(function (e) {
            var item = { id: e.id, nome: e.nome || e.id, emoji: e.emoji || '' };
            if (e.classe === 'debuff') d.push(item);
            if (e.classe === 'buff') b.push(item);
        });
        return { debuffs: d, buffs: b };
    }

    function vfxLista() { return window.MOB_VFX_LIST || window.MOB_VFX_LIST_FALLBACK || []; }
    if (!window.MOB_VFX_LIST_FALLBACK) {
        window.MOB_VFX_LIST_FALLBACK = [
            ['none', '— Nenhum —'], ['aura_fogo', '🔥 Aura de Fogo'], ['aura_gelo', '❄️ Aura de Gelo'], ['aura_veneno', '☠️ Aura de Veneno'], ['aura_sagrada', '✨ Aura Sagrada'], ['eletrico_cores', '🎇 Elétrico Multicolor']
        ];
    }

    function el(tag, attrs, html) {
        var e = document.createElement(tag);
        for (var k in attrs) e.setAttribute(k, attrs[k]);
        if (html !== undefined) e.innerHTML = html;
        return e;
    }

    function construir() {
        var pnl = document.getElementById('sab-panel-mob');
        if (!pnl) return;
        pnl.innerHTML =
            '<div id="me-topo">' +
                '<select id="me-select" class="me-select" onchange="window._meTrocarTipo(this.value)"></select>' +
                '<button id="me-resetar" class="me-btn-reset" onclick="window._meResetar()" title="Recarregar config padrão deste mob">↺ RESET</button>' +
            '</div>' +
            '<div id="me-status"></div>' +
            '<div class="me-secao">Identidade</div>' +
            '<div class="spawn-campo"><label>NOME</label><input id="me-nome"></div>' +
            '<div class="me-dupla">' +
                '<div class="spawn-campo"><label>EMOJI</label><input id="me-emoji" maxlength="4"></div>' +
                '<div class="spawn-campo"><label>COR</label><input id="me-cor" type="color"></div>' +
            '</div>' +
            '<div class="me-secao">Combate</div>' +
            '<div class="me-dupla">' +
                '<div class="spawn-campo"><label>HP BASE</label><input id="me-baseHp" type="number" min="1"></div>' +
                '<div class="spawn-campo"><label>ATK</label><input id="me-dano" type="number" min="0"></div>' +
            '</div>' +
            '<div class="me-dupla">' +
                '<div class="spawn-campo"><label>DEFESA %</label><input id="me-defesa" type="number" min="0" max="90"></div>' +
                '<div class="spawn-campo"><label>BLOQUEIO %</label><input id="me-block" type="number" min="0" max="90"></div>' +
            '</div>' +
            '<div class="me-dupla">' +
                '<div class="spawn-campo"><label>DIST. AGGRO</label><input id="me-aggroRange" type="number" min="20"></div>' +
                '<div class="spawn-campo"><label>DIST. ATAQUE</label><input id="me-attackRange" type="number" min="0"></div>' +
            '</div>' +
            '<div class="me-dupla">' +
                '<div class="spawn-campo"><label>VEL. MOVIMENTO</label><input id="me-velocidade" type="number" step="0.1" min="0.05"></div>' +
                '<div class="spawn-campo"><label>CADÊNCIA ATAQUE</label><input id="me-cadenciaAtk" type="number" min="1"></div>' +
            '</div>' +
            '<div class="me-dupla">' +
                '<div class="spawn-campo"><label>VEL. ANIMAÇÃO</label><input id="me-velAtk" type="number" step="0.1"></div>' +
                '<div class="spawn-campo"><label>VEL. PROJÉTIL</label><input id="me-velProjetil" type="number" step="0.1"></div>' +
            '</div>' +
            '<div class="spawn-campo"><label>MODO DE ATAQUE</label>' +
                '<select id="me-ehMelee"><option value="1">🗡 Melee (corpo a corpo)</option><option value="0">🏹 Ranged (à distância)</option></select>' +
            '</div>' +
            '<div class="me-secao">Visual + Efeitos</div>' +
            '<div class="spawn-campo"><label>ESCALA DO TAMANHO</label><input id="me-escala" type="number" step="0.05" min="0.1" max="9"></div>' +
            '<div class="spawn-campo"><label>EFEITO VISUAL</label><select id="me-efeitoVisual"></select></div>' +
            '<div class="me-dupla">' +
                '<div class="spawn-campo"><label>COR DO EFEITO</label><input id="me-vfxCor" type="color"></div>' +
                '<div class="spawn-campo"><label>INTENSIDADE</label><input id="me-vfxIntensidade" type="number" step="0.1" min="0.1" max="6"></div>' +
            '</div>' +
            '<div class="me-secao">Progressão</div>' +
            '<div class="spawn-campo"><label>XP POR KILL</label><input id="me-xpBase" type="number" min="0"></div>' +
            '<div class="me-secao">Imunidade a Debuffs</div>' +
            '<div id="me-imunes" class="me-grid-chk"></div>' +
            '<div class="me-secao">Debuffs que APLICA 🐾</div>' +
            '<div id="me-debuffs-lista"></div>' +
            '<button class="me-btn-add" onclick="this.parentNode.querySelector(\'#me-debuffs-lista\').appendChild(window._meAddDebuffRow(null))">+ DEBUFF</button>' +
            '<div class="me-secao">Buffs que APLICA 🔮</div>' +
            '<div id="me-buffs-lista"></div>' +
            '<button class="me-btn-add" onclick="this.parentNode.querySelector(\'#me-buffs-lista\').appendChild(window._meAddBuffRow(null))">+ BUFF</button>' +
            '<div class="me-secao">Drops 💎</div>' +
            '<div id="me-drops-lista"></div>' +
            '<button class="me-btn-add" onclick="this.parentNode.querySelector(\'#me-drops-lista\').appendChild(window._meAddDropRow(null))">+ DROP</button>' +
            '<div id="me-aplicar-wrap"><button id="me-aplicar" onclick="window._meAplicar()">💾 APLICAR EM TEMPO REAL</button></div>';
        window._meAddDebuffRow = adicionarDebuffRow;
        window._meAddBuffRow = adicionarBuffRow;
        window._meAddDropRow = adicionarDropRow;
window._meAplicar = aplicar;
    window._meTrocarTipo = function (tipo) {
        selecionado = tipo;
        carregarMob(tipo);
    };
    construido = true;
    }

    function preencherSelect() {
        var sel = document.getElementById('me-select');
        if (!sel) return;
        var atual = sel.value || selecionado;
        sel.innerHTML = '';
        tipos().forEach(function (t) {
            var c = window.mobEditorConf[t] || {};
            var opt = el('option', { value: t }, (c.emoji || '🐾') + ' ' + (c.nome || t));
            sel.appendChild(opt);
        });
        if (atual && window.mobEditorConf[atual]) sel.value = atual;
        selecionado = sel.value || tipos()[0];
    }

    function valor(selId) {
        var el = document.getElementById(selId);
        return el ? el.value : '';
    }

    window.abrirEditorMob = function () {
        if (!construido) construir();
        refrescarEditorMob();
    };

    window.refrescarEditorMob = function () {
        if (!construido) return;
        preencherSelect();
        if (!selecionado || !window.mobEditorConf[selecionado]) selecionado = tipos()[0];
        carregarMob(selecionado);
    };

    function carregarMob(tipo) {
        if (!tipo || !window.mobEditorConf[tipo]) return;
        var c = window.mobEditorConf[tipo];
        selecionado = tipo;
        var ids = { 'me-nome': 'nome', 'me-emoji': 'emoji', 'me-baseHp': 'baseHp', 'me-dano': 'dano', 'me-defesa': 'defesa', 'me-block': 'block', 'me-aggroRange': 'aggroRange', 'me-attackRange': 'attackRange', 'me-velocidade': 'velocidade', 'me-cadenciaAtk': 'cadenciaAtk', 'me-velAtk': 'velAtk', 'me-velProjetil': 'velProjetil', 'me-escala': 'escala', 'me-vfxIntensidade': 'vfxIntensidade', 'me-xpBase': 'xpBase' };
        for (var k in ids) {
            var inp = document.getElementById(k);
            if (inp) inp.value = c[ids[k]] !== undefined ? c[ids[k]] : '';
        }
        if (document.getElementById('me-cor')) document.getElementById('me-cor').value = c.cor || '#7CFC00';
        if (document.getElementById('me-vfxCor')) document.getElementById('me-vfxCor').value = c.vfxCor || '#ffffff';
        var melee = document.getElementById('me-ehMelee');
        if (melee) melee.value = c.ehMelee === false ? '0' : '1';
        preencherVfx(c.efeitoVisual || 'none');
        preencherImunes(c.imuneDebuffs || []);
        preencherLinhas('me-debuffs-lista', c.debuffsAplicados, adicionarDebuffRow);
        preencherLinhas('me-buffs-lista', c.buffsAplicados, adicionarBuffRow);
        preencherLinhas('me-drops-lista', c.drops, adicionarDropRow);
        var st = document.getElementById('me-status');
        if (st) st.textContent = (c.nome || tipo).toUpperCase() + ' · carregado ✓';
    }

    function preencherVfx(sel) {
        var sl = document.getElementById('me-efeitoVisual');
        if (!sl) return;
        sl.innerHTML = '';
        vfxLista().forEach(function (par) {
            var o = el('option', { value: par[0] }, par[1]);
            sl.appendChild(o);
        });
        sl.value = sel;
    }

    function preencherImunes(lista) {
        var cont = document.getElementById('me-imunes');
        if (!cont) return;
        cont.innerHTML = '';
        var lim = {};
        (lista || []).forEach(function (x) { lim[x] = true; });
        lintas().debuffs.forEach(function (d) {
            var lbl = el('label', {}, '<input type="checkbox" class="me-imune" value="' + d.id + '" ' + (lim[d.id] ? 'checked' : '') + '><span>' + (d.emoji || '') + ' ' + d.nome + '</span>');
            cont.appendChild(lbl);
        });
    }

    function preencherLinhas(contId, arr, addFn) {
        var cont = document.getElementById(contId);
        if (!cont) return;
        cont.innerHTML = '';
        (arr || []).forEach(function (v) {
            var row = addFn(v);
            if (row) cont.appendChild(row);
        });
    }

    function optionsDe(cfgId, selecionado, ternario) {
        var lista = cfgId === 'drop' ? window.mobEditorDropTipos : cfgId === 'debuff' ? lintas().debuffs : lintas().buffs;
        var h = '';
        if (ternario) { h += '<option value="" ' + (!selecionado ? 'selected' : '') + '>—</option>'; }
        lista.forEach(function (it) {
            var v = typeof it === 'string' ? it : it.id;
            var lbl = typeof it === 'string' ? it : ((it.emoji || '') + ' ' + it.nome);
            h += '<option value="' + v + '" ' + (v === selecionado ? 'selected' : '') + '>' + lbl + '</option>';
        });
        return h;
    }

    function mkRow(html) {
        var d = el('div');
        d.className = 'me-linha';
        d.innerHTML = html;
        return d;
    }

    function adicionarDebuffRow(val) {
        val = val || { id: '', tempo: 6, intensidade: 1 };
        var d = mkRow(
            '<select class="me-debuff-sel">' + optionsDe('debuff', val.id, true) + '</select>' +
            '<input class="me-tempo" type="number" min="0.5" step="0.5" value="' + (val.tempo || 6) + '">' +
            '<input class="me-int" type="number" min="0.1" step="0.1" value="' + (val.intensidade || 1) + '">' +
            '<button type="button" class="me-x" onclick="this.parentNode.remove()">✕</button>'
        );
        return d;
    }

    function adicionarBuffRow(val) {
        val = val || { id: '', tempo: 6, intensidade: 1 };
        var d = mkRow(
            '<select class="me-buff-sel">' + optionsDe('buff', val.id, true) + '</select>' +
            '<input class="me-tempo" type="number" min="0.5" step="0.5" value="' + (val.tempo || 6) + '">' +
            '<input class="me-int" type="number" min="0.1" step="0.1" value="' + (val.intensidade || 1) + '">' +
            '<button type="button" class="me-x" onclick="this.parentNode.remove()">✕</button>'
        );
        return d;
    }

    function adicionarDropRow(val) {
        val = val || { item: '', chance: 10 };
        var d = mkRow(
            '<select class="me-drop-sel">' + optionsDe('drop', val.item, true) + '</select>' +
            '<input class="me-chance" type="number" min="0" max="100" step="0.5" value="' + (val.chance || 0) + '">' +
            '<span class="me-pct">%</span>' +
            '<button type="button" class="me-x" onclick="this.parentNode.remove()">✕</button>'
        );
        return d;
    }

    function pegarLinhas(contId, selCls) {
        var out = [];
        var cont = document.getElementById(contId);
        if (!cont) return out;
        cont.querySelectorAll(selCls).forEach(function (sel) {
            var row = sel.parentNode;
            var tempo = row.querySelector('.me-tempo');
            var int = row.querySelector('.me-int');
            var chance = row.querySelector('.me-chance');
            if (sel.value) {
                out.push(chance
                    ? { item: sel.value, chance: Math.max(0, Math.min(100, Number(chance.value) || 0)) }
                    : { id: sel.value, tempo: Math.max(0.5, Number(tempo.value) || 1), intensidade: Math.max(0.1, Number(int.value) || 1) });
            }
        });
        return out;
    }

    function aplicar() {
        if (!window.ws || window.ws.readyState !== WebSocket.OPEN) { alert('Socket desconectado.'); return; }
        if (!selecionado) return;
        var imunes = [];
        document.querySelectorAll('.me-imune:checked').forEach(function (c) { imunes.push(c.value); });
        var payload = {
            action: 'admin_mob_editar',
            tipo: selecionado,
            nome: valor('me-nome'),
            emoji: valor('me-emoji'),
            baseHp: Number(valor('me-baseHp')),
            dano: Number(valor('me-dano')),
            defesa: Number(valor('me-defesa')),
            block: Number(valor('me-block')),
            aggroRange: Number(valor('me-aggroRange')),
            attackRange: Number(valor('me-attackRange')),
            velocidade: Number(valor('me-velocidade')),
            cadenciaAtk: Number(valor('me-cadenciaAtk')),
            velAtk: Number(valor('me-velAtk')),
            velProjetil: Number(valor('me-velProjetil')),
            ehMelee: valor('me-ehMelee') === '1',
            escala: Number(valor('me-escala')),
            efeitoVisual: valor('me-efeitoVisual'),
            vfxCor: valor('me-vfxCor'),
            vfxIntensidade: Number(valor('me-vfxIntensidade')),
            xpBase: Number(valor('me-xpBase')),
            imuneDebuffs: imunes,
            debuffsAplicados: pegarLinhas('me-debuffs-lista', '.me-debuff-sel'),
            buffsAplicados: pegarLinhas('me-buffs-lista', '.me-buff-sel'),
            drops: pegarLinhas('me-drops-lista', '.me-drop-sel')
        };
        // envia apenas o que é número válido (NaN vira string "NaN" no JSON — evita isso)
        Object.keys(payload).forEach(function (k) { if (typeof payload[k] === 'number' && !isFinite(payload[k])) payload[k] = undefined; });
        window.ws.send(JSON.stringify(payload));
        var st = document.getElementById('me-status');
        if (st) { st.textContent = 'APLICANDO...'; st.style.color = '#f1c40f'; }
    }

    window._meResetar = function () {
        if (!window.ws || window.ws.readyState !== WebSocket.OPEN) { alert('Socket desconectado.'); return; }
        if (!selecionado) return;
        window.ws.send(JSON.stringify({ action: 'admin_mob_resetar', tipo: selecionado }));
    };
})();