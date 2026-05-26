import { Simplify, Environment, Obj, UnionToIntersection } from "../types";
import { SyntaxKeys, DefaultSyntaxKeys, SyntaxKeysConstant } from "../syntaxkeys.js";
import { FlatEnv, FlatEnvKeys, StrKeys } from "./common";


/**=========================================================================
   =  Documentation
   =========================================================================

Field defines which columns are selected, in which form, and under which alias.
It can have several forms :
```
'*'                                           // everything

'table1.*'                                    // everything from a table

'table1.column1'                              // one column

'table1.column1 AS c11'                       // one aliased column (SK-dependent)

['table1.column1 AS c11', 'table2.column2']   // multiple columns, aliased or not

{...}                                         // object form (see below)
```

The field as an object is most complete and powerful form : 

```
{
	"c1"    : "table1.column1",               // column reference → typed as column type
	"label" : "Hello",                        // string literal   → typed as string
	"count" : 42,                             // number literal   → typed as number
	"flag"  : true,                           // boolean literal  → typed as boolean

	"agg1": {                               	// aggregation
		fn    : "json_agg",                   	// "json_agg" | "array_agg"
		group : "table1.column3",             	// GROUP BY single column
		value : "table2.column2"              	// aggregate a single column
	},

	"agg2"  : {
		fn    : "array_agg",
		group : ["table1.column1", "table1.column2"],  	// GROUP BY multiple columns
		value : {                             				// aggregate a nested json_builded object
			"v1" : "table1.column1",
			"v2" : "table2.column2"
		}
	},

	"obj1"  : {                               // json_build_object (no aggregation)
		fn    : "json_build_object",
		value : {
			"v1" : "table1.column1",
			"v2" : "table2.column2"
		}
	},

	"raw1"  : {                               // raw SQL expression
		fn    : "raw",
		value : "COALESCE(table1.column1, '')"
	}
}
```

Using an aggregation fn adds a GROUP BY clause on the `group` columns.

*****************/


/* =========================================================================
   =  Grammar
   ========================================================================= */


	/**
		------------------ STRING FORM ----------------------

		- '*'
		- 'table.*'
		- 'table.col'  (or 'col' if OnlyOneTable provided)
		- 'table.col@alias'  (SK-dependent alias syntax)
	*/
	type PointToUnderscore<k> = k extends `${infer table}.${infer column}` ? `${table}_${column}` : k

	type FieldStringForm<
		Env extends Environment,
		OnlyOneTable extends keyof Env | undefined = undefined,
		SK extends SyntaxKeys = DefaultSyntaxKeys,
	> =
			'*'
		|	`${StrKeys<Env>}.*`
		|	keyof FlatEnv<Env, OnlyOneTable>
		|	`${Extract<keyof FlatEnv<Env, OnlyOneTable>, string>}${SK["alias"]}${string}`;

	type TableFromFieldAsString<
		Env extends Environment,
		F extends string,
		OnlyOneTable extends keyof Env | undefined = undefined,
		SK extends SyntaxKeys = DefaultSyntaxKeys,
	> =
		F extends '*' ? {[K in keyof FlatEnv<Env, OnlyOneTable>] : FlatEnv<Env, OnlyOneTable>[K]} :
			(F extends `${infer EnvKey}.*` ? {[K in keyof Env[EnvKey] as K extends string ? `${EnvKey}_${K}` : never] : Env[EnvKey][K]} :
				(F extends `${string}${SK["alias"]}${infer alias}` ? { [a in alias as a extends string ? a : never] : (F extends `${infer k}${SK["alias"]}${string}` ? (k extends keyof FlatEnv<Env, OnlyOneTable> ? FlatEnv<Env, OnlyOneTable>[k] : never) : never) } :
					(F extends keyof FlatEnv<Env, OnlyOneTable> ? {[f in F as PointToUnderscore<f>] : FlatEnv<Env, OnlyOneTable>[f]} : never)
				)
			);




	/**
		------------------ ARRAY FORM ----------------------
		["table.col", "table.*", "table.col@alias"]
	*/

	type FieldArrayForm<
		Env extends Environment,
		OnlyOneTable extends keyof Env | undefined = undefined,
		SK extends SyntaxKeys = DefaultSyntaxKeys,
	> =
		Array<
				`${StrKeys<Env>}.*`
			|	FlatEnvKeys<Env, OnlyOneTable>
			|	`${Extract<FlatEnvKeys<Env, OnlyOneTable>, string>}${SK["alias"]}${string}`
		>;

	type TableFromFieldAsArray<
		Env extends Environment,
		F extends Array<string>,
		OnlyOneTable extends keyof Env | undefined = undefined,
		SK extends SyntaxKeys = DefaultSyntaxKeys,
	> =
		F extends [infer E extends string, ...(infer R extends Array<string>)] ? (TableFromFieldAsString<Env, E, OnlyOneTable, SK> & TableFromFieldAsArray<Env, R, OnlyOneTable, SK>) : {};




	/**
		------------------ OBJECT FORM ----------------------

	All keys are aliases. Values are one of:
	- string  : column reference (FlatEnvKey) or string literal
	- number  : number literal
	- boolean : boolean literal
	- { fn: "json_agg" | "array_agg", group?, value }
	- { fn: "json_build_object", value }
	- { fn: "raw", value: string }
	*/

	type FieldObjectAggValue<
		Env extends Environment,
		OnlyOneTable extends keyof Env | undefined = undefined,
		SK extends SyntaxKeys = DefaultSyntaxKeys
	> = {
		fn    : "json_agg" | "array_agg";
		group?: FlatEnvKeys<Env, OnlyOneTable> | Array<FlatEnvKeys<Env, OnlyOneTable>>;
		value : FlatEnvKeys<Env, OnlyOneTable> | FieldObjectForm<Env, OnlyOneTable, SK>;
	};

	type FieldObjectJsonValue<
		Env extends Environment,
		OnlyOneTable extends keyof Env | undefined = undefined,
		SK extends SyntaxKeys = DefaultSyntaxKeys
	> = {
		fn    : "json_build_object";
		value : FieldObjectForm<Env, OnlyOneTable, SK>;
	};

	type FieldObjectRawValue = {
		fn    : "raw";
		value : string;
	};

	type FieldObjectEntryValue<
		Env extends Environment,
		OnlyOneTable extends keyof Env | undefined = undefined,
		SK extends SyntaxKeys = DefaultSyntaxKeys
	> =
		| FlatEnvKeys<Env, OnlyOneTable>	// autocomplete suggests column names first
		| (string & {})						// still accepts arbitrary string literals
		| number
		| boolean
		| FieldObjectAggValue<Env, OnlyOneTable, SK>
		| FieldObjectJsonValue<Env, OnlyOneTable, SK>
		| FieldObjectRawValue;

	type FieldObjectForm<
		Env extends Environment,
		OnlyOneTable extends keyof Env | undefined = undefined,
		SK extends SyntaxKeys = DefaultSyntaxKeys
	> = {
		[alias: string]: FieldObjectEntryValue<Env, OnlyOneTable, SK>;
	};


	type TableFromFieldAsObject<
		Env extends Environment,
		F extends Record<string, any>,
		OnlyOneTable extends keyof Env | undefined = undefined,
		SK extends SyntaxKeys = DefaultSyntaxKeys
	> = {
		[alias in keyof F]:
			// Object fn variants checked first (most specific)
			F[alias] extends { fn: "json_agg" | "array_agg"; value: infer Val }
				? Val extends FlatEnvKeys<Env, OnlyOneTable>
					? Array<FlatEnv<Env, OnlyOneTable>[Val & keyof FlatEnv<Env, OnlyOneTable>]>
					: Val extends Record<string, any>
						? Array<TableFromFieldAsObject<Env, Val, OnlyOneTable, SK>>
						: never
			: F[alias] extends { fn: "json_build_object"; value: infer Val }
				? Val extends Record<string, any>
					? TableFromFieldAsObject<Env, Val, OnlyOneTable, SK>
					: never
			: F[alias] extends { fn: "raw" }
				? any
			// Primitive variants: column ref checked before generic string
			: F[alias] extends FlatEnvKeys<Env, OnlyOneTable>
				? FlatEnv<Env, OnlyOneTable>[F[alias] & keyof FlatEnv<Env, OnlyOneTable>]
			: F[alias] extends number   ? number
			: F[alias] extends boolean  ? boolean
			: F[alias] extends string   ? string
			: never
	};




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
   =  SrcEnvFromField — restricts environment to source columns used in F
   ========================================================================= */

	type EnvFromFlatKey<
		Env extends Environment,
		K extends string,
		From extends keyof Env | undefined
	> =
		K extends `${infer T}.${infer C}`
			? T extends keyof Env
				? C extends keyof Env[T]
					? { [t in T]: { [c in C]: Env[T][C] } }
					: {}
				: {}
			: From extends keyof Env
				? K extends keyof Env[From]
					? { [t in From]: { [c in K & keyof Env[From]]: Env[From][K & keyof Env[From]] } }
					: {}
				: {};

	type SrcEnvFromArray<
		Env extends Environment,
		Arr extends string[],
		From extends keyof Env | undefined,
		SK extends SyntaxKeys
	> = Arr extends [infer Head extends string, ...infer Tail extends string[]]
		? SrcEnvFromField<Env, Head & Field<Env, From, SK>, From, SK> & SrcEnvFromArray<Env, Tail, From, SK>
		: {};

	type SrcEnvFromObjectField<
		Env extends Environment,
		F extends Record<string, any>,
		From extends keyof Env | undefined
	> = UnionToIntersection<{
		[K in keyof F]:
			F[K] extends `${infer T}.${infer C}`
				? T extends keyof Env
					? C extends keyof Env[T]
						? { [t in T]: { [c in C]: Env[T][C] } }
						: {}
					: {}
				: From extends keyof Env
					? F[K] extends keyof Env[From]
						? { [t in From]: { [c in F[K] & keyof Env[From]]: Env[From][F[K] & keyof Env[From]] } }
						: {}
					: {}
	}[keyof F]>;

	export type SrcEnvFromField<
		Env extends Environment,
		F extends Field<Env, From, SK>,
		From extends keyof Env | undefined = undefined,
		SK extends SyntaxKeys = DefaultSyntaxKeys
	> =
		F extends '*'
			? Env
		: F extends `${infer T}.*`
			? (T extends keyof Env ? { [K in T]: Env[K] } : Env)
		: F extends `${string}${SK["alias"]}${string}`
			? (F extends `${infer Base}${SK["alias"]}${string}`
				? (Base extends FlatEnvKeys<Env, From>
					? EnvFromFlatKey<Env, Base, From>
					: Env)
				: Env)
		: F extends FlatEnvKeys<Env, From>
			? EnvFromFlatKey<Env, F & string, From>
		: F extends Array<string>
			? SrcEnvFromArray<Env, F, From, SK>
		: F extends Record<string, any>
			? SrcEnvFromObjectField<Env, F, From>
		: Env;


/* =========================================================================
   =  Alias checker
   ========================================================================= */

	// String / array forms still need duplicate-alias validation.
	// Object form: keys are inherently unique in TS → always false (no duplicates).

	type AliasOriginFromArray<
		Arr extends string[],
		SK extends SyntaxKeys = DefaultSyntaxKeys
	> = {
		[ A in Arr[keyof Arr] as A extends `${string}${SK["alias"]}${infer Alias}` ? Alias : A & string] : A
	};

	type AliasesFromArray<
		Arr extends string[],
		SK extends SyntaxKeys = DefaultSyntaxKeys
	> = {
		[ A in Arr[keyof Arr] & string] : A extends `${string}${SK["alias"]}${infer Alias}` ? Alias : A;
	};

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
		F extends string ? false :
		F extends string[] ? (AliasAreUniqueInArray<F, SK> extends true ? false : never) :
		false;  // Object form: TS key uniqueness guarantees no duplicate aliases




/* =========================================================================
   =  UTILS
   ========================================================================= */


export class FieldParser {

	select  : string = "";
	groupby : string = "";

	readonly SK : SyntaxKeysConstant;
	readonly ALIAS_REGEX : RegExp;

	constructor(sk : SyntaxKeysConstant){
		this.SK = sk;
		this.ALIAS_REGEX = new RegExp(
			`^(?<col>.+?)${sk['alias'].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?<alias>.+)$`
		);
	}


	/** Converts one string entry (string form or array element) to SQL */
	private parseStringEntry(s : string) : string {
		if(s === '*') return '*';

		const match = s.match(this.ALIAS_REGEX);
		if(match?.groups?.col && match.groups.alias)
			return `${match.groups.col} AS ${match.groups.alias}`;

		return s;
	}


	/**
	 * Builds `json_build_object('key', expr, ...)` SQL from a nested FieldObjectForm.
	 * Used as the inner expression of json_build_object and agg value.
	 */
	private buildJsonBuildObjectSQL(obj : Obj) : string {
		const parts : string[] = [];
		for(const alias in obj){
			if(obj[alias] === undefined) continue;
			parts.push(`'${alias}', ${this.buildExprSQL(obj[alias])}`);
		}
		return `json_build_object(${parts.join(', ')})`;
	}


	/** Recursively resolves any FieldObjectEntryValue to a SQL expression string */
	private buildExprSQL(value : any) : string {
		if(typeof value === 'number' || typeof value === 'boolean') return String(value);
		if(typeof value === 'string')  return value;
		if(typeof value !== 'object' || value === null) return 'NULL';

		if(value.fn === 'raw')               return value.value;
		if(value.fn === 'json_build_object') return this.buildJsonBuildObjectSQL(value.value);
		if(value.fn === 'json_agg' || value.fn === 'array_agg'){
			const inner = typeof value.value === 'string'
				? value.value
				: this.buildJsonBuildObjectSQL(value.value);
			return `${value.fn}(${inner})`;
		}
		return 'NULL';
	}


	private appendSelect(expr : string) : void {
		if(this.select) this.select += ', ';
		this.select += expr;
	}

	private appendGroupBy(group : string | string[]) : void {
		const cols = Array.isArray(group) ? group : [group];
		if(this.groupby) this.groupby += ', ';
		this.groupby += cols.join(', ');
	}


	/** alias : "table.col" | scalar */
	private parseSimple(alias : string, value : string | number | boolean) : void {
		this.appendSelect(`${value} AS ${alias}`);
	}

	/** alias : { fn: "json_agg" | "array_agg", group?, value } */
	private parseAgg(alias : string, value : Obj) : void {
		const inner = typeof value.value === 'string'
			? value.value
			: this.buildJsonBuildObjectSQL(value.value);

		this.appendSelect(`${value.fn}(${inner}) AS ${alias}`);

		if(value.group)
			this.appendGroupBy(value.group);
	}

	/** alias : { fn: "json_build_object", value } */
	private parseJsonBuildObject(alias : string, value : Obj) : void {
		this.appendSelect(`${this.buildJsonBuildObjectSQL(value.value)} AS ${alias}`);
	}

	/** alias : { fn: "raw", value } */
	private parseRaw(alias : string, value : Obj) : void {
		this.appendSelect(`${value.value} AS ${alias}`);
	}


	private parseObjectEntry(alias : string, value : any) : void {
		if(typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
			return this.parseSimple(alias, value);
		if(typeof value !== 'object' || value === null)
			return;

		if(value.fn === 'json_agg' || value.fn === 'array_agg') 	
			return this.parseAgg(alias, value);
		if(value.fn === 'json_build_object')                     
			return this.parseJsonBuildObject(alias, value);
		if(value.fn === 'raw')                                   
			return this.parseRaw(alias, value);
	}


	parse(field : string | string[] | Obj) : void {
		this.select  = '';
		this.groupby = '';

		if(typeof field === 'string'){
			this.select = this.parseStringEntry(field);
			return;
		}

		if(Array.isArray(field)){
			this.select = field.map(s => this.parseStringEntry(s)).join(', ');
			return;
		}

		for(const alias in field){
			if(field[alias] === undefined) continue;
			this.parseObjectEntry(alias, field[alias]);
		}
	}
}




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

// Simple column reference
let f1 : Field<TestEnv> = {
	"c1"    : "table1.column1",
	"c2"    : "table1.column2",
}

// Scalar literals
let f2 : Field<TestEnv> = {
	"label" : "Hello",
	"count" : 42,
	"flag"  : true,
}

// Aggregation with single group column and single value column
let f3 : Field<TestEnv> = {
	"agg1" : {
		fn    : "json_agg",
		group : "table1.column3",
		value : "table2.column21",
	}
}

// Aggregation with multi-column group and nested object value
let f4 : Field<TestEnv> = {
	"agg2" : {
		fn    : "array_agg",
		group : ["table1.column1", "table1.column2"],
		value : {
			"v1" : "table1.column1",
			"v2" : "table2.column22",
		}
	}
}

// json_build_object
let f5 : Field<TestEnv> = {
	"obj1" : {
		fn    : "json_build_object",
		value : {
			"v1" : "table1.column1",
			"v2" : "table2.column22",
		}
	}
}

// Raw SQL
let f6 : Field<TestEnv> = {
	"raw1" : {
		fn    : "raw",
		value : "COALESCE(table1.column1, '')",
	}
}

// Mixed
let f7 : Field<TestEnv> = {
	"c1"   : "table1.column1",
	"agg1" : {
		fn    : "json_agg",
		group : "table1.column3",
		value : "table2.column21",
	},
	"obj1" : {
		fn    : "json_build_object",
		value : {
			"v1" : "table1.column1",
			"v2" : "table2.column22",
		}
	},
	"raw1" : { fn: "raw", value: "NOW()" },
}

// Result type test
type ResultF7 = TableFromField<TestEnv, typeof f7>;
// Expected:
// {
//   c1   : string,
//   agg1 : Array<number>,
//   obj1 : { v1: string, v2: string },
//   raw1 : any
// }
