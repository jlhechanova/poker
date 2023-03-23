<script lang="ts">
  import type { Card } from "$lib/consts";
  export let card: Card;

  const { rank, suit } = card;
</script>

<div class={suit}>
  <span>{ rank }</span>
  <p>{ rank }</p>
</div>

<style>
  div {
    display: inline-block;
    height: 7rem;
    width: 5rem;
    padding: 0.25rem;
    border-radius: 0.375rem;
    font-family: Helvetica, sans-serif;
    color: white;
    filter: drop-shadow(0 10px 8px rgb(255 255 255 / 0.04)) drop-shadow(0 4px 3px rgb(255 255 255 / 0.1));
  }

  span {
    font-size: 1.5rem;
    font-weight: 600;
  }

  p {
    text-align: center;
    font-size: 4.5rem;
    font-weight: 800;
    line-height: 1;
  }

  :is(.S) {
    background-color: #0f172a;
  }

  :is(.C) {
    background-color: #15803d;
  }

  :is(.H) {
    background-color: #b91c1c;
  }

  :is(.D) {
    background-color: #0369a1;
  }
</style>