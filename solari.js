// ============================================================================
// solari.js — ARENA DE SOLARI (cliente)
// Portal ROXO na Cidade de Davahl (60488,236) → partida em grupo (máx 4) com
// 10 rounds, Elite no R5 e leilão final com dados 1-100 (+20 classe do item).
// Integra-se ao index.html via: window.desenharPortalSolari, tocarPortalSolari,
// receberSolariMensagem, solariMudouMapa.
// ============================================================================
(function () {
    'use strict';
    if (typeof window === 'undefined') return;

    var PORTAL = { x: 60488, y: 236, r: 38 };

    var CLASSE_LABEL = {
        guerreiro: '⚔️ Guerreiro', barbaro: '🪓 Bárbaro', roqueiro: '🛡️ Roqueiro',
        mago: '🧙 Mago', summoner: '✨ Summoner', arqueiro: '🏹 Arqueiro',
        curandeiro: '💚 Curandeiro', ladino: '🗡️ Ladino', dronemaster: '🔧 Dronemaster',
        arqueiro_arcano: '🌟 Arq. Arcano', sniper: '🎯 Sniper'
    };
    function classeLabel(c) { return CLASSE_LABEL[c] || (c || '?'); }

    var S = { // estado interno do cliente
        sessao: null,        // {fase, round, liderId, membros:[...]}
        painelAberto: false,
        ultimaAbertura: 0,   // evita reenvio de solari_abrir
        convite: null,       // {deId, deNick}
        leilao: null,        // estado do leilão (item atual, rolagens, etc)
        morteInicio: 0,
        timerMorteAtivo: false
    };

    var raiz = null, estiloInjetado = false;

    function injetarEstilo() {
        if (estiloInjetado) return;
        estiloInjetado = true;
        var st = document.createElement('style');
        st.id = 'solari-estilo';
        st.textContent = [
            '.solari-c { position: fixed; z-index: 38000; font-family: "Rajdhani", Arial, sans-serif; left: 0; top: 0; width: 100%; height: 100%; pointer-events: none; }',
            '.solari-painel { position: fixed; left: 50%; bottom: 34px; transform: translateX(-50%); width: 580px; max-width: 95vw; max-height: 82vh; overflow-y: auto; background: linear-gradient(180deg, rgba(42,22,66,.98), rgba(18,10,32,.98)); border: 2px solid #c77dff; border-radius: 16px; box-shadow: 0 0 46px rgba(168,85,247,.55), inset 0 0 30px rgba(168,85,247,.08); padding: 14px 16px 16px; color: #efe6ff; pointer-events: auto; }',
            '.solari-painel::-webkit-scrollbar { width: 8px; } .solari-painel::-webkit-scrollbar-thumb { background: #7b2fbf; border-radius: 6px; }',
            '.solari-titulo { display: flex; align-items: center; justify-content: space-between; font-size: 21px; font-weight: 700; letter-spacing: 1px; color: #e9d5ff; text-shadow: 0 0 12px #a855f7; margin-bottom: 4px; }',
            '.solari-sub { font-size: 13px; color: #b9a6d4; margin-bottom: 8px; }',
            '.solari-fechar { background: transparent; border: none; color: #d8c3f0; font-size: 18px; cursor: pointer; padding: 0 4px; } .solari-fechar:hover { color: #fff; }',
            '.solari-slot { display: flex; align-items: center; gap: 8px; background: rgba(0,0,0,.35); border: 1px solid rgba(199,125,255,.28); border-left: 4px solid #4b2a73; border-radius: 10px; padding: 7px 10px; margin-bottom: 6px; }',
            '.solari-slot-vago { opacity: .45; border-left-color: #35324a; }',
            '.solari-slot-mim { border-color: rgba(199,125,255,.85); box-shadow: 0 0 12px rgba(168,85,247,.35); }',
            '.solari-slot-info { flex: 1; min-width: 0; }',
            '.solari-slot-nome { font-size: 15px; font-weight: 700; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',
            '.solari-slot-detalhe { font-size: 12px; color: #b9a6d4; }',
            '.solari-jogar { min-width: 96px; text-align: center; font-size: 13px; font-weight: 800; letter-spacing: 1px; padding: 6px 10px; border-radius: 8px; cursor: pointer; border: 1px solid transparent; }',
            '.solari-jogar-ver { background: linear-gradient(180deg,#9b2c2c,#6e1414); color: #ffc9c9; border-color: #ff6b6b; }',
            '.solari-jogar-ok { background: linear-gradient(180deg,#1e9e41,#0f6b2a); color: #d8ffea; border-color: #4dff88; animation: solariPiscar .7s infinite; }',
            '.solari-jogar-off { background: #2a2f3a; color: #9aa3b5; cursor: default; }',
            '@keyframes solariPiscar { 0%,100% { box-shadow: 0 0 6px rgba(77,255,136,.55); } 50% { box-shadow: 0 0 22px rgba(77,255,136,1); } }',
            '.solari-botao { font-family: "Rajdhani", Arial, sans-serif; font-size: 14px; font-weight: 800; padding: 8px 14px; border-radius: 9px; border: 1px solid transparent; cursor: pointer; color: #fff; }',
            '.solari-botao:disabled { opacity: .38; cursor: not-allowed; }',
            '.solari-botao-roxo { background: linear-gradient(180deg,#8b3fd4,#5b1ea8); border-color: #c77dff; } .solari-botao-roxo:hover:not(:disabled) { filter: brightness(1.15); }',
            '.solari-botao-start { background: linear-gradient(180deg,#1fb34f,#0e7a31); border-color: #54ff8b; box-shadow: 0 0 16px rgba(31,179,79,.5); } .solari-botao-start:hover:not(:disabled) { filter: brightness(1.15); }',
            '.solari-botao-sair { background: #3a304a; border-color: #7b6d92; } .solari-botao-sair:hover:not(:disabled) { background: #553d6e; }',
            '.solari-sec { margin-top: 10px; border-top: 1px solid rgba(199,125,255,.25); padding-top: 8px; }',
            '.solari-sec-titulo { font-size: 13px; font-weight: 700; color: #c9a8f0; margin-bottom: 6px; letter-spacing: .5px; }',
            '.solari-lista { max-height: 120px; overflow-y: auto; } .solari-lista::-webkit-scrollbar { width: 8px; } .solari-lista::-webkit-scrollbar-thumb { background: #7b2fbf; border-radius: 6px; }',
            '.solari-jogador-linha { display: flex; align-items: center; gap: 8px; padding: 4px 6px; border-radius: 8px; font-size: 13px; } .solari-jogador-linha:hover { background: rgba(168,85,247,.15); }',
            '.solari-jogador-linha .nome { flex: 1; color: #e6dcff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',
            '.solari-jogador-linha .lv { color: #8f7fae; font-size: 12px; }',
            '.solari-convidar-mini { font-family: "Rajdhani", Arial, sans-serif; font-size: 12px; font-weight: 700; padding: 3px 9px; border-radius: 6px; background: linear-gradient(180deg,#8b3fd4,#5b1ea8); color: #fff; border: 1px solid #c77dff; cursor: pointer; } .solari-convidar-mini:hover { filter: brightness(1.15); }',
            '.solari-input { flex: 1; min-width: 0; font-family: "Rajdhani", Arial, sans-serif; font-size: 13px; padding: 6px 10px; border-radius: 8px; border: 1px solid #5b3a7d; background: rgba(0,0,0,.45); color: #efe6ff; outline: none; } .solari-input:focus { border-color: #c77dff; }',
            '.solari-aviso-grupo { text-align: center; padding: 10px; color: #cba8f2; font-size: 14px; font-weight: 700; letter-spacing: .5px; }',
            '.solari-aviso-cheio { text-align: center; padding: 6px; color: #ffb36b; font-size: 13px; font-weight: 700; }',
            '.solari-convite-modal { position: fixed; left: 50%; top: 34%; transform: translateX(-50%); width: 460px; max-width: 92vw; background: linear-gradient(180deg, rgba(40,20,62,.99), rgba(16,9,30,.99)); border: 2px solid #c77dff; border-radius: 16px; box-shadow: 0 0 46px rgba(168,85,247,.6); padding: 18px; color: #efe6ff; text-align: center; pointer-events: auto; z-index: 39000; }',
            '.solari-convite-botoes { display: flex; gap: 12px; justify-content: center; margin-top: 14px; }',
            '.solari-contagem { position: fixed; left: 50%; top: 42%; transform: translate(-50%,-50%); text-align: center; pointer-events: none; }',
            '.solari-numero { font-size: 190px; font-weight: 900; color: #fff; text-shadow: 0 0 30px #a855f7, 0 0 70px #7c3aed; line-height: 1; }',
            '.solari-start { font-size: 120px; font-weight: 900; color: #4dff88; text-shadow: 0 0 34px #1fb34f, 0 0 90px #0e7a31; line-height: 1; letter-spacing: 6px; animation: solariStartB .55s infinite alternate; }',
            '@keyframes solariStartB { from { transform: scale(1); } to { transform: scale(1.12); } }',
            '.solari-transicao-msg { font-size: 42px; font-weight: 900; color: #ffd700; text-shadow: 0 0 24px #b8860b, 0 0 60px #8a6d1a; letter-spacing: 2px; animation: solariPiscarMsg .45s infinite; margin-bottom: 6px; }',
            '@keyframes solariPiscarMsg { 0%,100% { opacity: 1; } 50% { opacity: .15; } }',
            '.solari-round-hud { position: fixed; right: 12px; top: 12px; background: rgba(20,10,32,.92); border: 1px solid #c77dff; border-radius: 10px; padding: 6px 12px; color: #efe6ff; font-size: 13px; font-weight: 700; letter-spacing: 1px; z-index: 37000; pointer-events: none; box-shadow: 0 0 16px rgba(168,85,247,.4); }',
            '.solari-banner { position: fixed; left: 50%; top: 20%; transform: translateX(-50%); width: 92vw; text-align: center; font-size: 44px; font-weight: 900; letter-spacing: 3px; z-index: 37000; pointer-events: none; animation: solariPiscarMsg .5s infinite; text-shadow: 0 0 26px rgba(0,0,0,.9), 0 0 80px rgba(0,0,0,.6); }',
            '.solari-leilao { position: fixed; left: 50%; top: 46%; transform: translate(-50%,-50%); width: 620px; max-width: 94vw; max-height: 86vh; overflow-y: auto; background: linear-gradient(180deg, rgba(38,18,58,.99), rgba(16,9,28,.99)); border: 2px solid #c77dff; border-radius: 16px; box-shadow: 0 0 50px rgba(168,85,247,.6); padding: 16px 18px; color: #efe6ff; text-align: center; pointer-events: auto; z-index: 38500; }',
            '.solari-leilao h3 { margin: 0 0 4px; font-size: 22px; color: #e9d5ff; letter-spacing: 1px; }',
            '.solari-item-nome { font-size: 26px; font-weight: 900; margin: 6px 0 2px; }',
            '.solari-item-detalhe { font-size: 13px; color: #b9a6d4; margin-bottom: 8px; }',
            '.solari-dado { font-size: 18px; font-weight: 900; padding: 10px 26px; border-radius: 12px; background: linear-gradient(180deg,#8b3fd4,#5b1ea8); color: #fff; border: 2px solid #e0b3ff; cursor: pointer; margin: 6px 0; } .solari-dado:hover { filter: brightness(1.18); }',
            '.solari-dado:disabled { opacity: .4; cursor: not-allowed; }',
            '.solari-rolagens { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 10px; }',
            '.solari-roll { background: rgba(0,0,0,.4); border: 1px solid rgba(199,125,255,.3); border-radius: 9px; padding: 5px 10px; font-size: 13px; min-width: 90px; }',
            '.solari-roll b { color: #ffd700; }',
            '.solari-roll-bonus { color: #2eff7e; font-size: 11px; }',
            '.solari-vencedor { font-size: 30px; font-weight: 900; color: #ffd700; text-shadow: 0 0 24px #b8860b; margin: 10px 0 4px; animation: solariPiscarMsg .5s infinite; }',
            '.solari-morte-timer { position: fixed; left: 50%; bottom: 150px; transform: translateX(-50%); background: rgba(30,8,10,.92); border: 1px solid #ff5f6b; border-radius: 10px; padding: 8px 16px; color: #ffc9cd; font-size: 15px; font-weight: 700; z-index: 40000; pointer-events: none; text-align: center; }',
            '.solari-countdown-tempo { font-size: 15px; color: #d8c3f0; margin-top: 2px; }'
        ].join('\n');
        (document.head || document.documentElement).appendChild(st);
    }

    function garantirRaiz() {
        if (raiz && document.body.contains(raiz)) return raiz;
        injetarEstilo();
        raiz = document.createElement('div');
        raiz.className = 'solari-c';
        raiz.id = 'solari-container';
        document.body.appendChild(raiz);
        return raiz;
    }

    // ====================== UTIL ======================
    function estaMorto() { return !!(window.estaMorto); }
    function emCidade() { return window.currentMap === 'cidade'; }
    function pertoPortal(x, y) {
        return Math.hypot((x + 12) - PORTAL.x, (y + 16) - PORTAL.y);
    }
    function enviar(a) {
        try {
            if (window.ws && window.ws.readyState === WebSocket.OPEN) window.ws.send(JSON.stringify(a));
        } catch (e) { console.error('[solari] enviar falhou', e); }
    }
    function aviso(texto) {
        try {
            if (typeof window.mostrarToast === 'function') { window.mostrarToast(String(texto), '#c77dff'); return; }
        } catch (e) { /* ignora */ }
        console.log('[solari]', texto);
    }
    function ledar(id) { return document.getElementById(id); }

    // ====================== PAINEL ======================
    function montarPainel() {
        var s = S.sessao;
        if (!s) return;
        // Convite pendente na tela: NÃO apagar o modal do convite com re-render
        if (S.convite) return;
        raiz.innerHTML = '';
        var painel = document.createElement('div');
        painel.className = 'solari-painel';

        var minhId = window.meuId;
        var souMembro = s.membros.some(function (m) { return m.id === minhId; });
        var souLider = s.liderId === minhId && souMembro;
        var cheio = s.membros.length >= 4;
        var todosOk = s.membros.length > 0 && s.membros.every(function (m) { return m.ok; });

        // Cabeçalho
        var titulo = document.createElement('div');
        titulo.className = 'solari-titulo';
        titulo.innerHTML = '<span>🔮 ARENA DE SOLARI</span>';
        var xBtn = document.createElement('button');
        xBtn.className = 'solari-fechar';
        xBtn.textContent = '✕';
        xBtn.addEventListener('click', fecharPainel);
        titulo.appendChild(xBtn);
        painel.appendChild(titulo);

        var sub = document.createElement('div');
        sub.className = 'solari-sub';
        if (souMembro) {
            if (souLider) sub.innerHTML = 'Você é o <b>líder</b> do grupo. Convide até 4 jogadores e pressione <b>JOGAR</b>.';
            else sub.innerHTML = 'Você entrou no grupo de <b>' + (s.membros[0] ? s.membros[0].nick : '?') + '</b>. Pressione <b>JOGAR</b> para confirmar.';
        } else {
            sub.innerHTML = 'Grupo de recrutamento em andamento. Aguarde um convite do líder ou abra o próprio grupo assim que a arena ficar livre.';
        }
        painel.appendChild(sub);

        // Slots (4)
        var slotsWrap = document.createElement('div');
        for (var i = 0; i < 4; i++) {
            var m = s.membros[i];
            var slot = document.createElement('div');
            slot.className = 'solari-slot' + (m ? '' : ' solari-slot-vago') + (m && m.id === minhId ? ' solari-slot-mim' : '');
            if (m) {
                var info = document.createElement('div');
                info.className = 'solari-slot-info';
                info.innerHTML = '<div class="solari-slot-nome">' + m.nick + (m.id === minhId ? ' <span style="color:#7df09a">(você)</span>' : '') + (m.id === s.liderId ? ' 👑' : '') + '</div>'
                    + '<div class="solari-slot-detalhe">Lv ' + (m.lvl || 1) + ' · ' + classeLabel(m.classe) + (m.ok ? ' · ✅ OK' : ' · ⏳ aguardando') + '</div>';
                slot.appendChild(info);
                if (m.id === minhId) {
                    var btnJogar = document.createElement('button');
                    btnJogar.className = 'solari-jogar ' + (m.ok ? 'solari-jogar-ok' : 'solari-jogar-ver');
                    btnJogar.textContent = m.ok ? 'OK! ✅' : 'JOGAR';
                    btnJogar.addEventListener('click', function () {
                        enviar({ action: 'solari_ok' });
                    });
                    slot.appendChild(btnJogar);
                } else {
                    var tag = document.createElement('div');
                    tag.className = 'solari-jogar ' + (m.ok ? 'solari-jogar-ok' : 'solari-jogar-ver');
                    tag.textContent = m.ok ? 'OK! ✅' : 'JOGAR';
                    slot.appendChild(tag);
                }
            } else {
                var vago = document.createElement('div');
                vago.className = 'solari-slot-info solari-slot-nome';
                vago.textContent = '— VAGO —';
                vago.style.fontSize = '12px';
                slot.appendChild(vago);
            }
            slotsWrap.appendChild(slot);
        }
        painel.appendChild(slotsWrap);

        if (cheio) {
            var avisoCheio = document.createElement('div');
            avisoCheio.className = 'solari-aviso-cheio';
            avisoCheio.textContent = '⚠️ Grupo cheio (máx 4). Convites e lista de jogadores bloqueados.';
            painel.appendChild(avisoCheio);
        }

        // Área de convite — apenas líder
        if (souLider && !cheio) {
            var sec = document.createElement('div');
            sec.className = 'solari-sec';
            var st = document.createElement('div');
            st.className = 'solari-sec-titulo';
            st.textContent = '👥 CONVIDAR JOGADORES PRÓXIMOS';
            sec.appendChild(st);

            var lista = document.createElement('div');
            lista.className = 'solari-lista';
            sec.appendChild(lista);

            var inputRow = document.createElement('div');
            inputRow.style.cssText = 'display:flex;gap:8px;margin-top:8px;';
            var inp = document.createElement('input');
            inp.className = 'solari-input';
            inp.placeholder = 'Digite o nick do jogador...';
            inp.maxLength = 18;
            var btnNick = document.createElement('button');
            btnNick.className = 'solari-convidar-mini';
            btnNick.textContent = 'CONVIDAR';
            btnNick.addEventListener('click', function () {
                var nick = inp.value.trim();
                if (!nick) return;
                enviar({ action: 'solari_convidar_nick', nick: nick });
                inp.value = '';
            });
            inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') btnNick.click(); });
            inputRow.appendChild(inp);
            inputRow.appendChild(btnNick);
            sec.appendChild(inputRow);
            painel.appendChild(sec);

            // Preencher lista de próximos (usando a CHAVE do objeto = id do jogador)
            function preencherProximos() {
                lista.innerHTML = '';
                if (cheio) return;
                var perto = [];
                try {
                    Object.keys(window.todosJogadores || {}).forEach(function (k) {
                        var p = window.todosJogadores[k];
                        if (!p || k === minhId) return; // própio lider: exclui
                        if (p.hp <= 0) return;
                        if (s.membros.some(function (m) { return m.id === k; })) return; // já no grupo
                        if (pertoPortal(p.x, p.y) > 460) return;
                        perto.push({ id: k, x: p.x, y: p.y, nome: p.nome || k, level: p.level || 1 });
                    });
                } catch (e) { }
                perto = perto.slice(0, 8);
                if (!perto.length) {
                    var vazio = document.createElement('div');
                    vazio.className = 'solari-aviso-grupo';
                    vazio.textContent = 'Nenhum jogador por perto do portal roxo.';
                    vazio.style.fontSize = '12px';
                    lista.appendChild(vazio);
                }
                perto.forEach(function (p) {
                    var linha = document.createElement('div');
                    linha.className = 'solari-jogador-linha';
                    linha.innerHTML = '<span class="nome">' + (p.nome || p.id) + '</span><span class="lv">Lv ' + (p.level || 1) + '</span>';
                    var b = document.createElement('button');
                    b.className = 'solari-convidar-mini';
                    b.textContent = 'CONVIDAR';
                    b.addEventListener('click', function () {
                        enviar({ action: 'solari_convidar', alvoId: p.id });
                        b.textContent = '✔';
                        b.disabled = true;
                    });
                    linha.appendChild(b);
                    lista.appendChild(linha);
                });
            }
            preencherProximos();
            S._preencherProximos = preencherProximos;
        }

        // Rodapé: SAIR + START
        var rodape = document.createElement('div');
        rodape.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;margin-top:12px;';
        if (souMembro) {
            var sair = document.createElement('button');
            sair.className = 'solari-botao solari-botao-sair';
            sair.textContent = '🚪 SAIR DA SOLARI';
            sair.addEventListener('click', function () {
                enviar({ action: 'solari_sair' });
                fecharPainel();
            });
            rodape.appendChild(sair);
        }
        var start = document.createElement('button');
        start.className = 'solari-botao solari-botao-start';
        start.textContent = '▶ INICIAR ARENA';
        start.disabled = !(souLider && todosOk);
        if (souMembro) start.title = souLider ? (todosOk ? 'Todos deram OK! Clique para começar.' : 'Aguarde todos darem OK.') : 'Apenas o líder pode iniciar.';
        start.addEventListener('click', function () {
            if (!souLider) return;
            enviar({ action: 'solari_start' });
        });
        rodape.appendChild(start);
        painel.appendChild(rodape);

        raiz.appendChild(painel);
    }

    function abrirPainel() {
        var agora = Date.now();
        if (agora - S.ultimaAbertura < 800) return;
        if (S._bloqueadoAte && agora < S._bloqueadoAte) return;
        S.ultimaAbertura = agora;
        enviar({ action: 'solari_abrir' });
    }

    function fecharPainel() {
        S.painelAberto = false;
        if (raiz) {
            var p = raiz.querySelector('.solari-painel');
            if (p) p.style.display = 'none';
        }
    }

    function mostrarPainelVisivel() {
        S.painelAberto = true;
        if (raiz) {
            var p = raiz.querySelector('.solari-painel');
            if (p) p.style.display = '';
        }
    }

    // ====================== CONVITE MODAL ======================
    function mostrarConvite(deNick, deId) {
        if (S.convite && S.convite.deId === deId) return;
        S.convite = { deId: deId, deNick: deNick };
        raiz.innerHTML = '';
        var modal = document.createElement('div');
        modal.className = 'solari-convite-modal';
        modal.innerHTML = '<div style="font-size:34px;">🔔</div>'
            + '<div style="font-size:20px;font-weight:800;color:#e9d5ff;">CONVITE DA ARENA DE SOLARI</div>'
            + '<div style="margin-top:8px;color:#d8c3f0;font-size:14px;">O jogador <b>' + deNick + '</b> quer que você entre na partida!</div>';
        var botoes = document.createElement('div');
        botoes.className = 'solari-convite-botoes';
        var aceitar = document.createElement('button');
        aceitar.className = 'solari-botao solari-botao-start';
        aceitar.textContent = '✅ ACEITAR';
        aceitar.addEventListener('click', function () {
            enviar({ action: 'solari_aceitar', deId: deId });
            S.convite = null;
            raiz.innerHTML = '';
        });
        var recusar = document.createElement('button');
        recusar.className = 'solari-botao solari-botao-sair';
        recusar.textContent = '❌ RECUSAR';
        recusar.addEventListener('click', function () {
            enviar({ action: 'solari_recusar', deId: deId });
            S.convite = null;
            raiz.innerHTML = '';
        });
        botoes.appendChild(aceitar);
        botoes.appendChild(recusar);
        modal.appendChild(botoes);
        raiz.appendChild(modal);
    }

    // ====================== CONTAGEM / BANNER ======================
    var overlayContagem = null;
    function mostrarContagem(seg, mensagem) {
        raiz.innerHTML = '';
        var ov = document.createElement('div');
        ov.className = 'solari-contagem';
        if (mensagem) {
            var msg = document.createElement('div');
            msg.className = 'solari-transicao-msg';
            msg.textContent = mensagem;
            ov.appendChild(msg);
        }
        if (seg > 0) {
            var num = document.createElement('div');
            num.className = 'solari-numero';
            num.textContent = seg;
            ov.appendChild(num);
        }
        raiz.appendChild(ov);
        overlayContagem = ov;
    }
    function mostrarStart() {
        raiz.innerHTML = '';
        var ov = document.createElement('div');
        ov.className = 'solari-contagem';
        ov.innerHTML = '<div class="solari-start">START</div>';
        raiz.appendChild(ov);
        overlayContagem = ov;
    }
    function limparOverlays() {
        raiz.innerHTML = '';
        overlayContagem = null;
    }

    // ====================== HUD ROUND + BANNER ======================
    var hudRound = null, bannerEl = null;
    function definirRound(r, total) {
        if (hudRound) hudRound.remove();
        hudRound = document.createElement('div');
        hudRound.className = 'solari-round-hud';
        hudRound.textContent = '🔮 ROUND ' + r + '/' + 10 + (total ? ' · Monstros: ' + total : '');
        document.body.appendChild(hudRound);
    }
    function mostrarBanner(texto, cor, fim) {
        if (bannerEl) bannerEl.remove();
        bannerEl = document.createElement('div');
        bannerEl.className = 'solari-banner';
        bannerEl.style.color = cor || '#ffd700';
        bannerEl.textContent = texto;
        if (!fim) {
            setTimeout(function () { if (bannerEl) bannerEl.remove(); bannerEl = null; }, 3600);
        }
        document.body.appendChild(bannerEl);
    }

    // ====================== LEILÃO ======================
    var leilaoEl = null;
    var leilaoTimer = null;
    function mostrarLeilao(dados) {
        raiz.innerHTML = '';
        limparPainelRodape();
        leilaoEl = document.createElement('div');
        leilaoEl.className = 'solari-leilao';
        raiz.appendChild(leilaoEl);
        atualizarLeilao(dados);
    }
    function limparPainelRodape() {
        if (hudRound) { hudRound.remove(); hudRound = null; }
        if (bannerEl) { bannerEl.remove(); bannerEl = null; }
    }
    function atualizarLeilao(dados) {
        if (!leilaoEl) return;
        var item = dados.item;
        var minhId = window.meuId;
        S.leilao = dados;
        var jaRolei = dados.rolagens && dados.rolagens[minhId] !== undefined;

        var html = '';
        var rotulo = (dados.round) ? '🎲 SORTEIO DA RODADA ' + dados.round + (dados.roundsTotal ? '/' + dados.roundsTotal : '') : '🏆 LEILÃO';
        html += '<h3>' + rotulo + '</h3>';
        if (dados.indice && dados.total) html += '<div class="solari-item-detalhe">Item ' + dados.indice + ' de ' + dados.total + '</div>';

        if (dados.fase === 'resultado') {
            var vNick = dados.vencedorNick || '?';
            html += '<div class="solari-item-nome" style="color:' + (item && item.cor ? item.cor : '#fff') + ';">' + (item ? (item.icon ? item.icon + ' ' : '') + item.nome : '(item)') + '</div>';
            html += '<div class="solari-vencedor">' + (dados.doado ? '🎁 DOADO' : '🏅 GANHOU') + ': ' + vNick + '!</div>';
            html += '<div class="solari-item-detalhe">O item foi enviado ao inventário de <b>' + vNick + '</b>.</div>';
            // rolagens finais
            html += montarLinhasRolagem(dados.rolagens, item);
        } else {
            html += '<div class="solari-item-nome" style="color:' + (item && item.cor ? item.cor : '#fff') + ';">' + (item ? (item.icon ? item.icon + ' ' : '') + item.nome : '(item)') + '</div>';
            var bonusTexto = '';
            if (dados.classeBonus && item && item.classe) bonusTexto = '<div class="solari-item-detalhe">🎲 Role 1–100 · quem tirar o MAIOR leva!<br>+20% de chance para a classe: <b>' + classeLabel(item.classe) + '</b></div>';
            else bonusTexto = '<div class="solari-item-detalhe">🎲 Role 1–100 · quem tirar o MAIOR leva!</div>';
            html += bonusTexto;
            html += '<button class="solari-dado" id="solari-botao-dado" ' + (jaRolei ? 'disabled' : '') + '>🎲 ROLAR DADO (1-100)' + (jaRolei ? ' — já rolado!' : '') + '</button>';
            html += montarLinhasRolagem(dados.rolagens, item);
        }

        leilaoEl.innerHTML = html;
        var btnDado = ledar('solari-botao-dado');
        if (btnDado) {
            btnDado.addEventListener('click', function () {
                enviar({ action: 'solari_rolar_dado' });
                btnDado.disabled = true;
                btnDado.textContent = '🎲 A ROLAR...';
            });
        }
    }

    function montarLinhasRolagem(rolagens, item) {
        var s = S.sessao;
        if (!s) return '';
        var linhas = '';
        s.membros.forEach(function (m) {
            var dado = rolagens ? rolagens[m.id] : undefined;
            var bonus = (item && item.classe && m.classe === item.classe) ? ' <span class="solari-roll-bonus">(+20)</span>' : '';
            linhas += '<div class="solari-roll"><b>' + m.nick + '</b>: ' + (dado !== undefined ? dado + bonus : '🎲 aguardando...') + '</div>';
        });
        return '<div class="solari-rolagens">' + linhas + '</div>';
    }

    // ====================== MENSAGENS DO SERVIDOR ======================
    function receberSolariMensagem(dados) {
        if (!dados || !dados.type) return;
        switch (dados.type) {
            case 'solari_painel':
                if (dados.bloqueado) {
                    S._bloqueadoAte = Date.now() + 5000;
                    aviso(dados.mensagem || 'Arena em andamento.');
                    fecharPainel();
                    return;
                }
                S.sessao = dados;
                mostrarPainelVisivel();
                montarPainel();
                break;
            case 'solari_estado':
                S.sessao = dados;
                if (S.painelAberto && dados.fase === 'recrutando') montarPainel();
                else if (!S.painelAberto && dados.fase === 'recrutando') { } // sem painel: nada
                break;
            case 'solari_convite':
                mostrarConvite(dados.deNick, dados.deId);
                break;
            case 'solari_aviso':
                aviso(dados.texto || 'Aviso da Arena.');
                break;
            case 'solari_contagem':
                if (dados.seg === 0) { mostrarStart(); }
                else { mostrarContagem(dados.seg, dados.mensagem || ''); }
                break;
            case 'solari_round':
                limparOverlays();
                if (leilaoEl) { leilaoEl.remove(); leilaoEl = null; }
                if (leilaoTimer) { clearInterval(leilaoTimer); leilaoTimer = null; }
                S.leilao = null;
                definirRound(dados.round, dados.total);
                mostrarBanner('ROUND ' + dados.round, '#ffd700', false);
                break;
            case 'solari_banner':
                if (dados.fim) {
                    limparOverlays();
                    limparPainelRodape();
                    mostrarBanner(dados.texto, dados.cor, true);
                } else {
                    mostrarBanner(dados.texto, dados.cor, false);
                }
                break;
            case 'solari_leilao':
                if (dados.fase === 'abrir') {
                    S.painelAberto = false;
                    if (S.sessao) S.sessao.fase = 'leilao';
                    mostrarLeilao(dados);
                } else if (dados.fase === 'rolagem') {
                    if (leilaoEl) atualizarLeilao(Object.assign({}, S.leilao, { rolagens: dados.rolagens }));
                } else if (dados.fase === 'resultado') {
                    if (leilaoEl) atualizarLeilao(dados);
                }
                break;
            default:
                break;
        }
    }

    // 👉 EXPORTA para o index.html (dispatcher chama window.receberSolariMensagem)
    window.receberSolariMensagem = receberSolariMensagem;

    // ====================== LOOP DE PROXIMIDADE / TIMERS ======================
    var intervalo = null;
    function iniciarLoop() {
        if (intervalo) return;
        intervalo = setInterval(function () {
            if (!window.meuX || !window.meuY) return;
            if (window.solariAtivo) {
                // dentro da arena: timer de morte (20s) + refresco do leilão
                if (estaMorto()) {
                    if (!S.timerMorteAtivo) { S.morteInicio = Date.now(); S.timerMorteAtivo = true; }
                    var passou = Math.floor((Date.now() - S.morteInicio) / 1000);
                    var resto = Math.max(0, 20 - passou);
                    atualizarTimerMorte(resto);
                } else {
                    S.timerMorteAtivo = false;
                    esconderTimerMorte();
                }
                if (S.leilao && S.leilao.indice && leilaoEl) {
                    // nada: contagem visual já ok
                }
                return;
            }
            // Cidade: proximidade do portal roxo
            if (!emCidade() || window.transicaoMapaAtiva) { fecharPainel(); return; }
            var dist = pertoPortal(window.meuX, window.meuY);
            // Abre SOMENTE quando estiver em cima do portal (r=38 → ~70); fecha ao sair (~130)
            if (dist < PORTAL.r + 30) {
                if (!S.painelAberto) abrirPainel();
                if (S._preencherProximos && (!S._ultimaRefresco || Date.now() - S._ultimaRefresco > 800)) {
                    S._ultimaRefresco = Date.now();
                    S._preencherProximos();
                }
            } else if (S.painelAberto && dist > PORTAL.r + 90) {
                fecharPainel();
            }
        }, 230);
    }

    var timerMorteEl = null;
    function atualizarTimerMorte(resto) {
        if (!timerMorteEl || !document.body.contains(timerMorteEl)) {
            timerMorteEl = document.createElement('div');
            timerMorteEl.className = 'solari-morte-timer';
            document.body.appendChild(timerMorteEl);
        }
        if (resto > 0) {
            timerMorteEl.innerHTML = '💀 Você sairá da Arena em <b>' + resto + 's</b><br><span class="solari-countdown-tempo">ou clique em RENASCER para voltar à cidade</span>';
        } else {
            timerMorteEl.innerHTML = '💀 Saindo da Arena...';
        }
    }
    function esconderTimerMorte() {
        if (timerMorteEl && document.body.contains(timerMorteEl)) timerMorteEl.remove();
        timerMorteEl = null;
    }

    // ====================== PORTAL ROXO (desenho + clique) ======================
    window.desenharPortalSolari = function (t) {
        var ctx = window.ctx;
        if (!ctx) return;
        var camX = window.camX || 0, camY = window.camY || 0;
        var cw = ((window.canvas && window.canvas.width) || 900) / (window.cameraZoomAtual || window.ZOOM_CAMERA || 1);
        var ch = ((window.canvas && window.canvas.height) || 600) / (window.cameraZoomAtual || window.ZOOM_CAMERA || 1);
        var px = PORTAL.x, py = PORTAL.y;
        var pulsar = 1 + Math.sin((t || 0) * 3.0) * 0.08;
        var R = PORTAL.r * pulsar + 4;
        if (px + R + 90 < camX || px - R - 90 > camX + cw || py + R + 90 < camY || py - R - 90 > camY + ch) return;

        ctx.save();
        // sombra no chão
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.ellipse(px, py + 12, R * 1.25, R * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();

        // anel externo roxo
        ctx.strokeStyle = '#c77dff';
        ctx.lineWidth = 3.5;
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 24;
        ctx.beginPath();
        ctx.ellipse(px, py, R, R * 0.64, 0, 0, Math.PI * 2);
        ctx.stroke();

        // preenchimento com gradiente roxo
        var grad = ctx.createRadialGradient(px, py, 2, px, py, R);
        grad.addColorStop(0, 'rgba(243, 232, 255, 0.9)');
        grad.addColorStop(0.35, 'rgba(168, 85, 247, 0.65)');
        grad.addColorStop(0.75, 'rgba(91, 33, 182, 0.5)');
        grad.addColorStop(1, 'rgba(20, 8, 40, 0.25)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(px, py, R - 2, (R - 2) * 0.64, 0, 0, Math.PI * 2);
        ctx.fill();

        // espirais giratórias
        ctx.lineWidth = 2.4;
        ctx.shadowBlur = 0;
        for (var i = 0; i < 4; i++) {
            var rot = (t || 0) * 2.0 + (i * Math.PI) / 2;
            ctx.strokeStyle = (i % 2 === 0) ? 'rgba(255,255,255,0.85)' : 'rgba(199, 125, 255, 0.8)';
            ctx.beginPath();
            ctx.ellipse(px, py, (R * 0.72) - i * 5, ((R * 0.72) - i * 5) * 0.64, rot, 0, Math.PI * 0.75);
            ctx.stroke();
        }

        // label
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px Arial';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 10;
        ctx.fillText('ARENA DE SOLARI', px, py - R * 0.64 - 12);
        ctx.fillStyle = '#e3c8ff';
        ctx.font = '11px Arial';
        ctx.fillText('Toque para Recrutar', px, py - R * 0.64 - 1);
        ctx.restore();
    };

    window.tocarPortalSolari = function (mx, my) {
        if (window.currentMap !== 'cidade') return false;
        if (estaMorto() || window.transicaoMapaAtiva) return false;
        var dist = Math.hypot(mx - PORTAL.x, my - PORTAL.y);
        if (dist <= PORTAL.r + 12) {
            abrirPainel();
            return true;
        }
        return false;
    };

    // ====================== MUDANÇA DE MAPA ======================
    window.solariMudouMapa = function (ativo) {
        S.sessao = null;
        S.leilao = null;
        S.convite = null;
        S.painelAberto = false;
        S.timerMorteAtivo = false;
        esconderTimerMorte();
        limparOverlays();
        limparPainelRodape();
        if (leilaoEl) { leilaoEl.remove(); leilaoEl = null; }
        if (!ativo && raiz) raiz.innerHTML = '';
    };

    // ====================== INIT ======================
    function init() {
        injetarEstilo();
        garantirRaiz();
        iniciarLoop();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();