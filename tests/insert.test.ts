import { describe, expect, it } from 'vitest';
import { cases } from './insert.js';

describe('INSERT', () => {
	for (const { label, fn, expected } of cases) {
		it(label, () => expect(fn()).toEqual(expected));
	}
});
