// ============================================================================
// dash.js — FRAMEWORK DE DASH v2 (v1.50.0)
// Módulo isomórfico: roda no NAVEGADOR (window) E no SERVIDOR (require).
//
// POR QUE UM MÓDULO COMPARTILHADO?
// O cliente faz PREDIÇÃO (animação local instantânea) e o servidor é
// AUTORITATIVO (mesma animação no tick de 50ms). Se os dois usassem números
// diferentes, o char "puxaria" para trás a cada pacote. Usando as mesmas
// constantes e o MESMO algoritmo de resolução de caminho (resolverDestino),
// as duas pontas convergem sozinhas.
//
// TIPOS DE DASH
//   energia    -> não move (dronemaster: escudo de energia, comportamento antigo)
//   escudo     -> guerreiro: escudo frontal SEGURADO (drena stamina até zerar)
//                 + BAQUE de escudo a cada 2s na direção da espada
//   camuflagem -> sniper: veste a ROUPA DE CAMUFLAGEM por 5s (libera a skill 4)
//   area       -> curandeiro: escudo de área no grupo (10s), não move
//   teleporte  -> mago / summoner / arqueiro_arcano (surgimento + VFX)
//   corrida    -> arqueiro / roqueiro (dash curto com animação)
//   investida  -> barbaro (corrida longa, causa dano e atropela)
//   arranque   -> pikeman (corre 200px invisível + 1,8x de velocidade)
//                  ladino  -> SÓ buff: invisível + 1,9x de velocidade por 2s (sem deslocamento)
// ============================================================================
(function (global) {
    'use strict';

    // ------------------------------------------------------------------
    // CONFIGURAÇÃO POR CLASSE
    // ------------------------------------------------------------------
    const DASH = {
        guerreiro: {
            tipo: 'escudo', stamina: 0, cooldownMs: 2000,
            drenoPorSegundo: 12,          // v1.51.0: dreno baixo e gradual (~8,3s de escudo com 100 stamina)
            reducaoFrontal: 0.70,        // -70% de dano vindo da frente
            arco: 1.15,                   // ~66° de cobertura frontal (rad)
            primeiroBaqueMs: 1200,
            intervaloBaqueMs: 2000,       // e os seguintes, 1 a cada 2s
            danoBaque: 30,                // dano base na estocada do escudo
            danoBaqueBossMult: 0.35,     // bosses tomam 35% e NÃO são empurrados
            raioBaque: 62,               // alcance do baque a partir do centro do corpo
            empurraoBaque: 80,
            atordoaBaque: 12,            // ticks (50ms) de stun = 0,6s
            vfx: 'guerreiro_escudo'
        },
        mago: {
            tipo: 'teleporte', distancia: 160, stamina: 25, cooldownMs: 2000, vfx: 'mago_teleporte'
        },
        summoner: {
            tipo: 'teleporte', distancia: 160, stamina: 25, cooldownMs: 2000, vfx: 'summoner_teleporte'
        },
        arqueiro: {
            tipo: 'corrida', distancia: 230, duracaoMs: 260, stamina: 25, cooldownMs: 2000, vfx: 'arqueiro_dash'
        },
        arqueiro_arcano: {
            tipo: 'teleporte', distancia: 240, stamina: 25, cooldownMs: 3000, vfx: 'buraco_necro'
        },
        curandeiro: {
            tipo: 'area', raio: 160, duracaoMs: 10000, stamina: 'TODA', cooldownMs: 20000,
            escudoFrac: 0.20,            // v1.51.0: escudo de 20% do HP máx por 10s
            atordoamentoMs: 5000, reducaoAtordoado: 0.50, empurraoPx: 220, empurraoRaio: 170, vfx: 'curandeiro_escudo_area'
        },
        barbaro: {
            tipo: 'investida', distancia: 400, duracaoMs: 500, stamina: 40, cooldownMs: 6000,
            dano: 45, danoBossMult: 0.35, raioLateral: 55, empurraoPx: 90, vfx: 'barbaro_investida'
        },
        roqueiro: {
            tipo: 'corrida', distancia: 230, duracaoMs: 300, stamina: 25, cooldownMs: 2000, vfx: 'roqueiro_dash'
        },
        ladino: {
            // v1.51.0: NÃO desloca mais. Vira um buff puro:
            // invisível + 200% de velocidade de movimento (3.0x vel) durante 1s.
            tipo: 'arranque', soBuff: true, duracaoMs: 1000, stamina: 25, cooldownMs: 6000,
            velocidade: 3.0, invisivelMs: 1000, vfx: 'ladino_sombra'
        },
        dronemaster: {
            tipo: 'energia', stamina: 40, cooldownMs: 10000, vfx: 'dronemaster_escudo'
        },
        sniper: {
            // v1.50.0: o dash não cria mais moita — ele VESTE a roupa de
            // camuflagem (5s). A skill 4 (Camuflagem Natural) só liga com ela.
            tipo: 'camuflagem', duracaoMs: 5000, stamina: 25, cooldownMs: 15000, vfx: 'sniper_camo'
        },
        pikeman: {
            tipo: 'arranque', distancia: 200, duracaoMs: 1000, stamina: 25, cooldownMs: 6000,
            velocidade: 1.8, invisivelMs: 1000, vfx: 'pikeman_fantasma'
        }
    };

    const PADRAO = {
        tipo: 'teleporte', distancia: 160, duracaoMs: 200, stamina: 25, cooldownMs: 2000, vfx: 'dash_padrao'
    };

    function configDe(classe) {
        const cfg = Object.assign({}, PADRAO, DASH[classe] || {});
        // Tipos que NÃO deslocam o personagem (escudo, area, camuflagem, energia
        // e o arranque só-buff) não devem herdar `distancia` do padrão: um
        // número ali seria lido por engano por algum consumidor.
        if (!movePersonagem(classe)) delete cfg.distancia;
        return cfg;
    }

    // ------------------------------------------------------------------
    // RESOLUÇÃO DE CAMINHO (compartilhada — o coração da predição correta)
    // Marcha do ponto inicial na direção `ang` e devolve o último ponto LIVRE
    // dentro de `distancia`. `colide(x, y)` recebe as coords do CENTRO do corpo.
    // ------------------------------------------------------------------
    const PASSO = 10;
    function resolverDestino(x0, y0, ang, distancia, colide) {
        const cos = Math.cos(ang), sen = Math.sin(ang);
        let x = x0, y = y0;
        const passos = Math.max(1, Math.ceil(distancia / PASSO));
        for (let i = 1; i <= passos; i++) {
            const t = (i * PASSO) / distancia;
            const nx = x0 + cos * distancia * t;
            const ny = y0 + sen * distancia * t;
            if (typeof colide === 'function' && colide(nx, ny)) break;
            x = nx; y = ny;
        }
        return { x: x, y: y, distPercorrida: Math.hypot(x - x0, y - y0) };
    }

    // Amostra a posição na animação. Ease-out: arranca rápido e desacelera
    // (combina com dash e faz o "peso" da personagem parecer natural).
    function easeOut(t) {
        if (t <= 0) return 0;
        if (t >= 1) return 1;
        return 1 - Math.pow(1 - t, 3);
    }

    function amostrar(d, progressoMs) {
        const t = Math.max(0, Math.min(1, progressoMs / d.duracaoMs));
        const e = easeOut(t);
        return {
            x: d.x0 + (d.x1 - d.x0) * e,
            y: d.y0 + (d.y1 - d.y0) * e,
            t: t, e: e
        };
    }

    // ------------------------------------------------------------------
    // AJUSTES DE VELOCIDADE (compartilhados com o loop de movimento)
    // ------------------------------------------------------------------
    function multVelocidade(classe, efeitoAtivo) {
        if (efeitoAtivo && (classe === 'ladino' || classe === 'pikeman')) return DASH[classe].velocidade;
        return 1;
    }

    // Duração REAL do buff de velocidade (ms). Para o 'arranque' só-buff
    // (ladino) é a própria duração do efeito; para o pikeman (com
    // deslocamento) é a animação somada ao buff. O servidor manda o valor
    // definitivo em `dash_confirmado` — isto é só a primeira previsão.
    function duracaoBuffVelocidade(classe) {
        const c = DASH[classe];
        if (!c || c.tipo !== 'arranque') return 0;
        return c.soBuff ? c.duracaoMs : (c.duracaoMs + c.invisivelMs);
    }

    function ehSegurado(classe) { return configDe(classe).tipo === 'escudo'; }
    function usaStamina(classe) {
        const c = configDe(classe);
        return c.stamina !== 0;
    }
    function ehTeleporte(classe) { return configDe(classe).tipo === 'teleporte'; }
    // O dash realmente desloca o personagem? O 'arranque' só-buff do ladino
    // NÃO: ele devolve o controle de movimento ao jogador (com +90% de
    // velocidade), em vez de travar o char numa animação roteirizada.
    // Lê `DASH` direto (e não `configDe`) para não recursar — configDe usa isto.
    function movePersonagem(classe) {
        const c = DASH[classe];
        if (!c) return true;                       // classe sem dash: padrão é mover
        const t = c.tipo;
        if (t === 'arranque' && c.soBuff) return false;
        return t === 'teleporte' || t === 'corrida' || t === 'investida' || t === 'arranque';
    }

    const api = {
        DASH: DASH,
        PASSO: PASSO,
        configDe: configDe,
        resolverDestino: resolverDestino,
        easeOut: easeOut,
        amostrar: amostrar,
        multVelocidade: multVelocidade,
        duracaoBuffVelocidade: duracaoBuffVelocidade,
        ehSegurado: ehSegurado,
        usaStamina: usaStamina,
        ehTeleporte: ehTeleporte,
        movePersonagem: movePersonagem
    };

    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else global.DASH = api;
})(typeof window !== 'undefined' ? window : this);
