import { describe, expect, it } from 'vitest';
import { col } from '../src/types.js';
import { type Case, helice, verboseHelice } from './env.js';

const cases: Case[] = [

	{
		label    : 'minimal (SELECT *)',
		fn       : () => helice.select('user').prepare()(),
		expected : { query: 'SELECT *\nFROM user', args: [] },
	},

	{
		label    : 'array field',
		fn       : () => helice.select('user').field(['id', 'name', 'email']).prepare()(),
		expected : { query: 'SELECT id, name, email\nFROM user', args: [] },
	},

	{
		label    : 'string field with alias (@)',
		fn       : () => helice.select('post').field('id@postId').prepare()(),
		expected : { query: 'SELECT id AS postId\nFROM post', args: [] },
	},

	{
		label: 'static WHERE',
		fn: () => helice.select('post')
			.where({ published: true, '>=:views': 1000 })
			.prepare()(),
		expected: {
			query : 'SELECT *\nFROM post\nWHERE (\n\tpublished = $1\n\tAND views >= $2\n)',
			args  : [true, 1000],
		},
	},

	{
		label: 'WHERE with OR group (&&:)',
		fn: () => helice.select('post')
			.where({
				published : true,
				'&&:pop'  : [
					{ '>=:views' : 500            },
					{ '~~:title' : '%TypeScript%' },
				],
			})
			.prepare()(),
		expected: {
			query : 'SELECT *\nFROM post\nWHERE (\n\tpublished = $1\n\tAND (\n\t\t(\n\t\t\tviews >= $2\n\t\t)\n\t\tOR (\n\t\t\ttitle ~~ $3\n\t\t)\n\t)\n)',
			args  : [true, 500, '%TypeScript%'],
		},
	},

	{
		label: 'object field + WHERE + static LIMIT',
		fn: () => helice.select('post')
			.field({ postId: 'id', postTitle: 'title', flagged: true })
			.where({ published: true })
			.limit(5)
			.prepare()(),
		expected: {
			query : 'SELECT id AS postId, title AS postTitle, true AS flagged\nFROM post\nWHERE (\n\tpublished = $1\n)\nLIMIT 5',
			args  : [true],
		},
	},

	{
		label: 'runtime WHERE + runtime LIMIT',
		// Static and runtime WHERE are merged as AND; runtime LIMIT overrides nothing here
		fn: () => {
			const findPosts = helice.select('post')
				.where({ published: true })
				.prepare({ where: true, limit: true });
			return findPosts({ where: { '>=:views': 500 }, limit: 10 });
		},
		expected: {
			query : 'SELECT *\nFROM post\nWHERE (\n\tpublished = $1\n\tAND views >= $2\n)\nLIMIT 10',
			args  : [true, 500],
		},
	},

	{
		label: 'LEFT JOIN + object field + WHERE',
		fn: () => helice.select('post')
			.join({ user: 'id = post.author_id' })
			.field({ postId: 'post.id', title: 'post.title', authorName: 'user.name' })
			.where({ 'post.published': true })
			.prepare()(),
		expected: {
			query : 'SELECT post.id AS postId, post.title AS title, user.name AS authorName\nFROM post\nLEFT JOIN user\n\tON user.id = post.author_id\nWHERE (\n\tpost.published = $1\n)',
			args  : [true],
		},
	},

	{
		label: 'INNER JOIN via key prefix (i#)',
		fn: () => helice.select('post')
			.join({ 'i#user': 'id = post.author_id' })
			.field({ postId: 'post.id', title: 'post.title' })
			.where({ 'user.active': true })
			.prepare()(),
		expected: {
			query : 'SELECT post.id AS postId, post.title AS title\nFROM post\nINNER JOIN user\n\tON user.id = post.author_id\nWHERE (\n\tuser.active = $1\n)',
			args  : [true],
		},
	},

	{
		label: 'VerboseSyntaxKeys - BETWEEN suffix',
		fn: () => verboseHelice.select('post')
			.where({ 'views BETWEEN': [100, 1000] })
			.prepare()(),
		expected: {
			query : 'SELECT *\nFROM post\nWHERE (\n\tviews BETWEEN $1 AND $2\n)',
			args  : [100, 1000],
		},
	},

	{
		label: 'VerboseSyntaxKeys - JSONB @> suffix',
		fn: () => verboseHelice.select('post')
			.where({ 'meta @>': { category: 'tech' } })
			.prepare()(),
		expected: {
			query : 'SELECT *\nFROM post\nWHERE (\n\tmeta @> $1\n)',
			args  : [{ category: 'tech' }],
		},
	},

	{
		label: 'VerboseSyntaxKeys - operators as suffixes',
		fn: () => verboseHelice.select('post')
			.join({ 'INNER JOIN user': 'id = post.author_id' })
			.field({ postId: 'post.id', title: 'post.title' })
			.where({ 'user.active =': true })
			.prepare()(),
		expected: {
			query : 'SELECT post.id AS postId, post.title AS title\nFROM post\nINNER JOIN user\n\tON user.id = post.author_id\nWHERE (\n\tuser.active = $1\n)',
			args  : [true],
		},
	},

	{
		label: 'json_agg aggregation + GROUP BY',
		// json_agg adds GROUP BY automatically; nested object produces json_build_object
		fn: () => helice.select('post')
			.join({ comment: 'post_id = post.id' })
			.field({
				postId   : 'post.id',
				title    : 'post.title',
				comments : { fn: 'json_agg', group: 'post.id', value: { commentId: 'comment.id', body: 'comment.body' } },
			})
			.where({ 'post.published': true })
			.prepare()(),
		expected: {
			query : "SELECT post.id AS postId, post.title AS title, json_agg(json_build_object('commentId', comment.id, 'body', comment.body)) AS comments\nFROM post\nLEFT JOIN comment\n\tON comment.post_id = post.id\nWHERE (\n\tpost.published = $1\n)\nGROUP BY post.id",
			args  : [true],
		},
	},

	{
		label: 'static CTE',
		fn: () => helice.select('post')
			.with('active_user', helice.select('user').field(['id', 'name']).where({ active: true }))
			.join({ active_user: 'id = post.author_id' })
			.field({ userId: 'active_user.id', name: 'active_user.name', title: 'post.title' })
			.where({ 'post.published': true })
			.prepare()(),
		expected: {
			query : 'WITH active_user AS (\nSELECT id, name\nFROM user\nWHERE (\n\tactive = $1\n)\n)\nSELECT active_user.id AS userId, active_user.name AS name, post.title AS title\nFROM post\nLEFT JOIN active_user\n\tON active_user.id = post.author_id\nWHERE (\n\tpost.published = $2\n)',
			args  : [true, true],
		},
	},

	{
		label: 'CTE with runtime args',
		// CTE runtime args keyed by alias; param numbering: CTE params first, main query after
		fn: () => {
			const postsForUser = helice.select('post')
				.with('active_user', helice.select('user').field(['id', 'name']).where({ active: true }), { where: true })
				.field({ userId: 'content', azadazd: 'title' })
				.where({ published: true })
				.prepare({ where: true });
			return postsForUser({
				where       : { '>=:views': 200 },
				active_user : { where: { '~~:name': 'Alice%' } },
			});
		},
		expected: {
			query : 'WITH active_user AS (\nSELECT id, name\nFROM user\nWHERE (\n\tactive = $1\n\tAND name ~~ $2\n)\n)\nSELECT content AS userId, title AS azadazd\nFROM post\nWHERE (\n\tpublished = $3\n\tAND views >= $4\n)',
			args  : [true, 'Alice%', true, 200],
		},
	},

	{
		label: 'field reduction - full re-aliased',
		// Runtime field restricted to source columns referenced in the static .field() call
		fn: () => {
			const q = helice.select('post')
				.field({ postId: 'id', postTitle: 'title', postViews: 'views' })
				.prepare({ field: true });
			return q({ field: { myId: 'post.id', myTitle: 'post.title', myViews: 'post.views' } });
		},
		expected: {
			query : 'SELECT post.id AS myId, post.title AS myTitle, post.views AS myViews\nFROM post',
			args  : [],
		},
	},

	{
		label: 'field reduction - subset',
		fn: () => {
			const q = helice.select('post')
				.field({ postId: 'id', postTitle: 'title', postViews: 'views' })
				.prepare({ field: true });
			return q({ field: ['post.id', 'post.title'] });
		},
		expected: {
			query : 'SELECT post.id, post.title\nFROM post',
			args  : [],
		},
	},

	{
		label: 'EXISTS subquery',
		fn: () => helice.select('user')
			.exists(helice.select('post').where({ 'post.author_id': col('user.id'), published: true }))
			.prepare()(),
		expected: {
			query : 'SELECT *\nFROM user\nWHERE (\n\tEXISTS (SELECT *\n\tFROM post\n\tWHERE (\n\t\tpost.author_id = user.id\n\t\tAND published = $1\n\t))\n)',
			args  : [true],
		},
	},

	{
		label: 'NOT EXISTS subquery',
		fn: () => helice.select('user')
			.notExists(helice.select('post').where({ 'post.author_id': col('user.id'), published: true }))
			.prepare()(),
		expected: {
			query : 'SELECT *\nFROM user\nWHERE (\n\tNOT EXISTS (SELECT *\n\tFROM post\n\tWHERE (\n\t\tpost.author_id = user.id\n\t\tAND published = $1\n\t))\n)',
			args  : [true],
		},
	},

	{
		label: 'BETWEEN',
		fn: () => helice.select('post')
			.where({ 'between:views': [100, 1000] })
			.prepare()(),
		expected: {
			query : 'SELECT *\nFROM post\nWHERE (\n\tviews BETWEEN $1 AND $2\n)',
			args  : [100, 1000],
		},
	},

	{
		label: 'NOT BETWEEN',
		fn: () => helice.select('post')
			.where({ '!between:views': [0, 5] })
			.prepare()(),
		expected: {
			query : 'SELECT *\nFROM post\nWHERE (\n\tviews NOT BETWEEN $1 AND $2\n)',
			args  : [0, 5],
		},
	},

	{
		label: 'JSONB @> contains',
		fn: () => helice.select('post')
			.where({ '@>:meta': { category: 'tech' } })
			.prepare()(),
		expected: {
			query : 'SELECT *\nFROM post\nWHERE (\n\tmeta @> $1\n)',
			args  : [{ category: 'tech' }],
		},
	},

	{
		label: 'JSONB ? key exists',
		fn: () => helice.select('post')
			.where({ '?:meta': 'category' })
			.prepare()(),
		expected: {
			query : 'SELECT *\nFROM post\nWHERE (\n\tmeta ? $1\n)',
			args  : ['category'],
		},
	},

	{
		label: 'JSONB ?| any key exists',
		fn: () => helice.select('post')
			.where({ '?|:meta': ['category', 'tags'] })
			.prepare()(),
		expected: {
			query : 'SELECT *\nFROM post\nWHERE (\n\tmeta ?| $1\n)',
			args  : [['category', 'tags']],
		},
	},

	{
		label: 'IN subquery',
		fn: () => helice.select('user')
			.in('id', helice.select('post').field(['author_id']).where({ published: true }))
			.prepare()(),
		expected: {
			query : 'SELECT *\nFROM user\nWHERE (\n\tid IN (SELECT author_id\n\tFROM post\n\tWHERE (\n\t\tpublished = $1\n\t))\n)',
			args  : [true],
		},
	},

	{
		label: 'NOT IN subquery',
		fn: () => helice.select('user')
			.notIn('id', helice.select('post').field(['author_id']).where({ published: false }))
			.prepare()(),
		expected: {
			query : 'SELECT *\nFROM user\nWHERE (\n\tid NOT IN (SELECT author_id\n\tFROM post\n\tWHERE (\n\t\tpublished = $1\n\t))\n)',
			args  : [false],
		},
	},

	{
		label: 'IN subquery combined with static WHERE',
		// IN subquery params are numbered before the static WHERE params
		fn: () => helice.select('user')
			.in('id', helice.select('post').field(['author_id']).where({ published: true }))
			.where({ active: true })
			.prepare()(),
		expected: {
			query : 'SELECT *\nFROM user\nWHERE (\n\tid IN (SELECT author_id\n\tFROM post\n\tWHERE (\n\t\tpublished = $1\n\t))\n\tAND active = $2\n)',
			args  : [true, true],
		},
	},

	{
		label    : 'ORDER BY single column string',
		fn       : () => helice.select('post').orderBy('views').prepare()(),
		expected : { query: 'SELECT *\nFROM post\nORDER BY views', args: [] },
	},

	{
		label    : 'ORDER BY array of columns',
		fn       : () => helice.select('post').orderBy(['published', 'views']).prepare()(),
		expected : { query: 'SELECT *\nFROM post\nORDER BY published, views', args: [] },
	},

	{
		label: 'ORDER BY object with directions',
		fn: () => helice.select('post')
			.where({ published: true })
			.orderBy({ views: 'DESC', title: 'ASC' })
			.prepare()(),
		expected: {
			query : 'SELECT *\nFROM post\nWHERE (\n\tpublished = $1\n)\nORDER BY views DESC, title ASC',
			args  : [true],
		},
	},

	{
		label: 'ORDER BY with JOIN (qualified columns)',
		fn: () => helice.select('post')
			.join({ user: 'id = post.author_id' })
			.field({ postId: 'post.id', title: 'post.title' })
			.orderBy({ 'post.views': 'DESC', 'user.name': 'ASC' })
			.prepare()(),
		expected: {
			query : 'SELECT post.id AS postId, post.title AS title\nFROM post\nLEFT JOIN user\n\tON user.id = post.author_id\nORDER BY post.views DESC, user.name ASC',
			args  : [],
		},
	},

	{
		label: 'runtime ORDER BY',
		fn: () => {
			const listPosts = helice.select('post')
				.where({ published: true })
				.prepare({ orderBy: true });
			return listPosts({ orderBy: { views: 'DESC' } });
		},
		expected: {
			query : 'SELECT *\nFROM post\nWHERE (\n\tpublished = $1\n)\nORDER BY views DESC',
			args  : [true],
		},
	},

	{
		label    : 'build() — static shorthand',
		fn       : () => helice.select('post').where({ published: true }).build(),
		expected : { query: 'SELECT *\nFROM post\nWHERE (\n\tpublished = $1\n)', args: [true] },
	},

	{
		label: 'execute() — executor called with query and args',
		fn: () => helice.select('post').where({ published: true })
			.execute((query, args) => ({ query, args })),
		expected: {
			query : 'SELECT *\nFROM post\nWHERE (\n\tpublished = $1\n)',
			args  : [true],
		},
	},

	{
		label: 'Helice-level CTE — with() on instance',
		fn: () => {
			const scoped = helice.with('active_user', helice.select('user').field(['id', 'name']).where({ active: true }));
			return scoped.select('post')
				.join({ active_user: 'id = post.author_id' })
				.field({ title: 'post.title', author: 'active_user.name' })
				.prepare()();
		},
		expected: {
			query : 'WITH active_user AS (\nSELECT id, name\nFROM user\nWHERE (\n\tactive = $1\n)\n)\nSELECT post.title AS title, active_user.name AS author\nFROM post\nLEFT JOIN active_user\n\tON active_user.id = post.author_id',
			args  : [true],
		},
	},

	{
		label: 'Helice-level CTE — stacked with()',
		// Both CTEs emitted in WITH even when only one is used in the main query
		fn: () => {
			const scoped = helice
				.with('active_user', helice.select('user').field(['id', 'name']).where({ active: true }))
				.with('top_post',    helice.select('post').field(['id', 'author_id']).where({ '>=:views': 100 }));
			return scoped.select('post')
				.join({ active_user: 'id = post.author_id' })
				.field({ title: 'post.title', author: 'active_user.name' })
				.where({ 'post.published': true })
				.prepare()();
		},
		expected: {
			query : 'WITH active_user AS (\nSELECT id, name\nFROM user\nWHERE (\n\tactive = $1\n)\n),\ntop_post AS (\nSELECT id, author_id\nFROM post\nWHERE (\n\tviews >= $2\n)\n)\nSELECT post.title AS title, active_user.name AS author\nFROM post\nLEFT JOIN active_user\n\tON active_user.id = post.author_id\nWHERE (\n\tpost.published = $3\n)',
			args  : [true, 100, true],
		},
	},

];

if (!process.env.VITEST) {
	for (const { label, fn } of cases) {
		console.log(`\n── ${label}`);
		console.log(fn());
	}
}

describe('SELECT', () => {
	for (const { label, fn, expected } of cases) {
		it(label, () => expect(fn()).toEqual(expected));
	}
});
