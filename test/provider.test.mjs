import assert from 'node:assert/strict';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

// Isolate from the machine's real panel settings, then load the modules.
process.env.DSH_HOME = mkdtempSync(path.join(tmpdir(), 'agy-provider-'));

const { ASSETS_PATH, COMPANION_PATH, PREFIX, PROVIDER_NAME, provider } = await import('../index.js');
const settings = await import('../agy-settings.js');

const EXPECTED = [
    'agy-ask',
    'agy-implementer',
    'agy-jobs',
    'agy-lead',
    'agy-researcher',
    'agy-reviewer',
    'agy-staffer',
];

const posix = (value) => value.replaceAll('\\', '/').replace(/\/+$/, '');

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

test('every host-relative reference is resolved before the model sees it', async () => {
    const companion = posix(COMPANION_PATH);
    for (const candidate of await provider.list()) {
        const { content } = await provider.get(candidate);
        assert.ok(content.includes(companion), `${candidate.name} does not carry the absolute companion path`);
        assert.ok(!content.includes('<skill-dir>'), `${candidate.name} still contains <skill-dir>`);
        assert.ok(!content.includes('<plugin-root>'), `${candidate.name} still contains <plugin-root>`);
        assert.ok(!content.includes('../../companion/'), `${candidate.name} still contains ../../companion/`);
        assert.ok(!content.includes('../jobs/'), `${candidate.name} still contains ../jobs/`);
    }
});

test('the resolved companion path is quoted and runnable', async () => {
    const { content } = await provider.get({ name: 'agy-ask' });
    const line = content.split('\n').find((entry) => entry.includes('agy-companion.mjs"'));
    assert.ok(line !== undefined, 'no companion command line');
    assert.ok(line.includes(`node "${posix(COMPANION_PATH)}"`), line);
});

test('resolved references point at files that exist', async () => {
    for (const candidate of await provider.list()) {
        const { content } = await provider.get(candidate);
        for (const match of content.matchAll(/`([A-Za-z]:\/[^`\s]+\.md)`/g)) {
            const target = path.win32.normalize(match[1]);
            assert.ok(existsSync(target), `missing referenced file: ${match[1]}`);
        }
    }
});

test('the resource base still points at the vendored tree', async () => {
    const [candidate] = await provider.list();
    const skill = await provider.get(candidate);
    assert.equal(skill.resourceBase.kind, 'directory');
    assert.equal(skill.resourceBase.path, ASSETS_PATH);
});

test('unknown candidates fail loudly', async () => {
    await assert.rejects(() => provider.get({ name: 'agy-nope' }), /unknown skill/);
});

test('the prefix matches the slash menu contract', () => {
    assert.equal(PREFIX, 'agy-');
});

test('the panel toggle hides the skills', async () => {
    settings.writeSettings({ skillsEnabled: false });
    assert.deepEqual(await provider.list(), []);
    await assert.rejects(() => provider.get({ name: 'agy-ask' }), /disabled in the agy control panel/);
    settings.writeSettings({ skillsEnabled: true });
    assert.equal((await provider.list()).length, 7);
});