/**
 * skill_tree_ui.js — Interface do Usuário da Árvore de Upgrades de Habilidades
 * Compatível com PC (mouse/teclado) e Mobile (touch)
 */
(function() {
    'use strict';

    window.skillUpgrades = window.skillUpgrades || {};
    window.skillTreeAbertaId = null;

    /**
     * Retorna a quantidade de pontos de upgrade gastos pelo jogador
     */
    function obterPontosGastos() {
        if (typeof SkillUpgradeTree !== 'undefined' && SkillUpgradeTree.calcularPontosUpgradeGastos) {
            return SkillUpgradeTree.calcularPontosUpgradeGastos(window.skillUpgrades);
        }
        return 0;
    }

    /**
     * Retorna a quantidade de pontos de upgrade disponíveis
     */
    function obterPontosDisponiveis() {
        if (typeof SkillUpgradeTree !== 'undefined' && SkillUpgradeTree.calcularPontosUpgradeDisponiveis) {
            const lvl = (typeof window.meuNivel === 'number') ? window.meuNivel : 1;
            return SkillUpgradeTree.calcularPontosUpgradeDisponiveis(lvl, window.skillUpgrades);
        }
        return 0;
    }

    /**
     * Retorna a quantidade de upgrades adquiridos em uma skill (0 a 4)
     */
    function obterQtdUpgradesSkill(skillId) {
        if (!window.skillUpgrades || !window.skillUpgrades[skillId]) return 0;
        const info = window.skillUpgrades[skillId];
        if (Array.isArray(info.choices)) return info.choices.length;
        if (typeof info.purchased === 'number') return info.purchased;
        return 0;
    }

    /**
     * Retorna string de pips para a skill (ex: "●●○○")
     */
    function obterPipsSkill(skillId) {
        const qtd = obterQtdUpgradesSkill(skillId);
        let str = '';
        for (let i = 0; i < 4; i++) {
            str += (i < qtd) ? '●' : '○';
        }
        return str;
    }

    /**
     * Verifica se a skill pode receber um upgrade agora (tem ponto disponível + nível suficiente pro próximo tier)
     */
    function podeReceberUpgrade(skillId) {
        const classe = window.minhaClasse || 'summoner';
        if (typeof SkillUpgradeTree === 'undefined') return false;
        const participantes = SkillUpgradeTree.obterSkillsParticipantes(classe);
        if (!participantes.includes(skillId)) return false;

        const qtd = obterQtdUpgradesSkill(skillId);
        if (qtd >= 4) return false;

        const pts = obterPontosDisponiveis();
        if (pts <= 0) return false;

        const proxTier = qtd + 1;
        const lvlReq = SkillUpgradeTree.TIER_LEVEL_REQUIREMENTS[proxTier] || (proxTier * 10);
        const lvlChar = (typeof window.meuNivel === 'number') ? window.meuNivel : 1;

        return lvlChar >= lvlReq;
    }

    /**
     * Cria o elemento DOM do modal se ainda não existir
     */
    function garantirModalNoDom() {
        let modal = document.getElementById('skill-tree-modal');
        if (modal) return modal;

        modal = document.createElement('div');
        modal.id = 'skill-tree-modal';
        modal.className = 'skill-tree-overlay';
        modal.innerHTML = `
            <div class="skill-tree-window">
                <div class="skill-tree-header">
                    <div class="skill-tree-title-wrap">
                        <span class="skill-tree-icon-title">🌳</span>
                        <div class="skill-tree-heading">
                            <h2 class="skill-tree-title">ÁRVORE DE HABILIDADE</h2>
                            <div class="skill-tree-subtitle" id="st-skill-subtitulo">CARREGANDO...</div>
                        </div>
                    </div>
                    <div class="skill-tree-header-right">
                        <div id="st-admin-lvl-tools" style="display:none; align-items:center; gap:6px; margin-right:8px;">
                            <button class="st-admin-lvl-btn" onclick="window.adminSubirNivel(1)" title="Subir +1 Nível (Admin)">👑 +1 LVL</button>
                            <button class="st-admin-lvl-btn" onclick="window.adminSubirNivel(10)" title="Subir +10 Níveis (Admin)" style="background: rgba(155, 89, 182, 0.45); border-color:#9b59b6; color:#e8daef;">🌟 +10 LVL</button>
                        </div>
                        <div class="st-pts-badge" id="st-pts-badge">
                            <span class="st-pts-icon">✦</span>
                            <span>Pontos disponíveis: <b id="st-pts-val">0</b></span>
                        </div>
                        <button class="st-btn-fechar" onclick="fecharSkillTreeModal()" title="Fechar">✕</button>
                    </div>
                </div>

                <div class="skill-tree-body" id="st-tiers-container">
                    <!-- Tiers gerados dinamicamente -->
                </div>

                <div class="skill-tree-footer">
                    <button class="st-btn-reset" onclick="resetarSkillUpgrades()" title="Redefine todos os upgrades gastos e devolve os pontos">
                        ↺ RESETAR ÁRVORE DE UPGRADES
                    </button>
                    <span class="st-footer-aviso">💡 Cada Tier requer 1 ponto. Escolher um caminho bloqueia o oposto permanentemente (até resetar).</span>
                    <button class="st-btn-concluir" onclick="fecharSkillTreeModal()">CONCLUIR</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.addEventListener('click', function(e) {
            if (e.target === modal) fecharSkillTreeModal();
        });

        return modal;
    }

    /**
     * Abre a Árvore de Upgrades para uma habilidade específica
     */
    function abrirSkillTreeModal(skillId) {
        window.skillTreeAbertaId = skillId;
        const modal = garantirModalNoDom();
        modal.style.display = 'flex';
        renderizarConteudoArvore(skillId);
    }

    /**
     * Fecha o modal da Árvore de Upgrades
     */
    function fecharSkillTreeModal() {
        const modal = document.getElementById('skill-tree-modal');
        if (modal) modal.style.display = 'none';
        window.skillTreeAbertaId = null;
        if (typeof renderizarSkills === 'function' && window.skillsAberto) {
            renderizarSkills();
        }
    }

    /**
     * Renderiza o conteúdo dos Tiers com a regra de Revelação Progressiva (Enigma)
     */
    function renderizarConteudoArvore(skillId) {
        if (!skillId) skillId = window.skillTreeAbertaId;
        if (!skillId) return;

        const classe = window.minhaClasse || 'summoner';
        const lvl = (typeof window.meuNivel === 'number') ? window.meuNivel : 1;

        if (typeof SkillUpgradeTree === 'undefined') return;
        const visao = SkillUpgradeTree.gerarVisaoCliente(classe, skillId, lvl, window.skillUpgrades);
        if (!visao) return;

        // Atualiza cabeçalho
        const sub = document.getElementById('st-skill-subtitulo');
        if (sub) {
            sub.innerHTML = `${visao.icon} <b>${visao.nome.toUpperCase()}</b> &nbsp;·&nbsp; Upgrades: <span class="st-pips-txt">${obterPipsSkill(skillId)}</span> (${visao.purchased}/4)`;
        }

        const ptsBadge = document.getElementById('st-pts-val');
        if (ptsBadge) {
            ptsBadge.innerText = visao.pontosDisponiveis;
        }

        const adminTools = document.getElementById('st-admin-lvl-tools');
        if (adminTools) {
            adminTools.style.display = (window.ehAdmin) ? 'flex' : 'none';
        }

        // Renderiza tiers
        const container = document.getElementById('st-tiers-container');
        if (!container) return;
        container.innerHTML = '';

        visao.tiers.forEach((tData, idx) => {
            const tierNum = tData.tier;
            const tierEl = document.createElement('div');
            tierEl.className = `st-tier-block st-tier-${tData.status}`;

            // Indicador de seta de conexão entre tiers
            if (idx > 0) {
                const seta = document.createElement('div');
                seta.className = 'st-tier-connector';
                seta.innerHTML = '<span class="st-connector-line"></span><span class="st-connector-arrow">▼</span>';
                container.appendChild(seta);
            }

            // Cabeçalho do Tier
            let statusBadge = '';
            if (tData.status === 'adquirido') {
                statusBadge = `<span class="st-status-badge adquirido">✓ ADQUIRIDO (CAMINHO ${tData.escolha})</span>`;
            } else if (tData.status === 'disponivel') {
                statusBadge = `<span class="st-status-badge disponivel">✦ ESCOLHA SEU CAMINHO</span>`;
            } else if (tData.status === 'sem_pontos') {
                statusBadge = `<span class="st-status-badge sem-pontos">⚠️ SEM PONTOS DISPONÍVEIS</span>`;
            } else if (tData.status === 'nivel_bloqueado') {
                statusBadge = `<span class="st-status-badge bloqueado">🔒 REQUER NÍVEL ${tData.nivelRequerido}</span>`;
            } else {
                statusBadge = `<span class="st-status-badge oculto">🔒 BLOQUEADO</span>`;
            }

            let tierHeaderHtml = `
                <div class="st-tier-header">
                    <div class="st-tier-num">UPGRADE ${tierNum} <span class="st-tier-lvl">· NÍVEL ${tData.nivelRequerido}</span></div>
                    ${statusBadge}
                </div>
            `;

            // Corpo do Tier
            let tierCorpoHtml = '';

            if (tData.enigma) {
                // Tier Futuro Oculto (Enigma)
                tierCorpoHtml = `
                    <div class="st-enigma-box">
                        <div class="st-enigma-lock">🔒</div>
                        <div class="st-enigma-title">??? CAMADA ENIGMÁTICA OCULTA ???</div>
                        <div class="st-enigma-desc">${tData.subtexto || 'Adquira o Upgrade anterior para desvendar este ramo ancestral.'}</div>
                    </div>
                `;
            } else {
                // Tier Revelado (Adquirido ou Disponível para Escolha)
                const a = tData.A;
                const b = tData.B;

                const cardAClass = `st-branch-card ${a.selecionado ? 'selecionado' : ''} ${a.bloqueado ? 'bloqueado' : ''}`;
                const cardBClass = `st-branch-card ${b.selecionado ? 'selecionado' : ''} ${b.bloqueado ? 'bloqueado' : ''}`;

                let btnAHtml = '';
                let btnBHtml = '';

                if (tData.status === 'adquirido') {
                    btnAHtml = a.selecionado ? '<div class="st-tag-escolhido">✓ ESCOLHIDO</div>' : '<div class="st-tag-bloqueado">🔒 BLOQUEADO</div>';
                    btnBHtml = b.selecionado ? '<div class="st-tag-escolhido">✓ ESCOLHIDO</div>' : '<div class="st-tag-bloqueado">🔒 BLOQUEADO</div>';
                } else if (tData.podeComprar) {
                    btnAHtml = `<button class="st-btn-escolher" onclick="comprarSkillUpgrade('${skillId}', ${tierNum}, 'A')">ESCOLHER CAMINHO A</button>`;
                    btnBHtml = `<button class="st-btn-escolher" onclick="comprarSkillUpgrade('${skillId}', ${tierNum}, 'B')">ESCOLHER CAMINHO B</button>`;
                } else {
                    const motivo = tData.faltaNivel ? `Requer Nv ${tData.nivelRequerido}` : 'Sem Pontos';
                    btnAHtml = `<button class="st-btn-escolher disabled" disabled>${motivo}</button>`;
                    btnBHtml = `<button class="st-btn-escolher disabled" disabled>${motivo}</button>`;
                }

                tierCorpoHtml = `
                    <div class="st-branches-row">
                        <!-- CAMINHO A -->
                        <div class="${cardAClass}">
                            <div class="st-branch-label">CAMINHO A</div>
                            <div class="st-branch-head">
                                <span class="st-branch-icon">${a.icone}</span>
                                <div>
                                    <div class="st-branch-nome">${a.nome}</div>
                                    <div class="st-branch-cat">${a.categoria}</div>
                                </div>
                            </div>
                            <div class="st-branch-desc">${a.desc}</div>
                            <div class="st-branch-efeito"><b>Efeito:</b> ${a.efeito}</div>
                            ${btnAHtml}
                        </div>

                        <div class="st-branches-vs">OU</div>

                        <!-- CAMINHO B -->
                        <div class="${cardBClass}">
                            <div class="st-branch-label">CAMINHO B</div>
                            <div class="st-branch-head">
                                <span class="st-branch-icon">${b.icone}</span>
                                <div>
                                    <div class="st-branch-nome">${b.nome}</div>
                                    <div class="st-branch-cat">${b.categoria}</div>
                                </div>
                            </div>
                            <div class="st-branch-desc">${b.desc}</div>
                            <div class="st-branch-efeito"><b>Efeito:</b> ${b.efeito}</div>
                            ${btnBHtml}
                        </div>
                    </div>
                `;
            }

            tierEl.innerHTML = tierHeaderHtml + tierCorpoHtml;
            container.appendChild(tierEl);
        });
    }

    /**
     * Envia solicitação de compra de upgrade para o servidor
     */
    function comprarSkillUpgrade(skillId, tier, branch) {
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        ws.send(JSON.stringify({
            action: 'comprar_upgrade_skill',
            skillId: skillId,
            tier: tier,
            branch: branch
        }));
    }

    /**
     * Solicita o reset gratuito da árvore de upgrades com confirmação
     */
    function resetarSkillUpgrades() {
        const confirmar = window.confirm('Deseja realmente resetar toda a Árvore de Upgrades?\n\nTodos os pontos gastos serão recuperados e você poderá redistribuí-los livremente.');
        if (!confirmar) return;

        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                action: 'resetar_upgrades_skills'
            }));
        }
    }

    /**
     * Atualiza a UI da árvore se estiver aberta
     */
    function atualizarSkillTreeUi() {
        if (window.skillTreeAbertaId) {
            renderizarConteudoArvore(window.skillTreeAbertaId);
        }
    }

    // Exposição global
    window.abrirSkillTreeModal = abrirSkillTreeModal;
    window.fecharSkillTreeModal = fecharSkillTreeModal;
    window.comprarSkillUpgrade = comprarSkillUpgrade;
    window.resetarSkillUpgrades = resetarSkillUpgrades;
    window.obterQtdUpgradesSkill = obterQtdUpgradesSkill;
    window.obterPipsSkill = obterPipsSkill;
    window.podeReceberUpgrade = podeReceberUpgrade;
    window.obterPontosDisponiveis = obterPontosDisponiveis;
    window.renderizarConteudoArvore = renderizarConteudoArvore;
    window.atualizarSkillTreeUi = atualizarSkillTreeUi;
})();
