// ============================================================================
// SISTEMA DE CICLO DIA E NOITE (v1.52.0)
// Autoridade total do servidor, sincronizado globalmente para todos os jogadores.
// ============================================================================

const CONFIG_PADRAO = {
    cicloDiaSegundos: 120,       // Duração real do Dia (06:00 -> 18:00) em segundos
    cicloNoiteSegundos: 60,      // Duração real da Noite (18:00 -> 06:00) em segundos
    maxEscuridaoNoite: 0.70,     // 70% de perda de visão na noite comum (19h às 23h e 4h às 5h)
    maxEscuridaoMadrugada: 1.00, // 100% breu total na madrugada (00:00 às 04:00)
    inicioEscurecer: 18.0,       // Início do entardecer (18:00)
    totalmenteEscuro: 19.0,      // Noite plena 70% (19:00)
    inicioMadrugada: 23.0,       // Transição para madrugada (23:00 -> 00:00: 70% -> 100%)
    picoMadrugadaFim: 4.0,       // Término do breu de 100% (04:00)
    fimMadrugada: 5.0,           // Transição pós-madrugada (04:00 -> 05:00: 100% -> 70%)
    inicioAclarear: 5.0,         // Início do amanhecer (05:00)
    totalmenteClaro: 6.0         // Pleno dia (06:00)
};

/**
 * Calcula o estado atual do ciclo dia/noite do servidor.
 * @param {number} agora Timestamp em milissegundos (Date.now())
 * @param {object} config Configurações de ciclo
 * @returns {object} Estado do tempo no mundo
 */
function calcularTempoMundo(agora = Date.now(), config = CONFIG_PADRAO) {
    const cicloTotalSegundos = config.cicloDiaSegundos + config.cicloNoiteSegundos;
    const cicloTotalMs = cicloTotalSegundos * 1000;
    const elapsedMs = agora % cicloTotalMs;
    const elapsedSec = elapsedMs / 1000;

    let horaDecimal = 0;
    if (elapsedSec < config.cicloDiaSegundos) {
        // Fase de Dia: 06:00 às 18:00 (12 horas in-game)
        const progressoDia = elapsedSec / config.cicloDiaSegundos;
        horaDecimal = 6.0 + progressoDia * 12.0; // 6.0 -> 18.0
    } else {
        // Fase de Noite: 18:00 às 06:00 (12 horas in-game)
        const progressoNoite = (elapsedSec - config.cicloDiaSegundos) / config.cicloNoiteSegundos;
        horaDecimal = 18.0 + progressoNoite * 12.0; // 18.0 -> 30.0
        if (horaDecimal >= 24.0) horaDecimal -= 24.0;
    }

    const hora = Math.floor(horaDecimal);
    const minuto = Math.floor((horaDecimal - hora) * 60);
    const horaFormatada = String(hora).padStart(2, '0') + ':' + String(minuto).padStart(2, '0');

    let escuridao = 0.0;
    let fase = 'dia';
    let icone = '☀️';

    const h = horaDecimal;
    if (h >= config.inicioEscurecer && h < config.totalmenteEscuro) {
        // Entardecer: 18:00 às 19:00 (0.0 -> 0.70)
        const frac = (h - config.inicioEscurecer) / (config.totalmenteEscuro - config.inicioEscurecer);
        escuridao = frac * config.maxEscuridaoNoite;
        fase = 'entardecer';
        icone = frac > 0.5 ? '🌆' : '🌇';
    } else if (h >= config.totalmenteEscuro && h < config.inicioMadrugada) {
        // Noite normal: 19:00 às 23:00 (70% de escuridão)
        escuridao = config.maxEscuridaoNoite;
        fase = 'noite';
        icone = '🌙';
    } else if (h >= config.inicioMadrugada && h < 24.0) {
        // Transição pré-madrugada: 23:00 às 00:00 (0.70 -> 1.00)
        const frac = (h - config.inicioMadrugada) / (24.0 - config.inicioMadrugada);
        escuridao = config.maxEscuridaoNoite + frac * (config.maxEscuridaoMadrugada - config.maxEscuridaoNoite);
        fase = 'noite';
        icone = '🌙';
    } else if (h >= 0.0 && h < config.picoMadrugadaFim) {
        // Madrugada Profunda: 00:00 às 04:00 (100% de escuridão, breu total fora da luz!)
        escuridao = config.maxEscuridaoMadrugada;
        fase = 'madrugada';
        icone = '🌑';
    } else if (h >= config.picoMadrugadaFim && h < config.fimMadrugada) {
        // Transição pós-madrugada: 04:00 às 05:00 (1.00 -> 0.70)
        const frac = (h - config.picoMadrugadaFim) / (config.fimMadrugada - config.picoMadrugadaFim);
        escuridao = config.maxEscuridaoMadrugada - frac * (config.maxEscuridaoMadrugada - config.maxEscuridaoNoite);
        fase = 'noite';
        icone = '🌙';
    } else if (h >= config.inicioAclarear && h < config.totalmenteClaro) {
        // Amanhecer: 05:00 às 06:00 (0.70 -> 0.0)
        const frac = (h - config.inicioAclarear) / (config.totalmenteClaro - config.inicioAclarear);
        escuridao = (1.0 - frac) * config.maxEscuridaoNoite;
        fase = 'amanhecer';
        icone = frac > 0.5 ? '🌅' : '🌙';
    } else {
        // Pleno dia: 06:00 às 18:00 (0.0)
        escuridao = 0.0;
        fase = 'dia';
        icone = '☀️';
    }

    return {
        hora,
        minuto,
        horaDecimal: parseFloat(horaDecimal.toFixed(3)),
        horaFormatada,
        fase,
        icone,
        escuridao: parseFloat(escuridao.toFixed(3)),
        duracaoDiaSegundos: config.cicloDiaSegundos,
        duracaoNoiteSegundos: config.cicloNoiteSegundos,
        maxEscuridao: config.maxEscuridaoMadrugada,
        maxEscuridaoNoite: config.maxEscuridaoNoite
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CONFIG_PADRAO,
        calcularTempoMundo
    };
}
