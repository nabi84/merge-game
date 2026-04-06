"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from "react";
import {
  createInitialGameState,
  dropPiece,
  rerollCurrentPiece,
  restartGame,
} from "@/game/core/engine";
import {
  BOARD_CELL_SIZE,
  BOARD_COLUMNS,
  BOARD_GAP_SIZE,
  BOARD_ROWS,
  PREVIEW_SIZE,
} from "@/game/core/config";
import { SnackIcon } from "@/components/snack-icon";
import { PIECE_DEFS } from "@/game/content/theme";
import { SnackAudioEngine } from "@/lib/audio";
import { loadBestScore, saveBestScore } from "@/lib/storage";
import type { Board, GameState } from "@/game/types";

type MomentTone = "cute" | "funny" | "hype";

function formatScore(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function GameBoard() {
  const [game, setGame] = useState<GameState>(() => createInitialGameState());
  const [bestScore, setBestScore] = useState(0);
  const [selectedColumn, setSelectedColumn] = useState(Math.floor(BOARD_COLUMNS / 2));
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [boardNudge, setBoardNudge] = useState(false);
  const [scorePop, setScorePop] = useState(false);
  const [runBestChain, setRunBestChain] = useState(0);
  const [chainCallout, setChainCallout] = useState<{
    label: string;
    left: number;
    top: number;
    color: string;
    tone: MomentTone;
  } | null>(null);
  const [announcer, setAnnouncer] = useState<{
    text: string;
    tone: MomentTone;
  } | null>(null);
  const [dropAnimation, setDropAnimation] = useState<{
    pieceId: number;
    column: number;
    targetRow: number;
  } | null>(null);
  const [cursorPreview, setCursorPreview] = useState<{ x: number; y: number; visible: boolean }>({
    x: 0,
    y: 0,
    visible: false,
  });
  const [hoverGuideX, setHoverGuideX] = useState<number | null>(null);
  const boardAreaRef = useRef<HTMLDivElement | null>(null);
  const boardGridRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<SnackAudioEngine | null>(null);
  const dropAnimationTimerRef = useRef<number | null>(null);
  const chainCalloutTimerRef = useRef<number | null>(null);
  const announcerTimerRef = useRef<number | null>(null);
  const scorePopTimerRef = useRef<number | null>(null);
  const boardNudgeTimerRef = useRef<number | null>(null);
  const lastScoreRef = useRef(0);

  useEffect(() => {
    setBestScore(loadBestScore());
  }, []);

  useEffect(() => {
    audioRef.current = new SnackAudioEngine();

    return () => {
      audioRef.current?.dispose();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    audioRef.current?.setMuted(!audioEnabled);
  }, [audioEnabled]);

  useEffect(() => {
    if (game.score > bestScore) {
      setBestScore(game.score);
      saveBestScore(game.score);
    }
  }, [bestScore, game.score]);

  useEffect(() => {
    const scoreGain = game.score - lastScoreRef.current;
    if (scoreGain > 0) {
      setScorePop(true);
      if (scorePopTimerRef.current !== null) {
        window.clearTimeout(scorePopTimerRef.current);
      }

      scorePopTimerRef.current = window.setTimeout(() => {
        setScorePop(false);
        scorePopTimerRef.current = null;
      }, 260);
    }

    lastScoreRef.current = game.score;
  }, [game.score]);

  useEffect(() => {
    if (game.lastChain > runBestChain) {
      setRunBestChain(game.lastChain);
    }
  }, [game.lastChain, runBestChain]);

  useEffect(() => {
    const danger = computeBoardDanger(game.board);
    audioRef.current?.setMood({ danger, gameOver: game.isGameOver });
  }, [game.board, game.isGameOver]);

  useEffect(() => {
    if (game.mergedPositions.length === 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setGame((current) =>
        current.mergedPositions.length > 0
          ? { ...current, mergedPositions: [] }
          : current,
      );
    }, 260);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [game.mergedPositions]);

  useEffect(() => {
    return () => {
      if (dropAnimationTimerRef.current !== null) {
        window.clearTimeout(dropAnimationTimerRef.current);
      }

      if (chainCalloutTimerRef.current !== null) {
        window.clearTimeout(chainCalloutTimerRef.current);
      }

      if (announcerTimerRef.current !== null) {
        window.clearTimeout(announcerTimerRef.current);
      }

      if (scorePopTimerRef.current !== null) {
        window.clearTimeout(scorePopTimerRef.current);
      }

      if (boardNudgeTimerRef.current !== null) {
        window.clearTimeout(boardNudgeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (game.lastChain < 1) {
      return;
    }

    const dangerAtMoment = computeBoardDanger(game.board);
    const moment = getHangulMoment(game.lastChain, dangerAtMoment);
    const mergedPoints = game.mergedPositions
      .map((value) => {
        const [rowText, columnText] = value.split(":");
        return {
          row: Number(rowText),
          column: Number(columnText),
        };
      })
      .filter((point) => Number.isFinite(point.row) && Number.isFinite(point.column));

    const avgRow =
      mergedPoints.length > 0
        ? mergedPoints.reduce((sum, point) => sum + point.row, 0) / mergedPoints.length
        : (BOARD_ROWS - 1) / 2;
    const avgColumn =
      mergedPoints.length > 0
        ? mergedPoints.reduce((sum, point) => sum + point.column, 0) / mergedPoints.length
        : (BOARD_COLUMNS - 1) / 2;

    const left = avgColumn * (BOARD_CELL_SIZE + BOARD_GAP_SIZE) + BOARD_CELL_SIZE / 2;
    const top = avgRow * (BOARD_CELL_SIZE + BOARD_GAP_SIZE) + BOARD_CELL_SIZE / 2;

    setChainCallout({
      label: moment.label,
      left,
      top,
      color: moment.color,
      tone: moment.tone,
    });
    showAnnouncer(getAnnouncerTextForMoment(moment.tone, game.lastChain), moment.tone);

    if (chainCalloutTimerRef.current !== null) {
      window.clearTimeout(chainCalloutTimerRef.current);
    }

    chainCalloutTimerRef.current = window.setTimeout(() => {
      setChainCallout(null);
      chainCalloutTimerRef.current = null;
    }, 820);
  }, [game.board, game.lastChain, game.turn]);

  function showAnnouncer(text: string, tone: MomentTone) {
    setAnnouncer({ text, tone });
    if (announcerTimerRef.current !== null) {
      window.clearTimeout(announcerTimerRef.current);
    }

    announcerTimerRef.current = window.setTimeout(() => {
      setAnnouncer(null);
      announcerTimerRef.current = null;
    }, 1350);
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setSelectedColumn((current) => Math.max(0, current - 1));
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        setSelectedColumn((current) => Math.min(BOARD_COLUMNS - 1, current + 1));
      }

      if (event.key === " " || event.key === "Enter" || event.key === "ArrowDown") {
        event.preventDefault();
        handleDrop(selectedColumn);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [game.isGameOver, selectedColumn, dropAnimation]);

  const handleDrop = (column: number) => {
    if (game.isGameOver || dropAnimation) {
      return;
    }

    const targetRow = findDropTargetRow(game.board, column);
    if (targetRow < 0) {
      return;
    }

    setSelectedColumn(column);
    setDropAnimation({
      pieceId: game.currentPiece,
      column,
      targetRow,
    });
    void audioRef.current?.resume();
    audioRef.current?.playDrop();

    if (dropAnimationTimerRef.current !== null) {
      window.clearTimeout(dropAnimationTimerRef.current);
    }

    dropAnimationTimerRef.current = window.setTimeout(() => {
      setGame((current) => {
        const previousMaxTier = findHighestTier(current.board);
        const next = dropPiece(current, column);
        const nextMaxTier = findHighestTier(next.board);

        if (next.lastChain > 0) {
          audioRef.current?.playMerge(next.lastChain);

          if (next.lastChain >= 2) {
            audioRef.current?.playChain(next.lastChain);
          }

          setBoardNudge(true);
          if (boardNudgeTimerRef.current !== null) {
            window.clearTimeout(boardNudgeTimerRef.current);
          }

          boardNudgeTimerRef.current = window.setTimeout(() => {
            setBoardNudge(false);
            boardNudgeTimerRef.current = null;
          }, 180);
        }

        if (nextMaxTier > previousMaxTier) {
          audioRef.current?.playTierUp();
          showAnnouncer("신메뉴 등장!", "hype");
        }

        if (!current.isGameOver && next.isGameOver) {
          audioRef.current?.playGameOver();
          showAnnouncer("앗, 오늘 장사는 여기까지!", "funny");
        }

        return next;
      });
      setDropAnimation(null);
      dropAnimationTimerRef.current = null;
    }, 170);
  };

  const handleRestart = () => {
    if (dropAnimationTimerRef.current !== null) {
      window.clearTimeout(dropAnimationTimerRef.current);
      dropAnimationTimerRef.current = null;
    }

    setDropAnimation(null);
    setSelectedColumn(Math.floor(BOARD_COLUMNS / 2));
    setBoardNudge(false);
    setScorePop(false);
    setRunBestChain(0);
    setGame(restartGame());
    showAnnouncer("다시 오픈! 간식 가게 시작!", "cute");
  };

  const handleMicrowave = () => {
    if (game.isGameOver || game.microwaveUsed || dropAnimation) {
      return;
    }

    void audioRef.current?.resume();
    audioRef.current?.playTierUp();
    setGame((current) => rerollCurrentPiece(current));
    showAnnouncer("전자레인지 찬스! 메뉴 변경!", "funny");
  };

  const handleBoardPointerMove = (event: ReactMouseEvent<HTMLDivElement>) => {
    const bounds = boardAreaRef.current?.getBoundingClientRect();
    if (!bounds) {
      return;
    }

    setCursorPreview({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
      visible: true,
    });

    const gridBounds = boardGridRef.current?.getBoundingClientRect();
    if (gridBounds) {
      const nextGuideX = Math.max(
        0,
        Math.min(gridBounds.width, event.clientX - gridBounds.left),
      );
      setHoverGuideX(nextGuideX);

      const laneWidth = BOARD_CELL_SIZE + BOARD_GAP_SIZE;
      const nextColumn = Math.max(
        0,
        Math.min(BOARD_COLUMNS - 1, Math.floor(nextGuideX / laneWidth)),
      );
      setSelectedColumn(nextColumn);
    }
  };

  const handleBoardPointerLeave = () => {
    setCursorPreview((current) => ({ ...current, visible: false }));
    setHoverGuideX(null);
  };

  const handleBoardGridClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (game.isGameOver || dropAnimation) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const relativeX = event.clientX - bounds.left;
    const laneWidth = BOARD_CELL_SIZE + BOARD_GAP_SIZE;
    const nextColumn = Math.max(
      0,
      Math.min(BOARD_COLUMNS - 1, Math.floor(relativeX / laneWidth)),
    );

    handleDrop(nextColumn);
  };

  const danger = computeBoardDanger(game.board);
  const scoreMood = Math.min(1, game.score / 9000);
  const currentHour = new Date().getHours();
  const isNightMode = currentHour >= 19 || currentHour < 6;
  const boardTopTone = mixHex("#FFF4E7", "#F6DFC9", scoreMood);
  const boardBottomTone = mixHex("#FCE9D4", "#EDC9A8", scoreMood);
  const boardGlow = mixHex("#F6E7A1", "#E7B6A2", (scoreMood + danger) / 2);
  const storefrontGlow = isNightMode ? "rgba(122,155,216,0.45)" : "rgba(255,233,158,0.55)";
  const highestTier = findHighestTier(game.board);
  const highestPiece = PIECE_DEFS[highestTier];

  return (
    <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,280px)]">
      <div className="game-card rounded-[1.5rem] border border-black/8 p-3 sm:p-4">
        <div
          ref={boardAreaRef}
          className="relative mt-1"
          onMouseEnter={handleBoardPointerMove}
          onMouseLeave={handleBoardPointerLeave}
          onMouseMove={handleBoardPointerMove}
        >
          {announcer ? (
            <div
              aria-live="polite"
              className={`announcer-bubble announcer-${announcer.tone}`}
            >
              <span className="announcer-tag">간식 아나운서</span>
              <span>{announcer.text}</span>
            </div>
          ) : null}
          {cursorPreview.visible && !game.isGameOver ? (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute z-20 hidden -translate-y-1/2 md:block"
              style={{
                left: `${cursorPreview.x + 18}px`,
                top: `${cursorPreview.y + 8}px`,
              }}
            >
              <SnackIcon
                alt={PIECE_DEFS[game.currentPiece].name}
                className="h-[70px] w-[70px] drop-shadow-[0_10px_18px_rgba(0,0,0,0.22)]"
                src={PIECE_DEFS[game.currentPiece].iconSrc}
              />
            </div>
          ) : null}

          <div className="seoul-storefront-shell mt-2">
            <div className="seoul-sign-row" aria-hidden="true">
              <span className="seoul-sign-chip seoul-sign-chip-mint">간식상점</span>
              <span className="seoul-sign-chip seoul-sign-chip-coral">야식포차</span>
              <span className="seoul-sign-chip seoul-sign-chip-sky">서울스낵</span>
            </div>
            <div
              className={`overflow-x-auto rounded-[1.35rem] border border-[rgba(198,139,89,0.4)] p-3 ${
                boardNudge ? "board-nudge" : ""
              } seoul-storefront`}
              style={{
                background: `radial-gradient(circle at 12% 6%, ${storefrontGlow} 0%, transparent 28%), radial-gradient(circle at 50% 6%, ${boardGlow}88 0%, transparent 48%), linear-gradient(180deg, ${boardTopTone} 0%, ${boardBottomTone} 100%)`,
              }}
            >
            <div
              ref={boardGridRef}
              className="relative grid cursor-pointer"
              onClick={handleBoardGridClick}
              style={{
                gap: `${BOARD_GAP_SIZE}px`,
                gridTemplateColumns: `repeat(${BOARD_COLUMNS}, ${BOARD_CELL_SIZE}px)`,
                width: `${BOARD_COLUMNS * BOARD_CELL_SIZE + (BOARD_COLUMNS - 1) * BOARD_GAP_SIZE}px`,
              }}
            >
              {hoverGuideX !== null ? (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 z-0 -translate-x-1/2 bg-white/50"
                  style={{
                    left: `${hoverGuideX}px`,
                    width: "20px",
                  }}
                />
              ) : null}
              {chainCallout ? (
                <div
                  aria-hidden="true"
                  className={`chain-callout-pop chain-callout-${chainCallout.tone}`}
                  style={{
                    background: chainCallout.color,
                    left: `${chainCallout.left}px`,
                    top: `${chainCallout.top}px`,
                  }}
                >
                  {chainCallout.label}
                </div>
              ) : null}
              {dropAnimation ? (
                <div
                  aria-hidden="true"
                  className="drop-fx"
                  style={
                    {
                      left: `${dropAnimation.column * (BOARD_CELL_SIZE + BOARD_GAP_SIZE) + BOARD_CELL_SIZE / 2}px`,
                      "--drop-distance": `${
                        dropAnimation.targetRow * (BOARD_CELL_SIZE + BOARD_GAP_SIZE) + BOARD_CELL_SIZE / 2 + 56
                      }px`,
                  } as CSSProperties
                }
              >
                  <SnackIcon
                    alt={PIECE_DEFS[dropAnimation.pieceId].name}
                    className="h-[94px] w-[94px] drop-shadow-[0_10px_18px_rgba(0,0,0,0.18)]"
                    src={PIECE_DEFS[dropAnimation.pieceId].iconSrc}
                  />
                </div>
              ) : null}
              {game.board.map((row, rowIndex) =>
                row.map((cell, columnIndex) => {
                  const piece = cell === null ? null : PIECE_DEFS[cell];
                  const isMergedTile = game.mergedPositions.includes(`${rowIndex}:${columnIndex}`);
                  return (
                    <div
                      key={`${rowIndex}-${columnIndex}`}
                      className={`relative flex items-center justify-center rounded-[12px] bg-[rgba(255,236,215,0.45)] ${
                        isMergedTile ? "merge-glow" : ""
                      }`}
                      style={{ height: `${BOARD_CELL_SIZE}px`, width: `${BOARD_CELL_SIZE}px` }}
                    >
                      {isMergedTile ? (
                        <div aria-hidden="true" className="merge-impact">
                          <span className="merge-impact-star merge-impact-star-1">✦</span>
                          <span className="merge-impact-star merge-impact-star-2">✦</span>
                          <span className="merge-impact-star merge-impact-star-3">✦</span>
                          <span className="merge-impact-star merge-impact-star-4">✦</span>
                          <span className="merge-impact-star merge-impact-star-5">✦</span>
                          <span className="merge-impact-star merge-impact-star-6">✦</span>
                          <span className="merge-impact-star merge-impact-star-7">✦</span>
                          <span className="merge-impact-star merge-impact-star-8">✦</span>
                        </div>
                      ) : null}
                      {piece ? (
                        <div
                          className={`relative z-[1] flex items-center justify-center text-center ${
                            isMergedTile ? "merge-pop" : ""
                          }`}
                          style={{
                            height: `${BOARD_CELL_SIZE}px`,
                            width: `${BOARD_CELL_SIZE}px`,
                          }}
                        >
                          <SnackIcon
                            alt={piece.name}
                            className="h-[94px] w-[94px] drop-shadow-[0_10px_18px_rgba(0,0,0,0.18)]"
                            src={piece.iconSrc}
                          />
                        </div>
                      ) : null}
                    </div>
                  );
                }),
              )}
            </div>
            </div>
          </div>
        </div>
      </div>

      <aside className="game-card flex flex-col gap-4 rounded-[1.5rem] border border-black/8 p-4">
        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--ink-soft)]">
              Session
            </p>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-[999px] border px-2.5 py-1 text-[10px] font-semibold tracking-[0.1em] ${
                  isNightMode
                    ? "border-[rgba(124,138,204,0.35)] bg-[rgba(120,133,199,0.12)] text-[#5f6d9f]"
                    : "border-[rgba(198,139,89,0.38)] bg-[rgba(246,231,161,0.28)] text-[#9f714c]"
                }`}
              >
                {isNightMode ? "밤 포차" : "낮 가게"}
              </span>
              <button
                className="rounded-[999px] border border-black/15 bg-[rgba(34,34,34,0.04)] px-3 py-1 text-[11px] font-semibold tracking-[0.06em] text-[var(--ink)] transition-colors hover:bg-[rgba(34,34,34,0.08)]"
                onClick={() => {
                  const nextEnabled = !audioEnabled;
                  setAudioEnabled(nextEnabled);
                  if (nextEnabled) {
                    void audioRef.current?.resume();
                  }
                }}
                type="button"
              >
                {audioEnabled ? "Sound on" : "Sound off"}
              </button>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <StatCard label="Score" pulse={scorePop} value={formatScore(game.score)} />
            <StatCard label="Best" value={formatScore(bestScore)} />
            <StatCard label="Chain" value={`x${game.lastChain}`} />
            <StatCard label="Moves" value={`${game.turn}`} />
          </div>
        </div>

        <div className="rounded-[1rem] border border-black/8 bg-[var(--panel-strong)] p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
            Current drop
          </p>
          <div className="mt-2 flex items-center gap-2">
            <SnackIcon
              alt={PIECE_DEFS[game.currentPiece].name}
              className="h-[40px] w-[40px] drop-shadow-[0_8px_14px_rgba(0,0,0,0.18)]"
              src={PIECE_DEFS[game.currentPiece].iconSrc}
            />
            <p className="text-sm font-semibold text-[var(--ink)]">{PIECE_DEFS[game.currentPiece].name}</p>
          </div>
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-soft)]">
                Board pressure
              </p>
              <span className="text-[11px] font-semibold text-[var(--ink-soft)]">{Math.round(danger * 100)}%</span>
            </div>
            <div className="h-2 rounded-full bg-[rgba(34,34,34,0.08)]">
              <div
                className="h-2 rounded-full bg-[linear-gradient(90deg,#9fd3b5_0%,#f6c37f_58%,#e89b96_100%)] transition-[width] duration-300"
                style={{ width: `${Math.max(6, danger * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {game.isGameOver ? (
          <section className="receipt-card rounded-[1.2rem] border border-[rgba(62,47,36,0.26)] px-4 py-3">
            <p className="text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-[rgba(62,47,36,0.62)]">
              Snack Receipt
            </p>
            <h3 className="mt-1 text-center text-[18px] font-semibold tracking-[-0.01em] text-[#4a382f]">
              오늘 장사 마감
            </h3>
            <p className="receipt-divider mt-2" />
            <p className="receipt-row">
              <span>총 점수</span>
              <strong>{formatScore(game.score)}</strong>
            </p>
            <p className="receipt-row">
              <span>최고 연쇄</span>
              <strong>x{runBestChain}</strong>
            </p>
            <p className="receipt-row">
              <span>최고 간식</span>
              <strong>{highestPiece?.name ?? "-"}</strong>
            </p>
            <p className="receipt-row">
              <span>전자레인지</span>
              <strong>{game.microwaveUsed ? "사용함" : "미사용"}</strong>
            </p>
            <p className="receipt-divider" />
            <p className="text-center text-xs font-semibold text-[#6a5246]">
              다시 열어서 오늘 기록을 깨보자
            </p>
          </section>
        ) : null}

        <div className="rounded-[1rem] border border-black/8 bg-[var(--panel-strong)] p-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Next up</h2>
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
              Preview {PREVIEW_SIZE}
            </span>
          </div>

          <div className="mt-2 flex items-center gap-2">
            {game.queue.map((pieceId, index) => {
              const piece = PIECE_DEFS[pieceId];
              return (
                <div
                  key={`${piece.id}-${index}`}
                  className="flex h-[54px] w-[54px] items-center justify-center rounded-[0.85rem] border border-black/8 bg-[rgba(34,34,34,0.03)]"
                >
                  <SnackIcon
                    alt={piece.name}
                    className="h-[44px] w-[44px] drop-shadow-[0_6px_10px_rgba(0,0,0,0.14)]"
                    src={piece.iconSrc}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <button
          className="rounded-[10px] border border-[#222222] bg-[#222222] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#111111]"
          onClick={handleRestart}
          type="button"
        >
          Start fresh run
        </button>

        <button
          className="rounded-[10px] border border-[#222222] bg-[#F6E7A1] px-4 py-2.5 text-sm font-semibold text-[#222222] transition-colors hover:bg-[#f1df92] disabled:cursor-not-allowed disabled:opacity-55"
          disabled={game.isGameOver || game.microwaveUsed || Boolean(dropAnimation)}
          onClick={handleMicrowave}
          type="button"
        >
          {game.microwaveUsed ? "Microwave used" : "Microwave reroll"}
        </button>
      </aside>
    </section>
  );
}

function StatCard({ label, pulse, value }: { label: string; pulse?: boolean; value: string }) {
  return (
    <div
      className={`rounded-[0.85rem] border border-black/8 bg-[var(--panel-strong)] px-2.5 py-2 ${
        pulse ? "score-pop" : ""
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
        {label}
      </p>
      <p className="mt-1.5 text-[20px] font-semibold tracking-[-0.03em] text-[var(--ink)]">{value}</p>
    </div>
  );
}

function findDropTargetRow(board: Board, column: number) {
  for (let row = BOARD_ROWS - 1; row >= 0; row -= 1) {
    if (board[row][column] === null) {
      return row;
    }
  }

  return -1;
}

function getHangulMoment(chain: number, danger: number) {
  const intensity = chain >= 4 ? 4 : chain;
  const mood = pickMood(chain, danger);

  if (mood === "cute") {
    if (intensity <= 1) {
      return pick([
        { label: "합체!", color: "#F6E7A1", tone: "cute" as const },
        { label: "뿅!", color: "#F8D9AA", tone: "cute" as const },
        { label: "좋아!", color: "#FCE5B8", tone: "cute" as const },
      ]);
    }

    if (intensity === 2) {
      return pick([
        { label: "연쇄 2배!", color: "#BFD7EA", tone: "cute" as const },
        { label: "찰떡 콤보!", color: "#CFE3C3", tone: "cute" as const },
        { label: "귀염 연쇄!", color: "#CBE7EC", tone: "cute" as const },
      ]);
    }

    if (intensity === 3) {
      return pick([
        { label: "대박 콤보!", color: "#F6B7C3", tone: "cute" as const },
        { label: "연쇄 3배!", color: "#F7C6B5", tone: "cute" as const },
      ]);
    }

    return pick([
      { label: "초대박!", color: "#D9B8FF", tone: "cute" as const },
      { label: `연쇄 ${chain}배!`, color: "#E1C7FF", tone: "cute" as const },
    ]);
  }

  if (mood === "funny") {
    if (intensity <= 1) {
      return pick([
        { label: "어머나!", color: "#F4C095", tone: "funny" as const },
        { label: "와르르!", color: "#F8D9AA", tone: "funny" as const },
        { label: "이게 붙네?", color: "#F6E7A1", tone: "funny" as const },
      ]);
    }

    if (intensity === 2) {
      return pick([
        { label: "연쇄 2배!", color: "#BFD7EA", tone: "funny" as const },
        { label: "웃긴 콤보!", color: "#CBE7EC", tone: "funny" as const },
        { label: "또 붙었다!", color: "#CFE3C3", tone: "funny" as const },
      ]);
    }

    if (intensity === 3) {
      return pick([
        { label: "대박 콤보!", color: "#F7C6B5", tone: "funny" as const },
        { label: "터졌다!", color: "#F2A7B7", tone: "funny" as const },
      ]);
    }

    return pick([
      { label: "초대박!", color: "#D9B8FF", tone: "funny" as const },
      { label: "연쇄 폭발!", color: "#CDB5FF", tone: "funny" as const },
    ]);
  }

  if (intensity <= 1) {
    return pick([
      { label: "합체!", color: "#F6E7A1", tone: "hype" as const },
      { label: "굿!", color: "#F4C095", tone: "hype" as const },
      { label: "밀어붙여!", color: "#F8D9AA", tone: "hype" as const },
    ]);
  }

  if (intensity === 2) {
    return pick([
      { label: "연쇄 2배!", color: "#BFD7EA", tone: "hype" as const },
      { label: "나이스 연쇄!", color: "#CBE7EC", tone: "hype" as const },
      { label: "두 배 콤보!", color: "#CFE3C3", tone: "hype" as const },
    ]);
  }

  if (intensity === 3) {
    return pick([
      { label: "대박 콤보!", color: "#F7C6B5", tone: "hype" as const },
      { label: "연쇄 3배!", color: "#F6B7C3", tone: "hype" as const },
      { label: "터졌다!", color: "#F2A7B7", tone: "hype" as const },
    ]);
  }

  return pick([
    { label: "초대박!", color: "#D9B8FF", tone: "hype" as const },
    { label: "연쇄 폭발!", color: "#CDB5FF", tone: "hype" as const },
    { label: `연쇄 ${chain}배!`, color: "#E1C7FF", tone: "hype" as const },
  ]);
}

function pickMood(chain: number, danger: number): MomentTone {
  if (chain >= 4 || danger > 0.82) {
    return "hype";
  }

  if (chain >= 3 || danger > 0.6) {
    return pick(["hype", "funny"]);
  }

  if (chain === 2) {
    return pick(["cute", "funny", "hype"]);
  }

  return pick(["cute", "funny"]);
}

function getAnnouncerTextForMoment(tone: MomentTone, chain: number) {
  if (tone === "cute") {
    return chain >= 3
      ? pick(["귀여운 연쇄 성공!", "간식 친구들 신났다!"])
      : pick(["좋은 자리야!", "차근차근 잘 쌓였어!"]);
  }

  if (tone === "funny") {
    return chain >= 3
      ? pick(["어라? 이게 이렇게 붙네!", "사장님도 놀란 콤보!"])
      : pick(["잠깐, 방금 본 거 맞지?", "오늘 손맛 미쳤다!"]);
  }

  return chain >= 3
    ? pick(["지금이 기회야, 더 몰아쳐!", "연쇄 텐션 최고조!"])
    : pick(["좋아, 리듬 탔다!", "쭉 밀어붙여!"]);
}

function pick<T>(values: T[]) {
  return values[Math.floor(Math.random() * values.length)] ?? values[0];
}

function findHighestTier(board: Board) {
  let highest = 0;

  for (const row of board) {
    for (const cell of row) {
      if (cell !== null && cell > highest) {
        highest = cell;
      }
    }
  }

  return highest;
}

function computeBoardDanger(board: Board) {
  let topMostRow = BOARD_ROWS;
  let occupied = 0;

  for (let row = 0; row < BOARD_ROWS; row += 1) {
    for (let column = 0; column < BOARD_COLUMNS; column += 1) {
      if (board[row][column] !== null) {
        topMostRow = Math.min(topMostRow, row);
        occupied += 1;
      }
    }
  }

  if (occupied === 0) {
    return 0;
  }

  const heightPressure = 1 - topMostRow / (BOARD_ROWS - 1);
  const fillPressure = occupied / (BOARD_ROWS * BOARD_COLUMNS);
  return Math.min(1, heightPressure * 0.72 + fillPressure * 0.28);
}

function mixHex(from: string, to: string, amount: number) {
  const alpha = Math.min(1, Math.max(0, amount));
  const fromRgb = hexToRgb(from);
  const toRgb = hexToRgb(to);
  const red = Math.round(fromRgb.r + (toRgb.r - fromRgb.r) * alpha);
  const green = Math.round(fromRgb.g + (toRgb.g - fromRgb.g) * alpha);
  const blue = Math.round(fromRgb.b + (toRgb.b - fromRgb.b) * alpha);
  return `rgb(${red}, ${green}, ${blue})`;
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const safe = normalized.length === 3
    ? normalized
        .split("")
        .map((char) => `${char}${char}`)
        .join("")
    : normalized;

  const parsed = Number.parseInt(safe, 16);
  return {
    b: parsed & 255,
    g: (parsed >> 8) & 255,
    r: (parsed >> 16) & 255,
  };
}
