import { describe, expect, it } from 'vitest';
import { cases } from './delete.js';

describe('DELETE', () => {
	for (const { label, fn, expected } of cases) {
		it(label, () => expect(fn()).toEqual(expected));
	}
});
