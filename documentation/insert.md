# INSERT

`db.insert(table)` builds an `INSERT INTO` query. It supports single and multi-row inserts, an optional `RETURNING` clause, and runtime value injection via `.prepare()`.

```typescript
const { query, args } = db.insert('user')
  .values({ name: 'Alice', email: 'alice@example.com', active: true })
  .prepare()();
```

```sql
INSERT INTO user
(name, email, active)
VALUES ($1, $2, $3)
```

---

## `.values()`

Accepts a single row object or an array of row objects. The column list is derived from the keys of the first row — all rows must have the same shape.

### Single row

```typescript
db.insert('user')
  .values({ name: 'Alice', email: 'alice@example.com', active: true })
  .prepare()()
```

```sql
INSERT INTO user
(name, email, active)
VALUES ($1, $2, $3)
```

### Multiple rows

```typescript
db.insert('post')
  .values([
    { author_id: 1, title: 'Hello', published: false, views: 0  },
    { author_id: 1, title: 'World', published: true,  views: 42 },
  ])
  .prepare()()
```

```sql
INSERT INTO post
(author_id, title, published, views)
VALUES ($1, $2, $3, $4),
($5, $6, $7, $8)
```

---

## `.returning()`

Appends `RETURNING` to the query. Accepts the same string, array, and object forms as `.field()`:

```typescript
// All columns
db.insert('user')
  .values({ name: 'Alice', email: 'alice@example.com', active: true })
  .returning('*')
  .prepare()()

// Specific columns
db.insert('user')
  .values({ name: 'Bob', email: 'bob@example.com', active: true })
  .returning(['id', 'name'])
  .prepare()()
```

```sql
INSERT INTO user
(name, email, active)
VALUES ($1, $2, $3)
RETURNING id, name
```

```typescript
// With aliases
.returning({ userId: 'id', userName: 'name' })
// RETURNING id AS userId, name AS userName
```

---

## `.build()` / `.execute()`

```typescript
// Immediate { query, args }
const { query, args } = db.insert('user')
  .values({ name: 'Alice', email: 'alice@example.com', active: true })
  .build();

// Pass straight to a client
const result = await db.insert('user')
  .values({ name: 'Alice', email: 'alice@example.com', active: true })
  .returning(['id'])
  .execute((q, a) => pgClient.query<{ id: number }>(q, a));
```

Both use static values only. For runtime values, use `.prepare({ values: true })`.

---

## `.prepare()` — runtime options

| Option | Type | Behaviour |
|--------|------|-----------|
| `values` | `true` | Supply the row(s) at call time instead of build time |

### Runtime values

```typescript
const insertUser = db.insert('user').prepare({ values: true });

insertUser({ values: { name: 'Carol', email: 'carol@example.com', active: false } })
// INSERT INTO user (name, email, active) VALUES ($1, $2, $3)
// args: ['Carol', 'carol@example.com', false]
```

This is useful when you want a reusable prepared statement — build the query once, call it with different rows each time.
