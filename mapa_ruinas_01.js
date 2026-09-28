// Mapa ID: ruinas_01 — Ruínas de Âmbar.
(function (global) {
    'use strict';
    const MAPA_ID = 'ruinas_01';
    const CFG = (global.MAPAS_REGISTRY || {})[MAPA_ID];
    if (!CFG) return;
    const X0 = CFG.x0, X1 = CFG.x0 + CFG.w, Y1 = CFG.h;
    const SPAWN = { x: X0 + 1300, y: 950 };
    let cache = null;

    function dentro(x, y) { return x >= X0 && x < X1 && y >= 0 && y < Y1; }
    function criarCena() {
        if (typeof document === 'undefined') return null;
        const c = document.createElement('canvas'); c.width = CFG.w; c.height = CFG.h;
        const ctx = c.getContext('2d'); if (!ctx) return null;
        ctx.fillStyle = '#151522'; ctx.fillRect(0, 0, c.width, c.height);
        ctx.fillStyle = '#24233a';
        for (let y=0;y<c.height;y+=64) for(let x=0;x<c.width;x+=64) ctx.fillRect(x+2,y+2,60,60);
        ctx.fillStyle = '#4b465f';
        ctx.fillRect(180,180,2240,90); ctx.fillRect(180,1630,2240,90);
        ctx.fillRect(180,180,90,1540); ctx.fillRect(2330,180,90,1540);
        ctx.fillStyle = '#6d617c';
        for (let i=0;i<7;i++) { ctx.fillRect(330+i*320,420,70,390); ctx.fillRect(330+i*320,1080,70,310); }
        ctx.fillStyle = '#b58b43'; ctx.fillRect(1050,820,500,220);
        ctx.fillStyle = '#d7b85a'; ctx.fillRect(1140,875,320,110);
        ctx.fillStyle = 'rgba(120,80,190,.18)'; ctx.beginPath(); ctx.arc(1300,950,310,0,Math.PI*2); ctx.fill();
        ctx.fillStyle = '#8b78a8';
        for(let i=0;i<18;i++){ const x=300+(i*173)%1900, y=300+(i*281)%1200; ctx.fillRect(x,y,36,36); }
        return c;
    }
    function desenhar(ctx, t, camX, camY, cw, ch) {
        if (!dentro(camX+cw/2, camY+ch/2)) return;
        if (!cache) cache=criarCena();
        if (cache) ctx.drawImage(cache, X0, 0);
        const pulse=0.55+Math.sin(t/500)*0.15;
        ctx.save(); ctx.globalAlpha=pulse; ctx.fillStyle='#d7b85a'; ctx.beginPath(); ctx.arc(SPAWN.x,SPAWN.y,8,0,Math.PI*2); ctx.fill(); ctx.restore();
    }
    function colide(x,y,r) { return !dentro(x,y) ? true : false; }
    global.mapaRuinas01 = { MAPA_ID, X0, X1, Y1, SPAWN, dentro, desenhar, colide };
    global.desenharMapaRuinas01 = desenhar;
})(typeof window !== 'undefined' ? window : globalThis);
