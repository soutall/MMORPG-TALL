# GDD — MMORPG-TALL
Versão do documento: 1.0
Versão do jogo auditada: v1.60.1
Data: 28/09/2026

## 1. Visão do produto
MMORPG 2D/2.5D multiplayer em tempo real, executado no navegador, com foco em PC e Mobile.
A proposta combina exploração de mapas grandes, combate de ação, classes distintas, progressão,
equipamentos, pets/lacaios, eventos, PvP e atividades cooperativas.

Pilares:
- Combate de ação com mira manual.
- Autoridade do servidor para regras competitivas.
- Progressão persistente por personagem.
- Identidade forte de classes.
- Mundo contínuo com múltiplos biomas.
- Interface adaptada para mouse/teclado e touch/joystick.

## 2. Fantasia do jogador
O jogador cria um personagem, escolhe uma classe e evolui explorando o mundo.
A experiência deve alternar entre combate rápido, descoberta, melhoria de equipamento,
cooperação e atividades especiais como Arena Solari.

## 3. Plataformas e controles
PC: WASD para movimentação, mouse para mira, teclas de skills e poções.
Mobile: joystick virtual, botões de skills e mira point-to-click quando necessário.
HUD e modais devem ser responsivos e respeitar a visualViewport quando o teclado abrir.

## 4. Arquitetura
Cliente: HTML/CSS/JavaScript + Canvas 2D.
Servidor: Node.js + HTTP + WebSocket (ws).
Persistência atual: jogadores.json.
O servidor é a autoridade para dano, recursos, cooldowns, alcance, posição válida,
teleportes, inventário e demais regras de gameplay.
## 5. Classes atuais
1. Guerreiro — combate físico, defesa, escudo e controle.
2. Mago — dano mágico e efeitos elementais.
3. Arqueira — ataques à distância, flechas e burst.
4. Curandeira — suporte, cura, aura e ressurreição.
5. Bárbaro — combate agressivo, vampirismo e aumento de dano.
6. Roqueiro — suporte/ofensiva por música, bateria e banda.
7. Ladino — mobilidade, invisibilidade, sangramento e ataques rápidos.
8. DroneMaster — drones, modo assalto e transformação Titã.
9. Arqueiro Astral — dano mágico à distância e controle gravitacional.
10. Sniper — alcance, camuflagem, posição de tiro e disparo de precisão.
11. Pikeman — foice, controle e execução canalizada.
12. Summoner — invocações e formas/skills de Golem.

Regra de design: cada classe deve possuir identidade mecânica clara, não apenas valores
maiores ou menores de dano.

## 6. Combate
- Auto-ataque básico validado no servidor.
- Skills com mana e/ou stamina conforme a habilidade.
- Cooldowns server-side.
- Alcance server-side nas habilidades auditadas.
- Colisão e posição validadas.
- PvE e PvP possuem validações próprias.
- Buffs/debuffs sincronizados entre jogadores.
- Projéteis, zonas e efeitos são propagados por WebSocket.
- Dano crítico e escalonamento de atributos são calculados no servidor.

## 7. Progressão
- Nível e XP.
- Pontos de atributos.
- Pontos de habilidade.
- Skills evolutivas.
- Equipamentos com raridade e atributos.
- Upgrade de equipamentos.
- Ouro, poções e pedras.
- Inventário persistente.
- Slots de equipamento.
- Bloqueio de itens.
- Comparação de equipamentos.
## 8. Inventário e economia
O inventário possui slots de equipamento e mochila categorizada.
Poções e pedras podem formar stacks. Itens equipáveis são validados por classe e slot
no servidor. Itens bloqueados não podem ser destruídos.

Drops: equipamentos, ouro, poções, pedras de upgrade e itens especiais.

Economia futura recomendada:
- NPCs com compra/venda.
- Sinks de ouro consistentes.
- Materiais de crafting.
- Taxas de upgrade.
- Mercado controlado pelo servidor.
- Registro de transações importantes.

## 9. Mundo
Mapas atualmente identificados:
- Campo Verde / Floresta Verde.
- Deserto.
- Pântano.
- Caverna.
- Cidade de Davahl.
- Arena Solari.
- Cidade Perdida.
- Teste Gráfico.
- Zona Zero.
- Castelo.

O mundo utiliza colisões, camadas, objetos persistentes, VFX e regras específicas de
terreno. O ciclo dia/noite e BGM variam conforme o mapa.

## 10. Conteúdo PvE
- Monstros normais e especiais.
- Bosses.
- Hordas.
- Spawns administráveis.
- Drops configuráveis.
- Pets/lacaios.
- Áreas com veneno, gelo e outros efeitos.
- Eventos e encontros especiais.

Bosses devem ter telegráficos visuais, padrões reconhecíveis, fases e recompensas que
incentivem cooperação sem depender apenas de dano bruto.
## 11. Conteúdo PvP e cooperação
- PvP validado pelo servidor.
- Grupos/party e convites.
- Troca entre jogadores.
- Arena Solari com rounds e premiação.
- Auras e efeitos que interagem com aliados.
- Sons de proximidade para reforçar presença multiplayer.

## 12. Arena Solari
Atividade com sessão própria no servidor. Possui preparação, entrada, rounds, spawn
de inimigos, elite, mortes/ressurreições, premiação e retorno à cidade.
O fluxo é sincronizado pelo servidor.

## 13. Áudio e apresentação
Sistema sonoro centralizado com BGM por mapa, variação dia/noite, crossfade, SFX de
skills, sons de dano, UI, movimentação e proximidade para jogadores/monstros.

Diretriz visual:
- Pixel art/2D com leitura clara em resolução pequena.
- VFX fortes sem excesso de partículas.
- Identidade visual consistente entre classes.
- Nenhum efeito deve comprometer a leitura do combate.

## 14. Interface
HUD principal: retrato, HP, MP, stamina, XP, buffs/debuffs, skills, minimapa,
sidebar mobile, inventário, habilidades, social, status e configuração.

Regra mobile: qualquer janela que aceite texto deve continuar acessível quando o teclado
virtual alterar a área visual; usar visualViewport como referência nesses modais.
## 15. Ferramentas internas
O projeto possui ferramentas para personagens, colisões, mapas, VFX, spawns,
configuração de monstros, itens e cheats administrativos de teste.
Essas ferramentas devem permanecer isoladas do fluxo público do jogador.

## 16. Estado técnico atual
Pontos fortes:
- Servidor autoritativo em partes críticas.
- Validações de movimento e alcance.
- Cooldowns server-side.
- Persistência com gravação atômica.
- Backup antes de exclusão de personagem.
- Testes automatizados históricos.
- Arquitetura modular por classe/sistema.
- Suporte dual PC/Mobile.

Pontos que precisam evoluir:
- Autenticação real de contas.
- Autenticação administrativa forte.
- Rate limiting por conexão/ação.
- Banco de dados adequado para produção.
- Observabilidade e logs estruturados.
- Separação formal entre assets públicos e módulos server-only.

## 17. Roadmap — prioridade alta
1. Quests com história, objetivos, recompensas e cadeia de missões.
2. Tutorial inicial de 5–10 minutos.
3. Progressão de mapas por nível/faixa de poder.
4. Bosses de mundo com mecânicas próprias.
5. Party completa com líder, membros, loot e experiência.
6. Guildas.
7. Amigos e presença online.
8. NPCs com lojas e serviços.
9. Fluxo de morte/respawn claramente comunicado.
10. Sistema de segurança de conta.
## 18. Roadmap — prioridade média e longo prazo
- Crafting e profissões.
- Materiais por bioma.
- Eventos mundiais temporizados.
- Dungeon instanciada.
- Daily/weekly quests.
- Conquistas.
- Coleção de skins.
- Montarias.
- Pets com progressão.
- Títulos.
- Raid cooperativa.
- Guerra de guildas.
- World boss global.
- Ranking sazonal.
- Temporadas com recompensas.
- Novas cidades e regiões.
- Novas classes.

## 19. Ideias de sistemas novos
### Quadro de contratos
Cada cidade oferece contratos rotativos de caça, coleta, escolta e boss. A recompensa
cresce conforme dificuldade e risco.

### Afinidade de região
Explorar e ajudar uma região aumenta reputação e desbloqueia NPCs, lojas, quests e
cosméticos sem transformar toda progressão em aumento de dano.

### Eventos dinâmicos
Hordas, invasões, caravanas, meteoros, tempestades e bosses podem surgir com aviso global.
O evento deve ser server-authoritative e ter duração limitada.

### Mecânicas exclusivas de classe
Guerreiro: postura/guarda. Mago: sobrecarga elemental. Arqueira: precisão/combo.
Curandeira: cargas de bênção. Bárbaro: fúria. Roqueiro: ritmo. Ladino: oportunidade.
DroneMaster: comandos de drone. Astral: constelações. Sniper: estabilidade.
Pikeman: alcance/execução. Summoner: comando de invocações.
## 20. UX e retenção
Priorizar objetivos curtos e claros, recompensa visível, pontos de interesse,
descobertas, colecionáveis cosméticos, conquistas, eventos e progressão horizontal.

Evitar grind sem propósito, excesso de janelas, one-shot sem telegráfico e tarefas
obrigatórias excessivas. Monetização futura não deve aumentar diretamente dano ou
defesa no PvP.

## 21. Critérios de qualidade para novas features
1. Funcionar no PC e Mobile.
2. Valores competitivos sob autoridade do servidor.
3. Entrada do cliente sempre validada.
4. Nenhum acesso público a arquivos internos.
5. Nenhuma posição persistente frágil em mobile.
6. Feedback visual/sonoro claro.
7. Erro visual não pode congelar o loop de render.
8. Teste ou procedimento de validação reproduzível.
9. Registro no CHANGELOG e INFO_PROJETO.
10. Incremento de versão conforme as regras do projeto.

## 22. Visão futura
Transformar o protótipo atual em um MMORPG browser compacto, com mundo persistente,
classes com identidade forte, cooperação, conteúdo PvE/PvP e experiência mobile-first
sem abandonar o PC.
