import { Environment, EnvironmentField, EnvironmentFromNameAndJoin, ExtractAccessibleTableNamesFromJoin, JoinExceptTables, Table, TableField, TableResultFromEnvField, TableResultFromField} from "./types";


export class QueryBuilder<QEnv extends Environment, QTableResult extends Table>{


	with<OQTR extends Table, QB extends QueryBuilder<QEnv, OQTR>, Alias extends string>(other : QB, alias : Alias) : QueryBuilder<QEnv & {[k in Alias] : OQTR}, QTableResult>{
		return this;
	}
// => //TableResultFromField<QEnv, Field>
	select<const Name extends keyof QEnv, const Join extends JoinExceptTables<QEnv, Name>, const Field extends EnvironmentField<EnvironmentFromNameAndJoin<QEnv, Name, Join>>>(tablename : Name, join? : Join, field? : Field) : QueryBuilder<QEnv, QEnv[Name]>{
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

new QueryBuilder<TestEnv, {}>().select("table2", {"i:table1" : "column1/table2.column23"}, [])
