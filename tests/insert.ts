import { type Case, db } from './env.js';

export const cases: Case[] = [

	{
		label : 'static single-row insert',
		// INSERT INTO user
		// (name, email, active)
		// VALUES ($1, $2, $3)
		fn: () => db.insert('user')
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
		fn: () => db.insert('user')
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
		fn: () => db.insert('post')
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
		label : 'runtime values via prepare({ values: true })',
		// INSERT INTO user
		// (name, email, active)
		// VALUES ($1, $2, $3)
		fn: () => {
			const insertUser = db.insert('user').prepare({ values: true });
			return insertUser({ values: { name: 'Carol', email: 'carol@example.com', active: false } });
		},
		expected: {
			query : 'INSERT INTO user\n(name, email, active)\nVALUES ($1, $2, $3)',
			args  : ['Carol', 'carol@example.com', false],
		},
	},

];

// Print output when run directly with tsx (not in vitest)
if (!process.env.VITEST) {
	for (const { label, fn } of cases) {
		console.log(`\n── ${label}`);
		console.log(fn());
	}
}
