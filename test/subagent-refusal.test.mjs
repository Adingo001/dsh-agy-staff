import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

// Isolate from the machine's real panel settings before the modules load.
process.env.DSH_HOME = mkdtempSync(join(tmpdir(), 'agy-refusal-'));
process.env.DSH_AGY_SUBAGENT_MODE = '';

const { createAgyProvider } = await import('../agy-subagent.js');
const settings = await import('../agy-settings.js');
const { readDecisions } = await import('../agy-ledger.js');

const repo = () => mkdtempSync(join(tmpdir(), 'agy-refusal-repo-'));

/**
 * Stub the process boundary: the admission layer must decide *before* anything is
 * spawned, so "no exec call" is the assertion that proves it.
 */
function stubbedProvider() {
    const provider = createAgyProvider({ waitSliceSeconds: 10, pollMs: 200 });
    const calls = [];
    provider.exec = async (args) => {
        calls.push(args);
        if (args[0] === 'wait') return { code: 0, stdout: 'job output\n', stderr: '' };
        if (args[0] === 'cancel') return { code: 0, stdout: '', stderr: '' };
        return { code: 0, stdout: 'job id: staffer-abc-123 (pid 1)\n', stderr: '' };
    };
    return { provider, calls };
}

test('an empty prompt is refused before anything is spawned', async () => {
    settings.writeSettings({ subagentEnabled: true, mode: 'staffer' });
    const cwd = repo();
    const { provider, calls } = stubbedProvider();

    const run = await provider.start({ prompt: '  ', cwd });
    const result = await run.result;
    await run.dispose();

    assert.deepEqual(calls, []);
    assert.equal(result.stopReason, 'error');
    assert.ok(result.diagnostic.startsWith('AGY_REFUSED empty_prompt'), result.diagnostic);
    assert.match(result.diagnostic, /non-empty prompt/, 'the human sentence survives the code prefix');

    const [decision] = readDecisions(cwd, 5);
    assert.equal(decision.kind, 'refused');
    assert.equal(decision.reason.code, 'empty_prompt');
    assert.equal(decision.basis, 'admission');
    assert.match(decision.settingsVersion, /^[0-9a-f]{12}$/);
});

test('a disabled subagent is refused without touching the companion', async () => {
    settings.writeSettings({ subagentEnabled: false });
    const cwd = repo();
    const { provider, calls } = stubbedProvider();

    const run = await provider.start({ prompt: 'summarise the retry logic', cwd });
    const result = await run.result;
    await run.dispose();

    assert.deepEqual(calls, []);
    assert.equal(result.stopReason, 'error');
    assert.ok(result.diagnostic.startsWith('AGY_REFUSED subagent_disabled'), result.diagnostic);
    assert.match(result.diagnostic, /disabled in the agy control panel/);
    assert.equal(readDecisions(cwd, 5)[0].reason.code, 'subagent_disabled');

    settings.writeSettings({ subagentEnabled: true });
});

test('a credential in the task text is refused rather than shipped to agy', async () => {
    settings.writeSettings({ subagentEnabled: true });
    const cwd = repo();
    const { provider, calls } = stubbedProvider();

    const run = await provider.start({ prompt: 'use GITHUB_TOKEN=ghp_abcdefghijklmnopqrstuvwx to open a PR', cwd });
    const result = await run.result;
    await run.dispose();

    assert.deepEqual(calls, []);
    assert.ok(result.diagnostic.startsWith('AGY_REFUSED secret_in_prompt'));
    const [decision] = readDecisions(cwd, 5);
    // A concrete token shape wins over the env-name label: the more specific match
    // is the more useful evidence.
    assert.equal(decision.reason.values.pattern, 'ghp_');
    // The ledger must never echo the credential itself.
    assert.equal(JSON.stringify(decision).includes('ghp_abcdefghijklmnopqrstuvwx'), false);
});

test('an admissible prompt records a spawn with its settings version', async () => {
    settings.writeSettings({ subagentEnabled: true, mode: 'staffer' });
    const cwd = repo();
    const { provider, calls } = stubbedProvider();

    const run = await provider.start({ prompt: 'summarise the retry logic', cwd });
    const result = await run.result;
    await run.dispose();

    assert.equal(result.stopReason, 'completed');
    assert.equal(result.diagnostic, undefined);
    assert.deepEqual(calls[0].slice(0, 2), ['staffer', '--prompt'], 'the companion was actually dispatched');

    const kinds = readDecisions(cwd, 5).map((entry) => entry.kind);
    assert.deepEqual(kinds, ['spawned']);
    const [spawn] = readDecisions(cwd, 5);
    assert.equal(spawn.settingsVersion, settings.settingsVersion(settings.readSettings()));
});

test('the in-flight slot is released on refusal and on completion', async () => {
    settings.writeSettings({ subagentEnabled: true });
    const { provider } = stubbedProvider();

    const refused = await provider.start({ prompt: '   ', cwd: repo() });
    await refused.result;
    await refused.dispose();
    assert.equal(provider.running.size, 0);

    const done = await provider.start({ prompt: 'summarise the retry logic', cwd: repo() });
    await done.result;
    await done.dispose();
    assert.equal(provider.running.size, 0);
});
