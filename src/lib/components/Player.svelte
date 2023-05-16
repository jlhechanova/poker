<script lang="ts">
  import type Player from '@backend/classes/player';
  import { fly } from 'svelte/transition';
  import { socket } from '$lib/stores';
  export let player: Player;
  export let button: number;
  export let turn: number;
  export let isUser = false;

  $: ({name, seat, stack} = player);

  const handlePlayerInfo = (e: SubmitEvent) => {
    const data = new FormData(e.target as HTMLFormElement);
    const name = data.get('name') as string;
    if (!name || name === player.name) return;

    // localStorage.setItem('username', name);
    $socket.emit('editPlayer', {name: name});
    showForm = false;
  }

  // this basically attaches event listeners for the user if they are
  // seated to handle name change. (can extend to editing stack size?)
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
  <div class='avatar'>
    <slot />
  </div>
  <div class='cards'>
    <slot name='cards'/>
  </div>
  <button class='info' class:turn={seat === turn} class:isUser disabled={!isUser} use:enableUser>
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
</div>

<style>
  .player {
    position: relative;
    display: flex;
    align-items: center;
    flex-direction: column;
  }
  .avatar {
    height: 4.5rem;
    width: 4.5rem;
    border-radius: 50%;
    border: 0.25rem solid black;
    background: linear-gradient(20deg, #111827, #64748b);
  }

  .cards {
    position: absolute;
    right: 50%;
    bottom: 1.75rem;
    transform: translateX(50%);
    display: flex;
    gap: 0.125rem;
    z-index: 0;
  }

  .info {
    position: relative;
    margin-top: -1rem;
    height: 2.5rem;
    width: 4.5rem;
    appearance: none;
    border: none;
    font-size: 0.825rem;
    text-align: center;
    border-radius: 3rem;
    color: white;
    background-color: black;
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
    transition: box-shadow 200ms;
    z-index: 10;
  }

  .turn {
    box-shadow: 0 0 12px #ff0;
  }

  .isUser:hover {
    box-shadow: 0 0 10px #f8fafc;
    cursor: pointer;
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

  form {
    position: absolute;
    right: 50%;
    bottom: 3.5rem;
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
    z-index: 75;
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

  @media (min-width: 641px) {
    .avatar {
      height: 6rem;
      width: 6rem;
    }

    .info {
      font-size: 1rem;
      height: 3rem;
      width: 7rem;
    }

    .cards {
      bottom: 2.5rem;
    }
  }
</style>