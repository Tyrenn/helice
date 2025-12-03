/// GLOBAL

export type AllowedColumnTypes = null | number | string | boolean | null[] | number[] | string[] | boolean[]

export type Table = ({[key : string | number | symbol] :  AllowedColumnTypes } | {});
export type Environment = {[key : string] : Table};
export type FlattenedEnvironment = {[key : string] : any};

export type Obj = {[key : string] : any};


/// UTILS


/**
* Transform every non-array typed properties in array typed properties
**/
export type UnArraying<T> = (T extends (infer U)[] ? U : T);
export type Arraying<T> = Array<T extends (infer U)[] ? U : T>;
export type Arrayed<T> = UnArraying<T> | Arraying<T>;
	//type ObjectArrayed<T> = { [Prop in keyof T] : Arrayed<T[Prop]>;}

/**
 * Flatten Array to tuple keeping inferred types
 */
export type FlattenArray<A extends unknown[]> = A extends [] ? [] : A extends [infer E, ...infer R] ? (E extends `${infer S}` ? [S, ...FlattenArray<R>] : (E extends Array<unknown> ? [...FlattenArray<E>, ...FlattenArray<R>] : never)) : A;

/**
 * Extract keys of type FV from an object
 */
export type KeysOfType<T, FV extends any> = {
		[k in keyof T] : T[k] extends FV ? k : never;
	}[keyof T];

export type KeysNotOfType<T, FV extends any> = {
	[k in keyof T] : T[k] extends FV ? never : k
}[keyof T]


/**
{
	table1 : {
		c11 : number;
		c12 : string;
	},
	table2 : {
		c21 : number;
		c22 : string;
	}
}

Will give "table1.c11" | "table1.c12" | "table2.c21" | "table2.c22"

 */
// export type FlattenEnvironmentKeys<TE extends Partial<Environment>> = keyof {
// 	[Key in (keyof TE) as Key extends string ? `${Key}.${keyof TE[Key] extends string ? keyof TE[Key] : never}` : never] : string;
// }

export type FlattenEnvironmentKeys<TE extends Partial<Environment>, From extends keyof TE | undefined = undefined> = keyof { [Key in (keyof TE) as Key extends string ? `${Key}.${keyof TE[Key] extends string ? keyof TE[Key] : never}` : never] : true;} | ( From extends keyof TE ? keyof TE[From] : never );

/**
	{
		"table.prop" : type of prop
	}
 */
// export type FlattenEnvironment<TE extends Partial<Environment>> = {
// 	[Key in FlattenEnvironmentKeys<TE>] : Key extends `${infer T}.${infer C}` ? (T extends keyof TE ? (C extends keyof TE[T] ? TE[T][C] : never) : never): never;
// }
export type FlattenEnvironment<TE extends Partial<Environment>, From extends keyof TE | undefined = undefined> = {
	[Key in FlattenEnvironmentKeys<TE, From>] : Key extends `${infer T}.${infer C}` ? 
			(T extends keyof TE ? (C extends keyof TE[T] ? TE[T][C] : never) : never) 
		:  (From extends keyof TE ? (Key extends keyof TE[From] ? TE[From][Key] : never) : never);
}



export type FlattenEnvironmentExceptTable<TE extends  Partial<Environment>, ExceptTable extends string> = {
		[Key in FlattenEnvironmentKeys<TE> as Key extends `${infer T}.${string}` ? (T extends ExceptTable ? never : Key ) : never] : Key extends `${infer T}.${infer C}` ? (T extends keyof TE ? (C extends keyof TE[T] ? TE[T][C] : never) : never): never;
	}












///
// LAB / TESTS
///

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