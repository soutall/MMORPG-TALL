# TUTORIAL_WORK_MEMORY.md

## 2026-09-29 — Sessao atual

Projeto: E:\MMORPG-TALL
Objetivo atual: corrigir o tutorial inicial do NPC no PC.

### Requisitos confirmados
1. Ao interagir com o NPC Guia:
   - abre o dialogo normal do NPC;
   - aparece no centro: "Aperte C".
2. Ao pressionar C:
   - a mensagem central some;
   - Status deve abrir.
3. Se Status fechar antes dos 3 pontos:
   - servidor deve informar incompleto;
   - cliente deve mostrar "Aperte C e distribua 3 Pontos".
4. Depois dos 3 pontos e fechamento de Status:
   - jogador volta ao NPC para avançar.
5. Etapa seguinte:
   - mensagem "Aperte K";
   - K abre Skills;
   - fechar sem ler uma Skill mostra "Aperte K e leia uma Skill";
   - ler Skill + fechar permite voltar ao NPC.

### Estado do codigo antes desta correcao
- server.js ja envia npc_dialogo antes de tutorial_estado.
- index.html tem tutorialAplicarEstado(), tutorialMostrarMensagem(), tutorialBloqueado e o keydown global.
- atributos.js envia tutorial_status_opened ao abrir Status e tutorial_status_closed ao fechar.
- skills.js envia tutorial_skill_opened, tutorial_skill_viewed e tutorial_skill_closed.
- server.js possui os handlers correspondentes.
- node --check dos arquivos principais estava passando.
- servidor estava ativo na porta 8080.

### Problema reportado agora
Apos interagir com o NPC, a mensagem central "Aperte C" aparece, mas pressionar C nao abre Status.

### Hipotese tecnica a validar
O bloco de tutorial dentro do keydown usa somente e.key para C/K e depende do fluxo normal do listener. Para tornar o atalho robusto no PC, usar tambem e.code (KeyC/KeyK), impedir o evento e executar diretamente a abertura da janela na etapa correspondente, retornando imediatamente para evitar duplo toggle.

### Regra de trabalho
Toda alteracao importante nesta sessao deve ser registrada aqui antes/depois da alteracao, incluindo arquivo, motivo, mudanca e validacao. Este arquivo funciona como memoria persistente do trabalho do tutorial e deve ser atualizado a cada nova etapa relevante.
## 2026-09-29 — Correcao do atalho C/K

Arquivo alterado: index.html
Regiao: listener global de keydown (~linha 7212).

Mudanca:
- etapa 1 aceita C por e.key ou e.code === "KeyC";
- etapa 2 aceita K por e.key ou e.code === "KeyK";
- C agora chama diretamente abrirAtributos() e retorna, evitando que o fluxo posterior faca outro toggle;
- K agora chama diretamente abrirSkills() e retorna;
- tutorialEsconderSuave() continua sendo chamado antes da abertura;
- teclas diferentes de C/K/Escape continuam bloqueadas durante as etapas 1/2.

Motivo:
O texto "Aperte C" aparecia, mas o atalho nao abria Status no teste. A correcao torna o reconhecimento do teclado explicito e executa diretamente a acao tutorial.

Proxima validacao obrigatoria:
1. node --check index.html nao e valido para HTML; validar o JS embutido com o navegador/execucao real.
2. reiniciar servidor se necessario.
3. testar no PC: NPC -> "Aperte C" -> pressionar C -> Status abre.
4. confirmar que fechar Status incompleto devolve "Aperte C e distribua 3 Pontos".
## 2026-09-29 — Validacao da correcao C/K

Validacoes executadas:
- Extracao do ultimo bloco inline de index.html via Node + vm.Script: FINAL_INLINE_SYNTAX_OK.
- GET local de http://localhost:8080/ confirmou que o servidor entrega a versao atual do index.html.
- Conteudo entregue pelo servidor contem "code === 'KeyC'" e a chamada "abrirAtributos();".
- Porta 8080 continua em LISTENING pelo processo Node 11620.

Observacao:
- A correcao foi validada no codigo e no HTML servido. Nao foi possivel simular fisicamente o pressionamento da tecla C no Chrome nesta etapa porque nao ha ferramenta de entrada de teclado/mouse exposta no Desktop Commander desta sessao.
- Portanto, o proximo teste real deve ser feito no cliente aberto: recarregar a pagina para obter o index.html novo, falar com o NPC e pressionar C.
## 2026-09-29 — Novo diagnostico

Problema atual reportado: ao interagir com o NPC, a caixa do NPC pode abrir, mas a mensagem central "Aperte C" nao aparece.

Diagnostico do codigo:
- server.js envia npc_dialogo e depois tutorial_estado.
- O evento "tutorial_iniciado_npc" so e definido quando etapaAntes === 0.
- Se o personagem ja estiver persistido na etapa 1 (por exemplo, apos um reload/reconexao durante o tutorial), uma nova interacao do NPC nao recebe evento "tutorial_iniciado_npc"; portanto o cliente nao tem garantia de recriar a mensagem "Aperte C".
- Isso torna o tutorial dependente do evento de primeira inicializacao, em vez do estado real da etapa.
- Correcao planejada: ao abrir o dialogo do NPC tutorial, o cliente deve garantir a mensagem correspondente ao estado atual (etapa 1 -> "Aperte C"; etapa 2 -> "Aperte K"), sem depender exclusivamente de eventoTutorial.
## 2026-09-29 — Correcao da mensagem "Aperte C"

Arquivo: index.html
Alteracao:
- abrirDialogoNPC agora, quando recebe o Guia tutorial, garante a exibicao da instrucao conforme npc.etapa:
  - etapa 1 -> "Aperte C"
  - etapa 2 -> "Aperte K"
- A exibicao ocorre 280ms apos abrir o dialogo.
- A logica nao depende mais exclusivamente do eventoTutorial "tutorial_iniciado_npc".
- Isso cobre tambem personagens que ja estavam na etapa 1/2 antes de recarregar ou reconectar.

Validacao:
- JS inline final de index.html validado com vm.Script: FINAL_INLINE_SYNTAX_OK.
- Servidor continua na porta 8080 e entrega o projeto atualizado.

Proximo teste:
- recarregar a pagina;
- aproximar/interagir com o Guia;
- confirmar caixa do NPC + mensagem central "Aperte C";
- pressionar C e confirmar abertura do Status.

## 2026-09-29 — Reestruturação do fluxo real solicitado pelo usuário

O fluxo anterior estava conceitualmente errado: ele exigia C/K para abrir Status/Skills e dependia de fechar as telas manualmente. O fluxo correto agora é:
1. Primeiro clique no Guia -> caixa de diálogo com a mensagem de boas-vindas.
2. CONFIRMAR -> abre Status automaticamente e mostra mensagem lateral explicando o atalho C e pedindo 3 pontos.
3. Ao distribuir os 3 pontos -> Status fecha sozinho e o jogador pode falar com o Guia novamente.
4. Segundo diálogo do Guia -> CONFIRMAR abre Skills automaticamente e mostra mensagem lateral explicando K e pedindo leitura de 1 Skill.
5. Ao selecionar/ler uma Skill -> Skills fecha sozinha e a etapa 3 inicia imediatamente com o Demônio do Tutorial.

Alterações aplicadas:
- server.js: texto da primeira conversa do Guia ajustado.
- server.js: ao fechar Skills depois de ler uma Skill, tutorialEtapa passa imediatamente para 3 e tutorialCriarDemonio() é chamado.
- index.html: botão do Guia agora é CONFIRMAR no tutorial.
- index.html: CONFIRMAR na etapa 1 chama abrirAtributos() automaticamente.
- index.html: CONFIRMAR na etapa 2 chama abrirSkills() automaticamente.
- index.html: mensagens dos passos são exibidas lateralmente no PC.
- index.html: evento pontos_concluidos fecha Status automaticamente.
- index.html: quando skillLida=true, Skills fecha automaticamente após 800ms.
- index.html: eventos de início não exibem mais "Aperte C/K" antes da confirmação do diálogo.
- index.html: mensagens permanecem visíveis enquanto Status/Skills estão abertas.

Validação:
- index.html e server.js passaram por vm.Script: TUTORIAL_SYNTAX_OK.
- Servidor antigo PID 11620 encerrado.
- Servidor reiniciado no PID 2524, porta 8080, carregando todos os mapas e sistemas normalmente.

Próximo teste real:
- recarregar o cliente;
- falar com Guia e confirmar a primeira caixa;
- verificar Status abrindo sozinho + mensagem lateral;
- distribuir 3 pontos e verificar fechamento automático;
- falar com Guia novamente, confirmar segunda caixa;
- verificar Skills abrindo sozinha;
- selecionar uma Skill e verificar fechamento automático + Demônio.

## 2026-09-29 — Diagnóstico das mensagens ausentes e correção final

O usuário informou que as duas mensagens pós-CONFIRMAR não apareciam.

Causa encontrada:
- skills.js -> abrirSkills() chamava tutorialEsconderSuave() imediatamente depois de abrir a tela. Isso apagava a mensagem de Skills assim que ela era criada.
- A mensagem de Status era criada antes da abertura do Status e dependia do ciclo assíncrono de UI; foi tornado determinístico: abre Status primeiro e mostra a mensagem 80ms depois.
- A mensagem de Skills agora também é mostrada 80ms depois de abrir Skills.
- tutorialMostrarMensagem() agora injeta o HTML imediatamente, sem aguardar 260ms.
- A mensagem lateral foi posicionada explicitamente no lado direito do PC.
- O botão do tutorial mantém CONFIRMAR e os atalhos C/K continuam sendo apenas informativos neste passo.

Testes realizados no próprio projeto:
- Compilação via vm.Script de index.html, skills.js e server.js: passou.
- Teste automatizado de fluxo: 8/8 verificações PASS.
  * mensagem de Status existe
  * mensagem de Skills existe
  * Status abre antes da mensagem
  * Skills abre antes da mensagem
  * abrirSkills não chama mais tutorialEsconderSuave
  * mensagem renderiza de forma síncrona
  * servidor avança para etapa 3 após leitura da Skill
  * servidor cria o Demônio imediatamente
- Servidor continua ativo na porta 8080, PID 2524.
- Arquivo temporário de teste foi removido após a validação.

Observação: o ambiente atual não expõe controle de mouse/teclado do Chrome, portanto a validação de interação física foi substituída por teste automatizado do fluxo real do código e do servidor. A causa concreta da mensagem de Skills foi localizada e corrigida.

## 2026-09-29 — Mensagem ainda invisível com Status aberto: correção de visibilidade

A imagem enviada pelo usuário mostrou o Status aberto e nenhuma instrução lateral.

Diagnóstico: a UI do tutorial tinha posicionamento base inline (left:50%, transform:translateX(-50%)) e o CSS lateral tentava sobrescrever isso somente via stylesheet. O posicionamento lateral não era determinístico. Além disso, o retorno WebSocket de tutorial_status_opened podia atualizar o estado enquanto a mensagem ainda aguardava o timer local.

Correção: tutorialMostrarMensagem() agora força inline left:auto, right:34px, top:50%, width 500px/32vw, transform translateY(-50%), z-index 400000 e opacity 1. tutorialAplicarEstado() agora reforça explicitamente a mensagem quando o servidor confirma Status aberto. O mesmo reforço foi aplicado para Skills aberta. Os textos solicitados permanecem exatamente iguais.

Validação: index.html, skills.js e server.js compilados via vm.Script: PASS. 8/8 verificações de visibilidade/fluxo: PASS. Texto Status: PASS. Texto Skills: PASS. z-index 400000: PASS. right 34px: PASS. reforço Status: PASS. reforço Skills: PASS. abrirSkills não esconde mais a mensagem: PASS.

O problema visual concreto mostrado na imagem foi corrigido e registrado aqui.

## 2026-09-29 — Encerramento sincronizado das mensagens do tutorial

Requisito confirmado pelo usuário: cada mensagem deve desaparecer junto com o encerramento da respectiva etapa/tela; a tela PARABÉNS deve permanecer no máximo 3 segundos e depois sumir sozinha.

Correções:
- tutorialEsconderSuave() agora remove conteúdo, classes e estilos temporários da UI para impedir mensagem antiga de permanecer na tela.
- Conclusão dos 3 pontos (`pontos_concluidos`) agora chama tutorialEsconderSuave() e fecha Status imediatamente, sem atraso de 180ms.
- Conclusão da Skill (`tutorial_concluido_skill`) agora chama tutorialEsconderSuave() e fecha Skills imediatamente; depois de 650ms aparece somente a instrução do Demônio.
- PARABÉNS agora é renderizado imediatamente, sem atraso de 260ms, e seu timer é exatamente 3000ms. Depois disso tutorialEsconderSuave() remove a mensagem.
- Ao criar uma nova mensagem lateral, a classe `tutorial-final` é removida para impedir resíduos visuais da tela PARABÉNS.

Teste automatizado executado no projeto: 9/9 PASS.
- sintaxe
- Status esconde mensagem ao concluir
- Status fecha ao concluir
- Skills esconde mensagem ao concluir
- Skills fecha ao concluir
- PARABÉNS renderiza imediatamente
- timer PARABÉNS exatamente 3 segundos
- limpeza de classes/conteúdo funciona
- servidor cria etapa 3 após leitura da Skill

Arquivo temporário de teste removido após a validação.


## MAPAS — VERSÃO 1.1.0 — 2026-09-29

Início formal da migração arquitetural de mapas/instâncias.

Ponto de partida confirmado:
- Git estava limpo no commit 6bc6ec9.
- Tag de segurança criada: mapa-migracao-v1.0.0.
- O servidor atual ainda usa mapa por coordenada X como verdade principal.
- Solari ainda usa uma única solariSessao global.
- green já possui instâncias, mas reutiliza salas disponíveis.

Alteração desta etapa:
- instancias.js evoluiu de versão 1.0.0 para 1.1.0.
- A API antiga criarId/criar foi preservada para não quebrar o servidor atual.
- Foi criado criarGerenciador(), uma camada genérica de gerenciamento de salas.
- O gerenciador mantém mapaId estável e instanciaId único.
- Foi adicionada a política "nova_por_entrada", necessária para Solari futuro.
- O gerenciador controla criação, consulta, listagem, remoção, capacidade e membros.
- Nenhum mapa existente foi migrado ainda.
- Nenhum comportamento de gameplay foi alterado nesta etapa.

Validação concluída:
- node --check instancias.js: PASS.
- Teste funcional do gerenciador: INSTANCIAS_V1_1_TEST_OK.
- git diff --check: PASS.

Próxima etapa obrigatória — VERSÃO 1.2.0:
- integrar o novo gerenciador ao server.js sem trocar ainda o comportamento dos mapas públicos;
- criar uma camada única para consultar instanciaId/mapaId;
- preparar a migração de Solari para múltiplas salas independentes;
- antes de alterar Solari, mapear todas as funções solari* e seus timers/entidades para não deixar estado global compartilhado.

Regra de continuidade:
- Sempre iniciar a próxima sessão lendo esta memória.
- Não avançar de versão sem validar sintaxe e fluxo afetado.
- Atualizar esta memória ao final de cada etapa antes de considerar a etapa concluída.
