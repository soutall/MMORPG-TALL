const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('login offers direct Google sign-in even without a locally remembered account', () => {
    assert.match(html, /id="login-direct-button"[^>]*>Entrar direto com Google<\/button>/);
    assert.match(html, /id="login-remembered-email"/);
    assert.match(html, /botaoLoginDireto\.style\.display = 'inline-flex'/);
    assert.match(html, /if \(bloco\) bloco\.style\.display = email \? 'flex' : 'none'/);
});

test('direct Google sign-in requests automatic account selection and prompts for a current session', () => {
    assert.match(html, /callback: tratarCredencialGoogle,\s*auto_select: true/);
    assert.match(html, /window\.google\.accounts\.id\.prompt\(function \(notificacao\)/);
    assert.match(html, /Não foi possível usar a sessão Google atual\.[\s\S]*Continuar com o Google/);
    assert.match(html, /A entrada direta não foi concluída\.[\s\S]*Continuar com o Google/);
});
