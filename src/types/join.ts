import { Environment, FlatEnv, KeysOfType, Simplify, StrKeys, Table} from "./common";

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
		&	{ [k in StrKeys<Env[TargetTable]> as Env[TargetTable][k] extends (string | number | boolean) ? `${'' | '<:' | '>:' | '<=:' | '>=:' | '<>:' | '!=:'}${k}` : never]? : CandidateColumns<Env, AccessibleTables, TargetTable, k> | (Env[TargetTable][k] extends string ? `'${string}'` : Env[TargetTable][k]) | null}
		&	{ [k in StrKeys<Env[TargetTable]> as Env[TargetTable][k] extends (string) ? `${'~~' | '~~*' | '!~~' | '!~~*' | '~' | '~*'}:${k}` : never]? : CandidateColumns<Env, AccessibleTables, TargetTable, k> | `'${string}'` | null}



/* =========================================================================
   =  Final Type
   ========================================================================= */

	export type Join<
		Env extends Environment,
		AccEnv extends Environment,
	> = 
		{
			[table in StrKeys<Env> as `${table}${'' | `@${string}`}`]? : JoinStringValue<Env, StrKeys<AccEnv>, table> | JoinObjectValue<Env, StrKeys<AccEnv>, table>
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

let test : Join<{
		table1 : {
			a1 : string;
			b1 : number;
			c1 : number[];
		},
		table2 : {
			a2 : string;
			b2 : number;
		}
	}, {
		table2 : {
			a2 : string;
			b2 : number;
		}
	}> = {
		table1 : {
			a1 : "table2.a2",
			b1 : 5
		},
		"table2@aa" : "ee fzefezf zfzef"
	};

let rest : EnvironmentFromJoin<
{
	table1 : {
		a1 : string;
		b1 : number;
		c1 : number[];
	},
	table2 : {
		a2 : string;
		b2 : number;
	}
}, 
{
	table2 : {
		a2 : string;
		b2 : number;
	}
},
{
	"table1@eee" : {
		a1 : "table2.a2",
		b1 : 5
	},
}
>;



	//	JoinCandidateColumns<Env, number> gives : table1.b1 | table2.b2
	// type JoinCandidateColumns<FTM extends FlatEnvironment, ColumnType extends string | number> = keyof {
	// 	[k in keyof FTM as FTM[k] extends ColumnType ? k : never] : any;
	// }

	// // 
	// type MultipleColumnsJoints<TE extends Environment, Table extends keyof TE & string> = {
	// 	[Key in keyof TE[Table]]? : (TE[Table][Key] extends string | number ? JoinCandidateColumns<FlatEnvButTable<TE, Table>, TE[Table][Key]> : never)
	// }

	// type OneColumnJoints<TE extends Environment, Table extends keyof TE & string> = keyof {
	// 	[Key in keyof TE[Table] as Key extends string ? 
	// 		(TE[Table][Key] extends string | number ? 
	// 			`${Key}/${JoinCandidateColumns<FlatEnvButTable<TE, Table>, TE[Table][Key]> extends string ? JoinCandidateColumns<FlatEnvButTable<TE, Table>, TE[Table][Key]> : never}`
	// 			: never
	// 		) : never]? : any
	// }


	// export type JoinOld<TE extends Environment> = {
	// 	[Key in keyof TE as Key extends string ? `${'' | 'r:' | 'i:' | 'l:' | 'f:'}${Key}${'' | `@${string}`}` : never]? : Key extends string ? OneColumnJoints<TE, Key> | MultipleColumnsJoints<TE, Key> : never;
	// }

	// export type JoinExceptTables<TE extends Environment, Tables extends keyof TE | undefined = undefined> = {
	// 	[Key in keyof TE as Key extends Tables ? never : (Key extends string ? `${'' | 'r:' | 'i:' | 'l:' | 'f:'}${Key}${'' | `@${string}`}` : never)]? : Key extends string ? OneColumnJoints<TE, Key> | MultipleColumnsJoints<TE, Key> : never;
	// }

	// export type ExtractAccessibleTableNamesFromJoin<EJ extends {[k : string | symbol] : any}> = 
	// 	keyof { [Key in keyof EJ as Key extends `${string}:${infer T}@${string}` ? T : never] : any }
	// 	|
	// 	keyof { [Key in keyof EJ as Key extends `${string}:${string}@${string}` ? never : (Key extends `${infer T}@${string}` ? T : never)] : any }
	// 	|
	// 	keyof { [Key in keyof EJ as Key extends `${string}:${string}@${string}` |  `${string}@${string}` ? never : (Key extends `${string}:${infer T}` ? T : never)] : any }
	// 	|
	// 	keyof { [Key in keyof EJ as Key extends `${string}:${string}@${string}` |  `${string}@${string}` | `${string}:${string}` ? never : (Key extends `${infer T}` ? T : never)] : any }

	// export type EnvironmentFromNameAndJoin<E extends Environment, N extends keyof E, EJ extends {[k : string | symbol] : any}> = {[key in N] : E[key]} & Pick<E, ExtractAccessibleTableNamesFromJoin<EJ>>;

	// export type EnvironmentFromJoin<GlobalEnv extends Environment, AccEnv extends Environment, J extends Join<GlobalEnv>> = AccEnv & Pick<GlobalEnv, ExtractAccessibleTableNamesFromJoin<J>>




