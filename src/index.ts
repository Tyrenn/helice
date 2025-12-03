import { SelectQuery } from "./select";
import { Environment } from "./types";





export class Helice<Env extends Environment>{
	select<T extends keyof Env>(tablename : T) : SelectQuery<Env, T>{
		return new SelectQuery<Env, T>(tablename);
	}
}