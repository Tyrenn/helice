<script lang="ts">
	// Fixed positions : the prerendered page and the hydrated one must match
	// The first and last fly in the hero's margins, the two others behind the text : smaller and fainter, to keep it readable
	const planes = [
		{top : 3, size : 40, delay : 4, duration : 30, climb : -8, tilt : -0.5, opacity : 0.65, reverse : false},
		{top : 33, size : 24, delay : 21, duration : 44, climb : 20, tilt : -1, opacity : 0.2, reverse : true},
		{top : 62, size : 28, delay : 12, duration : 38, climb : -24, tilt : -1, opacity : 0.22, reverse : false},
		{top : 88, size : 44, delay : 25, duration : 26, climb : 10, tilt : -0.5, opacity : 0.65, reverse : true}
	];
</script>

<!-- Decorative, hidden from assistive technologies : the 🛩️ emoji seen from above, in the banner's colors -->
<div class="sky" aria-hidden="true">
	{#each planes as plane (plane.top)}
		<div
			class={['plane', plane.reverse && 'reverse']}
			style:top="{plane.top}%"
			style:--climb="{plane.climb}px"
			style:opacity={plane.opacity}
			style:animation-delay="-{plane.delay}s"
			style:animation-duration="{plane.duration}s"
		>
			<svg viewBox="0 0 64 64" width={plane.size} height={plane.size} style:rotate="{plane.tilt}deg">
				<rect class="red" x="26" y="3" width="15" height="58" rx="3.5" />
				<rect class="pale" x="29" y="7" width="8" height="9" rx="1.5" />
				<rect class="pale" x="29" y="48" width="8" height="9" rx="1.5" />
				<rect class="red" x="4" y="20" width="9" height="24" rx="2.5" />
				<path class="pale" d="M3 30.5 L42 25 C50 24 56 27 57.5 32 C56 37 50 40 42 39 L3 33.5 Z" />
				<ellipse class="canopy" cx="46.5" cy="32" rx="5" ry="4.2" />
				<ellipse class="propeller" cx="60" cy="32" rx="1.5" ry="13" />
			</svg>
		</div>
	{/each}
</div>

<style>
	.sky{
		position : absolute;
		inset : 0;
		overflow : hidden;
		pointer-events : none;
	}

	.plane{
		position : absolute;
		left : 0;
		will-change : transform;
		animation : fly linear infinite;
	}

	/* The same straight line, flown the other way */
	.reverse{
		animation-direction : reverse;
	}

	.reverse svg{
		scale : -1 1;
	}

	svg{
		display : block;
	}

	.red{
		fill : #d23b3b;
	}

	.pale{
		fill : var(--blade-light);
	}

	.canopy{
		fill : var(--ink);
	}

	.propeller{
		fill : var(--on-ink-muted);
		transform-box : fill-box;
		transform-origin : center;
		animation : propeller 0.14s linear infinite alternate;
	}

	@keyframes fly{
		from{
			transform : translate(-80px, 0);
		}

		to{
			transform : translate(calc(100vw + 80px), var(--climb));
		}
	}

	@keyframes propeller{
		from{
			transform : scaleY(1);
		}

		to{
			transform : scaleY(0.15);
		}
	}

	/* No motion, no planes : parked at the edge of the screen, they would mean nothing */
	@media (prefers-reduced-motion: reduce){
		.sky{
			display : none;
		}
	}
</style>
