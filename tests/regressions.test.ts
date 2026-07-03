import { describe, expect, it } from 'vitest';
import { Helice, VerboseSyntaxKeys, col } from '../src/index.js';
import { type Case, helice, verboseHelice } from './env.js';

const cases: Case[] = [

	{
		label    : 'inequality <>: emits a condition',
		fn       : () => helice.select('user').where({ '<>:id': 5 }).prepare()(),
		expected : { query: 'SELECT *\nFROM user\nWHERE (\n\tid <> $1\n)', args: [5] },
	},

	{
		label    : 'inequality alias !=: emits a condition',
		fn       : () => helice.select('user').where({ '!=:id': 5 }).prepare()(),
		expected : { query: 'SELECT *\nFROM user\nWHERE (\n\tid <> $1\n)', args: [5] },
	},

	{
		label    : 'inequality <>: with null → IS NOT NULL',
		fn       : () => helice.select('user').where({ '<>:id': null }).prepare()(),
		expected : { query: 'SELECT *\nFROM user\nWHERE (\n\tid IS NOT NULL\n)', args: [] },
	},

	{
		label    : 'array inequality [<>]: emits a condition',
		fn       : () => helice.select('post').where({ '[<>]:tags': 'draft' }).prepare()(),
		expected : { query: 'SELECT *\nFROM post\nWHERE (\n\t$1 <> ALL(tags)\n)', args: ['draft'] },
	},

	{
		label    : 'equality with [value, null] → IS NULL OR ANY, null filtered from args',
		fn       : () => helice.select('user').where({ id: [1, 2, null] }).prepare()(),
		expected : { query: 'SELECT *\nFROM user\nWHERE (\n\t( id IS NULL OR id = ANY($1) )\n)', args: [[1, 2]] },
	},

	{
		label    : 'inequality with [value, null] → IS NOT NULL AND ALL, null filtered from args',
		fn       : () => helice.select('user').where({ '<>:id': [1, 2, null] }).prepare()(),
		expected : { query: 'SELECT *\nFROM user\nWHERE (\n\t( id IS NOT NULL AND id <> ALL($1) )\n)', args: [[1, 2]] },
	},

	{
		label    : 'equality with [null] → IS NULL',
		fn       : () => helice.select('user').where({ id: [null] as any }).prepare()(),
		expected : { query: 'SELECT *\nFROM user\nWHERE (\n\tid IS NULL\n)', args: [] },
	},

	{
		label: 'runtime WHERE params shifted after IN subquery when no static WHERE',
		fn: () => {
			const fn = helice.select('post')
				.in('author_id', helice.select('user').field('id').where({ active: true }))
				.prepare({ where: true });
			return fn({ where: { '>=:views': 10 } });
		},
		expected: {
			query : 'SELECT *\nFROM post\nWHERE (\n\tauthor_id IN (SELECT id\n\tFROM user\n\tWHERE (\n\t\tactive = $1\n\t))\n\tAND views >= $2\n)',
			args  : [true, 10],
		},
	},

	{
		label    : 'verbose SK : bare equality key emits a condition',
		fn       : () => verboseHelice.select('user').where({ active: true }).prepare()(),
		expected : { query: 'SELECT *\nFROM user\nWHERE (\n\tactive = $1\n)', args: [true] },
	},

	{
		label: 'JOIN object form : bare equality key kept, no dangling AND',
		fn: () => helice.select('post')
			.join({ user: { '#': 'INNER', id: col('post.author_id'), '>:id': 5 } as any })
			.prepare()(),
		expected: {
			query : 'SELECT *\nFROM post\nINNER JOIN user\n\tON id = post.author_id AND id > $1',
			args  : [5],
		},
	},

	{
		label: 'JOIN object form : &&: OR group emits conditions and keeps params',
		fn: () => helice.select('post')
			.join({ user: { '#': 'INNER', id: col('post.author_id'), '&&:g': [{ active: true }, { name: 'bob' }] } as any })
			.prepare()(),
		expected: {
			query : 'SELECT *\nFROM post\nINNER JOIN user\n\tON id = post.author_id AND ( ( active = $1 ) OR ( name = $2 ) )',
			args  : [true, 'bob'],
		},
	},

	{
		label    : 'col() inside a value array → ARRAY[...] with live params',
		fn       : () => helice.select('post').where({ views: [1, col('post.id')] as any }).prepare()(),
		expected : { query: "SELECT *\nFROM post\nWHERE (\n\tviews = ANY(ARRAY[$1, post.id])\n)", args: [1] },
	},

	{
		label: 'tsquery in runtime WHERE adds its FROM expressions',
		fn: () => {
			const fn = helice.select('post').prepare({ where: true });
			return fn({ where: { '@@:content': { value: 'x', language: 'english' } } as any });
		},
		expected: {
			query : 'SELECT *\nFROM post, to_tsquery($1, $2) as content_query, ts_rank_cd($3, content, content_query, 32) AS content_rank\nWHERE (\n\tcontent_query @@ content\n)',
			args  : ['english', 'x', [0.1, 0.2, 0.4, 1.0]],
		},
	},

];

describe('regressions', () => {
	for (const { label, fn, expected } of cases) {
		it(label, () => expect(fn()).toEqual(expected));
	}

	it('exports col, Column, syntax keys and query classes from package root', () => {
		expect(typeof col).toBe('function');
		expect(col('user.id').name).toBe('user.id');
		expect(VerboseSyntaxKeys.alias).toBe(' AS ');
		expect(typeof Helice).toBe('function');
	});

	it('col() still produces column-to-column comparison', () => {
		expect(helice.select('post').where({ 'author_id': col('post.id') as any }).prepare()())
			.toEqual({ query: 'SELECT *\nFROM post\nWHERE (\n\tauthor_id = post.id\n)', args: [] });
	});

	it('unrecognized WHERE key throws instead of emitting broken SQL', () => {
		expect(() => helice.select('post').where({ published: true, 'zzz:!!bad': 1 } as any).prepare()())
			.toThrow(/unrecognized WHERE key/);
	});

	it('unrecognized JOIN condition key throws', () => {
		expect(() => helice.select('post')
			.join({ user: { '#': 'INNER', 'zzz:!!bad': 1 } as any })
			.prepare()())
			.toThrow(/unrecognized JOIN condition key/);
	});

	it('UPDATE without SET throws', () => {
		expect(() => (helice.update('user') as any).where({ id: 1 }).prepare({ set: true })({}))
			.toThrow(/requires a SET clause/);
	});

	it('INSERT without values throws', () => {
		expect(() => (helice.insert('user') as any).prepare()())
			.toThrow(/requires at least one row of values/);
	});
});
