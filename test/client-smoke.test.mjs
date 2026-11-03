import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

/**
 * Loads the real browser bundle through a shim of the host's module loader, so a
 * typo in the panel is caught by `npm test` instead of by the user opening the
 * UI. React is stubbed: the component is executed (hooks included) but nothing is
 * diffed.
 */

const source = readFileSync(new URL('../client.js', import.meta.url), 'utf8');

/** Minimal React surface the panel touches. */
function makeReact(seed) {
    let hookIndex = 0;
    const queue = [...seed];
    const next = () => (hookIndex < queue.length ? queue[hookIndex++] : undefined);
    return {
        createElement: (type, props, ...children) => ({
            type,
            props: Object.assign({}, props ?? {}, { children: children.length <= 1 ? children[0] : children }),
            children,
        }),
        Fragment: Symbol('Fragment'),
        useState: (initial) => {
            const seeded = next();
            return [seeded === undefined ? initial : seeded, () => {}];
        },
        useEffect: () => {},
        useCallback: (fn) => fn,
        useRef: (initial) => ({ current: initial }),
    };
}

function loadBundle(seed) {
    let registration;
    const react = makeReact(seed);
    const sandbox = {
        window: {
            __ModuleLoader__: {
                load: (definition) => {
                    registration = definition;
                },
            },
        },
        document: {
            head: { appendChild: () => {} },
            body: { appendChild: () => {} },
            getElementById: () => null,
            querySelector: () => null,
            createElement: () => ({ style: {}, set textContent(v) {}, set id(v) {}, get id() { return ''; } }),
        },
        fetch: async () => ({ ok: true, status: 200, json: async () => ({ ok: true }) }),
        location: { origin: 'http://127.0.0.1' },
        console,
    };
    // eslint-disable-next-line no-new-func
    new Function('window', 'document', 'fetch', 'location', 'console', source)(sandbox.window, sandbox.document, sandbox.fetch, sandbox.location, console);
    assert.ok(registration !== undefined, 'the bundle never called __ModuleLoader__.load');
    assert.equal(registration.id, 'dsh-agy-staff');
    const exported = registration.factory((id) => {
        if (id === 'react') return react;
        throw new Error(`unexpected require("${id}")`);
    });
    return exported;
}

test('the client bundle registers itself under the package id', () => {
    const exported = loadBundle([]);
    assert.equal(exported.name, 'dsh-agy-staff');
    assert.deepEqual([...exported.inject], ['slots']);
    assert.equal(typeof exported.apply, 'function');
});

test('apply mounts the panel into shell.overlay', () => {
    const exported = loadBundle([]);
    let mounted;
    exported.apply({
        slots: {
            inject: (slotName, callback) => {
                assert.equal(slotName, 'shell.overlay');
                callback();
            },
            register: (definition, component) => {
                mounted = { definition, component };
            },
        },
    });
    assert.equal(mounted.definition.name, 'shell.overlay');
    assert.equal(mounted.definition.id, 'dsh-agy-staff-panel');
    assert.equal(typeof mounted.component, 'function');
});

test('the collapsed trigger renders without touching the network', () => {
    const exported = loadBundle([]);
    let mounted;
    exported.apply({ slots: { inject: (_n, cb) => cb(), register: (d, c) => { mounted = { definition: d, component: c }; } } });
    const tree = mounted.component({});
    assert.equal(tree.props.className, 'dsag-trigger');
    assert.deepEqual(tree.children, ['agy']);
});

test('the expanded panel renders every section', () => {
    const exported = loadBundle([
        true, // open
        { agy: { ok: true, version: 'agy 1.4.12' }, pluginVersion: '0.3.0', companion: 'D:/x/agy-companion.mjs',
          companionExists: true, settingsPath: 'D:/x/settings.json', modes: ['staffer'], efforts: ['low', 'medium', 'high'],
          defaults: { mode: 'staffer', model: '', effort: '', timeoutMs: 2700000, subagentEnabled: true, skillsEnabled: true } },
        { mode: 'staffer', model: '', effort: '', timeoutMin: 45, subagentEnabled: true, skillsEnabled: true },
        '', // busy
        '', // error
        '', // notice
        'reply with exactly: agy works',
        null, // test output
        [], // jobs
        null, // job output
        '', // cwd
    ]);
    let mounted;
    exported.apply({ slots: { inject: (_n, cb) => cb(), register: (d, c) => { mounted = { definition: d, component: c }; } } });
    const tree = mounted.component({});
    assert.equal(tree.props.className, 'dsag-panel');

    const classes = [];
    // A three-line renderer: function components are invoked, host elements are walked.
    const walk = (node) => {
        if (node === null || node === undefined || typeof node === 'boolean') return;
        if (Array.isArray(node)) { node.forEach(walk); return; }
        if (typeof node !== 'object') return;
        if (typeof node.type === 'function') { walk(node.type(node.props)); return; }
        if (typeof node.type === 'symbol') { walk(node.children ?? []); return; }
        if (node.props && typeof node.props.className === 'string') classes.push(node.props.className);
        walk(node.children ?? []);
    };
    walk(tree);
    assert.ok(classes.includes('dsag-panel'), classes.join('|'));
    assert.ok(classes.some((c) => c.startsWith('dsag-dot ok')), 'status dot did not turn green');
    assert.ok(classes.filter((c) => c === 'dsag-sec').length >= 4, 'sections missing: ' + classes.join('|'));
    assert.ok(classes.includes('dsag-trigger') === false, 'the trigger leaked into the open panel');
    assert.ok(classes.includes('dsag-mono'), 'the environment block did not render');
});
