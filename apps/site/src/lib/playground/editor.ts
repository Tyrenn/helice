import * as monaco from 'monaco-editor/esm/vs/editor/edcore.main.js';
import { getTypeScriptWorker, ModuleKind, ModuleResolutionKind, ScriptTarget, typescriptDefaults } from 'monaco-editor/esm/vs/language/typescript/monaco.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution.js';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker.js?worker';
import TypeScriptWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker.js?worker';
import Runner from './runner.worker.ts?worker';
import type { Output, RunResult } from './runner.worker.ts';

export type Diagnostic = {line : number, message : string};
export type Update = {outputs : Output[], error? : string} | {diagnostics : Diagnostic[]};

const DEBOUNCE = 250;
const TIMEOUT = 1000;

self.MonacoEnvironment = {
	getWorker : (_, label) => label === 'typescript' || label === 'javascript' ? new TypeScriptWorker() : new EditorWorker()
};

// The types the editor checks against are the ones of the workspace package, built before the site
const declarations = import.meta.glob<string>('../../../../../packages/helice/build/**/*.d.ts', {query : '?raw', import : 'default', eager : true});

for(const [path, source] of Object.entries(declarations))
	typescriptDefaults.addExtraLib(source, `file:///node_modules/helice/${path.split('/build/')[1]}`);

typescriptDefaults.setCompilerOptions({
	target : ScriptTarget.ES2020,
	module : ModuleKind.CommonJS,
	moduleResolution : ModuleResolutionKind.NodeJs,
	lib : ['lib.es2020.d.ts'],
	strict : true,
	skipLibCheck : true
});
typescriptDefaults.setEagerModelSync(true);

monaco.editor.defineTheme('helice', {
	base : 'vs-dark',
	inherit : true,
	rules : [
		{token : 'comment', foreground : 'b09393', fontStyle : 'italic'},
		{token : 'keyword', foreground : 'ff9e9e'},
		{token : 'string', foreground : 'f0d9a0'},
		{token : 'number', foreground : 'ffc48a'},
		{token : 'type', foreground : 'f2c6c6'}
	],
	colors : {
		'editor.background' : '#220808',
		'editor.foreground' : '#f6e4e4',
		'editorLineNumber.foreground' : '#7d5a5a',
		'editorLineNumber.activeForeground' : '#f2c6c6',
		'editorCursor.foreground' : '#f2c6c6',
		'editor.lineHighlightBackground' : '#331111',
		'editor.selectionBackground' : '#6b2a2a',
		'editorWidget.background' : '#331111',
		'editorWidget.border' : '#522222',
		'editorSuggestWidget.background' : '#331111',
		'editorSuggestWidget.border' : '#522222',
		'editorSuggestWidget.selectedBackground' : '#6b2a2a',
		'editorHoverWidget.background' : '#331111',
		'editorHoverWidget.border' : '#522222'
	}
});

// Monaco loads its TypeScript mode on its own time, and refuses to hand out the worker until then
async function typeScriptWorker(tries = 300){
	try{
		return await getTypeScriptWorker();
	}
	catch(error){
		if(tries === 0)
			throw error;

		await new Promise((resolve) => setTimeout(resolve, 100));
		return typeScriptWorker(tries - 1);
	}
}

/**
 * An editor checking its code against Helice's types, and running it on every change
 */
export function createEditor(element : HTMLElement, code : string, onUpdate : (update : Update) => void){
	const model = monaco.editor.createModel(code, 'typescript', monaco.Uri.parse('file:///playground.ts'));
	const editor = monaco.editor.create(element, {
		model,
		theme : 'helice',
		automaticLayout : true,
		fixedOverflowWidgets : true,
		fontFamily : "'JetBrains Mono Variable', ui-monospace, Consolas, monospace",
		fontSize : 14,
		minimap : {enabled : false},
		padding : {top : 16, bottom : 16},
		scrollBeyondLastLine : false,
		tabSize : 3
	});

	// Measured with the fallback font until the real one is there
	document.fonts.ready.then(() => monaco.editor.remeasureFonts());

	let runner = new Runner();
	let lastRun = 0;
	let timeout : ReturnType<typeof setTimeout>;
	let debounce : ReturnType<typeof setTimeout>;

	const stop = () => {
		runner.terminate();
		runner = new Runner();
		listen();
		onUpdate({outputs : [], error : `Stopped : still running after ${TIMEOUT / 1000} second.`});
	};

	const listen = () => {
		runner.onmessage = ({data} : MessageEvent<RunResult>) => {
			if(data.id !== lastRun)
				return;

			clearTimeout(timeout);

			if('started' in data)
				timeout = setTimeout(stop, TIMEOUT);
			else
				onUpdate('error' in data ? {outputs : [], error : data.error} : {outputs : data.outputs});
		};
	};
	listen();

	const run = async () => {
		const id = ++lastRun;
		clearTimeout(timeout);

		try{
			const worker = await (await typeScriptWorker())(model.uri);
			const {outputFiles} = await worker.getEmitOutput(model.uri.toString());

			// Typed again in the meantime
			if(id === lastRun)
				runner.postMessage({id, code : outputFiles[0]?.text ?? ''});
		}
		catch(error){
			if(id === lastRun)
				onUpdate({outputs : [], error : `Could not compile : ${error instanceof Error ? error.message : error}`});
		}
	};

	const changes = model.onDidChangeContent(() => {
		clearTimeout(debounce);
		debounce = setTimeout(run, DEBOUNCE);
	});

	const markers = monaco.editor.onDidChangeMarkers((uris) => {
		if(!uris.some((uri) => uri.toString() === model.uri.toString()))
			return;

		onUpdate({
			diagnostics : monaco.editor.getModelMarkers({resource : model.uri})
				.filter((marker) => marker.severity === monaco.MarkerSeverity.Error)
				.map((marker) => ({line : marker.startLineNumber, message : marker.message}))
		});
	});

	run();

	return {
		setCode : (next : string) => model.setValue(next),
		destroy(){
			clearTimeout(timeout);
			clearTimeout(debounce);
			changes.dispose();
			markers.dispose();
			runner.terminate();
			editor.dispose();
			model.dispose();
		}
	};
}
