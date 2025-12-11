import { Environment, FlatEnvKeys } from "../types";

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
    ? T extends FlatEnvKeys<TE> ? true : false
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
  S extends string,
  Env extends Environment
>(s: S & (AreAllTokensSafe<SplitTokens<S>, Env> extends true ? S : never)): string {
  return s; // runtime : juste une string
}
