/**
 * The agy control panel's HOST half: one private HTTP endpoint the panel posts
 * to, plus the op dispatcher it lands on.
 *
 * Why a named route instead of a typed remote service: this bundle stays
 * dependency-free (nothing resolves `@deepseek-ai/*` from the profile), so a
 * `POST /agy/api` route registered on `ctx.webServer` is the smallest stable
 * seam — the same choice dsh-purge documents for its own bridge.
 *
 * Ops (all JSON in, JSON out):
 *   status   — settings, paths, companion presence, agy version
 *   get/set  — read/modify the live settings (see agy-settings.js)
 *   test     — run one `ask` and return its answer (the "does agy work" button)
 *   jobs     — recent jobs from `<cwd>/.agy-staff/state.json`
 *   result   — one job's result markdown
 *   cancel   — ask the companion to stop a job
 *
 * @module dsh-agy-staff/agy-ui
 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { EFFORTS, MODES, dshHome, readSettings, settingsPath, writeSettings } from './agy-settings.js';

export const name = 'agy-staff-ui';

/** The web server that will host the route. */
export const inject = ['webServer'];

/** The route the panel posts to. */
export const ROUTE = '/agy/api';

const COMPANION = fileURLToPath(new URL('./assets/companion/agy-companion.mjs', import.meta.url));
const PACKAGE = fileURLToPath(new URL('./package.json', import.meta.url));

const MAX_BODY_BYTES = 256 * 1024;

/** Last time the browser half said hello: proves the client bundle really ran. */
let panelHeartbeat;

/**
 * Read the composed browser module graph. `undefined` when the service is not
 * present (headless host); otherwise it says whether this package made it into
 * the boot roster and where its bundle lives.
 */
function clientGraph(ctx) {
    if (ctx === undefined || typeof ctx.get !== 'function') return undefined;
    const service = ctx.get('clientModules');
    if (service === undefined) return undefined;
    try {
        const graph = service.graph?.();
        const ids = (graph?.entries ?? []).map((entry) => entry.id).filter((id) => typeof id === 'string');
        return {
            rev: graph?.rev,
            modules: ids.length,
            ours: ids.includes('dsh-agy-staff'),
            clientPath: service.clientPath?.('dsh-agy-staff'),
        };
    } catch (error) {
        return { error: String(error?.message ?? error) };
    }
}
const MAX_RESULT_BYTES = 200 * 1024;

/** Run a command to completion, never rejecting. */
function run(file, args, { cwd, timeoutMs = 120_000 } = {}) {
    return new Promise((resolve) => {
        const startedAt = Date.now();
        let child;
        try {
            child = spawn(file, args, { cwd, windowsHide: true, env: { ...process.env, NO_COLOR: '1' } });
        } catch (error) {
            resolve({ code: -1, stdout: '', stderr: String(error?.message ?? error), ms: 0 });
            return;
        }
        let stdout = '';
        let stderr = '';
        child.stdout?.setEncoding('utf8');
        child.stderr?.setEncoding('utf8');
        child.stdout?.on('data', (chunk) => {
            stdout += chunk;
            if (stdout.length > 4 * 1024 * 1024) stdout = stdout.slice(-4 * 1024 * 1024);
        });
        child.stderr?.on('data', (chunk) => {
            stderr += chunk;
            if (stderr.length > 4 * 1024 * 1024) stderr = stderr.slice(-4 * 1024 * 1024);
        });
        const timer = setTimeout(() => {
            try {
                child.kill();
            } catch {
                // already gone
            }
        }, timeoutMs);
        child.on('error', (error) => {
            stderr += `\n${String(error?.message ?? error)}`;
        });
        child.on('close', (code) => {
            clearTimeout(timer);
            resolve({ code: code ?? -1, stdout, stderr, ms: Date.now() - startedAt });
        });
    });
}

let versionCache;

/** `agy --version`, cached for the process lifetime (it changes on install only). */
async function agyVersion() {
    if (versionCache !== undefined) return versionCache;
    const result = await run('agy', ['--version'], { timeoutMs: 15_000 });
    versionCache = result.code === 0
        ? { ok: true, version: result.stdout.trim() }
        : { ok: false, error: (result.stderr || result.stdout || 'agy not found on PATH').trim().slice(0, 400) };
    return versionCache;
}

/** The plugin's own version, for the panel header. */
function pluginVersion() {
    try {
        return JSON.parse(readFileSync(PACKAGE, 'utf8')).version ?? 'unknown';
    } catch {
        return 'unknown';
    }
}

/** Read `<cwd>/.agy-staff/state.json` and shape its job list for the panel. */
function readJobs(cwd) {
    const file = `${cwd.replace(/[\\/]+$/, '')}/.agy-staff/state.json`;
    let state;
    try {
        state = JSON.parse(readFileSync(file, 'utf8'));
    } catch {
        return { statePath: file, jobs: [] };
    }
    const jobs = Array.isArray(state?.jobs) ? state.jobs : [];
    return {
        statePath: file,
        jobs: jobs
            .slice(-25)
            .reverse()
            .map((job) => ({
                id: String(job.id ?? ''),
                mode: String(job.mode ?? ''),
                status: String(job.status ?? ''),
                model: String(job.model ?? ''),
                profile: String(job.profile ?? ''),
                startedAt: job.started_at ?? '',
                resultFile: job.result_file ?? '',
                logFile: job.log_file ?? '',
            })),
    };
}

/**
 * Handle one panel request. Never throws: every failure becomes
 * `{ ok: false, error }`, which is what the panel renders.
 * @param {Record<string, unknown>} request
 * @param {{ defaultCwd?: string }} [context]
 * @returns {Promise<Record<string, unknown>>}
 */
export async function dispatch(request, context = {}) {
    const op = typeof request?.op === 'string' ? request.op : '';
    const defaultCwd = context.defaultCwd ?? process.cwd();
    try {
        switch (op) {
            case 'status': {
                const version = await agyVersion();
                return {
                    ok: true,
                    pluginVersion: pluginVersion(),
                    companion: COMPANION,
                    companionExists: existsSync(COMPANION),
                    agy: version,
                    settingsPath: settingsPath(),
                    dshHome: dshHome(),
                    panel: panelHeartbeat ?? null,
                    client: clientGraph(context.ctx),
                    defaults: readSettings(),
                    modes: [...MODES],
                    efforts: [...EFFORTS],
                };
            }
            case 'panel-alive':
                panelHeartbeat = {
                    at: new Date().toISOString(),
                    version: typeof request.version === 'string' ? request.version : '',
                };
                return { ok: true, panel: panelHeartbeat };
            case 'get':
                return { ok: true, settings: readSettings(), modes: [...MODES], efforts: [...EFFORTS] };
            case 'set': {
                const patch = request.patch;
                if (typeof patch !== 'object' || patch === null) return { ok: false, error: 'patch must be an object' };
                return { ok: true, settings: writeSettings(patch) };
            }
            case 'test': {
                const prompt = typeof request.prompt === 'string' && request.prompt.trim() !== ''
                    ? request.prompt
                    : 'reply with exactly: agy works';
                const mode = typeof request.mode === 'string' && MODES.includes(request.mode) ? request.mode : 'ask';
                const args = [mode, '--prompt', prompt];
                if (mode !== 'ask') {
                    const settings = readSettings();
                    if (settings.model !== '') args.push('--model', settings.model);
                    else if (settings.effort !== '') args.push('--effort', settings.effort);
                }
                const result = await run(process.execPath, [COMPANION, ...args], {
                    cwd: typeof request.cwd === 'string' && request.cwd !== '' ? request.cwd : defaultCwd,
                    timeoutMs: 180_000,
                });
                return {
                    ok: result.code === 0,
                    exitCode: result.code,
                    ms: result.ms,
                    mode,
                    output: (result.stdout || result.stderr).trim().slice(-8000),
                };
            }
            case 'jobs': {
                const cwd = typeof request.cwd === 'string' && request.cwd !== '' ? request.cwd : defaultCwd;
                return { ok: true, cwd, ...readJobs(cwd) };
            }
            case 'result': {
                const cwd = typeof request.cwd === 'string' && request.cwd !== '' ? request.cwd : defaultCwd;
                const id = String(request.jobId ?? '');
                if (!/^[A-Za-z0-9._-]+$/.test(id)) return { ok: false, error: 'invalid job id' };
                const found = readJobs(cwd).jobs.find((job) => job.id === id);
                if (found === undefined || found.resultFile === '') return { ok: false, error: 'no result for that job' };
                try {
                    const text = readFileSync(found.resultFile, 'utf8');
                    return { ok: true, output: text.slice(0, MAX_RESULT_BYTES) };
                } catch (error) {
                    return { ok: false, error: String(error?.message ?? error) };
                }
            }
            case 'cancel': {
                const cwd = typeof request.cwd === 'string' && request.cwd !== '' ? request.cwd : defaultCwd;
                const id = String(request.jobId ?? '');
                if (!/^[A-Za-z0-9._-]+$/.test(id)) return { ok: false, error: 'invalid job id' };
                const result = await run(process.execPath, [COMPANION, 'cancel', id], { cwd, timeoutMs: 60_000 });
                return { ok: result.code === 0, output: (result.stdout || result.stderr).trim().slice(-4000) };
            }
            default:
                return { ok: false, error: `unknown op "${op}"` };
        }
    } catch (error) {
        return { ok: false, error: String(error?.message ?? error) };
    }
}

function sendJson(res, status, body) {
    const text = JSON.stringify(body);
    res.statusCode = status;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.setHeader('cache-control', 'no-store');
    res.end(text);
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let size = 0;
        const chunks = [];
        req.on('data', (chunk) => {
            size += chunk.length;
            if (size > MAX_BODY_BYTES) {
                reject(new Error('request body too large'));
                req.destroy();
                return;
            }
            chunks.push(chunk);
        });
        req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        req.on('error', reject);
    });
}

/**
 * Same-origin gate for the route. A loopback `remoteAddress` proves nothing:
 * any page the user has open is also talking to 127.0.0.1, so the peer is judged
 * by Origin/Host and a JSON content type (a cross-site "simple request" cannot
 * set that header without a preflight).
 */
function originAllowed(req) {
    const host = typeof req.headers.host === 'string' ? req.headers.host : '';
    const hostLocal = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(host);
    const site = String(req.headers['sec-fetch-site'] || '').toLowerCase();
    const origin = req.headers.origin;
    if (site === 'cross-site' || site === 'same-site') return false;
    if (origin === undefined || origin === '') return true;
    if (origin === 'null') return hostLocal && (site === '' || site === 'none');
    if (/^app:/i.test(String(origin))) return hostLocal;
    try {
        return new URL(origin).host === host;
    } catch {
        return false;
    }
}

/**
 * @param {{ webServer: { register: (route: {
 *   kind: 'exact', path: string, handler: (req: any, res: any) => Promise<void> }) => unknown },
 *   effect?: (fn: () => unknown, label?: string) => unknown,
 *   workingDirectory?: { resolve?: () => string } }} ctx
 */
export function apply(ctx) {
    const register = () => ctx.webServer.register({
        kind: 'exact',
        path: ROUTE,
        handler: async (req, res) => {
            if (req.method !== 'POST') {
                sendJson(res, 405, { ok: false, error: 'POST only' });
                return;
            }
            if (!originAllowed(req)) {
                sendJson(res, 403, { ok: false, error: 'cross-origin request rejected' });
                return;
            }
            const contentType = String(req.headers['content-type'] || '').toLowerCase();
            if (!contentType.includes('application/json')) {
                sendJson(res, 415, { ok: false, error: 'content-type must be application/json' });
                return;
            }
            try {
                const raw = await readBody(req);
                const request = raw.trim() === '' ? {} : JSON.parse(raw);
                const body = await dispatch(request, { defaultCwd: process.cwd(), ctx });
                sendJson(res, 200, body);
            } catch (error) {
                sendJson(res, 200, { ok: false, error: String(error?.message ?? error) });
            }
        },
    });

    if (typeof ctx.effect === 'function') ctx.effect(register, 'agy-staff-ui: route');
    else register();
}
