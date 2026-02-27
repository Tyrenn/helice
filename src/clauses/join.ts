import { col, Environment, FlatEnv, KeysNotOfType, KeysOfType, Obj, Prettify, Simplify, StrKeys, Table, TablesWithoutType, TablesWithType} from "../types";
import { DefaultSyntaxKeys, SKArrayCompareOPL, SKArrayCompareOPR, SKArrayEqualityOPL, SKArrayEqualityOPR, SKArrayLikeOPL, SKArrayLikeOPR, SKCompareOPL, SKCompareOPR, SKEqualityOPL, SKEqualityOPR, SKLikeOPL, SKLikeOPR, SyntaxKeys, SyntaxKeysConstant, VerboseSyntaxKeys } from "../syntaxkeys";
import { KeysOfArray, KeysOfNonArray, KeysOfNumber, KeysOfNumberArray, KeysOfString, KeysOfStringArray, WrapKeyArrayedValue, WrapKeyNoArrayValue } from "./common";

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
	// TODO Add the possibility to join from string column to string[] (ANY operation)
	// TODO Add the possibility to join from number column to number[] (ANY operation)
	// TODO Add AND ?

// TODO USE GRAMMAR TO REBUILD ALMOST SAME THAN WHERE

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
		& 	WrapKeyArrayedValue<T, KeysOfNonArray<T>, A, SKEqualityOPL<SK>, SKEqualityOPR<SK>>									// =, !=
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
	column21 : number;
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
	"table2": {
		JOIN : "FULL"

	}
}

//let test : Exclude<keyof TestEnv, TablesWithType<TestEnv, string | boolean | number>> = 



// {
// 	"table2 AS eeefz" : "",
// 	"table2 AS efzez" : {
// 		"JOIN" : "full",
// 		column21 : 4,
// 		"column21 <=": [5, 6],
// 	}
// } as const;
