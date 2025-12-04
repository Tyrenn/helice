import { Environment, FlattenedEnvironment, FlattenEnvironmentKeys, FlattenEnvironmentKeysTEST } from "./common";


// 3. Vérification optimisée
type IsValidToken<TE extends Environment, S extends string> =
  S extends `${string}.${string}`
    ? (S extends FlattenEnvironmentKeysTEST<Env, "table1"> ? S : never)
    : S; // si pas de ".", ok

type Env = {
  table1: { column1: string; column2: number };
  table2: { column1: string };
};

// // 5. Type public
// export function raw<
//   S extends string
// >(s: S & IsValidToken<Env, S>): any {
//   return s; // runtime : juste une string
// }


// let tt : IsValidToken<Env, "table3.column1">


const ok = raw("table1.column1");         // ✔ OK
const ok2 = raw("table2.column1");        // ✔ OK
const ok3 = raw("HELLO_WORLD");           // ✔ OK (pas de point)

const bad1 = raw("table1.column1");       // ❌ TS ERROR: table3 inconnu
const bad2 = raw("table1.colum1");       // ❌ TS ERROR: colonne inexistante
const bad3 = raw("table1.column + table2.column1");   // ❌ TS ERROR si tu veux valider plusieurs colonnes



let tt : SplitTokens<"table1.column1">



type SplitTokens<S extends string> =
  S extends `${infer A} ${infer B}` ? [...SplitTokens<A>, ...SplitTokens<B>] :
  S extends `${infer A},${infer B}` ? [...SplitTokens<A>, ...SplitTokens<B>] :
  S extends `${infer A}(${infer B}` ? [...SplitTokens<A>, ...SplitTokens<`)${B}`>] :
  S extends `${infer A})${infer B}` ? [...SplitTokens<A>, ...SplitTokens<B>] :
  S extends "" ? [] :
  [S];

// Vérifier que chaque token avec "." est une KnownColumn
type IsTokenSafe<T, TE extends Environment> =
  T extends `${string}.${string}`
    ? T extends FlattenEnvironmentKeysTEST<TE> ? true : false
    : true;

// Validation finale
type AreAllTokensSafe<Tokens extends string[], TE extends Environment> =
  Tokens extends [infer First, ...infer Rest]
    ? First extends string
      ? IsTokenSafe<First, TE> extends true
        ? AreAllTokensSafe<Extract<Rest, string[]>, TE>
        : false
      : false
    : true;

function raw<
  S extends string
>(s: S & (AreAllTokensSafe<SplitTokens<S>, Env> extends true ? S : never)): any {
  return s; // runtime : juste une string
}
