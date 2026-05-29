
import { Table, Environment, Obj, Column, col} from '../types.js';
import { DefaultSyntaxKeys, SKArrayCompareOPL, SKArrayCompareOPR, SKArrayEqualityOPL, SKArrayEqualityOPR, SKArrayLikeOPL, SKArrayLikeOPR, SKCompareOPL, SKCompareOPR, SKEqualityOPL, SKEqualityOPR, SKLikeOPL, SKLikeOPR, SyntaxKeys, SyntaxKeysConstant, VerboseSyntaxKeys } from '../syntaxkeys.js';
import { MaybeArray, FlatEnv, KeysNotOfType, KeysOfArray, KeysOfNonArray, KeysOfNumber, KeysOfNumberArray, KeysOfObject, KeysOfString, KeysOfStringArray, KeysOfType, WrapKeyArrayedValue, WrapKeyNoArrayValue } from './common.js';

/****************
		WHERE

	Where :
	{
		table1.column1 : value,
		"<:table1.column1" : value,
		"[]:table1.column1" : value,
		"table2.column2" : other column // Will compare 2 columns

		"&&:anyname" : Where | Where[]
	}

{
	a : "a",
	"&&:any" : [{
			b : "b2",
			a : "a2",
		},
		{
			b : "b1",
			a : "a1"
		},
		{
			b : "b3",
			"&&:any" : [{
					c : "c1",
					d : "d1"
				},
				{
					c : "c2",
					d : "d2"
				}
			]
		}
	]
}

Will translate in :
	a = "a"
	AND
	(
			(b = "b2" AND a = "a2")
		OR (b = "b1" AND a = "a1")
		OR (b = "b3" AND
				(
						(c = "c1" AND d = "d1")
					OR (c = "c2" AND d = "d2")
				)
			)
	)

*/


/* =========================================================================
   =  Grammar
   ========================================================================= */


	/** --------- TSQuery Properties ------------- */

	export type TSQuery = {
		value : string,
		weights? : number[],
		flag? : number,
		language : string;
	}

	type TSQueryProp<T, SK extends SyntaxKeys> = { [K in KeysOfStringArray<T> & string as `${SK["tsqueryL"]}${K}${SK["tsqueryR"]}`]?: TSQuery; }


	/** --------- Between Properties ------------- */

	type BetweenProp<T, SK extends SyntaxKeys> = 
		{ [k in (KeysOfNumber<T> | KeysOfString<T>) & string as `${SK["betweenL"]}${k}${SK["betweenR"]}`]?    : [T[k], T[k]] }		// BETWEEN
		& { [k in (KeysOfNumber<T> | KeysOfString<T>) & string as `${SK["notBetweenL"]}${k}${SK["notBetweenR"]}`]? : [T[k], T[k]] }	// NOT BETWEEN		


	/** --------- JSON B Properties ------------- */

	type JSONBProp<T, SK extends SyntaxKeys> = 
 			{ [k in KeysOfObject<T> & string as `${SK["jsonbContainsL"]}${k}${SK["jsonbContainsR"]}`]?       : T[k] }		// JSONB @>
		& 	{ [k in KeysOfObject<T> & string as `${SK["jsonbContainedByL"]}${k}${SK["jsonbContainedByR"]}`]? : T[k] }		// JSONB <@
		& 	{ [k in KeysOfObject<T> & string as `${SK["jsonbHasKeyL"]}${k}${SK["jsonbHasKeyR"]}`]?           : string }		// JSONB ?
		& 	{ [k in KeysOfObject<T> & string as `${SK["jsonbHasAnyKeyL"]}${k}${SK["jsonbHasAnyKeyR"]}`]?     : string[] }	// JSONB ?|
		& 	{ [k in KeysOfObject<T> & string as `${SK["jsonbHasAllKeysL"]}${k}${SK["jsonbHasAllKeysR"]}`]?   : string[] }	// JSONB ?&



	type FlatEnvWhere<
		T extends Table,

		SK extends SyntaxKeys
	> =
		WrapKeyArrayedValue<T, KeysOfNonArray<T>, T, '', ''>
		& WrapKeyArrayedValue<T, KeysOfNonArray<T>, T, SKEqualityOPL<SK>, SKEqualityOPR<SK>>									// =, !=
		& WrapKeyArrayedValue<T, KeysOfNumber<T>, T, SKCompareOPL<SK>, SKCompareOPR<SK>>							// >, >=, <, ≤ on non-array number
		& WrapKeyArrayedValue<T, KeysOfString<T>, T, SKLikeOPL<SK>, SKLikeOPR<SK>>									// LIKE operators on string
		& WrapKeyArrayedValue<T, KeysOfArray<T>, T, SKArrayEqualityOPL<SK>, SKArrayEqualityOPR<SK>>			// arrays operators [=],[!],[]… on arrays
		& WrapKeyNoArrayValue<T, KeysOfNumberArray<T>, T, SKArrayCompareOPL<SK>, SKArrayCompareOPR<SK>>		// >, >=, <, ≤ on number[]
		& WrapKeyNoArrayValue<T, KeysOfStringArray<T>, T, SKArrayLikeOPL<SK>, SKArrayLikeOPR<SK>>				// LIKE operators on string[]
		& { [k in `${SK["andGroup"]}${string}`]? : FlatEnvWhere<T, SK>[]}												// nested AND
		& TSQueryProp<T, SK>		 																									// @@:tsquery
		& BetweenProp<T, SK>
		& JSONBProp<T, SK>


/* =========================================================================
   =  Final Types
   ========================================================================= */


	/**
	 * Restricts which tables and columns are accessible in a runtime WHERE clause.
	 * - `true`                          → full table accessible
	 * - `ReadonlyArray<colName>`        → only listed columns accessible
	 */
	export type WhereRestrictionSpec<Env extends Environment> = {
		[K in keyof Env]?: true | ReadonlyArray<keyof Env[K] & string>
	}

	/**
	 * Converts a WhereRestrictionSpec into a narrowed Environment containing only
	 * the tables and columns allowed by the spec.
	 */
	export type EnvFromWhereRestrictionSpec<Env extends Environment, Spec extends WhereRestrictionSpec<Env>> = {
		[K in keyof Spec & keyof Env]:
			Spec[K] extends true
				? Env[K]
				: Spec[K] extends ReadonlyArray<infer Cols extends keyof Env[K] & string>
					? { [C in Cols]: Env[K][C] }
					: never
	}

	export type Where<
		Env extends Environment,
		SK extends SyntaxKeys,
		OnlyOneTable extends keyof Env | undefined = undefined,
	> = MaybeArray<FlatEnvWhere<FlatEnv<Env, OnlyOneTable>, SK>>;








/* =========================================================================
   =  UTILS
   ========================================================================= */



export class WhereParser{

	idx: number = 1;

	values: any[] = [];

	where : string = "";

	from : string = "";

	readonly SK : SyntaxKeysConstant;
	readonly pretty : boolean;

	readonly VALUE_REGEX   : RegExp;
	readonly ARRAY_REGEX   : RegExp;
	readonly TSQUERY_REGEX : RegExp;
	readonly AND_REGEX     : RegExp;
	readonly BETWEEN_REGEX : RegExp;
	readonly JSONB_REGEX   : RegExp;

	constructor(sk : SyntaxKeysConstant, pretty : boolean = true){
		this.SK     = sk;
		this.pretty = pretty;

		// Match `{sk[]}name{sk[]}` and `name` (opl is optional — allows plain equality keys)
		this.VALUE_REGEX = new RegExp(
			String.raw`^(?<opl>(?:${
				[ this.SK['likeL'], this.SK['softLikeL'], this.SK['dislikeL'], this.SK['softDislikeL'], this.SK['regexLikeL'], this.SK['softRegexLikeL'], this.SK['equalityL'], this.SK['inequalityL'], this.SK['softSuperiorL'], this.SK['softInferiorL'], this.SK['strictSuperiorL'], this.SK['strictInferiorL']]
					.flatMap(v => Array.isArray(v) ? v : [v]).map(v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
			}|))(?<name>[A-Za-z0-9_.]+)(?<opr>${
				[ this.SK['likeR'], this.SK['softLikeR'], this.SK['dislikeR'], this.SK['softDislikeR'], this.SK['regexLikeR'], this.SK['softRegexLikeR'], this.SK['equalityR'], this.SK['inequalityR'], this.SK['softSuperiorR'], this.SK['softInferiorR'], this.SK['strictSuperiorR'], this.SK['strictInferiorR']]
					.flatMap(v => Array.isArray(v) ? v : [v]).map(v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
			})$`);
			
		this.ARRAY_REGEX = new RegExp(
			String.raw`^(?<opl>(?:${
				[ this.SK['arrayLikeL'], this.SK['arraySoftLikeL'], this.SK['arrayDislikeL'], this.SK['arraySoftDislikeL'], this.SK['arrayRegexLikeL'], this.SK['arraySoftRegexLikeL'], this.SK['arrayEqualityL'], this.SK['arrayInequalityL'], this.SK['arraySoftSuperiorL'], this.SK['arraySoftInferiorL'], this.SK['arrayStrictSuperiorL'], this.SK['arrayStrictInferiorL']]
					.flatMap(v => Array.isArray(v) ? v : [v]).map(v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
			}))(?<name>[A-Za-z0-9_.]+)(?<opr>${
				[ this.SK['arrayLikeR'], this.SK['arraySoftLikeR'], this.SK['arrayDislikeR'], this.SK['arraySoftDislikeR'], this.SK['arrayRegexLikeR'], this.SK['arraySoftRegexLikeR'], this.SK['arrayEqualityR'], this.SK['arrayInequalityR'], this.SK['arraySoftSuperiorR'], this.SK['arraySoftInferiorR'], this.SK['arrayStrictSuperiorR'], this.SK['arrayStrictInferiorR']]
					.flatMap(v => Array.isArray(v) ? v : [v]).map(v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
			})$`);

		this.TSQUERY_REGEX = new RegExp(
			String.raw`^(?<opl>(?:${
				[ this.SK['tsqueryL'] ].flatMap(v => Array.isArray(v) ? v : [v]).map(v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
			}))(?<name>[A-Za-z0-9_.]+)(?<opr>${
				[ this.SK['tsqueryR'] ].flatMap(v => Array.isArray(v) ? v : [v]).map(v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
			})$`);

		this.AND_REGEX = new RegExp(
			String.raw`^(?:${
				[ this.SK['andGroup'] ].flatMap(v => Array.isArray(v) ? v : [v]).map(v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
			})(?<name>[A-Za-z0-9_.]+)$`);

		this.BETWEEN_REGEX = new RegExp(
			String.raw`^(?<opl>(?:${
				[ this.SK['betweenL'], this.SK['notBetweenL'] ]
					.flatMap(v => Array.isArray(v) ? v : [v]).map(v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
			}|))(?<name>[A-Za-z0-9_.]+)(?<opr>(?:${
				[ this.SK['betweenR'], this.SK['notBetweenR'] ]
					.flatMap(v => Array.isArray(v) ? v : [v]).map(v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
			}))$`);
		// jsonbHasAnyKeyL / jsonbHasAllKeysL listed before jsonbHasKeyL to avoid prefix ambiguity (?|: before ?:)
		this.JSONB_REGEX = new RegExp(
			String.raw`^(?<opl>(?:${
				[ this.SK['jsonbHasAnyKeyL'], this.SK['jsonbHasAllKeysL'], this.SK['jsonbContainsL'], this.SK['jsonbContainedByL'], this.SK['jsonbHasKeyL'] ]
					.flatMap(v => Array.isArray(v) ? v : [v]).map(v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
			}|))(?<name>[A-Za-z0-9_.]+)(?<opr>(?:${
				[ this.SK['jsonbHasAnyKeyR'], this.SK['jsonbHasAllKeysR'], this.SK['jsonbContainsR'], this.SK['jsonbContainedByR'], this.SK['jsonbHasKeyR'] ]
					.flatMap(v => Array.isArray(v) ? v : [v]).map(v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
			}))$`);
	}

	private pushValue(v : any) : string {
		if(Array.isArray(v) && v.some(s => s instanceof Column)) //Check if array and if contains a Column instance
			return `'{${v.map(s => {
				if(s instanceof Column)
					return s.name;
				this.values.push(s);
				return `$${this.idx++}`;
			}).join(', ')}}'`
		else if(v instanceof Column)
			return v.name;
		else{
			this.values.push(v);
			return `$${this.idx++}`;
		}
	}

	private matchSK(skKey : keyof SyntaxKeysConstant, key : string){
		return Array.isArray(this.SK[skKey]) ? this.SK[skKey].includes(key) : this.SK[skKey] === key;
	}

	private processArrayColumn(op : string, opType : "like" | "equality" | "inequality" | "compare", name : string, value : any){
		
		if(opType === "equality")
			if (!Array.isArray(value))
				return this.where += `${this.pushValue(value)} = ANY(${name})`;
			else if(value.length == 1)
				return this.where += `${this.pushValue(value[0])} = ANY(${name})`;
			else
				return this.where += `( ${value.filter(v => v !== null).map(v => `${this.pushValue(v)} = ANY(${name}`).join(' OR ')} ${value.includes(null) ? `OR ${name} IS NULL ` : ''})` ;
	
		else if(opType === 'inequality')
			if(!Array.isArray(value))
				return this.where += `${this.pushValue(value)} ${op} ALL(${name})`
			else if(value.length == 1)
				return this.where += `${this.pushValue(value[0])} ${op} ALL(${name})`
			else
				return this.where += `( ${value.filter(v => v !== null).map(v => `${this.pushValue(v)} ${op} ALL(${name})`).join(' AND ')} ${value.includes(null) ? `AND ${name} IS NOT NULL ` : ''})`

		else if(opType === 'like')
			if(!Array.isArray(value))
				return this.where += `array_to_string(${name}, ' ') ${op} ${this.pushValue(value)}`;
			else if(value.length == 1)
				return this.where += `array_to_string(${name}, ' ') ${op} ${this.pushValue(value[0])}`;
			else
				return this.where += `( ${value.filter(v => v !== null).map(v => `array_to_string(${name}, ' ') ${op} ${this.pushValue(v)}`).join(' OR ')} ${value.includes(null) ? `OR ${name} IS NULL ` : ''} )`;

		else if(opType === 'compare')
			if(!Array.isArray(value))
				return this.where += `${this.pushValue(value)} ${op} ALL(${name})`
			else
				return
	}


	/**
	* Transforms [] props
		[]:arr : [1, 2] 			=> 	arr = [1,2]
		[!]:arr :	[1, 2] 		=> 	arr <> [1,2]
		[=]:arr : [1,2]  			=>  	(1 = ANY(arr) OR 2 = ANY(arr))
		[=]:arr : 1 				=> 	1 = ANY(arr)
		[<>]:arr : [1,2] 			=> 	(1 <> ALL(arr) OR 2 <> ALL(arr))
		[<>]:arr : 1 				=> 	1 <> ALL(arr)
		[~~*]:arr : "test"		=>		"test" ~~* array_to_string(arr, ' ')
		[~~]:arr : [1, 2, null]		=>		(i is NULL OR 1 ~~ array_to_string(arr, ' ') OR 2 ~~ array_to_string(arr, ' '))
	*/
	private parseArray(key : string, value : any){
		const match = key.match(this.ARRAY_REGEX);

		if (!match || !match.groups?.name)
			return;

		
		if ((!match.groups.opl && !match.groups.opr) || (this.matchSK('arrayEqualityL', match.groups.opl) && this.matchSK('arrayEqualityR', match.groups.opr)))
			return this.processArrayColumn("=", "equality", match.groups?.name, value);

		else if(this.matchSK('arrayInequalityL', match.groups.opl) && this.matchSK('inequalityL', match.groups.opr))
			return this.processArrayColumn("<>", "inequality", match.groups?.name, value);
		
		// LIKE OPERATORS
		else if(this.matchSK('arrayLikeL', match.groups.opl) && this.matchSK('arrayLikeR', match.groups.opr))
			return this.processArrayColumn("~~", "like", match.groups?.name, value);
		else if(this.matchSK('arraySoftLikeL', match.groups.opl) && this.matchSK('arraySoftLikeR', match.groups.opr))
			return this.processArrayColumn("~~*", "like", match.groups?.name, value);
		else if(this.matchSK('arrayDislikeL', match.groups.opl) && this.matchSK('arrayDislikeR', match.groups.opr))
			return this.processArrayColumn("!~~", "like", match.groups?.name, value);
		else if(this.matchSK('arraySoftDislikeL', match.groups.opl) && this.matchSK('arraySoftDislikeR', match.groups.opr))
			return this.processArrayColumn("!~~*", "like", match.groups?.name, value);
		else if(this.matchSK('arrayRegexLikeL', match.groups.opl) && this.matchSK('arrayRegexLikeR', match.groups.opr))
			return this.processArrayColumn("~", "like", match.groups?.name, value);
		else if(this.matchSK('arraySoftRegexLikeL', match.groups.opl) && this.matchSK('arraySoftRegexLikeR', match.groups.opr))
			return this.processArrayColumn("~*", "like", match.groups?.name, value);

		// COMPARE OP
		else if(this.matchSK('arraySoftSuperiorL', match.groups.opl) && this.matchSK('arraySoftSuperiorR', match.groups.opr))
			return this.processArrayColumn(">=", "compare", match.groups?.name, value);
		else if(this.matchSK('arraySoftInferiorL', match.groups.opl) && this.matchSK('arraySoftInferiorR', match.groups.opr))
			return this.processArrayColumn("<=", "compare", match.groups?.name, value);
		else if(this.matchSK('arrayStrictSuperiorL', match.groups.opl) && this.matchSK('arrayStrictSuperiorR', match.groups.opr))
			return this.processArrayColumn(">", "compare", match.groups?.name, value);
		else if(this.matchSK('arrayStrictInferiorL', match.groups.opl) && this.matchSK('arrayStrictInferiorR', match.groups.opr))
			return this.processArrayColumn("<", "compare", match.groups?.name, value);
	}


	/**
	 * Helper to handle case targeted column is not an array
	 * @param skKey 
	 * @param op 
	 * @param arrMethod Defines the method in front of array
	 * @param nullOP Defines the behavior if encounter null
	 * @param name 
	 * @param value 
	 * @returns 
	 */
	private processValueColumn(op : string, arrMethod : "ANY" | "ALL", nullOP : "IS" | "IS NOT", name : string, value : any){

		// Null case
		if(value === null)
			return this.where += `${name} ${nullOP} NULL`;
		else if (!Array.isArray(value))
			return this.where += `${name} ${op} ${this.pushValue(value)}`;
		else if (value.length == 1)
			return this.where += `${name} ${op} ${this.pushValue(value[0])}`;
		// Array case
		else
			return this.where += value.includes(null) ? `( ${name} ${nullOP} NULL AND ${name} ${op} ${arrMethod}(${this.pushValue(value)}) )` : `${name} ${op} ${arrMethod}(${this.pushValue(value)})`;
	}


   /**
	 * Transforms sign:prop and prop
		=:i : 1 				=> 		i = 1
		<>:i : null 		=> 		i is not NULL
		i : 2					=> 		i = 2
		<:i : 2				=> 		i = 2
		i : [1,2]			=> 		i = ANY([1,2])
		i : [1, null]		=>			(i is NULL OR i = ANY([1]))
		<>:i : [1, null]	=>			(i is not NULL AND i <> ALL([1]))
		~~*:i : "test"		=>			i ~~* "test"
		~~:i : [1, null]	=>			(i is NULL OR i ~~ array_to_string([1], ' '))
	 */
	private parseValue(key : string, value : any) {
		const match = key.match(this.VALUE_REGEX);

		if (!match || !match.groups?.name)
			return;

		if ((!match.groups.opl && !match.groups.opr) || (this.matchSK('equalityL', match.groups.opl) && this.matchSK('equalityR', match.groups.opr)))
			return this.processValueColumn("=", "ANY", "IS", match.groups?.name, value);

		else if(this.matchSK('inequalityL', match.groups.opl) && this.matchSK('inequalityL', match.groups.opr))
			return this.processValueColumn("<>", "ALL", "IS NOT", match.groups?.name, value);
		
		// LIKE OPERATORS
		else if(this.matchSK('likeL', match.groups.opl) && this.matchSK('likeR', match.groups.opr))
			return this.processValueColumn("~~", "ANY", "IS NOT", match.groups?.name, value);
		else if(this.matchSK('softLikeL', match.groups.opl) && this.matchSK('softLikeR', match.groups.opr))
			return this.processValueColumn("~~*", "ANY", "IS NOT", match.groups?.name, value);
		else if(this.matchSK('dislikeL', match.groups.opl) && this.matchSK('dislikeR', match.groups.opr))
			return this.processValueColumn("!~~", "ANY", "IS NOT", match.groups?.name, value);
		else if(this.matchSK('softDislikeL', match.groups.opl) && this.matchSK('softDislikeR', match.groups.opr))
			return this.processValueColumn("!~~*", "ANY", "IS NOT", match.groups?.name, value);
		else if(this.matchSK('regexLikeL', match.groups.opl) && this.matchSK('regexLikeR', match.groups.opr))
			return this.processValueColumn("~", "ANY", "IS NOT", match.groups?.name, value);
		else if(this.matchSK('softRegexLikeL', match.groups.opl) && this.matchSK('softRegexLikeR', match.groups.opr))
			return this.processValueColumn("~*", "ANY", "IS NOT", match.groups?.name, value);

		// COMPARE OP
		else if(this.matchSK('softSuperiorL', match.groups.opl) && this.matchSK('softSuperiorR', match.groups.opr))
			return this.processValueColumn(">=", "ALL", "IS NOT", match.groups?.name, value);
		else if(this.matchSK('softInferiorL', match.groups.opl) && this.matchSK('softInferiorR', match.groups.opr))
			return this.processValueColumn("<=", "ALL", "IS NOT", match.groups?.name, value);
		else if(this.matchSK('strictSuperiorL', match.groups.opl) && this.matchSK('strictSuperiorR', match.groups.opr))
			return this.processValueColumn(">", "ALL", "IS NOT", match.groups?.name, value);
		else if(this.matchSK('strictInferiorL', match.groups.opl) && this.matchSK('strictInferiorR', match.groups.opr))
			return this.processValueColumn("<", "ALL", "IS NOT", match.groups?.name, value);
	}



	private parseTSQuery(key : string, value : any){
		const match = key.match(this.TSQUERY_REGEX);

		if (!match || !match.groups?.name)
			return;

		this.from += `to_tsquery(${this.pushValue(value.language)}, ${this.pushValue(value.value)}) as ${match.groups.name.replace('.', '_')}_query, ts_rank_cd(${this.pushValue(value.weights ?? [0.1, 0.2, 0.4, 1.0])}, ${match.groups.name}, ${match.groups.name.replace('.', '_')}_query, ${value.flag ?? '32'}) AS ${match.groups.name.replace('.', '_')}_rank,`;
		this.where += `${match.groups.name.replace('.', '_')}_query @@ ${match.groups.name}`;
	}


	private parseBetween(key: string, value: any): void {
		const match = key.match(this.BETWEEN_REGEX);
		if(!match?.groups?.name) return;
		const { opl, opr, name } = match.groups;

		if(this.matchSK('betweenL', opl) && this.matchSK('betweenR', opr))
			this.where += `${name} BETWEEN ${this.pushValue(value[0])} AND ${this.pushValue(value[1])}`;
		else if(this.matchSK('notBetweenL', opl) && this.matchSK('notBetweenR', opr))
			this.where += `${name} NOT BETWEEN ${this.pushValue(value[0])} AND ${this.pushValue(value[1])}`;
	}

	private parseJSONB(key: string, value: any): void {
		const match = key.match(this.JSONB_REGEX);
		if(!match?.groups?.name) return;
		const { opl, opr, name } = match.groups;

		if      (this.matchSK('jsonbContainsL', opl)    && this.matchSK('jsonbContainsR', opr))    this.where += `${name} @> ${this.pushValue(value)}`;
		else if (this.matchSK('jsonbContainedByL', opl) && this.matchSK('jsonbContainedByR', opr)) this.where += `${name} <@ ${this.pushValue(value)}`;
		else if (this.matchSK('jsonbHasKeyL', opl)      && this.matchSK('jsonbHasKeyR', opr))      this.where += `${name} ? ${this.pushValue(value)}`;
		else if (this.matchSK('jsonbHasAnyKeyL', opl)   && this.matchSK('jsonbHasAnyKeyR', opr))   this.where += `${name} ?| ${this.pushValue(value)}`;
		else if (this.matchSK('jsonbHasAllKeysL', opl)  && this.matchSK('jsonbHasAllKeysR', opr))  this.where += `${name} ?& ${this.pushValue(value)}`;
	}

	private parseAND(key : string, value : any, depth : number){
		const match = key.match(this.AND_REGEX);
		if (!match || !match.groups?.name) return;
		this._parseInternal(value, depth);
	}

	private _parseInternal(where: Obj | Obj[], depth: number){
		const tab    = (n : number) => '\t'.repeat(n);
		const andSep = this.pretty ? `\n${tab(depth)}AND ` : ' AND ';

		if(Array.isArray(where)){
			this.where += '(';
			for(let i = 0; i < where.length; i++){
				if(i > 0){
					this.where += this.pretty ? `\n${tab(depth + 1)}OR ` : ' OR ';
				} else {
					this.where += this.pretty ? `\n${tab(depth + 1)}` : ' ';
				}
				this.where += this.pretty ? `(\n${tab(depth + 2)}` : '( ';
				this._parseInternal(where[i], depth + 2);
				this.where += this.pretty ? `\n${tab(depth + 1)})` : ' )';
			}
			this.where += this.pretty ? `\n${tab(depth)})` : ' ) ';
			return;
		}

		for(const prop in where){
			if(where[prop] === undefined) continue;
			this.parseAND(prop, where[prop], depth);
			this.parseTSQuery(prop, where[prop]);
			this.parseArray(prop, where[prop]);
			this.parseBetween(prop, where[prop]);
			this.parseJSONB(prop, where[prop]);
			this.parseValue(prop, where[prop]);
			this.where += andSep;
		}

		this.where = this.where.slice(0, -andSep.length);
	}

	parse(where: Obj | Obj[], idx : number = 1){
		this.idx    = idx;
		this.values = [];
		this.where  = '';
		this.from   = '';
		this._parseInternal(where, 0);
	}
}


/**
 * Flatten an array of objects or an object as WHERE clause

	Example 1

		let obj = {
			nb : 0,
			nb2 : 12,
			ar : ['b', 'a'],
			"[]:ar" : ['b', 'a'],
			"[=]:br" : ['b'],
			str : 'hello',
			u : undefined,
			n : null,
			t : [{
					_ : 25,
					nb : 10,
					str : 'aurevoir'
				},
				{
					_ : 24,
					nb : 9,
					str : "byebye"
				}
			],
			"@@:test" : {
				value : "bonjour la recherche",
				weights : [0.1,0.2,0.4,0.1],
				flag : 32,
				language : 'unaccent_french'
			}
		};

		RESULT
		{
			where: 'nb = $1 AND nb2 = $2 AND ar = ANY($3) AND ar = $4 AND br = $5 AND str = $6 AND n is $7 AND (t = $8 AND nb = $9 AND str = $10 )  OR (t = $11 AND nb = $12 AND str = $13 ) AND test_query @@ test ',
			from: ', to_tsquery($15, $16) as test_query,', ts_rank_cd($14, test,  test_query, 32) AS test_rank
			values: [0, 12, [ 'b', 'a' ], [ 'b', 'a' ], 'b', 'hello', null, 25, 10, 'aurevoir', 24, 9, 'byebye', [ 0.1, 0.2, 0.4, 0.1 ], 'unaccent_french',	'bonjour la recherche'],
			nextvar: 17
		}
*/
export function mergeWHEREAsAND(pretty : boolean, ...where : (string|undefined)[]){
	let res = '';
	for(const s of where){
		if(s && s.replace(/\s/g, '').length > 0){
			if(res) res += pretty ? '\nAND ' : ' AND ';
			res += s;
		}
	}

	if(!res || res.replace(/\s/g, '').length === 0) return '';

	if(pretty)
		return '(\n\t' + res.replace(/\n/g, '\n\t') + '\n)';
	else
		return `( ${res} )`;
}


export function mergeWHEREAsOR(...where : (string | undefined)[]){
	let res = '';
	for(const s of where){
		if(s && s.replace(/\s/g, '').length > 0)
			res += s + ' OR '
	}
	res = res.slice(0, -4);

	return res && res.replace(/\s/g, '').length > 0 ? `( ${res} )` : '';
}