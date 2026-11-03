import assert from 'node:assert/strict';
import test from 'node:test';

import { createAgyProvider, NO_START_CAPABILITIES, SUBAGENT_NAME } from '../agy-subagent.js';

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
