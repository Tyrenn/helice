import { col, Column, Environment, Obj, Simplify, Table } from "../types";
import { DefaultSyntaxKeys, SKArrayCompareOPL, SKArrayCompareOPR, SKArrayEqualityOPL, SKArrayEqualityOPR, SKArrayLikeOPL, SKArrayLikeOPR, SKCompareOPL, SKCompareOPR, SKEqualityOPL, SKEqualityOPR, SKLikeOPL, SKLikeOPR, SyntaxKeys, SyntaxKeysConstant, VerboseSyntaxKeys } from "../syntaxkeys";
import { FlatEnv, KeysOfArray, KeysOfNonArray, KeysOfNumber, KeysOfNumberArray, KeysOfString, KeysOfStringArray, KeysOfType, StrKeys, TablesWithoutType, TablesWithType, WrapKeyArrayedValue, WrapKeyNoArrayValue } from "./common";

/****************
		JOIN

	Env : {
		table1 : {
			a1 : string;
			b1 : number;
			c1 : number[];
		},
		table2 : {
			a2 : string;
			b2 : number;
		}
	}

	GoodType<Env, number> gives : table1.b1 | table2.b2


	AEnv : {
		table1 : {
			a1 : string;
			b1 : number;
			c1 : number[];
		}
	}


	Join<Env, AEnv>
	{
		"table2" : "b2 # table1.b1",					// Default join is left join
		"table2@alias1" : "b2 i# table1.b1",		// Can do inner (i), left (l), right (r) and full (f) joins
		"table2@alias2" : "b2 # table1.b1"			// Can alias the joined table
		"table1@alias3" : "a1 # table1.a1"			// MUST alias already available table otherwise name clash
		"table2@alias4" : {								// More complex joins are possible with join over multiple columns, similar to WHERE API
			"#" : inner										// Can do inner, left, right and full joins
			"b2" : "table1.b1",							// Equality join
			"<:b2" : "table1.b1",						// Comparison to another column
			"<:b2" : 4										// Comparison to values
		}
	}


	WARNING :
		- By default nothing prevents you to give same alias to 2 joined tables which will result in unexpected behaviors.
		- You can use the safe alias utility

 */


/* =========================================================================
   =  Grammar
   ========================================================================= */


	/** --------- Join String Value -------------
		"tableX" : BaseJoinValue
	*/

	type JoinStringValue<
		Env extends Environment,
		AccEnv extends Environment,
		TargetTable extends keyof Env,
	> = {[k in KeysOfType<Env[TargetTable], string | number | boolean> & string] : `${k} = ${KeysOfType<FlatEnv<AccEnv>, Env[TargetTable][k]> & string}`}[KeysOfType<Env[TargetTable], string | number | boolean> & string]




	/** --------- Join Object Value -------------
		"table2@alias3" : {							// More complex joins are possible with join over multiple columns, similar to WHERE API
			"#" : "inner"									// Can do inner, left, right and full joins
			"b2" : "table1.b1",							// Equality join
			"<:b2" : "table1.b1",						// Comparison to another column
			"<:b2" : 4										// Comparison to values
			"b2" : null										// Comparison to values
		}
	*/

	type JoinObjectValue<
		Env extends Environment,
		AccEnv extends Environment,			// Why won't start with accessible ?
		TargetTable extends string,

		SK extends SyntaxKeys = DefaultSyntaxKeys
	> =
			{ [k in SK["join"]] : "INNER" | "LEFT" | "RIGHT" | "FULL"}
		& JoinObjectAnd<Env[TargetTable], FlatEnv<AccEnv>, SK> 

		// &	{ [k in StrKeys<Env[TargetTable]> as Env[TargetTable][k] extends (string | number | boolean) ? `${'' | SKEqualityOPL<SK>}${k}${'' | SKEqualityOPR<SK>}` : never]? : SameTypeColumns<Env, AccessibleTables, TargetTable, k> | (Env[TargetTable][k] extends string ? (Env[TargetTable][k] & (string & {})) : Env[TargetTable][k]) | null }
		// &	{ [k in StrKeys<Env[TargetTable]> as Env[TargetTable][k] extends (number) ? `${SKCompareOPL<SK>}${k}${SKCompareOPR<SK>}` : never]? : SameTypeColumns<Env, AccessibleTables, TargetTable, k> | number | number[] | null }
		// &	{ [k in StrKeys<Env[TargetTable]> as Env[TargetTable][k] extends (string) ? `${SKLikeOPL<SK>}${k}${SKLikeOPR<SK>}` : never]? : SameTypeColumns<Env, AccessibleTables, TargetTable, k> | string | string[] | null}


	type JoinObjectAnd<
		T extends Table,
		A extends Table,

		SK extends SyntaxKeys
	> = 	WrapKeyArrayedValue<T, KeysOfNonArray<T>, A, '', ''>
		& 	WrapKeyArrayedValue<T, KeysOfNonArray<T>, A, SKEqualityOPL<SK>, SKEqualityOPR<SK>>						// =, !=
		& 	WrapKeyArrayedValue<T, KeysOfNumber<T>, A, SKCompareOPL<SK>, SKCompareOPR<SK>>							// >, >=, <, ≤ on non-array number
		& 	WrapKeyArrayedValue<T, KeysOfString<T>, A, SKLikeOPL<SK>, SKLikeOPR<SK>>									// LIKE operators on string
		& 	WrapKeyArrayedValue<T, KeysOfArray<T>, A, SKArrayEqualityOPL<SK>, SKArrayEqualityOPR<SK>>			// arrays operators [=],[!],[]… on arrays
		& 	WrapKeyNoArrayValue<T, KeysOfNumberArray<T>, A, SKArrayCompareOPL<SK>, SKArrayCompareOPR<SK>>		// >, >=, <, ≤ on number[]
		& 	WrapKeyNoArrayValue<T, KeysOfStringArray<T>, A, SKArrayLikeOPL<SK>, SKArrayLikeOPR<SK>>				// LIKE operators on string[]
		& 	{ [k in `${SK["andGroup"]}${string}`]? : JoinObjectAnd<T, A, SK>[]}											// nested AND



/* =========================================================================
   =  Final Type
   ========================================================================= */

	export type Join<
		Env extends Environment,
		AccEnv extends Environment,

		SK extends SyntaxKeys = DefaultSyntaxKeys
	> =
			{ [table in TablesWithType<Env, number | string | boolean> & string as `${SK["innerJoin" | "fullJoin" | "leftJoin" | "rightJoin"]}${table & string}${'' | `${SK["alias"]}${string}`}`]? : JoinStringValue<Env, AccEnv, table> }
		&	{ [table in TablesWithType<Env, number | string | boolean> & string as `${table}${'' | `${SK["alias"]}${string}`}`]? : JoinStringValue<Env, AccEnv, table> | JoinObjectValue<Env, AccEnv, table, SK> }
		&	{ [table in TablesWithoutType<Env, number | string | boolean> & string as `${table}${'' | `${SK["alias"]}${string}`}`]? : JoinObjectValue<Env, AccEnv, table, SK> }
		// &
		// { [table in StrKeys<Env> as (number | string | boolean) extends Env[table][keyof Env[table]] ?  never : `${table}${'' | `${SK["alias"]}${string}`}`]? : JoinObjectValue<Env, AccEnv, table, SK> }
//	&	{ [table in StrKeys<Env> as `${table}${'' | `${SK["alias"]}${string}`}`]? : JoinObjectValue<Env, AccEnv, table, SK> }

// Using tables with type
//		{ [table in  (TablesWithType<Env, string | boolean | number>) as table extends string ? `${'' | SK["innerJoin" | "fullJoin" | "leftJoin" | "rightJoin"]}${table}${'' | `${SK["alias"]}${string}`}` : never]? : JoinStringValue<Env, AccEnv, table> }


	// TODO ADAPT
	export type EnvironmentFromJoin<
		Env extends Environment,
		AccEnv extends Environment,
		J extends Join<Env, AccEnv, SK>,

		SK extends SyntaxKeys = DefaultSyntaxKeys
	> =
		Simplify<
				AccEnv
			&	{ [k in StrKeys<J> as k extends `${infer table}` ? (table extends `${string}${SK["alias"]}${infer alias}` ? alias : table) : never] : k extends `${infer table}${'' | `${SK["alias"]}${string}`}` ? Env[table & keyof Env] : never}
		>;


/* =========================================================================
   =  Alias checker
   ========================================================================= */

/**
AliasOrigin : {
	"alias" : "original key"
}

Aliases : {
	"original key" : "alias"
}
*/
type AliasOrigin<
	Obj extends Record<string, any>,

	SK extends SyntaxKeys = DefaultSyntaxKeys
> = {
	[K in keyof Obj as K extends `${string}${SK["alias"]}${infer A}` ? A : K] : K
}

type Aliases<
	Obj extends Record<string, any>,

	SK extends SyntaxKeys = DefaultSyntaxKeys
> = {
	[K in keyof Obj] : K extends `${string}${SK["alias"]}${infer A}` ? A : K
}

type AliasAreUnique<
	Obj extends Record<string, any>,

	SK extends SyntaxKeys = DefaultSyntaxKeys
> = {
	[K in keyof Obj] : AliasOrigin<Obj, SK>[Aliases<Obj, SK>[K] & keyof AliasOrigin<Obj, SK>] extends K ? never : K
}[keyof Obj] extends never ? true : false

export type JoinHasDuplicateAliases<
	Obj extends Record<string,any>,
	ExistingAliases extends string | never = never,

	SK extends SyntaxKeys = DefaultSyntaxKeys
> = (
		( AliasAreUnique<Obj, SK> extends true ? false : never) 									// Duplicate alias inside object Alias map {alias : original key} if an alias exists 2 times then one of the entry will extends union of original key
	|	( Aliases<Obj, SK>[keyof Obj] & ExistingAliases extends never ? false : never)		// Alias already existing
) extends false ?	false : never;




/* =========================================================================
   =  UTILS
   ========================================================================= */


export class JoinParser{
	idx: number = 1;

	values: any[] = [];

	from : string = "";

	readonly SK : SyntaxKeysConstant;

	readonly VALUE_REGEX : RegExp;
	readonly ARRAY_REGEX : RegExp;

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
		this.ARRAY_REGEX = new RegExp(
			String.raw`^(?<opl>(?:${
				[ this.SK['arrayLikeL'], this.SK['arraySoftLikeL'], this.SK['arrayDislikeL'], this.SK['arraySoftDislikeL'], this.SK['arrayRegexLikeL'], this.SK['arraySoftRegexLikeL'], this.SK['arrayEqualityL'], this.SK['arrayInequalityL'], this.SK['arraySoftSuperiorL'], this.SK['arraySoftInferiorL'], this.SK['arrayStrictSuperiorL'], this.SK['arrayStrictInferiorL']]
					.flatMap(v => Array.isArray(v) ? v : [v]).map(v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
			}))(?<name>.+)(?<opr>${
				[ this.SK['arrayLikeR'], this.SK['arraySoftLikeR'], this.SK['arrayDislikeR'], this.SK['arraySoftDislikeR'], this.SK['arrayRegexLikeR'], this.SK['arraySoftRegexLikeR'], this.SK['arrayEqualityR'], this.SK['arrayInequalityR'], this.SK['arraySoftSuperiorR'], this.SK['arraySoftInferiorR'], this.SK['arrayStrictSuperiorR'], this.SK['arrayStrictInferiorR']]
					.flatMap(v => Array.isArray(v) ? v : [v]).map(v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
			})$`);

	}


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
				return this.where += `( ${value.filter(v => v !== null).map(v => `${this.pushValue(v)} ${op} ALL(${name})`).join(' AND ')} ${value.includes(null) ? `AND ${name} IS NOT NULL ` : ''})`

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
	private parseArray(key : string, value : any){
		const match = key.match(this.ARRAY_REGEX);

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


}


// TODO IN CASE VALUE ?!
// Give 

function stringJoinToSQL(sk : SyntaxKeysConstant, target : string, value : string, alias? : string){
	if(alias && alias === '')
		alias = undefined;

	let res = `JOIN ${target}${!!alias && ' AS ' + alias}\n`;

	if(value.includes(sk.defaultJoin)){
		const [column, from] = value.split(sk.defaultJoin);
		return `LEFT ${res}`  + `\tON ${alias ? alias : target}.${column} = ${from} ,\n`;
	}
	else if(value.includes(sk.leftJoin)){
		const [column, from] = value.split(sk.leftJoin);
		return `LEFT ${res}` + `\tON ${alias ? alias : target}.${column} = ${from} ,\n`;
	}
	else if(value.includes(sk.fullJoin)){
		const [column, from] = value.split(sk.fullJoin);
		return `FULL ${res}` + `\tON ${alias ? alias : target}.${column} = ${from} ,\n`;
	}
	else if(value.includes(sk.rightJoin)){
		const [column, from] = value.split(sk.rightJoin);
		return `RIGHT ${res}` + `\tON ${alias ? alias : target}.${column} = ${from} ,\n`;
	}
	else if(value.includes(sk.innerJoin)){
		const [column, from] = value.split(sk.innerJoin);
		return `INNER ${res}` + `\tON ${alias ? alias : target}.${column} = ${from} ,\n`;
	}
	else '';
}

function objectJoinToSQL(sk : SyntaxKeysConstant, target : string, value : Obj, alias? : string){
	if(alias && alias === '')
		alias = undefined;

	let res = `JOIN ${target}${!!alias && ' AS ' + alias}\n`;

	if(value[sk.join] && value[sk.join] === 'left')
		res = 'LEFT ' + res;
	else if(value[sk.join] && value[sk.join] === 'inner')
		res = 'INNER ' + res;
	else if(value[sk.join] && value[sk.join] === 'full')
		res = 'FULL ' + res;
	else if(value[sk.join] && value[sk.join] === 'right')
		res = 'RIGHT ' + res;
	else
		res = 'LEFT ' + res;

	delete value[sk.join];

	if (Object.keys(value).length > 0)
		res += `\n\t ON `;

	const keyRgx = new RegExp(
			String.raw`^(?:(?<op>[^:]+):)?(?<name>.+)$`	// Match 'op:str' or 'str'
		, 'i');

	for(let key in value){
		const match = key.match(keyRgx);
		res += ` ${match?.groups?.name} ${match?.groups?.op ?? '='} ${value[key]}`;
	}

	return res += `,\n`;
}

export function joinToSQL(join : Obj | undefined, sk : SyntaxKeys){
	if(!join)
		return '';

	let res : string = '';

	for(let key in join){
		const [target, alias] = key.includes(sk.alias) ? key.split(sk.alias) : [key, undefined];

		if(typeof join[key] === "string")
			res += stringJoinToSQL(sk, target, join[key], alias);
		else
			res += objectJoinToSQL(sk, target, join[key], alias);
	}

	return res = res.slice(0, -2);
}




/* =========================================================================
   =  TESTs
   ========================================================================= */


type Table1 = {
	column1 : string;
	column2 : number;
	column3 : 'eee';
	column4 : Array<string>;
}

type Table2 = {
	column21 : number[];
	column22 : string;
	column23 : "bbb";
}

type Table3 = {
	column31 : Array<number>;
	column32 : Array<string>;
//	column33 : number;
}

type TestEnv = {
	table1 : Table1;
	table2 : Table2;
	table3 : Table3;
}

type AccEnv = {
	table1 : Table1;
}

const tgee : Simplify<JoinObjectValue<TestEnv, AccEnv, "table2">> = {
	"#": "INNER",
	column21 : col("table1.column2"),
}

const strTest : JoinStringValue<TestEnv, AccEnv, "table2"> = "column21 = table1.column2";

const jTest : Join<TestEnv, AccEnv, VerboseSyntaxKeys> = {
	"table2 AS eee": {
		JOIN : "FULL",
		"{column21} =": [4,4, col("table1.column2")]
	}
}

let t : AliasAreUnique<{
	"as AS eee" : 1,
	"a AS eee" : "str",
}, VerboseSyntaxKeys>

//let test : Exclude<keyof TestEnv, TablesWithType<TestEnv, string | boolean | number>> = 



// {
// 	"table2 AS eeefz" : "",
// 	"table2 AS efzez" : {
// 		"JOIN" : "full",
// 		column21 : 4,
// 		"column21 <=": [5, 6],
// 	}
// } as const;
