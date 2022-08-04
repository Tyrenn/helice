import { Obj } from "./types";

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
export function toINSERTClauses(data : Obj | Obj[], startvar : number = 0) : {properties : string, variables : string, values : Array<any>, nextvar : number}{
	let value : any[] = [];
	let variables = "";
	let properties = "";	
	let i = startvar;

	let flattenobj = (obj : any) => {
		variables += '(';
		if(typeof obj === 'object'){
			for(let prop in obj){
				if(!obj[prop])
					continue
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
			if(data[0][prop])
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
			if(data[prop])
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

export function toFIELDSClause(data : Obj, prefix? : string) : string{
	let fields = "";
	for(let prop in data){
		if(typeof data[prop] === 'object'){
			fields += toFIELDSClause(data[prop], prop) + ', ';
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
export function toUPDATEClauses(data : Obj | Obj[], startvar : number = 1) : {set : string, properties: string, variables : string, values : Array<any>, nextvar : number}{
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
				i++;
				set += prop + ' = $'+ i + ',';
				values.push(data[prop]);
			}
		}
	}

	variables = variables.slice(0, -1);
	properties = properties.slice(0, -1);

	return {set, properties, variables, values, nextvar : i};
}


/**
 * Flatten an array of objects or an object as WHERE clause
	
	Array of objects example

		let objs = [
			{
				nb : 12, 
				ar : ['b', 'a'], 
				str : 'hello',
				obj : {
					nb : 13,
					'[]:ar' : 'e',
					str : 'world'
				},
				nb2 : 14
			}, 
			{
				nb : 15, 
				ar : ['c', 'd'], 
				str : 'bye'
			}
		];
		{
			where: '(nb = $1 AND ar = ANY($2) AND str = $3 AND obj.nb = $4 AND ANY(obj.[]:ar) = $5 AND obj.str = $6 AND nb2 = $7 )\n' +
				' OR (nb = $8 AND ar = ANY($9) AND str = $10 )',
			values: [ 12, [ 'b', 'a' ], 'hello', 13, 'e', 'world', 14, 15,	[ 'c', 'd' ], 'bye'],
			nextdollar: 11
		}

	Object example

		let obj = 	{
			nb : undefined, 
			'[]:ar' : ['b', 'a'], 
			str : 'hello',
			nb2 : 14
		};
		{
			where: 'nb = $1 AND ( ANY(ar) = $2 OR ANY(ar) = $3 ) AND str = $4 AND nb2 = $5 ',
			values: [ undefined, 'b', 'a', 'hello', 14 ],
			nextdollar: 6
		}
 */
export function toWHEREClauses(filter : Obj | Obj[], startdollar : number = 1, prefix? : string) : {where : string, values : Array<any>, nextvar : number}{
	let values : any[] = [];
	let where = "";
	let i = startdollar;

	const flattenArrayToOR = (propside : string, arr : any) => {
		where += '( '
		for(let item of arr){
			where += propside + ' $'+i+' OR ';
			values.push(item);
			i++;
		}
		where = where.slice(0, -4);
		where += ' )';
	};

	const flattenValForArrayProp = (propside : string, val : any) => {
		if(Array.isArray(val) && val.length > 1){
			flattenArrayToOR(propside, val);
			i--;
		}
		else if(Array.isArray(val)){
			where += propside +' $' + i;
			values.push(val[0]);
		}
		else{
			where += propside + ' $' + i;
			values.push(val);
		}
	}

	const flattenValForProp = (propside : string, val : any) => {
		if(Array.isArray(val) && val.length > 1){
			where += propside + ' ANY($' + i+')';
			values.push(val);
		}
		else if(Array.isArray(val)){
			where += propside + ' $' + i;
			values.push(val[0]);
		}
		else{
			where += propside + ' $' + i;
			values.push(val);
		}
	}

	const flatten = (obj : any) => {
		for(let prop in obj){
			if(typeof obj[prop] === 'object' && obj[prop] !== null && !Array.isArray(obj[prop])){
				let propflt = toWHEREClauses(obj[prop], i, prop);
				where += propflt.where + 'AND ';
				values = [...values, ...propflt.values];
				i = propflt.nextvar;
				continue;
			}

			const arrRegex = /^\[(|=|<>|!=|>|>=|<|<=|~~|~~\*|!~~|!~~\*)\]:(.*)/;
			const singleRegex = /^(|=|<>|!=|>|>=|<|<=|~~|~~\*|!~~|!~~\*):(.*)/;

			let execRes;

			if((execRes = arrRegex.exec(prop)) !== null){
				flattenValForArrayProp('ANY('+(prefix ? prefix + '.' + execRes[2] : execRes[2]) +') ' + (execRes[1] === '' ? '=' : execRes[1]), obj[prop]);
			}else if((execRes = singleRegex.exec(prop)) !== null){
				flattenValForProp((prefix ? prefix + '.' + execRes[2] : execRes[2]) + ' ' + (execRes[1] === '' ? '=' : execRes[1]), obj[prop]);
			}else{
				flattenValForProp((prefix ? prefix + '.' + prop : prop) + ' =', obj[prop]);
			}
			i++;
			where += ' AND ';
		}
		where = where.slice(0,-4);
	}

	if(Array.isArray(filter)){
		for(let obj of filter){
			if(i > startdollar)
				where += "\n OR ";
			where += "(";
			
			flatten(obj);

			where += ')'
		}
	}
	else{	
		flatten(filter);
	}

	return {where, values, nextvar : i};
}