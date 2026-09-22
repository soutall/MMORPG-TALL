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
        guerreiro_tornado:     { caminho: 'Sonoro/Guerreiro/guereiro_tornardo.ogg', volume: 0.85 },
        guerreiro_block:       { caminho: 'Sonoro/Guerreiro/guerreiro_block.ogg',   volume: 0.75 },
        guerreiro_grito:       { caminho: 'Sonoro/Guerreiro/guerreiro_Grito.ogg',   volume: 0.9 },
        guerreiro_morto:       { caminho: 'Sonoro/Guerreiro/guerreiro_morto.ogg',   volume: 0.9 },
        mago_teleport:         { caminho: 'Sonoro/Mago/mago_teleport.ogg',          volume: 0.75 },
        mago_meteoro:          { caminho: 'Sonoro/Mago/mago_meteoro.ogg',           volume: 0.85 },
        mago_nevasca:          { caminho: 'Sonoro/Mago/mago_nevasca.ogg',           volume: 0.8 },
        mago_lava_fervendo:    { caminho: 'Sonoro/Mago/mago_lava_fervendo.ogg',     volume: 0.8 },
        mago_lava_impacto:     { caminho: 'Sonoro/Mago/mago_lava_Impacto.ogg',      volume: 0.85 },
        sniper_atk:            { caminho: 'Sonoro/Sniper/Sniper_atk_basico.ogg',    volume: 0.5 },
        sniper_disparo:        { caminho: 'Sonoro/Sniper/Sniper_disparo.ogg',       volume: 0.85 },
        sniper_rede:           { caminho: 'Sonoro/Sniper/sniper_Teia_Granada.ogg',  volume: 0.7 },
        sniper_camuflagem:     { caminho: 'Sonoro/Sniper/sniper_camuflagem.ogg',    volume: 0.6 },
        summoner_teleport:     { caminho: 'Sonoro/Summoner/summoner_teleport.ogg',  volume: 0.75 },
        summoner_salto:        { caminho: 'Sonoro/Summoner/summoner_salto.ogg',     volume: 0.8 },
        summoner_comandoPET:   { caminho: 'Sonoro/Summoner/summoner_comandoPET.ogg', volume: 0.8 },
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
        dronemaster_atk:       { caminho: 'Sonoro/DroneMaster/atk_basico_drone.ogg',        volume: 0.5 },
        dronemaster_supressao: { caminho: 'Sonoro/DroneMaster/modo_supressao.ogg',          volume: 0.75 },
        dronemaster_assalto:   { caminho: 'Sonoro/DroneMaster/modo%20assalto.ogg',          volume: 0.75 },
        dronemaster_caixa:     { caminho: 'Sonoro/DroneMaster/Caixa%20de%20ferramenta.ogg', volume: 0.75 },
        dronemaster_tita:      { caminho: 'Sonoro/DroneMaster/Protocolo_Titan.ogg',         volume: 0.85 },
        dronemaster_escudo:    { caminho: 'Sonoro/DroneMaster/Escudo_energia.ogg',          volume: 0.7 },
        cidade_bgm:            { caminho: 'Sonoro/Cidade/dentro_cidade.ogg',        volume: 0.35 },
        // ===== ROQUEIRO (GUITARRISTA) =====
        roqueiro_atk:          { caminho: 'Sonoro/Roqueiro/atk_basico.mp3',        volume: 0.65 },
        roqueiro_banda:        { caminho: 'Sonoro/Roqueiro/Banda.ogg',             volume: 0.8 },
        roqueiro_bateria:      { caminho: 'Sonoro/Roqueiro/Bateria.mp3',           volume: 0.75 },
        roqueiro_dash:         { caminho: 'Sonoro/Roqueiro/Dash.mp3',              volume: 0.7 },
        // ===== ARENA DE SOLARE =====
        solari_bgm:            { caminho: 'Sonoro/Arena%20Solare/Musica%20fundo%20arena%20solare.ogg', volume: 0.4 },
        solari_round_1:        { caminho: 'Sonoro/Arena%20Solare/Roud%201.ogg',                     volume: 0.85 },
        solari_round_fim:      { caminho: 'Sonoro/Arena%20Solare/Ao%20finalizar%20Round.ogg',       volume: 0.85 },
        solari_round_10_fim:   { caminho: 'Sonoro/Arena%20Solare/Final%20Roud%2010.ogg',            volume: 0.95 },
        solari_rolar:          { caminho: 'Sonoro/Arena%20Solare/ao%20rolar%20a%20chance%20de%20ganhar%20o%20item.ogg', volume: 0.75 },
        solari_ganhar:         { caminho: 'Sonoro/Arena%20Solare/ao%20ganhar%20o%20item.ogg',       volume: 0.85 }
    };

    // Fallback simples em <audio> quando o WebAudio do jogo não estiver disponível.
    var _fallbackAudio = {};
    var _bateriaAudio = null;

    global.pararSomBateria = function () {
        try {
            if (_bateriaAudio) {
                _bateriaAudio.pause();
                _bateriaAudio.currentTime = 0;
            }
        } catch (e) { }
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
            var cfg = ARQUIVOS[chave];
            if (!cfg) return;

            if (chave === 'roqueiro_bateria') {
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

    // ===== BGM da Cidade e da Arena de Solari em loop =====
    var _bgmAudio = null;
    var _bgmSolariAudio = null;
    var _bgmMapa = null;
    var _ultimaTentativaBgm = 0;

    function mapaAtual() {
        if (global.solariAtivo || global.currentMap === 'solari') return 'solari';
        return global.currentMap || 'green';
    }

    function tentarTocarBgm() {
        try {
            if (!global.bgmLiberado) return;
            var mapa = mapaAtual();
            if (mapa === 'cidade' && _bgmAudio) {
                _bgmAudio.volume = ARQUIVOS.cidade_bgm.volume * volumeGeral() * volumeBgm();
                var p = _bgmAudio.play();
                if (p && typeof p.catch === 'function') p.catch(function () { });
            } else if (mapa === 'solari' && _bgmSolariAudio) {
                _bgmSolariAudio.volume = ARQUIVOS.solari_bgm.volume * volumeGeral() * volumeBgm();
                var pSol = _bgmSolariAudio.play();
                if (pSol && typeof pSol.catch === 'function') pSol.catch(function () { });
            }
        } catch (e) { }
    }

    if (typeof document !== 'undefined') {
        // Chamado DENTRO do gesto do usuário: libera o autoplay na 1ª interação (Safari etc.)
        document.addEventListener('pointerdown', tentarTocarBgm, { passive: true, capture: true });
        document.addEventListener('keydown', tentarTocarBgm, { passive: true, capture: true });
    }

    global.atualizarBgmCidade = function () {
        try {
            // O BGM só entra em ação DEPOIS de clicar em JOGAR.
            if (!global.bgmLiberado) {
                if (_bgmAudio && !_bgmAudio.paused) _bgmAudio.pause();
                if (_bgmSolariAudio && !_bgmSolariAudio.paused) _bgmSolariAudio.pause();
                return;
            }
            var mapa = mapaAtual();
            if (mapa === _bgmMapa) {
                // Continua no mesmo mapa: garante o volume e re-tenta (1x/s) se pausado
                if (mapa === 'cidade' && _bgmAudio) {
                    _bgmAudio.volume = ARQUIVOS.cidade_bgm.volume * volumeGeral() * volumeBgm();
                    var agora = Date.now();
                    if (_bgmAudio.paused && agora - _ultimaTentativaBgm > 1000) {
                        _ultimaTentativaBgm = agora;
                        tentarTocarBgm();
                    }
                } else if (mapa === 'solari' && _bgmSolariAudio) {
                    _bgmSolariAudio.volume = ARQUIVOS.solari_bgm.volume * volumeGeral() * volumeBgm();
                    var agoraSol = Date.now();
                    if (_bgmSolariAudio.paused && agoraSol - _ultimaTentativaBgm > 1000) {
                        _ultimaTentativaBgm = agoraSol;
                        tentarTocarBgm();
                    }
                }
                return;
            }
            _bgmMapa = mapa;

            if (mapa !== 'cidade' && _bgmAudio && !_bgmAudio.paused) {
                _bgmAudio.pause();
            }
            if (mapa !== 'solari' && _bgmSolariAudio && !_bgmSolariAudio.paused) {
                _bgmSolariAudio.pause();
            }

            if (mapa === 'cidade') {
                if (!_bgmAudio) {
                    _bgmAudio = new Audio(ARQUIVOS.cidade_bgm.caminho);
                    _bgmAudio.loop = true;
                    _bgmAudio.preload = 'auto';
                }
                _bgmAudio.volume = ARQUIVOS.cidade_bgm.volume * volumeGeral() * volumeBgm();
                _ultimaTentativaBgm = Date.now();
                tentarTocarBgm();
            } else if (mapa === 'solari') {
                if (!_bgmSolariAudio) {
                    _bgmSolariAudio = new Audio(ARQUIVOS.solari_bgm.caminho);
                    _bgmSolariAudio.loop = true;
                    _bgmSolariAudio.preload = 'auto';
                }
                _bgmSolariAudio.volume = ARQUIVOS.solari_bgm.volume * volumeGeral() * volumeBgm();
                _ultimaTentativaBgm = Date.now();
                tentarTocarBgm();
            }
        } catch (e) { }
    };

    // Parar o BGM (usado em situações de emergência, ex.: morte total).
    global.pararBgmCidade = function () {
        try {
            if (_bgmAudio) _bgmAudio.pause();
            if (_bgmSolariAudio) _bgmSolariAudio.pause();
            _bgmMapa = null;
        } catch (e) { }
    };
})(window);