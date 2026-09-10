import { Deck } from '@/components/stage/Deck';

/**
 * The stage. This is what gets screen-shared.
 *
 * Deep-linkable: every step has a hash (#/dashboard/5), so a rep can refresh
 * mid-call, or open the deck straight onto the chapter a prospect asked about
 * without arrowing through everything in front of it.
 */
export default function Page() {
  return <Deck />;
}
