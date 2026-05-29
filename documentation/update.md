# UPDATE

`db.update(table)` builds an `UPDATE` query. It supports multi-table updates via `FROM`, CTEs, a `WHERE` clause, an optional `RETURNING` clause, and runtime overrides for `SET` and `WHERE`.

```typescript
const { query, args } = db.update('user')
  .set({ active: false })
  .where({ id: 5 })
  .prepare()();
```

```sql
UPDATE user
SET active = $1
WHERE (id = $2)
```

---

## `.set()`

Specifies the columns to update and their new values. Keys are column names, values are the new data.

```typescript
db.update('user')
  .set({ name: 'Alice Updated', email: 'new@example.com' })
  .where({ id: 1 })
  .prepare()()
```

```sql
UPDATE user
SET name = $1,
    email = $2
WHERE (id = $3)
```

---

## `.where()`

Same syntax as SELECT. See the [WHERE reference](../README.md#where) in the main README.

```typescript
db.update('post')
  .set({ published: false })
  .where({ author_id: 1, '>=:views': 0 })
  .prepare()()
```

Column-to-column comparisons with `col()`:
```typescript
import { col } from 'helice';

db.update('post')
  .set({ published: false })
  .where({ 'post.author_id': col('user.id') })
  .prepare()()
```

---

## `.using()` — multi-table UPDATE

PostgreSQL supports `UPDATE … FROM` to join another table into the update. Pass the table names to `.using()`, then reference them in `.where()`.

```typescript
import { col } from 'helice';

db.update('post')
  .using(['user'])
  .set({ published: false })
  .where({ 'post.author_id': col('user.id'), 'user.active': false })
  .prepare()()
```

```sql
UPDATE post
SET published = $1
FROM user
WHERE (post.author_id = user.id AND user.active = $2)
```

---

## `.with()` — CTEs

Prepends a `WITH` clause. Useful when the update depends on a derived set of rows.

```typescript
db.update('post')
  .with('inactive_users', db.select('user').where({ active: false }))
  .using(['inactive_users'])
  .set({ published: false })
  .where({ 'post.author_id': col('inactive_users.id') })
  .prepare()()
```

```sql
WITH inactive_users AS (
  SELECT *
  FROM user
  WHERE (active = $1)
)
UPDATE post
SET published = $2
FROM inactive_users
WHERE (post.author_id = inactive_users.id)
```

Parameter numbering across CTEs and the main query is handled automatically.

### Runtime CTE args

Pass a `prepare` options object as the third argument to `.with()` to enable runtime overrides inside the CTE. The CTE's args are passed under the alias key at call time:

```typescript
const q = db.update('post')
  .with(
    'target_users',
    db.select('user').where({ active: true }),
    { where: true }
  )
  .using(['target_users'])
  .set({ published: false })
  .where({ 'post.author_id': col('target_users.id') })
  .prepare();

q({ target_users: { where: { '~~:name': 'Alice%' } } })
```

---

## `.in()` / `.notIn()`

Adds a `col IN (subquery)` or `col NOT IN (subquery)` condition. Parameters from the IN subquery are numbered after SET values.

```typescript
// Unpublish posts by inactive users
db.update('post')
  .set({ published: false })
  .in('author_id', db.select('user').field(['id']).where({ active: false }))
  .prepare()()
// SET published = $1
// WHERE (author_id IN (SELECT id FROM user WHERE (active = $2)))
```

Can be combined with `.where()`:
```typescript
db.update('post')
  .set({ published: false })
  .in('author_id', db.select('user').field(['id']).where({ active: false }))
  .where({ '>=:views': 100 })
  .prepare()()
// WHERE (author_id IN (...) AND views >= $3)
```

---

## `.returning()`

Appends `RETURNING` to the query:

```typescript
db.update('user')
  .set({ active: false })
  .where({ id: 5 })
  .returning(['id', 'name', 'active'])
  .prepare()()
```

```sql
UPDATE user
SET active = $1
WHERE (id = $2)
RETURNING id, name, active
```

---

## `.build()` / `.execute()`

```typescript
const { query, args } = db.update('user').set({ active: false }).where({ id: 5 }).build();

await db.update('user').set({ active: false }).where({ id: 5 })
  .execute((q, a) => pgClient.query(q, a));
```

Both use static SET + WHERE only. For runtime set/where, use `.prepare()`.

---

## `.prepare()` — runtime options

| Option | Type | Behaviour |
|--------|------|-----------|
| `set` | `true` | Supply the SET values at call time |
| `where` | `true` | Runtime WHERE merged AND with static WHERE |
| `where` | `{ [table]: true \| string[] }` | Same, restricted to specific tables/columns |

### Examples

```typescript
// Runtime SET + runtime WHERE
const updateUser = db.update('user')
  .prepare({ set: true, where: true });

updateUser({ set: { name: 'Dave', active: true }, where: { id: 10 } })

// Restricted runtime WHERE — only 'id' column allowed
const updateUser = db.update('user')
  .prepare({ set: true, where: { user: ['id'] } });

updateUser({ set: { name: 'Dave' }, where: { id: 10 } })
// TypeScript will reject where: { email: '...' } — not in the restriction list

// Static SET + runtime WHERE merged AND
const publishPosts = db.update('post')
  .set({ published: true })
  .where({ author_id: 1 })
  .prepare({ where: true });

publishPosts({ where: { '>=:views': 100 } })
// SET published = $1 WHERE (author_id = $2 AND views >= $3)
```
