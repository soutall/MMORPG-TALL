/* ===== INTERFACE DE SKILLS (detalhes completos + upgrade no servidor) =====
   Upgrade é validado no servidor (server.js): gasta 1 ponto de habilidade por
   nível, dano/cura +25%/nível e custo de mana +6%/nível. skills.js só mostra. */

window.skillsAberto = false;
window.skillsNiveis = {}; // chave: skillId -> nivel (1..10), sincronizado com o servidor

const NIVEL_SKILL_MAX = 10;

const SKILLS_INFO = {
    guerreiro: [
        { id: 'corte', nome: 'Corte', icon: '⚔️', categoria: 'ataque',
          desc: 'Golpe de espada em cone à frente do herói.',
          danoBase: 12, danoUnidade: 'físico', danoNota: null,
          mp: 0, cd: 0.35, escala: 'dano',
          area: 'Cone frontal (66px)', alcance: 'Corpo a corpo',
          duracao: null, duracaoBase: null, extras: [] },
        { id: 'dash', nome: 'Dash Atingente', icon: '💨', categoria: 'mobilidade',
          desc: 'Investida rápida de 160px que derruba inimigos no caminho.',
          danoBase: 20, danoUnidade: 'físico', danoNota: '+ Stun 2s',
          mp: 15, cd: 4, escala: 'dano',
          area: 'Explosão raio 65', alcance: 'Teleporte 160px',
          duracao: null, duracaoBase: null, extras: [] },
        { id: 'tornado', nome: 'Tornado de Espada', icon: '🌪️', categoria: 'aoe',
          desc: 'Gira a espada criando um redemoinho de corte ao redor.',
          danoBase: 25, danoUnidade: 'físico', danoNota: null,
          mp: 20, cd: 5, escala: 'dano',
          area: 'Raio 100', alcance: 'Ao redor',
          duracao: null, duracaoBase: null, extras: [] },
        { id: 'bloqueio', nome: 'Escudo (Passiva)', icon: '🛡️', categoria: 'passiva',
          desc: 'Bloqueio frontal que anula o dano recebido.',
          danoBase: 0, danoUnidade: null, danoNota: null,
          mp: 0, cd: null, escala: 'nenhum',
          area: 'Frontal', alcance: '—',
          duracao: null, duracaoBase: null, extras: ['Requer 15 de estamina', 'Gasta 20 de estamina'] }
    ],
    mago: [
        { id: 'magia', nome: 'Bola de Magia', icon: '🔮', categoria: 'ataque',
          desc: 'Projétil mágico básico que persegue em linha reta.',
          danoBase: 15, danoUnidade: 'mágico', danoNota: null,
          mp: 0, cd: 0.3, escala: 'dano',
          area: 'Projétil', alcance: 'Vel. 10',
          duracao: null, duracaoBase: null, extras: [] },
        { id: 'meteoro', nome: 'Meteoro', icon: '☄️', categoria: 'aoe',
          desc: 'Invoca um meteoro no ponto marcado após 0.6s de atraso.',
          danoBase: 25, danoUnidade: 'mágico', danoNota: null,
          mp: 30, cd: 7, escala: 'dano',
          area: 'Raio 85', alcance: 'Mira 160px',
          duracao: null, duracaoBase: null, extras: ['Atraso 0.6s'] },
        { id: 'nevasca', nome: 'Nevasca', icon: '❄️', categoria: 'zona',
          desc: 'Zona de gelo contínua que congela lentamente quem entra.',
          danoBase: 6, danoUnidade: 'mágico', danoNota: '/s por 24s',
          mp: 35, cd: 12, escala: 'dano',
          area: 'Raio 115', alcance: 'Mira 160px',
          duracao: '24s', duracaoBase: null, extras: ['Lentidão 50% (0.75s)'] }
    ],
    summoner: [
        { id: 'orbe', nome: 'Orbe das Sombras', icon: '👁️', categoria: 'ataque',
          desc: 'Orbe arremessado pelo invocador.',
          danoBase: 6, danoUnidade: 'mágico', danoNota: null,
          mp: 0, cd: 0.3, escala: 'dano',
          area: 'Projétil', alcance: 'Vel. 10',
          duracao: null, duracaoBase: null, extras: [] },
        { id: 'ogro', nome: 'Ogro Guardião (Passiva)', icon: '🦍', categoria: 'invocacao',
          desc: 'Pet permanente que persegue e golpeia os inimigos.',
          danoBase: 15, danoUnidade: 'físico', danoNota: ' a cada 2s',
          mp: 0, cd: null, escala: 'dano',
          area: 'Corpo a corpo', alcance: 'Persegue o alvo',
          duracao: null, duracaoBase: null, extras: ['Vida 90 do ogro'] },
        { id: 'esmagamento', nome: 'Esmagamento Sísmico', icon: '💥', categoria: 'aoe',
          desc: 'Comando o ogro a bater o chão, danificando ao redor dele.',
          danoBase: 45, danoUnidade: 'físico', danoNota: '+ Stun 1.5s',
          mp: 25, cd: 6, escala: 'dano',
          area: 'Raio 100 (no ogro)', alcance: 'Via pet',
          duracao: null, duracaoBase: null, extras: ['Ogro agressivo 7s'] },
        { id: 'salto', nome: 'Salto do Ogro', icon: '🦘', categoria: 'mobilidade',
          desc: 'O ogro salta em arco sobre o inimigo mais próximo.',
          danoBase: 35, danoUnidade: 'físico', danoNota: '+ Stun 0.5s',
          mp: 20, cd: 8, escala: 'dano',
          area: 'Impacto raio 70', alcance: 'Alvo até 350px',
          duracao: null, duracaoBase: null, extras: [] }
    ],
    arqueiro: [
        { id: 'flecha', nome: 'Flecha Precisa', icon: '🏹', categoria: 'ataque',
          desc: 'Disparo rápido de flecha.',
          danoBase: 18, danoUnidade: 'físico', danoNota: null,
          mp: 0, cd: 0.3, escala: 'dano',
          area: 'Projétil', alcance: 'Vel. 14',
          duracao: null, duracaoBase: null, extras: [] },
        { id: 'chuva', nome: 'Chuva de Flechas', icon: '🌧️', categoria: 'zona',
          desc: 'Chuva de flechas numa área, causando dano contínuo.',
          danoBase: 8, danoUnidade: 'físico', danoNota: '/s por 7s',
          mp: 22, cd: 6, escala: 'dano',
          area: 'Raio 65', alcance: 'Mira 150px',
          duracao: '7s', duracaoBase: null, extras: ['Lentidão'] },
        { id: 'perfurante', nome: 'Disparo Perfurante', icon: '🎯', categoria: 'ataque',
          desc: 'Flecha pesada que atravessa todos os inimigos no caminho.',
          danoBase: 32, danoUnidade: 'físico', danoNota: null,
          mp: 18, cd: 4.5, escala: 'dano',
          area: 'Projétil', alcance: 'Vel. 18',
          duracao: null, duracaoBase: null, extras: ['Perfurante: atravessa alvos'] }
    ],
    curandeiro: [
        { id: 'sagrado', nome: 'Luz Sagrada', icon: '✨', categoria: 'ataque',
          desc: 'Projétil de luz sagrada contra inimigos.',
          danoBase: 12, danoUnidade: 'sagrado', danoNota: null,
          mp: 0, cd: 0.3, escala: 'dano',
          area: 'Projétil', alcance: 'Vel. 10',
          duracao: null, duracaoBase: null, extras: [] },
        { id: 'cura', nome: 'Cura Divina', icon: '💖', categoria: 'cura',
          desc: 'Ondas de luz que curam você e aliados próximos.',
          danoBase: 35, danoUnidade: 'cura', danoNota: ' de vida',
          mp: 25, cd: 5, escala: 'cura',
          area: 'Raio 140', alcance: 'Ao redor',
          duracao: null, duracaoBase: null, extras: ['Cura aliados', 'Limite: HP máximo'] },
        { id: 'julgamento', nome: 'Julgamento Sagrado', icon: '⚡', categoria: 'aoe',
          desc: 'Coluna de luz cai do céu no ponto marcado.',
          danoBase: 28, danoUnidade: 'sagrado', danoNota: '+ Slow 1.75s',
          mp: 24, cd: 6.5, escala: 'dano',
          area: 'Raio 65', alcance: 'Mira 140px',
          duracao: null, duracaoBase: null, extras: [] }
    ],
    barbaro: [
        { id: 'machadada', nome: 'Machadada', icon: '🪓', categoria: 'ataque',
          desc: 'Golpe pesado de machado em cone à frente.',
          danoBase: 20, danoUnidade: 'físico', danoNota: null,
          mp: 0, cd: 0.35, escala: 'dano',
          area: 'Cone frontal (72px)', alcance: 'Corpo a corpo',
          duracao: null, duracaoBase: null, extras: ['Na Fúria: cura +8 por golpe'] },
        { id: 'furia', nome: 'Fúria Berserker', icon: '🩸', categoria: 'buff',
          desc: 'Fica possesso: corre 30% mais rápido e cada machadada rouba vida.',
          danoBase: null, danoUnidade: null, danoNota: null,
          mp: 20, cd: 8, escala: 'duracao',
          area: 'Auto', alcance: '—',
          duracao: '6s', duracaoBase: 6, extras: ['+30% velocidade', 'Lifesteal +8'] },
        { id: 'esmagamento-barbaro', nome: 'Salto Esmagador', icon: '🗡️', categoria: 'aoe',
          desc: 'Salta até o ponto marcado e esmaga o chão.',
          danoBase: 35, danoUnidade: 'físico', danoNota: '+ Stun 1.25s',
          mp: 25, cd: 6, escala: 'dano',
          area: 'Raio 75', alcance: 'Salto 160px',
          duracao: null, duracaoBase: null, extras: [] }
    ],
    roqueiro: [
        { id: 'riff', nome: 'Riff de Guitarra', icon: '🎸', categoria: 'ataque',
          desc: 'Onda sonora cortante disparada da guitarra.',
          danoBase: 15, danoUnidade: 'físico', danoNota: null,
          mp: 0, cd: 0.3, escala: 'dano',
          area: 'Projétil', alcance: 'Vel. 12',
          duracao: null, duracaoBase: null, extras: [] },
        { id: 'bateria', nome: 'Bateria Solo', icon: '🥁', categoria: 'canal',
          desc: 'Canal de 5s: toca a bateria e o som estoura inimigos ao redor.',
          danoBase: 30, danoUnidade: 'físico', danoNota: '+ Stun 1.25s (por batida)',
          mp: 25, cd: 6, escala: 'dano',
          area: 'Raio 110', alcance: 'Ao redor',
          duracao: 'Canal 5s', duracaoBase: null, extras: ['Batida a cada 0.5s', 'Cancela ao se mover'] },
        { id: 'teleporte', nome: 'Stage Dive', icon: '🌠', categoria: 'mobilidade',
          desc: 'Dive estiloso que teleporta o roqueiro até o ponto marcado.',
          danoBase: null, danoUnidade: null, danoNota: null,
          mp: 15, cd: 8, escala: 'nenhum',
          area: 'Auto', alcance: 'Teleporte 160px',
          duracao: null, duracaoBase: null, extras: [] },
        { id: 'banda', nome: 'Chamar a Banda', icon: '🎤', categoria: 'invocacao',
          desc: 'Convoca 1 membro da banda (guitarrista) que ataca junto com você.',
          danoBase: 10, danoUnidade: 'físico', danoNota: ' por membro / 2s',
          mp: 30, cd: 15, escala: 'dano',
          area: 'Persegue o alvo', alcance: 'Via membro',
          duracao: null, duracaoBase: null, extras: ['Conjura 1 membro'] }
    ]
};

const NOMES_CLASSES = {
    guerreiro: 'GUERREIRO', mago: 'MAGO', summoner: 'SUMMONER', arqueiro: 'ARQUEIRO',
    curandeiro: 'CURANDEIRO', barbaro: 'BÁRBARO', roqueiro: 'ROQUEIRO'
};

const LABELS_CATEGORIA = {
    ataque: 'ATAQUE', aoe: 'AOE', zona: 'ZONA', canal: 'CANAL', cura: 'CURA',
    buff: 'BUFF', mobilidade: 'MOBILIDADE', invocacao: 'INVOCAÇÃO', passiva: 'PASSIVA'
};

function skillScreenEl() { return document.getElementById("skills-screen"); }
function skillsListaEl() { return document.getElementById("skills-lista"); }
function skillsClasseTagEl() { return document.getElementById("skills-classe-tag"); }

function obterNivelSkill(classe, id) {
    let n = window.skillsNiveis[id];
    return n ? n : 1;
}

function valorEscalado(skill, nivel) {
    if (skill.escala === 'dano' || skill.escala === 'cura') {
        return Math.round(skill.danoBase * (1 + (nivel - 1) * 0.25));
    }
    if (skill.escala === 'duracao') {
        return Math.round(skill.duracaoBase * (1 + (nivel - 1) * 0.1));
    }
    return null;
}

// Espelha as regras de escala por ATRIBUTO do server.js (calcularDanoJogador/calcularCuraJogador):
// cura -> Divindade; golpes de pet -> Afinidade; dano contínuo ('/s' ou '/ n s') -> Profanidade;
// classes mágicas (mago/summoner/curandeiro/roqueiro) -> Inteligência; demais -> Força.
function atributoEscalaSkill(skill) {
    if (skill.escala === 'cura') return { chave: 'divindade', rotulo: 'Divindade' };
    if (skill.id === 'ogro' || skill.id === 'esmagamento' || skill.id === 'salto') return { chave: 'afinidade', rotulo: 'Afinidade' };
    if (skill.danoNota && /\/\s*\d*s/.test(skill.danoNota)) return { chave: 'profanidade', rotulo: 'Profanidade' };
    if (['mago', 'summoner', 'curandeiro', 'roqueiro'].indexOf(window.minhaClasse) !== -1) return { chave: 'inteligencia', rotulo: 'Inteligência' };
    return { chave: 'forca', rotulo: 'Força' };
}

function valorComAtributo(skill) {
    let atr = atributoEscalaSkill(skill);
    if (!skill.danoBase || skill.escala !== 'dano' && skill.escala !== 'cura') return null;
    let tot = window.atributosTotais && window.atributosTotais[atr.chave];
    if (!tot) return null;
    return Math.round(skill.danoBase * (1 + (tot - 1) * 0.05));
}

function abrirSkills() {
    if (window.estaMorto) return;
    if (charSelectScreen && charSelectScreen.style.display === "flex") return;
    if (window.inventarioAberto) fecharInventario();
    window.skillsAberto = true;
    let screen = skillScreenEl();
    if (screen) screen.style.display = "flex";
    renderizarSkills();
}

function fecharSkills() {
    window.skillsAberto = false;
    let screen = skillScreenEl();
    if (screen) screen.style.display = "none";
}

function toggleSkills() {
    if (window.skillsAberto) fecharSkills(); else abrirSkills();
}

function renderizarSkills() {
    let lista = skillsListaEl();
    if (!lista) return;
    let tag = skillsClasseTagEl();
    if (tag) tag.innerText = "🔶 " + (NOMES_CLASSES[window.minhaClasse] || window.minhaClasse) + " — SKILLS";
    let classe = window.minhaClasse || 'guerreiro';
    let skills = SKILLS_INFO[classe] || [];

    lista.innerHTML = "";

    let pontos = window.pontosHabilidade || 0;
    let cabecalho = document.createElement("div");
    cabecalho.className = "skill-pontos" + (pontos <= 0 ? " esgotado" : "");
    cabecalho.innerHTML = '🎯 Pontos de habilidade: <b>' + pontos + '</b> <span style="font-size:10px;color:#bbb">(surge ao subir de nível)</span>';
    lista.appendChild(cabecalho);

    skills.forEach(skill => {
        let nivel = obterNivelSkill(classe, skill.id);
        let escalado = valorEscalado(skill, nivel);
        let card = document.createElement("div");
        card.className = "skill-card";

        let linhaDano = "";
        if (skill.danoBase && (skill.escala === 'dano' || skill.escala === 'cura')) {
            let comAtr = valorComAtributo(skill);
            let principal = comAtr !== null ? comAtr : escalado;
            let notaAtr = comAtr !== null && comAtr !== escalado
                ? ' <span style="color:#9b59b6">(' + skill.danoBase + ' base · +5% por ' + atributoEscalaSkill(skill).rotulo + ')</span>'
                : '';
            let icone = skill.escala === 'cura' ? '💖 Cura' : '🗡️ Dano';
            let corNota = skill.escala === 'cura' ? '#27ae60' : '#e67e22';
            linhaDano = '<div class="skill-stat"><b>' + icone + '</b> ' + principal + notaAtr + (skill.danoUnidade && skill.escala !== 'cura' ? ' ' + skill.danoUnidade : '') + (skill.danoNota ? ' <span style="color:' + corNota + '">' + skill.danoNota + '</span>' : '') + '</div>';
        } else {
            linhaDano = '<div class="skill-stat"><b>Dano</b> —</div>';
        }

        let duracaoLinha = skill.duracao
            ? '<div class="skill-stat"><b>⏳ Duração</b> ' + (skill.escala === 'duracao' ? escalado + 's' : skill.duracao) + '</div>'
            : '<div class="skill-stat"><b>⏳ Duração</b> —</div>';

        let extrasHtml = skill.extras.length
            ? '<div class="skill-extras">' + skill.extras.map(e => '<span class="skill-extra">' + e + '</span>').join('') + '</div>'
            : '';

        let custoMp = skill.mp ? Math.round(skill.mp * (1 + (nivel - 1) * 0.06)) : 0;

        let btnUpgrade;
        if (nivel >= NIVEL_SKILL_MAX) {
            btnUpgrade = '<button class="btn-melhorar max" disabled>MÁXIMO</button>';
        } else if (pontos <= 0) {
            btnUpgrade = '<button class="btn-melhorar" disabled>⬆️ MELHORAR</button>';
        } else {
            btnUpgrade = '<button class="btn-melhorar" onclick="melhorarSkill(\'' + skill.id + '\')">⬆️ MELHORAR</button>';
        }

        card.innerHTML =
            '<div class="skill-card-top">' +
                '<span class="skill-ico">' + skill.icon + '</span>' +
                '<div style="flex:1">' +
                    '<div class="skill-nome">' + skill.nome +
                        '<span class="skill-cat cat-' + skill.categoria + '">' + LABELS_CATEGORIA[skill.categoria] + '</span>' +
                        '<span class="skill-nv">NV ' + nivel + '</span>' +
                    '</div>' +
                    '<div class="skill-desc">' + skill.desc + '</div>' +
                '</div>' +
            '</div>' +
            '<div class="skill-stats">' +
                linhaDano +
                '<div class="skill-stat"><b>💧 MP</b> ' + (custoMp > 0 ? custoMp : 0) + '</div>' +
                '<div class="skill-stat"><b>⏱️ CD</b> ' + (skill.cd ? skill.cd + 's' : '—') + '</div>' +
                '<div class="skill-stat"><b>🔵 Área</b> ' + (skill.area || '—') + '</div>' +
                '<div class="skill-stat"><b>🎯 Alcance</b> ' + (skill.alcance || '—') + '</div>' +
                duracaoLinha +
            '</div>' +
            (skill.escala === 'duracao'
                ? '<div class="skill-extras"><span class="skill-extra" style="border-color:#f1c40f;background:#3a3528;color:#f1c40f">Duração escala +10%/nível</span></div>'
                : (skill.escala === 'dano' || skill.escala === 'cura'
                    ? '<div class="skill-extras"><span class="skill-extra" style="border-color:#1abc9c;background:#13332b;color:#1abc9c">Dano/Cura escala +25%/nível · MP +6%/nível</span></div>'
                    : '')) +
            extrasHtml +
            '<div class="skill-upgrade">' +
                '<span class="skill-upgrade-nivel">Nível <b>' + nivel + '</b>/' + NIVEL_SKILL_MAX + '</span>' +
                btnUpgrade +
                '<button class="btn-skill-reset" onclick="resetarSkill(\'' + skill.id + '\')" title="Resetar">↺</button>' +
            '</div>';

        lista.appendChild(card);
    });
}

function melhorarSkill(id) {
    let classe = window.minhaClasse || 'guerreiro';
    let skill = (SKILLS_INFO[classe] || []).find(s => s.id === id);
    if (!skill) return;
    let nivel = obterNivelSkill(classe, id);
    if (nivel >= NIVEL_SKILL_MAX) return;
    if ((window.pontosHabilidade || 0) <= 0) {
        if (typeof statusText !== 'undefined' && statusText) statusText.innerText = "⚠️ Sem pontos de habilidade! Suba de nível para ganhar mais.";
        return;
    }
    if (typeof window.enviarServidor === 'function') {
        window.enviarServidor({ action: 'upgrade_skill', id: id });
    }
}

function resetarSkill(id) {
    if (typeof window.enviarServidor === 'function') {
        window.enviarServidor({ action: 'resetar_skill', id: id });
    }
}

function resetarTodasSkills() {
    if (typeof window.enviarServidor === 'function') {
        window.enviarServidor({ action: 'resetar_todas_skills' });
    }
}

if (skillScreenEl()) skillScreenEl().addEventListener("click", function(e) { if (e.target === skillScreenEl()) fecharSkills(); });