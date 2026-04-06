import { PIECE_DEFS } from "@/game/content/theme";
import { BOARD_COLUMNS, BOARD_ROWS, PREVIEW_SIZE, SPAWN_BAG } from "@/game/core/config";
import { randomFrom } from "@/game/core/random";
import type { Board, GameState, Position } from "@/game/types";

export function createInitialGameState(): GameState {
  const queue = Array.from({ length: PREVIEW_SIZE }, () => drawPiece());

  return {
    board: createEmptyBoard(),
    currentPiece: drawPiece(),
    queue,
    score: 0,
    turn: 0,
    lastChain: 0,
    mergedPositions: [],
    microwaveUsed: false,
    isGameOver: false,
  };
}

export function restartGame() {
  return createInitialGameState();
}

export function dropPiece(state: GameState, column: number): GameState {
  if (state.isGameOver || column < 0 || column >= BOARD_COLUMNS) {
    return state;
  }

  const row = findDropRow(state.board, column);
  if (row === -1) {
    return state;
  }

  const nextBoard = cloneBoard(state.board);
  nextBoard[row][column] = state.currentPiece;

  const resolved = resolveBoard(nextBoard);
  const nextQueue = [...state.queue];
  const nextCurrent = nextQueue.shift() ?? drawPiece();
  nextQueue.push(drawPiece());

  return {
    board: resolved.board,
    currentPiece: nextCurrent,
    queue: nextQueue,
    score: state.score + resolved.scoreGain,
    turn: state.turn + 1,
    lastChain: resolved.chainCount,
    mergedPositions:
      resolved.chainCount > 0 ? findChangedFilledPositions(state.board, resolved.board) : [],
    microwaveUsed: state.microwaveUsed,
    isGameOver: hasNoValidMoves(resolved.board),
  };
}

export function rerollCurrentPiece(state: GameState): GameState {
  if (state.isGameOver || state.microwaveUsed) {
    return state;
  }

  let nextPiece = drawPiece();
  for (let attempt = 0; attempt < 4 && nextPiece === state.currentPiece; attempt += 1) {
    nextPiece = drawPiece();
  }

  return {
    ...state,
    currentPiece: nextPiece,
    microwaveUsed: true,
  };
}

function resolveBoard(board: Board) {
  let working = applyGravity(board);
  let totalScore = 0;
  let chainCount = 0;

  while (true) {
    const groups = findMergeGroups(working);
    if (groups.length === 0) {
      break;
    }

    chainCount += 1;

    for (const group of groups) {
      const anchor = chooseAnchor(group.positions);
      const nextPieceId = Math.min(group.value + 1, PIECE_DEFS.length - 1);

      for (const position of group.positions) {
        working[position.row][position.column] = null;
      }

      working[anchor.row][anchor.column] = nextPieceId;
      totalScore += (group.value + 1) * group.positions.length * 10 * chainCount;
    }

    working = applyGravity(working);
  }

  return {
    board: working,
    scoreGain: totalScore,
    chainCount,
  };
}

function findMergeGroups(board: Board) {
  const visited = new Set<string>();
  const groups: Array<{ value: number; positions: Position[] }> = [];

  for (let row = 0; row < BOARD_ROWS; row += 1) {
    for (let column = 0; column < BOARD_COLUMNS; column += 1) {
      const value = board[row][column];
      const key = `${row}:${column}`;

      if (value === null || visited.has(key)) {
        continue;
      }

      const group = floodFill(board, { row, column }, value, visited);
      if (group.length >= 2) {
        groups.push({ value, positions: group });
      }
    }
  }

  return groups;
}

function floodFill(board: Board, start: Position, target: number, visited: Set<string>) {
  const stack = [start];
  const group: Position[] = [];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    const key = `${current.row}:${current.column}`;
    if (visited.has(key)) {
      continue;
    }

    if (board[current.row][current.column] !== target) {
      continue;
    }

    visited.add(key);
    group.push(current);

    const neighbors = [
      { row: current.row - 1, column: current.column },
      { row: current.row + 1, column: current.column },
      { row: current.row, column: current.column - 1 },
      { row: current.row, column: current.column + 1 },
    ];

    for (const neighbor of neighbors) {
      if (
        neighbor.row >= 0 &&
        neighbor.row < BOARD_ROWS &&
        neighbor.column >= 0 &&
        neighbor.column < BOARD_COLUMNS
      ) {
        stack.push(neighbor);
      }
    }
  }

  return group;
}

function chooseAnchor(positions: Position[]) {
  return [...positions].sort((a, b) => {
    if (b.row !== a.row) {
      return b.row - a.row;
    }

    return a.column - b.column;
  })[0];
}

function applyGravity(board: Board) {
  const nextBoard = createEmptyBoard();

  for (let column = 0; column < BOARD_COLUMNS; column += 1) {
    const stack: number[] = [];

    for (let row = BOARD_ROWS - 1; row >= 0; row -= 1) {
      const value = board[row][column];
      if (value !== null) {
        stack.push(value);
      }
    }

    for (let offset = 0; offset < stack.length; offset += 1) {
      nextBoard[BOARD_ROWS - 1 - offset][column] = stack[offset];
    }
  }

  return nextBoard;
}

function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_ROWS }, () =>
    Array.from({ length: BOARD_COLUMNS }, () => null as Board[number][number]),
  );
}

function cloneBoard(board: Board) {
  return board.map((row) => [...row]);
}

function findDropRow(board: Board, column: number) {
  for (let row = BOARD_ROWS - 1; row >= 0; row -= 1) {
    if (board[row][column] === null) {
      return row;
    }
  }

  return -1;
}

function drawPiece() {
  return randomFrom(SPAWN_BAG);
}

function hasNoValidMoves(board: Board) {
  for (let column = 0; column < BOARD_COLUMNS; column += 1) {
    if (board[0][column] === null) {
      return false;
    }
  }

  return true;
}

function findChangedFilledPositions(previousBoard: Board, nextBoard: Board) {
  const positions: string[] = [];

  for (let row = 0; row < BOARD_ROWS; row += 1) {
    for (let column = 0; column < BOARD_COLUMNS; column += 1) {
      if (nextBoard[row][column] !== null && previousBoard[row][column] !== nextBoard[row][column]) {
        positions.push(`${row}:${column}`);
      }
    }
  }

  return positions;
}
