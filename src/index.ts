import { DeleteQuery } from "./delete.js";
import { InsertQuery } from "./insert.js";
import { SelectQuery } from "./select.js";
import { UpdateQuery } from "./update.js";
import { DefaultSyntaxKeys, SyntaxKeys, SyntaxKeysConstant } from "./syntaxkeys.js";
import { Environment } from "./types.js";


export class Helice<Env extends Environment, SK extends SyntaxKeys = DefaultSyntaxKeys> {

	#sk : SyntaxKeysConstant;

	constructor(sk : SyntaxKeysConstant = DefaultSyntaxKeys) {
		this.#sk = sk;
	}

	/** Starts a SELECT query on `tablename`. */
	select<T extends keyof Env & string>(tablename : T) : SelectQuery<Env, Pick<Env, T>, {}, T, SK> {
		return new SelectQuery<Env, Pick<Env, T>, {}, T, SK>(tablename, this.#sk);
	}

	/** Starts an INSERT query on `tablename`. */
	insert<T extends keyof Env & string>(tablename : T) : InsertQuery<Env, T, SK> {
		return new InsertQuery<Env, T, SK>(tablename, this.#sk);
	}

	/** Starts an UPDATE query on `tablename`. */
	update<T extends keyof Env & string>(tablename : T) : UpdateQuery<Env, Pick<Env, T>, T, SK> {
		return new UpdateQuery<Env, Pick<Env, T>, T, SK>(tablename, this.#sk);
	}

	/** Starts a DELETE query on `tablename`. */
	delete<T extends keyof Env & string>(tablename : T) : DeleteQuery<Env, Pick<Env, T>, T, SK> {
		return new DeleteQuery<Env, Pick<Env, T>, T, SK>(tablename, this.#sk);
	}
}
