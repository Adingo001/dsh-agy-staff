/**
 * The CLI's model catalog, cached between calls.
 *
 * Why a cache and not a call: `agy models` fetches the list over the network (it
 * prints "Fetching available models..." first), so a delegation must never wait on
 * it. The control panel refreshes the cache; admission reads whatever is on disk
 * and, when there is nothing cached yet, skips the catalog check rather than
 * refusing work it cannot judge.
 *
 * @module dsh-agy-staff/agy-models
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { dshHome } from './agy-settings.js';

/** Where the panel's last successful listing is kept. */
export function modelCachePath() {
    return join(dshHome(), 'agy-staff', 'models.cache.json');
}

/**
 * Persist one listing.
 *
 * @param {Array<{ id: string, label?: string }>} models
 * @returns {boolean} whether the cache reached disk
 */
export function writeModelCache(models) {
    if (!Array.isArray(models) || models.length === 0) return false;
    try {
        const ids = models
            .map((entry) => (typeof entry === 'string' ? entry : entry?.id))
            .filter((id) => typeof id === 'string' && id !== '');
        if (ids.length === 0) return false;
        const file = modelCachePath();
        mkdirSync(join(dshHome(), 'agy-staff'), { recursive: true });
        const tmp = `${file}.${process.pid}.tmp`;
        writeFileSync(tmp, `${JSON.stringify({ ids, at: new Date().toISOString() }, null, 2)}\n`, 'utf8');
        renameSync(tmp, file);
        return true;
    } catch {
        return false;
    }
}

/**
 * The cached ids, or an empty list. An empty list means "no opinion": admission
 * treats it as permission to proceed, because a missing cache is not evidence that
 * the requested model is wrong.
 *
 * @returns {string[]}
 */
export function readModelCache() {
    try {
        const parsed = JSON.parse(readFileSync(modelCachePath(), 'utf8'));
        const ids = Array.isArray(parsed?.ids) ? parsed.ids : [];
        return ids.filter((id) => typeof id === 'string' && id !== '');
    } catch {
        return [];
    }
}
