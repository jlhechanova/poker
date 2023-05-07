<script lang="ts">
  import type Player from '@backend/classes/player';
  export let player: Player;
  export let button: number;
</script>

<div class="player">
  <div class="avatar"></div>
  <div class="info">
    <p>{player.name.slice(0,5)}</p>
    <p>{player.stack}</p>
    {#if player.seat === button}
      <div class="button">D</div>
    {/if}
  </div>
  <div class="cards">
    <slot />
  </div>
</div>

<style>
  .player {
    position: relative;
    z-index: 50;
  }

  .cards {
    position: absolute;
    left: 50%;
    display: flex;
    gap: 0.25rem;
    transform: translateX(-50%);
    bottom: 2rem;
    z-index: 100;
  }
  
  .avatar {
    margin-bottom: -0.5rem;
    height: 6rem;
    width: 6rem;
    border-radius: 50%;
    border: 0.25rem solid black;
    background: linear-gradient(20deg, #111827, #64748b);
  }
  
  .info {
    position: relative;
    height: 3rem;
    width: 6rem;
    text-align: center;
    border-radius: 0.5rem;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
    background-color: white;
    filter: brightness(90%);
    z-index: 150;
  }

  .button {
    position: absolute;
    top: -1.25rem;
    left: 50%;
    transform: translateX(-50%);
    height: 1.5rem;
    width: 1.5rem;
    border-radius: 50%;
    font-weight: 800;
    text-align: center;
    background-color: #fff;
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  }
</style>