import {Environment, Join, EnvironmentFromJoin, Where, Field, Table, TableFromField, JoinHasDuplicateAliases, FieldHasDuplicateAliases, Simplify} from './types';
import { mergeWHEREClausesAsAND, whereToSQL } from './utils';
type PreparedSelectQueryArguments<AccessibleEnv extends Environment> = {
	field? : Field<AccessibleEnv>,
	where? : Where<AccessibleEnv>,
	limit? : number
}

type PreparedQueryOptions<Obj extends Record<any, any>> = {[key in keyof Obj]? : boolean}

type PreparedQueryOptionsIsAllFalseOrUndefined<Obj extends Record<any, any>> = {[ k in keyof Obj] : PreparedQueryOptions<Obj>[k] extends true ? k : never}[keyof Obj] extends never ? true : false;

type PreparedQueryArguments<Options extends Record<any, any>> = 
	PreparedQueryOptionsIsAllFalseOrUndefined<Options> extends true ? undefined : 
	Simplify<
		{
			[k in keyof Options as PreparedQueryOptions<Options>[k] extends true ? k : never]? : Options[k];
		}
	>;

type SelectQueryUsage = {
	field : boolean;
	join : boolean;
	where : boolean;
	limit : boolean;
}

type MethodResultType<NewType extends any, ThisType extends any, O extends string> = Omit<Pick<NewType, keyof ThisType & keyof NewType>, O>


// Prepare donne la query avec le res
// WITH à gérer
// to String devrait donner la query sans le reste

// HasOptions extends Required<SelectQueryQuildOptions> = {where : false, limit : false, field : false}
export class SelectQuery<
	Env extends Environment, 
	AccEnv extends Environment, 
	TableResult extends Table, 
	From extends keyof AccEnv | undefined
>{
	
	#from : string;
	#field : Field<AccEnv, From> = '*';
	#where : Where<AccEnv> | undefined;
	#join : Join<Env, AccEnv> | undefined;
	#limit : number | undefined;
	
	constructor(from : From & string){
		this.#from = from;
	}

	// Should retrun a function ready to accept field, where, limit, offset parameters
	prepare<A extends PreparedSelectQueryArguments<AccEnv>, O extends PreparedQueryOptions<A>>(options? : O) : (args : PreparedQueryArguments<A>) => TableResult {
		return (args? : PreparedQueryArguments<A>) => {
			let castedArgs : A | undefined = args as A | undefined;

			let field : Field<AccEnv> | undefined = options?.field ? castedArgs?.field : undefined;
			let where : Where<AccEnv> | undefined = options?.where ? castedArgs?.where : undefined;
			let limit : number | undefined = options?.limit ? castedArgs?.limit : undefined;
			
			let flattenThisWhere = this.#where ? whereToSQL(this.#where) : undefined;
			let flattenWhere = where ? whereToSQL(where, flattenThisWhere?.nextvar ?? 1) : undefined;

			// JOIN LOGIC 
			let joinSQL = "";
			if(this.#join)
				for(let key in this.#join){	
					joinSQL += ``
				}

			// FIELD LOGIC
			// OFFSET
			// ORDER BY
			const qlimit = limit ?? this.#limit;
			const qwhere = mergeWHEREClausesAsAND(flattenThisWhere?.where, flattenWhere?.where);
			

			const query = {
				text: `SELECT TODO\n`
						+ `FROM ${String(this.#from)}\n`
						+ `WHERE ${qwhere}\n`
						+ `${qlimit ? "LIMIT " + qlimit : ""}\n`,
				values : [...(flattenThisWhere?.values ?? []), ...(flattenWhere?.values ?? [])]
			}

			console.log(query.text, query.values);
			return "" as any; // TODO
		}
	}
	

	field<const F extends Field<AccEnv, From>, Invalid extends FieldHasDuplicateAliases<F>>(
		field : Invalid extends false ? F : "[WARNING] : Duplicated Column Alias" & never
	){
		this.#field = field as F;
		return (this as unknown) as MethodResultType<SelectQuery<Env, AccEnv, TableFromField<AccEnv, F, From>, From>, typeof this, "field" | "join">;
	}


	/**
	 * Also detects duplicate aliases
	 * @param join 
	 * @returns 
	 */
	join<J extends Join<Env, AccEnv>, Invalid extends JoinHasDuplicateAliases<J, keyof AccEnv & string>>(
		join : Invalid extends false ? J : "[WARNING] : Duplicated Table Alias" & never
	){
		this.#join = join as J;
		return (this as unknown ) as MethodResultType<SelectQuery<Env, EnvironmentFromJoin<Env, AccEnv, J>, TableResult, undefined>, typeof this, "join">;
	}

	where<W extends Where<AccEnv>>(
		where : W
	){
		this.#where = where;
		return (this as unknown) as MethodResultType<SelectQuery<Env, AccEnv, TableResult, From>, typeof this, "where">;
	}

	limit(
		limit : number
	){
		this.#limit = limit;
		return (this as unknown) as MethodResultType<SelectQuery<Env, AccEnv, TableResult, From>, typeof this, "limit">;
	}
}


/// Has option allows to keep track of what the query has in terms of parameters
/// Need a WhereProps that also keep track of props to be able to override values ?
/// multiple where ? => Add in where... and values ?
