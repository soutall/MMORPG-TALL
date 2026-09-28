// Soldado Lanceiro — visual dedicado do novo monstro.
// Desenho Canvas detalhado: armadura segmentada, lança, escudo e VFX das duas skills.
(function () {
    function ton(hex, f) {
        var n = parseInt(hex.slice(1), 16);
        var r = Math.min(255, Math.round(((n >> 16) & 255) * f));
        var g = Math.min(255, Math.round(((n >> 8) & 255) * f));
        var b = Math.min(255, Math.round((n & 255) * f));
        return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
    }
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function drawMetal(ctx, path, fill, stroke) {
        ctx.fillStyle = fill; ctx.strokeStyle = stroke || '#171a1f'; ctx.lineWidth = 1.1;
        ctx.fill(path); ctx.stroke(path);
    }

    window.soldadoLanceiroHits = window.soldadoLanceiroHits || [];

    window.desenharSoldadoLanceiro = function (ctx, slime, est) {
        var t = Date.now() / 1000;
        var ang = Number.isFinite(slime.lanceiroFaceAngle) ? slime.lanceiroFaceAngle : (est.face || 0);
        var carregando = !!slime.skillCharging && slime.skillKind === 'lanceiro_investida';
        var dashing = !!slime.lanceiroDashing;
        var bloqueando = !!slime.lanceiroBloqueando;
        var esc = slime.escala || 1;
        var cor = '#7d1828';
        var aço = '#737b86';
        var açoEsc = '#b7bec8';
        var ouro = '#c59a45';
        var couro = '#4a2c22';
        var pano = '#7e1728';

        ctx.save();
        ctx.rotate(ang);
        if (dashing) ctx.scale(1.12, 0.92);

        // Sombra e aura de movimento.
        ctx.fillStyle = 'rgba(0,0,0,0.38)';
        ctx.beginPath(); ctx.ellipse(0, 17, 18, 5.5, 0, 0, Math.PI * 2); ctx.fill();
        if (carregando) {
            ctx.globalAlpha = 0.18 + Math.sin(t * 12) * 0.05;
            ctx.strokeStyle = '#e4c35a'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.ellipse(0, 3, 23, 13, 0, 0, Math.PI * 2); ctx.stroke();
            ctx.globalAlpha = 1;
        }

        // Pernas: grevas, joelheiras e botas em couro.
        var passo = slime.movendo ? Math.sin(t * 10) * 2.2 : Math.sin(t * 2.2) * 0.4;
        ctx.save();
        ctx.translate(-6 + passo, 5); ctx.rotate(-0.06 + passo * 0.02);
        drawMetal(ctx, new Path2D('M-4,-1 L4,-1 L5,10 L2,15 L-5,13 Z'), ton(aço,0.72), '#252a31');
        ctx.fillStyle = couro; ctx.fillRect(-6, 11, 10, 4);
        ctx.fillStyle = ouro; ctx.fillRect(-4, 1, 7, 1.4); ctx.fillRect(-4, 7, 7, 1.2); ctx.restore();
        ctx.save();
        ctx.translate(6 - passo, 5); ctx.rotate(0.06 - passo * 0.02);
        drawMetal(ctx, new Path2D('M-4,-1 L4,-1 L5,13 L-2,15 L-5,10 Z'), ton(aço,0.66), '#252a31');
        ctx.fillStyle = couro; ctx.fillRect(-4, 11, 10, 4);
        ctx.fillStyle = ouro; ctx.fillRect(-4, 1, 7, 1.4); ctx.fillRect(-4, 7, 7, 1.2); ctx.restore();

        // Manto vermelho gasto atrás da armadura.
        ctx.fillStyle = pano; ctx.strokeStyle = '#43101a'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-10,-10); ctx.quadraticCurveTo(-17,2,-13,16); ctx.lineTo(-7,12); ctx.lineTo(-3,18); ctx.lineTo(2,11); ctx.lineTo(8,16); ctx.quadraticCurveTo(14,0,10,-10); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#b23843'; ctx.globalAlpha = 0.45;
        ctx.beginPath(); ctx.moveTo(-8,-3); ctx.lineTo(-12,11); ctx.lineTo(-8,8); ctx.lineTo(-4,13); ctx.lineTo(-1,-5); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;

        // Torso com placas sobrepostas, rebites e faixa dourada.
        var torso = new Path2D('M-11,-11 L-7,-17 L7,-17 L11,-11 L9,7 L4,11 L-5,11 L-10,7 Z');
        drawMetal(ctx, torso, ton(aço,0.68), '#1c2026');
        ctx.fillStyle = ton(açoEsc,0.72); ctx.beginPath(); ctx.moveTo(-7,-14); ctx.lineTo(0,-17); ctx.lineTo(7,-14); ctx.lineTo(5,-7); ctx.lineTo(-5,-7); ctx.closePath(); ctx.fill();
        ctx.fillStyle = ouro; ctx.fillRect(-8,-7,16,2); ctx.fillRect(-2,-15,4,8);
        ctx.fillStyle = '#d9bd72'; for (var r=0;r<5;r++) { ctx.beginPath(); ctx.arc(-7+r*3.5,-6,0.8,0,Math.PI*2); ctx.fill(); }

        // Ombreiras volumosas.
        ctx.fillStyle = ton(aço,0.82); ctx.strokeStyle = '#20242a';
        ctx.beginPath(); ctx.ellipse(-11,-10,6,5,0,-Math.PI,Math.PI); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(11,-10,6,5,0,0,Math.PI); ctx.fill(); ctx.stroke();
        ctx.fillStyle = ouro; ctx.fillRect(-15,-10,5,1.2); ctx.fillRect(10,-10,5,1.2);

        // Cabeça: capacete fechado com viseira e crista vermelha.
        ctx.fillStyle = ton(aço,0.72); ctx.strokeStyle = '#16191e'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(0,-20,8,Math.PI,0); ctx.lineTo(7,-15); ctx.lineTo(5,-10); ctx.lineTo(-5,-10); ctx.lineTo(-7,-15); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#1a1d22'; ctx.fillRect(-6,-18,12,3.2);
        ctx.fillStyle = '#d7dde5'; ctx.fillRect(-4,-17.3,1,1.3); ctx.fillRect(-1,-17.3,1,1.3); ctx.fillRect(2,-17.3,1,1.3);
        ctx.fillStyle = '#a72a38';
        ctx.beginPath(); ctx.moveTo(-2,-27); ctx.quadraticCurveTo(0,-34,3,-27); ctx.lineTo(5,-23); ctx.lineTo(-4,-23); ctx.closePath(); ctx.fill();
        ctx.fillStyle = ouro; ctx.fillRect(-7,-14,14,1.2);

        // Braço da lança.
        ctx.fillStyle = ton(aço,0.62); ctx.strokeStyle = '#20242a';
        ctx.save(); ctx.translate(8,-5); ctx.rotate(-0.18);
        ctx.fillRect(-2,-2,10,4); ctx.fillStyle = couro; ctx.fillRect(0,-2,3,4); ctx.fillStyle = ouro; ctx.fillRect(5,-2,1.5,4); ctx.restore();

        // Escudo grande com borda metálica, rebites e brasão.
        ctx.save(); ctx.translate(-10,-1); ctx.rotate(0.08);
        ctx.fillStyle = '#343a42'; ctx.strokeStyle = '#16191e'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-1,-15); ctx.lineTo(10,-11); ctx.lineTo(12,2); ctx.lineTo(4,15); ctx.lineTo(-7,9); ctx.lineTo(-9,-7); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = ouro; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(0,-12); ctx.lineTo(8,-9); ctx.lineTo(9,2); ctx.lineTo(3,11); ctx.lineTo(-5,7); ctx.lineTo(-7,-5); ctx.closePath(); ctx.stroke();
        ctx.fillStyle = ton(açoEsc,0.8); ctx.beginPath(); ctx.moveTo(1,-8); ctx.lineTo(6,-4); ctx.lineTo(5,5); ctx.lineTo(0,8); ctx.lineTo(-4,3); ctx.lineTo(-3,-4); ctx.closePath(); ctx.fill();
        ctx.fillStyle = ouro; ctx.beginPath(); ctx.arc(0,0,2.2,0,Math.PI*2); ctx.fill();
        for (var b=0;b<6;b++){ var ba=b*Math.PI/3; ctx.fillStyle='#d8dde3'; ctx.beginPath(); ctx.arc(Math.cos(ba)*7,Math.sin(ba)*8,0.9,0,Math.PI*2); ctx.fill(); }
        ctx.restore();

        // Lança detalhada: haste, empunhadura, guarda e ponta facetada.
        var recuo = dashing ? 9 : (carregando ? -3 : 0);
        ctx.save(); ctx.translate(8,-2); ctx.rotate(0.02);
        ctx.strokeStyle = '#3a2418'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(-2,0); ctx.lineTo(34+recuo,0); ctx.stroke();
        ctx.strokeStyle = '#9d6b35'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(0,-0.7); ctx.lineTo(32+recuo,-0.7); ctx.stroke();
        ctx.fillStyle = ouro; ctx.fillRect(5,-2.8,2,5.6); ctx.fillRect(24,-2.2,2,4.4);
        ctx.fillStyle = '#dce4ee'; ctx.strokeStyle = '#1d232b'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(31+recuo,0); ctx.lineTo(39+recuo,-4); ctx.lineTo(43+recuo,0); ctx.lineTo(39+recuo,4); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = ouro; ctx.beginPath(); ctx.moveTo(34+recuo,0); ctx.lineTo(39+recuo,-2); ctx.lineTo(41+recuo,0); ctx.lineTo(39+recuo,2); ctx.closePath(); ctx.fill();
        ctx.restore();

        // Investida: lança estendida + rastros de vento/perfuração.
        if (dashing) {
            ctx.save(); ctx.globalAlpha = 0.75;
            for (var w=0;w<5;w++) {
                var wx = -8 - w*7 - ((t*34+w*11)%8);
                ctx.strokeStyle = w%2 ? 'rgba(210,235,255,0.65)' : 'rgba(255,255,255,0.35)';
                ctx.lineWidth = 1.4 + (4-w)*0.25;
                ctx.beginPath(); ctx.arc(wx,0,10+w*2,-0.65,0.65); ctx.stroke();
            }
            ctx.strokeStyle = 'rgba(190,225,255,0.7)'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(24,0); ctx.lineTo(52,0); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(31,-5); ctx.lineTo(49,-1); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(31,5); ctx.lineTo(49,1); ctx.stroke();
            ctx.restore();
        }

        // Bloqueio: barreira frontal translúcida presa ao escudo.
        if (bloqueando) {
            ctx.save();
            var pulse = 0.72 + Math.sin(t*9)*0.15;
            ctx.globalAlpha = 0.22 + pulse*0.16;
            ctx.fillStyle = '#59a9ff'; ctx.strokeStyle = '#bfe5ff'; ctx.lineWidth = 2.2;
            ctx.beginPath(); ctx.moveTo(-2,-24); ctx.lineTo(27,-15); ctx.lineTo(32,0); ctx.lineTo(27,15); ctx.lineTo(-2,24); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.globalAlpha = 0.8;
            ctx.setLineDash([5,4]); ctx.beginPath(); ctx.arc(7,0,27,-0.9,0.9); ctx.stroke(); ctx.setLineDash([]);
            ctx.globalAlpha = 0.45; ctx.strokeStyle='#ffffff';
            for(var q=0;q<4;q++){ctx.beginPath();ctx.moveTo(5+q*5,-18+q*6);ctx.lineTo(25+q*2,-9+q*5);ctx.stroke();}
            ctx.restore();
        }

        // Carga: corpo abaixa e a ponta da lança concentra energia.
        if (carregando) {
            ctx.save(); ctx.globalAlpha = 0.8; ctx.strokeStyle='#ffe58a'; ctx.lineWidth=1.5;
            ctx.beginPath(); ctx.arc(38,0,5+Math.sin(t*14)*2,0,Math.PI*2); ctx.stroke();
            for(var c=0;c<6;c++){var ca=t*5+c;var cr=8+((t*20+c*4)%10);ctx.fillStyle='#fff2b0';ctx.beginPath();ctx.arc(38+Math.cos(ca)*cr,Math.sin(ca)*cr*0.5,1,0,Math.PI*2);ctx.fill();}
            ctx.restore();
        }
        ctx.restore();

        // Hits bloqueados são desenhados fora da rotação do soldado.
        var hits = window.soldadoLanceiroHits || [];
        for (var i=hits.length-1;i>=0;i--) {
            var h=hits[i]; if (h.id && h.id !== slime.id) continue; var hp=(Date.now()-h.t)/260;
            if(hp>=1){hits.splice(i,1);continue;}
            var ox=h.x-slime.x, oy=h.y-slime.y;
            ctx.save(); ctx.translate(ox,oy); ctx.globalAlpha=1-hp;
            ctx.strokeStyle='#ff3b30'; ctx.lineWidth=3.5;
            ctx.beginPath();ctx.moveTo(-14-hp*8,-8);ctx.lineTo(14+hp*8,8);ctx.moveTo(-14-hp*8,8);ctx.lineTo(14+hp*8,-8);ctx.stroke();
            ctx.fillStyle='#ff5a45';ctx.beginPath();ctx.arc(0,0,4+hp*7,0,Math.PI*2);ctx.fill();
            ctx.restore();
        }
    };
})();
