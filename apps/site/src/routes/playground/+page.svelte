<script lang="ts">
	import Playground from '#lib/playground/Playground.svelte';
</script>

<svelte:head>
	<title>Playground : Hélice</title>
	<meta name="description" content="Write Hélice queries in your browser, with autocompletion and type errors, and read the SQL they produce." />
</svelte:head>

<main class="page">
	<h1>Playground</h1>
	<p class="intro">
		The real library and its real types, running in your browser. Nothing leaves this page, and there is no database behind it :
		you read the SQL, you don't run it.
	</p>
	<Playground />
</main>

<style>
	main{
		padding-block : 32px 72px;
	}

	h1{
		font-size : clamp(2rem, 4vw, 2.5rem);
	}

	.intro{
		max-width : 46rem;
		margin : 8px 0 24px;
		color : var(--text-muted);
	}
</style>
