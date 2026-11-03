/**
 * Live settings for the agy surfaces, shared by the skill provider, the subagent
 * provider and the control panel.
 *
 * One small JSON file under `<dshHome>/agy-staff/settings.json`. It is read on
 * every request (stat-guarded by mtime), so the panel's「保存」takes effect on
 * the next delegation instead of requiring an app restart — the bundle rows are
 * still fixed at boot, but nothing decided per call is.
 *
 * @module dsh-agy-staff/agy-settings
 */
import { mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/** Companion modes the panel offers. */
export const MODES = Object.freeze(['staffer', 'research', 'review', 'implement', 'ask']);

/** Reasoning efforts the companion accepts. */
export const EFFORTS = Object.freeze(['low', 'medium', 'high']);

/** Settings a fresh install starts from. */
export const DEFAULTS = Object.freeze({
    mode: 'staffer',
    model: '',
    effort: '',
    timeoutMs: 45 * 60 * 1000,
    waitSliceSeconds: 90,
    pollMs: 1000,
    subagentEnabled: true,
    skillsEnabled: true,
});

/** `$DSH_HOME`, falling back to `~/.dsh` (Windows has no HOME). */
export function dshHome() {
    const explicit = process.env.DSH_HOME;
    return explicit !== undefined && explicit.trim() !== '' ? explicit : join(homedir(), '.dsh');
}

/** Absolute path of the settings file. */
export function settingsPath() {
    return join(dshHome(), 'agy-staff', 'settings.json');
}

let cache;

function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Coerce one candidate value, throwing on a value the panel could not produce.
 * A malformed field is an error rather than a silent fallback: the panel shows
 * it, and a typo in a timeout should never become a wedged delegation.
 */
function coerce(key, value) {
    switch (key) {
        case 'mode':
            if (!MODES.includes(value)) throw new Error(`mode must be one of ${MODES.join('|')}`);
            return value;
        case 'model':
            if (typeof value !== 'string') throw new Error('model must be a string');
            return value.trim();
        case 'effort':
            if (value === '' || value === null || value === undefined) return '';
            if (!EFFORTS.includes(value)) throw new Error(`effort must be one of ${EFFORTS.join('|')} or empty`);
            return value;
        case 'timeoutMs': {
            const n = Number(value);
            if (!Number.isFinite(n) || n < 30_000 || n > 7_200_000) throw new Error('timeoutMs must be 30000..7200000');
            return Math.floor(n);
        }
        case 'waitSliceSeconds': {
            const n = Number(value);
            if (!Number.isFinite(n) || n < 10 || n > 600) throw new Error('waitSliceSeconds must be 10..600');
            return Math.floor(n);
        }
        case 'pollMs': {
            const n = Number(value);
            if (!Number.isFinite(n) || n < 200 || n > 10_000) throw new Error('pollMs must be 200..10000');
            return Math.floor(n);
        }
        case 'subagentEnabled':
        case 'skillsEnabled':
            if (typeof value !== 'boolean') throw new Error(`${key} must be a boolean`);
            return value;
        default:
            throw new Error(`unknown setting "${key}"`);
    }
}

/** Apply a patch over a complete settings object, validating every field. */
function merge(base, patch) {
    if (!isRecord(patch)) throw new Error('patch must be an object');
    const next = { ...base };
    for (const [key, value] of Object.entries(patch)) next[key] = coerce(key, value);
    return next;
}

/** Read whatever is on disk, tolerating a missing or hand-edited file. */
function readFileSettings() {
    const file = settingsPath();
    let raw;
    try {
        raw = readFileSync(file, 'utf8');
    } catch {
        return { ...DEFAULTS };
    }
    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return { ...DEFAULTS };
    }
    const merged = { ...DEFAULTS };
    for (const key of Object.keys(DEFAULTS)) {
        if (parsed !== null && typeof parsed === 'object' && key in parsed) {
            try {
                merged[key] = coerce(key, parsed[key]);
            } catch {
                // Keep the default for a field the file got wrong.
            }
        }
    }
    return merged;
}

/**
 * The current settings. Cached against the file's mtime so a panel save in
 * another process is picked up on the next call.
 * @returns {typeof DEFAULTS}
 */
export function readSettings() {
    const file = settingsPath();
    let mtimeMs = 0;
    try {
        mtimeMs = statSync(file).mtimeMs;
    } catch {
        mtimeMs = 0;
    }
    if (cache !== undefined && cache.mtimeMs === mtimeMs) return cache.value;
    const value = readFileSettings();
    cache = { mtimeMs, value };
    return value;
}

/**
 * Merge a patch, validate it, and write it atomically.
 * @param {Record<string, unknown>} patch
 * @returns {typeof DEFAULTS} the settings now in force
 */
export function writeSettings(patch) {
    const next = merge(readSettings(), patch);
    const file = settingsPath();
    mkdirSync(join(dshHome(), 'agy-staff'), { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    writeFileSync(tmp, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
    renameSync(tmp, file);
    cache = undefined;
    return readSettings();
}

/** Forget the cached copy (tests and after an external write). */
export function resetSettingsCache() {
    cache = undefined;
}
