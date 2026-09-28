// Manual live check for multiplayer v2 (not part of `npm test`, which needs no network):
//   node_modules/.bin/tsx script/mpLiveCheck.ts
// Two RoomControllers in one process, each with its own Supabase client, join by code and race
// three laps over the real Realtime service. Everything goes over the `dev` namespace as
// broadcasts; nothing is written to the database.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { RoomController, type ControllerDeps } from '../client/src/lib/multiplayerController.ts';
import { supabaseTransport } from '../client/src/lib/multiplayerSupabase.ts';
import { currentQuestion } from '../client/src/lib/multiplayerRaceState.ts';

const src = readFileSync(new URL('../client/src/lib/supabase.ts', import.meta.url), 'utf8');
const [url, key] = [...src.matchAll(/"(https:\/\/[^"]+|eyJ[^"]+)"/g)].map((m) => m[1]);
const t0 = Date.now();
const log = (msg: string) => console.log(`${String(Date.now() - t0).padStart(6)} ms  ${msg}`);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until(what: string, pred: () => boolean, timeoutMs = 15000) {
  const start = Date.now();
  while (!pred()) {
    if (Date.now() - start > timeoutMs) throw new Error(`timed out waiting for: ${what}`);
    await sleep(20);
  }
  log(`${what} (${Date.now() - start} ms)`);
}

function deps(me: { id: string; name: string; app: string }): ControllerDeps {
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return {
    openTransport: supabaseTransport(client),
    env: 'dev',
    now: () => Date.now(),
    setTimer: (fn, ms) => { const t = setTimeout(fn, ms); return () => clearTimeout(t); },
    random: Math.random,
    newId: () => crypto.randomUUID(),
    me,
  };
}

async function drive(c: RoomController, everyMs: number) {
  while (c.getView().racer?.status === 'racing') {
    await sleep(everyMs);
    const v = c.getView();
    const q = v.racer && currentQuestion(v.racer, v.bank);
    if (q) c.answer(q.answer, everyMs);
  }
}

async function main() {
  const host = RoomController.host(deps({ id: `live-host-${t0}`, name: 'Mia', app: '1.3.17' }),
    { level: 'easy', op: 'Multiplication', circuit: { id: 'malaysia', name: 'Malaysia' }, laps: 3 });
  await until('host has a room', () => host.getView().stage === 'room');
  const code = host.getView().code;
  log(`code ${code}`);

  const guest = RoomController.join(deps({ id: `live-guest-${t0}`, name: 'Leo', app: '1.3.17' }), code);
  await until('guest is in the room', () => guest.getView().stage === 'room');
  await until('host sees the guest', () => host.getView().snap?.guest?.name === 'Leo');

  guest.agree(true);
  await until('host sees Ready', () => host.getView().snap?.guest?.agree !== null);
  host.agree(true);
  await until('both in the countdown', () => host.getView().snap?.phase === 'countdown' && guest.getView().snap?.phase === 'countdown');
  await until('guest has the questions', () => guest.getView().bank?.raceId === 1);
  console.log('   questions:', guest.getView().bank!.questions.map((q) => q.display).join(' | '));
  const same = JSON.stringify(guest.getView().bank!.questions) === JSON.stringify(host.getView().bank!.questions);
  log(`same questions on both: ${same}`);
  await until('lights out on both', () => {
    const now = Date.now();
    return [host, guest].every((c) => { const lo = c.getView().lightsOutAt; return lo !== null && lo <= now; });
  }, 10000);
  log(`lights-out gap (guest - host): ${guest.getView().lightsOutAt! - host.getView().lightsOutAt!} ms`);

  await Promise.all([drive(guest, 400), drive(host, 700)]);
  await until('result final on both', () => [host, guest].every((c) => c.getView().snap?.result?.final));
  await until('both on the results', () => [host, guest].every((c) => c.getView().snap?.phase === 'results'));
  const h = host.getView().snap!, g = guest.getView().snap!;
  log(`host sees winner ${h.result?.winnerId === h.guest?.id ? 'Leo' : 'Mia'}; guest sees ${g.result?.winnerId === g.guest?.id ? 'Leo' : 'Mia'}`);
  log(`race times  Mia ${h.host.race?.ms} ms   Leo ${h.guest?.race?.ms} ms`);

  host.leave();
  await until('guest told the room closed', () => guest.getView().stage === 'closed' && guest.getView().error === 'host-left');
  guest.leave();
  await sleep(300);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
