import { describe, expect, it } from 'vitest';
import { col } from '../src/types.js';
import { type Case, helice } from './env.js';

const cases: Case[] = [

	{
		label : 'static WHERE',
		// DELETE FROM user
		// WHERE id = $1
		fn: () => helice.delete('user')
			.where({ id: 99 })
			.prepare()(),
		expected: {
			query : 'DELETE FROM user\nWHERE (\n\tid = $1\n)',
			args  : [99],
		},
	},

	{
		label : 'delete with RETURNING',
		// DELETE FROM post
		// WHERE published = $1
		// RETURNING id AS postId, title AS postTitle
		fn: () => helice.delete('post')
			.where({ published: false })
			.returning({ postId: 'id', postTitle: 'title' })
			.prepare()(),
		expected: {
			query : 'DELETE FROM post\nWHERE (\n\tpublished = $1\n)\nRETURNING id AS postId, title AS postTitle',
			args  : [false],
		},
	},

	{
		label : 'runtime WHERE merged AND with static WHERE',
		// DELETE FROM post
		// WHERE (author_id = $1 AND published = $2)
		fn: () => {
			const deletePostsBy = helice.delete('post')
				.where({ author_id: 3 })
				.prepare({ where: true });
			return deletePostsBy({ where: { published: false } });
		},
		expected: {
			query : 'DELETE FROM post\nWHERE (\n\tauthor_id = $1\n\tAND published = $2\n)',
			args  : [3, false],
		},
	},

	{
		label : 'restricted runtime WHERE',
		// DELETE FROM post
		// WHERE (published = $1 AND views <= $2)
		fn: () => {
			const deleteStale = helice.delete('post')
				.where({ published: false })
				.prepare({ where: { post: ['views'] } });
			return deleteStale({ where: { '<=:views': 0 } });
		},
		expected: {
			query : 'DELETE FROM post\nWHERE (\n\tpublished = $1\n\tAND views <= $2\n)',
			args  : [false, 0],
		},
	},

	{
		label : 'DELETE … USING (multi-table)',
		// DELETE FROM post
		// USING user
		// WHERE post.author_id = user.id AND user.active = $1
		fn: () => helice.delete('post')
			.using(['user'])
			.where({ 'post.author_id': col('user.id'), 'user.active': false })
			.prepare()(),
		expected: {
			query : 'DELETE FROM post\nUSING user\nWHERE (\n\tpost.author_id = user.id\n\tAND user.active = $1\n)',
			args  : [false],
		},
	},

	{
		label : 'build() — static shorthand',
		fn: () => helice.delete('user').where({ id: 99 }).build(),
		expected: {
			query : 'DELETE FROM user\nWHERE (\n\tid = $1\n)',
			args  : [99],
		},
	},

	{
		label : 'execute() — executor called with query and args',
		fn: () => helice.delete('user').where({ id: 99 })
			.execute((query, args) => ({ query, args })),
		expected: {
			query : 'DELETE FROM user\nWHERE (\n\tid = $1\n)',
			args  : [99],
		},
	},

	{
		label : 'EXISTS on DELETE',
		fn: () => helice.delete('post')
			.exists(helice.select('user').where({ 'user.id': col('post.author_id'), active: false }))
			.prepare()(),
		expected: {
			query : 'DELETE FROM post\nWHERE (\n\tEXISTS (SELECT *\n\tFROM user\n\tWHERE (\n\t\tuser.id = post.author_id\n\t\tAND active = $1\n\t))\n)',
			args  : [false],
		},
	},

	{
		label : 'IN subquery on DELETE',
		// DELETE FROM post WHERE (author_id IN (SELECT id FROM user WHERE (active = $1)))
		fn: () => helice.delete('post')
			.in('author_id', helice.select('user').field(['id']).where({ active: false }))
			.prepare()(),
		expected: {
			query : 'DELETE FROM post\nWHERE (\n\tauthor_id IN (SELECT id\n\tFROM user\n\tWHERE (\n\t\tactive = $1\n\t))\n)',
			args  : [false],
		},
	},

	{
		label : 'DELETE with CTE',
		// WITH stale_authors AS (SELECT * FROM user WHERE active = $1)
		// DELETE FROM post
		// USING stale_authors
		// WHERE post.author_id = stale_authors.id
		fn: () => helice.delete('post')
			.with('stale_authors', helice.select('user').where({ active: false }))
			.using(['stale_authors'])
			.where({ 'post.author_id': col('stale_authors.id') })
			.prepare()(),
		expected: {
			query : 'WITH stale_authors AS (\nSELECT *\nFROM user\nWHERE (\n\tactive = $1\n)\n)\nDELETE FROM post\nUSING stale_authors\nWHERE (\n\tpost.author_id = stale_authors.id\n)',
			args  : [false],
		},
	},

];

if (!process.env.VITEST) {
	for (const { label, fn } of cases) {
		console.log(`\n── ${label}`);
		console.log(fn());
	}
}

describe('DELETE', () => {
	for (const { label, fn, expected } of cases) {
		it(label, () => expect(fn()).toEqual(expected));
	}
});
