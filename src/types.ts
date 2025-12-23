/// GLOBAL

export type AllowedColumnTypes = null | number | string | boolean | object;
export type Environment = {[key : string] : Table};
export type Table = ({[key : string | number | symbol] :  AllowedColumnTypes } | {});
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
 * Extract T keys if T[keys] type is FV
 */
export type KeysOfType<Table, KeyType extends any> = { [k in keyof Table] : Table[k] extends KeyType ? k : never; }[keyof Table];


/**
 * Extract T keys if T[keys] type is not FV
 */
export type KeysNotOfType<Table, KeyType extends any> = { [k in keyof Table] : Table[k] extends KeyType ? never : k }[keyof Table]


///
// FLATTENED ENVIRONMENT
///

/**
Flattened Environment
Working with the flat environment is way easier than a double depth object as the environment.
But Environment is still required as it allows us to easily access table names.

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

If OnlyOneTable is given, then the type consider than only this one table is accessible and give back its type without prefix.
This is useful for queries without joins.
Only refer one table name in OnlyOneTable.

OnlyOneTable basically change the whole type, in another project it would have been another type completely.
But its presence here drastically reduce complexity as this type is used everywhere other types would need to know there is only one table accessible.

 */
export type FlatEnvKeys<
  Env extends Environment,
  OnlyOneTable extends keyof Env | undefined = undefined,
> =
	OnlyOneTable extends keyof Env ? (keyof Env[OnlyOneTable]) : ( {[T in StrKeys<Env>]: `${T}.${StrKeys<Env[T]>}` }[StrKeys<Env>])

export type FlatEnv<
	Env extends Environment,
 	OnlyOneTable extends keyof Env | undefined = undefined,
> =
	{ [K in FlatEnvKeys<Env, OnlyOneTable>]: 		K extends `${infer T}.${infer C}` ? (Env[T & keyof Env][C & keyof Env[T & keyof Env]]) : (Env[OnlyOneTable & keyof Env][K & keyof Env[OnlyOneTable & keyof Env]]) };
	// Checking OnlyOneTable is not done at root, even tough it would simplify the type, because this form allows TS to know that FlatEnvKeys are keyof FlatEnv

export type TablesWithType<Env extends Environment, Type extends any> =
	{ [Table in keyof Env] : Type extends Env[Table][keyof Env[Table]] ? Table : never}[keyof Env];



/**
 *
 */

export type MethodResultType<NewType extends any, ThisType extends any, O extends string> = Omit<Pick<NewType, keyof ThisType & keyof NewType>, O>





/**
 * Type for Query Preparation
 */

export type PreparedQueryOptions<Obj extends Record<any, any>> = {[key in keyof Obj]? : boolean}

type PreparedQueryOptionsIsAllFalseOrUndefined<Obj extends Record<any, any>> = {[ k in keyof Obj] : PreparedQueryOptions<Obj>[k] extends true ? k : never}[keyof Obj] extends never ? true : false;

export type PreparedQueryArguments<Options extends Record<any, any>> =
	PreparedQueryOptionsIsAllFalseOrUndefined<Options> extends true ? undefined :
	Simplify<
		{
			[k in keyof Options as PreparedQueryOptions<Options>[k] extends true ? k : never]? : Options[k];
		}
	>;



/**
 *
 */
export interface CommonTableExpression<TableResult extends Table, SpectificPreparedQueryArguments extends Obj>{
	prepare<A extends SpectificPreparedQueryArguments>(options? : PreparedQueryOptions<A>) : (args : PreparedQueryArguments<A>) => {query : string, args : any[]};
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
