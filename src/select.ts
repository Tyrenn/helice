import { Field, FieldHasDuplicateAliases, TableFromField } from "./clauses/field";
import { EnvironmentFromJoin, Join, JoinHasDuplicateAliases } from "./clauses/join";
import { mergeWHEREAsAND, Where, oldwhereToSQL } from "./clauses/where";
import { DefaultSyntaxKeys, SyntaxKeys } from "./syntaxkeys";
import { CommonTableExpression, Environment, MethodResultType, PreparedQueryArguments, PreparedQueryOptions, Table } from "./types";

type PreparedSelectQueryArguments<AccessibleEnv extends Environment, SK extends SyntaxKeys = DefaultSyntaxKeys> = {
	field? : Field<AccessibleEnv, undefined, SK>,
	where? : Where<AccessibleEnv, SK>,
	limit? : number
}

export class SelectQuery<
	Env extends Environment, 
	AccEnv extends Environment, 
	TableResult extends Table,
	From extends keyof AccEnv | undefined,

	SK extends SyntaxKeys
> implements CommonTableExpression<TableResult, PreparedSelectQueryArguments<AccEnv>> {
	
	#from : string;
	#field : Field<AccEnv, From, SK> = '*';
	#where : Where<AccEnv, SK> | undefined;
	#join : Join<Env, AccEnv, SK> | undefined;
	#limit : number | undefined;
	
	constructor(from : From & string){
		this.#from = from;
	}

	// Should retrun a function ready to accept field, where, limit, offset parameters
	prepare<A extends PreparedSelectQueryArguments<AccEnv>>(options? : PreparedQueryOptions<A>) : (args : PreparedQueryArguments<A>) => {query : string, args : any[]} {
		return (args? : PreparedQueryArguments<A>) => {
			let castedArgs : A | undefined = args as A | undefined;

			// TODO Check this part

			// let field : Field<AccEnv> | undefined = options?.field ? castedArgs?.field : undefined;
			// let where : Where<AccEnv> | undefined = options?.where ? castedArgs?.where : undefined;
			// let limit : number | undefined = options?.limit ? castedArgs?.limit : undefined;
			
			// let flattenThisWhere = this.#where ? whereToSQL(this.#where) : undefined;
			// let flattenWhere = where ? whereToSQL(where, flattenThisWhere?.nextvar ?? 1) : undefined;

			// // JOIN LOGIC 
			// let joinSQL = "";
			// if(this.#join)
			// 	for(let key in this.#join){	
			// 		joinSQL += ``
			// 	}

			// // FIELD LOGIC
			// // OFFSET
			// // ORDER BY
			// const qlimit = limit ?? this.#limit;
			// const qwhere = mergeWHEREAsAND(flattenThisWhere?.where, flattenWhere?.where);
			

			// const query = {
			// 	text: `SELECT TODO\n`
			// 			+ `FROM ${String(this.#from)}\n`
			// 			+ `WHERE ${qwhere}\n`
			// 			+ `${qlimit ? "LIMIT " + qlimit : ""}\n`,
			// 	values : [...(flattenThisWhere?.values ?? []), ...(flattenWhere?.values ?? [])]
			// }

			// console.log(query.text, query.values);
			return "" as any; // TODO
		}
	}
	

	field<const F extends Field<AccEnv, From, SK>, Invalid extends FieldHasDuplicateAliases<F, SK>>(
		field : Invalid extends false ? F : "[WARNING] : Duplicated Column Alias" & never
	){
		this.#field = field as F;
		return (this as unknown) as MethodResultType<SelectQuery<Env, AccEnv, TableFromField<AccEnv, F, From, SK>, From, SK>, typeof this, "field" | "join">;
	}


	/**
	 * Also detects duplicate aliases
	 * @param join 
	 * @returns 
	 */
	join<J extends Join<Env, AccEnv, SK>, Invalid extends JoinHasDuplicateAliases<J, keyof AccEnv & string, SK>>(
		join : Invalid extends false ? J : "[WARNING] : Duplicated Column Alias" & never
	){
		this.#join = join as J;
		return (this as unknown ) as MethodResultType<SelectQuery<Env, EnvironmentFromJoin<Env, AccEnv, J, SK>, TableResult, undefined, SK>, typeof this, "join">;
	}

	where<W extends Where<AccEnv, SK>>(
		where : W
	){
		this.#where = where;
		return (this as unknown) as MethodResultType<SelectQuery<Env, AccEnv, TableResult, From, SK>, typeof this, "where">;
	}

	limit(
		limit : number
	){
		this.#limit = limit;
		return (this as unknown) as MethodResultType<SelectQuery<Env, AccEnv, TableResult, From, SK>, typeof this, "limit">;
	}
}


/// Has option allows to keep track of what the query has in terms of parameters
/// Need a WhereProps that also keep track of props to be able to override values ?
/// multiple where ? => Add in where... and values ?
