<script lang='ts'>
  import { slide } from 'svelte/transition';
  import { socket, lobby } from '$lib/stores';
  import { goto } from '$app/navigation';
  import Modal from './Modal.svelte';

  let showModal = false;
  let query = '';

  let option = '';
  const handleOption = (e: SubmitEvent) => {
    let value = (<HTMLInputElement> e.submitter).value;
    option = value == option ? '' : value;
  }

  let roomID: string | undefined
  const handleTable = (e: MouseEvent) => {
    roomID = (e.target as HTMLElement).closest('tr')!.dataset.id;
  }

  const handleJoin = async () => {
    if (!roomID) return;

    const result = await $socket.emitWithAck('joinRoom', roomID, '');
    if (result) {
      lobby.set(roomID);
      goto('/poker');
    }
    else showModal = true;
  }

  const handleCreate = async (e: SubmitEvent) => {
    const submitter = e.submitter as HTMLButtonElement;
    submitter.disabled = true;
    const data = new FormData(e.target as HTMLFormElement);
    const roomID = await $socket.emitWithAck('createRoom', Object.fromEntries(data.entries()));
    if (roomID) {
      lobby.set(roomID);
      goto('/poker');
    }
    submitter.disabled = false;
  }
</script>

<div class="container">
  <div class='content'>
    <div class="inner">
      <div class='heading'>
        <h1>POKERNOVA</h1>
        <h2>Play NLHE Poker Online</h2>
      </div>
      <form class='options' on:submit|preventDefault={handleOption}>
        <!-- <button value='play'>PLAY</button> -->
        <button value='join'>JOIN</button>
        <button value='create'>CREATE</button>
      </form>

      {#if option === 'join'}
        <div class='join' transition:slide>
          <p class='heading'>JOIN</p>
          <hr>
          <div class='rooms'>
            <input bind:value={query} name='search' placeholder='Search' autocomplete='off'>
            <table cellspacing='0'>
              <thead>
                <tr>
                  <th style:text-align='left'>Lobby</th>
                  <th>Host</th>
                  <th style:width='4rem'>Blinds</th>
                  <th style:width='4rem'>Players</th>
                </tr>
              </thead>
              {#await $socket.emitWithAck('getRooms') then rooms}
                <tbody on:click={handleTable} on:dblclick={handleJoin}>
                  {#each rooms.filter(room => room.name.includes(query)) as room (room.id)}
                    {@const {id, pass, name, host, blinds, curPlayers, maxPlayers} = room}
                    <tr data-id={id} tabindex="0">
                      <td>{#if pass}🔒{/if}{name}</td>
                      <td>{host}</td>
                      <td>{blinds}/{blinds * 2}</td>
                      <td>{curPlayers}/{maxPlayers}</td>
                    </tr>
                  {/each}
                </tbody>
              {/await}
            </table>
          </div>
          <button class='confirm-btn' on:click={handleJoin}>JOIN</button>
        </div>

      {:else if option === 'create'}
        <form class='create' on:submit|preventDefault={handleCreate} transition:slide>
          <p class='heading'>CREATE</p>
          <hr>
          <div class='settings'>
            <label for='name'>
              <p>Lobby <span class='required'>REQUIRED</span></p>
              <input type='text' id='name' name='name' placeholder='Name' autocomplete="off">
            </label>

            <label for='passcode'>
              <p>Passcode</p>
              <input type='text' id='passcode' name='passcode' placeholder="It's a secret!" autocomplete="off">
            </label>
          </div>
          <button class='confirm-btn'>OK</button>
        </form>
      {/if}
    </div>
  </div>
</div>

<Modal bind:showModal>
  <h2 slot='header'>
    Private Lobby
  </h2>
  <div class='modal'>
    <form on:submit|preventDefault={async e => {
      const data = new FormData(e.target);
      const result = await $socket.emitWithAck('joinRoom', roomID, data.get('pass'));
      if (result) {
        lobby.set(roomID);
        goto('/poker');
      }
    }}>
      <input id='pass' name='pass' autocomplete="off">
      <button class='confirm-btn'>JOIN</button>
    </form>
  </div>
</Modal>

<style>
  .container {
    height: 100%;
    padding-top: 8rem;
  }

  .content {
    margin: auto;
    padding: 1rem;
    width: 100%;
    max-width: 28rem;
  }

  .inner {
    padding: 1rem;
    width: 100%;
    background-color: #fafaf9;
    border-radius: 1rem;
    filter: drop-shadow(0 4px 3px rgb(0 0 0 / 0.07)) drop-shadow(0 2px 2px rgb(0 0 0 / 0.06));
  }

  .heading {
    text-align: center;
  }

  .options {
    padding: 1rem;
    display: flex;
    justify-content: center;
    gap: 1rem;
  }

  .options button {
    height: 3rem;
    width: 7rem;
    font-size: 1.25rem;
    font-weight: 600;
  }

  .join,
  .create {
    padding: 0 1rem 1rem;
  }

  .join .rooms {
    padding: 1rem;
  }

  input[name='search'] {
    padding: 0.5rem;
    height: 2rem;
    width: 100%;
  }

  table {
    table-layout: fixed;
    width: 100%;
  }

  tr:focus {
    background-color: #cbd5e1;
  }

  td {
    overflow: hidden;
  }

  td ~ td {
    text-align: center;
  }

  .create .settings{
    padding: 1rem;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .create .settings input[type='text'] {
    height: 2rem;
    width: 100%;
    padding: 0.5rem;
  }

  .required {
    color: #b91c1c;
    font-size: 0.625rem;
    font-weight: 600;
    text-shadow: #ef4444 0 0 4px;
  }

  .confirm-btn {
    margin: auto;
    display: block;
    height: 2rem;
    width: 4rem;
  }

  .modal {
    padding: 1rem 1rem 0;
    width: 28rem;
    max-width: 100%;
  }

  .modal input {
    margin-bottom: 1rem;
    padding: 0.5rem;
    height: 2rem;
    width: 100%;
  }
</style>