import {Environment, EnvironmentField, EnvironmentFromJoin, EnvironmentWhere, Join, Table, TableFromEnvField, Query} from './types';

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

export class SelectQuery<GlobalEnv extends Environment, AccessibleEnv extends Environment, TableResult extends Table = {}, HasOptions extends Required<SelectQueryQuildOptions> = {where : false, limit : false, field : false}> implements Query<GlobalEnv, AccessibleEnv, TableResult>{
	
	#from : keyof GlobalEnv;
	#field : EnvironmentField<AccessibleEnv> = '*';
	#where : EnvironmentWhere<AccessibleEnv> | undefined;
	#join : Join<GlobalEnv> | undefined;

	constructor(from : keyof GlobalEnv){
		this.#from = from;
	}

	// Should retrun a function ready to accept field, where, limit, offset parameters
	
	quild<O extends SelectQueryQuildOptions>(options? : O) : (...args : QueryBuildedParamFromOptions<O, AccessibleEnv>) => any {
		return (...args : QueryBuildedParamFromOptions<O, AccessibleEnv>) => {
			return "";
		}
	}

	field<F extends EnvironmentField<AccessibleEnv>>(field : F) : SelectQuery<GlobalEnv, AccessibleEnv, TableFromEnvField<AccessibleEnv, F>>{
		this.#field = field;
		return this;
	}


	where<W extends EnvironmentWhere<AccessibleEnv>>(where : W) : SelectQuery<GlobalEnv, AccessibleEnv, TableResult>{
		this.#where = where;
		return this;
	}

	join<J extends Join<GlobalEnv>>(join : J) : SelectQuery<GlobalEnv, EnvironmentFromJoin<GlobalEnv, AccessibleEnv, J>, TableResult>{
		this.#join = join;
		return this as SelectQuery<GlobalEnv, EnvironmentFromJoin<GlobalEnv, AccessibleEnv, J>, TableResult>;
	}
}

