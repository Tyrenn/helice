// Monaco ships these entry points without their types : only the languages the playground needs get loaded

declare module 'monaco-editor/esm/vs/editor/edcore.main.js' {
	export * from 'monaco-editor';
}

declare module 'monaco-editor/esm/vs/language/typescript/monaco.contribution.js' {
	import { typescript } from 'monaco-editor';

	export const typescriptDefaults : typeof typescript.typescriptDefaults;
	export const getTypeScriptWorker : typeof typescript.getTypeScriptWorker;
	export const ModuleKind : typeof typescript.ModuleKind;
	export const ModuleResolutionKind : typeof typescript.ModuleResolutionKind;
	export const ScriptTarget : typeof typescript.ScriptTarget;
}
