// Auditoria v1.60.0 — verificação estática dos itens 2..7 do relatório.
// Uso: node _auditoria_verifica.js
const fs = require('fs');
let pass = 0, fail = 0;
function r(n, ok, msg) { if (ok) { pass++; console.log('PASS ' + n + (msg ? ' · ' + msg : '')); } else { fail++; console.log('FAIL ' + n + ' — ' + msg); } }

const server = fs.readFileSync('server.js', 'utf8');
const skills = fs.readFileSync('skills.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

function tem(txt, regex, label) { return regex.test(txt); }
function achou(txt, regex) { const m = txt.match(regex); return m ? m[0] : null; }

// ---------------------------------------------------------------- 2. DURAÇÕES
console.log('--- 2. DURACOES (servidor = fonte de verdade) ---');
// Nevasca: servidor = 480 * (1000/60) = 8000ms
r('dur_nevasca_servidor', /480 \* \(1000 \/ 60\)/.test(server), 'server usa 480 ticks -> 8000ms');
r('dur_nevasca_skillsjs', /duracao: '8s'/.test(skills) && /por 8s/.test(skills), "skills.js agora diz '8s'");
r('dur_nevasca_sem24s', !/24s/.test(skills), "skills.js sem resquício de 24s");

// Chuva do Arqueiro: servidor = 140 * (1000/60) = 2333ms
r('dur_chuva_servidor', /140 \* \(1000 \/ 60\)/.test(server), 'server usa 140 ticks -> 2333ms');
r('dur_chuva_skillsjs', /duracao: '2\.3s'/.test(skills) && /por 2\.3s/.test(skills), "skills.js agora diz '2.3s'");
r('dur_chuva_sem7s', !/por 7s/.test(skills), "skills.js sem resquício de 7s");

// Vulcão: servidor = duracao 200 ticks * 50ms = 10s
const vulcaoTick = achou(server, /radius: 140, duracao: \d+/);
r('dur_vulcao_servidor', /radius: 140, duracao: 200/.test(server), 'server: duracao 200 ticks -> 10s');
r('dur_vulcao_skillsjs', /duracao: '10s'/.test(skills), "skills.js agora diz '10s'");

// Golem Colossal: servidor = colossalTimer 400 ticks * 50ms = 20s
r('dur_colossal_servidor', /ogroC\.colossalTimer = 400/.test(server), 'server: colossalTimer 400 ticks -> 20s');
r('dur_colossal_skillsjs', /duracao: '20s'/.test(skills), "skills.js agora diz '20s'");

// Bateria: stun 100 ticks = 5s, aplicado UMA vez por inimigo
r('dur_bateria_servidor', /slime\.stunTimer = 100/.test(server) && /stunsAplicados\[slime\.id\]/.test(server), 'server: stun 5s, 1x por inimigo');
r('dur_bateria_skillsjs', /Stun 5s \(1x por inimigo\)/.test(skills), 'skills.js agora diz Stun 5s (1x por inimigo)');
r('dur_bateria_canal', /Canal até a mana acabar/.test(skills), 'skills.js: canal sem duração fixa');
r('dur_bateria_sem125', !/1\.25s \(por batida\)/.test(skills), 'skills.js sem resquício de 1,25s por batida');

// ---------------------------------------------------------------- 3. ROQUEIRO
console.log('\n--- 3. TIPO DE DANO DO ROQUEIRO ---');
const linhaMagica = achou(server, /let ehMagico = \[[^\]]+\]/);
r('roqueiro_na_lista_magica', linhaMagica && linhaMagica.indexOf("'roqueiro'") !== -1, linhaMagica);
const riff = achou(skills, /\{ id: 'riff'[\s\S]{0,300}?danoUnidade: '([a-záéíóúç]+)'/);
const bat = achou(skills, /\{ id: 'bateria'[\s\S]{0,300}?danoUnidade: '([a-záéíóúç]+)'/);
r('roqueiro_riff_mago', riff && /danoUnidade: 'mágico'/.test(riff), 'riff agora rotulado mágico');
r('roqueiro_bateria_mago', bat && /danoUnidade: 'mágico'/.test(bat), 'bateria agora rotulada mágico');
r('roqueiro_banda_afinidade', /skill\.id === 'banda'\) return \{ chave: 'afinidade'/.test(skills), 'banda -> Afinidade (origem pet)');
// nenhum trecho do servidor trata dano de roqueiro como força
const forcaEspecial = /classe === 'roqueiro'[^\n]{0,120}forca/i.test(server);
r('roqueiro_sem_forca', !forcaEspecial, 'nenhum tratamento especial p/ Força do Roqueiro');

// ---------------------------------------------------------------- 4. FÚRIA CRESCENTE
console.log('\n--- 4. FURIA CRESCENTE (Bárbaro) ---');
const calculoDano = achou(server, /function calcularDanoJogador[\s\S]{0,4500}/);
r('furia_no_calculo_centro', /classe === 'barbaro' && p\.maxHp > 0/.test(calculoDano || ''), 'está dentro de calcularDanoJogador (cálculo central)');
r('furia_patamares', /pctHp <= 0\.20\) mult \*= 1\.15;[\s\S]{0,160}?pctHp <= 0\.40\) mult \*= 1\.10;[\s\S]{0,160}?pctHp <= 0\.60\) mult \*= 1\.05;/.test(calculoDano || ''), '20% => x1.15 | 40% => x1.10 | 60% => x1.05 | acima de 60% => sem bônus');
r('furia_dinamica_hp', !/furiaCrescenteNivel/.test(calculoDano || ''), 'lê p.hp/p.maxHp em tempo de dano => atualiza sozinho conforme o HP muda');
r('furia_nao_altera_base', /quantidade \* mult \* critMult/.test(calculoDano || ''), 'bônus entra só como multiplicador do modificador (base intacta)');
r('furia_documentada', /60% HP: \+5% tamanho, \+5% dano/.test(skills), 'bônus documentado no skills.js');

// ---------------------------------------------------------------- 5. IMUNIDADE
console.log('\n--- 5. IMUNIDADE DO ARQUEIRO ---');
const aplicar = achou(server, /function aplicarDanoJogador[\s\S]{0,3000}/);
r('imune_lido_pve', /if \(jogador\.imune\) return true;/.test(aplicar), 'aplicarDanoJogador agora consulta jogador.imune');
r('imune_setado', /p\.imune = true;/.test(server), 'p.imune = true no cast');
r('imune_limpo_tiro', /p\.imune = false;\s*\n\s*chuvasFlechaNova\.push/.test(server), 'limpo ao disparar a chuva');
r('imune_limpo_expira', /p\.saltoChuvaAtivo = false;\s*\n\s*p\.saltoChuvaEmAndamento = false;\s*\n\s*p\.imune = false;/.test(server), 'limpo ao expirar 3s');
r('imune_veneno', /!p\.ladinoDancaAtivo && !p\.imune && efeitos\.temEfeito\(p, 'veneno'\)/.test(server), 'vale também pro veneno do pântano');
const pvp = achou(server, /function aplicarDanoPvP[\s\S]*?\nfunction danoEmPlayers/);
const pvpSemComentario = pvp ? pvp.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n') : '';
r('imune_pvp_nao_afeta', pvpSemComentario && !/\.imune\b/.test(pvpSemComentario), 'aplicarDanoPvP NÃO consulta .imune no código (imunidade é só PvE — decisão v1.60.1)');
r('imune_pvp_marcado', /NOTA v1\.60\.1: `p2\.imune`/.test(server), 'decisão documentada no código para não ser "corrigida" depois');

// ---------------------------------------------------------------- 6. DRONEMASTER ASSALTO
console.log('\n--- 6. DRONEMASTER / ASSALTO (CD) ---');
r('assalto_cd_servidor_15s', /dmAssaltoCooldown = Date\.now\(\) \+ 15000/.test(server), 'servidor 15000ms');
r('assalto_cd_cliente_15s', /btnDmAssalto, 15000\)/.test(index) && /\}, 15000\);/.test(index), 'cliente 15000ms (2 ocorrências)');
r('assalto_hud_15', /\['btn-dm-assalto', \(\) => window\.dmAssaltoCooldown, 15\]/.test(index), 'HUD fallback 15s');
r('assalto_skillsjs_15', /\{ id: 'assalto_dm'[\s\S]{0,600}?cd: 15/.test(skills), 'skills.js cd 15s');
r('assalto_sem_10s', !/btnDmAssalto, 10000\)/.test(index), 'cliente sem resquício de 10000ms');

// ---------------------------------------------------------------- 7. ALCANCES
console.log('\n--- 7. ALCANCES / MIRAS ---');
const casos = [
    ['meteoro', 380, /meteoro:[^\n]*alcanceMax: 380/, /checarSkill\('meteoro', 30, tx, ty, 380\)/, /id: 'meteoro'[\s\S]{0,300}?alcance: 'Mira 380px'/],
    ['nevasca', 350, /nevasca:[^\n]*alcanceMax: 350/, /checarSkill\('nevasca', 35, tx, ty, 350\)/, /id: 'nevasca'[\s\S]{0,300}?alcance: 'Mira 350px'/],
    ['chuva', 420, /chuva:[^\n]*alcanceMax: 420/, /checarSkill\('chuva', 22, tx, ty, 420\)/, /id: 'chuva'[\s\S]{0,300}?alcance: 'Mira 420px'/],
    ['julgamento', 340, /julgamento:[^\n]*alcanceMax: 340/, /checarSkill\('julgamento', 24, tx, ty, 340\)/, /id: 'julgamento'[\s\S]{0,300}?alcance: 'Mira 340px'/]
];
casos.forEach(c => {
    r('alcance_' + c[0] + '_drag', c[2].test(index), 'SKILLS_DRAG ' + c[1] + 'px');
    r('alcance_' + c[0] + '_checar', c[3].test(index), 'checarSkill ' + c[1] + 'px');
    r('alcance_' + c[0] + '_skillsjs', c[4].test(skills), 'skills.js ' + c[1] + 'px');
});
// servidor: valida o alcance dessas 4 skills (v1.60.1) — rejeita E avisa
const validacoes = [
    ['meteoro', 380],
    ['nevasca', 350],
    ['arqueiro_chuva', 420],
    ['curandeiro_julgamento', 340]
];
r('alcance_helper', /function alcanceSkillValido\(p, targetX, targetY, limitePx\)/.test(server), 'helper alcanceSkillValido existe');
r('alcance_usa_aviso', /avisaForaAlcance\(ws, 'meteoro'\)/.test(server), 'usa o feedback existente (skill_aviso / fora_alcance)');
validacoes.forEach(v => {
    const re = new RegExp("alcanceSkillValido\\(players\\[playerId\\], data\\.targetX, data\\.targetY, " + v[1] + "\\) \\) \\{ avisaForaAlcance\\(ws, '" + v[0] + "'\\)");
    const re2 = new RegExp("alcanceSkillValido\\(players\\[playerId\\], data\\.targetX, data\\.targetY, " + v[1] + "\\)\\) \\{ avisaForaAlcance\\(ws, '" + v[0] + "'\\)");
    r('alcance_server_' + v[0], re.test(server) || re2.test(server), `servidor valida ${v[1]}px em '${v[0]}'`);
});
// a validação de alcance precisa vir ANTES do cooldown (cast errado não queima o CD)
['meteoro', 'nevasca', 'arqueiro_chuva', 'curandeiro_julgamento'].forEach(acao => {
    const iA = server.indexOf("avisaForaAlcance(ws, '" + acao + "')");
    const iC = server.indexOf("cdSkillExpirado(ws, players[playerId], 'last" + acao.split('_').pop().replace(/^./, c => c.toUpperCase()) + "'");
    r('alcance_antes_cd_' + acao, iA !== -1 && (iC === -1 || iA < iC), 'alcance validado antes do cooldown');
});

// ---------------------------------------------------------------- 1. HUD coerente
console.log('\n--- 1b. HUD de cooldown coerente com o uso real ---');
const hud = [
    ['btn-arqueiro-perfurante', 4.5, 4500],
    ['btn-curandeiro-cura', 5, 5000],
    ['btn-curandeiro-julgamento', 6.5, 6500],
    ['btn-tornado', 5, 5000]
];
hud.forEach(h => {
    const okHud = new RegExp("\\['" + h[0] + "',[^\\]]*, " + h[1] + "\\]").test(index);
    r('hud_' + h[0], okHud, 'fallback ' + h[1] + 's (uso real ' + h[2] + 'ms)');
});
r('handler_cooldown_cliente', /motivo === 'cooldown'/.test(index), 'cliente exibe "Em recarga!" sem cancelar o anel');

// ---------------------------------------------------------------- 8. ATRIBUTOS vs ORIGEM 'pet'
console.log('\n--- 8. ATRIBUTO EXIBIDO x ORIGEM REAL (skills.js) ---');
const petSkills = ['ogro', 'esmagamento', 'salto', 'colossal', 'sismico', 'banda'];
petSkills.forEach(id => {
    const noMapeamento = new RegExp("skill\\.id === '" + id + "'").test(skills);
    r('pet_' + id + '_afinidade', noMapeamento, id + ' -> Afinidade (servidor usa origem pet)');
});
const fnAtr = achou(skills, /function atributoEscalaSkill[\s\S]{0,1400}/);
r('pet_sismico_nao_forca', fnAtr && fnAtr.indexOf("skill.id === 'sismico'") !== -1 && fnAtr.indexOf("skill.id === 'sismico'") < fnAtr.indexOf('indexOf(window.minhaClasse)'), 'sismico casa ANTES do fallback de classe (nunca cai em Força)');

// ---------------------------------------------------------------- 9. BATERIA (Roqueiro)
console.log('\n--- 9. BATERIA: CD condicional (só por mana) ---');
r('bateria_skillsjs_cd10', /\{ id: 'bateria'[\s\S]{0,400}?cd: 10/.test(skills), 'skills.js cd 10');
r('bateria_skillsjs_nota', /CD 10s APENAS ao terminar por mana/.test(skills), 'skills.js explica a condição');
r('bateria_skillsjs_nao6', !/\{ id: 'bateria'[\s\S]{0,400}?cd: 6,/.test(skills), 'skills.js sem resquício de cd 6');
r('bateria_servidor_10s', /bateriaCooldown = Date\.now\(\) \+ 10000/.test(server), 'servidor 10000ms quando acaba por mana');
r('bateria_servidor_condicional', /applyCd = \(player\.maxMp > 0 && player\.mana <= player\.maxMp \* 0\.10\)/.test(server), 'servidor só aplica CD se terminar por mana');
r('bateria_cliente_10s', /registrarCooldownBotao\(btnRoq, 10000\)/.test(index), 'cliente 10000ms');
r('bateria_cliente_condicional', /if \(dados\.cooldown\) \{\s*\n\s*window\.roqueiroBateriaCooldown = true/.test(index), 'cliente só aplica CD se servidor mandou cooldown:true');

// ---------------------------------------------------------------- 10. MARGEM DE 500ms
console.log('\n--- 10. MARGEM SERVER = CLIENTE - 500ms (convencao) ---');
// Skills antigas (checagem inline `lastX < N`)
const margem = [
    ['escudo_lancamento', 9500, 10000],
    ['vulcao', 19500, 20000],
    ['provocacao', 14500, 15000],
    ['salto_chuva', 24500, 25000],
    ['cantico', 14500, 15000],
    ['vinculo', 29500, 30000],
    ['buraco_negro', 24500, 25000],
    ['summoner_golem', 29500, 30000]
];
margem.forEach(m => {
    const srv = new RegExp('last[A-Za-z]* < ' + m[1] + '\\b').test(server);
    r('margem_antiga_' + m[0], srv, `servidor ${m[1]}ms / cliente ${m[2]}ms (delta 500ms)`);
});
// As 9 skills novas (checagem via cdSkillExpirado) — MESMA convenção
const margemNova = [
    ['Meteoro', 'Meteoro', 7000, 6500],
    ['Nevasca', 'Nevasca', 12000, 11500],
    ['Chuva', 'Chuva', 6000, 5500],
    ['Perfurante', 'Perfurante', 4500, 4000],
    ['Rajada', 'Rajada', 12000, 11500],
    ['Tornado', 'Tornado', 5000, 4500],
    ['Esmagamento', 'Esmagamento', 6000, 5500],
    ['Cura', 'Cura', 5000, 4500],
    ['Julgamento', 'Julgamento', 6500, 6000]
];
margemNova.forEach(m => {
    const re = new RegExp("cdSkillExpirado\\(ws, players\\[playerId\\], 'last" + m[1] + "', " + m[3] + "\\b");
    const tem = re.test(server);
    const antigo = new RegExp("cdSkillExpirado\\(ws, players\\[playerId\\], 'last" + m[1] + "', " + m[2] + "\\b").test(server);
    r('margem_nova_' + m[0], tem && !antigo, `servidor ${m[3]}ms / cliente ${m[2]}ms (delta 500ms)`);
});
r('margem_nova_quantidade', (server.match(/cdSkillExpirado\(ws, players\[playerId\]/g) || []).length === 9, 'exatamente 9 skills usando cdSkillExpirado');

console.log('\n=== VERIFICACAO ESTATICA: ' + pass + ' PASS / ' + fail + ' FAIL ===');
process.exit(fail ? 1 : 0);
