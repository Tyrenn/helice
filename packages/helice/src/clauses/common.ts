import { Column, Environment, Table } from "../types.js";


/** --------- Type Prettifiers  ------------- */


	/**
	* One way to force TS to print the final mapped type
	*/
	export type Simplify<T> = { [K in keyof T]: T[K] } & {};

	/**
	* A stronger way to force TS to print the final mapped type
	*/
	export type Prettify<T> = { [K in keyof T]: T[K] } extends infer O ? { [K in keyof O]: O[K] } : never;





/** --------- SQL Utilities ------------- */

export function shiftParams(sql: string, offset: number): string {
	if (offset === 0) return sql;
	return sql.replace(/\$(\d+)/g, (_, n) => `$${parseInt(n) + offset}`);
}




/** --------- Props Type Utilities  ------------- */


	/**
	* Transform every non-array typed properties in array typed properties
	**/
	export type ElementOf<T> = T extends readonly (infer U)[] ? U : T;
	export type ArrayOf<T> = ElementOf<T>[];
	export type MaybeArray<T> = ElementOf<T> | ArrayOf<T>;





/** --------- Keys  ------------- */


	export type StrKeys<T> = Extract<keyof T, string>;


	/**
	* Extract T keys if T[keys] type is FV
	*/
	export type KeysOfType<Table, KeyType extends any> = { [k in keyof Table]-? : Table[k] extends KeyType ? k : never; }[keyof Table];


	/**
	* Extract T keys if T[keys] type is not FV
	*/
	export type KeysNotOfType<Table, KeyType extends any> = { [k in keyof Table]-? : Table[k] extends KeyType ? never : k }[keyof Table]


	/**
	 * Removes the index signature from an Environment type, keeping only its literal string keys.
	 * Used to prevent index-signature broadening when passing FieldScope to Field<>.
	 */
	export type StrictEnv<T extends Environment> = { [K in keyof T as string extends K ? never : K]: T[K] };

	/**
	* Precomputed Key groups
	*/

	export type KeysOfArray<T> = KeysOfType<T, any[]>;
	export type KeysOfStringArray<T> = KeysOfType<T, string[]>;
	export type KeysOfString<T> = KeysOfType<T, string>;
	export type KeysOfNonArray<T> = KeysNotOfType<T, any[]>;
	export type KeysOfNumber<T> = KeysOfType<T, number>;
	export type KeysOfNumberArray<T> = KeysOfType<T, number[]>;
	/** Keys whose value is a plain object (not an array, not a primitive). Targets JSONB columns. */
	export type KeysOfObject<T> = {
		[k in keyof T]-?: NonNullable<T[k]> extends any[] ? never : NonNullable<T[k]> extends object ? k : never
	}[keyof T];




/** --------- Flattened Environment  ------------- */

	/**
	Working with the flat environment is way easier than a double depth object as the environment.
	But Environment is still required as it allows us to easily access table names.

	Env : {
		table1 : {
			c11 : number;
			c12 : string;
		},
		table2 : {
			c21 : number;
			c22 : string;
		}
	}

	FlatEnvKeys<Env> : "table1.c11" | "table1.c12" | "table2.c21" | "table2.c22"

	FlatEnv<Env> : {
		"table1.c11" : number;
		"table1.c12" : string;
		"table2.c21" : number;
		"table2.c22" : string;
	}

	If OnlyOneTable is given, then the type consider than only this one table is accessible and give back its type without prefix.
	This is useful for queries without joins.
	Only refer one table name in OnlyOneTable.

	OnlyOneTable basically change the whole type, in another project it would have been another type completely.
	But its presence here drastically reduce complexity as this type is used everywhere other types would need to know there is only one table accessible.

	
	Functional notes :
		* Checking OnlyOneTable is not done at root, even tough it would simplify the type, because this form allows TS to know that FlatEnvKeys are keyof FlatEnv
		* Approaching all keys through a flat map allows each key to be independant. Take keys from each table and create a type from it (`T in keyof Env & string as \`${T}.${keyof Env[T] & string}\``) would give a larger key type with all table column, resulting in a broader column type.
	
	*/
	export type FlatEnvKeys<
		Env extends Environment,
		OnlyOneTable extends keyof Env | undefined = undefined,
	> =
		OnlyOneTable extends keyof Env ? (keyof Env[OnlyOneTable]) : ( {[T in StrKeys<Env>]: `${T}.${StrKeys<Env[T]>}` }[StrKeys<Env>])

	export type FlatEnv<
		Env extends Environment,
		OnlyOneTable extends keyof Env | undefined = undefined,
	> =
		{ [K in FlatEnvKeys<Env, OnlyOneTable>]: 		K extends `${infer T}.${infer C}` ? (Env[T & keyof Env][C & keyof Env[T & keyof Env]]) : (Env[OnlyOneTable & keyof Env][K & keyof Env[OnlyOneTable & keyof Env]]) };

	export type TablesWithType<Env extends Environment, Type extends any> =
		{ [Table in keyof Env] : Type extends Env[Table][keyof Env[Table]] ? Table : never}[keyof Env];
	export type TablesWithoutType<Env extends Environment, Type extends any> = Exclude<keyof Env, TablesWithType<Env, Type>>;






	/** --------- WRAP Key ------------- */

	/**
	 * Considering T the Type of Table K
	 * Considering A an accessible column of type T
	 */

	// { `${prefix}K${suffix} : [T, ..., col(A), ..., null, ..., T] | T | null | col(A)
export	type WrapKeyArrayedValue<
		T extends Table,
		K extends keyof T,
		A extends Table,					// Accessible Flat Environment
		Prefix extends string,
		Suffix extends string
	> = {	[k in K & string as `${Prefix}${k}${Suffix}`]? : MaybeArray<T[k] | null | Column<Extract<KeysOfType<A, ElementOf<T[k]>>, string>>>};


	// { `${prefix}K${suffix} : T | null | col(A)
export	type WrapKeyNoArrayValue<
		T extends Table,
		K extends keyof T,
		A extends Table,
		Prefix extends string,
		Suffix extends string
	> = { [k in K & string as `${Prefix}${k}${Suffix}`]? : ElementOf<T[k]> | null | Column<Extract<KeysOfType<A, ElementOf<T[k]>>, string>> };
