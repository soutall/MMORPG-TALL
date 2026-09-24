# CORRECOES NECESSARIAS — MMORPG-TALL

1. ✅ **RESOLVIDO (v1.41.2)** — "index.html (linhas 1274-1311): adicionar window. as variaveis de cooldown": as linhas indicadas (cancelarTodasMiras) já usavam `window.modoMiraX`. As inconsistências reais de `window.` vs variável local afetavam `btn-roqueiro-banda`, `btn-tornado` e `btn-guerreiro-provocacao` (entradas do HUD liam flags que nunca eram setados) — unificados na v1.41.2.
2. ✅ **RESOLVIDO (v1.41.2)** — typo `tornadoCooldoownAtivo` → `tornadoCooldownAtivo` (declaração, cast e cancelamento).
3. index.html (896): revisar dpsValorEl/dpsTotalEl nulas
4. classes/comum.js (~20): corrigir limpeza global de _debuffIconCache
5. _tmp_check_arena.js: substituir caminho absoluto Windows
6. _test_intro.js: corrigir separador \\ para /
7. ✅ **RESOLVIDO (v1.41.2)** — "verificar cancelarCooldownVisual (mapamento consistente)": agora 49/49 — toda ação de `ACOES_SKILL_CANCELAVEIS` tem entry no `cancelarCooldownVisual` (as 7 skills novas do Slot 4 foram adicionadas) e não há entries órfãs.
