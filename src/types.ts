
type tcsep = '.';
type modsep = ':';
type tc<T extends string> = `${T}${tcsep}${string}`;

export interface QueryBuilder<Schema, Fields, Tablename>{
	quild() : { text : string, values : any[], nbvalues : number};
}


/***********
	PARAM TYPE
************ */

/**
* Transform every none array properties in possible array
**/
type Arrayed<T> = {
	[Prop in keyof T] : Array<T[Prop] extends (infer U)[] ? U : T[Prop]> | (T[Prop] extends (infer U)[] ? U : T[Prop]) | T[Prop]
}

/**
 * Prefixing object keys with specific string
 */
type PrefixObject<T, P extends string> = {
	[K in keyof T as K extends string ? `${P}${K}` : never]: T[K]
}

/**
 * Give back prefixed arrayed or not
 */
type ArrayedDottedPrefix<Prefix> = Prefix extends string ? `${Prefix}${modsep}` | `[${Prefix}]${modsep}` : never;

/**
 * Where type for where clauses
 */
export type Where<Env extends QueryEnvironment> = Partial<PrefixObject<Arrayed<FlatEnv<Env>>, '' | `[]${modsep}` | ArrayedDottedPrefix<'=' | '<>' | '!=' | '>' | '>=' | '<' | '<=' | '~~' | '~~*' | '!~~' | '!~~*'>>> | Partial<PrefixObject<Arrayed<FlatEnv<Env>>, '' | '[]:' | ArrayedDottedPrefix<'=' | '<>' | '!=' | '>' | '>=' | '<' | '<=' | '~~' | '~~*' | '!~~' | '!~~*'>>>[];


/**
 * Order by type for orderby clauses
 */
export type OrderBy<Env extends QueryEnvironment> = {
	[Key in keyof FlatEnv<Env>]? : 'ASC' | 'DESC' | '';
}

/**
 * Group by type for groupby clauses
 */
export type GroupBy<Env extends QueryEnvironment> = (keyof FlatEnv<Env> extends string ? keyof FlatEnv<Env> : never)[];	


export type Alias<Env extends QueryEnvironment> = {[key : string] : keyof Env};




/*
type SameType<Type extends {[key : string] : any}> = {
	[Key in keyof Type]? : ExtractPropsKey<Type, Type[Key]>
}

type SameTypeDiffKey<Type extends {[key : string] : any}> = {
	[Key in keyof Type]? : Key extends `${infer U}${tablecolumnseparator}${string}` ? Exclude<ExtractPropsKey<Type, Type[Key]>, `${U}${tablecolumnseparator}${string}`> : never
};

type SameType<Type extends {[key : string] : any}> = {
	[Key in keyof Type as Exclude<PreciseExtractPropsKey<Type, Type[Key]>, Key> extends never ? never : Key]? : PreciseExtractPropsKey<Type, Type[Key]>
}
type SameTypeDiffKey<Type extends {[key : string] : any}> = {
	[Key in keyof Type as Exclude<PreciseExtractPropsKey<Type, Type[Key]>, Key> extends never ? never : Key]? : Key extends `${infer U}${tcsep}${string}` ? Exclude<PreciseExtractPropsKey<Type, Type[Key]>, tc<U>> : never
};

*/


type OnlyEnum<T extends {[key : string] : any}> = {
	[k in keyof T as T[k] extends `${infer U}` ? k : never] : T[k];
}

type NoEnum<T extends {[key : string] : any}> = Omit<T, keyof OnlyEnum<T>>

type ExtractPropsKey<T, TProps extends T[keyof T]> = {
	[P in keyof T]: T[P] extends TProps ? P : never;
}[keyof T];

type PreciseExtractPropsKey<T extends {[key : string] : any}, TProps extends T[keyof T]> = TProps extends `${infer U}` ? ExtractPropsKey<OnlyEnum<T>, U extends  T[keyof T] ? U : never> : ExtractPropsKey<NoEnum<T>, TProps extends NoEnum<T>[keyof NoEnum<T>] ? TProps : never> 

type SameTypeDiffKeyDistribute<Type extends {[key : string] : any}, T extends string> = {
	[Key in keyof Type as Exclude<PreciseExtractPropsKey<Type, Type[Key]>, Key | tc<T>> extends never ?  never : (Key extends `${infer U}.${string}` ? (U extends T ? Key : never) : never)]? : Exclude<PreciseExtractPropsKey<Type, Type[Key]>, Key | tc<T>>
};

type FlatJoin<J extends {[key : string] : string}> = J[keyof J] extends `${infer U}.${string}` ? U : never;


export type TypedJoin<Env extends QueryEnvironment, AccEnv extends QueryEnvironment> = SameTypeDiffKeyDistribute<FlatEnv<Env>, keyof AccEnv extends string ? keyof AccEnv : never>;

export type Join<Env extends QueryEnvironment, AccEnv extends QueryEnvironment> = PrefixObject<TypedJoin<Env, AccEnv>, `i${modsep}` | '' | `l${modsep}` | `r${modsep}`>;


/**
 * Transform every properties of an object to string if not object
*/

type StringObject<T> = {
	[Prop in keyof T] : string;
}

export type Fields<Env extends QueryEnvironment> = StringObject<FlatEnv<Env>>;

/***********
	QUERYOBJECTS TYPES
************ */

export type QueryEnvironment = { [key : string] : {[key : string] : any}};

export type NarrowedEnv<Env extends QueryEnvironment> = {[key in string as key extends keyof Env ? key : never] : Env[key]}


type ExtractNestedPropKeys<CO extends {[key : string] : {[key : string] : any}}> = keyof {
	[Key in (keyof CO) as Key extends string ? `${Key}${tcsep}${keyof CO[Key] extends string ? keyof CO[Key] : never}` : never] : string;
}


type FlatEnv<Nested extends QueryEnvironment> = {
	[Key in ExtractNestedPropKeys<Nested>] : Key extends `${infer T}${tcsep}${infer C}` ? Nested[T][C] : never;
}

/*export type ExcludeFromEnv<Env extends {[key : string] : any}, T extends any> = {
	[Key in (keyof Env) as Key extends T ? never : Key] : Env[Key];
}*/

export type AliasEnv<Env extends QueryEnvironment, Alias extends {[key : string] : any}> = 
	{ [Key in (keyof Env) as Key extends (Alias[keyof Alias]) ? never : Key] : Env[Key]; }
	&
	{ [Key in (keyof Alias) as Alias[Key] extends (keyof Env) ? Key : never] : Env[Alias[Key]] }

export type AliasAccEnv<Env extends QueryEnvironment, AccEnv extends QueryEnvironment, Alias extends {[key : string] : any}> = 
	{ [Key in (keyof AccEnv) as Key extends (Alias[keyof Alias]) ? never : (Key extends keyof AliasEnv<Env, Alias> ? Key : never)] : AccEnv[Key]; }
	&
	{ [Key in (keyof Alias) as Alias[Key] extends (keyof AccEnv) ? (Key extends keyof AliasEnv<Env, Alias> ? Key : never) : never] : AccEnv[Alias[Key]] }

export type AliasString<Env extends QueryEnvironment, T extends string | symbol | number, Alias extends {[key : string] : any}> = T extends Alias[keyof Alias] ? (keyof Alias) extends keyof AliasEnv<Env, Alias> ? (keyof Alias) : never : never;

export type CheckKeyOfEnv<Env extends QueryEnvironment, T extends string | symbol | number> = T extends keyof Env & string ? T : never;


// export type AliasEnv<Env extends QueryEnvironment, Alias extends {[key : string] : any}> = 
// 	{ [Key in (keyof Env) | (keyof Alias) as Key extends (Alias[keyof Alias]) ? never : Key] : Key extends (keyof Alias) ? Env[Alias[Key]] : Env[Key extends string ? Key : never]; }

export type NarrowTableEnv<Env extends QueryEnvironment, Table extends string | number | symbol> = {
	[Key in keyof Env as Key extends Table ? Key : never] : Env[Key];
}

export type ExcludeTableEnv<Env extends QueryEnvironment, Table extends string | number | symbol> = {
	[Key in keyof Env as Key extends Table ? never : Key] : Env[Key];
}

export type NarrowJoinEnv<Env extends QueryEnvironment, Join extends {[key : string] : any}> = NarrowTableEnv<Env, FlatJoin<Join>>;



/*export type ExpandEnvByAlias<Env extends QueryEnvironment, Alias extends {[key : string] : string}> = {
	[Key in (keyof Env) | (keyof Alias)] : Key extends (keyof Alias) ? Env[Alias[Key]] : Env[Key extends string ? Key : never];
}*/

type Table1 = {
	column1 : string;
	column2 : number;
	column3 : number;
	column4 : string[];
	column5 : 'EEE';
	column6 : boolean;
}

interface Table2{
	column21 : number;
	column22 : string;
	column23 : 'EEE';
}

interface Table3{
	column31 : Array<number>;
	column32 : Array<string>;
	column33 : 'EEE';
}

type testenv = {
	table1 : Table1;
	table2 : Table2;
	table3 : Table3;
}

type testaccenv = {
	table1 : Table1;
}

type j = {'table1.column1' : 'table2.column22', 'table1.column2' : 'table2.column21'}

let test : NarrowJoinEnv<testenv, j>;

type alias = {
	alias1 : "table1";
}
type AliasString2<T extends string, Alias extends {[key : string] : any}> = T extends Alias[keyof Alias] ? keyof Alias : never;

let test2 : AliasString2<'table1', alias> = ''


// Ajouter une étape : s'il extends string ajout d'un point... ?




/*
	Hacky things from 
	https://stackoverflow.com/questions/52855145/typescript-object-type-to-array-type-tuple 
	https://stackoverflow.com/questions/55127004/how-to-transform-union-type-to-tuple-type/55128956#55128956
*/
type UnionToIntersection<U> =
	(U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never

type LastOf<T> =
	UnionToIntersection<T extends any ? () => T : never> extends () => (infer R) ? R : never

// TS4.0+
type Push<T extends any[], V> = [...T, V];

// TS4.1+
type TuplifyUnion<T, L = LastOf<T>, N = [T] extends [never] ? true : false> =
	true extends N ? [] : Push<TuplifyUnion<Exclude<T, L>>, L>

type ObjValueTuple<T, KS extends any[] = TuplifyUnion<keyof T>, R extends any[] = []> =
	KS extends [infer K, ...infer KT]
	? ObjValueTuple<T, KT, [...R, T[K & keyof T]]>
	: R