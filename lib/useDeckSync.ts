'use client';

/**
 * Keeps the URL hash and the other window in step with the deck position.
 *
 * Three things can move the deck: a key in this window, a key in the other
 * window, and the address bar. All three have to end at the same step without
 * bouncing off each other, which is what the source tag and the sender id are
 * for — a window ignores its own broadcast, and a hash write triggered by a
 * remote change does not get re-broadcast.
 */

import { useEffect, useRef } from 'react';
import { hashFromIndex, indexFromHash } from './deck';
import { useDeckStore } from './deckStore';

const CHANNEL = 'dozer-walkthrough';

interface Message {
  from: string;
  index: number;
  /** Overlay state the other window should mirror. Blank travels; the laser does not. */
  blank: boolean;
}

/**
 * @param writeHash whether this window owns the address bar. Both windows do —
 *   a rep who refreshes the presenter view should land back on the same step —
 *   but they write their own hash, never each other's.
 */
export function useDeckSync(writeHash = true) {
  const idRef = useRef<string>('');
  if (!idRef.current) {
    idRef.current = Math.random().toString(36).slice(2);
  }
  const channelRef = useRef<BroadcastChannel | null>(null);
  /** Epoch we have already broadcast, so a re-render does not re-send. */
  const sentEpoch = useRef(-1);

  // ── Open the channel and listen ────────────────────────────────────────────
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(CHANNEL);
    channelRef.current = channel;

    channel.onmessage = (e: MessageEvent<Message>) => {
      const msg = e.data;
      if (!msg || msg.from === idRef.current) return;
      const store = useDeckStore.getState();
      if (msg.index !== store.index) {
        // 'remote' so the effect below does not bounce it straight back.
        store.setIndex(msg.index, 'remote');
      }
      if (msg.blank !== store.blank) {
        useDeckStore.setState({ blank: msg.blank });
      }
    };

    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, []);

  // ── Read the hash on mount, and follow it if the rep edits it ──────────────
  useEffect(() => {
    const applyHash = () => {
      const i = indexFromHash(window.location.hash);
      if (i !== null && i !== useDeckStore.getState().index) {
        useDeckStore.getState().setIndex(i, 'hash');
      }
    };
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, []);

  // ── Push local changes out to the hash and the other window ────────────────
  useEffect(
    () =>
      useDeckStore.subscribe((state) => {
        if (state.epoch === sentEpoch.current) return;
        sentEpoch.current = state.epoch;

        if (writeHash) {
          const want = hashFromIndex(state.index);
          if (window.location.hash !== want) {
            // replaceState rather than assigning location.hash: a deck driven
            // with the arrow keys would otherwise stack thirty entries into the
            // back button, and the rep's browser Back would walk them one step
            // instead of leaving the deck.
            window.history.replaceState(null, '', want);
          }
        }

        // A change that arrived from the other window does not go back out.
        if (state.lastSource === 'remote') return;
        channelRef.current?.postMessage({
          from: idRef.current,
          index: state.index,
          blank: state.blank,
        } satisfies Message);
      }),
    [writeHash],
  );

  // Blanking is a deliberate "look at me, not the screen" move and the presenter
  // view needs to show that it is on, so it is broadcast on its own too.
  useEffect(
    () =>
      useDeckStore.subscribe((state, prev) => {
        if (state.blank === prev.blank) return;
        channelRef.current?.postMessage({
          from: idRef.current,
          index: state.index,
          blank: state.blank,
        } satisfies Message);
      }),
    [],
  );
}
