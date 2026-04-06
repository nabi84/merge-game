export type CellValue = number | null;
export type Board = CellValue[][];

export interface PieceDefinition {
  id: number;
  tier: number;
  name: string;
  shortName: string;
  iconSrc: string;
  color: string;
}

export interface Position {
  row: number;
  column: number;
}

export interface GameState {
  board: Board;
  currentPiece: number;
  queue: number[];
  score: number;
  turn: number;
  lastChain: number;
  mergedPositions: string[];
  microwaveUsed: boolean;
  isGameOver: boolean;
}
