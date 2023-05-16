<script lang='ts'>
  import { createEventDispatcher } from "svelte";
  import { fly } from "svelte/transition";
  import { sizes } from "$lib/consts";
  export let blinds: number;
  export let curBet: number;
  export let stack: number;
  export let toMatch: number;
  export let minRaise: number;
  export let pot: number;
  export let curPot: number;
  export let toAct: boolean;
  export let isTurn: boolean;
  export let isPaused: boolean;

  const log = (arg: number, base: number) => Math.log(arg) / Math.log(base);

  let betSlider = 0;
  let isOpenSlider = false;
  $: if (isPaused) isOpenSlider = false;
  $: if (!isOpenSlider) betSlider = 0;

  $: callAmt = toMatch - curBet;
  $: minBet = callAmt + minRaise;
  $: raiseAmt = minBet + Math.round((stack - minBet + 1) ** (betSlider / 100) - 1);
  $: raiseTo = curBet + raiseAmt;

  const handleSliderClose = (e: MouseEvent) => {
    if (!(<HTMLElement> e.target).closest('.actions')) {
      isOpenSlider = false;
    }
  }

  const handleRaiseAmt = (amt: number) => {
    amt = Math.min(Math.max(amt, minBet), stack);
    betSlider = 100 * log(amt - minBet + 1, stack - minBet + 1);
  }

  const dispatch = createEventDispatcher();

  const handleSubmit = (e: SubmitEvent) => {
    const action = (<HTMLFormElement> e.submitter).value;
    dispatch('action', {action: action});
    isOpenSlider = false;
  }
</script>

<svelte:window on:mousedown={handleSliderClose}/>

<form class="actions" on:submit|preventDefault={handleSubmit}>
  <!-- buttons are placed in reverse so pressing Enter 
  on the raise menu will submit with raise instead of fold -->
  {#if !isPaused && isTurn && curBet + stack > toMatch && (toAct || callAmt >= minRaise)} <!-- bet round still open? -->
    {#if isOpenSlider || raiseAmt >= stack}
      <button value={raiseAmt} class='raise'>
        {toMatch ? 'Raise To' : 'Bet'}
        <br>
        {Math.min(raiseTo, curBet + stack)}
      </button>
    {:else}
      <button type='button' class='raise' on:click={() => isOpenSlider = true}>
        {toMatch ? 'Raise' : 'Bet'}
      </button>
    {/if}
  {:else}
    <button class='raise' disabled>Raise</button>
  {/if}

  {#if !isPaused && isTurn}
    {#if curBet === toMatch}
      <button value='check' class='check'>Check</button>
    {:else}
      <button value='call' class='call'>
        Call
        <br>
        {Math.min(callAmt, stack)}
      </button>
    {/if}
  {:else}
    <button class='check' disabled>Check</button>
  {/if}

  {#if !isPaused && isTurn}
    <button value='fold' class='fold'>Fold</button>
  {:else}
    <button class='fold' disabled>Fold</button>
  {/if}

  {#if isOpenSlider}
    <div class='slider' transition:fly={{y: 16}}>
      <div class="range">
        <ul>
          {#each sizes as [mult, size]}
            <li>
              <button type='button' on:click={() => handleRaiseAmt(minBet + (pot + curPot) * mult)}>
                {size}
              </button>
            </li>
          {/each}
        </ul>
        <div>
          <button type='button' on:click={() => handleRaiseAmt(raiseAmt + blinds)}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 5.5v13m6.5-6.5h-13"></path>
            </svg>
          </button>
          <button type='button' on:click={() => handleRaiseAmt(raiseAmt - blinds)}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 12h-15" />
            </svg>
          </button>
          <input type='range' bind:value={betSlider} style:background-size={`${betSlider}% 100%`}>
        </div>
      </div>
      <input type='number' bind:value={raiseTo} on:change={e => handleRaiseAmt(e.target.value - curBet)}>
    </div>
  {/if}
</form>

<style>
  .actions {
    position: relative;
    height: 100%;
    max-width: 100%;
    display: flex;
    justify-content: center;
    flex-direction: row-reverse;
    gap: 0.25rem;
  }

  .actions > button {
    position: relative;
    height: 100%;
    width: 100%;
    max-width: 8rem;
    color: white;
    border-radius: 1rem;
    font-size: 1rem;
    font-family: inherit;
    line-height: 1.125;
    cursor: pointer;
    z-index: 50;
    transition: all 400ms;
  }

  .fold {
    border: 1px solid #e22e2e;
	  box-shadow: 0 0 10px #bb0f0f;
    background: linear-gradient(to bottom, #9a451e 0%,#d8532a 50%,#ca4b20 51%,#e8957e 100%);
  }

  .fold:hover {
    box-shadow: 0 0 10px #ff1515;
  }

  .check {
    border: 1px solid #44cc44;
    box-shadow: 0 0 10px #22aa22;
    background: linear-gradient(to bottom, #1e6037 0%,#288a46 50%,#237f40 51%,#37c15e 100%);
  }

  .check:hover {
    box-shadow: 0 0 10px #55ee55;
  }

  .call {
    border: 1px solid #7dd3fc;
	  box-shadow: 0 0 10px #38bdf8;
    background: linear-gradient(to bottom, #0c4a6e 0%,#0284c7 50%,#0369a1 51%,#0ea5e9 100%);
  }

  .call:hover {
    box-shadow: 0 0 10px #a5f3fc;
  }

  .raise {
    border: 1px solid #fab73b;
	  box-shadow: 0 0 10px #eb9f12;
    background: linear-gradient(to bottom, #9a8b1e 0%,#d8b52a 50%,#caab20 51%,#e8d17e 100%);
  }

  .raise:hover {
    box-shadow: 0 0 10px #ffb429;
  }

  .actions > button:disabled {
    filter: brightness(50%);
    cursor: default;
  }

  .slider {
    position: absolute;
    right: 0;
    bottom: 110%;
    width: 8rem;
    padding: 1rem 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    border-radius: 1rem;
    background-color: #f8fafc;
    z-index: 40;
  }

  .range {
    position: relative;
    display: grid;
    grid-template-columns: 1.25fr 1fr;
    height: 22rem;
  }

  .slider ul {
    height: 100%;
    display: grid;
    grid-template-rows: 2.25rem 1fr repeat(5, 2.25rem);
    justify-items: center;
    align-items: center;
    gap: 0.25rem;
  }

  .range button {
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

  .range button:hover {
    filter: brightness(150%);
  }

  .range div {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: end;
  }

  .range div button {
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
  
  .slider input[type='number'] {
    -moz-appearance: textfield; /* Firefox */
    appearance: none;
    height: 2rem;
    width: 80%;
    border-radius: 2rem;
    font-family: inherit;
    font-size: 1.125rem;
    text-align: center;
  }

  .slider input::-webkit-outer-spin-button,
  .slider input::-webkit-inner-spin-button {
    /* display: none; <- Crashes Chrome on hover */
    -webkit-appearance: none;
    margin: 0; /* <-- Apparently some margin are still there even though it's hidden */
  }

  @media all and (min-width: 640px) {
    .actions {
      justify-content: right;
    }

    .actions button {
      font-size: 1.125rem;
    }
  }
</style>