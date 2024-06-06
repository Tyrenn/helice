import { SelectQuery } from "./select";
import { Environment } from "./types";





export class Quilder<Env extends Environment>{
	

	select<T extends keyof Env>(tablename : T) : SelectQuery<Env, Pick<Env, T>, {}>{
		return new SelectQuery<Env, Pick<Env, T>, {}>(tablename);
	}
}