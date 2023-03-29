<script lang="ts">
  import type Card from "$lib/consts/card";
  import { fly } from 'svelte/transition';
  export let card: Card | null = null;

</script>


<div class={card ? card.suit : 'back'} in:fly={{y: -16}} out:fly={{y: 16}}>
{#if card}
  <span>{ card.rank }</span>
  <p>{ card.rank }</p>
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

  span {
    font-size: 1.5rem;
    line-height: 1.25;
  }

  p {
    font-size: 4.5rem;
    line-height: 1;
    text-align: center;
  }

  :is(.S) {
    background: linear-gradient(20deg, #111827, #475569);
  }

  :is(.C) {
    background: linear-gradient(20deg, #14532d, #16a34a);
  }

  :is(.H) {
    background: linear-gradient(20deg, #7f1d1d, #ef4444);
  }

  :is(.D) {
    background: linear-gradient(20deg, #0c4a6e, #0284c7);
  }
</style>