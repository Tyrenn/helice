<script lang="ts">
	let {data} = $props();

	const GITHUB = 'https://github.com/Tyrenn';
</script>

<svelte:head>
	<title>About : Hélice</title>
	<meta name="description" content="Hélice is developed and maintained by Guillaume Vailland. How to contribute, and Mousse, a typed Node.js web framework." />
</svelte:head>

<main class="page">
	<h1>About</h1>
	<p class="lead">
		Hello there ! I'm <a href="https://www.linkedin.com/in/guillaume-vailland-136408125/">Guillaume Vailland</a> (Tyren), a humble typescript developer from Nantes, France.
	</p>
	<p class="lead">
		I really do enjoy SQL and its vocabulary : with Hélice, I only intend to ease query writing, not to replace SQL. I develop and maintain it
		on my own as a key package across my work, so support and contributions are very welcome.
	</p>
	<p class="lead">
		“Hélice”, pronounced <em>ay-lees</em>, is French for mechanical propeller, which looks a bit like a <em>q</em> and a <em>b</em> of
		<em>query builder</em> stacked on top of each other.
	</p>

	<h2 class="more">My other work</h2>
	<section>
		<div class="title">
			<!-- The bubbles of Mousse's own logo -->
			<svg viewBox="90 57 103 95" width="40" height="37" aria-hidden="true">
				<circle cx="124.423" cy="105.239" r="33.669" fill="#0e9fff" />
				<path d="M111.841,78.449l8.28,1.008c-9.114,5.788 -18.439,14.986 -19.769,29.44c-0.894,-13.304 4.721,-23.333 11.488,-30.449Z" fill="#fff" />
				<circle cx="141.275" cy="74.384" r="16.852" fill="#b6e2ff" />
				<path d="M134.977,60.975l4.144,0.505c-4.562,2.897 -9.229,7.501 -9.894,14.735c-0.448,-6.659 2.363,-11.678 5.75,-15.24Z" fill="#fff" />
				<circle cx="167.748" cy="91.235" r="24.269" fill="#80ccff" />
				<path d="M158.678,71.925l5.969,0.727c-6.57,4.172 -13.291,10.802 -14.249,21.221c-0.645,-9.589 3.403,-16.819 8.281,-21.948Z" fill="#fff" />
				<circle cx="152.089" cy="118.92" r="32.274" fill="#005a95" />
				<path d="M140.028,93.24l7.937,0.967c-8.736,5.548 -17.675,14.365 -18.949,28.22c-0.857,-12.752 4.525,-22.366 11.012,-29.187Z" fill="#fff" />
			</svg>
			<h3>Mousse</h3>
		</div>
		<p>
			A typed Node.js framework built on top of µWebSockets, for HTTP, WebSockets and Server-Sent Events, with Standard Schema validation,
			rate limiting and documentation generation.
		</p>
		<div class="code">
			<pre>{@html data.mousse}</pre>
		</div>
		<p class="aside">
			In French, <em>mousse</em> is soap foam : thousands of bubbles, the requests.
		</p>
		<span class="links">
			<a href="https://tyrenn.github.io/mousse/">Discover Mousse</a>
			<a href="{GITHUB}/mousse">Tyrenn/mousse</a>
		</span>
	</section>

	<h2 class="more" id="contributing">Contributing</h2>
	<p class="intro">
		Bug reports, ideas, pull requests, anything really. The simplest contribution is to test Hélice and <a href="{GITHUB}/helice/issues">open issues</a>. For code contributions:
	</p>
	<ol class="steps">
		<li>
			<strong>Fork</strong> <a href="{GITHUB}/helice">the repository</a> and create a branch from <code>main</code>.
			<div class="code"><pre>{@html data.contributing.setup}</pre></div>
		</li>
		<li>
			<strong>Make your change</strong>, with tests in
			<a href="{GITHUB}/helice/tree/main/packages/helice/tests"><code>packages/helice/tests</code></a>. Then check everything locally.
			<div class="code"><pre>{@html data.contributing.check}</pre></div>
		</li>
		<li>
			<strong>Record a user-facing change</strong> with a changeset. It describes the change and the version bump it deserves, and ends up in the changelog.
			Answer the prompts, then commit the generated <code>.changeset/*.md</code> file with your change.
			<div class="code"><pre>{@html data.contributing.changeset}</pre></div>
		</li>
		<li>
			<strong>Open a pull request</strong> against <code>main</code>. CI runs the build, the types and the tests.
		</li>
	</ol>
</main>

<style>
	/* A single reading column, centered by .page */
	main{
		--page : 52rem;
		padding-block : clamp(40px, 6vw, 72px);
	}

	h1{
		font-size : clamp(2.2rem, 5vw, 3rem);
	}

	.lead{
		margin : 16px 0 0;
		font-size : 1.1rem;
	}

	section{
		padding : 24px;
		border : 1px solid var(--line);
		border-radius : 18px;
		background : var(--surface-raised);
	}

	.title{
		display : flex;
		align-items : center;
		gap : 12px;
		margin-bottom : 14px;
		min-height : 40px;
	}

	h2{
		font-size : 1.75rem;
	}

	h3{
		font-size : 1.5rem;
	}

	section p{
		margin : 0 0 14px;
	}

	section .code{
		margin-bottom : 14px;
	}

	.aside{
		color : var(--text-muted);
		font-size : 0.9rem;
	}

	.links{
		display : flex;
		flex-wrap : wrap;
		gap : 8px 20px;
	}

	.more{
		margin-block : 48px 16px;
	}

	.intro{
		margin : 0 0 20px;
	}

	.steps{
		display : grid;
		gap : 20px;
		margin : 0;
		padding-left : 1.4rem;
	}

	.steps li{
		min-width : 0;
		overflow-wrap : anywhere;
	}

	.steps li::marker{
		color : var(--text-muted);
		font-family : var(--font-display);
	}

	.steps .code{
		margin-top : 10px;
		overflow-wrap : normal;
	}

	.steps :not(pre) > code, .steps a code{
		font-size : 0.88em;
	}
</style>
