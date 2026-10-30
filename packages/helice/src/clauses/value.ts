
/****************
		VALUE
*****************/

	type Defaulted<T> = {[Prop in keyof T] : T[Prop] | 'DEFAULT'};

	type Nulled<T> = {[Prop in keyof T] : T[Prop] | null};

	export type Insert<T> = Partial<Nulled<Defaulted<T>>> | Partial<Nulled<Defaulted<T>>>[];

