<script>
  import { handEvaluator, calculateHandOutcome } from "$lib/utils";
  import Deck from "$lib/consts/deck";
  import currency from "currency.js";

  const deck = new Deck();
  let board = Array.from({length: 5}, () => deck.deal());

  let hand1 = [deck.deal(), deck.deal()];
  let hand2 = [deck.deal(), deck.deal()];

  let res = calculateHandOutcome(board, [hand1, hand2]);

</script>

{JSON.stringify(board)}
<br>
{JSON.stringify(hand1)}
<br>
{JSON.stringify(hand2)}
<br>
<br>
{JSON.stringify(handEvaluator(board.concat(hand1)))}
<br>
{JSON.stringify(handEvaluator(board.concat(hand2)))}