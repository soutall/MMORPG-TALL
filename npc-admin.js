(function (global) {
    'use strict';

    var state = {
        aberto: false,
        npcs: [],
        animacoes: [],
        selecionadoId: null,
        rotaProgramadaId: '',
        modo: 'selecionar',
        desenhando: false,
        percursoTemporario: [],
        arrastando: false,
        deslocamentoArrasteX: 0,
        deslocamentoArrasteY: 0,
        previewAnimacaoId: '',
        previewSpriteDir: 'ferreiro',
        previewLoop: true,
        previewStartedAt: 0,
        previewFrame: 0,
        cursorAnterior: ''
    };

    function elemento(id) {
        return document.getElementById(id);
    }

    function enviar(dados) {
        if (!global.ws || global.ws.readyState !== WebSocket.OPEN) {
            definirStatus('Servidor desconectado; não foi possível enviar a alteração.', true);
            return false;
        }
        global.ws.send(JSON.stringify(dados));
        return true;
    }

    function definirStatus(texto, erro) {
        var status = elemento('npc-admin-status');
        if (!status) return;
        status.textContent = texto;
        status.style.color = erro ? '#ff8585' : '#a7f3d0';
    }

    function selecionado() {
        return state.npcs.find(function (npc) { return npc.id === state.selecionadoId; }) || null;
    }

    function metadadosAnimacao(id, spriteDir) {
        return state.animacoes.find(function (item) {
            return item.id === id && item.spriteDir === (spriteDir || 'ferreiro');
        });
    }

    function salvarConfigNpc(npc, config, mensagem) {
        if (enviar({ action: 'npc_admin_update', npcId: npc.id, config: config })) {
            definirStatus(mensagem, false);
        }
    }

    function rotaProgramadaSelecionada(npc) {
        return (npc && npc.rotasProgramadas || []).find(function (rota) {
            return rota.id === state.rotaProgramadaId;
        }) || null;
    }

    function salvarRotasProgramadas(npc, rotas, mensagem) {
        salvarConfigNpc(npc, { rotasProgramadas: rotas }, mensagem);
    }

    function iniciarArraste(event) {
        if (event.button !== 0 || (event.target.closest && event.target.closest('button'))) return;
        var painel = elemento('npc-admin-window');
        var limites = painel.getBoundingClientRect();
        state.arrastando = true;
        state.deslocamentoArrasteX = event.clientX - limites.left;
        state.deslocamentoArrasteY = event.clientY - limites.top;
        elemento('npc-admin-drag-handle').classList.add('arrastando');
        event.preventDefault();
    }

    function moverPainelArrastado(event) {
        if (!state.arrastando) return;
        var painel = elemento('npc-admin-window');
        var left = event.clientX - state.deslocamentoArrasteX;
        var top = event.clientY - state.deslocamentoArrasteY;
        left = Math.max(0, Math.min(global.innerWidth - painel.offsetWidth, left));
        top = Math.max(0, Math.min(global.innerHeight - 48, top));
        painel.style.left = left + 'px';
        painel.style.top = top + 'px';
    }

    function finalizarArraste() {
        if (!state.arrastando) return;
        state.arrastando = false;
        elemento('npc-admin-drag-handle').classList.remove('arrastando');
    }

    function preencherOpcoesAnimacao(select, incluirNenhuma) {
        select.textContent = '';
        if (incluirNenhuma) {
            var none = document.createElement('option');
            none.value = '';
            none.textContent = 'Nenhuma';
            select.appendChild(none);
        }
        var npc = selecionado();
        state.animacoes.filter(function (item) {
            return item.spriteDir === (npc && npc.spriteDir || 'ferreiro');
        }).forEach(function (item) {
            var option = document.createElement('option');
            option.value = item.id;
            option.textContent = item.nome + ' (' + item.quadros + ' quadros)';
            select.appendChild(option);
        });
    }

    function atualizarPreviaAnimacao(select) {
        if (!select || !select.value) return;
        state.previewAnimacaoId = select.value;
        var npc = selecionado();
        state.previewSpriteDir = npc && npc.spriteDir || 'ferreiro';
        state.previewLoop = select.id !== 'npc-admin-sequence-animation' ||
            elemento('npc-admin-sequence-loop').value !== 'false';
        state.previewStartedAt = performance.now();
        var info = metadadosAnimacao(state.previewAnimacaoId, state.previewSpriteDir);
        var label = elemento('npc-admin-preview-label');
        if (label) label.textContent = info ? info.nome + ' — ' + info.quadros + ' quadros' : state.previewAnimacaoId;
    }

    function desenharPreviaAnimacao() {
        if (!state.aberto) {
            state.previewFrame = 0;
            return;
        }
        var canvas = elemento('npc-admin-preview-canvas');
        var renderer = global.LokiNpcRenderer;
        if (canvas && renderer && state.previewAnimacaoId) {
            var ctx = canvas.getContext('2d');
            var info = metadadosAnimacao(state.previewAnimacaoId, state.previewSpriteDir);
            var elapsed = performance.now() - state.previewStartedAt;
            var fps = Number(elemento('npc-admin-frame-speed').value) || 10;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            renderer.desenharPrevia(ctx, state.previewAnimacaoId, info ? info.quadros : 1,
                elapsed, state.previewLoop, fps, state.previewSpriteDir);
        }
        state.previewFrame = global.requestAnimationFrame(desenharPreviaAnimacao);
    }

    function criarPainel() {
        if (elemento('npc-admin-window')) return;
        var style = document.createElement('style');
        style.id = 'npc-admin-style';
        style.textContent = [
            '#npc-admin-window{position:fixed;z-index:100100;left:18px;top:80px;width:min(760px,96vw);max-height:88vh;overflow:auto;box-sizing:border-box;padding:16px;background:linear-gradient(180deg,#17232b,#0b1116);border:2px solid #54e6ff;border-radius:12px;color:#e8f8ff;box-shadow:0 12px 40px #000c;font:14px Segoe UI,Arial,sans-serif;user-select:text}',
            '#npc-admin-window[hidden]{display:none!important}',
            '.npc-admin-layout{display:grid;grid-template-columns:1fr 1fr;gap:12px}',
            '.npc-admin-card{min-width:0;padding:12px;border:1px solid #354e59;border-radius:9px;background:#111a20}',
            '.npc-admin-card-wide{grid-column:1/-1}',
            '.npc-admin-card h3{margin:0 0 8px;color:#54e6ff;font-size:15px}',
            '.npc-admin-head{display:flex;align-items:center;justify-content:space-between;margin:-4px -4px 12px;padding:4px;touch-action:none;cursor:grab;font-weight:900;font-size:18px;color:#54e6ff}',
            '.npc-admin-head.arrastando{cursor:grabbing}',
            '.npc-admin-close{border:0;background:transparent;color:#fff;font-size:22px;cursor:pointer}',
            '.npc-admin-row{display:flex;flex-direction:column;gap:5px;margin:10px 0}',
            '.npc-admin-row label{font-weight:700;color:#c8d9e2}',
            '.npc-admin-row select,.npc-admin-row input{box-sizing:border-box;width:100%;min-height:38px;padding:7px 9px;border:1px solid #45606d;border-radius:6px;background:#101a20;color:#fff}',
            '.npc-admin-preview{display:flex;align-items:center;gap:14px;margin:10px 0;padding:10px;border:1px solid #354e59;border-radius:8px;background:#101a20}',
            '#npc-admin-preview-canvas{width:144px;height:112px;flex:none;image-rendering:pixelated;border:1px solid #45606d;border-radius:5px;background-color:#16242b;background-image:linear-gradient(45deg,#1e3038 25%,transparent 25%),linear-gradient(-45deg,#1e3038 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#1e3038 75%),linear-gradient(-45deg,transparent 75%,#1e3038 75%);background-size:16px 16px;background-position:0 0,0 8px,8px -8px,-8px 0}',
            '#npc-admin-preview-label{font-size:12px;color:#aebfc7;line-height:1.45;overflow-wrap:anywhere}',
            '.npc-admin-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:10px}',
            '.npc-admin-actions button,.npc-admin-footer button{min-height:38px;padding:7px 9px;border:1px solid #42616d;border-radius:6px;background:#172b35;color:#e8f8ff;font-weight:700;cursor:pointer}',
            '.npc-admin-actions button.ativo{border-color:#54e6ff;background:#124151;color:#fff}',
            '.npc-admin-sequence{display:flex;flex-direction:column;gap:5px;margin:7px 0}',
            '.npc-admin-sequence-item{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 9px;border:1px solid #354e59;border-radius:6px;background:#101a20;font-size:12px}',
            '.npc-admin-sequence-item button{border:0;background:transparent;color:#ff9a9a;font-size:18px;cursor:pointer}',
            '.npc-admin-inline{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
            '.npc-admin-list{display:flex;flex-direction:column;gap:6px;margin-top:8px}',
            '.npc-admin-list-item{display:grid;grid-template-columns:1fr auto;align-items:center;gap:8px;padding:7px 9px;border:1px solid #354e59;border-radius:6px;background:#101a20;font-size:12px}',
            '.npc-admin-list-item button{border:0;background:transparent;color:#ff9a9a;cursor:pointer}',
            '.npc-admin-footer{display:flex;justify-content:flex-end;margin-top:12px}',
            '#npc-admin-status{min-height:20px;margin-top:10px;color:#a7f3d0;font-size:12px}',
            '#npc-admin-hint,.npc-admin-hint{color:#aebfc7;font-size:12px;line-height:1.4}',
            '@media(max-width:760px){#npc-admin-window{left:8px;top:64px;width:calc(100vw - 16px);max-height:82vh;padding:13px}.npc-admin-layout{grid-template-columns:1fr}.npc-admin-card-wide{grid-column:auto}.npc-admin-actions button{min-height:42px}.npc-admin-preview{gap:9px}#npc-admin-preview-canvas{width:112px;height:96px}}'
        ].join('');
        document.head.appendChild(style);

        var painel = document.createElement('section');
        painel.id = 'npc-admin-window';
        painel.hidden = true;
        painel.setAttribute('data-ui', 'true');
        painel.innerHTML = [
            '<div class="npc-admin-head" id="npc-admin-drag-handle" title="Arraste para mover esta janela"><span>NPCs do mapa — arraste aqui para mover</span><button class="npc-admin-close" type="button" aria-label="Fechar">×</button></div>',
            '<div class="npc-admin-layout">',
            '<section class="npc-admin-card"><h3>NPC e aparência</h3>',
            '<div class="npc-admin-row"><label for="npc-admin-select">NPC</label><select id="npc-admin-select"></select></div>',
            '<div class="npc-admin-row"><label for="npc-admin-animation">Animação em repouso</label><select id="npc-admin-animation"></select></div>',
            '<div class="npc-admin-row"><label for="npc-admin-conversation-animation">Animação ao conversar (vazio = Idle)</label><select id="npc-admin-conversation-animation"></select></div>',
            '<div class="npc-admin-row"><label for="npc-admin-frame-speed">Velocidade dos quadros (FPS)</label><input id="npc-admin-frame-speed" type="number" min="1" max="30" step="1" value="10"></div>',
            '<div class="npc-admin-preview"><canvas id="npc-admin-preview-canvas" width="288" height="224"></canvas><div id="npc-admin-preview-label">Selecione qualquer animação para ver a prévia.</div></div>',
            '</section>',
            '<section class="npc-admin-card"><h3>Movimento e animações</h3>',
            '<div id="npc-admin-hint">As alterações são salvas automaticamente no servidor.</div>',
            '<div class="npc-admin-actions"><button type="button" data-mode="selecionar">Selecionar no mapa</button><button type="button" data-mode="mover">Mover posição</button><button type="button" data-mode="percurso">Desenhar percurso</button><button type="button" id="npc-admin-clear-route">Apagar percurso</button></div>',
            '<div class="npc-admin-row"><label for="npc-admin-speed">Velocidade do percurso (unidades/s)</label><input id="npc-admin-speed" type="number" min="20" max="250" step="5" value="90"></div>',
            '<div class="npc-admin-row"><label for="npc-admin-sequence-animation">Animação para as paradas</label><select id="npc-admin-sequence-animation"></select></div>',
            '<div class="npc-admin-inline"><div class="npc-admin-row"><label for="npc-admin-sequence-duration">Duração (segundos)</label><input id="npc-admin-sequence-duration" type="number" min="0.5" max="30" step="0.5" value="2"></div>',
            '<div class="npc-admin-row"><label for="npc-admin-sequence-loop">Repetir em loop?</label><select id="npc-admin-sequence-loop"><option value="true">Sim</option><option value="false">Não, tocar uma vez</option></select></div></div>',
            '<div class="npc-admin-footer"><button id="npc-admin-add-sequence" type="button">Adicionar etapa</button></div><div id="npc-admin-sequence" class="npc-admin-sequence"></div>',
            '<div class="npc-admin-hint">A sequência é distribuída pelas paradas do percurso.</div>',
            '</section>',
            '<section class="npc-admin-card npc-admin-card-wide"><h3>Agenda diária de percursos</h3>',
            '<div class="npc-admin-inline"><div class="npc-admin-row"><label for="npc-admin-route-name">Nome do percurso</label><input id="npc-admin-route-name" maxlength="48" value="Rotina"></div>',
            '<div class="npc-admin-row"><label>Percurso selecionado</label><select id="npc-admin-route-select"></select></div></div>',
            '<div class="npc-admin-inline"><div class="npc-admin-row"><label for="npc-admin-route-start">Início</label><input id="npc-admin-route-start" type="time" value="13:00"></div>',
            '<div class="npc-admin-row"><label for="npc-admin-route-end">Fim</label><input id="npc-admin-route-end" type="time" value="15:00"></div></div>',
            '<div class="npc-admin-actions"><button id="npc-admin-route-add" type="button">Adicionar faixa de percurso</button><button id="npc-admin-route-save-time" type="button">Salvar horários</button><button id="npc-admin-route-delete" type="button">Excluir percurso</button></div>',
            '<div id="npc-admin-route-list" class="npc-admin-list"></div>',
            '</section>',
            '<section class="npc-admin-card npc-admin-card-wide"><h3>Horários em que o NPC dorme</h3>',
            '<div class="npc-admin-inline"><div class="npc-admin-row"><label for="npc-admin-off-name">Nome</label><input id="npc-admin-off-name" maxlength="48" value="Dormindo"></div>',
            '<div class="npc-admin-row"><label>Horário local do servidor</label><div class="npc-admin-inline"><input id="npc-admin-off-start" type="time" value="22:00" aria-label="Início do horário desativado"><input id="npc-admin-off-end" type="time" value="08:00" aria-label="Fim do horário desativado"></div></div></div>',
            '<button id="npc-admin-off-add" type="button">Adicionar horário desativado</button><div id="npc-admin-off-list" class="npc-admin-list"></div>',
            '</section></div>',
            '<div id="npc-admin-status" role="status">Carregando NPCs…</div>',
            '<div class="npc-admin-footer"><button id="npc-admin-close" type="button">Fechar</button></div>'
        ].join('');
        document.body.appendChild(painel);

        painel.querySelector('.npc-admin-close').addEventListener('click', fechar);
        elemento('npc-admin-close').addEventListener('click', fechar);
        elemento('npc-admin-drag-handle').addEventListener('pointerdown', iniciarArraste);
        global.addEventListener('pointermove', moverPainelArrastado);
        global.addEventListener('pointerup', finalizarArraste);
        global.addEventListener('pointercancel', finalizarArraste);
        elemento('npc-admin-select').addEventListener('change', function () {
            state.selecionadoId = this.value;
            state.rotaProgramadaId = '';
            state.percursoTemporario = [];
            renderizar();
            atualizarPreviaAnimacao(elemento('npc-admin-animation'));
        });
        elemento('npc-admin-animation').addEventListener('change', function () {
            atualizarPreviaAnimacao(this);
            var npc = selecionado();
            if (!npc || !npc.editavel || !this.value) return;
            enviar({ action: 'npc_admin_update', npcId: npc.id, config: { animacao: this.value } });
            definirStatus('Salvando animação…', false);
        });
        elemento('npc-admin-animation').addEventListener('focus', function () { atualizarPreviaAnimacao(this); });
        elemento('npc-admin-conversation-animation').addEventListener('change', function () {
            atualizarPreviaAnimacao(this);
            var npc = selecionado();
            if (!npc || !npc.editavel) return;
            salvarConfigNpc(npc, { animacaoConversa: this.value }, 'Salvando animação de conversa…');
        });
        elemento('npc-admin-conversation-animation').addEventListener('focus', function () { atualizarPreviaAnimacao(this); });
        elemento('npc-admin-sequence-animation').addEventListener('change', function () { atualizarPreviaAnimacao(this); });
        elemento('npc-admin-sequence-animation').addEventListener('focus', function () { atualizarPreviaAnimacao(this); });
        elemento('npc-admin-sequence-loop').addEventListener('change', function () {
            atualizarPreviaAnimacao(elemento('npc-admin-sequence-animation'));
        });
        elemento('npc-admin-frame-speed').addEventListener('change', function () {
            var npc = selecionado();
            var speed = Number(this.value);
            if (!npc || !npc.editavel || !Number.isInteger(speed) || speed < 1 || speed > 30) {
                definirStatus('A velocidade dos quadros deve ficar entre 1 e 30 FPS.', true);
                renderizar();
                return;
            }
            salvarConfigNpc(npc, { velocidadeFrames: speed }, 'Salvando velocidade dos quadros…');
            atualizarPreviaAnimacao(elemento('npc-admin-sequence-animation'));
        });
        elemento('npc-admin-speed').addEventListener('change', function () {
            var npc = selecionado();
            var speed = Number(this.value);
            if (!npc || !npc.editavel || !Number.isFinite(speed) || speed < 20 || speed > 250) {
                definirStatus('A velocidade precisa ficar entre 20 e 250.', true);
                renderizar();
                return;
            }
            var rota = rotaProgramadaSelecionada(npc);
            if (rota) {
                salvarRotasProgramadas(npc, npc.rotasProgramadas.map(function (item) {
                    return item.id === rota.id
                        ? Object.assign({}, item, { velocidadePatrulha: speed })
                        : item;
                }), 'Salvando velocidade do percurso…');
                return;
            }
            enviar({ action: 'npc_admin_update', npcId: npc.id, config: { velocidadePatrulha: speed } });
            definirStatus('Salvando velocidade…', false);
        });
        elemento('npc-admin-route-add').addEventListener('click', function () {
            var npc = selecionado();
            var nome = elemento('npc-admin-route-name').value.trim();
            var inicio = elemento('npc-admin-route-start').value;
            var fim = elemento('npc-admin-route-end').value;
            var rotas = npc && Array.isArray(npc.rotasProgramadas) ? npc.rotasProgramadas.slice() : [];
            if (!npc || !npc.editavel || !nome || !inicio || !fim || rotas.length >= 16) {
                definirStatus('Informe nome e horários válidos. Limite: 16 percursos agendados.', true);
                return;
            }
            var rota = {
                id: 'agenda_' + Date.now().toString(36),
                nome: nome,
                inicio: inicio,
                fim: fim,
                patrulha: [],
                velocidadePatrulha: Number(elemento('npc-admin-speed').value) || 90
            };
            rotas.push(rota);
            state.rotaProgramadaId = rota.id;
            salvarRotasProgramadas(npc, rotas, 'Salvando faixa de percurso…');
        });
        elemento('npc-admin-route-select').addEventListener('change', function () {
            state.rotaProgramadaId = this.value;
            var rota = rotaProgramadaSelecionada(selecionado());
            if (rota) {
                elemento('npc-admin-route-name').value = rota.nome;
                elemento('npc-admin-route-start').value = rota.inicio;
                elemento('npc-admin-route-end').value = rota.fim;
                elemento('npc-admin-speed').value = String(rota.velocidadePatrulha);
            }
            renderizarRotas();
        });
        elemento('npc-admin-route-save-time').addEventListener('click', function () {
            var npc = selecionado();
            var rota = rotaProgramadaSelecionada(npc);
            if (!npc || !rota) {
                definirStatus('Adicione e selecione uma faixa de percurso primeiro.', true);
                return;
            }
            var rotas = npc.rotasProgramadas.map(function (item) {
                return item.id === rota.id ? Object.assign({}, item, {
                    nome: elemento('npc-admin-route-name').value.trim(),
                    inicio: elemento('npc-admin-route-start').value,
                    fim: elemento('npc-admin-route-end').value
                }) : item;
            });
            salvarRotasProgramadas(npc, rotas, 'Salvando horários do percurso…');
        });
        elemento('npc-admin-route-delete').addEventListener('click', function () {
            var npc = selecionado();
            if (!npc || !state.rotaProgramadaId) return;
            salvarRotasProgramadas(npc, npc.rotasProgramadas.filter(function (item) {
                return item.id !== state.rotaProgramadaId;
            }), 'Excluindo percurso…');
            state.rotaProgramadaId = '';
        });
        elemento('npc-admin-off-add').addEventListener('click', function () {
            var npc = selecionado();
            var intervalos = npc && Array.isArray(npc.intervalosDesativados) ? npc.intervalosDesativados.slice() : [];
            var nome = elemento('npc-admin-off-name').value.trim();
            var inicio = elemento('npc-admin-off-start').value;
            var fim = elemento('npc-admin-off-end').value;
            if (!npc || !npc.editavel || !nome || !inicio || !fim || intervalos.length >= 16) {
                definirStatus('Informe nome e horários válidos. Limite: 16 horários desativados.', true);
                return;
            }
            intervalos.push({
                id: 'dormir_' + Date.now().toString(36),
                nome: nome,
                inicio: inicio,
                fim: fim
            });
            salvarConfigNpc(npc, { intervalosDesativados: intervalos }, 'Salvando horário desativado…');
        });
        elemento('npc-admin-off-list').addEventListener('click', function (event) {
            var button = event.target.closest('[data-off-remove]');
            var npc = selecionado();
            if (!button || !npc || !npc.editavel) return;
            var intervalos = npc.intervalosDesativados.filter(function (item) {
                return item.id !== button.dataset.offRemove;
            });
            salvarConfigNpc(npc, { intervalosDesativados: intervalos }, 'Removendo horário desativado…');
        });
        elemento('npc-admin-add-sequence').addEventListener('click', function () {
            var npc = selecionado();
            var animationId = elemento('npc-admin-sequence-animation').value;
            var durationMs = Math.round(Number(elemento('npc-admin-sequence-duration').value) * 1000);
            var loop = elemento('npc-admin-sequence-loop').value === 'true';
            if (!npc || !npc.editavel || !animationId || !Number.isFinite(durationMs) || durationMs < 500 || durationMs > 30000) {
                definirStatus('Escolha uma animação e uma duração entre 0,5 e 30 segundos.', true);
                return;
            }
            var sequence = (npc.sequenciaAnimacoes || []).slice();
            if (sequence.length >= 16) {
                definirStatus('A sequência pode ter no máximo 16 etapas.', true);
                return;
            }
            sequence.push({ animacao: animationId, duracaoMs: durationMs, loop: loop });
            salvarConfigNpc(npc, { sequenciaAnimacoes: sequence }, 'Salvando sequência…');
        });
        elemento('npc-admin-sequence').addEventListener('click', function (event) {
            var button = event.target.closest('[data-sequence-remove]');
            var npc = selecionado();
            if (!button || !npc || !npc.editavel) return;
            var sequence = (npc.sequenciaAnimacoes || []).slice();
            sequence.splice(Number(button.dataset.sequenceRemove), 1);
            salvarConfigNpc(npc, { sequenciaAnimacoes: sequence }, 'Atualizando sequência…');
        });
        painel.querySelectorAll('[data-mode]').forEach(function (button) {
            button.addEventListener('click', function () {
                state.modo = button.dataset.mode;
                state.percursoTemporario = [];
                atualizarModo();
            });
        });
        elemento('npc-admin-clear-route').addEventListener('click', function () {
            var npc = selecionado();
            if (!npc || !npc.editavel) return;
            var rota = rotaProgramadaSelecionada(npc);
            if (rota) {
                salvarRotasProgramadas(npc, npc.rotasProgramadas.map(function (item) {
                    return item.id === rota.id ? Object.assign({}, item, { patrulha: [] }) : item;
                }), 'Apagando percurso agendado…');
            } else {
                salvarConfigNpc(npc, { patrulha: [] }, 'Apagando percurso padrão…');
            }
        });
    }

    function atualizarModo() {
        var painel = elemento('npc-admin-window');
        if (!painel) return;
        painel.querySelectorAll('[data-mode]').forEach(function (button) {
            button.classList.toggle('ativo', button.dataset.mode === state.modo);
        });
        var canvas = global.canvas;
        if (canvas) {
            if (state.aberto && state.modo !== 'selecionar') {
                state.cursorAnterior = state.cursorAnterior || canvas.style.cursor;
                canvas.style.cursor = 'crosshair';
            } else {
                canvas.style.cursor = state.cursorAnterior;
                state.cursorAnterior = '';
            }
        }
        var hint = elemento('npc-admin-hint');
        if (hint) {
            hint.textContent = state.modo === 'mover'
                ? 'Clique no NPC para selecioná-lo e depois clique no novo local.'
                : state.modo === 'percurso'
                    ? 'Selecione uma faixa diária para desenhar o percurso dela; sem faixa, edita o percurso padrão.'
                    : 'Clique no NPC no mapa para selecioná-lo. Posição e animação são salvas automaticamente.';
        }
    }

    function renderizarRotas() {
        var npc = selecionado();
        var select = elemento('npc-admin-route-select');
        var list = elemento('npc-admin-route-list');
        var offList = elemento('npc-admin-off-list');
        if (!select || !list || !offList) return;
        var rotas = npc && Array.isArray(npc.rotasProgramadas) ? npc.rotasProgramadas : [];
        select.textContent = '';
        rotas.forEach(function (rota) {
            var option = document.createElement('option');
            option.value = rota.id;
            option.textContent = rota.nome + ' (' + rota.inicio + '–' + rota.fim + ')';
            select.appendChild(option);
        });
        if (!rotas.some(function (rota) { return rota.id === state.rotaProgramadaId; })) {
            state.rotaProgramadaId = rotas.length ? rotas[0].id : '';
        }
        select.value = state.rotaProgramadaId;
        var selectedRoute = rotaProgramadaSelecionada(npc);
        select.disabled = !npc || !npc.editavel || rotas.length === 0;
        ['npc-admin-route-save-time', 'npc-admin-route-delete'].forEach(function (id) {
            elemento(id).disabled = !selectedRoute;
        });
        ['npc-admin-route-add', 'npc-admin-off-add'].forEach(function (id) {
            elemento(id).disabled = !npc || !npc.editavel;
        });
        list.textContent = '';
        rotas.forEach(function (rota) {
            var row = document.createElement('div');
            row.className = 'npc-admin-list-item';
            row.textContent = rota.nome + ' — ' + rota.inicio + ' até ' + rota.fim +
                ' — ' + (rota.patrulha || []).length + ' pontos' +
                (rota.patrulha && rota.patrulha.length >= 2 ? '' : ' (falta desenhar)');
            list.appendChild(row);
        });
        var intervalos = npc && Array.isArray(npc.intervalosDesativados) ? npc.intervalosDesativados : [];
        offList.textContent = '';
        intervalos.forEach(function (intervalo) {
            var row = document.createElement('div');
            row.className = 'npc-admin-list-item';
            var label = document.createElement('span');
            label.textContent = intervalo.nome + ' — ' + intervalo.inicio + ' até ' + intervalo.fim + ' (NPC oculto e sem interação)';
            var remove = document.createElement('button');
            remove.type = 'button';
            remove.dataset.offRemove = intervalo.id;
            remove.textContent = 'Remover';
            row.appendChild(label);
            row.appendChild(remove);
            offList.appendChild(row);
        });
        var route = rotaProgramadaSelecionada(npc);
        if (route) {
            elemento('npc-admin-route-name').value = route.nome;
            elemento('npc-admin-route-start').value = route.inicio;
            elemento('npc-admin-route-end').value = route.fim;
            elemento('npc-admin-speed').value = String(route.velocidadePatrulha);
        }
    }

    function renderizar() {
        var lista = elemento('npc-admin-select');
        var animation = elemento('npc-admin-animation');
        var conversationAnimation = elemento('npc-admin-conversation-animation');
        var sequenceAnimation = elemento('npc-admin-sequence-animation');
        var speed = elemento('npc-admin-speed');
        var sequenceDuration = elemento('npc-admin-sequence-duration');
        var sequenceList = elemento('npc-admin-sequence');
        var frameSpeed = elemento('npc-admin-frame-speed');
        if (!lista || !animation || !conversationAnimation || !sequenceAnimation || !speed || !sequenceDuration || !sequenceList || !frameSpeed) return;
        lista.textContent = '';
        state.npcs.forEach(function (npc) {
            var option = document.createElement('option');
            option.value = npc.id;
            option.textContent = npc.nome + (npc.editavel ? ' — ' + npc.mapa : ' — visual não configurado');
            lista.appendChild(option);
        });
        if (!state.npcs.some(function (npc) { return npc.id === state.selecionadoId; })) {
            var npcInicial = state.npcs.find(function (item) { return item.editavel; }) || state.npcs[0];
            state.selecionadoId = npcInicial ? npcInicial.id : null;
        }
        lista.value = state.selecionadoId || '';

        var npc = selecionado();
        preencherOpcoesAnimacao(animation, false);
        preencherOpcoesAnimacao(conversationAnimation, true);
        preencherOpcoesAnimacao(sequenceAnimation, false);
        animation.value = npc ? npc.animacao : '';
        animation.disabled = !npc || !npc.editavel;
        conversationAnimation.value = npc ? (npc.animacaoConversa || '') : '';
        conversationAnimation.disabled = !npc || !npc.editavel;
        frameSpeed.value = npc ? String(npc.velocidadeFrames || 10) : '10';
        frameSpeed.disabled = !npc || !npc.editavel;
        sequenceAnimation.disabled = !npc || !npc.editavel;
        sequenceDuration.disabled = !npc || !npc.editavel;
        elemento('npc-admin-sequence-loop').disabled = !npc || !npc.editavel;
        speed.value = npc ? String(npc.velocidadePatrulha || 90) : '90';
        speed.disabled = !npc || !npc.editavel;
        sequenceList.textContent = '';
        var sequence = npc && Array.isArray(npc.sequenciaAnimacoes) ? npc.sequenciaAnimacoes : [];
        sequence.forEach(function (step, index) {
            var row = document.createElement('div');
            row.className = 'npc-admin-sequence-item';
            var label = document.createElement('span');
            var animationInfo = metadadosAnimacao(step.animacao, npc && npc.spriteDir);
            label.textContent = (index + 1) + '. ' + (animationInfo ? animationInfo.nome : step.animacao) +
                ' — ' + (Number(step.duracaoMs) / 1000).toFixed(1) + ' s — ' +
                (step.loop === false ? 'sem loop' : 'loop');
            var remove = document.createElement('button');
            remove.type = 'button';
            remove.dataset.sequenceRemove = String(index);
            remove.textContent = '×';
            remove.setAttribute('aria-label', 'Remover etapa ' + (index + 1));
            row.appendChild(label);
            row.appendChild(remove);
            sequenceList.appendChild(row);
        });
        elemento('npc-admin-add-sequence').disabled = !npc || !npc.editavel || sequence.length >= 16;
        var clearButton = elemento('npc-admin-clear-route');
        if (clearButton) clearButton.disabled = !npc || !npc.editavel;
        renderizarRotas();
        atualizarModo();
    }

    function abrir() {
        if (!global.ehAdmin) return;
        criarPainel();
        state.aberto = true;
        elemento('npc-admin-window').hidden = false;
        state.modo = 'selecionar';
        renderizar();
        atualizarPreviaAnimacao(elemento('npc-admin-sequence-animation'));
        desenharPreviaAnimacao();
        definirStatus('Carregando NPCs…', false);
        enviar({ action: 'npc_admin_get' });
        atualizarModo();
    }

    function fechar() {
        state.aberto = false;
        state.desenhando = false;
        state.arrastando = false;
        state.percursoTemporario = [];
        if (state.previewFrame) global.cancelAnimationFrame(state.previewFrame);
        state.previewFrame = 0;
        var painel = elemento('npc-admin-window');
        if (painel) painel.hidden = true;
        atualizarModo();
    }

    function handleMessage(message) {
        if (!message) return;
        if (message.type === 'npc_admin_state' || message.type === 'npc_admin_saved') {
            if (message.ok === false) {
                definirStatus(message.erro || 'Não foi possível salvar as alterações.', true);
                return;
            }
            if (Array.isArray(message.npcs)) state.npcs = message.npcs;
            if (Array.isArray(message.animacoes)) state.animacoes = message.animacoes;
            renderizar();
            if (message.animacoes && message.animacoes.length &&
                !metadadosAnimacao(state.previewAnimacaoId, selecionado() && selecionado().spriteDir)) {
                atualizarPreviaAnimacao(elemento('npc-admin-sequence-animation'));
            }
            if (message.type === 'npc_admin_saved') definirStatus('NPC salvo no servidor.', false);
            return;
        }
        if (message.type === 'npc_state' && Array.isArray(message.npcs)) {
            global.npcsInterativos = message.npcs;
            if (typeof global.atualizarInteracaoNPC === 'function') global.atualizarInteracaoNPC();
        }
    }

    function posicaoMundo(event) {
        var canvas = global.canvas;
        if (!canvas) return null;
        var rect = canvas.getBoundingClientRect();
        var zoom = global.cameraZoomAtual || global.ZOOM_CAMERA || 1;
        var tilt = global.CAMERA_25D ? (global.CAMERA_TILT_Y || 0.88) : 1;
        return {
            x: (event.clientX - rect.left) * canvas.width / rect.width / zoom + (global.camX || 0),
            y: (event.clientY - rect.top) * canvas.height / rect.height / (zoom * tilt) + (global.camY || 0)
        };
    }

    function npcSobPonteiro(posicao) {
        var lista = global.npcsInterativos || [];
        var maisProximo = null;
        var menor = 48;
        lista.forEach(function (npc) {
            var distancia = Math.hypot(posicao.x - npc.x, posicao.y - (npc.y - 26));
            if (distancia <= menor) {
                maisProximo = npc;
                menor = distancia;
            }
        });
        return maisProximo;
    }

    function selecionarNpc(npc) {
        state.selecionadoId = npc.id;
        var dados = state.npcs.find(function (item) { return item.id === npc.id; });
        if (dados) {
            dados.x = npc.x;
            dados.y = npc.y;
        }
        renderizar();
        definirStatus('Selecionado: ' + (npc.nome || npc.id) + '.', false);
    }

    function consumirEvento(event) {
        event.preventDefault();
        event.stopPropagation();
        if (event.stopImmediatePropagation) event.stopImmediatePropagation();
    }

    function adicionarPonto(posicao) {
        var last = state.percursoTemporario[state.percursoTemporario.length - 1];
        if (!last || Math.hypot(posicao.x - last.x, posicao.y - last.y) >= 10) {
            if (state.percursoTemporario.length < 250) {
                state.percursoTemporario.push({ x: Math.round(posicao.x), y: Math.round(posicao.y) });
            }
        }
    }

    function aoPressionarCanvas(event) {
        if (!state.aberto || !global.ehAdmin || event.button !== 0 || global.currentMap !== 'mundo') return;
        var pos = posicaoMundo(event);
        if (!pos) return;
        var alvo = npcSobPonteiro(pos);
        if (alvo) {
            consumirEvento(event);
            selecionarNpc(alvo);
            return;
        }
        if (state.modo === 'selecionar') return;
        var npc = selecionado();
        if (!npc || !npc.editavel) {
            definirStatus('Selecione um NPC com visual configurado primeiro.', true);
            consumirEvento(event);
            return;
        }
        consumirEvento(event);
        if (state.modo === 'mover') {
            enviar({
                action: 'npc_admin_update',
                npcId: npc.id,
                config: { x: Math.round(pos.x), y: Math.round(pos.y), patrulha: [] }
            });
            definirStatus('Salvando posição…', false);
            return;
        }
        if (state.modo === 'percurso') {
            if (npc.rotasProgramadas && npc.rotasProgramadas.length && !rotaProgramadaSelecionada(npc)) {
                definirStatus('Selecione uma faixa diária antes de desenhar o percurso.', true);
                return;
            }
            state.desenhando = true;
            state.percursoTemporario = [];
            adicionarPonto(pos);
            if (event.pointerId !== undefined && event.target.setPointerCapture) {
                event.target.setPointerCapture(event.pointerId);
            }
        }
    }

    function aoMoverPonteiro(event) {
        if (!state.aberto || !state.desenhando) return;
        var pos = posicaoMundo(event);
        if (pos) adicionarPonto(pos);
    }

    function aoSoltarPonteiro(event) {
        if (!state.aberto || !state.desenhando) return;
        state.desenhando = false;
        var npc = selecionado();
        if (npc && state.percursoTemporario.length >= 2) {
            var rota = rotaProgramadaSelecionada(npc);
            if (rota) {
                salvarRotasProgramadas(npc, npc.rotasProgramadas.map(function (item) {
                    return item.id === rota.id ? Object.assign({}, item, {
                        patrulha: state.percursoTemporario,
                        velocidadePatrulha: Number(elemento('npc-admin-speed').value) || 90
                    }) : item;
                }), 'Salvando percurso agendado…');
            } else {
                salvarConfigNpc(npc, {
                    patrulha: state.percursoTemporario,
                    velocidadePatrulha: Number(elemento('npc-admin-speed').value) || 90
                }, 'Salvando percurso padrão…');
            }
        } else {
            definirStatus('Desenhe um percurso com pelo menos dois pontos.', true);
        }
    }

    function consumirCliqueCanvas(event) {
        if (!state.aberto || !global.ehAdmin || global.currentMap !== 'mundo') return;
        if (state.modo !== 'selecionar' || npcSobPonteiro(posicaoMundo(event))) consumirEvento(event);
    }

    function desenharOverlay(ctx) {
        if (!state.aberto || !global.ehAdmin || global.currentMap !== 'mundo' || !ctx) return;
        var lista = global.npcsInterativos || [];
        for (var i = 0; i < lista.length; i++) {
            var npc = lista[i];
            if (!npc) continue;
            var selected = npc.id === state.selecionadoId;
            var paths = (npc.rotasProgramadas || []).map(function (route) {
                return { points: route.patrulha, route: route };
            });
            if (Array.isArray(npc.patrulha) && npc.patrulha.length >= 2) {
                paths.unshift({ points: npc.patrulha, route: null });
            }
            paths.forEach(function (entry, pathIndex) {
                var points = entry.points;
                if (!Array.isArray(points) || points.length < 2) return;
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(points[0].x, points[0].y);
                for (var j = 1; j < points.length; j++) ctx.lineTo(points[j].x, points[j].y);
                ctx.closePath();
                ctx.setLineDash([12, 8]);
                ctx.lineWidth = selected && (!entry.route || entry.route.id === state.rotaProgramadaId) ? 4 : 2;
                ctx.strokeStyle = entry.route
                    ? (entry.route.id === state.rotaProgramadaId ? 'rgba(84,230,255,.95)' : 'rgba(255,211,87,.55)')
                    : 'rgba(255,211,87,.35)';
                ctx.stroke();
                ctx.setLineDash([]);
                if (selected && entry.route) {
                    ctx.fillStyle = '#f7df8a';
                    ctx.font = 'bold 16px Arial';
                    ctx.fillText(entry.route.nome + ' ' + entry.route.inicio + '–' + entry.route.fim, points[0].x, points[0].y - 10);
                }
                ctx.restore();
            });
        }
        if (state.percursoTemporario.length > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(state.percursoTemporario[0].x, state.percursoTemporario[0].y);
            for (var k = 1; k < state.percursoTemporario.length; k++) {
                ctx.lineTo(state.percursoTemporario[k].x, state.percursoTemporario[k].y);
            }
            ctx.lineWidth = 4;
            ctx.strokeStyle = '#54e6ff';
            ctx.stroke();
            ctx.restore();
        }
    }

    function iniciar() {
        if (!global.canvas) {
            global.setTimeout(iniciar, 100);
            return;
        }
        global.canvas.addEventListener('pointerdown', aoPressionarCanvas, true);
        global.canvas.addEventListener('click', consumirCliqueCanvas, true);
        global.addEventListener('pointermove', aoMoverPonteiro, true);
        global.addEventListener('pointerup', aoSoltarPonteiro, true);
        global.addEventListener('pointercancel', aoSoltarPonteiro, true);
    }

    global.toggleNpcAdmin = function () {
        if (!global.ehAdmin) return;
        if (state.aberto) fechar();
        else abrir();
    };
    global.NpcAdmin = {
        handleMessage: handleMessage,
        drawOverlay: desenharOverlay
    };

    iniciar();
})(window);
