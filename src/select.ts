import {Environment, EnvironmentField, EnvironmentWhere, Table, TableField, TableResultFromEnvField, TableResultFromField, TableWhere} from './types';

export class SelectQueryBuilder<QTable extends Table, QTableResult extends Table>{

	#tablename : string;

	#field : TableField<QTable> = '*';
	#where : TableWhere<QTable> | undefined = undefined;

	constructor(tablename : string){
		this.#tablename = tablename;
	}

	// Should retrun a function ready to accept where, limit, offset parameters
	quild(){
		//
	}

	field<F extends TableField<QTable>>(field : F) : SelectQueryBuilder<QTable, TableResultFromField<QTable, F>>{
		this.#field = field;
		//@ts-ignore
		return this;
	}

	where<W extends TableWhere<QTable>>(where : W) : SelectQueryBuilder<QTable, QTableResult>{
		this.#where = where;
		return this;
	}
}


export class EnvironmentSelectQueryBuilder<QEnv extends Environment, QAccessEnv extends Partial<QEnv>, QTableResult extends Table>{
	#tablename : keyof QEnv;

	#field : EnvironmentField<QAccessEnv> = '*';
	#where : EnvironmentWhere<QAccessEnv> | undefined = undefined;

	constructor(tablename : keyof QEnv){
		this.#tablename = tablename;
	}

	field<EF extends EnvironmentField<QAccessEnv>>(field : EF) : EnvironmentSelectQueryBuilder<QEnv, QAccessEnv, TableResultFromEnvField<QAccessEnv, EF>>{
		this.#field = field;
		//@ts-ignore
		return this;
	}

	where<EW extends EnvironmentWhere<QAccessEnv>>(where : EW) : EnvironmentSelectQueryBuilder<QEnv, QAccessEnv, QTableResult>{
		this.#where = where;
		return this;
	}
}

const test1 = new SelectQueryBuilder<Table1, {}>("table1");
const test2 = test1.field({
	alias1 : 'column1',
	alias2 : {
		alias21 : 'column1',
		alias22 : 'column4'
	}
});


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