# CHANGELOG — MMORPG Mobile

Registro de todas as atualizações feitas no projeto. **Sempre** que algo novo for implementado, adicionar uma nova entrada aqui e subir o número da versão.

---

## Versão atual: **v1.39.6**

> 🚨 **REGRA MANDATÓRIA:** O game está sendo desenvolvido para **PC e Mobile**, então a otimização tem que ser feita para **AMBOS**, e tudo o que for feito no projeto é pensando em ambos os lados (controles via teclado/mouse no PC e touch/joystick no mobile, interfaces responsivas sem corte nem sobreposição, e alto desempenho em todas as resoluções).

### 📊 Tabela de Atualizações Recentes (Regra Obrigatória para IAs)

| Versão | Data / Hora | O que foi feito | Arquivos Alterados |
|---|---|---|---|
| **v1.39.6** | 23/09/2026 (hora local) | **FIX ANCORAGEM SIDEBAR MOBILE ABAIXO DO MINIMAPA + ÍCONE OFICIAL SKILL 1 DO PIKEMAN:** (1) Corrigido bug de posicionamento da Sidebar mobile no canto superior esquerdo (causado pelo auto-scanner de `data-ui` do `dragdrop.js`): removido `data-ui` e adicionado `data-ui-ignored="true"` + regras forçadas `top: 122px !important; right: 10px !important; left: auto !important;`; (2) Redução compacta dos itens do menu dropdown (altura 21px, fonte 10.5px, largura 116px) permitindo que todas as 8 opções caibam perfeitamente na vertical abaixo do minimapa sem rolagem; (3) Substituição do emoji `⭕` pela arte oficial `imagem/HUD/skills/Slotbar/Pike/skill_01.png` na Skill 1 do Pikeman (Giro da Foice) no slotbar (`#btn-pikeman-giro`) e no modal K (`skills.js`), com estilização circular, borda vermelha e fundo escuro condizente; versão **v1.39.6** nos 3 pontos visuais | `index.html`, `mobile-hud.css`, `skills.js`, `skills.css`, `style.css`, `CHANGELOG.md`, `INFO_PROJETO.md`, `REGRAS_IA.md` |
| **v1.39** | 23/09/2026 (hora local) | **INTERFACE FIXA MOBILE COM SIDEBAR RETRÁTIL E CLUSTER DE AÇÃO 2×3:** Menu Sidebar retrátil (`#mobile-sidebar-container`) abaixo do minimapa com opções Configuração, Inventário, Skills, Social, Status, PvP, Mapa e Futuro Update (com toast); Cluster de Ação fixo no canto inferior direito em 2 colunas × 3 linhas: L1 [6] Autofarm / [5] Dash, L2 [3] Skill 3 / [4] Skill 4, L3 [1] Skill 1 / [2] Skill 2; Poções [HP] e [MP] fixadas imediatamente à esquerda da Skill 1; Barra de XP fixada no canto inferior esquerdo; minimapa e status ancorados no topo; ocultação de badges de teclado no mobile; arquitetura separada em `mobile-hud.css` e `mobile-hud.js`; compatibilidade dual PC & Mobile; versão **v1.39** nos 3 pontos visuais | `mobile-hud.css`, `mobile-hud.js`, `index.html`, `dragdrop.js`, `CHANGELOG.md`, `INFO_PROJETO.md`, `REGRAS_IA.md` |
| **v1.38** | 23/09/2026 (hora local) | **REDESENHO DA JANELA DE HABILIDADES (MODAL K) ESTILO MMORPG CLÁSSICO/MODERNO:** Layout split-view dividido em 2 colunas principais: Coluna esquerda com grade de skills categorizadas (`◇ ATIVAS`, `◇ PASSIVAS`, `◇ SUPORTE`), molduras metálicas douradas (`.skill-slot-moldura`), seleção com brilho dourado (`.selected`), badge de nível (`Nv X`) e nome legível; Coluna direita **"DETALHES DA HABILIDADE"** interativa ao clicar em qualquer skill exibindo ícone grande, nome, badge de categoria (Ativa/Passiva/Suporte), nível atual (1 a 10), descrição narrativa, caixa de atributos com escalonamento por atributo e fórmula do server, caixa de bônus por nível, controles de upgrade (`⬆ MELHORAR`) e reset individual (`↺`), e caixa de prévia do próximo nível (`Próximo nível:`) com comparação dinâmica; responsividade dual PC & Mobile (landscape) preservando Drag & Drop (`dragdrop.js`); versão **v1.38** nos 3 pontos visuais | `index.html`, `skills.css`, `skills.js`, `CHANGELOG.md`, `INFO_PROJETO.md`, `REGRAS_IA.md` |
| **v1.37** | 23/09/2026 (hora local) | **FOTOS DE SNIPER E CURANDEIRO ATIVADAS no círculo do retrato do HUD:** a foto do **Sniper** (`imagem/HUD/Perfil/sniper.png`, 1254×1254) foi adicionada e mapeada no `_perfilMapa` (`sniper`→`sniper.png`) — a classe Sniper agora exibe o retrato no círculo (antes permanecia vazio); a foto da **Curandeira** (`curandeiro.png`, 1254×1254) já existia e segue ativa. Desenho idêntico à v1.36: clip `ctx.arc` (centro 345,350 / raio 200) + cover-crop (`Math.max(lado/sw, lado/sh)`) e **"PNG por último"** — foto ANTES do `drawImage(HudHP.png)`, overlay puro, SEM masking/destination-out. Cache-buster das fotos de perfil atualizado `?v=perfil1` → `?v=perfil2`. As 5 classes futuras (Paladino/Necromante/Frorin/Druida/Bruxo) continuam fora do mapeamento. Versão **v1.37** nos 3 pontos visuais (login, HUD e `GAME_VERSION`) | `index.html`, `imagem/HUD/Perfil/sniper.png`, `CHANGELOG.md`, `INFO_PROJETO.md`, `REGRAS_IA.md` |
| **v1.36** | 23/09/2026 (hora local) | **FOTO DE PERFIL das classes no círculo do retrato do HUD:** a arte oficial `HudHP.png` NÃO foi modificada — agora as fotos de perfil (`imagem/HUD/Perfil/*.png`, quadradas 1254×1254) são desenhadas DENTRO do círculo do retrato (interior transparente da PNG), recortadas em círculo via clip `ctx.arc` (centro 345,350 e raio 200 no espaço da imagem 2172×724, medidos por scan de pixel; gemas/ornamentos da moldura preservados). Enfoque **"PNG por último"**: a foto é desenhada ANTES do `drawImage(HudHP.png)` — a PNG pintada por último em source-over cobre automaticamente qualquer sobra sobre moldura/gemas/ornamentos, SEM masking e SEM `destination-out` (o antialias da PNG faz blend suave e natural). Foto com cover-crop (`Math.max(lado/sw, lado/sh)`) para preencher o círculo ponta a ponta, carregada de forma lazy com cache e cache-buster `?v=perfil1`. Mapeamento classe→foto via `window.minhaClasse`: guerreiro/mago/summoner/arqueiro/barbaro/roqueiro/ladino/dronemaster/arqueiro_arcano(+arqueiro_astral)/pikeman/curandeiro → Guerreiro/Mago/Summoner/Arqueira/Barbaro/Roqueiro/Ladino/DroneMaster/Arqueir_astral/PikeMan/curandeiro. **Sniper não tem foto no jogo** → o círculo permanece vazio (sem erro; basta adicionar `Sniper.png` para ativar). Validação visual por render GDI+ (Guerreiro, Arqueira e cenário vazio). Versão atualizada para **v1.36** nos 3 pontos visuais (login, HUD e `GAME_VERSION`) | `index.html`, `imagem/HUD/Perfil/*.png` (uso), `CHANGELOG.md`, `INFO_PROJETO.md`, `REGRAS_IA.md` |
| **v1.35** | 23/09/2026 (hora local) | **HUD Oficial em Canvas 2D com HudHP.png:** a arte oficial `imagem/HUD/HudHP.png` (2172×724, IMAGEM NÃO modificada) agora é o HUD do jogo — moldura dourada, círculo de retrato (mantido VAZIO, sem personagem nem moldura extra) e ícones ❤️/🔥/🏃 desenhados no Canvas do jogo via `drawImage`, substituindo as barras HTML antigas (barras e retrato antigos ocultos via CSS com `display:none`). Os **preenchimentos são 100% Canvas** (não dependem do PNG): HP vermelho, Mana azul e Stamina verde, cada um com gradiente vertical claro→escuro + glow + brilho interno, desenhados ANTES da imagem, apenas dentro das áreas internas das barras via clipping (`window.HUD_BARS` = coordenadas exatas escaneadas por pixel: HP {641,166,1453,104}, Mana {659,326,1438,100}, Stamina {668,486,1424,91}), esquerda→direita até a razão atual; a imagem é desenhada POR CIMA como OVERLAY PURO (a PNG foi editada com os interiores das três barras TRANSPARENTES — janelas visíveis ~x790–1980; as gemas/ornamentos das pontas permanecem opacos) para o preenchimento dinâmico aparecer por trás — a 0% resta somente a moldura, a 100% a barra fica totalmente preenchida. O preenchimento é clipado APENAS na área interna de cada barra (nunca na moldura), e a PNG é a ÚLTIMA etapa visual — SEM `destination-out`, SEM apagar/modificar a imagem em runtime. Valores reais preservados (`meuHp/meuMaxHp/meuMp/meuMaxMp/minhaEstamina` com fallbacks) e animação suave `displayHp/displayMana/displayStamina += (real − display) * 0.15` que NUNCA altera os valores reais. Escala responsiva reutilizando o sistema atual (baseada na largura do canvas 2D, clamp 0.06–0.30). Render validado visualmente por replicação em GDI+ (65%/40%/80%, 0% e escala telefone) | `index.html`, `style.css`, `CHANGELOG.md` |
| **v1.34.2** | 23/09/2026 (hora local) | **FIX tela verde na Arena de Solari/arena:** skills que reposicionam o jogador (Salto Esmagador do Bárbaro, Stage Dive do Roqueiro e as coreografias Dança/Estrela do Ladino) barravam o destino em limites do MUNDO (x até 71880), não do mapa. Como a Cidade Perdida (x ∈ [65040,71920)) agora existe além da borda leste da Arena, mirar/clicar para leste dentro da arena teleportava o jogador para DENTRO da Cidade Perdida — a tela inteira ficava verde escura (#1c2a1d, fundo do mapa errado). Correção dupla: **servidor** `validarDestinoJogador` ganhou restrição de mapa de origem (destino tem que estar no mesmo mapa do jogador, aplicado ao esmagamento, teleporte e ladino dança/estrela) e **cliente** `clamparAlcanceSkill` agora clamp a mira aos limites do MAPA ATIVO (`limitesMapaClienteAtivo`), mais rede de segurança no `loop()` que restaura a posição autoritativa do servidor se `meuX/meuY` ficarem `NaN`. Reverteria à antiga trava "behind world edge" que existia antes da Cidade Perdida | `index.html`, `server.js`, `CHANGELOG.md`, `INFO_PROJETO.md` |
| **v1.34.1** | 22/09/2026 (hora local) | Atalhos de teclado das poções no PC: **Q = Poção de Vida (HP)** e **E = Poção de Mana (MP)**; tecla **Q removida da Skill 4** (Roqueiro Grito / Ladino Estrela / DroneMaster Titã / Sniper Camuflagem) que passa a ser acionada **somente pela tecla 4** (Numpad4 também); badges de tecla adicionados aos slots de poção (Q/E no canto superior, sem sobrepor o contador) e badges/títulos das Skills 4 trocados de "Q" para "4"; clique/toque nos slots de poção mantidos no mobile + **Inventário (tecla I) +30% na horizontal** (295 → 384px, com max-width 92vw) e janela de comparação reposicionada (168 → 208px) para acompanhar + **Correção do Social (tecla O)**: o modal abria FORA da tela (canto superior esquerdo) porque o drag-drop salvava `left/top` + `transform:none`, anulando o `translate(-50%,-50%)` central — agora `abrirSocialModal` SEMPRE centraliza (limpa posição salva e reaplica o translate) + novo `soltarFoco()` que libera o foco ao entrar no jogo (login com Enter deixava o foco preso no input escondido e TODAS as teclas de atalho ficavam mortas) e ao fechar modais | `index.html`, `style.css`, `inventario.css`, `INFO_PROJETO.md`, `CHANGELOG.md`, `REGRAS_IA.md` |
| **v1.34.0** | 21/09/2026 23:31 | Big batch mobile v1.34: Poções de HP/MP ×3 níveis droppáveis + 2 slots de poção no topo esquerdo do HUD; Stamina (barra laranja) substitui a mana no DASH (25 normal / 40 Dronemaster); HUD redesenhado (retrato em tempo real, barras fortes vermelho/azul/laranja, buffs, XP amarelo sobre fundo azul-claro centralizado abaixo das skills); Pedras de Upgrade com tabela de raridade + brilho/som únicos ao dropar; Ouro droppa de quase todos os monstros + autocoleta (ouro, poções, pedras e lendários automáticos); Inventário redesenhado (sem boneco, grade 3×3, comparação ao lado, botões-só-ícone + X no topo, +10% largura, abas TODOS/CONS/ITENS/EQUIP/PEDRAS); Janela de Skills maior com skills lado a lado e fonte legível; Anel de CD nos slots circulares drenando no sentido horário + brilho dourado quando pronta (todas as classes); Runas/Quest marcados como "futuro update" | `server.js`, `equipamentos.js`, `index.html`, `style.css`, `dragdrop.css`, `inventario.js`, `inventario.css`, `skills.css`, `INFO_PROJETO.md`, `CHANGELOG.md`, `REGRAS_IA.md`, `PROGRESSO.md` |
| **v1.33.4** | 21/09/2026 23:05 | Removido o portal de retorno ("SAIR DA SOLARI" / "PORTAL DA ARENA") de dentro da Arena de Solari — durante uma partida o portal roxo não é mais desenhado nem dispara teleporte para a cidade no meio do combate; a saída da partida continua disponível pelo painel da Solari (botão Sair), pelo botão Renascer e pelo fim natural do round. O portal da Arena de Davahl normal e o portal roxo de convite na cidade permanecem. + Otimização de performance para celular no render dos monstros (trava de tela ao usar a Bateria do Roqueiro no meio da horda) | `mapa_arena.js`, `index.html`, `monstros.js`, `classes/comum.js`, `efeitos/roqueiro_efeitos.js`, `INFO_PROJETO.md`, `CHANGELOG.md`, `REGRAS_IA.md` |
| **v1.33.2** | 21/09/2026 17:25 | Adição e integração completa dos efeitos sonoros da classe Guitarrista/Roqueiro (ataque básico, solo de bateria com interrupção instantânea ao cancelar, stage dive/dash e banda) e da Arena de Solare (BGM ambiente em loop integrado aos controles de volume, início do Round 1, conclusão do round, fanfarra de vitória no Round 10, rolagem de dados e ganho de item no leilão) para PC e Mobile | `sonoro.js`, `solari.js`, `index.html`, `REGRAS_IA.md`, `INFO_PROJETO.md`, `CHANGELOG.md` |
| **v1.33.1** | 21/09/2026 16:45 | Correção do fluxo de premiação da Arena de Solari: o sorteio/leilão de 5 itens foi reposicionado para ocorrer estritamente APÓS a finalização de cada round. O Round 1 agora inicia direto em combate após a contagem de entrada sem premiar de antemão. Ao limpar o round (ou estourar o tempo), os 5 itens são sorteados via dados; finalizado o sorteio, avança para a transição de 10s rumo ao próximo round (ou conclui a Arena com vitória no Round 10) | `server.js`, `index.html`, `REGRAS_IA.md`, `INFO_PROJETO.md`, `CHANGELOG.md` |
| **v1.33.0** | 21/09/2026 16:30 | Balanceamento completo de classes (Berserker Fúria 15s CD e Giro 4s/15s CD; Curandeira Aura 5s CD no recast e Julgamento +20% área; Roqueiro Bateria -30% dano cancelável por andar/clique e mantida no Teleporte, Grito de Guerra com atualização em tempo real na tecla C, Banda +50% mov/+80% atk spd/+20% atk; DroneMaster Modo Assalto 8s e +50% atk spd; Arqueiro Astral full dano mágico/INT e painel K completo; Sniper alcance 384px, Disparo Supremo +20% dano e Posição resetando CD com +100% crítico) + 3 Sliders de volume em tempo real (Geral, BGM e SFX) no menu ESC salvando no localStorage + Interface Responsiva com Drag-and-Drop universal em todas as janelas sem corte de tela + Desacoplamento da mira no PC (arma e skills seguem o mouse, WASD apenas move o corpo) | `server.js`, `index.html`, `skills.js`, `atributos.js`, `config.js`, `config.css`, `sonoro.js`, `dragdrop.js`, `REGRAS_IA.md`, `INFO_PROJETO.md`, `CHANGELOG.md` |
| **v1.32.2** | 21/09/2026 15:50 | Desacoplamento da mira do WASD no PC: o item/arma na mão segue continuamente o ponteiro do mouse, as skills ativas disparam na direção do cursor do mouse, e o WASD controla exclusivamente a movimentação do corpo | `index.html`, `INFO_PROJETO.md`, `CHANGELOG.md`, `REGRAS_IA.md` |
| **v1.32.1** | 21/09/2026 15:35 | Implementação completa dos efeitos sonoros reais da Arqueira (ataque básico, chuva de flechas, disparo perfurante, rajada carregar e rajada soltar) integrados via `sonoro.js`, `audio-manager.js`, `server.js` e `index.html` | `sonoro.js`, `audio-manager.js`, `server.js`, `index.html`, `INFO_PROJETO.md`, `CHANGELOG.md`, `REGRAS_IA.md` |
| **v1.32.0** | 21/09/2026 15:30 | Exibição visual da versão no canto inferior da tela (tela inicial de login e HUD in-game) + Criação e fixação da regra mandatória para IAs com registro obrigatório em tabela nos arquivos `.MD` | `index.html`, `style.css`, `INFO_PROJETO.md`, `CHANGELOG.md`, `REGRAS_IA.md` |
| **v1.32.0** | 21/09/2026 10:55 | Correção visual Roqueiro + Intro robusta + Ferreiro com interface e upgrades + Sistema sonoro integrado | `classes/roqueiro.js`, `ferreiro.js`, `ferreiro.css`, `intro.js`, `intro.css`, `sonoro.js`, `upgrade.js`, `solari.js`, `server.js`, `index.html` |
| **v1.31.0** | 20/09/2026 21:00 | Implementação das 3 novas classes server-side (DroneMaster, Arqueiro Arcano e Sniper) | `server.js`, `classes/dronemaster.js`, `classes/arqueiro_arcano.js`, `classes/sniper.js`, `index.html` |

---

Regra de versão (semver):
- **Nova funcionalidade** → sobe o menor componente (`v1.3.0` → `v1.3.1` ou `v1.31` → `v1.32`)
- **Correção/bug fix** → sobe o último componente (`v1.3.0` → `v1.3.1`)

---

## Histórico de versões

### v1.39.6 — 23/09/2026

**Fix de Ancoragem da Sidebar Mobile abaixo do Minimapa + Ícone Oficial da Skill 1 do Pikeman:**

- **Correção da Ancoragem da Sidebar Mobile (`#mobile-sidebar-container`):**
  - Identificada a causa que empurrava a Sidebar para o canto superior esquerdo: a presença do atributo `data-ui="mobile-sidebar"` ativava o auto-scanner de janelas editáveis do `dragdrop.js`, que forçava `style.left: 0px` por falta de posição pré-gravada.
  - O contêiner foi desacoplado do editor com `data-ui-ignored="true"` e suas regras em `mobile-hud.css` ganharam precedência mandatória com `!important` (`top: 122px !important; right: 10px !important; left: auto !important; bottom: auto !important;`), fixando-o no canto superior direito logo abaixo do minimapa.
- **Compactação Ergonômica do Dropdown e Botão:**
  - Altura e espaçamento dos 8 itens reduzidos para caber perfeitamente no espaço vertical do celular: altura de 21px por item, fonte Rajdhani de 10.5px, ícones de 12px e largura otimizada de 116px;
  - Botão principal reduzido para 22px de altura com fonte de 9px;
  - Todas as 8 opções (Configuração, Inventário, Skills, Social, Status, Modo PvP, Mapa e Futuro Update) ficam visíveis sem rolagem.
- **Ícone Real da Skill 1 do Pikeman (Giro da Foice):**
  - Substituição do caractere provisório `⭕` pela imagem oficial em alta resolução `imagem/HUD/skills/Slotbar/Pike/skill_01.png` (foice giratória vermelha);
  - Integrado no botão da barra de ação (`#btn-pikeman-giro`) com máscara circular, centralização nítida (`.btn-action-icon-img`) e moldura com gradiente escuro e borda avermelhada (`#c0392b`);
  - Integrado na Janela de Habilidades (Modal K) em `skills.js` (`giro_foice`) e `skills.css` (`.skill-icon-img`), exibindo a arte tanto na grade esquerda quanto no cabeçalho de detalhes da habilidade.
- **Versão Atualizada:** Atualizada para **v1.39.6** em `index.html` (`#login-screen`, `#hud-version`, `GAME_VERSION`) e documentações.

### v1.39 — 23/09/2026

**Interface Mobile Fixa com Menu Sidebar Retrátil, Cluster de Ações 2×3 e Otimização Ergonômica:**

- **Menu Sidebar Retrátil Mobile (`#mobile-sidebar-container`):**
  - Posicionado estrategicamente no canto superior direito logo abaixo do minimapa (`top: 112px; right: 10px;`);
  - Botão principal com design metálico escuro, borda ciana/dourada (`#00e5d4` / `#ffd700`) e texto `☰ MENU` / `FECHAR`;
  - Ao ser clicado/tocado, expande suavemente para baixo um menu vertical com fundo translúcido blur (`rgba(8, 14, 20, 0.94)` com `backdrop-filter: blur(6px)`);
  - Opções integradas:
    - ⚙️ **Configuração** (abre o modal de configurações de áudio/gráficos);
    - 🎒 **Inventário** (abre o inventário de 9 slots com comparação e abas);
    - 🪄 **Skills** (abre a nova janela MMORPG split-view de habilidades);
    - 👥 **Social** (abre a janela de grupos, amigos e chat de guilda);
    - 📊 **Status** (abre a distribuição de pontos e atributos do personagem);
    - ⚔️ **Modo PvP** (alterna o estado de PvP do jogador);
    - 🗺️ **Mapa** (abre o mapa mundial ampliado com biomas e coordenadas);
    - 🔒 **Futuro Update** (opção temática dourada que exibe toast notification flutuante na tela);
  - Fechamento automático inteligente ao selecionar qualquer ação ou ao tocar fora do menu na tela.

- **Cluster de Ações Fixo no Canto Inferior Direito (2 Colunas × 3 Linhas):**
  - Mapeamento exato de layout em grid de 54×54px por botão (`.actions`):
    - **Linha 1 (Topo):** `[6]` Autofarm (🤖) | `[5]` Dash (💨)
    - **Linha 2 (Meio):** `[3]` Skill 3 (classe) | `[4]` Skill 4 (para classes com 4ª skill)
    - **Linha 3 (Base):** `[1]` Skill 1 (classe) | `[2]` Skill 2 (classe)
  - Botões de tamanho ergonômico consistente (`54×54px`), toques rápidos e feedback visual tátil.

- **Poções HP e MP Imediatamente à Esquerda da Skill 1 (`#hud-pocoes`):**
  - Posicionadas no canto inferior direito (`right: 136px; bottom: 14px;`), imediatamente alinhadas à esquerda da base de skills;
  - Slots ergonômicos de 38×38px para Poção de Vida 🧪 e Poção de Mana 🔮 com contadores numéricos de estoque;
  - Ocultação de badges de teclado (Q/E) no mobile para layout limpo e 100% tátil.

- **Barra de XP no Canto Inferior Esquerdo (`#hud-xp-central`):**
  - Ancorada em `left: 12px; bottom: 10px;` com `pointer-events: none` para não interferir na área de arraste do joystick flutuante.

- **Minimapa e Status Window Ancorados:**
  - `#minimap-wrapper` fixado no topo direito (`top: 8px; right: 10px;`);
  - `#hud-status-window` fixado no topo esquerdo (`top: 8px; left: 10px;`);
  - Proteção contra conflitos de `transform` e `dragdrop.js` no mobile.

- **Arquitetura de Código Separada e Organizada:**
  - Folha de estilo dedicada em `mobile-hud.css`;
  - Controlador lógico e eventos dedicados em `mobile-hud.js`;
  - Versão atualizada para **v1.39** na tela de login, HUD in-game e `GAME_VERSION`.

### v1.38 — 23/09/2026

**Redesenho da Janela de Habilidades (Modal K) em estilo MMORPG clássico/moderno com layout Split-View (Grade de Ícones + Painel de Detalhes).**

- **Layout Split-View de Alta Fidelidade MMORPG:**
  - A janela de habilidades (`#skills-window`) foi completamente reestruturada com largura expandida (820px, max-width 96vw) e visual metálico escuro com bordas chanfradas e detalhes dourados e cianos (`#00e5d4` e `#d4af37`), inspirada na interface de MMORPGs de alta produção;
  - **Coluna Esquerda (`#skills-col-icons`):** As habilidades de cada classe são automaticamente agrupadas em seções temáticas (`◇ ATIVAS`, `◇ PASSIVAS`, `◇ SUPORTE`), cada uma com seus slots em grade de 4 colunas;
  - **Molduras de Slot (`.skill-slot-moldura`):** Moldura quadrada chanfrada clássica em bronze metálico (`58×58px`), badge de nível (`Nv 1..10`) em cápsula escura ciana e nome completo legível abaixo da moldura;
  - **Seleção Dinâmica com Brilho Dourado (`.selected`):** Clicar em qualquer habilidade ativa uma aura dourada pulsante (`box-shadow: 0 0 14px rgba(255, 170, 0, 0.9)`) e atualiza instantaneamente o painel de detalhes;
  - **Divisor Central com Gema:** Linha vertical com gradiente ciano-dourado e detalhe central `◆`;
  - **Coluna Direita (`#skills-detalhe`):** Painel **"DETALHES DA HABILIDADE"** com:
    - Cabeçalho exibindo ícone grande em moldura dourada, nome da habilidade, badge colorido de categoria (`[ATIVA]`, `[PASSIVA]`, `[SUPORTE]`) e nível atual `Nível X/10`;
    - Caixa de descrição narrativa formatada;
    - Caixa de estatísticas com borda ciana e grid 2 colunas: Dano ou Cura (com escalonamento de atributo primário como Força/Inteligência/Divindade/Afinidade/Profanidade), Custo de MP escalado, Área de efeito, Alcance, Duração e Tempo de Recarga (CD);
    - Caixa de **"Bônus por nível"** informando as regras de escala (+25% dano/cura, +6% MP, etc.);
    - Linha de controle com indicador de nível, botão azul metálico `⬆ MELHORAR` (desabilitado quando sem pontos ou no nível 10) e botão vermelho `↺` de reset individual;
    - Caixa de **"Próximo nível:"** com comparação em tempo real entre o nível atual e o próximo (`Dano 9 → 11`, `MP 0 → 0`, `CD 0.2s → 0.2s`) ou aviso de nível máximo alcançado;
- **Rodapé e Controle de Pontos:**
  - Exibição de pontos disponíveis (`🎯 Pontos de habilidade disponíveis: X`) e botão `↺ RESETAR TUDO` para redistribuição completa;
- **Compatibilidade Dual (PC e Mobile):**
  - Adaptação responsiva via CSS mantendo excelente usabilidade no PC com mouse e em telas móveis no modo paisagem;
  - Totalmente compatível com o sistema Drag-and-Drop (`dragdrop.js`) usando o cabeçalho `#skills-header` como alça de arraste;
- **Versão:** Versão do jogo atualizada para **v1.38** nos 3 pontos visuais (`#login-screen`, `#hud-version` e `GAME_VERSION`), com cache-busters atualizados (`skills.css?v=144`, `skills.js?v=146`).

### v1.37 — 23/09/2026

**Ativação das fotos de Sniper e Curandeiro no círculo do retrato (continuação da v1.36).**

- **`sniper.png` (1254×1254) adicionada** em `imagem/HUD/Perfil/` e mapeada no `_perfilMapa` (`sniper` → `sniper.png`) — o círculo do retrato do Sniper agora exibe a foto (antes permanecia vazio, sem erro);
- A foto da **Curandeira** (`curandeiro.png`, 1254×1254) já estava presente e mapeada — confirmada ativa;
- Desenho idêntico à v1.36: clip circular `ctx.arc` (centro 345,350 / raio 200 no espaço 2172×724) + cover-crop (`Math.max(lado/sw, lado/sh)`), foto desenhada ANTES do `drawImage(HudHP.png)` ("PNG por último", overlay puro em source-over, SEM masking, SEM `destination-out`);
- Cache-buster das fotos de perfil: `?v=perfil1` → `?v=perfil2` (garante recarga da nova foto do Sniper em servidores/cache);
- As 5 classes futuras (Paladino, Necromante, Frorin, Druida, Bruxo) continuam **fora** do mapeamento (fotos versionadas, não ativas — escopo).

### v1.36 — 23/09/2026

**FOTO DE PERFIL das classes no círculo do retrato do HUD — a `HudHP.png` NÃO foi tocada.**

- **Fotos no círculo do retrato:**
  - As fotos oficiais `imagem/HUD/Perfil/*.png` (quadradas 1254×1254) agora aparecem **dentro** do círculo do retrato da `HudHP.png` (2172×724), o interior transparente que a v1.35 deixou vazio;
  - Recorte em círculo via `ctx.arc` + `clip()`, com **cover-crop** (`Math.max(lado/sw, lado/sh)`) para a foto preencher o círculo ponta a ponta em qualquer resolução;
  - Geometria exata medida por scan de pixel: **centro (345, 350), raio 200** no espaço da imagem — as gemas laterais (y≈336–351, x até 182) e os ornamentos superior/inferior (y≈206 e y≈462) ficam **fora** do círculo e intactos;
  - Convertida para o Canvas: `pCx = hx + 345*escala`, `pCy = hy + 350*escala`, `pRaio = 200*escala`, desenhada **antes** do `drawImage(HudHP.png)`.

- **Enfoque "PNG por último" (requisito):**
  - A foto é pintada **antes** da PNG; a `HudHP.png` é o **ÚLTIMO** `drawImage` da HUD em source-over puro — cobre automaticamente qualquer sobra da foto sobre a moldura, gemas ou ornamentos;
  - **SEM masking, SEM `destination-out`**, sem qualquer modificação da arte oficial em runtime;
  - Os pixels parcialmente transparentes do antialias da moldura fazem **blend suave e natural** com a borda da foto (comportamento esperado/desejado).

- **Mapeamento classe → foto (`_perfilMapa`, via `window.minhaClasse`):**
  - `guerreiro`→Guerreiro, `mago`→Mago, `summoner`→Summoner, `arqueiro`→Arqueira, `barbaro`→Barbaro, `roqueiro`→Roqueiro, `ladino`→Ladino, `dronemaster`→DroneMaster, `arqueiro_arcano`/`arqueiro_astral`→Arqueir_astral (ARQUEIRO ASTRAL), `pikeman`→PikeMan, `curandeiro`→curandeiro (arquivo `curandeiro.png`).

- **Classe sem foto (sniper):**
  - `sniper` **não tem foto** em `imagem/HUD/Perfil/` (confirmado por busca em todo o jogo) → o círculo permanece **vazio** para ela, **sem erro**;
  - Para ativar, basta adicionar `imagem/HUD/Perfil/Sniper.png` (1254×1254).

- **Carregamento e cache:**
  - `_perfilDaClasse()` carrega a foto **lazy** com `_perfilCache` (nunca recarrega a mesma imagem) e cache-buster `?v=perfil1` (evita servidores com imagem antiga em cache).

- **Validação:**
  - Sintaxe validada (`node --check` na IIFE do HUD);
  - Render tests por replicação GDI+ (mesmo algoritmo clip+cover-crop+PNG-por-último): **Guerreiro**, **Arqueira** e **Curandeira** preenchem o círculo ponta a ponta com moldura/gemas/ornamentos 100% intactos por cima (diffs = antialias α=160/40/237/253 → blend natural; o da Curandeira com contagens de diffs idênticas às do Guerreiro) e cenário **sem foto** (círculo vazio, frame perfeito);
  - **Teste no navegador com Ctrl+F5 obrigatório** (bump de cache das fotos novas).

- **Versão:** login, HUD e `GAME_VERSION` atualizados para **v1.36**.

**Arquivos alterados:** `index.html`, `CHANGELOG.md`, `INFO_PROJETO.md`, `REGRAS_IA.md` · Fotos usadas: `imagem/HUD/Perfil/Guerreiro.png`, `Mago.png`, `Summoner.png`, `Arqueira.png`, `Barbaro.png`, `Roqueiro.png`, `Ladino.png`, `DroneMaster.png`, `Arqueir_astral.png`, `PikeMan.png`, `curandeiro.png`

### v1.34.1 — 22/09/2026

- **Atalhos de teclado para as poções (PC):**
  - **Q** → usa a **Poção de Vida (HP)**; **E** → usa a **Poção de Mana (MP)** (`usarPocao('hp')` / `usarPocao('mp')`);
  - Badges de tecla **Q/E** nos slots de poção do HUD (canto superior, sem sobrepor o contador de quantidade — CSS `.pocao-slot .key-badge`) e títulos atualizados ("Usar Poção de Vida (Q)" / "Usar Poção de Mana (E)");
  - O clique/toque nos slots continua funcionando no mobile (PC e Mobile).

- **Skill 4 — tecla Q removida, agora só no 4:**
  - O atalho **Q** deixou de disparar a Skill 4 (Roqueiro **Grito de Guerra**, Ladino **Estrela da Morte**, DroneMaster **Protocolo Titã** e Sniper **Camuflagem Natural**);
  - A Skill 4 agora é acionada **somente pela tecla 4** (ou Numpad4), como as skills 1-3;
  - Badges e títulos dos 4 botões corrigidos de "Q" → "4".

- **Inventário (tecla I) +30% na horizontal:**
  - `#inv-window` de **295px → 384px** (+30% sobre a janela da v1.34), com `max-width: 92vw` para não estourar em telas estreitas (dual PC & Mobile);
  - Janela de comparação (`#inv-comparacao`) reposicionada para acompanhar a largura nova (`left: calc(50% + 208px)` antes 168px); cache-buster `inventario.css?v=134 → v=135`.

- **Correção do Social — modal abria FORA da tela (tecla O):**
  - **Causa raiz:** o drag-drop (`dragdrop.js`) salvava `left/top` + `transform:"none"` da última posição arrastada do `#social-modal` (`mmorpg_jv_win_social-modal`) e, ao restaurar, **anulava o `translate(-50%,-50%)`** que centralizava o modal — por isso ele abria solto no canto superior esquerdo (parecia que a tecla O "não abria");
  - **Correção (`abrirSocialModal`):** agora o modal **sempre abre centralizado** — limpa `left/top` residuais, reaplica `transform: translate(-50%,-50%)`, remove a posição salva do localStorage e protege contra `getElementById` nulo;
  - **Bônus (`soltarFoco()`):** novo helper `window.soltarFoco()` chamado ao entrar no jogo (login via **Enter** deixava o foco preso no `#input-userid` escondido — com o guard `INPUT/TEXTAREA` do keydown global, **TODAS** as teclas de atalho ficavam inertes) e ao fechar a janela Social (o input da busca recebia/podia segurar o foco). Isso garante que O/I/K/C/WASD/Space voltem a responder sempre após login e após fechar modais.

- **Versão:** `GAME_VERSION`, tela de login e HUD atualizados para **v1.34.1**. Sintaxe dos 3 scripts inline validada (`node --check`) e reprodução em Node com stub de DOM confirmando que a tecla O seta o modal (abertura + centralização).

### v1.34.0 — 21/09/2026

- **Poções (HP/MP) ×3 níveis droppáveis:**
  - **Poções de Vida:** Pequena (+20%), Média (+40%), Grande (+100%);
  - **Poções de Mana:** Pequena (+20%), Média (+30%), Grande (+100%);
  - Droppam de monstros normais (~30% de chance) e bosses **sempre** dropam 2 poções + ouro;
  - Empilham na mochila por subtipo+nível (`_stackChave`) e são coletadas **automaticamente** (`autocoleta`);
  - **2 slots fixos no topo esquerdo** do HUD (`#hud-pocoes`): botão 🧪 HP e 🔮 MP, com contador de quantidade; tocar o botão envia `usar_pocao` ao servidor;
  - Botão cinza/desabilitado quando não há poção daquele tipo.

- **Stamina substitui a mana no DASH:**
  - Barra laranja `#stamina-bar-fill` na HUD principal;
  - Dash custa **25 de stamina** (normal) e **40** (Escudo de Energia do Dronemaster);
  - Servidor valida com `gastarEstamina()` — sem stamina o servidor responde `stamina_insuficiente` e o cliente mostra "⚡ Sem Stamina!";
  - `world_update` sincroniza `estamina` em tempo real.

- **HUD redesenhado (v1.34):**
  - **Retrato em tempo real** (`#hud-retrato` canvas 46px): desenha o sprite do personagem a cada 150ms usando o mesmo dispatch de classes do jogo;
  - Barras fortes: vermelho (vida), azul (mana), laranja (stamina) com molduras pixel-art;
  - Painel de buffs integrado + contador de ouro 🪙 no HUD;
  - **Barra de XP centralizada embaixo dos slots de skill** (`#hud-xp-central`): preenchimento **amarelo** + restante **azul-claro**, moldura pixel-art.

- **Pedras de Upgrade com raridade:**
  - Tabela de raridade por dificuldade do monstro (chance base + bônus em monstros mais fortes);
  - Drop único: **brilho de anéis roxos** + **arpejo cristalino** (`tocarSomPedraUpgrade`) + popup "💎 PEDRA DE UPGRADE!";
  - Autocoleta + destaque roxo no inventário (aba PEDRAS);
  - Upgrade de equipamento continua raridade-escalado (`upgradeExtras`).

- **Ouro:**
  - ~90% dos monstros normais dropam ouro em pequenas quantidades; **boss sempre** dropa ouro;
  - Autocoleta ao passar por cima (`autocoleta: true`), somatório na carteira do jogador (`ouro`);
  - Sincronização: `ouro_ganho` (WS) + HUD `#hud-ouro` + sync via `world_update`/`inventario_sync`.

- **Inventário redesenhado (v1.34):**
  - **Boneco removido** — grade 3×3 limpa de slots de equipamento (pixel-art);
  - **Janela de comparação ao lado** (mini-window à direita, item equipado vs. inventário) quando um equipamento é selecionado;
  - Botões inferiores **somente ícone** (🗂️ organizar / 🗑️ destruir / 🔒 bloquear); **X de fechar no topo**;
  - Janela **~10% mais larga** (268 → 295px) + novo alinhamento das abas (TODOS / CONS / ITENS / EQUIP / PEDRAS).

- **Janela de Skills (v1.34):**
  - Janela maior (300 → 600px), skills **lado a lado (2 colunas)** e fontes maiores/legíveis.

- **Anel de cooldown nos slots de skill (todas as classes):**
  - Borda circular ao redor de cada `btn-action` que **drena no sentido horário** conforme o CD passa (variável `--cd-pct`);
  - **Brilho dourado pulsante** quando a skill fica pronta (animação `cdProntoPulso`);
  - Atualizado a cada 250ms pelo `atualizarCooldownSkillHUD`.

- **Runas / Item de Quest:** mantidos no inventário marcados como **"futuro update"** (sem gameplay ainda).

- **Servidor:** `gastarEstamina()`, drops auxiliares (`gerarDropsAuxiliares`), autocoleta no tick principal, `usar_pocao` (com CD de 1s e sem uso morto), `ouro` no jogador, `coletar_item` suportando ouro/poções/pedras com empilhamento. **1 restart de servidor planejado** no fim do batch.

### v1.33.4 — 21/09/2026

- **Remoção do portal de retorno dentro da Arena de Solari:**
  - O `PORTAL_ARENA_RETORNO` (portão oeste da arena, 63980,460) aparecia dentro da arena **durante a partida de Solari** como o portal roxo "SAIR DA SOLARI", permitindo escapar do combate no meio do round;
  - **Correção (`mapa_arena.js`):** com `currentMap === 'solari'` o portal **não é mais desenhado** (`desenharPortalArenaRetorno` retorna cedo) e **não dispara teleporte** para a cidade (`infoPortalArena` retorna `null`);
  - A saída da partida continua funcionando pelos meios oficiais: botão **Sair no painel da Solari** (`solari_sair`), botão **Renascer** e fim natural do round/partida (`solariVoltarCidade`);
  - O portal da **Arena de Davahl normal** e o **portal roxo de convite na cidade** (60488,236) permanecem intactos;
  - Cache-buster do `mapa_arena.js` atualizado (`v=4` → `v=5`) para o navegador baixar a versão nova.

- **Otimização de performance (mobile) para a trava de tela com a Bateria do Roqueiro no meio da horda:**
  - `monstros.js`: aura dos monstros **sem `shadowBlur`** (antes 4 sombras por monstro por frame → com ~60-100 monstros visíveis congelava o canvas no celular); em hordas com **>55 monstros desenhados** a aura é pulada automaticamente; flash de ataque (`_golpeArco`) sem `shadowBlur`;
  - `classes/comum.js`: ícones de stun/lentidão (💫/❄️) re-renderizam a cada **350ms** por monstro (antes todo frame — Bateria stunava a horda inteira);
  - `efeitos/roqueiro_efeitos.js`: sombra dos anéis da Bateria/teleporte/grito reduzida (15→5, 20→6, 18→6);
  - `index.html`: textos flutuantes de dano sem `shadowBlur` + contador adaptativo `_monstrosDesenhados` por frame;
  - Cache-busters atualizados: `monstros.js?v=2004`, `classes/comum.js?v=1001`, `efeitos/roqueiro_efeitos.js?v=231`.

### v1.33.3 — 21/09/2026

- **Bug 1 — Ataque básico/projéteis invisíveis na Arena de Solari (CAUSA RAIZ ENCONTRADA E TESTADA):**
  - O tick de projéteis do servidor aplicava a colisão da cidade para qualquer projétil com `x >= LARGURA_CIDADE` (59800) — o que **incluía a faixa da arena** (x ≥ 63800);
  - Como `colideCidade()` retorna `true` para qualquer coordenada **fora do grid da cidade**, **todo projétil disparado na Arena/Solari era destruído no primeiro tick**, antes de qualquer `world_update` conseguir exibi-lo (o dano funcionava, mas o visual nunca aparecia);
  - **Correção:** limite superior `x < FIM_CIDADE` adicionado nas checagens de colisão da cidade, tanto no loop de projéteis de **jogador** (`playerProjeteis`) quanto no de projéteis de **monstros** (`projeteis`);
  - Projéteis de jogadores em sessão Solari agora carregam a flag `solari: true` (boolean) nos 3 pontos de criação (Roqueiro riff, básico Mago/Summoner/Arqueiro/Curandeiro e Arqueiro Perfurante);
  - **Validado por teste** (cliente WebSocket na Solari): antes do fix, ataque com espaço livre = 0 projéteis no `world_update`; depois, o projétil viaja e aparece com `solari: true`. ✅

- **Bug 2 — Tela verde ao usar a Bateria do Roqueiro entre monstros:**
  - **Servidor:** novos helpers `mapaDoJogador()` e `enviarParaMapaDoJogador()` — os broadcasts da Bateria (ativação, cada batida e fim/cancelamento) agora vão **apenas para clientes no MESMO mapa** do Roqueiro, eliminando o spam visual/sonoro entre mapas;
  - **Validação:** teste com dois clientes — jogador na arena gerou 11 batidas (recebidas por outro jogador no mesmo mapa) e **nenhum** pacote chegou ao cliente na cidade. ✅
  - **Cliente (`classes/roqueiro.js`):** spawn de notas com Bateria reduzido de **0.6 → 0.22 por frame** e pilha de notas limitada a **40** (antes era ilimitada → centenas de `fillText` por frame);
  - **Cliente (`efeitos/roqueiro_efeitos.js`):** anéis de choque (`shadowBlur`) da Bateria limitados a **24** ativos e tremor de tela reduzido de 5 → 3;
  - **Cliente (`index.html`):** trava anti-"stuck" por timestamp — `roqueiroBateriaIniciadaEm` registrado ao ativar e verificação no loop principal que **expira o estado da Bateria em 5s** mesmo se o `setTimeout` for atrasado em celular/página pesada (também limpo no cancelar, no `action_roqueiro_bateria_end` e no renascer).

- **Bug 3 — STATUS travado (~2 pontos por atributo):**
  - **Causa raiz:** regressão do patch de auto-attack (19/09) — `renderizarAtributos()` passou a atualizar as linhas existentes do DOM, mas só reativava o botão "+" se o texto **não** fosse `"..."`; após o primeiro clique o botão ficava preso em `"..."` e desabilitado para sempre;
  - **Evidência no save:** personagem `admin` (lvl 15) com `forca:2, profanidade:2` e 15 pontos parados sem conseguir distribuir;
  - **Correção (`atributos.js`):** na re-renderização o botão "+" volta sempre ao texto `"+"` e fica habilitado **enquanto houver pontos disponíveis** (mesma regra aplicada ao botão RESETAR); liberdade total de distribuição (ex.: colocar os 13 pontos onde quiser);
  - **Validado por teste** (cliente WebSocket): 3 pontos distribuídos livremente em Força (1 → 4), um por clique, sem trava de 2; 4º clique corretamente rejeitado com pontos zerados. ✅

- **Bug 4 — Pontos de habilidade zerando a cada login:**
  - O login em `server.js` gravava `pontosHabilidade: 0` fixo, ignorando o valor salvo (os saves gravam corretamente em `salvarProgresso`);
  - **Correção:** `pontosHabilidade` agora é carregado de `dadosSalvos.pontosHabilidade` quando presente.

- **Bug 5 — `admins.json` corrompido:**
  - O arquivo continha a chave `"admins"` duplicada sem vírgula (JSON inválido) → `spawns.js` carregava **zero** admins e as ferramentas de admin (editor de mapa, spawns, etc.) ficavam bloqueadas;
  - **Correção:** arquivo reescrito em JSON válido com a lista de admins (`admin`, `Admin`, `admin1`, `Admin1`, `admin2`, `Admin2`) e sem erro de leitura no servidor.

- **Otimização Dual PC & Mobile:** todas as correções mantêm o desempenho e a compatibilidade com controles de teclado/mouse e touch mobile (limites de partículas/efeitos e escopo de broadcasts por mapa).

### v1.33.2 — 21/09/2026

- **Sistema de Áudio do Guitarrista (Roqueiro):**
  - **Ataque Básico (`atk_basico.mp3`):** Disparado em cada palhetada de guitarra / ataque básico da classe.
  - **Habilidade 1 - Solo de Bateria (`Bateria.mp3`):** Executado em modo streaming (`HTMLAudioElement`) para máxima fidelidade sonora e performance sem travamentos. Vinculado a `pararSomBateria()` para interromper instantaneamente caso o jogador ande, clique novamente para cancelar ou o efeito expire.
  - **Habilidade 2 - Stage Dive / Dash (`Dash.mp3`):** Disparado ao usar o dash ou teleporte de palco do Roqueiro.
  - **Habilidade 3 - Solo de Banda (`Banda.ogg`):** Disparado no buff da banda.
- **Sistema de Áudio da Arena de Solare:**
  - **Trilha Sonora da Arena (`Musica fundo arena solare.ogg`):** Transição e loop automático de BGM ao entrar na Arena de Solari, respeitando os controles de volume Geral e BGM em tempo real, retornando à BGM da cidade ao sair da arena.
  - **Início do Round 1 (`Roud 1.ogg`):** Efeito solene no exato momento em que o combate do Round 1 se inicia.
  - **Finalização de Round (`Ao finalizar Round.ogg`):** Tocado assim que o round é limpo e a janela de distribuição dos 5 itens de recompensa surge.
  - **Fanfarra Final (`Final Roud 10.ogg`):** Tocado no banner de conclusão e vitória após limpar o Round 10.
  - **Sorteio dos Dados (`ao rolar a chance de ganhar o item.ogg`):** Tocado a cada rolagem de dados no leilão/sorteio de drops.
  - **Recompensa Obtida (`ao ganhar o item.ogg`):** Efeito de celebração quando o resultado do leilão atribui o item vencedor.
- **Otimização Dual PC & Mobile:**
  - Sistema com suporte total a controles de teclado/mouse e touch mobile, com mixagem de canais Web Audio API e streaming de áudio.

- **Arena de Solari — Correção no Ciclo de Premiação:**
  - **Premiação Pós-Round:** O sorteio/leilão de 5 itens (`solariIniciarSorteio`) foi reposicionado para disparar exclusivamente **após** a conclusão de cada round (quando todos os monstros são abatidos ou o tempo limite de 120s estoura).
  - **Round 1 sem Premiação Precoce:** A contagem regressiva inicial de entrada de 10s agora transiciona diretamente para o início do combate do Round 1 (`solariComecarCombate`), eliminando a distribuição antecipada de recompensas.
  - **Fluxo Contínuo entre Rounds:** Ao término do sorteio dos 5 itens de cada round, o sistema verifica se ainda há rounds pendentes (`s.round < 10`): caso afirmativo, entra em transição de 10s ("PARABÉNS! BORA PRO PRÓXIMO ROUND!") e começa imediatamente o combate do round subsequente; ao concluir o Round 10, exibe o banner de vitória e teletransporta os jogadores para a cidade.
  - **Otimização Dual (PC & Mobile):** Modais e banners de sorteio e contagem sincronizados sem bloqueio de comandos ou interface em ambas as plataformas.

### v1.33.0 — 21/09/2026

- **Equilíbrio & Balanceamento Multi-Classes:**
  - **Berserker (Bárbaro):**
    - Habilidade *Fúria*: Cooldown ajustado para 15 segundos.
    - Habilidade *Giro Descontrolado*: Duração reduzida para 4 segundos e cooldown aumentado para 15 segundos.
  - **Curandeira:**
    - Habilidade *Aura Sagrada*: Cooldown de 5 segundos aplicado exclusivamente quando desativada/recastada.
    - Habilidade *Julgamento Divino*: Área/hitbox aumentada em 20% (raio slimes 78 / bosses 102).
  - **Roqueiro:**
    - Habilidade *Bateria*: Dano base reduzido em 30% (base 21); Teleporte (Stage Dive) agora não cancela a Bateria ativa; cancelamento da Bateria acontece única e exclusivamente ao andar (WASD/joystick) ou clicar nela novamente.
    - Habilidade *Grito de Guerra*: Buffs (+30% chance crítica, +50% dano crítico, +5% vida máxima, +10% velocidade de ataque) refletidos em tempo real na tela de atributos (tecla C com badge e live loop de 200ms).
    - Habilidade *Banda*: Velocidade de movimento aumentada em +50% (3.3), velocidade de ataque aumentada em +80% (intervalo 22 ticks) e ataque base aumentado em +20% (12).
  - **DroneMaster:**
    - Habilidade *Modo Assalto*: Duração aumentada para 8 segundos e velocidade de ataque aumentada em +50% (intervalo 8 ticks).
  - **Arqueiro Astral (Arqueiro Arcano):**
    - Todo o dano (ataque básico e habilidades) agora é Dano Mágico e escala com Inteligência (INT);
    - Painel de Habilidades (tecla K) agora lista e renderiza corretamente todas as habilidades para todas as classes.
  - **Sniper:**
    - Alcance do ataque básico reduzido em ~20% (384px);
    - Habilidade *Disparo Supremo*: Dano aumentado em 20% (base 54);
    - Habilidade *Posição de Franco-Atirador*: Reseta instantaneamente o cooldown do Disparo Supremo e concede +100% de chance crítica enquanto posicionada.
- **Configurações & Controles de Áudio (Menu ESC):**
  - Três sliders independentes e em tempo real: **Volume Geral** (Master), **Volume BGM** (músicas de fundo dos biomas) e **Volume Efeitos** (SFX de passos, ataques e skills).
  - Salvamento automático sem botão de salvar por ID de usuário no `localStorage`.
- **Interface Inteligente & Drag-and-Drop Universal:**
  - Auto-scaling responsivo que previne qualquer modal de extrapolar a viewport (`clampPosElemento` no redimensionamento da janela).
  - Suporte universal a drag-and-drop por mouse e touch para todas as janelas do game (Inventário, Skills, Atributos, Config, Social, Ferreiro, Teleporte, Trade, Invites), respeitando os salvamentos do Editor de Interface.
- **Desacoplamento da Mira com o Mouse no PC:**
  - O item em mãos e skills ativas seguem estritamente o ponteiro do mouse, e as teclas WASD controlam exclusivamente a locomoção do corpo do personagem.

---

### v1.32.2 — 21/09/2026

- **Controle de Mira com Mouse Desacoplado do WASD (PC):**
  - **Item/Arma na Mão:** O item na mão do personagem (arco, espada, cajado, etc.) agora rastreia continuamente a posição do ponteiro do mouse na tela através da nova função `atualizarMiraMouse()`, chamada a cada frame no loop principal e no evento `mousemove`.
  - **Movimentação WASD Independente:** O teclado WASD agora manipula única e exclusivamente o deslocamento corporal do herói (`moveX` e `moveY`), sem jamais sobrescrever a orientação da arma (`window.meuAngulo`).
  - **Disparo Direcional de Skills:** Habilidades direcionais ativas (`Disparo Perfurante`, `Rajada de Flechas`, `Cascata Estelar`, `Dash`, etc.) disparam e se propagam rigorosamente na direção para a qual o mouse está apontando.
  - **Ataque Automático e Mobile:** No mobile, os controles com joystick virtual touch mantêm a rotação pelo toque. No PC, o auto-ataque envia a direção correta do alvo ao servidor sem desviar a arma apontada pelo jogador no cursor.

---

### v1.32.1 — 21/09/2026

- **Efeitos Sonoros Reais da Arqueira:**
  - **Ataque Básico:** Vinculado `Sonoro/arqueira/atk_basico.ogg` (substituindo sintetizador de onda dente-de-serra por áudio real de arco e flecha).
  - **Chuva de Flechas:** Vinculado `Sonoro/arqueira/chuva de flacha.ogg` via `window.tocarSonoro('arqueira_chuva')`.
  - **Disparo Perfurante:** Vinculado `Sonoro/arqueira/disparo perfurante.ogg` via `window.tocarSonoro('arqueira_perfurante')`.
  - **Rajada de Flechas (2 fases):**
    - Fase 1 (carregamento/canalização): Vinculado `Sonoro/arqueira/Rajada e Flechas 1.ogg`.
    - Fase 2 (disparo/soltar): Broadcast do servidor `action_arqueiro_rajada_fire` e disparo de `Sonoro/arqueira/Rajada e Flechas 2.ogg`.
  - **Pré-carregamento no gesto:** Ao escolher a classe Arqueira na tela de seleção, o som `atk_basico.ogg` é pré-carregado no buffer de áudio do navegador.

---

### v1.32.0 — 21/09/2026

- **Exibição visual da versão:** No canto inferior da tela inicial (login) e fixado no canto inferior durante o jogo (`.game-version-display`).
- **Regra mandatória para IAs:** Registro obrigatório em formato de tabela de tudo o que foi feito e dos arquivos alterados em `INFO_PROJETO.md`, `CHANGELOG.md` e `REGRAS_IA.md`.
- **Ferreiro & Forja:** Sistema completo de upgrade de itens (`ferreiro.js`, `upgrade.js`, `ferreiro.css`).
- **Intro e Áudio:** Sistema de tela de abertura com watchdog (`intro.js`) e gerenciador de áudio integrado (`sonoro.js`).
- **Visual do Roqueiro:** Novo visual humano estilizado com guitarra e amplificadores (`classes/roqueiro.js`).

---

### v1.30.3 — 20/09/2026

**3 correções: Camuflagem Sombria ativando pela tecla 3 E pelo clique (sem travar para os outros ladinos), TODAS as skills avisando quando falta Mana ou está fora de alcance (sem entrar em recarga) e o taunt do Golem (Summoner) realmente puxando o foco dos monstros para ele — não só o efeito visual do rugido.**

- **🌑 Ladino — Camuflagem Sombria (tecla 3 + clique):** o estado local de invisibilidade (`ladinoInvisivelAtivo`) era atualizado pela invisibilidade de **qualquer outro ladino no mapa** — a skill 3 travava para todos. Agora só o **próprio jogador** atualiza o estado (`dados.id === window.meuId`), com **timer de segurança (11s)** que nunca deixa o estado preso em cima. A skill ativa tanto pela **tecla 3** (`Digit3`/`Numpad3` → `acionarSkillSlot3`) quanto pelo **clique/tap no botão** — ambas passam pela checagem de mana local e disparam a mesma ação do servidor.
- **💧 Todas as classes — aviso de Mana/Alcance sem entrar em recarga:** sem mana → `"💧 Sem Mana!"`; fora de alcance → `"🎯 Fora de alcance!"`. Nenhuma das duas situações ativa o cooldown: o **cliente pré-valida antes de enviar** (`checarSkill` com custo local idêntico ao servidor e coordenadas brutas antes do clamp) e o **servidor responde `mp_insuficiente`/`skill_aviso`**, sobre os quais o cliente **cancela o cooldown visual** (backstop via `window.ultimoSkillEnviado`, janela 3,5s). Aplicado a todas as skills de mira e instantâneas das 8 classes (meteoro, nevasca, vulcão, chuva, perfurante, rajada, furia, giro, bateria, banda, grito, colossal, comando ogro, dança, névoa, camuflagem, estrela, salto, teleporte, prece/cura, julgamento, esmagamento, aura, dash, tornado, provocação).
- **🗿 Summoner — Taunt do Golem REAL:** antes, o rugido só trocava o alvo de forma visual — a resolução de alvo preferia `players[tauntId]` e os monstros continuavam mirando/atacando a **invocadora**. Agora, durante o taunt (5s = 100 ticks; antes 4s), a resolução de alvo de **slimes, monstros especiais e do boss** (`entidadeAlvo`) prioriza o **Golem (`lacaios[tauntId]`)** — o dano melee, o dano especial e os projéteis vão para o Golem de verdade (o boss agora também gira, mira e acerta o Golem, inclusive no impacto).
- **🛡️ Banco de dados — robustez (`database.js`):** gravação **atômica** (arquivo temporário + `rename`) e **reparo automático de vírgula residual** no `jogadores.json` — o mesmo padrão de corrupção reparado na v1.30.2 não volta mais a quebrar o parse quando dois processos gravam o arquivo perto de uma leitura. Banco atual normalizado via Node: **113 jogadores, validação OK, contas de teste removidas**.
- **🧪 Validação E2E WebSocket (18/18 ✓):** sem mana → `mp_insuficiente` e rejeição repetível (sem CD); fora de alcance → `skill_aviso` e skill dentro do alcance continua funcionando; taunt do Golem → slimes miram o Golem (`tauntId`/`targetId`), o Golem recebe dano real (90→75) e o Summoner fica intocado (hp 1048→1048).

**Arquivos alterados:** `server.js`, `index.html`, `database.js`, `_tmp_e2e_v1303.js` (novo), `CHANGELOG.md`, `INFO_PROJETO.md`

---

### v1.30.2 — 20/09/2026

**10 ajustes e correções: modo Agressivo/Passivo do Golem (Summoner), recarga visual do Golem Colossal, Grito de Guerra apenas para o Roqueiro (ícone sumia do nada para todas as classes), Rajada de Flechas em ÁREA (acertava 1 alvo só), Aura Sagrada escalando com Divindade, Giro Descontrolado bloqueando o atk básico, alcances reduzidos do Ladino (Dança 220→110 e Névoa 400→200 mantendo a área) e remoção do ataque básico manual (só auto-attack).**

- **🗿 Summoner — Modo do Golem:** 2 ícones pequenos acima do botão **Golem Colossal** — 🎯 **Agressivo** (o golem ataca os inimigos que a Summoner focar, prioridade do alvo focado) e 🛡️ **Passivo** (fica SEM atacar, apenas rodeando a invocadora). Novo campo `ogroModo` persistente no save do jogador, nova ação `ogro_modo` no servidor, sincronização via `init`, e no modo **passivo** a IA do golem pula **toda** a seleção de alvos (incl. comando agressivo e perseguição por agro) — ele só acompanha.
- **⏱️ Summoner — Golem Colossal:** o **tempo visual de recarga** agora aparece no ícone da skill (overlay de CD de 45s). O Grito de Guerra também ganhou overlay de CD (60s).
- **📣 Grito de Guerra:** o botão aparecia para TODAS as classes (o elemento nunca era escondido na troca de classe). Agora é escondido por padrão e **só é exibido para o Roqueiro**.
- **🏹 Arqueira — Rajada de Flechas:** o cone só acertava **um** alvo (o loop parava no primeiro hit). Agora **todos os inimigos dentro do cone do visual** (raio 230px = o alcance da animação, meio-ângulo 1.05) são atingidos — slimes **e** bosses no mesmo disparo. Os stacks de velocidade continuam acumulando no alvo primário.
- **✝️ Curandeira — Aura Sagrada:** a cura (2% HP/s) agora é **escalada pelo atributo DIVINDADE** da Curandeira (+5% por ponto, via `calcularCuraJogador`).
- **🌀 Berserker — Giro Descontrolado:** com a skill ativa, o **ataque básico não funciona** (bloqueio server-authoritative no `ataque_barbaro` + guard no auto-attack do cliente durante a animação).
- **🌪️ Ladino — Dança das Adagas:** distância de busca reduzida em **50%** (220px → **110px**) — só os alvos mais próximos.
- **🧪 Ladino — Névoa Venenosa:** alcance de arremesso reduzido em **50%** (400px → **200px**); a **área da nuvem (raio 90) é mantida**.
- **⭐ Ladino — Estrela da Morte:** o **ataque básico fica bloqueado** enquanto a coreografia está ativa (guard no auto-attack do cliente; o servidor já rejeitava `ataque_ladino` durante a coreografia).
- **⚔️ Todas as classes — ataque básico manual removido:** o ícone do Ataque Básico foi retirado da barra, o clique do mouse e a tecla pararam de atacar (`executarAtaqueBasico` virou no-op). O **auto-attack** (sistema automático com alvo validado no servidor) permanece como a única forma de ataque básico.
- **🧪 Validação E2E WebSocket (37/37 ✓):** robustez na T4 da Camuflagem (margem de cadência após o whiff e seleção de alvo de referência fora da névoa do T3) para eliminar flak de timing. **Reparo do `jogadores.json`:** arquivo com vírgula final que quebrava o parse — reparado e normalizado via Node (resolveu também chaves duplicadas). Contas de teste removidas do banco.

**Arquivos alterados:** `server.js`, `index.html`, `style.css`, `skills.js`, `_tmp_e2e_ladino.js`, `CHANGELOG.md`, `INFO_PROJETO.md`

---

### v1.30.1 — 20/09/2026

**3 correções de gameplay do LADINO: limite de distância na Dança (só os mais próximos), Estrela da Morte com mobilidade travada e coreografia 50% mais lenta, e Camuflagem que zera o ataque dos inimigos (inimigos não veem/atacam o invisível).**

- **🌪️ Skill 1 — Dança das Adagas:** agora tem **limite de distância real (raio 220px)** e a coreografia atinge **apenas os alvos mais próximos** (ordena por proximidade — sem teleporte para alvo distante; alvos distintos primeiro, repetições só para completar os 5 hits entre o grupo mais próximo).
- **⭐ Skill 4 — Estrela da Morte:** enquanto a estrela está ativa a mobilidade fica **totalmente travada no cliente** (o input de movimento não anda nem é reportado) e o cliente **sempre segue a posição do servidor** durante a coreografia — a skill NÃO é mais "cancelada" ao tentar mover. A coreografia ficou **~50% mais lenta** (vértices 200ms cada, salto 600ms, queda 500ms) — a animação fica mais dramática e o dano do impacto acompanha o ritmo mais lento. Visual do pentagrama estendido para durar a sequência.
- **🌑 Skill 3 — Camuflagem Sombria:** enquanto invisível o Ladino **não é mais alvo de inimigos** (server-authoritative): monstros não ganham agro, **soltam o agro já existente**, não miram ataques (melee/ranged/habilidades), **projéteis já em voo e AOEs de monstro não o acertam** (`aplicarDanoJogador` ignora dano de inimigo a um jogador com efeito `invisivel`; PvP continua separado via `aplicarDanoPvP`). DoT/névoa não revelam a posição (sem agro). Bônus +100% continua **sendo consumido apenas pelo primeiro dano real**.
- **🧪 Validação E2E WebSocket atualizada (38/38 ✓):** inimigos NÃO atacam o invisível (HP perfeitamente estável por 2,5s cercado de zumbis), +100% provado pelo broadcast `texto_dano` (sem overkill), sangramento com DoT medido em zumbi (sem regen/escudo) para evitar o mascaramento da regen do boss. Contas de teste removidas do `jogadores.json` após a validação.

**Arquivos alterados:** `server.js`, `index.html`, `efeitos/ladino_efeitos.js`, `debuffs.js`, `skills.js`, `_tmp_e2e_ladino.js` (38 asserções), `_tmp_limpar_e2e.js` (novo), `CHANGELOG.md`

---

**Nova 8ª classe assassina: 🗡️ LADINO — 6 habilidades (1 básica + 4 ativas + 1 passiva), 2 armas novas, mecânicas inéditas de solo (invisibilidade com bônus, névoa que cega, estrela com atordoamento de chefe) e sangramento por DoT.**

- **🗡️ Ataque básico — Adaga:** cone curto e rápido (cadência 400ms, meio-ângulo 1.05, alcance 110, dano base 12), custo 0 de mana. Servidor autoritativo: valida alvo/distância/direção e aplica dano no cone (slimes + bosses + PvP via `danoEmBosses`).
- **🌪️ Skill 1 — Dança das Adagas (`danca_das_adagas`):** teleporta até **5 alvos** (alvos distintos primeiro, depois repetições) em sequência rápida (~150ms/hit), **retorna à posição exata de partida**, 15 de dano por alvo, CD 12s, mana 25, busca de alvos em raio 420. *Imunidade a dano durante a coreografia (server-side); sem alvo válido = sem gasto de mana.* Movimento do jogador bloqueado durante a dança.
- **☠️ Skill 2 — Nevoeiro Venenoso (`nevoeiro_venenoso`):** bomba de veneno (arma secundária) com trajetória visual → **zona de gás 5s (100 ticks) no servidor** (raio 90) sincronizada via `world_update → gases`. Dano contínuo a cada 0.5s + **cegueira** (`cegueira`, nova) — reaplicada a cada tick dentro do gás, expira 10 ticks após sair. Cego (monstro/jogador) **erra ataques normais corpo a corpo e à distância** (6 pontos de checagem em `monstroPodeAtacar`); **magia continua acertando** (pedra do Golem deliberadamente não bloqueada). CD 8s, mana 20.
- **🌑 Skill 3 — Camuflagem Sombria (`camuflagem_sombria`):** 1s de atraso → **invisibilidade 10s** (200 ticks, `efeitos` invisivel) com **+100% no primeiro dano real** (consumido apenas quando o golpe atinge — whiff/erro não consome; bênção/DoT/pet não consomem). **CD de 10s começa quando a invisibilidade termina** (consumida por ação danosa ou por expiração). Re-cast durante ativo é rejeitado. CD total 20s entre casts completos. Mana 20.
- **⭐ Skill 4 — Estrela da Morte (`estrela_da_morte`):** desenha estrela de **5 vértices** (raio 120, tap 2 ticks/vértice) percorrida por teleporte validado → **salto** → **queda** → **impacto** (raio 90, dano 25) → **STUN de 2s (40 ticks) aplicado no servidor** — o Golem de Pedra agora respeita `stunTimer` no loop do boss (novo). Jogador permanece no centro após o impacto. CD 20s, mana 30. Movimento bloqueado durante a coreografia.
- **🩸 Passiva — Lâminas Sangrentas (`laminas_sangrentas`):** 20% de chance por dano físico do Ladino → **sangramento** (efeito existente) com **20% do dano físico por segundo por 5s**, creditado ao Ladino via `ef.autorId` (o DoT só tiqueta com autor definido). Não tem re-gatilho em loop e não consome a invisibilidade.
- **🛠️ Armas novas:** 🗡️ **Adaga** (arma) e 🧪 **Bomba de Veneno** (armaSecundaria) em `equipamentos.js`, **restritas à classe ladino**.
- **🖥️ UI das skills:** 6 entradas em `SKILLS_INFO` (nome/ícone/desc/custo/CD/categoria/nível 1-10/upgrade) com escalonamento padrão (+25% dano, +6% mana, +10% duração por nível).
- **✨ VFX mobile otimizados (`efeitos/ladino_efeitos.js`):** partículas com **pooling** (sem timers por partícula, sem vazamento de memória), zona de gás com brilho pulsante, estrela traçada vértice a vértice, queda com tremor de tela, silhueta translúcida na invisibilidade.
- **🧪 Validação E2E WebSocket (36/36 ✓):** 2 jogadores isolados (A no deserto com zumbis multi-alvo; B na caverna com o Golem 8000hp) — dano e gasto de mana corretos, dança com 5 hits exatos + retorno ao ponto + alvos distintos + CD, gás com zona/DoT/cegueira, camuflagem com whiff sem consumo + +100% no 1º dano real (44 vs 24) + CD, estrela com 5 vértices + salto/queda/impacto + stun 2s no Golem, sangramento com proc + DoT (10hp/2.6s em 5s), todos os CDs bloqueando re-cast. Contas de teste removidas do `jogadores.json` após a validação.

**Arquivos alterados:** `server.js`, `index.html`, `classes/ladino.js`, `efeitos/ladino_efeitos.js`, `debuffs.js`, `skills.js`, `equipamentos.js`, `style.css`, `CHANGELOG.md`, `INFO_PROJETO.md`

---

### v1.29.0 — 19/09/2026

**Tabela de alcance do ataque básico por classe (círculo = dano real) + ajustes de velocidade de ataque + 2 bugfixes (agro do pet e flecha dupla do arqueiro).**

O ataque básico agora tem um alcance REAL por classe: a marcação na tela (círculo), a busca de alvo do auto-ataque (cliente) e a validação/dano (servidor) usam a MESMA distância — sem o descompasso anterior (círculo 300 vs dano real 66).

- **Tabela de alcance (cliente `alcanceBuscaClasse` + servidor `alcanceAtaqueBasicoClasse`):**
  - ⚔️ Guerreiro: **100** · 🪓 Bárbaro: **100**
  - 🔮 Mago: **200** · 🦍 Summoner: **190** · ✝️ Curandeiro: **200**
  - 🎸 Roqueiro: **200** · 🏹 Arqueiro: **250**
- **Dano real melee alinhado ao círculo:** Guerreiro `corte` (slimes 66→100, bosses 110→100 — teste da sessão anterior oficializado) e Bárbaro `machadada` (slimes 72→100, bosses 95→100).
- **Ranged:** o dano real já cai onde o projétil chega; todos os novos alcances (máx. 250) estão dentro da distância máxima de voo de cada projétil (mín. 600px), então não há descompasso círculo vs dano.
- **Velocidade de ataque reduzida (intervalo base):** `tempoBaseAtaqueBasico` (servidor) + `baseAtaqueBasicoLocal` (cliente) espelhados:
  - ⚔️ Guerreiro 350ms (sem mudança) · 🪓 Bárbaro **580ms** (−40%)
  - 🔮 Mago **600ms** (−50%) · 🦍 Summoner **1500ms** (−80%)
  - 🏹 Arqueiro **430ms** (−30%) · ✝️ Curandeiro **600ms** (−50%)
  - 🎸 Roqueiro **750ms** (−60%)
  - Ataque manual (botão/espaço) passa a usar o mesmo intervalo da classe (`intervaloAtaqueBasicoLocal`).
- **⚡ Summoner PET (Golem/Ogro Guardião):** vel. de ataque +50% — cooldown 40→27 ticks (colossal 20→13).
- **🐛 Fix agro do PET:** no modo agressivo (`comando_pet_ogro`), o golem só perseguia o `targetSlimeId` (gravado apenas se um slime estivesse a ≤100px do esmagamento) ou quem atacava o summoner — **nunca caçava um slime novo**. Agora o comando agressivo busca o **slime mais próximo em raio 440** (e boss em 440), fazendo o agro/perseguição funcionar de verdade.
- **🐛 Fix flecha dupla do Arqueiro:** o atirador via 2 flechas — uma criada localmente por `criarAnimacaoFlechaBasica` (ação `action_flecha`) e outra já sincronizada por `world_update → playerProjeteis` (`desenharPlayerProjetil`). Removida a criação local duplicada; o som do disparo continua para os outros jogadores.

**Arquivos alterados:** `server.js`, `index.html`, `CHANGELOG.md`, `INFO_PROJETO.md`

---

## Histórico de versões

### v1.28.1 — 19/09/2026

**Bugfix: morte fora da cidade (ex.: deserto) renascia o jogador na BORDA do mapa com movimento bugado.**

- **Causa raiz (`index.html`):** o filtro espacial do `onmessage` (~linha 1164) descarta eventos de outros mapas. O `respawn_confirmado` carrega as coordenadas da Cidade de Davahl mas **não estava na lista de exceções** (só `init` e `teleporte_confirmado`). Quem morria no deserto ficava com `currentMap='desert'` quando a resposta chegava → `respawn_confirmado` era **descartado**; o cliente continuava "vivo" no deserto e o servidor (já com o jogador na cidade) recebia as posições antigas do deserto a cada 30ms, que `validarMovimentoJogador` aceitava como movimento **parcial** até a borda do mapa — o jogador ficava preso na divisa e a correção de dessincronização (>120px) o puxava para lá.
- **FIX 1 — filtro espacial:** `respawn_confirmado` passou a ser exceção (sempre passa, como `init` e `teleporte_confirmado`), para o cliente aplicar a posição/mapa da cidade ao renascer.
- **FIX 2 — `renascer()`:** ao apertar o botão Renascer, o cliente já aplica imediatamente `window.SPAWN_CIDADE` (60474,640, espelho do `CIDADE_SPAWN_X/Y` do servidor) + `currentMap='cidade'` + `portalMapaBloqueado`, impedindo que a posição antiga (deserto/caverna/etc.) seja enviada ao servidor depois do respawn.
- **Nova constante `window.SPAWN_CIDADE={x:60474,y:640}`** junto às constantes de mundo.
- **Verificação:** E2E WebSocket (porta sandbox 8127): login → teleporte deserto → respawn → `respawn_confirmado` devolve (60474,640), dentro da cidade, andável (`colideCidade` falso); simulação do filtro do cliente com `currentMap='desert'`: sem o fix a mensagem é descartada, com o fix passa; sintaxe dos 2 `<script>` inline OK.

**Arquivos alterados:** `index.html`, `CHANGELOG.md`
**Arquivo de teste novo:** `_tmp_respawn_test.js`

---

### v1.23.0 — 15/09/2026

**Engine Gráfica 2.5D Hiper-Realista para a Cidade de Davahl, Sombras Reais Projetadas, Oclusão de Ambiente (AO), Calçamento de Paralelepípedos Procedural, Arquitetura Volumétrica Medieval, Grande Fonte em 3 Níveis e Feira da Praça.**

- **Engine de Calçamento de Paralelepípedos Procedural:**
  - Cada tile de rua agora renderiza uma malha 3x3 de pedras de calçamento com chanfros de luz solar superior-esquerda e sombra profunda inferior-direita, além de amarração inglesa alternada e guias de calçada em pedra talhada.
  - Pátio da Praça Central com grande mosaico rúnico circular entalhado com rosa dos ventos e anéis em mármore polido e ouro velho.
- **Sistema de Sombras Reais Projetadas e Oclusão de Ambiente (AO):**
  - Modelo de sol direcional em ângulo Noroeste gerando sombras alongadas e suaves em direção Sudeste com gradiente realista de penumbra para todos os edifícios, muralhas, árvores e postes.
  - Oclusão de ambiente (AO) na linha de contato das construções com o chão, eliminando a sensação de objetos flutuantes.
- **Arquitetura 2.5D Volumétrica das Casas e Lojas:**
  - Projeção tridimensional com parede lateral em perspectiva sombreada (profundidade real).
  - Fachadas detalhadas com vigamento em enxaimel medieval (madeira maciça entalhada e cruzetas de Santo André) ou cantaria de pedra.
  - Telhados volumétricos 2.5D com beirais pronunciados, caibros aparentes, cumeeiras de cerâmica e trapeiras (águas-furtadas) no sotão.
  - Portas em arco de pedra com tábuas de madeira, ferragens pretas forjadas e maçanetas de latão.
  - Janelas com vidraças em losangos iluminadas com luz âmbar quente, esquadrias e floreiras suspensas floridas.
  - Placas suspensas em ferro forjado com ícones das lojas (Taverna, Forja, Alquimia, Mansão, Guarda, etc.).
  - Chaminés de tijolos com fumaça animada e ondulante ao vento.
- **Grande Fonte Monumental de Davahl em 3 Níveis:**
  - Bacia inferior esculpida em mármore com água cristalina turquesa e anéis de onda animados.
  - Pedestal intermediário com jatos d'água laterais.
  - Pináculo superior com jato parabólico de alta altitude, partículas de gotas cintilantes e névoa iluminada.
- **Iluminação Volumétrica dos Postes Vitorianos:**
  - Postes trabalhados em ferro fundido com lanternas de vidro e chama cintilante, projetando poças de luz quente com gradiente radial sobre os paralelepípedos.
- **Feira Medieval da Praça:**
  - 4 barracas temáticas (Poções, Frutas/Especiarias, Armas/Escudos, Livros) com bancadas de madeira, caixotes, mercadorias e toldos listrados em tecido colorido com franjas onduladas.
  - Bancos rústicos de madeira para descanso espalhados pela praça.
- **Muralhas Fortificadas com Torres de Vigia 2.5D:**
  - Muralhas elevadas com ameias dentadas e seteiras.
  - 4 torres de vigia circulares nos vértices da cidade com telhado cônico de ardósia e catavento de bronze.

**Zoom no Minimapa (+ e -), Smart Cast Reconstruído com Range Clamping, Ataque Básico por Clique do Mouse, Cenário Vivo e Orgânico, Spawns Automatizados por Bioma/Nível, Evento de Horda e Ajuste de Portais.**

- **Zoom no Minimapa com Botões `+` e `−`:**
  - Botões integrados na barra superior do minimapa com 4 níveis de ampliação: `4x` (700px), `2x` (1400px, padrão), `1x` (2800px) e `Mundo` (visão global).
  - Modo radar centrado no jogador, com anéis concêntricos de radar, mira central, proporção correta de distância, monstros coloridos por nível/tipo, drops, jogadores e seta indicadora do chefe Golem de Pedra com distância em tempo real.
- **Smart Cast para PC Reconstruído do Zero:**
  - Ao pressionar a tecla da habilidade ou clicar no slot, exibe o círculo de alcance máximo (`alcanceMax`) ao redor do jogador e o círculo de área (`raio`) sob o cursor do mouse.
  - Limitação estrita de distância máxima por habilidade (ex: Meteoro: 550, Nevasca: 520, Chuva: 600, Julgamento: 480, Prece: 400, Esmagamento: 220, Teleporte: 450, Salto: 380), impedindo conjuração fora do alcance válido.
  - Conjuração imediata no clique esquerdo do mouse e cancelamento limpo com botão direito ou `ESC`.
- **Ataque Básico com Clique Esquerdo do Mouse:**
  - Clicar com o botão esquerdo no canvas direciona o herói para o cursor e dispara o ataque básico imediatamente naquela direção.
- **Cenário Mais Vivo, Realista e Arredondado (`mapas.js`):**
  - **Árvores Orgânicas 3D:** troncos de madeira com raízes e textura de casca, sombra ovalada no solo e 3 camadas de domos arredondados sobrepostos com balanço suave ao vento e frutinhas vermelhas.
  - **Flores e Plantas:** canteiros detalhados com pétalas arredondadas, caules, folhas e miolos em múltiplas tonalidades (douradas, magenta, celestes, lavanda e margaridas).
  - **Lagos com Vitórias-Régias e Lótus:** folhas flutuantes arredondadas com flores de lótus abertas e ondulações de água com reflexos.
  - **Detalhes de Chão:** trevos de 3 folhas, lâminas curvadas de grama, pequenos cogumelos de chapéu vermelho/marrom e rochas fluviais arredondadas com musgo e iluminação.
  - **Safe Zone com Pulso Rúnico:** anel dourado animado delimitando a área protegida.
- **Spawns por Nível/Bioma e Eventos:**
  - Spawns escalonados: Floresta Verde (Slimes Lv 1-10), Deserto (Besouros e Zumbis Lv 10-25), Pântano (Zumbis do Pântano Lv 25-40) e DG Caverna (Morcegos Lv 40+).
  - Chefe Golem de Pedra reposicionado para o final da Caverna DG (`x: 59400, y: 900`, 8000 HP).
  - Evento de Horda periódica a cada 3-5 minutos invocando cerca de 20 monstros agressivos próximos a um jogador ativo com aviso no servidor.
- **Correções de Portais:**
  - Entrada do Portal da Cidade ajustada para `X: 61824, Y: 1783`.
  - Portal de retorno do Pântano Lodoso corrigido para levar de volta à Cidade de Davahl (`61824, 1783`) em vez de reciclar no próprio pântano.
  - Constantes `GATE_L0` e `GATE_L1` corrigidas no `mapa_pantano.js`.

**Controles de PC (WASD + Atalhos), Barra de Skills Central, HUD Superior Rente, Novo Minimapa com Monstros e Mapa Grande (M) com Portal para Davahl.**

- **Controles de Movimento para PC (WASD):** movimentação fluida via teclas W, A, S, D e setas direcionais com normalização de vetor para velocidade diagonal perfeita; atualização de ângulo e envio sincronizado de movimento.
- **Barra de Skills Centralizada Horizontal:** a barra de ações foi reposicionada para o centro inferior horizontal da tela (`.actions`), com badges visuais de teclas (`.key-badge`) exibindo os atalhos (1, 2, 3, Espaço, R).
- **Atalhos de Interface para PC:**
  - `I`: Abre/fecha o Inventário (`toggleInventario()`).
  - `K`: Abre/fecha a tela de Habilidades (`toggleSkills()`).
  - `C`: Abre/fecha a tela de Status/Atributos (`toggleAtributos()`).
  - `L`: Exibe/atualiza latência e ping de rede (`alternarHudPing()`).
  - `ESC`: Fecha a janela modal ativa ou abre/fecha as Configurações (`fecharModalSuperiorOuConfig()`).
  - `M`: Abre/fecha a tela do Mapa Grande (`toggleBigMap()`).
  - `Espaço`: Executa ataque básico.
  - `R`: Ativa/desativa autofarm.
  - `1`, `2`, `3`: Disparam as habilidades da classe ativa.
  - Clique com o botão esquerdo do mouse no canvas dispara ataques básicos ou conjura habilidades com smart-cast na direção do ponteiro.
- **Remoção do Botão "Girar Tela":** botão `#btn-rotate` removido da interface e dos estilos.
- **HUD Superior Otimizado:** elementos do topo (Level, DPS, Status, FPS, Coordenadas) foram reancorados rentes às bordas da tela (`top: 6px` a `top: 8px`).
- **Novo Minimapa do Zero (`#minimap-wrapper`):** canvas moderno com moldura estilizada, cabeçalho com bioma e coordenadas, exibição dos 5 biomas, jogadores, drops e **monstros em tempo real** (pontos coloridos por espécie e ícone de chefe com diamante pulsante para o Golem de Pedra).
- **Tela de Mapa Grande (`#big-map-screen`):** acionada pela tecla `M` ou clique no minimapa. Visualização panorâmica de alta resolução das 5 zonas (Campo Verde, Deserto, Pântano, Caverna e Davahl), com indicação clara da posição do jogador, monstros e o **Portal da Cidade de Davahl**. Clicar no portal abre a confirmação para teleporte imediato de volta à cidade (`voltarCidade()`).

### v1.20.0 — 15/09/2026

**Portal de Viagem na cidade + correção do bug de travar no chão vazio (recursão infinita da cadeia de mapas).**

- **Bug do spawn corrigido:** o client travava em chão vazio (HUD "X: 0 Y: 0") por `RangeError: Maximum call stack size exceeded` a cada frame — `mapa_cidade` sobrescrevia o global `_chainMapasAnterior` que `mapa_caverna` lia, causando recursão infinita em `infoPortalCaverna` (`Math.hypot`). Correção: cada módulo guarda o antecessor no escopo do próprio módulo (`cidadeChainAnterior` em `mapa_cidade.js` e `cavernaChainAnterior` em `mapa_caverna.js`) antes de sobrescrever `global.chainMapas`.
- **Bug do portal do verde:** teleportar para o Campo Verde colocava o jogador exatamente em `PORTA_CIDADE_VERDE` (5000,1200), fazendo `infoPortalCidade` detectar o portal e disparar transição falsa de volta à cidade (tela preta). Correção: `PONTOS_TELEPORTE.green` agora usa (5200, 1400), distante do raio do portal (r=58).
- **Portal de Viagem (`PORTAL_MAPAS` em (61700,1500), raio 55):** coreografia animada pulso + rótulo "PORTAL VIAGEM" desenhado no fim de `desenharCenarioCidade`; hit-test `tocarPortalViagem` (raio +14) acessível por toque e mouse.
- **Janela de seleção de mapa (`#teleport-screen`):** ao tocar/clicar no portal abre a janela com 5 destinos — Cidade de Davahl, Campo Verde, Deserto com Oásis, Pântano Lodoso e **Caverna Sombria (DG)** — botão FECHAR; enquanto aberta, movimento, joystick, autofarm, drops e UI são bloqueados.
- **Teleporte autoritativo no servidor:** nova constante `PONTOS_TELEPORTE` (green 5000/1200, desert 18300/4500, pantano 50200/1000, caverna 58080/900, cidade 61800/2000, todos validados walkable) e handler `teleporte_mapa` que reposiciona o player (+jitter ±10), move o lacaio do summoner e responde `teleporte_confirmado {mapa,x,y}`.
- **Client:** `selecionarMapa(mapa)` (destaca o botão com `.selecionado`, mostra `#btn-teleportare-confirmar` verde), `confirmarTeleporte()` (só então envia `teleporte_mapa`, fecha a janela e reseta seleção); `voltarCidade()` envia teleporte direto para a cidade. `fadeTeleporte` aplica o fade de transição. Guards de movimento incluem `teleporteAberto`.
- **Minimapa (`#minimap`, canto superior direito):** canvas 150×85px mostrando as 5 zonas coloridas, a posição do jogador (ciano) e os drops no chão (amarelos/laranjas); clique no minimap coleta o drop mais próximo da posição clicada **mesmo longe do jogador** (raio 80).
- **Correção do joystick com itens no lado esquerdo:** no `touchstart`, o controle do joystick (metade esquerda) agora tem prioridade máxima e é verificado ANTES da coleta de drops; toques na metade esquerda ativam o joystick e são ignorados pela detecção de drops.
- **Telemetria de diagnóstico (mantida):** envio de erros do client ao servidor (`client_error`), estado periódico (`client_estado`, a cada 100 ticks), `window.ws` exposto e logs `[LOGIN] pos(...) classe=...`/`[ESTADO]` no servidor — confirmaram que o servidor saía do login correto (pos 61806/1997, classe mago).
- **Cache-busters:** `mapa_cidade.js?v=2`, `style.css?v=234`.

**Arquivos alterados:** `mapa_cidade.js`, `mapa_caverna.js`, `server.js`, `index.html`, `style.css`, `CHANGELOG.md`

**Verificação:** `node --check server.js` e `node --check mapa_cidade.js` OK; teste E2E via WebSocket PASS — login → teleporte verde (5201/1399, sem tela preta) → caverna → voltar à cidade (61801/1999). Rollback: backups/ do dia.

---

### v1.19.8 — 14/09/2026

**Mapas em escala + Cidade de Davahl separada com portal + pântano venenoso — e todos os spawns automáticos removidos.**

- **Escala dos biomas:** verde 10x (18000×18000, x∈[0,18000)), deserto 20x (32000×36000, x∈[18000,50000)), pântano 5x (8000×9000, x∈[50000,58000)), caverna reposicionada (1800×1800, x∈[58000,59800)) e cidade nova (4000×3000, x∈[59800,63800)). `WORLD_WIDTH=63800`, `WORLD_HEIGHT=36000`.
- **Cidade de Davahl (`mapa_cidade.js`, novo):** região separada com muralha externa (portão oeste), praça central com fonte, 14 casas, ruas em anel, parque e lâmpadas. Acesso só por portal da Safe Zone do verde (relocalizada para x=5000,y=1200, raio 350) e portal de retorno na cidade (x≈59920,y=1400). `colideMapaAtivo` final inclui a cidade.
- **`mapas.js` (verde):** reescrito — 450×450 tiles, 14 lagos decorativos acessíveis (rios removidos), 130 árvores fora de lagos/Safe, terreno determinístico com relevo 2.3D, base da Safe com gradiente + runas + portão sul.
- **`mapa_deserto.js`:** reescrito — dunas, 4 oásis com palmeiras, ruínas, desfiladeiro leste (y 8000-8600) rumo ao pântano, portais verde↔deserto, montanhas na borda leste.
- **`mapa_pantano.js`:** reescrito — água **venenosa** (libre p/ jogador, bloqueia monstros via `podeAndar`); jogador sobre ela recebe debuff `veneno` (☠️, 5s, −5 HP a cada 0,5s) via novo bloco no loop do `server.js`.
- **`server.js`:** novas constantes de bioma; `podeAndar` com limites por bioma + veneno; colisões de projéteis com pântano/cidade; **todos os spawns automáticos removidos** (monstros só nascem por bandeira admin); bloco de dano `sobVenenoPantano`.
- **`debuffs.js`:** efeito `veneno` adicionado.
- **`index.html`:** nova zona `cidade` (render, sortables, detecção de região com clamp Y por bioma), `ZOOM_CAMERA` 0.77 → 0.92, colisão de árvores só no mapa verde.
- **Correções de validação:** `Math.hypot` sem parêntese no anel circular da cidade; Safe Zone do verde movida para o portal da cidade; comentários de fases desatualizados.

**Arquivos alterados:** `mapas.js`, `mapa_deserto.js`, `mapa_pantano.js`, `mapa_caverna.js`, `mapa_cidade.js` (novo), `server.js`, `index.html`, `debuffs.js`, `CHANGELOG.md`, `PROGRESSO.md`

**Verificação:** `node --check` OK em todos os módulos; servidor 8080 bootstrap carregou as 5 fases; testes 39 PASS / 1 FAIL pré-existente (RNG de drop). Rollback: `backups/mmorpg_backup_20260914_antes_mapas.tar.gz`.

---

### v1.19.7 — 14/09/2026

**Hotfix: efeitos visuais das skills e ataques básicos (projéteis, marcas, explosões, smart cast) voltaram a funcionar.**

- **Causa raiz:** na v1.19.6 o módulo de buffs/debuffs foi escrito sobrescrevendo o `efeitos.js` (29 KB) — que era o arquivo de efeitos visuais do cliente (projéteis, animações de skill, smart cast). Skills continuavam causando dano mas toda a parte visual sumiu.
- **FIX:** o `efeitos.js` original (visual) foi restaurado a partir do backup (`backups/mmorpg_backup_20260914_010643.tar.gz`). O módulo de debuffs/buffs foi movido para um novo arquivo **`debuffs.js`** e o `server.js` agora faz `require('./debuffs.js')`.
- **`index.html`:** volta a carregar `efeitos.js` (visual, `v=234`) e passa a carregar `debuffs.js?v=1` (define `window.EFEITOS` usado nos ícones de status). Handler `efeitos_sync` e trava/lentidão de movimento mantidos.

**Arquivos alterados:** `efeitos.js` (restaurado), `debuffs.js` (novo), `server.js`, `index.html`, `CHANGELOG.md`, `PROGRESSO.md`

---

### v1.19.6 — 14/09/2026

**4 correções: reset de status (1x), upgrade de skill ao subir nível, drop de arma secundária e sistema de buffs/debuffs:**

- **Bug 1 — Reset de status só funcionava 1x:** `atributos.js` — `resetarAtributos()` desabilitava o botão e `renderizarAtributos()` nunca o re-habilitava. FIX: `renderizarAtributos()` re-habilita (`btnReset.disabled=false; text="RESETAR"`).
- **Bug 2 — Upgrade de skill não refletia ao subir de nível:** `index.html` — handler `xp_ganho` não re-renderizava a skills UI quando `subiuLevel`. FIX: chama `renderizarSkills()` (o servidor já validava/ganhava pontos corretamente).
- **Bug 3 — Arma secundária nunca dropava:** só o guerreiro tinha (`escudo_pedra`). FIX em `equipamentos.js`: novas armas secundárias para **mago** (Grimório Arcano 📖), **summoner** (Cálice das Sombras 🏆), **arqueiro** (Aljava Peregrina 🪶) e **curandeiro** (Rosário Sagrado 🕊️). Bárbaro e Roqueiro seguem sem armas (design). `testes_equipamentos.js` atualizado — agora exige que essas 4 classes gerem secundária.
- **Bug 4 — Tabela de buffs/debuffs (sistema novo):**
  - **`efeitos.js` (novo):** 12 efeitos cadastrados — debuffs: stun ⚡, lentidão 🐌, paralisia ⛓️, sono 💤, corta-cura 🩹, defesa quebrada 🥀, enfraquecido 💪; buffs: escudo 🛡️, ardente 🔥, fervor 💢, velocidade 💨, sede de sangue 🩸. Módulo puro com `aplicarEfeito`/`atualizarEfeitos`/`temEfeito`/`pegarEfeito`/`removerEfeito`/`exporEfeitos` + guard de compatibilidade browser (`module`/`window`).
  - **`server.js`:** efeitos alteram dano causado (`reducaoAtk` −25%, `fervor` +25%), dano recebido (`reducaoDef` +25%, `escudo` −20%), cura recebida (`cortaCura` −50%); trava de movimento por `paralisia`/`sono` além do stun; **sono acorda ao levar dano** (re-emite `efeitos_sync`); `efeitos` de cada player agora viajam no `world_update`.
  - **`index.html`:** novo handler `efeitos_sync` (com `id` de alvo); ícones de status sobre o personagem (círculo, ícone colorido e timer/valor abaixo); movimento local respeita `lentidao` (−50%), `velocidade` (+50%) e trava em `paralisia`/`sono` (autofarm também). Cache-buster `efeitos.js?v=233`.

**Arquivos alterados:** `server.js`, `index.html`, `atributos.js`, `equipamentos.js`, `efeitos.js`, `testes_equipamentos.js`, `PROGRESSO.md`, `CHANGELOG.md`

---

### v1.19.5 — 14/09/2026

**Skills funcional no servidor + sistema de mana + barra de MP no HUD:**

- **Servidor (`server.js`):** níveis de skill agora vivem no servidor (`p.skills`, persistidos). Ganha 1 ponto por level (`p.pontosHabilidade`, sincronizado via `init`/`xp_ganho`). Novas funções utilitárias: `calcularMaxMp` (50+int*10), `obterNivelSkill`, `dmgSkill` (+25%/nível), `mpSkill` (+6%/nível), `gastarMana` (retorna false + envia `mp_insuficiente` se faltar mana). Novos handlers: `upgrade_skill` (valida nível<10 e pontos>0, gasta ponto, persiste), `resetar_skill`, `resetar_todas_skills`. Regen automática de mana ~3% do máximo a cada 2.5s no loop principal. Todos os handlers de skills (incluindo basic attacks e projéteis de pet/zona) agora usam `dmgSkill` para dano/cura escalado e `gastarMana` para custo real; `xp_ganho`/`distribuir_ponto`/`atributos_resetados`/`inventario_sync` agora também enviam/sincronizam `maxMp`/`mana`.
- **Skills UI (`skills.js`):** agora envia `upgrade_skill`/`resetar_skill`/`resetar_todas_skills` ao servidor em vez de simular localmente. Mostra "Pontos de habilidade" disponíveis no topo. Botão ⬆️ MELHORAR desabilitado se não houver pontos. Mana exibida no card é o custo efetivo escalado (`mpSkill`). Estilos atualizados (`.skill-pontos`, `.btn-melhorar:disabled`).
- **`index.html`:** barra de mana no HUD (`#mp-bar-container`/`#mp-bar-fill`, verde). Novo `window.enviarServidor()`. Handlers `skill_upgrade`/`skill_reset`/`skill_reset_tudo`/`skill_erro`/`mp_sync`/`mp_insuficiente` integrados. `ponto_distribuido`/`atributos_resetados`/`inventario_sync` sincronizam `maxMp/mana` e chamam `atualizarHudMp()`. Cache-busters: `skills.js?v=143`, `skills.css?v=141`, `style.css?v=232`.

### v1.19.4 — 14/09/2026

**Correção: confirm() de reset virava a tela para vertical + duração do texto de combate reduzida:**

- **`atributos.js`:** o `confirm()` nativo do navegador derrubava o fullscreen/`screen.orientation.lock('landscape')` no celular e a tela girava para retrato. Substituído por **modal de confirmação próprio do jogo** (`#confirm-screen`, botões SIM/NÃO) — a pergunta continua aparecendo, mas sem sair da horizontal. Ao abrir, chama `tentarHorizontalAutomatico()` de novo para reforçar o modo paisagem.
- **`index.html`/`style.css`:** estrutura e estilos do modal de confirmação (overlay `z-index:950`, janela pixelada roxa, botões vermelho/azul).
- **Duração do texto flutuante de combate reduzida ~40%:** decaimento de alpha `0.0273` → `0.045` por frame (de ~37 quadros ≈ 0.62s para ~22 quadros ≈ 0.37s). Fonte `bold 21px` mantida.

**Arquivos alterados:** `atributos.js`, `index.html`, `style.css`, `CHANGELOG.md`

---

### v1.19.3 — 14/09/2026

**Textos de combate maiores/mais visíveis e botão de RESETAR status:**

- **`index.html`:** texto flutuante de dano/cura/XP com fonte **+30%** (`bold 21px Arial`, era 16px) e duração na tela **+10%** (`alpha -= 0.0273` por frame, ~37 quadros ≈ 0.61s, era ~33 quadros). Offset de centralização ajustado (−14).
- **Botão RESETAR na janela de Status:** devolve **todos os pontos gastos** (`atributos` voltam a 1 e `pontosDisponiveis` recebe a soma dos pontos alocados), recalcula `maxHp` (e a vida do ogro por Afinidade) e persiste. Confirmação com `confirm()` antes de aplicar.
- **`server.js`:** handler `resetar_atributos` (validação estrita: só devolve pontos realmente gastos; se não houver nenhum, responde `atributos_resetados` sem alterar nada).
- **`atributos.js`/`atributos.css`:** função `resetarAtributos()` + estilo do botão azul (desabilitado enquanto processa) e cache-buster `?v=2`.

**Arquivos alterados:** `server.js`, `index.html`, `atributos.js`, `atributos.css`, `CHANGELOG.md`

---

### v1.19.2 — 14/09/2026

**Todo dano exibido agora vem do servidor (autoritativo) — fim dos números falsos no cliente:**

- **`server.js`:** novo helper `broadcastDanoFlut` emite `texto_dano` (`{x,y,dano,autorId}`) com o dano **real aplicado** sempre que um JOGADOR acerta monstro ou boss — dentro de `registrarDanoMonstro`/`registrarDanoBoss` (pet `tipoOrigem:'pet'` excluído, o golem/lacaio já tem o seu). Isso cobre automaticamente ataques básicos, projéteis, corte, machadada, dash, tornado, meteoro, nevasca (DoT), chuva de flechas, julgamento, esmagamento do bárbaro, bateria e golpes de área vs bosses. A mensagem de cura (`action_curandeiro_cura`) agora envia `valor` com o **valor real curado**.
- **`index.html`:** handler `texto_dano` (texto flutuante laranja `-X` + entra no DPS **só quando o dano é seu**, via `autorId`) e `action_curandeiro_cura` passa `dados.valor` à animação de cura (texto verde `+X HP ✨` real, não mais "+35" fixo). Removidos os **danos fabricados no cliente**: cortes/ataques básicos das classes (`classes/*.js`), roqueiro, dash (-20), tornado (-25), meteoro (-25), nevasca (-6), esmagamento sísmico (-45), esmagamento do bárbaro (-35) e julgamento (-28) — o número passa a sair **exclusivamente do servidor** no momento do acerto.
- **`efeitos/*`:** animações mantidas; os textos com números fixos removidos (meteoro/nevasca/sísmico/esmagamento/julgamento/cura).
- Cache-busters atualizados (`?v=`) e Bump de versão para **v1.19.2**.

**Arquivos alterados:** `server.js`, `index.html`, `classes/{guerreiro,mago,summoner,arqueiro,curandeiro,barbaro}.js`, `efeitos.js`, `efeitos/curandeiro_efeitos.js`, `efeitos/barbaro_efeitos.js`, `CHANGELOG.md`

---

### v1.19.1 — 14/09/2026

**Cura e dano mágico agora refletem os atributos na interface (o servidor já escalava):**

Teste automatizado controlado em servidor real (porta 8099, usuários de teste criados e removidos no fim):
- **Cura (Divindade):** curandeiro com divindade 1 curou **+35**; com divindade 8 curou **+47** (35 × 1.35) — confirmado via alvos iniciando com 53/100 HP salvos no banco (`server.js` já aplicava `calcularCuraJogador`, linha ~201).
- **Dano mágico (Inteligência):** `ataque_curandeiro` causou **12** com inteligência 1 e **16** com inteligência 8 (12 × 1.35, crit 1.5× visto) contra o slime da bandeira.

O "35 fixo" que o jogador via era **só visual**: o tooltip de `skills.js` mostrava o valor base (só escalava por nível de TESTE, que não altera combate) e a animação de cura não exibia número algum.

- **`skills.js`:** novo `atributoEscalaSkill()` + `valorComAtributo()` que espelham as regras do `server.js` e o tooltip agora mostra o valor com os atributos atuais do jogador, ex: "💖 Cura **47** (35 base · +5% por Divindade)". Regras: cura → Divindade; golpes de pet (ogro/esmagamento/salto) → Afinidade; dano contínuo (`/s`) → Profanidade; mago/summoner/curandeiro/roqueiro → Inteligência; demais → Força.
- **`index.html`:** quando o HP sobe (ex: cura recebida), aparece número flutuante **verde "+X"** sobre o personagem (antes só existia o "-X" vermelho de dano recebido). Bump `skills.js?v=142` (cache-buster).

**Arquivos alterados:** `skills.js`, `index.html`, `CHANGELOG.md`

---

### v1.19.0 — 14/09/2026

**Mapa transformado em 2.3D (extrusão de tiles) — Opção A:**

A câmera continua **top-down** e os personagens/monstros continuam sprites 2D (y-sort intacto), mas o **chão agora é voxel**: cada tile com relevo é desenhado como um bloco com **topo levantado + parede sombreada (face sul + face leste)**, estilo isométrico visto de cima. Isso é 100% visual — **não altera colisão** (a altura real continua vindo do `grid`, usada pelo servidor).

- **`mapa_deserto.js`:** novo `alturaRelevo(tipo)` — **dunas** sobem 4px, **ruínas** 8px, **montanhas** 12px (agora com parede de rochedo + pico ancorado no topo). `desenharAreiaBase`/`desenharMontanha` desenham parede sul + parede leste + topo com brilho na borda. Decoração (pedrinhas) assenta no topo da duna; sprite das **ruínas ancorado no topo do bloco** (`sortables.base` corrigido).
- **`mapa_pantano.js`:** mesmo esquema — **grama** (ilhas musgosas) 4px, **ruínas** 8px, **montanhas musgosas** 12px (paredes escuras + pico + musgo no topo). Juncos/cogumelos em grama sobem junto; sprite de ruína ancorado no topo.
- **`mapas.js` (mapa verde):** grade determinística cosmética (`mulberry32`) gerada uma vez — manchas de grama clara, **blocos de terra** (3px) e **afloramentos de pedra** (5px) com a mesma extrusão, sob o rio/safe zone/árvores. **Sem mudança de colisão** (verde continua com árvores circulares).

**Arquivos alterados:** `mapa_deserto.js`, `mapa_pantano.js`, `mapas.js`, `index.html` (bump anti-cache `?v=`), `CHANGELOG.md`

---

**Correções: stun eterno do Besouro, troca de personagem que não deslogava e conferência da barra de skill:**

- **Stun do Besouro não acabava (bug):** o bloco que decrementa `stunTimer` do jogador estava **deslocado para dentro do handler de mensagem `comando_salto_ogro`** (só rodava quando o summoner usava o salto do ogro sem mira) e **não existia no loop principal de 50ms** — por isso quem levava o stun de 5s (100 ticks) ficava atordoado para sempre. O bloco foi **movido para o loop principal** (`server.js`, logo após o processamento dos players) e roda a cada tick normalizando os 5s; o respawn também **zera o `stunTimer`** para o jogador não renascer atordoado.
- **Troca de personagem desloga de verdade:** `trocarDePersonagem()` (config.js) agora **fecha o WebSocket** (o servidor remove o personagem do mundo no `close`) em vez de só abrir a tela de seleção com o char antigo ainda conectado/aparecendo. O personagem **só volta a aparecer quando a nova classe é escolhida**: `selecionarClasse()` detecta socket fechado, guarda a classe em `classePendente` e re-loga (`conectarWebSocket`); no `init` a classe pendente é aplicada sozinha (ping também é deduplicado via `pingIntervalo`).
- **Conferida a barra de skill do Besouro:** a barra de carregamento (1.2s antes do voo) já existia e é renderizada em `monstros.js` (`desenharBesouroNegro`) quando `skillCharging`; confirmado que o servidor envia os campos (`skillCharging/skillChargeMax/skillAim`) no `world_update` e que o `skillChargeMax` do spawn natural (24) dispara a barra corretamente.

**Arquivos alterados:** `server.js`, `config.js`, `index.html`, `CHANGELOG.md`

---

### v1.18.0 — 13/09/2026

**Spawn natural do Besouro Negro 🪲 no deserto** — antes o monstro só existia em código (AI/render/efeitos) e só podia aparecer via bandeira de admin (e `spawn_flags.json` vazio, então nunca era visto). Agora ele vive de verdade no bioma:

- **`server.js`:** novo helper `gerarPosicaoDeserto()` (x ∈ [1800, 3400) em tile andável — arena, fora de água/pedras/cactos) e spawn inicial de **4 besouros** fixos no deserto com todos os atributos (HP 300, agro 420, voo com stun 5s, ranged 4x, `flagPassivo:false`/`flagAgressivo:true` para agro por proximidade).
- **Respawn corrigido:** ao morrer e renascer, o besouro **reaparece dentro do deserto** (usava `gerarPosicaoValida()` que jogava o monstro para fora do bioma), e o estado da skill (voo/dash) é resetado junto.
- **Revisão da integração:** conferidos AI no `server.js` (`besouro_negro`), render em `monstros.js`/`index.html`, efeitos de decolagem/impacto em `efeitos.js` e registro no painel admin (`spawn-admin.js`) — tudo conectado e sem contradições.

**Arquivos alterados:** `server.js`, `CHANGELOG.md`

---

### v1.17.0 — 13/09/2026

**Correção: o golem (ogro) do Summoner agora recebe dano de verdade (com HUD, morte e respawn)** — antes inimigos provocados pelo rugido "atacavam" o pet mas o dano não valia: melee/zumbi reduziam o HP sem HUD nem morte, e projéteis de ranged/zumbi **atravessavam o pet e acertavam o summoner** (vazamento de dano):

- **Colisão de projéteis contra o pet**: no loop de colisão, um projétil com `petAlvo` válido colide com o lacaio do dono (raio `(p.raio||5)+24`) e aplica `danoCausadoAoOgro(pid, p.dano||10, x, y)` **antes** da checagem contra players — corrige o vazamento sem alterar a colisão normal.
- **`danoCausadoAoOgro(pid, dano, x, y)`**: reduz `ogro.hp`, emite `action_lacaio_dano` (texto flutuante vermelho `#ff5252` à altura do pet + som de bloco) e, se zerar o HP, **remove o lacaio**, inicia `petRespawnTimer[pid] = 240` (12 s) e emite `action_lacaio_morreu` (texto "💀 OGOR CAIU!" + som de impacto pesado).
- **Aplicação nas 3 fontes**: ataque corpo-a-corpo do slime melee, cuspirada do zumbi e tiro do ranged — todos com taunt ativo no lacaio passam a usar `danoCausadoAoOgro` em vez do `alvo.hp -=` genérico sem efeito visual.
- **Respawn do pet**: loop do summoner decrementa `petRespawnTimer` e recria o ogro (vida cheia) ao zerar; `if (!ogro) continue` evita processar pet inexistente durante o timer. Morte do pet **não** mata o jogador nem dá invulnerabilidade.
- **Limpeza do timer**: `escolher_classe`, ressurreição e desconexão removem o `petRespawnTimer` do jogador.
- **HUD no `index.html`**: handlers `action_lacaio_dano` (floating text vermelho + `tocarSomBlock()`) e `action_lacaio_morreu` (floating text "💀 OGOR CAIU!" + `tocarSomImpactoPesado()`).

**Arquivos alterados:** `server.js`, `index.html`, `CHANGELOG.md`

---

### v1.16.0 — 13/09/2026

**Sistema de Gerenciamento de Spawns em Tempo Real (Ferramenta de Administração In-Game)** — bandeiras de spawn de monstros/bosses plantadas no mundo por admins:

- **Botão Admin 🚩 no HUD** (`#util-buttons`): só aparece para o cargo configurado em `admins.json` (`{"admins":["admin"]}`, comparação case-insensitive). Abert no `init` o servidor envia `admin: true` e a lista atual de bandeiras (`spawn_flags`).
- **Painel centralizado `#spawn-admin-screen`**: select com todos os monstros/bosses cadastrados (Slime Melee 🟢, Slime Arqueiro 🔵, Zumbi 🧟, GOLEM DE PEDRA 🗿), quantidade máxima (1–50), comportamento (Agressivo/Passivo), **HP base customizado** e **respawn 1–10s** (slider). Botões **APLICAR/SALVAR**, **DELETAR BANDEIRA** (com confirmação dupla) e **FECHAR**.
- **Posicionamento por bandeira**: ao aplicar, a bandeira é plantada nas coordenadas (X,Y) atuais do admin; tocar em cima de uma bandeira no mapa (raio ~40px) reabre o painel preenchido para edição ou exclusão. Bandeiras desenhadas no Canvas **apenas para admins** (mastro + bandeirinha colorida por tipo, emoji do monstro, rótulo com quantidade e estado passivo/agressivo).
- **Persistência em tempo real**: cada criação/edição/exclusão salva instantaneamente `spawn_flags.json` no servidor (sobrevive a reinícios) e reenvia a lista atualizada só para admins conectados.
- **Segurança no servidor (módulo `spawns.js`)**: todo CRUD valida `players[id].isAdmin`; jogador comum não consegue criar/editar/excluir nem recebe bandeiras. Validação estrita de `tipo`, `maxQtd`, `hpBase`, `respawnSeg` e posição dentro do mundo (fora de água e em tile andável).
- **Sincronização multiplayer**: os monstros gerados entram nas arrays globais `slimes`/`bosses` (sincronizados no `world_update` para todos). Agro por proximidade se agressivo, **passivo não agroa nem ataca nem é provocado** (nem pelo rugido), taunt do golem ignora passivos. Morte, XP e respawn sincronizados: monstro de bandeira morre → revive na bandeira após o `respawnSeg` (bosses também, na posição da bandeira em vez dos cantos fixos).
- **Modularidade**: backend isolado em `spawns.js` (registry + persistência + permissão + factories); frontend em `spawn-admin.js`/`spawn-admin.css`; `server.js` só orquestra o loop (`atualizarBandeirasSpawn()` por tick) e os handlers de socket.

**Arquivos alterados:** `server.js`, `index.html`, `CHANGELOG.md`
**Arquivos novos:** `spawns.js`, `spawn-admin.js`, `spawn-admin.css`, `admins.json`, `spawn_flags.json` (gerado)

---

### v1.15.0 — 13/09/2026

Summoner: salto em **Smart Cast**, **Rugido passivo do golem** (agro) e **dano do golem em roxo** nos textos flutuantes:

- **Salto do golem agora é Smart Cast** (igual o mago): `SKILLS_DRAG.salto` (raio 70, alcance 350, classe `summoner`), botão 🦘 dispara `iniciarDragSkill`, arrasta e solta no local; mira toggle `ativarSaltoSmartCast`/`modoMiraSaltoOgro` com marcador roxo próprio e fallback para a direção do jogador. Servidor `comando_salto_ogro` aceita `targetX/targetY`, clampa no mundo e, ao aterrissar, o golem foca o inimigo mais próximo (slime OU boss).
- **Rugido passivo a cada 10s** (200 ticks): o golem emite `action_ogro_rugido` (onda roxa + som + tremor) e puxa o agro por **4s** (80 ticks) — slimes (melee/ranged/zumbi) passam a atacar **o golem**, e o boss foca o summoner. Ao fim do taunt os alvos são limpos; golem regenera HP lentamente (não morre aguentando o agro). Taunts resetados no respawn do boss/slime.
- **Dano do golem em texto flutuante roxo** (`#9b59b6`) no inimigo: `registrarDanoMonstro`/`registrarDanoBoss`/`danoEmBosses` agora retornam o dano real aplicado, e o helper `broadcastDanoLacaio` emite `action_golem_ataque` com `dano` (atalho do rang: ataque básico, salto e sismico 💥). O dano exibido é o dano calculado (atributos/multipliers), não mais "-15" fixo.
- Dano flutuante entra no `registrarDanoCausado` (DPS/DPS total contabilizam o golem).

**Arquivos alterados:** `server.js`, `index.html`, `efeitos.js`, `CHANGELOG.md`

---

### v1.14.0 — 13/09/2026

Sistema completo de **Atributos** com distribuição de pontos, validação no servidor e sync multiplayer:

- **8 atributos:** Força (dano físico + HP), Inteligência (dano mágico + regen MP), Agilidade (+velocidade de movimento), Destreza (chance 5% + 1%/pt e multiplicador de crítico 1.5x + 3%/pt), Vida (+20 HP/pt), Profanidade (+5% dano de DoT/pt), Divindade (+5% cura/escudo/pt), Afinidade (+5% dano e +15 vida/pt do pet/ogro).
- **Novos arquivos:** `atributos.js` (janela de Status no client) e `atributos.css` (estilos pixelados, z-index 310).
- **`index.html`:** botão `#btn-status` 📊 na HUD, janela `#atributos-screen`, handlers `ponto_distribuido` e `texto_critico`, `init`/`xp_ganho` recebem `atributos`/`pontos`/`maxHp`, `world_update` sincroniza atributos de `window.todosJogadores[meuId]`, velocidade de movimento ganha bônus de Agilidade, movimento/autofarm bloqueados com a janela aberta.
- **`server.js`:** bloco "SISTEMA DE ATRIBUTOS" — `atributosIniciais()`, `getAtr()`, `calcularMaxHp()` (100 + vida*20 + forca*4), `calcularVidaPet()` (90 + afinidade*15), `calcularDanoJogador()` (multiplicadores por classe/tipo de origem + crítico), `calcularCuraJogador()` (divindade), `broadcastCritico()` (textos flutuantes "CRÍTICO!").
- **Dano aplicado:** `registrarDanoMonstro`/`registrarDanoBoss`/`danoEmBosses` ganharam `tipoOrigem` (`'pet'` → afinidade, `'dot'` → profanidade) — todo dano de jogador/pet/ogro passa pelos multiplicadores; ataques do ogro marcados como `'pet'`.
- **Alocação validada no servidor:** handler `distribuir_ponto` (atributo válido + pontos > 0), recalcula `maxHp`, aplica afinidade na vida do ogro e responde `ponto_distribuido`.
- **Pontos:** 3 no primeiro login + 1 por level (nível 60 máx.); persistidos via `salvarProgresso` (incluindo `atributos`/`pontosDisponiveis`).
- **Cura:** `curandeiro_cura` escala com Divindade do autor.

**Arquivos alterados:** `server.js`, `index.html` (`atributos.js?v=1`/`atributos.css?v=1`), `CHANGELOG.md`
**Arquivos novos:** `atributos.js`, `atributos.css`

---

### v1.13.0 — 13/09/2026

Rework do mapa do pântano + correção rigorosa do render (sem pop-in):

- **`mapa_pantano.js` reescrito do zero:** geração **estática e procedural** com PRNG determinístico (`mulberry32(777)`) em código — sem dependência de `mapa_pantano.json` (arquivo removido). `gerarPantano()` é idempotente (`if (grid) return grid`), `initSwampMap()`/`resetarPantano()` idempotentes e regeneração sob demanda (`if (!grid) gerarPantano()`) na colisão/render. Sortables fixos (63 entidades), colisões por altura (barra baixa: anda mas projétil passa; média: barra tudo; alta: barra tudo).
- **Poça contínua sem grade:** `desenharLamaBase` agora pinta o tile em `TILE+1` com a cor constante de água (`#2e5d3a`), unindo tiles vizinhos numa mancha única; contorno escuro só na divisa água↔terra; reflexo/clara que atravessa a fronteira de tiles vizinhos; terra sem quadriculado.
- **Limpeza do frame em screen-space (`index.html` `loop()`):** antes do `save/scale/translate`, `setTransform(1,0,0,1,0,0)` + `fillRect(0,0,canvas.width,canvas.height)` com a cor sólida do bioma atual (`#24301a` pântano / `#d9b45c` deserto / `#163f18` verde) — elimina pixels transparentes e resquícios do frame anterior nos cantos quando o shake desloca a câmera nas bordas do mundo.
- **Margem de pré-render:** culling de tiles do pântano ampliada de 80px → **200px** (5 tiles) e culling dos sprites y-sort de 100/160 → 200/220px — o mapa é renderizado "antes" de entrar na área visível, sem sensação de carregamento.
- Bounds checking do loop de tiles: `Math.max(0,…)` / `Math.min(COLS-1,…)` mantidos e toda a largura/altura do canvas sempre coberta pelo fundo mesmo na borda leste (x→5000).

**Arquivos alterados:** `mapa_pantano.js`, `index.html` (script `?v=3`/`?v=4` anti-cache)
**Arquivo removido:** `mapa_pantano.json` (órfão, sem referências)

---

### v1.12.3 — 12/09/2026

Bugfix: ataque básico disparando sozinho (ranged/mago):

- **`server.js`:** removido o **autobatk** do servidor — mago, arqueiro, curandeiro e roqueiro **não atacam mais automaticamente** slimes hostis a cada ~28 ticks. Agora cada projétil só sai quando o jogador pressiona o botão de ataque (1 toque = 1 ataque). Removidos também `alcanceAutobatk()` e o campo `autobatkTimer` do jogador.

### v1.12.2 — 12/09/2026

Visual do Golem repensado para pedra rígida:

- **`efeitos/boss_golem.js`:** removidos pernas, braços (de trás e da frente com mão redonda) e ombros. O corpo agora é um **monólito de pedra rígida** — tronco único com bordas irregulares/achateladas, placas facetadas, fissuras e rachaduras, gola de pedra no pescoço, cabeça em bloco angular — assentado numa base de pedra no chão.
- A **pedra flutuante virou uma laje retangular na vertical** (78×200): bloco com topo/base em bisel, facetas, fissuras verticais, núcleo de lava pulsante, sombra e fagulhas em órbita vertical.
- Rastro da pedra agora em retângulos verticais (casando com a laje) em vez de círculos.

### v1.12.1 — 12/09/2026

- **`server.js`:** posição de spawn/respawn do GOLEM DE PEDRA movida para `x: 1426, y: 1042` (fixa, substituindo a escolha aleatória entre os 4 cantos).

### v1.12.0 — 12/09/2026

Sistema de localização 🎯: agora o jogador pode marcar pontos no mundo (coordenadas X/Y) para reportar ao dev exatamente onde quer que algo seja colocado.

- **`index.html`:** botão `📌` (`#btn-local`) adicionado na fileira de utilitários; posiciona pinos ao tocar na tela com o modo ativo (converte toque tela→tela do mundo usando `camX/camY` e `ZOOM_CAMERA`); ao desativar, mostra a área no status como `📍 ÁREA: X min..max | Y min..max`; HUD `#coord-hud` no topo exibe a posição atual do jogador em tempo real (`X: ... Y: ...`); som de beep ao marcar pino.
- **`style.css`:** estilo do `#coord-hud` (topo central, abaixo do FPS) e do botão `📌` (azul, laranja quando modo ativo com brilho).
- **`efeitos.js`:** função `desenharPinosLocalizacao()` — pinos pulsantes amarelos com rótulo `X:... Y:...`, desenhados sobre o cenário no loop de render.
- Limite de 10 pinos por sessão (remove o mais antigo ao exceder); até 2 pinos definem uma área retangular no status.

### v1.11.0 — Drag to Cast nas skills de área
**Data:** 2026-09-12

- **Drag to Cast substitui o smart cast de 2 toques nas skills de área:** segure no botão da skill, arraste o dedo até o local desejado e solte — a skill cai **exatamente onde você soltou** (meteoro, nevasca, chuva de flechas, julgamento, esmagamento do bárbaro e teleporte do roqueiro).
- **Marcador vermelho do tamanho da área da skill:** durante o arrasto aparece um círculo vermelho pulsante com o raio real de dano da skill (`ellipse` + contorno com glow + alvo em cruz + traço tracejado externo), além de um **anel tracejado vermelho mostrando o alcance máximo** da skill a partir do jogador.
- **Respeita a área limite:** a posição de soltura fica **limitada ao alcance máximo da skill** (meteoro/nevasca 320, chuva 300, julgamento 280, esmagamento 220, teleporte 280) e aos limites do mapa — não dá para soltar fora do alcance nem para fora do mundo.
- **Toque com botão no canto não mexe o personagem:** o gesto fica isolado no toque do dedo que segurou a skill (`touchId`), sem conflitar com o joystick; `touchcancel` cancela a mira sem gastar a skill.
- **Desktop continua com o toque duplo antigo** (fallback via `onclick`).

**Arquivos alterados:** `index.html`, `efeitos.js`, `CHANGELOG.md`

---

### v1.10.0 — Escudo em bolha brilhante + Ping real + Lacaio foca o alvo do summoner
**Data:** 2026-09-12

- **Bolha brilhante no escudo do Golem:** em vez dos espinhos, agora uma **bolha translúcida** (render layer `lighter`, brilho com glow) envolve o golem na cor do escudo — **vermelha** ou **azul** — com pulso de tamanho/luminosidade, reflexo de luz no topo, contorno brilhante e mini-bolhas de sabão orbitando, deixando a mecânica de reflexão visível de longe.
- **Medidor de PING real ao lado do FPS:** o jogo envia `{action:'ping'}` a cada 2s e o servidor responde `{type:'pong'}`; o client calcula a latência real (ida+volta) e exibe `FPS: 60 | PING: 25ms` no mesmo contador do topo.
- **Lacaio (ogro) foca o inimigo focado pelo summoner:** ao atacar, o summoner envia o alvo (`alvoTipo`/`alvoId`) para o servidor e o ogro **sempre prioriza o inimigo focado** (slime ou boss). Se o foco sumir/morrer ou o ogro passar de ~560px de distância do dono, ele desfoca e volta ao comportamento automático (perseguir quem mira o summoner / boss próximo / orbitar).

**Arquivos alterados:** `server.js`, `index.html`, `efeitos/boss_golem.js`, `classes/summoner.js`, `CHANGELOG.md`

---

### v1.9.0 — Boss como alvo + Escudo de Espinhos + HP bar por visão + Mapa maior
**Data:** 2026-09-12

- **Lacaio do summoner, ogro e banda do roqueiro agora focam o Golem:** quando nenhum slime está no alcance, o pet/banda persegue e ataca o boss (o ogro precisa estar agressivo ~440px e o lacaio/banda em ~220-300px do boss).
- **Auto-mira inclui o boss:** o `obterAlvoNaMira` (cliente) e o autobatk (servidor) consideram o Golem como alvo válido dentro do alcance de cada classe — a mira automática aponta para ele.
- **HP bar do boss só na área de visão:** a barra dourada no topo aparece apenas quando o jogador está a ~520px ou menos do Golem.
- **Escudo de espinhos periódico:** o Golem ativa alternadamente dois escudos (10s ativos, ~4,5s de pausa):
  - **VERMELHO:** ataques básicos são refletidos 100% de volta ao usuário (projéteis, corte, machadada, dash, golpes de ogro/lacaio/banda) — só skills acertam.
  - **AZUL:** skills são refletidas 100% (esmagamento, tornado, meteoro, nevasca, chuva, julgamento, bateria, perfurante, salto/sísmico) — só básicos acertam.
- **Feedback visual e sonoro:** aura pulsante de espinhos girando em volta do golem na cor do escudo, texto "ESCUDO VERMELHO!/AZUL!" com som, e "REFLETIDO!" + vibração para o autor quando o dano volta.
- **Mapa 20% maior:** campo de 1500×1500 → **1800×1800**, com fundo, rio e 6 novas árvores nas bordas (coordenação via `window.WORLD_WIDTH/HEIGHT`).

**Arquivos alterados:** `server.js`, `index.html`, `style.css`, `efeitos/boss_golem.js`, `mapas.js`, `efeitos.js`, `classes/*.js`, `CHANGELOG.md`

---

### v1.8.0 — Golem melhorado: Enrage, HUD de boss e vibração
**Data:** 2026-09-12

- **Golem 40% menor:** visual do golem e da pedra reduzidos (~40%) para caber melhor na tela.
- **ENRAGE por HP perdido:** conforme o HP do golem cai, o **dano aumenta** (45 → até 95) e ele fica **mais rápido** — levanta, marca e arremessa a pedra com ciclos mais curtos (até ~2.8x de velocidade) e a pedra orbita mais depressa.
- **HP bar especial de boss no topo central da tela:** barra dourada/laranja com nome 👹 GOLEM DE PEDRA e contador de HP, visível sempre que o boss está vivo e somando junto com o HUD atual.
- **Vibração da tela no impacto:** quando a pedra bate no chão, a tela inteira treme forte (`tremorTela`) para todos os jogadores, além de vibração física do celular (quando suportada).

**Arquivos alterados:** `server.js`, `index.html`, `style.css`, `efeitos/boss_golem.js`, `CHANGELOG.md`

---

### v1.7.0 — Primeiro Boss: GOLEM DE PEDRA
**Data:** 2026-09-12

- **Boss inédito:** um **Golem de Pedra** enorme (~10x o tamanho dos personagens) que guarda o mapa. Ele usa uma **pedra flutuante com metade do tamanho dele** como arma.
- **Ciclo de ataque completo:** fases `idle` → `levantar` → `marcar` → `lancar` → `retorno`. O golem levanta a pedra acima da cabeça, deixa uma **marca de perigo pulsante no chão** onde o golpe vai cair (~1s), arremessa a pedra com rastro e a pedra **volta suavemente** para orbitar ao redor do corpo.
- **Dano:** 45 de dano em área (raio ~90) em quem estiver sobre a marca na hora do impacto. O golem mira no jogador vivo mais próximo dentro de ~520px e vira o corpo em direção ao alvo.
- **Visual detalhado:** corpo de pedra com rachaduras, musgo, runa de energia quente pulsando no peito, olhos brilhantes (ficam vermelhos quando vai atacar), braço de pedra que alcança a pedra, poeira ambiente subindo, tremor de tela ao levantar/arremessar, impacto com anel de choque e destroços voando.
- **Cofre: 6000 de HP**, 500 de XP divididos entre os participantes (mín. 60 cada), respawn em ~10s após a morte com anúncio `👹 GOLEM DESTRUÍDO!`.
- **Todos os ataques dos jogadores acertam o boss:** projéteis de todas as classes (mago/summoner/arqueiro/curandeiro/roqueiro), perfurante, corte, machadada (+lifesteal em Fúria), dash, esmagamento, tornado, meteoro, nevasca, chuva de flechas, julgamento, bateria e os golpes do ogro (salto/sísmico/ataque) e do lacaio summoner.

**Arquivos alterados:** `server.js`, `index.html`, `CHANGELOG.md`
**Arquivo novo:** `efeitos/boss_golem.js`

---

### v1.6.0 — Auto-mira para todas as classes de longo alcance + Roqueiro com bateria
**Data:** 2026-09-12

- **Auto-mira com linha guia:** o sistema de mira (linha tracejada + retículo que trava sozinho no inimigo quando o joystick aponta para perto dele) agora vale para **todas** as classes de longo alcance — mago, summoner, arqueiro, curandeiro e roqueiro —, cada uma com sua cor (roxa/verde/teal/dourada/laranja).
- **Limite de busca do ataque à distância por classe** (percentual do alcance do projétil):
  - Mago / Summoner / Curandeiro: **50%** → busca até ~300px.
  - Arqueiro: **70%** → busca até ~470px.
  - Roqueiro: **60%** → busca até ~396px.
  - Aplicado no `obterAlvoNaMira` (cliente) e no autobatk (servidor).
- **Roqueiro (visual):** a arma agora é uma **bateria de rock** — tambor com pele, baqueta que bate sozinha e prato (cymbal) girando acima.
- **Lacaio da banda:** agora empunha uma **guitarra** (antes um baixo roxo).
- **Chamar a Banda:** convoca **1 membro** (antes 3). Skill atualizada em `skills.js`.

**Arquivos alterados:** `server.js`, `index.html`, `efeitos.js`, `classes/roqueiro.js`, `skills.js`

---

### v1.5.0 — Ataques básicos por classe + Autobatk em classes de longo alcance
**Data:** 2026-09-12

- **Arqueiro:** projétil agora é uma **flecha** desenhada (haste + ponta + penas) e voa **~10% mais longe** que o das classes mágicas (48 ticks x 14 de velocidade ≈ 672px vs 600px das magias).
- **Mago:** projétil virou uma **magia brilhosa** — núcleo pulsante com halo roxo, aura ciano e partículas brancas orbitando, além de rastro (trail).
- **Guitarrista (Roqueiro):** o riff agora viaja como **notas musicais** (🎵 com ♪ de rastro), balançando suavemente.
- **Berserker (Bárbaro):** continua corpo a corpo, mas a machadada solta **muito mais sangue** — 30 gotas (antes 14), mais rápidas, maiores e com duração maior.
- **Autobatk (novo):** mago, arqueiro, curandeiro e roqueiro agora atacam **automaticamente** slimes hostis (que estão perseguindo o jogador, `targetId === pid`) dentro de ~320px, no mesmo padrão do ogro do summoner. O jogador não precisa apertar o ataque; se tornou o alvo, ele dispara sozinho a cada ~28 ticks (~1,4s). O projétil e o som aparecem para todos via broadcast.
- Projéteis usam `tipo` (`magia`, `orbe`, `flecha`, `sagrado`, `riff`) para o renderizador dedicado `desenharPlayerProjetil` em `efeitos.js` (com rastro `trailProjeteis`).

**Arquivos alterados:** `server.js`, `efeitos.js`, `index.html`, `classes/*.js` (sem mudança visual de personagens), `efeitos/barbaro_efeitos.js`

---

### v1.4.5 — Efeitos de Tornado e Block visíveis para todos os jogadores
**Data:** 2026-09-12

Os efeitos de duas skills do Guerreiro só apareciam para o próprio jogador (bug multiplayer):
- **Tornado:** o giro/arco estava preso a um timer global (`window.tornadoAnimTimer`) ativado apenas se `id === meuId`. Agora existe `window.tornadoTimers` (timers por jogador), o handler ativa o efeito para **qualquer** jogador que use a skill e a renderização passa o timer correto ao `desenharGuerreiro` — o som continua apenas para o autor.
- **Block ("🛡️ BLOCK!")**: o handler só empurrava o efeito quando `id === meuId`. Agora o texto flutuante aparece **na posição do bloqueador** para todos (som apenas para o autor). Usa `window.todosJogadores[dados.id]` como origem para os outros jogadores.

**Arquivos alterados:** `index.html`, `classes/guerreiro.js`

---

### v1.4.4 — Configurações sem "pause" (fundo translúcido)
**Data:** 2026-09-12

O MMORPG nunca pausa (o loop roda via `requestAnimationFrame` e o servidor continua simulando). A sensação de "pause" vinha do fundo quase opaco (`rgba(8,8,8,0.82)`) do painel de configurações, que escondia o jogo. Agora o fundo é **translúcido** (`rgba(8,8,8,0.35)`), mantendo o mundo e o combate visíveis e rodando atrás da janela.

**Arquivos alterados:** `config.css`

---

### v1.4.3 — Rotação automática horizontal + Sistema de Configurações
**Data:** 2026-09-12

O jogo agora **abre sempre em modo horizontal** (auto) e ganhou um **menu de configurações** (botão ⚙️ na barra de utilitários, com a janela centralizada).

- **Rotação horizontal automática:**
  - `alternarModoOrientacao()` agora trava sempre em `landscape` (antes alternava).
  - Tentativa automática de `screen.orientation.lock('landscape')` + `requestFullscreen()` no **primeiro toque/clique**, e overlay `#rotate-overlay` centralizado ("🔄 GIRE O CELULAR PARA HORIZONTAL") via `@media (orientation: portrait)`.
- **Sistema de configurações (`config.js`/`config.css`):**
  - **🔊 Volume Geral (central):** slider 0–100%. Criado um `GainNode` master (`window.audioGanhoMaster`) no `iniciarAudio()`; todos os 26 pontos de som agora roteiam por `window.audioGanhoMaster`. Valor persistido em `localStorage` (`mmorpg_volume`).
  - **🔁 Trocar de personagem:** fecha janelas, cancela miras e autofarm, e reabre a tela de seleção de classe.
  - **🚪 Sair do jogo:** fecha o WebSocket e recarrega para a tela de login.
  - Janela centralizada (`#settings-screen` em flex center, z-index 320) no mesmo estilo pixel.
- **Trava de movimento:** joystick/autofarm/movimento também bloqueados com as configurações abertas (`window.configAberto`).

**Arquivos alterados/criados:** `index.html`, `style.css`, `config.js` (novo), `config.css` (novo)

---

### v1.4.2 — Botões de skill ~10% menores e ancorados no rodapé
**Data:** 2026-09-12

A coluna de habilidades de combate (`.actions`) foi reduzida e reposicionada, sem sobrepor os botões utilitários 📖/🎒:

- **`.btn-action`:** 60px → **54px** (~10% menor).
- **`.actions`:** `bottom: 60px` → **`bottom: 12px`** (coluna no rodapé da tela).
- **Sem sobreposição:** coluna de skills vai de `right: 25px` a `79px`; `#util-buttons` começa em `right: 95px` — 16px de folga entre os blocos.

**Arquivos alterados:** `style.css`

---

### v1.4.1 — Botões Skills/Inventário menores e reposicionados
**Data:** 2026-09-12

Os botões 📖 (skills) e 🎒 (inventário) saíram da coluna de ações do combate e foram para um container próprio, **50% menores** (60px → 30px) e posicionados no **canto inferior central/direito** da tela.

- **`index.html`:** criado `<div id="util-buttons">` (fora da coluna `.actions`) com os dois botões com classe `.btn-util`.
- **`style.css`:** novo bloco `#util-buttons` (absoluto, `bottom: 14px; right: 95px`, linha, gap 8px) e `.btn-util` (30px, circular, flex centralizado, escala no toque).
- **`inventario.css` / `skills.css`:** cores (`#b7950b`/`#f1c40f` e `#16a085`/`#1abc9c`) mantidas via `.btn-util.btn-inventario` e `.btn-util.btn-skills`, com fonte ajustada ao tamanho menor.
- A coluna `.actions` (skills de combate + ataque) permanece no canto inferior direito.

**Arquivos alterados:** `index.html`, `style.css`, `inventario.css`, `skills.css`

---

### v1.4.0 — Interface de Skills com detalhes e upgrade (teste)
**Data:** 2026-09-12

Criada a **interface de habilidades** (botão 📖 no HUD), aberta junto com o inventário, mostrando o **detalhe completo de cada skill da classe atual** e um **upgrade de TESTE**.

- **Painel estilo pixel** (combinando com inventário/mochila), janela própria com título, tag da classe e lista de cards de skills, uma por habilidade da classe vigente (jogador morto ou em seleção de classe não abre).
- **Detalhes por skill:** ícone, nome, categoria (ATAQUE, AOE, ZONA, CANAL, CURA, BUFF, MOBILIDADE, INVOCAÇÃO, PASSIVA), descrição, dano/cura (com unidade), **MP** (custos planejados — sistema de mana ainda não existe, só exibição), **CD**, **área de efeito**, **alcance**, **duração** e efeitos extras (stun, slow, lifesteal, perfurante, etc.).
- **Upgrade de TESTE (client-side):** botão ⬆️ MELHORAR sobe o nível da skill até **NV 10**; dano/cura escalam **+25%/nível** e duração **+10%/nível** apenas na exibição — sem tocar no combate real (servidor). Botão ↺ reseta a skill e ↺ RESETAR reseta todas.
- **Dados:** `SKILLS_INFO` (tabela completa por classe, valores literais do `server.js`/`index.html`), `window.skillsNiveis` (níveis por "classe|id"), helpers `valorEscalado()`, `renderizarSkills()`, `melhorarSkill()`, `resetarSkill()`, `resetarTodasSkills()`.
- **Trava de movimento:** joystick, autofarm e teclas também bloqueados com a interface de skills aberta.
- **Aviso no rodapé:** "Upgrade é TESTE — não altera o combate ainda."

**Arquivos alterados/criados:** `index.html`, `skills.js` (novo), `skills.css` (novo)

---

### v1.3.1 — Refatoração: inventário/mochila em arquivos próprios
**Data:** 2026-09-12

CSS e JS do inventário (corpo pixelado) e da mochila (abas) saíram do `index.html`/`style.css` e passaram para arquivos dedicados, seguindo o padrão das `classes/` e `efeitos/`:

- **`inventario.js` (novo):** toda a lógica — `window.inventario`, `SLOTS_INFO`, abrir/fechar/toggle, `renderizarInventario()`, `selecionarSlot()`, `window.mochila`, `adicionarItemNaMochila()`, `removerItemDaMochila()`, `setAbaMochila()`, `renderizarMochila()`, `selecionarItemMochila()` e os itens de demonstração. Carregado via `<script src="inventario.js?v=131">`.
- **`inventario.css` (novo):** todos os estilos (corpo pixelado, slots, mochila e abas). Carregado via `<link rel="stylesheet" href="inventario.css?v=131">`.
- **`index.html`:** removidos os dois blocos de JS inline duplicados (equip + mochila) e adicionados os novos `<link>`/`<script src>` com query string anti-cache.
- **`style.css`:** removido todo o bloco de estilos do inventário (`.btn-inventario` → `#btn-inv-fechar`).

**Verificação:** `node --check inventario.js` OK; `inventario.css` e `inventario.js` respondem `200` no servidor; HTML do inventário (slots, mochila, abas) permanece no `index.html`.

**Arquivos alterados/criados:** `index.html`, `style.css`, `inventario.js` (novo), `inventario.css` (novo)

---

### v1.3.0 — Mochila com abas (itens, drops e consumíveis)
**Data:** 2026-09-12

Criada a **mochila** de itens, logo abaixo do inventário de equipamento, abrindo junto com ele (botão 🎒).

- **5 abas organizadas:**
  1. TODOS — exibe tudo
  2. 🍶 CONSUMÍVEIS — itens do tipo `consumivel`
  3. 🧰 ITENS — itens/materiais/equipamento do tipo `item`
  4. 📜 QUEST — itens de missão do tipo `quest`
  5. 🎭 COSMÉTICOS — cosméticos do tipo `cosmetico`
- **Grade 4×N** com slots de 44px (rolagem interna quando passa de ~3 linhas) e células vazias tracejadas para preencher a grade.
- **Badge de quantidade** no canto do slot quando um item tem mais de 1 unidade.
- **Dados:** `window.mochila` (array client-side) + helpers `adicionarItemNaMochila()` (empilha iguais) e `removerItemDaMochila(id, qtd)`.
- **Controle:** `setAbaMochila(aba)`, `renderizarMochila()`, `selecionarItemMochila(item)` (mostra nome/quantidade/tipo/descrição na barra de informações).
- **Itens de demonstração** inseridos para testar as abas (poções, pele de slime, espada, cristal de quest, chapéu de festa) — marcados para remover quando o sistema de drops chegar.
- **Ajuste:** `#inv-window` agora rola verticalmente (`max-height: 94vh`), pois ficou mais alto.

**Arquivos alterados:** `index.html`, `style.css`

---

### v1.2.0 — Inventário com corpo pixelado
**Data:** 2026-09-12

Criado o sistema de inventário de equipamento no formato de um corpo humano pixelado, aberto pelo botão 🎒 no HUD.

- **Slots (9):** 🪖 Capacete, 🛡️ Peitoral, ⚔️ Arma, 🔪 Arma Secundária, 📿 Colar, 💍 Anel, 🧥 Capa, 🥾 Bota, 🧤 Luva.
- **Layout:** silhueta de herói desenhada em `divs` pixeladas (cabeça, pescoço, tronco, braços, mãos, pernas, pés, capa), com os slots posicionados anatomicamente e **sem sobreposição**:
  - Centro: Capacete → Colar → Peitoral → Bota
  - Esquerda: Capa → Anel → Arma Sec
  - Direita: Luva → Arma
- **Visual pixelado:** cantos retos, sombras deslocadas (`box-shadow` chunky), fonte monoespaçada, bordas em dourado/vinho.
- **Ícones:** ficam em **preto e branco acinzentado** (`filter: grayscale`) quando o slot está vazio e coloridos quando equipados (classe `.ocupado`).
- **Dados:** `window.inventario` (client-side) com os 9 slots + helpers `inserirItemNoSlot()` e `removerItemDoSlot()` prontos para o futuro sistema de itens.
- **Interação:** tocar num slot inspeciona (mostra nome/status na barra de informações); fechar pelo botão FECHAR ou tocando fora.
- **Trava de movimento:** joystick, autofarm e teclas ficam bloqueados com o inventário aberto.

**Arquivos alterados:** `index.html`, `style.css`

**Bugs corrigidos durante o desenvolvimento:**
- Botão 🎒 não abria: havia `onclick` **e** `addEventListener("click")` duplicados → o toggle abria e fechava na hora. Removido o listener duplicado.

---

### v1.1.2 — Correção 4: Remoção de arquivos órfãos
**Data:** 2026-09-12

Removidos arquivos de Boss/Dungeon que nunca eram carregados nem referenciados (não apareciam no `index.html`):

- `sistemas/boss_pedra_client.js`
- `classes/sistemas/dg_servidor.js`

(As pastas `sistemas/` e `classes/sistemas/`, que ficaram vazias, também foram removidas.)

**Verificação:** `grep` confirmou zero referências em todo o código.

---

### v1.1.1 — Correção 3: Bateria do Roqueiro vira canal de 5s
**Data:** 2026-09-12

A skill 🥁 **Bateria Solo** do Roqueiro deixou de ser um golpe único e virou um **canal de 5 segundos**:

- **Servidor (`server.js`):**
  - Nova estrutura `bateriaCanal[playerId]`: canal de 250 ticks (5s) com dano em área (30 de dano + stun 25, raio 110) **repetido a cada 500ms** (batida).
  - Broadcast `action_roqueiro_bateria` (x, y) a cada batida → repete efeito visual e sonoro.
  - **Cancelamento** se: jogador se mover (>1px), morrer, ou ao fim do tempo — com broadcast `action_roqueiro_bateria_end`.
  - Limpeza do canal no `respawn` e no `close` (desconexão).
- **Cliente (`index.html`):**
  - `usarBateriaRoqueiro()` mantém `roqueiroBateriaLigada` por 5s e bloqueia reuso enquanto canaliza.
  - Movimento travado durante o canal (joystick e autofarm).
  - Som/efeito de batida se repetem a cada `action_roqueiro_bateria`.
  - Flag limpa via `action_roqueiro_bateria_end` e no `renascer()`.

**Arquivos alterados:** `server.js`, `index.html`

---

### v1.1.0 — Correção 2: Classe Roqueiro integrada
**Data:** 2026-09-12

Classe 🎸 **Roqueiro** integrada por completo (antes existia como arquivos soltos não conectados).

- **Cliente:**
  - Card da classe na tela de seleção (`index.html`).
  - 3 habilidades no HUD: 🥁 Bateria, 🌠 Stage Dive (teletransporte com mira em 2 toques, 160px, CD 8s), 🎸 Chamar a Banda (3 membros, CD 15s).
  - Novos arquivos seguindo o padrão do jogo: `classes/roqueiro.js` (renderização) e `efeitos/roqueiro_efeitos.js` (efeitos visuais), carregados no `index.html`.
  - Ataque básico = Riff de guitarra (projétil laranja).
- **Servidor (`server.js`):**
  - `ataque_roqueiro` (projétil `riff`, 15 de dano).
  - `roqueiro_bateria` (30 AoE raio 110 + stun) — na época golpe único (depois virou canal na v1.1.1).
  - `roqueiro_teleporte` (clamp 20..WORLD-40).
  - `roqueiro_banda` (3 membros perseguem e atacam, 10 de dano), enviados como `bandas` no `world_update`.
  - Renderização da banda movida para `desenharBandaRoqueiro()` no loop (sem duplicar).
- **CSS:** botões do Roqueiro em `style.css` (#d35400 / #e67e22).

**Arquivos alterados/criados:** `index.html`, `server.js`, `style.css`, `classes/roqueiro.js` (novo), `efeitos/roqueiro_efeitos.js` (novo)

---

### v1.0.1 — Correção 1: Anti-cheat server-side
**Data:** 2026-09-11

Eliminado o principal cheat do jogo (bloqueio infinito do Guerreiro aplicado no cliente):

- **Servidor (`server.js`):**
  - Removido `anular_dano` (nunca mais confiar no cliente).
  - Todo dano agora passa por `aplicarDanoJogador()` (server-side).
  - Novo atributo `estamina` (inicia em 100, regenera `+0.75`/tick no loop de 50ms).
  - Broadcast `action_block` quando o jogador bloqueia de verdade.
- **Cliente (`index.html`):**
  - Removido o handler `anular_dano`.
  - HP no `world_update` passou a seguir o servidor (só mostra flash/dano real).
  - `action_block` → som de bloqueio + efeito visual "🛡️ BLOCK!".

**Arquivos alterados:** `server.js`, `index.html`

---

## Organização do código

O projeto mantém a arquitetura original de arquivo único. Lógica e UI ficam concentradas em:

| Arquivo | Papel |
|---|---|
| `server.js` | Todo o backend: WebSocket, loop de 50ms, handlers de ações, dano, monstros, XP, canais de skill. |
| `index.html` | Todo o HTML + JavaScript do cliente: HUD, redes, loop de renderização. |
| `style.css` | Todos os estilos. |
| `inventario.js` | Lógica do inventário (corpo com slots) e da mochila (abas). Carregado no `index.html`. |
| `inventario.css` | Estilos do inventário/mochila. Carregado no `index.html`. |
| `classes/*.js` | Renderização de cada classe (guerreiro, mago, summoner, arqueiro, curandeiro, bárbaro, roqueiro...). Carregados no `index.html`. |
| `efeitos/*.js` | Efeitos visuais por tema/habilidade. Carregados no `index.html`. |
| `mapas.js`, `monstros.js`, `efeitos.js`, `classes/comum.js` | Cenário, monstros, efeitos gerais e helpers. |
| `database.js`, `jogadores.json` | Persistência do progresso (o `rpg_save.db` é órfão e foi mantido por opção do usuário). |

## Como subir para o ar (testes)

- O servidor roda na porta **8080**.
- Reinício seguro: matar o processo antigo com `kill <pid>` (NUNCA `pkill -f "node server.js"` — esse pattern mata o próprio shell), depois `nohup node server.js > /tmp/opencode/server.log 2>&1 & disown` dentro de `/sdcard/Download/MMORPG`.
- Conferir com `curl -s -o /dev/null -w "HTTP:%{http_code}\n" http://localhost:8080/` (esperar `HTTP:200`).
