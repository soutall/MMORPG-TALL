window.vfxListeners = window.vfxListeners || [];

window.dispatchVFXEvent = function(dados) {
    if (!window.vfxListeners) return;
    window.vfxListeners.forEach(listener => {
        try {
            listener(dados);
        } catch(e) {
            console.error("VFX Listener Error: ", e);
        }
    });
};

window.obterPosicaoEntidade = function(id) {
    if (!id) return { x: 0, y: 0 };
    if (id === window.meuId) {
        return { x: window.meuX, y: window.meuY, hp: window.meuHp, maxHp: window.meuMaxHp, isPlayer: true };
    }
    if (window.todosJogadores && window.todosJogadores[id]) {
        let j = window.todosJogadores[id];
        return { x: j.x, y: j.y, hp: j.hp, maxHp: j.maxHp, isPlayer: true };
    }
    let listaS = window.listaSlimes || window.slimes;
    if (Array.isArray(listaS)) {
        let mob = listaS.find(s => s && s.id === id);
        if (mob) return mob;
    }
    let listaB = window.listaBosses || (typeof listaBosses !== 'undefined' ? listaBosses : null);
    if (Array.isArray(listaB)) {
        let b = listaB.find(m => m && m.id === id);
        if (b) return b;
    }
    return { x: 0, y: 0 };
};
