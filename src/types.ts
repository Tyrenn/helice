
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

export type Where<Env extends QueryEnvironment> = Partial<PrefixObject<Arrayed<FlattenQueryEnvironment<Env>>, '' | `[]${modifierseparator}` | ArrayedDottedPrefix<'=' | '<>' | '!=' | '>' | '>=' | '<' | '<=' | '~~' | '~~*' | '!~~' | '!~~*'>>> | Partial<PrefixObject<Arrayed<FlattenQueryEnvironment<Env>>, '' | '[]:' | ArrayedDottedPrefix<'=' | '<>' | '!=' | '>' | '>=' | '<' | '<=' | '~~' | '~~*' | '!~~' | '!~~*'>>>[];


export type InferAlias<A extends {[key : string] : string}> = {[key in keyof A] : A[key] extends `${infer U}` ? U : never};


export type OrderBy<Env extends QueryEnvironment> = {
	[Key in keyof FlattenQueryEnvironment<Env>]? : 'ASC' | 'DESC' | '';
}

export type GroupBy<Env extends QueryEnvironment> = (keyof FlattenQueryEnvironment<Env> extends string ? keyof FlattenQueryEnvironment<Env> : never)[];	

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

export type ExtractTablesKey<T, Tables extends string> = {
	[P in keyof T] : P extends `${Tables}${tablecolumnseparator}${string}` ? P : never;
}[keyof T]

export type ExcludeTables<T, Tables extends string> = Omit<T, ExtractTablesKey<T, Tables>>;

export type ExtractTables<T, Tables extends string> = Pick<T, ExtractTablesKey<T, Tables>>;

export type ExtractProps<T, TProps extends T[keyof T]> = Pick<T, ExtractPropsKey<T, TProps>>;

export type ExtractNestedPropKeys<CO extends {[key : string] : {[key : string] : any}}> = keyof {
	[Key in (keyof CO) as Key extends string ? `${Key}${tablecolumnseparator}${keyof CO[Key] extends string ? keyof CO[Key] : never}` : never] : string;
}

export type SameType<Type extends {[key : string] : any}> = {
	[Key in keyof Type]? : ExtractPropsKey<Type, Type[Key]>
}

export type SameTypeDifferentTable<Type extends {[key : string] : any}> = {
	[Key in keyof Type]? : Key extends `${infer U}${tablecolumnseparator}${string}` ? Exclude<ExtractPropsKey<Type, Type[Key]>, `${U}${tablecolumnseparator}${string}`> : never
};

export type FlattenQueryEnvironment<Nested extends QueryEnvironment> = {
	[Key in ExtractNestedPropKeys<Nested>] : Key extends `${infer T}${tablecolumnseparator}${infer C}` ? Nested[T][C] : never;
}

export type ExpandEnv<Env extends QueryEnvironment, Alias extends {[key : string] : string}> = {
	[Key in (keyof Env) | (keyof Alias)] : Key extends (keyof Alias) ? Env[Alias[Key]] : Env[Key extends string ? Key : never];
}

export type Join<Env extends QueryEnvironment> = PrefixObject<SameTypeDifferentTable<FlattenQueryEnvironment<Env>>, `i${modifierseparator}` | '' | `l${modifierseparator}` | `r${modifierseparator}`>;
export type TypedJoin<Env extends QueryEnvironment> = SameTypeDifferentTable<FlattenQueryEnvironment<Env>>;


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

export type QueryEnvironment = { [key : string] : {[key : string] : any}};