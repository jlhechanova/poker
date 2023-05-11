<script>
  import "./styles.css";
  import { socket } from "$lib/stores";
  import { onMount } from "svelte";

  onMount(() => { // attach stuff to socket. can also attach session id here
    const username = sessionStorage.getItem('username');
    if (username) $socket.auth = {username};
    $socket.connect();
  })
</script>

<main>
  <slot />
</main>

<style>
  main {
    height: 100%;
    background-image: radial-gradient(#334155, #020617);
  }
</style>