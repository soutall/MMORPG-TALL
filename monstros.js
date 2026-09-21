// monstros.js v2 - visual minimalista com auras, animações (idle/mov/atk) e morte
// (o Zumbi foi mantido com o visual antigo - fora do escopo do redesenho)

window.monstrosMortes = window.monstrosMortes || [];
var _estadosMonstros = {};
var _contadorVisitas = 0;

function _chave(slime) {
    return slime.id != null ? String(slime.id) : (slime.x + '_' + slime.y);
}

function _estado(slime) {
    var k = _chave(slime);
    if (!_estadosMonstros[k]) {
        _estadosMonstros[k] = {
            x: slime.x, y: slime.y,
            fase: (slime.x * 0.013) % 6.28,
            prevCd: 0, prevHp: 0,
            atkT: 0, flash: 0,
            movendo: false, face: 0, morto: false, visita: _contadorVisitas
        };
    }
    return _estadosMonstros[k];
}

function _atualizarEstado(slime, est) {
    var dx = slime.x - est.x, dy = slime.y - est.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0.8) {
        est.movendo = true;
        est.face = Math.atan2(dy, dx);
        est.x = slime.x;
        est.y = slime.y;
    } else {
        est.movendo = false;
    }
    if ((slime.attackCooldown === 0 || slime.attackCooldown == null) && est.prevCd > 0) {
        est.atkT = 24;
        est.flash = 10;
    }
    if (est.atkT > 0) est.atkT--;
    if (est.flash > 0) est.flash--;
    est.prevCd = (slime.attackCooldown != null) ? slime.attackCooldown : 0;
}

// ---------- DETECCAO DE MORTE ----------
window.verificarMortesMonstros = function () {
    var lista = window.listaSlimes || [];
    var presentes = {};
    for (var i = 0; i < lista.length; i++) {
        var s = lista[i];
        if (!s) continue;
        var k = _chave(s);
        presentes[k] = 1;
        var est = _estado(s);
        if (s.hp <= 0 && est.prevHp > 0 && !est.morto) {
            est.morto = true;
            window.monstrosMortes.push({ x: s.x, y: s.y, t: 0, max: 32, tipo: s.tipo, arq: s.arquetipo, id: k });
        }
        est.prevHp = s.hp;
        if (s.hp > 0 && est.morto) est.morto = false;
    }
    _contadorVisitas++;
    for (var kk in _estadosMonstros) {
        if (_contadorVisitas - _estadosMonstros[kk].visita > 300) delete _estadosMonstros[kk];
    }
};

// ---------- ANIMACAO DE MORTE ----------
window.desenharMortesMonstros = function () {
    var ctx = window.ctx;
    if (!ctx) return;
    var arr = window.monstrosMortes;
    for (var i = arr.length - 1; i >= 0; i--) {
        var m = arr[i];
        m.t++;
        var p = m.t / m.max;
        if (p >= 1) { arr.splice(i, 1); continue; }
        var cor = _corDeMorte(m.tipo, m.arq);
        ctx.save();
        ctx.translate(m.x, m.y);
        ctx.globalAlpha = (1 - p) * 0.75;
        ctx.strokeStyle = cor;
        ctx.lineWidth = 3 * (1 - p) + 0.5;
        ctx.shadowColor = cor;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, 0, 6 + p * 34, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = (1 - p) * 0.5;
        ctx.fillStyle = cor;
        ctx.beginPath();
        ctx.ellipse(0, 3, 20 * (1 - p) + 3, 13 * (1 - p) + 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        for (var k = 0; k < 7; k++) {
            var a = m.t * 0.6 + k * 1.01 + (m.id ? m.id.length : 0);
            var rr = 5 + p * 18;
            var px = Math.cos(a) * rr;
            var py = -Math.sin(a * 0.7 + k) * rr * 0.55 - p * 24;
            ctx.globalAlpha = Math.max(0, 1 - p - 0.08 * k);
            ctx.fillStyle = (k % 2) ? cor : '#ffffff';
            ctx.beginPath();
            ctx.arc(px, py, 2.2 * (1 - p) + 0.3, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
    ctx.globalAlpha = 1;
};

// ---------- AJUDANTES COMPARTILHADOS ----------
function _pulso(t, sp) { return (Math.sin(t * (sp || 3)) + 1) / 2; }

function _ton(hex, f) {
    var n = parseInt(hex.slice(1), 16);
    var r = Math.min(255, Math.round(((n >> 16) & 255) * f));
    var g = Math.min(255, Math.round(((n >> 8) & 255) * f));
    var b = Math.min(255, Math.round((n & 255) * f));
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

function _corEstado(slime, base) {
    if (slime.stunTimer > 0) return '#efc321';
    if (slime.slowTimer > 0 && slime.stunTimer <= 0) return '#39e6ff';
    return base;
}

function _corDeMorte(tipo, arq) {
    var sl = { tipo: tipo || 'slime', arquetipo: arq || null };
    return _info(sl).cor;
}

function _info(slime) {
    var arq = slime.arquetipo, tp = slime.tipo;
    if (arq === 'web' || tp === 'aranha_dark') return { cor: '#6ee7ff', raio: 21 };
    if (arq === 'ranged' || tp === 'caveira_arqueira') return { cor: '#ffd29e', raio: 19 };
    if (arq === 'melee' || tp === 'caveira_melee') return { cor: '#ded3bd', raio: 21 };
    if (arq === 'poison_melee' || tp === 'escorpiao') return { cor: '#9dff6b', raio: 20 };
    if (arq === 'goblin' || tp === 'goblin') return { cor: '#8dff5e', raio: 18 };
    if (arq === 'assassin' || tp === 'assassino') return { cor: '#ff5e7a', raio: 19 };
    if (arq === 'gargoyle' || tp === 'gargula') return { cor: '#ffe08a', raio: 21 };
    if (arq === 'meteor' || tp === 'mago_arcano') return { cor: '#7fd8ff', raio: 21 };
    if (arq === 'void_laser' || tp === 'void_master') return { cor: '#b56cff', raio: 22 };
    if (tp === 'ogro') return { cor: '#c1e36a', raio: 24 };
    if (tp === 'mamute') return { cor: '#ffd98a', raio: 26 };
    if (tp === 'besouro_negro') return { cor: '#b56cff', raio: 22 };
    if (tp === 'morcego') return { cor: '#ff4d6d', raio: 19 };
    if (tp === 'ranged') return { cor: '#c77dff', raio: 17 };
    return { cor: '#58ff9c', raio: 17 };
}

function _sombra(ctx, escala) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 14 * escala, 14 * escala, 4.5 * escala, 0, 0, Math.PI * 2);
    ctx.fill();
}

function _desenharAura(ctx, slime, est, cor, raio) {
    var t = Date.now() / 1000 + est.fase;
    ctx.save();
    ctx.globalAlpha = 0.16 + _pulso(t, 2.2) * 0.14;
    ctx.strokeStyle = cor;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(0, 2, raio + Math.sin(t * 2) * 2, raio * 0.42 + Math.sin(t * 2.4) * 1.2, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.1 + _pulso(t, 1.8) * 0.1;
    ctx.fillStyle = cor;
    ctx.shadowColor = cor;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.ellipse(0, 2, raio + 4, raio * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    for (var i = 0; i < 3; i++) {
        var a = t * 0.9 + i * 2.09 + (slime.x || 0) * 0.02;
        var mx = Math.cos(a) * (raio + 7);
        var my = Math.sin(a) * (raio * 0.35 + 3) + Math.cos(a * 2.0) * 3 - 3;
        ctx.globalAlpha = 0.35 + _pulso(t * 1.4 + i, 2.6) * 0.3;
        ctx.fillStyle = cor;
        ctx.shadowColor = cor;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(mx, my, 1.5 + _pulso(t + i, 3) * 0.8, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function _lunge(est) {
    if (est.atkT <= 0) return { x: 0, y: 0, rot: 0, s: 1 };
    var p = 1 - est.atkT / 24;
    var f = Math.sin(Math.min(1, p) * Math.PI);
    return { x: f * 6, y: 0, rot: f * 0.14, s: 1 + f * 0.08 };
}

function _golpeArco(ctx, est, cor) {
    if (est.flash <= 0) return;
    var p = 1 - est.flash / 10;
    ctx.save();
    ctx.rotate(est.face);
    ctx.globalAlpha = (1 - p) * 0.85;
    ctx.strokeStyle = cor;
    ctx.lineWidth = 3;
    ctx.shadowColor = cor;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(0, 0, 16 + p * 6, -0.4, -0.4 + p * 1.6);
    ctx.stroke();
    ctx.restore();
}

function _piscar(slime) {
    var t = Date.now() / 1000 + (slime.x || 0) * 0.01;
    var ciclo = t % 3.6;
    return ciclo > 3.35;
}

function _stunStar(ctx, slime, dy) {
    if (!(slime.stunTimer > 0)) return;
    var ts = Date.now() / 90;
    ctx.fillStyle = '#f1c40f';
    ctx.font = '12px Arial';
    ctx.fillText('💫', Math.cos(ts) * 12 - 6, (dy || -22) + Math.sin(ts) * 2);
}

// ============ SLIME CLASSICO (verde / roxo ranged) ============
function _slime(ctx, slime, est, info) {
    var t = Date.now() / 1000 + est.fase;
    var cor = _corEstado(slime, info.cor);

    ctx.save();
    ctx.translate(0, -2);
    var resp = Math.sin(t * 2.6) * 0.05;
    var sy = 1 + resp - (est.movendo ? 0.06 : 0);
    var sx = 1 - resp + (est.movendo ? 0.06 : 0);
    var ln = _lunge(est);
    ctx.rotate(ln.rot);
    ctx.scale(sx * ln.s, sy * ln.s);
    ctx.translate(ln.x, 0);

    ctx.fillStyle = _ton(cor, 0.45);
    ctx.beginPath();
    ctx.moveTo(-15, 0);
    ctx.quadraticCurveTo(-15, -17, 0, -17);
    ctx.quadraticCurveTo(15, -17, 15, 0);
    ctx.quadraticCurveTo(15, 12, 0, 12);
    ctx.quadraticCurveTo(-15, 12, -15, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = _ton(cor, 1.5);
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.ellipse(-5, -9, 4, 2.4, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    var abrindo = est.atkT > 0 ? Math.min(1, est.atkT / 9) : 0;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.ellipse(0, 3.8, 4 + abrindo * 2, 1.8 + abrindo * 2.6, 0, 0, Math.PI * 2);
    ctx.fill();

    var fechado = _piscar(slime);
    ctx.fillStyle = '#10220f';
    if (fechado) {
        ctx.fillRect(-6, -4, 5, 1.4);
        ctx.fillRect(1, -4, 5, 1.4);
    } else {
        ctx.beginPath(); ctx.arc(-3.5, -4, 1.9, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(3.5, -4, 1.9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(-3, -4.8, 0.7, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(4, -4.8, 0.7, 0, Math.PI * 2); ctx.fill();
    }

    for (var i = 0; i < 3; i++) {
        var f = ((t * 0.85 + i * 0.33) % 1.15) / 1.15;
        var bx = -9 + i * 9 + Math.sin(t * 1.3 + i) * 1.5;
        var by = -16 + f * 26;
        ctx.globalAlpha = 0.55 + 0.4 * (1 - f);
        ctx.fillStyle = cor;
        ctx.beginPath();
        ctx.arc(bx, by, 1.7 - f, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        if (f > 0.82) {
            ctx.globalAlpha = (1 - f) * 1.6;
            ctx.strokeStyle = cor;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.ellipse(bx, 13, 6 * (1 - f), 2 * (1 - f), 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
    }
    ctx.restore();
    _golpeArco(ctx, est, cor);
}

// ============ BESOURO NEGRO (deserto) ============
function _besouro(ctx, slime, est, info) {
    var t = Date.now() / 1000 + est.fase;
    var voando = !!slime.dashing;
    var carregando = !!slime.skillCharging;
    var cor = _corEstado(slime, info.cor);

    if (voando) {
        ctx.save();
        ctx.rotate(est.face);
        ctx.fillStyle = '#18181f';
        ctx.beginPath(); ctx.ellipse(-3, 0, 27, 10, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#35354a';
        ctx.beginPath(); ctx.ellipse(9, 0, 12, 6, 0, 0, Math.PI * 2); ctx.fill();
        var bat = Math.sin(t * 42) * 0.5;
        ctx.fillStyle = 'rgba(185,170,225,0.45)';
        ctx.beginPath(); ctx.ellipse(-15, -10 + bat * 3, 8, 4, -0.35, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(-15, 10 - bat * 3, 8, 4, 0.35, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        _golpeArco(ctx, est, cor);
        return;
    }

    ctx.save();
    ctx.scale(1, 1 + Math.sin(t * 2.2) * 0.03);
    ctx.fillStyle = _corEstado(slime, '#191922');
    ctx.beginPath();
    ctx.ellipse(0, 0, 19, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    if (carregando) {
        ctx.fillStyle = _ton(cor, 0.14);
        ctx.globalAlpha = 0.35 + _pulso(t, 9) * 0.3;
        ctx.shadowColor = cor;
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.ellipse(0, -2, 16, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 1;
    for (var i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 5, -9);
        ctx.lineTo(i * 4 + (i > 0 ? 4 : 0), 10);
        ctx.stroke();
    }
    ctx.strokeStyle = '#0d0d12';
    ctx.lineWidth = 2.5;
    for (var l = 0; l < 3; l++) {
        var lx = -10 + l * 7;
        var pass = Math.sin(t * (est.movendo ? 16 : 3) + l) * 2;
        ctx.beginPath();
        ctx.moveTo(lx, 8);
        ctx.lineTo(lx - 5 - l + pass, 15);
        ctx.moveTo(lx + 4, 8);
        ctx.lineTo(lx + 8 + l - pass, 15);
        ctx.stroke();
    }
    var brilhoOlho = 0.7 + _pulso(t, 5) * 0.4;
    ctx.fillStyle = '#ff3b3b';
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 7 * brilhoOlho;
    ctx.beginPath(); ctx.arc(-8, -3, 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(8, -3, 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    if (carregando) {
        var bat2 = Math.sin(t * 38) * 0.5;
        ctx.fillStyle = 'rgba(200,190,240,0.4)';
        ctx.beginPath(); ctx.ellipse(-17, -5 + bat2 * 3, 7, 4, -0.4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(17, -5 - bat2 * 3, 7, 4, 0.4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    _golpeArco(ctx, est, cor);
    _stunStar(ctx, slime, -32);
}

// ============ MORCEGO (caverna) ============
function _morcego(ctx, slime, est, info) {
    var t = Date.now() / 1000 + est.fase;
    var cor = _corEstado(slime, info.cor);
    var altura = -13 + Math.sin(t * 2.3 + (slime.x || 0) * 0.01) * 3;
    var flap = Math.sin(t * ((est.movendo || est.atkT > 0) ? 13 : 2.1));
    var abrir = Math.abs(flap);

    ctx.save();
    ctx.translate(0, altura);
    ctx.fillStyle = 'rgba(90,60,105,0.9)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-10 * abrir, -8 * abrir, -15 * abrir, 0);
    ctx.quadraticCurveTo(-10 * abrir, 6 * abrir, -2, 3);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(10 * abrir, -8 * abrir, 15 * abrir, 0);
    ctx.quadraticCurveTo(10 * abrir, 6 * abrir, 2, 3);
    ctx.closePath();
    ctx.fill();

    var ln = _lunge(est);
    ctx.scale(1 + ln.s * 0.1, 1);
    ctx.beginPath();
    ctx.moveTo(-4, -4);
    ctx.lineTo(-6, -10);
    ctx.lineTo(-1, -6);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(4, -4);
    ctx.lineTo(6, -10);
    ctx.lineTo(1, -6);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = _ton(cor, 0.16);
    ctx.beginPath();
    ctx.ellipse(0, 1, 5.5, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();
    var brilhoOlho = 0.7 + _pulso(t, 5) * 0.4;
    ctx.fillStyle = '#ff4d6d';
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 7 * brilhoOlho;
    ctx.beginPath(); ctx.arc(-2, -1, 1.7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(2, -1, 1.7, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#efe9dc';
    ctx.beginPath();
    ctx.moveTo(-2.5, 5); ctx.lineTo(-1.5, 8); ctx.lineTo(0, 5); ctx.closePath();
    ctx.beginPath();
    ctx.moveTo(0, 5); ctx.lineTo(1.5, 8); ctx.lineTo(2.5, 5); ctx.closePath();
    ctx.fill();
    ctx.restore();
    _golpeArco(ctx, est, cor);
    _stunStar(ctx, slime, altura - 24);
}

// ============ ARANHA (web / aranha dark) ============
function _aranha(ctx, slime, est, info) {
    var t = Date.now() / 1000 + est.fase;
    var cor = _corEstado(slime, info.cor);
    var andando = est.movendo;
    var pass = t * (andando ? 11 : 2.2);
    var carregando = !!slime.skillCharging;

    ctx.save();
    var ln = _lunge(est);
    ctx.scale(1 + ln.s * 0.04, 1);
    ctx.translate(ln.x, 0);

    ctx.strokeStyle = '#24152f';
    ctx.lineWidth = 1.6;
    for (var i = 0; i < 4; i++) {
        var sw = Math.sin(pass + i * 0.9) * 2.5;
        ctx.beginPath();
        ctx.moveTo(-4, -4); ctx.lineTo(-10 - i, i * 2 - 2 + sw);
        ctx.moveTo(4, -4); ctx.lineTo(10 + i, i * 2 - 2 + sw);
        ctx.moveTo(-4, 4); ctx.lineTo(-11 - i, i * 1.5 + 7 + sw);
        ctx.moveTo(4, 4); ctx.lineTo(11 + i, i * 1.5 + 7 + sw);
        ctx.stroke();
    }

    ctx.fillStyle = _ton(cor, 0.14);
    ctx.beginPath();
    ctx.ellipse(-6, 0, 7, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    if (carregando) {
        ctx.fillStyle = cor;
        ctx.globalAlpha = 0.5 + _pulso(t, 9) * 0.4;
        ctx.shadowColor = cor;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.ellipse(-6, 0, 5.5, 7.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    }
    ctx.fillStyle = _ton(cor, 0.5);
    ctx.beginPath();
    ctx.arc(6, -3, 4.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = cor;
    ctx.shadowColor = cor;
    ctx.shadowBlur = 5;
    ctx.beginPath(); ctx.arc(7, -4, 1.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(8.5, -3, 1.1, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    if (carregando) {
        ctx.globalAlpha = 0.4 + _pulso(t, 6) * 0.3;
        ctx.strokeStyle = cor;
        ctx.lineWidth = 1.2;
        for (var s = 0; s < 6; s++) {
            var a = t * 1.5 + (s / 6) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(a) * 14, Math.sin(a) * 14);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }
    ctx.restore();
    _golpeArco(ctx, est, cor);
    _stunStar(ctx, slime, -26);
}

// ============ ESCORPIAO (veneno) ============
function _escorpiao(ctx, slime, est, info) {
    var t = Date.now() / 1000 + est.fase;
    var cor = _corEstado(slime, info.cor);
    var andando = est.movendo;
    var pass = t * (andando ? 13 : 2.4);

    ctx.save();
    var ln = _lunge(est);
    ctx.translate(ln.x, 0);

    ctx.strokeStyle = _ton(cor, 0.3);
    ctx.lineWidth = 1.7;
    for (var i = 0; i < 3; i++) {
        var sw = Math.sin(pass + i) * 2;
        ctx.beginPath();
        ctx.moveTo(-7, 0); ctx.lineTo(-13 - i * 2, 9 + sw);
        ctx.moveTo(7, 0); ctx.lineTo(13 + i * 2, 9 + sw);
        ctx.stroke();
    }

    ctx.fillStyle = _ton(cor, 0.22);
    ctx.beginPath();
    ctx.ellipse(-8, -2, 7, 8, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = _ton(cor, 0.5);
    ctx.beginPath();
    ctx.ellipse(7, 0, 9, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    var caudaA = t * 2.2 + (est.atkT > 0 ? est.atkT * 0.25 : 0);
    ctx.strokeStyle = _ton(cor, 0.35);
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(10, -1);
    ctx.quadraticCurveTo(17, -9, 13 + Math.cos(caudaA) * 5, -13 - Math.sin(caudaA) * 3);
    ctx.stroke();
    ctx.fillStyle = cor;
    ctx.shadowColor = cor;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(13 + Math.cos(caudaA) * 5, -13 - Math.sin(caudaA) * 3, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#0c241a';
    ctx.beginPath(); ctx.arc(3, -2, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(6, -2, 1.5, 0, Math.PI * 2); ctx.fill();

    for (var b = 0; b < 3; b++) {
        var f = ((t * 0.85 + b * 0.4) % 1.15) / 1.15;
        ctx.globalAlpha = 0.5 + 0.4 * (1 - f);
        ctx.fillStyle = cor;
        ctx.beginPath();
        ctx.arc(-8 + b * 5, -9 + f * 14, 1.5 - f, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    _golpeArco(ctx, est, cor);
    _stunStar(ctx, slime, -24);
}// ============ GOBLIN ============
function _goblin(ctx, slime, est, info) {
    var t = Date.now() / 1000 + est.fase;
    var cor = _corEstado(slime, info.cor);
    var rapido = !!slime.fugindo;
    var ritmo = rapido ? 3.2 : 1;
    var salto = Math.abs(Math.sin(t * ritmo * 5));
    var inclina = rapido ? 0.35 : Math.sin(t * (est.movendo ? 8 : 2)) * 0.08;

    ctx.save();
    ctx.translate(0, -salto * 2);
    ctx.rotate(inclina);
    var ln = _lunge(est);
    ctx.translate(ln.x * 0.6, 0);

    ctx.strokeStyle = _ton(cor, 0.3);
    ctx.lineWidth = 1.6;
    var pf = Math.sin(t * ritmo * 13);
    ctx.beginPath();
    ctx.moveTo(-4, 2); ctx.lineTo(-8 + pf * 3, 12);
    ctx.moveTo(4, 2); ctx.lineTo(8 - pf * 3, 12);
    ctx.stroke();

    ctx.fillStyle = _ton(cor, 0.85);
    ctx.beginPath();
    ctx.arc(0, -3, 8.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = _ton(cor, 1.5);
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(-10, -9); ctx.lineTo(-2, -4); ctx.lineTo(-3, -11); ctx.closePath();
    ctx.moveTo(10, -9); ctx.lineTo(2, -4); ctx.lineTo(3, -11); ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    var fechado = _piscar(slime);
    ctx.fillStyle = '#10220f';
    if (fechado) { ctx.fillRect(-5, -6, 4, 1.3); ctx.fillRect(1, -6, 4, 1.3); }
    else {
        ctx.beginPath(); ctx.arc(-3, -5, 1.6, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(3, -5, 1.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#45e32f';
    ctx.fillRect(-2, 0, 4, 2);

    if (est.atkT > 0) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.moveTo(8, -1); ctx.lineTo(14, -3);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }
    ctx.restore();
    _golpeArco(ctx, est, cor);
    _stunStar(ctx, slime, -22);
}

// ============ ARQUEIRO VOADOR (caveira arqueira / ranged) ============
function _arqueiroVoador(ctx, slime, est, info) {
    var t = Date.now() / 1000 + est.fase;
    var cor = _corEstado(slime, info.cor);
    var altura = -14 + Math.sin(t * 2) * 3;
    var raioFlutua = Math.sin(t * 2 + 2) * 2;

    ctx.save();
    ctx.translate(0, altura);
    var ln = _lunge(est);
    ctx.translate(ln.x, ln.y * 0.3);
    ctx.rotate(slime.fugindo ? 0.3 : 0);

    ctx.fillStyle = _ton(cor, 0.12);
    ctx.beginPath();
    ctx.ellipse(raioFlutua, -4, 9, 8.5, 0, 0, Math.PI * 2);
    ctx.fill();
    if (slime.skillCharging) {
        ctx.fillStyle = '#9fd3ff';
        ctx.globalAlpha = 0.25 + _pulso(t, 9) * 0.2;
        ctx.shadowColor = '#7ab8ff';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(raioFlutua, -4, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    }
    ctx.fillStyle = _ton(cor, 0.75);
    ctx.strokeStyle = _ton(cor, 0.4);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(raioFlutua, -4, 6, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    var brilhoOlho = 0.6 + _pulso(t, 5) * 0.5;
    ctx.fillStyle = '#ff5722';
    ctx.shadowColor = '#ff3d00';
    ctx.shadowBlur = 7 * brilhoOlho;
    ctx.beginPath(); ctx.arc(raioFlutua - 2, -5.5, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(raioFlutua + 2, -5.5, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    if (slime.skillCharging) {
        ctx.strokeStyle = _ton(cor, 2);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(raioFlutua + 7, -1);
        ctx.lineTo(raioFlutua + 15 + Math.sin(t * 6) * 2, -3 + Math.sin(t * 7) * 2);
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(raioFlutua + 15 + _pulso(t, 9) * 4, -3, 2, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
    _golpeArco(ctx, est, cor);
    _stunStar(ctx, slime, altura - 22);
}

// ============ CAVEIRA MELEE (guerreiro esqueleto) ============
function _caveiraMelee(ctx, slime, est, info) {
    var t = Date.now() / 1000 + est.fase;
    var cor = _corEstado(slime, info.cor);
    var pass = t * (est.movendo ? 11 : 2.2);
    var prepara = !!slime.skillCharging;

    ctx.save();
    if (prepara) {
        ctx.globalAlpha = 0.5 + _pulso(t, 9) * 0.4;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, -2, 14 + Math.sin(t * 5) * 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    }

    ctx.strokeStyle = _ton(cor, 0.4);
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-5, 2); ctx.lineTo(-6 + Math.sin(pass + 1) * 4, 12);
    ctx.moveTo(5, 2); ctx.lineTo(6 - Math.sin(pass + 2) * 4, 12);
    ctx.stroke();

    ctx.fillStyle = _ton(cor, 0.65);
    ctx.beginPath();
    ctx.moveTo(-10, -2);
    ctx.lineTo(10, -2);
    ctx.lineTo(8, 4);
    ctx.lineTo(-8, 4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = _ton(cor, 1.0);
    ctx.strokeStyle = _ton(cor, 0.45);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, -9, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-2.5, -9.5, 1.6, 0, Math.PI * 2);
    ctx.arc(2.5, -9.5, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0a0a12';
    ctx.beginPath(); ctx.arc(-2.5, -9.5, 0.9, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(2.5, -9.5, 0.9, 0, Math.PI * 2); ctx.fill();

    var espadaAng = prepara ? (0.6 + _pulso(t, 7) * 0.3) : (est.atkT > 0 ? 0.5 : -0.25);
    ctx.save();
    ctx.translate(9, -6);
    ctx.rotate(espadaAng);
    ctx.fillStyle = '#e8e8f0';
    ctx.fillRect(6, -1, 10, 2);
    ctx.restore();

    if (prepara) {
        ctx.fillStyle = '#c77dff';
        ctx.globalAlpha = 0.4 + _pulso(t, 6) * 0.3;
        ctx.shadowColor = '#b56cff';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(0, -4, 9 + _pulso(t, 5) * 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    }
    ctx.restore();
    _golpeArco(ctx, est, cor);
    _stunStar(ctx, slime, -26);
}

// ============ MAGO ARCANO (meteor) ============
function _magoArcano(ctx, slime, est, info) {
    var t = Date.now() / 1000 + est.fase;
    var cor = _corEstado(slime, info.cor);
    var altura = -13 + Math.sin(t * 2.2) * 3;
    var carregando = !!slime.skillCharging;

    ctx.save();
    ctx.translate(0, altura);

    if (carregando) {
        var orb = (_pulso(t, 8) * 0.5 + 0.5);
        ctx.fillStyle = _ton(cor, 1.8);
        ctx.globalAlpha = 0.3 + orb * 0.5;
        ctx.shadowColor = cor;
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(Math.sin(t * 3) * 3, -4, 8 + orb * 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    }

    ctx.fillStyle = _ton(cor, 0.3);
    ctx.beginPath();
    ctx.moveTo(-9, 0);
    ctx.quadraticCurveTo(-10, 6, 0, 7);
    ctx.quadraticCurveTo(10, 6, 9, 0);
    ctx.quadraticCurveTo(8, -7, 0, -9);
    ctx.quadraticCurveTo(-8, -7, -9, 0);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = _ton(cor, 0.5);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(6, 2);
    ctx.lineTo(11, 14);
    ctx.stroke();
    ctx.fillStyle = cor;
    ctx.shadowColor = cor;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(11, 15, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    var fechado = _piscar(slime);
    ctx.fillStyle = '#b39ddb';
    if (fechado) { ctx.fillRect(-5, -4, 4, 1.2); ctx.fillRect(1, -4, 4, 1.2); }
    else {
        ctx.beginPath(); ctx.arc(-2.5, -4.5, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(2.5, -4.5, 1.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 0.5 + _pulso(t, 3) * 0.2;
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.arc(0, -1, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
    _golpeArco(ctx, est, cor);
    _stunStar(ctx, slime, altura - 24);
}// ============ ASSASSINO ============
function _assassino(ctx, slime, est, info) {
    var t = Date.now() / 1000 + est.fase;
    var cor = _corEstado(slime, info.cor);
    var correndo = !!slime.dashing;

    if (correndo) {
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = _ton(cor, 0.3);
        ctx.beginPath();
        ctx.moveTo(-16, 4); ctx.lineTo(-8, -2); ctx.lineTo(-6, 4); ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.restore();
    }
    ctx.save();
    ctx.rotate(0.15 + Math.sin(t * 3) * 0.02);
    var ln = _lunge(est);
    ctx.translate(ln.x, 0);

    ctx.fillStyle = _ton(cor, 0.22);
    ctx.beginPath();
    ctx.moveTo(-7, -2);
    ctx.quadraticCurveTo(-9, -12, 0, -15);
    ctx.quadraticCurveTo(9, -12, 7, -2);
    ctx.closePath();
    ctx.fill();

    var capuz = Math.sin(t * 2) * 0.03;
    ctx.fillStyle = _ton(cor, 0.5);
    ctx.beginPath();
    ctx.moveTo(-8, -4);
    ctx.quadraticCurveTo(0, -18 + capuz * 4, 8, -4);
    ctx.closePath();
    ctx.fill();

    var brilhoOlho = 0.6 + _pulso(t, 6) * 0.5;
    ctx.fillStyle = '#ff435d';
    ctx.shadowColor = '#ff0033';
    ctx.shadowBlur = 7 * brilhoOlho;
    ctx.beginPath(); ctx.arc(-2.5, -7, 1.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(2.5, -7, 1.1, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = '#dce3ef';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-6, -2); ctx.lineTo(-10, 6);
    ctx.moveTo(6, -2); ctx.lineTo(10, 6);
    ctx.stroke();

    if (est.atkT > 0) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.moveTo(8, 0); ctx.lineTo(15, -4);
        ctx.moveTo(-8, 0); ctx.lineTo(-15, -4);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }
    ctx.restore();
    _golpeArco(ctx, est, cor);
    _stunStar(ctx, slime, -26);
}

// ============ VOID MASTER ============
function _voidMaster(ctx, slime, est, info) {
    var t = Date.now() / 1000 + est.fase;
    var cor = _corEstado(slime, info.cor);
    var altura = -14 + Math.sin(t * 1.8) * 4;
    var carregando = !!slime.skillCharging;

    if (carregando && slime.skillAim) {
        ctx.save();
        ctx.strokeStyle = cor;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.5 + _pulso(t, 8) * 0.4;
        ctx.shadowColor = cor;
        ctx.shadowBlur = 10;
        ctx.setLineDash([6, 5]);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(slime.skillAim.x - slime.x, slime.skillAim.y - slime.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.restore();
    }
    ctx.save();
    ctx.translate(0, altura);

    ctx.fillStyle = 'rgba(20,16,30,0.85)';
    ctx.beginPath();
    ctx.moveTo(-11, 0);
    ctx.quadraticCurveTo(-9, -11, 0, -13);
    ctx.quadraticCurveTo(9, -11, 11, 0);
    ctx.quadraticCurveTo(8, 7, 0, 7);
    ctx.quadraticCurveTo(-8, 7, -11, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = cor;
    ctx.globalAlpha = 0.55 + _pulso(t, 4) * 0.35;
    ctx.shadowColor = cor;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(Math.sin(t * 3) * 2, -3, 4 + _pulso(t, 5) * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    ctx.strokeStyle = 'rgba(185,150,255,0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-11, -2);
    ctx.quadraticCurveTo(-15, -8, -12, -13);
    ctx.moveTo(11, -2);
    ctx.quadraticCurveTo(15, -8, 12, -13);
    ctx.stroke();
    ctx.restore();
    _golpeArco(ctx, est, cor);
    _stunStar(ctx, slime, altura - 26);
}

// ============ GARGULA ============
function _gargula(ctx, slime, est, info) {
    var t = Date.now() / 1000 + est.fase;
    var cor = _corEstado(slime, info.cor);
    var voa = !!slime.dashing;

    if (voa) {
        ctx.save();
        ctx.rotate(est.face);
        ctx.fillStyle = _ton(cor, 0.3);
        var bat = Math.sin(t * 20) * 0.6;
        ctx.beginPath();
        ctx.ellipse(-12, -6 - bat * 4, 9, 6, -0.4, 0, Math.PI * 2);
        ctx.beginPath();
        ctx.ellipse(12, -6 - bat * 4, 9, 6, 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        _golpeArco(ctx, est, cor);
        return;
    }
    ctx.save();
    ctx.scale(1, 1 + Math.sin(t * 2) * 0.02);
    ctx.fillStyle = _ton(cor, 0.3);
    ctx.beginPath();
    ctx.ellipse(0, 2, 12, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = _ton(cor, 0.55);
    ctx.strokeStyle = _ton(cor, 0.3);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(-7, -3, 5, 0, Math.PI * 2);
    ctx.arc(7, -3, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -7, 7.5, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    var caudaAng = Math.sin(t * 3) * 0.4;
    ctx.save();
    ctx.translate(-11, 2);
    ctx.rotate(caudaAng);
    ctx.strokeStyle = _ton(cor, 0.35);
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(4, 9, 12, 8);
    ctx.stroke();
    ctx.fillStyle = _ton(cor, 0.6);
    ctx.beginPath();
    ctx.moveTo(8, 10); ctx.lineTo(12, 5); ctx.lineTo(16, 11); ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = _ton(cor, 0.75);
    ctx.save();
    ctx.translate(-7, -6);
    ctx.rotate(slime.skillCharging ? _pulso(t, 7) * 0.5 : Math.sin(t * 2) * 0.15);
    ctx.beginPath();
    ctx.ellipse(0, 0, 6.5, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(7, -6);
    ctx.rotate(slime.skillCharging ? -_pulso(t, 7) * 0.5 : -Math.sin(t * 2) * 0.15);
    ctx.beginPath();
    ctx.ellipse(0, 0, 6.5, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.restore();
    _golpeArco(ctx, est, cor);
    _stunStar(ctx, slime, -30);
}

// ============ OGRO ============
function _ogro(ctx, slime, est, info) {
    var t = Date.now() / 1000 + est.fase;
    var cor = _corEstado(slime, info.cor);
    var pass = t * (est.movendo ? 7 : 1.6);

    ctx.save();
    var ln = _lunge(est);
    ctx.rotate(ln.rot * 0.5);
    ctx.translate(ln.x * 0.5, 0);
    ctx.scale(1 + ln.s * 0.3, 1 + ln.s * 0.3);

    ctx.strokeStyle = _ton(cor, 0.3);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-8, 4); ctx.lineTo(-9 + Math.sin(pass + 1) * 4, 15);
    ctx.moveTo(8, 4); ctx.lineTo(11 - Math.sin(pass + 2) * 4, 16);
    ctx.stroke();

    ctx.fillStyle = _ton(cor, 0.6);
    ctx.beginPath();
    ctx.moveTo(-10, -9);
    ctx.quadraticCurveTo(-12, 5, -8, 7);
    ctx.quadraticCurveTo(0, 11, 8, 7);
    ctx.quadraticCurveTo(12, 5, 10, -9);
    ctx.quadraticCurveTo(0, -14, -10, -9);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = _ton(cor, 1.0);
    ctx.beginPath();
    ctx.arc(0, -15, 7.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#c8a26a';
    ctx.beginPath(); ctx.arc(-2.5, -13, 1.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(2.5, -13, 1.4, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = _ton(cor, 0.35);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-9, -2);
    ctx.lineTo(-14, 6);
    ctx.moveTo(9, -2);
    ctx.lineTo(14, 6);
    ctx.stroke();

    var clavaAng = (est.atkT > 0 ? -0.9 + ln.s * 0.5 : 0.2 + Math.sin(t * 2) * 0.05);
    ctx.save();
    ctx.translate(2, -8);
    ctx.rotate(clavaAng);
    ctx.strokeStyle = _ton(cor, 0.4);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(12, 12);
    ctx.stroke();
    ctx.fillStyle = _ton(cor, 0.7);
    ctx.beginPath();
    ctx.ellipse(13, 13, 4, 3, 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.restore();
    _golpeArco(ctx, est, cor);
    _stunStar(ctx, slime, -30);
}

// ============ MAMUTE ============
function _mamute(ctx, slime, est, info) {
    var t = Date.now() / 1000 + est.fase;
    var cor = _corEstado(slime, info.cor);
    var pass = t * (est.movendo ? 6 : 1.4);
    var carga = !!slime.dashing;
    var ln = _lunge(est);

    ctx.save();
    ctx.translate(ln.x, 0);
    var inclinacao = carga ? 0.3 : (est.movendo ? 0.05 : 0);
    ctx.rotate(inclinacao);

    ctx.strokeStyle = _ton(cor, 0.35);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-9, 2); ctx.lineTo(-10 + Math.sin(pass) * 3, 16);
    ctx.moveTo(9, 2); ctx.lineTo(12 - Math.sin(pass) * 3, 17);
    ctx.stroke();

    ctx.fillStyle = _ton(cor, 0.55);
    ctx.beginPath();
    ctx.moveTo(-15, -4);
    ctx.quadraticCurveTo(-16, -14, 0, -15);
    ctx.quadraticCurveTo(16, -14, 15, -4);
    ctx.quadraticCurveTo(16, 6, 0, 7);
    ctx.quadraticCurveTo(-16, 6, -15, -4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = _ton(cor, 1.2);
    ctx.beginPath();
    ctx.arc(0, -22, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = _ton(cor, 0.8);
    ctx.beginPath();
    ctx.arc(0, -25, 8.5, Math.PI, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#e8e4d0';
    ctx.beginPath();
    ctx.moveTo(-6, -14); ctx.lineTo(-13, -20); ctx.lineTo(-8, -21); ctx.lineTo(-4, -15); ctx.closePath();
    ctx.moveTo(6, -14); ctx.lineTo(13, -20); ctx.lineTo(8, -21); ctx.lineTo(4, -15); ctx.closePath();
    ctx.fill();

    var tronco = Math.sin(t * 2.4) * 4;
    ctx.strokeStyle = _ton(cor, 0.7);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.quadraticCurveTo(4, -6, 8 + tronco, 2);
    ctx.stroke();

    ctx.fillStyle = '#c0392b';
    ctx.globalAlpha = 0.6 + _pulso(t, 5) * 0.4;
    ctx.beginPath(); ctx.arc(-4, -24, 1.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(4, -24, 1.3, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
    _golpeArco(ctx, est, cor);
    _stunStar(ctx, slime, -34);
}

// ============ TANQUE / PADRÃO ============
function _tanque(ctx, slime, est, info) {
    var t = Date.now() / 1000 + est.fase;
    var cor = _corEstado(slime, info.cor);
    var ln = _lunge(est);

    ctx.save();
    ctx.translate(ln.x, 0);
    ctx.rotate(ln.rot);
    var b = 1 + Math.sin(t * 3) * 0.03;
    ctx.scale(b, b);

    ctx.fillStyle = _ton(cor, 0.4);
    ctx.beginPath();
    ctx.moveTo(-14, 0);
    ctx.quadraticCurveTo(-14, -15, 0, -15);
    ctx.quadraticCurveTo(14, -15, 14, 0);
    ctx.quadraticCurveTo(14, 10, 0, 10);
    ctx.quadraticCurveTo(-14, 10, -14, 0);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = _ton(cor, 1.4);
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.rect(-9, -11, 18, 9);
    ctx.stroke();
    ctx.fillStyle = _ton(cor, 1.4);
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.arc(0, -6.5, 3.2 + _pulso(t, 4) * 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
    _golpeArco(ctx, est, cor);
    _stunStar(ctx, slime, -26);
}// ============ DISPATCHER PRINCIPAL ============
// Barra de vida acima do monstro (renderização do client, via classes/comum.js)
function _barraHp(slime, dx, dy) {
    if (typeof window.desenharBarraHp === "function") {
        window.desenharBarraHp(slime.x + dx, slime.y + dy, slime.hp, slime.maxHp, slime.stunTimer, slime.slowTimer);
    }
}

window.desenharSlime = function(slime) {
    if (slime.hp <= 0 || !window.ctx) return;
    var ctx = window.ctx;

    var tp = (slime.tipo || '').toLowerCase();
    var arq = (slime.arquetipo || '').toLowerCase();

    if (tp.indexOf('zumbi') !== -1) {
        ctx.save();
        ctx.translate(slime.x, slime.y);
        desenharZumbi(ctx, slime);
        ctx.restore();
        _barraHp(slime, -15, -24);
        return;
    }

    if (slime.invisivel) return;

    var info = _info(slime);
    var est = _estado(slime);
    _atualizarEstado(slime, est);

    ctx.save();
    ctx.translate(slime.x, slime.y);
    _sombra(ctx, info.raio / 14);
    _desenharAura(ctx, slime, est, info.cor, info.raio);
    ctx.restore();

    ctx.save();
    ctx.translate(slime.x, slime.y);
    var foi = true;
    if (arq === 'poison_melee' || tp.indexOf('esc') !== -1) _escorpiao(ctx, slime, est, info);
    else if (arq === 'web' || tp.indexOf('aranha') !== -1) _aranha(ctx, slime, est, info);
    else if (tp.indexOf('besouro') !== -1) _besouro(ctx, slime, est, info);
    else if (tp.indexOf('morcego') !== -1) _morcego(ctx, slime, est, info);
    else if (arq === 'goblin' || tp.indexOf('goblin') !== -1) _goblin(ctx, slime, est, info);
    else if (arq === 'ranged' || tp.indexOf('arqueira') !== -1) _arqueiroVoador(ctx, slime, est, info);
    else if (arq === 'melee' || tp.indexOf('melee') !== -1) _caveiraMelee(ctx, slime, est, info);
    else if (arq === 'meteor' || tp.indexOf('arcano') !== -1) _magoArcano(ctx, slime, est, info);
    else if (arq === 'assassin' || tp.indexOf('assas') !== -1) _assassino(ctx, slime, est, info);
    else if (arq === 'void_laser' || tp.indexOf('void') !== -1) _voidMaster(ctx, slime, est, info);
    else if (arq === 'gargoyle' || tp.indexOf('garg') !== -1) _gargula(ctx, slime, est, info);
    else if (tp.indexOf('ogro') !== -1) _ogro(ctx, slime, est, info);
    else if (tp.indexOf('mamute') !== -1) _mamute(ctx, slime, est, info);
    else { _tanque(ctx, slime, est, info); foi = false; }
    ctx.restore();

    var offs = (arq === 'web' || tp.indexOf('aranha') !== -1) ? [-28, -38] : (foi ? [-18, -30] : [-15, -20]);
    _barraHp(slime, offs[0], offs[1]);
};

// ============ ZUMBI (mantido do visual antigo) ============
function desenharZumbi(ctx, slime) {
    let t = Date.now() / 1000;
    let carregando = !!slime.skillCharging;
    let intensidade = carregando ? 3 : 1; // fedido 3x enquanto carrega a skill

    // ============ EFEITO DE FEDIDO ============
    // 1) Aura de gás verde tóxico pulsante (mais forte/carregando)
    let pulsar = (0.6 + Math.sin(t * 3) * 0.15) * (carregando ? 1.6 : 1);
    for (let i = 0; i < 3 * intensidade; i++) {
        let ang = t * 0.8 + i * (Math.PI * 2 / (3 * intensidade));
        let gx = Math.cos(ang) * (16 + Math.sin(t * 1.5 + i) * 3);
        let gy = -4 + Math.sin(ang * 1.3) * 6;
        let raio = (8 + Math.sin(t * 2 + i * 2) * 3) * (carregando ? 1.4 : 1);
        ctx.save();
        ctx.globalAlpha = Math.min(0.5, (0.22 * pulsar) * (carregando ? 1.5 : 1));
        ctx.fillStyle = "#7fff57";
        ctx.shadowColor = "#3fbf2f";
        ctx.shadowBlur = 10 * pulsar;
        ctx.beginPath();
        ctx.arc(gx, gy, raio, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // 2) Bolhas de gás subindo do corpo (cheiro tóxico) - triplica ao carregar
    ctx.save();
    for (let i = 0; i < 5 * intensidade; i++) {
        let bx = Math.sin(t * (1 + intensidade * 0.4) + i * 2.1) * (14 + intensidade * 4);
        let by = -22 - ((t * (14 * intensidade) + i * (9 / intensidade + 4)) % 30);
        ctx.globalAlpha = Math.min(0.9, (0.5 + Math.sin(t * 6 + i) * 0.2) * intensidade * 0.6);
        ctx.fillStyle = (i % 2) ? "#aaff88" : "#66ff44";
        ctx.beginPath();
        ctx.arc(bx, by, (carregando ? 2.6 : 1.8), 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();

    // 3) Linha de odor retorcida acima da cabeça (fica mais forte ao carregar)
    ctx.save();
    ctx.globalAlpha = carregando ? 0.9 : 0.55;
    ctx.strokeStyle = "#8aff5e";
    ctx.lineWidth = carregando ? 2.5 : 1.5;
    ctx.shadowColor = "#7fff57";
    ctx.shadowBlur = carregando ? 8 : 0;
    ctx.beginPath();
    for (let i = 0; i <= 8; i++) {
        let lx = (i - 4) * 3;
        let ly = -34 + Math.sin(t * (carregando ? 9 : 5) + i * 0.9) * 3;
        if (i === 0) ctx.moveTo(lx, ly); else ctx.lineTo(lx, ly);
    }
    ctx.stroke();
    ctx.restore();

    // Marcador de mira da habilidade no chão (onde a cuspida vai atingir)
    if (carregando && slime.skillAim) {
        let ax = slime.skillAim.x - slime.x;
        let ay = slime.skillAim.y - slime.y;
        let pulsarMira = 0.6 + Math.sin(t * 6) * 0.4;
        ctx.save();
        ctx.globalAlpha = 0.35 * pulsarMira + 0.2;
        ctx.fillStyle = "#66ff44";
        ctx.shadowColor = "#33cc22";
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.ellipse(ax, ay, 20 + pulsarMira * 6, 20 + pulsarMira * 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // ============ BARRA DE CARREGAMENTO (skill) ============
    if (carregando && slime.skillChargeMax) {
        let prog = 1 - (slime.skillChargeTimer / slime.skillChargeMax);
        if (prog > 1) prog = 1;
        let bx = -14, by = -40, larg = 28, alt = 4;
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(bx - 1, by - 1, larg + 2, alt + 2);
        ctx.fillStyle = "#2e7d32";
        ctx.fillRect(bx, by, larg * prog, alt);
        ctx.fillStyle = "#b9ff5e";
        ctx.fillRect(bx, by, larg * prog, alt * 0.5);
        ctx.strokeStyle = "#d4ffb0";
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, larg, alt);
        ctx.restore();
    }

    // ============ CORPO ============
    // Sombra no chão
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.ellipse(0, 15, 15, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Animação das pernas: passadas ao andar, perninhas paradas ao carregar
    let ritmoAndar = carregando ? 0.35 : 1; // quase imóvel enquanto carrega
    let fase = Math.sin(t * 9 * ritmoAndar + 0.5);
    let pernaEsq = Math.sin(t * 9 * ritmoAndar) * 0.45 * (carregando ? 0.15 : 1);
    let pernaDir = Math.sin(t * 9 * ritmoAndar + Math.PI) * 0.45 * (carregando ? 0.15 : 1);

    // Pernas tortas (zumbi manco) com passada
    ctx.fillStyle = "#6b7c3a";
    ctx.save();
    ctx.translate(-6 - pernaEsq * 4, 4);
    ctx.rotate(pernaEsq);
    ctx.fillRect(-3, 0, 6, 13);
    ctx.fillStyle = "#4a3a20"; // sapato velho
    ctx.fillRect(-4, 10, 8, 4);
    ctx.restore();
    ctx.save();
    ctx.translate(6 - pernaDir * 4, 5);
    ctx.rotate(pernaDir + 0.08);
    ctx.fillRect(-3, 0, 6, 13);
    ctx.fillStyle = "#4a3a20";
    ctx.fillRect(-4, 10, 8, 4);
    ctx.restore();

    // Tronco (camisa rasgada verde musgo) levemente balançando ao andar
    let inclinacao = carregando ? 0 : fase * 0.04;
    ctx.fillStyle = slime.stunTimer > 0 ? "#b8a848" : (slime.slowTimer > 0 ? "#2ab8a8" : "#7d9b4a");
    ctx.beginPath();
    ctx.moveTo(-9, -12 + inclinacao * 6);
    ctx.lineTo(9, -12 - inclinacao * 6);
    ctx.lineTo(11, 9 + inclinacao * 4);
    ctx.lineTo(-11, 9 - inclinacao * 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#4c5e2c";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Rasgo da camisa mostrando a carne
    ctx.fillStyle = "#5d6f3a";
    ctx.beginPath();
    ctx.moveTo(-2, -12); ctx.lineTo(3, -6); ctx.lineTo(-1, 2); ctx.lineTo(-6, -4);
    ctx.closePath();
    ctx.fill();

    // Feridas/sangue
    ctx.fillStyle = "#8c1a1a";
    ctx.beginPath();
    ctx.arc(5, 4, 2.4, 0, Math.PI * 2);
    ctx.arc(-4, 1, 2, 0, Math.PI * 2);
    ctx.fill();

    // Braços esticados para frente (abanando ao andar)
    let balancaoBraco = carregando ? 1 : fase;
    ctx.fillStyle = "#86a04a";
    ctx.save();
    ctx.rotate(-0.4 + balancaoBraco * 0.08);
    ctx.fillRect(-4, -13, 17, 5);
    ctx.restore();
    ctx.fillStyle = "#7c9444";
    ctx.save();
    ctx.rotate(0.4 - balancaoBraco * 0.08);
    ctx.fillRect(-13, -13, 17, 5);
    ctx.restore();

    // Mãos sangrentas
    ctx.fillStyle = "#94ad58";
    ctx.beginPath(); ctx.arc(-13, -15, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(12.5, -15, 2.6, 0, Math.PI * 2); ctx.fill();

    // Cabeça (verde podre, balançando)
    let cabecaY = -18 + Math.sin(t * 1.6) * 0.5;
    ctx.save();
    ctx.translate(0, cabecaY);
    ctx.rotate(aberto(t) * 0.12);

    ctx.fillStyle = "#93ad52";
    ctx.beginPath();
    ctx.arc(0, 0, 8.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#5a6e35";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Costura de frankenstein no topo do crânio
    ctx.strokeStyle = "#3a2d18";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-3, 4); ctx.lineTo(-1, 6);
    ctx.moveTo(0, 3); ctx.lineTo(2, 5);
    ctx.moveTo(3, 2); ctx.lineTo(5, 4);
    ctx.stroke();

    // Olhos vermelhos brilhantes (pulsam) - intensificam ao carregar
    let brilho = (0.6 + Math.sin(t * 4) * 0.35) * (carregando ? 1.6 : 1);
    ctx.fillStyle = "#ff3b3b";
    ctx.shadowColor = "#ff0000";
    ctx.shadowBlur = 7 * brilho;
    ctx.beginPath();
    ctx.arc(-3, -3, carregando ? 2.4 : 1.9, 0, Math.PI * 2);
    ctx.arc(3, -3, carregando ? 2.4 : 1.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Boca aberta caída
    ctx.fillStyle = "#2d2116";
    ctx.beginPath();
    ctx.ellipse(0, 3, 3.4, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Dente quebrado
    ctx.fillStyle = "#e8e4d0";
    ctx.fillRect(-2, 1.5, 1.6, 2.4);

    ctx.restore();

    // Estrelinha de atordoamento
    if (slime.stunTimer > 0) {
        let tempoStun = Date.now() / 150;
        ctx.fillStyle = "#f1c40f";
        ctx.font = "12px Arial";
        ctx.fillText("💫", Math.cos(tempoStun) * 12 - 6, -38);
    }
}

function aberto(t) {
    return Math.sin(t * 1.2);
}