export type Obj = {
	[column: string]: any;
}

/**
* Transform every none array properties in possible array
**/
export type Arrayed<T> = {
	[Prop in keyof T] : Array<T[Prop] extends (infer U)[] ? U : T[Prop]> | (T[Prop] extends (infer U)[] ? U : T[Prop]) | T[Prop]
}

/**
 * Prefixing object keys with specific string
 */
export type PrefixObject<T, P extends string> = {
	[K in keyof T as K extends string ? `${P}${K}` : never]: T[K]
}



/**
 * Type for PostgreSQLQueryFilter
 */

type prefixdotted<T, P extends string> = {
	[K in keyof T as K extends string ? `${P}:${K}` : never]: T[K]
}

type arrayprefixdotted<T, P extends string> = {
	[K in keyof T as K extends string ? `[${P}]:${K}` : never]: T[K]
}

type pc<T, P extends string> = prefixdotted<Arrayed<T>,P> & arrayprefixdotted<Arrayed<T>, P>;

export type PostgreQueryFilter<T> = Arrayed<T> & 
	pc<T, ''> & 
	pc<T, '='> &
	pc<T, '<>'> &
	pc<T, '!='> &
	pc<T, '>'> &
	pc<T, '>='> &
	pc<T, '<'> &
	pc<T, '<='> &
	pc<T, '~~'> &
	pc<T, '~~*'> &
	pc<T, '!~~'> &
	pc<T, '!~~*'>



/**
 * Transform every properties of an object to string if not object
 */
export type Stringed<T> = {
	[Prop in keyof T] : string;
}


export type DBFilter<O> = PostgreQueryFilter<Partial<O>> | PostgreQueryFilter<Partial<O>>[];



export interface QueryBuilder<Schema, Fields, Tablename>{
	quild() : { text : string, values : any[], nbvalues : number};
}
