import assert from 'node:assert/strict';
import { checkPrecedent } from '../src/index.js';

const hit = checkPrecedent({ issueKey: 'AUTH-142' });
assert.match(hit, /AUTH-2026-03/, 'binding decision is cited');
assert.match(hit, /binding/, 'state is reported');
assert.match(hit, /source: https:\/\//, 'a source URL is always returned');
assert.doesNotMatch(hit, /AUTH-2026-07/, 'superseded decisions are not offered as precedent');

const miss = checkPrecedent({ issueKey: 'BILLING-7' });
assert.match(miss, /No binding precedent/, 'clean miss says so');

const empty = checkPrecedent({});
assert.match(empty, /No issue key/, 'missing input is handled');

console.log('ok');
