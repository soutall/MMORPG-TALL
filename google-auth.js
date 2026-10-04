// Verifica ID tokens do Google usando as chaves públicas oficiais (RS256).
const crypto = require('crypto');

const GOOGLE_CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
let cacheCerts = null;
let cacheExpiraEm = 0;
let carregandoCerts = null;

function decodificarParte(parte) {
    return JSON.parse(Buffer.from(parte, 'base64url').toString('utf8'));
}

async function carregarCertificados(fetchImpl) {
    if (cacheCerts && Date.now() < cacheExpiraEm) return cacheCerts;
    if (carregandoCerts) return carregandoCerts;
    carregandoCerts = (async () => {
        const response = await fetchImpl(GOOGLE_CERTS_URL, { headers: { Accept: 'application/json' } });
        if (!response || !response.ok) throw new Error('Não foi possível obter as chaves de verificação do Google.');
        const body = await response.json();
        if (!body || !Array.isArray(body.keys)) throw new Error('Resposta de chaves do Google inválida.');
        const maxAge = Number(((response.headers && response.headers.get('cache-control')) || '').match(/max-age=(\d+)/i)?.[1]) || 300;
        cacheCerts = body.keys.filter(k => k && k.kty === 'RSA' && k.use === 'sig' && k.alg === 'RS256' && k.kid && k.n && k.e);
        cacheExpiraEm = Date.now() + Math.max(60, Math.min(maxAge, 3600)) * 1000;
        if (!cacheCerts.length) throw new Error('O Google não retornou chaves RSA utilizáveis.');
        return cacheCerts;
    })();
    try {
        return await carregandoCerts;
    } finally {
        carregandoCerts = null;
    }
}

async function verificarGoogleCredential(credential, clientId, fetchImpl = global.fetch) {
    if (typeof clientId !== 'string' || !clientId.trim()) throw new Error('Login Google não configurado no servidor.');
    if (typeof credential !== 'string' || credential.length > 16384) throw new Error('Credencial Google inválida.');
    const partes = credential.split('.');
    if (partes.length !== 3 || partes.some(p => !p)) throw new Error('Credencial Google inválida.');

    let header, claims;
    try {
        header = decodificarParte(partes[0]);
        claims = decodificarParte(partes[1]);
    } catch (_) {
        throw new Error('Credencial Google malformada.');
    }
    if (!header || header.alg !== 'RS256' || typeof header.kid !== 'string' || header.typ && header.typ !== 'JWT') {
        throw new Error('Algoritmo ou cabeçalho do token Google inválido.');
    }

    const keys = await carregarCertificados(fetchImpl);
    let chave = keys.find(k => k.kid === header.kid);
    if (!chave) {
        cacheExpiraEm = 0;
        const atualizadas = await carregarCertificados(fetchImpl);
        chave = atualizadas.find(k => k.kid === header.kid);
    }
    if (!chave) throw new Error('A chave de assinatura do Google não é reconhecida.');

    let assinatura;
    try { assinatura = Buffer.from(partes[2], 'base64url'); }
    catch (_) { throw new Error('Assinatura Google inválida.'); }
    const signingInput = Buffer.from(partes[0] + '.' + partes[1], 'ascii');
    const publicKey = crypto.createPublicKey({ key: { kty: 'RSA', n: chave.n, e: chave.e }, format: 'jwk' });
    if (!crypto.verify('RSA-SHA256', signingInput, publicKey, assinatura)) throw new Error('Assinatura Google inválida.');

    const agora = Math.floor(Date.now() / 1000);
    const tolerancia = 60;
    const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    const issuers = ['accounts.google.com', 'https://accounts.google.com'];
    if (!issuers.includes(claims.iss)) throw new Error('Emissor Google inválido.');
    if (!audiences.includes(clientId)) throw new Error('Este token não pertence a este aplicativo.');
    if (claims.azp && claims.azp !== clientId) throw new Error('Parte autorizada do token Google inválida.');
    if (!Number.isFinite(Number(claims.exp)) || Number(claims.exp) <= agora - tolerancia) throw new Error('A credencial Google expirou.');
    if (!Number.isFinite(Number(claims.iat)) || Number(claims.iat) > agora + tolerancia || agora - Number(claims.iat) > 3600 + tolerancia) {
        throw new Error('Horário da credencial Google inválido.');
    }
    if (typeof claims.sub !== 'string' || !/^[0-9]{5,64}$/.test(claims.sub)) throw new Error('Identidade Google inválida.');
    if (typeof claims.email !== 'string' || claims.email.length > 254 || (claims.email_verified !== true && claims.email_verified !== 'true')) {
        throw new Error('A conta Google precisa ter um e-mail verificado.');
    }
    return { sub: claims.sub, email: claims.email.trim().toLowerCase(), name: typeof claims.name === 'string' ? claims.name.slice(0, 100) : '' };
}

function limparCacheChavesGoogle() {
    cacheCerts = null;
    cacheExpiraEm = 0;
    carregandoCerts = null;
}

module.exports = { verificarGoogleCredential, limparCacheChavesGoogle };
