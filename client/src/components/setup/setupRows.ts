/**
 * Builders for the setting rows that more than one mode offers.
 *
 * Free Practice, Grand Prix, Lane Racer and Multiplayer previously each spelled out their
 * own operation list. Every shared row is built here so the four surfaces cannot say
 * different things about the same setting.
 */
import {
  DIFFICULTY_DRUM_OPTIONS,
  type Difficulty,
  type DifficultyDrumOption,
  type DifficultyMode,
} from '@/lib/gameLogic';
import type { SetupOption, SetupRowSpec } from './SetupRow';

/** The five maths types, in ladder order. Ids are the `Circuit.type` strings. */
export const OPERATION_SETUP_OPTIONS: SetupOption[] = [
  { id: 'Addition', label: 'Addition' },
  { id: 'Subtraction', label: 'Subtraction' },
  { id: 'Multiplication', label: 'Multiplication' },
  { id: 'Division', label: 'Division' },
  { id: 'Variables', label: 'Variables' },
];

export function operationRow(selected: string, onSelect: (op: string) => void): SetupRowSpec {
  return {
    id: 'operation',
    label: 'Maths',
    options: OPERATION_SETUP_OPTIONS,
    selectedId: selected,
    onSelect,
  };
}

/**
 * Level as one ladder: Adaptive, then a rung per series.
 *
 * The stored state is still the `difficultyMode` / `lockedDifficulty` pair — picking a
 * series *is* locking, and there is no separate Adaptive/Locked toggle.
 */
export function levelRow(
  mode: DifficultyMode,
  locked: Difficulty,
  onSelect: (opt: DifficultyDrumOption) => void,
): SetupRowSpec {
  const selectedId =
    mode === 'locked'
      ? (DIFFICULTY_DRUM_OPTIONS.find((o) => o.mode === 'locked' && o.locked === locked)?.id ??
        'adaptive')
      : 'adaptive';

  return {
    id: 'level',
    label: 'Level',
    options: DIFFICULTY_DRUM_OPTIONS.map((o) => ({ id: o.id, label: o.label })),
    selectedId,
    onSelect: (id) => {
      const opt = DIFFICULTY_DRUM_OPTIONS.find((o) => o.id === id);
      if (opt) onSelect(opt);
    },
  };
}
