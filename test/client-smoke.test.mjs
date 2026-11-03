import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

/**
 * Loads the real browser bundle through a shim of the host's module loader, so a
 * typo in the panel is caught by `npm test` instead of by the user opening the
 * UI. React is stubbed: components execute (hooks included) but nothing is diffed.
 */

const source = readFileSync(new URL('../client.js', import.meta.url), 'utf8');

/** Minimal React surface the panel touches. */
function makeReact(seed = []) {
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

function makeDocument() {
    return {
        head: { appendChild: () => {} },
        body: { appendChild: () => {} },
        getElementById: () => null,
        querySelector: () => null,
        querySelectorAll: () => [],
        createElement: () => ({ style: {}, className: '', setAttribute: () => {}, appendChild: () => {} }),
        elementFromPoint: () => null,
    };
}

function loadBundle(options = {}) {
    const { seed = [], exposeReactDom = true, document = makeDocument() } = options;
    let registration;
    const react = makeReact(seed);
    const reactDom = exposeReactDom ? { createPortal: (node) => node } : undefined;
    const window = {
        innerWidth: 1440,
        innerHeight: 900,
        addEventListener: () => {},
        removeEventListener: () => {},
        __ModuleLoader__: {
            load: (definition) => {
                registration = definition;
            },
        },
    };
    // eslint-disable-next-line no-new-func
    new Function('window', 'document', 'fetch', 'location', 'console', source)(
        window,
        document,
        async () => ({ ok: true, status: 200, json: async () => ({ ok: true }) }),
        { origin: 'http://127.0.0.1' },
        console,
    );
    assert.ok(registration !== undefined, 'the bundle never called __ModuleLoader__.load');
    assert.equal(registration.id, 'dsh-agy-staff');
    return registration.factory((id) => {
        if (id === 'react') return react;
        if (id === 'react-dom') {
            if (reactDom === undefined) throw new Error('no react-dom');
            return reactDom;
        }
        throw new Error(`unexpected require("${id}")`);
    });
}

function mount(bundle) {
    let mounted;
    bundle.apply({
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
    return mounted;
}

/** A four-line renderer: function components run, host elements are collected. */
function collect(node, classes = []) {
    if (node === null || node === undefined || typeof node === 'boolean' || typeof node === 'string') return classes;
    if (Array.isArray(node)) {
        node.forEach((child) => collect(child, classes));
        return classes;
    }
    if (typeof node !== 'object') return classes;
    if (typeof node.type === 'function') {
        collect(node.type(node.props), classes);
        return classes;
    }
    if (node.props && typeof node.props.className === 'string') {
        node.props.className.split(/\s+/).filter(Boolean).forEach((name) => classes.push(name));
    }
    collect(node.children ?? [], classes);
    return classes;
}

test('the client bundle registers itself under the package id', () => {
    const exported = loadBundle();
    assert.equal(exported.name, 'dsh-agy-staff');
    assert.deepEqual([...exported.inject], ['slots']);
    assert.equal(typeof exported.apply, 'function');
});

test('apply mounts into shell.overlay', () => {
    const mounted = mount(loadBundle());
    assert.equal(mounted.definition.name, 'shell.overlay');
    assert.equal(mounted.definition.id, 'dsh-agy-staff-panel');
    assert.equal(typeof mounted.component, 'function');
});

test('the strip entry renders as a tab button, not a floating pill', () => {
    const mounted = mount(loadBundle());
    const classes = collect(mounted.component({}));
    assert.ok(classes.includes('dsag-tab-btn'), classes.join('|'));
    assert.ok(!classes.includes('dsag-trigger'), 'the floating pill is gone');
});

test('without a portal host the entry renders nothing instead of throwing', () => {
    const mounted = mount(loadBundle({ exposeReactDom: false }));
    assert.equal(mounted.component({}), null);
});

test('the stylesheet ships native tab affordances and host design tokens', () => {
    assert.match(source, /\.dsag-tab-btn\.on:after\{/);
    assert.match(source, /--dsw-alias-brand-primary/);
    assert.match(source, /--dsw-alias-bg-layer-2/);
    assert.ok(!/\.dsag-trigger\{/.test(source), 'the old floating trigger CSS is gone');
});

test('themability comes from host tokens, not from the OS preference', () => {
    // The host tokens already switch with the app theme; a prefers-color-scheme
    // block would flip the panel to dark on a light UI whenever the OS is dark.
    assert.ok(!/@media\s*\(prefers-color-scheme/.test(source), 'no OS-driven theme block');
    const tokens = new Set((source.match(/--dsw-alias-[a-z0-9-]+/g) ?? []));
    const known = new Set([
        '--dsw-alias-bg-base', '--dsw-alias-bg-layer-1', '--dsw-alias-bg-layer-2', '--dsw-alias-bg-layer-3',
        '--dsw-alias-settings-card-fill', '--dsw-alias-markdown-code-block',
        '--dsw-alias-label-primary', '--dsw-alias-label-secondary', '--dsw-alias-label-tertiary',
        '--dsw-alias-label-caption', '--dsw-alias-label-primary-inverted',
        '--dsw-alias-border-l1', '--dsw-alias-border-l2', '--dsw-alias-border-l3',
        '--dsw-alias-brand-primary', '--dsw-alias-button-primary-fill', '--dsw-alias-link',
        '--dsw-alias-state-success-primary', '--dsw-alias-state-error-primary', '--dsw-alias-state-warn-primary',
        '--dsw-alias-interactive-bg-hover',
    ]);
    for (const token of tokens) {
        assert.ok(known.has(token), `unknown host token: ${token}`);
    }
});
