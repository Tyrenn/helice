import { col } from '../src/types.js';
import { type Case, db } from './env.js';

export const cases: Case[] = [

	{
		label : 'static SET + WHERE',
		// UPDATE user
		// SET name = $1, email = $2
		// WHERE id = $3
		fn: () => db.update('user')
			.set({ name: 'Alice Updated', email: 'new@example.com' })
			.where({ id: 1 })
			.prepare()(),
		expected: {
			query : 'UPDATE user\nSET name = $1,\n\temail = $2\nWHERE (\n\tid = $3\n)',
			args  : ['Alice Updated', 'new@example.com', 1],
		},
	},

	{
		label : 'update with RETURNING',
		// UPDATE user
		// SET active = $1
		// WHERE id = $2
		// RETURNING id, name, active
		fn: () => db.update('user')
			.set({ active: false })
			.where({ id: 5 })
			.returning(['id', 'name', 'active'])
			.prepare()(),
		expected: {
			query : 'UPDATE user\nSET active = $1\nWHERE (\n\tid = $2\n)\nRETURNING id, name, active',
			args  : [false, 5],
		},
	},

	{
		label : 'runtime WHERE merged AND with static WHERE',
		// UPDATE post
		// SET published = $1
		// WHERE (author_id = $2 AND views >= $3)
		fn: () => {
			const publishPosts = db.update('post')
				.set({ published: true })
				.where({ author_id: 1 })
				.prepare({ where: true });
			return publishPosts({ where: { '>=:views': 100 } });
		},
		expected: {
			query : 'UPDATE post\nSET published = $1\nWHERE (\n\tauthor_id = $2\n\tAND views >= $3\n)',
			args  : [true, 1, 100],
		},
	},

	{
		label : 'runtime SET + restricted runtime WHERE',
		// UPDATE user
		// SET name = $1, email = $2
		// WHERE (id = $3)
		fn: () => {
			const updateUser = db.update('user')
				.prepare({ set: true, where: { user: ['id'] } });
			return updateUser({ set: { name: 'Dave', email: 'dave@example.com' }, where: { id: 10 } });
		},
		expected: {
			query : 'UPDATE user\nSET name = $1,\n\temail = $2\nWHERE (\n\tid = $3\n)',
			args  : ['Dave', 'dave@example.com', 10],
		},
	},

	{
		label : 'UPDATE … FROM (multi-table)',
		// UPDATE post
		// SET published = $1
		// FROM user
		// WHERE post.author_id = user.id AND user.active = $2
		fn: () => db.update('post')
			.using(['user'])
			.set({ published: false })
			.where({ 'post.author_id': col('user.id'), 'user.active': false })
			.prepare()(),
		expected: {
			query : 'UPDATE post\nSET published = $1\nFROM user\nWHERE (\n\tpost.author_id = user.id\n\tAND user.active = $2\n)',
			args  : [false, false],
		},
	},

	{
		label : 'UPDATE with CTE',
		// WITH inactive_users AS (SELECT * FROM user WHERE active = $1)
		// UPDATE post
		// SET published = $2
		// FROM inactive_users
		// WHERE post.author_id = inactive_users.id
		fn: () => db.update('post')
			.with('inactive_users', db.select('user').where({ active: false }))
			.using(['inactive_users'])
			.set({ published: false })
			.where({ 'post.author_id': col('inactive_users.id') })
			.prepare()(),
		expected: {
			query : 'WITH inactive_users AS (\nSELECT *\nFROM user\nWHERE (\n\tactive = $1\n)\n)\nUPDATE post\nSET published = $2\nFROM inactive_users\nWHERE (\n\tpost.author_id = inactive_users.id\n)',
			args  : [false, false],
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
