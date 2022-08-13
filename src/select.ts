import { QueryEnvironment, Join, TypedJoin, Where, OrderBy, GroupBy, AliasEnv, NarrowTableEnv, NarrowJoinEnv, Alias, Fields, AliasString, CheckKeyOfEnv, NarrowedEnv, ExcludeTableEnv } from './types';



export class SelectQueryBuilder<Env extends QueryEnvironment, Tablefrom extends keyof Env, AccEnv extends NarrowedEnv<Env> = NarrowTableEnv<Env, Tablefrom>>{

	#tablename : string;
	#joins : Map<string, string> = new Map();
	#aliases : Map<string, string> = new Map();
	#wheres : Array<{[key : string] : any}> = [];
	#groupby : Array<string> = [];
	#orderby : Array<{[key : string] : string}> = [];
	#limit? : number;
	#fetch? : number;
	#fields : Map<string, string> = new Map();

	constructor(tablename : Tablefrom){
		this.#tablename = tablename as string;
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
		this.#wheres = [...this.#wheres, where];
		return this;
	}

	fields(fields : Fields<AccEnv>){
		for(const [k, v] of Object.entries(fields)){
			this.#fields.set(k, v as string)
		}
		return this;
	}

	alias<A extends Alias<Env>>(aliases : A) : SelectQueryBuilder<AliasEnv<Env, A>, AliasString<Env, Tablefrom, A>, AliasEnv<AccEnv, A>>{
		for(const [k, v] of Object.entries(aliases)){
			this.#aliases.set(v as string, k)
		}
		return this as any;
	}

	join<J extends Join<Env, AccEnv>>(joins : J) : SelectQueryBuilder<Env, Tablefrom, AccEnv & NarrowJoinEnv<Env, J>>;
	join<J extends Join<Env, AccEnv>>(joins : J, type : 'left' | 'right' | 'inner' | undefined) : SelectQueryBuilder<Env, Tablefrom, AccEnv & NarrowJoinEnv<Env, J>>;
	join<J extends Join<Env, AccEnv>, A extends Alias<Env>>(joins : J, type : 'left' | 'right' | 'inner' | undefined, aliases : A) : SelectQueryBuilder<AliasEnv<Env, A>, AliasString<Env,Tablefrom, A>, AliasEnv<AccEnv, A> & NarrowJoinEnv<AliasEnv<Env, A>, J>>;
	join<J extends Join<Env, AccEnv>, A extends Alias<Env>>(joins : J, type? : 'left' | 'right' | 'inner' | undefined, aliases? : A) : SelectQueryBuilder<Env, Tablefrom, AccEnv & NarrowJoinEnv<Env, J>> | SelectQueryBuilder<AliasEnv<Env, A>, AliasString<Env, Tablefrom, A>, AliasEnv<AccEnv, A> & NarrowJoinEnv<AliasEnv<Env, A>, J>>{
		if(aliases)
			for(const [k, v] of Object.entries(aliases)){
				this.#aliases.set(v as string, k)
			}
		
		for(let [k, v] of Object.entries(joins)){
			if(!k.match(/:/))
				k = type ? type + ':' + k : 'i:' + k
			this.#joins.set(k, v as string)
		}
		return this as any;
	}

	innerjoin<J extends TypedJoin<Env, AccEnv>, A extends Alias<Env>>(joins : J) : SelectQueryBuilder<Env, Tablefrom, AccEnv & NarrowJoinEnv<Env, J>>;
	innerjoin<J extends TypedJoin<Env, AccEnv>, A extends Alias<Env>>(joins : J, aliases : A) : SelectQueryBuilder<AliasEnv<Env, A>, AliasString<Env, Tablefrom, A>, AliasEnv<AccEnv, A> & NarrowJoinEnv<AliasEnv<Env, A>, J>>;
	innerjoin<J extends TypedJoin<Env, AccEnv>, A extends Alias<Env>>(joins : J, aliases? : A) : SelectQueryBuilder<Env, Tablefrom, AccEnv & NarrowJoinEnv<Env, J>> | SelectQueryBuilder<AliasEnv<Env, A>, AliasString<Env, Tablefrom, A>, AliasEnv<AccEnv, A> & NarrowJoinEnv<AliasEnv<Env, A>, J>>{
		if(aliases)
			for(const [k, v] of Object.entries(aliases)){
				this.#aliases.set(v as string, k)
			}
		for(const [k, v] of Object.entries(joins)){
			this.#joins.set('i:' + k, v as string)
		}
		return this as any;
	}
	
	leftjoin<J extends TypedJoin<Env, AccEnv>, A extends Alias<Env>>(joins : J) : SelectQueryBuilder<Env, Tablefrom, AccEnv & NarrowJoinEnv<Env, J>>;
	leftjoin<J extends TypedJoin<Env, AccEnv>, A extends Alias<Env>>(joins : J, aliases : A) : SelectQueryBuilder<AliasEnv<Env, A>, AliasString<Env, Tablefrom, A>, AliasEnv<AccEnv, A> & NarrowJoinEnv<AliasEnv<Env, A>, J>>;
	leftjoin<J extends TypedJoin<Env, AccEnv>, A extends Alias<Env>>(joins : J, aliases? : A) : SelectQueryBuilder<Env, Tablefrom, AccEnv & NarrowJoinEnv<Env, J>> | SelectQueryBuilder<AliasEnv<Env, A>, AliasString<Env, Tablefrom, A>, AliasEnv<AccEnv, A> & NarrowJoinEnv<AliasEnv<Env, A>, J>>{
		if(aliases)
			for(const [k, v] of Object.entries(aliases)){
				this.#aliases.set(v as string, k)
			}
		for(const [k, v] of Object.entries(joins)){
			this.#joins.set('l:' + k, v as string)
		}
		return this as any;
	}

	rightjoin<J extends TypedJoin<Env, AccEnv>, A extends Alias<Env>>(joins : J) : SelectQueryBuilder<Env, Tablefrom, AccEnv & NarrowJoinEnv<Env, J>>;
	rightjoin<J extends TypedJoin<Env, AccEnv>, A extends Alias<Env>>(joins : J, aliases : A) : SelectQueryBuilder<AliasEnv<Env, A>, AliasString<Env, Tablefrom, A>, AliasEnv<AccEnv, A> & NarrowJoinEnv<AliasEnv<Env, A>, J>>;
	rightjoin<J extends TypedJoin<Env, AccEnv>, A extends Alias<Env>>(joins : J, aliases? : A) : SelectQueryBuilder<Env, Tablefrom, AccEnv & NarrowJoinEnv<Env, J>> | SelectQueryBuilder<AliasEnv<Env, A>, AliasString<Env, Tablefrom, A>, AliasEnv<AccEnv, A> & NarrowJoinEnv<AliasEnv<Env, A>, J>>{
		if(aliases)
			for(const [k, v] of Object.entries(aliases)){
				this.#aliases.set(v as string, k)
			}
		for(const [k, v] of Object.entries(joins)){
			this.#joins.set('r:' + k, v as string)
		}
		return this as any;
	}


	// Usable for type monitoring
	debugAccEnvKey(keyaccenv : keyof AccEnv){};
	debugEnvKey(keyenv : keyof Env){};
	debugAccEnv(accenv : AccEnv){};
	debugEnv(env : Env){};
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

// PAS NORMAL, devrait déjà être colley
let test1 = new SelectQueryBuilder<TestEnv, 'table1'>('table1').alias({'alias3' : "table3"}).innerjoin({'table1.column1' : 'table2.column22', 'table1.column2' : 'table2.column21'}).alias({'anzfzf' : 'alias3'}).fields({'table1.column1' : ''});

let test2 = new SelectQueryBuilder<TestEnv, 'table1'>('table1')

type testj = {'table1.column1' : 'table2.column22', 'table1.column2' : 'table2.column21'}

let testEvv : keyof NarrowTableEnv<TestEnv, 'table1'>;

let testAccEnv :  keyof NarrowJoinEnv<TestEnv, testj>;

/** Starts from an Environment and give Joins... 


Le joints global de l'objet résulte des joins réalisés avec la méthode join.
=> Débloque des possibilités de selection de champs.
=> Si on a fait un join entre table1.column1 et une autre table1.column2 => on peut selectionner des champs en particulier.
=> On peut 

=> Le champ global devrait être un ensemble réduit du env des columns selectionnable. Influencé par le nom de la table de départ et les joins.

=> 
**/