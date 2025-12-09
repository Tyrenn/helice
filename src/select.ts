import {Environment, Join, EnvironmentFromJoin, Where, Field, Table, TableFromField, JoinHasDuplicateAliases, FieldHasDuplicateAliases} from './types';
import { mergeWHEREClausesAsAND, whereToSQL } from './utils';

type SelectQueryQuildOptions = {
	where? : boolean,
	limit? : boolean,
	field? : boolean	
}

type QueryParamFromOptions<Options extends SelectQueryQuildOptions, AccessibleEnv extends Environment> = [
	...(Options["field"] extends true ? [Field<AccessibleEnv>] : []), 
	...(Options["where"] extends true ? [Where<AccessibleEnv>] : []),
	...(Options["limit"] extends true ? [number] : []),
	]


// Prepare donne la query avec le res
// WITH à gérer
// to String devrait donner la query sans le reste

// HasOptions extends Required<SelectQueryQuildOptions> = {where : false, limit : false, field : false}
export class SelectQuery<Env extends Environment, AccEnv extends Environment, TableResult extends Table, From extends keyof AccEnv | undefined>{
	
	#from : string;	// TODO The fact that never is passed after join render all very difficult, Maybe just not type #from with it ? Rather with AccEnv
	#field : Field<AccEnv, From> = '*';
	#where : Where<AccEnv> | undefined;
	#join : Join<Env, AccEnv> | undefined;
	#limit : number | undefined;
	
	constructor(from : From & string){
		this.#from = from;
	}

	// Should retrun a function ready to accept field, where, limit, offset parameters
	prepare<O extends SelectQueryQuildOptions>(options? : O) : (...args : QueryParamFromOptions<O, AccEnv>) => TableResult {
		return (...args : QueryParamFromOptions<O, AccEnv>) => {
			let indexField = options?.field ? 1 : 0;
			let indexWhere = options?.where ? indexField + 1 : indexField;
			let indexLimit = options?.limit ? indexWhere + 1 : indexWhere;

			let field : Field<AccEnv> | undefined = options?.field ? args[indexField - 1] as Field<AccEnv> : undefined;
			let where : Where<AccEnv> | undefined = options?.where ? args[indexWhere - 1] as Where<AccEnv> : undefined;
			let limit : number | undefined = options?.limit ? args[indexLimit - 1] as number : undefined;
			
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
	

	field<const F extends Field<AccEnv, From>, Invalid extends FieldHasDuplicateAliases<F>>(field : Invalid extends false ? F : Invalid) {
		this.#field = field as F;
		return (this as unknown) as SelectQuery<Env, AccEnv, TableFromField<AccEnv, F, From>, From>;
	}


	/**
	 * Also detects duplicate aliases
	 * @param join 
	 * @returns 
	 */
	join<J extends Join<Env, AccEnv>, Invalid extends JoinHasDuplicateAliases<J, keyof AccEnv & string>>(join : Invalid extends false ? J : Invalid) : SelectQuery<Env, EnvironmentFromJoin<Env, AccEnv, J>, TableResult, undefined>{
		this.#join = {...(this.#join ?? {}), ...(join as J)};
		return (this as unknown ) as SelectQuery<Env, EnvironmentFromJoin<Env, AccEnv, J>, TableResult, undefined>;
	}

	where<W extends Where<AccEnv>>(where : W) : SelectQuery<Env, AccEnv, TableResult, From>{
		this.#where = {...this.#where, ...where};
		return this;
	}

	limit(limit : number) : SelectQuery<Env, AccEnv, TableResult, From>{
		this.#limit = limit;
		return this;
	}
}


/// Has option allows to keep track of what the query has in terms of parameters
/// Need a WhereProps that also keep track of props to be able to override values ?
/// multiple where ? => Add in where... and values ?
