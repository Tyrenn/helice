import { Environment } from '../types.js';
import { FlatEnvKeys } from './common.js';

export type OrderByDir = 'ASC' | 'DESC' | '';

/**
 * ORDER BY input — three accepted forms:
 *   - single column string:  'views'  |  'post.views'
 *   - column array:          ['post.published', 'post.views']
 *   - object with direction: { 'post.views': 'DESC', 'post.published': 'ASC' }
 *
 * When `From` is set (single-table query), bare column names are accepted.
 * Without `From` (joined query), fully-qualified `table.col` is required.
 */
export type OrderBy<
	Env  extends Environment,
	From extends keyof Env | undefined = undefined,
> =
	| (FlatEnvKeys<Env, From> & string)
	| ReadonlyArray<FlatEnvKeys<Env, From> & string>
	| { [K in FlatEnvKeys<Env, From> & string]?: OrderByDir };


export class OrderByParser {

	orderby: string = '';

	parse(orderBy: string | readonly string[] | Record<string, string>): void {
		this.orderby = '';

		if (typeof orderBy === 'string') {
			this.orderby = orderBy;
			return;
		}

		if (Array.isArray(orderBy)) {
			this.orderby = (orderBy as string[]).join(', ');
			return;
		}

		const parts: string[] = [];
		for (const col in orderBy as Record<string, string>) {
			const dir = (orderBy as Record<string, string>)[col];
			if (dir === undefined) continue;
			parts.push(dir ? `${col} ${dir}` : col);
		}
		this.orderby = parts.join(', ');
	}
}
