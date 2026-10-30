<script lang="ts">
	import hljs from 'highlight.js/lib/core';
	import sql from 'highlight.js/lib/languages/sql';
	import { copyCode } from '#lib/copy.ts';
	import { presets } from './presets.ts';
	import type { Diagnostic, Update } from './editor.ts';
	import type { Output } from './runner.worker.ts';

	hljs.registerLanguage('sql', sql);

	let selected = $state(presets[0].id);
	let loading = $state(true);
	let loadError = $state(false);
	let outputs = $state.raw<Output[]>([]);
	let runError = $state<string>();
	let diagnostics = $state.raw<Diagnostic[]>([]);

	let setCode : ((code : string) => void) | undefined;

	const onUpdate = (update : Update) => {
		if('diagnostics' in update){
			diagnostics = update.diagnostics;
			return;
		}

		outputs = update.outputs;
		runError = update.error;
	};

	const select = (preset : typeof presets[number]) => {
		selected = preset.id;
		setCode?.(preset.code);
	};

	// Monaco only exists in a browser, and only this page pays for its size
	const editor = (element : HTMLElement) => {
		let destroy : (() => void) | undefined;
		let gone = false;

		import('./editor.ts')
			.then(({createEditor}) => {
				if(gone)
					return;

				const created = createEditor(element, presets[0].code, onUpdate);
				setCode = created.setCode;
				destroy = created.destroy;
				loading = false;
			})
			.catch(() => {
				loading = false;
				loadError = true;
			});

		return () => {
			gone = true;
			destroy?.();
		};
	};
</script>

<div class="tabs" role="group" aria-label="Examples">
	{#each presets as preset (preset.id)}
		<button
			type="button"
			aria-pressed={selected === preset.id}
			class={{active : selected === preset.id}}
			onclick={() => select(preset)}
		>{preset.label}</button>
	{/each}
</div>

<div class="workspace">
	<div class="editor code" {@attach editor}>
		{#if loading}
			<p class="status">Loading the editor…</p>
		{:else if loadError}
			<p class="status">The editor could not load. Check your connection and reload the page.</p>
		{/if}
	</div>

	<div class="result" aria-live="polite">
		{#if diagnostics.length > 0}
			<div class="diagnostics">
				<h2>{diagnostics.length === 1 ? 'Rejected by TypeScript' : `${diagnostics.length} errors from TypeScript`}</h2>
				<ul>
					{#each diagnostics as diagnostic (`${diagnostic.line} ${diagnostic.message}`)}
						<li><span>Line {diagnostic.line}</span> {diagnostic.message}</li>
					{/each}
				</ul>
			</div>
		{/if}

		{#if runError}
			<div class="diagnostics">
				<h2>Thrown at runtime</h2>
				<p>{runError}</p>
			</div>
		{/if}

		{#each outputs as output (output.name)}
			<section>
				<h2>{output.name}</h2>
				{#if output.kind === 'query'}
					<div class="code">
						<!-- Escaped by highlight.js -->
						<pre><code class="hljs">{@html hljs.highlight(output.query, {language : 'sql'}).value}</code></pre>
						<button type="button" class="copy" onclick={(event) => copyCode(event.currentTarget)}>Copy</button>
					</div>
					<p class="args"><span>args</span> <code>{output.args}</code></p>
				{:else}
					<div class="code">
						<pre><code>{output.value}</code></pre>
					</div>
				{/if}
			</section>
		{:else}
			{#if !runError && !loading && !loadError}
				<p class="empty">Nothing exported yet. Add <code>export const result = db.select(...).build();</code></p>
			{/if}
		{/each}
	</div>
</div>

<style>
	.tabs{
		display : flex;
		gap : 6px;
		margin-bottom : 16px;
		overflow-x : auto;
		scrollbar-width : none;
	}

	.tabs button{
		flex : none;
		padding : 7px 16px;
		border : 1px solid var(--line);
		border-radius : 999px;
		background : none;
		color : var(--text-muted);
		font : 500 0.92rem var(--font-body);
		cursor : pointer;
	}

	.tabs button:hover{
		color : var(--text);
	}

	.tabs .active, .tabs .active:hover{
		border-color : var(--accent);
		background : var(--accent);
		color : var(--on-accent);
	}

	.workspace{
		display : grid;
		grid-template-columns : minmax(0, 3fr) minmax(0, 2fr);
		gap : 20px;
		align-items : stretch;
	}

	.editor{
		height : clamp(420px, 70vh, 760px);
		overflow : hidden;
	}

	.status{
		margin : 0;
		padding : 18px 20px;
		color : var(--on-ink-muted);
	}

	.result{
		display : flex;
		flex-direction : column;
		gap : 18px;
		min-width : 0;
	}

	.result section{
		min-width : 0;
	}

	h2{
		margin-bottom : 8px;
		font : 500 0.85rem var(--font-mono);
		color : var(--text-muted);
	}

	.args{
		display : flex;
		gap : 10px;
		margin : 8px 0 0;
		overflow-wrap : anywhere;
	}

	.args span{
		color : var(--text-muted);
		font-size : 0.85rem;
	}

	.diagnostics{
		padding : 12px 16px;
		border-left : 3px solid var(--accent);
		border-radius : 0 8px 8px 0;
		background : var(--surface-raised);
		overflow-wrap : anywhere;
	}

	.diagnostics h2{
		color : var(--text);
		font : 600 0.95rem var(--font-body);
	}

	.diagnostics ul{
		margin : 0;
		padding : 0;
		list-style : none;
		font-size : 0.875rem;
	}

	.diagnostics li + li{
		margin-top : 8px;
	}

	.diagnostics li span{
		color : var(--text-muted);
		font-weight : 600;
	}

	.diagnostics p, .empty{
		margin : 0;
		font-size : 0.9rem;
	}

	.empty{
		color : var(--text-muted);
	}

	@media (max-width: 860px){
		.workspace{
			grid-template-columns : minmax(0, 1fr);
		}

		.editor{
			height : 55vh;
			min-height : 340px;
		}
	}
</style>
