/**
 * agy-staff for DeepSeek Harness.
 *
 * Two surfaces, one bundle:
 *
 *  1. Seven `/agy-<persona>` skills served by a bundled skill provider. The
 *     vendored bodies live under `assets/`, and every reference they contain is
 *     resolved to an ABSOLUTE path at load time: the model gets the companion
 *     command verbatim and never has to search the filesystem for it.
 *  2. An `agy` subagent provider (see `./agy-subagent.js`), so a delegation can
 *     target the Antigravity CLI as a first-class child instead of a shell
 *     command the model has to assemble itself.
 *
 * @module dsh-agy-staff
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createAgyProvider } from './agy-subagent.js';
import { readSettings } from './agy-settings.js';

/** Provider id, also the `provider` field of every candidate. */
const PROVIDER_NAME = 'agy-staff';

/** Slash prefix. dsh matches the `/` menu against skill names and has no namespace. */
const PREFIX = 'agy-';

/** Precedence of a packaged provider (mirrors BUNDLED_SKILL_RANK in @deepseek-ai/dsh-skill). */
const BUNDLED_SKILL_RANK = 600;

const SOURCE = 'bundled';

const PACKAGE_ROOT = fileURLToPath(new URL('.', import.meta.url));
const ASSETS_PATH = fileURLToPath(new URL('./assets/', import.meta.url));
const SKILLS_PATH = fileURLToPath(new URL('./assets/skills/', import.meta.url));
const COMPANION_PATH = fileURLToPath(new URL('./assets/companion/agy-companion.mjs', import.meta.url));
const DOCS_PATH = fileURLToPath(new URL('./assets/docs/REFERENCE.md', import.meta.url));

/** Hand the model the vendored tree so relative references in the bodies resolve. */
const RESOURCE_BASE = Object.freeze({ kind: 'directory', path: ASSETS_PATH });

const FRONTMATTER = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

/** Forward slashes: the bodies embed these paths in bash and PowerShell blocks. */
function posix(value) {
    return value.replaceAll('\\', '/').replace(/\/+$/, '');
}

/**
 * Split a SKILL.md into its frontmatter fields and body.
 * @param {string} text
 * @returns {{ fields: Map<string, string>, body: string }}
 */
function parseSkillFile(text) {
    const match = FRONTMATTER.exec(text);
    if (!match) return { fields: new Map(), body: text };

    const fields = new Map();
    for (const line of match[1].split(/\r?\n/)) {
        const pair = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
        if (pair) fields.set(pair[1], pair[2].trim().replace(/^['"]|['"]$/g, ''));
    }
    return { fields, body: text.slice(match[0].length) };
}

/**
 * Upstream speaks its hosts' namespace syntax (`/agy:ask`, `$agy:ask`); under
 * dsh the same skill is invoked as `/agy-ask`. Keep the prose truthful.
 * @param {string} value
 */
function localize(value) {
    return value.replaceAll('/agy:', '/agy-');
}

/**
 * Replace every installation-relative reference the vendored bodies carry with
 * an absolute one. Upstream writes `<skill-dir>/../../companion/...` and leaves
 * the resolution to the host; dsh hands the model a base directory and the
 * upstream prose then reads as a riddle ("skill dir is assets\ask?"), which is
 * exactly how a agent ends up globbing for the companion on every single run.
 * Resolving here makes the command runnable as written, first try, every time.
 *
 * @param {string} body - vendored body, already localized.
 * @param {string} persona - skill directory name, e.g. `ask`.
 * @returns {string}
 */
function absolutize(body, persona) {
    const skillDir = posix(path.join(SKILLS_PATH, persona));
    const assets = posix(ASSETS_PATH);
    const pkg = posix(PACKAGE_ROOT);
    const companion = posix(COMPANION_PATH);

    let out = body
        .replaceAll('<skill-dir>/../../companion/agy-companion.mjs', companion)
        .replaceAll(`<plugin-root>/skills/${persona}/SKILL.md`, `${skillDir}/SKILL.md`)
        .replaceAll('<skill-dir>', skillDir)
        .replaceAll('<plugin-root>', pkg);

    // Any remaining backticked `../x/y.md` reference is a real file next to this
    // skill; resolve it against the skill directory instead of the resource base.
    out = out.replace(/`((?:\.\.\/)+[\w./-]+\.md)`/g, (_match, reference) => {
        return `\`${posix(path.resolve(skillDir, reference))}\``;
    });
    out = out.replace(/`((?:\.\.\/)+companion\/[\w./-]+)`/g, (_match, reference) => {
        return `\`${posix(path.resolve(skillDir, reference))}\``;
    });

    const preamble = [
        `> **Resolved for this install** — these are absolute; do not search for them, and do not read the vendored \`SKILL.md\` to re-derive them:`,
        `> - companion: \`node "${companion}" <mode> ...\``,
        `> - this skill's files: \`${skillDir}/\``,
        `> - shared docs: \`${posix(DOCS_PATH)}\``,
        `> - package root: \`${assets}/\``,
        '',
        '',
    ].join('\n');

    return `${preamble}${out}`;
}

/**
 * Every command in the vendored bodies that points at the companion, kept in one
 * place so the localization above cannot silently drift from the file layout.
 * @param {string} body
 * @returns {boolean}
 */
function mentionsCompanion(body) {
    return body.includes('agy-companion.mjs');
}

let cache;

/**
 * Read every vendored persona once. The assets ship with the package, so a
 * process-lifetime cache is enough; reinstall or reload to pick up changes.
 */
async function loadSkills() {
    cache ??= (async () => {
        const entries = await readdir(SKILLS_PATH, { withFileTypes: true });
        const personas = entries
            .filter((entry) => entry.isDirectory())
            .map((entry) => entry.name)
            .sort();

        const skills = [];
        for (const persona of personas) {
            const locator = fileURLToPath(new URL(`./assets/skills/${persona}/SKILL.md`, import.meta.url));
            const { fields, body } = parseSkillFile(await readFile(locator, 'utf8'));
            const description = localize(fields.get('description') ?? '').trim();
            if (!description) throw new Error(`dsh-agy-staff: assets/skills/${persona}/SKILL.md has no description`);

            const resolved = localize(body);
            skills.push({
                candidate: {
                    name: `${PREFIX}${persona}`,
                    description,
                    invocation: { modelInvocable: true, userInvocable: true },
                    source: SOURCE,
                    provider: PROVIDER_NAME,
                    resourceBase: RESOURCE_BASE,
                    rank: BUNDLED_SKILL_RANK,
                    locator,
                },
                body: mentionsCompanion(resolved) ? absolutize(resolved, persona) : resolved,
            });
        }

        if (skills.length === 0) throw new Error('dsh-agy-staff: assets/skills is empty');
        return skills;
    })();

    return cache;
}

const provider = {
    name: PROVIDER_NAME,

    async list() {
        if (!readSettings().skillsEnabled) return [];
        return (await loadSkills()).map((skill) => skill.candidate);
    },

    async get(candidate) {
        if (!readSettings().skillsEnabled) throw new Error('dsh-agy-staff: skills are disabled in the agy control panel');
        const skill = (await loadSkills()).find((entry) => entry.candidate.name === candidate.name);
        if (skill === undefined) throw new Error(`dsh-agy-staff: unknown skill "${candidate.name}"`);

        return {
            name: skill.candidate.name,
            description: skill.candidate.description,
            invocation: skill.candidate.invocation,
            source: skill.candidate.source,
            provider: skill.candidate.provider,
            resourceBase: skill.candidate.resourceBase,
            content: skill.body,
        };
    },
};

/** Cordis plugin name. */
const name = 'dsh-agy-staff';

/** The skill registry this bundle feeds; `subagents` is injected lazily below. */
const inject = ['skills'];

/**
 * `ctx.subagents.registerProvider()` owns its effect on the *service's* context, not
 * on ours, so registering the same name twice throws `a subagent provider named
 * "agy" is already registered` - and that failure takes the whole bundle row down
 * with it. Rather than reason about when this module gets evaluated twice, register
 * at most once per process.
 *
 * The same conclusion, reached independently, is documented in
 * dsh-multitask/lib/worker-providers.js.
 */
let subagentRegistered = false;

/**
 * @param {{ skills: { registerProvider: (factory: () => unknown) => void },
 *   inject: Function }} ctx
 */
function apply(ctx) {
    ctx.skills.registerProvider(() => provider);
    ctx.inject(['subagents'], (subagentsCtx) => {
        if (subagentRegistered) return;
        subagentRegistered = true;
        subagentsCtx.subagents.registerProvider(createAgyProvider());
    });
}

export {
    absolutize,
    apply,
    ASSETS_PATH,
    COMPANION_PATH,
    inject,
    name,
    provider,
    PROVIDER_NAME,
    PREFIX,
};
