import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

process.env.DSH_HOME = mkdtempSync(join(tmpdir(), 'agy-version-'));

const { DELEGATION_KEYS, DEFAULTS, readSettings, settingsVersion, writeSettings } = await import('../agy-settings.js');

test('the fingerprint covers exactly the delegation-relevant keys', () => {
    assert.deepEqual(
        [...DELEGATION_KEYS],
        ['mode', 'model', 'effort', 'timeoutMs', 'waitSliceSeconds', 'pollMs', 'subagentEnabled'],
    );
    // Toggling which skills the menu lists cannot invalidate a live delegation.
    assert.equal(DELEGATION_KEYS.includes('skillsEnabled'), false);
    assert.equal(DELEGATION_KEYS.includes('maxConcurrent'), false);
});

test('the version is twelve hex characters and stable for equal settings', () => {
    const version = settingsVersion(readSettings());
    assert.match(version, /^[0-9a-f]{12}$/);
    assert.equal(version, settingsVersion(readSettings()));
    assert.equal(settingsVersion(undefined), settingsVersion(DEFAULTS));
});

test('a delegation setting changes the version', () => {
    const before = settingsVersion(readSettings());
    writeSettings({ timeoutMs: 600_000 });
    const after = settingsVersion(readSettings());
    assert.notEqual(after, before, 'timeoutMs is part of the fingerprint');
});

test('a non-delegation setting leaves the version alone', () => {
    const before = settingsVersion(readSettings());
    writeSettings({ skillsEnabled: false });
    assert.equal(settingsVersion(readSettings()), before, 'skillsEnabled must not invalidate a run');
    writeSettings({ skillsEnabled: true });
});

test('maxConcurrent is an integer 0..8 that defaults to unlimited', () => {
    assert.equal(DEFAULTS.maxConcurrent, 0);
    assert.equal(readSettings().maxConcurrent, 0);
    assert.equal(writeSettings({ maxConcurrent: 3 }).maxConcurrent, 3);
    assert.throws(() => writeSettings({ maxConcurrent: 9 }), /maxConcurrent/);
    assert.throws(() => writeSettings({ maxConcurrent: -1 }), /maxConcurrent/);
    assert.throws(() => writeSettings({ maxConcurrent: 1.5 }), /maxConcurrent/);
    assert.throws(() => writeSettings({ maxConcurrent: 'x' }), /maxConcurrent/);
    writeSettings({ maxConcurrent: 0 });
});
