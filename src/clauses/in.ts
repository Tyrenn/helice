import { shiftParams } from './common.js';

/** Covers both IN/NOT IN (column present) and EXISTS/NOT EXISTS (no column). */
export type In = { column?: string; not: boolean; fn: () => { query: string; args: any[] } };

export function buildInClauses(
	inClauses : In[],
	startIdx  : number,
	pretty    : boolean
): { sql: string; args: any[]; nextIdx: number } {
	const parts    : string[] = [];
	const argsList : any[]    = [];
	let   nextIdx             = startIdx;

	for(const { column, not, fn } of inClauses){
		const result  = fn();
		const shifted = shiftParams(result.query, nextIdx - 1);
		argsList.push(...result.args);
		nextIdx += result.args.length;
		if(column !== undefined)
			parts.push(`${column} ${not ? 'NOT IN' : 'IN'} (${shifted})`);
		else
			parts.push(`${not ? 'NOT EXISTS' : 'EXISTS'} (${shifted})`);
	}

	return {
		sql     : parts.join(pretty ? '\nAND ' : ' AND '),
		args    : argsList,
		nextIdx,
	};
}
