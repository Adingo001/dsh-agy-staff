import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const home = mkdtempSync(join(tmpdir(), 'agy-ui-'));
process.env.DSH_HOME = home;
process.env.DSH_AGY_SUBAGENT_MODE = '';

const settings = await import('../agy-settings.js');
const ui = await import('../agy-ui.js');

test.after(() => {
    rmSync(home, { recursive: true, force: true });
});

test('a fresh install starts from the documented defaults', () => {
    const current = settings.readSettings();
    assert.equal(current.mode, 'staffer');
    assert.equal(current.timeoutMs, 45 * 60 * 1000);
    assert.equal(current.subagentEnabled, true);
    assert.equal(current.skillsEnabled, true);
    assert.ok(settings.settingsPath().startsWith(home), settings.settingsPath());
});

test('a panel save round-trips and is validated', () => {
    const saved = settings.writeSettings({ mode: 'implement', model: 'gemini-3.8-flash-high', timeoutMs: 600000 });
    assert.equal(saved.mode, 'implement');
    assert.equal(saved.model, 'gemini-3.8-flash-high');
    assert.equal(saved.timeoutMs, 600000);
    assert.equal(settings.readSettings().mode, 'implement');

    assert.throws(() => settings.writeSettings({ mode: 'nope' }), /mode must be one of/);
    assert.throws(() => settings.writeSettings({ timeoutMs: 10 }), /timeoutMs/);
    assert.throws(() => settings.writeSettings({ effort: 'extreme' }), /effort must be one of/);
    assert.throws(() => settings.writeSettings({ nope: 1 }), /unknown setting/);
});

test('a hand-broken settings file falls back to defaults per field', () => {
    const file = settings.settingsPath();
    mkdirSync(join(home, 'agy-staff'), { recursive: true });
    writeFileSync(file, JSON.stringify({ mode: 'review', timeoutMs: 'boom', skillsEnabled: false }), 'utf8');
    settings.resetSettingsCache();
    const current = settings.readSettings();
    assert.equal(current.mode, 'review');
    assert.equal(current.timeoutMs, settings.DEFAULTS.timeoutMs);
    assert.equal(current.skillsEnabled, false);
});

test('status reports paths, the companion, and the mode catalog', async () => {
    const status = await ui.dispatch({ op: 'status' });
    assert.equal(status.ok, true);
    assert.equal(status.companionExists, true);
    assert.deepEqual(status.modes, [...settings.MODES]);
    assert.deepEqual(status.efforts, [...settings.EFFORTS]);
    assert.ok(status.companion.endsWith('agy-companion.mjs'));
    assert.match(status.pluginVersion, /^\d+\.\d+\.\d+/);
});

test('unknown ops and bad patches fail as data, not exceptions', async () => {
    assert.equal((await ui.dispatch({ op: 'nope' })).ok, false);
    assert.equal((await ui.dispatch({ op: 'set' })).ok, false);
    assert.equal((await ui.dispatch({ op: 'set', patch: { mode: 'bogus' } })).ok, false);
    assert.equal((await ui.dispatch({})).ok, false);
});

test('jobs reads the companion state file for a directory', async () => {
    const repo = mkdtempSync(join(tmpdir(), 'agy-repo-'));
    mkdirSync(join(repo, '.agy-staff'), { recursive: true });
    writeFileSync(join(repo, '.agy-staff', 'state.json'), JSON.stringify({
        jobs: [{
            id: 'staffer-abc-123',
            mode: 'staffer',
            status: 'done',
            model: 'gemini-3.8-flash-medium',
            profile: 'unrestricted',
            started_at: '2026-11-03T07:32:09.551Z',
            result_file: join(repo, '.agy-staff', 'jobs', 'staffer-abc-123.result.md'),
        }],
    }), 'utf8');
    mkdirSync(join(repo, '.agy-staff', 'jobs'), { recursive: true });
    writeFileSync(join(repo, '.agy-staff', 'jobs', 'staffer-abc-123.result.md'), '# Job\n\nhello\n', 'utf8');

    const list = await ui.dispatch({ op: 'jobs', cwd: repo });
    assert.equal(list.ok, true);
    assert.equal(list.jobs.length, 1);
    assert.equal(list.jobs[0].id, 'staffer-abc-123');
    assert.equal(list.jobs[0].status, 'done');

    const result = await ui.dispatch({ op: 'result', cwd: repo, jobId: 'staffer-abc-123' });
    assert.equal(result.ok, true);
    assert.match(result.output, /hello/);

    assert.equal((await ui.dispatch({ op: 'result', cwd: repo, jobId: '../../etc/passwd' })).ok, false);
    rmSync(repo, { recursive: true, force: true });
});

test('a missing state file is an empty list, not an error', async () => {
    const list = await ui.dispatch({ op: 'jobs', cwd: join(home, 'nowhere') });
    assert.equal(list.ok, true);
    assert.deepEqual(list.jobs, []);
});

/** A request stub good enough for the route handler. */
function makeRequest({ method = 'POST', headers = {}, body = '' }) {
    const req = new EventEmitter();
    req.method = method;
    req.headers = headers;
    queueMicrotask(() => {
        if (body !== '') req.emit('data', Buffer.from(body, 'utf8'));
        req.emit('end');
    });
    req.destroy = () => {};
    return req;
}

function makeResponse() {
    const res = { statusCode: 0, headers: {}, body: '' };
    res.setHeader = (k, v) => {
        res.headers[k.toLowerCase()] = v;
    };
    res.end = (text) => {
        res.body = text;
    };
    return res;
}

test('the route is exact, POST-only, JSON-only, and same-origin', async () => {
    let route;
    const ctx = { webServer: { register: (r) => { route = r; return () => {}; } } };
    ui.apply(ctx);
    assert.equal(route.kind, 'exact');
    assert.equal(route.path, '/agy/api');

    const call = async (opts) => {
        const res = makeResponse();
        await route.handler(makeRequest(opts), res);
        return { status: res.statusCode, body: JSON.parse(res.body || '{}') };
    };

    assert.equal((await call({ method: 'GET', headers: { host: '127.0.0.1:1' } })).status, 405);
    assert.equal((await call({ headers: { host: '127.0.0.1:1' }, body: '{}' })).status, 415);
    assert.equal((await call({
        headers: { host: '127.0.0.1:1', origin: 'https://evil.example', 'content-type': 'application/json' },
        body: JSON.stringify({ op: 'status' }),
    })).status, 403);
    assert.equal((await call({
        headers: { host: '127.0.0.1:1', 'sec-fetch-site': 'cross-site', 'content-type': 'application/json' },
        body: JSON.stringify({ op: 'status' }),
    })).status, 403);

    const ok = await call({
        headers: { host: '127.0.0.1:1', origin: 'http://127.0.0.1:1', 'content-type': 'application/json' },
        body: JSON.stringify({ op: 'get' }),
    });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.ok, true);
    assert.equal(ok.body.settings.mode, 'review');
});
