# Auditoria técnica para adicionar uma nova classe

**Escopo desta etapa:** leitura e documentação do estado atual; nenhuma classe foi criada e nenhum arquivo de implementação foi alterado por esta auditoria. O único arquivo novo desta etapa é este relatório.

**Alvo auditado:** `/data/user/0/com.vscodroid/files/projects/MMORPG-TALL/MMORPG-TALL`, projeto presente no workspace. O caminho `E:\MMORPG` fornecido na solicitação não está montado/disponível neste ambiente, então não pude afirmar que esta é a mesma cópia sem essa ressalva.

**Estado da árvore:** o Git já apresentava alterações locais antes da auditoria, inclusive em arquivos de classes, servidor, cliente, pets e testes. O relatório descreve a árvore de trabalho observada, que pode incluir alterações ainda não commitadas; não atribui essas alterações a esta auditoria.

**Backup pré-auditoria:** não foi encontrado arquivo de backup recente do projeto. Antes de criar este relatório, foi feito um snapshot compactado do projeto (excluindo apenas metadados `.git`) em `../MMORPG-TALL_pre_class_audit_2026-10-06.tar.gz`.

---

## 1. Conclusões executivas

- O código contém **14 IDs canônicos jogáveis**, duplicados em catálogo de UI, whitelist de servidor, definição de equipamentos e dispatch de renderização. Não existe um registry único que componha automaticamente todos esses sistemas.
- Os arquivos de `classes/*.js` são principalmente **renderizadores procedurais Canvas no cliente** (`window.desenhar...`), e não classes JavaScript de domínio com herança ou regras autoritativas de combate.
- Seleção, dano, skills, recursos, cooldowns, zonas, efeitos e sincronização são distribuídos entre `index.html`, `server.js`, `skills.js`, módulos de efeitos e configurações de itens.
- O servidor é autoridade de HP, mana, dano, cooldown e efeitos em muitos fluxos, mas a exigência de classe correta não é universal. A interface esconder botões não substitui validação server-side.
- **Recomendação para referência de integração server-side: Florim (`florim`)**, por seus handlers dedicados e verificações explícitas de classe, alcance, mana, cooldown, mapa/instância e PvP nas ações observadas. Não há “classe-base” técnica no sentido de uma arquitetura de herança. Reutilizar padrões de validação, não copiar toda a mecânica ou supor que o renderer da Florim é framework compartilhado.
- A concepção concreta da nova classe não foi informada. Portanto, a recomendação é para **padrão de implementação**, não para definir o kit, arma, atributo primário ou gameplay da nova classe.

## 2. Inventário do sistema atual

### 2.1 Classes, IDs e nomes canônicos

Os cards em `index.html` e a whitelist `CLASSES_VALIDAS` em `server.js` definem os IDs ativos. Nome exibido e ID não são sempre iguais.

| ID canônico | Nome exibido | Perfil funcional observado |
|---|---|---|
| `guerreiro` | Guerreiro | Lança/escudo; melee, postura defensiva, giro e provocação. |
| `mago` | Mago | Projéteis e magia de área/zona; mana e forma/bônus próprios. |
| `summoner` | Summoner | Orbe, invocações/golem e habilidades que escalam com Afinidade. |
| `arqueiro` | Arqueiro | Arco/projéteis, perfurante, chuva, rajada e salto. |
| `curandeiro` | Curandeiro | Cura, aura, ressurreição/passivas e dano sagrado. |
| `barbaro` | Bárbaro | Machado melee, fúria, dano/recuperação e ataques em área. |
| `roqueiro` | Roqueiro | Instrumento, canalização, buff de grupo, banda invocada e mobilidade. |
| `ladino` | Ladino | Adaga, combos/mobilidade, veneno e camuflagem/invisibilidade. |
| `dronemaster` | DroneMaster | Drone, modos Supressão/Assalto e transformação Titã. |
| `arqueiro_arcano` | Arqueiro Astral | Arco elemental, cometas, projéteis e zonas astrais. O ID interno não é o nome exibido. |
| `sniper` | Sniper | Rifle de longo alcance, mira/carga, camuflagem e posição de tiro. |
| `florim` | Florim | Staff/reliquia natural, suporte, zonas e controle vegetal. |
| `pikeman` | Pikeman | Foices, combos/melee, lentidão e execução canalizada. |
| `guerreiro_kaledron` | Guerreiro Kaledron | Montante flutuante, dano de magma, AoE e buffs. |

**Aliases não canônicos encontrados:** `arqueiro_astral` e `kaledron` aparecem em compatibilidade de retratos/nomes ou interface. A whitelist do servidor aceita `arqueiro_arcano` e `guerreiro_kaledron`, não esses aliases. Para a nova classe, deve-se escolher um ID único e mantê-lo idêntico em todos os registros/fluxos.

### 2.2 Onde cada preocupação mora

| Área | Arquivos e responsabilidades observadas |
|---|---|
| Cards de classe e HUD | `index.html`: cards da escolha inicial, botões, atalhos, roteamento de ações e várias máquinas de estado visuais. |
| Criação/seleção de personagem | `personagem-select.js`: lê IDs dos cards, mostra classes, retratos, skills iniciais e envia `personagem_criar`/`personagem_selecionar`. `personagem-select.css`: apresentação. |
| Persistência | `server.js` constrói e carrega runtime; `database.js` faz carga/salvamento/remoção; `jogadores.json` é o banco padrão local; `persistence-lock.js` protege gravações. A classe é armazenada no campo `classe`. |
| Whitelist e regras de classe | `server.js`: `CLASSES_VALIDAS`, `classeValida`, fórmulas por `p.classe`, criação/troca e dispatch de ações. |
| Skills apresentadas | `skills.js`: `SKILLS_INFO`, IDs, descrições, custos/cooldowns declarativos e interface. Não aplica dano por si só. |
| Skills e upgrades | `server.js`: níveis e custos; `skill_upgrade_tree.js`: árvore e validação própria de upgrades; `skill_tree_ui.js`: interface da árvore. |
| Atributos/status | `atributos.js` e `atributos.css`: apresentação e envio de pedidos; `server.js`: valores, validação, fórmulas, max HP/MP, dano e cura. |
| Equipamentos e armas | `items/config/classes.json`, `items/definitions/weapons.json`, `items/item-system.js`: config de arma por classe, restrições de classe/slot, validação e defesa. `equipamentos.js` é tabela legada de drops/armas e não coincide integralmente com o catálogo moderno. |
| Renderização dos personagens | `classes/*.js`: renderers Canvas procedurais. `classes/comum.js`: helpers visuais compartilhados, como barra de HP/debuffs. O `<script>` de cada renderer é registrado manualmente em `index.html`, seguido de dispatch por ID de classe. |
| VFX/efeitos | `efeitos/*.js`, `efeitos.js`, scripts da classe, `index.html` e broadcasts/eventos de `server.js`. `dash.js`/`dash-vfx.js` são módulo compartilhado específico do dash. |
| Multiplayer | `server.js`: handlers WebSocket, estado mundial, validação/execução de ações e broadcasts segmentados por mapa/instância; `index.html` recebe eventos e desenha entidades/VFX. |
| História/retrato | `personagens-historias.js`, `personagem-select.js`, caminhos em `imagem/HUD/Perfil` e referências textuais em `index.html`. Retrato inexistente pode cair em fallback ou ficar ausente. |
| Áudio | `audio-manager.js`, `sonoro.js` e arquivos em `Sonoro/`; carregamento e seleção também podem estar em `index.html`. |
| Testes/documentação | `tests/` cobre áreas específicas; `skills-analise.md`, `GDD.md` e demais docs são auxiliares, mas devem ser conferidos contra o comportamento do código. |

### 2.3 Fluxo real de personagem e classe

1. `personagem-select.js` extrai `id`, nome e descrição diretamente de `.class-card` em `index.html`; portanto, a seleção de criação depende do HTML e sua estrutura.
2. A criação envia `{ action: 'personagem_criar', personagem, classe }`.
3. O servidor exige conta autenticada, nome permitido e slot livre. Se o ID de classe enviado for inválido, o comportamento atual faz fallback para `guerreiro` em vez de rejeitar a criação. O registro inicial inclui `classe`, nível, XP, HP, atributos, pontos, `skills`, inventário e dados de tutorial.
4. A seleção verifica que o personagem pertence à conta, monta `players[playerId]` com `classe` carregada do registro, status, inventário e estado runtime; envia dados de inicialização ao cliente.
5. A tela antiga/seleção em `index.html` também chama `selecionarClasse(classe)`, configura os botões e envia `escolher_classe` ao servidor. No servidor, `classeValida` restringe essa troca à whitelist e salva `classe`.
6. Na troca, o servidor normaliza equipamentos incompatíveis e limpa alguns estados de classe (ex.: lacaios do Summoner, banda do Roqueiro, máquinas do Ladino, DroneMaster/Sniper e estados específicos). A limpeza é manual e não é derivada de um registry: uma nova classe com estado persistente precisará de tratamento correspondente.
7. Progressão salva `classe`, skills, atributos e demais dados via `salvarProgresso`; runtime temporário (cooldowns/timers/estados de cast) é em geral mantido no objeto do jogador online e não deve ser tratado automaticamente como progressão permanente.

## 3. Atributos, status, dano e recursos

- Os oito atributos conhecidos são `forca`, `inteligencia`, `agilidade`, `destreza`, `vida`, `profanidade`, `divindade` e `afinidade`.
- Novos personagens iniciam atributos em 1 e recebem três pontos iniciais; progressão concede ponto de atributo e ponto de habilidade segundo as regras do servidor.
- Fórmulas principais no servidor incluem `calcularMaxHp` e `calcularMaxMp`: HP base 100, vida adiciona 20 por ponto acima de 1 e força adiciona 4; MP base 50 e inteligência adiciona 10 por ponto acima de 1. Equipamentos podem contribuir com atributos.
- `getAtr`, `calcularDanoJogador`, `calcularCuraJogador`, `dmgSkill`, `mpSkill`, `gastarMana` e `gastarEstamina` são pontos centrais relevantes. Regras por classe ainda existem dentro dessas funções; por exemplo, há bônus específicos do Mago.
- Escalas documentadas no sistema: classes mágicas usam inteligência; outras classes normalmente usam força; cura usa divindade; DoT usa profanidade; pet/lacaio usa afinidade. Isso está refletido parcialmente na UI de `skills.js`, mas o código do servidor é autoridade e há exceções por origem/habilidade.
- A barra de estamina é recurso geral usado especialmente pelo dash, não há uma barra/código universal para recursos exclusivos de classe. Estados como mana, modos, stacks ou transformações são campos/estruturas específicos no runtime.
- `server.js` define ataque básico por classe com tabelas de alcance e intervalo. Florim: alcance 180 e intervalo-base 420 ms. Sniper: alcance 384; Guerreiro: 50. Esses são comportamentos server-side; o cliente também espelha valores para UX, mas não deve decidir o resultado.

## 4. Comparação técnica e classe-base recomendada

### 4.1 Comparação

- **Florim:** conjunto recente e separado de handlers `florim_*`; cada ação observada exige `p.classe === 'florim'`, checa HP/contexto, cooldown, mana, coordenada finita e alcance; cria zonas de servidor com dono, mapa e flag de instância Solari; sincroniza eventos. É a referência mais explícita para fluxo server-authoritative de habilidades de chão.
- **Sniper:** tem estados especiais e contexto ambiental, mira/carga, camuflagem e alcance longo. Exemplo rico de máquinas de estado e renderização sincronizada, mas complexo e fortemente específico ao design; não é uma base simples para uma classe desconhecida.
- **DroneMaster:** modos, drone, escudos/transformação e diversos estados sincronizados; bom se a nova classe requer entidade companheira/modos, mas adiciona muitos pontos de integração e estado transitório.
- **Summoner:** árvore de upgrades própria, ogro/lacaio e escalas por Afinidade; demonstra invocações e validação de upgrade, mas seu legado difere do sistema novo de pets e não deve ser copiado se a nova classe não invocar aliados.
- **Arqueiro/Mago:** padrões de projétil, cast, zona e miras; úteis conforme forma de combate desejada, mas os fluxos antigos e novos estão dispersos e variam em validação.
- **Guerreiro/Kaledron/Pikeman/Bárbaro:** referências para melee/cones, animações e sequências de ataque; algumas possuem estados bastante customizados, não sendo uma arquitetura geral.
- **Curandeiro/Roqueiro:** suporte, grupo, canalização e aliados; boas referências de design específico, com tratamento de PvP e alvo a auditar ação a ação.
- **Ladino:** estado de combo, camuflagem e ataque móvel; altamente especializado.

### 4.2 Recomendação

**Usar Florim (`florim`) como referência de integração server-side e sincronização, não como classe pai nem como molde obrigatório do kit.** Os handlers observados fornecem um padrão relativamente direto para rejeitar cliente inválido e manter alvos/zonas dentro de mapa, instância, PvP, alcance e recursos corretos.

O motivo da escolha não é o nome nem a semelhança temática: é o conjunto técnico de validações explícitas por ação e objetos de zona autoritativos do servidor. A implementação da nova classe deverá comparar cada feature ao handler mais semelhante (ex.: renderer de Kaledron para arma flutuante, Sniper para mira, guerreiro para bloqueio) sem replicar o estado específico dessas classes.

**Limitação importante:** como não há descrição da nova classe, não existe recomendação universal de renderer, arma, atributo, recurso ou tipo de skill. Florim é a referência segura mais clara para validar e sincronizar; o desenho da nova classe e os demais exemplos dependem do conceito que ainda será informado.

## 5. Mapeamento detalhado da base recomendada — Florim

1. **Class ID:** `florim` (canônico; `CLASSES_VALIDAS`).
2. **Nome:** Florim.
3. **Arquivos envolvidos:** `index.html` (card, botões, atalhos, script e renderer dispatch), `personagem-select.js` (seleção/retrato/skills iniciais), `server.js` (ataque, skills, zonas, ticks, dano/cura/debuffs, alcance/cooldown/MP e broadcast), `skills.js` (catálogo visual), `classes/florim.js` (renderer Canvas), `items/config/classes.json`, `items/definitions/weapons.json`, `items/item-system.js` (armas), além de assets/VFX/áudio quando aplicável.
4. **Estrutura de dados:** o personagem é um objeto `players[playerId]` com `classe`, posição, HP/MP, atributos, inventário, skills e campos runtime. A Florim possui timestamps de cooldown (`lastFlorimBasic`, `lastFlorimArvore`, `lastFlorimSemente`, `lastFlorimEspinhos`, `lastFlorimParede`); zonas autoritativas são armazenadas em coleções `florimArvores`, `florimSementes`, `florimEspinhos` e `florimParedes`, com dono, coordenadas, duração, raio, mapa e estado.
5. **Arma principal:** `staff_de_rosa` (Staff de Rosa), slot `arma`, restrição `florim`, atributos permitidos focados em inteligência/divindade/afinidade.
6. **Arma secundária:** `coroa_de_espinho` (Coroa de Espinho), slot `armaSecundaria`, restrição `florim`, atributos permitidos focados em afinidade/divindade/vida.
7. **Atributos:** sistema global de oito atributos, sem pool próprio da Florim. A ficha de arma tem bônus compatíveis com suporte/magia natural. Dano/HP/MP são calculados server-side; a alocação de pontos é validada pelo servidor.
8. **Skills catalogadas em `SKILLS_INFO.florim`:** `arvore`, `semente`, `espinhos`, `parede`, `aura_florescente`. Há quatro habilidades ativas listadas; a aura é passiva.
9. **Cooldowns:** tabelas de UI indicam Árvore 15 s, Semente 10 s, Espinhos 13 s, Parede 10 s. O handler server usa valores em milissegundos de 15000, 10000, 13000 e 10000. Ataque básico possui campo próprio e intervalo de 550 ms dentro do handler, enquanto a tabela genérica de ataque básico registra 420 ms. Essa discrepância precisa ser resolvida/verificada em futuras alterações; o servidor é o valor efetivo para a action `ataque_florim`.
10. **Recursos:** usa MP; custos server-side observados: árvore 25, semente 18, espinhos 22, parede 20. A passiva regenera MP para aliados e causa sangramento em inimigos no tick. Não foi identificado recurso exclusivo separado de mana.
11. **Animações:** sprite procedural Canvas, ciclo de passo/respiração, orientação/flip, aura vegetal e arma flutuante com oscilação. Execução e cadência de skill são sinalizadas no cliente através de eventos; renderer não é autoridade de gameplay.
12. **VFX:** renderer de `classes/florim.js` e handlers dos eventos `action_florim_*` do cliente. Árvore, semente, espinhos, parede e respectivas ativações/fim têm broadcasts. Passiva/DoT/debuff têm estado autoritativo e sincronização.
13. **Hitboxes/zonas:** ataque básico passa por `validarAtaqueBasicoAlvo` e o limite geral de alcance Florim é 180 px. Árvore: raio 100; Semente: raio de ativação 40 no objeto e área de efeito 60 em processamento; Espinhos: raio 120; Parede: raio 80. Alvos e áreas são avaliados pelo servidor a cada tick e filtrados por mapa/Solari; não são hitboxes client-authoritative.
14. **Dano/cura:** ataque básico natureza usa helper de dano/nível; semente carnívora aplica 25 em ticks em entidades na área; árvore aplica 30 de cura por pulso (tick a cada 20 frames do runtime observado); espinhos aplica redução de ataque/defesa de 20%; parede aplica paralisia/prisão em pulsos; passiva cura MP de aliados e causa sangramento no raio. Fórmulas e valores devem ser reconferidos em `server.js` antes de implementar.
15. **Efeitos:** utiliza módulo comum `efeitos.js` / `efeitos/` para debuffs; efeitos relevantes vistos incluem redução de defesa/ataque, paralisia e sangramento. Aplicação importante está no servidor; sincronização de status é enviada aos clientes atingidos.
16. **Validações:** as actions Florim verificam jogador e classe, cooldown, saldo de mana, coordenadas finitas, alcance da posição de cast, alvos válidos, mapa/instância/Solari e regras PvP. A validação existe por handler/helper e não é um framework global para todas as classes.
17. **Multiplayer:** eventos `action_florim_*` transmitem início/ativação/fim e alvos; broadcasts tentam limitar por espaço/mapa. O `world_update` também distribui listas de zonas filtradas. Cada cliente desenha o VFX, enquanto dano/cura/estado vem do servidor.
18. **Persistência:** classe (`florim`), atributos, inventário/equipamentos, skills e progressão são salvos no registro do jogador. Cooldowns de combate e instâncias de zonas são estado transitório e não são progressão permanente. `database.js` mergeia dados e atualiza por lock.
19. **Interface:** `index.html` declara botões/atalhos, mira e ação de envio; `mobile-hud.css` posiciona slots; `skills.js` exibe nomes, nível, custo, cooldown e descrição. Cliente espelha feedback visual, não deve fornecer resultado de gameplay.
20. **Seleção de personagem:** card em `index.html` chama `selecionarClasse('florim')`; `personagem-select.js` infere o ID dos cards e mapeia o retrato `Florim.svg`; `personagem_criar` e `escolher_classe` são validados e persistidos no servidor.

### 5.1 Genérico versus específico na Florim

**Reutilizável/genérico:** contrato de renderer com posição/movimento/ângulo/HP; cálculo global de HP/MP/dano/cura; ferramentas comuns de mana/cooldown/alcance; ataque básico validado; regras globais de PvP, mapa/instância; transporte por WebSocket; item-system e persistência.

**Exclusivo da Florim:** forma vegetal, cores/arma flutuante, aura passiva, nomes `lastFlorim*`, ações `florim_*`, coleções de zonas, raios/durações, lógica da semente (rosa/carnívora), redução de status, cura/regeneração e VFX próprios. Esses elementos não se tornam comportamento comum para uma classe nova automaticamente.

## 6. Skills, cooldowns e combate em geral

- `skills.js` contém descrições/custos/valores para UI; várias habilidades são tratadas individualmente no grande dispatcher de `server.js`. As tabelas não executam habilidade e nem garantem que seu ID corresponde ao usado no servidor.
- `dmgSkill` aumenta dano/cura em 25% por nível; `mpSkill` escala custo em 6% por nível, segundo implementação observada. Nível máximo declarado: 10.
- Existem helpers de ataque básico, PvP, alcance de skill, mana/estamina e cooldown, mas handlers antigos nem sempre os adotam uniformemente.
- O servidor calcula/autoriza HP, MP, cooldown, dano, cura, debuffs, projéteis/zonas e ticks. VFX pode iniciar no cliente para resposta visual, mas não deve causar efeito de jogo antes da confirmação autoritativa.
- Ataque básico também possui disparadores por classe no cliente, além de handlers de `server.js`; a autorização final e validação real de alvo precisam permanecer server-side.
- `skill_upgrade_tree.js` é especialmente associado à árvore Summoner; adicionar uma classe não significa que a nova classe terá a árvore sem entradas/validação/UI novas.

## 7. Dependências para adicionar classe

O conjunto exato depende do kit planejado. A lista abaixo é o conjunto de registros/consumidores identificados, separando integração de uma classe jogável de módulos condicionais.

### Obrigatórios para uma classe jogável

1. `server.js` — adicionar ID à whitelist; validar carregamento/criação/troca; inicializar, resetar e serializar estados; ataque básico; handlers de skills; recursos/cooldowns/dano/hitbox/efeitos; regras de alcance, PvP, mapa/instância; broadcasts; proteção por classe para cada action; incluir estado no `world_update` quando o cliente precisar dele.
2. `index.html` — card de classe com ID canônico; selecionar classe; botões/atalhos/mira; scripts de renderer/efeitos; seleção do renderer local/remoto; handlers de novos eventos WebSocket e animações/VFX correspondentes. É atualmente ponto de integração central amplo.
3. `personagem-select.js` — retrato, leitura de card, exibição das skills iniciais e classe de criação. A extração de classes depende do HTML; alguns mapas, como retrato, são explícitos.
4. `skills.js` — `SKILLS_INFO` e nome/categoria da classe com IDs idênticos aos IDs usados no servidor; a UI pode falhar ou mostrar nomes genéricos se faltar.
5. Um renderer novo em `classes/<id>.js` — necessário se a classe precisa de desenho próprio; acrescentar `<script>` e ramo de dispatch correspondente em `index.html`. A base visual `classes/comum.js` só oferece helpers, não implementa classe jogável.
6. `items/config/classes.json` — nome e IDs da arma principal/secundária se a classe terá configuração/equipamentos pelo sistema novo.
7. `items/definitions/weapons.json` — definições de armas com `classRestriction` igual ao ID canônico e slots corretos. `items/item-system.js` checa integridade e compatibilidade.
8. `tests/` — testes de whitelist/criação/seleção, armas, skill authorization, cooldown/resource, validação de alvo/alcance e integração multiplayer para evitar regressões.

### Condicionais/opcionais conforme design

- `classes/comum.js`: apenas se aparecer uma primitiva de desenho realmente geral que todas as classes usem; não precisa ser alterado para todo renderer.
- `equipamentos.js`: se algum fluxo legado de geração/drop usar pesos/lista de arma por classe. Foi encontrada configuração divergente e ausência moderna para algumas classes; testar o consumidor antes de alterá-la.
- `efeitos.js` e/ou `efeitos/<classe>_efeitos.js`: quando a habilidade usar efeito/debuff ou tiver VFX específico independente do renderer.
- `dash.js` e `dash-vfx.js`: apenas se o dash ou uma variante do dash da nova classe mudar; o catálogo atual do dash já é configurável por classe.
- `skill_upgrade_tree.js` e `skill_tree_ui.js`: só se a nova classe receber árvore de upgrades. A compra de upgrade já possui validação própria no servidor.
- `atributos.js`/`server.js`: se a classe introduzir atributo/status/regra de escala inédita. Para utilizar os oito atributos atuais, normalmente basta integrar a fórmula autoritativa no servidor e refletir na UI quando necessário.
- `personagens-historias.js`, `imagem/HUD/Perfil/*`, `imagem/HUD/skills/*`, `sprites/`, `Sonoro/`, mapas de áudio/assets: se for fornecido retrato, história, ícones, sprite ou som.
- `mobile-hud.css`, `style.css`, `skills.css`: se forem necessários layout/slots/apresentação particulares.
- `database.js`, `persistence-lock.js`: não parecem precisar de alteração para apenas um novo valor textual de classe, pois o registro é um merge genérico. Alterar somente se forem adicionados novos campos persistentes ou validações/schema específicos.

## 8. Segurança e autoridade cliente/servidor

### Controles observados

- `CLASSES_VALIDAS`/`classeValida` protegem `escolher_classe`; o comentário do próprio código afirma que a aceitação anterior de qualquer string foi corrigida para evitar classe gravada fora da whitelist.
- Criação invalida IDs por fallback para Guerreiro; melhor rejeitar explicitamente no fluxo de nova classe para evitar erro silencioso ou personagem criado com outra classe.
- Distribuição/reset de atributos ocorre no servidor; os pedidos do cliente não devem definir valores finais.
- Ataque básico tem resolução do alvo, vida, mapa/instância, PvP e distância validados no servidor por `validarAtaqueBasicoAlvo`.
- Skills Florim são exemplo bom de verificar classe, cooldown, mana e coordenadas no servidor. Cooldown é marcado depois de mana/validação suficiente para não punir cast inválido.
- O sistema novo de itens valida classe/slot do equipamento server-side em `item-system.js` e o servidor normaliza equipamentos ao trocar classe.

### Riscos encontrados — documentados, não corrigidos nesta etapa

1. **Não há gate global action → classe.** O dispatcher WebSocket executa muitas ações específicas sem tabela central de permissões. Alguns handlers (Florim e postura do Guerreiro observados) exigem `p.classe`; vários handlers legados de Mago, Bárbaro e Kaledron não começam com equivalente explícito. Um cliente pode tentar enviar diretamente mensagens de ação de outra classe; o efeito real depende do handler, mas a fronteira da UI é insuficiente.
2. **`upgrade_skill` não checa pertencimento da skill à classe.** O handler verifica jogador, id, nível máximo e pontos, mas não valida que a skill conste em `SKILLS_INFO[p.classe]`/registro servidor nem que o ID pertence à classe. Potencial gasto em ID arbitrário ou skill de outra classe pode ser salvo.
3. **IDs de skill podem divergir entre UI e servidor.** Exemplo visto: catálogo do Arqueiro Astral usa `flecha_astral`; caminho de ataque no servidor usa `flecha_arcana`. Pode fazer upgrade de UI não escalar a execução que usa outro ID. Os IDs precisam ser auditados e alinhados para a nova classe.
4. **Classe antiga carregada sem a mesma validação aplicada à criação/troca.** No caminho de `personagem_selecionar`, registro antigo é carregado com `dadosSalvos.classe || 'guerreiro'`; não foi vista ali sanitização uniforme via `classeValida`. Valores inválidos persistidos podem chegar ao runtime.
5. **Fallback silencioso em criação.** Classe solicitada inválida vira Guerreiro, não resulta em rejeição explícita. É risco de inconsistência e feedback enganoso, embora não conceda a classe arbitrária.
6. **Cooldown e validação não uniformes.** Existem helpers server-side, mas nem todos os handlers os usam. Um novo handler deve validar servidor-side classe/vida, parâmetros finitos e limites, recursos, cooldown, alvo/PvP, distância/mapa/instância, número de hits e frequência de tick; cliente não determina os resultados.
7. **Estado multiplayer não uniforme por classe.** Alguns campos exclusivos são copiados seletivamente para `playersVisivel`/`world_update`; confiar em campos locais ou não incluir estado validado provoca dessincronização entre clientes.
8. **Tabela legada de equipamentos divergente.** `equipamentos.js` ainda declara Bárbaro e Roqueiro vazios e não cobre completamente as classes modernas, enquanto os arquivos `items/*` as cobrem. Fluxos legados podem deixar arma indisponível ou sem pesos.
9. **Inconsistência interna Florim que afeta exemplo de skill:** `SKILLS_INFO.florim` tem quatro ativas e uma passiva; o `NOMES_CLASSES` inspecionado em `skills.js` não mostra entrada `florim`. Também o ataque básico server chama `dmgSkill` com ID `ataque_florim`, que não consta nessa lista Florim; upgrade/escala de ataque básico pode não se comportar como UI sugere. Não foi alterado.
10. **Cooldown Florim básico divergente:** `tempoBaseAtaqueBasico` indica 420 ms, mas handler `ataque_florim` limita pela janela de 550 ms. Para nova classe, manter um único contrato server-side e espelho UI/teste.
11. **Reset de skill inconsistente:** `resetar_skill` remove em runtime e responde, mas o caminho inspecionado não persiste nem devolve ponto; `resetar_todas_skills` segue caminho diferente com salvamento. Não corrigido.
12. **Alias de classe não canônico** pode criar discrepância entre tela, equipamento, retrato e whitelist; utilizar somente o ID aprovado server-side.

**Não corrigir nesta etapa:** todos os pontos acima foram documentados para triagem posterior, em cumprimento à instrução de apenas auditar.

## 9. Riscos de integração e checklist futuro

Antes de implementação da classe nova, fechar especificação funcional (nome, ID, tipo de ataque, primário/secundário, atributo(s), habilidades e alvo, custos/cooldowns, efeitos, estado persistente ou transitório, VFX/áudio, multiplayer e PvP). Depois, qualquer implementação futura deverá:

- registrar o mesmo ID canônico em whitelist, card, seleção, catálogo de skills e configuração de equipamento;
- rejeitar classe inválida no servidor, e normalizar classe carregada de registros antigos;
- validar autoridade de cada action no servidor — sem aceitar do cliente classe, dano, cooldown, nível, atributos, custo ou efeitos finais;
- receber do cliente somente intenção/entrada mínima (ex.: alvo ou ponto de mira) e calcular/validar efeito do lado do servidor;
- validar tempo/cooldown, recurso, alcance, alvo, linha/mapa/instância e PvP antes de executar;
- sincronizar pelo `world_update`/eventos de servidor apenas estado necessário; todos os clientes reproduzem apresentação do mesmo evento confirmado;
- tratar desconexão, morte, troca de classe e mudança de mapa limpando timers/estados temporários;
- integrar arma nas duas configurações se fluxos legados ainda forem usados;
- adicionar testes unitários e multiplayer para ações válidas e tentativas adulteradas.

## 10. Backup e limites da auditoria

- Backup criado antes deste documento: `../MMORPG-TALL_pre_class_audit_2026-10-06.tar.gz` (245 MB observado), snapshot da árvore auditada sem o diretório `.git`.
- Não havia backup de classes recente localizado dentro da cópia auditada; `_backup_mapas_removidos` é backup de mapas, não das classes.
- A auditoria foi estática (leitura do código). Não executou testes nem alterou combate. Claims sobre `server.js` refletem os handlers examinados na árvore de trabalho atual, que já tinha modificações locais.
- A auditoria não implementa nova classe. A etapa seguinte deve aguardar revisão/aprovação deste relatório e a especificação do kit da classe.
