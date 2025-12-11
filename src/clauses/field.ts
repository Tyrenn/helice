import { FlatEnvKeys, Simplify, FlatEnv, StrKeys, Environment } from "../types";
import { SyntaxKeys, DefaultSyntaxKeys } from "../syntaxkeys.js";

/**=========================================================================
   =  Documentation
   =========================================================================

Field defines which column are selected or returned, in which form and which alias
It can have several values :
```
'*' 														// everything 

'table1.*' 												// everything from a table

'table1.column1' 										// one column

'table1.column1@c11' 								// one aliased column

['table1.column1@c11', 'table2.column2'] 		// multiple columns aliased or not

{...} // An object 
```

The field as an object is most complete and powerful form : 

```
{
	"table1.column1" : true, 						// You can select a column simply this way
	"table1.column2" : "c12", 						// Or give it an alias
	"{}:alias1" : {									// Build Json object
		"table1.column1" : true,
		"table1.column2" : "c12"
	},
	"[]:alias2" : {									// Aggregate a column over one column 
		group : "table1.column3",
		value : "table2.column2"
	},		
	"[]:alias3" : {									// Aggregate an object over 2 columns
		groyp : ["table1.column1", "table1.column2"] 
		value : {
			"table1.column1" : true,
			"table1.column2" : "c112"
		}
	},
	"sql:alias4" : "COALESCE(table1.column1, "")"	// A raw sql statement
}
```

The raw sql statement must be a string but can be the result of a function ! As such you can use makeSafeSQL<Environment>() utility to get a function that will prevent you to use unknown column in your SQL statement

*****************/


/* =========================================================================
   =  Grammar
   ========================================================================= */


	/**
		------------------ STRING FORM ----------------------
	
	  - '*' 
	  - 'table.*'
	  - 'table.col'  (or 'col' if From provided and you used simple key)
	  - 'table.col@alias'
	*/
	type PointToUnderscore<k> = k extends `${infer table}.${infer column}` ? `${table}_${column}` : k

	// Field string form
	type FieldStringForm<
		Env extends Environment,
		OnlyOneTable extends keyof Env | undefined = undefined,

		SK extends SyntaxKeys = DefaultSyntaxKeys ,
	> =
			'*'
		| 	`${StrKeys<Env>}.*`
		| 	FlatEnvKeys<Env, OnlyOneTable>
		| 	`${Extract<FlatEnvKeys<Env, OnlyOneTable>, string>}${SK["alias"]}${string}`;

	// Table from field string form
	type TableFromFieldAsString<
		Env extends Environment,
		F extends string,
		OnlyOneTable extends keyof Env | undefined = undefined,

		SK extends SyntaxKeys = DefaultSyntaxKeys ,
	> = 
		F extends '*' ? {[K in FlatEnvKeys<Env, OnlyOneTable>] : FlatEnv<Env, OnlyOneTable>[K]} : 
			(F extends `${infer EnvKey}.*` ? {[K in keyof Env[EnvKey] as K extends string ? `${EnvKey}_${K}` : never] : Env[EnvKey][K]} :
				(F extends `${string}${SK["alias"]}${infer alias}` ? { [a in alias as a extends string ? a : never] : (F extends `${infer k}${SK["alias"]}${string}` ? (k extends FlatEnvKeys<Env, OnlyOneTable> ? FlatEnv<Env, OnlyOneTable>[k] : never) : never) } : 
					(F extends FlatEnvKeys<Env, OnlyOneTable> ? {[f in F as PointToUnderscore<f>] : FlatEnv<Env, OnlyOneTable>[f]} : never)
				)
			);




	/** 
		------------------ ARRAY FORM ----------------------
		["table.col", "table.*", "table.col@alias"]
	*/

	// Field array form
	type FieldArrayForm<
		Env extends Environment,
		OnlyOneTable extends keyof Env | undefined = undefined,

		SK extends SyntaxKeys = DefaultSyntaxKeys ,
	> = 
		Array<
				`${StrKeys<Env>}.*` 
			| 	FlatEnvKeys<Env, OnlyOneTable> 
			| 	`${Extract<FlatEnvKeys<Env, OnlyOneTable>, string>}${SK["alias"]}${string}`
		>;


	// Table from field array form
	type TableFromFieldAsArray<
		Env extends Environment,
		F extends Array<string>,
		OnlyOneTable extends keyof Env | undefined = undefined,

		SK extends SyntaxKeys = DefaultSyntaxKeys ,
	> = 
		F extends [infer E extends string, ...(infer R extends Array<string>)] ? (TableFromFieldAsString<Env, E, OnlyOneTable, SK> & TableFromFieldAsArray<Env, R, OnlyOneTable, SK>) : {};



	/** 
		------------------ Object FORM ----------------------
	{
		"table1.column1" : true, 			// You can select a column simply this way
		"table1.column2" : "c12", 			// Or give it an alias
		"{}:alias1" : {							// Build Json object
			"table1.column1" : true,
			"table1.column2" : "c12"
		},
		"[]:alias2" : {						// Aggregate a column over one column 
			group : "table1.column3",
			value : "table2.column2"
		},		
		"[]:alias3" : {						// Aggregate an object over 2 columns
			groyp : ["table1.column1", "table1.column2"] 
			value : {
				"table1.column1" : true,
				"table1.column2" : "c112"
			}
		},
		"sql:alias4" : "COALESCE(table1.column1, "")"	// A raw sql statement
	}
	*/
	type AggregateFieldObjectFormValue<
		Env extends Environment,
		OnlyOneTable extends keyof Env | undefined = undefined,
		
		SK extends SyntaxKeys = DefaultSyntaxKeys 
	> = {
		group: FlatEnvKeys<Env, OnlyOneTable> | Array<FlatEnvKeys<Env, OnlyOneTable>>;
		value: FlatEnvKeys<Env, OnlyOneTable> | FieldObjectForm<Env, OnlyOneTable, SK>;	  // value can be a single column (flat key) OR a nested FieldObject describing an object
	};

	// Field object form
	type FieldObjectForm<
		Env extends Environment,
		OnlyOneTable extends keyof Env | undefined = undefined,

		SK extends SyntaxKeys = DefaultSyntaxKeys 
	> = 
			{ [K in FlatEnvKeys<Env, OnlyOneTable>]? : true | string;}
		|	{ [K in `${SK["aggregation"]}:${string}`]? : AggregateFieldObjectFormValue<Env, OnlyOneTable, SK> }
		|	{ [K in `${SK["json"]}:${string}`]? : FieldObjectForm<Env, OnlyOneTable, SK> }
		| 	{ [K in `${SK["raw"]}:${string}`]? : string}

	// Table from field object form
	type TableFromFieldAsObject<
		Env extends Environment,
		F extends Record<string, any>,
		OnlyOneTable extends keyof Env | undefined = undefined,

		SK extends SyntaxKeys = DefaultSyntaxKeys 
	> = 
			{ [k in keyof F as k extends FlatEnvKeys<Env, OnlyOneTable> ? (F[k] extends string ? F[k] : PointToUnderscore<k>) : never] : FlatEnv<Env, OnlyOneTable>[k & keyof FlatEnv<Env, OnlyOneTable>]}
		&	{ [k in keyof F as k extends `${SK["aggregation"]}:${infer alias}` ? alias : never] : F[k] extends {value : infer A} ? Array<A extends FlatEnvKeys<Env, OnlyOneTable> ? FlatEnv<Env, OnlyOneTable>[A] : TableFromFieldAsObject<Env, A & Record<string, any>, OnlyOneTable, SK>> : never}
		&	{ [k in keyof F as k extends `${SK["json"]}:${infer alias}` ? alias : never] : TableFromFieldAsObject<Env, F[k] & Record<string, any>, OnlyOneTable, SK>}
		&	{ [k in keyof F as k extends `${SK["raw"]}:${infer alias}` ? alias : never] : any}




/* =========================================================================
   =  FINAL TYPES
   ========================================================================= */


	export type Field<
		Env extends Environment,
		OnlyOneTable extends keyof Env | undefined = undefined,

		SK extends SyntaxKeys = DefaultSyntaxKeys 
	> =
		FieldStringForm<Env, OnlyOneTable, SK>
		| FieldArrayForm<Env, OnlyOneTable, SK>
		| FieldObjectForm<Env, OnlyOneTable, SK>;


	export type TableFromField<
		Env extends Environment,
		F extends Field<Env, OnlyOneTable, SK>,
		OnlyOneTable extends keyof Env | undefined = undefined,

		SK extends SyntaxKeys = DefaultSyntaxKeys 
	> = Simplify<
		F extends string ? TableFromFieldAsString<Env, F, OnlyOneTable, SK> :
			(	F extends Array<string> ? TableFromFieldAsArray<Env, F, OnlyOneTable, SK> :
				(	F extends Record<string, any> ? TableFromFieldAsObject<Env, F, OnlyOneTable, SK> : never )
			)>;




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
type AliasOriginFromObject<
	Obj extends Record<string,any>, 

	SK extends SyntaxKeys = DefaultSyntaxKeys 	
> = { 
	[ A in keyof Obj as A extends `${SK['aggregation' | 'json' | 'raw']}:${infer Alias}` ? Alias : (Obj[A] extends `${infer Alias}` ? Alias : (Obj[A] extends true ? A : never))] : A
};

type AliasOriginFromArray<
	Arr extends string[],

	SK extends SyntaxKeys = DefaultSyntaxKeys 
> = { 
	[ A in Arr[keyof Arr] as A extends `${string}${SK["alias"]}${infer Alias}` ? Alias : A & string] : A
};

type AliasesFromObject<
	Obj extends Record<string, any>,

	SK extends SyntaxKeys = DefaultSyntaxKeys 
> = {
	[A in keyof Obj] : A extends `${SK['aggregation' | 'json' | 'raw']}:${infer Alias}` ? Alias : (Obj[A] extends `${infer Alias}` ? Alias : (Obj[A] extends true ? A : never));
}

type AliasesFromArray<
	Arr extends string[],
	
	SK extends SyntaxKeys = DefaultSyntaxKeys 
> = { 
	[ A in Arr[keyof Arr] & string] : A extends `${string}${SK["alias"]}${infer Alias}` ? Alias : A;
};

// If unique then One to One correspondance between AliasOrigin and Alias without any union
type AliasAreUniqueInObject<
	Obj extends Record<string, any>,


	SK extends SyntaxKeys = DefaultSyntaxKeys 
> = {
	[K in keyof Obj] : AliasOriginFromObject<Obj, SK>[AliasesFromObject<Obj, SK>[K] & keyof AliasOriginFromObject<Obj, SK>] extends K ? never : K
}[keyof Obj] extends never ? true : false

type AliasAreUniqueInArray<
	Arr extends string[],

	SK extends SyntaxKeys = DefaultSyntaxKeys 
> = {
	[K in keyof Arr] : AliasOriginFromArray<Arr, SK>[AliasesFromArray<Arr, SK>[K & keyof AliasesFromArray<Arr, SK>] & keyof AliasOriginFromArray<Arr, SK>] extends K ? never : K
}[keyof Arr] extends never ? true : false



export type FieldHasDuplicateAliases<
	F extends Field<any, any, SK>,

	SK extends SyntaxKeys = DefaultSyntaxKeys 
> = 
	F extends string ? false : (
		F extends string[] ? (AliasAreUniqueInArray<F, SK> extends true ? false : never) : (
			F extends Record<string, any> ? (AliasAreUniqueInObject<F, SK> extends true ? false : never) : false
		)	
	)

/* =========================================================================
   =  Raw SQL get checker
   ========================================================================= */



/* =========================================================================
   =  TESTS
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

// let fromf : TableFromFieldAsArray<ENV, ["b1@eee", "table1.*", "table1.a1"], "table1"> = {

// }


// let fromfa : TableFromFieldAsArray<ENV, ["table2.a2", "table1.a1@a11"], "table1"> = {
	
// }


let fromfo : AliasAreUniqueInObject<{
	"table1.a1" : "c1",
	"table1.c1" : "c1",
	"a1" : true,
	"{}:obj" : {
		"table2.a2" : true,
		"table2.b2" : true,
	},
	"[]:a5" : {
		group : "c1",
		value : "table4.a4"
	},
	"[]:c1" : {
		group : "c1",
		value : {
			"table1.b1" : "v1",
			"table2.b2" : true,
		}
	},
 } & Record<string, any>> = true


let tegzeg : FieldHasDuplicateAliases<{
		"aaa.column1" : "aaa",
		"table1.column2" : "aaa",
	}>





