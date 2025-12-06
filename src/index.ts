import { SelectQuery } from "./select";
import { Environment } from "./types";





export class Helice<Env extends Environment>{
	select<T extends keyof Env & string>(tablename : T) : SelectQuery<Env, Pick<Env, T>, {}, T>{
		return new SelectQuery<Env, Pick<Env, T>, {}, T>(tablename);
	}
}