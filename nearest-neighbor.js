(function (global) {
    'use strict';

    function ativarNearestNeighbor(tipoCanvas) {
        if (!tipoCanvas || !tipoCanvas.prototype) return;
        var prototipo = tipoCanvas.prototype;
        var getContextOriginal = prototipo.getContext;
        if (typeof getContextOriginal !== 'function' || getContextOriginal._nearestNeighbor) return;

        var getContextNearest = function (tipo) {
            var contexto = getContextOriginal.apply(this, arguments);
            if (contexto && String(tipo).toLowerCase() === '2d') {
                contexto.imageSmoothingEnabled = false;
            }
            return contexto;
        };
        getContextNearest._nearestNeighbor = true;
        prototipo.getContext = getContextNearest;
    }

    ativarNearestNeighbor(global.HTMLCanvasElement);
    ativarNearestNeighbor(global.OffscreenCanvas);

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {};
    }
})(typeof window !== 'undefined' ? window : globalThis);
