# Reconstrução Visual Completa — Guerreiro Kaledron
## Documentação Técnica, Decisões de Arquitetura e Registro de Validação

### 1. Objetivo e Escopo

Reconstrução visual integral em código da classe **Guerreiro Kaledron** (Magma Knight), tendo como padrão visual obrigatório a arte oficial de referência fornecida pelo usuário (`media_1791562078496_78f200cc.jpg`).

O personagem e suas 4 habilidades já existiam e operavam de forma autoritativa no servidor. O objetivo foi realizar uma reconstrução visual autêntica no motor Canvas 2D sem alterar nenhuma mecânica, fórmula de dano, alcance, custo de mana, recarga ou regras de combate multiplayer.

---

### 2. Identidade Visual e Fidelidade à Referência

1. **Corpo e Silhueta do Kaledron:**
   - **Escala e repouso:** escala reduzida para 68%, alinhada ao tamanho visual das demais classes; sombra e fissuras ancoradas junto às botas. No idle, pernas, manto, relíquia e espada ficam imóveis, com respiração sutil restrita ao peitoral.
   - **Armadura Vulcânica:** Placas esculpidas em aço negro e basalto escuro (`#0d0d12`, `#232228`, `#38343c`), com chanfros geométricos angulares.
   - **Ornamentos Metálicos:** Frisos, bordas e detalhes em bronze e ouro envelhecido (`#b88235`, `#c9933b`, `#d9a44e`, `#f3c46e`).
   - **Fissuras de Magma Incandescente:** Veias de lava profunda correndo pelo peitoral, ombreiras, braços e pernas (`#ff3a00` -> `#ffd048`), com brilho vulcânico sutil.
   - **Capacete com Chifres:** Elmo fechado com dois grandes chifres curvados de pedra vulcânica com anéis de bronze na base e veias de lava.
   - **Visor Incandescente:** Fenda horizontal serrilhada com núcleo branco-amarelado de calor extremo e glow avermelhado externo.
   - **Manto Carmesim Rasgado:** Manto em múltiplas camadas de tecido nobre vermelho (`#480a10`, `#8d141e`, `#c9222a`), com pontas desfiadas e dinâmica de movimento/vento em idle, caminhada e habilidades.
   - **Símbolos e Acessórios:** Broche peitoral solar, fivela rúnica circular com estrela de 4 pontas no cinturão, avental vermelho rasgado e adaga/relíquia rúnica vulcânica flutuante no ombro.
   - **Chão e Pés:** Fissuras de lava sob os pés do guerreiro sobre o solo rachado.

2. **Montante Colossal de Lava (Espada Flutuante Independente):**
   - **Proporções:** Espada colossal de duas mãos (escala imponente em relação ao corpo).
   - **Lâmina:** Núcleo de rocha de obsidiana escura com fissuras de magma + bordas externas cortantes de puro fogo líquido/plasma de lava (`#ff3e06` -> `#ffe655`).
   - **Guarda e Pomo:** Guarda alada maciça em bronze e ouro antigo com garras recurvadas e **Gema/Núcleo Solar Incandescente** centralizado emitindo pulsações de luz.
   - **Cinemática:**
     - *Idle:* Repouso ao lado do corpo sem oscilação; a respiração sutil acontece somente no peitoral.
     - *Movimento:* Inércia reativa e rastros de brasas.
     - *Ataque Básico:* Corte fulminante com arco de fogo externo e núcleo amarelo.
     - *Golpe Fulminante:* Preparação elevada e liberação de onda cortante.
     - *Impacto Terrestre:* Cravada vertical no chão.
     - *Redemoinho:* Órbita veloz de 360° em torno do corpo.
     - *Brado de Guerra:* Empunhada bem alto em direção aos céus.
     - *Morte:* Fincada no solo ao lado do guerreiro caído.

3. **Efeitos Visuais das Habilidades (`efeitos/kaledron_visual_efeitos.js`):**
   - **Habilidade 1 — Golpe Fulminante (Cone frontal 140 unidades):**
     - Grande onda cortante de magma em formato de crescente com fio cortante amarelo-solar.
     - 7 fragmentos de rocha vulcânica / basalto arremessados na crista da onda com rotação física.
     - Rastro de fumaça e brasas na cauda com dissipação gradual.
   - **Habilidade 2 — Impacto Terrestre (Raio de 110 unidades):**
     - Cratera circular incandescente de lava e anel de choque.
     - 10 fissuras radiais de magma com padrão ziguezague.
     - 12 monólitos / lajes de basalto emergindo do solo com pilares verticais de fogo.
     - Explosão vertical de 22 fragmentos e brasas em ascensão.
   - **Habilidade 3 — Redemoinho de Aço (Raio 120 unidades, 3000ms):**
     - Três anéis concêntricos de fogo rodopiando em velocidades distintas.
     - 5 lâminas de luz de magma fatiando o ar ao redor de Kaledron.
     - 8 detritos de rochas vulcânicas orbitando centrifugamente no vórtice.
     - Finalização explosiva com clarão vulcânico radial de encerramento.
   - **Habilidade 4 — Brado de Guerra Vulcânico (10s bônus, 1200ms ativação):**
     - Onda de choque expansiva no chão.
     - 5 estandartes rúnicos vulcânicos flamejantes subindo majestosamente atrás de Kaledron com estrelas heráldicas e runas verticais.
     - 34 faíscas radiais em ascensão.
     - Aura persistente diferenciada: círculo de magma com pulso solar para Kaledron; halo rúnico dourado discreto para aliados.

---

### 3. Backups e Proteção

Para preservar o histórico sem sobrescrever cópias anteriores:
- `backups/kaledron_visual_rework_20261009/` (backup original da sessão anterior)
- `backups/kaledron_visual_rework_v2_20261009/` (backup completo pré-reconstrução atual):
  - `classes__kaledron_visual.js`
  - `efeitos__kaledron_visual_efeitos.js`
  - `index.html`

---

### 4. Inventário de Arquivos Modificados

| Arquivo | Função / Modificação |
|---|---|
| `classes/kaledron_visual.js` | Reconstrução procedural completa do corpo, armadura vulcânica, chifres, visor, manto rasgado, montante colossal de lava e cinemática de combate. |
| `efeitos/kaledron_visual_efeitos.js` | Reconstrução visual completa das 4 habilidades (Golpe Fulminante, Impacto Terrestre, Redemoinho de Aço, Brado de Guerra) e auras de bônus. |
| `index.html` | Atualização do cache-busting das tags de script (`classes/kaledron_visual.js?v=2` e `efeitos/kaledron_visual_efeitos.js?v=2`). |
| `tests/kaledron-visual-rework.test.js` | Atualização de regex de versão de cache e garantia de conformidade de contrato de testes. |
| `docs/KALEDRON_VISUAL_REWORK.md` | Registro de arquitetura visual e validação dos testes. |

---

### 5. Validação e Testes Executados

1. **Verificação de Sintaxe:**
   - `node --check classes/kaledron_visual.js` -> Aprovado (código 0).
   - `node --check efeitos/kaledron_visual_efeitos.js` -> Aprovado (código 0).
   - `node --check tests/kaledron-visual-rework.test.js` -> Aprovado (código 0).

2. **Suíte de Testes Automatizados:**
   - `node --test tests/kaledron-visual-rework.test.js` -> 3/3 aprovados.
   - `node --test tests/combat-range.test.js tests/monster-combat-telegraph.test.js tests/pets/monster-combat-executor.test.js tests/classes-visual-redesign.test.js tests/kaledron-visual-rework.test.js` -> 24/24 aprovados (100% de sucesso).

3. **Integridade das Regras de Combate:**
   - Nenhuma fórmula de dano ou regra de combate em `server.js` ou `skills.js` foi alterada.
   - O servidor autoritativo mantém estritamente os alcances, recargas e custos de mana canônicos.
