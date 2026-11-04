/**
 * Deterministic admission for one agy delegation.
 *
 * Why a pure function: the decision has to be the same everywhere and testable
 * without a process, a repo, or a model in the loop. Every branch returns data —
 * a refusal is a value with a stable `code`, not a thrown error and not a log
 * line — so the caller can record it, surface it to the model, and keep its own
 * result contract intact.
 *
 * No IO, no side effects on import.
 *
 * @module dsh-agy-staff/agy-admission
 */
import { MODES } from './agy-settings.js';

/**
 * Hard ceiling on the task text handed to a worker. agy sends the prompt as a
 * command-line argument, so an oversized prompt fails deep inside the CLI with an
 * opaque error; refusing here keeps the diagnosis attached to the caller.
 */
export const MAX_PROMPT_CHARS = 100_000;

/** Stable refusal codes. Callers may branch on these; never renumber or rename. */
export const REASON_CODES = Object.freeze([
    'empty_prompt',
    'prompt_too_long',
    'subagent_disabled',
    'mode_unknown',
    'secret_in_prompt',
    'concurrency_exhausted',
]);

/**
 * Credential shapes worth stopping a delegation for. Each pattern aims at a value
 * that is unmistakeably a live secret rather than a mention of one: the lookbehind
 * on `sk-` keeps `risk-management-style-identifiers` from matching, for example.
 */
const SECRET_PATTERNS = Object.freeze([
    /(?<![A-Za-z0-9])sk-[A-Za-z0-9_-]{16,}/,
    /(?<![A-Za-z0-9])ghp_[A-Za-z0-9]{20,}/,
    /(?<![A-Za-z0-9])AKIA[0-9A-Z]{16}/,
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
]);

/** `.env` names that advertise a credential rather than a plain setting. */
const CREDENTIAL_NAME = /(KEY|TOKEN|SECRET|PASSWORD)/;

/**
 * Values that look like documentation instead of material: templates and
 * placeholders are what a task description normally contains, and treating them as
 * leaks would make the check unusable on real prompts.
 */
const PLACEHOLDER_VALUE = /^(x{3,}|\$|\{|%|<|changeme|your|example|placeholder|redacted|todo|none|null)/i;

/**
 * Find the first credential-looking region in `text`.
 *
 * Why return the pattern label rather than the match: the caller records decisions
 * to disk, and echoing a live key into a log would hand out the very secret the
 * check exists to stop.
 *
 * @param {unknown} text
 * @returns {string | undefined} a label such as `'sk-'`, `'env:GITHUB_TOKEN'`, or undefined
 */
export function scanSecrets(text) {
    if (typeof text !== 'string' || text === '') return undefined;

    const labels = ['sk-', 'ghp_', 'AKIA', 'private-key'];
    for (const [index, pattern] of SECRET_PATTERNS.entries()) {
        if (pattern.test(text)) return labels[index];
    }

    for (const raw of text.split(/\r?\n/)) {
        const line = raw.trim();
        const assignment = /^([A-Z0-9_]{3,})=(.*)$/.exec(line);
        if (assignment === null) continue;
        const name = assignment[1];
        const value = assignment[2].trim().replace(/^["']|["']$/g, '');
        if (!CREDENTIAL_NAME.test(name)) continue;
        if (value.length < 16) continue;
        if (PLACEHOLDER_VALUE.test(value)) continue;
        return `env:${name}`;
    }

    return undefined;
}

/** Build a refusal value so every branch has the same shape. */
function refuse(code, values) {
    return {
        admissible: false,
        reason: values === undefined ? { code } : { code, values },
    };
}

/**
 * Decide whether one delegation may proceed, in a fixed order so the first
 * failure is the one worth reporting.
 *
 * Ordering rationale: cheap structural checks first (a missing prompt makes every
 * later check meaningless), then policy (feature switch, configured mode), then
 * content scanning, then capacity — capacity last because it is the only check
 * that depends on the caller's live state rather than on the request itself.
 *
 * @param {{ prompt?: unknown, inFlight?: number, promptSource?: 'explicit' | 'inferred' }} request
 * @param {{ subagentEnabled?: boolean, mode?: string, maxConcurrent?: number }} settings
 * @returns {{ admissible: true, strength: 'explicit' | 'inferred', basis: string }
 *   | { admissible: false, reason: { code: string, values?: Record<string, unknown> } }}
 */
export function admit(request, settings) {
    const prompt = request === null || request === undefined ? undefined : request.prompt;

    if (typeof prompt !== 'string' || prompt.trim() === '') {
        return refuse('empty_prompt');
    }
    if (prompt.length > MAX_PROMPT_CHARS) {
        return refuse('prompt_too_long', { length: prompt.length, max: MAX_PROMPT_CHARS });
    }

    const policy = settings === null || settings === undefined ? {} : settings;
    if (policy.subagentEnabled === false) {
        return refuse('subagent_disabled');
    }
    if (!MODES.includes(policy.mode)) {
        return refuse('mode_unknown', { mode: policy.mode === undefined ? '' : String(policy.mode) });
    }

    const secret = scanSecrets(prompt);
    if (secret !== undefined) {
        return refuse('secret_in_prompt', { pattern: secret });
    }

    const limit = Number(policy.maxConcurrent ?? 0);
    const inFlight = Number(request.inFlight ?? 0);
    if (Number.isFinite(limit) && limit > 0 && Number.isFinite(inFlight) && inFlight >= limit) {
        return refuse('concurrency_exhausted', { limit, inFlight });
    }

    // `inferred` is reserved for a caller that composes the task text itself (a
    // label-derived prompt); today every delegation carries an explicit task.
    const strength = request.promptSource === 'inferred' ? 'inferred' : 'explicit';
    return { admissible: true, strength, basis: `prompt:${strength};mode:${policy.mode}` };
}
