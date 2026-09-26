// ============================================================================
// colisao-editor.js — Editor Completo de Colisões em Tempo Real (Admin)
// Exclusivo para conta Admin. Permite visualizar, criar, redimensionar, mover
// e excluir colisões no mapa com sincronização ao vivo via WebSocket.
// ============================================================================
(function (global) {
    'use strict';

    // Estado do Editor
    window.colisaoEditorAtivo = false;
    window.editorColisaoVisivel = false;
    window.colisaoSelecionadaId = null;
    window.modoFerramenta = 'select'; // 'select' | 'add_rect' | 'add_circle' | 'delete'
    window.modoEdicaoMapa = 'colisao'; // 'colisao' | 'camada'
    window.dragEstado = null;
    window.editorMinimizado = false;

    // Configuração de todos os 9 mapas suportados pelo jogo (v1.47.0)
    const MAPAS_CONFIG = {
        cidade:        { x0: 59800, y0: 0, w: 1374,  h: 1145,  nome: 'Cidade de Davahl',   icone: '🏰' },
        green:         { x0: 0,     y0: 0, w: 18000, h: 5400,  nome: 'Campo Verde',       icone: '🌿' },
        desert:        { x0: 18000, y0: 0, w: 32000, h: 36000, nome: 'Deserto com Oásis', icone: '🏜️' },
        pantano:       { x0: 50000, y0: 0, w: 8000,  h: 9000,  nome: 'Pântano Realista',   icone: '🌿' },
        caverna:       { x0: 58000, y0: 0, w: 1800,  h: 1800,  nome: 'Caverna Sombria',    icone: '🕳️' },
        arena:         { x0: 63800, y0: 0, w: 1240,  h: 1240,  nome: 'Arena de Davahl',    icone: '⚔️' },
        cidadeperdida: { x0: 65040, y0: 0, w: 6880,  h: 3920,  nome: 'Cidade Perdida',     icone: '🏛️' },
        testevisual:   { x0: 72000, y0: 0, w: 1280,  h: 960,   nome: 'Arena Visual Teste', icone: '🌿' },
        zonazero:      { x0: 74000, y0: 0, w: 8000,  h: 9000,  nome: 'Zona Zero (Gelo)',   icone: '❄️' },
        castelo:       { x0: 82000, y0: 0, w: 2200,  h: 1800,  nome: 'Castelo Anda 1 (DG)', icone: '🏯' }
    };

    window.MAPAS_CONFIG = MAPAS_CONFIG;
    window.colisoesPorMapa = window.colisoesPorMapa || {};
    window.camadasPorMapa = window.camadasPorMapa || {};
    window.mapaEdicaoAtivo = window.mapaEdicaoAtivo || 'cidade';

    function obterConfigMapaAtivo() {
        return MAPAS_CONFIG[window.mapaEdicaoAtivo] || MAPAS_CONFIG.cidade;
    }

    function modoCamadaAtivo() {
        return window.modoEdicaoMapa === 'camada';
    }

    function obterListaEditor() {
        const mapa = window.mapaEdicaoAtivo || 'cidade';
        if (modoCamadaAtivo()) {
            if (!Array.isArray(window.camadasPorMapa[mapa])) {
                if (mapa === 'cidade' && global.mapaCidade && typeof global.mapaCidade.obterCamadas === 'function') {
                    window.camadasPorMapa[mapa] = global.mapaCidade.obterCamadas();
                } else {
                    window.camadasPorMapa[mapa] = [];
                }
            }
            return window.camadasPorMapa[mapa];
        } else {
            if (!Array.isArray(window.colisoesPorMapa[mapa])) {
                if (mapa === 'cidade' && global.mapaCidade && typeof global.mapaCidade.obterObstaculos === 'function') {
                    window.colisoesPorMapa[mapa] = global.mapaCidade.obterObstaculos();
                } else {
                    window.colisoesPorMapa[mapa] = [];
                }
            }
            return window.colisoesPorMapa[mapa];
        }
    }

    function carregarListaEditor(lista) {
        const mapa = window.mapaEdicaoAtivo || 'cidade';
        if (modoCamadaAtivo()) {
            window.camadasPorMapa[mapa] = lista;
            if (mapa === 'cidade' && global.mapaCidade && typeof global.mapaCidade.carregarCamadas === 'function') {
                global.mapaCidade.carregarCamadas(lista);
            }
        } else {
            window.colisoesPorMapa[mapa] = lista;
            if (mapa === 'cidade' && global.mapaCidade && typeof global.mapaCidade.carregarObstaculos === 'function') {
                global.mapaCidade.carregarObstaculos(lista);
            }
        }
    }

    window.setMapaEdicao = function (mapa) {
        if (!MAPAS_CONFIG[mapa]) return;
        window.mapaEdicaoAtivo = mapa;
        window.colisaoSelecionadaId = null;
        window.dragEstado = null;

        const sel = document.getElementById('col-map-select');
        if (sel && sel.value !== mapa) sel.value = mapa;

        const badge = document.getElementById('colisao-editor-hud-badge');
        if (badge) {
            const span = badge.querySelector('span');
            if (span) span.innerHTML = (modoCamadaAtivo() ? '🌿 ' : '🧱 ') + (MAPAS_CONFIG[mapa].icone || '🗺️') + ' ' + (MAPAS_CONFIG[mapa].nome || mapa).toUpperCase();
        }

        const titulo = document.getElementById('colisao-editor-title');
        if (titulo) {
            titulo.innerHTML = (modoCamadaAtivo() ? '🌿 EDITOR DE CAMADAS' : '🧱 EDITOR DE COLISÕES') + ' · <span style="font-size:11px;color:#f39c12;">' + (MAPAS_CONFIG[mapa].icone || '') + ' ' + (MAPAS_CONFIG[mapa].nome || mapa) + '</span>';
        }

        window.atualizarPropriedadesUI();
        window.atualizarListaColisoesUI();
        window.mostrarToast('Editando mapa: ' + (MAPAS_CONFIG[mapa].nome || mapa));
    };

    window.obterMapaEdicao = function () {
        return window.mapaEdicaoAtivo || 'cidade';
    };

    // Converte Coordenadas de Tela (Mouse/Touch) para Coordenadas Locais do Mapa Ativo
    function telaParaLocal(clientX, clientY) {
        const cv = global.canvas;
        if (!cv) return { lx: 0, ly: 0, wx: 0, wy: 0 };
        const rect = cv.getBoundingClientRect();
        const zoom = (typeof global.ZOOM_CAMERA === 'number' && global.ZOOM_CAMERA > 0) ? global.ZOOM_CAMERA : 0.92;
        const camX = global.camX || 0;
        const camY = global.camY || 0;

        const rw = rect.width || window.innerWidth || cv.width || 800;
        const rh = rect.height || window.innerHeight || cv.height || 600;
        const rLeft = rect.left !== undefined ? rect.left : 0;
        const rTop = rect.top !== undefined ? rect.top : 0;

        const screenX = ((clientX - rLeft) / rw * cv.width) / zoom;
        const screenY = ((clientY - rTop) / rh * cv.height) / zoom;

        const wx = camX + screenX;
        const wy = camY + screenY;
        const cfg = obterConfigMapaAtivo();
        const lx = wx - cfg.x0;
        const ly = wy - cfg.y0;

        return { lx: Math.round(lx), ly: Math.round(ly), wx: Math.round(wx), wy: Math.round(wy) };
    }
    const telaParaLocalCidade = telaParaLocal;

    function distPontoSegmento(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) return Math.hypot(px - x1, py - y1);
        let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));
        return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
    }

    // Hit-Test de Handles de Redimensionamento (apenas para a colisão selecionada)
    function testarHandles(sel, lx, ly) {
        if (!sel) return null;
        const HANDLE_SIZE = 14; // tolerância de clique em pixels
        if (sel.tipo === 'rect') {
            const x1 = sel.x, y1 = sel.y;
            const x2 = sel.x + sel.w, y2 = sel.y + sel.h;
            const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;

            if (Math.hypot(lx - x1, ly - y1) <= HANDLE_SIZE) return 'tl';
            if (Math.hypot(lx - x2, ly - y1) <= HANDLE_SIZE) return 'tr';
            if (Math.hypot(lx - x2, ly - y2) <= HANDLE_SIZE) return 'br';
            if (Math.hypot(lx - x1, ly - y2) <= HANDLE_SIZE) return 'bl';

            if (Math.hypot(lx - mx, ly - y1) <= HANDLE_SIZE) return 't';
            if (Math.hypot(lx - x2, ly - my) <= HANDLE_SIZE) return 'r';
            if (Math.hypot(lx - mx, ly - y2) <= HANDLE_SIZE) return 'b';
            if (Math.hypot(lx - x1, ly - my) <= HANDLE_SIZE) return 'l';

            if (Math.hypot(lx - mx, ly - my) <= HANDLE_SIZE + 4) return 'center';
        } else if (sel.tipo === 'circle') {
            const cx = sel.cx, cy = sel.cy, r = sel.r;
            if (Math.hypot(lx - cx, ly - cy) <= HANDLE_SIZE + 4) return 'center';
            if (Math.hypot(lx - (cx + r), ly - cy) <= HANDLE_SIZE) return 'radius';
        } else if (sel.tipo === 'line') {
            if (sel.pontos && sel.pontos.length >= 2) {
                const tol = (sel.espessura ? sel.espessura / 2 : 8) + 8;
                for (let j = 0; j < sel.pontos.length - 1; j++) {
                    const p1 = sel.pontos[j];
                    const p2 = sel.pontos[j + 1];
                    if (distPontoSegmento(lx, ly, p1.x, p1.y, p2.x, p2.y) <= tol) {
                        return 'center';
                    }
                }
            }
        }
        return null;
    }

    // Hit-Test de Corpo de Obstáculo
    function testarObstaculoNoPonto(lx, ly) {
        const lista = obterListaEditor();
        for (let i = lista.length - 1; i >= 0; i--) {
            const o = lista[i];
            if (o.tipo === 'rect') {
                if (lx >= o.x && lx <= (o.x + o.w) && ly >= o.y && ly <= (o.y + o.h)) {
                    return o;
                }
            } else if (o.tipo === 'circle') {
                if (Math.hypot(lx - o.cx, ly - o.cy) <= o.r) {
                    return o;
                }
            } else if (o.tipo === 'line') {
                if (o.pontos && o.pontos.length >= 2) {
                    const tol = (o.espessura ? o.espessura / 2 : 8) + 8;
                    if (lx + tol >= o.x && lx - tol <= o.x + o.w &&
                        ly + tol >= o.y && ly - tol <= o.y + o.h) {
                        for (let j = 0; j < o.pontos.length - 1; j++) {
                            const p1 = o.pontos[j];
                            const p2 = o.pontos[j + 1];
                            if (distPontoSegmento(lx, ly, p1.x, p1.y, p2.x, p2.y) <= tol) {
                                return o;
                            }
                        }
                    }
                }
            }
        }
        return null;
    }

    // ============================================================================
    // MONTAGEM DA INTERFACE DOM
    // ============================================================================
    function montarEditorUI() {
        const barra = document.getElementById('util-buttons');
        if (barra && !document.getElementById('btn-colisao-editor')) {
            const btn = document.createElement('button');
            btn.id = 'btn-colisao-editor';
            btn.className = 'btn-util';
            btn.innerHTML = '🧱';
            btn.title = 'Editor de Colisões (Admin)';
            btn.style.display = 'none';
            btn.onclick = function (e) {
                e.stopPropagation();
                window.toggleEditorColisao();
            };
            barra.appendChild(btn);
        }

        if (!document.getElementById('colisao-editor-hud-badge')) {
            const badge = document.createElement('div');
            badge.id = 'colisao-editor-hud-badge';
            badge.innerHTML =
                '<span>🧱 MODO EDITOR DE COLISÕES</span>' +
                '<button id="badge-btn-toggle-vis" onclick="window.toggleVisibilidadeColisoes()">👁️ Ocultar</button>' +
                '<button onclick="window.minimizarEditorColisao()">🗖 Janela</button>' +
                '<button onclick="window.salvarColisoesServidor()" style="background:#27ae60;border-color:#2ecc71;">💾 Salvar</button>' +
                '<button onclick="window.fecharEditorColisao()" style="background:#c0392b;border-color:#e74c3c;">✕ Sair</button>';
            document.body.appendChild(badge);
        }

        if (!document.getElementById('colisao-editor-screen')) {
            const scr = document.createElement('div');
            scr.id = 'colisao-editor-screen';
            scr.innerHTML =
                '<div id="colisao-editor-header">' +
                    '<div id="colisao-editor-title">🧱 EDITOR DE COLISÕES</div>' +
                    '<div class="col-window-controls">' +
                        '<button class="col-window-btn" onclick="window.minimizarEditorColisao()" title="Minimizar">_</button>' +
                        '<button class="col-window-btn" onclick="window.fecharEditorColisao()" title="Fechar">✕</button>' +
                    '</div>' +
                '</div>' +
                '<div id="colisao-editor-body">' +
                    '<div class="col-map-bar">' +
                        '<label>🗺️ MAPA:</label>' +
                        '<select id="col-map-select" onchange="window.setMapaEdicao(this.value)">' +
                            '<option value="cidade">🏰 Cidade de Davahl</option>' +
                            '<option value="green">🌿 Campo Verde</option>' +
                            '<option value="desert">🏜️ Deserto com Oásis</option>' +
                            '<option value="pantano">🌿 Pântano Realista</option>' +
                            '<option value="caverna">🕳️ Caverna Sombria</option>' +
                            '<option value="arena">⚔️ Arena de Davahl</option>' +
                            '<option value="cidadeperdida">🏛️ Cidade Perdida</option>' +
                            '<option value="testevisual">🌿 Arena Visual Teste</option>' +
                        '</select>' +
                    '</div>' +
                    '<div class="col-toolbar">' +
                        '<button id="tool-btn-mode-colisao" class="col-tool-btn active" onclick="window.setModoEdicaoMapa(\'colisao\')">🧱 COLISÃO</button>' +
                        '<button id="tool-btn-mode-camada" class="col-tool-btn btn-tool-layer" onclick="window.setModoEdicaoMapa(\'camada\')">🌿 CAMADA</button>' +
                        '<button id="tool-btn-vis" class="col-tool-btn btn-toggle-vis on" onclick="window.toggleVisibilidadeColisoes()">👁️ Ver: ON</button>' +
                        '<button id="tool-btn-select" class="col-tool-btn active" onclick="window.setModoFerramenta(\'select\')">👆 Selecionar</button>' +
                        '<button id="tool-btn-line" class="col-tool-btn btn-tool-curve" onclick="window.setModoFerramenta(\'add_line\')" style="grid-column: span 2;">✏️ Linha Curva / Pincel</button>' +
                        '<button id="tool-btn-rect" class="col-tool-btn" onclick="window.setModoFerramenta(\'add_rect\')">⬛ + Retângulo</button>' +
                        '<button id="tool-btn-circle" class="col-tool-btn" onclick="window.setModoFerramenta(\'add_circle\')">🔵 + Círculo</button>' +
                        '<button class="col-tool-btn" onclick="window.criarColisaoNoPlayer()" style="grid-column: span 2;">📍 Criar no Player (40x40)</button>' +
                    '</div>' +

                    '<div class="col-section" id="col-prop-section">' +
                        '<div class="col-section-title">' +
                            '<span>PROPRIEDADES</span>' +
                            '<span id="col-sel-badge" style="font-size:9px;color:#f39c12;">NENHUMA</span>' +
                        '</div>' +
                        '<div id="col-prop-empty" style="font-size:11px;color:#7f8c8d;padding:8px 0;text-align:center;">' +
                            'Clique em uma colisão no mapa ou selecione na lista abaixo.' +
                        '</div>' +
                        '<div id="col-prop-form" style="display:none;flex-direction:column;gap:6px;">' +
                            '<div class="col-field">' +
                                '<label>Nome / Identificador</label>' +
                                '<input type="text" id="prop-nome" oninput="window.atualizarPropriedadeSelecionada(\'nome\', this.value)">' +
                            '</div>' +
                            '<div class="col-field">' +
                                '<label>Posição X (Local)</label>' +
                                '<div class="col-stepper-row">' +
                                    '<button class="col-step-btn" onclick="window.ajustarPropriedadePasso(\'x\', -10)">-10</button>' +
                                    '<button class="col-step-btn" onclick="window.ajustarPropriedadePasso(\'x\', -1)">-1</button>' +
                                    '<input type="number" id="prop-x" onchange="window.atualizarPropriedadeSelecionada(\'x\', parseInt(this.value)||0)">' +
                                    '<button class="col-step-btn" onclick="window.ajustarPropriedadePasso(\'x\', +1)">+1</button>' +
                                    '<button class="col-step-btn" onclick="window.ajustarPropriedadePasso(\'x\', +10)">+10</button>' +
                                '</div>' +
                            '</div>' +
                            '<div class="col-field">' +
                                '<label>Posição Y (Local)</label>' +
                                '<div class="col-stepper-row">' +
                                    '<button class="col-step-btn" onclick="window.ajustarPropriedadePasso(\'y\', -10)">-10</button>' +
                                    '<button class="col-step-btn" onclick="window.ajustarPropriedadePasso(\'y\', -1)">-1</button>' +
                                    '<input type="number" id="prop-y" onchange="window.atualizarPropriedadeSelecionada(\'y\', parseInt(this.value)||0)">' +
                                    '<button class="col-step-btn" onclick="window.ajustarPropriedadePasso(\'y\', +1)">+1</button>' +
                                    '<button class="col-step-btn" onclick="window.ajustarPropriedadePasso(\'y\', +10)">+10</button>' +
                                '</div>' +
                            '</div>' +
                            '<div class="col-field" id="prop-w-field">' +
                                '<label id="prop-w-label">Largura (W)</label>' +
                                '<div class="col-stepper-row">' +
                                    '<button class="col-step-btn" onclick="window.ajustarPropriedadePasso(\'w\', -10)">-10</button>' +
                                    '<button class="col-step-btn" onclick="window.ajustarPropriedadePasso(\'w\', -1)">-1</button>' +
                                    '<input type="number" id="prop-w" min="4" onchange="window.atualizarPropriedadeSelecionada(\'w\', parseInt(this.value)||10)">' +
                                    '<button class="col-step-btn" onclick="window.ajustarPropriedadePasso(\'w\', +1)">+1</button>' +
                                    '<button class="col-step-btn" onclick="window.ajustarPropriedadePasso(\'w\', +10)">+10</button>' +
                                '</div>' +
                            '</div>' +
                            '<div class="col-field" id="prop-h-field">' +
                                '<label>Altura (H)</label>' +
                                '<div class="col-stepper-row">' +
                                    '<button class="col-step-btn" onclick="window.ajustarPropriedadePasso(\'h\', -10)">-10</button>' +
                                    '<button class="col-step-btn" onclick="window.ajustarPropriedadePasso(\'h\', -1)">-1</button>' +
                                    '<input type="number" id="prop-h" min="4" onchange="window.atualizarPropriedadeSelecionada(\'h\', parseInt(this.value)||10)">' +
                                    '<button class="col-step-btn" onclick="window.ajustarPropriedadePasso(\'h\', +1)">+1</button>' +
                                    '<button class="col-step-btn" onclick="window.ajustarPropriedadePasso(\'h\', +10)">+10</button>' +
                                '</div>' +
                            '</div>' +
                            '<div class="col-field" id="prop-espessura-field" style="display:none;">' +
                                '<label>Espessura da Linha (px)</label>' +
                                '<div class="col-stepper-row">' +
                                    '<button class="col-step-btn" onclick="window.ajustarPropriedadePasso(\'espessura\', -10)">-10</button>' +
                                    '<button class="col-step-btn" onclick="window.ajustarPropriedadePasso(\'espessura\', -2)">-2</button>' +
                                    '<input type="number" id="prop-espessura" min="4" max="120" onchange="window.atualizarPropriedadeSelecionada(\'espessura\', parseInt(this.value)||16)">' +
                                    '<button class="col-step-btn" onclick="window.ajustarPropriedadePasso(\'espessura\', +2)">+2</button>' +
                                    '<button class="col-step-btn" onclick="window.ajustarPropriedadePasso(\'espessura\', +10)">+10</button>' +
                                '</div>' +
                            '</div>' +
                            '<div class="col-field" id="prop-info-line" style="display:none; font-size:10px; color:#bdc3c7; background:rgba(0,0,0,0.3); padding:4px 8px; border-radius:3px; border:1px solid #555; text-align:center;">' +
                                '<span id="prop-line-pontos-count">0 pontos</span> · <span id="prop-line-comprimento">0 px</span>' +
                            '</div>' +
                            '<div class="col-actions-row">' +
                                '<button class="col-action-btn btn-col-duplicate" onclick="window.duplicarColisaoSelecionada()">📋 Duplicar</button>' +
                                '<button class="col-action-btn btn-col-teleport" onclick="window.teleportarParaSelecionada()">📍 Ir Até</button>' +
                                '<button class="col-action-btn btn-col-delete" onclick="window.excluirColisaoSelecionada()">🗑️ Excluir</button>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +

                    '<div class="col-section">' +
                        '<div class="col-section-title">' +
                            '<span id="col-list-title">TODAS AS COLISÕES</span>' +
                            '<span id="col-count-badge" style="font-size:10px;color:#2ecc71;">0 ativas</span>' +
                        '</div>' +
                        '<input type="text" id="col-search-input" placeholder="🔍 Filtrar por nome..." oninput="window.filtrarListaColisoes(this.value)" style="background:#231e17;border:1px solid #5a4b36;color:#fff;padding:4px;font-size:10px;border-radius:3px;">' +
                        '<div id="col-lista-container"></div>' +
                    '</div>' +
                '</div>' +
                '<div id="colisao-editor-footer">' +
                    '<button id="btn-salvar-colisoes" onclick="window.salvarColisoesServidor()">💾 SALVAR NO SERVIDOR</button>' +
                    '<div id="col-status-bar">Pronto para editar. Arraste as caixas no mapa.</div>' +
                '</div>';
            document.body.appendChild(scr);
            tornarJanelaArrastavel(scr, document.getElementById('colisao-editor-header'));
        }
    }

    function tornarJanelaArrastavel(janela, cabecalho) {
        let isDragging = false, startX, startY, origX, origY;
        cabecalho.addEventListener('mousedown', function (e) {
            isDragging = true;
            startX = e.clientX; startY = e.clientY;
            origX = janela.offsetLeft; origY = janela.offsetTop;
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
            e.preventDefault();
        });
        function onMove(e) {
            if (!isDragging) return;
            janela.style.left = (origX + e.clientX - startX) + 'px';
            janela.style.top = (origY + e.clientY - startY) + 'px';
            janela.style.right = 'auto';
        }
        function onUp() {
            isDragging = false;
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        }
    }

    // ============================================================================
    // CONTROLES DE ABERTURA / FECHAMENTO
    // ============================================================================
    window.mostrarBotaoColisaoEditor = function () {
        window.ehAdmin = true;
        const btn = document.getElementById('btn-colisao-editor');
        if (btn) btn.style.display = 'flex';
    };

    window.toggleEditorColisao = function () {
        if (window.colisaoEditorAtivo) {
            window.fecharEditorColisao();
        } else {
            window.abrirEditorColisao();
        }
    };

    window.abrirEditorColisao = function () {
        if (!window.ehAdmin) {
            console.warn('Apenas administradores podem acessar o editor de colisões.');
            return;
        }
        montarEditorUI();
        window.colisaoEditorAtivo = true;
        window.editorColisaoVisivel = true;
        window.editorMinimizado = false;

        const scr = document.getElementById('colisao-editor-screen');
        if (scr) scr.style.display = 'flex';
        const badge = document.getElementById('colisao-editor-hud-badge');
        if (badge) badge.style.display = 'flex';
        const btn = document.getElementById('btn-colisao-editor');
        if (btn) btn.classList.add('ativo');

        window.atualizarListaColisoesUI();
        window.atualizarPropriedadesUI();
    };

    window.fecharEditorColisao = function () {
        window.colisaoEditorAtivo = false;
        window.colisaoSelecionadaId = null;
        window.dragEstado = null;

        const scr = document.getElementById('colisao-editor-screen');
        if (scr) scr.style.display = 'none';
        const badge = document.getElementById('colisao-editor-hud-badge');
        if (badge) badge.style.display = 'none';
        const btn = document.getElementById('btn-colisao-editor');
        if (btn) btn.classList.remove('ativo');
    };

    window.minimizarEditorColisao = function () {
        const scr = document.getElementById('colisao-editor-screen');
        if (!scr) return;
        window.editorMinimizado = !window.editorMinimizado;
        scr.style.display = window.editorMinimizado ? 'none' : 'flex';
    };

    window.toggleVisibilidadeColisoes = function () {
        window.editorColisaoVisivel = !window.editorColisaoVisivel;
        const btnVis = document.getElementById('tool-btn-vis');
        if (btnVis) {
            btnVis.className = 'col-tool-btn btn-toggle-vis ' + (window.editorColisaoVisivel ? 'on' : '');
            btnVis.innerHTML = window.editorColisaoVisivel ? '👁️ Ver: ON' : '👁️ Ver: OFF';
        }
        const badgeBtn = document.getElementById('badge-btn-toggle-vis');
        if (badgeBtn) badgeBtn.textContent = window.editorColisaoVisivel ? '👁️ Ocultar' : '👁️ Mostrar';
    };

    window.setModoEdicaoMapa = function (modo) {
        window.modoEdicaoMapa = modo === 'camada' ? 'camada' : 'colisao';
        window.colisaoSelecionadaId = null;
        window.dragEstado = null;
        const btnColisao = document.getElementById('tool-btn-mode-colisao');
        const btnCamada = document.getElementById('tool-btn-mode-camada');
        if (btnColisao) btnColisao.classList.toggle('active', !modoCamadaAtivo());
        if (btnCamada) btnCamada.classList.toggle('active', modoCamadaAtivo());
        const titulo = document.getElementById('colisao-editor-title');
        if (titulo) titulo.textContent = modoCamadaAtivo() ? '🌿 EDITOR DE CAMADAS' : '🧱 EDITOR DE COLISÕES';
        const listaTitulo = document.getElementById('col-list-title');
        if (listaTitulo) listaTitulo.textContent = modoCamadaAtivo() ? 'TODAS AS CAMADAS' : 'TODAS AS COLISÕES';
        const badge = document.getElementById('colisao-editor-hud-badge');
        if (badge) {
            const texto = badge.querySelector('span');
            if (texto) texto.textContent = modoCamadaAtivo() ? '🌿 MODO EDITOR DE CAMADAS' : '🧱 MODO EDITOR DE COLISÕES';
        }
        window.setModoFerramenta('select');
        window.atualizarListaColisoesUI();
        window.atualizarPropriedadesUI();
    };

    window.setModoFerramenta = function (modo) {
        if (modoCamadaAtivo() && modo === 'add_circle') modo = 'add_rect';
        window.modoFerramenta = modo;
        ['select', 'line', 'rect', 'circle'].forEach(function (m) {
            const b = document.getElementById('tool-btn-' + m);
            if (b) b.classList.remove('active');
        });
        const ativoBtn = document.getElementById(
            modo === 'select' ? 'tool-btn-select' : (modo === 'add_line' ? 'tool-btn-line' : (modo === 'add_rect' ? 'tool-btn-rect' : 'tool-btn-circle'))
        );
        if (ativoBtn) ativoBtn.classList.add('active');

        if (global.canvas) {
            if (modo === 'add_line' || modo === 'add_rect' || modo === 'add_circle') {
                global.canvas.style.cursor = 'crosshair';
            } else {
                global.canvas.style.cursor = 'default';
            }
        }

        const statusBar = document.getElementById('col-status-bar');
        if (statusBar) {
            if (modo === 'select') statusBar.textContent = modoCamadaAtivo() ? 'CAMADA: clique para selecionar ou arrastar' : 'Modo Seleção: clique para selecionar ou arrastar';
            else if (modo === 'add_line') statusBar.textContent = '✏️ Pincel Livre: clique, segure e arraste no mapa desenhando curvas';
            else if (modo === 'add_rect') statusBar.textContent = modoCamadaAtivo() ? 'CAMADA: clique e arraste para marcar foreground' : 'Modo Retângulo: clique e arraste no mapa para criar';
            else if (modo === 'add_circle') statusBar.textContent = 'Modo Círculo: clique e arraste no mapa para criar';
        }
    };

    // ============================================================================
    // GERENCIAMENTO DE PROPRIEDADES E LISTA
    // ============================================================================
    window.selecionarColisao = function (id) {
        window.colisaoSelecionadaId = id;
        window.atualizarPropriedadesUI();
        window.atualizarListaColisoesUI();
    };

    window.obterColisaoSelecionada = function () {
        if (!window.colisaoSelecionadaId) return null;
        const lista = obterListaEditor();
        for (let i = 0; i < lista.length; i++) {
            if (lista[i].id === window.colisaoSelecionadaId) return lista[i];
        }
        return null;
    };

    window.atualizarPropriedadesUI = function () {
        const sel = window.obterColisaoSelecionada();
        const secEmpty = document.getElementById('col-prop-empty');
        const secForm = document.getElementById('col-prop-form');
        const badge = document.getElementById('col-sel-badge');

        if (!sel) {
            if (secEmpty) secEmpty.style.display = 'block';
            if (secForm) secForm.style.display = 'none';
            if (badge) badge.textContent = 'NENHUMA';
            return;
        }

        if (secEmpty) secEmpty.style.display = 'none';
        if (secForm) secForm.style.display = 'flex';

        const inputNome = document.getElementById('prop-nome');
        if (inputNome) inputNome.value = sel.nome || '';

        const inputX = document.getElementById('prop-x');
        const inputY = document.getElementById('prop-y');
        const inputW = document.getElementById('prop-w');
        const inputH = document.getElementById('prop-h');
        const labelW = document.getElementById('prop-w-label');
        const fieldW = document.getElementById('prop-w-field');
        const fieldH = document.getElementById('prop-h-field');
        const fieldEsp = document.getElementById('prop-espessura-field');
        const inputEsp = document.getElementById('prop-espessura');
        const infoLine = document.getElementById('prop-info-line');

        if (sel.tipo === 'rect') {
            if (badge) badge.textContent = '⬛ RETÂNGULO';
            if (inputX) inputX.value = sel.x;
            if (inputY) inputY.value = sel.y;
            if (inputW) inputW.value = sel.w;
            if (inputH) inputH.value = sel.h;
            if (fieldW) fieldW.style.display = 'flex';
            if (labelW) labelW.textContent = 'Largura (W)';
            if (fieldH) fieldH.style.display = 'flex';
            if (fieldEsp) fieldEsp.style.display = 'none';
            if (infoLine) infoLine.style.display = 'none';
        } else if (sel.tipo === 'circle') {
            if (badge) badge.textContent = '🔵 CÍRCULO';
            if (inputX) inputX.value = sel.cx;
            if (inputY) inputY.value = sel.cy;
            if (inputW) inputW.value = sel.r;
            if (fieldW) fieldW.style.display = 'flex';
            if (labelW) labelW.textContent = 'Raio (R)';
            if (fieldH) fieldH.style.display = 'none';
            if (fieldEsp) fieldEsp.style.display = 'none';
            if (infoLine) infoLine.style.display = 'none';
        } else if (sel.tipo === 'line') {
            if (badge) badge.textContent = '✏️ LINHA CURVA';
            if (inputX) inputX.value = sel.x;
            if (inputY) inputY.value = sel.y;
            if (fieldW) fieldW.style.display = 'none';
            if (fieldH) fieldH.style.display = 'none';
            if (fieldEsp) fieldEsp.style.display = 'flex';
            if (inputEsp) inputEsp.value = sel.espessura || 16;
            if (infoLine) {
                infoLine.style.display = 'block';
                let comp = 0;
                if (sel.pontos && sel.pontos.length >= 2) {
                    for (let pi = 0; pi < sel.pontos.length - 1; pi++) {
                        comp += Math.hypot(sel.pontos[pi + 1].x - sel.pontos[pi].x, sel.pontos[pi + 1].y - sel.pontos[pi].y);
                    }
                }
                const cnt = document.getElementById('prop-line-pontos-count');
                const cmp = document.getElementById('prop-line-comprimento');
                if (cnt) cnt.textContent = (sel.pontos ? sel.pontos.length : 0) + ' pontos';
                if (cmp) cmp.textContent = Math.round(comp) + ' px total';
            }
        }
    };

    window.atualizarPropriedadeSelecionada = function (prop, valor) {
        const sel = window.obterColisaoSelecionada();
        if (!sel) return;
        const lista = obterListaEditor();

        for (let i = 0; i < lista.length; i++) {
            if (lista[i].id === sel.id) {
                if (prop === 'nome') {
                    lista[i].nome = valor;
                } else if (sel.tipo === 'rect') {
                    if (prop === 'x') lista[i].x = Math.round(valor);
                    if (prop === 'y') lista[i].y = Math.round(valor);
                    if (prop === 'w') lista[i].w = Math.max(4, Math.round(valor));
                    if (prop === 'h') lista[i].h = Math.max(4, Math.round(valor));
                } else if (sel.tipo === 'circle') {
                    if (prop === 'x') lista[i].cx = Math.round(valor);
                    if (prop === 'y') lista[i].cy = Math.round(valor);
                    if (prop === 'w') lista[i].r = Math.max(4, Math.round(valor));
                } else if (sel.tipo === 'line') {
                    if (prop === 'espessura') {
                        lista[i].espessura = Math.max(4, Math.min(120, Math.round(valor)));
                    } else if (prop === 'x') {
                        const dx = Math.round(valor) - (sel.x || 0);
                        if (Array.isArray(lista[i].pontos)) {
                            lista[i].pontos.forEach(function (pt) { pt.x += dx; });
                        }
                    } else if (prop === 'y') {
                        const dy = Math.round(valor) - (sel.y || 0);
                        if (Array.isArray(lista[i].pontos)) {
                            lista[i].pontos.forEach(function (pt) { pt.y += dy; });
                        }
                    }
                }
                if (modoCamadaAtivo() && lista[i].tipo === 'rect') lista[i].baseY = Math.round(lista[i].y + lista[i].h);
                break;
            }
        }
        carregarListaEditor(lista);
        window.atualizarListaColisoesUI();
    };

    window.ajustarPropriedadePasso = function (prop, delta) {
        const sel = window.obterColisaoSelecionada();
        if (!sel) return;
        if (sel.tipo === 'rect') {
            if (prop === 'x') window.atualizarPropriedadeSelecionada('x', sel.x + delta);
            if (prop === 'y') window.atualizarPropriedadeSelecionada('y', sel.y + delta);
            if (prop === 'w') window.atualizarPropriedadeSelecionada('w', sel.w + delta);
            if (prop === 'h') window.atualizarPropriedadeSelecionada('h', sel.h + delta);
        } else if (sel.tipo === 'circle') {
            if (prop === 'x') window.atualizarPropriedadeSelecionada('x', sel.cx + delta);
            if (prop === 'y') window.atualizarPropriedadeSelecionada('y', sel.cy + delta);
            if (prop === 'w') window.atualizarPropriedadeSelecionada('w', sel.r + delta);
        } else if (sel.tipo === 'line') {
            if (prop === 'espessura') window.atualizarPropriedadeSelecionada('espessura', (sel.espessura || 16) + delta);
            if (prop === 'x') window.atualizarPropriedadeSelecionada('x', (sel.x || 0) + delta);
            if (prop === 'y') window.atualizarPropriedadeSelecionada('y', (sel.y || 0) + delta);
        }
        window.atualizarPropriedadesUI();
    };

    function atualizarOpcoesMapaSelect() {
        const sel = document.getElementById('col-map-select');
        if (!sel) return;
        const valorAtual = window.mapaEdicaoAtivo || 'cidade';
        let html = '';
        Object.keys(MAPAS_CONFIG).forEach(function (key) {
            const cfg = MAPAS_CONFIG[key];
            const colCount = (window.colisoesPorMapa && window.colisoesPorMapa[key]) ? window.colisoesPorMapa[key].length : 0;
            const camCount = (window.camadasPorMapa && window.camadasPorMapa[key]) ? window.camadasPorMapa[key].length : 0;
            const badgeTxt = modoCamadaAtivo() ? (' (' + camCount + ' cam)') : (' (' + colCount + ' col)');
            html += '<option value="' + key + '"' + (key === valorAtual ? ' selected' : '') + '>' + (cfg.icone || '🗺️') + ' ' + cfg.nome + badgeTxt + '</option>';
        });
        sel.innerHTML = html;
        sel.value = valorAtual;
    }

    window.atualizarListaColisoesUI = function (filtro) {
        atualizarOpcoesMapaSelect();
        const container = document.getElementById('col-lista-container');
        if (!container) return;
        const lista = obterListaEditor();
        const badgeCount = document.getElementById('col-count-badge');
        if (badgeCount) badgeCount.textContent = lista.length + ' ativas';

        const termo = (filtro || '').toLowerCase().trim();
        let html = '';

        lista.forEach(function (o, idx) {
            if (termo && (o.nome || '').toLowerCase().indexOf(termo) === -1) return;
            const isSel = o.id === window.colisaoSelecionadaId;
            const icone = modoCamadaAtivo() ? '🌿' : (o.tipo === 'circle' ? '🔵' : (o.tipo === 'line' ? '✏️' : '⬛'));
            const dims = o.tipo === 'circle'
                ? ('(X: ' + o.cx + ', Y: ' + o.cy + ' · R: ' + o.r + ')')
                : (o.tipo === 'line'
                    ? ('(esp: ' + (o.espessura || 16) + 'px · ' + (o.pontos ? o.pontos.length : 0) + ' pts)')
                    : ('(X: ' + o.x + ', Y: ' + o.y + ' · ' + o.w + 'x' + o.h + ')'));

            html +=
                '<div class="col-list-item ' + (isSel ? 'selected' : '') + '" onclick="window.selecionarColisao(\'' + o.id + '\')">' +
                    '<div class="col-item-info">' +
                        '<div class="col-item-name">' + icone + ' ' + (o.nome || (modoCamadaAtivo() ? ('Camada ' + (idx + 1)) : ('Colisão ' + (idx + 1)))) + '</div>' +
                        '<div class="col-item-dims">' + dims + '</div>' +
                    '</div>' +
                    '<button class="col-item-del-btn" onclick="event.stopPropagation(); window.excluirColisaoPorId(\'' + o.id + '\')" title="Excluir">✕</button>' +
                '</div>';
        });

        if (!html) html = '<div style="font-size:11px;color:#7f8c8d;padding:6px;text-align:center;">Nenhuma ' + (modoCamadaAtivo() ? 'camada' : 'colisão') + ' encontrada.</div>';
        container.innerHTML = html;
    };

    window.filtrarListaColisoes = function (val) {
        window.atualizarListaColisoesUI(val);
    };

    // ============================================================================
    // CRIAÇÃO, DUPLICAÇÃO E EXCLUSÃO
    // ============================================================================
    window.criarColisaoNoPlayer = function () {
        const cfg = obterConfigMapaAtivo();
        const pCenterX = (typeof global.meuX === 'number' ? global.meuX : (cfg.x0 + 100)) + 12;
        const pCenterY = (typeof global.meuY === 'number' ? global.meuY : (cfg.y0 + 100)) + 16;
        const lx = Math.max(0, Math.min(cfg.w - 40, Math.round(pCenterX - cfg.x0 - 20)));
        const ly = Math.max(0, Math.min(cfg.h - 40, Math.round(pCenterY - cfg.y0 - 20)));

        const novo = {
            id: (modoCamadaAtivo() ? 'camada_' : 'col_') + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
            tipo: 'rect',
            nome: modoCamadaAtivo() ? 'Foreground Player' : 'Nova Caixa Player',
            x: lx,
            y: ly,
            w: 40,
            h: 40,
            baseY: ly + 40,
            ordem: 0
        };
        const lista = obterListaEditor();
        lista.push(novo);
        carregarListaEditor(lista);
        window.selecionarColisao(novo.id);
        window.mostrarToast(modoCamadaAtivo() ? 'Camada 40x40 criada na sua posição!' : 'Caixa 40x40 criada na sua posição!');
    };

    window.duplicarColisaoSelecionada = function () {
        const sel = window.obterColisaoSelecionada();
        if (!sel) return;
        const copia = JSON.parse(JSON.stringify(sel));
        copia.id = (modoCamadaAtivo() ? 'camada_' : (copia.tipo === 'line' ? 'line_' : 'col_')) + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
        copia.nome = (copia.nome || (modoCamadaAtivo() ? 'Camada' : 'Colisão')) + ' (Cópia)';
        if (copia.tipo === 'rect') {
            copia.x += 20; copia.y += 20;
        } else if (copia.tipo === 'circle') {
            copia.cx += 20; copia.cy += 20;
        } else if (copia.tipo === 'line' && Array.isArray(copia.pontos)) {
            copia.pontos = copia.pontos.map(function (pt) {
                return { x: pt.x + 20, y: pt.y + 20 };
            });
        }
        const lista = obterListaEditor();
        lista.push(copia);
        carregarListaEditor(lista);
        window.selecionarColisao(copia.id);
        window.mostrarToast('Colisão duplicada com sucesso!');
    };

    window.teleportarParaSelecionada = function () {
        const sel = window.obterColisaoSelecionada();
        if (!sel) return;
        const cfg = obterConfigMapaAtivo();
        let tx = cfg.x0 + (sel.tipo === 'circle' ? sel.cx : (sel.tipo === 'line' ? (sel.pontos && sel.pontos.length ? sel.pontos[0].x : sel.x) : (sel.x + sel.w / 2)));
        let ty = cfg.y0 + (sel.tipo === 'circle' ? sel.cy + sel.r + 25 : (sel.tipo === 'line' ? (sel.pontos && sel.pontos.length ? sel.pontos[0].y + 25 : sel.y + 25) : (sel.y + sel.h + 25)));
        global.meuX = tx;
        global.meuY = ty;
        if (global.ws && global.ws.readyState === WebSocket.OPEN) {
            global.ws.send(JSON.stringify({ x: tx, y: ty, angulo: 0, moving: false }));
        }
        window.mostrarToast('Teleportado para a frente da colisão!');
    };

    window.excluirColisaoSelecionada = function () {
        if (!window.colisaoSelecionadaId) return;
        window.excluirColisaoPorId(window.colisaoSelecionadaId);
    };

    window.excluirColisaoPorId = function (id) {
        const lista = obterListaEditor();
        const nova = lista.filter(function (o) { return o.id !== id; });
        carregarListaEditor(nova);
        if (window.colisaoSelecionadaId === id) window.colisaoSelecionadaId = null;
        window.atualizarPropriedadesUI();
        window.atualizarListaColisoesUI();
        window.mostrarToast(modoCamadaAtivo() ? 'Camada excluída!' : 'Colisão excluída!');
    };

    // ============================================================================
    // SINCRONIZAÇÃO COM O SERVIDOR (WEBSOCKET)
    // ============================================================================
    window.salvarColisoesServidor = function () {
        if (!global.ws || global.ws.readyState !== WebSocket.OPEN) {
            alert('Erro: Conexão com o servidor não está aberta.');
            return;
        }
        const mapa = window.mapaEdicaoAtivo || 'cidade';
        const obstaculos = (window.colisoesPorMapa && window.colisoesPorMapa[mapa]) || (mapa === 'cidade' && global.mapaCidade && global.mapaCidade.obterObstaculos ? global.mapaCidade.obterObstaculos() : []);
        const camadas = (window.camadasPorMapa && window.camadasPorMapa[mapa]) || (mapa === 'cidade' && global.mapaCidade && global.mapaCidade.obterCamadas ? global.mapaCidade.obterCamadas() : []);

        global.ws.send(JSON.stringify({
            action: 'admin_salvar_colisoes',
            mapa: mapa,
            obstaculos: obstaculos,
            camadas: camadas
        }));
        const nomeMapa = (MAPAS_CONFIG[mapa] && MAPAS_CONFIG[mapa].nome) || mapa;
        window.mostrarToast('💾 ' + obstaculos.length + ' colisões e ' + camadas.length + ' camadas salvas em ' + nomeMapa + '!');
    };

    window.mostrarToast = function (msg) {
        const antigo = document.querySelector('.col-toast');
        if (antigo) antigo.remove();
        const toast = document.createElement('div');
        toast.className = 'col-toast';
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(function () { toast.remove(); }, 2600);
    };

    // ============================================================================
    // RENDERIZAÇÃO OVERLAY NO CANVAS DO JOGO
    // ============================================================================
    window.desenharOverlayColisoes = function (ctx) {
        if (!window.editorColisaoVisivel) return;
        const camX = global.camX || 0;
        const camY = global.camY || 0;
        const zoom = (typeof global.ZOOM_CAMERA === 'number' && global.ZOOM_CAMERA > 0) ? global.ZOOM_CAMERA : 0.92;
        const cw = ((global.canvas && global.canvas.width) || 800) / zoom;
        const ch = ((global.canvas && global.canvas.height) || 600) / zoom;

        ctx.save();

        const mapasParaDesenhar = [window.mapaEdicaoAtivo || 'cidade'];
        if (global.currentMap && mapasParaDesenhar.indexOf(global.currentMap) === -1) {
            mapasParaDesenhar.push(global.currentMap);
        }

        mapasParaDesenhar.forEach(function (mapaKey) {
            const cfg = MAPAS_CONFIG[mapaKey];
            if (!cfg) return;
            const x0 = cfg.x0;
            const y0 = cfg.y0;
            const isMapaEdicao = (mapaKey === window.mapaEdicaoAtivo);

            // 1. Desenhar Camadas
            const camadas = (window.camadasPorMapa && window.camadasPorMapa[mapaKey]) || (mapaKey === 'cidade' && global.mapaCidade && global.mapaCidade.obterCamadas ? global.mapaCidade.obterCamadas() : []);
            if (Array.isArray(camadas)) {
                for (let ci = 0; ci < camadas.length; ci++) {
                    const camada = camadas[ci];
                    const wx = x0 + (camada.x || 0);
                    const wy = y0 + (camada.y || 0);
                    const selecionada = isMapaEdicao && (camada.id === window.colisaoSelecionadaId) && modoCamadaAtivo();
                    const margem = camada.tipo === 'line' ? (camada.espessura || 16) : 0;
                    if (wx + (camada.w || 40) + margem < camX || wx - margem > camX + cw || wy + (camada.h || 40) + margem < camY || wy - margem > camY + ch) continue;

                    if (camada.tipo === 'line' && camada.pontos && camada.pontos.length > 1) {
                        ctx.save();
                        ctx.lineCap = 'round';
                        ctx.lineJoin = 'round';
                        ctx.beginPath();
                        ctx.moveTo(x0 + camada.pontos[0].x, y0 + camada.pontos[0].y);
                        for (let cpi = 1; cpi < camada.pontos.length; cpi++) ctx.lineTo(x0 + camada.pontos[cpi].x, y0 + camada.pontos[cpi].y);
                        ctx.lineWidth = camada.espessura || 16;
                        ctx.strokeStyle = selecionada ? 'rgba(46, 204, 113, 0.55)' : 'rgba(26, 188, 156, 0.38)';
                        ctx.stroke();
                        ctx.lineWidth = selecionada ? 3 : 2;
                        ctx.strokeStyle = selecionada ? '#f1c40f' : '#1abc9c';
                        ctx.setLineDash([7, 4]);
                        ctx.stroke();
                        ctx.setLineDash([]);
                        for (let cpi = 0; cpi < camada.pontos.length; cpi++) {
                            ctx.fillStyle = selecionada ? '#f1c40f' : '#a7f3d0';
                            ctx.beginPath();
                            ctx.arc(x0 + camada.pontos[cpi].x, y0 + camada.pontos[cpi].y, 3, 0, Math.PI * 2);
                            ctx.fill();
                        }
                        const pontoRotulo = camada.pontos[Math.floor(camada.pontos.length / 2)];
                        ctx.fillStyle = 'rgba(10, 10, 10, 0.78)';
                        ctx.font = 'bold 10px monospace';
                        const labelLinha = '🌿 ' + (camada.nome || 'Camada Curva') + ' [esp:' + (camada.espessura || 16) + 'px]';
                        const twLinha = ctx.measureText(labelLinha).width;
                        ctx.fillRect(x0 + pontoRotulo.x + 5, y0 + pontoRotulo.y - 18, twLinha + 6, 13);
                        ctx.fillStyle = selecionada ? '#f1c40f' : '#a7f3d0';
                        ctx.fillText(labelLinha, x0 + pontoRotulo.x + 8, y0 + pontoRotulo.y - 8);
                        ctx.restore();
                        continue;
                    }
                    ctx.fillStyle = selecionada ? 'rgba(46, 204, 113, 0.42)' : 'rgba(26, 188, 156, 0.28)';
                    ctx.fillRect(wx, wy, camada.w, camada.h);
                    ctx.strokeStyle = selecionada ? '#f1c40f' : '#1abc9c';
                    ctx.lineWidth = selecionada ? 3 : 2;
                    ctx.setLineDash([7, 4]);
                    ctx.strokeRect(wx, wy, camada.w, camada.h);
                    ctx.setLineDash([]);
                    ctx.fillStyle = 'rgba(10, 10, 10, 0.78)';
                    const label = '🌿 ' + (camada.nome || 'Camada') + ' [' + camada.w + 'x' + camada.h + ']';
                    ctx.font = 'bold 10px monospace';
                    const tw = ctx.measureText(label).width;
                    ctx.fillRect(wx + 2, wy + 2, tw + 6, 13);
                    ctx.fillStyle = selecionada ? '#f1c40f' : '#a7f3d0';
                    ctx.fillText(label, wx + 5, wy + 12);
                    if (selecionada && window.colisaoEditorAtivo) desenharHandlesRetangulo(ctx, wx, wy, camada.w, camada.h);
                }
            }

            // 2. Desenhar Colisões
            const lista = (window.colisoesPorMapa && window.colisoesPorMapa[mapaKey]) || (mapaKey === 'cidade' && global.mapaCidade && global.mapaCidade.obterObstaculos ? global.mapaCidade.obterObstaculos() : []);
            if (Array.isArray(lista)) {
                for (let i = 0; i < lista.length; i++) {
                    const o = lista[i];
                    const isSel = isMapaEdicao && (o.id === window.colisaoSelecionadaId);

                    if (o.tipo === 'rect') {
                        const wx = x0 + (o.x !== undefined ? o.x : (o.x1 !== undefined ? o.x1 : 0));
                        const wy = y0 + (o.y !== undefined ? o.y : (o.y1 !== undefined ? o.y1 : 0));
                        const ow = o.w !== undefined ? o.w : (o.x2 !== undefined ? (o.x2 - o.x1) : 40);
                        const oh = o.h !== undefined ? o.h : (o.y2 !== undefined ? (o.y2 - o.y1) : 40);
                        if (wx + ow < camX || wx > camX + cw || wy + oh < camY || wy > camY + ch) continue;

                        ctx.fillStyle = isSel ? 'rgba(241, 196, 15, 0.38)' : 'rgba(231, 76, 60, 0.28)';
                        ctx.fillRect(wx, wy, ow, oh);
                        ctx.strokeStyle = isSel ? '#f1c40f' : 'rgba(231, 76, 60, 0.9)';
                        ctx.lineWidth = isSel ? 3 : 1.5;
                        ctx.strokeRect(wx, wy, ow, oh);

                        ctx.fillStyle = 'rgba(10, 10, 10, 0.75)';
                        const label = (o.nome || 'Caixa') + ' [' + ow + 'x' + oh + ']';
                        ctx.font = 'bold 10px monospace';
                        const tw = ctx.measureText(label).width;
                        ctx.fillRect(wx + 2, wy + 2, tw + 6, 13);
                        ctx.fillStyle = isSel ? '#f1c40f' : '#ffffff';
                        ctx.fillText(label, wx + 5, wy + 12);

                        if (isSel && window.colisaoEditorAtivo) {
                            desenharHandlesRetangulo(ctx, wx, wy, ow, oh);
                        }
                    } else if (o.tipo === 'circle') {
                        const wcx = x0 + (o.cx !== undefined ? o.cx : (o.x || 0));
                        const wcy = y0 + (o.cy !== undefined ? o.cy : (o.y || 0));
                        const r = o.r || 20;
                        if (wcx + r < camX || wcx - r > camX + cw || wcy + r < camY || wcy - r > camY + ch) continue;

                        ctx.fillStyle = isSel ? 'rgba(241, 196, 15, 0.38)' : 'rgba(155, 89, 182, 0.28)';
                        ctx.beginPath();
                        ctx.arc(wcx, wcy, r, 0, Math.PI * 2);
                        ctx.fill();

                        ctx.strokeStyle = isSel ? '#f1c40f' : 'rgba(155, 89, 182, 0.95)';
                        ctx.lineWidth = isSel ? 3 : 2;
                        ctx.stroke();

                        ctx.fillStyle = 'rgba(10, 10, 10, 0.75)';
                        const label = (o.nome || 'Círculo') + ' [r:' + r + ']';
                        ctx.font = 'bold 10px monospace';
                        const tw = ctx.measureText(label).width;
                        ctx.fillRect(wcx - tw / 2 - 3, wcy - 6, tw + 6, 13);
                        ctx.fillStyle = isSel ? '#f1c40f' : '#ffffff';
                        ctx.textAlign = 'center';
                        ctx.fillText(label, wcx, wcy + 4);
                        ctx.textAlign = 'left';

                        if (isSel && window.colisaoEditorAtivo) {
                            desenharHandlesCirculo(ctx, wcx, wcy, r);
                        }
                    } else if (o.tipo === 'line') {
                        if (!o.pontos || o.pontos.length < 2) continue;
                        const esp = o.espessura || 16;
                        const minWx = x0 + (o.x || 0) - esp;
                        const maxWx = x0 + (o.x || 0) + (o.w || 10) + esp;
                        const minWy = y0 + (o.y || 0) - esp;
                        const maxWy = y0 + (o.y || 0) + (o.h || 10) + esp;
                        if (maxWx < camX || minWx > camX + cw || maxWy < camY || minWy > camY + ch) continue;

                        ctx.save();
                        ctx.lineCap = 'round';
                        ctx.lineJoin = 'round';

                        ctx.beginPath();
                        ctx.moveTo(x0 + o.pontos[0].x, y0 + o.pontos[0].y);
                        for (let pi = 1; pi < o.pontos.length; pi++) {
                            ctx.lineTo(x0 + o.pontos[pi].x, y0 + o.pontos[pi].y);
                        }
                        ctx.lineWidth = esp;
                        ctx.strokeStyle = isSel ? 'rgba(241, 196, 15, 0.45)' : 'rgba(142, 68, 173, 0.35)';
                        ctx.stroke();

                        ctx.lineWidth = 2.5;
                        ctx.strokeStyle = isSel ? '#f1c40f' : '#9b59b6';
                        ctx.stroke();

                        ctx.lineWidth = 1;
                        ctx.strokeStyle = '#ffffff';
                        ctx.setLineDash([4, 4]);
                        ctx.stroke();
                        ctx.setLineDash([]);

                        for (let pi = 0; pi < o.pontos.length; pi++) {
                            const px = x0 + o.pontos[pi].x;
                            const py = y0 + o.pontos[pi].y;
                            ctx.fillStyle = (pi === 0 || pi === o.pontos.length - 1) ? '#e74c3c' : (isSel ? '#2ecc71' : '#f39c12');
                            ctx.beginPath();
                            ctx.arc(px, py, (pi === 0 || pi === o.pontos.length - 1) ? 4.5 : 2.5, 0, Math.PI * 2);
                            ctx.fill();
                        }

                        const midIdx = Math.floor(o.pontos.length / 2);
                        const midPt = o.pontos[midIdx];
                        const label = (o.nome || 'Curva') + ' [esp:' + esp + 'px]';
                        ctx.font = 'bold 10px monospace';
                        const tw = ctx.measureText(label).width;
                        ctx.fillStyle = 'rgba(10, 10, 10, 0.8)';
                        ctx.fillRect(x0 + midPt.x - tw / 2 - 3, midPt.y - 18, tw + 6, 13);
                        ctx.fillStyle = isSel ? '#f1c40f' : '#e0b0ff';
                        ctx.textAlign = 'center';
                        ctx.fillText(label, x0 + midPt.x, midPt.y - 8);
                        ctx.textAlign = 'left';

                        ctx.restore();
                    }
                }
            }
        });

        // Desenha prévia ao vivo enquanto o admin arrasta para criar nova forma
        const cfgAtivo = obterConfigMapaAtivo();
        if (window.dragEstado && window.dragEstado.tipo === 'drawing_new') {
            const de = window.dragEstado;
            const x1 = Math.min(de.startX, de.currX);
            const y1 = Math.min(de.startY, de.currY);
            const w = Math.abs(de.currX - de.startX);
            const h = Math.abs(de.currY - de.startY);

            if (de.shape === 'rect') {
                ctx.fillStyle = 'rgba(46, 204, 113, 0.3)';
                ctx.fillRect(x1, y1, w, h);
                ctx.strokeStyle = '#2ecc71';
                ctx.lineWidth = 2;
                ctx.setLineDash([4, 4]);
                ctx.strokeRect(x1, y1, w, h);
                ctx.setLineDash([]);
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 11px monospace';
                ctx.fillText(w + 'x' + h, x1 + 6, y1 + 16);
            } else if (de.shape === 'circle') {
                const r = Math.round(Math.hypot(de.currX - de.startX, de.currY - de.startY));
                ctx.fillStyle = 'rgba(155, 89, 182, 0.3)';
                ctx.beginPath(); ctx.arc(de.startX, de.startY, r, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = '#9b59b6';
                ctx.lineWidth = 2;
                ctx.setLineDash([4, 4]);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 11px monospace';
                ctx.fillText('R: ' + r, de.startX + 6, de.startY - 6);
            }
        } else if (window.dragEstado && window.dragEstado.tipo === 'drawing_line') {
            const de = window.dragEstado;
            const pts = de.pontos;
            if (pts && pts.length > 0) {
                ctx.save();
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                ctx.beginPath();
                ctx.moveTo(cfgAtivo.x0 + pts[0].x, cfgAtivo.y0 + pts[0].y);
                for (let i = 1; i < pts.length; i++) {
                    ctx.lineTo(cfgAtivo.x0 + pts[i].x, cfgAtivo.y0 + pts[i].y);
                }
                if (de.currLx !== undefined && de.currLy !== undefined) {
                    ctx.lineTo(cfgAtivo.x0 + de.currLx, cfgAtivo.y0 + de.currLy);
                }

                const esp = de.espessura || 16;
                ctx.lineWidth = esp;
                ctx.strokeStyle = 'rgba(155, 89, 182, 0.45)';
                ctx.stroke();

                ctx.lineWidth = 3;
                ctx.strokeStyle = '#e0b0ff';
                ctx.stroke();

                ctx.lineWidth = 1.5;
                ctx.strokeStyle = '#ffffff';
                ctx.setLineDash([3, 3]);
                ctx.stroke();
                ctx.setLineDash([]);

                for (let i = 0; i < pts.length; i++) {
                    ctx.fillStyle = (i === 0) ? '#2ecc71' : '#f1c40f';
                    ctx.beginPath();
                    ctx.arc(cfgAtivo.x0 + pts[i].x, cfgAtivo.y0 + pts[i].y, 3, 0, Math.PI * 2);
                    ctx.fill();
                }

                if (de.currLx !== undefined && de.currLy !== undefined) {
                    ctx.fillStyle = '#f1c40f';
                    ctx.font = 'bold 11px monospace';
                    ctx.fillText('✏️ ' + pts.length + ' pts (esp: ' + esp + 'px)', cfgAtivo.x0 + de.currLx + 12, cfgAtivo.y0 + de.currLy - 10);
                }
                ctx.restore();
            }
        }

        ctx.restore();
    };

    function desenharHandlesRetangulo(ctx, x, y, w, h) {
        const hs = 8;
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#2980b9';
        ctx.lineWidth = 1.5;

        const pontos = [
            [x, y], [x + w / 2, y], [x + w, y],
            [x + w, y + h / 2], [x + w, y + h],
            [x + w / 2, y + h], [x, y + h],
            [x, y + h / 2]
        ];
        pontos.forEach(function (pt) {
            ctx.fillRect(pt[0] - hs / 2, pt[1] - hs / 2, hs, hs);
            ctx.strokeRect(pt[0] - hs / 2, pt[1] - hs / 2, hs, hs);
        });

        // Âncora central
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    function desenharHandlesCirculo(ctx, cx, cy, r) {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#8e44ad';
        ctx.lineWidth = 1.5;
        ctx.fillRect(cx + r - 4, cy - 4, 8, 8);
        ctx.strokeRect(cx + r - 4, cy - 4, 8, 8);
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }

    // ============================================================================
    // CAPTURA DE INTERAÇÕES DE MOUSE E TOQUE NO CANVAS
    // ============================================================================
    function anexarInteracoesCanvas() {
        const cv = global.canvas;
        if (!cv) {
            setTimeout(anexarInteracoesCanvas, 100);
            return;
        }

        cv.addEventListener('mousedown', onPointerDown);
        window.addEventListener('mousemove', onPointerMove);
        window.addEventListener('mouseup', onPointerUp);

        cv.addEventListener('touchstart', onTouchStart, { passive: false });
        window.addEventListener('touchmove', onTouchMove, { passive: false });
        window.addEventListener('touchend', onTouchEnd, { passive: false });

        window.addEventListener('keydown', function (e) {
            if (!window.colisaoEditorAtivo) return;
            const targetTag = e.target && e.target.tagName;
            if (targetTag === 'INPUT' || targetTag === 'SELECT' || targetTag === 'TEXTAREA') return;

            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (window.colisaoSelecionadaId) {
                    window.excluirColisaoSelecionada();
                    e.preventDefault();
                }
            } else if (e.key === 'Escape') {
                window.colisaoSelecionadaId = null;
                window.atualizarPropriedadesUI();
                window.atualizarListaColisoesUI();
            } else if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
                window.salvarColisoesServidor();
                e.preventDefault();
            } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.key) !== -1) {
                const step = e.shiftKey ? 10 : 1;
                if (e.key === 'ArrowUp') window.ajustarPropriedadePasso('y', -step);
                if (e.key === 'ArrowDown') window.ajustarPropriedadePasso('y', +step);
                if (e.key === 'ArrowLeft') window.ajustarPropriedadePasso('x', -step);
                if (e.key === 'ArrowRight') window.ajustarPropriedadePasso('x', +step);
                e.preventDefault();
            }
        });
    }

    function onPointerDown(e) {
        if (!window.colisaoEditorAtivo) return;
        const pos = telaParaLocalCidade(e.clientX, e.clientY);
        iniciarInteracao(pos.lx, pos.ly, pos.wx, pos.wy, e);
    }

    function onTouchStart(e) {
        if (!window.colisaoEditorAtivo) return;
        if (e.touches.length !== 1) return;
        const t = e.touches[0];
        const pos = telaParaLocalCidade(t.clientX, t.clientY);
        if (iniciarInteracao(pos.lx, pos.ly, pos.wx, pos.wy, e)) {
            e.preventDefault();
        }
    }

    function iniciarInteracao(lx, ly, wx, wy, e) {
        const modo = window.modoFerramenta;

        if (modo === 'add_line') {
            const inputEsp = document.getElementById('prop-espessura');
            const espPadrao = inputEsp ? (parseInt(inputEsp.value) || 16) : 16;
            window.dragEstado = {
                tipo: 'drawing_line',
                espessura: espPadrao,
                pontos: [{ x: Math.round(lx), y: Math.round(ly) }],
                currLx: Math.round(lx),
                currLy: Math.round(ly)
            };
            return true;
        }

        if (modo === 'add_rect' || modo === 'add_circle') {
            window.dragEstado = {
                tipo: 'drawing_new',
                shape: modo === 'add_rect' ? 'rect' : 'circle',
                startLx: lx, startLy: ly,
                startX: wx, startY: wy,
                currX: wx, currY: wy,
                currLx: lx, currLy: ly
            };
            return true;
        }

        const sel = window.obterColisaoSelecionada();
        if (sel) {
            const handle = testarHandles(sel, lx, ly);
            if (handle) {
                window.dragEstado = {
                    tipo: 'handle',
                    handle: handle,
                    targetId: sel.id,
                    startLx: lx, startLy: ly,
                    orig: JSON.parse(JSON.stringify(sel))
                };
                return true;
            }
        }

        const sobMouse = testarObstaculoNoPonto(lx, ly);
        if (sobMouse) {
            window.selecionarColisao(sobMouse.id);
            window.dragEstado = {
                tipo: 'move',
                targetId: sobMouse.id,
                startLx: lx, startLy: ly,
                orig: JSON.parse(JSON.stringify(sobMouse))
            };
            return true;
        } else {
            if (window.colisaoSelecionadaId) {
                window.selecionarColisao(null);
            }
        }
        return false;
    }

    function onPointerMove(e) {
        if (!window.colisaoEditorAtivo) return;
        const pos = telaParaLocalCidade(e.clientX, e.clientY);
        moverInteracao(pos.lx, pos.ly, pos.wx, pos.wy);
    }

    function onTouchMove(e) {
        if (!window.colisaoEditorAtivo || !window.dragEstado) return;
        if (e.touches.length !== 1) return;
        const t = e.touches[0];
        const pos = telaParaLocalCidade(t.clientX, t.clientY);
        moverInteracao(pos.lx, pos.ly, pos.wx, pos.wy);
        e.preventDefault();
    }

    function moverInteracao(lx, ly, wx, wy) {
        if (!window.dragEstado) {
            const sel = window.obterColisaoSelecionada();
            if (sel && global.canvas) {
                const handle = testarHandles(sel, lx, ly);
                if (handle === 'tl' || handle === 'br') global.canvas.style.cursor = 'nwse-resize';
                else if (handle === 'tr' || handle === 'bl') global.canvas.style.cursor = 'nesw-resize';
                else if (handle === 't' || handle === 'b') global.canvas.style.cursor = 'ns-resize';
                else if (handle === 'l' || handle === 'r' || handle === 'radius') global.canvas.style.cursor = 'ew-resize';
                else if (handle === 'center') global.canvas.style.cursor = 'move';
                else global.canvas.style.cursor = 'default';
            }
            return;
        }

        const de = window.dragEstado;

        if (de.tipo === 'drawing_line') {
            de.currLx = Math.round(lx);
            de.currLy = Math.round(ly);
            const pts = de.pontos;
            const last = pts[pts.length - 1];
            const dist = Math.hypot(lx - last.x, ly - last.y);
            // Captura pontos a cada 12px de distância percorrida
            if (dist >= 12) {
                pts.push({ x: Math.round(lx), y: Math.round(ly) });
            }
            return;
        }

        if (de.tipo === 'drawing_new') {
            de.currX = wx; de.currY = wy;
            de.currLx = lx; de.currLy = ly;
            return;
        }

        const lista = obterListaEditor();
        const item = lista.find(function (o) { return o.id === de.targetId; });
        if (!item) return;

        const dLx = lx - de.startLx;
        const dLy = ly - de.startLy;

        if (de.tipo === 'move') {
            if (item.tipo === 'rect') {
                item.x = Math.round(de.orig.x + dLx);
                item.y = Math.round(de.orig.y + dLy);
            } else if (item.tipo === 'circle') {
                item.cx = Math.round(de.orig.cx + dLx);
                item.cy = Math.round(de.orig.cy + dLy);
            } else if (item.tipo === 'line' && Array.isArray(de.orig.pontos)) {
                item.pontos = de.orig.pontos.map(function (pt) {
                    return { x: Math.round(pt.x + dLx), y: Math.round(pt.y + dLy) };
                });
                let minX = item.pontos[0].x, maxX = item.pontos[0].x, minY = item.pontos[0].y, maxY = item.pontos[0].y;
                for (let pi = 1; pi < item.pontos.length; pi++) {
                    if (item.pontos[pi].x < minX) minX = item.pontos[pi].x;
                    if (item.pontos[pi].x > maxX) maxX = item.pontos[pi].x;
                    if (item.pontos[pi].y < minY) minY = item.pontos[pi].y;
                    if (item.pontos[pi].y > maxY) maxY = item.pontos[pi].y;
                }
                item.x = minX; item.y = minY; item.w = Math.max(1, maxX - minX); item.h = Math.max(1, maxY - minY);
            }
        } else if (de.tipo === 'handle') {
            if (item.tipo === 'rect') {
                const orig = de.orig;
                if (de.handle === 'center') {
                    item.x = Math.round(orig.x + dLx);
                    item.y = Math.round(orig.y + dLy);
                } else {
                    if (de.handle.indexOf('l') !== -1) {
                        const newX = Math.round(orig.x + dLx);
                        const newW = Math.round(orig.w - dLx);
                        if (newW >= 8) { item.x = newX; item.w = newW; }
                    }
                    if (de.handle.indexOf('r') !== -1) {
                        item.w = Math.max(8, Math.round(orig.w + dLx));
                    }
                    if (de.handle.indexOf('t') !== -1) {
                        const newY = Math.round(orig.y + dLy);
                        const newH = Math.round(orig.h - dLy);
                        if (newH >= 8) { item.y = newY; item.h = newH; }
                    }
                    if (de.handle.indexOf('b') !== -1) {
                        item.h = Math.max(8, Math.round(orig.h + dLy));
                    }
                }
            } else if (item.tipo === 'circle') {
                if (de.handle === 'center') {
                    item.cx = Math.round(de.orig.cx + dLx);
                    item.cy = Math.round(de.orig.cy + dLy);
                } else if (de.handle === 'radius') {
                    item.r = Math.max(6, Math.round(de.orig.r + dLx));
                }
            }
        }

        if (modoCamadaAtivo() && item.tipo === 'rect') item.baseY = Math.round(item.y + item.h);
        if (modoCamadaAtivo() && item.tipo === 'line' && Array.isArray(item.pontos)) {
            item.baseY = Math.max.apply(null, item.pontos.map(function (pt) { return pt.y; }));
        }

        carregarListaEditor(lista);
        window.atualizarPropriedadesUI();
    }

    function onPointerUp(e) {
        finalizarInteracao();
    }

    function onTouchEnd(e) {
        finalizarInteracao();
    }

    function finalizarInteracao() {
        if (!window.dragEstado) return;
        const de = window.dragEstado;
        window.dragEstado = null;
        if (global.canvas) global.canvas.style.cursor = 'default';

        if (de.tipo === 'drawing_line') {
            const pts = de.pontos;
            if (de.currLx !== undefined && de.currLy !== undefined) {
                const last = pts[pts.length - 1];
                if (Math.hypot(de.currLx - last.x, de.currLy - last.y) >= 4) {
                    pts.push({ x: Math.round(de.currLx), y: Math.round(de.currLy) });
                }
            }
            if (pts.length >= 2) {
                const novo = {
                    id: (modoCamadaAtivo() ? 'camada_line_' : 'line_') + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
                    tipo: 'line',
                    nome: modoCamadaAtivo() ? 'Foreground Curvo ' + (obterListaEditor().length + 1) : 'Linha Curva ' + (obterListaEditor().length + 1),
                    espessura: de.espessura || 16,
                    pontos: pts,
                    baseY: Math.max.apply(null, pts.map(function (pt) { return pt.y; })),
                    ordem: 0
                };
                const lista = obterListaEditor();
                lista.push(novo);
                carregarListaEditor(lista);
                window.selecionarColisao(novo.id);
                window.setModoFerramenta('select');
                window.mostrarToast((modoCamadaAtivo() ? '🌿 Camada curva criada com ' : '✏️ Linha curva criada com ') + pts.length + ' pontos!');
            } else {
                window.mostrarToast('Linha muito curta. Clique e arraste para desenhar.');
            }
            window.atualizarListaColisoesUI();
            return;
        }

        if (de.tipo === 'drawing_new') {
            const x1 = Math.min(de.startLx, de.currLx);
            const y1 = Math.min(de.startLy, de.currLy);
            const w = Math.abs(de.currLx - de.startLx);
            const h = Math.abs(de.currLy - de.startLy);

            if (de.shape === 'rect' && w >= 10 && h >= 10) {
                const novo = {
                    id: (modoCamadaAtivo() ? 'camada_' : 'col_') + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
                    tipo: 'rect',
                    nome: modoCamadaAtivo() ? 'Foreground ' + (obterListaEditor().length + 1) : 'Caixa ' + (obterListaEditor().length + 1),
                    x: Math.round(x1),
                    y: Math.round(y1),
                    w: Math.round(w),
                    h: Math.round(h),
                    baseY: Math.round(y1 + h),
                    ordem: 0
                };
                const lista = obterListaEditor();
                lista.push(novo);
                carregarListaEditor(lista);
                window.selecionarColisao(novo.id);
                window.setModoFerramenta('select');
                window.mostrarToast(modoCamadaAtivo() ? 'Camada foreground criada!' : 'Retângulo criado com sucesso!');
            } else if (de.shape === 'circle') {
                const r = Math.round(Math.hypot(de.currLx - de.startLx, de.currLy - de.startLy));
                if (r >= 10) {
                    const novo = {
                        id: 'col_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
                        tipo: 'circle',
                        nome: 'Círculo ' + (obterListaEditor().length + 1),
                        cx: Math.round(de.startLx),
                        cy: Math.round(de.startLy),
                        r: Math.round(r)
                    };
                    const lista = obterListaEditor();
                    lista.push(novo);
                    carregarListaEditor(lista);
                    window.selecionarColisao(novo.id);
                    window.setModoFerramenta('select');
                    window.mostrarToast('Círculo criado com sucesso!');
                }
            }
        }
        window.atualizarListaColisoesUI();
    }

    // ============================================================================
    // SINCRONIZAÇÃO E INTEGRAÇÃO DE COLISÕES E CAMADAS CLIENTE (v1.46.0)
    // ============================================================================
    window.receberColisoesServidor = function (mapa, obstaculos, camadas) {
        if (!mapa) return;
        window.colisoesPorMapa = window.colisoesPorMapa || {};
        window.camadasPorMapa = window.camadasPorMapa || {};
        if (Array.isArray(obstaculos)) window.colisoesPorMapa[mapa] = obstaculos;
        if (Array.isArray(camadas)) window.camadasPorMapa[mapa] = camadas;
        if (window.colisaoEditorAtivo && window.mapaEdicaoAtivo === mapa) {
            window.atualizarListaColisoesUI();
            window.atualizarPropriedadesUI();
        }
    };

    window.carregarColisoesIniciais = function (colisoes, camadas) {
        window.colisoesPorMapa = colisoes || {};
        window.camadasPorMapa = camadas || {};
        if (window.colisaoEditorAtivo) {
            window.atualizarListaColisoesUI();
            window.atualizarPropriedadesUI();
        }
    };

    window.colideObstaculosCustomizadosCliente = function (mapa, cx, cy, raio) {
        const lista = window.colisoesPorMapa && window.colisoesPorMapa[mapa];
        if (!Array.isArray(lista) || lista.length === 0) return false;
        const cfg = MAPAS_CONFIG[mapa];
        if (!cfg) return false;

        const r = (typeof raio === 'number') ? raio : 12;
        const lx = cx - cfg.x0;
        const ly = cy - cfg.y0;

        for (let i = 0; i < lista.length; i++) {
            const o = lista[i];
            if (!o) continue;

            const ox = (o.cx !== undefined) ? o.cx : ((o.x !== undefined) ? (o.x + (o.w ? o.w / 2 : 0)) : 0);
            const oy = (o.cy !== undefined) ? o.cy : ((o.y !== undefined) ? (o.y + (o.h ? o.h / 2 : 0)) : 0);
            if (Math.abs(lx - ox) > 160 || Math.abs(ly - oy) > 160) continue;

            if (o.tipo === 'rect' || o.tipo === 'caixa' || o.tipo === 'box') {
                const x1 = o.x !== undefined ? o.x : (o.x1 !== undefined ? o.x1 : 0);
                const y1 = o.y !== undefined ? o.y : (o.y1 !== undefined ? o.y1 : 0);
                const x2 = o.w !== undefined ? (x1 + o.w) : (o.x2 !== undefined ? o.x2 : x1 + 40);
                const y2 = o.h !== undefined ? (y1 + o.h) : (o.y2 !== undefined ? o.y2 : y1 + 40);
                if (lx + r >= x1 && lx - r <= x2 && ly + r >= y1 && ly - r <= y2) return true;
            } else if (o.tipo === 'circle' || o.tipo === 'circulo') {
                const dx = lx - (o.cx !== undefined ? o.cx : (o.x || 0));
                const dy = ly - (o.cy !== undefined ? o.cy : (o.y || 0));
                const rTotal = (o.r || 20) + r;
                if ((dx * dx + dy * dy) <= rTotal * rTotal) return true;
            } else if (o.tipo === 'line') {
                if (o.pontos && o.pontos.length >= 2) {
                    const esp = (o.espessura ? o.espessura / 2 : 8) + r;
                    const minBoxX = (o.x !== undefined ? o.x : 0) - esp;
                    const maxBoxX = (o.x !== undefined && o.w !== undefined ? o.x + o.w : 100000) + esp;
                    const minBoxY = (o.y !== undefined ? o.y : 0) - esp;
                    const maxBoxY = (o.y !== undefined && o.h !== undefined ? o.y + o.h : 100000) + esp;

                    if (lx >= minBoxX && lx <= maxBoxX && ly >= minBoxY && ly <= maxBoxY) {
                        for (let j = 0; j < o.pontos.length - 1; j++) {
                            const p1 = o.pontos[j];
                            const p2 = o.pontos[j + 1];
                            const minSegX = Math.min(p1.x, p2.x) - esp;
                            const maxSegX = Math.max(p1.x, p2.x) + esp;
                            const minSegY = Math.min(p1.y, p2.y) - esp;
                            const maxSegY = Math.max(p1.y, p2.y) + esp;
                            if (lx >= minSegX && lx <= maxSegX && ly >= minSegY && ly <= maxSegY) {
                                if (distPontoSegmento(lx, ly, p1.x, p1.y, p2.x, p2.y) <= esp) return true;
                            }
                        }
                    }
                }
            }
        }
        return false;
    };

    // Coleta camadas para Z-sorting nos mapas (exceto cidade que já possui coletarCidadeSortables)
    window.coletarCamadasMapaAtivo = function (t, arr) {
        if (!Array.isArray(arr)) return;
        const mapa = window.currentMap;
        if (!mapa || mapa === 'cidade') return;
        const camadas = window.camadasPorMapa && window.camadasPorMapa[mapa];
        if (!Array.isArray(camadas) || camadas.length === 0) return;
        const cfg = MAPAS_CONFIG[mapa];
        if (!cfg) return;

        const camX = global.camX || 0;
        const camY = global.camY || 0;
        const zoom = (typeof global.ZOOM_CAMERA === 'number' && global.ZOOM_CAMERA > 0) ? global.ZOOM_CAMERA : 0.92;
        const cw = ((global.canvas && global.canvas.width) || 800) / zoom;
        const ch = ((global.canvas && global.canvas.height) || 600) / zoom;

        for (let i = 0; i < camadas.length; i++) {
            const c = camadas[i];
            const wx = cfg.x0 + (c.x || 0);
            const wy = cfg.y0 + (c.y || 0);
            const margem = c.tipo === 'line' ? (c.espessura || 16) : 0;
            if (wx + (c.w || 40) + margem < camX || wx - margem > camX + cw || wy + (c.h || 40) + margem < camY || wy - margem > camY + ch) continue;

            const baseY = cfg.y0 + (c.baseY || (c.y + (c.h || 40))) + (c.ordem || 0) * 0.001;
            arr.push({
                y: baseY,
                draw: function () {
                    // Reserva para expansão futura de recorte com base em sprites de bioma
                }
            });
        }
    };

    // Encadeia colisão no colideMapaAtivo global do cliente
    function encadearColisaoCliente() {
        const prevColide = global.colideMapaAtivo;
        global.colideMapaAtivo = function (x, y, raio) {
            const mapa = global.currentMap || window.mapaEdicaoAtivo || 'cidade';
            if (mapa === 'castelo' && (global.mapaCastelo || window.mapaCastelo)) {
                const mc = global.mapaCastelo || window.mapaCastelo;
                if (typeof mc.colideCastelo === 'function' && mc.colideCastelo(x, y)) return true;
            }
            if (mapa === 'zonazero' && global.mapaZonaZero && typeof global.mapaZonaZero.colideZonaZero === 'function') {
                if (global.mapaZonaZero.colideZonaZero(x, y, raio)) return true;
            }
            if (mapa === 'pantano' && global.mapaPantano && typeof global.mapaPantano.colidePantano === 'function') {
                if (global.mapaPantano.colidePantano(x, y, raio)) return true;
            }
            if (window.colideObstaculosCustomizadosCliente && window.colideObstaculosCustomizadosCliente(mapa, x, y, raio)) {
                return true;
            }
            if (prevColide && prevColide(x, y, raio)) return true;
            return false;
        };
    }
    encadearColisaoCliente();

    // Inicialização ao carregar a página
    if (typeof window !== 'undefined') {
        window.addEventListener('DOMContentLoaded', function () {
            montarEditorUI();
            anexarInteracoesCanvas();
        });
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            montarEditorUI();
            anexarInteracoesCanvas();
        }
    }
})(typeof window !== 'undefined' ? window : this);
