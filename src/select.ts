import { QueryEnvironment, Join, TypedJoin, Where, OrderBy, GroupBy, AliasEnv, NarrowTableEnv, NarrowJoinEnv, Alias, Fields } from './types';



export class SelectQueryBuilder<Env extends QueryEnvironment, AccEnv extends QueryEnvironment>{

	#tablename? : string;
	#joins : Array<{[key : string] : string}> = [];
	#aliases : Array<{[key : string] : string}> = [];
	#wheres : Array<{[key : string] : any}> = [];
	#groupby : Array<string> = [];
	#orderby : Array<{[key : string] : string}> = [];
	#limit? : number;
	#fetch? : number;

	constructor(){}

	from<T extends keyof Env>(tablename : T) : SelectQueryBuilder<Env, NarrowTableEnv<Env, T extends string ? T : never> & NarrowTableEnv<AccEnv, T extends string ? T : never>>{
		return this as SelectQueryBuilder<Env, NarrowTableEnv<Env, T extends string ? T : never> & NarrowTableEnv<AccEnv, T extends string ? T : never>>;
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

	where(where : Where<AccEnv>){
		return this;
	}

	fields(field : Fields<AccEnv>){
		return this;
	}

	alias<A extends Alias<Env>>(alias : A) : SelectQueryBuilder<AliasEnv<Env, A>, AliasEnv<AccEnv, A>>{
		return this as SelectQueryBuilder<AliasEnv<Env, A>, AliasEnv<AccEnv, A>>;
	}

	join<J extends Join<Env, AccEnv>>(joins : J) : SelectQueryBuilder<Env, AccEnv & NarrowJoinEnv<Env, J>>;
	join<J extends Join<Env, AccEnv>>(joins : J, type : 'left' | 'right' | 'inner' | undefined) : SelectQueryBuilder<Env, AccEnv & NarrowJoinEnv<Env, J>>;
	join<J extends Join<Env, AccEnv>, A extends Alias<Env>>(joins : J, type : 'left' | 'right' | 'inner' | undefined, alias : A) : SelectQueryBuilder<AliasEnv<Env, A>, AliasEnv<AccEnv, A> & NarrowJoinEnv<AliasEnv<Env, A>, J>>;
	join<J extends Join<Env, AccEnv>, A extends Alias<Env>>(joins : J, type? : 'left' | 'right' | 'inner' | undefined, alias? : A) : SelectQueryBuilder<Env, AccEnv & NarrowJoinEnv<Env, J>> | SelectQueryBuilder<AliasEnv<Env, A>, AliasEnv<AccEnv, A> & NarrowJoinEnv<AliasEnv<Env, A>, J>>{
		return this;
	}

	innerjoin<J extends TypedJoin<Env, AccEnv>, A extends Alias<Env>>(joins : J) : SelectQueryBuilder<Env, AccEnv & NarrowJoinEnv<Env, J>>;
	innerjoin<J extends TypedJoin<Env, AccEnv>, A extends Alias<Env>>(joins : J, alias : A) : SelectQueryBuilder<Env, AccEnv & NarrowJoinEnv<Env, J>>
	innerjoin<J extends TypedJoin<Env, AccEnv>, A extends Alias<Env>>(joins : J, alias? : A) : SelectQueryBuilder<Env, AccEnv & NarrowJoinEnv<Env, J>> | SelectQueryBuilder<AliasEnv<Env, A>, AliasEnv<AccEnv, A> & NarrowJoinEnv<AliasEnv<Env, A>, J>>{
		return this;
	}

	leftjoin<J extends TypedJoin<Env, AccEnv>, A extends Alias<Env>>(joins : J) : SelectQueryBuilder<Env, AccEnv & NarrowJoinEnv<Env, J>>;
	leftjoin<J extends TypedJoin<Env, AccEnv>, A extends Alias<Env>>(joins : J, alias : A) : SelectQueryBuilder<Env, AccEnv & NarrowJoinEnv<Env, J>>
	leftjoin<J extends TypedJoin<Env, AccEnv>, A extends Alias<Env>>(joins : J, alias? : A) : SelectQueryBuilder<Env, AccEnv & NarrowJoinEnv<Env, J>> | SelectQueryBuilder<AliasEnv<Env, A>, AliasEnv<AccEnv, A> & NarrowJoinEnv<AliasEnv<Env, A>, J>>{

		return this;
	}

	rightjoin<J extends TypedJoin<Env, AccEnv>, A extends Alias<Env>>(joins : J) : SelectQueryBuilder<Env, AccEnv & NarrowJoinEnv<Env, J>>;
	rightjoin<J extends TypedJoin<Env, AccEnv>, A extends Alias<Env>>(joins : J, alias : A) : SelectQueryBuilder<Env, AccEnv & NarrowJoinEnv<Env, J>>
	rightjoin<J extends TypedJoin<Env, AccEnv>, A extends Alias<Env>>(joins : J, alias? : A) : SelectQueryBuilder<Env, AccEnv & NarrowJoinEnv<Env, J>> | SelectQueryBuilder<AliasEnv<Env, A>, AliasEnv<AccEnv, A> & NarrowJoinEnv<AliasEnv<Env, A>, J>>{
		return this;
	}
}


type Table1 = {
	column1 : string;
	column2 : number;
	column3 : 'eee';
	column4 : Array<string>;
}

interface Table2{
	column21 : number;
	column22 : string;
	column23 : "bbb";
}

interface Table3{
	column31 : Array<number>;
	column32 : Array<string>;
}

type TestEnv = {
	table1 : Table1;
	table2 : Table2;
	table3 : Table3;
}

//SelectQueryBuilder<{table1 : Table1, table2 : Table2}>
// new SelectQueryBuilder('big');
let test1 = new SelectQueryBuilder<TestEnv, NarrowTableEnv<TestEnv, "table1" | 'table2'>>().alias({'alias3' : "table3"}).innerjoin({'table2.column23' : '' });


/** Starts from an Environment and give Joins... 


Le joints global de l'objet résulte des joins réalisés avec la méthode join.
=> Débloque des possibilités de selection de champs.
=> Si on a fait un join entre table1.column1 et une autre table1.column2 => on peut selectionner des champs en particulier.
=> On peut 

=> Le champ global devrait être un ensemble réduit du env des columns selectionnable. Influencé par le nom de la table de départ et les joins.

=> 
**/

