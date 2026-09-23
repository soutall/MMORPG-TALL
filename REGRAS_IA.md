# 🚨 REGRAS OBRIGATÓRIAS DE DESENVOLVIMENTO PARA TODAS AS IAs

> **AVISO A QUALQUER ASSISTENTE DE IA (CLAUDE, GPT, GEMINI, DEEPSEEK, OPENCODE, ETC.):**
>
> Este arquivo contém a regra fixa e mandatória definida pelo criador do projeto. **Você DEVE seguir estas instruções rigorosamente em toda e qualquer sessão de trabalho.**

---

## 📌 REGRA PERMANENTE: ATUALIZAÇÕES, TABELA E VERSÃO

Sempre que finalizar qualquer atualização ou implementação no projeto:

1. **Salvar o que realizou em formato de tabela:**
   - Registrar no `INFO_PROJETO.md` e no `CHANGELOG.md` uma tabela com os campos:
     - **Versão do Game** (ex: `v1.32.0`, `v1.32.1`, etc.)
     - **Data e Horário** da conclusão
     - **O que foi feito** (resumo claro e completo de todas as alterações)
     - **Quais arquivos foram alterados** (caminho relativo de todos os arquivos modificados/criados)

2. **Sempre atualizar a versão do Game (Update):**
   - Atualizar a versão do jogo seguindo o versionamento semântico (SemVer):
     - `v1.X.Y` onde correções sobem o patch (`Y`) e novas mecânicas sobem o minor (`X`).
   - Atualizar a constante no código: `window.GAME_VERSION` no `index.html`.
   - Atualizar a documentação: `INFO_PROJETO.md` e `CHANGELOG.md`.

3. **Exibir a versão visualmente no jogo:**
   - A versão **DEVE SEMPRE** aparecer visualmente:
     - Na **tela inicial de login** no canto inferior (`#login-screen .game-version-display`).
     - No **canto inferior da tela** em jogo (`#hud-version.game-version-display`).

4. **Desenvolvimento Dual Obrigatório (PC & Mobile):**
   - O game está sendo desenvolvido para **PC e Mobile**, então a otimização tem que ser feita para **AMBOS**, e tudo o que for feito no projeto é pensando em ambos os lados (controles via teclado/mouse no PC e touch/joystick no mobile, compatibilidade de interface responsiva, telas e menus sem cortes nem sobreposição, e alto desempenho em todas as resoluções).

---

## 📊 Histórico de Atualizações (Tabela Padrão)

| Versão | Data / Hora | O que foi feito | Arquivos Alterados |
|---|---|---|---|
| **v1.37** | 23/09/2026 (hora local) | **FOTOS DE SNIPER E CURANDEIRO ATIVADAS no círculo do retrato do HUD:** `sniper.png` (1254×1254) adicionada e mapeada (`sniper`→`sniper.png`) — o retrato do Sniper agora é exibido no círculo (antes vazio); Curandeira já ativa; técnica da v1.36 (clip `ctx.arc` + cover-crop, **"PNG por último"**, overlay puro sem destination-out); cache-buster → `?v=perfil2`; versão **v1.37** nos 3 pontos visuais | `index.html`, `imagem/HUD/Perfil/sniper.png`, `CHANGELOG.md`, `INFO_PROJETO.md`, `REGRAS_IA.md` |
| **v1.36** | 23/09/2026 (hora local) | **FOTO DE PERFIL das classes no círculo do retrato do HUD (`HudHP.png` NÃO modificada):** fotos `imagem/HUD/Perfil/*.png` (1254×1254) preenchendo o círculo do retrato (centro 345,350 / raio 200), recorte circular via clip `ctx.arc` + cover-crop; **"PNG por último"** — foto desenhada ANTES do `drawImage(HudHP.png)`, que pintada por último em source-over cobre sobras (SEM masking/destination-out; antialias = blend natural); lazy load + cache `?v=perfil1`; mapa `window.minhaClasse` → Guerreiro/Mago/Summoner/Arqueira/Barbaro/Roqueiro/Ladino/DroneMaster/Arqueir_astral/PikeMan/curandeiro; **Sniper sem foto → círculo vazio sem erro** (basta adicionar os PNG); validado por render GDI+; versão **v1.36** nos 3 pontos visuais | `index.html`, `imagem/HUD/Perfil/*.png` (uso), `CHANGELOG.md`, `INFO_PROJETO.md`, `REGRAS_IA.md` |
| **v1.34.1** | 22/09/2026 (hora local) | Atalhos de teclado das poções: **Q = Poção de Vida (HP)** e **E = Poção de Mana (MP)** (clique/toque mantido no mobile); tecla **Q removida da Skill 4** (Grito/Estrela/Titã/Camuflagem Sniper), agora só no **4**; badges Q/E nos slots de poção + badges das Skills 4 "Q" → "4" + **Inventário (tecla I) +30% na horizontal** (295 → 384px, max-width 92vw) com comparação reposicionada (208px) + **Fix Social (O)**: modal abria FORA da tela (drag-drop salvava left/top + transform:none e anulava a centralização) — agora `abrirSocialModal` sempre centraliza; novo `soltarFoco()` devolve o foco ao entrar no jogo e ao fechar os modais (foco preso no input do login matava TODOS os atalhos) | `index.html`, `style.css`, `inventario.css`, `INFO_PROJETO.md`, `CHANGELOG.md`, `REGRAS_IA.md` |
| **v1.34.0** | 21/09/2026 23:31 | Big batch v1.34: Poções HP/MP ×3 níveis droppáveis + 2 slots no HUD; DASH passa a usar STAMINA (barra laranja) em vez de mana (25 normal / 40 Dronemaster); HUD redesenhado (retrato em tempo real, barras fortes vermelho/azul/laranja, buffs, XP central amarelo sobre fundo azul-claro); Pedras de Upgrade com tabela de raridade + brilho/som únicos ao dropar; Ouro cai de ~90% dos monstros e de todos os bosses com autocoleta (ouro/poções/pedras/lendários); Inventário refeito (sem boneco, grade 3×3, comparação ao lado, botões somente ícone + X no topo, +10% largura); Janela de Skills maior com skills lado a lado e fonte legível; Anel de CD nos slots circulares de skill drenando no sentido horário + brilho dourado quando pronta (todas as classes); Runas/Quest marcados como "futuro update" | `server.js`, `equipamentos.js`, `index.html`, `style.css`, `dragdrop.css`, `inventario.js`, `inventario.css`, `skills.css`, `INFO_PROJETO.md`, `CHANGELOG.md`, `REGRAS_IA.md`, `PROGRESSO.md` |
| **v1.33.4** | 21/09/2026 23:05 | Removido o portal de retorno ("SAIR DA SOLARI") de dentro da Arena de Solari — durante a partida o portal não é mais desenhado nem teleporta para a cidade no meio do combate (saída segue pelo painel Sair / Renascer / fim do round); portal da Arena normal e portal roxo da cidade permanecem. + Otimização de performance mobile no render de monstros (trava de tela da Bateria entre hordas): aura sem shadowBlur, skip automático com >55 monstros, ícones de stun a cada 350ms, anéis com sombra reduzida | `mapa_arena.js`, `index.html`, `monstros.js`, `classes/comum.js`, `efeitos/roqueiro_efeitos.js`, `INFO_PROJETO.md`, `CHANGELOG.md`, `REGRAS_IA.md` |
| **v1.33.3** | 21/09/2026 22:20 | Correções de bugs críticos: (1) Ataque básico/projéteis invisíveis na Arena de Solari — colisão da cidade destruía todo projétil com `x ≥ 59800` no 1º tick; corrigido com limite `x < FIM_CIDADE` em projéteis de jogador e de monstro + flag `solari: true` nos disparos da sessão; (2) Tela verde ao usar a Bateria do Roqueiro — broadcasts escopados ao mapa do jogador, spawn de notas 0.6 → 0.22/frame (máx. 40), anéis limitados a 24, tremor 5 → 3 e trava anti-stuck por timestamp (expira em 5s); (3) STATUS travado (~2 pontos por atributo) — botão "+" preso em "..." após o 1º clique; agora reativa sempre e permite distribuir todos os pontos; (4) Pontos de habilidade zerando no login — agora carrega o valor salvo; (5) `admins.json` corrompido (chave duplicada/JSON inválido) impedia admins | `server.js`, `index.html`, `atributos.js`, `classes/roqueiro.js`, `efeitos/roqueiro_efeitos.js`, `admins.json`, `INFO_PROJETO.md`, `CHANGELOG.md`, `PROGRESSO.md` |
| **v1.33.2** | 21/09/2026 17:25 | Adição e integração completa dos efeitos sonoros da classe Guitarrista/Roqueiro (ataque básico, solo de bateria com interrupção instantânea ao cancelar, stage dive/dash e banda) e da Arena de Solare (BGM ambiente em loop integrado aos controles de volume, início do Round 1, conclusão do round, fanfarra de vitória no Round 10, rolagem de dados e ganho de item no leilão) para PC e Mobile | `sonoro.js`, `solari.js`, `index.html`, `REGRAS_IA.md`, `INFO_PROJETO.md`, `CHANGELOG.md` |
| **v1.33.1** | 21/09/2026 16:45 | Correção do fluxo de premiação da Arena de Solari: o sorteio/leilão de 5 itens foi reposicionado para ocorrer estritamente APÓS a finalização de cada round. O Round 1 agora inicia direto em combate após a contagem de entrada sem premiar de antemão. Ao limpar o round (ou estourar o tempo), os 5 itens são sorteados via dados; finalizado o sorteio, avança para a transição de 10s rumo ao próximo round (ou conclui a Arena com vitória no Round 10) | `server.js`, `index.html`, `REGRAS_IA.md`, `INFO_PROJETO.md`, `CHANGELOG.md` |
| **v1.33.0** | 21/09/2026 16:30 | Balanceamento completo de classes (Berserker Fúria 15s CD e Giro 4s/15s CD; Curandeira Aura 5s CD no recast e Julgamento +20% área; Roqueiro Bateria -30% dano cancelável por andar/clique e mantida no Teleporte, Grito de Guerra com atualização em tempo real na tecla C, Banda +50% mov/+80% atk spd/+20% atk; DroneMaster Modo Assalto 8s e +50% atk spd; Arqueiro Astral full dano mágico/INT e painel K completo; Sniper alcance 384px, Disparo Supremo +20% dano e Posição resetando CD com +100% crítico) + 3 Sliders de volume em tempo real (Geral, BGM e SFX) no menu ESC salvando no localStorage + Interface Responsiva com Drag-and-Drop universal em todas as janelas sem corte de tela + Desacoplamento da mira no PC (arma e skills seguem o mouse, WASD apenas move o corpo) | `server.js`, `index.html`, `skills.js`, `atributos.js`, `config.js`, `config.css`, `sonoro.js`, `dragdrop.js`, `REGRAS_IA.md`, `INFO_PROJETO.md`, `CHANGELOG.md` |
| **v1.32.2** | 21/09/2026 15:50 | Desacoplamento da mira do WASD no PC: o item/arma na mão segue continuamente o ponteiro do mouse, as skills ativas disparam na direção do cursor do mouse, e o WASD controla exclusivamente a movimentação do corpo | `index.html`, `INFO_PROJETO.md`, `CHANGELOG.md`, `REGRAS_IA.md` |
| **v1.32.1** | 21/09/2026 15:35 | Implementação completa dos efeitos sonoros reais da Arqueira (ataque básico, chuva de flechas, disparo perfurante, rajada carregar e rajada soltar) integrados via `sonoro.js`, `audio-manager.js`, `server.js` e `index.html` | `sonoro.js`, `audio-manager.js`, `server.js`, `index.html`, `INFO_PROJETO.md`, `CHANGELOG.md`, `REGRAS_IA.md` |
| **v1.32.0** | 21/09/2026 15:30 | Exibição visual da versão no canto inferior da tela (tela inicial de login e HUD in-game) + Criação e fixação da regra mandatória para IAs com registro obrigatório em tabela nos arquivos `.MD` | `index.html`, `style.css`, `INFO_PROJETO.md`, `CHANGELOG.md`, `REGRAS_IA.md` |
