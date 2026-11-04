/**
 * The decision ledger: one append-only JSONL file per repository, under
 * `.agy-staff/decisions.jsonl` next to the companion's own job state.
 *
 * Why append-only and inside the repository: a delegation's admission decision is
 * evidence about *this* checkout — who asked for what, which policy refused it, and
 * which settings version was in force. Keeping it beside the jobs it describes means
 * it travels with the repo, survives a plugin upgrade, and can be inspected with
 * `type`/`cat` without the harness running.
 *
 * Recording is best effort by design: a ledger write that fails must never turn a
 * permitted delegation into a refused one, so every failure returns `false`.
 *
 * @module dsh-agy-staff/agy-ledger
 */
import { appendFileSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';

/** Kinds the ledger understands; anything else is stored as `would_delegate`. */
export const DECISION_KINDS = Object.freeze([
    'refused',
    'would_delegate',
    'deduped',
    'spawned',
    'settings_drifted',
    'still_running',
]);

const KIND_SET = new Set(DECISION_KINDS);

/**
 * Read ceiling. The ledger grows for the life of a checkout, and a UI request must
 * not turn into a multi-megabyte read just because nobody pruned the file.
 */
const MAX_READ_BYTES = 2 * 1024 * 1024;

/** Ledger location for one repository. */
export function ledgerPath(cwd) {
    return join(cwd, '.agy-staff', 'decisions.jsonl');
}

/** Copy a known-shaped entry, filling the identity fields the caller may omit. */
function normalize(entry) {
    const source = entry === null || entry === undefined ? {} : entry;
    const normalized = {
        id: typeof source.id === 'string' && source.id !== '' ? source.id : randomUUID(),
        at: typeof source.at === 'string' && source.at !== '' ? source.at : new Date().toISOString(),
        kind: KIND_SET.has(source.kind) ? source.kind : 'would_delegate',
    };
    for (const key of ['reason', 'basis', 'settingsVersion', 'values', 'jobId']) {
        if (source[key] !== undefined) normalized[key] = source[key];
    }
    return normalized;
}

/**
 * Append one decision.
 *
 * @param {string} cwd repository root the decision belongs to
 * @param {object} entry see {@link DECISION_KINDS} for `kind`
 * @returns {boolean} whether the line reached disk
 */
export function record(cwd, entry) {
    if (typeof cwd !== 'string' || cwd.trim() === '') return false;
    try {
        mkdirSync(join(cwd, '.agy-staff'), { recursive: true });
        appendFileSync(ledgerPath(cwd), `${JSON.stringify(normalize(entry))}\n`, 'utf8');
        return true;
    } catch {
        return false;
    }
}

/**
 * The newest decisions, oldest first inside the returned slice.
 *
 * A malformed line is skipped rather than failing the read: a half-written line
 * from a crashed process must not make the whole history unreadable.
 *
 * @param {string} cwd repository root
 * @param {number} [limit] how many trailing entries to return
 * @returns {object[]}
 */
export function readDecisions(cwd, limit = 50) {
    const count = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 50;
    if (typeof cwd !== 'string' || cwd.trim() === '') return [];

    let text;
    try {
        const file = ledgerPath(cwd);
        const size = statSync(file).size;
        if (size === 0) return [];
        text = readFileSync(file, 'utf8');
        if (Buffer.byteLength(text, 'utf8') > MAX_READ_BYTES) {
            // Keep the tail: the newest decisions are the ones a reader wants.
            text = text.slice(-MAX_READ_BYTES);
            const firstBreak = text.indexOf('\n');
            if (firstBreak !== -1) text = text.slice(firstBreak + 1);
        }
    } catch {
        return [];
    }

    const entries = [];
    for (const line of text.split(/\r?\n/)) {
        if (line.trim() === '') continue;
        try {
            entries.push(JSON.parse(line));
        } catch {
            // A truncated trailing line is expected after a crash; skip it.
        }
    }
    return entries.slice(-count);
}
