<script lang='ts'>
  import { onMount } from "svelte";

  let start: number;
  let progress = 0;
  
  onMount(() => {
    start = Date.now();
    const interval = setInterval(() => {
      const now = Date.now();
      progress = (now - start) / 15000;
    });

    return () => clearInterval(interval);
  });

  $: a = -progress * Math.PI * 2 + Math.PI / 2;
  $: x = 50 + Math.cos(a) * 50;
  $: y = 50 - Math.sin(a) * 50;
  $: flag = progress < 0.5 ? 1 : 0;
</script>

<div>
  <svg viewBox="0 0 100 100" style:fill={'yellow'}>
    <path d="M 50 50 L {x} {y} A 50 50 0 {flag} 1 50 0 L 50 50"></path>
  </svg>
</div>

<style>
  div {
    position: absolute;
    bottom: -2rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 50;
  }

  svg {
    height: 4rem;
    width: 4rem;
  }
</style>