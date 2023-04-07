<script>
  import { onMount } from "svelte";
  import { lobby } from "$lib/stores";
  import { goto } from "$app/navigation";

  onMount(() => {
    if (!$lobby) goto('/');
  })
</script>

<slot />