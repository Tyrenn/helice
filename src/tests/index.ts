import { Helice } from "../index.js";
import { VerboseSyntaxKeys } from "../syntaxkeys";

type Table1 = {
	column1 : string;
	column2 : number;
	column3 : 'eee';
	column4 : Array<string>;
}

type Table2 = {
	column21 : number;
	column22 : string;
	column23 : "bbb";
}

type Table3 = {
	column31 : Array<number>;
	column32 : Array<string>;
}

type TestEnv = {
	table1 : Table1;
	table2 : Table2;
	table3 : Table3;
}


// Select devrait générer une requete SelectTable
// SelectTable.join une requete SelectEnv

let t3 = new Helice<TestEnv, VerboseSyntaxKeys>()
	.select('table1').join({
		table1 : "column1 JOIN table1.column1",
		table2 : {
			"JOIN" : "inner",
		}
	})


let t1 = new Helice<TestEnv>().select("table2").join();
;
	// .where({
	// 	"table1.column2" : 4,
	// 	"&&:test" : [{
	// 		"<:table2.column21" : 5
	// 	},{
	// 		"<:table1.column2" : 5
	// 	}]
	// }).prepare({limit : true})(1);

	// .field({
	// 	"table1.column1" : true,
	// 	"table1.column3" : "alias1",
	// 	"{}:obj" : {
	// 		"table1.column2" : true,
	// 		"table2.column22" : true
	// 	}
	// })

//let t = exec.