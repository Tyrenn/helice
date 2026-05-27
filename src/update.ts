import { Field, FieldHasDuplicateAliases, FieldParser, TableFromField } from "./clauses/field.js";
import { shiftParams } from "./clauses/common.js";
import { mergeWHEREAsAND, Where, WhereParser, EnvFromWhereRestrictionSpec, WhereRestrictionSpec } from "./clauses/where.js";
import { ValuesParser } from "./clauses/values.js";
import { DefaultSyntaxKeys, SyntaxKeys, SyntaxKeysConstant } from "./syntaxkeys.js";
import { SelectPrepareArgs, SelectPrepareOptions, SelectQuery } from "./select.js";
import { Environment, MethodResultType, Obj, Simplify, Table } from "./types.js";


type SetClause<T extends Table> = { [K in keyof T]?: T[K] | null }

type UpdatePrepareOptions<AccEnv extends Environment, T extends keyof AccEnv & string> = {
	set?  : boolean;
	where?: boolean | WhereRestrictionSpec<AccEnv>;
}

type UpdatePrepareArgs<
	Env    extends Environment,
	AccEnv extends Environment,
	T      extends keyof Env & string,
	SK     extends SyntaxKeys,
	Opts
> = Simplify<
	(Opts extends { set: true }
		? { set?: SetClause<Env[T]> }
		: {})
	& (Opts extends { where: true }
		? { where?: Where<AccEnv, SK, T> }
		: Opts extends { where: infer W extends WhereRestrictionSpec<AccEnv> }
			? { where?: Where<EnvFromWhereRestrictionSpec<AccEnv, W>, SK, T> }
			: {})
>


/**
 * Fluent builder for an UPDATE query.
 *
 * @typeParam Env        - Full database environment: all tables potentially reachable.
 * @typeParam AccEnv     - Accessible environment: tables available to WHERE and SET.
 *                         Starts as `{ [T]: Table }`, grows with each `.using()` call.
 * @typeParam T          - Target table name (`keyof Env`).
 * @typeParam SK         - Syntax-key configuration.
 * @typeParam ReturnType - Shape of a single RETURNING row, refined by `.returning()`.
 *                         Defaults to `{}` (no RETURNING clause).
 * @typeParam CTEArgs    - Accumulated runtime-argument types for registered CTEs, keyed by alias.
 *                         Grows with each `.with(alias, cte, options)` call.
 */
export class UpdateQuery<
	Env        extends Environment,
	AccEnv     extends Environment,
	T          extends keyof Env & string,
	SK         extends SyntaxKeys,
	ReturnType extends Table                = {},
	CTEArgs    extends Record<string, any>  = {}
> {

	/** Phantom: exposes ReturnType for external `typeof query.inferTableType` inference. */
	declare readonly inferTableType : ReturnType;

	#table    : string;
	#sk       : SyntaxKeysConstant;
	#set      : Obj | undefined;
	#where    : Obj | undefined;
	#using    : string[] = [];
	#returning: Field<Pick<Env, T>, T, SK> | undefined;
	#ctes     : Array<{ alias: string, preparedFn: (args?: any) => { query: string, args: any[] } }> = [];

	constructor(table : T, sk : SyntaxKeysConstant = DefaultSyntaxKeys) {
		this.#table = table;
		this.#sk    = sk;
	}

	/**
	 * Registers a CTE (WITH clause). The CTE is a SELECT query whose result is
	 * available as `alias` in subsequent `.using()` calls.
	 *
	 * @example `.with('recent', db.select('post').where({ published: true }))`
	 *          → `WITH recent AS (SELECT * FROM post WHERE published = $1)`
	 */
	with<
		Alias         extends string,
		CTETable      extends Table,
		CTEAccEnv     extends Environment                     = any,
		CTEFieldScope extends Environment                     = any,
		CTEFrom       extends keyof CTEAccEnv | undefined     = any,
		CTESK         extends SyntaxKeys                      = DefaultSyntaxKeys,
		CTEOpts       extends SelectPrepareOptions<CTEAccEnv> = {}
	>(
		alias   : Alias,
		cte     : Pick<SelectQuery<any, CTEAccEnv, CTETable, CTEFrom, CTESK, CTEFieldScope, any>, 'prepare'>,
		options?: CTEOpts
	) {
		this.#ctes.push({ alias, preparedFn: cte.prepare(options as any) });
		return (this as unknown) as MethodResultType<
			UpdateQuery<
				Env & { [K in Alias]: CTETable },
				AccEnv, T, SK, ReturnType,
				CTEArgs & ([keyof SelectPrepareArgs<CTEAccEnv, CTEFieldScope, CTESK, CTEOpts>] extends [never]
					? {}
					: { [K in Alias]?: SelectPrepareArgs<CTEAccEnv, CTEFieldScope, CTESK, CTEOpts> })
			>,
			typeof this, never
		>;
	}

	/**
	 * Adds additional tables to the query's FROM clause (PostgreSQL UPDATE FROM syntax).
	 * These tables can be referenced in `.where()`. Join conditions must be expressed in `.where()`.
	 *
	 * @example `.using(['user', 'address'])` → `FROM user, address`
	 */
	using<const Tables extends ReadonlyArray<keyof Env & string>>(tables : Tables) {
		this.#using = [...tables] as string[];
		return (this as unknown) as MethodResultType<
			UpdateQuery<Env, Simplify<AccEnv & { [K in Tables[number]]: Env[K] }>, T, SK, ReturnType, CTEArgs>,
			typeof this, "using"
		>;
	}

	/**
	 * Specifies the static SET clause: which columns to update and their new values.
	 * All values are parameterized ($1, $2, ...).
	 */
	set(v : SetClause<Env[T]>) {
		this.#set = v as Obj;
		return (this as unknown) as MethodResultType<
			UpdateQuery<Env, AccEnv, T, SK, ReturnType, CTEArgs>,
			typeof this, "set"
		>;
	}

	/**
	 * Adds a static WHERE condition to filter which rows are updated.
	 * Bare column names refer to the target table; qualified names (`table.col`) reference
	 * additional tables added via `.using()`.
	 */
	where<W extends Where<AccEnv, SK, T>>(where : W) {
		this.#where = where as Obj;
		return (this as unknown) as MethodResultType<
			UpdateQuery<Env, AccEnv, T, SK, ReturnType, CTEArgs>,
			typeof this, "where"
		>;
	}

	/**
	 * Adds a RETURNING clause. Accepts the same syntax as SELECT's `.field()`.
	 */
	returning<const F extends Field<Pick<Env, T>, T, SK>>(
		field : [FieldHasDuplicateAliases<F, SK>] extends [false] ? F : "[WARNING] : Duplicated Column Alias"
	) {
		this.#returning = field as any;
		return (this as unknown) as MethodResultType<
			UpdateQuery<Env, AccEnv, T, SK, TableFromField<Pick<Env, T>, F, T, SK>, CTEArgs>,
			typeof this, "returning"
		>;
	}

	/**
	 * Returns a prepared function that generates `{ query, args }`.
	 *
	 * Options:
	 * - `set: true`     → the prepared function accepts `{ set: {...} }` at call time.
	 * - `where: true`   → accepts `{ where: {...} }` at call time; merged AND with static WHERE.
	 * - `where: spec`   → same as `true` but restricts which columns the runtime WHERE may use.
	 *
	 * @param format.pretty - Indent WHERE and SET clauses (default: true).
	 */
	prepare<const Opts extends UpdatePrepareOptions<AccEnv, T>>(
		options? : Opts,
		format?  : { pretty?: boolean }
	) : (args? : UpdatePrepareArgs<Env, AccEnv, T, SK, Opts> & CTEArgs) => { query : string, args : any[] }
	{
		return (args? : any) => {
			const castedArgs = args as any;
			const pretty     = format?.pretty ?? true;

			// ── CTEs ─────────────────────────────────────────────────────────────
			const cteParts  : string[] = [];
			const cteArgs   : any[]    = [];
			let   paramOffset          = 0;

			for(const { alias, preparedFn } of this.#ctes){
				const result     = preparedFn(castedArgs?.[alias]);
				const shiftedSQL = shiftParams(result.query, paramOffset);
				cteParts.push(`${alias} AS (\n${shiftedSQL}\n)`);
				cteArgs.push(...result.args);
				paramOffset += result.args.length;
			}

			// ── SET ──────────────────────────────────────────────────────────────
			const effectiveSet = (options?.set && castedArgs?.set)
				? castedArgs.set as Obj
				: this.#set;

			const vp = new ValuesParser(pretty);
			if(effectiveSet) vp.parse(effectiveSet, 1);

			// ── WHERE (static) ───────────────────────────────────────────────────
			// Initialize idx to vp.idx so runtime WHERE always follows SET parameters.
			const whereParser = new WhereParser(this.#sk, pretty);
			if(this.#where) whereParser.parse(this.#where, vp.idx);
			else            whereParser.idx = vp.idx;

			// ── WHERE (runtime) ──────────────────────────────────────────────────
			let runtimeWhereSQL    = '';
			let runtimeWhereValues : any[] = [];
			if(options?.where && castedArgs?.where){
				const runtimeParser = new WhereParser(this.#sk, pretty);
				runtimeParser.parse(castedArgs.where as Obj, whereParser.idx);
				runtimeWhereSQL    = runtimeParser.where;
				runtimeWhereValues = runtimeParser.values;
			}

			const whereSQL = mergeWHEREAsAND(pretty, whereParser.where, runtimeWhereSQL);

			// ── RETURNING ────────────────────────────────────────────────────────
			const fp = new FieldParser(this.#sk);
			if(this.#returning) fp.parse(this.#returning as any);

			const lines : string[] = [
				`UPDATE ${this.#table}`,
				vp.setSQL                ? `SET ${vp.setSQL}`               : '',
				this.#using.length > 0   ? `FROM ${this.#using.join(', ')}` : '',
				whereSQL                 ? `WHERE ${whereSQL}`              : '',
				fp.select                ? `RETURNING ${fp.select}`         : '',
			];

			const mainSQL        = lines.filter(l => l.trim()).join('\n');
			const shiftedMainSQL = shiftParams(mainSQL, paramOffset);

			const fullSQL = cteParts.length > 0
				? `WITH ${cteParts.join(',\n')}\n${shiftedMainSQL}`
				: shiftedMainSQL;

			return {
				query : fullSQL,
				args  : [...cteArgs, ...vp.values, ...whereParser.values, ...runtimeWhereValues],
			};
		};
	}
}
