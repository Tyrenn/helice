import { Helice } from "../index.js";

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

let t3 = new Helice<TestEnv>().select('table1').join({"l:table2@test" : "column22/table1.column1"}).field('');

let t1 = new Helice<TestEnv>().select("table2").field("table2.column21@aaa").build({where : true});
t1({"table2.column22" : "blabla"})


new Helice<TestEnv>().select("table2")
	.join({table1 : "column1/table2.column23"})
	.field({"table2.column21" : "aaa"})
	.where({
		"table1.column2" : 4,
		"&&:test" : [{
			"<:table2.column21" : 5
		},{
			"<:table1.column2" : 5
		}]
	}).build({limit : true})(3);