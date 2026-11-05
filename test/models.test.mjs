import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

process.env.DSH_HOME = mkdtempSync(join(tmpdir(), 'agy-models-'));

const { modelCachePath, readModelCache, writeModelCache } = await import('../agy-models.js');

test('a fresh install has no catalog and that is not an error', () => {
    assert.deepEqual(readModelCache(), []);
    assert.equal(modelCachePath().includes('.dsh') || modelCachePath().includes('agy-models-'), true);
});

test('a listing round-trips and is readable by admission', () => {
    const wrote = writeModelCache([
        { id: 'gemini-4-argon-high', label: 'Gemini 4 Argon (High)' },
        'gemini-3.8-flash-medium',
    ]);
    assert.equal(wrote, true);
    // Ids only: admission compares ids, and labels are presentation.
    assert.deepEqual(readModelCache(), ['gemini-4-argon-high', 'gemini-3.8-flash-medium']);
});

test('rejects an empty or malformed listing instead of truncating the cache', () => {
    assert.equal(writeModelCache([]), false);
    assert.equal(writeModelCache(undefined), false);
    assert.equal(writeModelCache([{ label: 'no id' }, '']), false);
    assert.deepEqual(readModelCache(), ['gemini-4-argon-high', 'gemini-3.8-flash-medium']);
});

test('a corrupt cache reads as empty rather than throwing', () => {
    const file = modelCachePath();
    writeFileSync(file, '{ not json', 'utf8');
    assert.deepEqual(readModelCache(), []);
});

test('cleanup', () => {
    rmSync(process.env.DSH_HOME, { recursive: true, force: true });
});
