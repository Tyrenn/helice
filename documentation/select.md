# SELECT

`db.select(table)` builds a `SELECT` query. It supports field selection, joins, CTEs, filtering, ordering, and pagination, with optional runtime overrides for most clauses.

```typescript
const { query, args } = db.select('post')
  .field({ postId: 'id', title: 'title' })
  .where({ published: true })
  .orderBy({ views: 'DESC' })
  .limit(10)
  .prepare()();
```

---

## `.field()`

Controls the `SELECT` list. Omitting `.field()` selects `*`.

### String form

```typescript
db.select('post').field('*')           // SELECT *
db.select('post').field('id')          // SELECT id  (single-table)
db.select('post').field('post.id')     // SELECT post.id  (joined query)
db.select('post').field('id@postId')   // SELECT id AS postId
```

### Array form

```typescript
db.select('post').field(['id', 'title', 'author_id@authorId'])
// SELECT id, title, author_id AS authorId
```

### Object form

Keys are output aliases. Values can be:

| Value type | Example | SQL |
|------------|---------|-----|
| Column ref | `'post.id'` | `post.id AS alias` |
| Number literal | `42` | `42 AS alias` |
| Boolean literal | `true` | `true AS alias` |
| String literal | `"'hello'"` | `'hello' AS alias` |
| Aggregation | `{ fn: 'json_agg', group, value }` | `json_agg(...) AS alias` + GROUP BY |
| JSON object | `{ fn: 'json_build_object', value }` | `json_build_object(...) AS alias` |
| Raw SQL | `{ fn: 'raw', value: 'EXPR' }` | `EXPR AS alias` |

```typescript
db.select('post')
  .join({ comment: 'post_id = post.id' })
  .field({
    postId   : 'post.id',
    title    : 'post.title',
    published: true,
    comments : {
      fn    : 'json_agg',
      group : 'post.id',
      value : { id: 'comment.id', body: 'comment.body' }
    },
    updated  : { fn: 'raw', value: 'NOW()' }
  })
  .prepare()()
```

```sql
SELECT post.id AS postId, post.title AS title, true AS published,
       json_agg(json_build_object('id', comment.id, 'body', comment.body)) AS comments,
       NOW() AS updated
FROM post
LEFT JOIN comment ON comment.post_id = post.id
GROUP BY post.id
```

Aggregations with multiple group columns:
```typescript
.field({
  result: {
    fn    : 'array_agg',
    group : ['post.id', 'post.title'],
    value : 'comment.id'
  }
})
```

---

## `.join()`

Adds a join clause. The key is the table to join (with an optional type prefix); the value is the `ON` condition (written as if the joined table is already in scope).

```typescript
db.select('post')
  .join({ user: 'id = post.author_id' })           // LEFT JOIN (default)
  .join({ 'i#user': 'id = post.author_id' })       // INNER JOIN
  .join({ 'f#user': 'id = post.author_id' })       // FULL JOIN
  .join({ 'r#user': 'id = post.author_id' })       // RIGHT JOIN
  .join({ 'l#user': 'id = post.author_id' })       // LEFT JOIN (explicit)
```

With `VerboseSyntaxKeys`:
```typescript
.join({ 'INNER JOIN user': 'id = post.author_id' })
.join({ 'LEFT JOIN user':  'id = post.author_id' })
```

After a join, bare column names are no longer valid. Use `table.column` everywhere in `.field()`, `.where()`, and `.orderBy()`.

---

## `.with()` — CTEs

Registers a CTE (`WITH` clause). The first argument is the alias, the second is another Helice query.

```typescript
const activeUsers = db.select('user').field(['id', 'name']).where({ active: true });

db.select('post')
  .with('active_user', activeUsers)
  .join({ active_user: 'id = post.author_id' })
  .field({ title: 'post.title', author: 'active_user.name' })
  .prepare()()
```

```sql
WITH active_user AS (
  SELECT id, name
  FROM user
  WHERE (active = $1)
)
SELECT post.title AS title, active_user.name AS author
FROM post
LEFT JOIN active_user ON active_user.id = post.author_id
```

Parameter numbering is handled automatically — CTE parameters come first, then main query parameters.

### Runtime CTE args

Pass a `prepare` options object as the third argument to enable runtime overrides inside the CTE. The CTE's runtime args are then passed under the alias key at call time:

```typescript
const q = db.select('post')
  .with(
    'active_user',
    db.select('user').field(['id', 'name']).where({ active: true }),
    { where: true }    // enable runtime WHERE inside the CTE
  )
  .where({ 'post.published': true })
  .prepare({ where: true });

q({
  where       : { '>=:post.views': 200 },
  active_user : { where: { '~~:user.name': 'Alice%' } },
})
```

```sql
WITH active_user AS (
  SELECT id, name
  FROM user
  WHERE (active = $1 AND user.name ~~ $2)
)
SELECT *
FROM post
WHERE (post.published = $3 AND post.views >= $4)
```

---

## `.where()`

See the [WHERE reference](../README.md#where) in the main README for the full operator table. A few examples:

```typescript
// Equality (default operator)
.where({ published: true, author_id: 1 })

// Comparison
.where({ '>=:views': 100, '<:views': 10000 })

// LIKE
.where({ '~~:title': '%typescript%' })
.where({ '~~*:title': '%TYPESCRIPT%' })  // ILIKE

// Null check
.where({ deleted_at: null })             // IS NULL

// Array contains
.where({ '[=]:tags': 'postgres' })       // 'postgres' = ANY(tags)

// OR group
.where({
  published : true,
  '&&:any'  : [
    { '~~:title': '%TypeScript%' },
    { '~~:title': '%Postgres%'   },
  ]
})

// Column-to-column
import { col } from 'helice';
.where({ 'post.author_id': col('user.id') })
```

---

## `.in()` / `.notIn()`

Adds a `col IN (subquery)` or `col NOT IN (subquery)` condition to the WHERE clause. The subquery must be a Helice SELECT query typed to return a single column compatible with the target column.

```typescript
// Users who have published at least one post
db.select('user')
  .in('id', db.select('post').field(['author_id']).where({ published: true }))
  .prepare()()
// WHERE (id IN (SELECT author_id FROM post WHERE (published = $1)))

// Users with no published posts
db.select('user')
  .notIn('id', db.select('post').field(['author_id']).where({ published: true }))
  .prepare()()

// Combined with a static WHERE — IN params come first, then WHERE params
db.select('user')
  .in('id', db.select('post').field(['author_id']).where({ published: true }))
  .where({ active: true })
  .prepare()()
// WHERE (id IN (SELECT author_id FROM post WHERE (published = $1)) AND active = $2)
```

Multiple `.in()` / `.notIn()` calls accumulate as AND conditions:
```typescript
db.select('user')
  .in('id', subqueryA)
  .notIn('id', subqueryB)
  .prepare()()
// WHERE (id IN (...) AND id NOT IN (...))
```

TypeScript enforces that the subquery returns a type compatible with the column. For example, `.in('id', ...)` where `id: number` requires a subquery whose selected column is also `number`.

---

## `.orderBy()`

```typescript
.orderBy('views')                            // ORDER BY views
.orderBy(['published', 'views'])             // ORDER BY published, views
.orderBy({ views: 'DESC', title: 'ASC' })   // ORDER BY views DESC, title ASC
.orderBy({ views: 'DESC', title: '' })      // ORDER BY views DESC, title
```

After a join, use fully-qualified `table.column` notation.

---

## `.limit()`

```typescript
.limit(25)
```

---

## `.build()` / `.execute()`

Two shortcuts that skip the `prepare()` wrapper when you only need static parameters.

**`.build()`** — returns `{ query, args }` immediately:
```typescript
const { query, args } = db.select('post').where({ published: true }).build();
```

**`.execute(executor)`** — builds and calls the executor in one step:
```typescript
// executor can return anything — type is inferred
const rows = await db.select('user').where({ active: true })
  .execute((q, a) => pgClient.query<User[]>(q, a));
```

Both use the static clause chain only (no runtime arg support). For runtime args, use `.prepare()`.

---

## `.prepare()` — runtime options

`.prepare()` accepts an options object that enables runtime overrides for specific clauses. Static clauses are always applied; runtime clauses are merged on top at call time.

| Option | Type | Behaviour |
|--------|------|-----------|
| `where` | `true` | Runtime WHERE merged AND with static WHERE |
| `where` | `{ [table]: true \| string[] }` | Same, restricted to specific tables/columns |
| `field` | `true` | Runtime field selection, restricted to statically selected columns |
| `limit` | `true` | Runtime LIMIT override |
| `orderBy` | `true` | Runtime ORDER BY |

### Examples

```typescript
// Runtime WHERE
const findPosts = db.select('post')
  .where({ published: true })
  .prepare({ where: true });

findPosts({ where: { '>=:views': 500 } })
// WHERE (published = $1 AND views >= $2)

// Restricted runtime WHERE — only 'id' and 'email' allowed
const q = db.select('user')
  .prepare({ where: { user: ['id', 'email'] } });

q({ where: { id: 5 } })

// Runtime field (reduces the statically selected columns)
const q = db.select('post')
  .field({ postId: 'id', postTitle: 'title', postViews: 'views' })
  .prepare({ field: true });

q({ field: ['post.id', 'post.title'] })
// SELECT post.id, post.title FROM post

// Everything runtime
const q = db.select('post')
  .where({ published: true })
  .prepare({ where: true, orderBy: true, limit: true });

q({ where: { '>=:views': 100 }, orderBy: { views: 'DESC' }, limit: 20 })
// WHERE (published = $1 AND views >= $2) ORDER BY views DESC LIMIT 20
```
