import assert from 'node:assert/strict';
import test from 'node:test';

import { admit, MAX_PROMPT_CHARS, REASON_CODES, scanSecrets } from '../agy-admission.js';

/** A settings object that passes every non-prompt rule. */
const ok = { subagentEnabled: true, mode: 'staffer', maxConcurrent: 0 };
const asked = (prompt, settings = ok, extra = {}) => admit({ prompt, ...extra }, settings);

test('exposes one stable code per refusal branch', () => {
    assert.deepEqual(
        [...REASON_CODES],
        ['empty_prompt', 'prompt_too_long', 'subagent_disabled', 'mode_unknown', 'secret_in_prompt', 'concurrency_exhausted'],
    );
});

test('empty_prompt covers blank and non-string prompts', () => {
    for (const prompt of ['', '   ', '\n\t ', undefined, null, 42, {}]) {
        const verdict = asked(prompt);
        assert.equal(verdict.admissible, false);
        assert.equal(verdict.reason.code, 'empty_prompt');
    }
});

test('prompt_too_long trips one character past the ceiling', () => {
    assert.equal(admit({ prompt: 'a'.repeat(MAX_PROMPT_CHARS) }, ok).admissible, true);

    const verdict = asked('a'.repeat(MAX_PROMPT_CHARS + 1));
    assert.equal(verdict.reason.code, 'prompt_too_long');
    assert.deepEqual(verdict.reason.values, { length: MAX_PROMPT_CHARS + 1, max: MAX_PROMPT_CHARS });
});

test('subagent_disabled reads the feature switch, not a missing value', () => {
    assert.equal(asked('do it', { ...ok, subagentEnabled: false }).reason.code, 'subagent_disabled');
    // `undefined` means "not configured", which must not be mistaken for "off".
    assert.equal(asked('do it', { ...ok, subagentEnabled: undefined }).admissible, true);
});

test('mode_unknown rejects anything outside the companion modes', () => {
    assert.equal(asked('do it', { ...ok, mode: 'nope' }).reason.code, 'mode_unknown');
    assert.equal(asked('do it', { ...ok, mode: undefined }).reason.code, 'mode_unknown');
    for (const mode of ['staffer', 'research', 'review', 'implement', 'ask']) {
        assert.equal(asked('do it', { ...ok, mode }).admissible, true, mode);
    }
});

test('concurrency_exhausted only applies when a limit is configured', () => {
    const limited = { ...ok, maxConcurrent: 2 };
    assert.equal(admit({ prompt: 'go', inFlight: 1 }, limited).admissible, true);

    const verdict = admit({ prompt: 'go', inFlight: 2 }, limited);
    assert.equal(verdict.admissible, false);
    assert.equal(verdict.reason.code, 'concurrency_exhausted');
    assert.deepEqual(verdict.reason.values, { limit: 2, inFlight: 2 });

    // 0 means unlimited, which is the default and must never refuse.
    assert.equal(admit({ prompt: 'go', inFlight: 99 }, { ...ok, maxConcurrent: 0 }).admissible, true);
});

test('an admissible verdict carries strength and basis for the ledger', () => {
    const verdict = asked('summarise the retry logic');
    assert.equal(verdict.admissible, true);
    assert.equal(verdict.strength, 'explicit');
    assert.match(verdict.basis, /prompt:explicit;mode:staffer/);

    const inferred = admit({ prompt: 'summarise it', promptSource: 'inferred' }, ok);
    assert.equal(inferred.strength, 'inferred');
});

test('scanSecrets catches five credential shapes', () => {
    const positives = [
        'use sk-proj-abcdefghijklmnop0123 to call the API',
        'GITHUB=ghp_abcdefghijklmnopqrstuvwx',
        'aws key AKIAABCDEFGHIJKLMNOP here',
        '-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----',
        'STRIPE_SECRET_KEY=sk_live_51Habcdefghijklmnop\nrest of the file',
    ];
    for (const text of positives) {
        assert.notEqual(scanSecrets(text), undefined, text.slice(0, 32));
    }

    assert.equal(scanSecrets('key sk-proj-abcdefghijklmnop0123 tail'), 'sk-');
    assert.equal(scanSecrets('GITHUB=ghp_abcdefghijklmnopqrstuvwx'), 'ghp_');
    assert.equal(scanSecrets('aws key AKIAABCDEFGHIJKLMNOP here'), 'AKIA');
    assert.equal(scanSecrets('-----BEGIN RSA PRIVATE KEY-----'), 'private-key');
    assert.equal(scanSecrets('STRIPE_SECRET_KEY=sk_live_51Habcdefghijklmnop\nrest'), 'env:STRIPE_SECRET_KEY');
});

test('scanSecrets leaves ordinary prose and placeholders alone', () => {
    const negatives = [
        'Read process.env.STRIPE_KEY and report whether it is set.',
        'The "token" field is optional in this config.',
        'Fill in <TOKEN> before running; the placeholder is fine.',
        'Refactor the tokenize() helper and its 3 call sites.',
        'RISK-management-style-identifiers-are-fine-here',
        'GITHUB_TOKEN=<TOKEN>',
        'AWS_SECRET_ACCESS_KEY=changeme',
        'API_KEY=short',
    ];
    for (const text of negatives) {
        assert.equal(scanSecrets(text), undefined, text);
    }
});
