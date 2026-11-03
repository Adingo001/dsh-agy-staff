import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

// Isolate from the machine's real panel settings, then load the modules.
process.env.DSH_HOME = mkdtempSync(join(tmpdir(), 'agy-subagent-'));
process.env.DSH_AGY_SUBAGENT_MODE = '';

const { createAgyProvider, NO_START_CAPABILITIES, SUBAGENT_NAME } = await import('../agy-subagent.js');
const settings = await import('../agy-settings.js');

const provider = createAgyProvider();

test('advertises itself as a fresh, capability-free out-of-process child', () => {
    assert.equal(provider.name, SUBAGENT_NAME);
    assert.equal(provider.inheritsParentContext, false);
    assert.deepEqual(provider.capabilities, NO_START_CAPABILITIES);
    assert.equal(typeof provider.start, 'function');
});

test('an empty prompt fails the activation instead of spawning agy', async () => {
    const run = await provider.start({ prompt: '   ', cwd: process.cwd() });
    assert.match(run.id, /^agy-/);
    const result = await run.result;
    assert.equal(result.stopReason, 'error');
    assert.match(result.diagnostic ?? '', /non-empty prompt/);
    await run.dispose();
});

test('an already-aborted request settles as aborted', async () => {
    const controller = new AbortController();
    controller.abort(new Error('test'));
    const run = await provider.start({ prompt: 'anything', cwd: process.cwd(), signal: controller.signal });
    const result = await run.result;
    assert.equal(result.stopReason, 'aborted');
    await run.dispose();
});

test('dispose is idempotent', async () => {
    const run = await provider.start({ prompt: '', cwd: process.cwd() });
    await run.result;
    const first = run.dispose();
    const second = run.dispose();
    assert.equal(first, second);
    await first;
});

test('the panel toggle disables delegations without spawning anything', async () => {
    settings.writeSettings({ subagentEnabled: false });
    const run = await provider.start({ prompt: 'anything at all', cwd: process.cwd() });
    const result = await run.result;
    assert.equal(result.stopReason, 'error');
    assert.match(result.diagnostic ?? '', /disabled in the agy control panel/);
    await run.dispose();
    settings.writeSettings({ subagentEnabled: true });
});

test('a delegation picks up the panel mode, model and effort', async () => {
    settings.writeSettings({ mode: 'research', model: 'gemini-3.8-flash-high' });
    const live = provider.settings();
    assert.equal(live.mode, 'research');
    assert.equal(live.model, 'gemini-3.8-flash-high');
    assert.equal(live.enabled, true);
    settings.writeSettings({ mode: 'staffer', model: '' });
});