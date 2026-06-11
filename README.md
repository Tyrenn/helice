<p align="center" style="font-weight: bold">
  Hélice - Fluent Typesafe Type PostgreSQL Query Builder Queries • 🛩️
</p>

- #### 🛡️ Typesafe & Autocompletion
- #### ✏️ Customisable Syntax
- #### 🛠️ Zero Runtime Dependencies
- #### ⚡️ Fluent & Easy To Use

<br/>

> *"Hélice" (pronounced *ay-lees*) is French for mechanical propeller which looks a bit like a **`q`** and a **`b`** from `query builder` stacked on top of each other...*



## Quick start

### Install

```bash
npm install helice
# or
pnpm add helice
# or
yarn add helice
```

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
  .build();

// query: "SELECT *\nFROM post\nWHERE (\n\tpublished = $1\n)"
// args: [true]
```

Pass the generated `query` and `args` straight to your PostgreSQL client (`pg`, `postgres`, whatever). The generated query follows PostgreSQL syntax.


## Concepts

### The Environment

The first thing you give Helice is your database schema — just TypeScript types, no schema file, no codegen, no decorators.

An `Environment` is a type that describes your Database. Its keys are table names and its values describe the shape of a row in that table:

```typescript
type UserTable    = { id: number; name: string; email: string; active: boolean };
type PostTable    = { id: number; author_id: number; title: string; published: boolean; views: number };
type CommentTable = { id: number; post_id: number; body: string };

type Environment = { user: UserTable; post: PostTable; comment: CommentTable };

const db = new Helice<Environment>();
```

That's it. From this point, every builder method is fully typed against `Environment` — table names, column names, their types, valid comparisons — TypeScript will catch anything that doesn't exist or doesn't match.

### SyntaxKeys

We do like SQL and its vocabulary. With Helice, we only intend to ease query writing not replacing SQL syntax. As such Helice keeps the structure of SQL clauses intact: WHERE, JOIN, WITH etc.

Type safety comes from plain JavaScript objects describing your join, where and select statements — the TypeScript compiler checks them against your `Environment`. The syntax used inside those objects is fully customizable through a SyntaxKey object. Two sets ship out of the box:

#### **`DefaultSyntaxKeys`** — a compact symbolic set:

```typescript
.where({ '>=:views': 500, '~~:title': '%hello%' })
.field('id@postId')                 // @ as alias separator
.join({ 'i#user': '...' })          // i# for INNER JOIN
```

#### **`VerboseSyntaxKeys`** — a more SQL close syntax:

```typescript
.where({ 'views >=': 500, 'title ~~': '%hello%' })
.field('id AS postId')
.join({ 'INNER JOIN user': '...' })
```

You're free to write your own by creating an object that satisfies `SyntaxKeysConstant`. To use a specific SyntaxKeys, you just need to pass it as both a generic and constructor argument:

```typescript
import { Helice, VerboseSyntaxKeys } from 'helice';

const db = new Helice<MyDB, VerboseSyntaxKeys>(VerboseSyntaxKeys);
```
Every token Helice uses in types and parsers will follow your custom vocabulary end-to-end.


## Clauses

### FIELD

`.field()` controls which columns appear in `SELECT`. Three forms are accepted:

#### **String** — a single column, with optional alias:
```typescript
.field('*')                    // all columns
.field('id')                   // one bare column (single-table query)
.field('post.id')              // qualified column (joined query)
.field('id@postId')            // aliased — default SK uses @
```

#### **Array** — multiple columns:
```typescript
.field(['id', 'title', 'author_id@authorId'])
```

#### **Object** — the most powerful form. Keys are output aliases, values are expressions:
```typescript
.field({
  postId   : 'post.id',                              // column reference
  count    : 42,                                     // number literal
  active   : true,                                   // boolean literal
  label    : "'Hello'",                              // string literal (single-quoted in SQL)
  comments : {                                       // aggregation → adds GROUP BY
    fn    : 'json_agg',
    group : 'post.id',
    value : { id: 'comment.id', body: 'comment.body' }
  },
  raw      : { fn: 'raw', value: 'COALESCE(title, \'\')' }
})
```

---

### WHERE

`.where()` accepts an object where the key encodes both the column and the comparison operator. The default syntax (prefix) places the operator on the left:

| DefaultSyntaxKey | VerboseSyntaxKey | SQL produced |
|-----|-----|-------------|
| `column` | `column` | `column = $n` |
| `=:column` | `column =` | `column = $n` |
| `<>:column` | `column <>` | `column <> $n` |
| `>=:column` | `column >=` | `column >= $n` |
| `<=:column` | `column <=` | `column <= $n` |
| `>:column` | `column >` | `column > $n` |
| `<:column` | `column <` | `column < $n` |
| `~~:column` | `column ~~` | `column ~~ $n` (LIKE) |
| `~~*:column` | `column ~~*` | `column ~~* $n` (ILIKE) |
| `!~~:column` | `column !~~` | `column !~~ $n` (NOT LIKE) |
| `[=]:column` | `{column} =` | `$n = ANY(column)` |
| `[<>]:column` | `{column} <>` | `$n <> ALL(column)` |
| `[~~]:column` | `{column} ~~` | `array_to_string(column,' ') ~~ $n` |
| `&&:label` | `ANDlabel` | OR group — value is an array of AND conditions |

Passing `null` as a value produces `IS NULL` / `IS NOT NULL`. Passing an array produces `= ANY(...)`.

#### **OR groups** with `&&:`:
```typescript
.where({
  published : true,
  '&&:any'  : [
    { '~~:title': '%TypeScript%' },
    { '~~:title': '%Postgres%'   },
  ]
})
// WHERE (published = $1 AND (title ~~ $2 OR title ~~ $3))
```

#### **Column-to-column comparisons** with `col()`:
```typescript
import { col } from 'helice';
.where({ 'post.author_id': col('user.id') })
// post.author_id = user.id  (no parameter)
```

---

### JOIN

`.join()` accepts an object where the key encodes the join type and target table, and the value is the `ON` condition (written as if the joined table is already in scope). The default syntax (prefix) places the join type before the table name:

| DefaultSyntaxKey | VerboseSyntaxKey | SQL produced |
|-----|-----|-------------|
| `table` | `table` | `LEFT JOIN table` (default) |
| `i#table` | `INNER JOIN table` | `INNER JOIN table` |
| `f#table` | `FULL JOIN table` | `FULL JOIN table` |
| `l#table` | `LEFT JOIN table` | `LEFT JOIN table` |
| `r#table` | `RIGHT JOIN table` | `RIGHT JOIN table` |

```typescript
db.select('post')
  .join({ user: 'id = post.author_id' })           // LEFT JOIN (default)
  .join({ 'i#user': 'id = post.author_id' })       // INNER JOIN
// ... JOIN user ON user.id = post.author_id
```

> ***NOTE:** After a join, bare column names are no longer valid — use `table.column` everywhere in `.field()`, `.where()`, and `.orderBy()`.*


### ORDER BY

`.orderBy()` is available on SELECT. Three forms:

```typescript
.orderBy('views')                            // single column (default ASC)
.orderBy(['published', 'views'])             // multiple columns (all ASC)
.orderBy({ views: 'DESC', title: 'ASC' })   // with explicit direction
.orderBy({ views: 'DESC', title: '' })      // '' = no direction keyword
```

After a join, use fully-qualified `table.col` notation.

### RETURNING

`.returning()` appends a `RETURNING` clause to INSERT, UPDATE, and DELETE. Accepts the same string, array, and object forms as `.field()`:

```typescript
.returning('*')
.returning(['id', 'name'])
.returning({ userId: 'id', userName: 'name' })
```

## Queries

The clauses above don't all apply everywhere — `.field()` makes no sense on a DELETE, `.set()` only exists on UPDATE. Each query type has it own subset; 

| Clause | SELECT | INSERT | UPDATE | DELETE |
|--------|:------:|:------:|:------:|:------:|
| `.field()` / `.returning()` | `.field()` | `.returning()` | `.returning()` | `.returning()` |
| `.values()` / `.set()` | | `.values()` | `.set()` | |
| `.join()` / `.using()` | `.join()` | | `.using()` (FROM) | `.using()` (USING) |
| `.with()` (CTE) | ✓ | | ✓ | ✓ |
| `.where()` / `.in()` / `.notIn()` | ✓ | | ✓ | ✓ |
| `.orderBy()` / `.limit()` | ✓ | | | |
---

>#### For in-depth documentation and examples for each query type
>- #### [SELECT](./documentation/select.md) — field, join, CTE, where, orderBy, limit, prepare options
>- #### [INSERT](./documentation/insert.md) — values, returning, runtime values
>- #### [UPDATE](./documentation/update.md) — set, using, CTE, where, returning, prepare options
>- #### [DELETE](./documentation/delete.md) — using, CTE, where, returning, prepare options
>
> ---

### `prepare()` — static vs runtime

Every query ends at `.prepare()`: the entire goal. This method compiles the chained clauses once and returns a **reusable function**. Values can be baked in at build time (static), left open at call time (runtime), or both — static and runtime parts are merged automatically.

```typescript
// Everything static — call with no arguments, always returns the same SQL
const getPublished = db.select('post')
  .where({ published: true })
  .prepare();

getPublished()

// Runtime WHERE — enable it in prepare(), supply it at call time
const findPosts = db.select('post')
  .where({ published: true })       // static part, always applied
  .prepare({ where: true });        // AND runtime WHERE enabled

findPosts({ where: { '>=:views': 500 }, limit: 10 })
// WHERE (published = $1 AND views >= $2) LIMIT 10

// Restrict which columns the runtime WHERE may use
const updateUser = db.update('user')
  .prepare({ set: true, where: { user: ['id'] } });

updateUser({ set: { name: 'Dave' }, where: { id: 10 } })
```

**Which of those clauses `.prepare()` can leave open until call time:**

| Runtime option | SELECT | INSERT | UPDATE | DELETE |
|--------|:------:|:------:|:------:|:------:|
| `where` | ✓ | | ✓ | ✓ |
| `field` | ✓ | | | |
| `orderBy` / `limit` | ✓ | | | |
| `set` / `values` | | `values` | `set` | |

---

### `build()` / `execute()` — shortcuts for `prepare()`

Two one-shot shortcuts, available on every query type, for when you just want `{ query, args }` (or a result) right away and don't need a reusable function:

```typescript
// build() — returns { query, args } immediately
const { query, args } = db.select('post').where({ published: true }).build();
// equivalent to:
db.select('post').where({ published: true }).prepare()();

// execute(executor) — builds and calls executor(query, args), returning its result
const rows = await db.select('user').where({ active: true })
  .execute((q, a) => pgClient.query<User[]>(q, a));
// equivalent to:
db.select('user').where({ active: true })
  .prepare(undefined, (q, a) => pgClient.query<User[]>(q, a))();
```

Both use static clause values only. When you need runtime args, use `.prepare()` directly.


## Contributing

I develop and maintain Helice on my own as a key package accross my work. As such, support and contributions are very welcome — bug reports, ideas, PRs, anything really.

### Getting started

```bash
git clone https://github.com/your-org/helice.git
cd helice
pnpm install
pnpm test         # run the test suite
pnpm test:watch   # re-run on file changes
```

The test files in [`tests/`](./tests/) also double as runnable examples. Pass any of them to `tsx` to see the generated SQL printed to stdout:

```bash
pnpm test:file tests/select.test.ts
```

### Before opening a PR

Helice uses [Changesets](https://github.com/changesets/changesets) to manage versioning and changelogs. Before submitting a PR with a user-facing change, run:

```bash
pnpm changeset
```

You'll be asked to choose a bump type (`patch` / `minor` / `major`) and write a short description. This creates a small file in `.changeset/` — commit it alongside your changes, and that's it.

> Not sure what bump type to pick? Roughly: `patch` for bug fixes, `minor` for new features that don't break existing code, `major` for anything that changes the existing API.

### Release process (maintainers)

```bash
pnpm version   # consumes changesets → bumps package.json + updates CHANGELOG.md
pnpm release   # builds + publishes to npm
```

---

## License

MIT
