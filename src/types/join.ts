import {Environment, FlattenEnvironmentExceptTable, FlattenedEnvironment} from "./common";

/****************
		JOIN
*****************/

/**
	Environment : {
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

	Join<Environment>
	{
		"f:table1" : "a1/table2.a2",
		"i:table2" : "b2/table1.b1"
	}
 */

	//	JoinCandidateColumns<Env, number> gives : table1.b1 | table2.b2
	type JoinCandidateColumns<FTM extends FlattenedEnvironment, ColumnType extends string | number> = keyof {
		[k in keyof FTM as FTM[k] extends ColumnType ? k : never] : any;
	}

	// 
	type MultipleColumnsJoints<TE extends Environment, Table extends keyof TE & string> = {
		[Key in keyof TE[Table]]? : (TE[Table][Key] extends string | number ? JoinCandidateColumns<FlattenEnvironmentExceptTable<TE, Table>, TE[Table][Key]> : never)
	}

	type OneColumnJoints<TE extends Environment, Table extends keyof TE & string> = keyof {
		[Key in keyof TE[Table] as Key extends string ? 
			(TE[Table][Key] extends string | number ? 
				`${Key}/${JoinCandidateColumns<FlattenEnvironmentExceptTable<TE, Table>, TE[Table][Key]> extends string ? JoinCandidateColumns<FlattenEnvironmentExceptTable<TE, Table>, TE[Table][Key]> : never}`
				: never
			) : never]? : any
	}


	export type Join<TE extends Environment> = {
		[Key in keyof TE as Key extends string ? `${'' | 'r:' | 'i:' | 'l:' | 'f:'}${Key}${'' | `@${string}`}` : never]? : Key extends string ? OneColumnJoints<TE, Key> | MultipleColumnsJoints<TE, Key> : never;
	}

	export type JoinExceptTables<TE extends Environment, Tables extends keyof TE | undefined = undefined> = {
		[Key in keyof TE as Key extends Tables ? never : (Key extends string ? `${'' | 'r:' | 'i:' | 'l:' | 'f:'}${Key}${'' | `@${string}`}` : never)]? : Key extends string ? OneColumnJoints<TE, Key> | MultipleColumnsJoints<TE, Key> : never;
	}

	export type ExtractAccessibleTableNamesFromJoin<EJ extends {[k : string | symbol] : any}> = 
		keyof { [Key in keyof EJ as Key extends `${string}:${infer T}@${string}` ? T : never] : any }
		|
		keyof { [Key in keyof EJ as Key extends `${string}:${string}@${string}` ? never : (Key extends `${infer T}@${string}` ? T : never)] : any }
		|
		keyof { [Key in keyof EJ as Key extends `${string}:${string}@${string}` |  `${string}@${string}` ? never : (Key extends `${string}:${infer T}` ? T : never)] : any }
		|
		keyof { [Key in keyof EJ as Key extends `${string}:${string}@${string}` |  `${string}@${string}` | `${string}:${string}` ? never : (Key extends `${infer T}` ? T : never)] : any }

	export type EnvironmentFromNameAndJoin<E extends Environment, N extends keyof E, EJ extends {[k : string | symbol] : any}> = {[key in N] : E[key]} & Pick<E, ExtractAccessibleTableNamesFromJoin<EJ>>;

	export type EnvironmentFromJoin<GlobalEnv extends Environment, AccEnv extends Environment, J extends Join<GlobalEnv>> = AccEnv & Pick<GlobalEnv, ExtractAccessibleTableNamesFromJoin<J>>
