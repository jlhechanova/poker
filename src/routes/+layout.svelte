<script>
  import "./styles.css";
  import { socket } from "$lib/stores";
  import { onMount } from "svelte";

  onMount(() => { // attach stuff to socket. can also attach session id here
    // const username = localStorage.getItem('username');
    // if (username) $socket.auth = {username};
    $socket.connect();
  })
</script>

<svelte:head>
  <title>Pokernova | Play Poker with Friends!</title>
  <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
  <meta name='description' content='Play poker online with friends for free! No signup or download required.'>
  <meta property='og:title' content='Pokernova | Play Poker with Friends'>
  <meta property='og:description' content='Play poker online with friends for free! No signup or download required.'>
  <meta name='theme-color' content='#020617'>
</svelte:head>

<main>
  <slot />
</main>

<style>
  main {
    height: 100%;
    background: radial-gradient(#1f2937, #030712);
  }
</style>