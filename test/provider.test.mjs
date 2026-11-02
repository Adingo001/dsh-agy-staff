import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { ASSETS_PATH, PREFIX, PROVIDER_NAME, provider } from '../index.js';

const EXPECTED = [
    'agy-ask',
    'agy-implementer',
    'agy-jobs',
    'agy-lead',
    'agy-researcher',
    'agy-reviewer',
    'agy-staffer',
];

test('lists every persona under the agy- prefix', async () => {
    const candidates = await provider.list();
    assert.deepEqual(candidates.map((candidate) => candidate.name), EXPECTED);
    for (const candidate of candidates) {
        assert.equal(candidate.provider, PROVIDER_NAME);
        assert.equal(candidate.rank, 600);
        assert.equal(candidate.invocation.userInvocable, true);
        assert.equal(candidate.invocation.modelInvocable, true);
        assert.ok(candidate.description.length > 0, `${candidate.name} has no description`);
    }
});

test('descriptions and bodies speak dsh syntax, not the host namespace', async () => {
    for (const candidate of await provider.list()) {
        assert.ok(!candidate.description.includes('/agy:'), `${candidate.name} description still says /agy:`);
        const skill = await provider.get(candidate);
        assert.ok(!skill.content.includes('/agy:'), `${candidate.name} body still says /agy:`);
    }
});

test('bodies arrive without frontmatter', async () => {
    const [candidate] = await provider.list();
    const skill = await provider.get(candidate);
    assert.ok(!skill.content.startsWith('---'), 'frontmatter leaked into the body');
    assert.ok(!/^name:/m.test(skill.content));
});

test('relative references resolve from the resource base', () => {
    const fromAsk = (relative) => path.join(ASSETS_PATH, 'skills', 'ask', relative);
    assert.ok(existsSync(fromAsk('../../companion/agy-companion.mjs')), 'companion unreachable');
    assert.ok(existsSync(fromAsk('../../docs/REFERENCE.md')), 'docs/REFERENCE.md unreachable');
    assert.ok(existsSync(fromAsk('../jobs/SKILL.md')), 'sibling persona unreachable');
    assert.ok(existsSync(fromAsk('../jobs/references/setup.md')), 'persona references unreachable');
});

test('ask body keeps the companion invocation contract', async () => {
    const skill = await provider.get({ name: 'agy-ask' });
    assert.match(skill.content, /companion\/agy-companion\.mjs" ask/);
});

test('unknown candidates fail loudly', async () => {
    await assert.rejects(() => provider.get({ name: 'agy-nope' }), /unknown skill/);
});
