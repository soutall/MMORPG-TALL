/* ===== INTERFACE DE SKILLS (detalhes completos + upgrade no servidor) =====
   Upgrade é validado no servidor (server.js): gasta 1 ponto de habilidade por
   nível, dano/cura +25%/nível e custo de mana +6%/nível. skills.js só mostra. */

window.skillsAberto = false;
window.skillsNiveis = {}; // chave: skillId -> nivel (1..10), sincronizado com o servidor

const NIVEL_SKILL_MAX = 10;

const SKILLS_INFO = {
    guerreiro: [
        { id: 'corte', nome: 'Estocada da Lança', icon: '🔱', iconImage: 'imagem/HUD/skills/Slotbar/guerreiro/ataque basico.png', categoria: 'ataque',
          desc: 'Golpe perfurante de lança em linha à frente do herói.',
          danoBase: 12, danoUnidade: 'físico', danoNota: null,
          mp: 0, cd: 0.35, escala: 'dano',
          area: 'Alcance frontal (70px)', alcance: 'Corpo a corpo',
          duracao: null, duracaoBase: null, extras: [] },
        { id: 'postura_guardiao', nome: 'Aura do Vanguarda', icon: '🛡️', categoria: 'buff',
          desc: 'Ergue uma aura mística de proteção em torno do guerreiro, concedendo +30% de defesa e +10% de vida máxima por 10s. Atrai monstros próximos por 2s.',
          danoBase: null, danoUnidade: null, danoNota: '+30% defesa · +10% HP máx',
          mp: 0, cd: 14, escala: 'nenhum', melhoravel: false,
          area: 'Raio 300px (provocação)', alcance: 'Ao redor do Guerreiro',
          duracao: '10s (provocação 2s)', duracaoBase: 10,
          extras: ['+30% defesa por 10s', '+10% HP máximo por 10s', 'Atrai mobs e bosses próximos por 2s'] },
        { id: 'tornado', nome: 'Giro do Vanguarda', icon: '🌀', iconImage: 'imagem/HUD/skills/Slotbar/guerreiro/Giro do Vanguarda.png', categoria: 'aoe',
          desc: 'Gira a lança em um arco devastador, atingindo inimigos próximos com 3 pulsos cortantes durante o giro.',
          danoBase: 25, danoUnidade: 'físico', danoNota: '25 de dano total em 3 pulsos',
          mp: 20, cd: 5, escala: 'dano',
          area: 'Raio 100', alcance: 'Ao redor',
          duracao: null, duracaoBase: null, extras: [] },
        { id: 'provocacao', nome: 'Grito Estrondoso', icon: '📢', categoria: 'aoe',
          desc: 'Grita poderosamente, tremendo o chão e provocando todos os monstros próximos para atacá-lo, enquanto cura sua própria vida em 20% do HP Máximo.',
          danoBase: 0, danoUnidade: null, danoNota: 'Cura 20% HP Máx',
          mp: 20, cd: 15, escala: 'nenhum',
          area: 'Raio 300px', alcance: 'Ao redor',
          duracao: '10s (Mobs) / 5s (Boss)', duracaoBase: null,
          extras: ['Cura instantânea de 20% da Vida Máxima', 'Força aggro de Mobs normais por 10 segundos', 'Força aggro de Bosses por 5 segundos'] },
        { id: 'bloqueio', nome: 'Escudo Ogival do Leão (Passiva)', icon: '🛡️', categoria: 'passiva',
          desc: 'Bloqueio frontal com o Escudo Ogival do Leão que anula o dano recebido.',
          danoBase: 0, danoUnidade: null, danoNota: null,
          mp: 0, cd: null, escala: 'nenhum',
          area: 'Frontal', alcance: '—',
          duracao: null, duracaoBase: null, extras: ['Requer 15 de estamina', 'Gasta 20 de estamina'] },
        { id: 'ultimo_folego', nome: 'Último Fôlego (Passiva)', icon: '🔥', categoria: 'passiva',
          desc: 'Instinto supremo de sobrevivência. Reduz progressivamente o dano recebido conforme a vida do Guerreiro diminui.',
          danoBase: 0, danoUnidade: null, danoNota: 'Até -15% Dano',
          mp: 0, cd: null, escala: 'nenhum',
          area: 'Próprio', alcance: '—',
          duracao: 'Passiva', duracaoBase: null,
          extras: ['Vida <= 50%: -5% de dano recebido', 'Vida <= 30%: -10% de dano recebido', 'Vida <= 10%: -15% de dano recebido'] },
        { id: 'escudo_lancamento', nome: 'Lançamento do Escudo', icon: '🛡️', iconImage: 'imagem/HUD/skills/Slotbar/guerreiro/lancamento do escudo.png', categoria: 'ataque',
          desc: 'Arremessa o escudo à frente: 45 de dano no primeiro inimigo atingido, puxando-o para perto e forçando o foco (provocação) nele.',
          danoBase: 45, danoUnidade: 'físico', danoNota: 'Puxa + Provoca',
          mp: 15, cd: 10, escala: 'dano',
          area: 'Projétil (até 300px)', alcance: '250px',
          duracao: null, duracaoBase: null, extras: ['Puxa o inimigo atingido para perto', 'Provoca (taunt 5s) no acerto'] }
    ],
    mago: [
        { id: 'magia', nome: 'Bola de Magia', icon: '🔮', categoria: 'ataque',
          desc: 'Projétil mágico básico que persegue em linha reta.',
          danoBase: 15, danoUnidade: 'mágico', danoNota: null,
          mp: 0, cd: 0.3, escala: 'dano',
          area: 'Projétil', alcance: 'Vel. 10',
          duracao: null, duracaoBase: null, extras: [] },
        { id: 'meteoro', nome: 'Meteoro', icon: '☄️', categoria: 'aoe',
          desc: 'Carrega por 1s e invoca um meteoro no ponto marcado.',
          danoBase: 25, danoUnidade: 'mágico', danoNota: null,
          mp: 30, cd: 7, escala: 'dano',
          area: 'Raio 85', alcance: 'Mira 380px',
          duracao: null, duracaoBase: null, extras: ['Cast de 1s'] },
        { id: 'nevasca', nome: 'Nevasca', icon: '❄️', categoria: 'zona',
          desc: 'Carrega por 1s e cria uma corrente de água gelada que desacelera os inimigos na área.',
          danoBase: 6, danoUnidade: 'mágico', danoNota: '/s por 8s',
          mp: 35, cd: 12, escala: 'dano',
          area: 'Raio 115', alcance: 'Mira 350px',
          duracao: '8s', duracaoBase: null, extras: ['Cast de 1s', 'Lentidão 50% (0.75s)'] },
        { id: 'vulcao', nome: 'Vulcão Flamejante', icon: '🌋', categoria: 'zona',
          desc: 'Carrega por 1s e faz um vulcão emergir parcialmente do terreno, lançando fragmentos e magma.',
          danoBase: 18, danoUnidade: 'mágico', danoNota: '+4 DoT/s',
          mp: 20, cd: 20, escala: 'dano',
          area: 'Raio 140', alcance: 'Mira 380px',
          duracao: '10s', duracaoBase: null, extras: ['Cast de 1s', 'Fragmentos frequentes', 'Queimadura em área'] },
        { id: 'bola_elemental', nome: 'Bola Elemental', icon: '🔮', categoria: 'ataque',
          desc: 'Lança uma BOLA GIGANTE giratória que rola pelo chão empurrando inimigos. Ao cruzar a área da NEVASCA vira GELO e congela inimigos por 2s; ao cruzar o fogo do METEORO vira FOGO e causa uma grande explosão.',
          danoBase: 60, danoUnidade: 'mágico', danoNota: '×2 no Fogo / congela no Gelo',
          mp: 30, cd: 20, escala: 'dano',
          area: 'Projétil rolante 400px / Explosão 130 / Gelo 85', alcance: '400px',
          duracao: null, duracaoBase: null, extras: ['Normal: rola pelo chão e empurra inimigos para trás', 'Gelo (Nevasca): congela inimigos ao contato por 2s', 'Fogo (Meteoro): grande explosão em área com dano ×2', 'Fogo do Meteoro queima o chão por 5s'] },
        { id: 'mana_arcana', nome: 'Mana Arcana (Passiva)', icon: '💠', categoria: 'passiva',
          desc: 'A cada 5 pontos base de Inteligência, recebe +1 Inteligência. Quanto mais Mana atual, maior o dano mágico: até +10% com a barra cheia.',
          danoBase: 0, danoUnidade: null, danoNota: '+1 INT / 5 pontos; até +10% dano',
          mp: 0, cd: null, escala: 'nenhum',
          area: 'Próprio', alcance: 'Passiva',
          duracao: 'Sempre ativa', duracaoBase: null, extras: ['Cada 5 pontos investidos em Inteligência concede +1 INT', 'Dano mágico escala com a Mana atual'] }
    ],
    summoner: [
        { id: 'orbe', nome: 'Orbe das Sombras', icon: '👁️', iconImage: 'imagem/HUD/skills/Slotbar/Summoner/orbe-das-sombras.png', categoria: 'ataque',
          desc: 'Orbe arremessado pelo invocador.',
          danoBase: 6, danoUnidade: 'mágico', danoNota: null,
          mp: 0, cd: 0.3, escala: 'dano',
          area: 'Projétil', alcance: 'Vel. 10',
          duracao: null, duracaoBase: null, extras: [] },
        { id: 'ogro', nome: 'Ogro Guardião (Passiva)', icon: '🦍', iconImage: 'imagem/HUD/skills/Slotbar/Summoner/ogro-guardiao.png', categoria: 'invocacao',
          desc: 'Pet permanente que persegue e golpeia os inimigos.',
          danoBase: 15, danoUnidade: 'físico', danoNota: ' a cada 2s',
          mp: 0, cd: null, escala: 'dano',
          area: 'Corpo a corpo', alcance: 'Persegue o alvo',
          duracao: null, duracaoBase: null, extras: ['Vida 90 do ogro'] },
        { id: 'esmagamento', nome: 'Esmagamento Sísmico', icon: '💥', iconImage: 'imagem/HUD/skills/Slotbar/Summoner/esmagamento-sismico.png', categoria: 'aoe',
          desc: 'Comando o ogro a bater o chão, danificando ao redor dele.',
          danoBase: 45, danoUnidade: 'físico', danoNota: '+ Stun 1.5s',
          mp: 25, cd: 6, escala: 'dano',
          area: 'Raio 100 (no ogro)', alcance: 'Via pet',
          duracao: null, duracaoBase: null, extras: ['Ogro agressivo 7s'] },
        { id: 'salto', nome: 'Salto do Ogro', icon: '🦘', iconImage: 'imagem/HUD/skills/Slotbar/Summoner/salto-do-ogro.png', categoria: 'mobilidade',
          desc: 'O ogro salta em arco sobre o inimigo mais próximo.',
          danoBase: 35, danoUnidade: 'físico', danoNota: '+ Stun 0.5s',
          mp: 20, cd: 8, escala: 'dano',
          area: 'Impacto raio 70', alcance: 'Alvo até 350px',
          duracao: null, duracaoBase: null, extras: [] },
        { id: 'colossal', nome: 'Golem Colossal', icon: '🗿', iconImage: 'imagem/HUD/skills/Slotbar/Summoner/golem-colossal.png', categoria: 'invocacao',
          desc: 'Amplifica o golem por alguns segundos, aumentando seu tamanho, dano e disparo de pedras.',
          danoBase: 30, danoUnidade: 'físico', danoNota: ' por pedra / 20s',
          mp: 40, cd: 45, escala: 'dano',
          area: 'Ao redor do golem', alcance: 'Via pet',
          duracao: '20s', duracaoBase: null, extras: ['+50% de vida do pet', 'Aumento de alcance e dano em área'] },
        { id: 'sismico', nome: 'Golem Sísmico', icon: '⛰️', iconImage: 'imagem/HUD/skills/Slotbar/Summoner/golem-sismico.png', categoria: 'aoe',
          desc: 'Golem trava no lugar e libera ondas sísmicas por 8s: dano em área crescente reduzido (raio 182), lentidão 50% e tremores cada vez mais rápidos.',
          danoBase: 28, danoUnidade: 'físico', danoNota: 'pulso crescente',
          mp: 40, cd: 30, escala: 'dano',
          area: 'Raio 182 (no golem)', alcance: 'Via pet',
          duracao: '8s', duracaoBase: 8, extras: ['Pulsos aceleram (1s → 0.3s)', 'Lentidão 50% por 2s', 'Golem imune/travado'] }
    ],
    lord_malakar: [
        { id: 'lord_malakar_carne_petrificada', nome: 'Carne Petrificada (Passiva)', icon: '🪨', categoria: 'passiva',
          desc: 'A Vida Máxima petrificada pelas invocações reduz o dano recebido por Malakar: 2% a cada 3% de Vida Máxima petrificada, até 10%.',
          danoBase: null, danoUnidade: null, danoNota: 'Redução de dano de até 10%',
          mp: 0, cd: 0, escala: 'nenhum', area: 'Malakar', alcance: 'Passiva',
          duracao: 'Permanente', duracaoBase: null, extras: ['A redução acompanha a quantidade de Vida Petrificada'] },
        { id: 'lord_malakar_evocacao_demoníaca', nome: 'Evocação Demoníaca', icon: '💀', categoria: 'invocacao',
          desc: 'Invoca uma caveira. Cada criatura petrifica 3% da Vida Máxima; limite de duas guerreiras, duas arqueiras e uma maga.',
          danoBase: null, danoUnidade: null, danoNota: '3% Vida Máx por caveira',
          mp: 0, cd: 4, escala: 'nenhum', area: 'Até 5 caveiras', alcance: 'Ao redor de Malakar',
          duracao: 'Enquanto sobreviver', duracaoBase: null, extras: ['2 Caveiras Guerreiras', '2 Caveiras Arqueiras', '1 Caveira Maga'] },
        { id: 'lord_malakar_vinculo_mortal', nome: 'Vínculo Mortal', icon: '⛓️', categoria: 'suporte',
          desc: 'Vincula até quatro inimigos em até 260 px por 5 segundos. Dano causado pelas caveiras e lacaios a alvos vinculados cura Malakar em 10% do dano (mínimo de 1 por acerto).',
          danoBase: null, danoUnidade: null, danoNota: '10% do dano das caveiras e lacaios (mínimo 1 por acerto)',
          mp: 0, cd: 15, escala: 'nenhum', area: 'Até 4 inimigos', alcance: '260 px',
          duracao: '5s', duracaoBase: 5, extras: ['Somente dano das caveiras ativa a cura'] },
        { id: 'lord_malakar_sofrimento_eterno', nome: 'Sofrimento Eterno', icon: '🩸', categoria: 'buff',
          desc: 'Fortalece caveiras, lacaio e aliados do grupo: +20% chance crítica, +30% dano crítico e +50% velocidade de ataque. Drena Vida por segundo; desativa aos 20% de HP.',
          danoBase: null, danoUnidade: null, danoNota: '1% + 0,5% Vida Máx/s por invocação',
          mp: 0, cd: 13, escala: 'nenhum', area: 'Invocações e grupo', alcance: 'Grupo de Malakar',
          duracao: 'Toggle', duracaoBase: null, extras: ['Malakar não recebe os bônus', 'CD de 13s ao cancelar ou desativar'] },
        { id: 'lord_malakar_invocacao_aleatoria', nome: 'Invocação Aleatória', icon: '🕯️', categoria: 'invocacao',
          desc: 'Invoca um Ceifador, Sniper das Profundezas ou Clérigo das Almas; substitui o lacaio anterior.',
          danoBase: null, danoUnidade: null, danoNota: 'Custo de 10% a 15% Vida Máx',
          mp: 0, cd: 20, escala: 'nenhum', area: '1 lacaio', alcance: 'Ao redor de Malakar',
          duracao: '10s / 15s', duracaoBase: null, extras: ['Chance influenciada pelo maior atributo: Força, Agilidade ou Divindade'] }
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
          danoBase: 8, danoUnidade: 'físico', danoNota: '/s por 2.3s',
          mp: 22, cd: 6, escala: 'dano',
          area: 'Raio 65', alcance: 'Mira 420px',
          duracao: '2.3s', duracaoBase: null, extras: ['Lentidão'] },
        { id: 'perfurante', nome: 'Disparo Perfurante', icon: '🎯', categoria: 'ataque',
          desc: 'Flecha pesada que atravessa todos os inimigos no caminho.',
          danoBase: 32, danoUnidade: 'físico', danoNota: null,
          mp: 18, cd: 4.5, escala: 'dano',
          area: 'Projétil', alcance: 'Vel. 18',
          duracao: null, duracaoBase: null, extras: ['Perfurante: atravessa alvos'] },
        { id: 'rajada', nome: 'Rajada de Flechas', icon: '🏹', categoria: 'ataque',
          desc: 'Carrega por 2s e dispara uma rajada em cone por 4s, com dano crescente conforme o fluxo de flechas. Atinge TODOS os inimigos dentro do cone do visual (230px).',
          danoBase: 18, danoUnidade: 'físico', danoNota: 'por flecha',
          mp: 30, cd: 12, escala: 'dano',
          area: 'Cone em expansão (até 230px)', alcance: 'Frente do arqueiro',
          duracao: '2s carregando + 4s disparo', duracaoBase: null, extras: ['Dano em ÁREA: acerta todos os inimigos no cone', 'Bloqueia movimento e ataques durante o carregamento', 'Cancela se andar'] },
        { id: 'salto_chuva', nome: 'Salto + Chuva do Alto', icon: '🦅', categoria: 'aoe',
          desc: 'Salta e fica imune no alto por 3s; mira um ponto e despeja uma chuva de flechas por 2s causando dano em área.',
          danoBase: 15, danoUnidade: 'físico', danoNota: 'por tick (raio 120)',
          mp: 25, cd: 25, escala: 'dano',
          area: 'Chuva raio 120', alcance: 'Mira até 500px',
          duracao: '3s imune + 2s de chuva', duracaoBase: null, extras: ['Imune enquanto está no alto', 'Chuva acerta todos os inimigos na área'] }
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
          desc: 'Coluna de luz cai do céu no ponto marcado (+20% área).',
          danoBase: 28, danoUnidade: 'sagrado', danoNota: '+ Slow 1.75s',
          mp: 24, cd: 6.5, escala: 'dano',
          area: 'Raio 78', alcance: 'Mira 340px',
          duracao: null, duracaoBase: null, extras: [] },
        { id: 'aura-sagrada', nome: 'Aura Sagrada', icon: '✝️', categoria: 'buff',
          desc: 'Mantém uma zona divina que protege, fortalece e cura aliados próximos enquanto houver mana. A cura escala com o atributo DIVINDADE (+5% por ponto).',
          danoBase: null, danoUnidade: null, danoNota: 'Cura 2% HP/s x Divindade',
          mp: 1, cd: 5, escala: 'nenhum',
          area: 'Raio 190', alcance: 'Ao redor do Curandeiro',
          duracao: 'Contínua', duracaoBase: null,
          extras: ['Cooldown de 5s acionado apenas ao desativar', '-10% dano recebido', '+5% dano causado', '+10% cura recebida', 'Cura escalada pela Divindade'] },
        { id: 'ressurreicao-automatica', nome: 'Ressurreição Automática', icon: '🕊️', categoria: 'passiva',
          desc: 'Ressuscita automaticamente um aliado próximo quando ele morrer.',
          danoBase: null, danoUnidade: null, danoNota: null,
          mp: 0, cd: 600, escala: 'nenhum',
          area: 'Raio 190', alcance: 'Aliado próximo',
          duracao: 'Passiva', duracaoBase: null,
          extras: ['Cooldown: 10 minutos', 'Controlada pelo servidor'] },
        { id: 'cantico', nome: 'Cântico Celestial', icon: '👼', categoria: 'aoe',
          desc: 'Anjos descem e atingem até 5 inimigos próximos: dano sagrado + ENFRAQUECIMENTO (-20% defesa e -5% ataque por 10s).',
          danoBase: 25, danoUnidade: 'sagrado', danoNota: '-20% Def / -5% Atk',
          mp: 30, cd: 15, escala: 'dano',
          area: 'Até 5 alvos (raio 320/360)', alcance: 'Ao redor da Curandeira',
          duracao: 'Debuff 10s', duracaoBase: 10, extras: ['Enfraquece defesa (-20%)', 'Enfraquece ataque (-5%)', 'Atinge até 5 alvos próximos'] }
    ],
    florim: [
        { id: 'arvore', nome: 'Árvore Curativa', icon: '🌳', categoria: 'suporte', desc: 'Cria uma árvore curativa no local. Folhas caem ao redor, curando aliados na área.', danoBase: null, danoUnidade: null, danoNota: 'Cura 30 HP/s', mp: 25, cd: 15, escala: 'cura', area: 'Raio 100', alcance: 'Mira 300px', duracao: '8s', duracaoBase: 8, extras: ['Cura aliados', 'Folhas caindo', 'Duração 8s'] },
        { id: 'semente', nome: 'Semente', icon: '🌱', categoria: 'controle', desc: 'Planta uma semente no chão. Inimigos ativam Planta Carnívora (dano em área 5s). Aliados ativam Rosa (regen MP 4s).', danoBase: 25, danoUnidade: 'natureza', danoNota: 'Carnívora ou Rosa', mp: 18, cd: 10, escala: 'dano', area: 'Raio 60', alcance: 'Mira 300px', duracao: '20s armadilha', duracaoBase: 20, extras: ['Inimigo: Planta Carnívora 5s', 'Aliado: Rosa de Mana 4s'] },
        { id: 'espinhos', nome: 'Espinhos de Rosa', icon: '🌹', categoria: 'debuff', desc: 'Cria uma área de raízes espinhosas de rosa no chão. Reduz Defesa e Ataque de inimigos em 20%.', danoBase: null, danoUnidade: null, danoNota: '-20% DEF / -20% ATK', mp: 22, cd: 13, escala: 'nenhum', area: 'Raio 120', alcance: 'Mira 300px', duracao: '5s', duracaoBase: 5, extras: ['-20% Defesa', '-20% Ataque', 'Raízes de Rosa'] },
        { id: 'parede', nome: 'Parede de Espinhos', icon: '🧱', categoria: 'controle', desc: 'Cria uma parede circular de espinhos com rosas que bloqueia inimigos.', danoBase: null, danoUnidade: null, danoNota: 'Bloqueio circular', mp: 20, cd: 10, escala: 'nenhum', area: 'Raio 80', alcance: 'Mira 250px', duracao: '4s', duracaoBase: 4, extras: ['Parede circular', 'Bloqueia inimigos', 'Espinhos + Rosas'] },
        { id: 'aura_florescente', nome: 'Aura Florescente', icon: '💚', categoria: 'passiva', desc: 'Aura que regenera Mana para aliados ao redor e causa Sangramento em inimigos próximos.', danoBase: null, danoUnidade: null, danoNota: 'Mana regen + Sangramento', mp: 0, cd: null, escala: 'nenhum', area: 'Raio 120', alcance: 'Ao redor', duracao: 'Passiva', duracaoBase: null, extras: ['+5 MP/2s aliados', 'Sangramento em inimigos'] }
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
          mp: 20, cd: 15, escala: 'duracao',
          area: 'Auto', alcance: '—',
          duracao: '6s', duracaoBase: 6, extras: ['+30% velocidade', 'Lifesteal +8', 'Cooldown: 15s'] },
        { id: 'giro_descontrolado', nome: 'Giro Descontrolado', icon: '🌀', categoria: 'aoe',
          desc: 'Gira violentamente por 4 segundos, causando dano e sangramento ao redor e reduzindo o dano recebido em 10%.',
          danoBase: 18, danoMultiplicadorBase: 0.2, danoMultiplicadorFinal: 0.5, danoUnidade: 'físico', danoNota: 'por pulso (dano final reduzido pela metade) · + Sangramento 3/s',
          mp: 30, cd: 15, escala: 'dano',
          area: 'Raio 90', alcance: 'Ao redor do Bárbaro',
          duracao: '4s', duracaoBase: null, extras: ['Duração reduzida para 4s', 'Cooldown aumentado para 15s', 'Redução de dano recebida: 10%'] },
        { id: 'furia_crescente', nome: 'Fúria Crescente', icon: '📈', categoria: 'passiva',
          desc: 'Conforme a vida cai, o Bárbaro cresce, causa mais dano e ganha mais presença visual de combate.',
          danoBase: null, danoUnidade: null, danoNota: 'Visual + dano por HP',
          mp: 0, cd: null, escala: 'nenhum',
          area: 'Próprio', alcance: '—',
          duracao: 'Passiva', duracaoBase: null,
          extras: ['60% HP: +5% tamanho, +5% dano', '40% HP: +10% tamanho, +10% dano', '20% HP: +20% tamanho, +15% dano'] },
        { id: 'esmagamento-barbaro', nome: 'Salto Esmagador', icon: '🗡️', categoria: 'aoe',
          desc: 'Salta até o ponto marcado e esmaga o chão.',
          danoBase: 35, danoUnidade: 'físico', danoNota: '+ Stun 1.25s',
          mp: 25, cd: 6, escala: 'dano',
          area: 'Raio 75', alcance: 'Salto 160px',
          duracao: null, duracaoBase: null, extras: [] },
        { id: 'vinculo', nome: 'Vínculo Berserker', icon: '⛓️', categoria: 'buff',
          desc: 'Cria um pacto demoníaco com o inimigo mais próximo: concede +20% de vampirismo, +30% de dano e +20% de velocidade de ataque por 10s. O vínculo é quebrado se o alvo morrer ou se afastar.',
          danoBase: null, danoUnidade: null, danoNota: 'Buff 10s',
          mp: 20, cd: 30, escala: 'nenhum',
          area: 'Inimigo mais próximo', alcance: 'Raio 380px',
          duracao: '10s', duracaoBase: 10, extras: ['+20% Vampirismo (cura ao atacar)', '+30% Dano geral', '+20% Velocidade de Ataque', 'Autotarget no inimigo mais próximo', 'Cancela se o alvo morrer ou se distanciar'] }
    ],
    roqueiro: [
        { id: 'riff', nome: 'Riff de Guitarra', icon: '🎸', categoria: 'ataque',
          desc: 'Onda sonora cortante disparada da guitarra.',
          danoBase: 15, danoUnidade: 'mágico', danoNota: null,
          mp: 0, cd: 0.3, escala: 'dano',
          area: 'Projétil', alcance: 'Vel. 12',
          duracao: null, duracaoBase: null, extras: [] },
        { id: 'bateria', nome: 'Bateria Solo', icon: '🥁', categoria: 'canal',
          desc: 'Canal contínuo: toca a bateria e o som estoura inimigos ao redor até a mana acabar. Teleporte não cancela o solo.',
          danoBase: 21, danoUnidade: 'mágico', danoNota: '+ Stun 5s (1x por inimigo)',
          mp: 25, cd: 10, escala: 'dano',
          area: 'Raio 110', alcance: 'Ao redor',
          duracao: 'Canal até a mana acabar', duracaoBase: null, extras: ['Batida a cada 0.5s', 'Cancela ao andar, morrer ou chegar a 10% da mana', 'CD 10s APENAS ao terminar por mana — cancelar manual não tem CD', 'Teleporte não interrompe a bateria'] },
        { id: 'teleporte', nome: 'Stage Dive', icon: '🌠', categoria: 'mobilidade',
          desc: 'Dive estiloso que teleporta o roqueiro até o ponto marcado (não cancela a Bateria ativa).',
          danoBase: null, danoUnidade: null, danoNota: null,
          mp: 15, cd: 8, escala: 'nenhum',
          area: 'Auto', alcance: 'Teleporte 160px',
          duracao: null, duracaoBase: null, extras: ['Não cancela Bateria Solo'] },
        { id: 'banda', nome: 'Chamar a Banda', icon: '🎤', categoria: 'invocacao',
          desc: 'Convoca 1 membro da banda (guitarrista) que ataca junto com você (+50% vel mov, +80% vel atk, +20% dano).',
          danoBase: 12, danoUnidade: 'físico', danoNota: ' por membro / 1.1s',
          mp: 30, cd: 15, escala: 'dano',
          area: 'Persegue o alvo', alcance: 'Via membro',
          duracao: null, duracaoBase: null, extras: ['Conjura 1 membro', '+50% vel mov', '+80% vel ataque', '+20% dano'] },
        { id: 'grito_guerra', nome: 'Grito de Guerra', icon: '📣', categoria: 'buff',
          desc: 'Grito inspirador que fortalece aliados próximos: +30% chance de crítico, +50% dano crítico, +10% velocidade de ataque e +5% vida máxima por 30s. Atualiza atributos em tempo real!',
          danoBase: null, danoUnidade: null, danoNota: null,
          mp: 30, cd: 60, escala: 'buff',
          area: 'Raio 220', alcance: 'Ao redor do Roqueiro',
          duracao: '30s', duracaoBase: 30, extras: ['Aumenta crítico e HP máximo temporariamente', 'Todos ao redor ganham ímpeto de combate'] }
    ],
    ladino: [
        { id: 'adaga', nome: 'Estocada de Adaga', icon: '🗡️', categoria: 'ataque',
          desc: 'Estocada rápida de adaga em cone à frente. Dano físico rápido (400ms).',
          danoBase: 12, danoUnidade: 'físico', danoNota: null,
          mp: 0, cd: 0.4, escala: 'dano',
          area: 'Cone frontal (110px)', alcance: 'Corpo a corpo',
          duracao: null, duracaoBase: null, extras: [] },
        { id: 'danca_das_adagas', nome: 'Dança das Adagas', icon: '💫', categoria: 'mobilidade',
          desc: 'Teleporta entre os inimigos MAIS PRÓXIMOS (limite de 110px) atacando até 5 (inimigos diferentes primeiro) e volta à posição inicial. Fica IMUNE a dano durante a sequência e NÃO consome mana se não houver alvo.',
          danoBase: 15, danoUnidade: 'físico', danoNota: null,
          mp: 25, cd: 12, escala: 'dano',
          area: 'Alvos no raio 110 (mais próximos)', alcance: 'Teleporte entre alvos',
          duracao: null, duracaoBase: null, extras: ['Só os alvos mais próximos', 'Imune durante a dança', 'Retorna à posição inicial'] },
        { id: 'nevoeiro_venenoso', nome: 'Névoa Venenosa', icon: '🧪', categoria: 'zona',
          desc: 'Arremessa uma bomba de veneno que cria uma nuvem tóxica por 5s: cegueira (inimigos cegos erram ataques normais) + dano contínuo. Sair da nuvem remove a cegueira.',
          danoBase: 8, danoUnidade: 'físico', danoNota: ' por 0.5s',
          mp: 20, cd: 8, escala: 'dano',
          area: 'Nuvem raio 90 (mantida)', alcance: 'Lança até 200px (antigo 400px)',
          duracao: '5s', duracaoBase: 5, extras: ['Cegueira enquanto estiver dentro', 'Dano a cada 0.5s'] },
        { id: 'camuflagem_sombria', nome: 'Camuflagem Sombria', icon: '🌑', categoria: 'zona',
          desc: 'Após 1s de canalização, fica INVISÍVEL por 10s. Enquanto invisível os INIMIGOS não atacam (perdem o alvo). O primeiro golpe real que CAUSA dano é dobrado (+100%) e quebra a invisibilidade. O cooldown só começa quando a invisibilidade termina.',
          danoBase: null, danoUnidade: null, danoNota: '+100% no 1º hit',
          mp: 20, cd: 10, escala: 'buff',
          area: 'Auto', alcance: 'Em si mesmo',
          duracao: '10s', duracaoBase: 10, extras: ['Inimigos perdem o alvo (não atacam)', 'Bônus não é gasto por ataques errados', 'CD inicia ao sair da invisibilidade'] },
        { id: 'estrela_da_morte', nome: 'Estrela da Morte', icon: '⭐', categoria: 'aoe',
          desc: 'Traça uma estrela de 5 pontas, percorre os vértices em movimentação dramática e mais lenta, salta ao centro e cai: dano em área + STUN 2s em todos os inimigos na área central. Mobilidade fica TRAVADA durante a coreografia.',
          danoBase: 25, danoUnidade: 'físico', danoNota: '+ Stun 2s',
          mp: 30, cd: 20, escala: 'dano',
          area: 'Estrela raio 120 + impacto raio 90', alcance: 'Marca até 380px',
          duracao: null, duracaoBase: null, extras: ['Coreografia 50% mais lenta', 'Stun 2s nos atingidos', 'Mobilidade travada'] },
        { id: 'laminas_sangrentas', nome: 'Lâminas Sangrentas', icon: '🩸', categoria: 'passiva',
          desc: 'Passiva: 20% de chance de causar SANGRAMENTO — 20% do dano físico causado por segundo durante 5s.',
          danoBase: null, danoUnidade: null, danoNota: '20% /s por 5s',
          mp: 0, cd: 0, escala: 'nenhum',
          area: 'Passiva', alcance: 'Sempre ativa',
          duracao: '5s', duracaoBase: 5, extras: ['Qualquer dano físico seu pode causar'] }
    ],
    // ===== DRONEMASTER (v1.31): drone de apoio e protocolos mecânicos =====
    dronemaster: [
        { id: 'drone_dm', nome: 'Disparo do Drone', icon: '🔫', categoria: 'ataque',
          desc: 'O Drone Companheiro dispara um tiro de energia de curta distância (90px).',
          danoBase: 13, danoUnidade: 'físico', danoNota: null,
          mp: 0, cd: 0.56, escala: 'dano',
          area: 'Linha de tiro (90px)', alcance: 'Curta distância',
          duracao: null, duracaoBase: null, extras: [] },
        { id: 'supressao_dm', nome: 'Modo Supressão', icon: '🎯', categoria: 'aoe',
          desc: 'O Drone mira e dispara contra até 3 inimigos ao mesmo tempo durante 5s (cadência própria).',
          danoBase: 12, danoUnidade: 'físico', danoNota: 'até 3 alvos',
          mp: 25, cd: 10, escala: 'dano',
          area: 'Raio 300 em volta do Drone', alcance: 'Drone (segue o dono)',
          duracao: '5s', duracaoBase: 5, extras: ['Até 3 alvos simultâneos', 'Dano a cada ~0,4s'] },
        { id: 'assalto_dm', nome: 'Modo Assalto', icon: '🤖', categoria: 'invocacao',
          desc: 'O Drone se transforma em um mini robô de combate corpo a corpo por 8s (+50% vel atk): persegue o inimigo mais próximo e ataca com o DOBRO do dano básico. Nunca ultrapassa a distância máxima do dono.',
          danoBase: 13, danoUnidade: 'físico', danoNota: '×2 no corpo a corpo',
          mp: 25, cd: 15, escala: 'dano',
          area: 'Persegue o alvo', alcance: 'Até 340px do dono',
          duracao: '8s', duracaoBase: 8, extras: ['Dano ×2', '+50% velocidade de ataque', 'Limite de distância do dono'] },
        { id: 'caixa_dm', nome: 'Caixa de Ferramentas', icon: '🧰', categoria: 'zona',
          desc: 'Coloca uma caixa de ferramentas no chão por 10s: VOCÊ recebe o escudo na hora e aliados próximos também — ESCUDO de 50% da vida máxima (não acumula).',
          danoBase: null, danoUnidade: null, danoNota: 'Escudo 50% vida máx',
          mp: 30, cd: 15, escala: 'buff',
          area: 'Caixa raio 140', alcance: 'Lança até 200px',
          duracao: '10s', duracaoBase: 10, extras: ['Dono sempre recebe o escudo', 'Escudo só uma vez por aliado', 'Não sobrescreve escudos ativos'] },
        { id: 'tita_dm', nome: 'Protocolo Titã', icon: '🦾', categoria: 'buff',
          desc: 'O DroneMaster se funde ao Drone virando um gigante de guerra por 10s: +30% dano, +30% defesa e +20% de chance de crítico. Se MORRER na forma, ele "revive" com 50% da vida máxima — disponível novamente só após 5 minutos.',
          danoBase: 15, danoUnidade: 'físico', danoNota: '+30% dano/def +20% crit',
          mp: 40, cd: 45, escala: 'dano',
          area: 'Forma Robô', alcance: 'Em si mesmo',
          duracao: '10s', duracaoBase: 10, extras: ['Morte = revive 50% + CD 5min', 'Bônus de dano, defesa e crítico'] },
        { id: 'drone_companheiro', nome: 'Drone Companheiro (Passiva)', icon: '⚙️', categoria: 'passiva',
          desc: 'O Drone te acompanha em órbita curando o DroneMaster em 2% da VIDA MÁXIMA por segundo.',
          danoBase: null, danoUnidade: null, danoNota: '+2% vida máx/s',
          mp: 0, cd: 0, escala: 'nenhum',
          area: 'Passiva', alcance: 'Sempre ativa',
          duracao: null, duracaoBase: null, extras: ['Cura contínua enquanto vivo', 'Dash vira escudo tecnológico de 50% por 3s'] }
    ],
    // ===== ARQUEIRO ASTRAL (v2): cometas, constelações e estrelas =====
    arqueiro_arcano: [
        { id: 'flecha_astral', nome: 'Disparo Estelar', icon: '🌠', categoria: 'ataque',
          desc: 'Flecha-cometa de luz estelar (Dano Mágico escalado com Inteligência). Deixa um rastro cósmico por onde passa.',
          danoBase: 16, danoUnidade: 'mágico', danoNota: null,
          mp: 0, cd: 0.5, escala: 'dano',
          area: 'Linha (260px)', alcance: 'À distância',
          duracao: null, duracaoBase: null, extras: ['Rastro de estrelas', 'Dano 100% Mágico'] },
        { id: 'cometas_astral', nome: 'Chuva de Cometas', icon: '☄️', categoria: 'zona',
          desc: 'Cometa que explode no alvo: dano de impacto + CHUVA DE COMETAS caindo no chão por 4s.',
          danoBase: 22, danoUnidade: 'mágico', danoNota: '+ chuva 4s',
          mp: 25, cd: 7, escala: 'dano',
          area: 'Explosão raio 85 + chuva 4s', alcance: 'Até 300px',
          duracao: '4s', duracaoBase: 4, extras: ['Chuva de cometas por 4s', 'Dano 100% Mágico'] },
        { id: 'orbe_constelacao', nome: 'Orbe de Constelação', icon: '✨', categoria: 'zona',
          desc: 'Arremessa um orbe estelar que cria uma constelação no chão: CATIVRA os inimigos por 2s e implode com dano de estrelas.',
          danoBase: 26, danoUnidade: 'mágico', danoNota: 'cativeiro 2s',
          mp: 25, cd: 8, escala: 'dano',
          area: 'Constelação raio 100', alcance: 'Até 260px',
          duracao: '2s', duracaoBase: 2, extras: ['Cativeiro 2s', 'Implosão estelar', 'Dano 100% Mágico'] },
        { id: 'cascata_estelar', nome: 'Cascata Estelar', icon: '🌌', categoria: 'aoe',
          desc: 'Solta uma onda de estrelas em cone que IMPEDE o movimento dos inimigos atingidos por 2s (root).',
          danoBase: null, danoUnidade: null, danoNota: 'Root 2s',
          mp: 25, cd: 8, escala: 'buff',
          area: 'Cone 280px de frente', alcance: 'Direcional',
          duracao: '2s', duracaoBase: 2, extras: ['Impede movimento 2s'] },
        { id: 'buraco_negro', nome: 'Buraco Negro Astral', icon: '🌌', categoria: 'zona',
          desc: 'Abre um buraco negro por 3s que suga inimigos em área, aplica lentidão e causa dano contínuo.',
          danoBase: 5, danoUnidade: 'mágico', danoNota: 'sucção + lentidão',
          mp: 40, cd: 25, escala: 'dano',
          area: 'Sucção raio 200', alcance: 'Mira até 300px',
          duracao: '3s', duracaoBase: 3, extras: ['Suga inimigos para dentro', 'Lentidão 20%', 'Dano contínuo'] }
    ],
    // ===== SNIPER (v1.31): precisão, camuflagem e posição =====
    sniper: [
        { id: 'tiro_barrett', nome: 'Tiro de Barrett', icon: '🔫', categoria: 'ataque',
          desc: 'Disparo de longo alcance que PERFURA todos os inimigos na linha (384px).',
          danoBase: 30, danoUnidade: 'físico', danoNota: 'perfurante',
          mp: 0, cd: 0.94, escala: 'dano',
          area: 'Linha perfurante (384px)', alcance: 'Longo alcance',
          duracao: null, duracaoBase: null, extras: ['Atravessa inimigos'] },
        { id: 'disparo_supremo', nome: 'Disparo Supremo', icon: '💥', categoria: 'ataque',
          desc: 'Prepara a mira por até 3s (não pode se mover). No disparo: dano ×3 em UM inimigo (+20% de dano base). Se não disparar em 3s, a preparação encerra e o cooldown inicia.',
          danoBase: 54, danoUnidade: 'físico', danoNota: '×3 em 1 alvo',
          mp: 30, cd: 20, escala: 'dano',
          area: '1 inimigo (mira)', alcance: 'Até 700px',
          duracao: '3s (janela de mira)', duracaoBase: 3, extras: ['Mira bloqueia movimento', '×3 dano num único alvo (+20% base)'] },
        { id: 'arame_rede', nome: 'Arame Prendedor', icon: '🕸️', categoria: 'zona',
          desc: 'Arremessa um arame que cria uma rede no chão por 3s: PRENDE o primeiro inimigo atingido e qualquer inimigo que entre nela (não podem se mover).',
          danoBase: null, danoUnidade: null, danoNota: 'Root 3s',
          mp: 15, cd: 10, escala: 'buff',
          area: 'Rede no chão (60px)', alcance: 'Até 320px',
          duracao: '3s', duracaoBase: 3, extras: ['Pega o primeiro inimigo + quem entrar', 'Rede visível no chão'] },
        { id: 'camuflagem_natural', nome: 'Camuflagem Natural', icon: '🌿', categoria: 'buff',
          desc: 'SÓ funciona dentro de moitas de mato: fica camuflado até sair da moita ou dar o 1º tiro. Reset do cooldown da Skill 1; os cooldowns das outras skills CONGELAM enquanto camuflado.',
          danoBase: null, danoUnidade: null, danoNota: 'esconderijo natural',
          mp: 0, cd: 0, escala: 'buff',
          area: 'Auto', alcance: 'Dentro do mato',
          duracao: 'Ilimitado (até sair/atacar)', duracaoBase: null, extras: ['Reset CD Skill 1', 'CDs das outras skills congelam'] },
        { id: 'posicao_sniper', nome: 'Posição de Franco-Atirador', icon: '🎯', categoria: 'buff',
          desc: 'Deita no chão: não pode se mover, reseta o cooldown do Disparo Supremo imediatamente, garante 100% de chance de crítico, +100% de dano (×2) e detecta inimigos INVISÍVEIS dentro do raio.',
          danoBase: null, danoUnidade: null, danoNota: '+100% dano & crit garantido',
          mp: 30, cd: 15, escala: 'buff',
          area: 'Auto (deitado)', alcance: 'Detecção 420px',
          duracao: 'Até cancelar', duracaoBase: null, extras: ['Bloqueia movimento', 'Reseta CD Disparo Supremo', '+100% crítico garantido', 'Detecta invisíveis', '+100% dano em tudo'] }
    ],
    pikeman: [
        { id: 'instinto_morte', nome: 'Instinto da Morte', icon: '☠️', categoria: 'passiva',
          desc: 'PASSIVA: +10% de chance de crítico, +50% de dano crítico e +20% de dano (×1.20) contra inimigos sob LENTIDÃO ou CONGELAMENTO. Sinergia perfeita com a Geada da Morte.',
          danoBase: null, danoUnidade: null, danoNota: '+10% crit · +50% dano crit · ×1.20 vs lentos',
          mp: 0, cd: 0, escala: 'buff',
          area: 'Passiva', alcance: 'Sempre ativa',
          duracao: null, duracaoBase: null, extras: ['+10% chance de crítico', '+50% dano crítico', '+20% dano vs Lentidão/Congelamento'] },
        { id: 'foicada', nome: 'Foicada', icon: '🔪', categoria: 'ataque',
          desc: 'Golpe rápido da Foice Curta num cone à frente do herói.',
          danoBase: 13, danoUnidade: 'físico', danoNota: null,
          mp: 0, cd: 0.42, escala: 'dano',
          area: 'Cone frontal (100px)', alcance: 'Corpo a corpo',
          duracao: null, duracaoBase: null, extras: [] },
        { id: 'giro_foice', nome: 'Giro da Foice', icon: '<img src="imagem/HUD/skills/Slotbar/Pike/skill_01.png" class="skill-icon-img" alt="Giro da Foice" />', categoria: 'aoe',
          desc: 'Gira a Foice da Morte em 360°: corta todos os inimigos ao redor com rastro acompanhando a lâmina.',
          danoBase: 26, danoUnidade: 'físico', danoNota: null,
          mp: 25, cd: 7, escala: 'dano',
          area: 'Raio 143', alcance: 'Ao redor',
          duracao: null, duracaoBase: null, extras: [] },
        { id: 'pirueta_morte', nome: 'Pirueta da Morte', icon: '✴️', categoria: 'ataque',
          desc: '3 cortes rápidos em sequência (corte→giro→corte→giro→corte final). Cada golpe é contabilizado separadamente e o 3º tem impacto muito maior.',
          danoBase: 18, danoUnidade: 'físico', danoNota: '3 golpes × 18',
          mp: 22, cd: 10, escala: 'dano',
          area: '1 inimigo', alcance: 'Até 120px',
          duracao: null, duracaoBase: null, extras: ['3 golpes separados', '3º golpe com impacto maior'] },
        { id: 'geada_morte', nome: 'Geada da Morte', icon: '🧊', categoria: 'aoe',
          desc: 'Onda congelante ao redor: causa dano e aplica 60% de LENTIDÃO por 3s. Inimigos afetados recebem +20% de dano do Pikeman (Instinto da Morte).',
          danoBase: 14, danoUnidade: 'físico', danoNota: '60% lentidão 3s',
          mp: 25, cd: 12, escala: 'dano',
          area: 'Raio 130', alcance: 'Ao redor',
          duracao: '3s', duracaoBase: 3, extras: ['Lentidão 60% (3s)', 'Ativa Instinto da Morte (+20%)'] },
        { id: 'execucao_morte', nome: 'Execução da Morte', icon: '💀', categoria: 'canal',
          desc: 'Carrega a foice por 3s (barra 0→100% acima do personagem + tremor) e desfere 3 golpes devastadores: TAAA → TAAA → TAAAAAAAA. Não pode se mover enquanto carrega.',
          danoBase: 42, danoUnidade: 'físico', danoNota: '3 golpes × 42',
          mp: 35, cd: 30, escala: 'dano',
          area: '1 inimigo', alcance: 'Até 125px',
          duracao: '3s de carga', duracaoBase: 3, extras: ['Canal de 3s', '3 golpes separados', 'Tremor de tela', 'Barra de carga acima do personagem', 'Cancela ao se mover'] }
    ],
    guerreiro_kaledron: [
        { id: 'kaledron_corte', nome: 'Corte Ígneo', icon: '🔥', categoria: 'ataque',
          desc: 'Corte violento com o montante colossal flutuante banhado em runas de fogo.',
          danoBase: 16, danoUnidade: 'físico', danoNota: null,
          mp: 0, cd: 0.42, escala: 'dano',
          area: 'Cone frontal (95px)', alcance: 'Corpo a corpo',
          duracao: null, duracaoBase: null, extras: [] },
        { id: 'slash_strike', nome: 'Golpe Fulminante', icon: '⚔️', categoria: 'ataque',
          desc: 'Corte violento acumulando energia ígnea com projeção de onda cortante de magma (160% de dano).',
          danoBase: 30, danoUnidade: 'físico', danoNota: '160% Dano',
          mp: 15, cd: 4, escala: 'dano',
          area: 'Linha/Cone (140px)', alcance: 'Até 140px',
          duracao: null, duracaoBase: null, extras: ['Projeta onda de magma cortante', '160% multiplicador de dano'] },
        { id: 'ground_slam', nome: 'Impacto Terrestre', icon: '💥', categoria: 'aoe',
          desc: 'Salto e enterro do montante colossal no solo, criando cratera vulcânica de raio 110px com erupção, dano massivo e Atordoamento (Stun) de 1.5s.',
          danoBase: 45, danoUnidade: 'físico', danoNota: 'Stun 1.5s',
          mp: 25, cd: 10, escala: 'dano',
          area: 'Raio 110px', alcance: 'Ao redor',
          duracao: '1.5s Stun', duracaoBase: 1.5, extras: ['Abre cratera vulcânica', 'Atordoa inimigos por 1.5s', 'Dano massivo em área'] },
        { id: 'whirlwind', nome: 'Redemoinho de Aço', icon: '🌪️', categoria: 'aoe',
          desc: 'Kaledron comanda o montante a orbitar em alta velocidade por 3s, atingindo inimigos próximos com 10 golpes rápidos.',
          danoBase: 60, danoUnidade: 'físico', danoNota: '60 de dano total em 10 hits',
          mp: 30, cd: 12, escala: 'dano',
          area: 'Raio 120px', alcance: 'Ao redor',
          duracao: '3s', duracaoBase: 3, extras: ['10 hits rápidos', 'Atinge todos os inimigos ao redor', '60 de dano base total'] },
        { id: 'battle_cry', nome: 'Brado de Guerra Vulcânico', icon: '📢', categoria: 'buff',
          desc: 'Ergue as manoplas aos céus liberando um pilar colossal de fumaça e fogo que concede +35% dano físico e +20% vel. de ataque por 10s.',
          danoBase: 0, danoUnidade: null, danoNota: '+35% Dano / +20% Vel Atk',
          mp: 20, cd: 25, escala: 'nenhum',
          area: 'Raio 240px', alcance: 'Grupo',
          duracao: '10s', duracaoBase: 10, extras: ['+35% Dano Físico por 10s', '+20% Velocidade de Ataque', 'Afeta Kaledron e aliados próximos'] },
        { id: 'forja_solar', nome: 'Forja Solar (Passiva)', icon: '🛡️', categoria: 'passiva',
          desc: 'Aço temperado das forjas de Solari: reduz todo dano físico recebido em 10% e regenera vida gradualmente.',
          danoBase: 0, danoUnidade: null, danoNota: '-10% Dano Físico',
          mp: 0, cd: null, escala: 'nenhum',
          area: 'Próprio', alcance: '—',
          duracao: 'Passiva', duracaoBase: null, extras: ['-10% dano físico sofrido', 'Resistência ao fogo e calor'] }
    ]
};

SKILLS_INFO.arqueiro_astral = SKILLS_INFO.arqueiro_arcano;
if (typeof window !== 'undefined') window.SKILLS_INFO = SKILLS_INFO;
if (typeof module !== 'undefined' && module.exports) module.exports = { SKILLS_INFO };

const NOMES_CLASSES = {
    guerreiro: 'GUERREIRO', mago: 'MAGO', summoner: 'SUMMONER', arqueiro: 'ARQUEIRO',
    curandeiro: 'CURANDEIRO', barbaro: 'BÁRBARO', roqueiro: 'ROQUEIRO', ladino: 'LADINO',
    dronemaster: 'DRONEMASTER', arqueiro_arcano: 'ARQUEIRO ASTRAL', arqueiro_astral: 'ARQUEIRO ASTRAL', sniper: 'SNIPER',
    pikeman: 'PIKEMAN', guerreiro_kaledron: 'GUERREIRO KALEDRON', lord_malakar: 'LORD MALAKAR'
};

const LABELS_CATEGORIA = {
    ataque: 'ATAQUE', aoe: 'AOE', zona: 'ZONA', canal: 'CANAL', cura: 'CURA',
    buff: 'BUFF', mobilidade: 'MOBILIDADE', invocacao: 'INVOCAÇÃO', suporte: 'SUPORTE', passiva: 'PASSIVA'
};

function skillScreenEl() { return document.getElementById("skills-screen"); }
function skillsListaEl() { return document.getElementById("skills-lista"); }
function skillsDetalheEl() { return document.getElementById("skills-detalhe"); }
function skillsClasseTagEl() { return document.getElementById("skills-classe-tag"); }

function obterNivelSkill(classe, id) {
    let n = window.skillsNiveis[id];
    return n ? n : 1;
}

function valorEscalado(skill, nivel) {
    if (skill.escala === 'dano' || skill.escala === 'cura') {
        const escalado = Math.round(skill.danoBase * (1 + (nivel - 1) * 0.25));
        return Math.round(escalado * (skill.danoMultiplicadorBase || 1));
    }
    if (skill.escala === 'duracao') {
        return Math.round(skill.duracaoBase * (1 + (nivel - 1) * 0.1));
    }
    return null;
}

// Espelha as regras de escala por ATRIBUTO do server.js (calcularDanoJogador/calcularCuraJogador):
// cura -> Divindade; golpes de pet -> herança por Afinidade; Malakar -> Afinidade;
// dano contínuo ('/s' ou '/ n s') -> Profanidade; classes mágicas -> Inteligência; demais -> Força.
function atributoEscalaSkill(skill) {
    if (skill.escala === 'cura') return { chave: 'divindade', rotulo: 'Divindade' };
    if (skill.id === 'ogro' || skill.id === 'esmagamento' || skill.id === 'salto' || skill.id === 'colossal' || skill.id === 'sismico') return { chave: 'afinidade', rotulo: 'Afinidade' };
    // 'banda' (Roqueiro) também é dano de INVOCADO -> servidor usa origem 'pet' -> Afinidade
    if (skill.id === 'banda') return { chave: 'afinidade', rotulo: 'Afinidade' };
    if (window.minhaClasse === 'lord_malakar') return { chave: 'afinidade', rotulo: 'Afinidade' };
    if (skill.danoNota && /\/\s*\d*s/.test(skill.danoNota)) return { chave: 'profanidade', rotulo: 'Profanidade' };
    if (['mago', 'summoner', 'curandeiro', 'roqueiro', 'arqueiro_arcano', 'arqueiro_astral'].indexOf(window.minhaClasse) !== -1) return { chave: 'inteligencia', rotulo: 'Inteligência' };
    return { chave: 'forca', rotulo: 'Força' };
}

function valorComAtributo(skill, nivel) {
    let atr = atributoEscalaSkill(skill);
    if (!skill.danoBase || (skill.escala !== 'dano' && skill.escala !== 'cura')) return null;
    let tot = window.atributosTotais && window.atributosTotais[atr.chave];
    if (!tot) return null;
    const baseDano = valorEscalado(skill, nivel === undefined ? 1 : nivel);
    const pontos = Math.max(0, tot - 1);
    let dano = baseDano;
    if (atr.chave === 'forca') dano += pontos;
    else if (atr.chave === 'inteligencia') dano += pontos * 10;
    else if (atr.chave === 'profanidade') dano = Math.round(baseDano * (1 + pontos * 0.01));
    else if (!(atr.chave === 'afinidade' &&
        ['ogro', 'esmagamento', 'salto', 'colossal', 'sismico', 'banda'].indexOf(skill.id) !== -1)) {
        dano = Math.round(baseDano * (1 + pontos * 0.05));
    }
    return Math.round(dano * (skill.danoMultiplicadorFinal || 1));
}

function textoEscalaAtributo(skill) {
    const atributo = atributoEscalaSkill(skill);
    if (atributo.chave === 'forca') return '+1 dano por ponto de Força';
    if (atributo.chave === 'inteligencia') return '+10 dano por ponto de Inteligência';
    if (atributo.chave === 'profanidade') return '+1% DoT por ponto de Profanidade';
    if (atributo.chave === 'divindade') return '+5% cura por ponto de Divindade';
    if (atributo.chave === 'afinidade' &&
        ['ogro', 'esmagamento', 'salto', 'colossal', 'sismico', 'banda'].indexOf(skill.id) !== -1) {
        return 'Escala com atributos herdados do lacaio';
    }
    if (atributo.chave === 'afinidade') return '+5% dano por ponto de Afinidade';
    return '+5% por ' + atributo.rotulo;
}

function classificarGrupoSkill(skill) {
    if (skill.categoria === 'passiva' || (skill.id && skill.id.includes('passiva')) || (skill.nome && skill.nome.toLowerCase().includes('(passiva)'))) {
        return 'passivas';
    }
    // Todas as 4 habilidades ativas do Summoner devem ser listadas juntas nas Ativas da Action Bar
    if (['esmagamento', 'salto', 'colossal', 'sismico', 'orbe'].indexOf(skill.id) !== -1) {
        return 'ativas';
    }
    if (['cura', 'buff', 'mobilidade', 'invocacao'].indexOf(skill.categoria) !== -1) {
        return 'suporte';
    }
    return 'ativas';
}

window.skillSelecionadaId = null;

function selecionarSkill(id) {
    window.skillSelecionadaId = id;
    renderizarSkills();

    // Tutorial: o jogador precisa realmente abrir uma descrição de skill.
    // Só abrir a janela não conta como leitura.
    if (window.tutorialState && window.tutorialState.etapa === 2 && window.tutorialState.skillAberta &&
        typeof ws !== 'undefined' && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'tutorial_skill_viewed' }));
    }
}
window.selecionarSkill = selecionarSkill;

function abrirSkills() {
    if (window.estaMorto) return;
    if (charSelectScreen && charSelectScreen.style.display === "flex") return;
    if (window.inventarioAberto) fecharInventario();
    window.skillsAberto = true;
    let screen = skillScreenEl();
    if (screen) screen.style.display = "flex";
    renderizarSkills();
    // No tutorial, a mensagem lateral deve permanecer visível enquanto Skills está aberta.
    // Apenas registra que a janela foi aberta; a leitura da Skill será o próximo passo.
    if (window.tutorialState && window.tutorialState.etapa === 2 && typeof ws !== 'undefined' && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'tutorial_skill_opened' }));
    }
}

function fecharSkills() {
    const estavaAberta = !!window.skillsAberto;
    window.skillsAberto = false;
    let screen = skillScreenEl();
    if (screen) screen.style.display = "none";
    if (estavaAberta && window.tutorialState && window.tutorialState.etapa === 2 && typeof ws !== 'undefined' && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'tutorial_skill_closed' }));
    }
}

function toggleSkills() {
    if (window.skillsAberto) fecharSkills(); else abrirSkills();
}

function renderizarSkills() {
    let listaEl = skillsListaEl();
    let detalheEl = skillsDetalheEl();
    if (!listaEl || !detalheEl) return;

    let classe = window.minhaClasse || 'guerreiro';
    let skills = SKILLS_INFO[classe] || [];

    // Tag da classe no cabeçalho
    let tag = skillsClasseTagEl();
    if (tag) {
        let nomeClasse = (NOMES_CLASSES[classe] || classe).toUpperCase();
        tag.innerHTML = '<span class="star-ico">✦</span> ' + nomeClasse + ' <span class="star-ico">✦</span>';
    }
    let creditosIcones = document.getElementById("skills-icon-credits");
    if (creditosIcones) creditosIcones.style.display = classe === 'summoner' ? 'inline-flex' : 'none';

    // Saldo de pontos no rodapé
    let pontos = window.pontosHabilidade || 0;
    let pontosBar = document.getElementById("skills-pontos-bar");
    if (pontosBar) {
        pontosBar.innerHTML = '🎯 Pontos de habilidade disponíveis: <b>' + pontos + '</b>';
    }

    // Se nenhuma skill selecionada ou ID não pertence à classe atual, seleciona a primeira
    if (!window.skillSelecionadaId || !skills.some(s => s.id === window.skillSelecionadaId)) {
        window.skillSelecionadaId = skills.length > 0 ? skills[0].id : null;
    }

    // 1. RENDERIZAR COLUNA ESQUERDA (Grade com Categorias)
    listaEl.innerHTML = "";

    const GRUPOS = [
        { key: 'ativas', label: 'ATIVAS' },
        { key: 'passivas', label: 'PASSIVAS' },
        { key: 'suporte', label: 'SUPORTE' }
    ];

    GRUPOS.forEach(g => {
        let skillsDoGrupo = skills.filter(s => classificarGrupoSkill(s) === g.key);
        if (skillsDoGrupo.length === 0) return;

        let bloco = document.createElement("div");
        bloco.className = "skill-grupo-bloco";

        let header = document.createElement("div");
        header.className = "skill-grupo-header";
        header.innerHTML = '<span class="skill-grupo-losango">◇</span> ' + g.label;
        bloco.appendChild(header);

        let grid = document.createElement("div");
        grid.className = "skill-grupo-grid";

        skillsDoGrupo.forEach(skill => {
            let nivel = obterNivelSkill(classe, skill.id);
            let selecionada = (skill.id === window.skillSelecionadaId);

            // Suporte visual à Árvore de Upgrades
            let temArvore = (typeof SkillUpgradeTree !== 'undefined') && SkillUpgradeTree.obterSkillsParticipantes(classe).includes(skill.id);
            let pipsHtml = '';
            let diamondHtml = '';
            if (temArvore && typeof window.obterPipsSkill === 'function') {
                let qtdUp = window.obterQtdUpgradesSkill(skill.id);
                let pipsClass = qtdUp === 4 ? 'skill-upgrade-pips maximo' : (qtdUp > 0 ? 'skill-upgrade-pips tem-upgrades' : 'skill-upgrade-pips');
                pipsHtml = '<div class="' + pipsClass + '" title="' + qtdUp + '/4 Upgrades de Árvore">' + window.obterPipsSkill(skill.id) + '</div>';
                if (typeof window.podeReceberUpgrade === 'function' && window.podeReceberUpgrade(skill.id)) {
                    diamondHtml = '<div class="skill-upgrade-diamond" onclick="event.stopPropagation(); abrirSkillTreeModal(\'' + skill.id + '\');" title="Upgrade de Habilidade Disponível! Clique para abrir a Árvore de Upgrades">◆</div>';
                }
            }

            let card = document.createElement("div");
            card.className = "skill-slot-card" + (selecionada ? " selected" : "");
            card.title = skill.nome + " (Nv " + nivel + ")";
            card.onclick = function() { selecionarSkill(skill.id); };

            card.innerHTML = 
                diamondHtml +
                '<div class="skill-slot-moldura">' + skillIconeHtml(skill) + '</div>' +
                '<span class="skill-slot-nv">Nv ' + nivel + '</span>' +
                '<div class="skill-slot-nome">' + skill.nome + '</div>' +
                pipsHtml;

            grid.appendChild(card);
        });

        bloco.appendChild(grid);
        listaEl.appendChild(bloco);
    });

    // 2. RENDERIZAR COLUNA DIREITA (Detalhes da Habilidade Selecionada)
    detalheEl.innerHTML = "";

    let skillSel = skills.find(s => s.id === window.skillSelecionadaId) || skills[0];
    if (!skillSel) {
        detalheEl.innerHTML = '<div style="text-align:center;color:#8fa5b0;margin-top:40px;">Selecione uma habilidade para ver os detalhes.</div>';
        return;
    }

    let nivel = obterNivelSkill(classe, skillSel.id);
    let escalado = valorEscalado(skillSel, nivel);
    let comAtr = valorComAtributo(skillSel, nivel);
    let principal = comAtr !== null ? comAtr : (escalado !== null ? escalado : (skillSel.danoBase || 0));

    let grupo = classificarGrupoSkill(skillSel);
    let badgeClasse = grupo === 'passivas' ? 'badge-passiva' : (grupo === 'suporte' ? 'badge-suporte' : 'badge-ativa');
    let badgeTexto = grupo === 'passivas' ? 'PASSIVA' : (grupo === 'suporte' ? 'SUPORTE' : 'ATIVA');

    // Dano / Cura
    let linhaDano = "";
    if (skillSel.danoBase && (skillSel.escala === 'dano' || skillSel.escala === 'cura')) {
        let icone = skillSel.escala === 'cura' ? '💖 Cura' : '⚔️ Dano';
        let corNota = skillSel.escala === 'cura' ? '#27ae60' : '#e67e22';
        let notaAtr = comAtr !== null
            ? ' <span style="color:#9b59b6">(' + textoEscalaAtributo(skillSel) + ')</span>'
            : '';
        linhaDano = '<div class="skill-det-stat"><b>' + icone + ':</b> ' + principal + notaAtr + (skillSel.danoUnidade && skillSel.escala !== 'cura' ? ' ' + skillSel.danoUnidade : '') + (skillSel.danoNota ? ' <span style="color:' + corNota + '">' + skillSel.danoNota + '</span>' : '') + '</div>';
    } else {
        linhaDano = '<div class="skill-det-stat"><b>⚔️ Dano:</b> —</div>';
    }

    let duracaoLinha = skillSel.duracao
        ? '<div class="skill-det-stat"><b>⏳ Duração:</b> ' + (skillSel.escala === 'duracao' ? escalado + 's' : skillSel.duracao) + '</div>'
        : '<div class="skill-det-stat"><b>⏳ Duração:</b> —</div>';

    let custoMp = skillSel.mp ? Math.round(skillSel.mp * (1 + (nivel - 1) * 0.06)) : 0;
    let cooldownExibido = (skillSel.cd === null || skillSel.cd === undefined) ? '—' : (skillSel.cd >= 60 ? Math.floor(skillSel.cd / 60) + ':' + String(skillSel.cd % 60).padStart(2, '0') : skillSel.cd + 's');

    // Botão de Upgrade
    let btnUpgrade;
    if (skillSel.melhoravel === false) {
        btnUpgrade = '<button class="btn-det-melhorar" disabled>EFEITO FIXO</button>';
    } else if (nivel >= NIVEL_SKILL_MAX) {
        btnUpgrade = '<button class="btn-det-melhorar max" disabled>MÁXIMO</button>';
    } else if (pontos <= 0) {
        btnUpgrade = '<button class="btn-det-melhorar" disabled>⬆ MELHORAR</button>';
    } else {
        btnUpgrade = '<button class="btn-det-melhorar" onclick="melhorarSkill(\'' + skillSel.id + '\')">⬆ MELHORAR</button>';
    }

    // Texto de Bônus por Nível
    let bonusTexto = "Dano/Cura +25% · MP +6%";
    if (skillSel.melhoravel === false) bonusTexto = "Efeito fixo, sem progressão por nível.";
    else if (skillSel.escala === 'duracao') bonusTexto = "Duração +10% / nível · MP +6% / nível";
    else if (skillSel.escala === 'nenhum' && !skillSel.danoBase) bonusTexto = "Efeito base constante · MP +6% / nível";

    // Prévia do Próximo Nível
    let proximoNivelHtml = "";
    if (skillSel.melhoravel === false) {
        proximoNivelHtml = '<div class="skill-det-next-box"><div class="skill-det-next-max">Bônus fixos durante 10s. A provocação dura 2s.</div></div>';
    } else if (nivel < NIVEL_SKILL_MAX) {
        let proxNivel = nivel + 1;
        let escaladoProx = valorEscalado(skillSel, proxNivel);
        let comAtrProx = valorComAtributo(skillSel, proxNivel);
        let principalProx = comAtrProx !== null ? comAtrProx : (escaladoProx !== null ? escaladoProx : (skillSel.danoBase || 0));
        let custoMpProx = skillSel.mp ? Math.round(skillSel.mp * (1 + (proxNivel - 1) * 0.06)) : 0;

        let danoProxStr = (skillSel.danoBase && (skillSel.escala === 'dano' || skillSel.escala === 'cura'))
            ? principal + ' → <b>' + principalProx + '</b>'
            : 'Igual';

        let mpProxStr = skillSel.mp ? custoMp + ' → <b>' + custoMpProx + '</b>' : '0 → 0';

        proximoNivelHtml = 
            '<div class="skill-det-next-box">' +
                '<div class="skill-det-next-titulo">Próximo nível:</div>' +
                '<div class="skill-det-next-grid">' +
                    '<div class="skill-det-next-stat">⚔️ Dano/Cura: ' + danoProxStr + '</div>' +
                    '<div class="skill-det-next-stat">🎯 Área: Igual</div>' +
                    '<div class="skill-det-next-stat">💧 MP: ' + mpProxStr + '</div>' +
                    '<div class="skill-det-next-stat">⏱️ Cooldown: ' + cooldownExibido + ' → ' + cooldownExibido + '</div>' +
                '</div>' +
            '</div>';
    } else {
        proximoNivelHtml = 
            '<div class="skill-det-next-box">' +
                '<div class="skill-det-next-max">✨ Habilidade no Nível Máximo (10/10)</div>' +
            '</div>';
    }

        let temArvoreSel = (typeof SkillUpgradeTree !== 'undefined') && SkillUpgradeTree.obterSkillsParticipantes(classe).includes(skillSel.id);
        let btnArvoreHtml = '';
        if (temArvoreSel) {
            let qtdUp = (typeof window.obterQtdUpgradesSkill === 'function') ? window.obterQtdUpgradesSkill(skillSel.id) : 0;
            let podeUp = (typeof window.podeReceberUpgrade === 'function') ? window.podeReceberUpgrade(skillSel.id) : false;
            let badgeNotif = podeUp ? ' has-notification' : '';
            btnArvoreHtml = '<div style="margin-top:6px;margin-bottom:8px;text-align:center;"><button class="btn-det-upgrade-tree' + badgeNotif + '" onclick="abrirSkillTreeModal(\'' + skillSel.id + '\')">🌳 ÁRVORE DE UPGRADES (' + qtdUp + '/4)' + (podeUp ? ' ◆' : '') + '</button></div>';
        }

        detalheEl.innerHTML =
        '<div class="skill-det-titulo">DETALHES DA HABILIDADE</div>' +
        '<div class="skill-det-header">' +
            '<div class="skill-det-ico-wrap">' + skillIconeHtml(skillSel) + '</div>' +
            '<div class="skill-det-info">' +
                '<div class="skill-det-nome-row">' +
                    '<span class="skill-det-nome">' + skillSel.nome + '</span>' +
                    '<span class="skill-det-badge ' + badgeClasse + '">' + badgeTexto + '</span>' +
                '</div>' +
                '<div class="skill-det-nv-txt">Nível <b>' + nivel + '</b>/' + NIVEL_SKILL_MAX + '</div>' +
            '</div>' +
        '</div>' +
        '<div class="skill-det-desc">' + skillSel.desc + '</div>' +
        '<div class="skill-det-stats-box">' +
            '<div class="skill-det-stats-grid">' +
                linhaDano +
                '<div class="skill-det-stat"><b>💧 MP:</b> ' + (custoMp > 0 ? custoMp : 0) + '</div>' +
                '<div class="skill-det-stat"><b>🔵 Área:</b> ' + (skillSel.area || '—') + '</div>' +
                '<div class="skill-det-stat"><b>🎯 Alcance:</b> ' + (skillSel.alcance || '—') + '</div>' +
                duracaoLinha +
                '<div class="skill-det-stat"><b>⏱️ Cooldown:</b> ' + cooldownExibido + '</div>' +
            '</div>' +
        '</div>' +
        '<div class="skill-det-bonus-box">' +
            '<div class="skill-det-bonus-titulo">Bônus por nível:</div>' +
            '<div class="skill-det-bonus-desc">' + bonusTexto + '</div>' +
        '</div>' +
        '<div class="skill-det-actions">' +
            '<span class="skill-det-actions-nv">Nível <b>' + nivel + '</b>/' + NIVEL_SKILL_MAX + '</span>' +
            btnUpgrade +
            '<button class="btn-det-reset" onclick="resetarSkill(\'' + skillSel.id + '\')" title="Resetar esta habilidade">↺</button>' +
        '</div>' +
        btnArvoreHtml +
        proximoNivelHtml;
}

function skillIconeHtml(skill) {
    if (skill && skill.iconImage) {
        return '<img class="skill-icon-img" src="' + encodeURI(skill.iconImage) +
            '" alt="' + skill.nome + '" draggable="false">';
    }
    return skill ? skill.icon : '';
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