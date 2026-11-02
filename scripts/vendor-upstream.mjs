#!/usr/bin/env node
/**
 * Re-vendor the agy-staff assets bundled in this package.
 *
 *   node scripts/vendor-upstream.mjs [--from <checkout>] [--dry-run]
 *
 * Locates a keli-wen/agy-staff checkout (default: ../agy-staff next to this
 * repo, then $DSH_AGY_UPSTREAM, then a few conventional paths), copies
 * skills/, companion/, templates/ and the three reference docs into assets/,
 * and records the pinned upstream commit in assets/UPSTREAM-COMMIT.
 */
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const assets = path.join(root, 'assets');

const DOCS = ['REFERENCE.md', 'REFERENCE.zh-CN.md', 'DESIGN.md'];

const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry-run');
const fromFlag = argv.indexOf('--from');
const explicit = fromFlag === -1 ? undefined : argv[fromFlag + 1];

function candidates() {
    const list = [];
    if (explicit) list.push(explicit);
    if (process.env.DSH_AGY_UPSTREAM) list.push(process.env.DSH_AGY_UPSTREAM);
    list.push(
        path.resolve(root, '..', 'agy-staff'),
        path.join(homedir(), 'agy-staff'),
        path.join(homedir(), '.agy-staff'),
        'D:\\project\\agy-staff',
    );
    return list;
}

function isCheckout(dir) {
    return existsSync(path.join(dir, 'skills')) && existsSync(path.join(dir, 'companion', 'agy-companion.mjs'));
}

const upstream = candidates().find((dir) => dir && isCheckout(dir));
if (!upstream) {
    console.error('agy-staff checkout not found; pass --from <path> or set DSH_AGY_UPSTREAM');
    process.exit(1);
}

let head = 'unknown';
try {
    head = execFileSync('git', ['-C', upstream, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
} catch {
    console.warn(`warning: ${upstream} is not a git checkout; the pinned commit stays unknown`);
}

const plan = ['skills', 'companion', 'templates', ...DOCS.map((doc) => path.join('docs', doc))];
const before = existsSync(path.join(assets, 'UPSTREAM-COMMIT'))
    ? (await readFile(path.join(assets, 'UPSTREAM-COMMIT'), 'utf8')).trim()
    : '(none)';

console.log(`upstream : ${upstream}`);
console.log(`commit   : ${before} -> ${head}`);
console.log(`target   : ${assets}`);

if (dryRun) {
    console.log(`would copy: ${plan.join(', ')}`);
    process.exit(0);
}

// Only clear what upstream owns: assets/logo and assets/badges are ours.
for (const relative of [...plan, 'UPSTREAM-LICENSE', 'UPSTREAM-COMMIT']) {
    await rm(path.join(assets, relative), { recursive: true, force: true });
}
await mkdir(assets, { recursive: true });

for (const relative of plan) {
    const source = path.join(upstream, relative);
    if (!existsSync(source)) {
        console.warn(`warning: missing upstream path, skipped: ${relative}`);
        continue;
    }
    await cp(source, path.join(assets, relative), { recursive: true });
}

await cp(path.join(upstream, 'LICENSE'), path.join(assets, 'UPSTREAM-LICENSE'));
await writeFile(path.join(assets, 'UPSTREAM-COMMIT'), `${head}\n`, 'utf8');

const personas = (await readdir(path.join(assets, 'skills'), { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

console.log(`done     : ${personas.length} personas (${personas.join(', ')})`);
console.log('next     : update NOTICE + README if the persona list changed, then run npm test');
