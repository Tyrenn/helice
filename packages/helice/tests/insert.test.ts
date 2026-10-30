import { describe, expect, it } from 'vitest';
import { type Case, helice } from './env.js';

const cases: Case[] = [

	{
		label : 'static single-row insert',
		// INSERT INTO user
		// (name, email, active)
		// VALUES ($1, $2, $3)
		fn: () => helice.insert('user')
			.values({ name: 'Alice', email: 'alice@example.com', active: true })
			.prepare()(),
		expected: {
			query : 'INSERT INTO user\n(name, email, active)\nVALUES ($1, $2, $3)',
			args  : ['Alice', 'alice@example.com', true],
		},
	},

	{
		label : 'insert with RETURNING',
		// INSERT INTO user
		// (name, email, active)
		// VALUES ($1, $2, $3)
		// RETURNING id, name
		fn: () => helice.insert('user')
			.values({ name: 'Bob', email: 'bob@example.com', active: true })
			.returning(['id', 'name'])
			.prepare()(),
		expected: {
			query : 'INSERT INTO user\n(name, email, active)\nVALUES ($1, $2, $3)\nRETURNING id, name',
			args  : ['Bob', 'bob@example.com', true],
		},
	},

	{
		label : 'multi-row insert',
		// INSERT INTO post
		// (author_id, title, published, views)
		// VALUES ($1, $2, $3, $4),
		//        ($5, $6, $7, $8)
		fn: () => helice.insert('post')
			.values([
				{ author_id: 1, title: 'Hello', published: false, views: 0  },
				{ author_id: 1, title: 'World', published: true,  views: 42 },
			])
			.prepare()(),
		expected: {
			query : 'INSERT INTO post\n(author_id, title, published, views)\nVALUES ($1, $2, $3, $4),\n($5, $6, $7, $8)',
			args  : [1, 'Hello', false, 0, 1, 'World', true, 42],
		},
	},

	{
		label : 'build() — static shorthand',
		fn: () => helice.insert('user')
			.values({ name: 'Alice', email: 'alice@example.com', active: true })
			.build(),
		expected: {
			query : 'INSERT INTO user\n(name, email, active)\nVALUES ($1, $2, $3)',
			args  : ['Alice', 'alice@example.com', true],
		},
	},

	{
		label : 'execute() — executor called with query and args',
		fn: () => helice.insert('user')
			.values({ name: 'Alice', email: 'alice@example.com', active: true })
			.execute((query, args) => ({ query, args })),
		expected: {
			query : 'INSERT INTO user\n(name, email, active)\nVALUES ($1, $2, $3)',
			args  : ['Alice', 'alice@example.com', true],
		},
	},

	{
		label : 'runtime values via prepare({ values: true })',
		// INSERT INTO user
		// (name, email, active)
		// VALUES ($1, $2, $3)
		fn: () => {
			const insertUser = helice.insert('user').prepare({ values: true });
			return insertUser({ values: { name: 'Carol', email: 'carol@example.com', active: false } });
		},
		expected: {
			query : 'INSERT INTO user\n(name, email, active)\nVALUES ($1, $2, $3)',
			args  : ['Carol', 'carol@example.com', false],
		},
	},

];

if (!process.env.VITEST) {
	for (const { label, fn } of cases) {
		console.log(`\n── ${label}`);
		console.log(fn());
	}
}

describe('INSERT', () => {
	for (const { label, fn, expected } of cases) {
		it(label, () => expect(fn()).toEqual(expected));
	}
});
