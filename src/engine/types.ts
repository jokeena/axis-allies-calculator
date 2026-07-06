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
}

export type BattleType = 'land' | 'naval' | 'amphibious';

export interface BattleContext {
  type: BattleType;
  /** Whether a naval phase should be resolved before any land phase. */
  navalPhaseOccurs: boolean;
  /** Set when defender naval units are present but won't participate (no attacker navy to engage them). */
  strandedDefenderNavyNote?: string;
}

export type Phase = 'naval' | 'land';

export type UnitLossCounts = Partial<Record<UnitType, number>>;

export interface RoundOutcome {
  phase: Phase;
  round: number;
  attackerLosses: UnitLossCounts;
  defenderLosses: UnitLossCounts;
}

export type TrialOutcome = 'attackerWins' | 'defenderWins' | 'tie';

export interface TrialResult {
  outcome: TrialOutcome;
  rounds: RoundOutcome[];
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
  deathOrder: Record<Side, Record<Phase, DeathOrderEntry[]>>;
  roundByRoundLosses: Record<Phase, RoundLossRow[]>;
  totalIpcLoss: { attacker: number; defender: number };
}

/** A single unit instance tracked during one simulated trial. */
export interface UnitInstance {
  id: number;
  type: UnitType;
  side: Side;
  domain: Domain;
  hitsTaken: number;
}
