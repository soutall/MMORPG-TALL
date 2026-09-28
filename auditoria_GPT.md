# AUDITORIA GPT — MMORPG-TALL
Versão auditada: v1.60.1
Data: 28/09/2026
Escopo: estrutura do projeto, cliente, servidor, persistência, UI PC/Mobile,
classes, mapas, inventário, rede, administração, segurança e roadmap.

## 1. Resumo executivo
O projeto já possui uma base funcional relevante: cliente Canvas 2D, servidor Node.js
com WebSocket, múltiplas classes, mapas, inventário, combate, PvP, party, troca,
Arena Solari, áudio, VFX, ferramentas administrativas e persistência.

O principal risco identificado não está no sistema de combate já auditado, mas na
fronteira entre servidor público, administração e persistência.

Prioridades desta auditoria:
- CRÍTICA: não expor banco, administração ou módulos internos pelo HTTP.
- CRÍTICA: substituir a identidade de conta atual por autenticação real antes de produção.
- CRÍTICA: substituir o modelo de admin baseado apenas no nome da conta.
- ALTA: implementar rate limit por conexão e por ação.
- ALTA: migrar persistência JSON para banco transacional quando houver usuários reais.
- ALTA: criar testes automatizados de segurança de WebSocket e autorização.

## 2. Correção aplicada nesta auditoria
O servidor HTTP agora bloqueia explicitamente arquivos internos e persistência:
server.js, database.js, spawns.js, upgrade.js, admin-cheats.js, admins.json,
jogadores.json, arquivo temporário do banco, spawn_flags.json, banco_itens.json,
map_vfx.json, map_objetos.json e monster_configs.json.

Objetivo: impedir que um acesso HTTP direto revele banco de jogadores, lista de admins,
configurações administrativas ou código que deveria permanecer server-side.
# 3. Risco CRÍTICO — autenticação de conta
Estado atual: o fluxo de login aceita um identificador de conta enviado pelo cliente.
Não há senha, sessão assinada, token, hash de credencial ou provedor de identidade.

Impacto:
Um usuário externo pode se apresentar como outra conta se souber o identificador.
O modelo atual é adequado para protótipo/local, não para uma conta persistente exposta
à Internet.

Correção recomendada:
1. Criar contas com senha derivada por Argon2id ou bcrypt.
2. Nunca salvar senha em texto puro.
3. Emitir sessão/token aleatório após login.
4. Associar personagem ao ID interno da conta, não ao texto digitado pelo cliente.
5. Expirar sessões e permitir logout/revogação.
6. Adicionar proteção contra tentativa automatizada de login.

Status: PENDENTE DE ARQUITETURA. Não foi implementada automaticamente para não quebrar
o fluxo atual de login e a compatibilidade dos personagens existentes.

## 4. Risco CRÍTICO — administração
Atualmente a autorização administrativa inclui o identificador da conta e a lista de
admins. Isso significa que o nome de conta, sozinho, não pode ser considerado uma
credencial administrativa forte.

Impacto: se a identidade de conta for falsificável, os endpoints administrativos podem
ser alcançados por um impostor.

Correção recomendada:
- Admin separado de conta de jogador.
- Credencial administrativa independente.
- Secret fora do repositório, via variável de ambiente.
- Sessão admin curta e revogável.
- Auditoria de cada ação admin com IP, conta, ação, alvo e timestamp.
- Checagem server-side em todos os endpoints administrativos.

Status: PENDENTE. As validações server-side existentes devem ser mantidas.
# 5. Risco CRÍTICO — persistência JSON em produção
jogadores.json é regravado em disco e já possui gravação atômica via arquivo temporário.
Isso reduz corrupção por escrita, mas não resolve concorrência de múltiplos processos,
escalabilidade, consultas, rollback transacional ou persistência em infraestrutura efêmera.

Impactos possíveis:
- perda de dados em deploy/restart se o armazenamento não for persistente;
- contenção de I/O em muitas ações simultâneas;
- último escritor pode sobrescrever mudanças de outro processo;
- dificuldade de backup, auditoria e recuperação seletiva.

Recomendação: PostgreSQL para produção, com transações e índices por account_id,
character_id e demais entidades relevantes. JSON pode permanecer no modo local/dev.

## 6. Risco ALTO — rate limiting WebSocket
O servidor já limita o tamanho do frame WebSocket a 64 KiB, o que é positivo.
Ainda falta uma limitação explícita de frequência de mensagens por conexão e por ação.

Recomendação:
- limite geral de mensagens por segundo por conexão;
- limite específico para login, criação de personagem, chat, troca e skills;
- penalidade progressiva e encerramento de conexão abusiva;
- métricas de mensagens rejeitadas.

Cuidado: o limite deve considerar o movimento e o ritmo normal do jogo para não bloquear
clientes legítimos de 60 FPS.

## 7. Risco ALTO — validação de payload
A arquitetura já valida muitas ações no servidor, mas o protocolo ainda recebe JSON
genérico e possui dezenas de ações diferentes no mesmo handler.

Recomendação:
- schema por ação;
- tipos e limites explícitos;
- rejeição imediata de campos inesperados em ações sensíveis;
- normalização de números finitos;
- limite de tamanho para strings e arrays;
- catálogo central de ações autorizadas por estado do jogador.
# 8. Segurança do combate
Pontos positivos encontrados:
- validação server-side do alvo do ataque básico;
- checagem de PvP;
- checagem de alcance;
- cooldowns server-side em várias skills;
- mana/stamina calculadas no servidor;
- movimento e colisão com validação;
- dano calculado no servidor;
- servidor é tratado como autoridade.

Pontos a manter como regra permanente:
O cliente nunca deve enviar dano final, XP final, HP final, posição final aceita,
loot final ou resultado de upgrade para o servidor aceitar cegamente.

## 9. Inventário/economia
Pontos positivos:
- classe e slot de equipamento são validados no servidor;
- item bloqueado não pode ser destruído;
- coleta verifica distância;
- poções são consumidas no servidor;
- ouro é atualizado no servidor.

Recomendação adicional:
Toda transação econômica importante deve ter um identificador único e log server-side.
Trocas, venda, compra, upgrade e criação administrativa de item devem ser idempotentes
contra repetição de pacote.

## 10. HTTP e arquivos
Correção aplicada: lista explícita de arquivos privados bloqueados.

Ainda recomendado para produção:
- preferir allowlist de assets públicos em vez de denylist;
- colocar cliente em uma pasta public/;
- deixar server/, data/ e config/ fora da raiz pública;
- adicionar headers de segurança;
- configurar CSP gradualmente;
- não usar Cache-Control no-store para absolutamente todos os assets em produção,
pois isso aumenta tráfego desnecessário.
# 11. Dados encontrados no working tree
jogadores.json possui alterações locais e personagens/testes recentes.
Por segurança, este arquivo NÃO deve ser incluído no commit público da auditoria.
O banco contém estado de jogadores e não deve ser tratado como código-fonte.

Recomendação futura:
- retirar jogadores.json do Git;
- usar banco externo/persistente;
- manter apenas jogadores.json.example vazio para desenvolvimento;
- revisar histórico do Git caso dados pessoais tenham sido commitados anteriormente.

## 12. UI Mobile — bugs corrigidos
Foram corrigidos dois problemas de posicionamento:
1. convite de grupo aparecendo no canto superior esquerdo;
2. janela de pesquisa por Nick saindo da área visível quando o teclado abre.

Causa principal: modais participavam do sistema de posições persistentes e a viewport
visual mudava com o teclado.

Correção:
- modais de sistema não persistem posição no mobile;
- centralização baseada em visualViewport;
- reposicionamento em resize/scroll/orientationchange;
- largura limitada ao viewport.

## 13. Visual — correções recentes
Dronemaster Titã recebeu um robô de combate mais detalhado, com blindagem, juntas,
pistões, núcleo, sensores, visor, canhão e detalhes mecânicos.

Sniper recebeu uma arma visual inspirada em uma Barrett .50, com coronha, receptor,
carregador, luneta, cano e freio de boca.

Essas alterações são visuais e não alteram dano, alcance ou cooldown.
# 14. Sniper — lógica revisada
- Skill 1 no mobile usa fluxo point-to-click: tocar a skill prepara a mira e o próximo
toque define o alvo.
- Skill 3 permite ataque básico enquanto o personagem permanece deitado.
- Movimento cancela a posição de franco-atirador.
- Outra habilidade cancela a posição, mantendo o ataque básico como exceção.
- Mira continua bloqueando movimento enquanto está ativa.

Validação sintática realizada após as alterações.

## 15. Testes executados
- node --check classes/dronemaster.js: OK.
- node --check server.js: OK.
- scripts inline do index.html: OK.
- Git status/diff revisados.
- Estrutura de classes, mapas, sistemas e documentos revisada.

Testes ainda recomendados:
- teste real com dois clientes para party/trade;
- teste mobile com teclado Android/iOS;
- teste de spam de WebSocket;
- teste de tentativa de acessar arquivos privados via HTTP;
- teste de impersonação de conta/admin;
- teste de duplicação de item/upgrade/troca;
- teste de reconnect e queda durante gravação.

## 16. Bugs/risco técnico para monitorar
- Persistência JSON sob carga.
- Reconexão e estado duplicado de jogador.
- Muitos VFX/monstros simultâneos no Mobile.
- Crescimento de arrays globais de efeitos/projéteis.
- Sons de proximidade em mapas populosos.
- Janelas arrastáveis em mudanças de orientação.
- Estado client-side divergente após rejeição server-side.
# 17. Melhorias de segurança recomendadas por ordem
P0 — antes de produção pública:
1. Autenticação real.
2. Admin com credencial forte fora do Git.
3. Banco persistente/transacional.
4. Rate limiting WebSocket.
5. Testes automatizados de autorização.
6. Separação public/server/data.

P1 — próxima fase:
7. Logs estruturados.
8. Monitoramento de erro e métricas.
9. Idempotência de economia.
10. Backups automáticos versionados.
11. Proteção contra spam de criação de personagens.
12. Limites para chat/social.

P2 — endurecimento:
13. CSP e headers de segurança.
14. Validação por schema.
15. Auditoria de sessões.
16. Ferramentas admin isoladas em rota privada.
17. Teste de carga.

## 18. Checklist para cada atualização
[ ] PC validado.
[ ] Mobile validado.
[ ] Cliente não decide valores competitivos.
[ ] Servidor valida payload.
[ ] Arquivos privados não estão no HTTP.
[ ] Nenhum segredo foi colocado no Git.
[ ] Teste sintático executado.
[ ] Teste funcional executado.
[ ] CHANGELOG atualizado.
[ ] INFO_PROJETO atualizado.
[ ] Versão incrementada.
[ ] Git diff revisado.

## 19. Conclusão técnica
O projeto está em estágio avançado de protótipo jogável e possui várias proteções
server-authoritative já implementadas. O próximo salto de qualidade não é adicionar
mais código de combate imediatamente: é fortalecer conta, administração, persistência,
rede e testes automatizados. Isso reduz o risco de perder progresso e permite que as
novas features sejam adicionadas sobre uma base mais segura.
