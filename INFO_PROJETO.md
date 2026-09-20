# 📱 INFO DO PROJETO — MMORPG Mobile

> Documento gerado em 19/09/2026 — resumo completo do projeto para consulta.

---

## 1. Visão geral

| Item | Info |
|---|---|
| **Nome** | MMORPG Mobile (RPG online de navegador focado em celular) |
| **Tipo** | MMORPG 2D/2.5D multiplayer em tempo real (browser game) |
| **Plataforma alvo** | Celular (Android/iOS via navegador) e PC (WASD + mouse) |
| **Modelo de rede** | Cliente-servidor com **autoridade do servidor** (dano, skills, atributos, teleportes validados no servidor) |
| **Versão atual** | v1.30.3 |
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