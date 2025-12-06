type ExtractAlias<K extends string> =
  K extends `${string}@${infer A}` ? A : never;

export type HasDuplicateAliases<Obj extends Record<string,any>> =
  {
    [A in ExtractAlias<keyof Obj & string>]:
      A extends never
        ? never
        : ExtractAlias<keyof Obj & string> extends A ? A : never
  }[ExtractAlias<keyof Obj & string>] extends never
    ? false
    : true;

type UniqueAliases<Obj extends Record<string, any>> =
  HasDuplicateAliases<Obj> extends true ? never : Obj;


function defineEnv<T extends Record<string, any>, Valid extends HasDuplicateAliases<T> & false>(t: Valid extends true ? never : T) : T {
  return t;
}

defineEnv({
  "table1@alias1": {},
  "table2@alias1": {}, // ❌ alias1 dupliqué → erreur TS
});