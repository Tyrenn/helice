import * as helice from 'helice';

export type Output =
	| {name : string, kind : 'query', query : string, args : string}
	| {name : string, kind : 'value', value : string};

export type RunResult = {id : number, started : true} | {id : number, outputs : Output[]} | {id : number, error : string};

function toOutput(name : string, value : any) : Output {
	if(typeof value?.query === 'string' && Array.isArray(value?.args))
		return {name, kind : 'query', query : value.query, args : JSON.stringify(value.args, null, 1).replace(/\n\s*/g, ' ')};

	if(typeof value === 'function')
		return {name, kind : 'value', value : 'A prepared function : call it and export what it returns.'};

	return {name, kind : 'value', value : JSON.stringify(value, null, 2) ?? String(value)};
}

// In its own worker : the code being typed can throw or never end without freezing the page
self.onmessage = ({data : {id, code}} : MessageEvent<{id : number, code : string}>) => {
	// Loading this worker can be slow : the clock only starts now
	self.postMessage({id, started : true} satisfies RunResult);

	const exports : Record<string, unknown> = {};

	const require = (name : string) => {
		if(name === 'helice')
			return helice;

		throw new Error(`Only helice can be imported here, not "${name}"`);
	};

	let result : RunResult;
	try{
		new Function('require', 'exports', code)(require, exports);
		result = {id, outputs : Object.entries(exports).map(([name, value]) => toOutput(name, value))};
	}
	catch(error){
		result = {id, error : error instanceof Error ? error.message : String(error)};
	}

	self.postMessage(result);
};
