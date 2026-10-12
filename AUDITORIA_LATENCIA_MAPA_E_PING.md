# Auditoria de Latência, Ping, Renderização do Mundo e Editor de Sprites — MMORPG

**Projeto auditado:** `E:\MMORPG`  
**Data da auditoria:** 11/10/2026  
**Escopo:** inspeção estática de código, arquivos de mapa/configuração e testes automatizados já existentes.  
**Restrição solicitada:** não corrigir nem editar código, configurações, dados do jogo ou assets. **Este relatório é a única criação prevista nesta auditoria.**  
**Dispositivo analisado:** `DESKTOP-93PM11V`

---

## 1. Resumo executivo

O projeto é um MMORPG web com cliente Canvas 2D, servidor Node.js e comunicação por WebSocket. A latência medida no cliente não depende só da rede: ela também pode aumentar se a thread principal do navegador estiver ocupada renderizando/gerando mapa, ou se o event loop do Node estiver bloqueado por operações síncronas.

**O candidato mais forte para picos de ping ocorridos durante a edição/colocação de sprites é a combinação de persistência síncrona do mapa + serialização/broadcast da lista completa de objetos a todos os clientes.** A cada colocação feita pelo pincel, o editor envia um objeto, o servidor grava novamente o JSON inteiro e transmite o mapa inteiro. Em pintura contínua, essa sequência pode acontecer muitas vezes seguidas.

**Há também risco de picos fora do editor:** o servidor envia snapshots `world_update` a cada 50 ms (20 vezes/s) para cada WebSocket, com vários grupos de entidades e estado dos jogadores. A renderização procedural dos chunks usa a mesma thread principal que processa mensagens WebSocket no navegador. Qualquer stall em uma dessas duas pontas pode parecer “ping de rede” alto.

A auditoria não reproduziu um pico real de 2.000 ms. As causas abaixo são classificadas como achados de código, riscos condicionais ou hipóteses que precisam ser confirmadas com medições simultâneas de FPS, RTT e event-loop lag.

### Principais conclusões

| Prioridade | Achado | Confiança | Impacto potencial |
|---|---|---|---|
| **P1 — alto** | Salvar o mapa por escrita síncrona completa a cada objeto editado | Confirmado no código | Bloqueia o event loop durante a gravação/serialização |
| **P1 — alto** | Broadcast serializa a lista completa de objetos separadamente para cada cliente | Confirmado no código | CPU/GC e tráfego crescem com clientes e tamanho do mapa |
| **P1 — alto** | Snapshots de mundo são enviados a cada 50 ms com múltiplas listas de entidades | Confirmado no código; custo real não medido | CPU, JSON e tráfego recorrentes |
| **P1 — alto, condicional** | O pincel de pintura envia/salva um objeto em cada passo do arraste | Confirmado no código | Pode provocar rajadas de gravações e broadcasts no editor |
| **P1/P2** | Geração procedural de chunks roda na thread principal do navegador | Confirmado no código | Pode atrasar o callback do pong e inflar o RTT medido |
| **P2 — médio** | A lista global de sprites/objetos inclui objetos de outros mapas | Confirmado no código | Tráfego, desserialização e memória desperdiçados |
| **P2 — médio** | Dados de colisões/camadas de todos os mapas são enviados no login | Confirmado no código | Inicialização mais pesada e alocação extra |
| **P2 — médio, condicional** | Persistência do progresso usa leitura, JSON, fsync e rename síncronos | Confirmado em `database.js`; frequência não medida | Se acionada frequentemente, bloqueia a thread do servidor |
| **P2 — médio** | HTTP entrega assets com `no-store/no-cache` | Confirmado no código | Recarregamentos baixam e decodificam tudo novamente |
| **P2 — risco de memória** | Cache de glows do otimizador não tem limite/evicção | Confirmado no código; cardinalidade em runtime não medida | Pode crescer se a aplicação pedir chaves cor/raio continuamente novas |
| **P3 — diagnóstico** | O indicador de ping usa estimador por janela/mediana | Confirmado em módulo/testes | Suaviza outliers, mas o valor mostrado não localiza a origem do atraso |

---

## 2. Evidências e análise do editor de mapa/sprites

### 2.1 Tamanho real de `map_objetos.json`

O arquivo foi lido e contado sem modificá-lo. Resultado observado durante a auditoria:

- Tamanho em disco: **1.825.825 bytes (aprox. 1,74 MiB)**.
- Objetos persistidos: **175**.
- Distribuição por mapa: `mundo: 82`, `nebulos: 61`, `pantano: 17`, `desert: 6`, `bemvindo: 5`, `floresta: 4`.
- Objetos de sprite personalizado com asset: **82**.
- Objetos que incluem `assetMaskRaster`: **82**.
- Soma dos campos Base64 dessas máscaras: **397.084 bytes**.
- A maior máscara encontrada ocupava aproximadamente **23 KB** em Base64; as seguintes maiores estavam perto de 18 KB.

O número atual de objetos (175) não é especialmente alto. O problema é o **caminho de atualização**, porque operações de edição repetem serialização, escrita e envio do conjunto inteiro, em vez de persistir/propagar só a alteração.

### 2.2 Colocação pelo pincel admin

Em `mapa-editor.js`, `colocarNoPonto()` adiciona o objeto a `window.mapaObjetos` e chama `enviarNovoObjeto()`. O envio de cada objeto inclui campos de asset, região de recorte, escala/rotação/camada, máscara de transparência em Base64, máscara de colisão e divisão de profundidade quando existentes.

Durante pintura contínua, `onMouseMove()` chama `colocarNoPonto()` sempre que a distância desde o passo anterior atinge o intervalo definido (normalmente entre 10 e 28 unidades, conforme o pincel). No toque, também há colocação repetida quando a distância alcança o intervalo configurado.

Cada passo pintado envia uma mensagem WebSocket própria. Portanto, pintar muitas árvores/sprites rapidamente não constitui uma única operação em lote.

### 2.3 Escrita síncrona do JSON completo

No servidor, `salvarMapObjetos()` chama:

```js
fs.writeFileSync(MAP_OBJETOS_FILE, JSON.stringify(mapObjetos, null, 2), 'utf8');
```

Isso serializa e grava o arquivo completo de ~1,83 MB no thread principal do Node, bloqueando o event loop até a operação concluir. O caminho é chamado nos handlers de criar/editar/excluir/sincronizar objetos.

**Consequência provável:** durante uma rajada de operações do editor, o servidor pode deixar de processar pings e snapshots por tempo suficiente para causar saltos de RTT. É especialmente provável quando o atraso coincide com colocação, pintura ou sincronização de sprites.

### 2.4 Broadcast caro e global

`broadcastMapObjetos()` percorre todos os clientes WebSocket abertos e executa a serialização de `{ type: 'map_objetos', objetos: mapObjetos }` dentro do loop de cada cliente. Assim, o mesmo objeto global é serializado novamente para cada cliente.

Além disso, os clientes recebem objetos de todos os mapas, e não apenas do mapa em que estão. O mesmo pacote completo é enviado na entrada de um novo personagem e após mutações de objetos.

O custo aproximado de saída cresce com a quantidade de clientes: com N clientes, há N serializações do conjunto inteiro, além dos envios. Não foi medido o throughput real porque não foi feito teste de carga.

**Correção recomendada:**
1. Serializar o payload uma única vez por alteração e reutilizar a string no broadcast.
2. Separar o fluxo de edição administrativa do fluxo de gameplay.
3. Enviar objetos filtrados por mapa aos jogadores comuns; enviar o conjunto necessário ao admin somente quando abrir/usar o editor.
4. Usar eventos incrementais para gameplay (objeto criado/alterado/removido) em vez de retransmitir o JSON completo em toda mutação.
5. Agrupar alterações em lote durante a pintura, com gravação e broadcast únicos após debounce ou ao terminar o traço.
6. Persistir os dados com uma fila/coalescência e gravação atômica assíncrona, mantendo confirmação de sucesso e recuperação de erro.

**Cuidado:** não remover objetos de mapas distintos durante sincronização; os testes existentes explicitamente esperam preservá-los.

### 2.5 Sincronização administrativa e custo algorítmico

O handler `admin_map_objetos_sync` aceita até 5.000 objetos por pedido, normaliza cada item e mescla objetos usando `findIndex` na lista existente. O padrão pode custar O(M×N) em listas grandes. Depois, salva o JSON inteiro e transmite toda a lista.

O limite de 5.000 objetos protege contra quantidades ainda maiores, mas **não é um limite de payload em bytes** e não impede uma sincronização grande ou cara.

**Correção recomendada:** indexar IDs com `Map`/`Set`, validar tamanho em bytes além da quantidade de itens, processar em lotes com limite e persistir/broadcast somente uma vez por operação.

### 2.6 Máscaras rasterizadas/Base64 e assets

As máscaras são válidas para preservar o recorte de atlas e evitar vazamento de pixels adjacentes. Não recomendo removê-las indiscriminadamente: elas têm finalidade visual e de colisão.

O custo vem de replicar a máscara serializada em cada objeto/snapshot de edição, salvar tudo como JSON com indentação e mandar os campos para clientes que não precisam deles durante gameplay.

**Correção recomendada:** separar a definição do sprite (atlas, recorte e máscara) da instância colocada no mapa. Manter a máscara uma vez por `spriteId`/asset definido na paleta e referenciar o ID em instâncias, ou carregar metadados sob demanda. Avaliar manter colisões e máscara raster somente onde realmente são necessárias.

Foi observado que `map_sprite_palette.json` **não existia** no diretório consultado, apesar de o servidor possuir caminho de leitura/gravação e fallback para lista vazia. Isso não prova defeito na colocação atual, pois os 82 objetos persistidos usam assets e máscaras no próprio JSON. Se a paleta virtual estiver sendo usada na interface, verificar se a ausência é esperada ou se configurações foram perdidas.

---

## 3. Snapshots `world_update` e carga do WebSocket

### 3.1 Frequência e conteúdo

O servidor transmite `world_update` a cada **50 ms (20 vezes por segundo)** para cada cliente WebSocket aberto. A mensagem inclui, conforme o mapa/instância, listas e objetos como:

- jogadores visíveis e seus atributos/efeitos;
- slimes/monstros;
- projéteis do servidor e do jogador;
- lacaios, pets e entidades do Lord Malakar;
- bosses, drops, gases;
- VFX do mapa;
- entidades específicas de classes e outros grupos.

O servidor prepara `playersVisivel` a partir dos jogadores online a cada tick, clonando objetos e calculando campos visuais/modificadores. Também filtra os jogadores pertinentes para cada cliente e serializa um snapshot por conexão.

Há cache de coleções por mapa/instância dentro do tick, o que é positivo. Ainda assim, as estruturas de players e parte dos dados são percorridos ou montados por destinatário, e cada cliente recebe um JSON inteiro por tick. Com mais jogadores, efeitos e projéteis, o volume total e o custo de GC podem crescer significativamente.

### 3.2 Melhorias recomendadas

1. **Medir tamanho de cada `world_update` em bytes** e taxa enviada por cliente.
2. Fazer diff de estado e enviar apenas campos alterados quando isso for seguro, usando snapshots completos em intervalo mais baixo como ressincronização.
3. Filtrar entidades por mapa/instância e, se viável, por área de interesse (interest management).
4. Evitar clonar/computar campos caros que não serão transmitidos a determinado cliente.
5. Reutilizar payloads quando vários clientes compartilham exatamente o mesmo estado visível; manter payload individual apenas para dados realmente específicos (por exemplo, instância/estado do destinatário).
6. Monitorar a duração do tick e o tamanho dos arrays globais de entidades.
7. Separar eventos frequentes de movimentação de eventos raros de combate/configuração; limitar ou coalescer updates redundantes.
8. Não reduzir a frequência sem testar a suavidade da movimentação, predição e reconciliação.

### 3.3 Broadcast global de ações de combate

O servidor tem um wrapper que filtra certos tipos de eventos de combate por mapa/instância, mas existem handlers legados que percorrem `wss.clients` diretamente para enviar efeitos. Nem todo broadcast global é necessariamente bug, mas devem ser auditados os tipos que não passam pelo filtro contextual. Evento visual enviado a quem não está no mesmo mapa pode adicionar tráfego desnecessário.

**Ação recomendada:** catalogar cada tipo de broadcast e definir claramente se é global, por mapa, por instância, por grupo ou por raio. Centralizar os envios em helpers com regras consistentes e cobrir com testes de isolamento.

---

## 4. Ping: o que o número representa e como diagnosticar

### 4.1 O cálculo é RTT de WebSocket, não só latência física da rede

O servidor tem uma ação `ping` que devolve um `pong` com o timestamp do cliente, horário do servidor e `loopLagMs`. O cálculo de RTT inclui:
- atraso de envio/recepção da rede;
- tempo até o event loop do servidor processar a mensagem;
- tempo de serialização e fila de mensagens;
- tempo até o navegador voltar a processar o callback de resposta.

Se a thread do navegador está bloqueada com renderização, GC ou geração procedural, o ping mostrado pode saltar mesmo em localhost.

### 4.2 Estimador de ping

`ping-estimator.js` mantém uma janela curta de amostras e usa mediana, aguardando amostras iniciais e descartando inválidas. Os testes confirmam que outliers isolados são suavizados. Isso é útil para evitar oscilações, mas **não aponta a causa do atraso**. Um bloqueio sustentado pode elevar a estimativa; spikes muito curtos podem ser ocultados pela mediana.

### 4.3 Diagnóstico de event loop

O servidor mede atraso do event loop com `monitorEventLoopDelay({ resolution: 20 })` e inclui `loopLagMs` no `pong`. A amostra atual guarda o máximo observado no intervalo, não uma decomposição completa do RTT. É um indicador importante, mas deve ser correlacionado com a medição do cliente.

Há também logging `[ESTADO]` com `fps`, `ping`, `ws` e `updMs`, recebido pelo handler `client_estado`. Esse log pode ajudar a cruzar sintomas do cliente.

**Limitação observada:** não confirmei que a interface atual exibe ou registra de forma visível o `loopLagMs`. O campo existe no pong; isso não garante que o usuário tenha acesso a ele.

---

## 5. Renderização procedural e câmera

### 5.1 Geração de chunks

`mapas/mapa_mundo.js` define um mundo 2.5D procedural de aproximadamente **88.000 × 28.000 unidades**, com chunks de 512 px, resolução de texel 2, prévia de chunk, pré-carregamento direcional e fila de geração.

A geração e o raster dos chunks executam na thread principal do browser, a mesma que trata callbacks WebSocket, input e pintura do canvas. O código tenta limitar o orçamento da fila a aproximadamente:
- 6 ms durante estado de carregamento explícito;
- 1,5 ms enquanto o jogador está se movendo;
- 0,75 ms quando está parado.

O pré-carregamento ocorre a cada 250 ms enquanto o jogador se desloca. A geração processa a fila, ordenando chunks por prioridade/distância. Quando a quantidade de chunks excede 220, o código converte o cache em array, ordena por distância e reduz para 180 chunks, filtrando a fila.

Esses limites são medidas defensivas úteis, mas não eliminam picos em todos os caminhos: garantir chunks visíveis, rasterização, ordenação/expurgo do cache, desenho de objetos e coleta de lixo ainda podem bloquear a main thread. O expurgo por ordenação completa é um ponto específico a medir quando o cache cruza o limite.

### 5.2 Como testar sem mudar código

O código de diagnóstico de desempenho é opt-in pela query `?perf=1` segundo os testes existentes. Abra a instância local com esse parâmetro no URL e observe as medições que o jogo disponibilizar. Se houver painel/log do perfil, registre fases de simulação, mundo, mapa, sprites, restante, FPS e tamanho de Canvas durante o pico.

Reproduza em condições controladas:
1. Local parado, sem abrir admin.
2. Andar por um terreno já carregado.
3. Cruzar para áreas ainda não geradas/pre-carregadas.
4. Abrir/fechar minimapa e mapa global.
5. Fazer uma sessão de pintura de sprites.
6. Repetir com editor fechado, sem alterar outras variáveis.

A auditoria confirma que há métricas de profiling implementadas e testadas por fonte, mas não executou uma sessão gráfica para capturar os valores em tempo real.

### 5.3 Recomendações para a renderização

- Registrar separadamente duração de geração de chunk, rasterização, poda/sort do cache, renderização de sprites e desenho auxiliar.
- Garantir que o trabalho pesado seja dividido em fatias pequenas; evitar que uma tarefa ultrapasse o orçamento por causa de loops internos indivisíveis.
- Pré-gerar texturas/elementos determinísticos fora do caminho crítico do frame quando possível.
- Considerar Worker para cálculos puros de ruído/posições, transferindo dados compactos para Canvas; canvas e DOM principal permanecem na main thread.
- Manter prévias de chunk de baixa resolução até a versão completa ficar pronta.
- Evitar regenerar a mesma textura determinística; conservar o cache limitado e reutilizável.
- Monitorar quantidade de chunks, tamanho de canvases offscreen e memória.
- Medir FPS e ping lado a lado. FPS baixo e ping alto no mesmo momento sugere bloqueio do cliente como hipótese.

---

## 6. Possível vazamento de memória e alocação excessiva

### 6.1 Cache de glows do otimizador

Em `engine_otimizador.js`, a função `obterGlowSprite(cor, raio)` cria canvases e guarda referências em `_glowCache = new Map()`. No trecho auditado, não há limite de cardinalidade nem política de evicção.

O raio é limitado ao intervalo 8–64, mas a chave contém a string de cor. Se os chamadores passarem um conjunto finito de cores, o cache permanece limitado na prática. Se passarem cores dinamicamente variadas (RGBA em valores contínuos, cores geradas por efeito etc.), as entradas e os canvases poderão acumular durante a sessão.

**Classificação:** risco condicional, não vazamento comprovado em runtime.  
**Correção sugerida:** restringir paleta/normalizar chaves e/ou aplicar LRU/limite máximo de entradas; registrar tamanho e memória estimada em debug.

### 6.2 Alocação/GC no servidor

O snapshot cria objetos clonados e arrays/objetos derivados por tick, além de serializar JSON para cada cliente. A repetição a 20 Hz cria pressão de alocação e pode provocar pausas de GC. Isso não é um leak por si só, mas pode causar picos se a taxa de alocação for alta.

**Correção sugerida:** usar profiling do Node (`--cpu-prof`, heap snapshots em ambiente de teste, métricas de RSS/heap e duração de GC) antes de reescrever estruturas. Evitar remover campos através de clones temporários quando for possível construir payloads enxutos uma única vez por mapa/instância.

### 6.3 Timers e entidades temporárias

O código contém muitos timers e arrays de VFX/projéteis; vários caminhos explicitamente removem entidades por TTL ou usam `splice` ao expirar. Não é possível afirmar um leak geral apenas com a leitura estática. Precisam ser medidos:
- tamanho de arrays ao longo de uma sessão longa;
- timers restantes após desconexão, troca de mapa e morte;
- referências a jogadores desconectados;
- limites e remoção de efeitos temporários;
- tamanho de caches e canvases auxiliares.

### 6.4 Cache dos chunks

O mapa possui controle explícito: acima de 220 chunks, reduz para 180. Isso é proteção positiva. Porém, o caminho de poda converte e ordena as entradas; medir o pico de CPU nesse momento. Também vale verificar se todo estado auxiliar associado a um chunk é removido quando ele é expurgado.

### 6.5 JSON de progresso

`database.js` salva em arquivo JSON completo usando `JSON.stringify`, gravação síncrona, `fsyncSync`, rename e lock. O arquivo observado `jogadores.json` tinha cerca de 266 KB e 51 registros. No tamanho atual, uma gravação isolada pode ser aceitável, mas as chamadas síncronas bloqueiam o event loop. O efeito depende da frequência com que `salvarProgresso()` é chamado durante movimento/combate; essa frequência não foi quantificada nesta auditoria.

**Correção sugerida:** medir chamadas por minuto e tempo de gravação; coalescer salvamentos repetidos, limitar a frequência de persistência por personagem e, se necessário, mover para uma fila de I/O assíncrono ou banco de dados com transações.

---

## 7. Cache HTTP e carregamento de sprites

O servidor HTTP do projeto configura `Cache-Control: no-store, no-cache, must-revalidate` nas respostas estáticas. Isso faz o browser tratar assets como não reutilizáveis de modo eficiente, incluindo scripts, CSS e imagens, dependendo da forma como cada recurso é solicitado.

Isso é mais provável causar downloads repetidos, decodificação de imagem e espera na inicialização/reload do que spikes de RTT contínuos durante uma sessão estável. Ainda assim, aumenta a carga de carregamento e pode piorar a experiência quando o jogo recarrega assets.

**Correção sugerida:**
- Usar cache imutável para assets versionados por hash/version query.
- Dar prazo de cache apropriado para imagens, sons, CSS e scripts com invalidação confiável.
- Manter `no-store` apenas em endpoints dinâmicos/sensíveis.
- Verificar no DevTools Network se as imagens do editor são baixadas repetidamente e quanto custa o decode.

---

## 8. Tratamento de erros e segurança operacional

### 8.1 Captura global de exceções

O servidor registra `uncaughtException` e `unhandledRejection`, mas o trecho visto mantém o processo ativo após `uncaughtException`. Continuar após uma exceção não tratada pode deixar estado parcialmente corrompido. É uma preocupação de estabilidade, não uma causa direta comprovada do ping.

**Recomendação:** registrar a exceção, iniciar encerramento controlado e reiniciar pelo supervisor depois de garantir persistência/limpeza, em vez de presumir que o estado permanece consistente.

### 8.2 Payload máximo WebSocket

O servidor permite payload de até 8 MiB. O comentário está relacionado às máscaras raster do editor. O limite evita mensagens arbitrariamente maiores, mas 8 MiB continua grande para uma operação de gameplay rotineira. Payloads administrativos devem ter limites de tamanho explícitos e ações normais devem permanecer pequenas.

**Recomendação:** manter um limite compatível com os maiores recortes realmente suportados, validar `Buffer.byteLength`/comprimento antes de processar/serializar e impor limites específicos por ação. Evitar reduzir o limite geral sem avaliar o editor de Laço 2, que depende de máscaras maiores.

### 8.3 Arquivos privados no servidor HTTP

A lista `arquivosPrivados` contém `map_objetos.json`, `map_sprite_palette.json` e `map_vfx.json`, entre outros arquivos. A proteção de `map_objetos.json` foi confirmada. A pasta do projeto também contém um conjunto extenso de assets e scripts. Recomenda-se uma revisão separada da política de servir arquivos para garantir que arquivos de diagnóstico, backups, scripts internos, dumps de perfil e dados privados também estejam bloqueados.

---

## 9. Testes executados e limites desta auditoria

Foi executado, a partir da raiz `E:\MMORPG`:

```powershell
node --test tests/ping-estimator.test.js tests/map-object-mutations.test.js tests/map-sprite-palette.test.js tests/render-performance.test.js tests/websocket-reconnect.test.js tests/world-map-camera-viewport.test.js
```

**Resultado: 47 testes passaram; 0 falharam; duração informada pelo runner: aproximadamente 174 ms.**

Os testes cobrem, entre outros:
- estimador de ping e outliers;
- sincronização e exclusão de objetos pelo editor;
- máscaras/recortes de sprites;
- profiling de renderização e orçamento de chunks;
- envio de FPS separado de ping;
- supressão de estados de movimento ociosos;
- sincronização de jogadores e câmera;
- reconexão WebSocket.

**Importante:** muitos desses testes são unitários ou verificam padrões do código-fonte. A aprovação não é um teste de estresse do servidor e não garante ausência de lag real sob carga.

Não foram executados:
- teste de carga com vários clientes;
- medição real e contínua de RTT local durante jogo;
- perfil de CPU do Node;
- heap snapshot/memória de longa duração;
- trace de frames do Chrome;
- medição de bytes dos `world_update` reais em execução;
- reprodução controlada do spike de 10 ms → 2.000 ms.

Não reiniciei o servidor nem alterei arquivos do projeto.

---

## 10. Plano de diagnóstico recomendado — antes de corrigir

A primeira meta é determinar qual thread está bloqueando; não alterar diversos sistemas ao mesmo tempo.

### Experimento A — ping alto, mundo quieto

1. Abrir o cliente local e aguardar a inicialização.
2. Permanecer parado e sem abrir ferramentas admin.
3. Registrar FPS, ping, `loopLagMs` do pong se disponível e logs `[ESTADO]`.
4. Observar por 3–5 minutos.

**Interpretação:**
- Ping alto + `loopLagMs` alto: suspeita forte de event loop do servidor bloqueado.
- Ping alto + FPS caindo, mas `loopLagMs` normal: suspeita de main thread do navegador/renderização.
- Ping alto com FPS estável e loop lag normal: investigar fila/tamanho das mensagens, rede, proxy, extensão ou medição do ping.

### Experimento B — renderização do mapa

1. Abrir com `?perf=1` quando possível.
2. Gravar FPS, fases de renderização e ping lado a lado.
3. Andar por áreas já carregadas.
4. Repetir cruzando regiões novas.
5. Anotar se os spikes coincidem com pré-carregamento ou geração de chunks.

**Resultado esperado:** identificar se a fase de geração/renderização sobe quando o RTT exibido também sobe.

### Experimento C — editor de sprites

1. Fazer baseline com o editor fechado.
2. Abrir o editor, sem editar.
3. Colocar um sprite.
4. Pintar 10–20 sprites lentamente.
5. Pintar o mesmo trecho rapidamente com pincel/arraste.
6. Observar picos de ping, FPS, log `[ESTADO]` e CPU/memória do processo Node.

Se os picos começarem ou crescerem durante pintura, a persistência síncrona e o broadcast global de objetos devem ser as primeiras correções avaliadas.

### Experimento D — servidor com carga simulada

Em uma cópia de teste (nunca no progresso principal), usar vários clientes locais automatizados e medir:
- duração do tick de 50 ms;
- bytes por `world_update`;
- CPU, RSS, heap e pausas de GC;
- tempo de `salvarMapObjetos()`;
- tempo de `broadcastMapObjetos()`;
- frequência de persistência de jogador;
- quantidade de entidades por mapa/instância.

---

## 11. Plano de correção em ordem de prioridade

### Prioridade 1 — reduzir bloqueios e operações de mapa

1. Alterar o fluxo de edição para agrupar pintura em lote.
2. Fazer apenas uma persistência por lote/traço, não por cada ponto.
3. Tornar persistência de mapa assíncrona e coalescida, com gravação atômica e tratamento de erro.
4. Serializar o broadcast global uma vez por mutação; não dentro do loop de clientes.
5. Não enviar a máscara raster completa a cada instância se puder ficar no registro do sprite.
6. Filtrar objetos por mapa para gameplay e manter o conjunto completo para o editor admin.
7. Instrumentar as durações antes e depois de cada mudança.

### Prioridade 2 — diminuir carga dos snapshots

1. Medir o tamanho médio e o percentil 95 de `world_update`.
2. Montar payloads de estado mais enxutos.
3. Reutilizar snapshots por mapa/instância quando possível.
4. Considerar deltas, mantendo snapshot completo periódico para ressincronização.
5. Reduzir cálculos repetidos por destinatário.
6. Rever broadcasts de ação que enviam para todos os clientes sem necessidade de proximidade/mapa.
7. Preservar consistência da simulação autoritativa do servidor.

### Prioridade 3 — renderização e memória

1. Correlacionar `?perf=1` e ping em toda reprodução.
2. Medir tempo da poda do cache de chunks e custo de rasterização.
3. Manter um limite/evicção no cache de glow.
4. Instrumentar tamanho das coleções de partículas/projéteis/timers após sessões longas.
5. Tornar o cache HTTP adequado aos assets versionados.
6. Medir frequência e duração de gravações de progresso antes de mudar a persistência.

### Prioridade 4 — validação

Depois de cada correção, repetir:
- os 47 testes focados que passaram nesta auditoria;
- testes de integração editor→servidor→persistência→broadcast;
- teste com vários clientes;
- sessão longa de movimento/combate;
- colocação massiva de sprites;
- perfil de CPU/memória e RTT.

**Critério de sucesso sugerido:** o ping em localhost deve permanecer próximo do baseline durante movimento e edição, sem spikes correlacionados com gravação/broadcast; o tick do servidor deve permanecer estável e a renderização deve respeitar o orçamento definido. Definir números-alvo depois de medir o hardware de referência.

---

## 12. Conclusão

O sintoma reportado (ping local passando de cerca de 10 ms para 2.000 ms) é compatível com bloqueios temporários do event loop do Node ou da main thread do browser. A leitura do código revela um caminho especialmente caro em edição: a colocação de objetos provoca persistência síncrona do JSON inteiro e um broadcast global em que o payload é reserializado para cada cliente. O tamanho atual do arquivo é ~1,83 MB, então o custo repete-se mesmo com somente 175 objetos.

O snapshot `world_update` a cada 50 ms e a geração procedural executada na thread principal também devem ser medidos. Não há evidência suficiente para afirmar que existe um único culpado para todos os spikes; o contexto temporal (parado, andando, ao gerar chunks, ao editar) é decisivo.

**Não foi feita nenhuma correção de código nem alteração de configuração.** A única saída planejada desta auditoria é este relatório Markdown dentro da pasta do projeto.


---

## 13. Mitigações aplicadas em 12/10/2026

O usuário autorizou correções no código após a auditoria. Foram criados backups antes da edição:

- `server.js.bak-latency-20261011-231233`
- `mapa-editor.js.bak-latency-20261011-231233` (backup preventivo; o editor não precisou ser alterado)

Alterações em `server.js`:
1. `salvarMapObjetos()` grava JSON compacto, sem indentação. O formato de dados permanece JSON válido e o schema não muda; isso reduz bytes gravados e trabalho de serialização em cada save.
2. `broadcastMapObjetos()` monta a string JSON uma vez por mutação e reutiliza o mesmo payload para todos os clientes, em vez de serializar repetidamente dentro do loop.
3. `mapaObjetosMesclarMapa()` usa índice `Map` por ID para evitar varrer a lista inteira para cada objeto, reduzindo o custo típico de O(M×N) para O(M+N).

Validação após as alterações:
- `node --check server.js`: passou.
- Testes focados de latência/editor/renderização/reconexão: **47/47 passaram**.
- Suíte completa `node --test tests/*.test.js`: **278/278 passaram**.
- `npm test` não está configurado no `package.json`; o projeto usa `node --test` diretamente.
- O processo de jogo não foi reiniciado.

**Limitação importante:** a gravação de `map_objetos.json` ainda é síncrona. As mudanças reduzem custo de I/O/serialização e evitam serializações repetidas no broadcast, mas não removem o bloqueio do event loop causado por uma sequência de salvamentos durante pintura rápida. A correção estrutural completa deve agrupar operações do pincel em lote e implementar persistência assíncrona com fila, gravação atômica e confirmação somente após persistir. Isso exige alterar o fluxo de confirmação do editor e merece uma etapa própria, com testes de falha de disco e concorrência, para não arriscar perda ou confirmação falsa de objetos.
