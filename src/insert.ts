import { Field, FieldHasDuplicateAliases, FieldParser, TableFromField } from "./clauses/field.js";
import { ValuesParser } from "./clauses/values.js";
import { DefaultSyntaxKeys, SyntaxKeys, SyntaxKeysConstant } from "./syntaxkeys.js";
import { Environment, MethodResultType, Obj, Simplify, Table } from "./types.js";


type InsertRow<T extends Table> = { [K in keyof T]?: T[K] | null }

type InsertPrepareOptions<T extends Table> = {
	values?: boolean;
}

type InsertPrepareArgs<T extends Table, Opts> = Simplify<
	Opts extends { values: true }
		? { values?: InsertRow<T> | Array<InsertRow<T>> }
		: {}
>


/**
 * Fluent builder for an INSERT query.
 *
 * @typeParam Env        - Full database environment.
 * @typeParam T          - Target table name (`keyof Env`).
 * @typeParam SK         - Syntax-key configuration (alias separator, etc.).
 * @typeParam ReturnType - Shape of a single RETURNING row, refined by `.returning()`.
 *                         Defaults to `{}` (no RETURNING clause).
 */
export class InsertQuery<
	Env        extends Environment,
	T          extends keyof Env & string,
	SK         extends SyntaxKeys,
	ReturnType extends Table = {}
> {

	/** Phantom: exposes ReturnType for external `typeof query.inferTableType` inference. */
	declare readonly inferTableType : ReturnType;

	#table    : string;
	#sk       : SyntaxKeysConstant;
	#values   : Obj | Obj[] | undefined;
	#returning: Field<Pick<Env, T>, T, SK> | undefined;

	constructor(table : T, sk : SyntaxKeysConstant = DefaultSyntaxKeys) {
		this.#table = table;
		this.#sk    = sk;
	}

	/**
	 * Sets the row(s) to insert. Accepts a single row object or an array of rows.
	 * Column order is derived from the first row; missing columns in subsequent
	 * rows default to NULL.
	 */
	values(v : InsertRow<Env[T]> | Array<InsertRow<Env[T]>>) {
		this.#values = v as Obj | Obj[];
		return (this as unknown) as MethodResultType<
			InsertQuery<Env, T, SK, ReturnType>,
			typeof this, "values"
		>;
	}

	/**
	 * Adds a RETURNING clause. Accepts the same syntax as SELECT's `.field()`:
	 * a string, array of strings, or object form.
	 */
	returning<const F extends Field<Pick<Env, T>, T, SK>>(
		field : [FieldHasDuplicateAliases<F, SK>] extends [false] ? F : "[WARNING] : Duplicated Column Alias"
	) {
		this.#returning = field as any;
		return (this as unknown) as MethodResultType<
			InsertQuery<Env, T, SK, TableFromField<Pick<Env, T>, F, T, SK>>,
			typeof this, "returning"
		>;
	}

	/**
	 * Returns a reusable function that generates `{ query, args }` on each call.
	 *
	 * @param options.values - Enable runtime row(s) at call time instead of build time.
	 * @param executor       - When provided, the prepared function calls it and returns its result.
	 */
	prepare<const Opts extends InsertPrepareOptions<Env[T]>>(options?: Opts): (args?: InsertPrepareArgs<Env[T], Opts>) => { query: string; args: any[] }
	prepare<const Opts extends InsertPrepareOptions<Env[T]>, Result>(options: Opts | undefined, executor: (query: string, args: any[]) => Result): (args?: InsertPrepareArgs<Env[T], Opts>) => Result
	prepare<const Opts extends InsertPrepareOptions<Env[T]>, Result>(
		options?  : Opts,
		executor? : (query: string, args: any[]) => Result
	): (args?: InsertPrepareArgs<Env[T], Opts>) => { query: string; args: any[] } | Result
	{
		return (args? : any) => {
			const castedArgs = args as any;
			const pretty     = true;

			// ── VALUES ───────────────────────────────────────────────────────────
			const effectiveValues = (options?.values && castedArgs?.values)
				? castedArgs.values as Obj | Obj[]
				: this.#values;

			const vp = new ValuesParser(pretty);
			if(effectiveValues) vp.parse(effectiveValues, 1);

			// ── RETURNING ────────────────────────────────────────────────────────
			const fp = new FieldParser(this.#sk);
			if(this.#returning) fp.parse(this.#returning as any);

			const lines : string[] = [
				`INSERT INTO ${this.#table}`,
				vp.columns.length > 0
					? `(${vp.columns.join(', ')})\nVALUES ${vp.insertValuesSQL}`
					: '',
				fp.select ? `RETURNING ${fp.select}` : '',
			];

			const result = {
				query : lines.filter(l => l.trim()).join('\n'),
				args  : vp.values,
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