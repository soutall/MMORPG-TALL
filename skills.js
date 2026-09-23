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
        { id: 'provocacao', nome: 'Grito de Provocação', icon: '📢', categoria: 'aoe',
          desc: 'Grito estrondoso que força todos os monstros (10s) e Bosses (5s) em área a focarem no Guerreiro, curando instantaneamente 20% do HP Máximo.',
          danoBase: 0, danoUnidade: null, danoNota: 'Cura 20% HP Máx',
          mp: 20, cd: 15, escala: 'nenhum',
          area: 'Raio 300px', alcance: 'Ao redor',
          duracao: '10s (Mobs) / 5s (Boss)', duracaoBase: null,
          extras: ['Cura instantânea de 20% da Vida Máxima', 'Força aggro de Mobs normais por 10 segundos', 'Força aggro de Bosses por 5 segundos'] },
        { id: 'bloqueio', nome: 'Escudo (Passiva)', icon: '🛡️', categoria: 'passiva',
          desc: 'Bloqueio frontal que anula o dano recebido.',
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
          extras: ['Vida <= 50%: -5% de dano recebido', 'Vida <= 30%: -10% de dano recebido', 'Vida <= 10%: -15% de dano recebido'] }
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
          duracao: '24s', duracaoBase: null, extras: ['Lentidão 50% (0.75s)'] },
        { id: 'vulcao', nome: 'Vulcão Flamejante', icon: '🌋', categoria: 'zona',
          desc: 'Invoca uma cratera vulcânica que cospe magma e causa dano contínuo.',
          danoBase: 18, danoUnidade: 'mágico', danoNota: '+4 DoT/s',
          mp: 20, cd: 20, escala: 'dano',
          area: 'Raio 140', alcance: 'Mira 380px',
          duracao: '6s', duracaoBase: null, extras: ['Erupção vulcânica', 'Queimadura em área'] }
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
          duracao: null, duracaoBase: null, extras: [] },
        { id: 'colossal', nome: 'Golem Colossal', icon: '🗿', categoria: 'invocacao',
          desc: 'Amplifica o golem por alguns segundos, aumentando seu tamanho, dano e disparo de pedras.',
          danoBase: 30, danoUnidade: 'físico', danoNota: ' por pedra / 4s',
          mp: 40, cd: 45, escala: 'dano',
          area: 'Ao redor do golem', alcance: 'Via pet',
          duracao: '4s', duracaoBase: null, extras: ['+50% de vida do pet', 'Aumento de alcance e dano em área'] }
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
          duracao: null, duracaoBase: null, extras: ['Perfurante: atravessa alvos'] },
        { id: 'rajada', nome: 'Rajada de Flechas', icon: '🏹', categoria: 'ataque',
          desc: 'Carrega por 2s e dispara uma rajada em cone por 4s, com dano crescente conforme o fluxo de flechas. Atinge TODOS os inimigos dentro do cone do visual (230px).',
          danoBase: 18, danoUnidade: 'físico', danoNota: 'por flecha',
          mp: 30, cd: 12, escala: 'dano',
          area: 'Cone em expansão (até 230px)', alcance: 'Frente do arqueiro',
          duracao: '2s carregando + 4s disparo', duracaoBase: null, extras: ['Dano em ÁREA: acerta todos os inimigos no cone', 'Bloqueia movimento e ataques durante o carregamento', 'Cancela se andar'] }
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
          area: 'Raio 78', alcance: 'Mira 140px',
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
          extras: ['Cooldown: 10 minutos', 'Controlada pelo servidor'] }
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
          danoBase: 18, danoUnidade: 'físico', danoNota: '+ Sangramento 3/s',
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
          desc: 'Canal de 5s: toca a bateria e o som estoura inimigos ao redor (-30% de dano). Teleporte não cancela o solo.',
          danoBase: 21, danoUnidade: 'físico', danoNota: '+ Stun 1.25s (por batida)',
          mp: 25, cd: 6, escala: 'dano',
          area: 'Raio 110', alcance: 'Ao redor',
          duracao: 'Canal 5s', duracaoBase: null, extras: ['Batida a cada 0.5s', 'Cancela ao andar ou clicar novamente', 'Teleporte não interrompe a bateria'] },
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
          mp: 25, cd: 10, escala: 'dano',
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
          duracao: '2s', duracaoBase: 2, extras: ['Impede movimento 2s'] }
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
        { id: 'giro_foice', nome: 'Giro da Foice', icon: '⭕', categoria: 'aoe',
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
    ]
};

SKILLS_INFO.arqueiro_astral = SKILLS_INFO.arqueiro_arcano;

const NOMES_CLASSES = {
    guerreiro: 'GUERREIRO', mago: 'MAGO', summoner: 'SUMMONER', arqueiro: 'ARQUEIRO',
    curandeiro: 'CURANDEIRO', barbaro: 'BÁRBARO', roqueiro: 'ROQUEIRO', ladino: 'LADINO',
    dronemaster: 'DRONEMASTER', arqueiro_arcano: 'ARQUEIRO ASTRAL', arqueiro_astral: 'ARQUEIRO ASTRAL', sniper: 'SNIPER',
    pikeman: 'PIKEMAN'
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
// classes mágicas (mago/summoner/curandeiro/roqueiro/arqueiro_arcano/arqueiro_astral) -> Inteligência; demais -> Força.
function atributoEscalaSkill(skill) {
    if (skill.escala === 'cura') return { chave: 'divindade', rotulo: 'Divindade' };
    if (skill.id === 'ogro' || skill.id === 'esmagamento' || skill.id === 'salto' || skill.id === 'colossal') return { chave: 'afinidade', rotulo: 'Afinidade' };
    if (skill.danoNota && /\/\s*\d*s/.test(skill.danoNota)) return { chave: 'profanidade', rotulo: 'Profanidade' };
    if (['mago', 'summoner', 'curandeiro', 'roqueiro', 'arqueiro_arcano', 'arqueiro_astral'].indexOf(window.minhaClasse) !== -1) return { chave: 'inteligencia', rotulo: 'Inteligência' };
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
        let cooldownExibido = skill.cd === null || skill.cd === undefined ? '—' : (skill.cd >= 60 ? Math.floor(skill.cd / 60) + ':' + String(skill.cd % 60).padStart(2, '0') : skill.cd + 's');

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
                '<div class="skill-stat"><b>⏱️ CD</b> ' + cooldownExibido + '</div>' +
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