import { DeleteQuery } from "./delete.js";
import { InsertQuery } from "./insert.js";
import { SelectQuery } from "./select.js";
import { UpdateQuery } from "./update.js";
import { DefaultSyntaxKeys, SyntaxKeys, SyntaxKeysConstant } from "./syntaxkeys.js";
import { Environment, Table } from "./types.js";


type CTEEntry = { alias: string; preparedFn: (args?: any) => { query: string; args: any[] } };

export class Helice<Env extends Environment, SK extends SyntaxKeys = DefaultSyntaxKeys> {

	#sk   : SyntaxKeysConstant;
	#ctes : CTEEntry[] = [];

	constructor(sk : SyntaxKeysConstant = DefaultSyntaxKeys) {
		this.#sk = sk;
	}

	/**
	 * Registers a CTE at the instance level. Returns a new Helice whose environment
	 * is extended with the CTE table, so every subsequent query can join/reference it.
	 *
	 * @example
	 * const scoped = db.with('active_user', db.select('user').where({ active: true }))
	 * scoped.select('post').join({ active_user: 'id = post.author_id' }).prepare()()
	 *
	 * → WITH active_user AS (...) SELECT * FROM post LEFT JOIN active_user …
	 */
	with<
		Alias    extends string,
		CTETable extends Table,
		CTEAccEnv     extends Environment                     = any,
		CTEFieldScope extends Environment                     = any,
		CTEFrom       extends keyof CTEAccEnv | undefined     = any,
		CTESK         extends SyntaxKeys                      = DefaultSyntaxKeys,
	>(
		alias   : Alias,
		cte     : Pick<SelectQuery<any, CTEAccEnv, CTETable, CTEFrom, CTESK, CTEFieldScope, any>, 'prepare'>,
	): Helice<Env & { [K in Alias]: CTETable }, SK> {
		const next = new Helice<Env & { [K in Alias]: CTETable }, SK>(this.#sk);
		next.#ctes = [...this.#ctes, { alias, preparedFn: (cte as any).prepare() }];
		return next;
	}

	/** Starts a SELECT query on `tablename`. Pre-registered CTEs are automatically included. */
	select<T extends keyof Env & string>(tablename : T) : SelectQuery<Env, Pick<Env, T>, {}, T, SK> {
		return new SelectQuery<Env, Pick<Env, T>, {}, T, SK>(tablename, this.#sk, this.#ctes);
	}

	/** Starts an INSERT query on `tablename`. */
	insert<T extends keyof Env & string>(tablename : T) : InsertQuery<Env, T, SK> {
		return new InsertQuery<Env, T, SK>(tablename, this.#sk);
	}

	/** Starts an UPDATE query on `tablename`. Pre-registered CTEs are automatically included. */
	update<T extends keyof Env & string>(tablename : T) : UpdateQuery<Env, Pick<Env, T>, T, SK> {
		return new UpdateQuery<Env, Pick<Env, T>, T, SK>(tablename, this.#sk, this.#ctes);
	}

	/** Starts a DELETE query on `tablename`. Pre-registered CTEs are automatically included. */
	delete<T extends keyof Env & string>(tablename : T) : DeleteQuery<Env, Pick<Env, T>, T, SK> {
		return new DeleteQuery<Env, Pick<Env, T>, T, SK>(tablename, this.#sk, this.#ctes);
	}
}
