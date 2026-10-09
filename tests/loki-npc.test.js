'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const forge = fs.readFileSync(path.join(root, 'ferreiro.js'), 'utf8');
const renderer = fs.readFileSync(path.join(root, 'loki-npc.js'), 'utf8');
const admin = fs.readFileSync(path.join(root, 'npc-admin.js'), 'utf8');
const adminPanel = fs.readFileSync(path.join(root, 'admin-cheats.js'), 'utf8');
const forgeClient = fs.readFileSync(path.join(root, 'ferreiro.js'), 'utf8');

test('Loki is registered at the requested world coordinates with server-checked forge service', () => {
    assert.match(server, /loki_forja:\s*\{\s*id:\s*'loki_forja',\s*nome:\s*'Loki',\s*x:\s*144238,\s*y:\s*13894,\s*mapa:\s*'mundo',\s*raioInteracao:\s*105,\s*servico:\s*'forja',\s*spriteDir:\s*'ferreiro',\s*iconeInteracao:\s*'ferreiro\.png',\s*animacao:\s*'custom\/tool_hammer\/down'/);
    assert.match(server, /npc\.servico === 'forja'[\s\S]{0,180}type: 'npc_service_open'[\s\S]{0,100}npcId: npc\.id/);
    assert.match(server, /const poseAtualNpc = npcPoseAtual\(npc, Date\.now\(\)\);[\s\S]{0,120}Math\.hypot\(pNpc\.x - poseAtualNpc\.x, pNpc\.y - poseAtualNpc\.y\)/);
});

test('Loki uses the supplied front-facing hammer and idle animation frames', () => {
    const assets = path.join(root, 'sprites', 'NPC', 'ferreiro');
    assert.match(renderer, /var DEFAULT_HAMMER = 'custom\/tool_hammer\/down'/);
    assert.match(renderer, /var DEFAULT_IDLE = 'standard\/idle\/down'/);
    assert.match(renderer, /loadAnimation\(id, count, spriteDir\)/);
    assert.match(renderer, /var hammerDuration = \(npc\.quadros \|\| 9\) \* frameMs;[\s\S]*var idleDuration = 2 \* frameMs/);
    assert.match(renderer, /ctx\.drawImage\(image, bounds\.x, bounds\.y, bounds\.width, bounds\.height/);
    for (let frame = 1; frame <= 9; frame++) {
        assert.ok(fs.existsSync(path.join(assets, 'custom', 'tool_hammer', 'down', `${frame}.png`)));
    }
    for (let frame = 1; frame <= 2; frame++) {
        assert.ok(fs.existsSync(path.join(assets, 'standard', 'idle', 'down', `${frame}.png`)));
    }
});

test('nearby NPC interaction shows a high speech icon and hides it after interaction', () => {
    assert.match(html, /sprites\/Objetos\/icones\/SEM-ICONE\.png/);
    assert.match(html, /sprites\/Objetos\/icones\/' \+ nomeIcone/);
    assert.match(html, /npcInteracaoOcultaId = npc\.id/);
    assert.match(html, /const linhaBaseNome = rect\.top \+ \(npc\.y - camY - 61\) \* escalaTelaY/);
    assert.match(html, /icon\.style\.top = Math\.round\(linhaBaseNome - 16 \* escalaTelaY - 8 - 44\)/);
    assert.match(html, /#npc-interacao-icone\{[^}]*z-index:9/);
    assert.match(html, /icon\.classList\.toggle\('ativo', window\.npcInteracaoOcultaId !== npc\.id\)/);
    assert.match(html, /icon\.classList\.toggle\('npc-interacao-loki', isLoki\)/);
    assert.match(html, /window\.solicitarInteracaoNPC\(window\.npcInteracaoAtiva\)/);
    assert.match(html, /key === 'f' \|\| code === 'KeyF'[\s\S]{0,260}solicitarInteracaoNPC/);
    assert.match(html, /Math\.hypot\(mx - npcClicado\.x, my - \(npcClicado\.y - 28\)\) <= 48/);
    assert.match(html, /dados\.type === 'npc_service_open'[\s\S]{0,180}window\.abrirFerreiro\(dados\.npcId\)/);
});

test('the existing forge UI opens at Loki and remains bound to its map and proximity', () => {
    assert.match(forge, /var NPC_LOKI = \{ x: 144238, y: 13894, r: 52, mapa: 'mundo' \}/);
    assert.match(forge, /function obterPontoFerreiro\(npcId\)/);
    assert.match(forge, /window\.npcsInterativos \|\| \[\]/);
    assert.match(forge, /window\.currentMap !== mapaForja/);
    assert.match(forge, /iniciarChecagemCidade\(pontoForja, mapaForja, npcId\)/);
});

test('Loki is rendered in the world Y-sort and the image renderer is loaded', () => {
    assert.match(html, /loki-npc\.js\?v=5/);
    assert.match(html, /window\.LokiNpcRenderer\.desenhar\(ctx, npc, Date\.now\(\)\)/);
    assert.match(html, /npc\.spriteDir/);
});

test('the admin editor offers all installed animations and persists position, animation, and patrols server-side', () => {
    assert.match(server, /function npcAnimacoesDisponiveis\(spriteDir\)/);
    assert.match(server, /fs\.readdirSync\(pastaCategoria/);
    assert.match(server, /type: 'npc_admin_state'[\s\S]{0,100}animacoes: NPC_ANIMACOES_DISPONIVEIS/);
    assert.match(server, /const configValidada = npcConfigValido\(npc\.id, configCandidata\)/);
    assert.match(server, /function salvarNpcConfigs\(configs\)/);
    assert.match(server, /fs\.renameSync\(temporario, NPC_CONFIG_FILE\)/);
    assert.match(server, /type: 'npc_state'/);
    assert.match(server, /sequenciaAnimacoes: sequenciaValida, animacaoConversa: animacaoConversa/);
    assert.match(server, /loop: etapa\.loop !== false/);
    assert.match(server, /pose\.animacaoAtual = etapa\.animacao/);
    assert.match(server, /pose\.animacaoLoop = etapa\.loop !== false/);
    assert.match(server, /!Number\.isFinite\(velocidadeFrames\) \|\| velocidadeFrames < 1 \|\| velocidadeFrames > 30/);
    assert.match(server, /velocidadeFrames: npc\.velocidadeFrames \|\| 10/);
    assert.match(server, /npc\.conversaInicioEm && npc\.conversaAte > agora/);
    assert.match(server, /function npcAgendaAtual\(npc, agora\)/);
    assert.match(server, /function horariosSeSobrepoem\(a, b\)/);
    assert.match(server, /intervalosDesativados: intervalosValidos/);
    assert.match(server, /poseAtualNpc\.desativado/);
    assert.match(server, /npc_service_close/);
    assert.match(server, /npc\.conversaPose = \{ x: poseConversa\.x, y: poseConversa\.y \}/);
    assert.match(server, /npcRotaPausar\(npc, Date\.now\(\)\)/);
    assert.match(admin, /Desenhar percurso/);
    assert.match(admin, /iniciarArraste/);
    assert.match(admin, /npc-admin-add-sequence/);
    assert.match(admin, /npc-admin-sequence-loop/);
    assert.match(admin, /npc-admin-frame-speed/);
    assert.match(admin, /salvarConfigNpc\(npc, \{ velocidadeFrames: speed \}/);
    assert.match(admin, /renderer\.desenharPrevia\([\s\S]{0,180}state\.previewSpriteDir\)/);
    assert.match(admin, /renderer\.desenharPrevia/);
    assert.match(admin, /width:min\(760px,96vw\)/);
    assert.match(admin, /npc-admin-layout/);
    assert.match(admin, /npc-admin-route-add/);
    assert.match(admin, /npc-admin-off-add/);
    assert.match(admin, /rotasProgramadas: rotas/);
    assert.match(admin, /intervalosDesativados: intervalos/);
    assert.match(admin, /route\.patrulha/);
    assert.match(renderer, /function duracaoQuadro\(fps\)/);
    assert.match(renderer, /frameFor\(walkAnimation, walkFrames, timeMs, walkFrames \* frameMs, true, spriteDir\)/);
    assert.match(admin, /npc-admin-conversation-animation/);
    assert.match(admin, /data-sequence-remove/);
    assert.match(admin, /global\.addEventListener\('pointermove', aoMoverPonteiro, true\)/);
    assert.match(admin, /patrulha: state\.percursoTemporario/);
    assert.match(admin, /salvarRotasProgramadas\(npc, rotas/);
    assert.match(admin, /ctx\.closePath\(\)/);
    assert.match(html, /npc-admin\.js\?v=6/);
    assert.match(html, /loki-npc\.js\?v=5/);
    assert.match(html, /window\.NpcAdmin\.drawOverlay\(ctx\)/);
    assert.match(adminPanel, /window\.toggleNpcAdmin\(\)/);
    assert.match(forgeClient, /action: 'npc_service_close'/);
});
