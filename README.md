# Helice

**A typesafe, fluent PostgreSQL query builder for TypeScript.**

*"Hélice" (pronounced *ay-lees*) is French for mecanical propeller which looks like a `q` and a `b` from `query builder` on top of each other... We thought that was fun enough to stick with.*


## Install

```bash
npm install helice
# or
pnpm add helice
# or
yarn add helice
```

Helice has **zero runtime dependencies**. TypeScript is a dev dependency.


## Quick start

```typescript
import { Helice } from 'helice';

// 1. Define your database schema as plain TypeScript types
type User = { id: number; name: string; email: string; active: boolean };
type Post = { id: number; author_id: number; title: string; published: boolean; views: number };

type MyDB = { user: User; post: Post };

// 2. Create a Helice instance typed against your schema
const db = new Helice<MyDB>();

// 3. Build queries
const { query, args } = db.select('post')
  .where({ published: true })
  .prepare()();

// query → "SELECT *\nFROM post\nWHERE (\n\tpublished = $1\n)"
// args  → [true]
```

Pass `query` and `args` directly to your PostgreSQL client (`pg`, `postgres`, `pgx`, whatever you use).


## Concepts

### The `Helice` class

`Helice<Environment>` is the entry point. `Environment` is your database schema: an object whose keys are table names and whose values are the corresponding row types.

```typescript
const db = new Helice<MyDB>();
```

From there, every query method returns a fluent builder typed against `Environment`.

### SELECT

```typescript
// All columns
db.select('user').prepare()()

// Specific columns
db.select('user').field(['id', 'name']).prepare()()

// With alias  (@ is the default alias separator)
db.select('post').field('id@postId').prepare()()

// Object form  { alias: sourceColumn }
db.select('post').field({ postId: 'id', postTitle: 'title' }).prepare()()

// Static WHERE + LIMIT
db.select('post')
  .where({ published: true, '>=:views': 1000 })
  .limit(10)
  .prepare()()
```

#### Joins

After `.join()`, bare column names are no longer valid — you must use `table.column` notation everywhere (field, where).

```typescript
db.select('post')
  .join({ user: 'id = post.author_id' })       // LEFT JOIN by default
  .join({ ' i# user': 'id = post.author_id' }) // INNER JOIN
  .field({ postId: 'post.id', author: 'user.name' })
  .where({ 'post.published': true })
  .prepare()()
```

#### CTEs (WITH clauses)

```typescript
const activeUsers = db.select('user').field(['id', 'name']).where({ active: true });

db.select('post')
  .with('active_user', activeUsers)
  .join({ active_user: 'id = post.author_id' })
  .field({ title: 'post.title', author: 'active_user.name' })
  .prepare()()
```

---

### INSERT

```typescript
// Single row
db.insert('user')
  .values({ name: 'Alice', email: 'alice@example.com', active: true })
  .prepare()()

// Multiple rows  (column list is derived from the first row)
db.insert('post')
  .values([
    { author_id: 1, title: 'Hello', published: false, views: 0 },
    { author_id: 1, title: 'World', published: true,  views: 42 },
  ])
  .prepare()()

// With RETURNING
db.insert('user')
  .values({ name: 'Bob', email: 'bob@example.com', active: true })
  .returning(['id', 'name'])
  .prepare()()
```

---

### UPDATE

```typescript
// Static SET + WHERE
db.update('user')
  .set({ active: false })
  .where({ id: 5 })
  .prepare()()

// Multi-table (PostgreSQL UPDATE … FROM)
import { col } from 'helice';

db.update('post')
  .using(['user'])
  .set({ published: false })
  .where({ 'post.author_id': col('user.id'), 'user.active': false })
  .prepare()()
```

---

### DELETE

```typescript
// Static WHERE
db.delete('user').where({ id: 99 }).prepare()()

// Multi-table (PostgreSQL DELETE … USING)
db.delete('post')
  .using(['user'])
  .where({ 'post.author_id': col('user.id'), 'user.active': false })
  .prepare()()
```

---

### `prepare()` — static vs runtime

`.prepare()` returns a **reusable function**. You can bake values in at build time (static), or leave them open to be passed at call time (runtime). Both can coexist and are merged automatically.

```typescript
// Static: everything baked in — just call it
const getPublished = db.select('post')
  .where({ published: true })
  .prepare();

getPublished() // same result every time

// Runtime WHERE: pass a where clause when you call the function
const findPosts = db.select('post')
  .where({ published: true })          // static part
  .prepare({ where: true });           // runtime part enabled

findPosts({ where: { '>=:views': 500 }, limit: 10 })
// WHERE clause: published = $1 AND views >= $2

// You can also restrict which columns the runtime WHERE is allowed to use:
const updateUser = db.update('user')
  .prepare({ set: true, where: { user: ['id'] } });  // runtime WHERE limited to user.id

updateUser({ set: { name: 'Dave' }, where: { id: 10 } })
```

---

### WHERE syntax

Operators are expressed as **key prefixes** (default syntax) or suffixes (verbose syntax):

| Key | SQL |
|-----|-----|
| `column` | `column = $n` |
| `>=:column` | `column >= $n` |
| `~~:column` | `column ~~ $n` (LIKE) |
| `~~*:column` | `column ~~* $n` (ILIKE) |
| `[=]:column` | `$n = ANY(column)` (array contains) |
| `&&:label` | OR group — value is an array of AND conditions |

```typescript
.where({
  published  : true,
  '>=:views' : 100,
  '&&:any'   : [
    { '~~:title': '%TypeScript%' },
    { '~~:title': '%Postgres%'   },
  ]
})
// WHERE (published = $1 AND views >= $2 AND (title ~~ $3 OR title ~~ $4))
```

Column-to-column comparisons use the `col()` helper:

```typescript
import { col } from 'helice';
.where({ 'post.author_id': col('user.id') })
// post.author_id = user.id  (no parameter)
```

---

### SyntaxKeys

The default syntax puts operators on the **left** of column names. If you prefer them on the right (more SQL-like), use `VerboseSyntaxKeys`:

```typescript
import { Helice, VerboseSyntaxKeys } from 'helice';

const db = new Helice<MyDB, VerboseSyntaxKeys>(VerboseSyntaxKeys);

db.select('post').where({ 'published =': true, 'views >=': 100 }).prepare()()
```

---

### More examples

The [`tests/`](./tests/) folder contains annotated example files for every query type — a good place to get a feel for the full API before diving into your own schema.

- [`tests/select.ts`](./tests/select.ts) — SELECT, joins, CTEs, aggregations, runtime options
- [`tests/insert.ts`](./tests/insert.ts) — INSERT single/multi-row, RETURNING, runtime values
- [`tests/update.ts`](./tests/update.ts) — UPDATE, FROM clause, CTEs, runtime SET/WHERE
- [`tests/delete.ts`](./tests/delete.ts) — DELETE, USING clause, CTEs, runtime WHERE

You can run any of them directly to see the generated SQL:

```bash
pnpm test:file tests/select.ts
```

---

## Contributing

Contributions are very welcome — bug reports, ideas, PRs, anything really.

### Getting started

```bash
git clone https://github.com/your-org/helice.git
cd helice
pnpm install
pnpm test         # run the test suite
pnpm test:watch   # re-run on file changes
```

### Before opening a PR

Helice uses [Changesets](https://github.com/changesets/changesets) to manage versioning and changelogs. Before submitting a PR that contains a user-facing change, please add a changeset describing what you did:

```bash
pnpm changeset
```

You'll be asked to choose a bump type (`patch` / `minor` / `major`) and write a short description. This creates a small file in `.changeset/` — just commit it alongside your changes. That's it!

> Not sure what bump type to pick? Roughly: `patch` for bug fixes, `minor` for new features that don't break existing code, `major` for anything that changes the existing API.

### Release process (maintainers)

```bash
pnpm version   # consumes changesets → bumps package.json + updates CHANGELOG.md
pnpm release   # builds + publishes to npm
```

---

## License

MIT
