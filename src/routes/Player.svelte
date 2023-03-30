<script lang="ts">
  import type Player from '$lib/consts/player';
  export let player: Player;
</script>

<div class="player">
  <div class="avatar"></div>
  <div class="info">
    <p>{player.name.slice(0,5)}</p>
    <hr style:width="{75}%">
    <p>{player.stack}</p>
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

  .player .cards {
    position: absolute;
    width: max-content;
    left: 50%;
    transform: translateX(-50%);
    bottom: 2rem;
    z-index: 100;
  }
  
  .player .avatar {
    margin-bottom: -0.5rem;
    height: 6rem;
    width: 6rem;
    border-radius: 50%;
    border: 0.25rem solid black;
    background: linear-gradient(20deg, #111827, #64748b);
  }
  
  .player .info {
    position: relative;
    height: 3rem;
    width: 6rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    border-radius: 0.5rem;
    background-color: lavender;
    z-index: 150;
  }
</style>