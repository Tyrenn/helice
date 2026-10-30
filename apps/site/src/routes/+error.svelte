<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
</script>

<svelte:head>
	<title>{page.status} : Hélice</title>
</svelte:head>

<main class="page">
	<h1>(0 rows)</h1>
	<p>{page.status === 404 ? 'There is nothing at this address.' : page.error?.message}</p>
	<a href={resolve('/')}>Back to the home page</a>
</main>

<style>
	main{
		min-height : 60vh;
		padding-block : 96px;
	}

	h1{
		font-size : 2.25rem;
	}
</style>
