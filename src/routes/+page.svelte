<script lang="ts">
  import CardComponent from './Card.svelte';
  import PlayerComponent from './Player.svelte';
  import type Card from '$lib/consts/card';
  import type PokerTable from '$lib/consts/pokertable';
  import { io } from 'socket.io-client'

  let table: PokerTable;
  let hands: Card[][] = Array.from({length: 4}).map(_ => Array.from({length: 2}));
  let seat: number = -1;

  $: console.log(table);
  $: players = table ? (seat !== -1 ? 
      table.players.slice(seat).concat(table.players.slice(0, seat))
      : table.players) 
    : [];
  $: pot = table ? table.players.reduce((acc, p) => 
      p ? acc + p.totalBets + p.currBets : acc, 0) : 0
  $: dealt = hands.some(hand => hand.some(card => card));

  const socket = io();
  socket.on('table', data => table = data);
  socket.on('hand', data => {
    hands = hands.map(_ => Array.from({length: 2}));
    if (data.length) hands[seat] = data;
  });

  let timeout: NodeJS.Timer | null;
  let interval: NodeJS.Timer;
  let action = '';
  
  socket.on('action', fn => {
    interval = setInterval(() => {
      if (action && timeout) {
        clearTimeout(timeout);
        clearInterval(interval);
        fn(action);

        timeout = null;
        action = '';
      }
    });

    timeout = setTimeout(() => {
      clearInterval(interval);
      timeout = null;
      action = '';
    }, 5000);
  });

  const handleSubmit = (e: SubmitEvent) => {
    e.preventDefault();
    action = (<HTMLButtonElement> e.submitter).value;    
  }

  const handleJoin = (i: number) => {
    seat = i;
    socket.emit('join', i);
  }

  const handleLeave = () => {
    if (interval) {
      action = 'fold';
    }
    socket.emit('leave', seat);
    seat = -1;
  }
</script>

<main>
  <div class="tablecontainer">
    <div class="table"></div>
    <div class="pot">Pot: { pot }</div>
    <div class="seats">
    {#each players as player, i}
      <div class="seat">
      {#if player}
        <PlayerComponent { player }>
        {#if dealt}
          {#each hands[seat !== -1 ? (i + seat) % players.length : i] as card}
            <CardComponent { card } />
          {/each}
        {/if}
        </PlayerComponent>
      {:else}
        <button class="join" on:click={() => handleJoin(i)}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 5.5v13m6.5-6.5h-13"></path>
          </svg>
        </button>
      {/if}
      </div>
    {/each}
    </div>
    <div class="board">
    {#if table}
      {#each table.board as card}
        <CardComponent { card } />
      {/each}
    {/if}
    </div>
    {#if !action && timeout}
    <form on:submit={handleSubmit} style:margin="auto">
      <button type="submit" value="fold">Fold</button>
      {#if table.players[seat].currBets === table.toMatch}
      <button type="submit" value="check">Check</button>
      {:else}
      <button type="submit" value="call">Call</button>
      {/if}
      <!-- <button type="submit" value="raise">Raise</button> -->
    </form>
    {/if}
  </div>
  {#if seat !== -1}
  <button class="leave" on:click={handleLeave}>Leave</button>
  {/if}
</main>

<style>
  main {
    margin-top: 10rem;
  }
  
  .tablecontainer {
    position: relative;
    margin: 2rem auto;
    width: max-content;
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
    transform: rotate3d(1, 0, 0, 0deg);
    z-index: -100;
  }
  
  .pot {
    position: absolute;
    margin: auto;
    bottom: 256px;
    left: 0;
    right: 0;
    color: white;
    font-weight: 600;
    text-align: center;
  }

  .seats {
    height: 100%;
    width: 100%;
  }

  .seats .seat {
    position: absolute;
  }

  .seats .seat:nth-child(1) {
    bottom: 0;
    left: calc(50% - 2rem);
  }

  .seats .seat:nth-child(2) {
    right: 0;
    top: calc(50% - 2rem);
  }

  .seats .seat:nth-child(3) {
    top: 0;
    left: calc(50% - 2rem);
  }
  
  .seats .seat:nth-child(4) {
    left: 0;
    top: calc(50% - 2rem);
  }

  .join {
    height: 4rem;
    width: 4rem;
    border-radius: 50%;
    cursor: pointer;
  }

  .leave {
    margin: auto;
    display: block;
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