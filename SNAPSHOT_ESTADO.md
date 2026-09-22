# SNAPSHOT — MMORPG-TALL (UI/UX) — salvado em 2026-09-22

> Proj.: `/public/MMORPG-TALL` (o index tem 6334 linhas; dragdrop.js é o arquivo real de
> arrastar — também referido com acento no nome da pasta, é o MESMO arquivo).

## O QUE JÁ ESTÁ PRONTO E VALIDADO ✅

### 1. Save de interface 100% por ID (jogador/personagem)
- Chaves localStorage per-ID (já existiam e foram conferidas, sem duplicar):
  - `mmorpg_user_id` — ID ativo do login
  - `chaveJanela(id)` → `mmorpg_jv_win_<uid>_<id>` (janelas arrastáveis, por jogador)
  - `claveLayoutUI()` → `mmorpg_ui_layout_<uid>` (layout dos elementos UI, por jogador;
    com migração de chaves legadas `anonimo`/sem sufixo)
- dragdrop.js validado: `node --check` → **SYNTAX-OK**; nenhum "Gerry"/duplicata.

### 2. Motor de COLISÃO de UI (novo) — dragdrop.js
- `telaPequena()` — detecta celular/landscape-forçado/janela estreita (w<830 ou razão<1.5).
- `LAYOUT_PADRAO_MOBILE` + `aplicarLayoutPadraoMobile()` — posições padrão para listas:
  hud-status-window, hud-xp-central, minimap, joystick, actions, util-buttons,
  hud-party, hud-buffs, hud-boss.
  - Só aplica quando: tela pequena E nenhum layout salvo (não sobreescreve personalizado).
  - Nunca persiste no localStorage sozinho (grava com 💾 SALVAR por jogador).
- `resolverColisaoUI(nome, x, y, w, h)` — empurra o elemento pra "posição livre mais
  próxima" (candidatos: continuar/à direita/à esquerda/abaixo/acima do bloqueador),
  respeitando viewport (clamp).
- `resolverColisoesAplicadas()` — varre TODOS os elementos e resolve sobreposição com
  passes limitados (max 12) — convergência garantida.
- Integrado em: `moverUI`, `redimensionarUI`, `clampUI`, após `cargarLayoutLocal()`
  (no boot, linha ~1113-1116), no resize (`reaccionarRedimensionamiento`).
- CSS: classes `.ui-movido`, `.ui-collide` usadas.

### 3. links/estado do login (index.html)
- `login-screen`: `#input-userid` + `#btn-entrar` → `fazerLogin()` (linha 3334);
  Enter no input dispara login (keydown).
- `char-select-screen`: cards `.class-card` → `selecionarClasse(classe)` (linha 3349).
- `trocarDePersonagem()` / `sairDoJogo()` — no index (perto da linha 662/735).

## PENDENTE (por fazer)
- Criar **login.html** (separado: ID + cards de classe; grava `mmorpg_user_id` +
  classe; volta pra `index.html?user=<id>&classe=<c>`).
- No index.html: bootstrap com auto-login (ler `?user=&classe=`, gravar no
  localStorage, esconder tela de login e conectar direto); fazer `trocarDePersonagem`
  e `sairDoJogo` redirecionarem pra login.html.
- (Opcional) rodar GET http://localhost:8080/login.html → 200 e validar index.html.

## COMO RETOMAR
1. Isso acima está salvo e o JS está íntegro (sintaxe OK).
2. Próximo passo = criar login.html + auto-login no index (conforme PENDENTE).
3. Fazer backup antes de grandes edits: pasta `backup_*` já existe por convenção.
