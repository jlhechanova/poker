<script lang="ts">
  import { onMount } from 'svelte';
  import CardComponent from './Card.svelte';
  import PlayerComponent from './Player.svelte';
  import type Card from '$lib/consts/card';
  import type Player from '$lib/consts/player';
  import type PokerTable from '$lib/consts/pokertable';
  import currency from 'currency.js';

  import { io } from 'socket.io-client'

  let table: PokerTable;
  let hand: Card[] = [];
  let seat: number;

  const socket = io();
  socket.on('seat', data => seat = data);
  socket.on('table', data => table = data);
  socket.on('hand', data => hand = data);
  
  const handleSubmit = (e: SubmitEvent) => {
    e.preventDefault();
    socket.emit('check');
  }
</script>

<main>
  <div class="tablecontainer">
    <div class="table"></div>
    <div class="board">
      {#if table}
        {#each table.board as card}
        <CardComponent { card } />
        {/each}
      {/if}
    </div>
  </div>
  <PlayerComponent player={table?.players[seat]}>
    {#each hand as card}
    <CardComponent { card } />
    {/each}
  </PlayerComponent>
  <form on:submit={handleSubmit}>
    <button>Fold</button>
    <button>Check</button>
    <button>Raise</button>
  </form>
  <button on:click={() => socket.emit('reset')}>Reset</button>
</main>

<style>
  main {
    position: relative;
  }
  
  .tablecontainer {
    min-width: max-content;
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
    transform: rotate3d(1, 0, 0, 20deg);
    z-index: -100;
  }

  .board {
    position: absolute;
    top: calc(50% - 3rem);
    left: calc(50% - 13rem);
    height: 7rem;
    width: 26rem;
    display: grid;
    grid-template-columns: repeat(5, 5rem);
    justify-content: space-between;
  }
</style>