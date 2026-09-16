# PROGRESSO — Sessão de 14/09/2026

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