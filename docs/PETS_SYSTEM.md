# Sistema de Pets por Captura

## Visão geral

Este sistema foi construído sobre a arquitetura já existente do projeto, sem criar um segundo cadastro de monstros. A fonte de verdade continua sendo o registro de monstros do servidor em [spawns.js](../spawns.js), que exporta `TIPOS_MONSTROS` e `TAGS_MONSTRO`.

A fundação implementada nesta etapa prepara a base para:

- registro automático de espécies a partir dos monstros já existentes;
- separação entre espécie (`species_id`) e instância individual (`pet_instance_id`);
- preparação do Bestiário e da Maestria por espécie;
- validação de captura no backend;
- persistência em estruturas já compatíveis com o progresso do jogador;
- testes automatizados para validar a base.

## Arquitetura

Os módulos principais ficam na pasta [sistemas/pets/](../sistemas/pets):

- [sistemas/pets/pet_species.js](../sistemas/pets/pet_species.js): espécie e descoberta automática.
- [sistemas/pets/pet_instance.js](../sistemas/pets/pet_instance.js): instância individual do pet.
- [sistemas/pets/pet_bestiario.js](../sistemas/pets/pet_bestiario.js): bestiário e descobertas por espécie.
- [sistemas/pets/pet_maestria.js](../sistemas/pets/pet_maestria.js): maestria, XP e progressão.
- [sistemas/pets/pet_persistence.js](../sistemas/pets/pet_persistence.js): normalização de estado persistido.
- [sistemas/pets/pets_system.js](../sistemas/pets/pets_system.js): agregador da fundação do sistema.

### Integração no servidor

A carga do sistema foi registrada em [server.js](../server.js), seguindo o padrão de módulos do backend já usado no projeto. O módulo foi anexado em `global.PetSystem` para facilitar futuras integrações e uso em servidor e testes.

## Fonte de verdade dos monstros

A descoberta automática usa o catálogo de monstros já existente em [spawns.js](../spawns.js):

- `TIPOS_MONSTROS` é o registro oficial;
- qualquer novo monstro adicionado ao cadastro existente pode ser reconhecido automaticamente;
- a validação não duplica a listagem em arquivos isolados;
- Elite e Boss continuam sendo marcados por tags/flags do registro atual.

### Regra de Elite e Boss

A captura é bloqueada se qualquer uma destas condições for verdadeira:

- `tags` contém `elite`;
- `tags` contém `boss`;
- `conf.boss === true`;
- `conf.elite === true`;
- `conf.invenciveis` ou equivalente no catálogo atual.

Essa validação ocorre no backend, no módulo [pet_species.js](../sistemas/pets/pet_species.js), e nunca somente no cliente.

## species_id e pet_instance_id

### species_id

- identifica a espécie do monstro original;
- vem do identificador real do catálogo (`slime`, `besouro_dourado`, etc.);
- é usado como chave da espécie e do bestiário.

### pet_instance_id

- identifica a instância individual do pet capturado;
- segue o padrão `pet_` + UUID;
- nunca deve ser confundido com `species_id`.

## Bestiário

O bestiário foi preparado para acompanhar:

- `species_id`;
- nome da espécie;
- capturável;
- monstros mortos;
- capturas;
- XP de Maestria;
- nível de Maestria;
- maior level do pet capturado;
- maior raridade;
- skills conhecidas;
- passivas descobertas;
- habitat;
- recompensas e outras descobertas futuras.

A criação e atualização do registro ficam em [pet_bestiario.js](../sistemas/pets/pet_bestiario.js).

## Maestria

A maestria é separada do level do pet individual.

- o pet individual pode ter level próprio;
- a maestria pertence à espécie;
- todos os pets da mesma espécie compartilharem maestria no mesmo perfil/jogador.

A estrutura inclui:

- `nivelMaestria`;
- `xpMaestria`;
- `xpParaProximo`;
- `recompensas` futuras;
- evolução configurável por fórmula separada.

O cálculo ficou em [pet_maestria.js](../sistemas/pets/pet_maestria.js), com a fórmula centralizada em `computeMasteryXpGain` e `getMasteryXpToNext`.

## Persistência

A fundação usa um perfil do jogador com:

- `pets`;
- `bestiario`;
- `maestria`.

A normalização está em [pet_persistence.js](../sistemas/pets/pet_persistence.js), e o armazenamento em JSON já existente em [database.js](../database.js) continua sendo a base de persistência. Não foi criado um banco paralelo ou outro save.

## Dados e regras do sistema

Os dados base do pet estão representados em:

- `species_id`;
- `nome`;
- `monster_data` = referência ao monstro original;
- `skills`;
- `visual`;
- `tipo`;
- `level`;
- `elite`;
- `boss`;
- `capturavel`;
- `habitat`;
- `source_of_truth`.

Essas estruturas ficam em [pet_species.js](../sistemas/pets/pet_species.js), garantindo que futuramente qualquer monstro novo seja reconhecido sem cadastro duplicado.

## Testes

Os testes foram criados em [tests/pets/pets-system.test.js](../tests/pets/pets-system.test.js) e cobrem:

1. localização dos monstros existentes;
2. registro da espécie;
3. registro automático de monstros normais;
4. rejeição de Elite;
5. rejeição de Boss;
6. validação de `species_id`;
7. criação de `PetInstance`;
8. garantia de ID único;
9. XP de Maestria;
10. progressão de Maestria;
11. reconhecimento automático de novo monstro.

## Como adicionar um novo monstro

1. cadastre o monstro no catálogo atual em [spawns.js](../spawns.js);
2. o sistema o reconhece automaticamente via `TIPOS_MONSTROS`;
3. se não for Elite/Boss, ele estará elegível para captura;
4. a instância do pet pode ser criada via `createPetInstance` ou via o agregador `pets_system.js`;
5. o Bestiário e a Maestria são criados automaticamente por espécie.

## Captura server-authoritative

A captura agora é decidida no backend, nunca pelo cliente. A regra de autorização é centralizada em [sistemas/pets/pet_capture.js](../sistemas/pets/pet_capture.js).

O fluxo é:

1. valida jogador e alvo;
2. valida espécie e capturabilidade;
3. valida distância e estado do monstro;
4. valida cooldown e rate limit;
5. calcula chance no servidor;
6. aplica resistência e pity;
7. gera a instância do pet em caso de sucesso.

### Fórmula de captura

A fórmula foi modelada para considerar:

- level do jogador;
- level do monstro;
- diferença de level;
- HP atual em relação ao máximo;
- maestria da espécie;
- falhas consecutivas (pity);
- resistência temporária após falha.

Estrutura conceitual:

- base de chance por nível e diferença de level;
- bônus por HP baixo;
- bônus por maestria da espécie;
- bônus por pity (falhas acumuladas);
- penalidade por resistência aplicável.

A chance final é limitada em um range configurável para evitar captura impossível por diferença bruta, mas sem tornar a diferença de level uma condição absoluta.

### HP e janela de captura

O cálculo considera janelas de HP:

- acima de 75%: chance menor;
- 75%-50%: chance crescente;
- 50%-30%: chance alta;
- 30%-15%: janela ideal;
- abaixo de 15%: bônus extra, ainda sem garantir sucesso.

### Resistência e Pity

Após falha, a captura adiciona resistência temporária para a espécie. Isso reduz tentativas consecutivas até a janela expirar.

Também existe um pity por espécie:

- tentativas acumuladas;
- falhas acumuladas;
- melhor raridade já alcançada;
- melhor potencial já alcançado.

Esse histórico é usado para fortalecer gradualmente a chance sem transformar o sistema em garantia.

## Raridade, status, potencial e passivas

As raridades implementadas seguem a escala:

- comum;
- incomum;
- raro;
- épico;
- lendário.

A raridade influencia:

- atributos do pet;
- potencial;
- quantidade e qualidade das passivas;
- crescimento futuro do pet.

Os módulos responsáveis são:

- [sistemas/pets/pet_rarity.js](../sistemas/pets/pet_rarity.js)
- [sistemas/pets/pet_passives.js](../sistemas/pets/pet_passives.js)
- [sistemas/pets/pet_traits.js](../sistemas/pets/pet_traits.js)

### Status

O pet nasce com status aleatórios com base em:

- espécie;
- raridade;
- potencial;
- fator aleatório interno.

Os atributos base incluem campos reais e compatíveis com o projeto, como:

- vida;
- ataque;
- defesa;
- critico;
- velocidade;
- sorte.

### Potencial

O potencial é numérico e varia de 0 a 100. Ele cresce com o histórico da espécie, raridade e sorte da geração. Um pet raro pode ter potencial baixo e um pet comum pode ter potencial excepcional, sem tornar raridade automaticamente superior em todos os casos.

### Passivas e Traits

As passivas são modulares e data-driven, separadas por:

- universais;
- específicas de espécie.

Exemplos:

- Regeneração Arcana;
- Instinto Goblin;
- Catador;
- Ferocidade;
- Saqueador.

Traits também foram preparados em estrutura modular para comportamentos futuros, com exemplos:

- Agressivo;
- Leal;
- Cauteloso;
- Covarde.

## Pet XP e Pet Level

O level do pet é completamente separado da Maestria da espécie.

O pet individual possui:

- `pet_level`;
- `pet_xp`;
- `pet_xp_to_next`;
- crescimento por XP individual.

A lógica foi implementada em [sistemas/pets/pet_instance.js](../sistemas/pets/pet_instance.js), mantendo a separação com a Maestria em [sistemas/pets/pet_maestria.js](../sistemas/pets/pet_maestria.js).

## Persistência

A persistência do sistema continua integrada ao perfil do jogador e ao armazenamento do projeto já existente, com:

- `pets`;
- `bestiario`;
- `maestria`;
- `captureState`.

A normalização e o armazenamento ficaram em:

- [sistemas/pets/pet_persistence.js](../sistemas/pets/pet_persistence.js)
- [database.js](../database.js)

## Testes do sistema

A suíte em [tests/pets/pets-system.test.js](../tests/pets/pets-system.test.js) cobre:

1. captura válida;
2. captura inválida;
3. Elite rejeitado;
4. Boss rejeitado;
5. alvo morto;
6. distância inválida;
7. HP influencia chance;
8. level difference influencia chance;
9. resistência;
10. pity;
11. raridade;
12. status;
13. potencial;
14. passiva;
15. skills herdadas;
16. visual herdado;
17. ID único;
18. Pet XP;
19. Pet Level;
20. Maestria independente.

## Runtime integrado ao servidor

Pets ativos são instâncias em memória independentes de `lacaios`, mantidas em `petsAtivos` no [server.js](../server.js). Na captura bem-sucedida, a espécie é derivada do monstro real no mundo; o cliente não escolhe a espécie. O servidor cria o runtime para o primeiro Pet ativo do jogador e inclui as instâncias visíveis no pacote existente `world_update`. O cliente usa `desenharSlime`, o renderer de monstros existente, sem gerar um modelo genérico.

O servidor atualiza o runtime no loop de mundo, com intervalo mínimo de 150 ms por Pet. A movimentação usa `moverPetComColisao` e `posicaoPetValida`, compartilhadas com os lacaios. O passo é calculado pela velocidade server-side máxima já permitida ao jogador, multiplicada por 1,15 para acompanhar o dono e por 1,6 quando a distância passa de 300 px; o deslocamento escala com o tempo real entre ticks e é limitado a 250 ms para evitar saltos após uma pausa do loop. Assim, a cadência de IA não reduz a velocidade do Pet a 7 px por tick.

Follow/Return mantém distância e progresso. O detector de stuck só conta ticks em que havia uma tentativa real de navegação bloqueada; um Pet parado dentro do alcance de ataque durante COMBAT/cooldown não é considerado stuck. Em COMBAT, ausência de progresso encerra o alvo preso sem reposicionar o Pet junto ao dono. Recovery seguro por posição próxima ao dono fica reservado à navegação FOLLOW/RETURN bloqueada ou a uma separação extrema. O teste isolado de stuck intercepta `colideMundo` somente no processo filho de teste e injeta uma área circular temporária; nenhum mapa ou regra de colisão de produção é modificado.

Para o teste manual pelo cliente, aproxime-se de um monstro normal até ele ser selecionado pelo alvo automático e pressione `G` ou use **CAPTURAR ALVO** na janela de Pets para enviar `pet_capture` ao handler server-authoritative existente. O resultado aparece no toast atual. A interface nativa **🐾 Bestiário & Meus Pets** abre pelo botão do HUD ou tecla `B` e também está no menu lateral mobile. A aba Bestiário lista automaticamente espécies do catálogo de `spawns.js`; as não descobertas são mascaradas. A aba Meus Pets lista cada `PetInstance` individualmente, combina dados persistidos com HP/estado/modo atuais do `world_update` e oferece `ATK`, `DEFESA` e `PARADO` somente para o Pet ativo. Os comandos passam pelo handler existente `pet_set_mode`. O preview e o Pet no mapa usam `desenharSlime` e sprites/animações já existentes; estado `DEAD`/`RESPAWN` não é desenhado como entidade viva. `petProfile` no `init` e nos resultados de captura transporta o estado privado do próprio jogador e o catálogo derivado do registro; não foi criado outro websocket. Não existe troca de Pet ativo no backend e a interface informa essa limitação.

O mesmo `world_update` envia `animationState`, `animationStartedAt`, `animationUntil`, `aiAtacandoAte`, `aiEstado`, `moving`, `angulo` e `targetId` do Pet. `monstros.js` consome esses campos no `desenharSlime` compartilhado para selecionar os clips originais da espécie: `WALK` usa o clip de movimento, `ATTACK` usa o clip `action` e `HIT` usa o clip de dano existente. A direção vem da posição/facing runtime. O HP reduzido também é detectado pelo renderer original; não há animação ou renderer paralelo.

O Bestiário exibe somente campos presentes no perfil: abates/capturas, maior nível, skills/passivas conhecidas e maestria da espécie; maior raridade é derivada das instâncias reais possuídas. A descoberta de uma espécie em captura bem-sucedida registra o record de maestria inicial pelo helper existente, sem conceder XP. A UI não altera nem concede progresso. Atualmente os helpers para contabilizar abates, XP individual e XP de maestria não estão conectados a eventos de combate; portanto esses valores podem permanecer em zero.

Estados publicados pelo runtime:

- `IDLE`: sem perseguição/ataque;
- `FOLLOW`: acompanhando o dono;
- `RETURN`: recuperação quando muito distante;
- `COMBAT`: perseguindo ou atacando o alvo escolhido;
- `DEAD`: HP zerado, sem ataques;
- `RESPAWN`: após o cooldown, o runtime procura uma posição segura; quando a encontra, restaura HP e muda para `FOLLOW`.

Modos `ATK`, `DEFESA` e `PARADO` são aceitos pelo handler `pet_set_mode` apenas para o Pet ativo do dono, com rate limit e bloqueio para Pets mortos/em respawn. `ATK` busca monstros; `DEFESA` redireciona monstros com IA gerenciada que atacam o dono; `PARADO` interrompe a aquisição de alvos pelo Pet. Monstros normais podem selecionar como alvo um Pet vivo em `ATK` ou `DEFESA` quando alcance, mapa/instância e regras de aggro permitem; ataques que já miram um Pet ativo passam por `applyDamageToCapturedPet`, nunca por um HP paralelo. `PARADO` não cria aggro novo do monstro ao Pet. O servidor verifica owner, estado e mapa/instância. PvP continua fora do escopo desta etapa: suas estruturas existentes foram preservadas e não foram exercitadas por estes testes. Ao desconectar, os Pets ativos do dono são removidos do runtime; no login seguinte, a instância persistida é carregada novamente.

### Integração com combate e limites atuais

O módulo [monster_combat_executor.js](../sistemas/pets/monster_combat_executor.js) valida atacante/alvo vivos, alcance, validação server-side e cooldown antes de invocar o adaptador de ataque. Os ataques genéricos de Pets e monstros usam esse executor. Dano de Pet contra monstro/boss passa por `registrarDanoMonstro`/`registrarDanoBoss`; projéteis de Pet são processados no loop existente de projéteis. Monstros com IA gerenciada aplicam dano a Pets pelo handler de combate dessa IA; os caminhos especiais de área/projétil que foram integrados usam o mesmo `applyDamageToCapturedPet`. Nenhum pipeline de dano separado foi adicionado. Nesta etapa, a validação PvE não executa nem declara cobertura de PvP.

#### Skills herdadas

Somente duas habilidades compatíveis foram declaradas em `spawns.TIPOS_MONSTROS` e reutilizadas pelo Pet, sem criar um novo efeito:

- Cogumelo Proibido: projétil `cogumelo_veneno`, com os efeitos de veneno/confusão já associados ao projétil;
- Louvadermi: projétil `louva_folha`, com lentidão e roubo de mana existentes no tratamento desse projétil.

O perfil `petAttackSkill` fornece tipo, velocidade, duração e cooldown ao mesmo caminho de criação/colisão de projéteis. As outras habilidades não são herdadas: investida do Lanceiro, ataques `web`/`meteor`/`void_laser`, veneno em área do Scorpion e dash/voo do Besouro Negro dependem de telegraph, estado de IA, geometria ou efeitos específicos do monstro. O Cogumelo Proibido também cura/buffa aliados; isso não é uma skill ofensiva apropriada para o runtime de Pet. Elas continuam sendo comportamentos de monstros, não skills de Pet.

#### Validação real executada e limites

O teste [runtime-multiplayer.test.js](../tests/pets/runtime-multiplayer.test.js) inicia um processo novo do servidor em porta aleatória, usa um JSON e lock temporários por `MMORPG_DATABASE_FILE`, habilita login local loopback e autentica clientes WebSocket pelo fluxo `login` + `personagem_selecionar`. O ambiente usa três personagens sintéticos: A e B para combate PvE simultâneo e C para exercitar captura sem substituir os Pets de A/B. Os personagens de teste usam o cheat server-side de vida infinita, habilitado somente no servidor isolado, para não morrerem no grupo de monstros durante a verificação.

O teste observou:

- `/health` respondeu `200 OK` no processo recém-iniciado;
- clientes A e B receberam ambos os Pets e monstros por `world_update`;
- o Pet A mudou de posição após movimento real do dono;
- Pet A disparou `cogumelo_veneno` e Pet B disparou `louva_folha`; cada projétil carregou um alvo monstro vivo validado pelo servidor e houve redução de HP em monstros reais próximos pelo fluxo existente;
- monstros naturais do mundo reduziram o HP do Pet A em modo `ATK` e dos Pets A/B em `DEFESA`;
- o combate do Pet publicou `animationState: ATTACK` junto do projétil real; um teste do próprio renderer `desenharSlime` comprovou que esse estado escolhe o clip `action` da espécie e `HIT` escolhe o clip de dano;
- a captura foi solicitada com o ID de um slime vivo do mundo e aceita após validação server-side; o monstro ficou com HP 0, XP do jogador não aumentou e não surgiu drop novo;
- a `PetInstance` capturada e o `petActiveId` foram lidos no arquivo temporário persistido; ao desconectar C, o runtime foi removido, e após autenticar C novamente o Pet persistido reapareceu no runtime;
- um monstro real reduziu o HP do Pet capturado até `DEAD`; comando de troca de modo foi recusado nesse estado; a sequência observada foi `DEAD → RESPAWN → FOLLOW`, com HP restaurado e posição próxima/segura do dono;
- um teleporte server-side do dono A a distância maior que 900 px levou o Pet ao estado `RETURN` e a reposicionamento próximo ao dono;
- ao desconectar A/B, seus Pets foram removidos; uma reconexão de B carregou o Pet persistido e B continuou recebendo `world_update`.

O teste de obstáculo em processo isolado confirmou o caminho real de stuck recovery: Pet vivo em `FOLLOW`, gap inicial do dono de 76 px e movimento prévio mensurável (> 0,75 px); em seguida a colisão circular temporária bloqueou a navegação. O handler de colisão rejeitou 462 tentativas; foram observadas seis amostras de `world_update`, sem deslocamento mensurável no trecho bloqueado (0 px) e ausência sustentada de progresso por 1.571 ms. O runtime detectou a condição e, em 1.666 ms, publicou `RETURN` e reposicionou o Pet de (142798, 13016) para (142684, 13016), a 42 px do dono e 114 px do centro do obstáculo (além dos 104 px do raio do obstáculo somado ao raio de colisão do Pet). Após remover a obstrução e mover o dono, o estado voltou a `FOLLOW`. O obstáculo existiu apenas no hook do subprocesso de teste; nenhum mapa de produção foi alterado. Isso valida recovery de runtime neste cenário controlado, não todos os obstáculos/geometrias. Também não foi aguardado o ciclo natural completo de respawn do monstro capturado (aproximadamente 120 s).

Skills especiais ainda não herdadas: investida do Lanceiro, `web`, `meteor`, `void_laser`, veneno AoE do Scorpion, dash/voo do Besouro Negro e cura/buff do Cogumelo Proibido. Elas dependem de telegraph, geometria, estado de IA ou alvo/área próprios do monstro e não foram convertidas. Bosses, a matriz completa de AoE/skills de jogador e PvP não foram testados nesta etapa. PvP permanece explicitamente fora de escopo e será tratado depois.

## Validação automatizada conhecida

Validação focada: `node --test` sobre os arquivos `tests/pets/*.test.js` (32 testes: testes UI/sistema/executor, dois testes de integração WebSocket PvE/stuck e o teste de clip ATTACK/HIT do renderer compartilhado), 32 aprovados e nenhum falho. A suíte completa executou 122 testes, com 119 aprovados e 3 falhos fora de Pets: `map-object-mutations.test.js` ainda exige `GAME_VERSION` `v1.75.43`; `map-village.test.js` espera 93 objetos e encontra 139; `websocket-reconnect.test.js` ainda exige `GAME_VERSION` `v1.75.47`. Essas são as mesmas três falhas gerais já observadas antes destas correções e nenhum arquivo de mapa/versão foi alterado nesta rodada.

Com PvP fora do escopo, o fluxo PvE — captura real até runtime, sincronização multiplayer, ataques herdados, dano de monstros, morte e respawn, Follow, RETURN por distância e stuck recovery contra obstáculo controlado — foi observado nos testes de integração. O teste de stuck passou isoladamente e na execução focada completa após tornar o início da obstrução independente de snapshots atrasados do movimento do dono. Isso não declara PvP concluído.

## Arquivos principais

- [spawns.js](../spawns.js)
- [server.js](../server.js)
- [database.js](../database.js)
- [sistemas/pets/pet_species.js](../sistemas/pets/pet_species.js)
- [sistemas/pets/pet_instance.js](../sistemas/pets/pet_instance.js)
- [sistemas/pets/pet_bestiario.js](../sistemas/pets/pet_bestiario.js)
- [sistemas/pets/pet_maestria.js](../sistemas/pets/pet_maestria.js)
- [sistemas/pets/pet_persistence.js](../sistemas/pets/pet_persistence.js)
- [sistemas/pets/pet_ai.js](../sistemas/pets/pet_ai.js)
- [sistemas/pets/pets_system.js](../sistemas/pets/pets_system.js)
- [sistemas/pets/pets-ui.js](../sistemas/pets/pets-ui.js)
- [sistemas/pets/pets-ui.css](../sistemas/pets/pets-ui.css)
- [tests/pets/pets-ui.test.js](../tests/pets/pets-ui.test.js)
- [tests/pets/pets-system.test.js](../tests/pets/pets-system.test.js)
