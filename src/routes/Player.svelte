<script lang="ts">
  import type Player from '$lib/consts/player';
  export let player: Player;
</script>

<div class="player">
  <div class="cards">
    <slot />
  </div>
  <div class="profile">
    <div class="avatar"></div>
    <div class="info">
      <p>{player.name.slice(0,5)}</p>
      <hr style:width="{80}%">
      <p>{player.stack}</p>
    </div>
  </div>
</div>

<style>
  .player {
    position: relative;
    margin: auto;
    height: 4rem;
    width: 12rem;
    z-index: 10;
  }

  .player .cards {
    position: absolute;
    left: calc(50% - 5rem);
    bottom: 4.25rem;
    z-index: -10;
  }

  .player .profile {
    height: 100%;
    width: 100%;
    display: flex;
    background-color: lavender
  }

  .player .avatar {
    height: 100%;
    aspect-ratio: 1 / 1;
    flex-shrink: 0;
    border: 0.5rem solid black;
  }

  .player .info {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    flex-grow: 1;
  }
</style>