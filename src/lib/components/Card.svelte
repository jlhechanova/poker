<script lang="ts">
  import { fly } from 'svelte/transition';
  import type { ICard } from '$lib/consts';
  export let card: ICard;
</script>

<div class={card ? card[1] : 'h'} transition:fly|local={{y: -16}}>
  {#if card}
    {@const rank = card[0]}
    <span>{ rank }</span>
    <span>{ rank }</span>
  {/if}
</div>

<style>
  div {
    display: inline-block;
    height: 7rem;
    width: 5rem;
    padding: 0 0.375rem;
    border-radius: 0.375rem;
    color: white;
    font-weight: 800;
    filter: drop-shadow(0 10px 8px rgb(255 255 255 / 0.04)) drop-shadow(0 4px 3px rgb(255 255 255 / 0.1));
  }

  .back {
    border: 0.125rem solid white;
    background: linear-gradient(20deg, #111827, #475569);
  }

  span:first-child {
    font-size: 1.5rem;
    line-height: 1.25;
  }

  span:last-child {
    font-size: 4.5rem;
    line-height: 1;
    text-align: center;
  }

  .winning {
    box-shadow: 0 0 10px 5px #0ff;
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