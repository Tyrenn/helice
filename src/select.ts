import { Field, FieldHasDuplicateAliases, FieldParser, SrcEnvFromField, TableFromField } from "./clauses/field.js";
import { EnvironmentFromJoin, Join, JoinHasDuplicateAliases, JoinParser } from "./clauses/join.js";
import { shiftParams } from "./clauses/common.js";
import { EnvFromWhereRestrictionSpec, mergeWHEREAsAND, Where, WhereParser, WhereRestrictionSpec } from "./clauses/where.js";
import { DefaultSyntaxKeys, SyntaxKeys, SyntaxKeysConstant } from "./syntaxkeys.js";
import { Environment, MethodResultType, Obj, Simplify, Table } from "./types.js";

export type SelectPrepareOptions<AccEnv extends Environment> = {
	where?: boolean | WhereRestrictionSpec<AccEnv>,
	field?: boolean,
	limit?: boolean
}

export type SelectPrepareArgs<
	AccEnv     extends Environment,
	FieldScope extends Environment,
	SK         extends SyntaxKeys,
	Opts
> = Simplify<
	(Opts extends { where: true }
		? { where?: Where<AccEnv, SK> }
		: Opts extends { where: infer W extends WhereRestrictionSpec<AccEnv> }
			? { where?: Where<EnvFromWhereRestrictionSpec<AccEnv, W>, SK> }
			: {})
	& (Opts extends { field: true } ? { field?: Field<FieldScope, undefined, SK> } : {})
	& (Opts extends { limit: true } ? { limit?: number } : {})
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

	#from  : string;
	#sk    : SyntaxKeysConstant;
	#field : Field<AccEnv, From, SK> = '*';
	#where : Where<AccEnv, SK, From> | undefined;
	#join  : Join<Env, AccEnv, SK> | undefined;
	#limit : number | undefined;
	#ctes  : Array<{ alias: string, preparedFn: (args?: any) => { query: string, args: any[] } }> = [];

	constructor(from : From & string, sk : SyntaxKeysConstant = DefaultSyntaxKeys){
		this.#from = from;
		this.#sk   = sk;
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
				CTEArgs & ([keyof SelectPrepareArgs<CTEAccEnv, CTEFieldScope, CTESK, CTEOpts>] extends [never] ? {} : { [K in Alias]?: SelectPrepareArgs<CTEAccEnv, CTEFieldScope, CTESK, CTEOpts> })
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



	prepare<const Opts extends SelectPrepareOptions<AccEnv>>(options? : Opts, format? : { pretty?: boolean }) :
		(args? : SelectPrepareArgs<AccEnv, FieldScope, SK, Opts> & CTEArgs) => { query : string, args : any[] }
	{
		return (args? : any) => {
			const castedArgs = args as (SelectPrepareArgs<AccEnv, FieldScope, SK, Opts> & CTEArgs) | undefined;
			const pretty     = format?.pretty ?? true;

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

			// ── WHERE ────────────────────────────────────────────────────────
			// Static where starts after join parameters ($joinParser.idx).
			const whereParser = new WhereParser(this.#sk, pretty);
			if(this.#where)
				whereParser.parse(this.#where as Obj, joinParser.idx);

			// Runtime where (if option enabled) is merged with static where via AND.
			let runtimeWhereSQL    = '';
			let runtimeWhereValues : any[] = [];
			if(options?.where && castedArgs?.where){
				const runtimeParser = new WhereParser(this.#sk, pretty);
				runtimeParser.parse(castedArgs.where as Obj, whereParser.idx);
				runtimeWhereSQL    = runtimeParser.where;
				runtimeWhereValues = runtimeParser.values;
			}

			const whereSQL = mergeWHEREAsAND(pretty, whereParser.where, runtimeWhereSQL);

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
				whereSQL            ? `WHERE ${whereSQL}`               : '',
				fieldParser.groupby ? `GROUP BY ${fieldParser.groupby}` : '',
				limit != null       ? `LIMIT ${limit}`                  : '',
			];

			const mainSQL        = lines.filter(l => l.trim()).join('\n');
			const shiftedMainSQL = shiftParams(mainSQL, paramOffset);

			const fullSQL = cteParts.length > 0
				? `WITH ${cteParts.join(',\n')}\n${shiftedMainSQL}`
				: shiftedMainSQL;

			return {
				query : fullSQL,
				args  : [...cteArgs, ...joinParser.values, ...whereParser.values, ...runtimeWhereValues],
			};
		};
	}
}


/// Has option allows to keep track of what the query has in terms of parameters
/// Need a WhereProps that also keep track of props to be able to override values ?
/// multiple where ? => Add in where... and values ?
