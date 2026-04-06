import { GameBoard } from "@/components/game-board";
import { SnackIcon } from "@/components/snack-icon";
import { PIECE_DEFS } from "@/game/content/theme";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <GameBoard />

        <section className="game-card rounded-[1.5rem] border border-black/8 p-5 sm:p-6">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--ink-soft)]">
                Merge Ladder
              </p>
              <h2 className="headline-font mt-2 text-[28px] font-semibold tracking-[-0.03em] text-[var(--ink)]">
                Snack Evolution Path
              </h2>
            </div>
            <p className="text-sm text-[var(--ink-soft)]">12 tiers</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {PIECE_DEFS.map((piece, index) => (
              <article
                key={piece.id}
                className="flex items-center gap-4 rounded-[1rem] border border-black/8 bg-[var(--panel-strong)] p-4"
              >
                <SnackIcon
                  alt={piece.name}
                  className="h-16 w-16 drop-shadow-[0_8px_18px_rgba(0,0,0,0.14)]"
                  src={piece.iconSrc}
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
                    Tier {index + 1}
                  </p>
                  <p className="truncate text-lg font-bold text-[var(--ink)]">{piece.name}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
