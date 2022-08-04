import { DBFilter, PostgreQueryFilter, QueryBuilder, Stringed } from './types';



export class SelectQueryBuilder<Tablenames extends string, Columns extends string>{

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

	join<T extends string, C extends string, A extends string,>(type : string, joins : Join<Tablenames | A, Columns, T, C>, alias :  { [T in Tablenames] : A}) : SelectQueryBuilder<Tablenames | A | T, Columns | C>
	join<T extends string, C extends string>(type : string, joins : Join<Tablenames, Columns, T, C>) : SelectQueryBuilder<Tablenames | T, Columns | C>
	join<T extends string, C extends string, A extends string,>(type : string, joins : Join<Tablenames | A, Columns, T, C>, alias? : { [T in Tablenames] : A}) : SelectQueryBuilder<Tablenames | A | T, Columns | C>{
		return this as SelectQueryBuilder<Tablenames | A | T, Columns | C>;
	}
}

let test1 : SelectQueryBuilder<"Basic", 'Coucou'> = new SelectQueryBuilder('big');

let test2 = test1.join('r', {'Basic:Coucou' : 'a:e', 'b:Coucou'}, {'Basic' : 'b'});

let teest = test2.join('e', );

export type PrefixObject<T, P extends string> = {
	[K in keyof T as K extends string ? `${P}${K}` : never]: T[K]
}

type toArray<T extends string> =  Array<T>;

let teeest : toArray<'a' | 'b'> = ['a', 'b'];

let test3 : Readonly<Join<'a' | 'b', 'c' | 'd', string, string, string>> = { "a:c" : "aa:a"};

type essai = keyof typeof test3;
type essai2 = typeof test3[essai];

type left<T> = T extends `${infer U}:${string}` ? U : never;
type right<T> = T extends `${string}:${infer U}` ? U : never;

let x : right<"a:e"> = 'e';

type condtype<T> =  T extends string ? `${T}` : never;
type containing<Left extends string, Right extends string> = Left extends string ? `${Left}:${Right}` : never;

type Join<Tablenames extends string, Columns extends string, OtherT extends `${string}`, OtherC extends string> = {
	[T in Tablenames as T extends string ? `${T}:${Columns}` : never]? : `${OtherT}:${OtherC}`;
}


type expandingself<Keys extends string, Values extends string,> = {
	[K in (Keys | Values)]? : Values;
}

let y : expandingself<'k', 'v'> = {
	'k' : 'v',
	'v' : 'v'
}

function lel<T extends string>(y : expandingself<'k', T>){

}

lel({'k' : 'c', 'c' : 'aa', 'aa' : 'b'})

type Alias<Tablenames extends string> = {
	[T in Tablenames] : string;
}

function toJOINClause(join : obj[]){

}

/*
* WITH should be a query wrapper with fields, alias and name.
* Different types of join.
* Each table can have an alias
* Each join has an on with alias names and columne name... alias1.column1 = alias2.column2
* Join as { type, tablenamefrom, aliasfrom?, columnfrom, tablenameto, columnto}
*
* Propositions : 
* 	{ type:tablename alias : 'column' } ? Missing the tablenameto/columnto, alias not handy...
* 	{ type:tablename : { alias : '', from...}} Boilerplate...
*  { tablenamefrom:columnfrom : tablenameto:columnto }
* [type]join(type, [{tablenamefrom : columnto}, {tablenameto : columnto}])
* alias method
* 
* from can be simple string or
*  { 'i:tablename' : 'one.id'}
* select(from)
*
*
*

*/