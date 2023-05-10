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

  // $: flag = progress < 0.5 ? 1 : 0;
  // $: a = -progress * Math.PI * 2 + Math.PI / 2;
  $: flag = progress < 0.5 ? 1 : 0;
  $: a = -progress * Math.PI * 2 + Math.PI / 2;
  $: x = 16 + Math.cos(a) * 16;
  $: y = 16 - Math.sin(a) * 16;
</script>

<svg viewBox="0 0 32 32" fill='yellow'>
  <!-- <path d="M {x} {y} A 14.5 14.5 0 {flag} 1 16 1.5"></path> -->
  <path d="M 16 16 L {x} {y} A 16 16 0 {flag} 1 16 0 L 16 0"></path>
</svg>

<style>
  svg {
    position: relative;
    height: 100%;
    width: 100%;
    z-index: 150;
    opacity: 0.5;
  }
</style>