import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

// Isolate from the machine's real panel settings before the module loads.
process.env.DSH_HOME = mkdtempSync(join(tmpdir(), 'agy-register-'));

const plugin = await import('../index.js');

/**
 * The cordis rule that bites: `ctx.subagents.registerProvider()` owns its effect on
 * the service's context, so a second registration of the same name throws and takes
 * the whole bundle row down. These tests pin the once-per-process guard around it.
 */
function fakeContext() {
    const calls = { skills: 0, subagents: 0, injected: [] };
    const ctx = {
        skills: {
            registerProvider: () => {
                calls.skills += 1;
            },
        },
        inject: (services, callback) => {
            calls.injected.push(services.join(','));
            callback({ subagents: { registerProvider: () => { calls.subagents += 1; } } });
        },
    };
    return { ctx, calls };
}

test('the first apply registers the skill and subagent providers', () => {
    const { ctx, calls } = fakeContext();
    plugin.apply(ctx);
    assert.equal(calls.skills, 1);
    assert.equal(calls.subagents, 1);
    assert.deepEqual(calls.injected, ['subagents']);
});

test('a second apply of the same module never registers the subagent provider again', () => {
    const { ctx, calls } = fakeContext();
    plugin.apply(ctx);
    plugin.apply(ctx);
    // The skills registry tolerates a repeated factory; the subagent registry does not.
    assert.equal(calls.skills, 2);
    assert.equal(calls.subagents, 0, 'the duplicate registration would throw in the real registry');
});

test('the plugin keeps its cordis identity', () => {
    assert.equal(plugin.name, 'dsh-agy-staff');
    assert.deepEqual([...plugin.inject], ['skills']);
    assert.equal(typeof plugin.apply, 'function');
});
