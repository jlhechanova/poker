<script lang="ts">
  import CardComponent from './Card.svelte';
  import PlayerComponent from './Player.svelte';
  import DashboardComponent from './Dashboard.svelte';
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
    }, 10000);
  });

  const handleSubmit = (e: CustomEvent<{action: string}>) => {
    action = e.detail.action; 
  }

  const handleJoin = (i: number) => {
    seat = i;
    action = '';
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
  <div class="container">
    <div class="tablecontainer">
      <div class="table"></div>
      <div class="seats">
        {#each players as player, i}
          <div class="seat">
            {#if player}
              <PlayerComponent { player }>
              {#if dealt && player.isinHand}
                {#each hands[seat !== -1 ? (i + seat) % players.length : i] as card}
                  <CardComponent { card } />
                {/each}
              {/if}
                <!-- <CardComponent card={{rank: 'A', suit: 'C'}} />
                <CardComponent card={{rank: 'A', suit: 'S'}} />   -->
              </PlayerComponent>
            {:else}
              <button class="join" on:click={() => handleJoin(seat !== -1 ? (i + seat) % players.length : i)}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 5.5v13m6.5-6.5h-13"></path>
                </svg>
              </button>
            {/if}
          </div>
        {/each}
      </div>
      <div class="board">
        <div class="pot">Pot: { table ? table.pot : 0 }</div>
        {#if table}
          {#each table.board as card}
            <CardComponent { card } />
          {/each}
        {/if}
      </div>
    </div>
  </div>
  <DashboardComponent { timeout } { table } { seat } on:leave={handleLeave} on:submit={handleSubmit} />
</main>

<style>
  main {
    flex-grow: 1;
    background-image: radial-gradient(#cbd5e1, #0f172a);
  }
  .container {
    margin: auto;
    padding: 8rem 0;
    width: max-content;
  }
  
  .tablecontainer {
    position: relative;
    margin: auto;
    padding: 1.5rem;
    width: max-content;
    z-index: 10;
    perspective: 50rem;
  }

  .table {
    position: relative;
    height: 25rem;
    width: 50rem;
    border-radius: 25rem;
    background-color: #166534;
    border: 2rem solid #16a34a;
    outline: 1.5rem solid #111827;
    box-sizing: border-box;
    box-shadow: inset 0 2px 4px 0 rgb(0 0 0 / 0.4), 0 4px 1.5rem 1.5rem rgb(255 255 255 / 0.4);
    transform: rotate3d(1, 0, 0, 15deg);
    z-index: -100;
  }

  .seats .seat {
    position: absolute;
  }

  .seats .seat:nth-child(1) {
    bottom: -4rem;
    left: 50%;
    transform: translateX(-50%);
  }

  .seats .seat:nth-child(2) {
    right: -1rem;
    top: 50%;
    transform: translateY(-50%);
  }

  .seats .seat:nth-child(3) {
    top: -3.5rem;
    left: 50%;
    transform: translateX(-50%);
  }
  
  .seats .seat:nth-child(4) {
    left: -1rem;
    top: 50%;
    transform: translateY(-50%);
  }

  .join {
    height: 4rem;
    width: 4rem;
    border-radius: 50%;
    cursor: pointer;
  }
  
  .pot {
    position: absolute;
    top: -1.5rem;
    left: 50%;
    transform: translateX(-50%);
    color: white;
    font-weight: 600;
    text-align: center;
  }

  .board {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -3rem);
    height: 7rem;
    width: 26rem;
    display: grid;
    grid-template-columns: repeat(5, 5rem);
    justify-content: space-between;
  }
</style>