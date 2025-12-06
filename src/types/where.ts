
import {Arrayed, KeysOfType, KeysNotOfType, Table, Environment, FlatEnv} from './common';

/****************
		WHERE

	Where : 
	{
		table1.column1 : value,
		"<:table1.column1" : value,
		"[]:table1.column1" : value,
		"table2.column2" : other column // Will compare 2 columns

		"&&:anyname" : Where | Where[]
	}

{
	a : "a",
	"&&:any" : [{
			b : "b2",
			a : "a2",
		},
		{
			b : "b1",
			a : "a1"
		},
		{
			b : "b3",
			"&&:any" : [{
					c : "c1",
					d : "d1"
				},
				{
					c : "c2",
					d : "d2"
				}
			]
		}
	]
}

Will translate in :
	a = "a" 
	AND 
	(
			(b = "b2" AND a = "a2") 
		OR (b = "b1" AND a = "a1") 
		OR (b = "b3" AND 
				(
						(c = "c1" AND d = "d1") 
					OR (c = "c2" AND d = "d2")
				)
			)
	)

*/


/* =========================================================================
   =  Grammar
   ========================================================================= */


	/** --------- Precomputed Key groups ------------- */
	type ArrayKeys<T> = KeysOfType<T, any[]>;
	type StringArrayKeys<T> = KeysOfType<T, string[]>;
	type StringKeys<T> = KeysOfType<T, string>;
	type NonArrayKeys<T> = KeysNotOfType<T, any[]>;



	/** --------- Prefix Properties ------------- */

	// type prefixPropWhereWithArray<T extends Table, P extends string> = {
	// 	[k in keyof T as k extends string ? `${P}${k}` : never]? : Arrayed<T[k] | null> |  TableWhere<T>[];
	// }

	// type prefixPropWhereWithoutArray<T extends Table, P extends string> = {
	// 	[k in keyof T as k extends string ? `${P}${k}` : never]? : UnArraying<T[k] | null> |  TableWhere<T>[];
	// }

	// { [prefixcolumn] : Accepte tout}
	type PrefixedProp<T extends Table, K extends keyof T, P extends string> = {	[k in K & string as `${P}${k}`]? : Arrayed<T[k] | null> |  TableWhere<T>[] | KeysOfType<T, T[k]>; };

	// { [prefixcolumn] : Accepte tout sauf les []}
	type PrefixedPropNonArray<T extends Table, K extends keyof T, P extends string> = { [k in K & string as `${P}${k}`]? : T[k] | null |  TableWhere<T>[] | KeysOfType<T, T[k]>; };



	/** --------- TS QUERY Properties ------------- */

	export type TSQuery = {
		value : string,
		weights? : number[],
		flag? : number,
		language : string;
	}

	type TSQueryProp<T> = {
		[K in StringArrayKeys<T> & string as `@@:${K}`]?: TSQuery;
	}



	/** --------- Base Properties ------------- */
	type BaseProp<T extends Table> = {
		[k in keyof T]? : Arrayed<T[k] | null> | TableWhere<T>[];
	}


	type TableWhere<T extends Table> = 
		BaseProp<T> 
		& PrefixedProp<T, ArrayKeys<T>, `[${'' | '=' | '!' | '<>' | '!='}]:`>							// arrays operators [=],[!],[]… on arrays
		& PrefixedProp<T, StringArrayKeys<T>, `[${'~~' | '~~*' | '!~~' | '!~~*'}]:`>					// LIKE operators on string[]
		& PrefixedProp<T, NonArrayKeys<T>, `${'=' | '<>' | '!='}:`>											// =, != on non-array
		& PrefixedPropNonArray<T, NonArrayKeys<T>, `${'>' | '>=' | '<' | '<='}:`>						// >, >=, <, ≤ on non-array
		& PrefixedProp<T, StringKeys<T>, `${'~~' | '~~*' | '!~~' | '!~~*' | '~' | '~*'}:`>			// LIKE operators on string
		& TSQueryProp<T>		 																							// @@:tsquery
		& { [k in `&&:${string}`]? : TableWhere<T>[]}															// nested AND



/* =========================================================================
   =  Final Type
   ========================================================================= */
	// TODO Should authorise grouped [] to allow OR from the very start
	// TODO Should authorise : table
	// TODO Should prefix string like in join '' to separate from autocompleted columns ?
	// TODO Test

	export type Where<Env extends Environment> = TableWhere<FlatEnv<Env>>;







/************************
		PREPARED WHERE
**************************/

	// Generate tuple from referenced where value
	// Might be good to generate an object with keys rather than tuple ?
	// The idea was to be able to mention Where like keys which then create a tuple type to pass as a prepared function argument I guess.

	type prefixString<S extends any, P extends string> = S extends string ? `${P}${S}` : never;

	export type TablePreparedWhere<T extends Table> = Array<
		keyof T
		| prefixString<KeysOfType<Required<T>, Array<any>>, `[${'' | '!' | '=' | '<>' | '!=' | '>' | '>=' | '<' | '<='}]:`>
		| prefixString<KeysOfType<Required<T>, Array<string>>, `[${'~~' | '~~*' | '!~~' | '!~~*'}]:`>
		| prefixString<KeysOfType<Required<T>, Array<string>>, `@@:`>
		| prefixString<KeysNotOfType<Required<T>, Array<any>>, `${'=' | '<>' | '!=' | '>' | '>=' | '<' | '<='}:`>
		| prefixString<KeysOfType<Required<T>, string>, `${'~~' | '~~*' | '!~~' | '!~~*'}:`>
		| Array<TablePreparedWhere<T>>
	>

	export type EnvironmentPreparedWhere<Env extends Environment> = TablePreparedWhere<FlatEnv<Env>>; 



	export type ValuesFromTablePreparedWhere<T extends Table, A extends unknown[]> = A extends [] ? [] : A extends [infer E, ...infer R] ? 
		(	E extends keyof T ? 
			[T[E], ... ValuesFromTablePreparedWhere<T,R>] 
			: 
			(	E extends `${string}:${infer S}` ?
					(S extends keyof T ?
						[T[S], ...ValuesFromTablePreparedWhere<T, R>] 
						: 
						never
					)
					:
					(E extends Array<unknown> ? 
						[...ValuesFromTablePreparedWhere<T, E>, ...ValuesFromTablePreparedWhere<T, R>] 
						: 
						never
					)
			)
		) 
		: 
		A;


	export type ValuesFromEnvironmentPreparedWhere<Env extends Environment, A extends unknown[]> = ValuesFromTablePreparedWhere<FlatEnv<Env>, A>;
	

///
// TESTS
///

type ENV = {
	table1 : {
		a1 : string;
		b1 : number;
		c1 : number[];
	},
	table2 : {
		a2 : string;
		b2 : number;
	},
	table4 : {
		a4 : number;
	}
};