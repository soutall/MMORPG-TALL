# Auditoria Técnica — v1.60.0 → v1.60.1 (server.js × skills.js × index.html × classes/)

**Data:** 2026-09-26 · **Escopo:** divergências de comportamento/documentação (v1.60.0) e **resolução das 4 pendências** (v1.60.1). **Sem alteração de balanceamento.**

**Princípio adotado:** `server.js` é a AUTORIDADE. O cliente apenas exibe cooldown/alcance/duração.
**Backups:** `backup_auditoria/*.20260926_101502.bak` (server.js, skills.js, index.html e 12 arquivos de `classes/`).

---

## Tabela de divergências encontradas (v1.60.0)

| # | Problema | Valor Cliente | Valor Servidor | Comportamento Real | Correção |
|---|---|---|---|---|---|
| 1 | Cooldown **ausente** — Meteoro | 7s | *(nenhum)* | Servidor aceitava recast infinito | CD server-side 7000ms + `skill_aviso` |
| 2 | Cooldown **ausente** — Nevasca | 12s | *(nenhum)* | idem | CD 12000ms + `skill_aviso` |
| 3 | Cooldown **ausente** — Chuva de Flechas | 6s | *(nenhum)* | idem | CD 6000ms + `skill_aviso` |
| 4 | Cooldown **ausente** — Perfurante | 4.5s | *(nenhum)* | idem | CD 4500ms + `skill_aviso` |
| 5 | Cooldown **ausente** — Rajada de Flechas | 12s | *(nenhum)* | idem | CD 12000ms + `skill_aviso` |
| 6 | Cooldown **ausente** — Tornado | 5s | *(nenhum)* | idem | CD 5000ms + `skill_aviso` |
| 7 | Cooldown **ausente** — Esmagamento (Bárbaro) | 6s | *(nenhum)* | idem | CD 6000ms + `skill_aviso` |
| 8 | Cooldown **ausente** — Cura Divina | 5s | *(nenhum)* | idem | CD 5000ms + `skill_aviso` |
| 9 | Cooldown **ausente** — Julgamento | 6.5s | *(nenhum)* | idem | CD 6500ms + `skill_aviso` |
| 10 | Duração — Nevasca | 24s (`skills.js`) | 8000ms (`480*(1000/60)`) | **8s** | `skills.js` → `8s` |
| 11 | Duração — Chuva de Flechas | 7s | 2333ms (`140*(1000/60)`) | **≈2,3s** | `skills.js` → `2,3s` |
| 12 | Duração — Vulcão | 6s | `duracao: 200` ticks ×50ms | **10s** | `skills.js` → `10s` |
| 13 | Duração — Golem Colossal | 4s | `colossalTimer = 400` ×50ms | **20s** | `skills.js` → `20s` |
| 14 | Stun — Bateria Solo | 1,25s **por batida** | `stunTimer = 100` (5s), `stunsAplicados[id]` | **5s, 1× por inimigo** | `skills.js` → `Stun 5s (1x por inimigo)` |
| 15 | Dano do Roqueiro (Riff / Bateria) | rotulado **Físico** | `ehMagico = [..., 'roqueiro', ...]` | **mágico → Inteligência** | `skills.js` → `danoUnidade: 'mágico'` |
| 16 | Chamar a Banda (Roqueiro) | rotulado **Físico** (→ Força) | `registrarDanoMonstro(..., 'pet')` | **Afinidade** | `skills.js` → mapeado como Afinidade |
| 17 | Golem Sísmico (Summoner) | caía em **Inteligência** | `registrarDanoMonstro(s, pid, dano, 'pet')` | **Afinidade** | `skills.js` → incluído no mapeamento Afinidade |
| 18 | CD — Modo Assalto (Dronemaster) | 10000ms | 15000ms | **15s** | `index.html` 10000→15000 (2×), HUD fallback 15, `skills.js` `cd: 15` |
| 19 | Imunidade Salto+Chuva do Alto | anel visual de invencibilidade | `p.imune` setado/limpo mas **nunca lido** | **imunidade declarada e inoperante** | `aplicarDanoJogador` agora faz `if (jogador.imune) return true;` |
| 20-23 | Alcance — Meteoro/Nevasca/Chuva/Julgamento | 380/350/420/340px | *sem validação* | só o cliente valida | doc em `skills.js` (v1.60.0) + **validação server-side (v1.60.1)** |
| 24 | Fallbacks do HUD divergentes | Perfurante 8s · Cura 6s · Julgamento 6s · Tornado 10s · Assalto 10s | 4500/5000/6500/5000/15000 | valores reais 4,5/5/6,5/5/15s | `index.html` fallbacks corrigidos |
| 25 | Recast bloqueado **sem aviso** | cancelava o anel local | descartava a ação em silêncio | jogador não sabia o motivo | novo handler `skill_aviso` (`motivo:'cooldown'`) → "⏳ Em recarga!" |
| 26 | `cd` documentado da Bateria | 6 | 10000ms (**só** se terminar por mana) | CD 10s condicional; cancelar manual não tem CD | `skills.js` `cd: 6`→`10` + nota explicativa |

---

# v1.60.1 — RESOLUÇÃO DAS 4 PENDÊNCIAS

## Pendência 1 — Fúria Crescente (Bárbaro)

**Status: JÁ IMPLEMENTADA desde antes da auditoria (a pendência era um falso positivo).**

A asserção da v1.60.0 (`furia_crescente_nao_implementada`) procurava o literal `furiaCrescente`
no corpo de `calcularDanoJogador`. O bônus **já estava lá**, escrito inline com a variável
local `pctHp` — por isso o regex não achou. **Nenhum código foi alterado nesta versão.**

* **Função:** `calcularDanoJogador` — `server.js:1624` (bônus em `server.js:1677-1682`)
* **Código:**
  ```js
  if (p && p.classe === 'barbaro' && p.maxHp > 0) {
      let pctHp = (p.hp > 0 ? p.hp : p.maxHp) / p.maxHp;
      if (pctHp <= 0.20) mult *= 1.15;
      else if (pctHp <= 0.40) mult *= 1.10;
      else if (pctHp <= 0.60) mult *= 1.05;
  }
  ```

| Patamar de HP | Multiplicador | Efeito |
|---|---|---|
| acima de 60% | ×1.00 | sem bônus |
| ≤ 60% | ×1.05 | +5% de dano |
| ≤ 40% | ×1.10 | +10% de dano |
| ≤ 20% | ×1.15 | +15% de dano |
| 0% (morto) | ×1.00 | `pctHp` força 100% → sem bônus |

* **Dinâmico:** lê `p.hp`/`p.maxHp` **a cada dano** (não usa campo pré-computado) → atualiza sozinho.
* **Só Bárbaro:** outras classes a 20% de HP não recebem nada.
* **Não mexe na base:** entra só como multiplicador do modificador (`quantidade * mult * critMult`).
* **Testes:** `_auditoria_unidade.js` **9 PASS** · `_auditoria_verifica.js` **5 PASS**.

---

## Pendência 2 — Imunidade do Salto + Chuva do Alto (PvE × PvP)

**Status: DECIDIDA, DOCUMENTADA E TESTADA — imunidade é SÓ PvE. Nenhuma mudança de comportamento.**

| Caminho | Arquivo:linha | Consulta `imune`? | Decisão |
|---|---|---|---|
| PvE (`aplicarDanoJogador`) | `server.js:2322`, guard em `server.js:2356` | **SIM** — `if (jogador.imune) return true;` | já valia desde a v1.60.0 |
| PvP (`aplicarDanoPvP`) | `server.js:3292`, nota em `server.js:3302` | **NÃO** | mantido de propósito |

**Alterações desta versão:** só **comentários** deixando a decisão explícita para não ser
"corrigida" depois (`NOTA v1.60.1` nos dois caminhos). A janela continua a mesma:
do cast até o tiro (`arqueiro_salto_chuva_shoot`) **ou 3000ms**, o que vier primeiro
(`saltoChuvaExpires`, `server.js:9828`, limpeza em `server.js:4460`).

* **Testes de unidade** (`_auditoria_unidade.js`, código real extraído do `server.js`): **4 PASS**
  — PvE imune→sem dano · PvE sem imune→dano · **PvP com imune→dano passa** · PvP controle.
* **Teste AO VIVO PvE** (`_auditoria_pve.js`, monstro real na Cidade Perdida): **10 PASS**
  * baseline: o monstro causa dano **sem** imunidade (3 quedas de hp registradas);
  * cadência medida pelo **menor intervalo** entre golpes consecutivos → sempre
    **≤ 3000ms** (tipicamente ~2,3–2,5s), ou seja, a janela imune de 3000ms
    cobre pelo menos um ataque;
  * com `p.imune = true`: **hp não caiu durante 2900ms** dos 3000ms de janela;
  * após os 3000ms: o dano voltou (monstro seguia atacando).
  * O teste mede os próprios `sleep` e **repete a fase** se o ambiente sofrer
    stall (host com ~4 CPUs e load ~20), para não gerar falso-negativo.
* **Teste AO VIVO PvP** (`_auditoria_pvp.js`, 2 jogadores, ambos com PvP ligado): **6 PASS**
  * baseline sem imune: 2 acertos;
  * **com `p.imune = true`: 1º acerto em t=+605ms (imunidade vale até +3000ms) → dano passou.**

---

## Pendência 3 — Validação server-side de alcance (4 skills)

**Status: IMPLEMENTADA.**

* **Função nova:** `alcanceSkillValido(p, targetX, targetY, limitePx)` — `server.js:1054`
  (usa o feedback existente `avisaForaAlcance`, `server.js:1043` → pacote `skill_aviso`
  com `motivo: 'fora_alcance'`).
* **Posição:** roda **ANTES** do cooldown, para que um cast errado **não queime a recarga**.

| Skill | Antes | Depois | Arquivo:linha |
|---|---|---|---|
| Julgamento | sem validação | **340px** | `server.js:10389` |
| Chuva de Flechas | sem validação | **420px** | `server.js:10410` |
| Meteoro | sem validação | **380px** | `server.js:10479` |
| Nevasca | sem validação | **350px** | `server.js:10502` |

* Rejeição: alvo não numérico/`NaN` **ou** distância > limite (medida do centro do jogador).
* **Testes AO VIVO** (`_auditoria_teste.js`, 8 asserções) e **estáticos** (`_auditoria_verifica.js`, 10 asserções) — todos PASS:
  * fora do alcance → `exec=0` + 1 `skill_aviso motivo:'fora_alcance'`;
  * dentro do alcance → `exec=1` (**e o CD do cast recusado não foi consumido**).

---

## Pendência 4 — Margem de 500ms nos 9 cooldowns novos

**Status: IMPLEMENTADA** — as 9 skills novas passaram a seguir a **mesma convenção pré-existente**
`servidor = cliente − 500ms` (já usada por Escudo, Vulcão, Provocação, Salto+Chuva, Cântico,
Vínculo, Buraco Negro e Golem). Motivo: o cliente zera o anel no **envio** e o servidor começa
a contar no **recebimento**; sem a margem o jogador ve "pronto" e ainda é recusado.

| Skill | CD cliente (inalterado) | CD servidor **antes** | CD servidor **dep.** | Arquivo:linha |
|---|---|---|---|---|
| Esmagamento | 6000ms | 6000ms | **5500ms** | `server.js:8772` |
| Tornado | 5000ms | 5000ms | **4500ms** | `server.js:9729` |
| Cura Divina | 5000ms | 5000ms | **4500ms** | `server.js:10363` |
| Julgamento | 6500ms | 6500ms | **6000ms** | `server.js:10390` |
| Chuva de Flechas | 6000ms | 6000ms | **5500ms** | `server.js:10411` |
| Perfurante | 4500ms | 4500ms | **4000ms** | `server.js:10424` |
| Rajada de Flechas | 12000ms | 12000ms | **11500ms** | `server.js:10454` |
| Meteoro | 7000ms | 7000ms | **6500ms** | `server.js:10480` |
| Nevasca | 12000ms | 12000ms | **11500ms** | `server.js:10503` |

* **Nenhum valor do cliente foi alterado** (anel/HUD continuam mostrando o valor cheio).
* **Prova da margem = medição direta do CD do servidor.** Em cada teste o `skill_aviso`
  de cooldown traz o `restante` calculado pelo **relógio do servidor**; somando-o ao
  tempo decorrido no cliente desde o 1º cast obtém-se o CD real do servidor (o atraso
  dos timers do host se cancela na conta, por isso a medida não sofre com a carga).
  CD medido × esperado × cliente:

  | Skill | CD medido | CD servidor | CD cliente |
  |---|---|---|---|
  | Tornado | **4503ms** | 4500 | 5000 |
  | Meteoro | **6503ms** | 6500 | 7000 |
  | Nevasca | **11501ms** | 11500 | 12000 |
  | Chuva de Flechas | **5502ms** | 5500 | 6000 |
  | Perfurante | **4002ms** | 4000 | 4500 |
  | Rajada | **11503ms** | 11500 | 12000 |
  | Cura Divina | **4504ms** | 4500 | 5000 |
  | Julgamento | **6005ms** | 6000 | 6500 |
  | Esmagamento | **5502ms** | 5500 | 6000 |

  Todos dentro de ±16ms do CD de servidor e **500ms abaixo do cliente**. Se o
  servidor usasse o valor do cliente, a medição apareceria como `cdServidor + 500`
  e a asserção `_cd_valor` falharia.
* Complementarmente, a skill foi re-lançada logo após o CD do servidor e **executou**
  (`exec=1`, sem `skill_aviso`). Obs.: o host tem timers ~3× atrasados sob carga, então
  o instante real do re-lançamento pode cair depois do CD do cliente — por isso a
  comprovação estrita da margem é a medida acima, e não o relógio do teste.
* **Testes:** `_auditoria_teste.js` 55 asserções (9×4 de CD + 9 de mana + 8 de alcance + 2 de regressão) ·
  `_auditoria_verifica.js` 10 asserções estáticas desta pendência (do total de 95) — todos PASS.

---

## Arquivos modificados (v1.60.1)

| Arquivo | Alteração |
|---|---|
| `server.js` | função nova `alcanceSkillValido` (`:1054`) + comentário do bloco de cooldown (`:1061`); 4 checagens de alcance (`:10389`, `:10410`, `:10479`, `:10502`); 9 CD com margem −500ms (tabela acima); comentário de escopo PvE em `aplicarDanoJogador` (`:2350-2355`) e nota `NOTA v1.60.1` em `aplicarDanoPvP` (`:3302`) |
| `jogadores.json` | apenas remoção dos usuários de teste (`aud_*`, `alv_*`) → **163 registros do `HEAD` intactos**. Hoje o arquivo tem **164** entradas: os 163 + `Admin12387`, conta que **não** é dos testes desta auditoria (nenhum script cria esse id) e que por isso **não foi removida** |
| `_auditoria_unidade.js` | *novo* — 14 asserções (Fúria + imune PvE/PvP em código real extraído do `server.js`) |
| `_auditoria_teste.js` | *reescrito* — 55 asserções ao vivo (9 CD com margem + 4 alcances + regressão) |
| `_auditoria_verifica.js` | *atualizado* — 95 asserções estáticas (asserção da Fúria corrigida, +alcance, +margem) |
| `_auditoria_pvp.js` | *novo* — 6 asserções ao vivo de PvP × imunidade |
| `_auditoria_pve.js` | *novo* — 10 asserções ao vivo de PvE × imunidade |

### NÃO ALTERADO (v1.60.1)

* Nenhum valor de **dano, HP, defesa, mana, estamina, velocidade, scaling ou alcance** do servidor.
* Nenhum **cooldown pré-existente** nem **valor exibido pelo cliente** (anel/HUD/fallbacks).
* Nenhum outro balanceamento.
* `classes/*.js` (apenas no backup).

---

## Testes

| Teste | Resultado |
|---|---|
| `node --check server.js` · `skills.js` | **OK** |
| `node --check` dos 5 arquivos de teste | **OK** |
| Sintaxe dos 3 blocos `<script>` inline do `index.html` | **3 blocos, 0 erros** |
| Servidor (`./servidor.sh restart`) | **PID 1937 · porta 8080 + 8081 OK** |
| `_auditoria_unidade.js` | **14 PASS / 0 FAIL** |
| `_auditoria_verifica.js` (estático) | **95 PASS / 0 FAIL** |
| `_auditoria_teste.js` (ao vivo, WS) | **55 PASS / 0 FAIL** |
| `_auditoria_pvp.js` (ao vivo, 2 jogadores) | **6 PASS / 0 FAIL** |
| `_auditoria_pve.js` (ao vivo, monstro real) | **10 PASS / 0 FAIL** |
| **TOTAL** | **180 PASS / 0 FAIL** |

Cobertura:
* **Fúria:** 100%→sem bônus · 60%→×1,05 · 40%→×1,10 · 20%→×1,15 · morto→sem bônus · dinâmico · só Bárbaro · base 55→63.
* **Imune:** PvE bloqueia · PvE sem imune leva dano · **PvP não bloqueia** (unidade + ao vivo ×2).
* **Alcance ×4:** fora → rejeita + avisa; dentro → executa; cast rejeitado não consome o CD.
* **Cooldown ×9:** 1º uso executa · 2º uso bloqueado com `restante` coerente · janela da margem respeitada · mana regenera.
* **Regressão:** `world_update` fluindo, `tornado` normal.

Reexecutar:
```bash
./servidor.sh restart
node _auditoria_unidade.js    # 14
node _auditoria_verifica.js   # 95
node _auditoria_teste.js      # 55
node _auditoria_pvp.js        # 6
node _auditoria_pve.js        # 10
# limpar usuários de teste ao final:
node -e "const fs=require('fs');const j=JSON.parse(fs.readFileSync('jogadores.json','utf8'));Object.keys(j).filter(k=>k.startsWith('aud_')||k.startsWith('alv_')).forEach(k=>delete j[k]);fs.writeFileSync('jogadores.json',JSON.stringify(j,null,2))"
```

---

## PROBLEMAS RESTANTES / OBSERVAÇÕES

1. **`guerreiro_escudo_baque` causa dano PvP pelo caminho de PvE** (`server.js:1340` chama
   `aplicarDanoJogador` para o alvo). Na prática, um arqueiro com o Salto+Chuva ativo
   **anularia o baque do escudo do guerreiro em PvP**. Corrigir exige trocar para
   `aplicarDanoPvP` = **alterar PvP** → fora do escopo (proibido). *Não alterado.*
2. **Bônus de TAMANHO da Fúria Crescente** documentado em `skills.js:224`
   (`+5% / +10% / +20% tamanho`) **não é aplicado** em nenhum lugar — só o dano está
   implementado. É efeito visual/silhouette → balanceamento → *não alterado.*
3. **`player.furiaCrescenteNivel` é dead code** (`server.js:4586`, init `server.js:7225`):
   `calcularDanoJogador` recalcula o patamar a cada dano. Campo redundante; *não alterado.*
4. **`spawn_flags.json` está modificado no working tree** (10 flags × 20 no `HEAD`).
   `mtime = 08:50`, **anterior** à auditoria (backups 10:15) — conteúdo de dados,
   não relacionado às pendências. *Não alterado.*
5. **`.cd` do `skills.js` não é lido** por `index.html` nem por `server.js` — é documentação
   pura (por isso a margem da Pendência 4 só existe no servidor).
