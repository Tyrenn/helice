export interface QueryBuilder<Schema, Fields, Tablename>{
	quild() : { text : string, values : any[], nbvalues : number};
}


export type Obj = {
	[column: string]: any;
}



/**
* Transform every none array properties in possible array
**/

export type Table = {[key : string] : any};
export type Environment = {[key : string] : Table};
export type FlattenedEnvironment = {[key : string] : any};


/****************
		UTILS
*****************/

	type UnArraying<T> = (T extends (infer U)[] ? U : T);
	type Arraying<T> = Array<T extends (infer U)[] ? U : T>;
	type Arrayed<T> = UnArraying<T> | Arraying<T>;
	//type ObjectArrayed<T> = { [Prop in keyof T] : Arrayed<T[Prop]>;}

	type KeysOfType<T, FV extends any> = {
		[k in keyof T] : T[k] extends FV ? k : never;
	}[keyof T];

	type FlattenEnvironmentsKeys<TE extends Environment> = keyof {
		[Key in (keyof TE) as Key extends string ? `${Key}.${keyof TE[Key] extends string ? keyof TE[Key] : never}` : never] : string;
	}

/**
	{
		"table.prop" : type of prop
	}
 */
	type FlattenEnvironment<TE extends Environment> = {
		[Key in FlattenEnvironmentsKeys<TE>] : Key extends `${infer T}.${infer C}` ? TE[T][C] : never;
	}

	type FlattenEnvironmentExceptTable<TE extends Environment, ExceptTable extends string> = {
		[Key in FlattenEnvironmentsKeys<TE> as Key extends `${infer T}.${string}` ? (T extends ExceptTable ? never : Key ) : never] : Key extends `${infer T}.${infer C}` ? TE[T][C] : never;
	}

	type FlattenEnvironmentOnlyTable<TE extends Environment, OnlyTable extends string> = {
		[Key in FlattenEnvironmentsKeys<TE> as Key extends `${infer T}.${string}` ? (T extends OnlyTable ? Key : never ) : never] : Key extends `${infer T}.${infer C}` ? TE[T][C] : never;
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
	{
		alias : column,
		alias : {						// Build a json object
			alias : column,
			alias : column,
			alias : column
		} 
		agg:column@alias : {			// Build a json object and agg over column
			alias : column
			alias : column
			alias : column
		} 
		agg:column@alias : column
	}
	
	||

	["column@alias", "column"]

	||

	"column"

	||

	*
*/

type TableFieldObject<T extends Table> =  (
		{ [k in keyof T]? : string }
		&
		{ [k in keyof T as k extends string ? `agg:${k}` | `agg:${k}@${string}` : never]? : TableFieldObject<T> | Array<keyof T | `${keyof T extends string ? keyof T : never}@${string}` | TableFieldObject<T>>}
	)

type TableField<T extends Table> = 
	'*'
	| keyof T
	| `${keyof T extends string ? keyof T : never}@${string}`
	| TableFieldObject<T>
	| Array<keyof T | `${keyof T extends string ? keyof T : never}@${string}` | TableFieldObject<T>>

// export type TableField<T extends Table> = 
// 	'*'
// 	| Array<keyof T> 
// 	| Array<`${keyof T extends string ? keyof T : never}@${string}`> 
// 	| keyof T
// 	| `${keyof T extends string ? keyof T : never}@${string}`
// 	| (
// 		{ [k in string] : k extends `${string}@${string}` | `${string}:${string}` ? never : keyof T }
// 		&
// 		{ [k in keyof T as k extends string ? `agg:${k}` | `agg:${k}@${string}` : never] : {[k : string] : keyof T}}
// 		)


export type Field<TE extends Environment> = 
	'*' 
	| Array<FlattenEnvironmentsKeys<TE> | `${FlattenEnvironmentsKeys<TE>}@${string}`>
	| `${FlattenEnvironmentsKeys<TE>}@${string}`
	| FlattenEnvironmentsKeys<TE>
	| 
	(
		{ [k in string] : (k extends `${string}@${string}` | `${string}:${string}` ? never : FlattenEnvironmentsKeys<TE>) | { [k in string] : FlattenEnvironmentsKeys<TE>}}
		&
		{ [k in FlattenEnvironmentsKeys<TE> as k extends string ? `agg:${FlattenEnvironmentsKeys<TE>}` | `agg:${FlattenEnvironmentsKeys<TE>}@${string}` : never]? : FlattenEnvironmentsKeys<TE> | { [k in string] : FlattenEnvironmentsKeys<TE>}}
	)

/// ERROR agg:${} pas string mais column !


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

	let t : TableField<TM["table1"]> = {
		c1 : 'c1',
		"agg:b1" : ["a1", "c1"]
	}

/**
* Type to check if duplicate
if has => t.column
if not column

object normal need to 
*/

export type TableFromField<TE extends Environment, EF extends Field<TE>> = EF extends '*' ? keyof : (
{
	[Key in keyof EF as Key extends `${infer Alias}@${string}`? Alias : never] : 'ok';
})

// type NoAliasColumnSelect<T extends Table> = {
// 	'!@' : Array<keyof T>;
// }

// type AliasColumnSelect<T extends Table> = {
// 	keyof : keyof T;
// }

// type JSONObjectSelect<T extends Table> = {
// 	[k in keyof T as k extends string ? `json:${k}@${string}` : neve] : NoAliasColumnSelect<T> & (AliasColumnSelect<T> | JSONObjectSelect<T>);
// }

// type SelectNoAgg<T extends Table> = Array<keyof T> | '*' | keyof T | (NoAliasColumnSelect<T> & (AliasColumnSelect<T> | JSONObjectSelect<T>));

// type JAggSelect<T extends Table> = {
// 	[k in keyof T as k extends string ? `jagg:${k}@${string}` : never]? : SelectNoAgg<T>;
// }

// export type Select<T extends Table> = string[] | (NoAliasColumnSelect<T> & JAggSelect<T> & (AliasColumnSelect<T> | JSONObjectSelect<T>));

// export type EnvironmentSelect<TE extends Environment> = {
// 	[k in keyof TE]? : Select<TE[k]>
// }




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

*/

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


	export type Where<T> = { [k in keyof T ]? : TableWhere<T[k]>} & {[k in `&&${string}`]? : Where<T>[]};







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



	type MultipleColumnsJoints<TE extends Environment, Table extends keyof TE & string> = {
		[Key in keyof TE[Table]]? : JoinCandidateColumns<FlattenEnvironmentExceptTable<TE, Table>, TE[Table][Key]>
	}

	type OneColumnJoints<TE extends Environment, Table extends keyof TE & string> = keyof {
		[Key in keyof TE[Table] as Key extends string ? `${Key}/${JoinCandidateColumns<FlattenEnvironmentExceptTable<TE, Table>, TE[Table][Key]> extends string ? JoinCandidateColumns<FlattenEnvironmentExceptTable<TE, Table>, TE[Table][Key]> : never}` : never]? : any
	}


	export type Join<TE extends Environment> = {
		[Key in keyof TE as Key extends string ? `${'' | 'r:' | 'i:' | 'l:' | 'f:'}${Key}${'' | `@${string}`}` : never]? : Key extends string ? OneColumnJoints<TE, Key> | MultipleColumnsJoints<TE, Key> : never;
	}

	export type JoinExceptTables<TE extends Environment, Tables extends keyof (TE & string) | undefined = undefined> = {
		[Key in keyof TE as Key extends Tables ? never : (Key extends string ? `${'' | 'r:' | 'i:' | 'l:' | 'f:'}${Key}${'' | `@${string}`}` : never)]? : Key extends string ? OneColumnJoints<TE, Key> | MultipleColumnsJoints<TE, Key> : never;
	}

	export type ExtractTableFromJoin<EJ extends {[k : string | symbol] : any}> = 
		keyof { [Key in keyof EJ as Key extends `${string}:${infer T}@${string}` ? T : never] : any }
		|
		keyof { [Key in keyof EJ as Key extends `${string}:${string}@${string}` ? never : (Key extends `${infer T}@${string}` ? T : never)] : any }
		|
		keyof { [Key in keyof EJ as Key extends `${string}:${string}@${string}` |  `${string}@${string}` ? never : (Key extends `${string}:${infer T}` ? T : never)] : any }
		|
		keyof { [Key in keyof EJ as Key extends `${string}:${string}@${string}` |  `${string}@${string}` | `${string}:${string}` ? never : (Key extends `${infer T}` ? T : never)] : any }






/****************
		QUERIES
*****************/

export type SelectQueryFunction<T extends Table> = <R extends Partial<T>>(where: TableWhere<T> | TableWhere<T>[], select?: TableField<T> | '*', limit?: number, offset?: number, orderby?: OrderBy<T>) => Promise<QueryResult<R>>;
export type InsertQueryFunction<T extends Table> = <R extends Partial<T>>(data: Insert<T>, returning?: TableField<T> | '*') => Promise<QueryResult<R>>;
export type ExistsQueryFunction<T extends Table> = (where: TableWhere<T> | TableWhere<T>[], nb? : number) => Promise<boolean>;
export type UpdateQueryFunction<T extends Table> = <R extends Partial<T>>(where : TableWhere<T> | TableWhere<T>[], data : {[Prop in keyof T]? : T[Prop] | null}, returning? : TableField<T> | '*') => Promise<QueryResult<R>>;
export type DeleteQueryFunction<T extends Table> = <R extends Partial<T>>(where : TableWhere<T> | TableWhere<T>[], returning? : TableField<T> | '*') => Promise<QueryResult<R>>;


// Flatten



type Table1 = {
	column1 : string;
	column2 : number;
	column3 : number;
	column4 : string[];
	column5 : 'EEE';
	column6 : boolean;
}

let teeez : TableField<Table1> = {
	'aaa' : "column1",
	'bbbaaje:eee' : "column2",
}

interface Table2{
	column21 : number;
	column22 : string;
	column23 : 'EEE';
}

interface Table3{
	column31 : Array<number>;
	column32 : Array<string>;
	column33 : 'EEE';
}

type testenv = {
	table1 : Table1;
	table2 : Table2;
	table3 : Table3;
}

type testaccenv = {
	table1 : Table1;
}

type j = {'table1.column1' : 'table2.column22', 'table1.column2' : 'table2.column21'}

type alias = {
	alias1 : "table1";
}




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



export interface Querier{
	query : <R extends QueryResultRow>(text: string | QueryConfig, values?: any[]) => Promise<QueryResult<R>>
}



export interface QueryConfig<I extends any[] = any[]> {
	name?: string | undefined;
	text: string;
	values?: I | undefined;
}

export interface QueryResultRow {
	[column: string]: any;
}

export interface QueryResult<R extends QueryResultRow = any> {
	rows: R[];
	rowCount: number;
}

// Should where with an environment be with multiple joins ? Or not...
// Should be multiple properties ?