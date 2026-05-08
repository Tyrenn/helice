import { Field, FieldHasDuplicateAliases, FieldParser, TableFromField } from "./clauses/field";
import { EnvironmentFromJoin, Join, JoinHasDuplicateAliases, JoinParser } from "./clauses/join";
import { mergeWHEREAsAND, Where, WhereParser } from "./clauses/where";
import { DefaultSyntaxKeys, SyntaxKeys, SyntaxKeysConstant } from "./syntaxkeys";
import { CommonTableExpression, Environment, MethodResultType, Obj, PreparedQueryArguments, PreparedQueryOptions, Table } from "./types";

type PreparedSelectQueryArguments<AccessibleEnv extends Environment, SK extends SyntaxKeys = DefaultSyntaxKeys> = {
	field? : Field<AccessibleEnv, undefined, SK>,
	where? : Where<AccessibleEnv, SK>,
	limit? : number
}

export class SelectQuery<
	Env extends Environment, 
	AccEnv extends Environment, 
	TableResult extends Table,
	From extends keyof AccEnv | undefined,

	SK extends SyntaxKeys
> implements CommonTableExpression<TableResult, PreparedSelectQueryArguments<AccEnv>> {
	
	#from  : string;
	#sk    : SyntaxKeysConstant;
	#field : Field<AccEnv, From, SK> = '*';
	#where : Where<AccEnv, SK, From> | undefined;
	#join  : Join<Env, AccEnv, SK> | undefined;
	#limit : number | undefined;

	constructor(from : From & string, sk : SyntaxKeysConstant = DefaultSyntaxKeys){
		this.#from = from;
		this.#sk   = sk;
	}

	// Should retrun a function ready to accept field, where, limit, offset parameters
	prepare<A extends PreparedSelectQueryArguments<AccEnv>>(options? : PreparedQueryOptions<A>) : (args : PreparedQueryArguments<A>) => {query : string, args : any[]} {
		return (args? : PreparedQueryArguments<A>) => {
			let castedArgs : A | undefined = args as A | undefined;

			// TODO Check this part

			// let field : Field<AccEnv> | undefined = options?.field ? castedArgs?.field : undefined;
			// let where : Where<AccEnv> | undefined = options?.where ? castedArgs?.where : undefined;
			// let limit : number | undefined = options?.limit ? castedArgs?.limit : undefined;
			
			// let flattenThisWhere = this.#where ? whereToSQL(this.#where) : undefined;
			// let flattenWhere = where ? whereToSQL(where, flattenThisWhere?.nextvar ?? 1) : undefined;

			// // JOIN LOGIC 
			// let joinSQL = "";
			// if(this.#join)
			// 	for(let key in this.#join){	
			// 		joinSQL += ``
			// 	}

			// // FIELD LOGIC
			// // OFFSET
			// // ORDER BY
			// const qlimit = limit ?? this.#limit;
			// const qwhere = mergeWHEREAsAND(flattenThisWhere?.where, flattenWhere?.where);
			

			// const query = {
			// 	text: `SELECT TODO\n`
			// 			+ `FROM ${String(this.#from)}\n`
			// 			+ `WHERE ${qwhere}\n`
			// 			+ `${qlimit ? "LIMIT " + qlimit : ""}\n`,
			// 	values : [...(flattenThisWhere?.values ?? []), ...(flattenWhere?.values ?? [])]
			// }

			// console.log(query.text, query.values);
			return "" as any; // TODO
		}
	}
	

	field<const F extends Field<AccEnv, From, SK>>(
		field : [FieldHasDuplicateAliases<F, SK>] extends [false] ? F : "[WARNING] : Duplicated Column Alias"
	){
		this.#field = field as F;
		return (this as unknown) as MethodResultType<SelectQuery<Env, AccEnv, TableFromField<AccEnv, F, From, SK>, From, SK>, typeof this, "field" | "join">;
	}


	/**
	 * Also detects duplicate aliases
	 * @param join 
	 * @returns 
	 */
	join<J extends Join<Env, AccEnv, SK>>(
		join : [JoinHasDuplicateAliases<J, keyof AccEnv & string, SK>] extends [false] ? J : "[WARNING] : Duplicated Join Alias"
	){
		this.#join = join as J;
		return (this as unknown ) as MethodResultType<SelectQuery<Env, EnvironmentFromJoin<Env, AccEnv, J, SK>, TableResult, undefined, SK>, typeof this, "join">;
	}

	where<W extends Where<AccEnv, SK, From>>(
		where : W
	){
		this.#where = where;
		return (this as unknown) as MethodResultType<SelectQuery<Env, AccEnv, TableResult, From, SK>, typeof this, "where" | "join">;
	}

	limit(
		limit : number
	){
		this.#limit = limit;
		return (this as unknown) as MethodResultType<SelectQuery<Env, AccEnv, TableResult, From, SK>, typeof this, "limit">;
	}


	prepareClaude<A extends PreparedSelectQueryArguments<AccEnv>>(options? : PreparedQueryOptions<A>) : (args? : PreparedQueryArguments<A>) => {query : string, args : any[]} {

		return (args? : PreparedQueryArguments<A>) => {
			const castedArgs = args as A | undefined;

			// ── FIELD ────────────────────────────────────────────────────────
			// Runtime field overrides the builder field when the option is enabled.
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
			const whereParser = new WhereParser(this.#sk);
			if(this.#where)
				whereParser.parse(this.#where as Obj, joinParser.idx);

			// Runtime where (if option enabled) is merged with static where via AND.
			let runtimeWhereSQL = '';
			let runtimeWhereValues : any[] = [];
			if(options?.where && castedArgs?.where){
				const runtimeParser = new WhereParser(this.#sk);
				runtimeParser.parse(castedArgs.where as Obj, whereParser.idx);
				runtimeWhereSQL   = runtimeParser.where;
				runtimeWhereValues = runtimeParser.values;
			}

			const whereSQL = mergeWHEREAsAND(whereParser.where, runtimeWhereSQL);

			// ── LIMIT ─────────────────────────────────────────────────────────
			const limit = (options?.limit && castedArgs?.limit != null) ? castedArgs.limit : this.#limit;

			// ── TSQuery FROM additions ────────────────────────────────────────
			// WhereParser.from holds extra FROM expressions generated by @@: (tsquery).
			// They end with a trailing comma → trim before appending.
			const tsqueryFrom = whereParser.from.trimEnd().replace(/,\s*$/, '');

			// ── BUILD SQL ─────────────────────────────────────────────────────
			const lines : string[] = [
				`SELECT ${fieldParser.select || '*'}`,
				`FROM ${this.#from}${tsqueryFrom ? `, ${tsqueryFrom}` : ''}`,
				joinParser.from,
				whereSQL       ? `WHERE ${whereSQL}`       : '',
				fieldParser.groupby ? `GROUP BY ${fieldParser.groupby}` : '',
				limit != null  ? `LIMIT ${limit}`          : '',
			];

			return {
				query : lines.filter(l => l.trim()).join('\n'),
				args  : [...joinParser.values, ...whereParser.values, ...runtimeWhereValues],
			};
		};
	}
}


/// Has option allows to keep track of what the query has in terms of parameters
/// Need a WhereProps that also keep track of props to be able to override values ?
/// multiple where ? => Add in where... and values ?
