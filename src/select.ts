import { Field, FieldHasDuplicateAliases, FieldParser, SrcEnvFromField, TableFromField } from "./clauses/field.js";
import { EnvironmentFromJoin, Join, JoinHasDuplicateAliases, JoinParser } from "./clauses/join.js";
import { shiftParams, FlatEnv, FlatEnvKeys, StrictEnv } from "./clauses/common.js";
import { In, buildInClauses } from "./clauses/in.js";
import { EnvFromWhereRestrictionSpec, mergeWHEREAsAND, Where, WhereParser, WhereRestrictionSpec } from "./clauses/where.js";
import { OrderBy, OrderByParser } from "./clauses/orderby.js";
import { DefaultSyntaxKeys, SyntaxKeys, SyntaxKeysConstant } from "./syntaxkeys.js";
import { Environment, MethodResultType, Obj, Simplify, Table } from "./types.js";

export type SelectPrepareOptions<AccEnv extends Environment> = {
	where?   : boolean | WhereRestrictionSpec<AccEnv>,
	field?   : boolean,
	limit?   : boolean,
	orderBy? : boolean,
}

export type SelectPrepareArgs<
	AccEnv     extends Environment,
	FieldScope extends Environment,
	SK         extends SyntaxKeys,
	Opts,
	From       extends keyof AccEnv | undefined = undefined
> = Simplify<
	(Opts extends { where: true }
		? { where?: Where<AccEnv, SK, From> }
		: Opts extends { where: infer W extends WhereRestrictionSpec<AccEnv> }
			? { where?: Where<EnvFromWhereRestrictionSpec<AccEnv, W>, SK> }
			: {})
	& (Opts extends { field: true } ? { field?: Field<StrictEnv<FieldScope>, undefined, SK> } : {})
	& (Opts extends { limit: true } ? { limit?: number } : {})
	& (Opts extends { orderBy: true } ? { orderBy?: OrderBy<AccEnv, From> } : {})
>

/**
 * Fluent builder for a SELECT query.
 *
 * @typeParam Env         - The full database environment: all tables potentially reachable via joins.
 * @typeParam AccEnv      - The accessible environment: tables actually available to this query
 *                          (starts as `{ [From]: Table }`, grows with each `.join()` call).
 * @typeParam TableResult - Shape of a single result row, refined by `.field()`.
 * @typeParam From        - Name of the primary table this query selects from (`keyof AccEnv`),
 *                          or `undefined` after a join (no longer a single-table context).
 * @typeParam SK          - Syntax-key configuration (alias separator, operator tokens, etc.).
 * @typeParam FieldScope  - Subset of `AccEnv` that the runtime field override is allowed to reference.
 *                          Derived from the static `.field()` call: only columns already selected
 *                          statically can be re-selected or re-aliased at runtime.
 *                          Defaults to `AccEnv` (unconstrained) when no static field is set.
 * @typeParam CTEArgs     - Accumulated runtime-argument types for registered CTEs, keyed by alias.
 *                          Grows with each `.with(alias, cte, { where: true, ... })` call.
 *                          Empty by default (no CTE runtime args).
 */
export class SelectQuery<
	Env         extends Environment,
	AccEnv      extends Environment,
	TableResult extends Table,
	From        extends keyof AccEnv | undefined,
	SK          extends SyntaxKeys,
	FieldScope  extends Environment         = AccEnv,
	CTEArgs     extends Record<string, any> = {}
> {

	/** Phantom property: not present at runtime, only for type inference in `.with()`. */
	declare readonly inferTableType: TableResult;

	#from       : string;
	#sk         : SyntaxKeysConstant;
	#field      : Field<AccEnv, From, SK> = '*';
	#where      : Where<AccEnv, SK, From> | undefined;
	#join       : Join<Env, AccEnv, SK> | undefined;
	#limit      : number | undefined;
	#orderBy    : OrderBy<AccEnv, From> | undefined;
	#in  : In[] = [];
	#ctes : Array<{ alias: string, preparedFn: (args?: any) => { query: string, args: any[] } }> = [];

	constructor(from : From & string, sk : SyntaxKeysConstant = DefaultSyntaxKeys, preCTEs?: Array<{ alias: string, preparedFn: (args?: any) => { query: string, args: any[] } }>){
		this.#from  = from;
		this.#sk    = sk;
		if(preCTEs?.length) this.#ctes = [...preCTEs];
	}

	with<
		Alias         extends string,
		CTETable      extends Table,
		CTEAccEnv     extends Environment                      = any,
		CTEFieldScope extends Environment                      = any,
		CTEFrom       extends keyof CTEAccEnv | undefined      = any,
		CTESK         extends SyntaxKeys                       = DefaultSyntaxKeys,
		CTEOpts       extends SelectPrepareOptions<CTEAccEnv>  = {}
	>(
		alias   : Alias,
		cte     : Pick<SelectQuery<any, CTEAccEnv, CTETable, CTEFrom, CTESK, CTEFieldScope, any>, 'prepare'>,
		options?: CTEOpts
	){
		this.#ctes.push({ alias, preparedFn: cte.prepare(options as any) });
		return (this as unknown) as MethodResultType<
			SelectQuery<
				Env & { [K in Alias]: CTETable },
				AccEnv,
				TableResult, From, SK,
				FieldScope,
				CTEArgs & ([keyof SelectPrepareArgs<CTEAccEnv, CTEFieldScope, CTESK, CTEOpts, CTEFrom>] extends [never] ? {} : { [K in Alias]?: SelectPrepareArgs<CTEAccEnv, CTEFieldScope, CTESK, CTEOpts, CTEFrom> })
			>,
			typeof this, never
		>;
	}

	field<const F extends Field<AccEnv, From, SK>>(
		field : [FieldHasDuplicateAliases<F, SK>] extends [false] ? F : "[WARNING] : Duplicated Column Alias"
	){
		this.#field = field as F;
		return (this as unknown) as MethodResultType<
			SelectQuery<Env, AccEnv, TableFromField<AccEnv, F, From, SK>, From, SK, SrcEnvFromField<AccEnv, F, From, SK> & Environment, CTEArgs>,
			typeof this, "field" | "join" | "with"
		>;
	}


	/**
	 * Also detects duplicate aliases
	 */
	join<J extends Join<Env, AccEnv, SK>>(
		join : [JoinHasDuplicateAliases<J, keyof AccEnv & string, SK>] extends [false] ? J : "[WARNING] : Duplicated Join Alias"
	){
		this.#join = join as J;
		return (this as unknown) as MethodResultType<
			SelectQuery<Env, EnvironmentFromJoin<Env, AccEnv, J, SK>, TableResult, undefined, SK, EnvironmentFromJoin<Env, AccEnv, J, SK>, CTEArgs>,
			typeof this, "join" | "with"
		>;
	}

	where<W extends Where<AccEnv, SK, From>>(
		where : W
	){
		this.#where = where;
		return (this as unknown) as MethodResultType<SelectQuery<Env, AccEnv, TableResult, From, SK, FieldScope, CTEArgs>, typeof this, "where" | "join" | "with">;
	}

	limit(
		limit : number
	){
		this.#limit = limit;
		return (this as unknown) as MethodResultType<SelectQuery<Env, AccEnv, TableResult, From, SK, FieldScope, CTEArgs>, typeof this, "limit" | "with">;
	}

	orderBy<O extends OrderBy<AccEnv, From>>(
		orderBy : O
	){
		this.#orderBy = orderBy as OrderBy<AccEnv, From>;
		return (this as unknown) as MethodResultType<SelectQuery<Env, AccEnv, TableResult, From, SK, FieldScope, CTEArgs>, typeof this, "orderBy">;
	}

	in<Col extends FlatEnvKeys<AccEnv, From> & string>(
		column   : Col,
		subquery : Pick<SelectQuery<any, any, Record<string, FlatEnv<AccEnv, From>[Col & keyof FlatEnv<AccEnv, From>]>, any, any>, 'prepare'>
	){
		this.#in.push({ column, not: false, fn: (subquery as any).prepare() });
		return (this as unknown) as MethodResultType<SelectQuery<Env, AccEnv, TableResult, From, SK, FieldScope, CTEArgs>, typeof this, "join" | "with">;
	}

	notIn<Col extends FlatEnvKeys<AccEnv, From> & string>(
		column   : Col,
		subquery : Pick<SelectQuery<any, any, Record<string, FlatEnv<AccEnv, From>[Col & keyof FlatEnv<AccEnv, From>]>, any, any>, 'prepare'>
	){
		this.#in.push({ column, not: true, fn: (subquery as any).prepare() });
		return (this as unknown) as MethodResultType<SelectQuery<Env, AccEnv, TableResult, From, SK, FieldScope, CTEArgs>, typeof this, "join" | "with">;
	}

	exists(subquery : Pick<SelectQuery<any, any, any, any, any>, 'prepare'>){
		this.#in.push({ not: false, fn: (subquery as any).prepare() });
		return (this as unknown) as MethodResultType<SelectQuery<Env, AccEnv, TableResult, From, SK, FieldScope, CTEArgs>, typeof this, "join" | "with">;
	}

	notExists(subquery : Pick<SelectQuery<any, any, any, any, any>, 'prepare'>){
		this.#in.push({ not: true, fn: (subquery as any).prepare() });
		return (this as unknown) as MethodResultType<SelectQuery<Env, AccEnv, TableResult, From, SK, FieldScope, CTEArgs>, typeof this, "join" | "with">;
	}

	/**
	 * Returns a reusable function that generates `{ query, args }` on each call.
	 *
	 * Pass `options` to enable runtime clause overrides — the returned function
	 * then accepts an args object whose shape matches the enabled options.
	 * Static and runtime values merge automatically (runtime WHERE is ANDed with
	 * the static one, etc.).
	 *
	 * Pass `executor` to have the returned function call it with `(query, args)`
	 * and return its result instead of `{ query, args }`.
	 *
	 * @param options - Runtime overrides to enable: `where`, `field`, `limit`, `orderBy`.
	 * @param executor - When provided, the prepared function calls it and returns its result.
	 */
	prepare<const Opts extends SelectPrepareOptions<AccEnv>>(options?: Opts): (args?: SelectPrepareArgs<AccEnv, FieldScope, SK, Opts, From> & CTEArgs) => { query: string; args: any[] }
	prepare<const Opts extends SelectPrepareOptions<AccEnv>, Result>(options: Opts | undefined, executor: (query: string, args: any[]) => Result): (args?: SelectPrepareArgs<AccEnv, FieldScope, SK, Opts, From> & CTEArgs) => Result
	prepare<const Opts extends SelectPrepareOptions<AccEnv>, Result>(
		options?  : Opts,
		executor? : (query: string, args: any[]) => Result
	): (args?: SelectPrepareArgs<AccEnv, FieldScope, SK, Opts, From> & CTEArgs) => { query: string; args: any[] } | Result
	{
		return (args? : SelectPrepareArgs<AccEnv, FieldScope, SK, Opts, From> & CTEArgs) => {
			const castedArgs = args;
			const pretty     = true;

			// ── CTEs ─────────────────────────────────────────────────────────
			const cteParts  : string[] = [];
			const cteArgs   : any[]    = [];
			let   paramOffset          = 0;

			for(const { alias, preparedFn } of this.#ctes){
				const result     = preparedFn((castedArgs as any)?.[alias]);
				const shiftedSQL = shiftParams(result.query, paramOffset);
				cteParts.push(`${alias} AS (\n${shiftedSQL}\n)`);
				cteArgs.push(...result.args);
				paramOffset += result.args.length;
			}

			// ── FIELD ────────────────────────────────────────────────────────
			// Runtime field reduces the static field when the option is enabled.
			const effectiveField : Obj | string | string[] =
				(options?.field && castedArgs?.field) ? castedArgs.field as any : this.#field as any;

			const fieldParser = new FieldParser(this.#sk);
			fieldParser.parse(effectiveField);

			// ── JOIN ─────────────────────────────────────────────────────────
			// Join is always static (defined at build time), no runtime override.
			const joinParser = new JoinParser(this.#sk);
			if(this.#join)
				joinParser.parse(this.#join as Obj, 1);

			// ── IN subqueries ──────��──────────────────────────────────────────
			const { sql: inSQL, args: inArgsList, nextIdx: inNextIdx } =
				buildInClauses(this.#in, joinParser.idx, pretty);

			// ��─ WHERE ────────────��───────────────────────────────────────────
			// Static where starts after join + IN parameters.
			const whereParser = new WhereParser(this.#sk, pretty);
			if(this.#where)
				whereParser.parse(this.#where as Obj, inNextIdx);

			// Runtime where (if option enabled) is merged with static where via AND.
			let runtimeWhereSQL    = '';
			let runtimeWhereValues : any[] = [];
			if(options?.where && castedArgs?.where){
				const runtimeParser = new WhereParser(this.#sk, pretty);
				runtimeParser.parse(castedArgs.where as Obj, whereParser.idx);
				runtimeWhereSQL    = runtimeParser.where;
				runtimeWhereValues = runtimeParser.values;
			}

			const whereSQL = mergeWHEREAsAND(pretty, inSQL, whereParser.where, runtimeWhereSQL);

			// ── ORDER BY ─────────────────────────────────────────────────────
			const effectiveOrderBy = (options?.orderBy && castedArgs?.orderBy) ? castedArgs.orderBy as any : this.#orderBy as any;
			const orderByParser = new OrderByParser();
			if (effectiveOrderBy != null) orderByParser.parse(effectiveOrderBy);

			// ── LIMIT ─────────────────────────────────────────────────────────
			const limit = (options?.limit && castedArgs?.limit != null) ? castedArgs.limit : this.#limit;

			// ── TSQuery FROM additions ────────────────────────────────────────
			// WhereParser.from holds extra FROM expressions generated by @@: (tsquery).
			// They end with a trailing comma → trim before appending.
			const tsqueryFrom = whereParser.from.trimEnd().replace(/,\s*$/, '');

			// ── BUILD MAIN SQL ────────────────────────────────────────────────
			const lines : string[] = [
				`SELECT ${fieldParser.select || '*'}`,
				`FROM ${this.#from}${tsqueryFrom ? `, ${tsqueryFrom}` : ''}`,
				joinParser.from,
				whereSQL               ? `WHERE ${whereSQL}`                  : '',
				fieldParser.groupby    ? `GROUP BY ${fieldParser.groupby}`    : '',
				orderByParser.orderby  ? `ORDER BY ${orderByParser.orderby}`  : '',
				limit != null          ? `LIMIT ${limit}`                     : '',
			];

			const mainSQL        = lines.filter(l => l.trim()).join('\n');
			const shiftedMainSQL = shiftParams(mainSQL, paramOffset);

			const fullSQL = cteParts.length > 0
				? `WITH ${cteParts.join(',\n')}\n${shiftedMainSQL}`
				: shiftedMainSQL;

			const result = {
				query : fullSQL,
				args  : [...cteArgs, ...joinParser.values, ...inArgsList, ...whereParser.values, ...runtimeWhereValues],
			};
			return executor ? executor(result.query, result.args) : result;
		};
	}

	/** Returns `{ query, args }` immediately. Shorthand for `.prepare()()`. */
	build(): { query: string; args: any[] } {
		return this.prepare()();
	}

	/**
	 * Builds and immediately calls `executor(query, args)`, returning its result.
	 * Shorthand for `.prepare(undefined, executor)()`.
	 */
	execute<Result>(executor: (query: string, args: any[]) => Result): Result {
		return this.prepare(undefined as any, executor)();
	}
}