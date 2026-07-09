import { formatCount } from './format';
import type { UnitType } from '../engine';

export const UNIT_LABELS: Record<UnitType, string> = {
  infantry: 'Infantry',
  artillery: 'Artillery',
  armor: 'Armor',
  aaGun: 'AA Gun',
  fighter: 'Fighter',
  bomber: 'Bomber',
  battleship: 'Battleship',
  carrier: 'Aircraft Carrier',
  destroyer: 'Destroyer',
  submarine: 'Submarine',
  transport: 'Transport',
};

const UNIT_PLURALS: Record<UnitType, string> = {
  infantry: 'Infantry',
  artillery: 'Artillery',
  armor: 'Armor',
  aaGun: 'AA Guns',
  fighter: 'Fighters',
  bomber: 'Bombers',
  battleship: 'Battleships',
  carrier: 'Aircraft Carriers',
  destroyer: 'Destroyers',
  submarine: 'Submarines',
  transport: 'Transports',
};

/**
 * Label for a counted quantity: singular only when the displayed value is
 * exactly 1 ("1 Fighter", "0.5 Bombers", "2 Transports"). Infantry,
 * artillery, and armor are invariant.
 */
export function unitLabel(type: UnitType, count: number, maxDecimals = 1): string {
  return formatCount(count, maxDecimals) === '1' ? UNIT_LABELS[type] : UNIT_PLURALS[type];
}

/** The order units are listed in the Order of Battle form — all unit lists
 * and tables in the results follow this same order. */
export const UNIT_DISPLAY_ORDER: UnitType[] = [
  'infantry',
  'artillery',
  'armor',
  'aaGun',
  'fighter',
  'bomber',
  'transport',
  'submarine',
  'destroyer',
  'battleship',
  'carrier',
];
