<script lang="ts">
	import { docHref, playgroundHref } from '#lib/links.ts';

	let {data} = $props();
</script>

<svelte:head>
	<title>Documentation : Hélice</title>
	<meta name="description" content="Schema, syntax keys, clauses, SELECT, INSERT, UPDATE and DELETE with Hélice." />
</svelte:head>

<h1>Documentation</h1>
<p class="intro">New here ? Start with <a href={docHref('getting-started')}>Getting started</a>, or try things in the <a href={playgroundHref()}>playground</a>.</p>

<ol>
	{#each data.docs as doc (doc.slug)}
		<li>
			<a href={docHref(doc.slug)}>
				<strong>{doc.title}</strong>
				<span>{doc.description}</span>
			</a>
		</li>
	{/each}
</ol>

<style>
	h1{
		font-size : 2.25rem;
	}

	.intro{
		margin : 12px 0 28px;
		color : var(--text-muted);
	}

	ol{
		display : grid;
		gap : 2px;
		margin : 0;
		padding : 0;
		list-style : none;
	}

	ol a{
		display : block;
		padding : 12px 14px;
		border-radius : 12px;
		color : inherit;
		text-decoration : none;
	}

	ol a:hover{
		background : var(--surface-raised);
	}

	strong{
		display : block;
		font : 500 1.25rem var(--font-display);
	}

	span{
		color : var(--text-muted);
		font-size : 0.93rem;
	}
</style>
