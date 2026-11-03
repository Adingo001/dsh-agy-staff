/**
 * The `agy` SUBAGENT provider: Google's Antigravity CLI as an out-of-process
 * child of DeepSeek Harness.
 *
 * Why a provider instead of a skill: a skill asks the model to assemble a shell
 * command, watch it, and re-read a job object; a provider is an agent kind. The
 * `agy` delegation tool built from this row takes a `prompt`, returns a child id,
 * and shows up in `list_agents` — the same lifecycle the in-process `spawn`
 * and `fork` backends get, only the work happens in another process.
 *
 * Contract (from `@deepseek-ai/dsh-subagent`):
 *   - `start(request)` receives `{ prompt, cwd, label, signal }` plus the parent
 *     agent, and returns `{ id, result, dispose() }`.
 *   - `result` settles once, never rejects: `{ output, stopReason, diagnostic? }`
 *     with `stopReason` one of `completed` | `error` | `aborted`.
 *   - An out-of-process child cannot honor parent-enforced start features, so the
 *     capability advertisement is all `false` (the service then rejects such a
 *     request before `start` runs instead of ignoring it), and it cannot inherit
 *     the parent conversation.
 *
 * `agy` itself is background-first: `staffer`/`research`/`review`/`implement`
 * print a job id and detach, and `wait <id>` blocks until the job ends. This
 * module drives both phases and maps the companion's exit codes — 0 done, 2
 * still running — onto the provider result.
 *
 * @module dsh-agy-staff/agy-subagent
 */
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

/** Registered provider name; the `dsh-tool-subagent` row must select this. */
export const SUBAGENT_NAME = 'agy';

/** No parent-enforced start feature survives a process boundary. */
export const NO_START_CAPABILITIES = Object.freeze({
    agentOptions: false,
    agentPreset: false,
    outputSchema: false,
    depthLimit: false,
});

/** Byte cap for provider-authored failure detail (the seam re-truncates at 4096). */
const MAX_DIAGNOSTIC_BYTES = 4096;

/** Cap on captured stdout/stderr per spawned process, keeping the tail. */
const MAX_CAPTURE_BYTES = 4 * 1024 * 1024;

const DEFAULT_COMPANION = fileURLToPath(new URL('./assets/companion/agy-companion.mjs', import.meta.url));

/** Read a positive integer from the environment, or fall back. */
function envInt(name, fallback) {
    const raw = process.env[name];
    if (raw === undefined || raw.trim() === '') return fallback;
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function clip(text) {
    const trimmed = text.trim();
    if (trimmed.length <= MAX_DIAGNOSTIC_BYTES) return trimmed;
    return `${trimmed.slice(-MAX_DIAGNOSTIC_BYTES)}\n[diagnostic truncated]`;
}

/** Keep the tail of a growing stream inside the capture budget. */
function appendCapped(current, chunk) {
    const next = current + chunk;
    return next.length <= MAX_CAPTURE_BYTES ? next : next.slice(next.length - MAX_CAPTURE_BYTES);
}

/** The companion prints `job id: staffer-mw0ddx8x-7a420c45 (pid 31356)`. */
function parseJobId(stdout) {
    const match = /^job id:\s*(\S+)/m.exec(stdout);
    return match === null ? undefined : match[1];
}

function delay(ms, signal) {
    return new Promise((resolve) => {
        const timer = setTimeout(done, ms);
        function done() {
            clearTimeout(timer);
            signal?.removeEventListener?.('abort', done);
            resolve();
        }
        signal?.addEventListener?.('abort', done, { once: true });
    });
}

/**
 * The out-of-process agy backend.
 */
export class AgySubagentProvider {
    name = SUBAGENT_NAME;

    capabilities = NO_START_CAPABILITIES;

    /** A fresh child sees none of the parent's conversation. */
    inheritsParentContext = false;

    /**
     * @param {object} options
     * @param {string} [options.companion] - absolute path to agy-companion.mjs.
     * @param {string} [options.mode] - companion mode used for a delegation.
     * @param {number} [options.timeoutMs] - overall budget for one delegation.
     * @param {number} [options.waitSliceSeconds] - per-`wait` blocking slice.
     * @param {number} [options.pollMs] - pause between slices.
     */
    constructor(options = {}) {
        this.companion = options.companion ?? process.env.DSH_AGY_COMPANION ?? DEFAULT_COMPANION;
        this.mode = options.mode ?? process.env.DSH_AGY_SUBAGENT_MODE ?? 'staffer';
        this.timeoutMs = options.timeoutMs ?? envInt('DSH_AGY_SUBAGENT_TIMEOUT_MS', 45 * 60 * 1000);
        this.waitSliceSeconds = options.waitSliceSeconds ?? envInt('DSH_AGY_WAIT_SLICE_SECONDS', 90);
        this.pollMs = options.pollMs ?? envInt('DSH_AGY_SUBAGENT_POLL_MS', 1000);
    }

    /**
     * Start one delegation.
     * @param {{ prompt?: string, cwd?: string, label?: string, signal?: AbortSignal }} request
     * @returns {Promise<{ id: string, result: Promise<{ output: string, stopReason: string, diagnostic?: string }>, dispose: () => Promise<void> }>}
     */
    async start(request) {
        const id = `agy-${randomUUID()}`;
        const prompt = typeof request.prompt === 'string' ? request.prompt : '';
        const cwd = request.cwd;
        const children = new Set();
        const controller = new AbortController();
        const onAbort = () => controller.abort(request.signal?.reason);
        if (request.signal !== undefined) {
            if (request.signal.aborted) controller.abort(request.signal.reason);
            else request.signal.addEventListener('abort', onAbort, { once: true });
        }

        let jobId;
        let disposal;

        const result = (async () => {
            if (prompt.trim() === '') {
                return { output: '', diagnostic: 'agy delegation needs a non-empty prompt', stopReason: 'error' };
            }
            try {
                if (controller.signal.aborted) return { output: '', stopReason: 'aborted' };
                const dispatched = await this.exec([this.mode, '--prompt', prompt], { cwd, signal: controller.signal, children });
                const started = parseJobId(dispatched.stdout);
                if (controller.signal.aborted) return { output: '', stopReason: 'aborted' };
                if (dispatched.code !== 0 || started === undefined) {
                    const output = (dispatched.stdout || dispatched.stderr).trim();
                    return dispatched.code === 0
                        ? { output, stopReason: 'completed' }
                        : { output, stopReason: 'error', diagnostic: clip(dispatched.stderr || dispatched.stdout) };
                }
                jobId = started;

                const deadline = Date.now() + this.timeoutMs;
                for (;;) {
                    if (controller.signal.aborted) return { output: '', stopReason: 'aborted' };

                    const waited = await this.exec(
                        ['wait', jobId, '--timeout', `${this.waitSliceSeconds}s`],
                        { cwd, signal: controller.signal, children },
                    );
                    if (waited.code === 0) return { output: waited.stdout.trim(), stopReason: 'completed' };
                    if (waited.code !== 2) {
                        return {
                            output: waited.stdout.trim(),
                            stopReason: controller.signal.aborted ? 'aborted' : 'error',
                            ...(controller.signal.aborted ? {} : { diagnostic: clip(waited.stderr || waited.stdout) }),
                        };
                    }
                    if (Date.now() >= deadline) {
                        return {
                            output: '',
                            stopReason: 'error',
                            diagnostic: `agy job ${jobId} still running after ${this.timeoutMs} ms; collect it with the jobs skill or raise DSH_AGY_SUBAGENT_TIMEOUT_MS`,
                        };
                    }
                    await delay(this.pollMs, controller.signal);
                }
            } catch (error) {
                if (controller.signal.aborted) return { output: '', stopReason: 'aborted' };
                return { output: '', stopReason: 'error', diagnostic: clip(String(error?.message ?? error)) };
            }
        })();

        return {
            id,
            result,
            dispose: () => {
                if (disposal !== undefined) return disposal;
                if (request.signal !== undefined) request.signal.removeEventListener('abort', onAbort);
                controller.abort(new Error('agy subagent disposed'));
                for (const child of children) {
                    try {
                        child.kill();
                    } catch {
                        // Teardown must not throw after publication.
                    }
                }
                disposal = (async () => {
                    if (jobId === undefined) return;
                    // Best effort: the companion owns the agy worker, so ask it to stop.
                    await this.exec(['cancel', jobId], { cwd, signal: undefined, children: new Set() });
                })();
                return disposal;
            },
        };
    }

    /**
     * Run the companion once and capture its output. Never rejects: a spawn
     * failure settles as a synthetic non-zero exit with the reason on stderr.
     * @param {string[]} args
     * @param {{ cwd?: string, signal?: AbortSignal, children: Set<import('node:child_process').ChildProcess> }} options
     * @returns {Promise<{ code: number, stdout: string, stderr: string }>}
     */
    exec(args, { cwd, signal, children }) {
        return new Promise((resolve) => {
            let child;
            try {
                child = spawn(process.execPath, [this.companion, ...args], {
                    cwd,
                    env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
                    stdio: ['ignore', 'pipe', 'pipe'],
                    windowsHide: true,
                });
            } catch (error) {
                resolve({ code: -1, stdout: '', stderr: String(error?.message ?? error) });
                return;
            }

            children.add(child);
            let stdout = '';
            let stderr = '';
            child.stdout?.setEncoding('utf8');
            child.stderr?.setEncoding('utf8');
            child.stdout?.on('data', (chunk) => {
                stdout = appendCapped(stdout, chunk);
            });
            child.stderr?.on('data', (chunk) => {
                stderr = appendCapped(stderr, chunk);
            });

            const kill = () => {
                try {
                    child.kill();
                } catch {
                    // Already gone.
                }
            };
            if (signal !== undefined) {
                if (signal.aborted) kill();
                else signal.addEventListener('abort', kill, { once: true });
            }

            child.on('error', (error) => {
                stderr = appendCapped(stderr, `\n${String(error?.message ?? error)}`);
            });
            child.on('close', (code) => {
                children.delete(child);
                signal?.removeEventListener?.('abort', kill);
                resolve({ code: code ?? -1, stdout, stderr });
            });
        });
    }
}

/**
 * Build the provider the bundle registers.
 * @param {ConstructorParameters<typeof AgySubagentProvider>[0]} [options]
 * @returns {AgySubagentProvider}
 */
export function createAgyProvider(options) {
    return new AgySubagentProvider(options);
}
