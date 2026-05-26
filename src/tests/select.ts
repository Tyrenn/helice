import { Helice } from "../index.js";
import { VerboseSyntaxKeys } from "../syntaxkeys";


// ────────────────────────────────────────────────────────────────────────────
//  Domain types
// ────────────────────────────────────────────────────────────────────────────

type User = {
	id     : number;
	name   : string;
	email  : string;
	active : boolean;
};

type Post = {
	id        : number;
	author_id : number;
	title     : string;
	content   : string;
	published : boolean;
	views     : number;
	tags      : string[];
};

type Comment = {
	id        : number;
	post_id   : number;
	author_id : number;
	body      : string;
};

// Virtual type used as a CTE alias (see examples 11–12)
type ActiveUser = {
	id   : number;
	name : string;
};

type BlogEnv = {
	user        : User;
	post        : Post;
	comment     : Comment;
	active_user : ActiveUser;
};

const db     = new Helice<BlogEnv>();
const verboseDb = new Helice<BlogEnv, VerboseSyntaxKeys>(VerboseSyntaxKeys);


// ── 1. Minimal ───────────────────────────────────────────────────────────────
//
//  SELECT *
//  FROM user

const ex1 = db.select('user')
	.prepareClaude()();
console.log(ex1);


// ── 2. Array field ───────────────────────────────────────────────────────────
//  Pick specific columns from a single-table query.
//  In single-table context bare column names are valid.
//
//  SELECT id, name, email
//  FROM user

const ex2 = db.select('user')
	.field(['id', 'name', 'email'])
	.prepareClaude()();
console.log(ex2);


// ── 3. String field with alias ────────────────────────────────────────────────
//  '@' is the DefaultSyntaxKeys alias separator.
//
//  SELECT id AS postId
//  FROM post

const ex3 = db.select('post')
	.field('id@postId')
	.prepareClaude()();
console.log(ex3);


// ── 4. Static where ───────────────────────────────────────────────────────────
//  Equality (plain key) and comparison (operator prefix).
//  Args are positional: $1, $2 in order of appearance.
//
//  SELECT *
//  FROM post
//  WHERE published = $1 AND views >= $2
//  args: [true, 1000]

const ex4 = db.select('post')
	.where({
		published  : true,
		'>=:views' : 1000,
	})
	.prepareClaude()();
console.log(ex4);


// ── 5. Where with OR group (&&:) ──────────────────────────────────────────────
//  An array under '&&:name' produces an OR between all its elements.
//  Each element is AND-ed internally.
//
//  WHERE published = $1 AND (views >= $2 OR title ~~ $3)
//  args: [true, 500, '%TypeScript%']

const ex5 = db.select('post')
	.where({
		published  : true,
		'&&:pop'   : [
			{ '>=:views' : 500            },
			{ '~~:title' : '%TypeScript%' },
		],
	})
	.prepareClaude()();
console.log(ex5);


// ── 6. Object field + where + static limit ────────────────────────────────────
//  Object form: keys are aliases, values are column references or literals.
//
//  SELECT id AS postId, title AS postTitle, true AS flagged
//  FROM post
//  WHERE published = $1
//  LIMIT 5

const ex6 = db.select('post')
	.field({
		postId    : 'id',
		postTitle : 'title',
		flagged   : true,
	})
	.where({ published: true })
	.limit(5)
	.prepareClaude()();
console.log(ex6);


// ── 7. prepareClaude with runtime where + limit ───────────────────────────────
//  Options {where:true, limit:true} expose those args at call time.
//  The static where is merged with the runtime where via AND.
//
//  Static clause:  published = $1
//  Runtime clause: views >= $2  (params shifted to avoid collision)
//  LIMIT $runtime
//
//  args: [true, 500]

const findPosts = db.select('post')
	.where({ published: true })
	.prepareClaude({ where: true, limit: true });

const ex7 = findPosts({ where: { '>=:views': 500 }, limit: 10 });
console.log(ex7);


// ── 8. Join + object field + where ────────────────────────────────────────────
//  After .join(), From becomes undefined → qualified "table.col" names required
//  everywhere (field, where).
//  Join key format: { tableName: 'targetCol = accEnv.accCol' }
//  Default join type is LEFT JOIN.
//
//  SELECT post.id AS postId, post.title AS title, user.name AS authorName
//  FROM post
//  LEFT JOIN user ON user.id = post.author_id
//  WHERE post.published = $1
//  args: [true]

const ex8 = db.select('post')
	.join({ user: 'id = post.author_id' })
	.field({
		postId     : 'post.id',
		title      : 'post.title',
		authorName : 'user.name',
	})
	.where({ 'post.published': true })
	.prepareClaude()();
console.log(ex8);


// ── 9. Explicit join type via key prefix ─────────────────────────────────────
//  The join type token (innerJoin, leftJoin, …) becomes a key prefix.
//  DefaultSyntaxKeys: innerJoin = ' i# ', leftJoin = ' l# '.
//  Here we use innerJoin (' i# ') so only posts with a matching author are kept.
//
//  SELECT post.id AS postId, post.title AS title
//  FROM post
//  INNER JOIN user ON user.id = post.author_id
//  WHERE user.active = $1
//  args: [true]

const ex9 = db.select('post')
	.join({ ' i# user': 'id = post.author_id' })
	.field({
		postId : 'post.id',
		title  : 'post.title',
	})
	.where({ 'user.active': true })
	.prepareClaude()();
console.log(ex9);


// ── 10. VerboseSyntaxKeys: same query, different token style ──────────────────
//  VerboseSyntaxKeys flips operator position: operators are suffixes on keys.
//  Alias separator: ' AS ',  join prefix: ' INNER JOIN '.
//
//  SELECT post.id AS postId, post.title AS title
//  FROM post
//  INNER JOIN user ON user.id = post.author_id
//  WHERE user.active = $1

const ex10 = verboseDb.select('post')
	.join({ ' INNER JOIN user': 'id = post.author_id' })
	.field({
		postId : 'post.id',
		title  : 'post.title',
	})
	.where({ 'user.active =': true })
	.prepareClaude()();
console.log(ex10);


// ── 11. Aggregation: json_agg with nested object + GROUP BY ───────────────────
//  json_agg accumulates rows into a JSON array and adds GROUP BY automatically.
//
//  SELECT post.id AS postId, post.title AS title,
//         json_agg(json_build_object('commentId', comment.id, 'body', comment.body)) AS comments
//  FROM post
//  LEFT JOIN comment ON comment.post_id = post.id
//  WHERE post.published = $1
//  GROUP BY post.id

const ex11 = db.select('post')
	.join({ comment: 'post_id = post.id' })
	.field({
		postId   : 'post.id',
		title    : 'post.title',
		comments : {
			fn    : 'json_agg',
			group : 'post.id',
			value : {
				commentId : 'comment.id',
				body      : 'comment.body',
			}
		}
	})
	.where({ 'post.published': true })
	.prepareClaude()();
console.log(ex11);


// ── 12. CTE: static (baked in at build time) ──────────────────────────────────
//  .with() stores the CTE's prepared function immediately.
//  The CTE alias ('active_user') must match a key in BlogEnv so that .join()
//  can resolve its table type.
//
//  WITH active_user AS (
//    SELECT id, name FROM user WHERE active = $1
//  )
//  SELECT active_user.id AS userId, active_user.name AS name, post.title AS title
//  FROM post
//  LEFT JOIN active_user ON active_user.id = post.author_id
//  WHERE post.published = $2
//  args: [true, true]

const activeUserCTE = db.select('user')
	.field(['id', 'name'])
	.where({ active: true });

const ex12 = db.select('post')
	.with('active_user', activeUserCTE)
	.join({ active_user: 'id = post.author_id' })
	.field({
		userId : 'active_user.id',
		name   : 'active_user.name',
		title  : 'post.title',
	})
	.where({ 'post.published': true })
	.prepareClaude()();
console.log(ex12);


// ── 13. CTE with runtime args ─────────────────────────────────────────────────
//  Passing { where: true } to .with() exposes the CTE's where at call time.
//  The outer prepareClaude also exposes its own runtime args.
//  Runtime CTE args are passed under { ctes: { cteName: { ... } } }.
//
//  WITH active_user AS (
//    SELECT id, name FROM user WHERE active = $1 AND user.name ~~ $2
//  )
//  SELECT active_user.id AS userId, post.title AS title
//  FROM post
//  LEFT JOIN active_user ON active_user.id = post.author_id
//  WHERE post.published = $3 AND post.views >= $4
//  args: [true, 'Alice%', true, 200]

const runtimeCTE = db.select('user')
	.field(['id', 'name'])
	.where({ active: true });

const postsForUser = db.select('post')
	.with('active_user', runtimeCTE, { where: true })
	.join({ active_user: 'id = post.author_id' })
	.field({
		userId : 'active_user.id',
		title  : 'post.title',
	})
	.where({ 'post.published': true })
	.prepareClaude({ where: true });

const ex13 = postsForUser({
	where : { '>=:post.views': 200 },
	ctes  : {
		active_user: { where: { '~~:user.name': 'Alice%' } }
	}
});
console.log(ex13);


// ── 14. Field reduction ───────────────────────────────────────────────────────
//  After calling .field(), the FieldScope generic is narrowed to only the source
//  columns of that static field. The runtime field (when { field: true } is set)
//  can only reference those columns — not others from the original table.
//
//  Static selects: post.id, post.title, post.views
//  Runtime can re-select / re-alias a subset of those three.
//  Attempting to add post.content or post.author_id → TypeScript error.

const staticFieldQuery = db.select('post')
	.field({
		postId    : 'id',
		postTitle : 'title',
		postViews : 'views',
	})
	.prepareClaude({ field: true });

// Full static set, with re-aliasing
const ex14a = staticFieldQuery({ field: { myId: 'post.id', myTitle: 'post.title', myViews: 'post.views' } });

// Reduced subset
const ex14b = staticFieldQuery({ field: ['post.id', 'post.title'] });

console.log(ex14a, ex14b);
// TS ERROR: post.content was not in the static field — uncomment to verify
// const ex14c = staticFieldQuery({ field: { content: 'post.content' } });
