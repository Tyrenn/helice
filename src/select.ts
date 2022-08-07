import { DBFilter, PostgreQueryFilter, QueryBuilder, Stringed, PrefixObject } from './types';



export class SelectQueryBuilder<Env extends TableMap>{

	#tablename : string;
	#fields? : { [key : string] : string};
	#filters : Array<PostgreQueryFilter<Partial<Schema>>> = [];
	#limit? : number;
	#offset? : number;
	#withs : {alias : string, query : QueryBuilder<any, any, any>}[] = [];

	constructor(tablename : string){
		this.#tablename = tablename; // Or a querybuilder ?
	}


	quild(): { text: string; values: any[]; nbvalues: number; } {
		throw new Error('Method not implemented.');
	}

	limit(l : number) : SelectQueryBuilder<Schema, Fields, Tablename>{
		this.#limit = l;
		return this;
	}

	where(f : DBFilter<Schema>) : SelectQueryBuilder<Schema, Fields, Tablename>{
		this.#filters = Array.isArray(f) ? [...this.#filters, ...f] : [...this.#filters, f];
		return this;
	}

	fields<F extends Fields,>(f : F) : SelectQueryBuilder<Schema, F, Tablename>{
		this.#fields = f;
		return this;
	}

	with<Alias extends string, OF,>(alias : Alias, query : QueryBuilder<any, OF, Alias, any>) : SelectQueryBuilder<Schema, Fields, Tablename, With & { Alias : OF }>{
		this.#withs.push({alias, query});
		return this;
	}

	from<FromName extends string,>(fromname : FromName) {

	}
/*
	join<T extends string, C extends string, A extends string,>(type : string, joins : Join<Tablenames | A, Columns, T, C>, alias :  { [T in Tablenames] : A}) : SelectQueryBuilder<Tablenames | A | T, Columns | C>
	join<T extends string, C extends string>(type : string, joins : Join<Tablenames, Columns, T, C>) : SelectQueryBuilder<Tablenames | T, Columns | C>
	join<T extends string, C extends string, A extends string,>(type : string, joins : Join<Tablenames | A | T, Columns, T, C>, alias? : { [T in Tablenames] : A}) : SelectQueryBuilder<Tablenames | A | T, Columns | C>{
		return this as SelectQueryBuilder<Tablenames | A | T, Columns | C>;
	}*/

	join(joins : Join<Env>, type : string = 'inner'){
		return this;
	}

	innerjoin(joins : TypedJoin<Env>){
		return this;
	}

	leftjoin(joins : TypedJoin<Env>){
		return this;
	}

	rightjoin(joins : TypedJoin<Env>){
		return this;
	}
}

type Table1 = {
	column1 : string;
	column2 : number;
}

interface Table2{
	column21 : number;
	column22 : string;
}

let test1 : SelectQueryBuilder<FlattenNestedTableMap<{table1 : Table1, table2 : Table2}>> = new SelectQueryBuilder('big');

let test2 = test1.join({"i:table1:column2" : 'table2:column21'});

//let teest = test2.join('e', );

//type essai = keyof typeof test3;
//type essai2 = typeof test3[essai];

// env({EEE : 'ee' | 'ee'})

type ExtractPropsKey<T, TProps extends T[keyof T]> = {
	[P in keyof T]: T[P] extends TProps ? P : never;
}[keyof T];

type ExtractTablesKey<T, Tables extends string> = {
	[P in keyof T] : P extends `${Tables}:${string}` ? P : never;
}[keyof T]

type ExcludeTables<T, Tables extends string> = Omit<T, ExtractTablesKey<T, Tables>>;

type ExtractTables<T, Tables extends string> = Pick<T, ExtractTablesKey<T, Tables>>;

type ExtractProps<T, TProps extends T[keyof T]> = Pick<T, ExtractPropsKey<T, TProps>>;

type ExtractNestedPropKeys<CO extends {[key : string] : {[key : string] : any}}> = keyof {
	[Key in (keyof CO) as Key extends string ? `${Key}:${keyof CO[Key] extends string ? keyof CO[Key] : never}` : never] : string;
}

type SameType<Type extends {[key : string] : any}> = {
	[Key in keyof Type]? : ExtractPropsKey<Type, Type[Key]>
}

type SameTypeDifferentTable<Type extends {[key : string] : any}> = {
	[Key in keyof Type]? : Key extends `${infer U}:${string}` ? Exclude<ExtractPropsKey<Type, Type[Key]>, `${U}:${string}`> : never
};

type Join<Env extends TableMap> = PrefixObject<SameTypeDifferentTable<Env>, 'i:' | '' | 'l:' | 'r:'>;
type TypedJoin<Env extends TableMap> = SameTypeDifferentTable<Env>;


type FlattenNestedTableMap<Nested extends {[key : string] : {[key : string] : any}}> = {
	[Key in ExtractNestedPropKeys<Nested>] : Key extends `${infer T}:${infer C}` ? Nested[T][C] : never;
}

type TableMap = { [key : string] : any};