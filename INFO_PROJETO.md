# 📱 INFO DO PROJETO — MMORPG Mobile

> Documento oficial de referência do projeto. Atualizado em 23/09/2026.

---

## 🚨 REGRA MANDATÓRIA PARA TODAS AS IAs (ASSISTENTES DE DESENVOLVIMENTO)

> **ATENÇÃO TODA IA QUE FOR LER ESTE PROJETO — REGRA PERMANENTE E OBRIGATÓRIA:**
>
> 1. **Registro Obrigatório em Tabela:**
>    - Sempre que finalizar qualquer atualização ou modificação no projeto, você **DEVE** registrar o que realizou aqui neste arquivo (`INFO_PROJETO.md`) e no `CHANGELOG.md`.
>    - O registro deve ser **em formato de tabela**, contendo:
>      - **Versão do Game** (ex: `v1.32.0`, `v1.32.1`, `v1.33.0`...)
>      - **Data e Hora** da finalização
>      - **O que foi feito** (descrição clara e detalhada de cada implementação/correção)
>      - **Arquivos alterados** (lista exata de arquivos modificados ou criados)
>
> 2. **Incremento da Versão do Game:**
>    - Toda alteração concluída **DEVE** incrementar a versão do game (semver: correções sobem patch `v1.32.0` → `v1.32.1`, novas features sobem minor `v1.32.0` → `v1.33.0`).
>
> 3. **Exibição Visual Obrigatória no Jogo:**
>    - A versão atualizada do game **DEVE SEMPRE** estar visível visualmente:
>      - Na **tela inicial** (login) no canto inferior (`#login-screen .game-version-display`);
>      - No **canto inferior da tela** em jogo (`#hud-version.game-version-display`);
>      - No código (`window.GAME_VERSION` em `index.html` e nos metadados).
>
> 4. **Desenvolvimento Dual Obrigatório (PC & Mobile):**
>    - O game está sendo desenvolvido para **PC e Mobile**, então a otimização tem que ser feita para **AMBOS**, e tudo o que for feito no projeto é pensando em ambos os lados (controles via teclado/mouse no PC e touch/joystick no mobile, compatibilidade de interface responsiva, telas e menus sem cortes nem sobreposição, e alto desempenho em todas as resoluções).
>
> 5. **Tabela de Histórico de Atualizações:**

### 📊 Histórico de Atualizações

| Versão | Data / Hora | O que foi feito | Arquivos Alterados |
|---|---|---|---|
| **v1.39.5** | 23/09/2026 (hora local) | **FIX ANCORAGEM SIDEBAR MOBILE ABAIXO DO MINIMAPA + ÍCONE OFICIAL SKILL 1 DO PIKEMAN:** (1) Corrigido bug de posicionamento da Sidebar mobile no canto superior esquerdo (causado pelo auto-scanner de `data-ui` do `dragdrop.js`): removido `data-ui` e adicionado `data-ui-ignored="true"` + regras forçadas `top: 122px !important; right: 10px !important; left: auto !important;`; (2) Redução compacta dos itens do menu dropdown (altura 21px, fonte 10.5px, largura 116px) permitindo que todas as 8 opções caibam perfeitamente na vertical abaixo do minimapa sem rolagem; (3) Substituição do emoji `⭕` pela arte oficial `imagem/HUD/skills/Slotbar/Pike/skill_01.png` na Skill 1 do Pikeman (Giro da Foice) no slotbar (`#btn-pikeman-giro`) e no modal K (`skills.js`), com estilização circular, borda vermelha e fundo escuro condizente; versão **v1.39.5** nos 3 pontos visuais | `index.html`, `mobile-hud.css`, `skills.js`, `skills.css`, `style.css`, `CHANGELOG.md`, `INFO_PROJETO.md`, `REGRAS_IA.md` |
| **v1.39** | 23/09/2026 (hora local) | **INTERFACE FIXA MOBILE COM SIDEBAR RETRÁTIL E CLUSTER DE AÇÃO 2×3:** Menu Sidebar retrátil (`#mobile-sidebar-container`) abaixo do minimapa com opções Configuração, Inventário, Skills, Social, Status, PvP, Mapa e Futuro Update (com toast); Cluster de Ação fixo no canto inferior direito em 2 colunas × 3 linhas: L1 [6] Autofarm / [5] Dash, L2 [3] Skill 3 / [4] Skill 4, L3 [1] Skill 1 / [2] Skill 2; Poções [HP] e [MP] fixadas imediatamente à esquerda da Skill 1; Barra de XP fixada no canto inferior esquerdo; minimapa e status ancorados no topo; ocultação de badges de teclado no mobile; arquitetura separada em `mobile-hud.css` e `mobile-hud.js`; compatibilidade dual PC & Mobile; versão **v1.39** nos 3 pontos visuais | `mobile-hud.css`, `mobile-hud.js`, `index.html`, `dragdrop.js`, `CHANGELOG.md`, `INFO_PROJETO.md`, `REGRAS_IA.md` |
| **v1.38** | 23/09/2026 (hora local) | **REDESENHO DA JANELA DE HABILIDADES (MODAL K) ESTILO MMORPG CLÁSSICO/MODERNO:** Layout split-view dividido em 2 colunas principais: Coluna esquerda com grade de skills categorizadas (`◇ ATIVAS`, `◇ PASSIVAS`, `◇ SUPORTE`), molduras metálicas douradas (`.skill-slot-moldura`), seleção com brilho dourado (`.selected`), badge de nível (`Nv X`) e nome legível; Coluna direita **"DETALHES DA HABILIDADE"** interativa ao clicar em qualquer skill exibindo ícone grande, nome, badge de categoria (Ativa/Passiva/Suporte), nível atual (1 a 10), descrição narrativa, caixa de atributos com escalonamento por atributo e fórmula do server, caixa de bônus por nível, controles de upgrade (`⬆ MELHORAR`) e reset individual (`↺`), e caixa de prévia do próximo nível (`Próximo nível:`) com comparação dinâmica; responsividade dual PC & Mobile (landscape) preservando Drag & Drop (`dragdrop.js`); versão **v1.38** nos 3 pontos visuais | `index.html`, `skills.css`, `skills.js`, `CHANGELOG.md`, `INFO_PROJETO.md`, `REGRAS_IA.md` |
| **v1.37** | 23/09/2026 (hora local) | **FOTOS DE SNIPER E CURANDEIRO ATIVADAS no círculo do retrato do HUD:** foto do Sniper (`sniper.png`, 1254×1254) adicionada e mapeada (`sniper`→`sniper.png`) — o retrato do Sniper agora aparece no círculo (antes vazio); Curandeira (`curandeiro.png`) já mapeada e ativa; mesmo desenho da v1.36 ("PNG por último", clip `ctx.arc` + cover-crop, sem masking); cache-buster das fotos → `?v=perfil2`; 5 classes futuras fora do mapeamento; versão **v1.37** na login, HUD e `GAME_VERSION` | `index.html`, `imagem/HUD/Perfil/sniper.png`, `CHANGELOG.md`, `INFO_PROJETO.md`, `REGRAS_IA.md` |
| **v1.36** | 23/09/2026 (hora local) | **FOTO DE PERFIL das classes no círculo do retrato do HUD (`HudHP.png` NÃO modificada):** as fotos `imagem/HUD/Perfil/*.png` (1254×1254) agora preenchem o círculo do retrato (centro 345,350 / raio 200 no espaço 2172×724, medidos por scan de pixel), recortadas em círculo via clip `ctx.arc` + cover-crop; enfoque **"PNG por último"** — a foto é desenhada ANTES do `drawImage(HudHP.png)`, que pintada por último em source-over puro cobre sobras sobre moldura/gemas/ornamentos (SEM masking, SEM `destination-out`; antialias faz blend natural); lazy load com cache + `?v=perfil1`; mapeamento `window.minhaClasse` → Guerreiro/Mago/Summoner/Arqueira/Barbaro/Roqueiro/Ladino/DroneMaster/Arqueir_astral/PikeMan/curandeiro (arqueiro_arcano+arqueiro_astral); **Sniper sem foto → círculo vazio (sem erro**; adicionar `Sniper.png` para ativar); validação visual GDI+ (Guerreiro/Arqueira/vazio); versão **v1.36** na login, HUD e `GAME_VERSION` | `index.html`, `imagem/HUD/Perfil/*.png` (uso), `CHANGELOG.md`, `INFO_PROJETO.md`, `REGRAS_IA.md` |
| **v1.34.1** | 22/09/2026 (hora local) | Atalhos de teclado para as poções do HUD: **Q = Poção de Vida (HP)** e **E = Poção de Mana (MP)** no PC (mantém o clique/toque no mobile); tecla **Q removida da Skill 4** (Grito/Estrela/Titã/Camuflagem do Sniper) que agora é acionada **apenas pelo 4** (Numpad4 também); badges de tecla dos 2 slots de poção (Q/E no canto superior) e troca dos badges/títulos das Skills 4 de "Q" → "4" + **Inventário (tecla I) +30% na horizontal** (width 295 → 384px com max-width:92vw) e janela de comparação acompanhando (offset 168 → 208px) + **Correção do Social (tecla O)**: o modal abria completamente fora da tela (canto superior esquerdo) porque o drag-drop salvava `left/top` + `transform:none` e anulava o `translate(-50%,-50%)` central — agora `abrirSocialModal` SEMPRE re-centraliza ao abrir e remove a posição salva; novo `window.soltarFoco()` devolve o foco ao entrar no jogo (login via Enter deixava o foco preso no `#input-userid` escondido e TODAS as teclas de atalho ficavam inertes) e ao fechar os modais; versão do jogo atualizada para **v1.34.1** | `index.html`, `style.css`, `inventario.css`, `INFO_PROJETO.md`, `CHANGELOG.md`, `REGRAS_IA.md` |
| **v1.34.0** | 21/09/2026 23:31 | Big batch: Poções HP/MP ×3 níveis droppáveis + 2 slots no HUD; DASH usa STAMINA (barra laranja) em vez de mana (25 normal/40 Dronemaster); HUD redesenhado (retrato em tempo real, barras fortes, buffs, XP central amarelo+azul-claro); Pedras de Upgrade com raridade + brilho/som único; Ouro cai de ~90% dos monstros e bosses, com autocoleta (ouro/pocoes/pedras/lendarios); Inventário refeito (sem boneco, grade 3×3, comparação ao lado, botões ícone + X topo, +10% largura); Skills em janela maior lado a lado com fonte legível; Anel de CD nos slots de skill drenando horário + brilho dourado quando pronta (todas as classes); Runas/Quest = "futuro update" | `server.js`, `equipamentos.js`, `index.html`, `style.css`, `dragdrop.css`, `inventario.js`, `inventario.css`, `skills.css`, `INFO_PROJETO.md`, `CHANGELOG.md`, `REGRAS_IA.md`, `PROGRESSO.md` |
| **v1.33.4** | 21/09/2026 23:05 | Removido o portal de retorno ("SAIR DA SOLARI") de dentro da Arena de Solari — durante a partida o portal não é mais desenhado nem teleporta para a cidade no meio do combate (saída segue pelo painel Sair / Renascer / fim do round); portal da Arena normal e portal roxo da cidade permanecem. + Otimização de performance mobile no render de monstros (trava de tela da Bateria entre hordas): aura sem shadowBlur, skip automático com >55 monstros, ícones de stun a cada 350ms, anéis com sombra reduzida | `mapa_arena.js`, `index.html`, `monstros.js`, `classes/comum.js`, `efeitos/roqueiro_efeitos.js`, `INFO_PROJETO.md`, `CHANGELOG.md`, `REGRAS_IA.md` |
| **v1.33.3** | 21/09/2026 22:20 | Correções de bugs críticos: (1) Ataque básico/projéteis invisíveis na Arena de Solari — colisão da cidade destruía todo projétil com `x ≥ 59800` no 1º tick; corrigido com limite `x < FIM_CIDADE` em projéteis de jogador e de monstro + flag `solari: true` nos disparos da sessão; (2) Tela verde ao usar a Bateria do Roqueiro — broadcasts escopados ao mapa do jogador, spawn de notas 0.6 → 0.22/frame (máx. 40), anéis limitados a 24, tremor 5 → 3 e trava anti-stuck por timestamp (expira em 5s); (3) STATUS travado (~2 pontos por atributo) — botão "+" preso em "..." após o 1º clique; agora reativa sempre e permite distribuir todos os pontos; (4) Pontos de habilidade zerando no login — agora carrega o valor salvo; (5) `admins.json` corrompido (chave duplicada/JSON inválido) impedia admins | `server.js`, `index.html`, `atributos.js`, `classes/roqueiro.js`, `efeitos/roqueiro_efeitos.js`, `admins.json`, `INFO_PROJETO.md`, `CHANGELOG.md`, `PROGRESSO.md` |
| **v1.33.2** | 21/09/2026 17:25 | Adição e integração completa dos efeitos sonoros da classe Guitarrista/Roqueiro (ataque básico, solo de bateria com interrupção instantânea ao cancelar, stage dive/dash e banda) e da Arena de Solare (BGM ambiente em loop integrado aos controles de volume, início do Round 1, conclusão do round, fanfarra de vitória no Round 10, rolagem de dados e ganho de item no leilão) para PC e Mobile | `sonoro.js`, `solari.js`, `index.html`, `REGRAS_IA.md`, `INFO_PROJETO.md`, `CHANGELOG.md` |
| **v1.33.1** | 21/09/2026 16:45 | Correção do fluxo de premiação da Arena de Solari: o sorteio/leilão de 5 itens foi reposicionado para ocorrer estritamente APÓS a finalização de cada round. O Round 1 agora inicia direto em combate após a contagem de entrada sem premiar de antemão. Ao limpar o round (ou estourar o tempo), os 5 itens são sorteados via dados; finalizado o sorteio, avança para a transição de 10s rumo ao próximo round (ou conclui a Arena com vitória no Round 10) | `server.js`, `index.html`, `REGRAS_IA.md`, `INFO_PROJETO.md`, `CHANGELOG.md` |
| **v1.33.0** | 21/09/2026 16:30 | Balanceamento completo de classes (Berserker Fúria 15s CD e Giro 4s/15s CD; Curandeira Aura 5s CD no recast e Julgamento +20% área; Roqueiro Bateria -30% dano cancelável por andar/clique e mantida no Teleporte, Grito de Guerra com atualização em tempo real na tecla C, Banda +50% mov/+80% atk spd/+20% atk; DroneMaster Modo Assalto 8s e +50% atk spd; Arqueiro Astral full dano mágico/INT e painel K completo; Sniper alcance 384px, Disparo Supremo +20% dano e Posição resetando CD com +100% crítico) + 3 Sliders de volume em tempo real (Geral, BGM e SFX) no menu ESC salvando no localStorage + Interface Responsiva com Drag-and-Drop universal em todas as janelas sem corte de tela + Desacoplamento da mira no PC (arma e skills seguem o mouse, WASD apenas move o corpo) | `server.js`, `index.html`, `skills.js`, `atributos.js`, `config.js`, `config.css`, `sonoro.js`, `dragdrop.js`, `REGRAS_IA.md`, `INFO_PROJETO.md`, `CHANGELOG.md` |
| **v1.32.2** | 21/09/2026 15:50 | Desacoplamento da mira do WASD no PC: o item/arma na mão segue continuamente o ponteiro do mouse, as skills ativas disparam na direção do cursor do mouse, e o WASD controla exclusivamente a movimentação do corpo | `index.html`, `INFO_PROJETO.md`, `CHANGELOG.md`, `REGRAS_IA.md` |
| **v1.32.1** | 21/09/2026 15:35 | Implementação completa dos efeitos sonoros reais da Arqueira (ataque básico, chuva de flechas, disparo perfurante, rajada carregar e rajada soltar) integrados via `sonoro.js`, `audio-manager.js`, `server.js` e `index.html` | `sonoro.js`, `audio-manager.js`, `server.js`, `index.html`, `INFO_PROJETO.md`, `CHANGELOG.md`, `REGRAS_IA.md` |
| **v1.32.0** | 21/09/2026 15:30 | Exibição visual da versão no canto inferior da tela (tela inicial de login e HUD in-game) + Criação e fixação da regra mandatória para IAs com registro obrigatório em tabela nos arquivos `.MD` | `index.html`, `style.css`, `INFO_PROJETO.md`, `CHANGELOG.md`, `REGRAS_IA.md` |

---

## 1. Visão geral

| Item | Info |
|---|---|
| **Nome** | MMORPG Mobile (RPG online de navegador focado em celular) |
| **Tipo** | MMORPG 2D/2.5D multiplayer em tempo real (browser game) |
| **Plataforma alvo** | Celular (Android/iOS via navegador) e PC (WASD + mouse) |
| **Modelo de rede** | Cliente-servidor com **autoridade do servidor** (dano, skills, atributos, teleportes validados no servidor) |
| **Versão atual** | v1.38 |
| **Persistência** | `jogadores.json` (JSON em disco) — `rpg_save.db` é arquivo legado (sem uso) |

---

## 2. Linguagens e tecnologias

| Camada | Tecnologia |
|---|---|
| **Servidor** | **Node.js** + WebSocket (`ws` ^8.21.3) + HTTP nativo (`http.createServer`) |
| **Cliente** | **JavaScript puro** (vanilla, sem framework), HTML5, CSS3 |
| **Renderização** | **Canvas 2D** (API nativa do navegador) — engine própria 2.5D/2.3D |
| **Protocolo** | JSON sobre WebSocket (`{action: ...}` / `{type: ...}`) |
| **Banco de dados** | JSON em arquivo (`jogadores.json` via `database.js`) |
| **Build/package** | Sem bundler — arquivos carregados direto no `<script>` com cache-buster (`?v=N`) |

---

## 3. Engine gráfica (Canvas 2D próprio)

- **Renderização 2.5D / 2.3D:** mundo 2D com **extrusão de tiles** (relevo em blocos com topo + paredes sombreadas sul/leste), personagens e monstros como sprites 2D com **Y-sort** (ordenação por profundidade).
- **Câmera:** top-down com zoom (`ZOOM_CAMERA ≈ 0.92`), pan/rolagem com clamp nas bordas do mundo, shake de tela em impactos (`tremorTela`).
- **Cenário:** culling por região/câmera, gradientes, partículas, glows, blend aditivo (`globalCompositeOperation = 'lighter'`), fundos sólidos por bioma (limpeza de frame em screen-space).
- **Mundo:** `WORLD_WIDTH = 65040`, `WORLD_HEIGHT = 36000`.
- **Mapas procedurais:** geração determinística com PRNG `mulberry32` (sem dependência de assets JSON, exceto `cidade.png`/`arena.png` em `sprites/`).
- **Efeitos visuais:** `efeitos.js` (projéteis, marcas, explosões, smart cast) + `efeitos/*.js` por classe + `debuffs.js` (ícones de status).

---

## 4. Mundo / Fases (6 biomas)

| # | Fase | Arquivo | Área (x) | Altura (y) |
|---|---|---|---|---|
| 1 | 🌿 Campo Verde | `mapas.js` | 0 → 18.000 | 18.000 |
| 2 | 🏜️ Deserto com Oásis | `mapa_deserto.js` | 18.000 → 50.000 | 36.000 |
| 3 | 🪷 Pântano Lodoso (água venenosa ☠️) | `mapa_pantano.js` | 50.000 → 58.000 | 9.000 |
| 4 | 🕳️ Caverna Sombria / DG | `mapa_caverna.js` | 58.000 → 59.800 | 1.800 |
| 5 | 🏰 Cidade de Davahl | `mapa_cidade.js` | 59.800 → 61.174 | 1.145 |
| 6 | ⚔️ Arena de Davahl | `mapa_arena.js` | 63.800 → 65.040 | 1.240 |

- **Portais:** transição por portal de viagem (cidade) e portais de bioma; selamento por bioma (colisões por mapa ativo).
- **Spawns:** removidos os automáticos de todo o mapa — monstros nascem **só via bandeira de admin** (`spawns.js`).

---

## 5. Classes (8 classes, 39 skills no total)

| Classe | Arquivo | Skills (id) |
|---|---|---|
| ⚔️ **Guerreiro** | `classes/guerreiro.js` | Corte, Dash Atingente, Tornado de Espada, Grito de Provocação, Escudo (passiva), Último Fôlego (passiva) — **6** |
| 🔮 **Mago** | `classes/mago.js` | Bola de Magia, Meteoro, Nevasca (zona de gelo) — **3** |
| 🦍 **Summoner** | `classes/summoner.js` | Orbe das Sombras, Ogro Guardião (pet), Esmagamento Sísmico, Salto do Ogro, Golem Colossal — **5** |
| 🏹 **Arqueiro** | `classes/arqueiro.js` | Flecha Precisa, Chuva de Flechas (zona), Disparo Perfurante, Rajada de Flechas — **4** |
| ✝️ **Curandeiro** | `classes/curandeiro.js` | Luz Sagrada, Cura Divina (área), Julgamento Sagrado, Aura Sagrada (buff), Ressurreição Automática — **5** |
| 🪓 **Bárbaro** | `classes/barbaro.js` | Machadada, Fúria Berserker (buff), Giro Descontrolado, Fúria Crescente (passiva), Salto Esmagador — **5** |
| 🎸 **Roqueiro** | `classes/roqueiro.js` | Riff de Guitarra, Bateria Solo (canal), Stage Dive (teleporte), Chamar a Banda (1 membro), Grito de Guerra (buff) — **5** |
| 🗡️ **Ladino** | `classes/ladino.js` | Adaga, Dança das Adagas, Nevoeiro Venenoso (gás), Camuflagem Sombria (buff/invis), Estrela da Morte (mobilidade+stun), Lâminas Sangrentas (passiva) — **6** |

- `classes/comum.js` = funções/recursos compartilhados entre classes.
- **Atributos base** (8): Força, Inteligência, Agilidade, Destreza, Vida, Profanidade, Divindade, Afinidade.
- **Nível máx:** 60. **Pontos:** 3 no 1º login + 1 por nível (atributos e habilidades).

---

## 6. Sistema de skills e efeitos

- **UI das skills:** `skills.js` + `skills.css` — cards por classe, categorias (ataque/aoe/zona/canal/cura/buff/mobilidade/invocação/passiva), upgrade até **nível 10** com pontos de habilidade.
- **Escalonamento:** dano/cura +25% por nível; custo de mana +6% por nível; durações +10%/nível (espelhados cliente ↔ servidor).
- **Mana:** `maxMp = 50 + (int-1)*10`, regen automática ~3%/tick, custos validados no servidor (`mp_insuficiente`).
- **Efeitos visuais (`efeitos.js`):** projéteis por tipo (magia, orbe, flecha, sagrado, riff), marcas de área, explosões, smart cast/drag cast, trail de projéteis.
- **Efeitos de classe (`efeitos/`):** `guerreiro_efeitos.js`, `mago_efeitos.js`, `summoner_efeitos.js`, `arqueiro_efeitos.js`, `curandeiro_efeitos.js`, `barbaro_efeitos.js`, `roqueiro_efeitos.js`, `ladino_efeitos.js`, `boss_golem.js`.
- **Buffs/Debuffs (`debuffs.js`):** tabela com **21 efeitos** — 13 debuffs: stun ⚡, lentidão 🐌, paralisia ⛓️, sono 💤, corta-cura 🩹, defesa quebrada 🥀, enfraquecido 💪, veneno ☠️, sangramento 🩸, **cegueira 👁️‍🗨️**, queimadura 🔥, gelo 🧊, queimadura congelante 💠; 8 buffs: fúria 🩸, escudo 🛡️, ardente 🔥, fervor 💢, velocidade 💨, grito de guerra 📣, sede de sangue 🩸, **camuflagem sombria 🌑**.

---

## 7. Cooperação / Social (multiplayer)

| Sistema | Descrição |
|---|---|
| 🤝 **Party (Grupo)** | Até **4 jogadores**; bônus **+20% de XP por membro**; cura em área e aura beneficiam aliados do grupo; ressureição automática entre membros |
| 🔁 **Trade (Troca)** | Troca de itens entre 2 jogadores com confirmação dupla (`trade-modal`) |
| 🏴 **PvP** | Toggle `pvpAtivo` — ataque entre jogadores habilitado voluntariamente |
| 💖 **Cura em área** | Curandeiro cura aliados próximos (Smart Cast / Drag Cast, raio 120) |
| ✝️ **Ressurreição automática** | Passiva do curandeiro (raio 190, cooldown 10 min) |
| 🛡️ **Aura Sagrada** | Zona que protege/fortalece/cura aliados enquanto houver mana |
| 📣 **Grito de Guerra** | Buff em área para aliados (+crítico, +dano crítico, +HP máx) |
| 📡 **Sincronização** | `world_update` periódico com todos jogadores/monstros/drops no mesmo mapa |

---

## 8. Estrutura de pastas

```
E:\Jogo CELULAR\
├── server.js              → Servidor Node.js (WebSocket + HTTP + loop do mundo)
├── index.html             → Cliente principal (todo o jogo: render, input, HUD, networking)
├── database.js            → Persistência em jogadores.json
├── jogadores.json         → Progresso salvo dos jogadores
├── package.json           → Dependência: ws (WebSocket)
│
├── classes/               → Desenho + ataques locais das 8 classes (+ comum.js)
├── efeitos/               → Módulos de efeitos visuais por classe + boss golem
├── efeitos.js             → Motor de efeitos visuais (projéteis, marcas, smart cast)
├── debuffs.js             → Tabela de buffs/debuffs (estado, puro, servidor+cliente)
├── skills.js / skills.css → UI das skills
├── inventario.js / .css   → Inventário, mochila, slots do corpo, comparação
├── atributos.js / .css    → Janela de status + detalhes
├── equipamentos.js        → Banco de equipamentos (armas/armaduras, raridades)
├── monstros.js            → Render dos monstros
├── spawns.js              → Sistema de bandeiras de spawn (backend admin)
├── spawn-admin.js / .css  → Painel admin de spawns
├── map-vfx-admin.js       → Editor de VFX do mapa (admin)
├── colisao-editor.js / .css → Editor de colisões da cidade (admin)
├── editor_personagens.*   → Editor de personagens (html/css/js)
├── audio-manager.js       → Gestor de áudio (sons/ambiente por bioma)
├── dragdrop.js / .css     → Motor drag & drop (janelas, itens, editor de UI)
├── mapas.js               → Mapa Fase 1 (verde)
├── mapa_deserto.js        → Fase 2
├── mapa_pantano.js        → Fase 3
├── mapa_caverna.js        → Fase 4
├── mapa_cidade.js         → Fase 5 (+ colisões/camadas)
├── mapa_arena.js          → Fase 6
├── camadas_cidade.json    → Camadas decorativas da cidade
├── colisoes_cidade.json   → Colisões customizadas da cidade
├── spawn_flags.json       → Bandeiras de spawn persistidas
├── map_vfx.json           → VFX de mapa persistidos
├── admins.json            → Lista de contas admin
├── monster/               → Dados de monstros (ex.: Aranha_arcana.json)
├── sprites/               → Imagens: cidade.png, arena.png
├── backups/               → Backups (tar.gz) das sessões
├── CHANGELOG.md           → Histórico de versões
├── PROGRESSO.md           → Checkpoints de sessão
└── *_tmp*.js / _verify_server.js → Scripts de teste (E2E WebSocket, asserções)
```

---

## 9. Sistemas de jogo implementados

- **Inventário completo:** mochila + 9 slots do corpo (arma, arma secundária, capacete, peitoral, luva, bota, capa, colar, anel); drag & drop equipar/desequipar/reordenar; botão ORGANIZAR; destruir item (com confirmação).
- **Raridades:** comum → raro → épico → lendário (drops Épico/Lendário com efeito especial + alerta).
- **Comparação de status:** painel EQUIPADO vs INVENTÁRIO (verde = melhor, vermelho = pior).
- **Equipamentos por classe:** armas restritas à classe; arma secundária para guerreiro, mago, summoner, arqueiro, curandeiro e **ladino**.
- **Atributos (8):** distribuição de pontos validada no servidor; reset devolve pontos; fórmulas espelham o servidor no tooltip.
- **Upgrade de skills funcional** (dano/CD/mana reais, validados no servidor).
- **Buffs/Debuffs (21)** com ícones sobre o personagem, timers e trava de movimento.
- **Mini-mapa** com zoom (4x/2x/1x/Mundo), radar, monstros por cor, drops, boss.
- **Mapa Grande (M)** com panorâmica das zonas + teleporte.
- **Controles PC:** WASD, atalhos (I/K/C/L/M/ESC/espaço/R/1-2-3), click para atacar/smart cast.
- **Controles mobile:** joystick virtual, drag cast nas skills de área, touch nos portais.
- **Smart Cast / Drag Cast:** círculo de alcance + área real da skill; mira limitada ao alcance.
- **Chefes:** Golem de Pedra (enrage, escudos vermelho/azul, pedra arremessável, HUD de boss, **honra `stunTimer`** — atordoável pela Estrela do Ladino).
- **Ladino (8ª classe):** adaga em cone, dança teleporte 5 hits (raio 220 — só os mais próximos) com retorno + imunidade, névoa venenosa com cegueira, camuflagem com invisibilidade +100% no 1º dano (**inimigos não atacam o invisível**), estrela com coreografia 50% mais lenta e mobilidade travada + stun de chefe 2s, sangramento passivo (DoT 20%/s por 5s).
- **Editor de interface:** mover/redimensionar todos os HUDs/janelas, salvar por jogador no servidor.
- **Admin:** spawns por bandeira (criar/editar/excluir), editor de colisões, editor de VFX, editor de personagens, pinos de localização 📌.
- **Telemetria:** `client_error`/`client_estado`/ping real (FPS + PING no HUD).

---

## 10. Portas e subida

- **Produção:** 8080 · **Teste controlado:** 8099
- Subir: `node server.js` (Windows) · Linux: `setsid nohup node server.js > server.log 2>&1 &`
- Reinício: matar processo `node` e subir de novo.

---

## 11. Protocolo de rede (resumo)

- Cliente → Servidor: `{action: 'login' | 'teleporte_mapa' | 'respawn' | 'distribuir_ponto' | 'upgrade_skill' | 'atacar' | 'movimento(x,y,angulo)' | 'ataque_ladino' | 'ladino_danca' | 'ladino_bomba' | 'ladino_camuflagem' | 'ladino_estrela' | ...}`
- Servidor → Cliente: `{type: 'init' | 'world_update' | 'teleporte_confirmado' | 'respawn_confirmado' | 'inventario_sync' | 'skills' | 'texto_dano' | 'efeitos_sync' | ...}`
- Mensagens com coordenadas de outro mapa são filtradas no cliente (exceções: `init`, `teleporte_confirmado`, `respawn_confirmado`).

---

## 12. Monstros (18 registrados em spawns.js)

Slime Melee 🟢, Slime Arqueiro 🔵, Zumbi 🧟, Besouro Negro 🪲, Morcego 🦇, **GOLEM DE PEDRA 🗿 (boss)**, Caveira Arqueira 🏹, Caveira Melee 💀, Aranha Negra 🕷, ARANHA DARK 🕷, Escorpião 🦂, Goblin 👺, Mago Arcano 🧙, Assassino 🥷, Void Master ◉, Ogro 👹, Gárgula 🦇, Mamute 🐘.

> 17 tipos + boss Golem, com comportamentos (melee/ranged/web/poison/meteor/assassin/void/tank etc.).
