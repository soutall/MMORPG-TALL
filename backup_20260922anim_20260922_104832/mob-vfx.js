// mob-vfx.js — Efeitos visuais para monstros (usa o campo efeitoVisual do editor "EDIT MOOB")
// Renderiza partículas/auras/névoa/etc ao redor de cada slime de forma barata e determinística.
// Lista vasta de efeitos exportada em window.MOB_VFX_LIST.

window.MOB_VFX_LIST = [
    ['none', '— Nenhum —'],
    ['aura_fogo', '🔥 Aura de Fogo'], ['aura_gelo', '❄️ Aura de Gelo'], ['aura_veneno', '☠️ Aura de Veneno'],
    ['aura_sombria', '🌑 Aura Sombria'], ['aura_sagrada', '✨ Aura Sagrada'], ['aura_eletrica', '⚡ Aura Elétrica'],
    ['aura_lunar', '🌙 Aura Lunar'], ['aura_solar', '☀️ Aura Solar'], ['aura_magma', '🟠 Aura de Magma'],
    ['aura_agua', '🌊 Aura de Água'], ['aura_vento', '💨 Aura de Vento'], ['aurora', '🌈 Aura Arco-íris'],
    ['brilho', '💎 Brilho Cintilante'], ['brilho_pulsa', '✨ Brilho Pulsante'], ['chamas', '🔥 Chamas'],
    ['chamas_verdes', '☠️ Chamas Venenosas'], ['brasas', '🟠 Brasas Voadoras'], ['faiscas', '✨ Faíscas Elétricas'],
    ['nevoa', '🌫️ Névoa Rasteira'], ['nevoa_densa', '🌫️ Névoa Densa'], ['fumaca', '💨 Fumaça'],
    ['poeira', '🟤 Poeira'], ['cinzas', '🩶 Cinzas'], ['neve', '❄️ Neve Caindo'], ['chuva', '🌧️ Chuva'],
    ['folhas', '🍃 Folhas ao Vento'], ['petalas', '🌸 Pétalas'], ['borboletas', '🦋 Borboletas'],
    ['vagalumes', '🌟 Vagalumes'], ['estrelas', '⭐ Estrelas'], ['cristais', '💠 Cristais Flutuantes'],
    ['runas', '🔮 Runas Orbitais'], ['portal', '🌀 Portal Mágico'], ['vortice', '🌪️ Vórtice'],
    ['espinhos', '🌵 Espinhos'], ['sombras', '🌑 Sombra Pulsante'], ['sangue', '🩸 Sangue Escorrendo'],
    ['poço_trevas', '🕳️ Poço de Trevas'], ['fogo_frio', '💠 Fogo Frio'], ['constelacao', '✨ Constelação'],
    ['eletrico_cores', '🎇 Elétrico Multicolor'], ['lagrimas', '💧 Lágrimas'], ['protetores', '🛡️ Aura Protetora'],
    ['aneis_sagrados', '🤍 Anéis Sagrados'], ['demonica', '👹 Aura Demoníaca'], ['vida', '🌿 Aura de Vida'],
    ['morte', '💀 Aura de Morte'], ['passos_fantasma', '👻 Passos Fantasma'], ['energia_verde', '🧪 Energia Verde'],
    ['ouro', '🪙 Aura Dourada'], ['raio', '⚡ Raios']
];

// hash estável por id do monstro (evita tremulação entre frames)
function _mobHash(id) {
    var h = 0, s = String(id || 'x');
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h;
}

function _mp(h, i) {
    var x = Math.sin(h * 12.9898 + i * 78.233) * 43758.5453;
    return x - Math.floor(x);
}

function _corAlpha(hex, a) {
    return hex + Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, '0');
}

function _nuvemBlob(ctx, x, y, raio, cor, alpha, escalaX) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(0.55, alpha));
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.ellipse(x, y, raio * escalaX, raio * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

window.desenharEfeitoVisualMob = function (slime) {
    if (!slime || !window.ctx) return;
    var key = slime.efeitoVisual;
    if (!key || key === 'none' || key === '') return;
    var ctx = window.ctx;
    var h = _mobHash(slime.id);
    var t = Date.now() / 1000 + h * 0.1;
    var cor = /^#[0-9a-fA-F]{6}$/.test(String(slime.vfxCor || '')) ? slime.vfxCor : '#ffffff';
    var inten = Math.max(0.1, Math.min(6, slime.vfxIntensidade || 1));
    var esc = (slime.escala || 1);
    var raio = (slime._radioVfx || 20) * inten * 0.5 + 10 * esc;
    var cont = slime._contSpawned ? (slime._contSpawned || 0) : 1000000;
    ctx.save();
    ctx.translate(slime.x, slime.y);
    if (esc !== 1) ctx.scale(esc, esc);
    ctx.globalAlpha = 1;

    // ===== AURAS (anel pulsante + brilho) =====
    if (key.indexOf('aura_') === 0 || key === 'brilho_pulsa' || key === 'aurora' || key === 'vida' || key === 'morte' || key === 'demonica' || key === 'protetores' || key === 'ouro') {
        var pulso = 0.5 + Math.sin(t * 2) * 0.2;
        ctx.globalAlpha = 0.22 * inten + 0.06;
        ctx.strokeStyle = cor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 2, raio + 2 + Math.sin(t * 2.2) * 2, (raio + 2) * 0.4, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 0.35 * inten;
        ctx.fillStyle = cor;
        ctx.beginPath();
        ctx.ellipse(0, 2, raio * pulso, raio * 0.34, 0, 0, Math.PI * 2);
        ctx.fill();
        // anel externo + pontos orbitais
        ctx.globalAlpha = 0.5;
        for (var i = 0; i < 4; i++) {
            var a = t * (key === 'vida' ? 1.4 : 1.1) + i * 1.57;
            var ox = Math.cos(a) * (raio + 5);
            var oy = Math.sin(a) * (raio * 0.45);
            ctx.fillStyle = _corAlpha(cor, 0.8);
            ctx.beginPath();
            ctx.arc(ox, oy, 1.5 + _mp(h, i) * 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // ===== CHAMAS / BRASAS / FOGO-FRIO (partículas subindo) =====
    if (key === 'chamas' || key === 'chamas_verdes' || key === 'brasas' || key === 'fogo_frio' || key === 'aura_fogo' || key === 'aura_magma') {
        var nChamas = Math.floor(10 * Math.min(2, inten));
        for (var c = 0; c < nChamas; c++) {
            var cy = 10 - ((t * 18 + c * 7) % 34);
            var sx = (c - nChamas / 2) * 2.2 + Math.sin(t * 6 + c) * 2.5;
            var fy = 0.5 + Math.sin(t * 5 + c * 2) * 0.15;
            ctx.globalAlpha = Math.max(0.05, 0.8 - Math.abs(cy) / 40) * inten;
            ctx.fillStyle = key === 'chamas_verdes' ? '#39e75f' : key === 'fogo_frio' ? '#9fc7ff' : cor;
            ctx.beginPath();
            ctx.arc(sx, cy, (2.5 + _mp(h, c) * 2.5) * fy, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // ===== NÉVOA / FUMAÇA / CINZAS / POEIRA (blobs rastejando) =====
    if (key === 'nevoa' || key === 'nevoa_densa' || key === 'fumaca' || key === 'cinzas' || key === 'poeira') {
        var nBlobs = key === 'nevoa_densa' ? 6 : 4;
        var corBlob = key === 'cinzas' ? '#9b9b9b' : key === 'poeira' ? '#c9a86a' : cor;
        for (var b = 0; b < nBlobs; b++) {
            var bx = (t * (6 + b) + b * 13) % (raio * 4) - raio * 2;
            var by = 2 + Math.sin(t + b * 1.3) * 5;
            var br = (3 + _mp(h, b) * 4) * (key === 'nevoa_densa' ? 1.8 : 1.25) * inten;
            var alpha = (key === 'nevoa_densa' ? 0.5 : 0.3) * inten * (0.4 + 0.6 * Math.cos(bx / raio));
            _nuvemBlob(ctx, bx, by, br, corBlob, Math.min(0.5, alpha), 1.6);
        }
    }

    // ===== PARTÍCULAS SUBINDO (faiscas, vagalumes, brasas, energia) =====
    if (key === 'faiscas' || key === 'vagalumes' || key === 'energia_verde' || key === 'constelacao' || key === 'estrelas' || key === 'cristais' || key === 'brilho' || key === 'raio') {
        var nPart = Math.floor(8 * Math.min(2, inten));
        for (var p = 0; p < nPart; p++) {
            var py = 14 - ((t * 22 + p * 11) % 36);
            var px = (p - nPart / 2) * 2.5 + Math.sin(t * 7 + p * 3) * 3;
            ctx.globalAlpha = (0.5 + 0.5 * Math.sin(t * 9 + p)) * inten;
            ctx.fillStyle = key === 'energia_verde' ? '#6bff8f' : _corAlpha(cor, 0.9);
            ctx.beginPath();
            ctx.arc(px, py, 1 + _mp(h, p) * 1.6, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // ===== DUPLA ESPIRAL ORBITAL (runas, portal, vórtice, aneis) =====
    if (key === 'runas' || key === 'portal' || key === 'vortice' || key === 'aneis_sagrados' || key === 'eletrico_cores' || key === 'aurora') {
        var nRunas = key === 'eletrico_cores' ? 12 : 10;
        for (var r = 0; r < nRunas; r++) {
            var ang = t * (key === 'vortice' ? -2.2 : 1.4) + (r / nRunas) * Math.PI * 2;
            var rr = raio * (0.7 + _mp(h, r) * 0.35);
            var ar = key === 'eletrico_cores' ? ['#ff5e5e', '#ffe75e', '#5effc9', '#5ea2ff', '#d45eff'][r % 5] : cor;
            ctx.save();
            ctx.translate(Math.cos(ang) * rr, Math.sin(ang) * rr * 0.6);
            ctx.rotate(ang + 1.57);
            ctx.globalAlpha = 0.75 * inten;
            ctx.strokeStyle = ar;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, 3.2, 0, Math.PI * 1.4);
            ctx.stroke();
            ctx.restore();
        }
        if (key === 'portal') {
            ctx.globalAlpha = 0.28 * inten;
            ctx.strokeStyle = cor;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(0, 2, raio * 0.7, raio * 0.25, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    // ===== ESPINHOS (pulos ao redor) =====
    if (key === 'espinhos') {
        for (var sp = 0; sp < 8; sp++) {
            var as = sp * 0.785 + t * 0.3;
            var ex = Math.cos(as) * raio, ey = Math.sin(as) * raio * 0.5;
            ctx.save();
            ctx.translate(ex, ey);
            ctx.rotate(as + Math.PI / 2);
            ctx.globalAlpha = 0.6 * inten;
            ctx.fillStyle = _corAlpha(cor, 0.9);
            ctx.beginPath();
            ctx.moveTo(0, 0); ctx.lineTo(3.5, -9); ctx.lineTo(-3.5, -9);
            ctx.closePath(); ctx.fill();
            ctx.restore();
        }
    }

    // ===== CHUVA / NEVE / LÁGRIMAS (caindo) =====
    if (key === 'chuva' || key === 'neve' || key === 'lagrimas') {
        var nChuva = Math.floor(10 * Math.min(2, inten));
        for (var ch = 0; ch < nChuva; ch++) {
            var cxx = (t * (key === 'chuva' ? 40 : 14) + ch * 17) % (raio * 2.4) - raio * 1.2;
            var cyy = (t * 20 + ch * 13) % 40 - 20;
            ctx.globalAlpha = 0.5 * inten;
            ctx.strokeStyle = key === 'lagrimas' ? cor : '#bcd9ff';
            ctx.lineWidth = key === 'chuva' ? 1.2 : 1;
            if (key === 'neve') {
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(cxx, cyy, 1.4, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.beginPath();
                ctx.moveTo(cxx, cyy);
                ctx.lineTo(cxx - 1, cyy - 5);
                ctx.stroke();
            }
        }
    }

    // ===== FOLHAS / PÉTALAS / BORBOLETAS (deriva leve) =====
    if (key === 'folhas' || key === 'petalas' || key === 'borboletas' || key === 'sombras' || key === 'poço_trevas') {
        var nFolhas = Math.floor(6 * Math.min(2, inten));
        for (var f = 0; f < nFolhas; f++) {
            var fx = (t * (8 + f) + f * 19) % (raio * 3) - raio * 1.5;
            var fy = Math.sin(t + f * 1.7) * raio * 0.5;
            ctx.save();
            ctx.translate(fx, fy);
            ctx.rotate(Math.sin(t * 3 + f) * 0.8);
            ctx.globalAlpha = 0.55 * inten;
            ctx.fillStyle = key === 'borboletas' ? '#ffd0e8' : key === 'sombras' || key === 'poço_trevas' ? '#4b4b5e' : _corAlpha(cor, 0.9);
            ctx.beginPath();
            ctx.ellipse(0, 0, 3.6, 2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        if (key === 'poço_trevas') {
            ctx.globalAlpha = 0.4 * inten;
            ctx.fillStyle = '#1a0f2e';
            ctx.beginPath();
            ctx.ellipse(0, 3, raio + 4, raio * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // ===== RAIO ELÉTRICO (linhas ramificadas) =====
    if (key === 'raio' || key === 'eletrico_cores') {
        for (var l = 0; l < 3; l++) {
            var baseAng = t * 3 + l * 2.09 + h * 0.2;
            ctx.save();
            ctx.rotate(baseAng);
            ctx.strokeStyle = key === 'eletrico_cores' ? ['#ffe75e', '#5ea2ff', '#ff5e5e'][l] : cor;
            ctx.lineWidth = 1.4;
            ctx.globalAlpha = (0.5 + 0.5 * Math.sin(t * 12 + l)) * inten;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            var px = 0, py = 0;
            var zig = -1;
            for (var seg = 1; seg < 6; seg++) {
                px += raio * 0.28;
                py += zig * (2 + _mp(h, seg) * 4);
                zig *= -1;
                ctx.lineTo(px, py);
            }
            ctx.stroke();
            ctx.restore();
        }
    }

    // ===== SANGUE (gotas subindo/esc fritando) =====
    if (key === 'sangue') {
        for (var g = 0; g < 5; g++) {
            var gy = 8 - ((t * 14 + g * 9) % 20);
            var gx = (g - 2) * 3 + Math.sin(t * 5 + g) * 2;
            ctx.globalAlpha = (0.5 + 0.5 * Math.sin(t + g)) * inten;
            ctx.fillStyle = '#c5261e';
            ctx.beginPath();
            ctx.arc(gx, gy, 1.6, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    ctx.restore();
};