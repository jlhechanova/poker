<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Player from '$lib/components/Player.svelte';
  import Card from '$lib/components/Card.svelte';
  import Actions from '$lib/components/Actions.svelte';
  import { coordsSeat, coordsBet } from '$lib/consts';
  import { socket, lobby } from '$lib/stores';
  import { goto } from '$app/navigation';

  import type PokerTable from '@backend/classes/pokertable';
  type ICard = string;

  let table: PokerTable,
      seat = 0,
      isHost = false,
      isinSeat = false,
      hands: ICard[] = [];

  $: console.log(table);
  $: ({players, blinds, turn, button, phaseid, isPaused,
      board, pot, curPot, toMatch, minRaise} = table ?? {});

  onMount(async () => {
    const tableState = await $socket.emitWithAck('getTable', $lobby);

    if (tableState) table = tableState;
    else goto('/');
  })

  $socket.on('host', () => isHost = true);
  $socket.on('tableState', state => table = {...table, ...state});
  $socket.on('hand', hand => {
    hands = Array.from({length: players.length});
    if (hand) hands[seat] = hand;
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

  const handleAction = (e: SubmitEvent) => {
    action = (<HTMLFormElement> e.submitter).value;
  }

  const handleJoinTable = async (i: number) => {
    if (isinSeat && players[seat].isinHand) return;

    const res = await $socket.emitWithAck('joinTable', i);
    if (res) {
      if (!isinSeat) isinSeat = true;
      seat = i;
    }
  }

  const handleLeaveTable = () => {
    if (timeout) action = 'fold';

    isinSeat = false;
    $socket.emit('leaveTable', seat);
  }

  onDestroy(() => {
    $socket.emit('leaveRoom');
    $socket.offAny();
    $lobby = '';
  })
</script>

<div class="container">
  {#if table}
    {@const numPlayers = players.length}
    <div class="table">
      <div class="board">
        {#if pot}
          <div class="pot">
            {#if curPot}<span>{ curPot }</span>{/if}
            Pot: { pot }
          </div>
        {/if}
        {#each board as card}
          <Card { card } />
        {/each}
      </div>
      <div class="seats">
        {#each Array(numPlayers) as _, i (i)}
          {@const idx = (i + seat) % numPlayers}
          {@const player = players[idx]}
          {@const {top, right, bottom, left, transform} = coordsSeat[i]}
          <div class="seat" style:top style:right style:bottom style:left style:transform>
            {#if player}
              <Player { player }>
                {#if player.isinHand}
                  {@const hand = hands[idx]}
                  <Card card={hand ? hand[0] : ''} />
                  <Card card={hand ? hand[1] : ''} />
                {/if}
              </Player>
              {#if player.isinHand && player.curBets}
                {@const {top, right, bottom, left, transform} = coordsBet[i]}
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
        <button class='control' style:right='-4rem' on:click={handleLeaveTable}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 8.25H5.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h13a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15m0-3l-3-3m0 0l-3 3m3-3V15" />
          </svg>          
        </button>
      {:else}
        <button class='control' style:right='-4rem' on:click={() => goto('/')}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
          </svg>
        </button>
      {/if}
      {#if isHost && table.curPlayers > 1}
        {#if table.isPaused}
          <button class='control' style:left='-4rem' on:click={() => $socket.emit('start')}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
            </svg>          
          </button>
        {:else}
          <button class='control' style:left='-4rem' on:click={() => $socket.emit('pause')}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
            </svg>                   
          </button>
        {/if}
      {/if}
    </div>
  {/if}
</div>
<div class='hud'>
  <div></div>
  {#if isinSeat}
    {@const player = table.players[seat]}
    <Actions
      bet={player.curBets} 
      stack={player.stack} 
      toMatch={toMatch}
      minRaise={minRaise}
      pot={pot + curPot}
      toAct={player.toAct}
      {handleAction}
    />
  {/if}
</div>

<style>
  .container {
    position: relative;
    margin: auto;
    padding: 8rem 4rem;
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

  .control {
    position: absolute;
    top: -7rem;
    appearance: none;
    height: 3.5rem;
    width: 3.5rem;
    border-radius: 0.5rem;
    border: 0;
  }
</style>