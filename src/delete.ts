import { Field, FieldHasDuplicateAliases, FieldParser, TableFromField } from "./clauses/field.js";
import { shiftParams } from "./clauses/common.js";
import { mergeWHEREAsAND, Where, WhereParser, EnvFromWhereRestrictionSpec, WhereRestrictionSpec } from "./clauses/where.js";
import { DefaultSyntaxKeys, SyntaxKeys, SyntaxKeysConstant } from "./syntaxkeys.js";
import { SelectPrepareArgs, SelectPrepareOptions, SelectQuery } from "./select.js";
import { Environment, MethodResultType, Obj, Simplify, Table } from "./types.js";


type DeletePrepareOptions<AccEnv extends Environment> = {
	where?: boolean | WhereRestrictionSpec<AccEnv>;
}

type DeletePrepareArgs<
	Env    extends Environment,
	AccEnv extends Environment,
	T      extends keyof Env & string,
	SK     extends SyntaxKeys,
	Opts
> = Simplify<
	Opts extends { where: true }
		? { where?: Where<AccEnv, SK, T> }
		: Opts extends { where: infer W extends WhereRestrictionSpec<AccEnv> }
			? { where?: Where<EnvFromWhereRestrictionSpec<AccEnv, W>, SK, T> }
			: {}
>


/**
 * Fluent builder for a DELETE query.
 *
 * @typeParam Env        - Full database environment.
 * @typeParam AccEnv     - Accessible environment: tables available to WHERE.
 *                         Starts as `{ [T]: Table }`, grows with each `.using()` call.
 * @typeParam T          - Target table name (`keyof Env`).
 * @typeParam SK         - Syntax-key configuration.
 * @typeParam ReturnType - Shape of a single RETURNING row, refined by `.returning()`.
 *                         Defaults to `{}` (no RETURNING clause).
 * @typeParam CTEArgs    - Accumulated runtime-argument types for registered CTEs, keyed by alias.
 *                         Grows with each `.with(alias, cte, options)` call.
 */
export class DeleteQuery<
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
	 * @example `.with('inactive', db.select('user').where({ active: false }))`
	 *          → `WITH inactive AS (SELECT * FROM user WHERE active = $1)`
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
			DeleteQuery<
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
	 * Adds additional tables to the query's USING clause (PostgreSQL DELETE USING syntax).
	 * These tables can be referenced in `.where()`. Join conditions must be expressed in `.where()`.
	 *
	 * @example `.using(['user', 'address'])` → `USING user, address`
	 */
	using<const Tables extends ReadonlyArray<keyof Env & string>>(tables : Tables) {
		this.#using = [...tables] as string[];
		return (this as unknown) as MethodResultType<
			DeleteQuery<Env, Simplify<AccEnv & { [K in Tables[number]]: Env[K] }>, T, SK, ReturnType, CTEArgs>,
			typeof this, "using"
		>;
	}

	/**
	 * Adds a static WHERE condition to filter which rows are deleted.
	 * Bare column names refer to the target table; qualified names (`table.col`) reference
	 * additional tables added via `.using()`.
	 */
	where<W extends Where<AccEnv, SK, T>>(where : W) {
		this.#where = where as Obj;
		return (this as unknown) as MethodResultType<
			DeleteQuery<Env, AccEnv, T, SK, ReturnType, CTEArgs>,
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
			DeleteQuery<Env, AccEnv, T, SK, TableFromField<Pick<Env, T>, F, T, SK>, CTEArgs>,
			typeof this, "returning"
		>;
	}

	/**
	 * Returns a prepared function that generates `{ query, args }`.
	 *
	 * Options:
	 * - `where: true`   → the prepared function accepts `{ where: {...} }` at call time;
	 *                      merged AND with the static WHERE if one was set.
	 * - `where: spec`   → same as `true` but restricts which columns the runtime WHERE may use.
	 *
	 * @param format.pretty - Indent WHERE clause (default: true).
	 */
	prepare<const Opts extends DeletePrepareOptions<AccEnv>>(
		options? : Opts,
		format?  : { pretty?: boolean }
	) : (args? : DeletePrepareArgs<Env, AccEnv, T, SK, Opts> & CTEArgs) => { query : string, args : any[] }
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

			// ── WHERE (static) ───────────────────────────────────────────────────
			const whereParser = new WhereParser(this.#sk, pretty);
			if(this.#where) whereParser.parse(this.#where, 1);
			else            whereParser.idx = 1;

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
				`DELETE FROM ${this.#table}`,
				this.#using.length > 0 ? `USING ${this.#using.join(', ')}` : '',
				whereSQL  ? `WHERE ${whereSQL}`      : '',
				fp.select ? `RETURNING ${fp.select}` : '',
			];

			const mainSQL        = lines.filter(l => l.trim()).join('\n');
			const shiftedMainSQL = shiftParams(mainSQL, paramOffset);

			const fullSQL = cteParts.length > 0
				? `WITH ${cteParts.join(',\n')}\n${shiftedMainSQL}`
				: shiftedMainSQL;

			return {
				query : fullSQL,
				args  : [...cteArgs, ...whereParser.values, ...runtimeWhereValues],
			};
		};
	}
}
