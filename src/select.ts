import {Environment, EnvironmentField, EnvironmentFromJoin, EnvironmentWhere, Join, Table, TableFromEnvField} from './types';
import { mergeWHEREClauses, WheretoSQL } from './utils';

type SelectQueryQuildOptions = {
	where? : boolean,
	limit? : boolean,
	field? : boolean
}

type QueryBuildedParamFromOptions<Options extends SelectQueryQuildOptions, AccessibleEnv extends Environment> = [
	...(Options["field"] extends true ? [EnvironmentField<AccessibleEnv>] : []), 
	...(Options["where"] extends true ? [EnvironmentWhere<AccessibleEnv>] : []),
	...(Options["limit"] extends true ? [number] : []),
	]

export class SelectQuery<GlobalEnv extends Environment, AccessibleEnv extends Environment, TableResult extends Table = {}, HasOptions extends Required<SelectQueryQuildOptions> = {where : false, limit : false, field : false}>{
	
	#from : keyof GlobalEnv;
	#field : EnvironmentField<AccessibleEnv> = '*';
	#where : EnvironmentWhere<AccessibleEnv> | undefined;
	#join : Join<GlobalEnv> | undefined;
	#limit : number | undefined;

	constructor(from : keyof GlobalEnv){
		this.#from = from;
	}

	// Should retrun a function ready to accept field, where, limit, offset parameters
	build<O extends SelectQueryQuildOptions>(options? : O) : (...args : QueryBuildedParamFromOptions<O, AccessibleEnv>) => any {
		return (...args : QueryBuildedParamFromOptions<O, AccessibleEnv>) => {
			let indexField = options?.field ? 1 : 0;
			let indexWhere = options?.where ? indexField + 1 : indexField;
			let indexLimit = options?.limit ? indexWhere + 1 : indexWhere;

			let field : EnvironmentField<AccessibleEnv> | undefined = options?.field ? args[indexField - 1] : undefined;
			let where : EnvironmentWhere<AccessibleEnv> | undefined = options?.where ? args[indexWhere - 1] as EnvironmentWhere<AccessibleEnv> : undefined;
			let limit : number | undefined = options?.limit ? args[indexLimit - 1] as number : undefined;
			
			let flattenThisWhere = this.#where ? WheretoSQL(this.#where) : undefined;
			let flattenWhere = where ? WheretoSQL(where, flattenThisWhere?.nextvar ?? 1) : undefined;

			// JOIN LOGIC 
			// FIELD LOGIC
			// OFFSET
			// ORDER BY
			const qlimit = limit ?? this.#limit;
			const qwhere = mergeWHEREClauses(flattenThisWhere?.where, flattenWhere?.where);
			

			const query = {
				text: `SELECT TODO\n`
						+ `FROM ${String(this.#from)}\n`
						+ `WHERE ${qwhere}\n`
						+ `${qlimit ? "LIMIT " + qlimit : ""}\n`,
				values : [...(flattenThisWhere?.values ?? []), ...(flattenWhere?.values ?? [])]
			}

			console.log(query.text, query.values);
			return "";
		}
	}

	field<F extends EnvironmentField<AccessibleEnv>>(field : F) : SelectQuery<GlobalEnv, AccessibleEnv, TableFromEnvField<AccessibleEnv, F>>{
		this.#field = field;
		return this;
	}

	join<J extends Join<GlobalEnv>>(join : J) : SelectQuery<GlobalEnv, EnvironmentFromJoin<GlobalEnv, AccessibleEnv, J>, TableResult>{
		this.#join = join;
		return this as SelectQuery<GlobalEnv, EnvironmentFromJoin<GlobalEnv, AccessibleEnv, J>, TableResult>;
	}

	where<W extends EnvironmentWhere<AccessibleEnv>>(where : W) : SelectQuery<GlobalEnv, AccessibleEnv, TableResult>{
		this.#where = where;
		return this;
	}

	limit(limit : number) : SelectQuery<GlobalEnv, AccessibleEnv, TableResult>{
		this.#limit = limit;
		return this;
	}
}


/// Has option allows to keep track of what the query has in terms of parameters
/// Need a WhereProps that also keep track of props to be able to override values ?
/// multiple where ? => Add in where... and values ?

