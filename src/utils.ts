import { Arrayed, TableWhere, Obj, QueryResult, TableField, OrderBy, PostgreDAO, Insert, SelectQueryFunction, InsertQueryFunction, ExistsQueryFunction, UpdateQueryFunction, DeleteQueryFunction, tsqueryWhere } from './types.js';

/* Simple query build functions */

export function buildSelect<O>(tablename : string) : SelectQueryFunction<O> {
	return async function<R extends Partial<O>>(this : PostgreDAO, where: TableWhere<O> | TableWhere<O>[], select?: TableField<O> | '*', limit?: number, offset?: number, orderby?: OrderBy<O>): Promise<QueryResult<R>> {
		const whereflt = WheretoSQL(where);
		const query =
			{
				text: `	SELECT ${select ? toSELECTClause(select) : '*'}
							FROM ${tablename}
							WHERE ${whereflt.where}
							${orderby ? 'ORDER BY ' + toORDERBYClauses(orderby) : ""}
							${limit ? "LIMIT " + limit : ""} ${offset ? "OFFSET " + offset : ""}`,
				values : whereflt.values
			}
 
		return await this.db.query<R>(query);
	}
}


export function buildSelectJoin<Table, JoinedTable extends { [k : string] : { [k : string] : any}} >(tablename : string, joins : { [[]]})


export function buildInsert<O>(tablename : string) : InsertQueryFunction<O>{
	return async function <R extends Partial<O>>(this : PostgreDAO, data: Insert<O>, returning?: TableField<O> | '*') : Promise<QueryResult<R>> {
		const dataflt = toINSERTClauses(data);
		const query = 
			{
				text : `	INSERT INTO
							${tablename}(${dataflt.properties})
							VALUES ${dataflt.variables}
							${returning ? "RETURNING " + toSELECTClause(returning) : ""}
						`,
				values : dataflt.values
			}
		return await this.db.query<R>(query);
	}
}

export function buildExists<O>(tablename : string) : ExistsQueryFunction<O>{
	return async function(this : PostgreDAO, where: TableWhere<O> | TableWhere<O>[], nb? : number) : Promise<boolean> {
		const whereflt = WheretoSQL(where);
		const query = {
			text: `	SELECT EXISTS(
							SELECT 1
							FROM ${tablename}
							WHERE ${whereflt.where}
							${nb ? 'LIMIT 1 OFFSET (' + (nb-1) + ')' : ''}
						)
						AS exists`,
			values: whereflt.values
		};
		const result = await this.db.query<{exists : boolean}>(query);

		return (result.rows.length >= 1 && result.rows[0].exists);
	}
}


export function buildUpdate<O>(tablename : string) : UpdateQueryFunction<O> {
	return async function <R extends Partial<O>>(this : PostgreDAO, where : TableWhere<O> | TableWhere<O>[], data : {[Prop in keyof O]? : O[Prop] | null}, returning? : TableField<O> | '*') : Promise<QueryResult<R>>{
		const dataflt = UpdatetoSQL(data);
		const whereflt = WheretoSQL(where, dataflt.nextvar);
		const query = {
			text : ` UPDATE ${tablename}
						SET ${dataflt.set}
						WHERE ${whereflt.where}
						${returning ? "RETURNING " + toSELECTClause(returning) : ""}`,
			values : [...dataflt.values, ...whereflt.values]
		}
		return await this.db.query(query);
	}
}


export function buildDelete<O>(tablename : string) : DeleteQueryFunction<O>{
	return async function <R extends Partial<O>>(this : PostgreDAO, where : TableWhere<O> | TableWhere<O>[], returning? : TableField<O> | '*') : Promise<QueryResult<R>>{
		const whereflt = WheretoSQL(where);
		const query = {
			text: `	DELETE 
						FROM ${tablename}
						WHERE ${whereflt.where}
						${returning ? "RETURNING " + toSELECTClause(returning) : ""}
					`,
			values: [...whereflt.values]
		};
		return await this.db.query<R>(query);
	}
}
/*
export function buildUpdateDistinct<O extends Obj>(db : PostgreDatabaseClient, tablename : string) :  <I extends Partial<O> = Partial<O>>(identifier: keyof I | (keyof I)[], data: I[]) => Promise<QueryResult>
export function buildUpdateDistinct<O extends Obj, R extends Partial<O>>(db : PostgreDatabaseClient, tablename : string, returnfields : Stringed<R>) :  <I extends Partial<O> = Partial<O>>(identifier: keyof I | (keyof I)[], data: I[]) => Promise<QueryResult<R>>
export function buildUpdateDistinct<O extends Obj, R extends Partial<O>>(db : PostgreDatabaseClient, tablename : string, returnfields? : Stringed<R>) :  <I extends Partial<O> = Partial<O>>(identifier: keyof I | (keyof I)[], data: I[]) => Promise<QueryResult<R>> {
	
	return async <I extends Partial<O> = Partial<O>>(identifier: keyof I | (keyof I)[], data: I[]): Promise<QueryResult<R>> => {
		const dataflt = toUPDATEClauses(data);
		let whereclause = Array.isArray(identifier) ? identifier.map(elem => 'oldv.' + elem.toString() + ' = v.' + elem.toString()).join(' AND ') : 'oldv.'+ identifier.toString() + ' = v.' + identifier.toString();

		const query =
			{
				text: `	UPDATE ${tablename} as oldv
							SET ${dataflt.set}
							FROM (VALUES
								${dataflt.values}
							) as v(${dataflt.properties})
							WHERE ${whereclause}
							${returnfields ? "RETURNING " + toFIELDSClause(returnfields) : ""}`,
				values: dataflt.values
			}

		return await db.query<R>(query);
	}
}*/


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
export function toINSERTClauses(data : Obj | Obj[], startvar : number = 1) : {properties : string, variables : string, values : Array<any>, nextvar : number}{
	let value : any[] = [];
	let variables = "";
	let properties = "";	
	let i = startvar;

	let flattenobj = (obj : any) => {
		variables += '(';
		if(typeof obj === 'object'){
			for(let prop in obj){
				if(obj[prop] === undefined)
					continue
				if(obj[prop] === 'DEFAULT'){
					variables += 'DEFAULT,';
					continue
				}
				variables += '$'+ i + ',';
				value.push(obj[prop]);
				i++;
			}
		}
		else if (!obj){
			return
		}
		else{
			variables += '$' + i + ',';
			value.push(obj);
			i++;
		}
		variables = variables.slice(0, -1);
		variables += "),";
	}

	if(Array.isArray(data)){
		let nbprops = Object.keys(data[0]).length;

		for(let prop in data[0]){
			if(data[0][prop] !== undefined)
				properties += prop + ",";
		}
		for(let obj of data){
			if(Object.keys(obj).length != nbprops){
				throw new Error('Unormalized data');
			}
			flattenobj(obj);
		}
	}
	else{
		for(let prop in data){
			if(data[prop] !== undefined)
				properties += prop + ",";
		}
		flattenobj(data);
	}

	variables = variables.slice(0, -1);
	properties = properties.slice(0, -1);

	return {properties : properties, variables: variables, values: value, nextvar : i};
}



/**
	Transform an object to a fields clause string

	EXAMPLES :

	['column1', 'column2'] output : column1, column2

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
export function toSELECTClause(data : Obj | '*', prefix? : string) : string{
	if(data === '*')
		return '*';
	let fields = "";
	for(let prop in data){
		if(typeof data[prop] === 'object'){
			fields += toSELECTClause(data[prop], prop) + ', ';
		}
		else {
			fields += `${prefix ? prefix + "." + prop : prop}${data[prop] !== "" ? " AS " + data[prop] : ""}, `;
		}
	}
	fields = fields.slice(0,-2);

	return fields;
}



/**
 * Flatten an array of objects or an object as UPDATE useful clauses
	v is the name of the mapped table
	
	Array of objects example

		let objs = [
			{nb : 12, ar : ['b', 'a'], str : 'hello'}, 
			{nb : 14, ar : ['c', 'd'], str : 'bye'}
		];
		{
			set: 'nb = v.nb,ar = v.ar,str = v.str,',
			properties: 'nb,ar,str',
			variables: '($1,$2,$3),($4,$5,$6)',
			values: [ 12, [ 'b', 'a' ], 'hello', 14, [ 'c', 'd' ], 'bye' ],
			nextvar: 6
		}

	Object example

		let obj = {nb : 12, ar : ['b', 'a'], str : 'hello'};
		{
			set: 'nb = $1,ar = $2,str = $3,',
			properties: '',
			variables: '',
			values: [ 12, [ 'b', 'a' ], 'hello' ],
			nextvar: 3
		}
 */
export function UpdatetoSQL(data : Obj | Obj[], startvar : number = 1) : {set : string, properties: string, variables : string, values : Array<any>, nextvar : number}{
	let values : Array<any> = [];
	let variables : string = "";
	let set : string = "";
	let properties : string = "";	
	let i = startvar;

	if(Array.isArray(data)){
		let nbprops = Object.keys(data[0]).length;

		for(let prop in data[0]){
			properties += prop + ",";
			set += prop + ' = v.' + prop +',';
		}

		for(let obj of data){
			if(Object.keys(obj).length != nbprops){
				throw new Error('Unormalized data');
			}
			variables += '(';
			if(typeof obj === 'object'){
				for(let prop in obj){
					variables += '$'+ i + ',';
					values.push(obj[prop]);
					i++;
				}
			}
			else{
				variables += '$' + i + ',';
				values.push(obj);
				i++;
			}
			variables = variables.slice(0, -1);
			variables += "),";
		}
	}
	else{
		for(let prop in data){
			if(typeof data[prop] !== "undefined"){
				set += prop + ' = $'+ i + ',';
				values.push(data[prop]);
				i++;
			}
		}
	}

	set = set.slice(0, -1);
	variables = variables.slice(0, -1);
	properties = properties.slice(0, -1);

	return {set, properties, variables, values, nextvar : i};
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
export function WheretoSQL(filter : Obj | Obj[], startdollar : number = 1, prefix? : string) : {where : string, from : string, values : Array<any>, nextvar : number}{
	let values : any[] = [];
	let where = "";
	let from = "";
	let i = startdollar;

	let dottedPrefix = prefix ? prefix + '.' : '';
	let dashedPrefix = prefix ? prefix + '_' : '';

	/**
	 * Transforms [] props
		[!]:arr : [1, 2] 	=> 	arr = [1,2]
		[]:arr :	[1, 2] 	=> 	arr <> [1,2]
		[=]:arr : [1,2]  	=>  	(1 = ANY(arr) OR 2 = ANY(arr))
		[=]:arr : 1 		=> 	1 = ANY(arr)
		[<>]:arr : 1 		=> 	1 <> ANY(arr)
		[>]:arr : [1]		=> 	1 > ANY(arr)
	 */
	const flattenValForArrayProp = (prop : string, sign : string, val : any) => {
		if(sign === ""){
			if(val === null){
				where += `${dottedPrefix}${prop} is NULL`;
				i--;
			}
			else{
				where += `${dottedPrefix}${prop} = $${i}`;
				values.push(val)
			}
		}
		else if(sign === "!"){
			if(val === null){
				where += `${dottedPrefix}${prop} is not NULL`;
				i--;
			}
			else{
				where += `${dottedPrefix}${prop} <> $${i}`;
				values.push(val)
			}
		}
		else if(!Array.isArray(val)){
			let currSign = sign;

			where += `$${i} ${currSign} ANY(${dottedPrefix}${prop})`;
			values.push(val);
		}
		else if(val.length > 1){
			where += '( '
			for(let v of val){
				let currSign = sign;
				where += `$${i} ${currSign} ANY(${dottedPrefix}${prop}) OR `;
				values.push(v);
				i++;
			}
			where = where.slice(0, -4);
			where += ' )';
			i--;
		}
		else {
			flattenValForProp(prop, sign, val[0])
		}
	}

	/**
	 * Transforms sign:prop and prop
	 * =:i : 1 			=> 		i = 1
	 * <>:i : null 	=> 		i is not NULL
	 * i : 2				=> 		i = 2
	 * arr : [1,2]		=> 		arr = ANY([1,2])
	 */
	const flattenValForProp = (prop : string, sign : string, val : any) => {
		if(val === null){
			if(sign === '' || sign === '=')
				sign = 'is';
			if(sign === '!=' || sign === '<>')
				sign = 'is not';
			where += `${dottedPrefix}${prop} ${sign} NULL`;
			i--;
		}
		else if(Array.isArray(val) && val.length > 1){
			where += `${dottedPrefix}${prop} ${sign} ANY($${i})`;
			values.push(val);
		}
		else if(Array.isArray(val) && val.length > 0){
			where += `${dottedPrefix}${prop} ${sign} $${i}`;
			values.push(val[0]);
		}
		else if(Array.isArray(val) && val.length == 0){
			where += `${dottedPrefix}${prop} is NULL`;
			i--;
		}
		else{
			where += `${dottedPrefix}${prop} ${sign} $${i}`;
			values.push(val);
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
		from += `to_tsquery($${i}, $${i = i + 1}) as ${dashedPrefix}${prop}_query,
			ts_rank_cd($${i = i + 1}, ${dottedPrefix}${prop},  ${dashedPrefix}${prop}_query, ${obj.flag ?? '32'}) AS ${dashedPrefix}${prop}_rank`;
		where += `${dashedPrefix}${prop}_query @@ ${prop}`;
		values.push(obj.language, obj.value, obj.weights ?? [0.1, 0.2, 0.4, 1.0]);
	}

	const flattenANDProp = (array : Array<Obj>) => {
		where += ' (';
		for(let o of array){
			let flt = WheretoSQL(o, i, prefix);
			where += ` ( ${flt.where} ) OR`;
			from += flt.from;
			i = flt.nextvar;
			values = [...values, ...flt.values];
		}
		i--;
		where = where.slice(0, -2);
		where += ')';
	}

	const flatten = (obj : any) => {
		for(let prop in obj){
			if(obj[prop] === undefined)
				continue;
			let execRes;

			const andRegex = /^&&.*/;
			const aaRegex = /^@@:(.*)/;
			const arrRegex = /^\[(|!|=|<>|!=|>|>=|<|<=|~~|~~\*|!~~|!~~\*)\]:(.*)/;
			const singleRegex = /^(|=|<>|!=|>|>=|<|<=|~~|~~\*|!~~|!~~\*):(.*)/;

			if(andRegex.exec(prop) !== null && Array.isArray(obj[prop])){
				flattenANDProp(obj[prop]);
			}
			else if((execRes = aaRegex.exec(prop)) !== null){
				flattenAAProp(execRes[1], obj[prop]);
			}
			else if((execRes = arrRegex.exec(prop)) !== null){
				flattenValForArrayProp(execRes[2], execRes[1], obj[prop]);
			}else if((execRes = singleRegex.exec(prop)) !== null){	
				flattenValForProp(execRes[2], execRes[1] === '' ? '=' : execRes[1], obj[prop]);
			}else{
				flattenValForProp(prop, '=', obj[prop]);
			}
			i++;
			where += ' AND ';
		}
		where = where.slice(0,-4);
	}

	if(Array.isArray(filter)){
		for(let obj of filter){
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



export function toORDERBYClauses(data : Obj, prefix? : string) : string{
	let orderby : string = "";
	for(let prop in data){
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


/**
	Transforms a JOIN object :
	{
		table2 : a//table1.b
		table3 : d/l/table2.c
	}

	to JOIN Clauses :

	{
		join : 'INNER JOIN table2 ON table2.a = table1.b   LEFT JOIN table3 ON table3.d = table2.c'
	}

 */
export function toJOINClause(obj : Obj) : { join : string }{
	let join = '';
	
	for(let prop in obj){
		let execRes;
		const regex = /^(.*)\/(|i|l|r|f)\/(.*)\.(.*)/;
		if((execRes = regex.exec(obj[prop])) !== null){
			
			let joint;
			switch(execRes[2]){
				case 'i':
					joint = 'INNER';
					break;
				case 'l':
					joint = 'LEFT';
					break;
				case 'r':
					joint = 'RIGHT';
					break;
				case 'f':
					joint = 'FULL';
					break;
				case '':
					joint = 'INNER';
					break;
			}

			join += `${joint} JOIN ${prop} ON ${prop}.${execRes[1]} = ${execRes[4]}.${execRes[3]}`;
		}
	}

	return { join };
}


export function mergeWHEREClauses(...where : (string|undefined)[]){
	let res = '';
	for(let s of where){
		if(s)
			res += s + ' AND '
	}
	return res.slice(0,-4);
}


export function mergeSELECTClauses(...select : (string|undefined)[]){
	let res = '';
	for(let s of select){
		if(s)
			res += s + ', '
	}
	return res.slice(0, -2);
}