const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { verificarGoogleCredential, limparCacheChavesGoogle } = require('../../google-auth');

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = publicKey.export({ format: 'jwk' });
const clientId = 'audience.apps.googleusercontent.com';
const keyId = 'unit-test-key';
let fetchCount = 0;
const fetchKeys = async () => {
    fetchCount++;
    return {
        ok: true,
        headers: { get: () => 'public, max-age=300' },
        json: async () => ({ keys: [{ ...jwk, kid: keyId, use: 'sig', alg: 'RS256' }] })
    };
};

function criarToken(overrides = {}) {
    const agora = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: keyId })).toString('base64url');
    const claims = Buffer.from(JSON.stringify({
        iss: 'https://accounts.google.com', aud: clientId, azp: clientId,
        sub: '12345678901234567890', email: 'player@example.com', email_verified: true,
        iat: agora, exp: agora + 300, ...overrides
    })).toString('base64url');
    const input = header + '.' + claims;
    return input + '.' + crypto.sign('RSA-SHA256', Buffer.from(input), privateKey).toString('base64url');
}

test('valida assinatura, audiência e email confirmado do Google', async () => {
    limparCacheChavesGoogle();
    const identidade = await verificarGoogleCredential(criarToken(), clientId, fetchKeys);
    assert.deepEqual(identidade, { sub: '12345678901234567890', email: 'player@example.com', name: '' });
});

test('reutiliza as chaves Google durante o período de cache', async () => {
    limparCacheChavesGoogle();
    const antes = fetchCount;
    await verificarGoogleCredential(criarToken(), clientId, fetchKeys);
    await verificarGoogleCredential(criarToken(), clientId, fetchKeys);
    assert.equal(fetchCount - antes, 1);
});

test('rejeita audiência de outro aplicativo', async () => {
    limparCacheChavesGoogle();
    await assert.rejects(verificarGoogleCredential(criarToken(), 'other.apps.googleusercontent.com', fetchKeys), /não pertence/);
});

test('rejeita assinatura alterada', async () => {
    limparCacheChavesGoogle();
    const token = criarToken();
    const partes = token.split('.');
    partes[2] = Buffer.from('assinatura adulterada').toString('base64url');
    await assert.rejects(verificarGoogleCredential(partes.join('.'), clientId, fetchKeys), /Assinatura Google inválida/);
});

test('rejeita token expirado ou email sem verificação', async () => {
    limparCacheChavesGoogle();
    const agora = Math.floor(Date.now() / 1000);
    await assert.rejects(verificarGoogleCredential(criarToken({ exp: agora - 600 }), clientId, fetchKeys), /expirou/);
    await assert.rejects(verificarGoogleCredential(criarToken({ email_verified: false }), clientId, fetchKeys), /e-mail verificado/);
});
