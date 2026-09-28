import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  PROTOCOL_VERSION,
  isRoomCode,
  parseMessage,
  randomRoomCode,
  roomTopic,
  type RoomSnapshot,
} from './multiplayerProtocol.ts';

// Old app builds and new ones must meet on the same channel, so the topic format is a contract.
test('a room lives on one topic per environment and code', () => {
  assert.equal(roomTopic('live', '4821'), 'mathracer:mp2:live:4821');
  assert.equal(roomTopic('dev', '4821'), 'mathracer:mp2:dev:4821');
});

test('room codes are four digits without a leading zero', () => {
  for (const ok of ['1000', '4821', '9999']) assert.equal(isRoomCode(ok), true, ok);
  for (const bad of ['0821', '482', '48211', 'abcd', ' 4821', '4821 ', '', '48.1']) {
    assert.equal(isRoomCode(bad), false, JSON.stringify(bad));
  }
});

test('a random room code spans 1000 to 9999', () => {
  assert.equal(randomRoomCode(() => 0), '1000');
  assert.equal(randomRoomCode(() => 0.999999), '9999');
  assert.equal(randomRoomCode(() => 0.5), '5500');
});

const snap: RoomSnapshot = {
  roomId: 'room-1',
  code: '4821',
  phase: 'lobby',
  rev: 1,
  level: 'easy',
  op: 'Addition',
  circuitId: 'malaysia',
  circuitName: 'Malaysia',
  laps: 20,
  raceId: 0,
  countdownElapsedMs: null,
  host: { id: 'host-1', name: 'Mia', app: '1.3.17', agree: null, away: false, out: null, race: null },
  guest: null,
  result: null,
  guestAck: 0,
};

test('a well-formed room message parses', () => {
  const parsed = parseMessage('room', { v: PROTOCOL_VERSION, app: '1.3.17', seq: 4, snap });
  assert.equal(parsed.kind, 'room');
  assert.deepEqual(parsed.kind === 'room' && parsed.msg.snap, snap);
});

test('a guest message with a race in progress parses', () => {
  const msg = {
    v: PROTOCOL_VERSION, app: '1.3.17', seq: 2, session: 's-1', id: 'guest-1', name: 'Leo',
    agree: { raceId: 1, rev: 1 }, raceId: 1, raceMs: 5120,
    race: { raceId: 1, laps: [{ t: 2100, r: false }, { t: 3400, r: true }], att: 1, warn: 2, st: 'racing', ms: null },
  };
  const parsed = parseMessage('guest', msg);
  assert.equal(parsed.kind, 'guest');
  assert.deepEqual(parsed.kind === 'guest' && parsed.msg, msg);
});

test('another protocol version is reported with the sender app version, not parsed', () => {
  assert.deepEqual(
    parseMessage('room', { v: PROTOCOL_VERSION + 1, app: '1.4.0', seq: 1, snap: { whatever: true } }),
    { kind: 'version', v: PROTOCOL_VERSION + 1, app: '1.4.0' },
  );
  assert.deepEqual(parseMessage('sync', { v: 0 }), { kind: 'version', v: 0, app: null });
});

test('malformed messages and unknown events are rejected', () => {
  const bad: Array<[string, unknown]> = [
    ['room', null],
    ['room', 'hello'],
    ['room', { app: '1.3.17', seq: 1, snap }], // no version
    ['room', { v: PROTOCOL_VERSION, app: '1.3.17', seq: 1, snap: { ...snap, phase: 'warmup' } }],
    ['guest', { v: PROTOCOL_VERSION, app: '1.3.17', seq: 1, session: 's', id: 'g', name: 'x'.repeat(21), agree: null, raceId: 0, race: null, raceMs: null }],
    ['guest', { v: PROTOCOL_VERSION, app: '1.3.17', seq: 1, session: 's', id: 'g', name: '', agree: null, raceId: 0, race: null, raceMs: null }],
    ['bank', { v: PROTOCOL_VERSION, app: '1.3.17', roomId: 'r', raceId: 1, level: 'easy', op: 'Addition', questions: [{ display: '1 + 1', answer: 'two' }] }],
    ['chat', { v: PROTOCOL_VERSION, app: '1.3.17', text: 'hi' }],
  ];
  for (const [event, payload] of bad) {
    assert.deepEqual(parseMessage(event, payload), { kind: 'invalid' }, `${event} ${JSON.stringify(payload).slice(0, 60)}`);
  }
});

test('unknown fields are dropped so they cannot reach the room state', () => {
  const parsed = parseMessage('bye', { v: PROTOCOL_VERSION, app: '1.3.17', id: 'guest-1', admin: true });
  assert.deepEqual(parsed, { kind: 'bye', msg: { v: PROTOCOL_VERSION, app: '1.3.17', id: 'guest-1' } });
});
