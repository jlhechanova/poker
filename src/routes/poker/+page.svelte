<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Card from '$lib/components/Card.svelte';
  import Timer from '$lib/components/Timer.svelte';
  import Player from '$lib/components/Player.svelte';
  import Actions from '$lib/components/Actions.svelte';
  import { coordsSeat, coordsBet } from '$lib/consts';
  import { socket, lobby } from '$lib/stores';
  import { goto } from '$app/navigation';

  import type PokerTable from '@backend/classes/pokertable';
  type ICard = string;

  let table: PokerTable,
      seat = 0,
      hand: ICard[] | undefined,
      isHost = false,
      isTurn = false,
      isinSeat = false;

  onMount(async () => {
    const tableState = await $socket.emitWithAck('getTable', $lobby);
    if (tableState) table = tableState;
    else goto('/');
  })

  $: ({players, blinds, curPlayers, maxPlayers, turn,
    button, phase, isPaused, best, hands, board, pot,
    curPot, toMatch, minRaise} = table ?? {});

  $: if (hands) hands[seat] = hand;

  $socket.on('host', () => isHost = true);
  $socket.on('tableState', state => table = {...table, ...state});

  /* action */
  let action = '';
  let callback: (arg?: any) => void;
  $: if (isTurn && isPaused) callback('pause');
  const handleAction = (fn: (arg?: any) => void) => {
    callback = fn;

    if (action === 'fold' || action === 'check' && players[seat].curBet === toMatch) {
      callback(action);
    } else {
      isTurn = true;
    }
    action = '';
  }

  const handleSubmit = (e: CustomEvent<{action: string}>) => {
    callback(e.detail.action);
    isTurn = false;
    action = '';
  }
  /* action */

  /* leave/join */
  const handleLeaveTable = () => {
    if (isTurn) callback('fold');

    isinSeat = false;
    $socket.off('out');
    $socket.off('hand');
    $socket.off('action');
    $socket.emit('leaveTable', seat);
  }

  const handleJoinTable = async (i: number) => {
    if (isinSeat && players[seat].isinHand) return;

    const res = await $socket.emitWithAck('joinTable', i);
    if (res) {
      seat = i;
      if (!isinSeat) {
        isinSeat = true;
        $socket.on('out', () => handleLeaveTable());
        $socket.on('hand', h => hand = h);
        $socket.on('action', handleAction);
      }
    }
  }
  /* leave/join */

  onDestroy(() => {
    $socket.emit('leaveRoom');
    $socket.offAny();
    lobby.set('');
  })
</script>

<div class="container">
  <div class="table">
    <div class="board">
      <div class="pot">
        {#if curPot}
          <span class='curr'>{curPot}</span>
        {/if}
        {#if best}
          <span class='curr'>{best[0]}</span>
        {:else if pot}
          <span>Pot: {pot}</span>
        {/if}
      </div>
      {#if board}
        {#each board as card}
          <Card {card} best={best?.[1].includes(card)}/>
        {/each}
      {/if}
    </div>
    <div class="seats">
      {#if players}
        {#each Array(maxPlayers) as _, i (i)}
          {@const idx = (i + seat) % maxPlayers}
          {@const player = players[idx]}
          {@const {top, right, bottom, left, transform} = coordsSeat[i]}
          <div class="seat" style:top style:right style:bottom style:left style:transform>
            {#if player}
              {@const {isinHand, curBet} = player}
              <Player {player} {button}>
                <svelte:fragment slot='cards'>
                  {#if isinHand || !i && hand} <!-- always show user hand  -->
                    {@const [one, two] = hands[idx] ?? ''}
                    <Card card={one} best={best?.[1].includes(one)} {isinHand} />
                    <Card card={two} best={best?.[1].includes(two)} {isinHand} />
                  {/if}
                </svelte:fragment>
                {#if isinHand && curBet}
                  {@const {top, right, bottom, left, transform} = coordsBet[i]}
                  <span class='curr' style:top style:right style:bottom style:left style:transform>
                    {#if phase === 0 && !curPot}+{/if}{curBet}
                  </span>
                {/if}
                {#if !isPaused && turn === idx}
                  <Timer />
                {/if}
              </Player>
            {:else}
              <button class="join" on:click={() => handleJoinTable(idx)}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 5.5v13m6.5-6.5h-13"></path>
                </svg>
              </button>
            {/if}
          </div>
        {/each}
      {/if}
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
    {#if !isPaused}
      {#if isHost}
        <button class='control' style:left='-4rem' on:click={() => $socket.emit('pause')}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
          </svg>
        </button>
      {:else}
        <button class='control' style:left='-4rem' disabled>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
          </svg>
        </button>
      {/if}
    {:else if !isHost || curPlayers < 2 || !phase && board.length}
      <button class='control' style:left='-4rem' disabled>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
        </svg>
      </button>
    {:else}
      <button class='control' style:left='-4rem' on:click={() => $socket.emit('start')}>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
        </svg>
      </button>
    {/if}
  </div>
</div>
<div class='hud'>
  <div></div>
  {#if isinSeat && players[seat]}
    {@const {stack, curBet, toAct} = players[seat]}
    <Actions
      {curBet} 
      {stack} 
      {toMatch}
      {minRaise}
      {pot}
      {curPot}
      {toAct}
      {isTurn}
      {isPaused}
      on:action={handleSubmit}
    />
  {/if}
</div>

<style>
  .container {
    position: relative;
    margin: auto;
    padding: 12rem 4rem;
    max-width: 50rem;
    width: 100%;
  }

  .table {
    position: relative;
    height: 25rem;
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
    height: 3.5rem;
    width: 3.5rem;
    border-radius: 50%;
    cursor: pointer;
    color: #64748b;
    border: 1px solid #1e293b;
    background: linear-gradient(30deg, #082f49, transparent) rgb(0 0 0 / 0.1);
    transition: all 400ms;
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  }

  .join:hover {
    color: #082f49;
    background-color: #94a3b8;
  }
  
  .pot {
    position: absolute;
    top: -2.5rem;
    left: 50%;
    width: max-content;
    transform: translateX(-50%);
    color: white;
    font-size: 1.125rem;
    font-weight: 600;
    text-align: center;
  }

  .curr {
    display: inline-block;
    padding: 0 0.5rem;
    height: 1.5rem;
    background-color: #111827;
    color: white;
    font-size: 1.125rem;
    font-weight: 600;
    border-radius: 1rem;
  }

  .board {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -2.5rem);
    display: grid;
    grid-template-columns: repeat(5, 4rem);
    gap: 0.25rem;
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