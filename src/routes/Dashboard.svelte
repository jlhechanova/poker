<script lang='ts'>
  import type PokerTable from '$lib/consts/pokertable';
  import { createEventDispatcher } from 'svelte';
  import { fly } from 'svelte/transition';
  import currency from 'currency.js';
  export let timeout: NodeJS.Timeout | null = null;
  export let table: PokerTable;
  export let seat = -1;

  const sizes = [[3,'3x'], [2,'2x'], [1,'POT'], [0.75,'¾'], [0.5,'½'], [1 / 3,'⅓'], [0.25,'¼']] as const;

  let value = 0;
  
  let raise = false;

  $: player = table && seat >= 0 ? table.players[seat] : undefined;

  $: min = player ? table.toMatch + table.minRaise - player.bets : 1;
  $: max = player ? player.stack : 100;
  $: if (!raise) value = min;

  const handleSize = (e: MouseEvent) => {
    value = table.pot.multiply(e.target.value).value;
  }

  const dispatch = createEventDispatcher();

  const handleSubmit = (e: SubmitEvent) => {
    let action = (<HTMLInputElement> e.submitter).value
    
    if (action === 'raise') {
      if (!raise) {
        raise = true;
        return;
      }
      else {
        action = value.toString();
      }
    }
    dispatch('submit', {
      action: action
    });
  }
</script>

<svelte:window on:mouseup={e => {
  if (!e.target.closest('.actions')) raise = false }} />

<form class='dashboard' on:submit|preventDefault={handleSubmit} novalidate>
  <div class='chat'>
    {#if seat !== -1}
    <button type='button' class='leave' on:click={() => dispatch('leave')}>Leave</button>
    {/if}
  </div>

  {#if timeout}
  <div class='actions'>
    <button value='fold'>Fold</button>
    {#if player.bets === table.toMatch}
    <button type='submit' value='check'>Check</button>
    {:else}
    <button value='call'>Call</button>
    {/if}
    {#if player.stack > table.toMatch - player.bets}
    <button
      style:border-top-left-radius={raise ? '0' : '1rem'}
      style:border-top-right-radius={raise ? '0' : '1rem'}
      style:background-color={raise ? '#f8fafc' : 'revert'}
      value='raise'
    >Raise</button>
    {/if}
    {#if raise}
    <div class='raise' in:fly={{y: 16}} out:fly={{y: 24, duration: 200}}>
      <div class='slider'>
        <ul>
          {#each sizes as [mult, size]}
          <li>
            <button type='button' value={mult} on:click={handleSize}>{size}</button>
          </li>
          {/each}
        </ul>
        <div>
          <button type='button'>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m6-6H6" />
            </svg>                      
          </button>
          <button type='button'>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M18 12H6" />
            </svg>            
          </button>
        </div>
        <input
          style:background-size={`${value * 100 / max}% 100%`}
          type='range' min={min} max={max} step='0.5' bind:value>
      </div>
      <input type='number' bind:value>
    </div>
    {/if}
  </div>
  {/if}
</form>

<style>
  .dashboard {
    margin: auto;
    max-width: 80rem;
    position: relative;
    display: flex;
    justify-content: space-between;
    align-items: end;
    z-index: 10;
  }

  .chat {
    padding-left: 10rem;
  }

  .actions {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    justify-content: space-between;
  }

  .actions > button, .leave {
    height: 4rem;
    width: 10rem;
    border-radius: 1rem;
    border: 0;
    font-size: 2rem;
    font-weight: 800;
    font-family: inherit;
    transition: 0.5s;
  }

  .raise {
    position: absolute;
    right: 0;
    bottom: 4rem;
    width: 10rem;
    padding: 1rem 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    border-top-left-radius: 1rem;
    border-top-right-radius: 1rem;
    background-color: #f8fafc;
  }

  .slider {
    position: relative;
    display: grid;
    grid-template-columns: 1.25fr 1fr;
    height: 22rem;
    gap: 0.5rem;
  }

  .raise ul {
    height: 100%;
    display: grid;
    grid-template-rows: 2.25rem 1fr repeat(5, 2.25rem);
    justify-items: center;
    align-items: center;
    gap: 0.25rem;
  }

  .slider button {
    appearance: none;
    height: 2.25rem;
    width: 3.5rem;
    display: flex;
    justify-content: center;
    align-items: center;
    font-family: inherit;
    font-size: 1.125rem;
    border-radius: 0.625rem;
    border: none;
    color: white;
    background-color: #334155;
    transition: filter 0.5s;
  }

  .slider button:hover {
    filter: brightness(150%);
  }

  .slider div {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: end;
  }

  .slider div button {
    appearance: none;
    height: 1.75rem;
    width: 1.75rem;
    border: none;
  }

  input[type='range'] {
    -webkit-appearance: none;
    position: absolute;
    right: -8.125rem;
    width: 18rem;
    height: 1rem;
    transform: rotate(-90deg) translateX(-58.5%);
    background: #e2e8f0;
    border-radius: 1rem;
    background-image: linear-gradient(#334155, #334155);
    background-repeat: no-repeat;
    box-shadow: inset 0 0 4px #00000026;
  }

  /* Input Thumb */
  input[type='range']::-webkit-slider-thumb {
    -webkit-appearance: none;
    height: 2rem;
    width: 2rem;
    border-radius: 50%;
    background: #334155;
    cursor: pointer;
    box-shadow: 0 0 2px 0 #555;
    transition: filter 0.5s;
  }

  input[type='range']::-moz-range-thumb {
    -webkit-appearance: none;
    height: 2rem;
    width: 2rem;
    border-radius: 50%;
    background: #334155;
    cursor: pointer;
    box-shadow: 0 0 2px 0 #555;
    transition: filter 0.5s;
  }

  input[type='range']::-ms-thumb {
    -webkit-appearance: none;
    height: 2rem;
    width: 2rem;
    border-radius: 50%;
    background: #334155;
    cursor: pointer;
    box-shadow: 0 0 2px 0 #555;
    transition: filter 0.5s;
  }

  input[type='range']::-webkit-slider-thumb:hover {
    filter: brightness(120%);
  }

  input[type='range']::-moz-range-thumb:hover {
    filter: brightness(120%);
  }

  input[type='range']::-ms-thumb:hover {
    filter: brightness(120%);
  }

  /* Input Track */
  input[type=range]::-webkit-slider-runnable-track  {
    -webkit-appearance: none;
    box-shadow: none;
    border: none;
    background: transparent;
  }

  input[type=range]::-moz-range-track {
    -webkit-appearance: none;
    box-shadow: none;
    border: none;
    background: transparent;
  }

  input[type='range']::-ms-track {
    -webkit-appearance: none;
    box-shadow: none;
    border: none;
    background: transparent;
  }
  
  .raise input[type='number'] {
    -moz-appearance: textfield; /* Firefox */
    appearance: none;
    height: 2rem;
    width: 80%;
    border-radius: 2rem;
    font-family: inherit;
    font-size: 1.125rem;
    text-align: center;
  }

  .raise input::-webkit-outer-spin-button,
  .raise input::-webkit-inner-spin-button {
    /* display: none; <- Crashes Chrome on hover */
    -webkit-appearance: none;
    margin: 0; /* <-- Apparently some margin are still there even though it's hidden */
  }
</style>