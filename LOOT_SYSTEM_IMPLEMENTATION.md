# Implementação do sistema de itens e loot

## Estado da implementação

Backup e auditoria inicial concluídos. O sistema data-driven está integrado ao
runtime do servidor para geração e operações de equipamentos; migração,
persistência e testes unitários estão implementados. Com autorização do usuário,
o servidor antigo foi encerrado e a versão atualizada reiniciada; a migração foi
aplicada e verificada no save real. O balanceamento permanece provisório e
atributos secundários sem fórmula confirmada continuam inativos. Ainda falta
validar fluxos multiplayer e falhas de I/O antes de declarar pronto para
produção.

## Backup obrigatório

- Data/hora local: 04/10/2026 00:23 BRT.
- Local: `E:\MMORPG_BACKUPS\pre-loot-system-20261004_0022`.
- Método: cópia integral do projeto com Robocopy, incluindo `.git` e
  `node_modules`.
- Verificação: 1.749 arquivos, 523,08 MB; quantidade e tamanho total conferidos
  contra `E:\MMORPG`; Robocopy terminou sem falhas.
- O backup deve ser preservado durante e depois da migração.

## Estado inicial do repositório

- Repositório: `E:\MMORPG` (`soutall/MMORPG-TALL`).
- Commit base observado: `c1944b4` (`Atualiza conteúdo do projeto`).
- O worktree já estava substancialmente modificado antes deste trabalho, com
  alterações, arquivos não rastreados e remoções em áreas alheias ao sistema de
  itens. Esses arquivos não pertencem a esta migração e não devem ser revertidos.
- O projeto real não está em `E:\Meu_RPG`, caminho indicado no prompt; a
  implementação deve permanecer em `E:\MMORPG`.
- O servidor já tem `NIVEL_MAXIMO = 100`; um comentário antigo menciona nível
  60, mas está desatualizado. O nível máximo de personagem permanece inalterado.
- Decisão confirmada pelo usuário: os itens usarão faixas até nível 100, sem
  alterar o limite atual dos personagens.
- Decisão confirmada pelo usuário: progressão e loot usarão os 18 biomas com
  IDs/nomes canônicos em `mapa_mundo.js`, não os 16 nomes divergentes do texto.
- `package.json` oferece somente `npm start`; os testes existentes são scripts
  Node avulsos.

## Auditoria do sistema de itens existente

### Dados e geração

- `equipamentos.js` combina configuração, tabelas de raridade, pools de status,
  escolha de slot, geração de itens, consumíveis, ouro e pedras de upgrade.
- A geração de equipamentos ocorre no servidor, mas as definições de armas e
  seus pesos estão codificados no mesmo módulo.
- A tabela atual tem quatro raridades (`comum`, `raro`, `epico`, `lendario`),
  sem `incomum`; não há nível/tier de item, rolagem individual, qualidade,
  perfeição, Item Power ou tabela de loot por bioma.
- Existem definições explícitas de armas para Guerreiro, Mago, Summoner,
  Arqueiro, Curandeiro, Ladino, Dronemaster, Arqueiro Arcano, Sniper e Pikeman.
  Bárbaro e Roqueiro estão vazios; Florim e Guerreiro Kaledron não têm entrada.
- O item real usa `id` e `uid`; não há registro global que impeça a mesma
  instância de constar em inventários diferentes.
- `banco_itens.js`/`banco_itens.json` guardam atualmente instâncias/configuração
  de armas administrativas e as injetam na tabela global de definições. A
  auditoria encontrou 11 entradas, o que mistura definição de item com item
  possuído.

### Inventário, persistência e operações

- A forma persistida principal é `inventario: { slots, mochila }`, dentro de
  `jogadores.json`; os dados atualmente contêm 36 personagens e nove variações
  de esquema. Nenhum identificador ou conteúdo individual de jogador foi
  copiado para este relatório.
- `database.js` lê e grava o arquivo JSON inteiro por operação; escreve em
  temporário e renomeia, mas não fornece transações entre jogadores nem
  serialização de gravações concorrentes.
- `server.js` controla drop no chão, coleta, equipamento/desequipamento,
  destruição, bloqueio, upgrade, uso/stack de consumíveis, movimentos da
  mochila, operações administrativas e trocas.
- Drops no chão e sessões de troca são estruturas apenas em memória. A troca
  transfere os itens e sincroniza inventários, mas não tem persistência atômica
  conjunta/rollback.
- A validação existente de classe se concentra em armas; não existe validação
  unificada de definição, proprietário único, estado e ID para todas as
  operações.
- `upgrade.js` e `ferreiro.js` implementam a forja e sua interface; a forja
  altera a instância e persiste o inventário pelo servidor.
- `item-admin.js` e um handler de `server.js` permitem a criação administrativa
  de armas e a inserção no banco global e na mochila.
- `inventario.js` apresenta diretamente o formato legado (`tipo`, `slot`,
  `raridade`, `status`, `classe`, `armaChave`, `id`/`uid`).

## Sistema data-driven implementado

- Configurações versionadas em `items/config/` e definições em
  `items/definitions/`: 14 classes, 28 armas, sete bases de armadura/acessório,
  cinco raridades, tiers, rolagens e tabelas associadas aos 18 biomas.
- `items/item-system.js` valida referências e pesos durante o carregamento,
  gera instâncias com UUID criptográfico, atributos, ataque/defesa escalados,
  qualidade, perfeição e Item Power, e oferece validação server-side dos dados.
- `items/migrate-inventories.js` atribui IDs comuns e preserva os dados legados;
  a migração é idempotente e rejeita colisões.
- `database.js` grava com lock, arquivo temporário, `fsync`, rename e atualização
  em lote; também persiste a migração ao iniciar uma nova instância.
- `server.js` usa a engine para equipamento de drops comuns, bosses e drops
  configurados, forja administrativa, coleta, validação, equipamento,
  desequipamento, upgrade e trade. Solari continua sem drops, como antes.
- `inventario.js` e o fallback em `index.html` propagam os metadados da instância;
  a interface mostra nível, nível necessário, Item Power, ataque/defesa,
  qualidade e perfeição. A raridade incomum também tem cor e ordenação.
- `tests/items/item-system.test.js` cobre geração e validação das classes,
  slots e biomas, adulteração, upgrades, defesa, migração e IDs duplicados.
  `tests/items/database-persistence.test.js` cobre persistência e migração em DB
  temporário.
- Validação mais recente: 14 testes aprovados, 0 falhas; `node --check` passou
  para `server.js`, `database.js`, `items/item-system.js` e `inventario.js`.
- O dry-run anterior à migração identificou 36 inventários/115 itens: 58
  equipamentos, 30 pedras e 27 consumíveis, sem colisões.
- Após reinício autorizado, o servidor concluiu a migração persistida de 115
  itens em 36 personagens. Uma verificação independente confirmou 115 IDs
  únicos e consistentes, zero inválidos e lock de banco liberado.
- O servidor atualizado responde HTTP 200 na porta 8080. Não foi executado um
  teste de login/combate multiplayer com personagem real.

## Decisões de arquitetura para a migração

1. Manter `server.js` como autoridade e expor módulos pequenos e testáveis.
2. Separar definições imutáveis/configuráveis de instâncias pertencentes a
   jogadores. Não manter dois geradores ou duas fontes de verdade em produção.
3. Fazer a migração em etapas compatíveis: validar e normalizar o formato salvo,
   atribuir IDs estáveis aos itens legados e só então trocar os produtores e
   consumidores. Não apagar nem regenerar itens existentes.
4. Usar UUID criptograficamente aleatório gerado no servidor como ID da
   instância; validar unicidade global e propriedade/estado em toda operação.
5. Concentrar definições de atributos, raridades, slots/pools, armas, biomas,
   faixas de nível, loot, rolagens, perfeição e Item Power em dados versionados.
6. Não inventar fórmulas de status secundário que ainda não existem no combate.
   Status sem consumidor de gameplay devem permanecer configuráveis e inativos
   até haver implementação autoritativa e testes.
7. Preservar consumíveis, ouro, pedras e upgrades como sistemas relacionados,
   integrando suas instâncias/identificadores ao modelo unificado sem alterar
   efeitos ou chances sem configuração explícita.
8. Executar operações de inventário e troca com validação prévia, atualização
   em memória e persistência confirmada antes de notificar sucesso. Para troca,
   preparar os dois resultados antes de gravar; falha de gravação não pode
   produzir confirmação parcial.

## Integração e limitações atuais

- As gravações de inventário usam o lock e gravação atômica do arquivo JSON;
  trocas gravam os dois inventários juntos. Drops e escrow de trade continuam
  em memória, mantendo o comportamento anterior durante a sessão.
- As ações de inserir, retirar e confirmar itens na troca agora validam que o
  solicitante é um dos dois participantes, evitando acesso externo ao escrow.
- O dano de armas novas é aplicado. Atributos principais rolados em `status`
  alimentam as fórmulas existentes de `getAtr`. Conforme decisão do usuário,
  a defesa equipada é subtraída do dano final em PvE, PvP e ambiente, mantendo
  no mínimo 1 de dano por acerto positivo.
- Os demais status secundários permanecem configuráveis/inativos quando não há
  um consumidor de gameplay existente. Não se deve inventar mitigação, evasão,
  crítico, roubo de vida ou outras fórmulas sem decisão de design.
- Tiers, pesos de raridade, faixas de item level e probabilidades de rolagem
  permanecem valores provisórios. Não houve validação de balanceamento em jogo.
- A cobertura atual automatizada é de engine e persistência isolada; não cobre
  uma sessão WebSocket multiplayer nem falhas reais de I/O durante cada handler.

## Plano de migração e validação

1. [x] Fazer e verificar backup integral antes de editar.
2. [x] Auditar arquivos e fluxos primários do sistema legado.
3. [x] Registrar estado inicial e riscos neste documento.
4. [x] Fechar o mapeamento canônico de classes e biomas; os valores de
   progressão e balanceamento seguem marcados como provisórios.
5. [x] Criar definições/configurações modulares, engine isolada e testes
   unitários iniciais de geração/validação.
6. [x] Criar o modelo de instância e a migração idempotente, preservando dados.
7. [x] Integrar geração e validação server-side a drops, coleta, inventário,
   equipamento, consumo, forja, administração e trade.
8. [x] Integrar loot tables por bioma/nível, classe, raridade, rolagens,
   qualidade, perfeição e Item Power.
9. [x] Tornar a engine a fonte de geração de equipamentos e manter os sistemas
   legados necessários para ouro, consumíveis e pedras.
10. [ ] Validar sessão multiplayer, reconexão e falhas em todos os handlers;
    os testes atuais são unitários/temporários, não testes de integração.
11. [x] Reiniciar com autorização do usuário e verificar a migração persistida
    no save real: 36 personagens, 115 IDs únicos, zero inválidos.
12. [x] Implementar a fórmula aprovada de defesa; os demais atributos
    secundários sem consumidor ou fórmula definida permanecem inativos.
13. [x] Atualizar este relatório com os resultados executados e as pendências.

## Testes de segurança exigidos

Validar IDs distintos para itens iguais e IDs estáveis após reinício; impedir
repetição entre inventários; rejeitar ID/status/raridade/Item Power forjados;
rejeitar equipamento, venda, destruição ou retirada de item de outro jogador;
garantir idempotência/rejeição de pickup repetido; exercitar desconexão e
reconexão durante loot e trade; testar falha de persistência sem sucesso
parcial; e garantir que ferramentas de geração continuem exclusivas do servidor
e de administradores.

## Limitações e pendências conhecidas

- O prompt enumera status secundários (penetração, evasão, resistências,
  precisão, roubo, regeneração e outros) que não têm todos fórmulas ou pontos
  de aplicação no combate atual. A mera inclusão na definição não deve ser
  apresentada como funcionalidade de gameplay.
- As configurações incluem as 14 classes e 28 armas descritas; os valores são
  provisórios e precisam de validação de balanceamento.
- Faixas finais de nível e probabilidades de raridade/rolagem/perfeição não
  estão especificadas por bioma. Os valores de exemplo no prompt não são
  balanceamento aprovado.
- A versão atual está rodando; o save foi migrado. Ainda é necessária uma
  sessão real de multiplayer para validar trade, combate e reconexão em jogo.
