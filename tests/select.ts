import { type Case, db, verboseDb } from './env.js';

export const cases: Case[] = [

	{
		label : 'minimal (SELECT *)',
		// SELECT *
		// FROM user
		fn       : () => db.select('user').prepare()(),
		expected : { query: 'SELECT *\nFROM user', args: [] },
	},

	{
		label : 'array field',
		// SELECT id, name, email
		// FROM user
		fn       : () => db.select('user').field(['id', 'name', 'email']).prepare()(),
		expected : { query: 'SELECT id, name, email\nFROM user', args: [] },
	},

	{
		label : 'string field with alias (@)',
		// SELECT id AS postId
		// FROM post
		fn       : () => db.select('post').field('id@postId').prepare()(),
		expected : { query: 'SELECT id AS postId\nFROM post', args: [] },
	},

	{
		label : 'static WHERE',
		// SELECT *
		// FROM post
		// WHERE (published = $1 AND views >= $2)
		fn: () => db.select('post')
			.where({ published: true, '>=:views': 1000 })
			.prepare()(),
		expected: {
			query : 'SELECT *\nFROM post\nWHERE (\n\tpublished = $1\n\tAND views >= $2\n)',
			args  : [true, 1000],
		},
	},

	{
		label : 'WHERE with OR group (&&:)',
		// SELECT *
		// FROM post
		// WHERE (published = $1 AND (views >= $2 OR title ~~ $3))
		fn: () => db.select('post')
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
		label : 'object field + WHERE + static LIMIT',
		// SELECT id AS postId, title AS postTitle, true AS flagged
		// FROM post
		// WHERE (published = $1)
		// LIMIT 5
		fn: () => db.select('post')
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
		label : 'runtime WHERE + runtime LIMIT',
		// WHERE (published = $1 AND views >= $2)
		// LIMIT 10
		fn: () => {
			const findPosts = db.select('post')
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
		label : 'LEFT JOIN + object field + WHERE',
		// SELECT post.id AS postId, post.title AS title, user.name AS authorName
		// FROM post
		// LEFT JOIN user ON user.id = post.author_id
		// WHERE (post.published = $1)
		fn: () => db.select('post')
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
		label : 'INNER JOIN via key prefix ( i# )',
		// FROM post
		// INNER JOIN user ON user.id = post.author_id
		fn: () => db.select('post')
			.join({ ' i# user': 'id = post.author_id' })
			.field({ postId: 'post.id', title: 'post.title' })
			.where({ 'user.active': true })
			.prepare()(),
		expected: {
			query : 'SELECT post.id AS postId, post.title AS title\nFROM post\nINNER JOIN user\n\tON user.id = post.author_id\nWHERE (\n\tuser.active = $1\n)',
			args  : [true],
		},
	},

	{
		label : 'VerboseSyntaxKeys - operators as suffixes',
		fn: () => verboseDb.select('post')
			.join({ ' INNER JOIN user': 'id = post.author_id' })
			.field({ postId: 'post.id', title: 'post.title' })
			.where({ 'user.active =': true })
			.prepare()(),
		expected: {
			query : 'SELECT post.id AS postId, post.title AS title\nFROM post\nINNER JOIN user\n\tON user.id = post.author_id\nWHERE (\n\tuser.active = $1\n)',
			args  : [true],
		},
	},

	{
		label : 'json_agg aggregation + GROUP BY',
		// SELECT post.id AS postId, post.title AS title,
		//        json_agg(json_build_object('commentId', comment.id, 'body', comment.body)) AS comments
		// FROM post
		// LEFT JOIN comment ON comment.post_id = post.id
		// WHERE (post.published = $1)
		// GROUP BY post.id
		fn: () => db.select('post')
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
		label : 'static CTE',
		// WITH active_user AS (SELECT id, name FROM user WHERE active = $1)
		// SELECT active_user.id AS userId, active_user.name AS name, post.title AS title
		// FROM post
		// LEFT JOIN active_user ON active_user.id = post.author_id
		// WHERE (post.published = $2)
		fn: () => db.select('post')
			.with('active_user', db.select('user').field(['id', 'name']).where({ active: true }))
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
		label : 'CTE with runtime args',
		// WITH active_user AS (SELECT id, name FROM user WHERE active = $1 AND user.name ~~ $2)
		// WHERE (post.published = $3 AND post.views >= $4)
		fn: () => {
			const postsForUser = db.select('post')
				.with('active_user', db.select('user').field(['id', 'name']).where({ active: true }), { where: true })
				.field({ userId: 'content', title: 'azadazd' })
				.where({ 'post.published': true })
				.prepare({ where: true });
			return postsForUser({
				where       : { '>=:post.views': 200 },
				active_user : { where: { '~~:user.name': 'Alice%' } },
			});
		},
		expected: {
			query : 'WITH active_user AS (\nSELECT id, name\nFROM user\nWHERE (\n\tactive = $1\n\tAND user.name ~~ $2\n)\n)\nSELECT content AS userId, azadazd AS title\nFROM post\nWHERE (\n\tpost.published = $3\n\tAND post.views >= $4\n)',
			args  : [true, 'Alice%', true, 200],
		},
	},

	{
		label : 'field reduction - full re-aliased',
		// Runtime field restricted to statically selected columns (post.id, post.title, post.views)
		fn: () => {
			const q = db.select('post')
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
		label : 'field reduction - subset',
		fn: () => {
			const q = db.select('post')
				.field({ postId: 'id', postTitle: 'title', postViews: 'views' })
				.prepare({ field: true });
			return q({ field: ['post.id', 'post.title'] });
		},
		expected: {
			query : 'SELECT post.id, post.title\nFROM post',
			args  : [],
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
