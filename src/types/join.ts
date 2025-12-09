import { Environment, FlatEnv, KeysOfType, Prettify, Simplify, StrKeys, Table, TablesWithType} from "./common";

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
		"table2@alias4" : {							// More complex joins are possible with join over multiple columns, similar to WHERE API
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
		...
		"i:tableX" : BaseJoinValue
	*/
	
	// CandidateColumns gives all accessible possible column candidate for a join on TargetTable.Column
	type CandidateColumns<Env extends Environment, AccessibleTables extends string, TargetTable extends string, Column extends StrKeys<Env[TargetTable]>> = KeysOfType<FlatEnv<Pick<Env, AccessibleTables>>, Env[TargetTable][Column] & (string | number | boolean)>;

	type JoinStringValue<Env extends Environment, AccessibleTables extends string, TargetTable extends string> = 
		{[k in StrKeys<Env[TargetTable]>] : Env[TargetTable][k] extends string | number | boolean ? `${k} ${'' | 'i' | 'l' | 'r' | 'f'}# ${CandidateColumns<Env, AccessibleTables, TargetTable, k> & string}` : never}[StrKeys<Env[TargetTable]>]




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
	type JoinObjectValue<
		Env extends Environment, 
		AccessibleTables extends string,
		TargetTable extends string
	> = 
			{ "#"? : "inner" | "left" | "right" | "full"}
		&	{ [k in StrKeys<Env[TargetTable]> as Env[TargetTable][k] extends (string | number | boolean) ? `${'' | '<:' | '>:' | '<=:' | '>=:' | '<>:' | '!=:'}${k}` : never]? : CandidateColumns<Env, AccessibleTables, TargetTable, k> | (Env[TargetTable][k] extends string ? `'${string}'` : Env[TargetTable][k]) | null }
		&	{ [k in StrKeys<Env[TargetTable]> as Env[TargetTable][k] extends (string) ? `${'~~' | '~~*' | '!~~' | '!~~*' | '~' | '~*'}:${k}` : never]? : CandidateColumns<Env, AccessibleTables, TargetTable, k> | `'${string}'` | null}


/* =========================================================================
   =  Final Type
   ========================================================================= */

	export type Join<
		Env extends Environment,
		AccEnv extends Environment,
	> = 
		{
			[table in Extract<TablesWithType<Env, (string | number | boolean)>, string> as `${table}${'' | `@${string}`}`]? : JoinStringValue<Env, StrKeys<AccEnv>, table> | JoinObjectValue<Env, StrKeys<AccEnv>, table>
		}

	export type EnvironmentFromJoin<
		Env extends Environment,
		AccEnv extends Environment,
		J extends Join<Env, AccEnv>
	> = 
		Simplify<
				AccEnv 
			&	{ [k in StrKeys<J> as k extends `${infer table}` ? (table extends `${string}@${infer alias}` ? alias : table) : never] : k extends `${infer table}${'' | `@${string}`}` ? Env[table & keyof Env] : never}
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
type AliasOrigin<Obj extends Record<string, any>> = {
	[K in keyof Obj as K extends `${string}@${infer A}` ? A : K] : K
}

type Aliases<Obj extends Record<string, any>> = {
	[K in keyof Obj] : K extends `${string}@${infer A}` ? A : K
}

type AliasAreUnique<Obj extends Record<string, any>> = {
	[K in keyof Obj] : AliasOrigin<Obj>[Aliases<Obj>[K] & keyof AliasOrigin<Obj>] extends K ? never : K
}[keyof Obj] extends never ? true : false


export type JoinHasDuplicateAliases<Obj extends Record<string,any>, ExistingAliases extends string | never = never> = 
	(		( AliasAreUnique<Obj> extends true ? false : true) 								// Duplicate alias inside object Alias map {alias : original key} if an alias exists 2 times then one of the entry will extends union of original key  
		|	( Aliases<Obj>[keyof Obj] & ExistingAliases extends never ? false : true)	// Alias already existing
	) extends false ?	false : "[WARNING] Duplicated table aliases";


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
}

type TestEnv = {
	table1 : Table1;
	table2 : Table2;
	table3 : Table3;
}

const jTest : Join<TestEnv, Pick<TestEnv, "table1">> = {
	table2 : "column21 # table1.column2",
	"table2@second" : {
		column22 : "table1.column3"
	}
} as const;


