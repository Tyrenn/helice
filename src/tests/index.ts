import { Helice } from "../index.js";
import { Join } from "../types/join.js";

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

let t0 : Join<TestEnv, {table1 : Table1}> = {
	table1 : "eeee"
}

// ! NE MARCHE PAS EN CAS DE TABLE QUI N'A PAS DE COLONNE SIMPLE


// Select devrait générer une requete SelectTable
// SelectTable.join une requete SelectEnv

let t3 = new Helice<TestEnv>()
	.select('table1').join()
	
//.join({"i:table2" : "column21/table1.column2"}).field(["table2.column21", "table1.column1@c11"])


let t1 = new Helice<TestEnv>().select("table2").join();


let exec = new Helice<TestEnv>().select("table2")
	.join({table1 : "column1/table2.column23"})
	.field(["table2.column21", "table1.column1@c11"])
	.prepare()();
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
















//////////////



// tsconfig.json: { "compilerOptions": { "strict": true } }

type Bool = true | false;

type State = {
  fieldUsed: Bool;
  joinUsed:  Bool;
  whereUsed: Bool;
  limitUsed: Bool;
};

type Initial = {
  fieldUsed: false;
  joinUsed:  false;
  whereUsed: false;
  limitUsed: false;
};

type ResultType<NewType extends any, ThisType extends any, O extends string> = Omit<Pick<NewType, keyof ThisType & keyof NewType>, O>;

class SelectBuilder {
  private q: string[] = [];

  field() {
    return this as unknown as ResultType<typeof this, "field" | "join">;
  }

  join(){
    return this as unknown as ResultType<typeof this, "join">;
  }

  where() {
    return this as unknown as ResultType<typeof this, "where">;
  }
}

function createSelect() {
  return new SelectBuilder();
}


// --- Cas qui DOIT produire une erreur ---
const q = createSelect()
	.field()
	.where()
   // <-- ERREUR TS: Argument of type 'SelectBuilder<...>' is not assignable to parameter of type 'SelectBuilder<... & { fieldUsed: false }>'.
  .build();
