
import {Arrayed, KeysOfType, KeysNotOfType, Table, Environment, FlatEnv, Obj, UnArraying, Column} from '../types';
import { DefaultSyntaxKeys, SKArrayCompareOPL, SKArrayCompareOPR, SKArrayEqualityOPL, SKArrayEqualityOPR, SKArrayLikeOPL, SKArrayLikeOPR, SKCompareOPL, SKCompareOPR, SKEqualityOP, SKEqualityOPL, SKEqualityOPR, SKLikeOPL, SKLikeOPR, SyntaxKeys, SyntaxKeysConstant, VerboseSyntaxKeys } from '../syntaxkeys';

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
	type KeysOfArray<T> = KeysOfType<T, any[]>;
	type KeysOfStringArray<T> = KeysOfType<T, string[]>;
	type KeysOfString<T> = KeysOfType<T, string>;
	type KeysOfNonArray<T> = KeysNotOfType<T, any[]>;
	type KeysOfNumber<T> = KeysOfType<T, number>;
	type KeysOfNumberArray<T> = KeysOfType<T, number[]>;


	/** --------- WRAP Properties ------------- */

	// { [wrappedkey] : Anything}
	type WrapKeyArrayedValue<
		T extends Table,
		K extends keyof T,
		Prefix extends string,
		Suffix extends string
	> = {	[k in K & string as `${Prefix}${k}${Suffix}`]? : Arrayed<T[k] | null> | Column<KeysOfType<T, Arrayed<T[k]>> & string>; };

	// { [prefixcolumn] : Anything but array }
	type WrapKeyNoArrayValue<
		T extends Table,
		K extends keyof T,
		Prefix extends string,
		Suffix extends string
	> = { [k in K & string as `${Prefix}${k}${Suffix}`]? : UnArraying<T[k]> | null | Column<KeysOfType<T, UnArraying<T[k]>> & string>; };



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
		[K in KeysOfStringArray<T> & string as `${SK["tsqueryL"]}${K}${SK["tsqueryR"]}`]?: TSQuery;
	}



	/** --------- Base Properties ------------- */
	type BaseProp<
		T extends Table,

		SK extends SyntaxKeys
	> = {
		[k in keyof T]? : Arrayed<T[k] | null> | FlatEnvWhere<T, SK>[];
	}


// TODO Accept key of same type (other table column)
// TODO Accept simple equality on array ?
// TODO Accept key of same type inside array ??
	type FlatEnvWhere<
		T extends Table,

		SK extends SyntaxKeys
	> =
		BaseProp<T, SK>
		& WrapKeyArrayedValue<T, keyof T, SKEqualityOPL<SK>, SKEqualityOPR<SK>>									// =, !=
		& WrapKeyArrayedValue<T, KeysOfNumber<T>, SKCompareOPL<SK>, SKCompareOPR<SK>>							// >, >=, <, ≤ on non-array number
		& WrapKeyArrayedValue<T, KeysOfString<T>, SKLikeOPL<SK>, SKLikeOPR<SK>>									// LIKE operators on string
		& WrapKeyNoArrayValue<T, KeysOfArray<T>, SKArrayEqualityOPL<SK>, SKArrayEqualityOPR<SK>>			// arrays operators [=],[!],[]… on arrays
		& WrapKeyNoArrayValue<T, KeysOfNumberArray<T>, SKArrayCompareOPR<SK>, SKArrayCompareOPR<SK>>		// >, >=, <, ≤ on number[]
		& WrapKeyNoArrayValue<T, KeysOfStringArray<T>, SKArrayLikeOPL<SK>, SKArrayLikeOPR<SK>>				// LIKE operators on string[]
		& TSQueryProp<T, SK>		 																								// @@:tsquery
		& { [k in `${SK["andGroup"]}${string}`]? : FlatEnvWhere<T, SK>[]}											// nested AND


/* =========================================================================
   =  Final Type
   ========================================================================= */
	// TODO Should authorise : table
	// TODO Test

	export type Where<
		Env extends Environment,
		SK extends SyntaxKeys,
		OnlyOneTable extends keyof Env | undefined = undefined,
	> = Arrayed<FlatEnvWhere<FlatEnv<Env, OnlyOneTable>, SK>>;







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



class WhereParser{

	idx: number = 1;

	values: any[] = [];

	where : string = "";

	from : string = "";

	readonly SK : SyntaxKeysConstant;
	
	readonly VALUE_REGEX : RegExp;
	readonly ARRAY_VALUE_REGEX : RegExp;

	constructor(sk : SyntaxKeysConstant){
		this.SK = sk;

		// Match `{sk[]}name{sk[]}` and `name`
		this.VALUE_REGEX = new RegExp(
			String.raw`^(?<opl>(?:${
				[ this.SK['likeL'], this.SK['softLikeL'], this.SK['dislikeL'], this.SK['softDislikeL'], this.SK['regexLikeL'], this.SK['softRegexLikeL'], this.SK['equalityL'], this.SK['inequalityL'], this.SK['softSuperiorL'], this.SK['softInferiorL'], this.SK['strictSuperiorL'], this.SK['strictInferiorL']]
					.flatMap(v => Array.isArray(v) ? v : [v]).map(v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
			}))(?<name>.+)(?<opr>${
				[ this.SK['likeR'], this.SK['softLikeR'], this.SK['dislikeR'], this.SK['softDislikeR'], this.SK['regexLikeR'], this.SK['softRegexLikeR'], this.SK['equalityR'], this.SK['inequalityR'], this.SK['softSuperiorR'], this.SK['softInferiorR'], this.SK['strictSuperiorR'], this.SK['strictInferiorR']]
					.flatMap(v => Array.isArray(v) ? v : [v]).map(v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
			})$`);
		this.ARRAY_VALUE_REGEX = new RegExp(
			String.raw`^(?<opl>(?:${
				[ this.SK['arrayLikeL'], this.SK['arraySoftLikeL'], this.SK['arrayDislikeL'], this.SK['arraySoftDislikeL'], this.SK['arrayRegexLikeL'], this.SK['arraySoftRegexLikeL'], this.SK['arrayEqualityL'], this.SK['arrayInequalityL'], this.SK['arraySoftSuperiorL'], this.SK['arraySoftInferiorL'], this.SK['arrayStrictSuperiorL'], this.SK['arrayStrictInferiorL']]
					.flatMap(v => Array.isArray(v) ? v : [v]).map(v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
			}))(?<name>.+)(?<opr>${
				[ this.SK['arrayLikeR'], this.SK['arraySoftLikeR'], this.SK['arrayDislikeR'], this.SK['arraySoftDislikeR'], this.SK['arrayRegexLikeR'], this.SK['arraySoftRegexLikeR'], this.SK['arrayEqualityR'], this.SK['arrayInequalityR'], this.SK['arraySoftSuperiorR'], this.SK['arraySoftInferiorR'], this.SK['arrayStrictSuperiorR'], this.SK['arrayStrictInferiorR']]
					.flatMap(v => Array.isArray(v) ? v : [v]).map(v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
			})$`);
	}

// TODO WARNING change for a class column to avoid injection

	pushValue(v : any) : string {
		if(Array.isArray(v) && v.some(s => s instanceof Column)) //Check if array and if contains a Column instance
			return `'{${v.map(s => {
				if(s instanceof Column)
					return s.name;
				this.values.push(s);
				return `$${this.idx++}`;
			}).join(', ')}}'`
		else if(v instanceof Column)
			return v.name;
		else{
			this.values.push(v);
			return `$${this.idx++}`;
		}
	}

	private matchSK(skKey : keyof SyntaxKeysConstant, key : string){
		return Array.isArray(this.SK[skKey]) ? this.SK[skKey].includes(key) : this.SK[skKey] === key;
	}

	private processArrayColumn(op : string, opType : "like" | "equality" | "inequality" | "compare", name : string, value : any){
		
		if(opType === "equality")
			if (!Array.isArray(value))
				return this.where += `${this.pushValue(value)} = ANY(${name})`;
			else if(value.length == 1)
				return this.where += `${this.pushValue(value[0])} = ANY(${name})`;
			else
				return this.where += `( ${value.filter(v => v !== null).map(v => `${this.pushValue(v)} = ANY(${name}`).join(' OR ')} ${value.includes(null) ? `OR ${name} IS NULL ` : ''})` ;
	
		else if(opType === 'inequality')
			if(!Array.isArray(value))
				return this.where += `${this.pushValue(value)} ${op} ALL(${name})`
			else if(value.length == 1)
				return this.where += `${this.pushValue(value[0])} ${op} ALL(${name})`
			else
				return this.where += `( ${value.filter(v => v !== null).map(v => `${this.pushValue(value[0])} ${op} ALL(${name})`).join(' AND ')} ${value.includes(null) ? `AND ${name} IS NOT NULL ` : ''})`

		else if(opType === 'like')
			if(!Array.isArray(value))
				return this.where += `array_to_string(${name}, ' ') ${op} ${this.pushValue(value)}`;
			else if(value.length == 1)
				return this.where += `array_to_string(${name}, ' ') ${op} ${this.pushValue(value[0])}`;
			else
				return this.where += `( ${value.filter(v => v !== null).map(v => `array_to_string(${name}, ' ') ${op} ${this.pushValue(v)}`).join(' OR ')} ${value.includes(null) ? `OR ${name} IS NULL ` : ''} )`;

		else if(opType === 'compare')
			if(!Array.isArray(value))
				return this.where += `${this.pushValue(value)} ${op} ALL(${name})`
			else
				return
	}

	private parseArrayValue(key : string, value : any){
		const match = key.match(this.ARRAY_VALUE_REGEX);

		if (!match || !match.groups?.name)
			return;

		
		if ((!match.groups.opl && !match.groups.opr) || (this.matchSK('arrayEqualityL', match.groups.opl) && this.matchSK('arrayEqualityR', match.groups.opr)))
			return this.processArrayColumn("=", "equality", match.groups?.name, value);

		else if(this.matchSK('arrayInequalityL', match.groups.opl) && this.matchSK('inequalityL', match.groups.opr))
			return this.processArrayColumn("<>", "inequality", match.groups?.name, value);
		
		// LIKE OPERATORS
		else if(this.matchSK('arrayLikeL', match.groups.opl) && this.matchSK('arrayLikeR', match.groups.opr))
			return this.processArrayColumn("~~", "like", match.groups?.name, value);
		else if(this.matchSK('arraySoftLikeL', match.groups.opl) && this.matchSK('arraySoftLikeR', match.groups.opr))
			return this.processArrayColumn("~~*", "like", match.groups?.name, value);
		else if(this.matchSK('arrayDislikeL', match.groups.opl) && this.matchSK('arrayDislikeR', match.groups.opr))
			return this.processArrayColumn("!~~", "like", match.groups?.name, value);
		else if(this.matchSK('arraySoftDislikeL', match.groups.opl) && this.matchSK('arraySoftDislikeR', match.groups.opr))
			return this.processArrayColumn("!~~*", "like", match.groups?.name, value);
		else if(this.matchSK('arrayRegexLikeL', match.groups.opl) && this.matchSK('arrayRegexLikeR', match.groups.opr))
			return this.processArrayColumn("~", "like", match.groups?.name, value);
		else if(this.matchSK('arraySoftRegexLikeL', match.groups.opl) && this.matchSK('arraySoftRegexLikeR', match.groups.opr))
			return this.processArrayColumn("~*", "like", match.groups?.name, value);

		// COMPARE OP
		else if(this.matchSK('arraySoftSuperiorL', match.groups.opl) && this.matchSK('arraySoftSuperiorR', match.groups.opr))
			return this.processArrayColumn(">=", "compare", match.groups?.name, value);
		else if(this.matchSK('arraySoftInferiorL', match.groups.opl) && this.matchSK('arraySoftInferiorR', match.groups.opr))
			return this.processArrayColumn("<=", "compare", match.groups?.name, value);
		else if(this.matchSK('arrayStrictSuperiorL', match.groups.opl) && this.matchSK('arrayStrictSuperiorR', match.groups.opr))
			return this.processArrayColumn(">", "compare", match.groups?.name, value);
		else if(this.matchSK('arrayStrictInferiorL', match.groups.opl) && this.matchSK('arrayStrictInferiorR', match.groups.opr))
			return this.processArrayColumn("<", "compare", match.groups?.name, value);
	}


	/**
	 * Helper to handle case targeted column is not an array
	 * @param skKey 
	 * @param op 
	 * @param arrMethod Defines the method in front of array
	 * @param nullOP Defines the behavior if encounter null
	 * @param name 
	 * @param value 
	 * @returns 

	 * TODO Process key of same type (other columns) INSIDE array
	 */
	private processValueColumn(op : string, arrMethod : "ANY" | "ALL", nullOP : "IS" | "IS NOT", name : string, value : any){

		// Null case
		if(value === null)
			return this.where += `${name} ${nullOP} NULL`;
		else if (!Array.isArray(value))
		// Comparison to another table
			if(typeof value === "string" && /^[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*$/.test(value))		
				return this.where += `${name} ${op} value`;
		// Single value
			else
				return this.where += `${name} ${op} ${this.pushValue(value)}`;
		// Single value also
		else if (value.length == 1)
			return this.where += `${name} ${op} ${this.pushValue(value[0])}`;
		// Array case
		else
			return this.where += value.includes(null) ? `( ${name} ${nullOP} NULL AND ${name} ${op} ${arrMethod}(${this.pushValue(value)}) )` : `${name} ${op} ${arrMethod}(${this.pushValue(value)})`;
	}


	private parseValue(key : string, value : any) {
		const match = key.match(this.VALUE_REGEX);

		if (!match || !match.groups?.name)
			return;

		if ((!match.groups.opl && !match.groups.opr) || (this.matchSK('equalityL', match.groups.opl) && this.matchSK('equalityR', match.groups.opr)))
			return this.processValueColumn("=", "ANY", "IS", match.groups?.name, value);

		else if(this.matchSK('inequalityL', match.groups.opl) && this.matchSK('inequalityL', match.groups.opr))
			return this.processValueColumn("<>", "ALL", "IS NOT", match.groups?.name, value);
		
		// LIKE OPERATORS
		else if(this.matchSK('likeL', match.groups.opl) && this.matchSK('likeR', match.groups.opr))
			return this.processValueColumn("~~", "ANY", "IS NOT", match.groups?.name, value);
		else if(this.matchSK('softLikeL', match.groups.opl) && this.matchSK('softLikeR', match.groups.opr))
			return this.processValueColumn("~~*", "ANY", "IS NOT", match.groups?.name, value);
		else if(this.matchSK('dislikeL', match.groups.opl) && this.matchSK('dislikeR', match.groups.opr))
			return this.processValueColumn("!~~", "ANY", "IS NOT", match.groups?.name, value);
		else if(this.matchSK('softDislikeL', match.groups.opl) && this.matchSK('softDislikeR', match.groups.opr))
			return this.processValueColumn("!~~*", "ANY", "IS NOT", match.groups?.name, value);
		else if(this.matchSK('regexLikeL', match.groups.opl) && this.matchSK('regexLikeR', match.groups.opr))
			return this.processValueColumn("~", "ANY", "IS NOT", match.groups?.name, value);
		else if(this.matchSK('softRegexLikeL', match.groups.opl) && this.matchSK('softRegexLikeR', match.groups.opr))
			return this.processValueColumn("~*", "ANY", "IS NOT", match.groups?.name, value);

		// COMPARE OP
		else if(this.matchSK('softSuperiorL', match.groups.opl) && this.matchSK('softSuperiorR', match.groups.opr))
			return this.processValueColumn(">=", "ALL", "IS NOT", match.groups?.name, value);
		else if(this.matchSK('softInferiorL', match.groups.opl) && this.matchSK('softInferiorR', match.groups.opr))
			return this.processValueColumn("<=", "ALL", "IS NOT", match.groups?.name, value);
		else if(this.matchSK('strictSuperiorL', match.groups.opl) && this.matchSK('strictSuperiorR', match.groups.opr))
			return this.processValueColumn(">", "ALL", "IS NOT", match.groups?.name, value);
		else if(this.matchSK('strictInferiorL', match.groups.opl) && this.matchSK('strictInferiorR', match.groups.opr))
			return this.processValueColumn("<", "ALL", "IS NOT", match.groups?.name, value);
	}


	parse(where: Obj | Obj[], idx : number = 1){
		this.idx = idx;
		this.values = [];

		
	}
}



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
function whereValueToSQL(key : string, value : any, result : WhereSQLResult, sk : SyntaxKeysConstant){
	const keyRgx = new RegExp(
		String.raw`^(?:(?<op>${sk['']}*)])(?<name>.+)(${}$`	// Match `op:name` and `name`
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

