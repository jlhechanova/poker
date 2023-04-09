<script lang='ts'>
  import { createEventDispatcher } from "svelte";
  import { fly } from "svelte/transition";
  export let bet: number;
  export let stack: number;
  export let toMatch: number;
  export let minRaise: number;
  export let toAct: boolean;
  export let handleSubmit: (e: SubmitEvent) => void;

  const sizes = [[3,'3x'], [2,'2x'], [1,'POT'], [0.75,'¾'], [0.5,'½'], [1 / 3,'⅓'], [0.25,'¼']] as const;
  
  let betSlider = 0;
  let isOpenSlider = false;

  const callAmt = toMatch - bet;
  const minBet = callAmt + minRaise;
  $: raiseAmt = minBet + Math.round((stack - minBet + 1) ** (betSlider / 100) - 1);

  const handleSliderClose = async (e: MouseEvent) => {
    if (!(<HTMLElement> e.target).closest('.controls')) {
      isOpenSlider = false;
      betSlider = 0;
    }
  } 
</script>

<svelte:window on:mouseup={handleSliderClose}/>

<form class="controls" on:submit|preventDefault={handleSubmit}>
  <button value='fold'>Fold</button>
  {#if bet === toMatch}
    <button value='check'>Check</button>
  {:else if stack > toMatch}
    <button value='call'>Call</button>
  {/if}
  {#if toAct || callAmt >= minRaise} <!-- betting round still open ? -->
    {#if stack > minBet && raiseAmt != stack}
      {#if !isOpenSlider}
        <button type='button' on:click={() => isOpenSlider = !isOpenSlider}>Raise</button>
      {:else}
        <button value={raiseAmt}>Raise</button>
      {/if}
    {:else}
      <button value={stack}>All In</button>
    {/if}
  {/if}
  {#if isOpenSlider}
    <div class='raise' transition:fly={{y: 16}}>
      <div class="slider">
        <ul>
          {#each sizes as [mult, size]}
            <button type='button' value={mult}>{size}</button>
          {/each}
        </ul>
        <div>
          <button type='button'>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 5.5v13m6.5-6.5h-13"></path>
            </svg>                     
          </button>
          <button type='button'>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 12h-15" />
            </svg>                     
          </button>
          <input type='range' bind:value={betSlider} style:background-size={`${betSlider}% 100%`}>
        </div>
      </div>
      <input type='number' bind:value={raiseAmt}>
    </div>
  {/if}
</form>

<style>
  .controls {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    justify-content: space-between;
  }

  .controls > button {
    height: 4rem;
    width: 8rem;
    border-radius: 1rem;
    border: 0;
    font-size: 1.5rem;
    font-weight: 800;
    font-family: inherit;
    transition: 0.5s;
  }

  .raise {
    position: absolute;
    right: 0;
    bottom: 4rem;
    width: 8rem;
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