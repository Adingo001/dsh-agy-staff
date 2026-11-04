import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { DECISION_KINDS, ledgerPath, readDecisions, record } from '../agy-ledger.js';

const repo = () => mkdtempSync(join(tmpdir(), 'agy-ledger-'));

test('keeps the six decision kinds the admission layer can produce', () => {
    assert.deepEqual(
        [...DECISION_KINDS],
        ['refused', 'would_delegate', 'deduped', 'spawned', 'settings_drifted', 'still_running'],
    );
});

test('creates the state directory on first write', () => {
    const cwd = repo();
    assert.equal(record(cwd, { kind: 'refused', reason: { code: 'empty_prompt' } }), true);
    assert.equal(statSync(ledgerPath(cwd)).isFile(), true);
});

test('round-trips non-ASCII content without mangling it', () => {
    const cwd = repo();
    record(cwd, { kind: 'refused', reason: { code: 'secret_in_prompt', values: { pattern: 'env:密钥_KEY' } }, basis: '准入 🚫' });
    record(cwd, { kind: 'spawned', basis: 'prompt:explicit;mode:staffer', settingsVersion: 'abc123def456' });

    const entries = readDecisions(cwd, 10);
    assert.equal(entries.length, 2);
    assert.equal(entries[0].basis, '准入 🚫');
    assert.equal(entries[0].reason.values.pattern, 'env:密钥_KEY');
    assert.equal(entries[1].settingsVersion, 'abc123def456');
    // The file itself must stay valid UTF-8 JSONL.
    const raw = readFileSync(ledgerPath(cwd), 'utf8').trim().split('\n');
    assert.equal(raw.length, 2);
    assert.equal(JSON.parse(raw[0]).basis, '准入 🚫');
});

test('fills identity fields the caller omits and normalizes unknown kinds', () => {
    const cwd = repo();
    record(cwd, { kind: 'not-a-kind' });
    const [entry] = readDecisions(cwd, 1);
    assert.match(entry.id, /^[0-9a-f-]{36}$/);
    assert.match(entry.at, /^\d{4}-\d{2}-\d{2}T/);
    assert.equal(entry.kind, 'would_delegate');
});

test('readDecisions returns the newest slice in file order', () => {
    const cwd = repo();
    for (let i = 0; i < 6; i += 1) record(cwd, { kind: 'spawned', jobId: `job-${i}` });

    const lastTwo = readDecisions(cwd, 2);
    assert.deepEqual(lastTwo.map((entry) => entry.jobId), ['job-4', 'job-5']);

    const all = readDecisions(cwd, 50);
    assert.equal(all.length, 6);
    assert.equal(all[0].jobId, 'job-0');
});

test('a truncated trailing line does not make the history unreadable', () => {
    const cwd = repo();
    record(cwd, { kind: 'spawned', jobId: 'a' });
    globalThis.__agyLedgerNoop = undefined;
    const file = ledgerPath(cwd);
    writeFileSync(file, `${readFileSync(file, 'utf8')}{"kind":"spaw`, 'utf8');

    const entries = readDecisions(cwd, 10);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].jobId, 'a');
});

test('a missing ledger is an empty history, not an error', () => {
    assert.deepEqual(readDecisions(repo(), 10), []);
    assert.deepEqual(readDecisions(undefined, 10), []);
});

test('an unwritable location degrades to false instead of failing the delegation', () => {
    const cwd = repo();
    // Make the path a plain file so `.agy-staff` cannot be created underneath it.
    const blocker = join(cwd, 'blocker');
    writeFileSync(blocker, 'x', 'utf8');
    assert.equal(record(join(blocker, 'nested'), { kind: 'refused' }), false);
    assert.equal(record('', { kind: 'refused' }), false);
});
