import { Environment, Table, FlattenEnvironment,  } from "./common";


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
		export type EnvironmentField<TE extends Partial<Environment>, From extends keyof TE | undefined = undefined> = 
			`${keyof TE extends string ? keyof TE : never}.*`
			| TableField<FlattenEnvironment<TE, From>>


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
		| TableFromTableField<FlattenEnvironment<TE, From>, TF>;


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

let envfield : EnvironmentField<ENV> = {
	"table1.a1" : "aaa",
	"ajeeh" : ["table1.a1@aajjaja", 'table4.a4']
};



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