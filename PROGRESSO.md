# PROGRESSO — Sessão de 16/09/2026 (Editor de Interface + Drag & Drop)

> Checkpoint rápido desta sessão (detalle no CHANGELOG v1.24.0 e v1.25.0).

## Editor de Interface completa ✅ (v1.25.0)

1. [x] **Opção `🔧 EDITAR INTERFACE`** nas Configurações → ativa el modo edição.
2. [x] **TODA a UI se arrastra:** HUDs (`status, fps, coord, hud-level, hud-party,
       hud-dps, hud-boss, joystick, minimap, actions, util-buttons`) + janelas
       (`inv-window, skills-window, atributos-dupla, settings-window,
       big-map-window, teleport-window`) — todas com `data-ui`.
3. [x] **Barra do editor (CSS completo):** `#ui-editor-bar` com
       `display:none` por padrão, `display:flex` ao ativar o modo; botões
       💾 SALVAR (verde), ↺ RESTAURAR (azul), ✕ SAIR (vermelho) +
       indicador `● modificado` pulsante.

4. [x] **Guardado por jogador no servidor:** `salvar_ui_layout`/`restaurar_ui_layout`
       (persistido en `jogadores.json` → `uiLayout`), reenvío `ui_layout` en login,
       cache `localStorage` (`mmorpg_ui_layout_<jogador>`).
5. [x] **UIs futuras já no sistema:** qualquer elemento com `data-ui="nome"` se
       auto-registra (escáner + MutationObserver); UIs por JS: `InterfaceEditor.registrar(el, nome)`.

## Para testear manualmente

- Abrir `http://localhost:8080` → entrar → ⚙️ Opções (ESC) → `🔧 EDITAR INTERFACE`.
- Arrastrar os HUDs/janelas → barra inferior → `💾 SALVAR` (guarda no servidor).
- Recargar página + entrar → o layout cargado automáticamente.
- `↺ RESTAURAR` volta ao original. `InterfaceEditor` na consola para debug.

---

> Checkpoint rápido desta sessão (detalle no CHANGELOG v1.24.0).

## Sistema de Interface completa com Drag & Drop ✅ (v1.24.0)

1. [x] **`dragdrop.js` (novo)** — motor DnD unificado (mouse + toque, pointer events):
       mochila → slot do corpo (equipa), slot → mochila (desequipa),
       mochila → mochila (reordena, persistente), fantasma `#drag-ghost`,
       zonas destacadas (verde/dourado/vermelho), click preservado (<10px),
       clicks pós-arrastre suprimidos (`__dndClickSuprimido`).
2. [x] **`dragdrop.css` (novo)** — posicionamento absoluto das janelas,
       manillas con cursor grab, ghost pixelado, `touch-action:none` nos slots.
3. [x] **Janelas arrastrables** — Inventário, Skills, Status+Detalles, Config,
       Mapa Grande, Teleporte; posição persistida en `localStorage`
       (`mmorpg_jv_win_*`); `dndResetarJanelas()` para restaurar.
4. [x] **`server.js`** — nova ação `mover_item_mochila` (splice + salvar + sync);
       bug fix `localeCompare` → `localeCompare` em `organizar_mochila`.
5. [x] **`inventario.js`** — tiles da mochila com `data-id`; handlers de click
       respeitam `__dndClickSuprimido`.
6. [x] **`index.html`** — carrega `dragdrop.css?v=1` y `dragdrop.js?v=1`.

## Para testear manualmente

- Subir servidor (porta 8099 de teste) e abrir `http://localhost:8099`.
- Abrir Inventario (I): arrastrar un equipamiento da mochila sobre un slot do
  corpo → equipa; arrastrar slot ocupado → mochila → desequipa; arrastrar ítem
  sobre outro → reordena (recarrega = ordem persiste).
- Arrastrar por título de qualquer janela → se move; recargar = posição guardada.
- `dndResetarJanelas()` en consola → janelas voltam ao centro.

---

Arquivo de checkpoint para retomar o trabalho se a sessão cair.
```
PORTAS:
- Produção: 8080
- Teste controlado: 8099
- Como subir produção:  setsid nohup node /sdcard/Download/MMORPG/server.js > server.log 2>&1 &
- Reinício: matar `pgrep -x node`, depois subir acima.
```

## Lista de tarefas (pedido do usuário)

1. [x] Restringir armas e arma secundária às classes de origem.
2. [x] Mini janela de comparação de status ao clicar num item do inventário
       (se houver item equipado: 2 janelas lado a lado — "EQUIPADO" e "INVENTÁRIO";
       status melhores que o equipado em VERDE; piores em VERMELHO).
3. [x] Efeito de drop no chão mais forte/destacado para raridade Épico e Lendário;
       sinal de alerta quando um Lendário dropar.
4. [x] Botão de auto-organizar itens no inventário.
5. [x] Nova janela ao lado da janela de Status com os status detalhados do
       personagem (Vida máx, Mana máx, Crítico, Dano crítico, etc.).
6. [x] Skill do curandeiro passa a curar em área selecionada, podendo curar outros players.
7. [x] Botão EQUIPAR/DESEQUIPAR direto no item (não mais só embaixo do inventário).
8. [x] Botão de destruir item (lixeira) no inventário.
9. [x] Ajustar o sistema de upgrade de skills para ficar funcional e alterar
       de verdade: dano, CD, consumo de mana, etc.

## Correções da última sessão (4 bugs)

1. [x] **Reset de status só funcionava 1x** — o botão era desabilitado e
       `renderizarAtributos()` nunca o re-habilitava. FIX: re-habilita a cada render.
2. [x] **Upgrade de skill não refletia ao subir de nível** — `xp_ganho` não
       re-renderizava a UI de skills. FIX: `xp_ganho` (subiuLevel) chama
       `renderizarSkills()`.
3. [x] **Arma secundária nunca dropava** — só o guerreiro tinha. FIX: novas armas
       secundárias p/ mago (Grimório Arcano 📖), summoner (Cálice das Sombras 🏆),
       arqueiro (Aljava Peregrina 🪶) e curandeiro (Rosário Sagrado 🕊️);
       testes atualizados (`testes_equipamentos.js`).
4. [x] **Tabela de buffs/debuffs** — novo módulo `efeitos.js` (12 efeitos) +
       integração: dano causado (reducaoAtk/fervor), dano recebido
       (reducaoDef/escudo), cura recebida (cortaCura), trava de movimento
       (stun/paralisia/sono), sono acorda ao levar dano, ícones sobre o
       personagem com timer + lentidão/velocidade no movimento local.

## Mapas em escala + Cidade de Davahl (v1.19.8)

- [x] **Escala dos biomas:** verde 10x (18000×18000), deserto 20x (32000×36000),
      pântano 5x (8000×9000), caverna reposicionada (1800×1800), cidade nova
      (4000×3000). `WORLD_WIDTH=63800` / `WORLD_HEIGHT=36000`.
- [x] **Safe Zone do verde** movida para a **base do portal** (5000,1200, r350),
      onde fica o portal de acesso à Cidade de Davahl.
- [x] **`mapa_cidade.js` (novo):** muralha + portão oeste, praça central (fonte),
      14 casas, ruas em anel, parque, lâmpadas; `PORTA_CIDADE_VERDE`{5000,1200}
      e `PORTA_CIDADE_RETORNO`{59920,1400}; `colideMapaAtivo` final inclui cidade.
- [x] **`mapas.js` (verde):** 450×450 tiles, rios removidos → 14 lagos acessíveis,
      130 árvores (colidem só no verde), relevo 2.3D determinístico, base da Safe.
- [x] **`mapa_deserto.js`:** 800×900, dunas, 4 oásis, ruínas, desfiladeiro leste
      (y 8000-8600) → pântano, portais verde↔deserto.
- [x] **`mapa_pantano.js`:** 200×225, água **venenosa** (libre p/ jogador, bloqueia
      monstros), debuff `veneno` 5s (−5 HP/0,5s) no `server.js`.
- [x] **`server.js`:** constantes de bioma; `podeAndar` por bioma + veneno;
      colisão de projéteis pântano/cidade; **todos os spawns automáticos removidos**
      (monstros só nascem via bandeira admin).
- [x] **`index.html`:** zona `cidade` (render/sortables/região com clamp Y por
      bioma), `ZOOM_CAMERA` 0.92, árvores só colidem no verde.
- [x] **`debuffs.js`:** efeito `veneno` (☠️).
- [x] **Validação:** `node --check` em todos módulos OK; `require` das 5 fases OK;
      servidor 8080 boot OK; testes 39 PASS / 1 FAIL (RNG pré-existente).

## Hotfix pós-v1.19.6 (v1.19.7)

- [x] **Efeitos visuais de skills/ataques sumiram** — a v1.19.6 sobrescreveu o
      `efeitos.js` (visual: projéteis, marcas, smart cast, 29 KB) com o módulo de
      debuffs. FIX: `efeitos.js` ORIGINAL restaurado do backup
      (`backups/mmorpg_backup_20260914_010643.tar.gz`); debuffs/buffs movidos para o
      novo **`debuffs.js`**; `server.js` faz `require('./debuffs.js')`; `index.html`
      carrega `efeitos.js?v=234` (visual) + `debuffs.js?v=1` (`window.EFEITOS` p/
      ícones de status). Handler `efeitos_sync` e trava/lentidão de movimento mantidos.

## Etapas concluídas (log)

- **Bloco F (4 correções da sessão):**
  - **Bug 1 — reset de status:** `atributos.js` `renderizarAtributos()` re-habilita
    o botão RESETAR (`btnReset.disabled=false; text="RESETAR"`).
  - **Bug 2 — upgrade de skill ao subir nível:** handler `xp_ganho` (subiuLevel)
    agora chama `renderizarSkills()`. (Servidor já validava e ganhava pontos.)
  - **Bug 3 — armas secundárias:** em `equipamentos.js` BALANCE.armas — mago
    (`grimorio_arcano`, 📖), summoner (`calice_sombras`, 🏆), arqueiro
    (`aljava_peregrina`, 🪶) e curandeiro (`rosario_sagrado`, 🕊️). Bárbaro e
    Roqueiro seguem sem armas (design). `testes_equipamentos.js` atualizado
    (agora exige que mago/summoner/arqueiro/curandeiro gerem secundária).
  - **Bug 4 — sistema de buffs/debuffs:** novo `efeitos.js` (12 efeitos, tabela
    com nome/ícone/cor/descrição/formato + módulo puro aplicar/atualizar/tem/
    pegar/remover/expor; compatible browser via guard). `server.js`: efeitos
    alteram dano causado (`reducaoAtk` -25%, `fervor` +25%), dano recebido
    (`reducaoDef` +25%, `escudo` -20%), cura recebida (`cortaCura` -50%),
    trava de movimento (`paralisia`/`sono` + stun), `sono` acorda ao levar dano
    (re-envia `efeitos_sync`), `efeitos` agora vai no `world_update` de cada
    player. Cliente (`index.html`): handler `efeitos_sync` (id alvo), ícones de
    efeito sobre o personagem (círculo + ícone + timer/valor), e movimento local
    respeita `lentidao` (-50%) / `velocidade` (+50%) / `paralisia`/`sono` (trava).

- **Bloco A (tarefas 1, 2, 4, 7, 8 — Inventário):**
  - Servidor ((server.js): `equipar_item` agora envia `equipar_falhou` com motivo quando a classe não pode equipar (antes: silêncio). Novos handlers `destruir_item` (remove da mochila + salva + sync) e `organizar_mochila` (ordena por raridade → slot → nome).
  - Inventário (inventario.js): cada tile de equipamento na mochila ganhou mini botão ⚔️ EQUIPAR (bloqueado/cinza se classe errada) e 🗑️ lixeira; cada slot do corpo ocupado ganhou mini botão ↩️ DESEQUIPAR. `selecionarItemMochila` mostra painel `#inv-comparacao` (2 colunas EQUIPADO vs INVENTÁRIO, verde melhor / vermelho pior). Barra inferior agora tem ORGANIZAR + DESTRUIR + FECHAR.
  - index.html: handler `equipar_falhou` → alerta no statusText + floating text.
  - Cache-busters: inventario.js?v=132, inventario.css?v=132.
- **Bloco B (tarefa 3 — drops Épico/Lendário):**
  - Servidor (`server.js`): `gerarDropNoChao` agora faz broadcast `drop_raro` (dropId, x, y, raridade, nome) para Épico e Lendário.
  - Cliente: `desenharDrop` (inventario.js) com efeito muito mais forte p/ Épico/Lendário (gelo maior, 16 partículas mais altas, pilar de luz, ícone maior com glow da cor). Novo handler `drop_raro` no index.html: Lendário → popup `#drop-popup` ("🌟 X!"), statusText + som de level up; Épico → statusText "🟣 Item ÉPICO"; floating text na posição do drop.

- **Bloco C (tarefa 5 — status detalhados):** `#atributos-screen` agora tem `#atributos-dupla` (flex wrap) com a `#atributos-window` + nova `#detalhes-window` (verde). `atributos.js` ganhou `renderizarDetalhes()` (chamada por `renderizarAtributos`): Vida Máx, Mana Máx (50+int*10), Crít. chance (5%+dest*1), Dano crítico (1.5+dest*0.03), Dano físico/mágico (+5%/pt), Cura (+5%/pt divindade), DoT (+5%/pt profanidade), Pet dano/vida, Velocidade (+3%/pt agilidade). Usa `atributosTotais` (equipamento incluído).
- **Bloco D (tarefa 6 — cura em área):** botão ✨ do curandeiro virou Smart Cast + Drag Cast (`SKILLS_DRAG.prece`, raio 120, alcance 280). `dispararPrece(tx,ty)` envia `curandeiro_cura` com `targetX/targetY`. Servidor usa o ponto alvo (clamp no mundo); fallback para posição do jogador se não vier target. Marcador verde "✨ CURAR ÁREA" (efeitos.js). `usarCuraDivina` removida.
- **Bloco E (tarefa 9 — upgrade de skills FUNCIONAL + mana):** vai para o **servidor** os níveis de skill (`p.skills`), o **ponto de habilidade** (+1 a cada nível, mensagens `xp_ganho`/`init` enviam `pontosHabilidade`), e o **sistema de mana** (`calcularMaxMp` = 50+(int-1)*10, regen automática ~3%/tick no loop, gasto por skill com `mp_insuficiente`). Handlers `upgrade_skill`/`resetar_skill`/`resetar_todas_skills` validam no servidor (máx 10, gasta ponto, persiste). Dano/cura de **todas** as skills agora usa `dmgSkill` (+25%/nível) e custo `mpSkill` (+6%/nível) — incluindo projéteis básicos, pets (ogro/banda), zonas (nevasca/chuva com `danoNevasca`/`danoChuva`), dash/tornado/julgamento/meteoro/perfurante/cura/etc. Lado cliente: skills.js virou UI de verdade (envia ações, botão desabilitado sem ponto, mostra MP efetivo e "Pontos de habilidade"); index.html: barra de MP no HUD (`#mp-bar-fill`), handlers `skill_upgrade`/`skill_reset`/`skill_reset_tudo`/`skill_erro`/`mp_sync`/`mp_insuficiente`, `enviarServidor()` global, sincroniza `maxMp/mana` em `ponto_distribuido`/`atributos_resetados`/`inventario_sync`. Cache-busters: skills.js?v=143, skills.css?v=141, style.css?v=232.

## Resumo de decisões/arquivos

- **Confirm de destruir** reutiliza o modal `mostrarConfirmacao` de atributos.js.
- **Ordem de raridade** (organizar): lendario > epico > raro > comum; slot: arma → armaSecundaria → capacete → peitoral → luva → bota → capa → colar → anel.
- **Regra de bloqueio de arma no cliente** (espelho do servidor): item.classe existir e ser ≠ window.minhaClasse → não equipa.
- **Confirm de destruir** reutiliza o modal `mostrarConfirmacao` de atributos.js.
- `#inv-comparacao` só aparece quando o item selecionado é equipamento E há algo no slot equivalente do corpo.
```

---

# PROGRESSO — Sessão de 15/09/2026

```
PORTAS:
- Produção: 8080
- Como subir: setsid node /sdcard/Download/MMORPG/server.js >/tmp/opencode/server.log 2>&1 < /dev/null &
```

## O que foi feito (v1.20.0)

1. [x] **Bug do spawn vazio corrigido:** `mapa_cidade.js` e `mapa_caverna.js` agora capturam `_chainMapasAnterior` em closures (`cidadeChainAnterior`, `cavernaChainAnterior`) antes de sobrescrever `global.chainMapas`, eliminando a recursão infinita (`Maximum call stack size exceeded` em `infoPortalCaverna`/`Math.hypot`) que matava o loop no spawn da cidade ("X: 0 Y: 0").
2. [x] **Bug do portal do verde:** teleportar para o Campo Verde colocava o jogador em `PORTA_CIDADE_VERDE` (5000,1200), disparando `infoPortalCidade` e transição falsa de volta à cidade (tela preta). Correção: `PONTOS_TELEPORTE.green` usa (5200, 1400).
3. [x] **Portal de Viagem na cidade (61700, 1500):** `mapa_cidade.js` → `desenharPortalViagem` (pulso + rótulo), `tocarPortalViagem` (hit-test r+14), constante `PORTAL_MAPAS`.
4. [x] **Janela de seleção de mapa (`#teleport-screen`):** DOM no index.html + CSS; 5 destinos (Cidade, Verde, Deserto, Pântano, DG/Caverna); fluxo `selecionarMapa(mapa)` (destaca botão, mostra `#btn-teleportare-confirmar`) → `confirmarTeleporte()` (só então envia `teleporte_mapa`, fecha janela); `voltarCidade()` teleporta direto para a cidade; funções `abrirTeleporteMapas`, `fecharTeleporteMapas` com reset de seleção.
5. [x] **Teleporte autoritativo server-side:** `PONTOS_TELEPORTE` + handler `teleporte_mapa` (valida destino, move player + summoner pet, responde `teleporte_confirmado`); destino "caverna" (DG) incluído.
6. [x] **Client-side:** `teleporte_confirmado` → `fadeTeleporte` → atualiza `meuX/meuY`, `currentMap`, recentra câmera; guards de movimento e cliques incluem `teleporteAberto`; portal abre por toque (touchstart) e clique (canvas click).
7. [x] **Minimapa (`#minimap`):** canvas 150×85px no canto superior direito, mostra 5 zonas coloridas + jogador (ciano) + drops (amarelos/laranjas); clique no minimap coleta drop mais próximo da posição clicada (mesmo longe do jogador, raio 80).
8. [x] **Correção do joystick com itens no lado esquerdo:** no `touchstart`, joystick (metade esquerda) tem prioridade máxima e é verificado ANTES da coleta de drops; toques na metade esquerda ativam o joystick e ignoram drops.
9. [x] **Telemetria de diagnóstico mantida:** `client_error`, `client_estado`, `window.ws`, logs `[LOGIN]` no server — confirmou que o problema era 100% do client.

## Verificação (15/09)

- `node --check server.js` e `node --check mapa_cidade.js` OK.
- Teste E2E via WebSocket: login 123 (61810/2006) → teleporte verde (5201/1399, sem tela preta) → caverna → voltar à cidade (61801/1999) — tudo PASS.
- Cadeia de mapas: verde→cidade e cidade→verde OK sem recursão; `chainMapas.onUpdatePosicao` delega corretamente ao teleportar (server muda coords; client só reflete).

---

## O que foi feito (v1.21.0)

1. [x] **Controles de Movimento para PC (WASD + Setas):** normalização de vetor em diagonais, suporte a movimento nativo e teclado ignorado em inputs.
2. [x] **Slots de Skills Centralizados na Horizontal:** barra `.actions` ancorada em `bottom: 12px; left: 50%; transform: translateX(-50%)` com tags visuais de teclas (`.key-badge`).
3. [x] **Remoção do Botão "Girar Tela":** botão `#btn-rotate` e estilos associados removidos.
4. [x] **Interface do Topo Rente às Bordas:** `#status` (top 6px), `#fps-counter` (top 26px), `#coord-hud` (top 48px), `#hud-level` (top 8px), `#hud-dps` (top 72px) e `#hud-boss` (top 8px).
5. [x] **Mapeamento Completo de Teclas para PC:**
   - `I`: Inventário
   - `K`: Skills
   - `C`: Status/Atributos
   - `L`: Ping/Latência
   - `ESC`: Fechar modal ativo ou abrir Configurações
   - `M`: Mapa Grande
   - `Espaço`: Ataque Básico
   - `R`: Autofarm
   - `1`, `2`, `3`: Habilidades da classe ativa
   - Clique esquerdo no canvas: mira e executa ataque básico ou conjura skill com smart cast.
6. [x] **Novo Minimapa do Zero (`#minimap-wrapper`):** visualizador com bioma e coords, drops, jogadores e monstros em tempo real (pontos com cores por espécie e ícone de chefe com diamante pulsante para o Golem de Pedra).
7. [x] **Tela de Mapa Grande (`#big-map-screen`):** panorâmico das 5 fases, indicação da posição do jogador, monstros e **Ícone de Portal interativo** com modal para voltar à Cidade de Davahl (`voltarCidade()`).

---

# PROGRESSO — Sessão de 17/09/2026

## O que foi feito (v1.26.0) — Arena de Davahl acessível pelo portal da Cidade

A arena (Fase 6, `mapa_arena.js` + `sprites/arena.png`) já tinha arte e grade de colisão prontas, mas era **inalcançável e invisível**: o cliente nunca entrava nela nem a desenhava, e o teleporte devolvia o jogador à cidade na hora. Sete causas raiz corrigidas:

1. [x] **`WORLD_WIDTH` do cliente era 63800** enquanto `server.js` já usava 65040. O clamp `meuX > WORLD_WIDTH - 30` prendia o jogador em **63770** — antes do início da arena (63800) — e a câmera não rolava até lá. → `WORLD_WIDTH = 65040`, + `window.LARGURA_ARENA/FIM_ARENA/ALTO_ARENA`.
2. [x] **`currentMap` nunca virava `'arena'`:** o loop testava `meuX >= LARGURA_CIDADE` (59800), então x≥63800 era classificado como **cidade** (com `maxYMapa = 3000`, o dobro da altura da arena). → arena testada **antes** da cidade em `maxYMapa` e em `currentMap`.
3. [x] **Sem ramo de render para a arena:** `desenharCenarioArena` nunca era chamado (tela vazia). → novo `else if (window.currentMap === 'arena')` com fundo `#141210` + `desenharCenarioArena(tempoAnimacao)`; `coletarArenaSortables` entrou no Y-sort.
4. [x] **"Bounce" no teleporte:** `PONTOS_TELEPORTE.arena` era **(64420,620) — o centro exato do portal de retorno** (r=62), então `infoPortalArena` disparava transição falsa de volta (mesmo bug do portal do verde, v1.20.0). → destino **(64180,460)**, 200px a leste do portal (mínimo 190 com o jitter ±10).
5. [x] **Portal de retorno saiu do centro:** no medalhão central, qualquer luta expulsava o jogador. → **(63980,460)**, no corredor oeste (row 11 da grade, 100% livre, 4 vizinhos andáveis).
6. [x] **Arena selada:** com `currentMap === 'arena'`, `colideMapaAtivo`/`colideProjetilMapaAtivo` bloqueiam tudo fora de `x[63800,65040) y[0,1240)`. Antes dava para sair andando do mapa e ficar preso dentro da muralha leste da cidade (o cliente só consulta a colisão do mapa ativo).
7. [x] **Entrada pelo Portal de Viagem da Cidade:** novo botão `⚔️ Arena de Davahl` em `#teleport-screen` (`data-mapa="arena"`); `teleporte_confirmado` mapeia `'arena'` → `currentMap` (antes caía em `'green'`); minimapa e mapa grande ganharam a zona/portal da arena; clique no mapa grande não confunde mais arena com cidade; `mapa_arena.js?v=2`.

**Importante:** não existe caminhada cidade→arena — a muralha leste de Davahl (x 63760..63800) é sólida em toda a altura. A **única** entrada é o Portal de Viagem.

## Verificação (17/09)

- **51 asserções** em Node simulando o cliente: limites, portal, ponto de chegada, selagem, regras de `currentMap`/`maxYMapa`, round-trip e UI do `index.html` — 51 PASS / 0 FAIL.
- **E2E WebSocket** contra servidor real (sandbox, porta 8123): login → `teleporte_mapa arena` → `teleporte_confirmado {arena, 64179,456}` (andável, fora do portal de retorno) → `teleporte_mapa cidade` → destino andável — 12 PASS / 0 FAIL.
- **Sintaxe:** `vm.Script` nos 2 `<script>` inline do `index.html` e em `mapa_arena.js`, `mapa_cidade.js`, `mapa_caverna.js`, `mapa_pantano.js`, `mapa_deserto.js`, `mapas.js` — 8 PASS.
- **Prévia visual:** `desenharCenarioArena` executado com um `ctx` gravador provou que as 961 tiles (31×31) e o portal são desenhados; portal em (63980,460) cai em piso livre, ao lado da parede oeste.

---

## O que foi feito (v1.26.1) — janela de trade não aparece mais ao logar

1. [x] **Bug:** a janela **“Troca de Itens”** (`#trade-modal`) abria sozinha em cima do jogo assim que o login terminava. O `style` inline do `<div>` declarava `display` **duas vezes**: `display:none` no início e `display:flex` no fim. **A última declaração vence**, então o `none` era inútil e o modal nascia visível em toda carga da página. O JS só deveria abri-lo ao receber `trade_start`.
2. [x] **Correção:** removido o `display:flex` do `style` inline (o `display:none` agora vale de verdade). `flex-direction:column` e `gap:15px` continuaram no inline — inertes com `display:none`, ativos quando o JS faz `style.display = "flex"` em `trade_start`. Comentário de alerta acima da tag.
3. [x] **Responsividade:** `min-width:450px` fixo → `min-width:min(450px, 92vw)` + `max-width:92vw` + `max-height:92vh` + `overflow-y:auto` (em celular estreito a janela estourava a largura).
4. [x] **Varredura do mesmo padrão** (2+ `display` na mesma declaração) em `index.html` + todos os CSS (`style`, `inventario`, `skills`, `config`, `atributos`, `dragdrop`, `spawn-admin`): era o **único** caso em todo o cliente.

## Verificação (17/09) — trade

- **66 asserções** em Node — 66 PASS / 0 FAIL. Inclui a seção 9 nova: nenhum `display` duplicado em nenhum arquivo do cliente, `#trade-modal` iniciando em `display:none`, sem `display:flex` no inline, com `flex-direction`/`gap` preservados, responsivo, e o JS abrindo com `flex` / fechando com `none`.
- **Sintaxe** dos 2 `<script>` inline + 6 módulos: 8 PASS.
- **E2E WebSocket** contra servidor real: 12 PASS (login → arena → volta), sem regressão.

---

## O que foi feito (v1.27.0) — visual: nick e portal

### 1. Nick acima da barra de HP

1. [x] **Geometria medida:** `desenharBarraHp(posX-3, posY-8)` pinta o fundo em `y-10..y-2` → a barra ocupa **`posY-18` .. `posY-10`**. O nome tinha baseline em `posY-14`, então a descendente do texto caía dentro da barra.
2. [x] **Correção:** baseline do nome → **`posY-26`** (constante `deslocNome` em `index.html`). Texto em `posY-34,6..posY-23,5`, **5,5px de folga** acima da barra e sem invadir a fileira de ícones de efeito (`posY-52`). Barra intacta.

### 2. Portal de Viagem (v1 → v2)

3. [x] **Diagnóstico:** o v1 era um `arc()` cheio (círculo perfeito) com gradiente radial claro no centro + anel ciano + 4 arcos. Num jogo 2.5D, um disco perfeito no chão lê como bola, não como portal.
4. [x] **Perspectiva:** tudo virou elipse (`RX = r*1.10`, `RY = RX*0.58`).
5. [x] **Aro de bronze:** banda larga + face lateral deslocada 4,5px abaixo (espessura) + bisel em 3 passadas + luz direcional por gradiente linear (sol de noroeste).
6. [x] **Poço:** gradiente com centro escuro e crista luminosa a 66% do raio (leitura de túnel); luz central virou ponto discreto no fundo.
7. [x] **Movimento:** 2 camadas de espirais contra-rotativas, 8 runas girando no aro, 8 faíscas subindo, 12 marcas do círculo ritual girando no calçamento.
8. [x] **Feixe de luz:** gradiente linear vertical + 12 trapézios com alfa crescente para dentro (borda externa quase invisível → queda suave sem degrau reto).
9. [x] **Performance:** zeros de `shadowBlur` (era 22), ~50 operações de path por frame, culling com margem de 150px.
10. [x] **Toque:** área elíptica casada com o desenho (`RX*1.42` x `RY*2.60`) — pega portal + rótulo.

## Verificação (17/09) — visual

- **92 asserções** em Node — 92 PASS / 0 FAIL (seções 10 e 11 novas: geometria do nick e características do portal).
- **8 PASS** de sintaxe (2 `<script>` inline + 6 módulos) e **12 PASS** no E2E WebSocket.
- **Prévia visual fiel:** como o canvas não roda no Node, foi montado um **`ctx` gravador** que executa o `desenharPortalViagem` real (extraído do módulo) e despeja as operações em JSON. Um renderizador em Python/PIL reaplica as operações com **blend aditivo real** (`ImageChops.add`), **gradientes radiais exatos** (anéis com cores opacas + canal alfa separado) e **achatamento em Y** para casar a elipse. Isso permitiu comparar o ANTES (portal v1 puxado do git) e o DEPOIS no mesmo enquadramento e escalas.
- **Dois bugs do próprio pré-visualizador encontrados e corrigidos no caminho:** `Image.paste` com máscara RGBA não faz blend correto (trocado por `Image.alpha_composite`) e gradiente linear apontando para cima saía invertido.
- **Perfis medidos no render final:** queda vertical suave (94 → 122 no canal G do topo até a base do feixe) e horizontal sem degrau (varredura em y=300 subindo de ~101 até ~110 no eixo do portal).

**Observação:** o portal de retorno da **Arena** (`mapa_arena.js` → `desenharPortalArenaRetorno`) ainda usa o visual antigo (círculo chapado). Fica **inconsistente** com o novo; o mesmo tratamento pode ser aplicado lá.

---

## O que foi feito (v1.28.0) — Mago v2 (teste visual)

> Reversão: `git checkout -- classes/mago.js` + voltar `?v=1001` → `?v=1000` no `index.html`.

1. [x] **Backup antes de mexer:** `git show HEAD:classes/mago.js` e uma cópia local do arquivo atual, guardadas fora do projeto. Confirmado com `git diff` que o arquivo estava idêntico ao do git no momento do backup.
2. [x] **Interface preservada:** `desenharMago(x, y, isMoving, angulo, hp, maxHp)` e `enviarAtaqueMago(ws)` sem mudança; mesmo estado externo lido; barra de HP em `(x-3, y-8)`; mesmo mecanismo de mira do cajado (orbita + gira com o ângulo).
3. [x] **Desenho refeito:** silhueta em curvas (35 `quadraticCurveTo`), 7 gradientes, contorno escuro, chapéu de ponta dobrada com aba/faixa, olhos pulsantes, estrela arcana no peito, cinto, barra da túnica, mangas (a direita segue o cajado), mão agarrando a haste, cristal facetado com halo e 3 faíscas orbitando, aura nos pés, respiração/balanço e flash de dano em todas as peças.

### Ferramenta de prévia (reutilizável para as outras classes)

4. [x] **`previa_char.js`** — um **mini-canvas 2D em Node com pilha de transformação** (`save/restore/translate/rotate/scale/setTransform`). Os pontos saem **já em coordenadas de tela**, então o renderizador em Python não precisa entender matriz nenhuma. Roda o `desenharMago` **real** (via `require`) em 5 poses e despeja as operações em JSON.
5. [x] **`render_ops2.py`** — reaplica as operações com PIL: **achata curvas** (quadráticas e cúbicas) em polilinhas, preenche **polígonos**, **gradientes com clip** ao caminho (máscara rasterizada), gradiente linear **vertical e horizontal**, blend aditivo (`ImageChops.add`), brilho (`shadowBlur`) aproximado por cópias escaladas do caminho e **escala/offset** das operações. Também roda em 1:1 para conferir legibilidade no tamanho real do jogo.
6. [x] **Checagem de vazamento de estado:** o gravador expõe o estado final da matriz e da pilha. Validado que **`save()`/`restore()` fecha balanceado e a matriz volta à identidade** depois de cada chamada — um `translate` vazado deslocaria o jogo inteiro, então isso virou teste.

### Verificação (17/09) — mago

- **119 asserções** — 119 PASS / 0 FAIL (seção 12 nova: interface, estado externo, curvas, gradientes, contorno, cristal facetado, faíscas, aura, estrela, chapéu, ordem mão/haste, custo, cache-bust).
- **8 PASS** de sintaxe e **12 PASS** no E2E WebSocket; as 6 outras classes conferidas intactas.
- **Sem vazamento de transformação** em nenhuma das 5 poses (`pilha=0`, matriz identidade).
- **Custo:** 41 operações de desenho por frame (v1 eram 11) — o mago é desenhado algumas vezes por frame, então segue barato.
- **Prévia visual:** comparação ANTES (v1, puxada do git) × DEPOIS (v2) no **mesmo enquadramento**, tanto em **1:1** (tamanho real, ampliado 3x sem suavizar) quanto em **zoom 5x**.

**Duas correções no meio do caminho:** o renderizador não estava aplicando a escala aos traços (os personagens saíam minúsculos) e as asserções com acento (`faíscas`) falhavam por regex sem acento.