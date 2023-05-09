<script lang="ts">
  import type Player from '@backend/classes/player';
  export let player: Player;
  export let button: number;

  $: ({name, seat, stack} = player);
</script>

<div class='player'>
  <div class='info'>
    <p>{name}</p>
    <p>{stack}</p>
    {#if seat === button}
      <div class='button'>D</div>
    {/if}
  </div>
  <div class='cards'>
    <slot name='cards'/>
  </div>
  <slot />
</div>

<style>
  .player {
    position: relative;
    height: 6rem;
    width: 6rem;
    border-radius: 50%;
    border: 0.25rem solid black;
    background: linear-gradient(20deg, #111827, #64748b);
    z-index: 50;
  }

  .cards {
    position: absolute;
    left: 50%;
    display: flex;
    gap: 0.25rem;
    transform: translateX(-50%);
    bottom: 0.5rem;
    z-index: 100;
  }

  .info {
    position: absolute;
    left: 50%;
    bottom: -2rem;
    transform: translateX(-50%);
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    height: 3rem;
    width: 7rem;
    border-radius: 3rem;
    color: white;
    background-color: black;
    z-index: 200;
  }

  .button {
    position: absolute;
    top: 0;
    right: 0;
    height: 1.125rem;
    width: 1.125rem;
    border-radius: 50%;
    font-size: 0.75rem;
    font-weight: 800;
    text-align: center;
    color: black;
    background-color: #fff;
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  }
</style>