import { describe, expect, it } from 'vitest';
import { cases } from './select.js';

describe('SELECT', () => {
	for (const { label, fn, expected } of cases) {
		it(label, () => expect(fn()).toEqual(expected));
	}
});
