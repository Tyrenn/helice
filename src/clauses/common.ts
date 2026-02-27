import { Arrayed, Column, KeysNotOfType, KeysOfType, Table, UnArraying } from "../types.js";



	/** --------- Precomputed Key groups ------------- */
	export type KeysOfArray<T> = KeysOfType<T, any[]>;
	export type KeysOfStringArray<T> = KeysOfType<T, string[]>;
	export type KeysOfString<T> = KeysOfType<T, string>;
	export type KeysOfNonArray<T> = KeysNotOfType<T, any[]>;
	export type KeysOfNumber<T> = KeysOfType<T, number>;
	export type KeysOfNumberArray<T> = KeysOfType<T, number[]>;


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
	> = {	[k in K & string as `${Prefix}${k}${Suffix}`]? : Arrayed<T[k] | null | Column<KeysOfType<A, UnArraying<T[k]>> & (string & {})>>};


	// { `${prefix}K${suffix} : T | null | col(A)
export	type WrapKeyNoArrayValue<
		T extends Table,
		K extends keyof T,
		A extends Table,
		Prefix extends string,
		Suffix extends string
	> = { [k in K & string as `${Prefix}${k}${Suffix}`]? : UnArraying<T[k]> | null | Column<KeysOfType<A, UnArraying<T[k]>> & (string & {})> };
