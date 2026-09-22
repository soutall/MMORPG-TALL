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
    var r;
    if (arq === 'web' || tp === 'aranha_dark') r = { cor: '#6ee7ff', raio: 21 };
    else if (arq === 'ranged' || tp === 'caveira_arqueira') r = { cor: '#ffd29e', raio: 19 };
    else if (arq === 'melee' || tp === 'caveira_melee') r = { cor: '#ded3bd', raio: 21 };
    else if (arq === 'poison_melee' || tp === 'escorpiao') r = { cor: '#9dff6b', raio: 20 };
    else if (arq === 'goblin' || tp === 'goblin') r = { cor: '#8dff5e', raio: 18 };
    else if (arq === 'assassin' || tp === 'assassino') r = { cor: '#ff5e7a', raio: 19 };
    else if (arq === 'gargoyle' || tp === 'gargula') r = { cor: '#ffe08a', raio: 21 };
    else if (arq === 'meteor' || tp === 'mago_arcano') r = { cor: '#7fd8ff', raio: 21 };
    else if (arq === 'void_laser' || tp === 'void_master') r = { cor: '#b56cff', raio: 22 };
    else if (tp === 'ogro') r = { cor: '#c1e36a', raio: 24 };
    else if (tp === 'mamute') r = { cor: '#ffd98a', raio: 26 };
    else if (tp === 'besouro_negro') r = { cor: '#b56cff', raio: 22 };
    else if (tp === 'morcego') r = { cor: '#ff4d6d', raio: 19 };
    else if (tp === 'ranged') r = { cor: '#c77dff', raio: 17 };
    else r = { cor: '#58ff9c', raio: 17 };
    // cor configurável (EDIT MOOB) domina a aura/brilho/morte do monstro
    if (slime.cor && /^#[0-9a-fA-F]{6}$/.test(slime.cor)) r.cor = slime.cor;
    return r;
}

function _sombra(ctx, escala) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 14 * escala, 14 * escala, 4.5 * escala, 0, 0, Math.PI * 2);
    ctx.fill();
}

function _desenharAura(ctx, slime, est, cor, raio) {
    // FIX tela trava: cada monstro desenhava 4 sombras (shadowBlur) por frame. Com 60+
    // monstros na tela (ex.: skill da Bateria no meio da horda), isso congelava o canvas
    // em mobile. Agora o brilho usa só alpha (bem mais barato) e, em hordas grandes,
    // a aura é pulada para manter o FPS (frentes de batalha densas ficam mais limpas).
    var cont = window._monstrosDesenhados || 0;
    if (cont > 55) return;
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
    ctx.beginPath();
    ctx.ellipse(0, 2, raio + 4, raio * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    for (var i = 0; i < 3; i++) {
        var a = t * 0.9 + i * 2.09 + (slime.x || 0) * 0.02;
        var mx = Math.cos(a) * (raio + 7);
        var my = Math.sin(a) * (raio * 0.35 + 3) + Math.cos(a * 2.0) * 3 - 3;
        ctx.globalAlpha = 0.35 + _pulso(t * 1.4 + i, 2.6) * 0.3;
        ctx.fillStyle = cor;
        ctx.beginPath();
        ctx.arc(mx, my, 1.5 + _pulso(t + i, 3) * 0.8, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function _golpeFases(est, dur) {
    dur = dur || 24;
    var r = { atk: est.atkT > 0, p: 0, w: 0, t: 0 };
    if (!r.atk) return r;
    var p = 1 - est.atkT / dur;
    if (p > 1) p = 1;
    r.p = p;
    if (p < 0.35) r.w = Math.sin((p / 0.35) * Math.PI);
    else r.t = Math.sin(((p - 0.35) / 0.65) * Math.PI);
    return r;
}

function _lunge(est) {
    var g = _golpeFases(est);
    if (!g.atk) return { x: 0, y: 0, rot: 0, s: 1, w: 0, t: 0, p: 0 };
    return {
        x: (g.t - g.w * 0.5) * 7,
        y: -g.w * 1.4 + g.t * 0.4,
        rot: (g.t - g.w * 0.6) * 0.16,
        s: 1 + (g.t - g.w * 0.3) * 0.1,
        w: g.w, t: g.t, p: g.p
    };
}

function _golpeArco(ctx, est, cor) {
    if (est.flash <= 0) return;
    var p = 1 - est.flash / 10;
    ctx.save();
    ctx.rotate(est.face);
    ctx.globalAlpha = (1 - p) * 0.85;
    ctx.strokeStyle = cor;
    ctx.lineWidth = 3;
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
// ============ SLIME (corpo de gel compartilhado) ============
function _corpoSlime(ctx, cor, t) {
    // poça de gosma rasteira (tintada)
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = _ton(cor, 0.7);
    ctx.beginPath();
    ctx.ellipse(0, 10, 15.5 + Math.sin(t * 2) * 0.8, 4.6 + Math.sin(t * 2.3) * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // gotas penduradas na base, escorrendo e caindo
    for (var i = 0; i < 3; i++) {
        var dc = (t * 0.32 + i * 0.37) % 1;
        var ddx = -8 + i * 8 + Math.sin(t * 1.4 + i * 2.1) * 1.3;
        var ddy = 8 + dc * 5;
        ctx.globalAlpha = 0.6 * (1 - dc * 0.8);
        ctx.fillStyle = _ton(cor, 0.9);
        ctx.beginPath();
        ctx.ellipse(ddx, ddy, 2 - dc * 0.8, 1.4 - dc * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;

    // corpo gelatinoso ondulante (dômica, borda viva)
    ctx.fillStyle = _ton(cor, 0.75);
    ctx.strokeStyle = _ton(cor, 0.4);
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    for (var j = 0; j <= 18; j++) {
        var a = j / 18 * Math.PI * 2;
        var ampY = (a > Math.PI * 0.66 && a < Math.PI * 1.34) ? 0.55 : 1;
        var rr = 14 + Math.sin(t * 2.3 + a * 2) * 1.4;
        var px = Math.cos(a) * rr * 0.97;
        var py = Math.sin(a) * 11.5 * ampY - 3 + Math.sin(t * 2 + a * 0.7) * 0.6;
        if (j === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // base esparramada no chão
    ctx.fillStyle = _ton(cor, 0.55);
    ctx.beginPath();
    ctx.ellipse(0, 7, 10.5 + Math.sin(t * 2.1) * 0.5, 3.2 + Math.sin(t * 2.4) * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // barriga clara interna (translucidez do gel)
    ctx.fillStyle = _ton(cor, 1.5);
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.ellipse(0, -1, 8.5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // bolhas internas subindo
    ctx.fillStyle = _ton(cor, 1.15);
    ctx.globalAlpha = 0.45;
    ctx.beginPath(); ctx.arc(-5, -8, 1.5 + Math.sin(t * 3.1) * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(5, -9.5, 2.1 + Math.cos(t * 2.7) * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    // brilho gloss no topo
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.ellipse(-6, -10.5, 4.4, 2.1, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
}

// ============ PES DO SLIME (passeio) ============
function _pesSlime(ctx, t, est, cor) {
    var andando = !!est.movendo;
    var w = t * (andando ? 10 : 0.7);
    var s1 = Math.sin(w), s2 = Math.sin(w + Math.PI);
    var amp = andando ? 5 : 1.6;
    ctx.fillStyle = _ton(cor, 0.42);
    ctx.strokeStyle = _ton(cor, 0.55);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.ellipse(-7 + s1 * amp, 11.5 - (andando ? Math.max(0, s1) * 1.6 : 0), 3.5, 1.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(7 + s2 * amp, 11.5 - (andando ? Math.max(0, s2) * 1.6 : 0), 3.5, 1.6, 0, 0, Math.PI * 2);
    ctx.fill();
}

// ============ SLIME (verde/aquático clássico) ============
function _slimeGel(ctx, slime, est, info) {
    var t = Date.now() / 1000 + est.fase;
    var cor = _corEstado(slime, slime.cor || info.cor);
    var resp = Math.sin(t * 2.4) * 0.05;
    var atk = _golpeFases(est);
    var sy = 1 + resp - (est.movendo ? 0.07 : 0) + atk.w * 0.26 - atk.t * 0.22;
    var sx = 1 - resp + (est.movendo ? 0.07 : 0) - atk.w * 0.24 + atk.t * 0.28;
    var ln = _lunge(est);
    var abrindo = atk.t > 0 ? Math.min(1, atk.t * 1.4) : (atk.w > 0 ? 0.35 : 0);
    var irado = est.atkT > 0;

    // brilho ao carregar skill
    if (slime.skillCharging) {
        ctx.save();
        ctx.globalAlpha = 0.22 + _pulso(t, 9) * 0.18;
        ctx.fillStyle = cor;
        ctx.beginPath();
        ctx.ellipse(0, -3, 17 + _pulso(t, 5) * 3, 13, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    ctx.save();
    ctx.rotate(ln.rot + (est.movendo ? Math.sin(t * 8) * 0.04 : 0));
    ctx.scale(sx * ln.s, sy * ln.s);
    ctx.translate(ln.x, 0);

    _corpoSlime(ctx, cor, t);
    _pesSlime(ctx, t, est, cor);

    // rosto
    var fechado = _piscar(slime);
    ctx.fillStyle = irado ? '#c62828' : '#122c18';
    if (fechado && !irado) {
        ctx.strokeStyle = '#122c18';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(-6, -6); ctx.lineTo(-2, -6);
        ctx.moveTo(2, -6); ctx.lineTo(6, -6);
        ctx.stroke();
    } else {
        ctx.beginPath(); ctx.ellipse(-4, -6, irado ? 2.3 : 2, irado ? 2.7 : 2.2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(4, -6, irado ? 2.3 : 2, irado ? 2.7 : 2.2, 0, 0, Math.PI * 2); ctx.fill();
        if (!irado) {
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(-3.2, -6.8, 0.7, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(4.8, -6.8, 0.7, 0, Math.PI * 2); ctx.fill();
        } else {
            // sobrancelhas iradas
            ctx.strokeStyle = 'rgba(15,10,10,0.85)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(-6.2, -9.4); ctx.lineTo(-1.8, -7.6);
            ctx.moveTo(6.2, -9.4); ctx.lineTo(1.8, -7.6);
            ctx.stroke();
        }
    }

    // boca
    if (abrindo > 0) {
        ctx.fillStyle = 'rgba(12,8,6,0.92)';
        ctx.beginPath();
        ctx.ellipse(0, 1 + abrindo * 1.6, 3 + abrindo * 2.6, 1.6 + abrindo * 3, 0, 0, Math.PI * 2);
        ctx.fill();
    } else {
        ctx.strokeStyle = 'rgba(12,25,16,0.85)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(0, 0.4, 2.4, 0.35, Math.PI - 0.35);
        ctx.stroke();
    }

    // dentes na mordida
    if (abrindo > 0.25) {
        ctx.fillStyle = '#fff6ea';
        for (var ti = -1; ti <= 1; ti++) {
            ctx.beginPath();
            ctx.moveTo(ti * 2.2 - 0.6, 2.2 + abrindo);
            ctx.lineTo(ti * 2.2, 5.0 + abrindo * 0.4);
            ctx.lineTo(ti * 2.2 + 0.6, 2.2 + abrindo);
            ctx.closePath();
            ctx.fill();
        }
    }

    ctx.restore();
    _golpeArco(ctx, est, cor);
    _stunStar(ctx, slime, -24);
}

// ============ SLIME ARQUEIRO (com arco e capuz) ============
function _slimeArqueiro(ctx, slime, est, info) {
    var t = Date.now() / 1000 + est.fase;
    var cor = _corEstado(slime, slime.cor || info.cor);
    var resp = Math.sin(t * 2.4) * 0.05;
    var sy = 1 + resp - (est.movendo ? 0.07 : 0);
    var sx = 1 - resp + (est.movendo ? 0.07 : 0);
    var ln = _lunge(est);
    var carrega = !!slime.skillCharging;
    var soltou = est.atkT > 0;

    if (carrega) {
        ctx.save();
        ctx.globalAlpha = 0.2 + _pulso(t, 9) * 0.16;
        ctx.fillStyle = cor;
        ctx.beginPath();
        ctx.ellipse(0, -3, 17 + _pulso(t, 5) * 3, 13, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    ctx.save();
    ctx.rotate(ln.rot + (est.movendo ? Math.sin(t * 8) * 0.04 : 0));
    ctx.scale(sx * ln.s, sy * ln.s);
    ctx.translate(ln.x, 0);

    _corpoSlime(ctx, cor, t);
    _pesSlime(ctx, t, est, cor);

    // olhos focados (mirando)
    var fechado = _piscar(slime);
    ctx.fillStyle = '#142b18';
    if (fechado) {
        ctx.strokeStyle = '#142b18';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(-6, -6); ctx.lineTo(-2, -6);
        ctx.moveTo(2, -6); ctx.lineTo(6, -6);
        ctx.stroke();
    } else {
        ctx.beginPath(); ctx.ellipse(-4, -6, 1.8, 2.2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(4, -6, 1.8, 2.2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(-3.4, -6.8, 0.6, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(4.6, -6.8, 0.6, 0, Math.PI * 2); ctx.fill();
    }

    // boca determinada (fechada, concentrada)
    ctx.strokeStyle = 'rgba(12,25,16,0.85)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-2.2, 1.2); ctx.lineTo(2.2, 1.2);
    ctx.stroke();

    // capuz de couro com pena
    ctx.fillStyle = '#7a4f27';
    ctx.beginPath();
    ctx.arc(0.2, -12, 4.6, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#96612f';
    ctx.beginPath();
    ctx.ellipse(0, -12, 5.4, 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e8a14a';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(3.2, -15.6); ctx.quadraticCurveTo(7, -17, 8.6, -15);
    ctx.stroke();
    ctx.fillStyle = '#e8a14a';
    ctx.beginPath();
    ctx.ellipse(6.6, -15.8, 2.6, 0.9, 0.5, 0, Math.PI * 2);
    ctx.fill();

    // mãozinha de gel segurando o arco
    ctx.fillStyle = _ton(cor, 0.85);
    ctx.beginPath();
    ctx.arc(6, -3.5, 2.4, 0, Math.PI * 2);
    ctx.fill();

    // arco de madeira (flexiona ao puxar a corda)
    var flex = carrega ? 0.9 : 0.28;
    ctx.strokeStyle = '#6b4423';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(6, -3.5);
    ctx.quadraticCurveTo(12.5 + flex * 3, -7.5, 11.5, -11);
    ctx.moveTo(6, -3.5);
    ctx.quadraticCurveTo(14.5 - flex * 1.2, 1.5, 11.5, 5);
    ctx.stroke();

    // corda
    ctx.strokeStyle = 'rgba(245,245,255,0.75)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (carrega) { ctx.moveTo(11.5, -11); ctx.lineTo(5, -3.5); ctx.lineTo(11.5, 5); }
    else { ctx.moveTo(11.5, -11); ctx.lineTo(11.5, 5); }
    ctx.stroke();

    // flecha
    if (!soltou) {
        var eixo = carrega ? 6.5 : 11.5;
        ctx.strokeStyle = '#c9a355';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(4.5, -3.5); ctx.lineTo(eixo + 2, -3.5);
        ctx.stroke();
        ctx.fillStyle = '#dfe6ee';
        ctx.beginPath();
        ctx.moveTo(eixo + 2, -3.5); ctx.lineTo(eixo + 5, -2.3); ctx.lineTo(eixo + 5, -4.7);
        ctx.closePath();
        ctx.fill();
    } else {
        // rastro do disparo
        ctx.globalAlpha = 0.7;
        ctx.strokeStyle = cor;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(12, -3.5); ctx.lineTo(17 + _pulso(t, 20) * 3, -3.5 + Math.sin(t * 25) * 1.5);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }

    ctx.restore();
    _stunStar(ctx, slime, -24);
}

// ============ OGRO (bruto, barrigudo, com clava) ============
function _ogro(ctx, slime, est, info) {
    var t = Date.now() / 1000 + est.fase;
    var cor = _corEstado(slime, slime.cor || info.cor);
    var andando = !!est.movendo;
    var passo = t * (andando ? 9 : 1.4);
    var gf = _golpeFases(est);
    var ln = _lunge(est);
    var carrega = !!slime.skillCharging;
    var bob = andando ? -Math.abs(Math.cos(passo)) * 1.3 : 0;
    var sL = Math.sin(passo), sR = Math.sin(passo + Math.PI);

    ctx.save();
    ctx.translate(ln.x * 0.6, bob + (gf.atk ? gf.w * 0.8 - gf.t * 0.4 : 0));
    ctx.rotate(ln.rot * 0.45 + Math.sin(t * 1.9) * 0.02 + gf.t * 0.05);
    ctx.scale(1 + ln.s * 0.28, 1 + ln.s * 0.28);

    // pernas grossas com joelho + passada alternada
    ctx.strokeStyle = _ton(cor, 0.32);
    ctx.lineWidth = 4.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-7, 1);
    ctx.quadraticCurveTo(-10, 6, -8 + sL * 2, 9);
    ctx.quadraticCurveTo(-6 + sL * 4, 12, -8 + sL * 5, 16);
    ctx.moveTo(7, 1);
    ctx.quadraticCurveTo(10, 6, 8 + sR * 2, 9);
    ctx.quadraticCurveTo(6 + sR * 4, 12, 8 + sR * 5, 17);
    ctx.stroke();
    ctx.fillStyle = _ton(cor, 0.45);
    ctx.beginPath(); ctx.ellipse(-8 + sL * 5, 16.5, 4.4, 2.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(8 + sR * 5, 17.5, 4.8, 2.4, 0, 0, Math.PI * 2); ctx.fill();

    // tapirilha (tanga de pele)
    ctx.fillStyle = _ton(cor, 0.25);
    ctx.beginPath();
    ctx.moveTo(-5.5, -0.5); ctx.quadraticCurveTo(0, 5, 5.5, -0.5); ctx.quadraticCurveTo(0, 2.5, -5.5, -0.5);
    ctx.closePath();
    ctx.fill();

    // barriga ENORME
    ctx.fillStyle = _ton(cor, 0.5);
    ctx.strokeStyle = _ton(cor, 0.3);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-12, -8);
    ctx.quadraticCurveTo(-14, 3, -9, 6);
    ctx.quadraticCurveTo(0, 12, 9, 6);
    ctx.quadraticCurveTo(14, 3, 12, -8);
    ctx.quadraticCurveTo(0, -14, -12, -8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // peitoral + ombros largos
    ctx.fillStyle = _ton(cor, 0.72);
    ctx.beginPath();
    ctx.moveTo(-13, -13);
    ctx.quadraticCurveTo(-13, -6, -9, -3);
    ctx.quadraticCurveTo(0, 1, 9, -3);
    ctx.quadraticCurveTo(13, -6, 13, -13);
    ctx.quadraticCurveTo(0, -17, -13, -13);
    ctx.closePath();
    ctx.fill();

    // braço esquerdo balançando
    ctx.strokeStyle = _ton(cor, 0.42);
    ctx.lineWidth = 3.6;
    ctx.beginPath();
    ctx.moveTo(-11, -9); ctx.quadraticCurveTo(-16, -2, -14 + Math.sin(passo * 0.7), 6);
    ctx.stroke();
    ctx.fillStyle = _ton(cor, 0.5);
    ctx.beginPath();
    ctx.arc(-14 + Math.sin(passo * 0.7), 6.5, 2.6, 0, Math.PI * 2);
    ctx.fill();

    // clava erguida (braço direito) — levanta no vento, esmaga no golpe
    var clavaAng;
    if (carrega) clavaAng = -1.15 + _pulso(t, 6) * 0.15;
    else if (gf.atk) clavaAng = -2.2 * (1 - gf.p) + 0.45 * gf.p;
    else clavaAng = 0.25 + Math.sin(t * 1.5) * 0.06;
    ctx.save();
    ctx.translate(10, -10);
    ctx.rotate(clavaAng);
    ctx.strokeStyle = _ton(cor, 0.42);
    ctx.lineWidth = 3.6;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(6, 12);
    ctx.stroke();
    ctx.strokeStyle = '#6b4a2a';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(6, 10); ctx.lineTo(8, 22);
    ctx.stroke();
    ctx.fillStyle = '#8a5a28';
    ctx.strokeStyle = '#5d3c1a';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(9, 24, 5.2, 4.4, 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (carrega) {
        ctx.fillStyle = 'rgba(255,220,120,0.8)';
        ctx.beginPath();
        ctx.arc(9, 24, 2.6 + Math.sin(t * 9) * 1, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();

    // onda de impacto no chão quando a clava esmaga
    if (gf.atk && gf.t > 0.55) {
        var ph = (gf.t - 0.55) / 0.45;
        ctx.globalAlpha = (1 - ph) * 0.45;
        ctx.strokeStyle = '#d9c69a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 18.5, 8 + ph * 16, 2.4 + ph * 4.4, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }

    // cabeça pequena com cranio + mandíbula
    ctx.fillStyle = _ton(cor, 1.05);
    ctx.strokeStyle = _ton(cor, 0.4);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, -16, 6.8, Math.PI, 0);
    ctx.quadraticCurveTo(7, -12, 4.6, -12);
    ctx.quadraticCurveTo(0, -9.4, -4.6, -12);
    ctx.quadraticCurveTo(-7, -12, -6.8, -14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = _ton(cor, 0.85);
    ctx.beginPath();
    ctx.ellipse(0, -10.5, 5.2, 3.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // chifres
    ctx.strokeStyle = '#d9c69a';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-4.5, -20); ctx.quadraticCurveTo(-7, -25, -3.8, -27);
    ctx.moveTo(4.5, -20); ctx.quadraticCurveTo(7, -25, 3.8, -27);
    ctx.stroke();

    // olhos fundos (vermelhos e brilhando ao atacar)
    var irado = est.atkT > 0;
    ctx.fillStyle = irado ? '#ff4d4d' : '#ffd65e';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = irado ? 6 : 2;
    ctx.beginPath(); ctx.ellipse(-2.4, -15.5, 1.3, 1.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(2.4, -15.5, 1.3, 1.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // sobrancelhas grossas
    ctx.strokeStyle = _ton(cor, 0.3);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-4.6, -18.5); ctx.lineTo(-0.8, -19.4);
    ctx.moveTo(4.6, -18.5); ctx.lineTo(0.8, -19.4);
    ctx.stroke();

    // narinas
    ctx.fillStyle = _ton(cor, 0.3);
    ctx.beginPath(); ctx.arc(-1.6, -13, 0.7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(1.6, -13, 0.7, 0, Math.PI * 2); ctx.fill();

    // bocarra aberta (rosnado)
    ctx.fillStyle = 'rgba(22,8,4,0.92)';
    ctx.beginPath();
    ctx.ellipse(0, -8.6, 2.6, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // presas
    ctx.fillStyle = '#f2e8d8';
    ctx.beginPath();
    ctx.moveTo(-2.2, -8.6); ctx.lineTo(-3.2, -5.3); ctx.lineTo(-1.2, -8.2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(2.2, -8.6); ctx.lineTo(3.2, -5.3); ctx.lineTo(1.2, -8.2);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
    _golpeArco(ctx, est, cor);
    _stunStar(ctx, slime, -36);
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
function _barraHp(slime, dx, dy, largura) {
    if (typeof window.desenharBarraHp === "function") {
        window.desenharBarraHp(slime.x + dx, slime.y + dy, slime.hp, slime.maxHp, slime.stunTimer, slime.slowTimer, largura || 0, slime);
    }
}

// Marca visual do ELITE da Arena de Solari: aura dourada pulsante + anel piscando
function _desenharEliteMark(slime, escala) {
    var ctx = window.ctx;
    if (!ctx) return;
    var t = Date.now() / 1000;
    var R = 26 * (escala || 1);
    var blink = (Math.floor(t * 5) % 2 === 0);
    ctx.save();
    // Aura dourada no chão (pulsante)
    var pulso = 0.5 + Math.sin(t * 6) * 0.5;
    ctx.globalAlpha = 0.20 + pulso * 0.20;
    ctx.fillStyle = '#ffd700';
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.ellipse(slime.x, slime.y + 8 * escala, R * 1.35, R * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    // Anel piscando ao redor do ELITE (50% maior)
    ctx.globalAlpha = blink ? 0.95 : 0.30;
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ffd700';
    ctx.beginPath();
    ctx.ellipse(slime.x, slime.y + 4 * escala, R, R * 0.42, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    // Barra de vida MAIOR para o ELITE
    if (typeof window.desenharBarraHp === "function") {
        window.desenharBarraHp(slime.x - 23 * escala, slime.y - 34 * escala, slime.hp, slime.maxHp, slime.stunTimer, slime.slowTimer, 46 * escala, slime);
    }
}

window.desenharSlime = function(slime) {
    if (slime.hp <= 0 || !window.ctx) return;
    if (typeof window._monstrosDesenhados === 'number') window._monstrosDesenhados++;
    var ctx = window.ctx;
    var elite = !!slime.elite;
    var escala = (slime.escala && slime.escala !== 1) ? slime.escala : 1;

    var tp = (slime.tipo || '').toLowerCase();
    var arq = (slime.arquetipo || '').toLowerCase();

    if (tp.indexOf('zumbi') !== -1) {
        ctx.save();
        ctx.translate(slime.x, slime.y);
        if (escala !== 1) ctx.scale(escala, escala);
        desenharZumbi(ctx, slime);
        ctx.restore();
        _barraHp(slime, -15 * escala, -24 * escala);
        if (elite) _desenharEliteMark(slime, escala);
        return;
    }

    if (slime.invisivel) return;

    var info = _info(slime);
    var est = _estado(slime);
    _atualizarEstado(slime, est);

    ctx.save();
    ctx.translate(slime.x, slime.y);
    if (escala !== 1) ctx.scale(escala, escala);
    _sombra(ctx, info.raio / 14);
    _desenharAura(ctx, slime, est, info.cor, info.raio);
    ctx.restore();

    ctx.save();
    ctx.translate(slime.x, slime.y);
    if (escala !== 1) ctx.scale(escala, escala);
    if (elite) ctx.globalAlpha = 0.55 + ((Math.floor(Date.now() / 160) % 2 === 0) ? 0.45 : 0); // piscando
    var foi = true;
    if (tp === 'melee') _slimeGel(ctx, slime, est, info);
    else if (tp === 'ranged') _slimeArqueiro(ctx, slime, est, info);
    else if (arq === 'poison_melee' || tp.indexOf('esc') !== -1) _escorpiao(ctx, slime, est, info);
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
    _barraHp(slime, offs[0] * escala, offs[1] * escala);
    if (elite) _desenharEliteMark(slime, escala);
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