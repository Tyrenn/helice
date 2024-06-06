export interface QueryBuilder<Schema, Fields, Tablename>{
	quild() : { text : string, values : any[], nbvalues : number};
}


export type Obj = {
	[column: string]: any;
}




export type AllowedColumnTypes = null | number | string | boolean | null[] | number[] | string[] | boolean[]

export type Table = ({[key : string | number | symbol] :  AllowedColumnTypes } | {});
export type Environment = {[key : string] : Table};
export type FlattenedEnvironment = {[key : string] : any};
/****************
		UTILS
*****************/

/**
* Transform every non-array typed properties in array typed properties
**/
	type UnArraying<T> = (T extends (infer U)[] ? U : T);
	type Arraying<T> = Array<T extends (infer U)[] ? U : T>;
	type Arrayed<T> = UnArraying<T> | Arraying<T>;
	//type ObjectArrayed<T> = { [Prop in keyof T] : Arrayed<T[Prop]>;}

/**
 * Extract keys of type FV from an object
 */
	type KeysOfType<T, FV extends any> = {
		[k in keyof T] : T[k] extends FV ? k : never;
	}[keyof T];


/**
 * Get keys of FlattenEnvironment
 */
	type FlattenEnvironmentKeys<TE extends Partial<Environment>> = keyof {
		[Key in (keyof TE) as Key extends string ? `${Key}.${keyof TE[Key] extends string ? keyof TE[Key] : never}` : never] : string;
	}

/**
	{
		"table.prop" : type of prop
	}
 */
	type FlattenEnvironment<TE extends Partial<Environment>> = {
		[Key in FlattenEnvironmentKeys<TE>] : Key extends `${infer T}.${infer C}` ? (T extends keyof TE ? (C extends keyof TE[T] ? TE[T][C] : never) : never): never;
	}

	type FlattenEnvironmentExceptTable<TE extends  Partial<Environment>, ExceptTable extends string> = {
		[Key in FlattenEnvironmentKeys<TE> as Key extends `${infer T}.${string}` ? (T extends ExceptTable ? never : Key ) : never] : Key extends `${infer T}.${infer C}` ? (T extends keyof TE ? (C extends keyof TE[T] ? TE[T][C] : never) : never): never;
	}




/****************
		INSERT
*****************/

	type Defaulted<T> = {[Prop in keyof T] : T[Prop] | 'DEFAULT'};

	type Nulled<T> = {[Prop in keyof T] : T[Prop] | null};

	export type Insert<T> = Partial<Nulled<Defaulted<T>>> | Partial<Nulled<Defaulted<T>>>[];



/****************
		FIELD
*****************/

	/**

	FOR ONE TABLE :
		{
			column : alias,
			alias : ["column@alias", "column"]		// Build a json object
			alias : {										// Build a json object
				column : alias,
				...
			}
		} 
		|	["column@alias", "column"]
		|	"column"
		|	"column@alias"
		|	"*"

	FOR ONE ENVIRONMENT :
		{
			table.column : alias,
			alias : ["table.column@alias", "table.column"]
			alias : {
				table.column : alias
			}
		}
		| ["table.column@alias", "table.column"]
		| "table.column"
		| "table.column@alias"
		| "table.*"
		| "*"
	*/

	///
	// FIELD FROM TABLE
	///

		type TableFieldArray<T extends Table> = Array<keyof T | `${keyof T extends string ? keyof T : never}@${string}`>; 
		type TableFieldObjectType<T extends Table> = TableFieldObject<T> | TableFieldArray<T>;
		type TableFieldObject<T extends Table> =  { [k in string as k extends keyof T ? never : k]? : TableFieldObjectType<T> } | { [k in keyof T]? : string}
		export type TableField<T extends Table> = 
			'*'
			| TableFieldArray<T>
			| keyof T | `${keyof T extends string ? keyof T : never}@${string}`
			| TableFieldObject<T>

		// For environment, treat its flatten version as a table
		export type EnvironmentField<TE extends Partial<Environment>> = 
			`${keyof TE extends string ? keyof TE : never}.*`
			| TableField<FlattenEnvironment<TE>>


	///
	// TABLE FROM FIELD
	///

	// Get Table from ['column', 'column@alias'] ('column', 'alias')
	type TableFromFieldArray<T extends Table, TF extends TableField<T>> = TF extends Array<infer U> ? { 
			[k in U as k extends keyof T ? k : (keyof T extends string ? (k extends `${keyof T}@${infer alias}` ? alias : never) : never)] : k extends keyof T ? T[k] : (k extends `${infer tk}@${string}` ? (tk extends keyof T ? T[tk] : never) : never) 
		} : never;

	// Get Table from
	// {
	// 	column : alias,
	// 	alias : ["column@alias", "column"]		// Build a json object
	// 	alias : {										// Build a json object
	// 		column : alias,
	// 		...
	// 	}
	// } 
	type TableFromFieldObject<T extends Table, TF extends TableField<T>> = 	TF extends TableFieldObject<T> ? (
			{ [k in keyof TF as k extends keyof T ? (TF[k] extends string ? TF[k] : never) : never] : k extends keyof T ? T[k] : never} 	// 'column' : 'alias'
		& 	{ 
				[k in keyof TF as k extends keyof T ? never : k] : TF[k] extends Array<string> ? 
					TableFromFieldArray<T, TF[k]>																																// alias : ['column@alias', 'column']
					:
					TableFromFieldObject<T, TF[k]>																														// alias : {column : alias, ...}
			}
		) : never

	export type TableFromTableField<T extends Table, TF extends TableField<T>> = 
		(TF extends "*" ? T : never)																																					// '*'
		| TF extends keyof T ? { [k in TF as k extends string ? k : never] : TF extends keyof T ? T[TF] : never } : never									// 'column'
		| TF extends `${string}@${infer alias}` ? 																																// 'column@alias'
			{ [a in alias as a extends string ? a : never] : (TF extends `${infer k}@${string}` ? (k extends keyof T ? T[k] : never) : never) } 
			: never	
		| TableFromFieldArray<T, TF>
		| TableFromFieldObject<T, TF>

	export type TableFromEnvField<TE extends Partial<Environment>, TF extends EnvironmentField<TE>> = 
		(TF extends `${infer k}.*` ? (k extends keyof TE ? TE[k] : never) : never)
		| TableFromTableField<FlattenEnvironment<TE>, TF>

let t : TableFromEnvField<TM, EnvironmentField<TM>> = {};



function eeeeefzf(t : Table){
	return "aaa"
}

eeeeefzf(t);

type TM = {
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

let envfield : EnvironmentField<TM> = {
	"table1.a1" : "aaa",
	"ajeeh" : ["table1.a1@aajjaja", 'table4.a4']
};

let tablefield : TableField<TM["table1"]> = {
	'a1' : "column1",
	'b1' : "column2",
	'aaa' : ["a1@aajjaja", 'c1'],
	'bbbb' : {
		a1 : '444'
	}
}

let tablefromfield : TableFromTableField<TM["table1"], '*'>;

let envfromfield : TableFromEnvField<TM, {
	"table1.a1" : "aaa",
	"ajeeh" : ["table1.a1@aajjaja", 'table4.a4']
}> = {
	aaa : "aaazvav",
	ajeeh : {
		"table4.a4" : 4,
		aajjaja : "aaa"
	}
}





/****************
		ORDER BY
*****************/

/**
 * Transform every properties of an object to string if not object
 */
	export type OrderBy<T = any> = {
		[Prop in keyof T]? : "DESC" | "" | "ASC";
	}

	export type OrderByFromArray<T extends string[]> = {
		[Prop in T[number]]? : "DESC" | "" | "ASC" | undefined;
	}



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

{
	prop : [] | typeof prop
	"operator:prop" : [] | typeof
	prop : {
		_ : [] | '',
		otherthanprop :  [] | typeof
	}
}

{
	a : "a",
	b : [{
			_ : "b2",
			a : "a2",
		},
		{
			_ : "b1",
			a : "a1"
		},
		{
			_ : "b3",
			c : [{
				_ : "c1",
				d : "d1"
			},
			{
				_ : "c2",
				d : "d2"
			}
			]
		}
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

	type prefixedPropWhere<T, P extends string> = {
		[k in keyof T as k extends string ? `${P}${k}` : never]? : Arrayed<T[k] | null> |  TableWhere<T>[];//| amputedWhere<Where<T>, k> | amputedWhere<Where<T>, k>[];
	}

	type tsqueryWhere = {
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
	type propWhere<T> = {
		[k in keyof T]? : Arrayed<T[k] | null> | TableWhere<T>[];//| amputedWhere<Where<T>, k> | amputedWhere<Where<T>, k>[];
	}

	export type TableWhere<T> = 
		propWhere<T> &
		prefixedPropWhere<Pick<T, KeysOfType<Required<T>, Array<any>>>, `[${'' | '!' | '=' | '<>' | '!=' | '>' | '>=' | '<' | '<='}]:`> &
		prefixedPropWhere<Pick<T, KeysOfType<Required<T>, Array<string>>>, `[${'~~' | '~~*' | '!~~' | '!~~*'}]:`> &
		prefixedPropWhere<Omit<T, KeysOfType<Required<T>, Array<any>>>, `${'=' | '<>' | '!=' | '>' | '>=' | '<' | '<='}:`> &
		prefixedPropWhere<Pick<T, KeysOfType<Required<T>, string>>, `${'~~' | '~~*' | '!~~' | '!~~*'}:`> &
		aaPropWhere<Pick<T, KeysOfType<Required<T>, Array<string>>>> &
		{ [k in `&&${string}`]? : TableWhere<T>[]}


	export type EnvironmentWhere<T> = { [k in keyof T ]? : TableWhere<T[k]>} & {[k in `&&${string}`]? : EnvironmentWhere<T>[]};




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







export interface Query<GlobalEnv extends Environment, AccessibleEnv extends Environment, TableResult extends Table = {}>{}


// Ajouter une étape : s'il extends string ajout d'un point... ?

/*
	Hacky things from 
	https://stackoverflow.com/questions/52855145/typescript-object-type-to-array-type-tuple 
	https://stackoverflow.com/questions/55127004/how-to-transform-union-type-to-tuple-type/55128956#55128956
*/
type UnionToIntersection<U> =
	(U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never
type LastOf<T> =
	UnionToIntersection<T extends any ? () => T : never> extends () => (infer R) ? R : never

// TS4.0+
type Push<T extends any[], V> = [...T, V];

// TS4.1+
type TuplifyUnion<T, L = LastOf<T>, N = [T] extends [never] ? true : false> =
	true extends N ? [] : Push<TuplifyUnion<Exclude<T, L>>, L>

type ObjValueTuple<T, KS extends any[] = TuplifyUnion<keyof T>, R extends any[] = []> =
	KS extends [infer K, ...infer KT]
	? ObjValueTuple<T, KT, [...R, T[K & keyof T]]>
	: R