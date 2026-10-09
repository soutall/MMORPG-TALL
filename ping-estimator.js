(function (global) {
    'use strict';

    function criarEstimadorPing(tamanhoJanela, minimoAmostras) {
        const limite = Number.isInteger(tamanhoJanela) && tamanhoJanela > 0 ? tamanhoJanela : 5;
        const minimo = Number.isInteger(minimoAmostras) && minimoAmostras > 0
            ? Math.min(minimoAmostras, limite)
            : Math.min(3, limite);
        const amostras = [];

        return {
            adicionar: function (valor) {
                if (!Number.isFinite(valor) || valor < 0) return null;
                amostras.push(valor);
                if (amostras.length > limite) amostras.shift();
                if (amostras.length < minimo) return null;

                const ordenadas = amostras.slice().sort(function (a, b) { return a - b; });
                const meio = Math.floor(ordenadas.length / 2);
                return ordenadas.length % 2
                    ? ordenadas[meio]
                    : (ordenadas[meio - 1] + ordenadas[meio]) / 2;
            },
            resetar: function () {
                amostras.length = 0;
            }
        };
    }

    global.PingEstimator = { criar: criarEstimadorPing };
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { criarEstimadorPing: criarEstimadorPing };
    }
})(typeof window !== 'undefined' ? window : globalThis);
