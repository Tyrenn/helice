# Hélice — Pistes d'amélioration

> Audit du 2026-07-03. Les bugs identifiés ont tous été corrigés (opérateurs `<>:`/`[<>]:` perdus, `[x, null]`, collision d'index de paramètres, exports d'`index.ts`, égalité nue en verbose, JOIN objet + `&&:`, `col()` dans tableaux, tsquery runtime, fail fast sur clé inconnue, UPDATE sans SET / INSERT sans values) — tests de régression dans `tests/regressions.test.ts`.
>
> Restait un point traité en documentation plutôt qu'en code : les identifiants (tables/colonnes) ne sont **pas quotés** — limitation notée dans le README, quoting automatique proposé en feature 13 ci-dessous (breaking change de format de sortie → version majeure).

---

## 1. Corrections structurelles suggérées

- **Dédupliquer `WhereParser`/`JoinParser`** : `pushValue`, `matchSK`, `processArrayColumn`, `processValueColumn` et les regex sont copiés-collés à l'identique (~200 lignes ×2). Chaque bug corrigé a dû l'être en double. Extraire une classe/fonctions communes dans `clauses/common.ts` → un seul endroit à maintenir.
- **Tests des cas d'erreur restants** : ajouter chaque opérateur du tableau README (JSONB, BETWEEN, regex like, variantes verbose…), et un round-trip contre un vrai PostgreSQL (docker + `pg`) pour valider la syntaxe générée.
- **Nettoyage** : `src/clauses/raw.ts` (non exporté, commentaires FR, fonction `raw` morte), `mergeWHEREAsOR` inutilisé, blocs `TESTS` en fin de `field.ts`/`join.ts` (variables `f1..f7`, `jTest` embarquées dans le build), commentaires de code mort dans `join.ts`.
- **README** : URL clone `https://github.com/your-org/helice.git` → vraie URL ; le tableau WHERE documente `~~*` comme ILIKE mais le code l'appelle « softLike ».

---

## 2. Nouvelles fonctionnalités

### Court terme (manques SQL évidents)
1. **`OFFSET`** (pagination avec `LIMIT` — quasi indispensable) + option runtime `offset: true`.
2. **`DISTINCT` / `DISTINCT ON (col)`** sur SELECT.
3. **`HAVING`** (le GROUP BY existe déjà via les agrégations de `.field()`).
4. **`INSERT ... ON CONFLICT`** (upsert) — `.onConflict(cols).doUpdate(set)` / `.doNothing()`.
5. **Agrégats classiques dans `.field()`** : `count`, `sum`, `avg`, `min`, `max` (aujourd'hui seulement `json_agg`/`array_agg`).
6. **`NOT` / groupes `OR` de premier niveau** dans WHERE (aujourd'hui seul `&&:` = OR-de-ANDs existe ; pas de `NOT (...)`).
7. **`IS DISTINCT FROM`** (égalité null-safe).

### Moyen terme
8. **Typage du retour d'`execute()`** : `executor` pourrait être typé `(q, a) => Promise<TableResult[]>` pour que `db.select('user').execute(run)` infère `User[]` — le type `TableResult`/`ReturnType` existe déjà, il n'est juste pas branché sur `execute`/`prepare`+executor.
9. **Helpers d'intégration** : petit adaptateur officiel `pg` / `postgres.js` (`createExecutor(pool)`) + doc transactions.
10. **Sous-requêtes corrélées dans `.field()`** : `{ commentCount: subquery }` en plus de `raw`.
11. **UNION / INTERSECT / EXCEPT** entre deux `SelectQuery`.
12. **CTE récursives** (`WITH RECURSIVE`).
13. **Quoting automatique des identifiants** : tables/colonnes interpolées brutes aujourd'hui (limitation documentée dans le README) — quoter en `"identifier"` avec échappement des `"` internes permettrait les mots réservés (`order`, `group`) et la casse mixte. Breaking change de format → version majeure.
14. **Mode `pretty` exposé** : constante locale `const pretty = true` dans chaque `prepare()` — en faire une option (`new Helice(sk, { pretty: false })`) pour logs compacts.

### Long terme / différenciation
15. **Introspection schéma → types** : script optionnel qui génère l'`Environment` depuis `information_schema` (garde le « zero runtime dependency », c'est un devtool).
16. **Fenêtres (`OVER (PARTITION BY ...)`)** dans `.field()`.
17. **Playground/doc interactive** : le README est déjà bon ; un mini site (ou tests-as-docs générés) montrant entrée builder → SQL produit pour chaque opérateur ferait beaucoup pour l'adoption.

---

## 3. Priorités proposées

| Priorité | Items |
|---|---|
| P1 (robustesse) | dédup parseurs, tests opérateurs manquants, round-trip PG |
| P2 (features) | OFFSET, DISTINCT, ON CONFLICT, HAVING, agrégats, typage execute |
| P3 (confort / long terme) | quoting, pretty exposé, introspection, window functions |
