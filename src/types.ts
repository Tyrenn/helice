/* =========================================================================
   =  Utils
   ========================================================================= */

/**
* One way to force TS to print the final mapped type
*/
export type Simplify<T> = { [K in keyof T]: T[K] } & {};

/**
 * Wrapper Type to scope Query authorized method
 */
export type MethodResultType<NewType extends any, ThisType extends any, O extends string> = Omit<Pick<NewType, keyof ThisType & keyof NewType>, O>



/* =========================================================================
   =  Database types
   ========================================================================= */

export type AllowedColumnTypes = null | number | string | boolean | object;
export type Environment = {[key : string] : Table};
export type Table = ({[key : string | number | symbol] :  AllowedColumnTypes } | {});
export type Obj = {[key : string] : any};




/* =========================================================================
   =  Column Referenc class
   ========================================================================= */

export class Column<col extends string>{

	name : col;

	constructor(n : col){
		this.name = n;
	}
}

export function col<c extends string>(n : c) : Column<c>{
	return new Column(n);
}





/* =========================================================================
   =  Query Preparation
   ========================================================================= */


export type PreparedQueryOptions<Obj extends Record<any, any>> = {[key in keyof Obj]? : boolean}

type PreparedQueryOptionsIsAllFalseOrUndefined<Obj extends Record<any, any>> = {[ k in keyof Obj] : PreparedQueryOptions<Obj>[k] extends true ? k : never}[keyof Obj] extends never ? true : false;

export type PreparedQueryArguments<Options extends Record<any, any>> =
	PreparedQueryOptionsIsAllFalseOrUndefined<Options> extends true ? undefined :
	Simplify<
		{
			[k in keyof Options as PreparedQueryOptions<Options>[k] extends true ? k : never]? : Options[k];
		}
	>;



// /**
//  *
//  */
// export interface CommonTableExpression<TableResult extends Table, SpectificPreparedQueryArguments extends Obj>{
// 	prepare<A extends SpectificPreparedQueryArguments>(options? : PreparedQueryOptions<A>) : (args : PreparedQueryArguments<A>) => {query : string, args : any[]};
// }









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
