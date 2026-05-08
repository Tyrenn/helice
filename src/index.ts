import { SelectQuery } from "./select";
import { DefaultSyntaxKeys, SyntaxKeys, SyntaxKeysConstant } from "./syntaxkeys";
import { Environment } from "./types";




export class Helice<Env extends Environment, SK extends SyntaxKeys = DefaultSyntaxKeys>{

	#sk : SyntaxKeysConstant;

	constructor(sk : SyntaxKeysConstant = DefaultSyntaxKeys){
		this.#sk = sk;
	}

	select<T extends keyof Env & string>(tablename : T) : SelectQuery<Env, Pick<Env, T>, {}, T, SK>{
		return new SelectQuery<Env, Pick<Env, T>, {}, T, SK>(tablename, this.#sk);
	}
}
