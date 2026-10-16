(function (window) {
    const estados = Object.create(null);
    const DURACAO_ATAQUE_MS = 360;
    const DURACAO_DANO_MS = 220;
    let proximaLimpeza = 0;

    function criarEstado(id, agora) {
        const texto = String(id);
        let faseInicial = 0;
        for (let i = 0; i < texto.length; i++) {
            faseInicial = (faseInicial * 31 + texto.charCodeAt(i)) % 628;
        }
        return estados[id] = {
            fase: faseInicial / 100,
            atualizadoEm: agora,
            vistoEm: agora,
            hp: null,
            angulo: null,
            ataqueEm: null,
            danoEm: null
        };
    }

    function limitar(valor, minimo, maximo) {
        return Math.max(minimo, Math.min(maximo, valor));
    }

    function suavizar(p) {
        return p * p * (3 - 2 * p);
    }

    function atualizar(id, movendo, angulo, hp, agora, local, cicloLocal) {
        if (id === undefined || id === null) return null;
        agora = Number.isFinite(agora) ? agora : Date.now();
        const estado = estados[id] || criarEstado(id, agora);
        const decorrido = limitar(agora - estado.atualizadoEm, 0, 100);
        estado.atualizadoEm = agora;
        estado.vistoEm = agora;

        if (Number.isFinite(hp)) {
            if (estado.hp !== null && hp > 0 && hp < estado.hp) estado.danoEm = agora;
            estado.hp = hp;
        }

        const anguloDesejado = Number.isFinite(angulo) ? angulo : 0;
        if (estado.angulo === null || local) {
            estado.angulo = anguloDesejado;
        } else {
            let diferenca = (anguloDesejado - estado.angulo + Math.PI * 3) % (Math.PI * 2) - Math.PI;
            estado.angulo += diferenca * (1 - Math.exp(-decorrido / 65));
        }

        if (!local && movendo) estado.fase += decorrido * 0.009;
        const faseCaminhada = local && Number.isFinite(cicloLocal) ? cicloLocal : estado.fase;
        const faseRespiracao = agora / 680 + (estado.fase % (Math.PI * 2));
        let offsetFrente = 0;
        let esticamento = 0;
        let inclinacao = 0;
        let idadeAtaque = estado.ataqueEm === null ? -1 : agora - estado.ataqueEm;

        if (idadeAtaque >= 0 && idadeAtaque < DURACAO_ATAQUE_MS) {
            if (idadeAtaque < 85) {
                const preparar = Math.sin((idadeAtaque / 85) * Math.PI / 2);
                offsetFrente = -1.4 * preparar;
                inclinacao = -0.025 * preparar;
            } else if (idadeAtaque < 145) {
                const impacto = suavizar((idadeAtaque - 85) / 60);
                offsetFrente = -1.4 + 3.4 * impacto;
                esticamento = Math.sin(impacto * Math.PI) * 0.025;
                inclinacao = 0.035 * Math.sin(impacto * Math.PI);
            } else {
                const recuperar = 1 - (idadeAtaque - 145) / (DURACAO_ATAQUE_MS - 145);
                offsetFrente = 2 * recuperar;
                inclinacao = -0.012 * recuperar;
            }
        } else if (idadeAtaque >= DURACAO_ATAQUE_MS) {
            estado.ataqueEm = null;
            idadeAtaque = -1;
        }

        const idadeDano = estado.danoEm === null ? -1 : agora - estado.danoEm;
        const respostaDano = idadeDano >= 0 && idadeDano < DURACAO_DANO_MS
            ? Math.sin((idadeDano / DURACAO_DANO_MS) * Math.PI)
            : 0;
        if (idadeDano >= DURACAO_DANO_MS) estado.danoEm = null;

        if (agora >= proximaLimpeza) {
            proximaLimpeza = agora + 10000;
            Object.keys(estados).forEach(function (chave) {
                if (agora - estados[chave].vistoEm > 30000) delete estados[chave];
            });
        }

        const respiracao = movendo ? 0 : Math.sin(faseRespiracao) * 0.42;
        const salto = movendo ? Math.abs(Math.sin(faseCaminhada * 2)) * 0.48 : respiracao;
        const frenteX = Math.cos(estado.angulo);
        const frenteY = Math.sin(estado.angulo);
        const recuoDano = 2.2 * respostaDano;

        return {
            angulo: estado.angulo,
            cicloCaminhada: faseCaminhada,
            deslocamentoX: frenteX * (offsetFrente - recuoDano),
            deslocamentoY: frenteY * (offsetFrente - recuoDano) - salto,
            escalaX: 1 + esticamento,
            escalaY: 1 - esticamento * 0.65,
            inclinacao: inclinacao - respostaDano * 0.035,
            intensidadeDano: respostaDano,
            faseAtaque: idadeAtaque < 0 ? 0 : limitar(idadeAtaque / DURACAO_ATAQUE_MS, 0, 1)
        };
    }

    window.registrarAtaqueAnimacaoJogador = function (id, agora) {
        if (id === undefined || id === null) return;
        agora = Number.isFinite(agora) ? agora : Date.now();
        const estado = estados[id] || criarEstado(id, agora);
        estado.ataqueEm = agora;
        estado.vistoEm = agora;
    };

    window.atualizarAnimacaoJogador = atualizar;
})(window);
