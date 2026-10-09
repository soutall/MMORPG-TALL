const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.join(__dirname, '..', '..');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const introCss = fs.readFileSync(path.join(root, 'intro.css'), 'utf8');

function extractFunction(source, name) {
    const start = source.indexOf(`function ${name}(`);
    assert.notEqual(start, -1, `missing ${name}`);
    const braceStart = source.indexOf('{', start);
    let depth = 0;
    let quote = '';
    let escaped = false;
    for (let i = braceStart; i < source.length; i++) {
        const char = source[i];
        if (quote) {
            if (escaped) escaped = false;
            else if (char === '\\') escaped = true;
            else if (char === quote) quote = '';
            continue;
        }
        if (char === '"' || char === "'" || char === '`') {
            quote = char;
        } else if (char === '{') {
            depth++;
        } else if (char === '}' && --depth === 0) {
            return source.slice(start, i + 1);
        }
    }
    assert.fail(`unterminated function ${name}`);
}

function createGuestAuthHarness() {
    const context = vm.createContext({ crypto, Date, Map });
    const helpers = [
        extractFunction(server, 'contaAutenticada'),
        extractFunction(server, 'associarSessaoVisitante'),
        extractFunction(server, 'autenticarVisitante')
    ].join('\n');
    vm.runInContext(`
        const SESSAO_VISITANTE_TTL_MS = 24 * 60 * 60 * 1000;
        const JANELA_NOVO_VISITANTE_MS = 10 * 60 * 1000;
        const LIMITE_NOVOS_VISITANTES_POR_IP = 8;
        const sessoesVisitante = new Map();
        const emissoesVisitantePorIp = new Map();
        ${helpers}
        globalThis.guestAuth = { autenticarVisitante, contaAutenticada };
    `, context);
    return context.guestAuth;
}

test('guest login issues an unprivileged session and resumes it with its server-issued token', () => {
    const auth = createGuestAuthHarness();
    const firstSocket = {};
    const firstLogin = auth.autenticarVisitante(firstSocket, '', '127.0.0.1');

    assert.equal(firstLogin.ok, true);
    assert.match(firstLogin.token, /^[a-f0-9]{64}$/);
    assert.equal(firstLogin.contaId, `visitor:${firstLogin.token}`);
    assert.equal(auth.contaAutenticada(firstSocket), true);
    assert.equal(firstSocket.ehAdminContaGlobal, false);
    assert.equal(firstSocket.ehAdminCliente, false);

    const resumedSocket = {};
    const resumedLogin = auth.autenticarVisitante(resumedSocket, firstLogin.token, '127.0.0.1');
    assert.equal(resumedLogin.ok, true);
    assert.equal(resumedLogin.contaId, firstLogin.contaId);
    assert.equal(resumedSocket._guestToken, firstLogin.token);
});

test('guest login rejects unissued tokens and throttles new guest accounts per address', () => {
    const auth = createGuestAuthHarness();
    const forgedSocket = {};
    assert.equal(auth.autenticarVisitante(forgedSocket, 'a'.repeat(64), '127.0.0.1').ok, false);
    assert.equal(forgedSocket._guestAuthenticated, undefined);

    for (let i = 0; i < 8; i++) {
        assert.equal(auth.autenticarVisitante({}, '', '192.0.2.8').ok, true);
    }
    const limited = auth.autenticarVisitante({}, '', '192.0.2.8');
    assert.equal(limited.ok, false);
    assert.match(limited.mensagem, /Muitas contas visitantes/);
});

test('visitor sessions can manage only their own character/account records', () => {
    assert.match(server, /'login', 'google_login', 'guest_login'/);
    assert.match(server, /if \(data\.action === 'guest_login'\)[\s\S]*?visitorLogin: true,[\s\S]*?guestToken: resultadoVisitante\.token/);
    assert.match(server, /if \(data\.action === 'personagem_criar'\) \{\s*if \(!contaPodeGerenciarPersonagens\(ws\) \|\| !ws\._contaId\) return;/);
    assert.match(server, /if \(data\.action === 'personagem_deletar'\) \{\s*if \(!contaPodeGerenciarPersonagens\(ws\) \|\| !ws\._contaId\) return;/);
    assert.match(server, /personagemPertenceAConta\(nomeDel, contaId\)/);
    assert.match(server, /function contaPodeGerenciarPersonagens\(ws\) \{\s*return !!\(ws && \(ws\._googleAuthenticated \|\| ws\._guestAuthenticated\)\);/);
});

test('login page exposes the orange visitor button and shifts Google controls below the art responsively', () => {
    assert.match(html, /<button id="guest-login-button" type="button">ENTRAR COMO VISITANTE<\/button>/);
    assert.match(html, /id="guest-login-note">Conta temporária para testes/);
    assert.match(html, /action: 'guest_login', token: credential\.guestToken/);
    assert.match(html, /localStorage\.setItem\('mmorpg_visitor_token', visitorTokenAtual\)/);
    assert.match(css, /#google-login-box\s*\{\s*margin-top:\s*clamp\(/);
    assert.match(css, /@media \(max-width: 600px\)[\s\S]*?#google-login-box\s*\{/);
    assert.match(css, /#guest-login-button\s*\{[^}]*linear-gradient\(135deg, #f28c28, #dc5b16\)/);
});

test('mobile landscape keeps login controls in one viewport and fits the studio intro logo', () => {
    assert.match(css, /@media \(max-width: 950px\) and \(max-height: 520px\)[\s\S]*?#login-screen\s*\{[^}]*overflow:\s*hidden/);
    assert.match(css, /@media \(max-width: 950px\) and \(max-height: 520px\)[\s\S]*?#guest-login-button\s*\{[^}]*min-height:\s*36px/);
    assert.match(introCss, /@media \(max-width: 900px\)[\s\S]*?\.intro-estudio-nome\s*\{[^}]*font-size:\s*clamp\(15px,\s*4\.2vw,\s*24px\)[^}]*letter-spacing:/);
});
