import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';

import { COMPANION_PATH } from '../index.js';

test('the companion path the provider hands out exists', () => {
    assert.ok(existsSync(COMPANION_PATH), COMPANION_PATH);
});
