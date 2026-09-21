/* eslint-disable no-unused-vars */
/* Editor de Objetos do Mapa — Admin-only.
   Permite colocar Arvores, Pedras, Agua, Plantas, Folhas, Paredes, Blocos
   com sistema de colisao (colidindo) e salvamento persistido em map_objetos.json.
   Contem GOD mode para testes. */
(function () {
    'use strict';

    /* ---- Definicoes de tipos de objetos ---- */
    var TIPOS_OBJ = [
        ['arvore',   '🌳 Arvore',       '#2e7d32', 30, 45, true],
        ['pedra',    '🪨 Pedra',        '#78909c', 22, 22, true],
        ['agua',     '💧 Agua',         '#1565c0', 36, 18, true],
        ['planta',   '🌿 Planta',       '#4caf50', 12, 14, true],
        ['folha',    '🍃 Folha',        '#ffb300',  8,  8, false],
        ['parede',   '🧱 Parede',       '#607d8b', 16, 36, true],
        ['bloco',    '⬛ Bloco',         '#90a4ae', 16, 16, true]
    ];
    var OBJETO_POR_ID = {};
    TIPOS_OBJ.forEach(function (t) { OBJETO_POR_ID[t[0]] = { w: t[3], h: t[4], cor: t[2], colidindoPadrao: t[5] }; });

    /* ---- Estado ---- */
    window.objetosEditorAtivo = false;
    window.objetosEditorVisivel = false;
    window.objetosSelecionadoId = null;
    window.objetoFerramenta = null;   // null = selecao; tipo = colocar
    window.objetosEditorMinimizado = false;
    window.godMode = false;
    window.godOriginalSpeed = 1;

    /* ---- Helpers DOM ---- */
    function el(tag, props) {
        var e = document.createElement(tag);
        if (props) Object.keys(props).forEach(function (k) { e[k] = props[k]; });
        return e;
    }

    /* ---- Obter lista de objetos do mapa ---- */
    function obterObjetos() {
        return (window.objetosMapa || []).slice();
    }
    function salvarObjetosLocais() {
        try { localStorage.setItem('map_objetos_editor_ui', JSON.stringify({
            objetoFerramenta: window.objetoFerramenta,
            objetosSelecionadoId: window.objetosSelecionadoId
        })); } catch (e) { /* ignorar */ }
    }
    function carregarObjetosLocais() {
        try {
            var s = localStorage.getItem('map_objetos_editor_ui');
            if (s) { var d = JSON.parse(s); window.objetoFerramenta = d.objetoFerramenta || null; window.objetosSelecionadoId = d.objetosSelecionadoId || null; }
        } catch (e) { /* ignorar */ }
    }

    /* ---- Montar UI ---- */
    function montarUI() {
        var barra = document.getElementById('util-buttons');
        if (barra && !document.getElementById('btn-objetos-editor')) {
            var btn = el('button', { id: 'btn-objetos-editor', className: 'btn-util', textContent: '🏗️', title: 'Editor de Mapa (Admin)', style: 'display:none' });
            btn.onclick = function (e) { e.stopPropagation(); window.toggleEditorObjetos(); };
            barra.appendChild(btn);
        }

        if (!document.getElementById('objetos-editor-screen')) {
            var scr = el('div', { id: 'objetos-editor-screen' });
            scr.innerHTML =
                '<div id="objetos-editor-header">' +
                    '<span id="objetos-editor-title">🏗️ EDITOR DE MAPA</span>' +
                    '<div class="col-window-controls">' +
                        '<button class="col-window-btn" onclick="window.minimizarEditorObjetos()">_</button>' +
                        '<button class="col-window-btn" onclick="window.fecharEditorObjetos()">✕</button>' +
                    '</div>' +
                '</div>' +
                '<div id="objetos-editor-body">' +
                    '<div class="col-toolbar">' +
                        '<span style="font-size:10px;color:#aaa;">FERRAMENTA:</span>' +
                        '<button id="obj-tool-select" class="obj-tool-btn active" onclick="window.setObjetoFerramenta(null)">👆 Selecionar</button>' +
                        '<button id="obj-tool-arvore" class="obj-tool-btn" onclick="window.setObjetoFerramenta(\'arvore\')">🌳 Arvore</button>' +
                        '<button id="obj-tool-pedra" class="obj-tool-btn" onclick="window.setObjetoFerramenta(\'pedra\')">🪨 Pedra</button>' +
                        '<button id="obj-tool-agua" class="obj-tool-btn" onclick="window.setObjetoFerramenta(\'agua\')">💧 Agua</button>' +
                        '<button id="obj-tool-planta" class="obj-tool-btn" onclick="window.setObjetoFerramenta(\'planta\')">🌿 Planta</button>' +
                        '<button id="obj-tool-folha" class="obj-tool-btn" onclick="window.setObjetoFerramenta(\'folha\')">🍃 Folha</button>' +
                        '<button id="obj-tool-parede" class="obj-tool-btn" onclick="window.setObjetoFerramenta(\'parede\')">🧱 Parede</button>' +
                        '<button id="obj-tool-bloco" class="obj-tool-btn" onclick="window.setObjetoFerramenta(\'bloco\')">⬛ Bloco</button>' +
                    '</div>' +
                    '<div class="col-section" id="obj-prop-section">' +
                        '<div class="col-section-title"><span>PROPRIEDADES</span><span id="obj-sel-badge" style="font-size:9px;color:#f39c12;">NENHUM</span></div>' +
                        '<div id="obj-prop-empty" style="font-size:11px;color:#7f8c8d;padding:6px;text-align:center;">Clique um objeto no mapa ou na lista.</div>' +
                        '<div id="obj-prop-form" style="display:none;flex-direction:column;gap:5px;">' +
                            '<div class="col-field"><label>ID</label><input type="text" id="obj-prop-id" readonly style="opacity:.6;"></div>' +
                            '<div class="col-field"><label>Tipo</label><input type="text" id="obj-prop-tipo" readonly style="opacity:.6;"></div>' +
                            '<div class="col-field"><label>Pos X</label><div class="col-stepper-row"><button class="col-step-btn" onclick="window.ajustarObjProp(\'x\',-10)">-10</button><button class="col-step-btn" onclick="window.ajustarObjProp(\'x\',-1)">-1</button><input type="number" id="obj-prop-x" onchange="window.atualizarObjProp(\'x\',parseInt(this.value)||0)"><button class="col-step-btn" onclick="window.ajustarObjProp(\'x\',1)">+1</button><button class="col-step-btn" onclick="window.ajustarObjProp(\'x\',10)">+10</button></div></div>' +
                            '<div class="col-field"><label>Pos Y</label><div class="col-stepper-row"><button class="col-step-btn" onclick="window.ajustarObjProp(\'y\',-10)">-10</button><button class="col-step-btn" onclick="window.ajustarObjProp(\'y\',-1)">-1</button><input type="number" id="obj-prop-y" onchange="window.atualizarObjProp(\'y\',parseInt(this.value)||0)"><button class="col-step-btn" onclick="window.ajustarObjProp(\'y\',1)">+1</button><button class="col-step-btn" onclick="window.ajustarObjProp(\'y\',10)">+10</button></div></div>' +
                            '<div class="col-field"><label>Largura</label><div class="col-stepper-row"><button class="col-step-btn" onclick="window.ajustarObjProp(\'w\',-4)">-4</button><button class="col-step-btn" onclick="window.ajustarObjProp(\'w\',-1)">-1</button><input type="number" id="obj-prop-w" min="4" onchange="window.atualizarObjProp(\'w\',parseInt(this.value)||16)"><button class="col-step-btn" onclick="window.ajustarObjProp(\'w\',1)">+1</button><button class="col-step-btn" onclick="window.ajustarObjProp(\'w\',4)">+4</button></div></div>' +
                            '<div class="col-field"><label>Altura</label><div class="col-stepper-row"><button class="col-step-btn" onclick="window.ajustarObjProp(\'h\',-4)">-4</button><button class="col-step-btn" onclick="window.ajustarObjProp(\'h\',-1)">-1</button><input type="number" id="obj-prop-h" min="4" onchange="window.atualizarObjProp(\'h\',parseInt(this.value)||16)"><button class="col-step-btn" onclick="window.ajustarObjProp(\'h\',1)">+1</button><button class="col-step-btn" onclick="window.ajustarObjProp(\'h\',4)">+4</button></div></div>' +
                            '<div class="col-field"><label style="display:flex;align-items:center;gap:6px;"><input type="checkbox" id="obj-prop-colidindo" onchange="window.atualizarObjProp(\'colidindo\',this.checked)"> <span>Colidindo (bloqueia movimento)</span></label></div>' +
                            '<div class="col-actions-row">' +
                                '<button class="col-action-btn btn-col-duplicate" onclick="window.duplicarObjSelecionado()">📋 Duplicar</button>' +
                                '<button class="col-action-btn btn-col-delete" onclick="window.excluirObjSelecionado()">🗑️ Excluir</button>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="col-section">' +
                        '<div class="col-section-title"><span>OBJETOS NO MAPA</span><span id="obj-count-badge" style="font-size:10px;color:#2ecc71;">0</span></div>' +
                        '<input type="text" id="obj-search-input" placeholder="🔍 Filtrar por tipo..." oninput="window.filtrarListaObjetos(this.value)" style="background:#231e17;border:1px solid #5a4b36;color:#fff;padding:4px;font-size:10px;border-radius:3px;">' +
                        '<div id="obj-lista-container"></div>' +
                    '</div>' +
                '</div>' +
                '<div id="objetos-editor-footer">' +
                    '<button id="btn-god-mode" onclick="window.toggleGodMode()" style="background:#f1c40f;border-color:#f39c12;color:#1a1a1a;font-weight:bold;">🛡️ GOD MODE: OFF</button>' +
                    '<button id="btn-salvar-objetos" onclick="window.salvarObjetosServidor()" style="background:#27ae60;border-color:#2ecc71;">💾 SALVAR NO SERVIDOR</button>' +
                    '<button id="btn-limpar-objetos" onclick="window.limparObjetosServidor()" style="background:#c0392b;border-color:#e74c3c;">🗑️ LIMPAR TUDO</button>' +
                    '<div id="obj-status-bar">Grid: 16px · Clique para colocar · Selecione para editar.</div>' +
                '</div>';
            document.body.appendChild(scr);
            tornarJanelaArrastavel(scr, document.getElementById('objetos-editor-header'));
        }
    }

    function tornarJanelaArrastavel(janela, cabecalho) {
        var dragging = false, sx, sy, ox, oy;
        cabecalho.addEventListener('mousedown', function (e) {
            if (e.target.tagName === 'BUTTON') return;
            dragging = true; sx = e.clientX; sy = e.clientY; ox = janela.offsetLeft || 0; oy = janela.offsetTop || 0;
            document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp); e.preventDefault();
        });
        function onMove(e) { if (!dragging) return; janela.style.left = (ox + e.clientX - sx) + 'px'; janela.style.top = (oy + e.clientY - sy) + 'px'; janela.style.right = 'auto'; }
        function onUp() { dragging = false; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); }
    }

    /* ---- Abrir/Fechar ---- */
    window.abrirEditorObjetos = function () {
        if (!window.ehAdmin) { console.warn('Apenas administradores podem acessar o editor de mapa.'); return; }
        montarUI();
        window.objetosEditorAtivo = true;
        window.objetosEditorVisivel = true;
        window.objetosEditorMinimizado = false;
        carregarObjetosLocais();
        var scr = document.getElementById('objetos-editor-screen');
        if (scr) scr.style.display = 'flex';
        var badge = document.getElementById('btn-objetos-editor');
        if (badge) badge.classList.add('ativo');
        window.atualizarListaObjetosUI();
        window.atualizarPropriedadesUI();
        window.mostrarToast('🏗️ Editor de mapa ativado.');
    };
    window.fecharEditorObjetos = function () {
        window.objetosEditorAtivo = false;
        window.objetosSelecionadoId = null;
        window.objetoFerramenta = null;
        var scr = document.getElementById('objetos-editor-screen');
        if (scr) scr.style.display = 'none';
        var badge = document.getElementById('btn-objetos-editor');
        if (badge) badge.classList.remove('ativo');
        salvarObjetosLocais();
    };
    window.toggleEditorObjetos = function () {
        if (window.objetosEditorAtivo) window.fecharEditorObjetos(); else window.abrirEditorObjetos();
    };
    window.minimizarEditorObjetos = function () {
        var scr = document.getElementById('objetos-editor-screen'); if (!scr) return;
        window.objetosEditorMinimizado = !window.objetosEditorMinimizado;
        scr.style.display = window.objetosEditorMinimizado ? 'none' : 'flex';
    };

    /* ---- Ferramenta ---- */
    window.setObjetoFerramenta = function (tipo) {
        window.objetoFerramenta = tipo;
        ['select','arvore','pedra','agua','planta','folha','parede','bloco'].forEach(function (m) {
            var b = document.getElementById('obj-tool-' + m); if (b) b.classList.remove('active');
        });
        if (tipo === null) { var s = document.getElementById('obj-tool-select'); if (s) s.classList.add('active'); }
        else { var b = document.getElementById('obj-tool-' + tipo); if (b) b.classList.add('active'); }
        var sb = document.getElementById('obj-status-bar');
        if (sb) {
            if (tipo === null) sb.textContent = 'Seleção: clique um objeto para editar ou clique no mapa para remover.';
            else sb.textContent = 'Ferramenta: ' + tipo.toUpperCase() + ' · Clique no mapa para colocar (grid 16px).';
        }
    };

    /* ---- Propriedades ---- */
    window.atualizarPropriedadesUI = function () {
        var sel = window.obterObjSelecionado();
        var secEmpty = document.getElementById('obj-prop-empty');
        var secForm = document.getElementById('obj-prop-form');
        var badge = document.getElementById('obj-sel-badge');
        if (!sel) { if (secEmpty) secEmpty.style.display = 'block'; if (secForm) secForm.style.display = 'none'; if (badge) badge.textContent = 'NENHUM'; return; }
        if (secEmpty) secEmpty.style.display = 'none'; if (secForm) secForm.style.display = 'flex'; if (badge) badge.textContent = sel.tipo.toUpperCase();
        var f = function (id) { return document.getElementById(id); };
        if (f('obj-prop-id')) f('obj-prop-id').value = sel.id || '';
        if (f('obj-prop-tipo')) f('obj-prop-tipo').value = sel.tipo || '';
        if (f('obj-prop-x')) f('obj-prop-x').value = sel.x || 0;
        if (f('obj-prop-y')) f('obj-prop-y').value = sel.y || 0;
        if (f('obj-prop-w')) f('obj-prop-w').value = sel.w || 16;
        if (f('obj-prop-h')) f('obj-prop-h').value = sel.h || 16;
        if (f('obj-prop-colidindo')) f('obj-prop-colidindo').checked = sel.colidindo !== false;
    };
    window.obterObjSelecionado = function () {
        if (!window.objetosSelecionadoId) return null;
        var lista = obterObjetos();
        for (var i = 0; i < lista.length; i++) { if (lista[i].id === window.objetosSelecionadoId) return lista[i]; }
        return null;
    };
    window.atualizarObjProp = function (prop, valor) {
        var sel = window.obterObjSelecionado();
        if (!sel || !window.ws || window.ws.readyState !== WebSocket.OPEN) return;
        if (prop === 'x') sel.x = Math.round(valor);
        if (prop === 'y') sel.y = Math.round(valor);
        if (prop === 'w') sel.w = Math.max(4, Math.round(valor));
        if (prop === 'h') sel.h = Math.max(4, Math.round(valor));
        if (prop === 'colidindo') sel.colidindo = !!valor;
        window.salvarObjetosServidor();
        window.atualizarPropriedadesUI();
        window.atualizarListaObjetosUI();
    };
    window.ajustarObjProp = function (prop, delta) {
        var sel = window.obterObjSelecionado(); if (!sel) return;
        if (prop === 'x') window.atualizarObjProp('x', sel.x + delta);
        if (prop === 'y') window.atualizarObjProp('y', sel.y + delta);
        if (prop === 'w') window.atualizarObjProp('w', sel.w + delta);
        if (prop === 'h') window.atualizarObjProp('h', sel.h + delta);
    };

    /* ---- Lista UI ---- */
    window.atualizarListaObjetosUI = function (filtro) {
        var container = document.getElementById('obj-lista-container'); if (!container) return;
        var lista = obterObjetos();
        var badge = document.getElementById('obj-count-badge'); if (badge) badge.textContent = lista.length;
        var termo = (filtro || '').toLowerCase().trim();
        var html = '';
        lista.forEach(function (o) {
            if (termo && (o.tipo || '').indexOf(termo) === -1) return;
            var isSel = o.id === window.objetosSelecionadoId;
            var info = OBJETO_POR_ID[o.tipo] || { w: 16, h: 16, cor: '#999' };
            html += '<div class="col-list-item ' + (isSel ? 'selected' : '') + '" onclick="window.selecionarObjeto(\'' + o.id + '\')">' +
                '<div class="col-item-info"><div class="col-item-name" style="color:' + info.cor + ';">' + o.tipo + ' ' + (o.tipo === 'arvore' ? '🌳' : o.tipo === 'pedra' ? '🪨' : o.tipo === 'agua' ? '💧' : o.tipo === 'planta' ? '🌿' : o.tipo === 'folha' ? '🍃' : o.tipo === 'parede' ? '🧱' : '⬛') + '</div>' +
                '<div class="col-item-dims">(' + o.x + ', ' + o.y + ') · ' + o.w + 'x' + o.h + ' · ' + (o.colidindo !== false ? '🚫 colide' : '🌬️ livre') + '</div></div>' +
                '<button class="col-item-del-btn" onclick="event.stopPropagation(); window.excluirObjPorId(\'' + o.id + '\')" title="Excluir">✕</button></div>';
        });
        if (!html) html = '<div style="font-size:11px;color:#7f8c8d;padding:6px;text-align:center;">Nenhum objeto no mapa.</div>';
        container.innerHTML = html;
    };
    window.filtrarListaObjetos = function (val) { window.atualizarListaObjetosUI(val); };
    window.selecionarObjeto = function (id) { window.objetosSelecionadoId = id; window.atualizarPropriedadesUI(); window.atualizarListaObjetosUI(); };

    /* ---- Criar / Excluir ---- */
    window.colocarObjeto = function (tipo, x, y) {
        if (!window.objetosMapa || !window.ws || window.ws.readyState !== WebSocket.OPEN) return;
        var info = OBJETO_POR_ID[tipo]; if (!info) return;
        var id = 'obj_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
        var obj = { id: id, tipo: tipo, x: Math.round(x), y: Math.round(y), w: info.w, h: info.h, colidindo: info.colidindoPadrao !== false };
        window.objetosMapa.push(obj);
        window.objetosSelecionadoId = id;
        window.salvarObjetosServidor();
    };
    window.excluirObjPorId = function (id) {
        if (!window.objetosMapa || !window.ws || window.ws.readyState !== WebSocket.OPEN) return;
        window.objetosMapa = window.objetosMapa.filter(function (o) { return o.id !== id; });
        if (window.objetosSelecionadoId === id) window.objetosSelecionadoId = null;
        window.salvarObjetosServidor();
        window.atualizarListaObjetosUI();
        window.atualizarPropriedadesUI();
        window.mostrarToast('🗑️ Objeto excluído.');
    };
    window.excluirObjSelecionado = function () { var s = window.obterObjSelecionado(); if (s) window.excluirObjPorId(s.id); };
    window.duplicarObjSelecionado = function () {
        var sel = window.obterObjSelecionado(); if (!sel || !window.objetosMapa || !window.ws || window.ws.readyState !== WebSocket.OPEN) return;
        var copia = JSON.parse(JSON.stringify(sel));
        copia.id = 'obj_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
        copia.x += 16; copia.y += 16;
        window.objetosMapa.push(copia);
        window.objetosSelecionadoId = copia.id;
        window.salvarObjetosServidor();
        window.atualizarListaObjetosUI();
        window.mostrarToast('📋 Objeto duplicado.');
    };

    /* ---- Salvar no Servidor ---- */
    window.salvarObjetosServidor = function () {
        if (!window.ws || window.ws.readyState !== WebSocket.OPEN) return;
        if (!window.objetosMapa) return;
        var dados = window.objetosMapa.map(function (o) { return { id: o.id, tipo: o.tipo, x: o.x, y: o.y, w: o.w, h: o.h, colidindo: !!o.colidindo }; });
        window.ws.send(JSON.stringify({ action: 'admin_map_objetos_salvar', objetos: dados }));
        window.mostrarToast('💾 ' + dados.length + ' objetos salvos!');
    };
    window.limparObjetosServidor = function () {
        if (!window.objetosMapa || !window.ws || window.ws.readyState !== WebSocket.OPEN) return;
        if (!window.ehAdmin) return;
        window.objetosMapa = [];
        window.objetosSelecionadoId = null;
        window.salvarObjetosServidor();
        window.mostrarToast('🗑️ Todos os objetos do mapa foram removidos.');
    };

    /* ---- GOD MODE ---- */
    window.toggleGodMode = function () {
        window.godMode = !window.godMode;
        var btn = document.getElementById('btn-god-mode');
        if (btn) btn.textContent = window.godMode ? '🛡️ GOD MODE: ON (Noclip + Fly + Speed)' : '🛡️ GOD MODE: OFF';
        if (window.godMode) {
            window.godOriginalSpeed = window.velocidadeAtual || 1.8;
            window.mostrarToast('🛡️ GOD MODE ligado — Noclip, Fly, Speed 2x.');
        } else {
            window.mostrarToast('🛡️ GOD MODE desligado.');
        }
        // Atualizar badge se existir
        window.atualizarBadgeGod();
    };
    window.atualizarBadgeGod = function () {
        var badge = document.getElementById('objetos-editor-god-badge');
        if (!badge) return;
        if (window.godMode) {
            badge.style.display = 'flex';
            badge.textContent = '🛡️ GOD';
        } else {
            badge.style.display = 'none';
        }
    };

    /* ---- Desenhar objetos no canvas (camada ground) ---- */
    window.desenharObjetosMapa = function () {
        if (!window.objetosMapa || !window.objetosMapa.length || !window.ctx) return;
        var ctx = window.ctx;
        var camX = window.camX || 0;
        var camY = window.camY || 0;
        var zoom = window.cameraZoomAtual || ZOOM_CAMERA || 0.92;
        var cw = ((window.canvas && window.canvas.width) || 800) / zoom;
        var ch = ((window.canvas && window.canvas.height) || 600) / zoom;
        ctx.save();
        window.objetosMapa.forEach(function (o) {
            var wx = o.x, wy = o.y;
            if (wx + (o.w || 16) < camX || wx > camX + cw || wy + (o.h || 16) < camY || wy > camY + ch) return;
            var info = OBJETO_POR_ID[o.tipo] || { w: 16, h: 16, cor: '#999' };
            var x = wx, y = wy, w = o.w || info.w, h = o.h || info.h;
            ctx.save();
            if (o.tipo === 'arvore') {
                ctx.fillStyle = '#5d4037'; ctx.fillRect(x + w * 0.35, y + h * 0.5, w * 0.25, h * 0.5);
                ctx.fillStyle = '#2e7d32'; ctx.beginPath(); ctx.arc(x + w * 0.47, y + h * 0.35, w * 0.45, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#388e3c'; ctx.beginPath(); ctx.arc(x + w * 0.35, y + h * 0.3, w * 0.35, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#43a047'; ctx.beginPath(); ctx.arc(x + w * 0.55, y + h * 0.28, w * 0.38, 0, Math.PI * 2); ctx.fill();
            } else if (o.tipo === 'pedra') {
                ctx.fillStyle = '#78909c'; ctx.beginPath(); ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#90a4ae'; ctx.beginPath(); ctx.ellipse(x + w / 2 - 2, y + h / 2 - 2, w / 3, h / 3, 0, 0, Math.PI * 2); ctx.fill();
            } else if (o.tipo === 'agua') {
                var t = Date.now() / 1000;
                ctx.fillStyle = 'rgba(21, 101, 192, 0.55)'; ctx.fillRect(x, y, w, h);
                ctx.strokeStyle = '#1565c0'; ctx.lineWidth = 1.5;
                for (var i = 0; i < 3; i++) { ctx.beginPath(); for (var xx = x; xx < x + w; xx += 4) { var yy = y + h / 2 + Math.sin(xx * 0.05 + t * 2 + i) * 3; xx === x ? ctx.moveTo(xx, yy) : ctx.lineTo(xx, yy); } ctx.stroke(); }
            } else if (o.tipo === 'planta') {
                ctx.fillStyle = '#4caf50'; ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, w / 2, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#66bb6a'; ctx.beginPath(); ctx.arc(x + w / 2 - 2, y + h / 2 - 2, w / 3, 0, Math.PI * 2); ctx.fill();
            } else if (o.tipo === 'folha') {
                ctx.fillStyle = '#ffb300'; ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w, y + h / 2); ctx.lineTo(x + w / 2, y + h); ctx.lineTo(x, y + h / 2); ctx.closePath(); ctx.fill();
            } else if (o.tipo === 'parede') {
                ctx.fillStyle = '#607d8b'; ctx.fillRect(x, y, w, h);
                ctx.strokeStyle = '#455a64'; ctx.lineWidth = 1;
                for (var yy = y; yy < y + h; yy += 8) { ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); ctx.stroke(); }
            } else if (o.tipo === 'bloco') {
                ctx.fillStyle = '#90a4ae'; ctx.fillRect(x, y, w, h);
                ctx.strokeStyle = '#78909c'; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
            } else {
                ctx.fillStyle = info.cor; ctx.fillRect(x, y, w, h);
            }
            // Se colide, desenha borda vermelha fina para indicar
            if (o.colidindo !== false) { ctx.strokeStyle = 'rgba(229, 57, 53, 0.6)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); }
            ctx.restore();
        });
        // Destaque do selecionado
        var sel = window.obterObjSelecionado();
        if (sel) {
            var sinfo = OBJETO_POR_ID[sel.tipo] || { w: 16, h: 16 };
            ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.strokeRect(sel.x, sel.y, sel.w || sinfo.w, sel.h || sinfo.h); ctx.setLineDash([]);
        }
        ctx.restore();
    };

    /* ---- Click no mapa (colocar / selecionar / remover) ---- */
    window.handleObjetosEditorClick = function (clientX, clientY) {
        if (!window.objetosEditorAtivo || !window.objetosEditorVisivel) return;
        if (window.spawnAdminAberto || window.mapVfxAberto || window.objetosEditorMinimizado) return;
        var cv = window.canvas; if (!cv) return;
        var rect = cv.getBoundingClientRect();
        var zoom = (typeof window.ZOOM_CAMERA === 'number' && window.ZOOM_CAMERA > 0) ? window.ZOOM_CAMERA : 0.92;
        var camX = window.camX || 0; var camY = window.camY || 0;
        var screenX = ((clientX - rect.left) / (rect.width || window.innerWidth) * cv.width) / zoom;
        var screenY = ((clientY - rect.top) / (rect.height || window.innerHeight) * cv.height) / zoom;
        var wx = camX + screenX; var wy = camY + screenY;
        // Grid snap 16px
        var snap = 16;
        wx = Math.round(wx / snap) * snap;
        wy = Math.round(wy / snap) * snap;
        // Limitar à cidade (x em [CID_X0, FIM_CIDADE))
        var CID_X0 = 59800; var FIM_CIDADE = 61174;
        if (wx < CID_X0 || wx >= FIM_CIDADE || wy < 0 || wy >= 1145) return;

        if (window.objetoFerramenta) {
            // Colocar objeto
            window.colocarObjeto(window.objetoFerramenta, wx, wy);
            window.atualizarListaObjetosUI();
            window.atualizarPropriedadesUI();
            window.mostrarToast('🏗️ ' + window.objetoFerramenta + ' colocado em (' + wx + ', ' + wy + ').');
        } else {
            // Selecionar ou remover ao clicar em objeto existente
            var lista = obterObjetos();
            var achou = null;
            for (var i = 0; i < lista.length; i++) {
                var o = lista[i]; var ox = o.x, oy = o.y, ow = o.w || 16, oh = o.h || 16;
                if (wx >= ox && wx <= ox + ow && wy >= oy && wy <= oy + oh) { achou = o; break; }
            }
            if (achou) {
                // Clicar em objeto existente: selecionar (ou remover se segurar Shift)
                if (window.shiftKey) { window.excluirObjPorId(achou.id); }
                else { window.selecionarObjeto(achou.id); }
            } else {
                window.objetosSelecionadoId = null; window.atualizarPropriedadesUI(); window.atualizarListaObjetosUI();
            }
        }
    };

    /* ---- Injetar listener de click no canvas para o editor ---- */
    var _originalObjetosSetup = null;
    (function () {
        // Hook no click do canvas quando editor está ativo
        var origKeyHandler = null;
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Shift') window.shiftKey = true;
        });
        document.addEventListener('keyup', function (e) {
            if (e.key === 'Shift') window.shiftKey = false;
        });
    })();

    /* ---- Expor para o index.html chamar o click do editor ---- */
    var _origClickHandler = null;
    function instalarHookClickObjetos() {
        if (typeof window.addEventListener === 'function') {
            // Vamos interceptar o click no canvas e chamar handleObjetosEditorClick
            // O index.html pode chamar window.handleObjetosEditorClick(clientX, clientY) no click
        }
    }

    /* ---- Expor funções globais ---- */
    window.obterObjetos = obterObjetos;
    window.carregarObjetosLocais = carregarObjetosLocais;

    // Inicializar ao carregar o script
    carregarObjetosLocais();
})();
