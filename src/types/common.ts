/// GLOBAL

export type AllowedColumnTypes = null | number | string | boolean | object;

export type Table = ({[key : string | number | symbol] :  AllowedColumnTypes } | {});
export type Environment = {[key : string] : Table};
export type AvailableEnvironment<Env extends Environment, Tables extends keyof Env> = { [T in Tables]: Env[T];};

export type FlatEnvironment = {[key : string] : any};

export type Obj = {[key : string] : any};


/// UTILS


/**
 * 
 */
export type StrKeys<T> = Extract<keyof T, string>;


/**
 * One way to force TS to print the final mapped type
 */
export type Simplify<T> = { [K in keyof T]: T[K] } & {};

/**
 * A stronger way to force TS to print the final mapped type
 */
export type Prettify<T> = { [K in keyof T]: T[K] } extends infer O ? { [K in keyof O]: O[K] } : never;



/**
* Transform every non-array typed properties in array typed properties
**/
export type UnArraying<T> = (T extends (infer U)[] ? U : T);
export type Arraying<T> = Array<T extends (infer U)[] ? U : T>;
export type Arrayed<T> = UnArraying<T> | Arraying<T>;


/**
 * Flattened Array of Arrays to Tuple keeping inferred types
 */
export type FlatArray<A extends unknown[]> = A extends [] ? [] : A extends [infer E, ...infer R] ? (E extends `${infer S}` ? [S, ...FlatArray<R>] : (E extends Array<unknown> ? [...FlatArray<E>, ...FlatArray<R>] : never)) : A;


/**
 * Extract keys of type FV from an object
 */
export type KeysOfType<T, FV extends any> = {
		[k in keyof T] : T[k] extends FV ? k : never;
	}[keyof T];


export type KeysNotOfType<T, FV extends any> = {
	[k in keyof T] : T[k] extends FV ? never : k
}[keyof T]


/**


Env : {
	table1 : {
		c11 : number;
		c12 : string;
	},
	table2 : {
		c21 : number;
		c22 : string;
	}
}

FlatEnvKeys<Env> : "table1.c11" | "table1.c12" | "table2.c21" | "table2.c22"

FlatEnv<Env> : {
	"table1.c11" : number;
	"table1.c12" : string;
	"table2.c21" : number;
	"table2.c22" : string;
}

 */
export type FlatEnvKeys<
  Env extends Partial<Environment>,
  From extends keyof Env | never = never
> = ( {[T in StrKeys<Env>]: `${T}.${StrKeys<Env[T]>}` }[StrKeys<Env>]) | ( From extends keyof Env ? keyof Env[From] : never )

export type FlatEnv<
	Env extends Partial<Environment>,
	From extends keyof Env | never = never
> = {
	[K in FlatEnvKeys<Env, From>]: K extends `${infer T}.${infer C}` ? (Env[T & keyof Env][C & keyof Env[T & keyof Env]]) :	(Env[From & keyof Env][K & keyof Env[From & keyof Env]])
};

export type FlatEnvButTable<
	Env extends  Partial<Environment>,
	ExceptTable extends string,
	From extends keyof Env | never = never
> = {
	[Key in FlatEnvKeys<Env, From> as Key extends `${infer T}.${string}` ? (T extends ExceptTable ? never : Key ) : never] : (Env[From & keyof Env][Key & keyof Env[From & keyof Env]]);
}












///
// LAB / TESTS
///

/*
	Hacky things from 
	https://stackoverflow.com/questions/52855145/typescript-object-type-to-array-type-tuple 
	https://stackoverflow.com/questions/55127004/how-to-transform-union-type-to-tuple-type/55128956#55128956
*/
export type UnionToIntersection<U> =
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