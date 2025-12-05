import { Environment, FlatEnv, StrKeys, FlatEnvKeys, Simplify,  } from "./common";


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
		From extends keyof Env | never = never
	> =
			'*'
		| 	`${StrKeys<Env>}.*`
		| 	FlatEnvKeys<Env, From>
		| 	`${Extract<FlatEnvKeys<Env, From>, string>}@${string}`;

	// Table from field string form
	type TableFromFieldAsString<
		Env extends Environment,
		F extends string,
		From extends keyof Env | never = never
	> = 
		F extends '*' ? {[K in FlatEnvKeys<Env>] : FlatEnv<Env>[K]} : 
			(F extends `${infer EnvKey}.*` ? {[K in keyof Env[EnvKey] as K extends string ? `${EnvKey}_${K}` : never] : Env[EnvKey][K]} :
				(F extends `${string}@${infer alias}` ? { [a in alias as a extends string ? a : never] : (F extends `${infer k}@${string}` ? (k extends FlatEnvKeys<Env, From> ? FlatEnv<Env, From>[k] : never) : never) } : 
					(F extends FlatEnvKeys<Env, From> ? {[f in F as PointToUnderscore<f>] : FlatEnv<Env, From>[f]} : never)
				)
			);




	/** 
		------------------ ARRAY FORM ----------------------
		["table.col", "table.*", "table.col@alias"]
	*/

	// Field array form
	type FieldArrayForm<
		Env extends Environment,
		From extends keyof Env | never = never
	> = 
		Array<
				`${StrKeys<Env>}.*` 
			| 	FlatEnvKeys<Env, From> 
			| 	`${Extract<FlatEnvKeys<Env, From>, string>}@${string}`
		>;


	// Table from field array form
	type TableFromFieldAsArray<
		Env extends Environment,
		F extends Array<string>,
		From extends keyof Env | never = never
	> = 
		F extends [infer E extends string, ...(infer R extends Array<string>)] ? (TableFromFieldAsString<Env, E, From> & TableFromFieldAsArray<Env, R, From>) : {};



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
		From extends keyof Env | never = never
	> = {
		group: FlatEnvKeys<Env, From> | Array<FlatEnvKeys<Env, From>>;
		value: FlatEnvKeys<Env, From> | FieldObjectForm<Env, From>;	  // value can be a single column (flat key) OR a nested FieldObject describing an object
	};

	// Field object form
	type FieldObjectForm<
		Env extends Environment,
		From extends keyof Env | never = never
	> = 
			{ [K in FlatEnvKeys<Env, From>]? : true | string;}
		|	{ [K in `[]:${string}`]? : AggregateFieldObjectFormValue<Env, From> }
		|	{ [K in `{}:${string}`]? : FieldObjectForm<Env, From> }
		| 	{ [K in `sql:${string}`]? : string}

	// Table from field object form
	type TableFromFieldAsObject<
		Env extends Environment,
		F extends Record<string, any>,
		From extends keyof Env | never = never 
	> = 
			{ [k in keyof F as k extends FlatEnvKeys<Env, From> ? (F[k] extends string ? F[k] : PointToUnderscore<k>) : never] : FlatEnv<Env, From>[k & keyof FlatEnv<Env, From>]}
		&	{ [k in keyof F as k extends `[]:${infer alias}` ? alias : never] : F[k] extends {value : infer A} ? Array<A extends FlatEnvKeys<Env, From> ? FlatEnv<Env, From>[A] : TableFromFieldAsObject<Env, A & Record<string, any>, From>> : never}
		&	{ [k in keyof F as k extends `{}:${infer alias}` ? alias : never] : TableFromFieldAsObject<Env, F[k] & Record<string, any>, From>}
		&	{ [k in keyof F as k extends `sql:${infer alias}` ? alias : never] : any}




/* =========================================================================
   =  FINAL TYPES
   ========================================================================= */


	export type Field<
		Env extends Environment,
		From extends keyof Env | never = never
	> =
		FieldStringForm<Env, From>
		| FieldArrayForm<Env, From>
		| FieldObjectForm<Env, From>;


	export type TableFromField<
		Env extends Environment,
		F extends Field<Env, From>,
		From extends keyof Env | never = never 
	> = Simplify<
		F extends string ? TableFromFieldAsString<Env, F, From> :
			(	F extends Array<string> ? TableFromFieldAsArray<Env, F, From> :
				(	F extends Record<string, any> ? TableFromFieldAsObject<Env, F, From> : never )
			)>;



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

// let fromf : TableFromFieldAsArray<ENV, ["b1@eee", "table1.*", "table1.a1"], "table1"> = {

// }


// let fromfa : TableFromFieldAsArray<ENV, ["table2.a2", "table1.a1@a11"], "table1"> = {
	
// }


// let fromfo : TableFromField<ENV, {
// 	"table1.a1" : "eee",
// 	"c1" : true,
// 	"{}:obj" : {
// 		"table2.a2" : true,
// 		"table2.b2" : true,
// 	},
// 	"[]:arr1" : {
// 		group : "c1",
// 		value : "table4.a4"
// 	},
// 	"[]:arr2" : {
// 		group : "c1",
// 		value : {
// 			"table1.b1" : "v1",
// 			"table2.b2" : true,
// 		}
// 	},
//  }, "table1"> = {

// }






