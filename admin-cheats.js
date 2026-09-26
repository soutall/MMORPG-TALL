// =====================================================================
// PAINEL ADMINISTRATIVO — CHEATS DE TESTE (CONTA ADMIN)
// ---------------------------------------------------------------------
// Opções disponíveis:
//   1) Vida Infinita (God Mode)
//   2) Super Ataque (One-Hit Kill / 9.999.999 dano)
//   3) Mana Infinita (Custo zero / MP sempre cheio)
//   4) Sem Cooldown nas Skills (Todas as Classes / Disparo contínuo)
//
// NOTA DE SEGURANÇA:
//   Este sistema é protegido no servidor (ws.ehAdminCliente).
//   Para remover completamente no futuro:
//     1. Deletar este arquivo (admin-cheats.js);
//     2. Remover <script src="admin-cheats.js"> em index.html;
//     3. Remover o bloco demarcado em server.js.
// =====================================================================

(function () {
    'use strict';

    window.adminCheats = {
        vidaInfinita: false,
        superAtaque: false,
        manaInfinita: false,
        semCooldown: false
    };

    let painelInjetado = false;

    // ---------- INJEÇÃO DE ESTILOS CSS DO PAINEL ----------
    function injetarEstilos() {
        if (document.getElementById('admin-cheats-style')) return;
        const style = document.createElement('style');
        style.id = 'admin-cheats-style';
        style.textContent = `
            #admin-cheats-window {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 360px;
                max-width: 92vw;
                background: linear-gradient(180deg, #1e130c 0%, #120a06 100%);
                border: 2px solid #f39c12;
                border-radius: 12px;
                box-shadow: 0 0 25px rgba(243, 156, 18, 0.45), 0 10px 40px rgba(0, 0, 0, 0.85);
                color: #f1c40f;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                z-index: 100000;
                display: none;
                flex-direction: column;
                overflow: hidden;
                user-select: none;
            }
            .ac-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 12px 16px;
                background: linear-gradient(90deg, #2c1a0e, #3d2314);
                border-bottom: 1px solid rgba(243, 156, 18, 0.35);
            }
            .ac-title {
                font-size: 15px;
                font-weight: bold;
                letter-spacing: 0.5px;
                display: flex;
                align-items: center;
                gap: 8px;
                color: #ffd700;
                text-shadow: 0 0 8px rgba(255, 215, 0, 0.5);
            }
            .ac-close {
                background: rgba(231, 76, 60, 0.25);
                border: 1px solid #e74c3c;
                color: #fff;
                width: 28px;
                height: 28px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: 0.2s;
            }
            .ac-close:hover {
                background: #e74c3c;
            }
            .ac-body {
                padding: 16px;
                display: flex;
                flex-direction: column;
                gap: 12px;
                max-height: 70vh;
                overflow-y: auto;
            }
            .ac-card {
                display: flex;
                align-items: center;
                justify-content: space-between;
                background: rgba(0, 0, 0, 0.45);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                padding: 10px 14px;
                transition: border-color 0.2s;
            }
            .ac-card.active {
                border-color: #2ecc71;
                background: rgba(46, 204, 113, 0.12);
            }
            .ac-info {
                display: flex;
                flex-direction: column;
                gap: 2px;
            }
            .ac-label {
                font-size: 14px;
                font-weight: bold;
                color: #ecf0f1;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .ac-desc {
                font-size: 11px;
                color: #bdc3c7;
                opacity: 0.85;
            }
            .ac-toggle {
                position: relative;
                width: 48px;
                height: 26px;
                background: #333;
                border-radius: 13px;
                cursor: pointer;
                transition: background 0.25s;
                flex-shrink: 0;
                border: 1px solid rgba(255, 255, 255, 0.2);
            }
            .ac-toggle.on {
                background: #2ecc71;
                border-color: #27ae60;
                box-shadow: 0 0 10px rgba(46, 204, 113, 0.5);
            }
            .ac-toggle::after {
                content: '';
                position: absolute;
                top: 2px;
                left: 2px;
                width: 20px;
                height: 20px;
                background: #fff;
                border-radius: 50%;
                transition: transform 0.25s;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
            }
            .ac-toggle.on::after {
                transform: translateX(22px);
            }
            .ac-footer {
                display: flex;
                gap: 8px;
                padding: 12px 16px;
                background: rgba(0, 0, 0, 0.3);
                border-top: 1px solid rgba(255, 255, 255, 0.08);
            }
            .ac-btn {
                flex: 1;
                padding: 8px 10px;
                border-radius: 6px;
                border: 1px solid;
                font-size: 12px;
                font-weight: bold;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                transition: 0.2s;
            }
            .ac-btn-on {
                background: rgba(46, 204, 113, 0.25);
                border-color: #2ecc71;
                color: #2ecc71;
            }
            .ac-btn-on:hover {
                background: #2ecc71;
                color: #fff;
            }
            .ac-btn-off {
                background: rgba(231, 76, 60, 0.25);
                border-color: #e74c3c;
                color: #e74c3c;
            }
            .ac-btn-off:hover {
                background: #e74c3c;
                color: #fff;
            }
            .btn-admin-cheats {
                background: linear-gradient(135deg, #f39c12, #d35400) !important;
                border: 2px solid #f1c40f !important;
                color: #fff !important;
                box-shadow: 0 0 10px rgba(241, 196, 15, 0.5) !important;
            }
            .btn-admin-cheats:hover {
                transform: scale(1.08);
                box-shadow: 0 0 16px rgba(241, 196, 15, 0.8) !important;
            }
        `;
        document.head.appendChild(style);
    }

    // ---------- INJEÇÃO DA JANELA MODAL DO PAINEL ----------
    function injetarPainel() {
        if (painelInjetado || document.getElementById('admin-cheats-window')) return;
        injetarEstilos();

        const div = document.createElement('div');
        div.id = 'admin-cheats-window';
        div.setAttribute('data-ui', 'true');
        div.innerHTML = `
            <div class="ac-header">
                <div class="ac-title">👑 PAINEL ADMIN (CHEATS)</div>
                <button class="ac-close" onclick="window.toggleAdminCheats()">✕</button>
            </div>
            <div class="ac-body">
                <div class="ac-card" id="ac-card-vida">
                    <div class="ac-info">
                        <div class="ac-label">❤️ Vida Infinita</div>
                        <div class="ac-desc">Imunidade total a danos de monstros, bosses e PvP.</div>
                    </div>
                    <div class="ac-toggle" id="ac-toggle-vida" onclick="window.toggleAdminCheat('vidaInfinita')"></div>
                </div>

                <div class="ac-card" id="ac-card-ataque">
                    <div class="ac-info">
                        <div class="ac-label">💥 Super Ataque</div>
                        <div class="ac-desc">Causa 9.999.999 de dano (One-Hit Kill).</div>
                    </div>
                    <div class="ac-toggle" id="ac-toggle-ataque" onclick="window.toggleAdminCheat('superAtaque')"></div>
                </div>

                <div class="ac-card" id="ac-card-mana">
                    <div class="ac-info">
                        <div class="ac-label">💧 Mana Infinita</div>
                        <div class="ac-desc">Custo de MP zerado e mana sempre no máximo.</div>
                    </div>
                    <div class="ac-toggle" id="ac-toggle-mana" onclick="window.toggleAdminCheat('manaInfinita')"></div>
                </div>

                <div class="ac-card" id="ac-card-cooldown">
                    <div class="ac-info">
                        <div class="ac-label">⚡ Sem Cooldown (All)</div>
                        <div class="ac-desc">Tempo de recarga zerado em todas as skills de todas as classes.</div>
                    </div>
                    <div class="ac-toggle" id="ac-toggle-cooldown" onclick="window.toggleAdminCheat('semCooldown')"></div>
                </div>
            </div>
            <div class="ac-footer">
                <button class="ac-btn ac-btn-on" onclick="window.setTodosAdminCheats(true)">⚡ Ativar Todos</button>
                <button class="ac-btn ac-btn-off" onclick="window.setTodosAdminCheats(false)">✕ Desativar Todos</button>
            </div>
        `;
        document.body.appendChild(div);
        painelInjetado = true;
    }

    // ---------- ABRIR / FECHAR PAINEL ----------
    window.toggleAdminCheats = function () {
        if (!window.ehAdmin) return;
        injetarPainel();
        const win = document.getElementById('admin-cheats-window');
        if (!win) return;
        const estaAberto = win.style.display === 'flex';
        win.style.display = estaAberto ? 'none' : 'flex';
        if (!estaAberto) {
            atualizarVisualSwitches();
        }
    };

    // ---------- ATUALIZAÇÃO VISUAL DOS SWITCHES ----------
    function atualizarVisualSwitches() {
        const mapa = {
            vidaInfinita: { card: 'ac-card-vida', toggle: 'ac-toggle-vida' },
            superAtaque: { card: 'ac-card-ataque', toggle: 'ac-toggle-ataque' },
            manaInfinita: { card: 'ac-card-mana', toggle: 'ac-toggle-mana' },
            semCooldown: { card: 'ac-card-cooldown', toggle: 'ac-toggle-cooldown' }
        };

        for (let chave in mapa) {
            const ativo = !!window.adminCheats[chave];
            const cEl = document.getElementById(mapa[chave].card);
            const tEl = document.getElementById(mapa[chave].toggle);
            if (cEl) {
                if (ativo) cEl.classList.add('active'); else cEl.classList.remove('active');
            }
            if (tEl) {
                if (ativo) tEl.classList.add('on'); else tEl.classList.remove('on');
            }
        }
    }

    // ---------- SINCRONIZAÇÃO COM O SERVIDOR VIA WEBSOCKET ----------
    function sincronizarComServidor() {
        if (window.ws && window.ws.readyState === WebSocket.OPEN) {
            window.ws.send(JSON.stringify({
                action: 'admin_cheats_toggle',
                cheats: window.adminCheats
            }));
        }
    }

    // ---------- ALTERNAR UM CHEAT INDIVIDUAL ----------
    window.toggleAdminCheat = function (chave) {
        if (!window.ehAdmin) return;
        window.adminCheats[chave] = !window.adminCheats[chave];
        atualizarVisualSwitches();
        sincronizarComServidor();

        const nomes = {
            vidaInfinita: '❤️ Vida Infinita',
            superAtaque: '💥 Super Ataque',
            manaInfinita: '💧 Mana Infinita',
            semCooldown: '⚡ Sem Cooldown'
        };
        const status = window.adminCheats[chave] ? 'ATIVADO' : 'DESATIVADO';
        const cor = window.adminCheats[chave] ? '#2ecc71' : '#e74c3c';

        if (window.floatingTexts) {
            window.floatingTexts.push({
                x: (window.meuX || 0) + 12,
                y: (window.meuY || 0) - 40,
                text: `${nomes[chave]}: ${status}`,
                color: cor,
                alpha: 1.0
            });
        }
    };

    // ---------- ATIVAR / DESATIVAR TODOS ----------
    window.setTodosAdminCheats = function (ativar) {
        if (!window.ehAdmin) return;
        window.adminCheats.vidaInfinita = !!ativar;
        window.adminCheats.superAtaque = !!ativar;
        window.adminCheats.manaInfinita = !!ativar;
        window.adminCheats.semCooldown = !!ativar;
        atualizarVisualSwitches();
        sincronizarComServidor();

        if (window.floatingTexts) {
            window.floatingTexts.push({
                x: (window.meuX || 0) + 12,
                y: (window.meuY || 0) - 40,
                text: ativar ? '👑 TODOS CHEATS ATIVADOS!' : '👑 CHEATS DESATIVADOS!',
                color: ativar ? '#2ecc71' : '#e74c3c',
                alpha: 1.0
            });
        }
    };

    // ---------- LIMPEZA AGRESSIVA DE COOLDOWNS LOCAIS ----------
    function limparTodosCooldownsLocais() {
        // 1) Array global de skills canceláveis de index.html
        if (typeof window.cancelarCooldownVisual === 'function' && Array.isArray(window.ACOES_SKILL_CANCELAVEIS)) {
            for (let s of window.ACOES_SKILL_CANCELAVEIS) {
                window.cancelarCooldownVisual(s);
            }
        }

        // 2) Remove classe .cooldown e dataset de todos os botões de ação
        const botoes = document.querySelectorAll('.btn-action.cooldown, .btn-action[data-cd-until]');
        for (let b of botoes) {
            b.classList.remove('cooldown');
            b.dataset.cdUntil = '';
        }

        // 3) Reseta todas as variáveis de cooldown conhecidas no client
        window.cdGuerreiroEscudo = false;
        window.cdMagoBola = false;
        window.cdArcanoBuraco = false;
        window.cdBarbaroVinculo = false;
        window.cdSummonerGolem = false;
        window.cdArqueiroSalto = false;
        window.cdCurandeiroCantico = false;
        window.meteoroCooldownAtivo = false;
        window.nevascaCooldownAtivo = false;
        window.vulcaoCooldownAtivo = false;
        window.chuvaCooldownAtivo = false;
        window.perfuranteCooldownAtivo = false;
        window.arqueiroRajadaCooldown = false;
        window.curaCooldownAtivo = false;
        window.julgamentoCooldownAtivo = false;
        window.auraSagradaCooldown = false;
        window.furiaCooldownAtivo = false;
        window.esmagamentoCooldownAtivo = false;
        window.giroDescontroladoCooldownAtivo = false;
        window.roqueiroBateriaCooldown = false;
        window.roqueiroTeleporteCooldown = false;
        window.roqueiroBandaCooldown = false;
        window.roqueiroGritoGuerraCooldown = false;
        window.ladinoDancaCooldown = false;
        window.ladinoBombaCooldown = false;
        window.ladinoCamuflagemCooldown = false;
        window.ladinoEstrelaCooldown = false;
        window.ogroSkillCooldown = false;
        window.ogroSaltoCooldown = false;
        window.ogroColossalCooldown = false;
        window.dashCooldownAtivo = false;
        window.tornadoCooldownAtivo = false;
        window.provocacaoCooldownAtivo = false;
        window.dmSupressaoCooldown = false;
        window.dmAssaltoCooldown = false;
        window.dmCaixaCooldown = false;
        window.dmTitaCooldown = false;
        window.arcanoCometasCooldown = false;
        window.arcanoOrbeCooldown = false;
        window.arcanoCascataCooldown = false;
        window.sniperAimCooldown = false;
        window.sniperRedeCooldown = false;
        window.sniperPosicaoCooldown = false;
        window.giroPikemanCooldown = false;
        window.piruetaPikemanCooldown = false;
        window.geadaPikemanCooldown = false;
        window.execucaoPikemanCooldown = false;
    }

    // ---------- LOOP DE SUPORTE EM TEMPO REAL ----------
    setInterval(function () {
        if (!window.ehAdmin) return;

        // Sem Cooldown
        if (window.adminCheats.semCooldown) {
            limparTodosCooldownsLocais();
        }

        // Mana Infinita
        if (window.adminCheats.manaInfinita) {
            if (window.meuMaxMp) window.meuMp = window.meuMaxMp;
            if (typeof window.atualizarHudMp === 'function') window.atualizarHudMp();
        }

        // Vida Infinita
        if (window.adminCheats.vidaInfinita) {
            if (window.meuMaxHp) window.meuHp = window.meuMaxHp;
            if (typeof window.atualizarHudHp === 'function') window.atualizarHudHp();
        }
    }, 80);

    // ---------- ATALHO DE TECLADO (F2) ----------
    window.addEventListener('keydown', function (e) {
        if (e.key === 'F2') {
            e.preventDefault();
            window.toggleAdminCheats();
        }
    });

    // ---------- RESPOSTAS DO SERVIDOR ----------
    window.vfxListeners = window.vfxListeners || [];
    window.vfxListeners.push(function (dados) {
        if (dados.type === 'admin_cheats_sync' && dados.cheats) {
            window.adminCheats = Object.assign(window.adminCheats, dados.cheats);
            atualizarVisualSwitches();
        }
    });

    // Inicialização da interface
    window.mostrarBotaoAdminCheats = function () {
        injetarPainel();
        const btn = document.getElementById('btn-admin-cheats');
        if (btn) btn.style.display = 'flex';
    };

})();
