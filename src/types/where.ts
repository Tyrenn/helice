
import {Arrayed, KeysOfType, KeysNotOfType, Table, Environment, FlatEnv, FlatArray} from './common';

/****************
		WHERE
*****************/

/**

TABLEWHERE : 
	{
		column1 : value,
		"<:column1" : value,
		column1 : value,
		"[]:column1" : value,
		"&&:anyname" : TABLEWHERE 
	}

WHERE<Tables> 
	{
		table1 : TABLEWHERE<Table1>,
		table2 : TABLEWHERE<Table2>,
		"&&:anyname" : WHERE<Tables>
	}

EnvironmentWhere<Env>{
	prop : [] | typeof prop
	"operator:prop" : [] | typeof
	"&&:any" : EnvironmentWhere<Env>
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


// TABLE => WHERE

	type prefixPropWhere<T extends Table, P extends string> = {
		[k in keyof T as k extends string ? `${P}${k}` : never]? : Arrayed<T[k] | null> |  TableWhere<T>[];//| amputedWhere<Where<T>, k> | amputedWhere<Where<T>, k>[];
	}

	export type tsqueryWhere = {
		value : string,
		weights? : number[],
		flag? : number,
		language : string
	}

	// String props of T
	type aaPropWhere<T> = {
		[k in keyof T as k extends string ? `@@:${k}` : never]? : tsqueryWhere;
	}

	// All prop of T
	type propWhere<T extends Table> = {
		[k in keyof T]? : Arrayed<T[k] | null> | TableWhere<T>[];//| amputedWhere<Where<T>, k> | amputedWhere<Where<T>, k>[];
	}

	export type TableWhere<T extends Table> = 
		propWhere<T> 
		& prefixPropWhere<Pick<T, KeysOfType<Required<T>, Array<any>>>, `[${'' | '!' | '=' | '<>' | '!=' | '>' | '>=' | '<' | '<='}]:`> 
		& prefixPropWhere<Pick<T, KeysOfType<Required<T>, Array<string>>>, `[${'~~' | '~~*' | '!~~' | '!~~*'}]:`> 
		& prefixPropWhere<Omit<T, KeysOfType<Required<T>, Array<any>>>, `${'=' | '<>' | '!=' | '>' | '>=' | '<' | '<='}:`> 
		& prefixPropWhere<Pick<T, KeysOfType<Required<T>, string>>, `${'~~' | '~~*' | '!~~' | '!~~*'}:`> 
		& aaPropWhere<Pick<T, KeysOfType<Required<T>, Array<string>>>> &
		{ [k in `&&${string}`]? : TableWhere<T>[]}


	//	export type EnvironmentWhere<T> = { [k in keyof T ]? : TableWhere<T[k]>} & {[k in `&&${string}`]? : EnvironmentWhere<T>[]};

	export type EnvironmentWhere<Env extends Environment> = TableWhere<FlatEnv<Env>>;







/************************
		PREPARED WHERE
**************************/

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