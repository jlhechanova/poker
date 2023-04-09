<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type PokerTable from '$lib/consts/pokertable';
  import type Card from '$lib/consts/card';
  import PlayerComponent from './components/Player.svelte';
  import CardComponent from './components/Card.svelte';
  import Controls from './components/Controls.svelte';
  import { socket, lobby } from '$lib/stores';
  import { goto } from '$app/navigation';

  const coordsSeat = [
    {top: '', left: '50%', bottom: '-6rem', right: '', transform: 'translateX(-50%)'},
    {top: '50%', left: '', bottom: '', right: '-5rem', transform: 'translateY(-50%)'},
    {top: '-6rem', left: '50%', bottom: '', right: '', transform: 'translateX(-50%)'},
    {top: '50%', left: '-5rem', bottom: '', right: '', transform: 'translateY(-50%)'},
  ]

  const coordsBets = [
    {top: '', left: '50%', bottom: '9.5rem', right: '', transform: 'translateX(-50%)'},
    {top: '50%', left: '', bottom: '', right: '9.5rem', transform: 'translateY(-50%)'},
    {top: '9.5rem', left: '50%', bottom: '', right: '', transform: 'translateX(-50%)'},
    {top: '50%', left: '9.5rem', bottom: '', right: '', transform: 'translateY(-50%)'},
  ]

  let isHost = false;
  let table: PokerTable;
  let hands: Card[][] = [];
  let seat = 0;
  let isinSeat = false;
  
  $: console.log(table);
  $: player = isinSeat ? table.players[seat] : undefined;

  onMount(async () => {
    const room = await $socket.emitWithAck('getRoom', $lobby);
    if (room) {
      table = room.table;
      if (room.host.sid === $socket.id) isHost = true;
    }
  })

  $socket.on('table', tableInfo => table = tableInfo);
  $socket.on('host', () => isHost = true);
  $socket.on('hand', hand => {
    if (hand) {
      hands = Array.from({length: table.players.length}, () => Array.from({length: 2}));
      hands[seat] = hand;
    } else {
      hands = [];
    }
  });

  let action = '';
  let interval: NodeJS.Timeout;
  let timeout: NodeJS.Timeout | null = null;
  $socket.on('action', fn => {
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
    }, 15000);
  })

  const handleSubmit = (e: SubmitEvent) => {
    action = (<HTMLFormElement> e.submitter).value;
  }

  const handleJoinTable = async (i: number) => {
    const res = await $socket.emitWithAck('joinTable', i);
    if (res) {
      seat = i;
      isinSeat = true;
      $socket.on('out', () => isinSeat = false);
    }
  }

  const handleLeaveTable = () => {
    if (timeout) action = 'fold';

    isinSeat = false;
    $socket.emit('leaveTable', seat);
    $socket.off('out');
  }

  const handleLeaveRoom = () => {
    $socket.emit('leaveRoom');
    goto('/');
  }

  onDestroy(() => {
    $socket.emit('leaveRoom');
    $socket.offAny();
    $lobby = '';
  })
</script>

<div class="container">
  {#if table}
    {@const numPlayers = table.players.length}
    <div class="table">
      <div class="board">
        <div class="pot">
          {#if table.currPot}<span>{ table.currPot }</span>{/if}
          Pot: { table.pot }
        </div>
        {#each table.board as card}
          <CardComponent { card } />
        {/each}
      </div>
      <div class="seats">
        {#each Array(numPlayers) as _, i (i)}
          {@const idx = (i + seat) % numPlayers}
          {@const player = table.players[idx]}
          {@const {top, right, bottom, left, transform} = coordsSeat[i]}
          <div class="seat" style:top style:right style:bottom style:left style:transform>
            {#if player}
              <PlayerComponent { player }>
                {#if player.isinHand && hands.length}
                  {@const hand = hands[idx]}
                  <CardComponent card={hand ? hand[0] : null} />
                  <CardComponent card={hand ? hand[1] : null} />
                {/if}
              </PlayerComponent>
              {#if player.isinHand && player.curBets}
                {@const {top, right, bottom, left, transform} = coordsBets[i]}
                <span style:top style:right style:bottom style:left style:transform>
                  {player.curBets}
                </span>
              {/if}
            {:else}
              <button class="join" on:click={() => handleJoinTable(idx)}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 5.5v13m6.5-6.5h-13"></path>
                </svg>
              </button>
            {/if}
          </div>
        {/each}
      </div>
      {#if isinSeat}
        <button class='leave' style:right='-4rem' on:click={handleLeaveTable}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 8.25H5.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h13a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15m0-3l-3-3m0 0l-3 3m3-3V15" />
          </svg>          
        </button>
      {:else}
        <button class='leave' style:right='-4rem' on:click={handleLeaveRoom}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
          </svg>
        </button>
      {/if}
      {#if table && table.curPlayers >= 2 && isHost}
        {#if table.isOngoing}
          <button class='leave' style:left='-4rem' on:click={() => $socket.emit('pause')}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
            </svg>                   
          </button>
        {:else}
          <button class='leave' style:left='-4rem' on:click={() => $socket.emit('start')}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
            </svg>          
          </button>
        {/if}
      {/if}
    </div>
  {/if}
</div>
<div class='hud'>
  <div></div>
  {#if player && timeout}
    <Controls
      bet={player.curBets} 
      stack={player.stack} 
      toMatch={table.toMatch}
      minRaise={table.minRaise}
      toAct={player.toAct}
      { handleSubmit }
    />
  {/if}
</div>

<style>
  .container {
    position: relative;
    margin: auto;
    padding: 8rem 1.5rem;
    max-width: 48rem;
    width: 100%;
  }

  .table {
    position: relative;
    height: 25rem;
    max-width: 48rem;
    width: 100%;
    border-radius: 25rem;
    background-image: radial-gradient(#14532d, #15803d);
    border: 2rem solid #16a34a;
    outline: 1.5rem solid #111827;
    box-sizing: border-box;
    box-shadow: inset 0 2px 4px 0 rgb(0 0 0 / 0.4), 0 4px 1.5rem 1.5rem rgb(255 255 255 / 0.4);
    /* transform: rotate3d(1, 0, 0, 30deg); */
  }

  .seats .seat {
    position: absolute;
  }

  .seat span {
    position: absolute;
    color: white;
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

  .pot span {
    display: inline-block;
    padding: 0 0.5rem;
    height: 1.5rem;
    background-color: #111827;
    border-radius: 0.5rem;
  }

  .board {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -3rem);
    height: 7rem;
    width: 100%;
    max-width: 26rem;
    display: grid;
    grid-template-columns: repeat(5, 5rem);
    justify-content: space-between;
  }

  .hud {
    margin: auto;
    max-width: 48rem;
    position: relative;
    display: flex;
    justify-content: space-between;
    align-items: end;
    z-index: 10;
  }

  .leave {
    position: absolute;
    top: -7rem;
    appearance: none;
    height: 3.5rem;
    width: 3.5rem;
    border-radius: 0.5rem;
    border: 0;
  }
</style>