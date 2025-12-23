
import {Arrayed, KeysOfType, KeysNotOfType, Table, Environment, FlatEnv, Obj} from '../types';
import { DefaultSyntaxKeys, SyntaxKeys } from '../syntaxkeys';

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
	type PrefixedProp<
		T extends Table,
		K extends keyof T,
		P extends string,

		SK extends SyntaxKeys
	> = {	[k in K & string as `${P}${k}`]? : Arrayed<T[k] | null> |  TableWhere<T, SK>[] | KeysOfType<T, T[k]>; };

	// { [prefixcolumn] : Accepte tout sauf les []}
	type PrefixedPropNonArray<
		T extends Table,
		K extends keyof T,
		P extends string,

		SK extends SyntaxKeys
	> = { [k in K & string as `${P}${k}`]? : T[k] | null |  TableWhere<T, SK>[] | KeysOfType<T, T[k]>; };



	/** --------- TS QUERY Properties ------------- */

	export type TSQuery = {
		value : string,
		weights? : number[],
		flag? : number,
		language : string;
	}

	type TSQueryProp<
		T,
		SK extends SyntaxKeys
	> = {
		[K in StringArrayKeys<T> & string as `${SK["tsquery"]}:${K}`]?: TSQuery;
	}



	/** --------- Base Properties ------------- */
	type BaseProp<
		T extends Table,

		SK extends SyntaxKeys
	> = {
		[k in keyof T]? : Arrayed<T[k] | null> | TableWhere<T, SK>[];
	}


	type TableWhere<
		T extends Table,

		SK extends SyntaxKeys
	> =
		BaseProp<T, SK>
		& PrefixedProp<T, ArrayKeys<T>, `[${'' | '=' | '!' | '<>' | '!='}]:`, SK>							// arrays operators [=],[!],[]… on arrays
		& PrefixedProp<T, StringArrayKeys<T>, `[${'~~' | '~~*' | '!~~' | '!~~*'}]:`, SK>					// LIKE operators on string[]
		& PrefixedProp<T, NonArrayKeys<T>, `${'=' | '<>' | '!='}:`, SK>										// =, != on non-array
		& PrefixedPropNonArray<T, NonArrayKeys<T>, `${'>' | '>=' | '<' | '<='}:`, SK>						// >, >=, <, ≤ on non-array
		& PrefixedProp<T, StringKeys<T>, `${'~~' | '~~*' | '!~~' | '!~~*' | '~' | '~*'}:`, SK>			// LIKE operators on string
		& TSQueryProp<T, SK>		 																							// @@:tsquery
		& { [k in `${SK["andGroup"]}:${string}`]? : TableWhere<T, SK>[]}										// nested AND



/* =========================================================================
   =  Final Type
   ========================================================================= */
	// TODO Should authorise grouped [] to allow OR from the very start
	// TODO Should authorise : table
	// TODO Should prefix string like in join '' to separate from autocompleted columns ?
	// TODO Test

	export type Where<
		Env extends Environment,

		SK extends SyntaxKeys
	> = TableWhere<FlatEnv<Env>, SK>;







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





/* =========================================================================
   =  UTILS
   ========================================================================= */




class WhereSQLResult{
	where: string = '';
	from: string = '';
	dollarIdx: number = 1;

	values: any[] = [];

	constructor(dollarIdx : number = 1){
		this.dollarIdx = dollarIdx;
	}

	pushValue(v : any) : string{
		this.values.push(v);
		return `${this.dollarIdx++}`;
	}
}



   /**
	 * Transforms sign:prop and prop
		=:i : 1 				=> 		i = 1
		<>:i : null 		=> 		i is not NULL
		i : 2					=> 		i = 2
		<:i : 2				=> 		i = 2
		i : [1,2]			=> 		i = ANY([1,2])
		i : [1, null]		=>			(i is NULL OR i = ANY([1]))
		<>:i : [1, null]	=>			(i is not NULL AND i <> ALL([1]))
		~~*:i : "test"		=>			i ~~* "test"
		~~:i : [1, null]	=>			(i is NULL OR i ~~ array_to_string([1], ' '))
	 */
function whereValueToSQL(key : string, value : any, result : WhereSQLResult){
	const keyRgx = new RegExp(
		String.raw`^(?:(?<op>[^:]*)]:)(?<name>.+)$`	// Match `op:name` and `name`
	);
	const match = key.match(keyRgx);

	if (!match || !match.groups?.name)
		return;

	if (!match.groups.op || match.groups.op === '=')
		if (value === null)
			return result.where += `${match.groups.name} IS NULL`;
		else if (!Array.isArray(value))
			return result.where += `${match.groups.name} = $${result.pushValue(value)}`;
		else if (value.length == 1)
			return result.where += `${match.groups.name} = $${result.pushValue(value[0])}`;
		else
			return result.where += value.includes(null) ? `( ${match.groups.name} IS NULL OR ${match.groups.name} = ANY($${result.pushValue(value[0])}) )` : `${match.groups.name} = ANY($${result.pushValue(value[0])})`;

	else if(['<>', "!="].includes(match.groups.op))
		if (value === null)
			return result.where += `${match.groups.name} IS NOT NULL`;
		else if (!Array.isArray(value))
			return result.where += `${match.groups.name} <> $${result.pushValue(value)}`;
		else if (value.length == 1)
			return result.where += `${match.groups.name} <> $${result.pushValue(value[0])}`;
		else
			return result.where += value.includes(null) ? `( ${match.groups.name} IS NOT NULL AND ${match.groups.name} <> ALL($${result.pushValue(value[0])}) )` : `${match.groups.name} <> ALL($${result.pushValue(value[0])})`;

	else if(["~~", "~~*", "!~~", "!~~*"].includes(match.groups.op))
		if (value === null)
			return result.where += `${match.groups.name} IS NOT NULL`;
		else if (!Array.isArray(value))
			return result.where += `${match.groups.name} ${match.groups.op} $${result.pushValue(value)}`;
		else if (value.length == 1)
			return result.where += `${match.groups.name} ${match.groups.op} $${result.pushValue(value[0])}`;
		else
			return result.where += value.includes(null) ? `( ${match.groups.name} IS NOT NULL OR ${match.groups.name} ${match.groups.op} ANY($${result.pushValue(value[0])}) )` : `${match.groups.name} ${match.groups.op} ANY($${result.pushValue(value[0])})`;

	else
		if (value === null)
			return result.where += `${match.groups.name} IS NOT NULL`;
		else if (!Array.isArray(value))
			return result.where += `${match.groups.name} ${match.groups.op} $${result.pushValue(value)}`;
		else if (value.length == 1)
			return result.where += `${match.groups.name} ${match.groups.op} $${result.pushValue(value[0])}`;
		else
			return result.where += value.includes(null) ? `( ${match.groups.name} IS NOT NULL AND ${match.groups.name} ${match.groups.op} ALL($${result.pushValue(value[0])}) )` : `${match.groups.name} ${match.groups.op} ALL($${result.pushValue(value[0])})`;
	}


/**
 * Transforms [] props
	[]:arr : [1, 2] 			=> 	arr = [1,2]
	[!]:arr :	[1, 2] 		=> 	arr <> [1,2]
	[=]:arr : [1,2]  			=>  	(1 = ANY(arr) OR 2 = ANY(arr))
	[=]:arr : 1 				=> 	1 = ANY(arr)
	[<>]:arr : [1,2] 			=> 	(1 <> ALL(arr) OR 2 <> ALL(arr))
	[<>]:arr : 1 				=> 	1 <> ALL(arr)
	[~~*]:arr : "test"		=>		"test" ~~* array_to_string(arr, ' ')
	[~~]:arr : [1, 2, null]		=>		(i is NULL OR 1 ~~ array_to_string(arr, ' ') OR 2 ~~ array_to_string(arr, ' '))
 */
function arrayWhereValueToSQL(key : string, value : any, result : WhereSQLResult){
	const keyRgx = new RegExp(
		String.raw`^\[(?<op>[^:\]]*)]:(?<name>.+)$`	// Match `[op]:name`
	);
	const match = key.match(keyRgx);

	if (!match || !match.groups?.op || !match.groups?.name)
		return ''

	// []:arr : [1, 2] => arr = [1,2]
	if(match.groups.op === "")
		return result.where += value === null ?  `${match.groups.name} is NULL` : `${match.groups?.name} = $${result.pushValue(value)}`;

	//[!]:arr :	[1, 2] => arr != [1,2]
	else if(match.groups.op === "")
		return result.where += value === null ?  `${match.groups.name} is not NULL` : `${match.groups?.name} <> $${result.pushValue(value)}`;


	// [=]:arr : 1 => 1 = ANY(arr)
	// [=]:arr : [1] => 1 = ANY(arr)
	// [=]:arr : [1,2] => (1 = ANY(arr) OR 2 = ANY(arr))
	else if(match.groups.op === "="){
		if (!Array.isArray(value))
			return result.where += `$${result.pushValue(value)} = ANY(${match.groups.name})`;
		else if(value.length == 1)
			return result.where += `$${result.pushValue(value[0])} = ANY(${match.groups.name})`;
		else
			return result.where += `( $${value.filter(v => v !== null).map(v => `$${result.pushValue(v)} = ANY(${match.groups!.name}`).join(' OR ')} ${value.includes(null) ? `OR ${match.groups.name} IS NULL ` : ''})` ;
	}

	// [~~*]:arr : ["test"] => "test" ~~* array_to_string(arr, ' ')
	// [!~~]:arr : 1 => (1 ~~ array_to_string(arr, ' ') OR 2 ~~ array_to_string(arr, ' '))
	// [~~]:arr : [1,2, null] => (i is NULL OR 1 ~~ array_to_string(arr, ' ') OR 2 ~~ array_to_string(arr, ' '))
	else if(["~~", "~~*", "!~~", "!~~*"].includes(match.groups.op)){
		if(!Array.isArray(value))
			return result.where += `array_to_string(${match.groups.name}, ' ') ${match.groups.op} $${result.pushValue(value)}`;
		else if(value.length == 1)
			return result.where += `array_to_string(${match.groups.name}, ' ') ${match.groups.op} $${result.pushValue(value[0])}`;
		else
			return result.where += `( ${value.filter(v => v !== null).map(v => `array_to_string(${match.groups!.name}, ' ') ${match.groups!.op} $${result.pushValue(v)}`).join(' OR ')} ${value.includes(null) ? `OR ${match.groups.name} IS NULL ` : ''} )`;
	}

	// [<>]:arr : 1 => 1 <> ALL(arr)
	else{
		if(!Array.isArray(value))
			return result.where += `$${result.pushValue(value)} ${match.groups.op} ALL(${match.groups.name})`
		else if(value.length == 1)
			return result.where += `$${result.pushValue(value[0])} ${match.groups.op} ALL(${match.groups.name})`
		else
			return result.where += `( ${value.filter(v => v !== null).map(v => `$${result.pushValue(value[0])} ${match.groups!.op} ALL(${match.groups!.name})`).join(' AND ')} ${value.includes(null) ? `AND ${match.groups.name} IS NOT NULL ` : ''})`
	}
}


function tsQueryValueToSQL(key : string, value : any, result : WhereSQLResult){
	const keyRgx = new RegExp(
		String.raw`^\[@@:(?<name>.+)$`	// Match `@@:name`
	);
	const match = key.match(keyRgx);

	if (!match || !match.groups?.name)
		return {};

	result.from += `to_tsquery($${result.pushValue(value.language)}, $${result.pushValue(value.value)}) as ${match.groups.name.replace('.', '_')}_query, ts_rank_cd($${result.pushValue(value.weights ?? [0.1, 0.2, 0.4, 1.0])}, ${match.groups.name}, ${match.groups.name.replace('.', '_')}_query, ${value.flag ?? '32'}) AS ${match.groups.name.replace('.', '_')}_rank,`;
	result.where += `${match.groups.name.replace('.', '_')}_query @@ ${match.groups.name}`;
}


function wheresToSQL(array : Array<Obj>, result : WhereSQLResult){
	result.where += ' ( ';
	let currentDollarIdx = result.dollarIdx;
	for(const w of array){

		if(result.dollarIdx > currentDollarIdx) // At least one statement has been added
			result.where += ` OR `;

		result.where += ' ( ';
		whereToSQL(w, result)
		result.where += ' ) ';
		currentDollarIdx = result.dollarIdx;
	}
}


export function whereToSQL(where: Obj | Obj[], result: WhereSQLResult = new WhereSQLResult(1)): WhereSQLResult {
	if(Array.isArray(where)){
		wheresToSQL(where, result);
		return result;
	}

	for(const prop in where){
		if(where[prop] === undefined)
				continue;

		if (prop.match(new RegExp(String.raw`^&&:.+`)) && Array.isArray(where[prop]))
			wheresToSQL(where[prop], result);
		else if (prop.match(new RegExp(String.raw`^&&:.+`)) && !Array.isArray(where[prop]))
			whereToSQL(where[prop], result);
		else if (prop.match(new RegExp(String.raw`^@@:.+`)))
			tsQueryValueToSQL(prop, where[prop], result);
		else if (prop.match(new RegExp(String.raw`^\[.*\]:.*`)))
			arrayWhereValueToSQL(prop, where[prop], result);
		else
			whereValueToSQL(prop, where[prop], result);

		result.where += ' AND ';
	}
	result.where = result.where.slice(0,-5);

	return result;
}



/**
 * Flatten an array of objects or an object as WHERE clause

	Example 1

		let obj = {
			nb : 0,
			nb2 : 12,
			ar : ['b', 'a'],
			"[]:ar" : ['b', 'a'],
			"[=]:br" : ['b'],
			str : 'hello',
			u : undefined,
			n : null,
			t : [{
					_ : 25,
					nb : 10,
					str : 'aurevoir'
				},
				{
					_ : 24,
					nb : 9,
					str : "byebye"
				}
			],
			"@@:test" : {
				value : "bonjour la recherche",
				weights : [0.1,0.2,0.4,0.1],
				flag : 32,
				language : 'unaccent_french'
			}
		};

		RESULT
		{
			where: 'nb = $1 AND nb2 = $2 AND ar = ANY($3) AND ar = $4 AND br = $5 AND str = $6 AND n is $7 AND (t = $8 AND nb = $9 AND str = $10 )  OR (t = $11 AND nb = $12 AND str = $13 ) AND test_query @@ test ',
			from: ', to_tsquery($15, $16) as test_query,', ts_rank_cd($14, test,  test_query, 32) AS test_rank
			values: [0, 12, [ 'b', 'a' ], [ 'b', 'a' ], 'b', 'hello', null, 25, 10, 'aurevoir', 24, 9, 'byebye', [ 0.1, 0.2, 0.4, 0.1 ], 'unaccent_french',	'bonjour la recherche'],
			nextvar: 17
		}
*/


export function mergeWHEREAsAND(...where : (string|undefined)[]){
	let res = '';
	for(const s of where){
		if(s && s.replace(/\s/g, '').length > 0)
			res += s + ' AND '
	}
	res = res.slice(0, -5);

	return res && res.replace(/\s/g, '').length > 0 ? `( ${res} )` : '';
}


export function mergeWHEREAsOR(...where : (string | undefined)[]){
	let res = '';
	for(const s of where){
		if(s && s.replace(/\s/g, '').length > 0)
			res += s + ' OR '
	}
	res = res.slice(0, -4);

	return res && res.replace(/\s/g, '').length > 0 ? `( ${res} )` : '';
}



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
