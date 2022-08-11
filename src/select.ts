import { QueryEnvironment, Join, TypedJoin, Where, InferAlias, OrderBy, GroupBy, LastOf, FirstOfUnion, ChangeEnvByAlias, NarrowEnvByTable, NarrowEnvByJoins, Alias } from './types';



export class SelectQueryBuilder<Env extends QueryEnvironment, AccessibleEnv extends QueryEnvironment>{

	#tablename? : string;
	#joins : Array<{[key : string] : string}> = [];
	#aliases : Array<{[key : string] : string}> = [];
	#wheres : Array<{[key : string] : any}> = [];
	#groupby : Array<string> = [];
	#orderby : Array<{[key : string] : string}> = [];
	#limit? : number;
	#fetch? : number;

	constructor(){}

	from<T extends string>(tablename : T) : SelectQueryBuilder<Env, Pick<Env, T extends string ? T : never>>{
		return this;
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

	alias<A extends Alias<Env>>(alias : A) : SelectQueryBuilder<ChangeEnvByAlias<Env, A>, ChangeEnvByAlias<AccessibleEnv, A>>{
		return this as SelectQueryBuilder<ChangeEnvByAlias<Env, A>, ChangeEnvByAlias<AccessibleEnv, A>>;
	}

	join<J extends Join<Env, AccessibleEnv>>(joins : J) : SelectQueryBuilder<Env, AccessibleEnv & NarrowEnvByJoins<Env, J>>;
	join<J extends Join<Env, AccessibleEnv>>(joins : J, type : string) : SelectQueryBuilder<Env, AccessibleEnv & NarrowEnvByJoins<Env, J>>;
	join<J extends Join<Env, AccessibleEnv>, A extends Alias<Env>>(joins : J, type : string, alias : A) : SelectQueryBuilder<ChangeEnvByAlias<Env, A>, ChangeEnvByAlias<AccessibleEnv, A> & NarrowEnvByJoins<ChangeEnvByAlias<Env, A>, J>>;
	join<J extends Join<Env, AccessibleEnv>, A extends Alias<Env>>(joins : J, type? : string, alias? : A) : SelectQueryBuilder<ChangeEnvByAlias<Env, A>, ChangeEnvByAlias<AccessibleEnv, A> & NarrowEnvByJoins<ChangeEnvByAlias<Env, A>, J>>{
		return this as SelectQueryBuilder<ChangeEnvByAlias<Env, A>, ChangeEnvByAlias<AccessibleEnv, A> & NarrowEnvByJoins<ChangeEnvByAlias<Env, A>, J>>;
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
//SelectQueryBuilder<{table1 : Table1, table2 : Table2}>
// new SelectQueryBuilder('big');
let test1 = new SelectQueryBuilder<{table1 : Table1, table2 : Table2}, NarrowEnvByTable<{table1 : Table1, table2 : Table2}, "table1">>();

// !!! INCLUDE NOT EXCLUDE...
let test4452 = test1.join({''});

///let ttt = test1.from('brfr');
let test2 = test1.alias({'alias1' : 'table1', 'alias2' : 'table2'});

let test4 = test2.join({''});	


function test<T extends string>(param : T) : T extends string ? T : never{
	return param as T extends string ? T : never;
}


/** Starts from an Environment and give Joins... 


Le joints global de l'objet résulte des joins réalisés avec la méthode join.
=> Débloque des possibilités de selection de champs.
=> Si on a fait un join entre table1.column1 et une autre table1.column2 => on peut selectionner des champs en particulier.
=> On peut 

=> Le champ global devrait être un ensemble réduit du env des columns selectionnable. Influencé par le nom de la table de départ et les joins.

=> 
**/

