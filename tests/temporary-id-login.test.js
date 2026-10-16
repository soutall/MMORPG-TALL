'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const test = require('node:test');
const WebSocket = require('ws');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

test('temporary ID login is shown only on localhost without deleting other login methods', () => {
    assert.match(html, /let localIdLoginDeTeste = false/);
    assert.match(html, /config\.localIdLogin === true && hostLocal/);
    assert.match(html, /classList\.add\('login-id-temporario'\)/);
    assert.match(html, /html\.login-id-temporario #google-login-box,[\s\S]*?html\.login-id-temporario #guest-login-note \{ display: none !important; \}/);
    assert.match(html, /id="google-login-box"/);
    assert.match(html, /id="guest-login-button"/);
    assert.match(html, /id="local-id-login-box"/);
    assert.match(html, /const GAME_VERSION = 'v1\.75\.110'/);
    assert.match(html, /maxlength="64"[^>]*placeholder="Digite qualquer ID para o teste local"/);
    assert.match(html, /!id \|\| id\.length > 64 \|\| \/\[\\u0000-\\u001F\\u007F-\\u009F\]\//);
});

test('ID login remains local-only, grants admin only to the Admin ID, and isolates test profiles', () => {
    assert.match(server, /process\.env\.NODE_ENV !== 'production' && process\.env\.LOCAL_ID_LOGIN_ENABLED !== '0'/);
    assert.match(server, /if \(!LOCAL_ID_LOGIN_ENABLED \|\| !\['127\.0\.0\.1', '::1'\]\.includes\(remoteAddress\) \|\|\s*veioDaCloudflare/);
    assert.match(server, /server\.listen\(PORT, LOCAL_ID_LOGIN_ENABLED \? '127\.0\.0\.1' : '0\.0\.0\.0'/);
    assert.match(server, /const localCharacterId = 'local-test-' \+ crypto\.createHash\('sha256'\)\.update\(requestedId, 'utf8'\)\.digest\('hex'\)/);
    assert.match(server, /const LOCAL_ID_LOGIN_TEST_ADMIN = process\.env\.NODE_ENV === 'test' && process\.env\.LOCAL_ID_LOGIN_TEST_ADMIN === '1'/);
    assert.match(server, /const localIdIsAdmin = requestedId\.toLowerCase\(\) === 'admin' \|\| LOCAL_ID_LOGIN_TEST_ADMIN/);
    assert.match(server, /ws\.ehAdminContaGlobal = localIdIsAdmin;\s*ws\.ehAdminCliente = localIdIsAdmin;/);
    assert.match(server, /const localCharacterAllowed = ws\._localIdAuthenticated && ws\._localDisplayId === nomeSolicitado/);
    assert.doesNotMatch(server, /ID local de teste não encontrado/);
});

test('an arbitrary local ID enters a separate profile without admin rights or touching an existing ID', async (t) => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mmorpg-local-id-'));
    const databaseFile = path.join(tempDir, 'players.json');
    const portProbe = net.createServer();
    await new Promise((resolve, reject) => {
        portProbe.once('error', reject);
        portProbe.listen(0, '127.0.0.1', resolve);
    });
    const port = portProbe.address().port;
    await new Promise((resolve, reject) => portProbe.close((error) => error ? reject(error) : resolve()));

    const requestedId = 'admin / teste 🔥';
    const existingRecord = { level: 88, classe: 'sniper', gold: 123456 };
    fs.writeFileSync(databaseFile, JSON.stringify({ [requestedId]: existingRecord }));

    let serverOutput = '';
    const child = spawn(process.execPath, ['server.js'], {
        cwd: path.join(__dirname, '..'),
        env: Object.assign({}, process.env, {
            NODE_ENV: 'test',
            MMORPG_DATABASE_FILE: databaseFile,
            PORT: String(port)
        }),
        stdio: ['ignore', 'pipe', 'pipe']
    });
    child.stdout.on('data', (chunk) => { serverOutput += chunk.toString(); });
    child.stderr.on('data', (chunk) => { serverOutput += chunk.toString(); });

    t.after(async () => {
        if (child.exitCode === null) {
            child.kill('SIGTERM');
            await Promise.race([
                new Promise((resolve) => child.once('exit', resolve)),
                new Promise((resolve) => setTimeout(resolve, 3000))
            ]);
        }
        try { fs.unlinkSync(databaseFile + '.lock'); } catch (error) {
            if (error.code !== 'ENOENT') throw error;
        }
        fs.unlinkSync(databaseFile);
        fs.rmdirSync(tempDir);
    });

    const deadline = Date.now() + 20000;
    let healthy = false;
    while (Date.now() < deadline && child.exitCode === null) {
        try {
            const response = await fetch('http://127.0.0.1:' + port + '/health');
            if (response.ok && (await response.text()) === 'OK') {
                healthy = true;
                break;
            }
        } catch (error) {
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
    }
    assert.equal(healthy, true, 'test server failed to start: ' + serverOutput);

    const configResponse = await fetch('http://127.0.0.1:' + port + '/auth/google-config');
    const loginConfig = await configResponse.json();
    assert.equal(loginConfig.localIdLogin, true);

    const connectMessage = async (message, headers) => {
        const socket = new WebSocket('ws://127.0.0.1:' + port, headers ? { headers } : undefined);
        const messages = [];
        socket.on('message', (message) => {
            try { messages.push(JSON.parse(message.toString())); } catch (error) {}
        });
        await new Promise((resolve, reject) => {
            socket.once('open', resolve);
            socket.once('error', reject);
        });
        const waitFor = async (type) => {
            const messageDeadline = Date.now() + 8000;
            while (Date.now() < messageDeadline) {
                const found = messages.find((message) => message.type === type);
                if (found) return found;
                await new Promise((resolve) => setTimeout(resolve, 20));
            }
            throw new Error('Timed out waiting for ' + type + ': ' + serverOutput);
        };
        socket.send(JSON.stringify(message));
        return { socket, waitFor: waitFor };
    };
    const connect = (id, headers) => connectMessage({ action: 'login', id }, headers);

    const regularClient = await connect(requestedId);
    const login = await regularClient.waitFor('personagens_lista');
    assert.equal(login.localIdLogin, true);
    assert.equal(login.personagens[0].personagem, requestedId);
    assert.equal(login.personagens[0].level, 1);
    regularClient.socket.send(JSON.stringify({ action: 'personagem_selecionar', personagem: requestedId }));
    const init = await regularClient.waitFor('init');
    assert.equal(init.level, 1);
    assert.equal(init.admin, false);

    const stored = JSON.parse(fs.readFileSync(databaseFile, 'utf8'));
    assert.deepEqual(stored[requestedId], existingRecord);
    assert.equal(stored['local-test-' + crypto.createHash('sha256').update(requestedId, 'utf8').digest('hex')], undefined);
    const adminClient = await connect('Admin');
    const adminLogin = await adminClient.waitFor('personagens_lista');
    assert.equal(adminLogin.personagens[0].personagem, 'Admin');
    adminClient.socket.send(JSON.stringify({ action: 'personagem_selecionar', personagem: 'Admin' }));
    const adminInit = await adminClient.waitFor('init');
    assert.equal(adminInit.admin, true);
    regularClient.socket.send(JSON.stringify({ action: 'chat_send', text: 'Olá <script> &' }));
    const senderMessage = await regularClient.waitFor('chat_message');
    const receiverMessage = await adminClient.waitFor('chat_message');
    assert.equal(senderMessage.name, requestedId);
    assert.equal(senderMessage.text, 'Olá <script> &');
    assert.equal(receiverMessage.id, senderMessage.id);
    assert.equal(receiverMessage.text, senderMessage.text);
    adminClient.socket.send(JSON.stringify({ action: 'admin_cheats_toggle', cheats: { vidaInfinita: true } }));
    const adminCheats = await adminClient.waitFor('admin_cheats_sync');
    assert.equal(adminCheats.cheats.vidaInfinita, true);
    regularClient.socket.close();
    adminClient.socket.close();

    const visitorClient = await connectMessage({
        action: 'guest_login',
        id: 'Visitor-One',
        accessCode: 'private-code-12345'
    });
    const visitorLogin = await visitorClient.waitFor('personagens_lista');
    assert.equal(visitorLogin.visitorLogin, true);
    assert.match(visitorLogin.conta, /^visitor-id:[a-f0-9]{64}$/);
    assert.match(visitorLogin.guestToken, /^[a-f0-9]{64}$/);
    visitorClient.socket.close();

    const visitorResume = await connectMessage({
        action: 'guest_login',
        id: 'visitor-one',
        accessCode: 'private-code-12345'
    });
    const visitorResumeLogin = await visitorResume.waitFor('personagens_lista');
    assert.equal(visitorResumeLogin.conta, visitorLogin.conta);
    visitorResume.socket.close();

    const tunneledLocalLogin = await connectMessage(
        { action: 'login', id: 'admin' },
        { 'cf-connecting-ip': '198.51.100.50', 'cf-ray': 'test-ray' }
    );
    const tunneledLocalLoginError = await tunneledLocalLogin.waitFor('login_erro');
    assert.match(tunneledLocalLoginError.mensagem, /modo local de teste/);
    tunneledLocalLogin.socket.close();
});
