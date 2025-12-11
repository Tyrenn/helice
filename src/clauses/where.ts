
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
export function whereToSQL(filter : Obj | Obj[], startdollar : number = 1, prefix? : string, encryptedColumns? : string[]) : {where : string, from : string, values : Array<any>, nextvar : number} {
	let values : any = [];
	let where = "";
	let from = "";
	let i = startdollar;

	const dottedPrefix = prefix ? prefix + '.' : '';
	const dashedPrefix = prefix ? prefix + '_' : '';

	const pushValue = (val : any) => {
		values.push(val);
		return i++;
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
	const flattenValForArrayProp = (prop : string, sign : string, val : any) => {
		let decryptedProp;
		const match = prop.match(/^(.*)\(([^)]*)\)(.*)/);
		if(match && match.length > 3){
			decryptedProp = `${match[1]}(${encryptedColumns?.includes(match[2]!) ? 'decrypt:' : ''}${dottedPrefix}${match[2]})${match[3]}`;
		}
		else{
			decryptedProp = `${encryptedColumns?.includes(prop) ? 'decrypt:' : ''}${dottedPrefix}${prop}`;
		}

		// []:arr : [1, 2] => arr = [1,2]
		if(sign === "")
			where += (val === null ?  `${dottedPrefix}${prop} is NULL` : `${decryptedProp} = $${pushValue(val)}`);

		//[!]:arr :	[1, 2] => arr != [1,2]
		else if(sign === "!")
			where += (val === null ? `${dottedPrefix}${prop} is not NULL` : `${decryptedProp} <> $${pushValue(val)}`);

		// [=]:arr : 1 => 1 = ANY(arr)
		// [<>]:arr : 1 => 1 <> ALL(arr)
		else if(!Array.isArray(val)){
			if(sign === "~~" || sign === "~~*" || sign === "!~~" || sign === "!~~*")
				where += `array_to_string(${decryptedProp}, ' ') ${sign} $${pushValue(val)}`;
			else if (sign === "" || sign === "=")
				where += `$${pushValue(val)} ${sign} ANY(${decryptedProp})`;
			else
				where += `$${pushValue(val)} ${sign} ALL(${decryptedProp})`;
		}

		// [=]:arr : [1] => 1 = ANY(arr)
		// [<>]:arr : [1] => 1 <> ALL(arr)
		// [~~*]:arr : ["test"] => "test" ~~* array_to_string(arr, ' ')
		else if(val.length == 1){
			if(sign === "~~" || sign === "~~*" || sign === "!~~" || sign === "!~~*")
				where += `array_to_string(${decryptedProp}, ' ') ${sign} $${pushValue(val[0])}`;
			else if (sign === "" || sign === "=")
				where += `$${pushValue(val[0])} ${sign} ANY(${decryptedProp})`;
			else
				where += `$${pushValue(val[0])} ${sign} ALL(${decryptedProp})`;
		}

		// [=]:arr : [1,2] => (1 = ANY(arr) OR 2 = ANY(arr))
		// [<>]:arr : [1,2] => (1 <> ALL(arr) AND 2 <> ALL(arr))
		// [~~]:arr : [1,2, null] => (i is NULL OR 1 ~~ array_to_string(arr, ' ') OR 2 ~~ array_to_string(arr, ' '))
		else if(val.length > 0){
			where += '( '
			if(val.includes(null)){
				val = val.filter(n => n !== null);
				where += `${dottedPrefix}${prop} ${sign === "" || sign === '=' ? 'is NULL OR ' : "is not NULL AND "}`;
			}
			for(const v of val){
				if(sign === "~~" || sign === "~~*" || sign === "!~~" || sign === "!~~*")
					where += `array_to_string(${decryptedProp}, ' ') ${sign} $${pushValue(v)} OR `;
				else if(sign === "" || sign === "=")
					where += `$${pushValue(v)} ${sign} ANY(${decryptedProp}) OR `;
				else
					where += `$${pushValue(v)} ${sign} ALL(${decryptedProp}) AND `;
			}
			where = where.slice(0, -4);	// Removing ' OR '
			where += ' )';
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
		~*:i : "test"		=>			i ~* "test"
		~:i : [1, null]	=>			(i is NULL OR i ~ array_to_string([1], ' '))
	 */
	const flattenValForProp = (prop : string, sign : string, val : any) => {
		let decryptedProp;
		const match = prop.match(/^(.*)\(([^)]*)\)(.*)/);
		if(match && match.length > 3){
			decryptedProp = `${match[1]}(${encryptedColumns?.includes(match[2]!) ? 'decrypt:' : ''}${dottedPrefix}${match[2]})${match[3]}`;
		}
		else{
			decryptedProp = `${encryptedColumns?.includes(prop) ? 'decrypt:' : ''}${dottedPrefix}${prop}`;
		}

		if(val === null){
			if(sign === '' || sign === '=')
				sign = 'is';
			if(sign === '!=' || sign === '<>')
				sign = 'is not';
			where += `${dottedPrefix}${prop} ${sign} NULL`;
		}
		else if(Array.isArray(val) && val.length > 1){
			if(val.includes(null)){
				val = val.filter(n => n !== null);
				where += `(${dottedPrefix}${prop} ${sign === '' || sign === "=" ? 'is NULL OR' : 'is not NULL AND' } `
				if(sign === "" || sign === "=")
					where += `${decryptedProp} ${sign} ANY($${pushValue(val)})`;
				else if(sign === '~~' || sign === '~~*' || sign === '!~~' || sign === '!~~*')
					where += `array_to_string($${pushValue(val)}, ' ') ${sign} ${decryptedProp}`;
				else
					where += `${decryptedProp} ${sign} ALL($${pushValue(val)})`;
				where += ')'
			}

			else if(sign === "" || sign === "=")
				where += `${decryptedProp} ${sign} ANY($${pushValue(val)})`;
			else if(sign === '~~' || sign === '~~*' || sign === '!~~' || sign === '!~~*' || sign === '~' || sign === '~*')
				where += `array_to_string($${pushValue(val)}, ' ') ${sign} ${decryptedProp}`;
			else	// Should be '<>'
				where += `${decryptedProp} ${sign} ALL($${pushValue(val)})`;
		}
		else if(Array.isArray(val) && val.length > 0){
			where += `${decryptedProp} ${sign} $${pushValue(val[0])}`;
		}
		else if(Array.isArray(val) && val.length == 0){
			where += `${dottedPrefix}${prop} ${sign === '' || sign === "=" ? 'is NULL' : 'is not NULL' }`;
		}
		else{
			where += `${decryptedProp} ${sign} $${pushValue(val)}`;
		}
	}

	/**
	 * Transforms @@:prop
	 * tsqueryWhere =>
	 * 	from : to_tsquery(language, value) as prefix_prop_query, ts_rank_cd(weights, prefix.prop, prefix_prop_query, flag) as prefix_prop_rank
	 * @param prop
	 * @param obj
	 */
	const flattenAAProp = (prop : string, obj : TSQuery) => {
		from += `to_tsquery($${i++}, $${i++}) as ${dashedPrefix}${prop}_query, ts_rank_cd($${i++}, ${dottedPrefix}${prop},  ${dashedPrefix}${prop}_query, ${obj.flag ?? '32'}) AS ${dashedPrefix}${prop}_rank`;
		where += `${dashedPrefix}${prop}_query @@ ${prop}`;
		values.push(obj.language, obj.value, obj.weights ?? [0.1, 0.2, 0.4, 1.0]);
	}

	const flattenANDProp = (array : Array<Obj>) => {
		where += ' (';
		for(const o of array){
			const flt = whereToSQL(o, i, prefix);
			where += ` ( ${flt.where} ) OR`;
			from += flt.from;
			i = flt.nextvar;
			values = [...values, ...flt.values];
		}
		where = where.slice(0, -2);
		where += ')';
	}

	const flatten = (obj : any) => {
		for(const prop in obj){
			if(obj[prop] === undefined)
				continue;
			let execRes;

			const andRegex = /^&&.*/;
			const aaRegex = /^@@:(.*)/;
			const arrRegex = /^\[(|!|=|<>|!=|~~|~~\*|!~~|!~~\*)\]:((?:[^()]+$)|.*\(([^)]*)\).*)/;
			const singleRegex = /^(|=|<>|!=|>|>=|<|<=|~~|~~\*|!~~|!~~\*|~|~\*):((?:[^()]+$)|.*\(([^)]*)\).*)/;

			if(andRegex.exec(prop) !== null && Array.isArray(obj[prop])){
				flattenANDProp(obj[prop]);
			}
			else if((execRes = aaRegex.exec(prop)) !== null){
				flattenAAProp(execRes[1]!, obj[prop]);
			}
			else if((execRes = arrRegex.exec(prop)) !== null){
				flattenValForArrayProp(execRes[2]!, execRes[1]!, obj[execRes.length > 2 ? execRes[3] ?? prop : prop]);
			}else if((execRes = singleRegex.exec(prop)) !== null){
				flattenValForProp(execRes[2]!, execRes[1] === '' ? '=' : execRes[1]!, obj[execRes.length > 2 ? execRes[3] ?? prop : prop]);
			}else{
				flattenValForProp(prop, '=', obj[prop]);
			}
			where += ' AND ';
		}
		where = where.slice(0,-5);
	}

	if(Array.isArray(filter)){
		for(const obj of filter){
			if(i > startdollar)
				where += ` OR `;
			where += `(`;

			flatten(obj);

			where += ') '
		}
	}
	else{
		flatten(filter);
	}

	return {where, from, values, nextvar : i};
}




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