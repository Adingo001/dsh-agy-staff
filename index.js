/**
 * Bundled agy-staff skill provider for DeepSeek Harness.
 *
 * Seven personas from keli-wen/agy-staff (MIT) — staffer, researcher, reviewer,
 * implementer, lead, jobs, ask — registered as `/agy-<persona>` skills. The
 * vendored bodies live under `assets/`, which is also the resource base handed
 * to the model: `<skill-dir>/../../companion/agy-companion.mjs`,
 * `../jobs/SKILL.md` and `../../docs/REFERENCE.md` therefore resolve exactly as
 * upstream wrote them.
 *
 * @module dsh-agy-staff
 */
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

/** Provider id, also the `provider` field of every candidate. */
const PROVIDER_NAME = 'agy-staff';

/** Slash prefix. dsh matches the `/` menu against skill names and has no namespace. */
const PREFIX = 'agy-';

/** Precedence of a packaged provider (mirrors BUNDLED_SKILL_RANK in @deepseek-ai/dsh-skill). */
const BUNDLED_SKILL_RANK = 600;

const SOURCE = 'bundled';

const ASSETS_PATH = fileURLToPath(new URL('./assets/', import.meta.url));
const SKILLS_PATH = fileURLToPath(new URL('./assets/skills/', import.meta.url));

/** Hand the model the vendored tree so relative references in the bodies resolve. */
const RESOURCE_BASE = Object.freeze({ kind: 'directory', path: ASSETS_PATH });

const FRONTMATTER = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

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
                body: localize(body),
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
        return (await loadSkills()).map((skill) => skill.candidate);
    },

    async get(candidate) {
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

/** The skill registry this bundle feeds. */
const inject = ['skills'];

/**
 * @param {{ skills: { registerProvider: (factory: () => unknown) => void } }} ctx
 */
function apply(ctx) {
    ctx.skills.registerProvider(() => provider);
}

export { apply, inject, name, provider, PROVIDER_NAME, PREFIX, ASSETS_PATH };
