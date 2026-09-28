/**
 * Supabase Realtime transport for multiplayer rooms: one public Broadcast channel per room topic.
 *
 * Findings from the 2026-09-28 spike that shape it: an unclean socket drop rejoins by itself and
 * fires SUBSCRIBED again (the controller re-syncs on every 'joined'); a manual
 * `realtime.disconnect()` never rejoins, so it is not used; `send()` on a channel that isn't
 * joined falls back to the REST API, so this transport refuses instead.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { OpenTransport, TransportStatus } from './multiplayerController';
import type { MpEvent } from './multiplayerProtocol';

const EVENTS: MpEvent[] = ['room', 'bank', 'guest', 'sync', 'bye'];

/**
 * `sendHeartbeat()` only forces a reconnect when an earlier heartbeat is still unanswered, so a
 * resume probe sends a second one after this gap to turn a socket that died in the background
 * into a reconnect.
 */
const RESUME_PROBE_GAP_MS = 2000;

const STATUS: Record<string, TransportStatus> = {
  SUBSCRIBED: 'joined',
  CHANNEL_ERROR: 'error',
  TIMED_OUT: 'error',
  CLOSED: 'closed',
};

export function supabaseTransport(client: SupabaseClient): OpenTransport {
  return (topic, handlers) => {
    // client.channel(topic) returns an existing channel with the same topic; start from a clean one.
    for (const existing of client.getChannels()) {
      if (existing.topic === `realtime:${topic}`) void client.removeChannel(existing);
    }
    let closed = false;
    let probeTimer: ReturnType<typeof setTimeout> | null = null;
    const channel = client.channel(topic, { config: { broadcast: { self: false } } });
    // Every listener goes on before subscribe(): adding one to a joined channel forces a resubscribe.
    for (const event of EVENTS) {
      channel.on('broadcast', { event }, ({ payload }) => {
        if (!closed) handlers.onMessage(event, payload);
      });
    }
    channel.subscribe((status) => {
      const mapped = STATUS[status];
      if (!closed && mapped) handlers.onStatus(mapped);
    });

    return {
      send(event, payload) {
        if (closed || channel.state !== 'joined' || !client.realtime.isConnected()) return false;
        void channel.send({ type: 'broadcast', event, payload });
        return true;
      },
      probe() {
        if (closed) return;
        void client.realtime.sendHeartbeat();
        if (probeTimer) clearTimeout(probeTimer);
        probeTimer = setTimeout(() => {
          if (!closed) void client.realtime.sendHeartbeat();
        }, RESUME_PROBE_GAP_MS);
      },
      close() {
        closed = true;
        if (probeTimer) clearTimeout(probeTimer);
        void client.removeChannel(channel);
      },
    };
  };
}
