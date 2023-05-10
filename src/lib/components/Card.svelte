<script lang="ts">
  import { fly } from "svelte/transition";
  export let card = '';
  export let best: boolean | undefined = undefined;
  export let isinHand = true;

  $: folded = !isinHand || best === false;
</script>

<div class={card ? card[1] : 'back'} class:best class:folded transition:fly|local={{y: -16}}>
  {#if card}
    {@const rank = card[0]}
    <p class='sm'>{rank}</p>
    <p class='big'>{rank}</p>
  {/if}
</div>

<style>
  div {
    display: inline-block;
    aspect-ratio: 5 / 7;
    width: 4rem;
    padding: 0 0.375rem;
    border-radius: 0.375rem;
    color: white;
    font-weight: 800;
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
    user-select: none;
  }

  .back {
    border: 0.125rem solid white;
    background: linear-gradient(20deg, #111827, #475569);
  }

  .sm {
    font-size: 1.5rem;
    line-height: 1.25;
  }

  .big {
    font-size: 3.5rem;
    line-height: 0.95;
    text-align: center;
  }

  .best {
    position: relative;
    box-shadow: 0 0 8px 2px #0ff;
    transform: translateY(-0.75rem);
    z-index: 1;
  }

  .folded {
    filter: brightness(50%);
  }

  :is(.s) {
    background: linear-gradient(20deg, #111827, #475569);
  }

  :is(.c) {
    background: linear-gradient(20deg, #14532d, #16a34a);
  }

  :is(.h) {
    background: linear-gradient(20deg, #7f1d1d, #ef4444);
  }

  :is(.d) {
    background: linear-gradient(20deg, #0c4a6e, #0284c7);
  }
</style>