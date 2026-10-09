const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('login offers direct Google sign-in even without a locally remembered account', () => {
    assert.match(html, /id="login-direct-button"[^>]*>ENTRAR<\/button>/);
    assert.match(html, /id="login-remembered-email"/);
    assert.match(html, /if \(botaoLoginDireto\) botaoLoginDireto\.style\.display = 'inline-flex'/);
    assert.match(html, /if \(bloco\) bloco\.style\.display = email \? 'flex' : 'none'/);
});

test('the primary enter button silently tries the remembered Google account before showing the account chooser', () => {
    assert.match(html, /callback: tratarCredencialGoogle,\s*auto_select: true/);
    assert.match(html, /window\.google\.accounts\.id\.prompt\(function \(notificacao\)/);
    assert.match(html, /localStorage\.getItem\('mmorpg_last_google_email'\)[\s\S]*Entrando com a conta Google lembrada/);
    assert.match(html, /googleSignInButton\.style\.display = email && !googleCredentialAtual \? 'none' : 'block'/);
    assert.match(html, /loginGooglePromptPendente \|\| window\.googleLoginConcluido/);
    assert.match(html, /loginGooglePromptPendente = false;[\s\S]{0,250}googleSignInButton\.style\.display = 'block'/);
    assert.match(html, /localStorage\.removeItem\('mmorpg_last_google_email'\)/);
    assert.match(html, /if \(emailGooglePendente\) \{\s*localStorage\.setItem\('mmorpg_last_google_email', emailGooglePendente\)/);
    assert.match(html, /if \(botaoLoginDireto\) botaoLoginDireto\.disabled = false;/);
    assert.match(html, /if \(googleSignInButton\) googleSignInButton\.style\.display = 'block';/);
});
