<script lang="ts">
  import type { Suit, Rank } from "$lib/consts";
  import { suits, ranks } from "$lib/consts";
  import Card from "./Card.svelte";
  let button = 0;

  const makeDeck = () => suits
    .map(suit => ranks.map(rank => ({ rank: rank, suit: suit })))
    .reduce((prev, curr) => prev.concat(curr));
    
  const draw = () => {
    return deck.splice(Math.round(Math.random() * deck.length), 1)[0];
  }

  let deck = makeDeck();

</script>

<main>
  <div class="player"></div>
  <div class="tablecontainer">
    <div class="table"></div>
  </div>
  <div class="player"></div>

  {#each deck as card}
  <Card { card } />
  {/each}
</main>

<style>
  main {
    position: relative;
  }

  .tablecontainer {
    perspective: 50rem;
  }

  .table {
    position: relative;
    margin: -2rem auto 0;
    height: 25rem;
    width: 50rem;
    border-radius: 25rem;
    background-color: #166534;
    border: 2rem solid #16a34a;
    outline: 1.5rem solid #111827;
    box-sizing: border-box;
    box-shadow: inset 0 2px 4px 0 rgb(0 0 0 / 0.4);
    transform: rotate3d(1, 0, 0, 30deg);
    z-index: -10;
  }

  .player {
    position: relative;
    margin: auto;
    height: 5rem;
    width: 5rem;
    background-color: lavender;
    border-radius: 50%;
  }
</style>