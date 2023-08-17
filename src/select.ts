import {Environment, Join, Field, Where, JoinExceptTables, ExtractTableFromJoin, Table} from './types';

export class SelectQueryBuilder<QEnv extends Environment, QAccTables extends keyof QEnv, QTableResult extends Table>{

	#table : keyof QEnv;
	#joins : Map<string, string> = new Map();
	#aliases : Map<string, string> = new Map();
	#where : any;	// Must be typed. With type evolution at each where calls. This way can produce a valid value tuple type from it.
	#groupby : Array<string> = [];
	#orderby : Array<{[key : string] : string}> = [];
	#limit? : number;
	#fetch? : number;
	#fields : any; // Must be typed. With type evolution at each fields and alias callss. This way can produce valid result type.
	#offset? : number;

	constructor(table : keyof QEnv){
		this.#table = table;
		this.#where = undefined;
		this.#fields = undefined
	}

	// Should retrun a function ready to accept where, limit, offset parameters
	quild(){
		//
	}

	// Should return the query as static. OR as Query<typeof values needed> => get text, get values, exec(with new values or nothing)
	build() : {text: string, values : any[]} {
		/*
		* Give back a function that take no parameters other than the static ones
		*/
		return {text : "", values : []}
	}

	exec() : {
		/*
		* Execute the query as is
		*/
	}

	get text() : string {
		/*
		* Give back the query text so far builded with no static values
		*/
		return ""
	}

	get values() : any[]{
		/*
		* Give back the query static values from where 
		*/
		return []
	}

	limit(limit : number){
		this.#limit = limit;
		return this;
	}

	offset(){

		return this;
	}

	fetch(fetch : number){
		this.#fetch = fetch;
		return this;
	}

	groupby(){
		/**
		* TODO
		 */
		//this.#groupby = [...this.#groupby, ...groupby];
		return this;
	}

	orderby(){
		/**
		* TODO
		*/
		
		//this.#orderby = [...this.#orderby, ...this.#orderby];
		return this;
	}

	where<W extends Where<QEnv>>(where : W) : SelectQueryBuilder<QEnv, QAccTables, QTableResult>{
		// ! Alias should change actual saved where.
		//this.#where = {...this.#where, ...where};
		return this;
	}

	fields<F extends Field<Pick<QEnv, QAccTables>>>(fields : F) : SelectQueryBuilder<QEnv, QAccTables>{
		// if(fields === '*'){
		// 	this.#fields = '*' as QFields & F;
		// 	return this as any
		// }
		// if(this.#fields && this.#fields !== '*')
		// 	this.#fields = {...this.#fields as Fields<QAccEnv>, ...fields} as QFields & F
		// else
		// 	this.#fields = fields as QFields & F;
		return this;
	}

	// alias<A extends Alias<QEnv>>(aliases : A) : SelectQueryBuilder<AliasEnv<QEnv, A>, AliasString<QEnv, QFrom, A>, AliasEnv<QAccEnv, A>>{
	// 	for(const [k, v] of Object.entries(aliases)){
	// 		this.#aliases.set(v as string, k)
	// 	}
	// 	return this as any;
	// }

	join<J extends JoinExceptTables<QEnv, QAccTables>>(joins : J) : SelectQueryBuilder<QEnv, QAccTables | ExtractTableFromJoin<J>> {
		return this;
	}


	// Usable for type monitoring
	debugEnvKey(keyenv : keyof QEnv){};
	debugAccTables(accenv : QAccTables){};
	debugEnv(env : QEnv){};
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





/**

Select clause object :
{
	prop : ''
	prefix : {
		prop : 'alias'
	}
}


Where clause object : 

{
	prop : [] | typeof prop
	"operator:prop" : [] | typeof
	prop : {
		_ : [] | '',
		otherthanprop :  [] | typeof
	}
}

{
	a : "a",
	b : [{
			_ : "b2",
			a : "a2",
		},
		{
			_ : "b1",
			a : "a1"
		},
		{
			_ : "b3",
			c : [{
				_ : "c1",
				d : "d1"
			},
			{
				_ : "c2",
				d : "d2"
			}
			]
		}
}

Will translate in :
	a = "a" 
	AND 
	(
			(b = "b2" AND a = "a2") 
		OR (b = "b1" AND a = "a1") 
		OR (b = "b3" AND 
				(
						(c = "c1" AND d = "d1") 
					OR (c = "c2" AND d = "d2")
				)
			)
	)

Set clause :
{
	prop: value | null | undefined // undefined is removed
}

 */