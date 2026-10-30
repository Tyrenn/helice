<script lang="ts">
	import { docHref, playgroundHref } from '#lib/links.ts';
	import Logo from '#lib/Logo.svelte';
	import { copyCode } from '#lib/copy.ts';

	let {data} = $props();

	let selected = $state('select');
	let example = $derived(data.examples.find((other) => other.id === selected) ?? data.examples[0]);

	const features = [
		{title : 'No schema file, no codegen', text : 'Your schema is a TypeScript type. There is no CLI to run and nothing to generate.'},
		{title : 'Zero runtime dependencies', text : 'Hélice builds strings and an array of arguments. Nothing else ends up in your bundle.'},
		{title : 'Bring your own driver', text : 'Hand query and args to pg, postgres or anything else, or pass an executor and get its result back.'},
		{title : 'Prepared once, called often', text : 'prepare() compiles the query once and returns a function. Static and runtime values merge on their own.'},
		{title : 'Restricted at runtime', text : 'Leave a WHERE open at call time, and limit the columns it may use. TypeScript rejects the others.'},
		{title : 'Parameterized values', text : 'What you pass to where, set and values travels as $1, $2… in args, not inside the query text.'}
	];
</script>

<svelte:head>
	<title>Hélice : a typesafe PostgreSQL query builder</title>
	<meta name="description" content="Fluent, typesafe PostgreSQL queries from plain TypeScript types. No schema file, no codegen, zero runtime dependencies." />
</svelte:head>

<section class="hero">
	<div class="propeller" aria-hidden="true"><Logo size={720} /></div>
	<div class="page hero-grid">
		<div class="pitch">
			<div class="lockup">
				<Logo size={92} />
				<div>
					<p class="wordmark">hélice</p>
					<p class="motto"><span aria-hidden="true">🛩</span> Typesafe query builder</p>
				</div>
			</div>
			<h1>Keep your SQL. Lose the typos.</h1>
			<p class="lead">
				A fluent query builder for PostgreSQL. Describe your tables as plain TypeScript types, and your editor checks and
				completes your queries against them.
			</p>
			<div class="actions">
				<a class="button primary" href={docHref('getting-started')}>Get started</a>
				<a class="button secondary" href={playgroundHref()}>Open the playground</a>
			</div>
			<div class="code install">
				<pre><code>pnpm add helice</code></pre>
				<button type="button" class="copy" onclick={(event) => copyCode(event.currentTarget)}>Copy</button>
			</div>
		</div>
		<div class="hero-example">
			<div class="code">
				<pre>{@html data.quickstart.code}</pre>
			</div>
			<div class="code output">
				<pre>{@html data.quickstart.sql}</pre>
				<p class="args"><span>args</span> <code>{data.quickstart.args}</code></p>
			</div>
		</div>
	</div>
</section>

<section class="page section">
	<h2>The clauses you already know</h2>
	<div class="tabs" role="tablist" aria-label="Examples">
		{#each data.examples as other (other.id)}
			<button
				type="button"
				role="tab"
				id="tab-{other.id}"
				aria-selected={selected === other.id}
				aria-controls="example"
				class={{active : selected === other.id}}
				onclick={() => selected = other.id}
			>{other.label}</button>
		{/each}
	</div>
	<div id="example" role="tabpanel" aria-labelledby="tab-{example.id}">
		<p class="summary">
			{example.summary}
			<a href={docHref(example.doc)}>Read more</a>
		</p>
		<div class="pair">
			<div class="code">
				<pre>{@html example.code}</pre>
			</div>
			<div class="code output">
				<pre>{@html example.sql}</pre>
				<p class="args"><span>args</span> <code>{example.args}</code></p>
			</div>
		</div>
	</div>
</section>

<section class="dark">
	<div class="page">
		<h2>Two vocabularies, one SQL</h2>
		<p class="intro">
			Compact symbols, or keys that read like the SQL they produce ? Choose per instance, or write your own set of keys : types and
			parsers follow it end to end.
		</p>
		<div class="syntaxes">
			<div>
				<h3><code>DefaultSyntaxKeys</code></h3>
				<div class="code raised">
					<pre>{@html data.syntax.default}</pre>
				</div>
			</div>
			<div>
				<h3><code>VerboseSyntaxKeys</code></h3>
				<div class="code raised">
					<pre>{@html data.syntax.verbose}</pre>
				</div>
			</div>
		</div>
		<h3 class="both">Both produce</h3>
		<div class="code raised">
			<pre>{@html data.syntax.sql}</pre>
		</div>
		<a class="more" href={docHref('getting-started', '#syntaxkeys')}>How syntax keys work</a>
	</div>
</section>

<section class="page section typesafe">
	<div>
		<h2>The compiler reads your schema</h2>
		<p class="intro">
			Table names, selected columns, the type of each value, what a join brings into scope : a mistake is a red line in your
			editor, not an error from your database in production.
		</p>
		<p class="intro">
			Each line on the right is a real compile error : this repository's CI fails the day one of them stops being one.
		</p>
		<a class="button accent" href={playgroundHref()}>Try it in the playground</a>
	</div>
	<div class="code">
		<pre>{@html data.typesafe}</pre>
	</div>
</section>

<section class="page section rest">
	<h2>And the rest</h2>
	<ul class="features">
		{#each features as feature (feature.title)}
			<li>
				<h3>{feature.title}</h3>
				<p>{feature.text}</p>
			</li>
		{/each}
	</ul>
</section>

<section class="page section rest">
	<h2>Before you install</h2>
	<p class="intro">
		Hélice writes table and column names as they are, without quoting them. Names that collide with PostgreSQL reserved words
		(<code>order</code>, <code>group</code>…), or that contain uppercase letters or special characters, are not supported : stick to
		lowercase <code>snake_case</code>.
	</p>
	<div class="doc-links">
		{#each data.docs as doc (doc.slug)}
			<a href={docHref(doc.slug)}>
				<strong>{doc.title}</strong>
				<span>{doc.description}</span>
			</a>
		{/each}
	</div>
</section>

<style>
	.hero{
		position : relative;
		padding-block : clamp(48px, 8vw, 88px);
		background : var(--ink);
		color : var(--on-ink);
		overflow : hidden;
	}

	/* Turning slowly behind everything, like the banner's mark at full scale */
	.propeller{
		position : absolute;
		top : calc(50% - 360px);
		left : calc(50% - 192px);
		opacity : 0.07;
		pointer-events : none;
		animation : spin 60s linear infinite;
	}

	@keyframes spin{
		to{
			transform : rotate(360deg);
		}
	}

	.hero-grid{
		position : relative;
		display : grid;
		grid-template-columns : minmax(0, 1fr) minmax(0, 1fr);
		align-items : center;
		gap : clamp(32px, 5vw, 64px);
	}

	.lockup{
		display : flex;
		align-items : center;
		gap : 16px;
		margin-bottom : 28px;
	}

	.wordmark{
		margin : 0;
		font : 500 3.4rem/1 var(--font-display);
	}

	.motto{
		margin : 6px 0 0;
		color : var(--blade-light);
		font : 400 1.1rem/1.2 var(--font-display);
	}

	h1{
		font-size : clamp(2.3rem, 5vw, 3.6rem);
		line-height : 1.06;
	}

	.lead{
		max-width : 34rem;
		margin : 20px 0 28px;
		color : var(--on-ink-muted);
		font-size : 1.1rem;
	}

	.actions{
		display : flex;
		flex-wrap : wrap;
		align-items : center;
		gap : 12px;
	}

	.button{
		display : inline-block;
		padding : 10px 22px;
		border-radius : 999px;
		font : 500 1.05rem var(--font-display);
		text-decoration : none;
	}

	.primary{
		background : var(--blade-light);
		color : var(--ink);
	}

	.primary:hover{
		background : #fff;
	}

	.secondary{
		border : 1px solid var(--ink-line);
		color : var(--on-ink);
	}

	.secondary:hover{
		border-color : var(--blade-light);
	}

	.accent{
		margin-top : 4px;
		background : var(--accent);
		color : var(--on-accent);
	}

	.install{
		display : inline-block;
		margin-top : 16px;
		background : var(--ink-raised);
		border-radius : 999px;
	}

	.install pre{
		padding : 9px 66px 9px 18px;
	}

	.install .copy{
		top : 7px;
		opacity : 1;
	}

	.hero-example{
		display : grid;
		gap : 12px;
		min-width : 0;
	}

	.hero-example .code{
		background : var(--ink-raised);
	}

	.output pre{
		tab-size : 2;
	}

	.args{
		display : flex;
		gap : 10px;
		margin : 0;
		padding : 0 20px 16px;
		overflow-wrap : anywhere;
	}

	.args span{
		color : var(--on-ink-muted);
		font-size : 0.85rem;
	}

	.section{
		padding-block : clamp(56px, 8vw, 88px);
	}

	/* Two plain sections in a row : one gap between them, not two */
	.rest + .rest{
		padding-top : 0;
	}

	h2{
		margin-bottom : 16px;
		font-size : clamp(1.7rem, 3.4vw, 2.5rem);
	}

	.intro{
		max-width : 46rem;
		margin : 0 0 28px;
		color : var(--text-muted);
	}

	code{
		font-size : 0.92em;
	}

	.tabs{
		display : flex;
		gap : 6px;
		margin-block : 24px 16px;
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
		font : 500 0.92rem var(--font-mono);
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

	.summary{
		margin : 0 0 12px;
		color : var(--text-muted);
	}

	.pair{
		display : grid;
		grid-template-columns : minmax(0, 1fr) minmax(0, 1fr);
		gap : 12px;
	}

	.dark{
		padding-block : clamp(56px, 8vw, 88px);
		background : var(--ink);
		color : var(--on-ink);
	}

	.dark .intro{
		color : var(--on-ink-muted);
	}

	.dark h3{
		margin-bottom : 8px;
		font-size : 1rem;
		color : var(--blade-light);
	}

	.dark h3 code{
		font-size : 0.9rem;
	}

	.raised{
		background : var(--ink-raised);
	}

	.syntaxes{
		display : grid;
		grid-template-columns : minmax(0, 1fr) minmax(0, 1fr);
		gap : 16px;
	}

	.both{
		margin-top : 20px;
	}

	.dark .raised pre{
		tab-size : 2;
	}

	.more{
		display : inline-block;
		margin-top : 20px;
		color : var(--blade-light);
	}

	.typesafe{
		display : grid;
		grid-template-columns : minmax(0, 5fr) minmax(0, 6fr);
		align-items : center;
		gap : clamp(32px, 5vw, 72px);
	}

	.features{
		display : grid;
		grid-template-columns : repeat(auto-fit, minmax(min(100%, 19rem), 1fr));
		gap : 28px 40px;
		margin : 28px 0 0;
		padding : 0;
		list-style : none;
	}

	.features h3{
		margin-bottom : 6px;
		font-size : 1.25rem;
	}

	.features p{
		margin : 0;
		color : var(--text-muted);
	}

	.doc-links{
		display : grid;
		grid-template-columns : repeat(auto-fill, minmax(min(100%, 17rem), 1fr));
		gap : 12px;
	}

	.doc-links a{
		padding : 14px 16px;
		border : 1px solid var(--line);
		border-radius : 14px;
		color : inherit;
		text-decoration : none;
	}

	.doc-links a:hover{
		border-color : var(--accent);
	}

	.doc-links strong{
		display : block;
		font : 500 1.15rem var(--font-display);
	}

	.doc-links span{
		color : var(--text-muted);
		font-size : 0.875rem;
	}

	@media (max-width: 860px){
		.hero-grid, .pair, .syntaxes, .typesafe{
			grid-template-columns : minmax(0, 1fr);
		}

		.propeller{
			left : calc(50% - 60px);
		}
	}
</style>
