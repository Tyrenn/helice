import { Field, FieldHasDuplicateAliases, FieldParser, SrcEnvFromField, TableFromField } from "./clauses/field";
import { EnvironmentFromJoin, Join, JoinHasDuplicateAliases, JoinParser } from "./clauses/join";
import { mergeWHEREAsAND, Where, WhereParser } from "./clauses/where";
import { DefaultSyntaxKeys, SyntaxKeys, SyntaxKeysConstant } from "./syntaxkeys";
import { CommonTableExpression, Environment, MethodResultType, Obj, PreparedQueryArguments, PreparedQueryOptions, Table } from "./types";

type PreparedSelectQueryArguments<
	AccEnv     extends Environment,
	FieldScope extends Environment,
	SK         extends SyntaxKeys = DefaultSyntaxKeys
> = {
	field? : Field<FieldScope, undefined, SK>,
	where? : Where<AccEnv, SK>,
	limit? : number
}

function shiftParams(sql: string, offset: number): string {
	if (offset === 0) return sql;
	return sql.replace(/\$(\d+)/g, (_, n) => `$${parseInt(n) + offset}`);
}

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
> implements CommonTableExpression<TableResult, PreparedSelectQueryArguments<AccEnv, FieldScope>> {

	/** Phantom property: not present at runtime, only for type inference in `.with()`. */
	declare readonly tableResult: TableResult;

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
		CTEOpts       extends PreparedQueryOptions<PreparedSelectQueryArguments<CTEAccEnv, CTEFieldScope, CTESK>> = {}
	>(
		alias   : Alias,
		cte     : Pick<SelectQuery<any, CTEAccEnv, CTETable, CTEFrom, CTESK, CTEFieldScope, any>, 'prepareClaude' | 'tableResult'>,
		options?: CTEOpts
	){
		this.#ctes.push({ alias, preparedFn: cte.prepareClaude(options as any) });
		return (this as unknown) as MethodResultType<
			SelectQuery<
				Env,
				AccEnv & { [K in Alias]: CTETable },
				TableResult, From, SK,
				FieldScope  & { [K in Alias]: CTETable },
				CTEArgs & ([PreparedQueryArguments<CTEOpts>] extends [undefined] ? {} : { [K in Alias]?: PreparedQueryArguments<CTEOpts> })
			>,
			typeof this, never
		>;
	}

	// Should return a function ready to accept field, where, limit, offset parameters
	prepare<A extends PreparedSelectQueryArguments<AccEnv, FieldScope>>(_options? : PreparedQueryOptions<A>) : (args : PreparedQueryArguments<A>) => {query : string, args : any[]} {
		return (_args? : PreparedQueryArguments<A>) => {
			return "" as any; // TODO
		}
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


	prepareClaude<A extends PreparedSelectQueryArguments<AccEnv, FieldScope>>(options? : PreparedQueryOptions<A>, format? : { pretty?: boolean }) :
		(args? : PreparedQueryArguments<A> & ([keyof CTEArgs] extends [never] ? {} : { ctes?: CTEArgs })) => { query : string, args : any[] }
	{
		return (args? : any) => {
			const castedArgs = args as (A & { ctes?: CTEArgs }) | undefined;
			const pretty     = format?.pretty ?? true;

			// ── CTEs ─────────────────────────────────────────────────────────
			const cteParts  : string[] = [];
			const cteArgs   : any[]    = [];
			let   paramOffset          = 0;

			for(const { alias, preparedFn } of this.#ctes){
				const result     = preparedFn(castedArgs?.ctes?.[alias]);
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
