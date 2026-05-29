# DELETE

`db.delete(table)` builds a `DELETE FROM` query. It supports multi-table deletes via `USING`, CTEs, a `WHERE` clause, an optional `RETURNING` clause, and a runtime override for `WHERE`.

```typescript
const { query, args } = db.delete('user')
  .where({ id: 99 })
  .prepare()();
```

```sql
DELETE FROM user
WHERE (id = $1)
```

---

## `.where()`

Same syntax as SELECT. See the [WHERE reference](../README.md#where) in the main README.

```typescript
db.delete('post')
  .where({ published: false, '<=:views': 0 })
  .prepare()()
```

```sql
DELETE FROM post
WHERE (published = $1 AND views <= $2)
```

Column-to-column comparisons with `col()`:
```typescript
import { col } from 'helice';

db.delete('post')
  .where({ 'post.author_id': col('user.id') })
  .prepare()()
```

---

## `.using()` — multi-table DELETE

PostgreSQL supports `DELETE … USING` to filter rows by joining another table. Pass the table names to `.using()`, then reference them in `.where()`.

```typescript
import { col } from 'helice';

db.delete('post')
  .using(['user'])
  .where({ 'post.author_id': col('user.id'), 'user.active': false })
  .prepare()()
```

```sql
DELETE FROM post
USING user
WHERE (post.author_id = user.id AND user.active = $1)
```

---

## `.with()` — CTEs

Prepends a `WITH` clause, useful when the set of rows to delete is derived from a subquery.

```typescript
db.delete('post')
  .with('stale_authors', db.select('user').where({ active: false }))
  .using(['stale_authors'])
  .where({ 'post.author_id': col('stale_authors.id') })
  .prepare()()
```

```sql
WITH stale_authors AS (
  SELECT *
  FROM user
  WHERE (active = $1)
)
DELETE FROM post
USING stale_authors
WHERE (post.author_id = stale_authors.id)
```

Parameter numbering across CTEs and the main query is handled automatically.

### Runtime CTE args

Pass a `prepare` options object as the third argument to `.with()` to enable runtime overrides inside the CTE. The CTE's args are passed under the alias key at call time:

```typescript
const q = db.delete('post')
  .with(
    'target_authors',
    db.select('user').where({ active: true }),
    { where: true }
  )
  .using(['target_authors'])
  .where({ 'post.author_id': col('target_authors.id') })
  .prepare();

q({ target_authors: { where: { '~~:name': 'Alice%' } } })
```

---

## `.in()` / `.notIn()`

Adds a `col IN (subquery)` or `col NOT IN (subquery)` condition.

```typescript
// Delete posts by inactive users
db.delete('post')
  .in('author_id', db.select('user').field(['id']).where({ active: false }))
  .prepare()()
// WHERE (author_id IN (SELECT id FROM user WHERE (active = $1)))

// Delete orphaned posts (author no longer exists)
db.delete('post')
  .notIn('author_id', db.select('user').field(['id']))
  .prepare()()
// WHERE (author_id NOT IN (SELECT id FROM user))
```

---

## `.returning()`

Appends `RETURNING` to the query:

```typescript
db.delete('post')
  .where({ published: false })
  .returning({ postId: 'id', postTitle: 'title' })
  .prepare()()
```

```sql
DELETE FROM post
WHERE (published = $1)
RETURNING id AS postId, title AS postTitle
```

---

## `.build()` / `.execute()`

```typescript
const { query, args } = db.delete('user').where({ id: 99 }).build();

await db.delete('user').where({ id: 99 })
  .execute((q, a) => pgClient.query(q, a));
```

Both use the static WHERE only. For runtime where, use `.prepare()`.

---

## `.prepare()` — runtime options

| Option | Type | Behaviour |
|--------|------|-----------|
| `where` | `true` | Runtime WHERE merged AND with static WHERE |
| `where` | `{ [table]: true \| string[] }` | Same, restricted to specific tables/columns |

### Examples

```typescript
// Runtime WHERE merged AND with a static condition
const deletePostsBy = db.delete('post')
  .where({ author_id: 3 })
  .prepare({ where: true });

deletePostsBy({ where: { published: false } })
// WHERE (author_id = $1 AND published = $2)

// Restricted runtime WHERE — only 'views' column allowed
const deleteStale = db.delete('post')
  .where({ published: false })
  .prepare({ where: { post: ['views'] } });

deleteStale({ where: { '<=:views': 0 } })
// WHERE (published = $1 AND views <= $2)
// TypeScript rejects any column outside ['views']
```
