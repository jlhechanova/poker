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

  $socket.on('host', () => isHost = true);
  $socket.on('tableState', state => {
    table = {...table, ...state}
  });

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
    turn = null;
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
      if (!isinSeat) {
        isinSeat = true;
        $socket.on('out', () => handleLeaveTable());
        $socket.on('hand', hand => hands[seat] = hand);
        $socket.on('action', handleAction);
      }
      hands[seat] = undefined;
      seat = i;
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
  <div class='canvas'>
    <div class="table">
      <div class="board">
        <div class="pot">
          {#if curPot}
            <span class='curr'>{curPot}</span>
          {/if}
          {#if best}
            <span class='curr' style:font-size='1.25rem'>{best[0]}</span>
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
            <div class={`seat seat-${i}`}>
              {#if player}
                {@const {isinHand, curBet} = player}
                {@const hand = hands[idx]}
                {@const isUser = isinSeat && i === 0}
                <Player {player} {button} {turn} {isUser}>
                  <svelte:fragment slot='cards'>
                    {#if isinHand || isUser && hand} <!-- always show user hand  -->
                      {@const [one, two] = hand ?? ''}
                      <Card card={one} best={best?.[1].includes(one)} {isinHand} />
                      <Card card={two} best={best?.[1].includes(two)} {isinHand} />
                    {/if}
                  </svelte:fragment>
                  {#if isinHand && curBet}
                    <span class={`curr bet-${i}`}>
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
    </div>
    {#if isinSeat}
      <button class='control room' on:click={handleLeaveTable}>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 8.25H5.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h13a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15m0-3l-3-3m0 0l-3 3m3-3V15" />
        </svg>
      </button>
    {:else}
      <button class='control room' on:click={() => goto('/')}>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
        </svg>
      </button>
    {/if}
    {#if !isPaused}
      {#if isHost}
        <button class='control play' on:click={() => $socket.emit('pause')}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
          </svg>
        </button>
      {:else}
        <button class='control play' disabled>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
          </svg>
        </button>
      {/if}
    {:else if !isHost || curPlayers < 2 || !phase && board.length}
      <button class='control play' disabled>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
        </svg>
      </button>
    {:else}
      <button class='control play' on:click={() => $socket.emit('start')}>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
        </svg>
      </button>
    {/if}
  </div>
  <div class='hud'>
    {#if isinSeat && players[seat]}
      {@const {stack, curBet, toAct} = players[seat]}
      <Actions
        {blinds}
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
</div>

<style>
  .container {
    margin: auto;
    height: 100%;
    width: 100%;
    max-width: 50rem;
    display: flex;
    flex-direction: column;
  }

  .canvas {
    position: relative;
    padding: 2rem 1.5rem 0;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-grow: 1;
  }

  .table {
    position: relative;
    height: 70vmax;
    width: 100%;
    max-width: 25rem;
    border-radius: 25rem;
    background-image: radial-gradient(#14532d, #15803d);
    border: 1rem solid #16a34a;
    outline: 1rem solid #111827;
    box-sizing: border-box;
    box-shadow: inset 0 2px 4px 0 rgb(0 0 0 / 0.4), 0 4px 1.5rem 1.5rem rgb(255 255 255 / 0.4);
    /* transform: rotate3d(1, 0, 0, 30deg); */
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
    top: -2.625rem;
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
    background-color: #111827;
    color: white;
    font-size: 0.825rem;
    font-weight: 600;
    border-radius: 1rem;
  }

  .board {
    position: absolute;
    top: 53%;
    right: 50%;
    transform: translate(50%, -100%);
    display: grid;
    grid-template-columns: repeat(5, 2.75rem);
    gap: 0.25rem;
  }

  .control {
    position: absolute;
    top: 0;
    appearance: none;
    height: 3rem;
    width: 3rem;
    border-radius: 0.5rem;
    border: 0;
    cursor: pointer;
  }

  .control.room {
    right: 0;
  }

  .control.play {
    left: 0;
  }

  .hud {
    height: 3rem;
    width: 100%;
  }

  .seats .seat {
    position: absolute;
  }

  .seat span {
    position: absolute;
    color: white;
  }

  :is(.seat-0) {
    right: 50%;
    bottom: -1rem;
    transform: translate(50%, 50%);
  }

  :is(.seat-1) {
    top: 90%;
    right: -2rem;
    transform: translateY(-50%);
  }

  :is(.seat-2) {
    top: 53%;
    right: -2rem;
  }

  :is(.seat-3) {
    right: -2rem;
    bottom: 69%;
  }

  :is(.seat-4) {
    top: -2rem;
    right: 25%;
    transform: translate(50%, -50%);
  }

  :is(.seat-5) {
    top: -2rem;
    left: 25%;
    transform: translate(-50%, -50%);
  }

  :is(.seat-6) {
    bottom: 69%;
    left: -2rem;
  }

  :is(.seat-7) {
    top: 53%;
    left: -2rem;
  }

  :is(.seat-8) {
    top: 90%;
    left: -2rem;
    transform: translateY(-50%);
  }

  :is(.bet-0) {
    right: 50%;
    bottom: 100%;
    transform: translate(50%, -1rem);
  }

  :is(.bet-1) {
    right: 115%;
    bottom: 100%;
  }

  :is(.bet-2) {
    right: 115%;
    top: 0.5rem;
  }

  :is(.bet-3) {
    right: 115%;
    bottom: 0;
  }

  :is(.bet-4) {
    bottom: -3rem;
    right: 50%;
    transform: translateX(50%);
  }

  :is(.bet-5) {
    bottom: -3rem;
    right: 50%;
    transform: translateX(50%);
  }

  :is(.bet-6) {
    left: 115%;
    bottom: 0;
  }

  :is(.bet-7) {
    top: 0.5rem;
    left: 115%;
  }

  :is(.bet-8) {
    bottom: 100%;
    left: 115%;
  }

  @media (min-width: 641px) {
    .table {
      height: 25rem;
      max-width: 44rem;
      border-width: 1.5rem;
      outline-width: 1.5rem;
    }

    .board {
      grid-template-columns: repeat(5, 4rem);
      transform: translate(50%, -50%);
    }

    .hud {
      height: 4rem;
    }

    .control.room {
      top: 4rem;
    }

    .control.play {
      top: 7.5rem;
      right: 0;
      left: auto;
    }

    .curr {
      font-size: 1rem;
    }

    .seat-0 {
      right: 50%;
      bottom: -2rem;
      transform: translate(50%, 50%);
    }

    .seat-1 {
      top: auto;
      right: 3rem;
      bottom: -0.5rem;
      transform: translate(50%, 50%);
    }

    .seat-2 {
      top: 50%;
      right: -2rem;
      transform: translate(50%, -50%);
    }

    .seat-3 {
      top: 0;
      right: 2rem;
      bottom: auto;
      transform: translate(50%, -50%);
    }

    .seat-4 {
      top: -6rem;
      right: 34%;
      transform: translateX(50%);
    }

    .seat-5 {
      top: -6rem;
      left: 34%;
      transform: translateX(-50%);
    }

    .seat-6 {
      top: 0;
      bottom: auto;
      left: 2rem;
      transform: translate(-50%, -50%);
    }

    .seat-7 {
      top: 50%;
      bottom: auto;
      left: -2rem;
      transform: translate(-50%, -50%);
    }

    .seat-8 {
      top: auto;
      bottom: -0.5rem;
      left: 3rem;
      transform: translate(-50%, 50%);
    }

    .bet-1 {
      top: -2rem;
      bottom: auto;
    }

    .bet-2 {
      top: 50%;
      right: 110%;
    }

    .bet-3 {
      bottom: -4rem;
    }

    .bet-4 {
      bottom: -4rem;
    }

    .bet-5 {
      bottom: -4rem;
    }

    .bet-6 {
      bottom: -4rem;
    }

    .bet-7 {
      top: 50%;
      left: 110%;
    }

    .bet-8 {
      top: -2rem;
      bottom: auto;
    }
  }
</style>