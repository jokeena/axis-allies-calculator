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
