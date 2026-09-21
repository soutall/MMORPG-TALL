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
        summoner_buff_golem:   { caminho: 'Sonoro/Summoner/summoner_buff_golem.ogg', volume: 0.8 },
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
        cidade_bgm:            { caminho: 'Sonoro/Cidade/dentro_cidade.ogg',        volume: 0.35 }
    };

    // Fallback simples em <audio> quando o WebAudio do jogo não estiver disponível.
    var _fallbackAudio = {};

    function volumeGeral() {
        return Math.max(0, Math.min(1, Number(global.volumeGeral) || 0.8));
    }

    // Toca um som de skill (uma vez). Todo som de skill parte de um gesto do usuário,
    // por isso também serve de "desbloqueio de autoplay" para o BGM da cidade.
    global.tocarSonoro = function (chave) {
        try {
            var cfg = ARQUIVOS[chave];
            if (!cfg) return;
            if (typeof global.tocarSomArquivo === 'function') {
                global.tocarSomArquivo(cfg.caminho, cfg.volume);
            } else {
                var a = _fallbackAudio[chave] || new Audio();
                _fallbackAudio[chave] = a;
                a.src = cfg.caminho;
                a.volume = cfg.volume * volumeGeral();
                a.play().catch(function () { });
            }
            // Tenta tocar/iniciar o BGM da cidade (estamos dentro de um gesto do usuário)
            tentarTocarBgm();
        } catch (e) { }
    };

    // ===== BGM da Cidade (dentro_cidade.ogg em loop) =====
    // Inicia AUTOMATICAMENTE assim que o jogador entra no mapa da cidade.
    // Navegadores podem bloquear o 1º play (política de autoplay): re-tentamos
    // dentro do 1º gesto do usuário (pointerdown/keydown) e a cada 1s enquanto
    // estiver na cidade, até conseguir tocar.
    var _bgmAudio = null;
    var _bgmMapa = null;
    var _ultimaTentativaBgm = 0;

    function tentarTocarBgm() {
        try {
            if (!global.bgmLiberado || !_bgmAudio || global.currentMap !== 'cidade') return;
            _bgmAudio.volume = ARQUIVOS.cidade_bgm.volume * volumeGeral();
            var p = _bgmAudio.play();
            if (p && typeof p.catch === 'function') p.catch(function () { });
        } catch (e) { }
    }

    if (typeof document !== 'undefined') {
        // Chamado DENTRO do gesto do usuário: libera o autoplay na 1ª interação (Safari etc.)
        document.addEventListener('pointerdown', tentarTocarBgm, { passive: true, capture: true });
        document.addEventListener('keydown', tentarTocarBgm, { passive: true, capture: true });
    }

    global.atualizarBgmCidade = function () {
        try {
            // O BGM da cidade só entra em ação DEPOIS de clicar em JOGAR.
            if (!global.bgmLiberado) {
                if (_bgmAudio && !_bgmAudio.paused) _bgmAudio.pause();
                return;
            }
            var mapa = global.currentMap;
            if (mapa === _bgmMapa) {
                // Continua na cidade: garante o volume e re-tenta (1x/s) se ainda pausado
                if (mapa === 'cidade' && _bgmAudio) {
                    _bgmAudio.volume = ARQUIVOS.cidade_bgm.volume * volumeGeral();
                    var agora = Date.now();
                    if (_bgmAudio.paused && agora - _ultimaTentativaBgm > 1000) {
                        _ultimaTentativaBgm = agora;
                        tentarTocarBgm();
                    }
                }
                return;
            }
            _bgmMapa = mapa;
            if (mapa !== 'cidade') {
                if (_bgmAudio) _bgmAudio.pause();
                return;
            }
            if (!_bgmAudio) {
                _bgmAudio = new Audio(ARQUIVOS.cidade_bgm.caminho);
                _bgmAudio.loop = true;
                _bgmAudio.preload = 'auto';
            }
            _bgmAudio.volume = ARQUIVOS.cidade_bgm.volume * volumeGeral();
            _ultimaTentativaBgm = Date.now();
            tentarTocarBgm(); // inicia automaticamente ao entrar no mapa
        } catch (e) { }
    };

    // Parar o BGM (usado em situações de emergência, ex.: morte total).
    global.pararBgmCidade = function () {
        try {
            if (_bgmAudio) _bgmAudio.pause();
            _bgmMapa = null;
        } catch (e) { }
    };
})(window);