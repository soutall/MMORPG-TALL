/* ============================================================================
   JANELA DO FERREIRO — FORJA DE EQUIPAMENTOS (client-side)
   ----------------------------------------------------------------------------
   • NPC FERREIRO interativo na Cidade de Davahl (ao lado da Forja dos Dragões).
   • Janela de forja: slot (drag & drop + toque), equipamentos atuais,
     mochila, chances, material, resultado esperado, REGRAS.
   • O SERVIDOR decide o resultado ANTES; a animação de 3s é SÓ visual.
   • Efeitos de aura por nível (+10/+15/+20) — leves, sem alocação por frame.
   Integra-se ao index.html via window.desenharFerreiroNpc / tocarFerreiroNpc /
   ferreiroReceberMensagem / desenharAurasEquipamentos.
   ============================================================================ */
(function () {
    'use strict';

    var NPC = { x: 60800, y: 400, r: 52 };

    // Tabela de chances (exibição — o servidor é a autoridade)
    var CHANCES = {
        1: 100, 2: 100, 3: 100, 4: 100, 5: 100,
        6: 80, 7: 75, 8: 60, 9: 50, 10: 30,
        11: 20, 12: 15, 13: 15, 14: 10, 15: 5,
        16: 2, 17: 1, 18: 0.5, 19: 0.4, 20: 0.2
    };

    var PEDRAS = {
        'FADEO':     { nome: '💠 FADEO',     icon: '💠', cor: '#6ec6ff' },
        'MURK':      { nome: '🔮 MURK',      icon: '🔮', cor: '#b46bff' },
        'DIVINE':    { nome: '🌟 DIVINE',    icon: '🌟', cor: '#ffd166' },
        'STONE_GOD': { nome: '🗿 STONE GOD', icon: '🗿', cor: '#ff8c42' }
    };

    var NOMES_STATUS = {
        forca: 'Força', inteligencia: 'Inteligência', agilidade: 'Agilidade',
        destreza: 'Destreza', vida: 'Vida', profanidade: 'Profanidade',
        divindade: 'Divindade', afinidade: 'Afinidade', velocidadeAtaque: 'Vel. de Ataque'
    };

    var ORDEM_SLOTS = ['capacete', 'peitoral', 'arma', 'armaSecundaria', 'colar', 'anel', 'capa', 'bota', 'luva'];

    var slotItem = null;        // item selecionado (referência do cliente)
    var slotOrigem = null;      // 'mochila' | 'slot'
    var operando = false;       // animação de 3s em andamento
    var txnAtual = null;
    var _resultadoPendente = null;
    var _animTimer = null;
    var _animInicio = 0;
    var _checarCidadeTimer = null;
    var _resultadoPendenteTimer = null;

    window.ferreiroAberto = false;

    function el(id) { return document.getElementById(id); }

    function mensagemNoJogo(texto) {
        var info = el('inv-info');
        if (info) info.innerText = texto;
        if (typeof window.floatingTexts === 'object' && window.floatingTexts) {
            window.floatingTexts.push({ x: (window.meuX || 0) + 12, y: (window.meuY || 0) - 30, text: texto, color: '#f1c40f', alpha: 1.0 });
        }
    }

    function gerarTxnId() {
        if (window.crypto && typeof window.crypto.randomUUID === 'function') {
            try { return 'u_' + window.crypto.randomUUID(); } catch (e) { }
        }
        return 'u_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 10);
    }

    function percentChanceText(c) {
        if (c >= 1) return Math.round(c * 100) + '%';
        return (c * 100).toFixed(1).replace(/\.0$/, '') + '%';
    }

    function chanceTexto(nivelAlvo) {
        var c = CHANCES[nivelAlvo];
        if (c === undefined) return '—';
        if (c >= 1) return c + '%';
        return c.toFixed(1).replace(/\.0$/, '') + '%';
    }

    function pedraParaNivel(nivelAlvo) {
        if (nivelAlvo <= 5) return { pedra: 'FADEO', faixa: '1 ~ 5' };
        if (nivelAlvo <= 10) return { pedra: 'MURK', faixa: '6 ~ 10' };
        if (nivelAlvo <= 15) return { pedra: 'DIVINE', faixa: '11 ~ 15' };
        return { pedra: 'STONE_GOD', faixa: '16 ~ 20' };
    }

    function statusPrincipal(item) {
        var st = (item && item.status) || {};
        var keys = Object.keys(st);
        if (!keys.length) return null;
        var melhor = keys[0];
        var melhorV = st[melhor] || 0;
        for (var i = 1; i < keys.length; i++) {
            var v = st[keys[i]] || 0;
            if (v > melhorV) { melhorV = v; melhor = keys[i]; }
        }
        return melhor;
    }

    function contarPedraCliente(pedra) {
        var total = 0;
        var mochila = window.mochila || [];
        for (var i = 0; i < mochila.length; i++) {
            var it = mochila[i];
            if (it && it.tipo === 'pedra' && it.pedra === pedra) total += (it.quantidade || 1);
        }
        return total;
    }

    function localizarItemCliente(id) {
        var mochila = window.mochila || [];
        for (var i = 0; i < mochila.length; i++) {
            if (mochila[i] && String(mochila[i].id) === String(id) && mochila[i].tipo !== 'vazio') return { item: mochila[i], origem: 'mochila' };
        }
        var inv = window.inventario || {};
        for (var j = 0; j < ORDEM_SLOTS.length; j++) {
            var it = inv[ORDEM_SLOTS[j]];
            if (it && String(it.id) === String(id)) return { item: it, origem: 'slot' };
        }
        return null;
    }

    /* ==========================================================================
       ABRIR / FECHAR
       ========================================================================== */

    window.abrirFerreiro = function () {
        if (window.estaMorto) return;
        if (window.ferreiroAberto) return;
        if (typeof window.requerProximidade === 'function' && !window.requerProximidade(NPC.x, NPC.y, 160)) {
            if (typeof window.avisoProximidade === 'function') window.avisoProximidade();
            return;
        }
        window.ferreiroAberto = true;
        var screen = el('ferreiro-screen');
        if (screen) screen.style.display = 'flex';
        slotItem = null;
        slotOrigem = null;
        fecharRegras();
        fecharResultado();
        renderizarTudo();
        iniciarChecagemCidade();
        if (typeof window.fecharConfirmacao === 'function') window.fecharConfirmacao();
    };

    window.fecharFerreiro = function () {
        window.ferreiroAberto = false;
        var screen = el('ferreiro-screen');
        if (screen) screen.style.display = 'none';
        // se estiver animando o upgrade, não cancela: o resultado chega e é MOSTRADO mesmo com a janela fechada
        fecharRegras();
        pararChecagemCidade();
        if (!operando) {
            fecharResultado();
        }
    };

    function iniciarChecagemCidade() {
        pararChecagemCidade();
        _checarCidadeTimer = setInterval(function () {
            if (!window.ferreiroAberto) return;
            if (window.currentMap !== 'cidade') { window.fecharFerreiro(); return; }
            if (typeof window.requerProximidade === 'function' && !window.requerProximidade(NPC.x, NPC.y, 180)) window.fecharFerreiro();
        }, 600);
    }
    function pararChecagemCidade() {
        if (_checarCidadeTimer) { clearInterval(_checarCidadeTimer); _checarCidadeTimer = null; }
    }

    /* ==========================================================================
       SELEÇÃO DE ITEM (toque / drag & drop / equipados)
       ========================================================================== */

    window.ferreiroColocarItem = function (id) {
        if (operando) return;
        var ref = localizarItemCliente(id);
        if (!ref || !ref.item) { mensagemNoJogo('Item não encontrado.'); return; }
        var item = ref.item;
        if (item.tipo !== 'equipamento') { mensagemNoJogo('⚠️ Apenas EQUIPAMENTOS entram na forja.'); return; }
        if (item.locked) { mensagemNoJogo('🔒 Item bloqueado — desbloqueie no inventário.'); return; }
        slotItem = item;
        slotOrigem = ref.origem;
        // feedback visual
        var btn = el('btn-ferreiro-upgrade');
        if (btn) btn.disabled = false;
        renderizarTudo();
    };

    window.ferreiroColocarEquipado = function (slot) {
        if (operando) return;
        var inv = window.inventario || {};
        var item = inv[slot];
        if (!item || item.tipo !== 'equipamento') { mensagemNoJogo('Esse slot está vazio.'); return; }
        if (item.locked) { mensagemNoJogo('🔒 Item bloqueado — desbloqueie no inventário.'); return; }
        slotItem = item;
        slotOrigem = 'slot';
        renderizarTudo();
    };

    /* ==========================================================================
       RENDERIZAÇÃO
       ========================================================================== */

    function renderizarTudo() {
        renderizarSlot();
        renderizarInfo();
        renderizarListas();
    }

    function renderizarSlot() {
        var slot = el('ferreiro-slot');
        if (!slot) return;
        if (slotItem && slotItem.tipo === 'equipamento') {
            var ic = el('ferreiro-slot-ico');
            var lb = el('ferreiro-slot-label');
            if (ic) ic.textContent = slotItem.icon || '🎒';
            if (lb) lb.textContent = (slotItem.nome || 'EQUIPAMENTO').substring(0, 26);
            slot.classList.add('ocupado');
            removerAuras(slot);
            aplicarAura(slot, slotItem.upgrade || 0);
            garantirBadge(slot, slotItem);
            slot.style.borderColor = slotItem.cor || '#f1c40f';
        } else {
            var ic2 = el('ferreiro-slot-ico');
            var lb2 = el('ferreiro-slot-label');
            if (ic2) ic2.textContent = '⚒️';
            if (lb2) lb2.textContent = 'SLOT DO EQUIPAMENTO';
            slot.classList.remove('ocupado');
            removerAuras(slot);
            removerBadge(slot);
            slot.style.borderColor = '';
        }
    }

    function renderizarInfo() {
        var info = el('ferreiro-info');
        var btn = el('btn-ferreiro-upgrade');
        if (!info) return;
        if (!slotItem || slotItem.tipo !== 'equipamento') {
            info.innerHTML = '<div class="fi-nome">⚒️ FORJA DE EQUIPAMENTOS</div>' +
                '<div class="fi-status">Toque em um equipamento (equipado ou na mochila) ou arraste-o para o slot acima.</div>' +
                '<div class="fi-linha fi-aviso">O servidor decide o resultado — a animação é apenas visual.</div>';
            if (btn) btn.disabled = true;
            return;
        }
        var item = slotItem;
        var nivel = Math.max(0, item.upgrade || 0);
        var alvo = nivel + 1;
        var pedraInfo = pedraParaNivel(alvo);
        var pedraDef = PEDRAS[pedraInfo.pedra];
        var chance = CHANCES[alvo];
        var qtdPedra = contarPedraCliente(pedraInfo.pedra);
        var temMaterial = qtdPedra >= 1;

        var principal = statusPrincipal(item);
        var ganhoPrincipal = 1 + Math.floor((alvo - 1) / 5);

        var linhasStatus = [];
        if (item.status) for (var k2 in item.status) {
            if (item.status[k2] !== undefined && item.status[k2] !== null) linhasStatus.push((NOMES_STATUS[k2] || k2) + ' +' + item.status[k2]);
        }

        var extrasTexto = '';
        if (nivel >= 5 && item.upgradeExtras && item.upgradeExtras.length) {
            extrasTexto = '<div class="fi-status">✨ Extras: ' + item.upgradeExtras.map(function (e) {
                return (NOMES_STATUS[e.chave] || e.chave) + ' +' + e.valor;
            }).join(' · ') + '</div>';
        }

        var previsao = 'Próximo nível: <b>+' + alvo + '</b>';
        if (alvo === 5 || alvo === 10 || alvo === 15) previsao += ' — ganha 1 ATRIBUTO ALEATÓRIO';
        if (alvo === 20) previsao += ' — REFORÇO +10% em todos os status';

        info.innerHTML =
            '<div class="fi-nome" style="color:' + (item.cor || '#e8e4da') + '">' + (item.icon || '🎒') + ' ' + (item.nome || 'EQUIPAMENTO') + ' <b>+' + nivel + '</b></div>' +
            '<div class="fi-raridade" style="color:' + (item.cor || '#e8e4da') + '">' + (item.raridadeNome || '') + (item.locked ? ' 🔒' : '') + '</div>' +
            '<div class="fi-status">' + linhasStatus.join(' · ') + '</div>' +
            extrasTexto +
            '<div class="fi-linha">🎯 Chance: <span class="fi-chance">' + chanceTexto(alvo) + '</span></div>' +
            '<div class="fi-linha">💎 Material: <span class="' + (temMaterial ? 'fi-material' : 'fi-indisponivel') + '">' + (pedraDef ? pedraDef.nome : pedraInfo.pedra) + ' ×1</span> — você tem <b>' + qtdPedra + '</b></div>' +
            (temMaterial ? '' : '<div class="fi-linha fi-indisponivel">⚠️ MATERIAL INSUFICIENTE — colete ' + (pedraDef ? pedraDef.nome : pedraInfo.pedra) + ' primeiro.</div>') +
            '<div class="fi-linha">📈 ' + previsao + '</div>' +
            (principal ? '<div class="fi-linha">🔑 Status principal: ' + (NOMES_STATUS[principal] || principal) + ' (ganha +' + ganhoPrincipal + ' no sucesso)</div>' : '');

        if (btn) btn.disabled = !temMaterial;
    }

    function renderizarListas() {
        renderizarListaEquipados();
        renderizarListaMochila();
    }

    function renderizarListaEquipados() {
        var container = el('ferreiro-lista-equipados');
        if (!container) return;
        container.innerHTML = '';
        var inv = window.inventario || {};
        var tem = false;
        for (var i = 0; i < ORDEM_SLOTS.length; i++) {
            var ch = ORDEM_SLOTS[i];
            var item = inv[ch];
            if (!item || item.tipo !== 'equipamento') continue;
            tem = true;
            var nivel = Math.max(0, item.upgrade || 0);
            var card = document.createElement('div');
            card.className = 'ferreiro-card' + (item.locked ? ' locked' : '');
            card.style.borderColor = item.cor || '#5a5344';
            var stLinha = [];
            if (item.status) for (var k in item.status) {
                stLinha.push((NOMES_STATUS[k] || k) + ' +' + item.status[k]);
            }
            card.innerHTML = '<span class="fc-ico">' + (item.icon || '🎒') + '</span>' +
                '<span class="fc-info"><span class="fc-nome">' + (item.nome || '') + '</span>' +
                '<span class="fc-status">' + stLinha.slice(0, 3).join(' · ') + '</span></span>' +
                '<span class="fc-nivel">+' + nivel + '</span>';
            card.addEventListener('click', function (chave) {
                return function () {
                    if (operando) return;
                    var it = (window.inventario || {})[chave];
                    if (!it) return;
                    if (it.locked) { mensagemNoJogo('🔒 Item bloqueado — desbloqueie no inventário.'); return; }
                    slotItem = it; slotOrigem = 'slot'; renderizarTudo();
                };
            }(ch));
            container.appendChild(card);
        }
        if (!tem) {
            container.innerHTML = '<div class="ferreiro-lista-titulo">Nenhum equipamento equipado.</div>';
        }
    }

    function renderizarListaMochila() {
        var container = el('ferreiro-lista-mochila');
        if (!container) return;
        container.innerHTML = '';
        var mochila = window.mochila || [];
        var tem = false;
        for (var i = 0; i < mochila.length; i++) {
            var item = mochila[i];
            if (!item || item.tipo !== 'equipamento' || item.tipo === 'vazio') continue;
            tem = true;
            var nivel = Math.max(0, item.upgrade || 0);
            var tile = document.createElement('div');
            tile.className = 'ferreiro-tile';
            tile.style.borderColor = item.cor || '#4a5f70';
            tile.title = (item.nome || '') + ' +' + nivel + (item.locked ? ' 🔒' : '');
            tile.innerHTML = '<span class="slot-ico">' + (item.icon || '🎒') + '</span>';
            aplicarAura(tile, nivel);
            garantirBadge(tile, item);
            if (item.locked) {
                var lock = document.createElement('span');
                lock.className = 'lock-ico';
                lock.textContent = '🔒';
                tile.appendChild(lock);
            }
            tile.addEventListener('click', (function (id) {
                return function () {
                    if (operando) return;
                    var ref = localizarItemCliente(id);
                    if (!ref || !ref.item) return;
                    if (ref.item.locked) { mensagemNoJogo('🔒 Item bloqueado — desbloqueie no inventário.'); return; }
                    slotItem = ref.item; slotOrigem = 'mochila'; renderizarTudo();
                };
            })(item.id));
            container.appendChild(tile);
        }
        if (!tem) {
            container.innerHTML = '<div class="ferreiro-lista-titulo">Nenhum equipamento na mochila.</div>';
        }
    }

    window.alternarLista = function (tipo) {
        var listaEq = el('ferreiro-lista-equipados');
        var listaMo = el('ferreiro-lista-mochila');
        var btnEq = el('btn-ferreiro-equipados-toggle');
        var btnMo = el('btn-ferreiro-mochila-toggle');
        var mostrarEq = (tipo === 'equipados') ? (listaEq.style.display !== 'block') : false;
        var mostrarMo = (tipo === 'mochila') ? (listaMo.style.display !== 'flex') : false;
        if (listaEq) listaEq.style.display = mostrarEq ? 'block' : 'none';
        if (listaMo) listaMo.style.display = mostrarMo ? 'flex' : 'none';
        if (btnEq) btnEq.classList.toggle('ativo', mostrarEq);
        if (btnMo) btnMo.classList.toggle('ativo', mostrarMo);
    };

    /* ==========================================================================
       BOTÃO UPGRADE + ANIMAÇÃO DE 3s (visual — resultado já veio do servidor)
       ========================================================================== */

    window.botaoUpgrade = function () {
        if (operando) return;
        if (!slotItem || slotItem.tipo !== 'equipamento') { mensagemNoJogo('Coloque um equipamento no slot da forja.'); return; }
        if (slotItem.locked) { mensagemNoJogo('🔒 Item bloqueado — desbloqueie no inventário.'); return; }
        var nivel = Math.max(0, slotItem.upgrade || 0);
        var alvo = nivel + 1;
        var pedraInfo = pedraParaNivel(alvo);
        var pedraDef = PEDRAS[pedraInfo.pedra];
        if (contarPedraCliente(pedraInfo.pedra) < 1) {
            mensagemNoJogo('Material insuficiente: precisa de 1x ' + (pedraDef ? pedraDef.nome : pedraInfo.pedra) + '.');
            return;
        }
        var msg = 'Tentar melhorar ' + (slotItem.nome || 'EQUIPAMENTO') + ' +' + nivel + ' → +' + alvo + '?\n' +
            'Chance: ' + chanceTexto(alvo) + '\n' +
            'Material: ' + (pedraDef ? pedraDef.nome : pedraInfo.pedra) + ' ×1\n\n' +
            'Em caso de FALHA o equipamento NÃO é destruído (permanece +' + nivel + '), mas a pedra é consumida.';
        if (typeof window.mostrarConfirmacao === 'function') {
            window.mostrarConfirmacao(msg, function () { enviarUpgrade(); });
        } else {
            enviarUpgrade();
        }
    };

    function enviarUpgrade() {
        if (operando || !slotItem) return;
        operando = true;
        txnAtual = gerarTxnId();
        _resultadoPendente = null;
        var btn = el('btn-ferreiro-upgrade');
        if (btn) btn.disabled = true;
        iniciarAnimacao();
        var item = slotItem;
        var payload = { action: 'ferreiro_upgrade', id: item.id, uid: item.uid || null, transactionId: txnAtual };
        if (window.ws && window.ws.readyState === WebSocket.OPEN) {
            window.ws.send(JSON.stringify(payload));
        } else if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(payload));
        } else {
            // sem socket: anima e mostra erro depois
            _resultadoPendente = { tipoErro: 'Sem conexão com o servidor.' };
        }
    }

    function iniciarAnimacao() {
        var anim = el('ferreiro-anim');
        var fill = el('fa-preenchimento');
        var itemTxt = el('ferreiro-anim-item');
        if (anim) anim.style.display = 'flex';
        if (fill) fill.style.width = '0%';
        if (itemTxt && slotItem) itemTxt.innerHTML = (slotItem.icon || '') + ' ' + (slotItem.nome || 'EQUIPAMENTO') + ' <b>+' + (slotItem.upgrade || 0) + ' → +' + ((slotItem.upgrade || 0) + 1) + '</b>';
        _animInicio = Date.now();
        var golpes = [600, 1400, 2200];
        var golpeIdx = 0;
        if (_animTimer) clearInterval(_animTimer);
        _animTimer = setInterval(function () {
            var passado = Date.now() - _animInicio;
            if (fill) {
                var pct = Math.min(100, (passado / 3000) * 100);
                fill.style.width = pct + '%';
            }
            if (golpeIdx < golpes.length && passado >= golpes[golpeIdx]) {
                golpeIdx++;
                tocarSomBatida();
            }
            if (passado >= 3000) {
                clearInterval(_animTimer);
                _animTimer = null;
                if (anim) anim.style.display = 'none';
                operando = false;
                var btn = el('btn-ferreiro-upgrade');
                if (btn) btn.disabled = false;
                var dados = _resultadoPendente;
                _resultadoPendente = null;
                if (dados && dados.type === 'ferreiro_upgrade_resultado') {
                    revelarResultado(dados);
                } else if (dados && dados.tipoErro) {
                    abrirResultado('Falha na conexão', 'O servidor não respondeu. A operação não foi aceita — sincronize novamente.', false, true);
                } else {
                    // resultado pode chegar em até 4s (rede lenta) — senão avisa
                    if (_resultadoPendenteTimer) clearTimeout(_resultadoPendenteTimer);
                    _resultadoPendenteTimer = setTimeout(function () {
                        _resultadoPendenteTimer = null;
                        if (_resultadoPendente && _resultadoPendente.type === 'ferreiro_upgrade_resultado') {
                            var d2 = _resultadoPendente;
                            _resultadoPendente = null;
                            revelarResultado(d2);
                        } else if (!_resultadoPendente) {
                            abrirResultado('A forja concluiu', 'O resultado será mostrado assim que o servidor sincronizar.', false, true);
                        }
                    }, 4000);
                }
            }
        }, 100);
    }

    function abrirResultado(titulo, detalhe, sucesso, erro) {
        var box = el('ferreiro-resultado');
        var t = el('fr-titulo');
        var item = el('fr-item');
        var inf = el('fr-info');
        if (box) {
            box.classList.remove('fr-sucesso', 'fr-falha');
            box.classList.add(sucesso !== false ? 'fr-sucesso' : 'fr-falha');
            box.style.display = 'flex';
        }
        if (t) t.textContent = titulo;
        if (item) item.innerHTML = detalhe || '';
        if (inf) inf.innerHTML = '';
        if (erro) {
            if (inf) inf.innerHTML = '<span class="destaque-vermelho">' + (detalhe || '') + '</span>';
        }
    }

    function revelarResultado(dados) {
        var sucesso = !!dados.sucesso;
        var nivel = Math.max(0, dados.upgrade || 0);
        var anterior = Math.max(0, dados.nivelAnterior || 0);
        var item = dados.item || slotItem || {};
        var detalhe = (item.icon || '') + ' ' + (item.nome || 'EQUIPAMENTO') + ' <b>+' + anterior + ' → +' + nivel + '</b>';
        var extrasLinha = '';   // preenchido via ferreiro-resultado-extras se usar box custom — aqui usamos título/detalhe simples
        var sucessoExtra = '';
        if (sucesso && dados.infoUpgrade) {
            var inf = dados.infoUpgrade;
            var linhas = [];
            if (inf.principalChave) linhas.push((NOMES_STATUS[inf.principalChave] || inf.principalChave) + ' ' + inf.principalAntes + ' → ' + inf.principalDepois);
            if (inf.extras && inf.extras.length) linhas.push('Novo atributo: ' + inf.extras.map(function (e) { return (NOMES_STATUS[e.chave] || e.chave) + ' +' + e.valor; }).join(', '));
            if (inf.reforco) linhas.push('REFORÇO +10% aplicado em TODOS os status!');
            sucessoExtra = linhas.join(' · ');
        }
        if (sucesso) {
            tocarSomSucesso();
            abrirResultado('SUCESSO!', detalhe, true, false);
        } else {
            tocarSomFalha();
            abrirResultado('FALHA', detalhe + '<br>O equipamento permanece +' + anterior + ' • pedra consumida.', false, false);
        }
        var inf2 = el('fr-info');
        if (inf2) inf2.innerHTML = sucesso ? ('<div>' + sucessoExtra + '</div><div class="destaque">Chance real: ' + ((dados.chance !== undefined) ? percentChanceText(dados.chance) : '—') + '</div>') : ('<div class="destaque-vermelho">Chance real: ' + ((dados.chance !== undefined) ? percentChanceText(dados.chance) : '—') + '</div>');
        // atualiza referência local do item selecionado (o inventário novo já foi aplicado)
        var idSlot = slotItem ? slotItem.id : null;
        if (idSlot) {
            var ref = localizarItemCliente(idSlot);
            if (ref && ref.item) { slotItem = ref.item; slotOrigem = ref.origem; }
        }
        renderizarTudo();
    }

    function percentChanceText(c) {
        if (c >= 1) return Math.round(c * 100) + '%';
        return (c * 100).toFixed(1).replace(/\.0$/, '') + '%';
    }

    window.fecharResultado = function () {
        var box = el('ferreiro-resultado');
        if (box) box.style.display = 'none';
        if (_resultadoPendenteTimer) { clearTimeout(_resultadoPendenteTimer); _resultadoPendenteTimer = null; }
        _resultadoPendente = null;
    };

    /* ==========================================================================
       REGRAS
       ========================================================================== */

    window.abrirRegras = function () {
        var painel = el('ferreiro-regras-painel');
        if (painel) painel.style.display = 'flex';
    };

    window.fecharRegras = function () {
        var painel = el('ferreiro-regras-painel');
        if (painel) painel.style.display = 'none';
    };

    /* ==========================================================================
       ADMIN: gerar pedras (somente para teste — não há sistema de obtenção aqui)
       ========================================================================== */

    window.ferreiroAdminPedras = function () {
        if (!window.ehAdmin) return;
        var tipoPedra = prompt('Quantas pedras de cada (FADEO, MURK, DIVINE, STONE_GOD)? (ex.: 20)', '20');
        if (tipoPedra === null) return;
        var qtd = parseInt(tipoPedra, 10);
        if (isNaN(qtd) || qtd <= 0) qtd = 20;
        qtd = Math.max(1, Math.min(200, qtd));
        var lista = ['FADEO', 'MURK', 'DIVINE', 'STONE_GOD'];
        var socket = (window.ws && window.ws.readyState === WebSocket.OPEN) ? window.ws : (typeof ws !== 'undefined' && ws.readyState === WebSocket.OPEN ? ws : null);
        if (!socket) return;
        for (var i = 0; i < lista.length; i++) {
            socket.send(JSON.stringify({ action: 'ferreiro_admin_pedra', pedra: lista[i], qtd: qtd }));
        }
        mensagemNoJogo('💠 Gerando ' + qtd + 'x de cada pedra (admin)...');
    };

    /* ==========================================================================
       MENSAGENS DO SERVIDOR (chamado pelo index.html ao final do onmessage)
       ========================================================================== */

    window.ferreiroReceberMensagem = function (dados) {
        if (!dados || !dados.type) return;

        if (dados.type === 'ferreiro_upgrade_resultado') {
            if (dados.inventario) aplicarInventarioLocal(dados);
            if (operando && !_resultadoPendente) {
                _resultadoPendente = dados;
            } else if (!operando) {
                // janela fechada / animação já concluída: revela e atualiza
                operando = false;
                revelarResultado(dados);
            } else {
                _resultadoPendente = dados;
            }
            return;
        }

        if (dados.type === 'ferreiro_erro' || dados.type === 'ferreiro_aviso') {
            var ehErro = dados.type === 'ferreiro_erro';
            if (operando) {
                // erro no meio da animação (ex.: servidor recusou): encerra a animação e mostra
                if (_animTimer) { clearInterval(_animTimer); _animTimer = null; }
                var anim = el('ferreiro-anim');
                if (anim) anim.style.display = 'none';
                operando = false;
                var btn = el('btn-ferreiro-upgrade');
                if (btn) btn.disabled = false;
                _resultadoPendente = null;
                if (ehErro) abrirResultado('NÃO FOI POSSÍVEL', dados.motivo || 'Operação recusada.', false, true);
            } else if (ehErro) {
                mensagemNoJogo('⚠️ ' + (dados.motivo || 'Erro do ferreiro.'));
            } else {
                if (typeof window.floatingTexts === 'object' && window.floatingTexts) {
                    window.floatingTexts.push({ x: (window.meuX || 0) + 12, y: (window.meuY || 0) - 40, text: dados.motivo || '', color: '#6ec6ff', alpha: 1.0 });
                }
            }
            if (dados.type === 'ferreiro_erro') {
                var inv = el('inv-info');
                if (inv) inv.innerText = '⚠️ ' + (dados.motivo || '');
            }
            if (dados.motivo && !window.ferreiroAberto && dados.type === 'ferreiro_erro') {
                // mostra no chat flutuante também
                if (typeof window.floatingTexts === 'object' && window.floatingTexts) {
                    window.floatingTexts.push({ x: (window.meuX || 0) + 12, y: (window.meuY || 0) - 30, text: dados.motivo, color: '#e74c3c', alpha: 1.0 });
                }
            }
            return;
        }

        if (dados.type === 'inventario_sync' && window.ferreiroAberto) {
            renderizarTudo();
            return;
        }

        if (dados.type === 'inventario_erro') {
            if (!window.ferreiroAberto && typeof window.floatingTexts === 'object' && window.floatingTexts) {
                window.floatingTexts.push({ x: (window.meuX || 0) + 12, y: (window.meuY || 0) - 30, text: dados.motivo || '', color: '#e74c3c', alpha: 1.0 });
            }
            var inv2 = el('inv-info');
            if (inv2 && window.inventarioAberto) inv2.innerText = '⚠️ ' + (dados.motivo || '');
        }
    };

    // Aplica o inventário NOVO vindo do resultado do upgrade (mesma lógica do sync do index.html)
    function aplicarInventarioLocal(dados) {
        if (!dados.inventario) return;
        var inv = dados.inventario;
        if (inv.slots !== undefined) window.inventario = inv.slots || {};
        if (Array.isArray(inv.mochila)) {
            window.mochila = inv.mochila.map(function (i) {
                if (typeof window.mapearItemServidor === 'function') return window.mapearItemServidor(i);
                return i;
            });
        }
        if (dados.maxHp) window.meuMaxHp = dados.maxHp;
        if (dados.hp !== undefined) window.meuHp = dados.hp;
        if (dados.maxMp) window.meuMaxMp = dados.maxMp;
        if (dados.mana !== undefined) window.meuMp = dados.mana;
        if (typeof window.atualizarHudMp === 'function') window.atualizarHudMp();
        if (dados.atributosTotais) window.atributosTotais = dados.atributosTotais;
        if (typeof window.renderizarInventario === 'function') window.renderizarInventario();
        if (typeof window.renderizarMochila === 'function') window.renderizarMochila();
        if (typeof window.renderizarAtributos === 'function') window.renderizarAtributos();
        if (dados.syncMochilaTab) { }
    }

    /* ==========================================================================
       BADGES / AURAS (níveis +10/+15/+20 — leves, via classes CSS)
       ========================================================================== */

    function aplicarAura(elSlot, nivel) {
        if (!elSlot) return;
        if (nivel >= 20) elSlot.classList.add('upg-glow-20');
        else if (nivel >= 15) elSlot.classList.add('upg-glow-15');
        else if (nivel >= 10) elSlot.classList.add('upg-glow-10');
    }

    function removerAuras(elSlot) {
        if (!elSlot) return;
        elSlot.classList.remove('upg-glow-10', 'upg-glow-15', 'upg-glow-20');
    }

    function garantirBadge(elSlot, item) {
        removerBadge(elSlot);
        var nivel = Math.max(0, item.upgrade || 0);
        if (nivel > 0) {
            var b = document.createElement('span');
            b.className = 'upg-badge';
            b.textContent = '+' + nivel;
            elSlot.appendChild(b);
        }
    }

    function removerBadge(elSlot) {
        if (!elSlot) return;
        var existentes = elSlot.querySelectorAll('.upg-badge');
        for (var i = 0; i < existentes.length; i++) existentes[i].remove();
    }

    /* ==========================================================================
       AURA DO JOGADOR QUANDO EQUIPA +10/+15/+20 (client-side, leve)
       ========================================================================== */

    window.desenharAurasEquipamentos = function (t) {
        var ctx = window.ctx;
        if (!ctx) return;
        if (window.estaMorto) return;
        var tier = 0;
        var inv = window.inventario || {};
        for (var ch in inv) {
            var it = inv[ch];
            if (it && it.tipo === 'equipamento') {
                var u = Math.max(0, it.upgrade || 0);
                if (u >= 20) tier = 3;
                else if (u >= 15 && tier < 2) tier = 2;
                else if (u >= 10 && tier < 1) tier = 1;
            }
        }
        if (tier === 0) return;
        var x = (window.meuX || 0) + 12;
        var y = (window.meuY || 0) + 10;
        var camX = window.camX || 0, camY = window.camY || 0;
        var cw = ((window.canvas && window.canvas.width) || 900) / (window.cameraZoomAtual || window.ZOOM_CAMERA || 1);
        var chH = ((window.canvas && window.canvas.height) || 600) / (window.cameraZoomAtual || window.ZOOM_CAMERA || 1);
        if (x + 60 < camX || x - 60 > camX + cw || y + 60 < camY || y - 60 > camY + chH) return;

        var tt = (t || 0);
        var n = tier === 3 ? 16 : (tier === 2 ? 10 : 6);
        var raioBase = tier === 3 ? 34 : (tier === 2 ? 26 : 18);
        var cores = tier === 3 ? ['#ffd700', '#ffe066', '#fff3b0'] : (tier === 2 ? ['#c77dff', '#a855f7', '#e9d5ff'] : ['#5dade2', '#85c1e9', '#aed6f1']);

        ctx.save();
        // brilho no chão
        var g = ctx.createRadialGradient(x, y, 2, x, y, raioBase * 1.4);
        g.addColorStop(0, tier === 3 ? 'rgba(255, 215, 0, 0.28)' : (tier === 2 ? 'rgba(168, 85, 247, 0.22)' : 'rgba(52, 152, 219, 0.18)'));
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(x, y + 2, raioBase * 1.5, raioBase * 0.55, 0, 0, Math.PI * 2); ctx.fill();

        for (var i = 0; i < n; i++) {
            var ang = tt * (tier === 3 ? 1.6 : 1.2) + (i * (Math.PI * 2) / n);
            var pulsar = 1 + Math.sin(tt * 3 + i * 1.7) * 0.18;
            var rx = x + Math.cos(ang) * raioBase * pulsar;
            var ry = y - 18 + Math.sin(ang * 1.3) * (raioBase * 0.6) + Math.sin(tt * 2.4 + i) * 3;
            ctx.fillStyle = cores[i % cores.length];
            ctx.globalAlpha = 0.65 + Math.sin(tt * 5 + i * 2) * 0.25;
            ctx.shadowColor = cores[i % cores.length];
            ctx.shadowBlur = tier === 3 ? 10 : 6;
            ctx.beginPath();
            ctx.arc(rx, ry, tier === 3 ? 2.4 : 2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    };

    /* ==========================================================================
       NPC FERREIRO (desenho + clique/toque)
       ========================================================================== */

    window.tocarFerreiroNpc = function (mx, my) {
        if (mx === undefined || my === undefined) return false;
        var dist = Math.hypot(mx - NPC.x, my - NPC.y);
        return dist <= (NPC.r + 18);
    };

    window.desenharFerreiroNpc = function (t) {
        var ctx = window.ctx;
        if (!ctx) return;
        if (window.currentMap !== 'cidade') return;
        var camX = window.camX || 0, camY = window.camY || 0;
        var cw = ((window.canvas && window.canvas.width) || 900) / (window.cameraZoomAtual || window.ZOOM_CAMERA || 1);
        var ch = ((window.canvas && window.canvas.height) || 600) / (window.cameraZoomAtual || window.ZOOM_CAMERA || 1);
        var px = NPC.x, py = NPC.y, R = NPC.r;
        if (px + R + 110 < camX || px - R - 110 > camX + cw || py + R + 110 < camY || py - R - 110 > camY + ch) return;

        ctx.save();
        // sombra
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.ellipse(px, py + 12, R * 1.15, R * 0.42, 0, 0, Math.PI * 2);
        ctx.fill();

        // base / suporte da bigorna
        ctx.fillStyle = '#42525c';
        ctx.fillRect(px - 22, py + 6, 44, 7);
        // corpo da bigorna
        ctx.fillStyle = '#546e7a';
        ctx.fillRect(px - 17, py - 10, 34, 18);
        ctx.fillStyle = '#78909c';
        ctx.fillRect(px - 13, py - 20, 26, 11);
        // pescoço + chifre
        ctx.fillRect(px - 9, py - 12, 18, 4);
        ctx.fillStyle = '#90a4ae';
        ctx.fillRect(px + 4, py - 26, 12, 7);

        // cavaco de madeira (base do fogo)
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(px - 26, py + 13, 52, 6);

        // fogo / brasas embaixo (pool: sem alocação por frame)
        var coresFogo = ['#ffd166', '#ff9f43', '#ffe066', '#e67e22'];
        for (var i = 0; i < 8; i++) {
            var phase = (t || 0) * 5 + i * 2.3;
            var fx = px - 20 + ((phase * 1.7) % 40);
            var fy = py + 12 - (Math.sin(phase + i) * 0.5 + 0.5) * 18;
            ctx.fillStyle = coresFogo[i % 4];
            ctx.globalAlpha = 0.8 - (Math.sin(phase) * 0.25 + 0.25);
            ctx.beginPath();
            ctx.arc(fx, fy, 2 + (i % 3), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // martelo animado (girando sobre a bigorna)
        ctx.save();
        ctx.translate(px + 28, py - 22);
        ctx.rotate(Math.sin((t || 0) * 6) * 0.7);
        ctx.fillStyle = '#8d6e63';
        ctx.fillRect(-13, -2, 26, 4);
        ctx.fillStyle = '#b0bec5';
        ctx.fillRect(-15, -9, 9, 14);
        ctx.restore();

        // aura quente (anel pulsante)
        var pulsar = 0.55 + Math.sin((t || 0) * 3) * 0.3;
        ctx.strokeStyle = 'rgba(255, 140, 66, ' + pulsar + ')';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#ff8c42';
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.ellipse(px, py + 4, R * 0.95, R * 0.42, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // nome + placa
        ctx.textAlign = 'center';
        ctx.font = "bold 14px 'Rajdhani', Arial, sans-serif";
        ctx.lineJoin = 'round';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.strokeText('⚒ FERREIRO', px, py - 42);
        ctx.fillStyle = '#ffd166';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 4;
        ctx.fillText('⚒ FERREIRO', px, py - 42);
        ctx.font = "11px 'Rajdhani', Arial, sans-serif";
        ctx.fillStyle = '#e8e4da';
        ctx.fillText('Forja de Equipamentos', px, py - 29);
        ctx.restore();
    };

    /* ==========================================================================
       SONS DA FORJA (sintetizados — sem sistema paralelo de áudio)
       ========================================================================== */

    function iniciarAudioLocal() {
        if (typeof window.iniciarAudio === 'function') window.iniciarAudio();
    }

    function tocarSomBatida() {
        try {
            iniciarAudioLocal();
            var ctxA = window.audioCtx || (typeof audioCtx !== 'undefined' ? audioCtx : null);
            if (!ctxA) return;
            var t0 = ctxA.currentTime;
            // tranco metálico (oscilador em queda) + ruído curtíssimo
            var osc = ctxA.createOscillator();
            osc.type = 'square';
            osc.frequency.setValueAtTime(240, t0);
            osc.frequency.exponentialRampToValueAtTime(70, t0 + 0.09);
            var g = ctxA.createGain();
            g.gain.setValueAtTime(0.35 * (Number(window.volumeGeral) || 1), t0);
            g.gain.exponentialRampToValueAtTime(0.01, t0 + 0.1);
            osc.connect(g);
            g.connect(window.audioGanhoMaster || ctxA.destination);
            osc.start(t0);
            osc.stop(t0 + 0.11);
        } catch (e) { }
    }

    function tocarSomSucesso() {
        try {
            iniciarAudioLocal();
            var ctxA = window.audioCtx || (typeof audioCtx !== 'undefined' ? audioCtx : null);
            if (!ctxA) return;
            var notas = [523.25, 659.25, 783.99, 1046.5];
            for (var i = 0; i < notas.length; i++) {
                var t0 = ctxA.currentTime + i * 0.09;
                var osc = ctxA.createOscillator();
                osc.type = 'triangle';
                osc.frequency.value = notas[i];
                var g = ctxA.createGain();
                g.gain.setValueAtTime(0.3 * (Number(window.volumeGeral) || 1), t0);
                g.gain.exponentialRampToValueAtTime(0.01, t0 + 0.28);
                osc.connect(g);
                g.connect(window.audioGanhoMaster || ctxA.destination);
                osc.start(t0);
                osc.stop(t0 + 0.3);
            }
        } catch (e) { }
    }

    function tocarSomFalha() {
        try {
            iniciarAudioLocal();
            var ctxA = window.audioCtx || (typeof audioCtx !== 'undefined' ? audioCtx : null);
            if (!ctxA) return;
            var t0 = ctxA.currentTime;
            var osc = ctxA.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(160, t0);
            osc.frequency.exponentialRampToValueAtTime(60, t0 + 0.4);
            var g = ctxA.createGain();
            g.gain.setValueAtTime(0.28 * (Number(window.volumeGeral) || 1), t0);
            g.gain.exponentialRampToValueAtTime(0.01, t0 + 0.45);
            osc.connect(g);
            g.connect(window.audioGanhoMaster || ctxA.destination);
            osc.start(t0);
            osc.stop(t0 + 0.5);
        } catch (e) { }
    }

    /* ==========================================================================
       INICIALIZAÇÃO (admin button visibilidade + aperfeiçoa a lista quando abre)
       ========================================================================== */

    function inicializar() {
        var btnAdmin = el('btn-ferreiro-admin');
        if (btnAdmin) btnAdmin.style.display = (window.ehAdmin ? 'block' : 'none');
        // fechar janela ao tocar fora (mobile/PC)
        var screen = el('ferreiro-screen');
        if (screen) {
            screen.addEventListener('pointerdown', function (e) {
                if (e.target === screen && !operando) window.fecharFerreiro();
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inicializar);
    } else {
        inicializar();
    }
})();