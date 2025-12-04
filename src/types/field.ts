import { Environment, Table, FlatEnv, StrKeys, FlatEnvKeys,  } from "./common";


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

		type TableFieldArray<T extends Table> = Array<keyof T | `${StrKeys<T>}@${string}`>;
		type TableFieldObjectType<T extends Table> = TableFieldObject<T> | TableFieldArray<T>;
		type TableFieldObject<T extends Table> =  { [k in string as k extends keyof T ? never : k]? : TableFieldObjectType<T> } | { [k in keyof T]? : string}
		export type TableField<T extends Table> = 
			'*'
			| TableFieldArray<T>
			| keyof T | `${keyof T extends string ? keyof T : never}@${string}`
			| TableFieldObject<T>

		// For environment, treat its flatten version as a table
		export type EnvironmentField<TE extends Partial<Environment>, From extends keyof TE | undefined = undefined> = 
			`${keyof TE extends string ? keyof TE : never}.*`
			| TableField<FlatEnv<TE, From>>


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

	export type TableFromEnvField<TE extends Partial<Environment>, TF extends EnvironmentField<TE>, From extends keyof TE | undefined = undefined> = 
		(TF extends `${infer k}.*` ? (k extends keyof TE ? TE[k] : never) : never)
		| TableFromTableField<FlatEnv<TE, From>, TF>;








///
// OPTIMIZED
///


/**

Field defines which column are selected or returned, in which form and which alias
It can have several values :
```
'*' // everything 

'table1.*' // everything from a table

'table1.column1' // one column

'table1.column1@c11' // one aliased column

['table1.column1@c11', 'table2.column2'] // multiple columns aliased or not

{...} // An object 
```

The field as an object is most complete and powerful form : 

```
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
```

The raw sql statement must be a string but can be the result of a function ! As such you can use makeSafeSQL<Environment>() utility to get a function that will prevent you to use unknown column in your SQL statement

*/


///
// Field
///

//
// ---------- Grammar types ----------
//


	/**
	* String forms:
	*  - '*' 
	*  - 'table.*'
	*  - 'table.col'  (or 'col' if From provided and you used simple key)
	*  - 'table.col@alias'
	*/
	type FieldStringForm<
		Env extends Environment,
		From extends keyof Env | never = never
	> =
			'*'
		| 	`${StrKeys<Env>}.*`
		| 	FlatEnvKeys<Env, From>
		| 	`${Extract<FlatEnvKeys<Env, From>, string>}@${string}`;


	/** 
	* Array form :
		["table.col", "table.*", "table.col@alias"]
	*/
	type FieldArrayForm<
		Env extends Environment,
		From extends keyof Env | never = never
	> = 
		ReadonlyArray<
				`${StrKeys<Env>}.*` 
			| 	FlatEnvKeys<Env, From> 
			| 	`${Extract<FlatEnvKeys<Env, From>, string>}@${string}`
		>;



	/** 
		Object form :
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
		From extends keyof Env | never = never
	> = {
		group: FlatEnvKeys<Env, From> | ReadonlyArray<FlatEnvKeys<Env, From>>;
		value: FlatEnvKeys<Env, From> | FieldObjectForm<Env, From>;	  // value can be a single column (flat key) OR a nested FieldObject describing an object
	};

	type FieldObjectForm<
		Env extends Environment,
		From extends keyof Env | never = never
	> = 
			{ [K in FlatEnvKeys<Env, From>]? : true | string;}
		|	{ [K in `[]:${string}`]? : AggregateFieldObjectFormValue<Env, From> }
		|	{ [K in `{}:${string}`]? : FieldObjectForm<Env, From> }
		| 	{ [K in `sql:${string}`]? : string}




//
// ---------- Field----------
//


	export type Field<
		Env extends Environment,
		From extends keyof Env | never = never
	> =
		FieldStringForm<Env, From>
		| FieldArrayForm<Env, From>
		| FieldObjectForm<Env, From>;







///
// Table From Field
///

//
// ---------- Grammar types ----------
//


	type TableFromFieldAsString<
		Env extends Environment,
		F extends string,
		From extends keyof Env | never = never
	> = 
		F extends '*' ? {[K in FlatEnvKeys<Env>] : FlatEnv<Env>[K]} : 
			(F extends `${infer EnvKey}.*` ? {[K in keyof Env[EnvKey]] : Env[EnvKey][K]} :
				(F extends `${string}@${infer alias}` ? { [a in alias as a extends string ? a : never] : (F extends `${infer k}@${string}` ? (k extends FlatEnvKeys<Env, From> ? FlatEnv<Env, From>[k] : never) : never) } : 
					(F extends FlatEnvKeys<Env, From> ? {[f in F] : FlatEnv<Env, From>[f]} : never)
				)
			);

	type Flatten<T extends Record<string, object>> = {
		[K in keyof T]: T[K]
	}[keyof T];
	
	type TableFromFieldAsArray<
		Env extends Environment,
		F extends Array<string>,
		From extends keyof Env | never = never
	> =
		F extends ReadonlyArray<infer C> ? Flatten<{[k in C as k extends string ? k : never] : TableFromFieldAsString<Env, k & string, From>}> : never;

// Faire une union des valeur après...

	// type FieldStringForm<
	// 	Env extends Environment,
	// 	From extends keyof Env | never = never
	// > =
	// 	'*'
	// 	| `${StrKeys<Env & Record<string, any>>}.*`
	// 	| FlatEnvKeys<Env, From>
	// 	| `${Extract<FlatEnvKeys<Env, From>, string>}@${string}`;


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

let tefzef : Field<ENV, "table1"> = "*";

let fromf : TableFromFieldAsArray<ENV, ["b1@eee", "table1.*", "table1.a1"], "table1"> = {

}



let envfield : EnvironmentField<ENV> = {
	"table1.a1" : "aaa",
	"ajeeh" : ["table1.a1@aajjaja", 'table4.a4']
};


let f : FieldObjectForm<ENV, "table1"> = {
	"table1.a1" : true,
}


let tablefield : TableField<ENV["table1"]> = ["a1"]
//{
// 	'a1' : "column1",
// 	'b1' : "column2",
// 	'aaa' : ["a1@aajjaja", 'c1'],
// 	'bbbb' : {
// 		a1 : '444'
// 	}
// }

//let tablefromfield : TableFromTableField<ENV["table1"], '*'>;



let envfromfield : TableFromEnvField<ENV, {
	"table1.a1" : "aaa",
	"a1" : "eeeeefzfz"
	"ajeeh" : ["table1.a1@aajjaja", 'table4.a4']
}, "table1">;






