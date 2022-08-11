
type tablecolumnseparator = '.';
type modifierseparator = ':';

export type Obj = {
	[column: string]: any;
}

/**
* Transform every none array properties in possible array
**/
export type Arrayed<T> = {
	[Prop in keyof T] : Array<T[Prop] extends (infer U)[] ? U : T[Prop]> | (T[Prop] extends (infer U)[] ? U : T[Prop]) | T[Prop]
}

/**
 * Prefixing object keys with specific string
 */
export type PrefixObject<T, P extends string> = {
	[K in keyof T as K extends string ? `${P}${K}` : never]: T[K]
}


type ArrayedDottedPrefix<Prefix> = Prefix extends string ? `${Prefix}${modifierseparator}` | `[${Prefix}]${modifierseparator}` : never;

export type Where<Env extends QueryEnvironment> = Partial<PrefixObject<Arrayed<FlatEnv<Env>>, '' | `[]${modifierseparator}` | ArrayedDottedPrefix<'=' | '<>' | '!=' | '>' | '>=' | '<' | '<=' | '~~' | '~~*' | '!~~' | '!~~*'>>> | Partial<PrefixObject<Arrayed<FlatEnv<Env>>, '' | '[]:' | ArrayedDottedPrefix<'=' | '<>' | '!=' | '>' | '>=' | '<' | '<=' | '~~' | '~~*' | '!~~' | '!~~*'>>>[];




export type OrderBy<Env extends QueryEnvironment> = {
	[Key in keyof FlatEnv<Env>]? : 'ASC' | 'DESC' | '';
}

export type GroupBy<Env extends QueryEnvironment> = (keyof FlatEnv<Env> extends string ? keyof FlatEnv<Env> : never)[];	

/**
 * Transform every properties of an object to string if not object
 */
export type Stringed<T> = {
	[Prop in keyof T] : string;
}


//export type DBFilter<O> = PostgreQueryFilter<Partial<O>> | PostgreQueryFilter<Partial<O>>[];


export interface QueryBuilder<Schema, Fields, Tablename>{
	quild() : { text : string, values : any[], nbvalues : number};
}

export type ExtractPropsKey<T, TProps extends T[keyof T]> = {
	[P in keyof T]: T[P] extends TProps ? P : never;
}[keyof T];

export type ExtractNestedPropKeys<CO extends {[key : string] : {[key : string] : any}}> = keyof {
	[Key in (keyof CO) as Key extends string ? `${Key}${tablecolumnseparator}${keyof CO[Key] extends string ? keyof CO[Key] : never}` : never] : string;
}

export type SameType<Type extends {[key : string] : any}> = {
	[Key in keyof Type]? : ExtractPropsKey<Type, Type[Key]>
}

export type SameTypeDiffKey<Type extends {[key : string] : any}> = {
	[Key in keyof Type]? : Key extends `${infer U}${tablecolumnseparator}${string}` ? Exclude<ExtractPropsKey<Type, Type[Key]>, `${U}${tablecolumnseparator}${string}`> : never
};

/** Besoin d'un type qui permette l'association des clés de 2 types de même type mais pas de même nom */

export type SameTypeDiffKey2<Type extends {[key : string] : any}, T extends any> = {
	[Key in keyof Type as Key extends `${infer U}.${string}` ? (U extends T ? Key : never) : never]? : Key extends `${infer U}${tablecolumnseparator}${string}` ? Exclude<ExtractPropsKey<Type, Type[Key]>, `${U}${tablecolumnseparator}${string}`> : never
};
export type FlatEnv<Nested extends QueryEnvironment> = {
	[Key in ExtractNestedPropKeys<Nested>] : Key extends `${infer T}${tablecolumnseparator}${infer C}` ? Nested[T][C] : never;
}

export type ExcludeFromEnv<Env extends {[key : string] : any}, T extends any> = {
	[Key in (keyof Env) as Key extends T ? never : Key] : Env[Key];
}

export type QueryEnvironment = { [key : string] : {[key : string] : any}};



export type InferAlias<A extends {[key : string] : any}> = {[key in keyof A] : A[key] extends `${infer U}` ? U : never};

/*export type ExpandEnvByAlias<Env extends QueryEnvironment, Alias extends {[key : string] : string}> = {
	[Key in (keyof Env) | (keyof Alias)] : Key extends (keyof Alias) ? Env[Alias[Key]] : Env[Key extends string ? Key : never];
}*/

export type ChangeEnvByAlias<Env extends QueryEnvironment, Alias extends {[key : string] : any}> = 
	{ [Key in (keyof Env) as Key extends (Alias[keyof Alias]) ? never : Key] : Env[Key]; }
	&
	{ [Key in (keyof Alias)] : Env[Alias[Key]] }

export type NarrowEnvByTable<Env extends QueryEnvironment, Table extends string> = {
	[Key in keyof Env as Key extends Table ? Key : never] : Env[Key];
}


export type NarrowEnvByJoins<Env extends QueryEnvironment, Join extends {[key : string] : any}> = {
	[Key in (keyof Env) as Key extends (keyof Join) ? Key : never] : Env[Key];
}

export type Alias<Env extends QueryEnvironment> = {[key : string] : keyof Env};

export type Join<Env extends QueryEnvironment, AccessibleEnv extends QueryEnvironment> = PrefixObject<SameTypeDiffKey2<FlatEnv<Env>, keyof AccessibleEnv>, `i${modifierseparator}` | '' | `l${modifierseparator}` | `r${modifierseparator}`>;
export type TypedJoin<Env extends QueryEnvironment> = SameTypeDiffKey<FlatEnv<Env>>;


/**
Join seulement possible du côté droit avec les tables accessibles (ou alias).
Les alias changent les noms des tables directement dans l'Env ? Should

 */

type Table1 = {
	column1 : string;
	column2 : number;
	column4 : number;
	column5 : string[];
	column6 : 'EEE';
	column7 : boolean;
}

interface Table2{
	column21 : number;
	column22 : string;
}

type testenv = {
	table1 : Table1;
	table2 : Table2;
}

type alias = {
	alias1 : "table1";
}

let befo : ExcludeFromFlatEnv<FlatEnv<testenv>, 'table2'> = {

}

let test : Join<testenv, {table2 : Table2}>  = {
	''
}

/*
	Hacky things from 
	https://stackoverflow.com/questions/52855145/typescript-object-type-to-array-type-tuple 
	https://stackoverflow.com/questions/55127004/how-to-transform-union-type-to-tuple-type/55128956#55128956
*/
type UnionToIntersection<U> =
	(U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never

export type LastOf<T> =
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


export type FirstOfUnion<T> = TuplifyUnion<T>[0];