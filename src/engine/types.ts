export type UnitType =
  | 'infantry'
  | 'artillery'
  | 'armor'
  | 'aaGun'
  | 'fighter'
  | 'bomber'
  | 'battleship'
  | 'carrier'
  | 'destroyer'
  | 'submarine'
  | 'transport';

export const ALL_UNIT_TYPES: UnitType[] = [
  'infantry',
  'artillery',
  'armor',
  'aaGun',
  'fighter',
  'bomber',
  'battleship',
  'carrier',
  'destroyer',
  'submarine',
  'transport',
];

export type Domain = 'land' | 'air' | 'sea';
export type Side = 'attacker' | 'defender';
export type PriorityMode = 'militaristic' | 'economical';

export interface UnitDefinition {
  type: UnitType;
  domain: Domain;
  cost: number;
  /** Attack roll threshold (roll <= attack scores a hit). 0 = cannot attack. */
  attack: number;
  /** Defense roll threshold (roll <= defense scores a hit). */
  defense: number;
  /** Hits required to destroy this unit (2 for battleship, 1 for everything else). */
  hitsToDestroy: number;
  /** One-shot amphibious bombardment support roll threshold, if this unit can bombard. */
  bombard?: { maxRoll: number };
  /** AA guns can never be selected as a casualty and never attack normally. */
  isAAGun?: boolean;
}

/** Count of each unit type owned by one side. Always fully populated (0 = none). */
export type ArmyComposition = Record<UnitType, number>;

export interface BattleInput {
  attacker: ArmyComposition;
  defender: ArmyComposition;
  priorityMode: PriorityMode;
  trialCount: number;
  /**
   * Only a surviving land unit can claim a territory. When set, the
   * attacker sacrifices aircraft before its last land unit, and a battle
   * that clears the defender with only attacker aircraft left counts as
   * `clearedNotCaptured` instead of a win.
   */
  ensureCapture: boolean;
}

export type BattleType = 'land' | 'naval';

export interface BattleContext {
  type: BattleType;
  /** Attacker battleships/destroyers fire one-shot cover support (land battles only). */
  bombardmentSupport: boolean;
  /** Explanatory note when entered units sit the battle out. */
  note?: string;
}

export type Phase = 'naval' | 'land';

export type UnitLossCounts = Partial<Record<UnitType, number>>;

export interface RoundOutcome {
  phase: Phase;
  round: number;
  attackerLosses: UnitLossCounts;
  defenderLosses: UnitLossCounts;
}

/**
 * - `tie`: mutual annihilation — both sides fully destroyed.
 * - `standoff`: both sides alive but neither can ever hit the other
 *   (e.g. aircraft vs. submarines with no destroyer present).
 * - `clearedNotCaptured`: defender destroyed, but the attacker has only
 *   aircraft left, which cannot claim territory (Ensure Capture mode only).
 */
export type TrialOutcome =
  | 'attackerWins'
  | 'defenderWins'
  | 'tie'
  | 'standoff'
  | 'clearedNotCaptured';

export interface TrialResult {
  outcome: TrialOutcome;
  rounds: RoundOutcome[];
  /** Attacker aircraft downed by pre-battle AA fire. */
  aaLosses: UnitLossCounts;
  /** Defender units destroyed by amphibious bombardment cover shots. */
  bombardmentLosses: UnitLossCounts;
}

export interface DeathOrderEntry {
  unitType: UnitType;
  avgDeathRound: number;
}

export interface RoundLossRow {
  round: number;
  attackerLosses: UnitLossCounts;
  defenderLosses: UnitLossCounts;
}

export interface AggregatedResult {
  trialsRun: number;
  attackerWinPct: number;
  defenderWinPct: number;
  tiePct: number;
  standoffPct: number;
  clearedNotCapturedPct: number;
  deathOrder: Record<Side, Record<Phase, DeathOrderEntry[]>>;
  roundByRoundLosses: Record<Phase, RoundLossRow[]>;
  totalIpcLoss: { attacker: number; defender: number };
  /** Expected attacker aircraft downed by AA fire, per unit type. */
  aaLosses: UnitLossCounts;
  /** Expected defender units destroyed by bombardment cover shots, per unit type. */
  bombardmentLosses: UnitLossCounts;
}

/** A single unit instance tracked during one simulated trial. */
export interface UnitInstance {
  id: number;
  type: UnitType;
  side: Side;
  domain: Domain;
  hitsTaken: number;
}
