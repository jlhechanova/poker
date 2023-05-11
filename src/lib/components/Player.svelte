<script lang="ts">
  import type Player from '@backend/classes/player';
  import { fly } from 'svelte/transition';
  import { socket } from '$lib/stores';
  export let player: Player;
  export let button: number;
  export let isTurn = false;
  export let isUser = false;

  $: ({name, seat, stack} = player);

  const handlePlayerInfo = (e: SubmitEvent) => {
    const data = new FormData(e.target as HTMLFormElement);
    const name = data.get('name') as string;
    if (!name || name === player.name) return;

    $socket.emit('editPlayer', {name: name});
    sessionStorage.setItem('username', name);
    showForm = false;
  }

  let showForm = false;
  const enableUser = (node: HTMLElement) => {
    if (!isUser) return;

    const handler = () => {
      showForm = !showForm;
    }

    node.addEventListener('click', handler);
    window.addEventListener('mousedown', function handler(e: MouseEvent) {
      if (!(<HTMLElement> e.target).closest('.player')) showForm = false;
    })
    return {
      destroy () {
        node.removeEventListener('click', handler);
      }
    }
  }
</script>

<div class='player'>
  <button class='info' class:isTurn class:isUser disabled={!isUser} use:enableUser>
    <p>{name}</p>
    <p>{stack}</p>
    {#if seat === button}
      <div class='dealer'>D</div>
    {/if}
  </button>
  {#if showForm}
    <form on:submit|preventDefault={handlePlayerInfo} transition:fly={{y: 8}}>
      <input name='name' placeholder='New Name' autofocus autocomplete='off'/>
      <button>OK</button>
      <div></div>
    </form>
  {/if}
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
    height: 3rem;
    width: 7rem;
    appearance: none;
    border: none;
    font-size: inherit;
    text-align: center;
    border-radius: 3rem;
    color: white;
    background-color: black;
    z-index: 200;
    transition: all 300ms;
  }

  .dealer {
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
    background-color: white;
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  }

  .isTurn {
    box-shadow: 0 0 10px #ffb429;
  }
  
  .isUser:hover {
    box-shadow: 0 0 10px #f8fafc;
    cursor: pointer;
  }

  form {
    position: absolute;
    right: 50%;
    bottom: 1.5rem;
    transform: translatex(50%);
    height: 5.5rem;
    width: 10rem;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    gap: 0.25rem;
    border-radius: 0.25rem;
    background-color: #f1f5f9;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  }

  form input {
    height: 2rem;
    padding: 0.5rem;
    width: 80%;
  }

  form button {
    height: 2rem;
    width: 4rem;
  }

  form div {
    position: absolute;
    right: 50%;
    bottom: 0;
    height: 0.5rem;
    width: 0.5rem;
    transform: translate(50%, 50%) rotate(45deg);
    background-color: inherit;
  }
</style>