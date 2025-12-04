import {Environment, EnvironmentField, EnvironmentFromJoin, EnvironmentWhere, Join, Table, TableField, TableFromEnvField, TableFromTableField, TableWhere} from './types';
import { mergeWHEREClausesAsAND, whereToSQL } from './utils';

type SelectQueryQuildOptions = {
	where? : boolean,
	limit? : boolean,
	field? : boolean	
}

type QueryParamFromOptions<Options extends SelectQueryQuildOptions, AccessibleEnv extends Environment> = [
	...(Options["field"] extends true ? [EnvironmentField<AccessibleEnv>] : []), 
	...(Options["where"] extends true ? [EnvironmentWhere<AccessibleEnv>] : []),
	...(Options["limit"] extends true ? [number] : []),
	]


// Prepare donne la query avec le res
// WITH à gérer
// to String devrait donner la query sans le reste

// HasOptions extends Required<SelectQueryQuildOptions> = {where : false, limit : false, field : false}
export class SelectQuery<GlobalEnv extends Environment, From extends keyof GlobalEnv, AccessibleEnv extends Pick<GlobalEnv, From> & Environment = Pick<GlobalEnv, From>, TableResult extends Table = {}>{
	
	#from : From;
	#field : EnvironmentField<AccessibleEnv> = '*';
	#where : EnvironmentWhere<AccessibleEnv> | undefined;
	#join : Join<GlobalEnv> | undefined;
	#limit : number | undefined;
	constructor(from : From){
		this.#from = from;
	}

	// Should retrun a function ready to accept field, where, limit, offset parameters
	prepare<O extends SelectQueryQuildOptions>(options? : O) : (...args : QueryParamFromOptions<O, AccessibleEnv>) => TableResult {
		return (...args : QueryParamFromOptions<O, AccessibleEnv>) => {
			let indexField = options?.field ? 1 : 0;
			let indexWhere = options?.where ? indexField + 1 : indexField;
			let indexLimit = options?.limit ? indexWhere + 1 : indexWhere;

			let field : EnvironmentField<AccessibleEnv> | undefined = options?.field ? args[indexField - 1] : undefined;
			let where : EnvironmentWhere<AccessibleEnv> | undefined = options?.where ? args[indexWhere - 1] as EnvironmentWhere<AccessibleEnv> : undefined;
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
	
	field<F extends EnvironmentField<AccessibleEnv, From>>(field : F) : SelectQuery<GlobalEnv, From, AccessibleEnv, TableFromEnvField<AccessibleEnv, F, From>>{
		this.#field = field;
		return (this as unknown) as SelectQuery<GlobalEnv, From, AccessibleEnv, TableFromEnvField<AccessibleEnv, F, From>>;
	}

	join<J extends Join<GlobalEnv>>(join : J) : SelectQuery<GlobalEnv, From, EnvironmentFromJoin<GlobalEnv, AccessibleEnv, J>, TableResult>{
		this.#join = {...(this.#join ?? {}), ...join};
		return this as SelectQuery<GlobalEnv, From, EnvironmentFromJoin<GlobalEnv, AccessibleEnv, J>, TableResult>;
	}

	where<W extends EnvironmentWhere<AccessibleEnv>>(where : W) : SelectQuery<GlobalEnv, From, AccessibleEnv, TableResult>{
		this.#where = {...this.#where, ...where};
		return this;
	}

	limit(limit : number) : SelectQuery<GlobalEnv, From, AccessibleEnv, TableResult>{
		this.#limit = limit;
		return this;
	}
}


/// Has option allows to keep track of what the query has in terms of parameters
/// Need a WhereProps that also keep track of props to be able to override values ?
/// multiple where ? => Add in where... and values ?
