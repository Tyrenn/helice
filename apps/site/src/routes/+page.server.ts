import { docEntries, highlight } from '#lib/server/content.ts';
import * as quickstart from '#lib/snippets/quickstart.ts';
import quickstartSource from '#lib/snippets/quickstart.ts?raw';
import * as select from '#lib/snippets/select.ts';
import selectSource from '#lib/snippets/select.ts?raw';
import * as insert from '#lib/snippets/insert.ts';
import insertSource from '#lib/snippets/insert.ts?raw';
import * as update from '#lib/snippets/update.ts';
import updateSource from '#lib/snippets/update.ts?raw';
import * as remove from '#lib/snippets/delete.ts';
import removeSource from '#lib/snippets/delete.ts?raw';
import * as defaultSyntax from '#lib/snippets/default-syntax.ts';
import defaultSyntaxSource from '#lib/snippets/default-syntax.ts?raw';
import * as verboseSyntax from '#lib/snippets/verbose-syntax.ts';
import verboseSyntaxSource from '#lib/snippets/verbose-syntax.ts?raw';
import typesafeSource from '#lib/snippets/typesafe.ts?raw';

// The snippets import their schema to compile : on the page, they read without it
const code = (source : string) => highlight(source.replace(/^import .* from '\.\/schema\.ts';\n+/, '').replace(/^export /gm, '').trim(), 'ts');

// Compiled by svelte-check and run here : the SQL on the page is what Helice really produces
const example = (source : string, {query, args} : {query : string, args : unknown[]}) => ({
	code : code(source),
	sql : highlight(query, 'sql'),
	args : JSON.stringify(args, null, 1).replace(/\n\s*/g, ' ')
});

export function load(){
	if(defaultSyntax.query !== verboseSyntax.query)
		throw new Error('The default and verbose snippets must produce the same SQL');

	return {
		quickstart : example(quickstartSource, quickstart),
		examples : [
			{id : 'select', label : 'SELECT', doc : 'select', summary : 'Fields, joins, CTEs, filters, ordering, pagination.', ...example(selectSource, select)},
			{id : 'insert', label : 'INSERT', doc : 'insert', summary : 'Single or multiple rows, with an optional RETURNING.', ...example(insertSource, insert)},
			{id : 'update', label : 'UPDATE', doc : 'update', summary : 'Multi-table updates through FROM, CTEs, RETURNING.', ...example(updateSource, update)},
			{id : 'delete', label : 'DELETE', doc : 'delete', summary : 'Multi-table deletes through USING, CTEs, RETURNING.', ...example(removeSource, remove)}
		],
		syntax : {
			default : code(defaultSyntaxSource),
			verbose : code(verboseSyntaxSource),
			sql : highlight(defaultSyntax.query, 'sql')
		},
		typesafe : code(typesafeSource),
		docs : docEntries()
	};
}
