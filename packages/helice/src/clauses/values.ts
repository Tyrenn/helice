import { Obj } from "../types.js";


/**
 * Parses a row object (or array of rows) into INSERT or UPDATE SET SQL fragments
 * with positional parameters ($1, $2, ...).
 *
 * After calling `parse()`:
 * - `columns`   — ordered list of column names
 * - `rowParams` — per-row arrays of `$n` placeholders
 * - `values`    — flat array of values matching the placeholders in order
 * - `idx`       — next available parameter index after this clause
 */
export class ValuesParser {

	columns  : string[]   = [];
	rowParams: string[][] = [];
	values   : any[]      = [];
	idx      : number     = 1;

	readonly pretty : boolean;

	constructor(pretty : boolean = true) {
		this.pretty = pretty;
	}

	/**
	 * Parses one or more row objects starting at `startIdx`.
	 * Column order is determined by the first row; subsequent rows follow the same order
	 * and fall back to `null` for missing columns.
	 */
	parse(rows : Obj | Obj[], startIdx : number = 1) : void {
		this.columns   = [];
		this.rowParams = [];
		this.values    = [];

		const rowArray = Array.isArray(rows) ? rows : [rows];
		if(rowArray.length === 0) return;

		for(const col in rowArray[0]){
			if(rowArray[0][col] !== undefined) this.columns.push(col);
		}

		let idx = startIdx;
		for(const row of rowArray){
			const params : string[] = [];
			for(const col of this.columns){
				params.push(`$${idx++}`);
				this.values.push(row[col] ?? null);
			}
			this.rowParams.push(params);
		}

		this.idx = idx;
	}

	/** `($1, $2), ($3, $4)` — one entry per row */
	get insertValuesSQL() : string {
		const rowStrs = this.rowParams.map(params => `(${params.join(', ')})`);
		return this.pretty ? rowStrs.join(',\n') : rowStrs.join(', ');
	}

	/** `col1 = $1, col2 = $2` — for UPDATE SET */
	get setSQL() : string {
		if(!this.rowParams[0]) return '';
		const sep = this.pretty ? ',\n\t' : ', ';
		return this.columns.map((col, i) => `${col} = ${this.rowParams[0][i]}`).join(sep);
	}
}
