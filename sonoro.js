/* sonoro.js — Sons REAIS (arquivos em Sonoro/) para as skills das classes + BGM da Cidade.
 * Reutiliza o playback WebAudio do jogo (tocarSomArquivo, com cache de buffer), 
 * com fallback para <audio> se necessário. Todos os arquivos do usuário ficam aqui
 * mapeados por chave (curandeiro / guerreiro / mago / sniper + cidade).
 */
(function (global) {
    'use strict';

    var ARQUIVOS = {
        curandeiro_cura:       { caminho: 'Sonoro/curandeiro/cura.wav',             volume: 0.8 },
        curandeiro_julgamento: { caminho: 'Sonoro/curandeiro/Julgamento.ogg',       volume: 0.8 },
        curandeiro_aura:       { caminho: 'Sonoro/curandeiro/Aura_sagrada.ogg',     volume: 0.7 },
        curandeiro_skill4:     { caminho: 'Sonoro/curandeiro/Skill_4_Curandeiro.wav', volume: 0.85 },
        curandeiro_cantico:    { caminho: 'Sonoro/curandeiro/Skill_4_Curandeiro.wav', volume: 0.85 },
        guerreiro_tornado:     { caminho: 'Sonoro/Guerreiro/guereiro_tornardo.ogg', volume: 0.85 },
        guerreiro_block:       { caminho: 'Sonoro/Guerreiro/guerreiro_block.ogg',   volume: 0.75 },
        guerreiro_grito:       { caminho: 'Sonoro/Guerreiro/guerreiro_Grito.ogg',   volume: 0.9 },
        guerreiro_morto:       { caminho: 'Sonoro/Guerreiro/guerreiro_morto.ogg',   volume: 0.9 },
        guerreiro_damage:      { caminho: 'Sonoro/Guerreiro/Guerreiro_damage.wav',  volume: 0.75 },
        guerreiro_skill4:      { caminho: 'Sonoro/Guerreiro/Guerreiro_skill_4.wav', volume: 0.85 },
        guerreiro_escudo_lancamento: { caminho: 'Sonoro/Guerreiro/Guerreiro_skill_4.wav', volume: 0.85 },
        mago_atk:              { caminho: 'Sonoro/Mago/atk-alto-mago.wav',          volume: 0.7 },
        mago_damage:           { caminho: 'Sonoro/Mago/damage_mago.wav',            volume: 0.75 },
        mago_teleport:         { caminho: 'Sonoro/Mago/mago_teleport.ogg',          volume: 0.75 },
        mago_meteoro:          { caminho: 'Sonoro/Mago/meteo%201.wav',              volume: 0.85 },
        mago_meteoro_queda:    { caminho: 'Sonoro/Mago/meteo%201.wav',              volume: 0.85 },
        mago_meteoro_impacto:  { caminho: 'Sonoro/Mago/meteo%202.wav',              volume: 0.9 },
        mago_nevasca:          { caminho: 'Sonoro/Mago/mago_nevasca.ogg',           volume: 0.8 },
        mago_lava_fervendo:    { caminho: 'Sonoro/Mago/mago_lava_fervendo.ogg',     volume: 0.8 },
        mago_lava_impacto:     { caminho: 'Sonoro/Mago/mago_lava_Impacto.wav',      volume: 0.85 },
        mago_skill4:           { caminho: 'Sonoro/Mago/mago_skill-4.wav',           volume: 0.85 },
        mago_skill4_rolar:     { caminho: 'Sonoro/Mago/mago_skill-4.wav',           volume: 0.85 },
        mago_skill4_impacto:   { caminho: 'Sonoro/Mago/mago_skill-4-impacto.wav',   volume: 0.9 },
        sniper_atk:            { caminho: 'Sonoro/Sniper/Sniper_atk_basico.ogg',    volume: 0.5 },
        sniper_disparo:        { caminho: 'Sonoro/Sniper/Sniper_disparo.ogg',       volume: 0.85 },
        sniper_rede:           { caminho: 'Sonoro/Sniper/sniper_Teia_Granada.ogg',  volume: 0.7 },
        sniper_camuflagem:     { caminho: 'Sonoro/Sniper/sniper_camuflagem.ogg',    volume: 0.6 },
        sniper_damage:         { caminho: 'Sonoro/Sniper/Sniper_damage.wav',        volume: 0.75 },
        // v1.50.0: som genérico de "ação bloqueada/recusada" (Camuflagem
        // Natural sem a roupa, skill em recarga, etc.). Curto e seco.
        erro:                  { caminho: 'Sonoro/Sniper/sniper_camuflagem.ogg',    volume: 0.4 },
        summoner_teleport:     { caminho: 'Sonoro/Summoner/summoner_teleport.ogg',  volume: 0.75 },
        summoner_salto:        { caminho: 'Sonoro/Summoner/summoner_salto.ogg',     volume: 0.8 },
        summoner_comandoPET:   { caminho: 'Sonoro/Summoner/summoner_comandoPET.ogg', volume: 0.8 },
        summoner_damage:       { caminho: 'Sonoro/Summoner/Summoner_damage.wav',    volume: 0.75 },
        summoner_skill4_1:     { caminho: 'Sonoro/Summoner/Summoner_skill4_1%20(1).wav', volume: 0.85 },
        summoner_skill4_2:     { caminho: 'Sonoro/Summoner/Summoner_skill4_1%20(2).wav', volume: 0.85 },
        summoner_skill4_fim:   { caminho: 'Sonoro/Summoner/Summoner_Skill4_3.wav',   volume: 0.9 },
        summoner_skill4_3:     { caminho: 'Sonoro/Summoner/Summoner_Skill4_3.wav',   volume: 0.9 },
        // ===== ARQUEIRA =====
        arqueira_atk:             { caminho: 'Sonoro/arqueira/atk_basico.ogg',           volume: 0.55 },
        arqueira_chuva:           { caminho: 'Sonoro/arqueira/chuva%20de%20flacha.ogg',   volume: 0.65 },
        arqueira_perfurante:      { caminho: 'Sonoro/arqueira/disparo%20perfurante.ogg',  volume: 0.7 },
        arqueira_rajada_carregar: { caminho: 'Sonoro/arqueira/Rajada%20e%20Flechas%201.ogg', volume: 0.6 },
        arqueira_rajada_soltar:   { caminho: 'Sonoro/arqueira/Rajada%20e%20Flechas%202.ogg', volume: 0.7 },
        // ===== BERSERKER (BÁRBARO) =====
        barbaro_atk:           { caminho: 'Sonoro/Berseker/atk_basico.ogg',         volume: 0.6 },
        barbaro_furia:         { caminho: 'Sonoro/Berseker/Furia.ogg',              volume: 0.8 },
        barbaro_esmagamento:   { caminho: 'Sonoro/Berseker/espagamento.ogg',        volume: 0.85 },
        barbaro_giro:          { caminho: 'Sonoro/Berseker/giro_descontrolado.wav', volume: 0.8 },
        // ===== DRONEMASTER =====
        dronemaster_atk:              { caminho: 'Sonoro/DroneMaster/atk_basico_drone.ogg',        volume: 0.5 },
        dronemaster_supressao:        { caminho: 'Sonoro/DroneMaster/modo_supressao.ogg',          volume: 0.75 },
        dronemaster_assalto:          { caminho: 'Sonoro/DroneMaster/modo%20assalto.wav',          volume: 0.75 },
        dronemaster_assalto_impacto:  { caminho: 'Sonoro/DroneMaster/modo%20assalto_Impacto.wav',  volume: 0.85 },
        dronemaster_assalto_atk:      { caminho: 'Sonoro/DroneMaster/modo%20assalto_Impacto.wav',  volume: 0.85 },
        dronemaster_caixa:            { caminho: 'Sonoro/DroneMaster/Caixa%20de%20ferramenta.ogg', volume: 0.75 },
        dronemaster_tita:             { caminho: 'Sonoro/DroneMaster/Protocolo_Titan.wav',         volume: 0.85 },
        dronemaster_escudo:           { caminho: 'Sonoro/DroneMaster/Escudo_energia.ogg',          volume: 0.7 },
        cidade_bgm:                   { caminho: 'Sonoro/Cidade/dentro_cidade.mp3',        volume: 0.38 },
        // ===== ROQUEIRO (GUITARRISTA) =====
        roqueiro_atk:          { caminho: 'Sonoro/Roqueiro/atk_basico.mp3',        volume: 0.65 },
        roqueiro_banda:        { caminho: 'Sonoro/Roqueiro/Banda.ogg',             volume: 0.8 },
        roqueiro_bateria:      { caminho: 'Sonoro/Roqueiro/Bateria.mp3',           volume: 0.75 },
        roqueiro_dash:         { caminho: 'Sonoro/Roqueiro/Dash.mp3',              volume: 0.7 },
        roqueiro_damage:       { caminho: 'Sonoro/Roqueiro/Roqueiro_damage.wav',   volume: 0.75 },
        roqueiro_skill4:       { caminho: 'Sonoro/Roqueiro/Roqueiro_skill_4.mp3',  volume: 0.85 },
        roqueiro_grito_guerra: { caminho: 'Sonoro/Roqueiro/Roqueiro_skill_4.mp3',  volume: 0.85 },
        // ===== PIKEMAN (GUERREIRO DA FOICE) =====
        pikeman_atk:              { caminho: 'Sonoro/Pikeman/atk-basico.wav',         volume: 0.7 },
        pikeman_dash:             { caminho: 'Sonoro/Pikeman/Dash.wav',               volume: 0.8 },
        pikeman_damage:           { caminho: 'Sonoro/Pikeman/Damage.wav',             volume: 0.75 },
        pikeman_giro:             { caminho: 'Sonoro/Pikeman/Skill-1.wav',            volume: 0.85 },
        pikeman_skill1:           { caminho: 'Sonoro/Pikeman/Skill-1.wav',            volume: 0.85 },
        pikeman_skill2_hit1:      { caminho: 'Sonoro/Pikeman/skill-2_hit1.wav',       volume: 0.8 },
        pikeman_skill2_hit2:      { caminho: 'Sonoro/Pikeman/skill-2_hit2.wav',       volume: 0.8 },
        pikeman_skill2_hit3:      { caminho: 'Sonoro/Pikeman/skill-2_hit3.wav',       volume: 0.85 },
        pikeman_geada:            { caminho: 'Sonoro/Pikeman/skill-3.wav',            volume: 0.85 },
        pikeman_skill3:           { caminho: 'Sonoro/Pikeman/skill-3.wav',            volume: 0.85 },
        pikeman_skill4_carregar:  { caminho: 'Sonoro/Pikeman/skill4_carregando.wav',  volume: 0.85 },
        pikeman_skill4_hit1:      { caminho: 'Sonoro/Pikeman/Skill4_hit1.wav',        volume: 0.9 },
        pikeman_skill4_hit2:      { caminho: 'Sonoro/Pikeman/Skill4_hit2.wav',        volume: 0.9 },
        pikeman_skill4_hit3:      { caminho: 'Sonoro/Pikeman/Skill4_hit3.wav',        volume: 0.95 },
        // ===== ARENA DE SOLARI (v1.59.0) =====
        solari_bgm:            { caminho: 'Sonoro/Arena%20Solare/BGM_Fundo.mp3',                   volume: 0.38 },
        solari_contagem:       { caminho: 'Sonoro/Arena%20Solare/Contagem%2010segundos.mp3',       volume: 0.95 },
        solari_round_1:        { caminho: 'Sonoro/Arena%20Solare/round1.wav',                      volume: 0.85 },
        solari_round_2:        { caminho: 'Sonoro/Arena%20Solare/round2.wav',                      volume: 0.85 },
        solari_round_3:        { caminho: 'Sonoro/Arena%20Solare/round3.wav',                      volume: 0.85 },
        solari_round_4:        { caminho: 'Sonoro/Arena%20Solare/round4.wav',                      volume: 0.85 },
        solari_round_5:        { caminho: 'Sonoro/Arena%20Solare/round5.wav',                      volume: 0.85 },
        solari_round_6:        { caminho: 'Sonoro/Arena%20Solare/round6.wav',                      volume: 0.85 },
        solari_round_7:        { caminho: 'Sonoro/Arena%20Solare/round7.wav',                      volume: 0.85 },
        solari_round_8:        { caminho: 'Sonoro/Arena%20Solare/round8.wav',                      volume: 0.85 },
        solari_round_9:        { caminho: 'Sonoro/Arena%20Solare/round9.wav',                      volume: 0.90 },
        solari_vitoria:        { caminho: 'Sonoro/Arena%20Solare/congratulation.wav',              volume: 0.95 },
        solari_round_fim:      { caminho: 'Sonoro/Arena%20Solare/Ao%20finalizar%20Round.ogg',       volume: 0.85 },
        solari_round_10_fim:   { caminho: 'Sonoro/Arena%20Solare/congratulation.wav',              volume: 0.95 },
        solari_rolar:          { caminho: 'Sonoro/Arena%20Solare/ao%20rolar%20a%20chance%20de%20ganhar%20o%20item.ogg', volume: 0.75 },
        solari_ganhar:         { caminho: 'Sonoro/Arena%20Solare/ao%20ganhar%20o%20item.ogg',       volume: 0.85 },
        // ===== DEBUFFS & UI (v1.59.0) =====
        debuff_stun:           { caminho: 'Sonoro/SOM%20GERAL/Debuff/Stun.ogg',                    volume: 0.80 },
        debuff_lentidao:       { caminho: 'Sonoro/SOM%20GERAL/Debuff/lentidao.ogg',                volume: 0.80 },
        ui_levelup:            { caminho: 'Sonoro/SOM%20GERAL/ui/level%20UP.wav',                  volume: 0.85 },
        ui_gold:               { caminho: 'Sonoro/SOM%20GERAL/ui/gold_comprandoven-vendendo.mp3',  volume: 0.80 },
        // ===== MOVIMENTAÇÃO / PASSOS (TODAS AS CLASSES — v1.56.0) =====
        andar:                 { caminho: 'Sonoro/Movimentando/Andando_todas_classes.wav',          volume: 0.35 },
        passo:                 { caminho: 'Sonoro/Movimentando/Andando_todas_classes.wav',          volume: 0.35 },
        // ===== ARQUEIRO ASTRAL (ARQUEIRO ARCANO — v1.57.0) =====
        astral_damage:          { caminho: 'Sonoro/Arqueiro%20Astral/Astral_damage.wav',          volume: 0.75 },
        astral_atk:             { caminho: 'Sonoro/Arqueiro%20Astral/atk_basico_astral.wav',      volume: 0.65 },
        astral_skill1:          { caminho: 'Sonoro/Arqueiro%20Astral/Skill_1_astral.mp3',         volume: 0.8 },
        astral_skill2:          { caminho: 'Sonoro/Arqueiro%20Astral/skill_2_astral.mp3',         volume: 0.8 },
        astral_skill3:          { caminho: 'Sonoro/Arqueiro%20Astral/skill_3_astral.wav',         volume: 0.8 },
        astral_skill4:          { caminho: 'Sonoro/Arqueiro%20Astral/Skill_4_Astral.wav',         volume: 0.85 },
        arqueiro_arcano_damage: { caminho: 'Sonoro/Arqueiro%20Astral/Astral_damage.wav',          volume: 0.75 },
        arqueiro_arcano_atk:    { caminho: 'Sonoro/Arqueiro%20Astral/atk_basico_astral.wav',      volume: 0.65 },
        arqueiro_arcano_skill1: { caminho: 'Sonoro/Arqueiro%20Astral/Skill_1_astral.mp3',         volume: 0.8 },
        arqueiro_arcano_skill2: { caminho: 'Sonoro/Arqueiro%20Astral/skill_2_astral.mp3',         volume: 0.8 },
        arqueiro_arcano_skill3: { caminho: 'Sonoro/Arqueiro%20Astral/skill_3_astral.wav',         volume: 0.8 },
        arqueiro_arcano_skill4: { caminho: 'Sonoro/Arqueiro%20Astral/Skill_4_Astral.wav',         volume: 0.85 },
        arqueiro_arcano_buraco: { caminho: 'Sonoro/Arqueiro%20Astral/Skill_4_Astral.wav',         volume: 0.85 }
    };

    // Fallback simples em <audio> quando o WebAudio do jogo não estiver disponível.
    var _fallbackAudio = {};
    var _bateriaAudio = null;
    var _pikemanCarregandoAudio = null;
    var _magoSkill4Audio = null;
    var _ultimoPikemanPirueta = 0;
    var _ultimoPikemanDash = 0;
    var _ultimoPikemanDamage = 0;
    var _ultimoPikemanCarregar = 0;
    var _ultimoMagoDamage = 0;
    var _ultimoMagoMeteoro = 0;
    var _ultimoMagoMeteoroImpacto = 0;
    var _ultimoMagoSkill4 = 0;
    var _ultimoAstralDamage = 0;
    var _ultimoAstralAtk = 0;
    var _ultimoAstralSkill1 = 0;
    var _ultimoAstralSkill2 = 0;
    var _ultimoAstralSkill3 = 0;
    var _ultimoAstralSkill4 = 0;
    var _ultimoGuerreiroDamage = 0;
    var _ultimoGuerreiroSkill4 = 0;
    var _ultimoRoqueiroDamage = 0;
    var _ultimoRoqueiroSkill4 = 0;
    var _ultimoSniperDamage = 0;
    var _ultimoSummonerDamage = 0;
    var _ultimoSummonerSkill4 = 0;
    var _ultimoDmAssaltoImpacto = 0;
    var _ultimoDebuffStun = 0;
    var _ultimoDebuffLentidao = 0;
    var _ultimoUiGold = 0;
    var _ultimoCurandeiroSkill4 = 0;

    global.pararSomBateria = function () {
        try {
            if (_bateriaAudio) {
                _bateriaAudio.pause();
                _bateriaAudio.currentTime = 0;
                _bateriaAudio = null;
            }
        } catch (e) { }
    };

    global.pararSomPikemanCarregando = function () {
        try {
            if (_pikemanCarregandoAudio) {
                _pikemanCarregandoAudio.pause();
                _pikemanCarregandoAudio.currentTime = 0;
                _pikemanCarregandoAudio = null;
            }
        } catch (e) { }
    };

    global.pararSomMagoSkill4 = function () {
        try {
            if (_magoSkill4Audio) {
                _magoSkill4Audio.pause();
                _magoSkill4Audio.currentTime = 0;
                _magoSkill4Audio = null;
            }
        } catch (e) { }
    };

    // Sequência dos 3 cortes rápidos da Skill 2 (Pirueta)
    global.tocarPikemanPiruetaSons = function () {
        var agora = Date.now();
        if (agora - _ultimoPikemanPirueta < 400) return;
        _ultimoPikemanPirueta = agora;
        global.tocarSonoro('pikeman_skill2_hit1');
        setTimeout(function () {
            global.tocarSonoro('pikeman_skill2_hit2');
        }, 260);
        setTimeout(function () {
            global.tocarSonoro('pikeman_skill2_hit3');
        }, 520);
    };

    function volumeGeral() {
        return Math.max(0, Math.min(1, global.volumeGeral !== undefined ? Number(global.volumeGeral) : 0.8));
    }
    function volumeBgm() {
        return Math.max(0, Math.min(1, global.volumeBgm !== undefined ? Number(global.volumeBgm) : 0.8));
    }
    function volumeSfx() {
        return Math.max(0, Math.min(1, global.volumeSfx !== undefined ? Number(global.volumeSfx) : 0.8));
    }

    // ============================================================
    // SISTEMA GLOBAL DE PROXIMIDADE SONORA (v1.55.0)
    // Sons de outros jogadores e monstros atenuam com a distância.
    // Quanto mais perto → mais alto. Longe demais → silêncio total.
    // ============================================================
    var PROXIMITY_CONFIG = {
        maxDistance:       1200,   // px — acima disso o som NÃO toca
        fullVolumeDistance: 100,   // px — abaixo disso é volume máximo
        minVolume:         0.03   // threshold — abaixo disso pula (performance)
    };

    // Expõe a config para leitura/ajuste externo (ex.: config.js)
    global.PROXIMITY_CONFIG = PROXIMITY_CONFIG;

    /**
     * Calcula o fator de volume (0.0–1.0) baseado na distância entre
     * a fonte sonora (sourceX, sourceY) e o jogador local (meuX, meuY).
     * Usa atenuação suave (easeOut quadrática) para parecer natural.
     */
    function calcularVolumeProximidade(sourceX, sourceY) {
        var mX = Number(global.meuX) || 0;
        var mY = Number(global.meuY) || 0;
        var dx = (Number(sourceX) || 0) - mX;
        var dy = (Number(sourceY) || 0) - mY;
        var dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= PROXIMITY_CONFIG.fullVolumeDistance) return 1.0;
        if (dist >= PROXIMITY_CONFIG.maxDistance)        return 0.0;

        // Normaliza para [0, 1] onde 0 = fullVolumeDist, 1 = maxDistance
        var range = PROXIMITY_CONFIG.maxDistance - PROXIMITY_CONFIG.fullVolumeDistance;
        var t = (dist - PROXIMITY_CONFIG.fullVolumeDistance) / range;

        // EaseOut quadrático: começa descendo devagar e cai mais rápido no fim
        return (1 - t) * (1 - t);
    }

    // Expõe o cálculo para testes e outros módulos
    global.calcularVolumeProximidade = calcularVolumeProximidade;

    /**
     * Toca um som com atenuação de proximidade.
     * Usado para sons de OUTROS jogadores e monstros.
     * @param {string} chave  — chave do áudio em ARQUIVOS
     * @param {number} sourceX — posição X da fonte do som (mundo)
     * @param {number} sourceY — posição Y da fonte do som (mundo)
     */
    global.tocarSonoroProximidade = function (chave, sourceX, sourceY) {
        try {
            // Calcula fator de proximidade antes de qualquer processamento
            var fator = calcularVolumeProximidade(sourceX, sourceY);
            if (fator < PROXIMITY_CONFIG.minVolume) return; // longe demais — pula

            // Delega para a pirueta de 3 hits com proximidade
            if (chave === 'pikeman_pirueta' || chave === 'pikeman_skill2') {
                global.tocarPikemanPiruetaSonsProximidade(sourceX, sourceY);
                return;
            }

            // Passos têm alcance mais íntimo (até 650px) para realismo e economia de canais de áudio
            if (chave === 'andar' || chave === 'passo') {
                var mX = Number(global.meuX) || 0;
                var mY = Number(global.meuY) || 0;
                var dxPasso = (Number(sourceX) || 0) - mX;
                var dyPasso = (Number(sourceY) || 0) - mY;
                if ((dxPasso * dxPasso + dyPasso * dyPasso) > 650 * 650) return;
            }

            if (chave === 'pikeman_execucao') {
                chave = 'pikeman_skill4_carregar';
            }

            // Mesmos throttles/debounces do tocarSonoro original
            if (chave === 'pikeman_dash') {
                var agoraDash = Date.now();
                if (agoraDash - _ultimoPikemanDash < 350) return;
                _ultimoPikemanDash = agoraDash;
            }
            if (chave === 'pikeman_damage') {
                var agoraDano = Date.now();
                if (agoraDano - _ultimoPikemanDamage < 200) return;
                _ultimoPikemanDamage = agoraDano;
            }
            if (chave === 'astral_damage' || chave === 'arqueiro_arcano_damage') {
                var agoraDanoA = Date.now();
                if (agoraDanoA - _ultimoAstralDamage < 200) return;
                _ultimoAstralDamage = agoraDanoA;
                chave = 'astral_damage';
            }
            if (chave === 'astral_atk' || chave === 'arqueiro_arcano_atk') {
                var agoraAtkA = Date.now();
                if (agoraAtkA - _ultimoAstralAtk < 120) return;
                _ultimoAstralAtk = agoraAtkA;
                chave = 'astral_atk';
            }
            if (chave === 'astral_skill1' || chave === 'arqueiro_arcano_skill1') {
                var agoraSk1 = Date.now();
                if (agoraSk1 - _ultimoAstralSkill1 < 300) return;
                _ultimoAstralSkill1 = agoraSk1;
                chave = 'astral_skill1';
            }
            if (chave === 'astral_skill2' || chave === 'arqueiro_arcano_skill2') {
                var agoraSk2 = Date.now();
                if (agoraSk2 - _ultimoAstralSkill2 < 300) return;
                _ultimoAstralSkill2 = agoraSk2;
                chave = 'astral_skill2';
            }
            if (chave === 'astral_skill3' || chave === 'arqueiro_arcano_skill3') {
                var agoraSk3 = Date.now();
                if (agoraSk3 - _ultimoAstralSkill3 < 300) return;
                _ultimoAstralSkill3 = agoraSk3;
                chave = 'astral_skill3';
            }
            if (chave === 'astral_skill4' || chave === 'arqueiro_arcano_skill4' || chave === 'arqueiro_arcano_buraco') {
                var agoraSk4 = Date.now();
                if (agoraSk4 - _ultimoAstralSkill4 < 400) return;
                _ultimoAstralSkill4 = agoraSk4;
                chave = 'astral_skill4';
            }
            if (chave === 'mago_damage') {
                var agoraDanoMago = Date.now();
                if (agoraDanoMago - _ultimoMagoDamage < 200) return;
                _ultimoMagoDamage = agoraDanoMago;
            }
            if (chave === 'mago_meteoro_queda' || chave === 'mago_meteoro') {
                var agoraMeteoro = Date.now();
                if (agoraMeteoro - _ultimoMagoMeteoro < 350) return;
                _ultimoMagoMeteoro = agoraMeteoro;
                chave = 'mago_meteoro_queda';
            }
            if (chave === 'mago_meteoro_impacto') {
                var agoraMeteoroImp = Date.now();
                if (agoraMeteoroImp - _ultimoMagoMeteoroImpacto < 350) return;
                _ultimoMagoMeteoroImpacto = agoraMeteoroImp;
            }
            if (chave === 'mago_skill4_impacto') {
                global.pararSomMagoSkill4();
            }

            // Skill 4 do mago — carregamento com looping e proximidade
            if (chave === 'mago_skill4' || chave === 'mago_skill4_rolar') {
                var agoraSkill4 = Date.now();
                if (agoraSkill4 - _ultimoMagoSkill4 < 400) return;
                _ultimoMagoSkill4 = agoraSkill4;
                global.pararSomMagoSkill4();
                var cfgSkill4 = ARQUIVOS[chave];
                if (cfgSkill4) {
                    _magoSkill4Audio = new Audio(cfgSkill4.caminho);
                    _magoSkill4Audio.volume = Math.max(0, Math.min(1,
                        cfgSkill4.volume * fator * volumeGeral() * volumeSfx()));
                    _magoSkill4Audio.play().catch(function () { });
                }
                tentarTocarBgm();
                return;
            }

            // Pikeman carregamento skill 4 com proximidade
            if (chave === 'pikeman_skill4_carregar') {
                var agoraCarregar = Date.now();
                if (agoraCarregar - _ultimoPikemanCarregar < 800) return;
                _ultimoPikemanCarregar = agoraCarregar;
                global.pararSomPikemanCarregando();
                var cfgCarregar = ARQUIVOS[chave];
                if (cfgCarregar) {
                    _pikemanCarregandoAudio = new Audio(cfgCarregar.caminho);
                    _pikemanCarregandoAudio.volume = Math.max(0, Math.min(1,
                        cfgCarregar.volume * fator * volumeGeral() * volumeSfx()));
                    _pikemanCarregandoAudio.play().catch(function () { });
                }
                tentarTocarBgm();
                return;
            }

            if (chave === 'guerreiro_damage') {
                var agoraDanoG = Date.now();
                if (agoraDanoG - _ultimoGuerreiroDamage < 200) return;
                _ultimoGuerreiroDamage = agoraDanoG;
            }
            if (chave === 'guerreiro_skill4' || chave === 'guerreiro_escudo_lancamento') {
                var agoraGSk4 = Date.now();
                if (agoraGSk4 - _ultimoGuerreiroSkill4 < 350) return;
                _ultimoGuerreiroSkill4 = agoraGSk4;
                chave = 'guerreiro_skill4';
            }
            if (chave === 'curandeiro_skill4' || chave === 'curandeiro_cantico') {
                var agoraCurSk4 = Date.now();
                if (agoraCurSk4 - _ultimoCurandeiroSkill4 < 350) return;
                _ultimoCurandeiroSkill4 = agoraCurSk4;
                chave = 'curandeiro_skill4';
            }
            if (chave === 'debuff_stun') {
                var agoraStun = Date.now();
                if (agoraStun - _ultimoDebuffStun < 300) return;
                _ultimoDebuffStun = agoraStun;
            }
            if (chave === 'debuff_lentidao') {
                var agoraLent = Date.now();
                if (agoraLent - _ultimoDebuffLentidao < 300) return;
                _ultimoDebuffLentidao = agoraLent;
            }
            if (chave === 'ui_gold') {
                var agoraGold = Date.now();
                if (agoraGold - _ultimoUiGold < 120) return;
                _ultimoUiGold = agoraGold;
            }
            if (chave === 'roqueiro_damage') {
                var agoraDanoR = Date.now();
                if (agoraDanoR - _ultimoRoqueiroDamage < 200) return;
                _ultimoRoqueiroDamage = agoraDanoR;
            }
            if (chave === 'roqueiro_skill4' || chave === 'roqueiro_grito_guerra') {
                var agoraRSk4 = Date.now();
                if (agoraRSk4 - _ultimoRoqueiroSkill4 < 400) return;
                _ultimoRoqueiroSkill4 = agoraRSk4;
                chave = 'roqueiro_skill4';
            }
            if (chave === 'sniper_damage') {
                var agoraDanoSn = Date.now();
                if (agoraDanoSn - _ultimoSniperDamage < 200) return;
                _ultimoSniperDamage = agoraDanoSn;
            }
            if (chave === 'summoner_damage') {
                var agoraDanoSum = Date.now();
                if (agoraDanoSum - _ultimoSummonerDamage < 200) return;
                _ultimoSummonerDamage = agoraDanoSum;
            }
            if (chave === 'summoner_skill4_3') {
                chave = 'summoner_skill4_fim';
            }

            // Roqueiro bateria com proximidade: não reinicia se já estiver tocando
            if (chave === 'roqueiro_bateria') {
                if (_bateriaAudio && !_bateriaAudio.paused && !_bateriaAudio.ended) {
                    tentarTocarBgm();
                    return;
                }
                global.pararSomBateria();
                var cfgBat = ARQUIVOS[chave];
                if (cfgBat) {
                    _bateriaAudio = new Audio(cfgBat.caminho);
                    _bateriaAudio.volume = Math.max(0, Math.min(1,
                        cfgBat.volume * fator * volumeGeral() * volumeSfx()));
                    _bateriaAudio.play().catch(function () { });
                }
                tentarTocarBgm();
                return;
            }

            var cfg = ARQUIVOS[chave];
            if (!cfg) return;

            // Aplica volume com fator de proximidade
            var volFinal = cfg.volume * fator * volumeGeral() * volumeSfx();
            if (volFinal < 0.01) return; // volume insignificante — pula

            if (typeof global.tocarSomArquivo === 'function') {
                global.tocarSomArquivo(cfg.caminho, cfg.volume * fator);
            } else {
                var a = new Audio(cfg.caminho);
                a.volume = Math.max(0, Math.min(1, volFinal));
                a.play().catch(function () { });
            }
            tentarTocarBgm();
        } catch (e) { }
    };

    /**
     * Pirueta do Pikeman com atenuação de proximidade.
     * 3 cortes rápidos em sequência, todos atenuados pela distância.
     */
    global.tocarPikemanPiruetaSonsProximidade = function (sourceX, sourceY) {
        var agora = Date.now();
        if (agora - _ultimoPikemanPirueta < 400) return;
        _ultimoPikemanPirueta = agora;
        var fator = calcularVolumeProximidade(sourceX, sourceY);
        if (fator < PROXIMITY_CONFIG.minVolume) return;

        // Toca os 3 hits com o mesmo fator de volume
        _tocarComFator('pikeman_skill2_hit1', fator);
        setTimeout(function () { _tocarComFator('pikeman_skill2_hit2', fator); }, 260);
        setTimeout(function () { _tocarComFator('pikeman_skill2_hit3', fator); }, 520);
    };

    /**
     * Helper interno: toca um som com um fator de volume multiplicativo.
     */
    function _tocarComFator(chave, fator) {
        try {
            var cfg = ARQUIVOS[chave];
            if (!cfg) return;
            var volFinal = cfg.volume * fator * volumeGeral() * volumeSfx();
            if (volFinal < 0.01) return;
            if (typeof global.tocarSomArquivo === 'function') {
                global.tocarSomArquivo(cfg.caminho, cfg.volume * fator);
            } else {
                var a = new Audio(cfg.caminho);
                a.volume = Math.max(0, Math.min(1, volFinal));
                a.play().catch(function () { });
            }
        } catch (e) { }
    }

    global.atualizarBgmVolume = function () {
        if (_bgmAudio) {
            _bgmAudio.volume = ARQUIVOS.cidade_bgm.volume * volumeGeral() * volumeBgm();
        }
        if (_bgmSolariAudio) {
            _bgmSolariAudio.volume = ARQUIVOS.solari_bgm.volume * volumeGeral() * volumeBgm();
        }
    };

    // Toca um som de skill (uma vez). Todo som de skill parte de um gesto do usuário,
    // por isso também serve de "desbloqueio de autoplay" para o BGM da cidade/solari.
    global.tocarSonoro = function (chave) {
        try {
            if (chave === 'pikeman_pirueta' || chave === 'pikeman_skill2') {
                global.tocarPikemanPiruetaSons();
                return;
            }

            if (chave === 'pikeman_execucao') {
                chave = 'pikeman_skill4_carregar';
            }

            if (chave === 'pikeman_dash') {
                var agoraDash = Date.now();
                if (agoraDash - _ultimoPikemanDash < 350) return;
                _ultimoPikemanDash = agoraDash;
            }

            if (chave === 'pikeman_damage') {
                var agoraDano = Date.now();
                if (agoraDano - _ultimoPikemanDamage < 200) return;
                _ultimoPikemanDamage = agoraDano;
            }

            if (chave === 'pikeman_skill4_carregar') {
                var agoraCarregar = Date.now();
                if (agoraCarregar - _ultimoPikemanCarregar < 800) return;
                _ultimoPikemanCarregar = agoraCarregar;
                global.pararSomPikemanCarregando();
                var cfgCarregar = ARQUIVOS[chave];
                if (cfgCarregar) {
                    _pikemanCarregandoAudio = new Audio(cfgCarregar.caminho);
                    _pikemanCarregandoAudio.volume = cfgCarregar.volume * volumeGeral() * volumeSfx();
                    _pikemanCarregandoAudio.play().catch(function () { });
                }
                tentarTocarBgm();
                return;
            }

            if (chave === 'astral_damage' || chave === 'arqueiro_arcano_damage') {
                var agoraDanoA = Date.now();
                if (agoraDanoA - _ultimoAstralDamage < 200) return;
                _ultimoAstralDamage = agoraDanoA;
                chave = 'astral_damage';
            }
            if (chave === 'astral_atk' || chave === 'arqueiro_arcano_atk') {
                var agoraAtkA = Date.now();
                if (agoraAtkA - _ultimoAstralAtk < 120) return;
                _ultimoAstralAtk = agoraAtkA;
                chave = 'astral_atk';
            }
            if (chave === 'astral_skill1' || chave === 'arqueiro_arcano_skill1') {
                var agoraSk1 = Date.now();
                if (agoraSk1 - _ultimoAstralSkill1 < 300) return;
                _ultimoAstralSkill1 = agoraSk1;
                chave = 'astral_skill1';
            }
            if (chave === 'astral_skill2' || chave === 'arqueiro_arcano_skill2') {
                var agoraSk2 = Date.now();
                if (agoraSk2 - _ultimoAstralSkill2 < 300) return;
                _ultimoAstralSkill2 = agoraSk2;
                chave = 'astral_skill2';
            }
            if (chave === 'astral_skill3' || chave === 'arqueiro_arcano_skill3') {
                var agoraSk3 = Date.now();
                if (agoraSk3 - _ultimoAstralSkill3 < 300) return;
                _ultimoAstralSkill3 = agoraSk3;
                chave = 'astral_skill3';
            }
            if (chave === 'astral_skill4' || chave === 'arqueiro_arcano_skill4' || chave === 'arqueiro_arcano_buraco') {
                var agoraSk4 = Date.now();
                if (agoraSk4 - _ultimoAstralSkill4 < 400) return;
                _ultimoAstralSkill4 = agoraSk4;
                chave = 'astral_skill4';
            }

            if (chave === 'mago_damage') {
                var agoraDanoMago = Date.now();
                if (agoraDanoMago - _ultimoMagoDamage < 200) return;
                _ultimoMagoDamage = agoraDanoMago;
            }

            if (chave === 'mago_meteoro_queda' || chave === 'mago_meteoro') {
                var agoraMeteoro = Date.now();
                if (agoraMeteoro - _ultimoMagoMeteoro < 350) return;
                _ultimoMagoMeteoro = agoraMeteoro;
                chave = 'mago_meteoro_queda';
            }

            if (chave === 'mago_meteoro_impacto') {
                var agoraMeteoroImp = Date.now();
                if (agoraMeteoroImp - _ultimoMagoMeteoroImpacto < 350) return;
                _ultimoMagoMeteoroImpacto = agoraMeteoroImp;
            }

            if (chave === 'mago_skill4' || chave === 'mago_skill4_rolar') {
                var agoraSkill4 = Date.now();
                if (agoraSkill4 - _ultimoMagoSkill4 < 400) return;
                _ultimoMagoSkill4 = agoraSkill4;
                global.pararSomMagoSkill4();
                var cfgSkill4 = ARQUIVOS[chave];
                if (cfgSkill4) {
                    _magoSkill4Audio = new Audio(cfgSkill4.caminho);
                    _magoSkill4Audio.volume = cfgSkill4.volume * volumeGeral() * volumeSfx();
                    _magoSkill4Audio.play().catch(function () { });
                }
                tentarTocarBgm();
                return;
            }

            if (chave === 'mago_skill4_impacto') {
                global.pararSomMagoSkill4();
            }

            if (chave === 'guerreiro_damage') {
                var agoraDanoG = Date.now();
                if (agoraDanoG - _ultimoGuerreiroDamage < 200) return;
                _ultimoGuerreiroDamage = agoraDanoG;
            }
            if (chave === 'guerreiro_skill4' || chave === 'guerreiro_escudo_lancamento') {
                var agoraGSk4 = Date.now();
                if (agoraGSk4 - _ultimoGuerreiroSkill4 < 350) return;
                _ultimoGuerreiroSkill4 = agoraGSk4;
                chave = 'guerreiro_skill4';
            }
            if (chave === 'dronemaster_assalto_impacto' || chave === 'dronemaster_assalto_atk') {
                var agoraDmImp = Date.now();
                if (agoraDmImp - _ultimoDmAssaltoImpacto < 150) return;
                _ultimoDmAssaltoImpacto = agoraDmImp;
                chave = 'dronemaster_assalto_impacto';
            }
            if (chave === 'curandeiro_skill4' || chave === 'curandeiro_cantico') {
                var agoraCurSk4 = Date.now();
                if (agoraCurSk4 - _ultimoCurandeiroSkill4 < 350) return;
                _ultimoCurandeiroSkill4 = agoraCurSk4;
                chave = 'curandeiro_skill4';
            }
            if (chave === 'debuff_stun') {
                var agoraStun = Date.now();
                if (agoraStun - _ultimoDebuffStun < 300) return;
                _ultimoDebuffStun = agoraStun;
            }
            if (chave === 'debuff_lentidao') {
                var agoraLent = Date.now();
                if (agoraLent - _ultimoDebuffLentidao < 300) return;
                _ultimoDebuffLentidao = agoraLent;
            }
            if (chave === 'ui_gold') {
                var agoraGold = Date.now();
                if (agoraGold - _ultimoUiGold < 120) return;
                _ultimoUiGold = agoraGold;
            }
            if (chave === 'roqueiro_damage') {
                var agoraDanoR = Date.now();
                if (agoraDanoR - _ultimoRoqueiroDamage < 200) return;
                _ultimoRoqueiroDamage = agoraDanoR;
            }
            if (chave === 'roqueiro_skill4' || chave === 'roqueiro_grito_guerra') {
                var agoraRSk4 = Date.now();
                if (agoraRSk4 - _ultimoRoqueiroSkill4 < 400) return;
                _ultimoRoqueiroSkill4 = agoraRSk4;
                chave = 'roqueiro_skill4';
            }
            if (chave === 'sniper_damage') {
                var agoraDanoSn = Date.now();
                if (agoraDanoSn - _ultimoSniperDamage < 200) return;
                _ultimoSniperDamage = agoraDanoSn;
            }
            if (chave === 'summoner_damage') {
                var agoraDanoSum = Date.now();
                if (agoraDanoSum - _ultimoSummonerDamage < 200) return;
                _ultimoSummonerDamage = agoraDanoSum;
            }
            if (chave === 'summoner_skill4_3') {
                chave = 'summoner_skill4_fim';
            }

            var cfg = ARQUIVOS[chave];
            if (!cfg) return;

            if (chave === 'roqueiro_bateria') {
                if (_bateriaAudio && !_bateriaAudio.paused && !_bateriaAudio.ended) {
                    tentarTocarBgm();
                    return;
                }
                global.pararSomBateria();
                _bateriaAudio = new Audio(cfg.caminho);
                _bateriaAudio.volume = cfg.volume * volumeGeral() * volumeSfx();
                _bateriaAudio.play().catch(function () { });
                tentarTocarBgm();
                return;
            }

            if (typeof global.tocarSomArquivo === 'function') {
                global.tocarSomArquivo(cfg.caminho, cfg.volume);
            } else {
                var a = _fallbackAudio[chave] || new Audio();
                _fallbackAudio[chave] = a;
                a.src = cfg.caminho;
                a.volume = cfg.volume * volumeGeral() * volumeSfx();
                a.play().catch(function () { });
            }
            // Tenta tocar/iniciar o BGM (estamos dentro de um gesto do usuário)
            tentarTocarBgm();
        } catch (e) { }
    };

    // ===== BGM DINÂMICO POR MAPA COM TRANSIÇÃO DIA/NOITE & CROSSFADE (v1.59.0) =====
    var MAPA_BGM = {
        cidade: {
            dia:    'Sonoro/Cidade/dentro_cidade.mp3',
            noite:  'Sonoro/Cidade/dentro_cidade.mp3',
            volume: 0.38
        },
        green: {
            dia:    'Sonoro/Cidade/mapa%20verde/Verde_Dia.mp3',
            noite:  'Sonoro/Cidade/mapa%20verde/Verde_noite.mp3',
            volume: 0.38
        },
        desert: {
            dia:    'Sonoro/Cidade/deserto-1/Deserto_dia.mp3',
            noite:  'Sonoro/Cidade/deserto-1/Deserto_noite.mp3',
            volume: 0.38
        },
        pantano: {
            dia:    'Sonoro/Cidade/pantano-1/Pantano_dia.mp3',
            noite:  'Sonoro/Cidade/pantano-1/Pantano_Noite.mp3',
            volume: 0.38
        },
        zonazero: {
            dia:    'Sonoro/Cidade/zero-1/Zero_dia.mp3',
            noite:  'Sonoro/Cidade/zero-1/Zero_Noite.mp3',
            volume: 0.38
        },
        solari: {
            dia:    'Sonoro/Arena%20Solare/BGM_Fundo.mp3',
            noite:  'Sonoro/Arena%20Solare/BGM_Fundo.mp3',
            volume: 0.38
        }
    };

    var _trackAtiva = null;       // { audio, caminho, mapa, periodo, volumeBase, inicioMs, duracaoFadeInMs }
    var _tracksFadeOut = [];      // array de { audio, volAtual, inicioMs, duracaoMs }
    var _ultimaTentativaBgm = 0;

    function mapaAtual() {
        if (global.solariAtivo || global.currentMap === 'solari') return 'solari';
        return global.currentMap || 'green';
    }

    /**
     * Retorna 'noite' ou 'dia'.
     * Regra oficial: às 23:50 (23.8333h) inicia a música da noite, permanecendo até 04:00 (4.0h).
     */
    function obterPeriodoDiaNoite() {
        var tm = global.tempoMundo;
        if (!tm || typeof tm.horaDecimal !== 'number') return 'dia';
        var h = tm.horaDecimal;
        if (h >= 23.8333 || h < 4.0) return 'noite';
        return 'dia';
    }

    function obterCaminhoBgm(mapa, periodo) {
        var cfg = MAPA_BGM[mapa];
        if (!cfg) return null;
        return periodo === 'noite' ? (cfg.noite || cfg.dia) : cfg.dia;
    }

    function tentarTocarBgm() {
        try {
            if (!global.bgmLiberado) return;
            if (_trackAtiva && _trackAtiva.audio && _trackAtiva.audio.paused) {
                var p = _trackAtiva.audio.play();
                if (p && typeof p.catch === 'function') p.catch(function () { });
            }
        } catch (e) { }
    }

    if (typeof document !== 'undefined') {
        // Libera autoplay na 1ª interação do usuário
        document.addEventListener('pointerdown', tentarTocarBgm, { passive: true, capture: true });
        document.addEventListener('keydown', tentarTocarBgm, { passive: true, capture: true });
    }

    global.atualizarBgmVolume = function () {
        try {
            var volGeralBgm = volumeGeral() * volumeBgm();
            if (_trackAtiva && _trackAtiva.audio) {
                var agora = Date.now();
                var dtIn = agora - _trackAtiva.inicioMs;
                var tIn = Math.min(1, Math.max(0, dtIn / _trackAtiva.duracaoFadeInMs));
                _trackAtiva.audio.volume = Math.max(0, Math.min(1, _trackAtiva.volumeBase * volGeralBgm * tIn));
            }
        } catch (e) { }
    };

    /**
     * Loop principal de BGM (chamado a cada frame no index.html).
     * Controla transição suave (Crossfade) ao trocar de mapa ou entre Dia/Noite (23:50 às 04:00).
     */
    global.atualizarBgmCidade = function () {
        try {
            // O BGM só toca após o jogador clicar em JOGAR
            if (!global.bgmLiberado) {
                if (_trackAtiva && _trackAtiva.audio && !_trackAtiva.audio.paused) {
                    _trackAtiva.audio.pause();
                }
                for (var j = 0; j < _tracksFadeOut.length; j++) {
                    if (!_tracksFadeOut[j].audio.paused) _tracksFadeOut[j].audio.pause();
                }
                return;
            }

            var agora = Date.now();
            var mapa = mapaAtual();
            var periodo = obterPeriodoDiaNoite();
            var cfgMapa = MAPA_BGM[mapa];
            var caminhoAlvo = cfgMapa ? (periodo === 'noite' ? (cfgMapa.noite || cfgMapa.dia) : cfgMapa.dia) : null;

            // Se mudou de trilha (mapa diferente OU virou dia/noite em mapa com faixas diferentes)
            var caminhoAtual = _trackAtiva ? _trackAtiva.caminho : null;
            if (caminhoAlvo !== caminhoAtual) {
                // Transfere trilha atual para Fade Out suave (~2.0s)
                if (_trackAtiva && _trackAtiva.audio) {
                    _tracksFadeOut.push({
                        audio: _trackAtiva.audio,
                        volAtual: _trackAtiva.audio.volume,
                        inicioMs: agora,
                        duracaoMs: 2000
                    });
                    _trackAtiva = null;
                }

                // Inicia nova trilha com volume 0 e Fade In suave (~2.0s)
                if (caminhoAlvo && cfgMapa) {
                    var novoAudio = new Audio(caminhoAlvo);
                    novoAudio.loop = true;
                    novoAudio.preload = 'auto';
                    novoAudio.volume = 0;
                    var pNovo = novoAudio.play();
                    if (pNovo && typeof pNovo.catch === 'function') pNovo.catch(function () { });

                    _trackAtiva = {
                        audio: novoAudio,
                        caminho: caminhoAlvo,
                        mapa: mapa,
                        periodo: periodo,
                        volumeBase: cfgMapa.volume,
                        inicioMs: agora,
                        duracaoFadeInMs: 2000
                    };
                }
            }

            // Atualiza Fade Out das trilhas anteriores
            for (var f = _tracksFadeOut.length - 1; f >= 0; f--) {
                var fo = _tracksFadeOut[f];
                var dtOut = agora - fo.inicioMs;
                var tOut = Math.min(1, Math.max(0, dtOut / fo.duracaoMs));
                var fatorFade = Math.max(0, 1 - tOut);
                fo.audio.volume = Math.max(0, Math.min(1, fo.volAtual * fatorFade));
                if (tOut >= 1 || fo.audio.volume <= 0.005) {
                    try {
                        fo.audio.pause();
                        fo.audio.currentTime = 0;
                    } catch (eF) { }
                    _tracksFadeOut.splice(f, 1);
                }
            }

            // Atualiza Fade In da trilha ativa
            if (_trackAtiva && _trackAtiva.audio) {
                var dtIn = agora - _trackAtiva.inicioMs;
                var tIn = Math.min(1, Math.max(0, dtIn / _trackAtiva.duracaoFadeInMs));
                var volAlvo = _trackAtiva.volumeBase * volumeGeral() * volumeBgm();
                _trackAtiva.audio.volume = Math.max(0, Math.min(1, volAlvo * tIn));

                // Garante que o áudio continue tocando se estiver pausado (autoplay recover)
                if (_trackAtiva.audio.paused && agora - _ultimaTentativaBgm > 1000) {
                    _ultimaTentativaBgm = agora;
                    tentarTocarBgm();
                }
            }
        } catch (e) { }
    };

    // Parar o BGM (morte total ou emergência)
    global.pararBgmCidade = function () {
        try {
            if (_trackAtiva && _trackAtiva.audio) {
                _trackAtiva.audio.pause();
                _trackAtiva = null;
            }
            for (var i = 0; i < _tracksFadeOut.length; i++) {
                try { _tracksFadeOut[i].audio.pause(); } catch (e) { }
            }
            _tracksFadeOut = [];
        } catch (e) { }
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            ARQUIVOS: ARQUIVOS,
            PROXIMITY_CONFIG: PROXIMITY_CONFIG,
            tocarSonoro: global.tocarSonoro,
            tocarSonoroProximidade: global.tocarSonoroProximidade,
            calcularVolumeProximidade: global.calcularVolumeProximidade,
            tocarPikemanPiruetaSonsProximidade: global.tocarPikemanPiruetaSonsProximidade,
            pararSomPikemanCarregando: global.pararSomPikemanCarregando,
            tocarPikemanPiruetaSons: global.tocarPikemanPiruetaSons
        };
    }
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));