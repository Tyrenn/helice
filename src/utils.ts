//import { Arrayed, TableWhere, Obj, QueryResult, TableField, OrderBy, PostgreDAO, Insert, SelectQueryFunction, InsertQueryFunction, ExistsQueryFunction, UpdateQueryFunction, DeleteQueryFunction, tsqueryWhere } from './types/index.js';

import {Environment, Join, Obj, tsqueryWhere} from './types';

/* CLAUSE helper functions */

/**
 * Flatten an array of objects or an object for INSERT useful clauses

	Array of objects example

		let objs = [
			{nb : 12, ar : ['b', 'a'], str : 'hello'},
			{nb : 14, ar : ['c', 'd'], str : 'bye'}
		];

		{
			properties: 'nb,ar,str',
			variables: '($1,$2,$3),($4,$5,$6)',
			values: [ 12, [ 'b', 'a' ], 'hello', 14, [ 'c', 'd' ], 'bye' ],
			nextdollar: 6
		}

	Object example

		let obj = {nb : 12, ar : ['b', 'a'], str : 'hello'};

		{
			properties: 'nb,ar,str',
			variables: '($1,$2,$3)',
			values: [ 12, [ 'b', 'a' ], 'hello' ],
			nextdollar: 3
		}
 */
export function toINSERTClauses(data : Obj | Obj[], startvar : number = 1, encryptedColumns? : string[]) : {properties : string, variables : string, values : Array<any>, nextvar : number}{
	const value : any[] = [];
	let variables = "";
	let properties = "";
	let i = startvar;

	const flattenValues = (obj : any) => {
		if(!obj || typeof obj !== 'object')
			return

		variables += '(';
		for(const prop in obj){
			if(typeof obj[prop] === "undefined")
				continue
			if(obj[prop] === 'DEFAULT'){
				variables += 'DEFAULT,';
				continue
			}
			variables += `${encryptedColumns?.includes(prop) ? 'encrypt:' : ''}$${i++},`;
			value.push(obj[prop]);
		}
		variables = variables.slice(0, -1);
		variables += "),";
	}

	const flattenProps = (obj : any) => {
		if(!obj || typeof obj !== 'object')
			return

		for(const prop in obj){
			if(typeof obj[prop] !== "undefined")
				properties += `${prop},`;
		}
	}

	if(Array.isArray(data)){

		flattenProps(data[0]);

		const nbprops = Object.keys(data[0]).length;
		for(const obj of data){
			if(Object.keys(obj).length != nbprops)
				throw new Error('Unormalized data');
			flattenValues(obj);
		}
	}
	else{
		flattenProps(data);
		flattenValues(data);
	}

	variables = variables.slice(0, -1);
	properties = properties.slice(0, -1);

	return {properties : properties, variables: variables, values: value, nextvar : i};
}



/**
	Transform an object to a fields clause string

	EXAMPLE :

	{
		a : {
			'*' : ""
		},
		b : "aliasb",
		c : {
			propc1 : 'pc1',
			propc2 : 'pc2'
		}
	}

	OUTPUT : a.*, b AS aliasb, c.propc1 AS pc1, c.propc2 AS pc2
 */

export function toSELECTClause(data : Obj | '*', prefix? : string, encryptedColumns? : string[]) : string{
	if(data === '*' && encryptedColumns)
		throw new Error("Cannot use global selector with encrypted columns");

	if(data === '*')
		return '*';

	let fields = "";
	const dottedPrefix = prefix ? prefix + "." : '';

	for(const prop in data){
		if(typeof data[prop] === 'object'){
			fields += toSELECTClause(data[prop], prop) + ', ';
		}
		else {
			const name = data[prop] !== "" ? data[prop] : undefined;
			fields += `${dottedPrefix}${encryptedColumns?.includes(prop) ? 'decrypt:' : ''}${prop}${(!!name || encryptedColumns?.includes(prop)) ? ` AS ${name ?? prop}` : ""}, `;
		}
	}
	fields = fields.slice(0,-2);

	return fields;
}



/**
 * Flatten an array of objects or an object as UPDATE useful clauses
		let obj = {nb : 12, ar : ['b', 'a'], str : 'hello'};
		{
			set: 'nb = $1,ar = $2,str = $3,',
			values: [ 12, [ 'b', 'a' ], 'hello' ],
			nextvar: 3
		}
 */
export function toUPDATEClauses(data : Obj, startvar : number = 1, encryptedColumns? : string[]) : {set : string, values : Array<any>, nextvar : number}{
	const values : Array<any> = [];
	let set : string = "";
	let i = startvar;

	for(const prop in data){
		if(typeof data[prop] !== "undefined"){
			set += `${prop} = ${encryptedColumns?.includes(prop) ? 'encrypt:' : ''}$${i++},`;
			values.push(data[prop]);
		}
	}

	set = set.slice(0, -1);

	return {set, values, nextvar : i};
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
export function whereToSQL(filter : Obj | Obj[], startdollar : number = 1, prefix? : string, encryptedColumns? : string[]) : {where : string, from : string, values : Array<any>, nextvar : number} {
	let values : any = [];
	let where = "";
	let from = "";
	let i = startdollar;

	const dottedPrefix = prefix ? prefix + '.' : '';
	const dashedPrefix = prefix ? prefix + '_' : '';

	const pushValue = (val : any) => {
		values.push(val);
		return i++;
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
	const flattenValForArrayProp = (prop : string, sign : string, val : any) => {
		let decryptedProp;
		const match = prop.match(/^(.*)\(([^)]*)\)(.*)/);
		if(match && match.length > 3){
			decryptedProp = `${match[1]}(${encryptedColumns?.includes(match[2]!) ? 'decrypt:' : ''}${dottedPrefix}${match[2]})${match[3]}`;
		}
		else{
			decryptedProp = `${encryptedColumns?.includes(prop) ? 'decrypt:' : ''}${dottedPrefix}${prop}`;
		}

		// []:arr : [1, 2] => arr = [1,2]
		if(sign === "")
			where += (val === null ?  `${dottedPrefix}${prop} is NULL` : `${decryptedProp} = $${pushValue(val)}`);

		//[!]:arr :	[1, 2] => arr != [1,2]
		else if(sign === "!")
			where += (val === null ? `${dottedPrefix}${prop} is not NULL` : `${decryptedProp} <> $${pushValue(val)}`);

		// [=]:arr : 1 => 1 = ANY(arr)
		// [<>]:arr : 1 => 1 <> ALL(arr)
		else if(!Array.isArray(val)){
			if(sign === "~~" || sign === "~~*" || sign === "!~~" || sign === "!~~*")
				where += `array_to_string(${decryptedProp}, ' ') ${sign} $${pushValue(val)}`;
			else if (sign === "" || sign === "=")
				where += `$${pushValue(val)} ${sign} ANY(${decryptedProp})`;
			else
				where += `$${pushValue(val)} ${sign} ALL(${decryptedProp})`;
		}

		// [=]:arr : [1] => 1 = ANY(arr)
		// [<>]:arr : [1] => 1 <> ALL(arr)
		// [~~*]:arr : ["test"] => "test" ~~* array_to_string(arr, ' ')
		else if(val.length == 1){
			if(sign === "~~" || sign === "~~*" || sign === "!~~" || sign === "!~~*")
				where += `array_to_string(${decryptedProp}, ' ') ${sign} $${pushValue(val[0])}`;
			else if (sign === "" || sign === "=")
				where += `$${pushValue(val[0])} ${sign} ANY(${decryptedProp})`;
			else
				where += `$${pushValue(val[0])} ${sign} ALL(${decryptedProp})`;
		}

		// [=]:arr : [1,2] => (1 = ANY(arr) OR 2 = ANY(arr))
		// [<>]:arr : [1,2] => (1 <> ALL(arr) AND 2 <> ALL(arr))
		// [~~]:arr : [1,2, null] => (i is NULL OR 1 ~~ array_to_string(arr, ' ') OR 2 ~~ array_to_string(arr, ' '))
		else if(val.length > 0){
			where += '( '
			if(val.includes(null)){
				val = val.filter(n => n !== null);
				where += `${dottedPrefix}${prop} ${sign === "" || sign === '=' ? 'is NULL OR ' : "is not NULL AND "}`;
			}
			for(const v of val){
				if(sign === "~~" || sign === "~~*" || sign === "!~~" || sign === "!~~*")
					where += `array_to_string(${decryptedProp}, ' ') ${sign} $${pushValue(v)} OR `;
				else if(sign === "" || sign === "=")
					where += `$${pushValue(v)} ${sign} ANY(${decryptedProp}) OR `;
				else
					where += `$${pushValue(v)} ${sign} ALL(${decryptedProp}) AND `;
			}
			where = where.slice(0, -4);	// Removing ' OR '
			where += ' )';
		}
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
		~*:i : "test"		=>			i ~* "test"
		~:i : [1, null]	=>			(i is NULL OR i ~ array_to_string([1], ' '))
	 */
	const flattenValForProp = (prop : string, sign : string, val : any) => {
		let decryptedProp;
		const match = prop.match(/^(.*)\(([^)]*)\)(.*)/);
		if(match && match.length > 3){
			decryptedProp = `${match[1]}(${encryptedColumns?.includes(match[2]!) ? 'decrypt:' : ''}${dottedPrefix}${match[2]})${match[3]}`;
		}
		else{
			decryptedProp = `${encryptedColumns?.includes(prop) ? 'decrypt:' : ''}${dottedPrefix}${prop}`;
		}

		if(val === null){
			if(sign === '' || sign === '=')
				sign = 'is';
			if(sign === '!=' || sign === '<>')
				sign = 'is not';
			where += `${dottedPrefix}${prop} ${sign} NULL`;
		}
		else if(Array.isArray(val) && val.length > 1){
			if(val.includes(null)){
				val = val.filter(n => n !== null);
				where += `(${dottedPrefix}${prop} ${sign === '' || sign === "=" ? 'is NULL OR' : 'is not NULL AND' } `
				if(sign === "" || sign === "=")
					where += `${decryptedProp} ${sign} ANY($${pushValue(val)})`;
				else if(sign === '~~' || sign === '~~*' || sign === '!~~' || sign === '!~~*')
					where += `array_to_string($${pushValue(val)}, ' ') ${sign} ${decryptedProp}`;
				else
					where += `${decryptedProp} ${sign} ALL($${pushValue(val)})`;
				where += ')'
			}

			else if(sign === "" || sign === "=")
				where += `${decryptedProp} ${sign} ANY($${pushValue(val)})`;
			else if(sign === '~~' || sign === '~~*' || sign === '!~~' || sign === '!~~*' || sign === '~' || sign === '~*')
				where += `array_to_string($${pushValue(val)}, ' ') ${sign} ${decryptedProp}`;
			else	// Should be '<>'
				where += `${decryptedProp} ${sign} ALL($${pushValue(val)})`;
		}
		else if(Array.isArray(val) && val.length > 0){
			where += `${decryptedProp} ${sign} $${pushValue(val[0])}`;
		}
		else if(Array.isArray(val) && val.length == 0){
			where += `${dottedPrefix}${prop} ${sign === '' || sign === "=" ? 'is NULL' : 'is not NULL' }`;
		}
		else{
			where += `${decryptedProp} ${sign} $${pushValue(val)}`;
		}
	}

	/**
	 * Transforms @@:prop
	 * tsqueryWhere =>
	 * 	from : to_tsquery(language, value) as prefix_prop_query, ts_rank_cd(weights, prefix.prop, prefix_prop_query, flag) as prefix_prop_rank
	 * @param prop
	 * @param obj
	 */
	const flattenAAProp = (prop : string, obj : tsqueryWhere) => {
		from += `to_tsquery($${i++}, $${i++}) as ${dashedPrefix}${prop}_query, ts_rank_cd($${i++}, ${dottedPrefix}${prop},  ${dashedPrefix}${prop}_query, ${obj.flag ?? '32'}) AS ${dashedPrefix}${prop}_rank`;
		where += `${dashedPrefix}${prop}_query @@ ${prop}`;
		values.push(obj.language, obj.value, obj.weights ?? [0.1, 0.2, 0.4, 1.0]);
	}

	const flattenANDProp = (array : Array<Obj>) => {
		where += ' (';
		for(const o of array){
			const flt = whereToSQL(o, i, prefix);
			where += ` ( ${flt.where} ) OR`;
			from += flt.from;
			i = flt.nextvar;
			values = [...values, ...flt.values];
		}
		where = where.slice(0, -2);
		where += ')';
	}

	const flatten = (obj : any) => {
		for(const prop in obj){
			if(obj[prop] === undefined)
				continue;
			let execRes;

			const andRegex = /^&&.*/;
			const aaRegex = /^@@:(.*)/;
			const arrRegex = /^\[(|!|=|<>|!=|~~|~~\*|!~~|!~~\*)\]:((?:[^()]+$)|.*\(([^)]*)\).*)/;
			const singleRegex = /^(|=|<>|!=|>|>=|<|<=|~~|~~\*|!~~|!~~\*|~|~\*):((?:[^()]+$)|.*\(([^)]*)\).*)/;

			if(andRegex.exec(prop) !== null && Array.isArray(obj[prop])){
				flattenANDProp(obj[prop]);
			}
			else if((execRes = aaRegex.exec(prop)) !== null){
				flattenAAProp(execRes[1]!, obj[prop]);
			}
			else if((execRes = arrRegex.exec(prop)) !== null){
				flattenValForArrayProp(execRes[2]!, execRes[1]!, obj[execRes.length > 2 ? execRes[3] ?? prop : prop]);
			}else if((execRes = singleRegex.exec(prop)) !== null){
				flattenValForProp(execRes[2]!, execRes[1] === '' ? '=' : execRes[1]!, obj[execRes.length > 2 ? execRes[3] ?? prop : prop]);
			}else{
				flattenValForProp(prop, '=', obj[prop]);
			}
			where += ' AND ';
		}
		where = where.slice(0,-5);
	}

	if(Array.isArray(filter)){
		for(const obj of filter){
			if(i > startdollar)
				where += ` OR `;
			where += `(`;

			flatten(obj);

			where += ') '
		}
	}
	else{
		flatten(filter);
	}

	return {where, from, values, nextvar : i};
}

export function envWhereToWHEREClauses(filter : Obj | Obj[], startdollar : number = 1, encryptedColumns? : string[]) : {where : string, from : string, values : Array<any>, nextvar : number}{
	let values : any[] = [];
	let from = "";
	let i = startdollar;

	const flattenOR = (obj : any) => {
		let tempWhere = '';

		for(const o of obj){
			const flattenedWhere = flatten(o);

			if(!!flattenedWhere && flattenedWhere !== "")
				tempWhere += `(${flattenedWhere}) OR `
		}

		if(tempWhere !== "")
			tempWhere = `( ${tempWhere.slice(0,-4)} )`;

		return tempWhere;
	}

	const flatten = (obj : any) => {
		let tempWhere = '';

		for(const prop in obj){
			if(obj[prop] === undefined || Object.keys(obj[prop]).length < 1)
				continue;

			const andRegex = /^&&.*/;

			if(andRegex.exec(prop) !== null && Array.isArray(obj[prop])){
				const flattenedWhere = flattenOR(obj[prop]);
				if(!!flattenedWhere && flattenedWhere !== "")
					tempWhere += `${flattenedWhere} AND `
			}
			else{
				const whereflt = whereToSQL(obj[prop], i, prop, encryptedColumns);

				if(!!whereflt.where && whereflt.where !== ""){
					tempWhere += `${whereflt.where} AND `;
					from += whereflt.from;
					i = whereflt.nextvar;
					values = [...values, ...whereflt.values];
				}
			}
		}

		if(tempWhere !== "")
			tempWhere = tempWhere.slice(0,-4);

		return tempWhere;
	}

	const flattened = Array.isArray(filter) ? flattenOR(filter) : flatten(filter);

	return {where : flattened, from, values, nextvar : i}
}


export function toORDERBYClauses(data : Obj, prefix? : string) : string{
	let orderby : string = "";
	for(const prop in data){
		if(typeof data[prop] === 'object'){
			orderby += toORDERBYClauses(data[prop], prop) + ', ';
		}
		else {
			if(data[prop] || data[prop] === 'ASC' || data[prop] === '' || data[prop] === 'DESC')
				orderby += `${prefix && !prop.startsWith(prefix + '.') ? prefix + "." + prop : prop} ${data[prop]}, `;
		}
	}
	orderby = orderby.slice(0,-2);

	return orderby;
}


export function mergeWHEREClausesAsAND(...where : (string|undefined)[]){
	let res = '';
	for(const s of where){
		if(s && s.replace(/\s/g, '').length > 0)
			res += s + ' AND '
	}
	res = res.slice(0, -5);

	return res && res.replace(/\s/g, '').length > 0 ? `( ${res} )` : '';
}


export function mergeWHEREClausesAsOR(...where : (string | undefined)[]){
	let res = '';
	for(const s of where){
		if(s && s.replace(/\s/g, '').length > 0)
			res += s + ' OR '
	}
	res = res.slice(0, -4);

	return res && res.replace(/\s/g, '').length > 0 ? `( ${res} )` : '';
}


export function mergeSELECTClauses(...select : (string|undefined)[]){
	let res = '';
	for(const s of select){
		if(s && s.replace(/\s/g, '').length > 0)
			res += s + ', '
	}
	return res.slice(0, -2);
}




export function joinToSQL<Env extends Environment>(join : Join<Env> | undefined){
	if(!join)
		return '';

	let res = '';
	for(let key in join){
		const [type, target] = key.includes(':') ? key.split(':') : ['l', key];

		if(type === 'i')
			res = 'INNER JOIN ';
		else if(type === 'f')
			res = 'FULL JOIN ';
		else if(type === 'r')
			res = 'RIGHT JOIN ';
		else
			res = 'LEFT JOIN ';
		
		res += target;
	}
}