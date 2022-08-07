import { QueryEnvironment, Join, TypedJoin, ExpandEnv, Where, InferAlias, OrderBy, GroupBy } from './types';



export class SelectQueryBuilder<Env extends QueryEnvironment>{

	#tablename : string;
	#joins : Array<{[key : string] : string}> = [];
	#aliases : Array<{[key : string] : string}> = [];
	#wheres : Array<{[key : string] : any}> = [];
	#groupby : Array<string> = [];
	#orderby : Array<{[key : string] : string}> = [];
	#limit? : number;
	#fetch? : number;

	constructor(tablename : string){
		this.#tablename = tablename; // Or a querybuilder ?
	}


	quild(): { text: string; values: any[]; nbvalues: number; } {
		throw new Error('Method not implemented.');
	}

	limit(limit : number){
		this.#limit = limit;
		return this;
	}

	fetch(fetch : number){
		this.#fetch = fetch;
		return this;
	}

	groupby(groupby : GroupBy<Env>){
		this.#groupby = [...this.#groupby, ...groupby];
		return this;
	}

	orderby(orderby : OrderBy<Env>){
		this.#orderby = [...this.#orderby, ...this.#orderby];
		return this;
	}

	where(where : Where<Env>){
		return this;
	}

	alias<A extends {[key : string] : string}>(alias : Readonly<A>) : SelectQueryBuilder<ExpandEnv<Env, InferAlias<A>>>{
		return this;
	}

	join(joins : Join<Env>) : SelectQueryBuilder<Env>;
	join(joins : Join<Env>, type : string) : SelectQueryBuilder<Env>;
	join<A extends {[key : string] : string}>(joins : Join<Env>, type : string, alias : Readonly<A>) : SelectQueryBuilder<ExpandEnv<Env, InferAlias<A>>>;
	join<A extends {[key : string] : string}>(joins : Join<Env>, type? : string, alias? : Readonly<A>) : SelectQueryBuilder<ExpandEnv<Env, InferAlias<A>>>{
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

let test1 : SelectQueryBuilder<{table1 : Table1, table2 : Table2}> = new SelectQueryBuilder('big');

let test2 = test1.alias({'alias1' : 'table1', 'alias2' : 'table2'});

let test4 = test2.join({"alias1.column1"});	
