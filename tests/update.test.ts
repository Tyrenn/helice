import { describe, expect, it } from 'vitest';
import { cases } from './update.js';

describe('UPDATE', () => {
	for (const { label, fn, expected } of cases) {
		it(label, () => expect(fn()).toEqual(expected));
	}
});
