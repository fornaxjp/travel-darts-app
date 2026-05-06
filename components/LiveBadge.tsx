type LiveBadgeProps = {
  roomId: string;
  participants: string[];
  statusLabel: string;
  onShareRoom: () => void;
  shareLabel: string;
};

export function LiveBadge({
  roomId,
  participants,
  statusLabel,
  onShareRoom,
  shareLabel,
}: LiveBadgeProps) {
  return (
    <section className="space-y-4 rounded-[26px] border border-black/10 bg-white/90 p-4 shadow-soft">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex items-center gap-2 rounded-full border border-shuiro/15 bg-shuiro/10 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-shuiro">
            <span className="inline-block h-2 w-2 rounded-full bg-shuiro animate-live-blink" />
            LIVE
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-black/40">
              Room {roomId}
            </p>
            <p className="mt-1 text-sm text-black/80">{statusLabel}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onShareRoom}
          className="rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-medium text-black/70 shadow-soft transition hover:-translate-y-0.5"
        >
          URL共有
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {participants.map((participant) => (
          <span
            key={participant}
            className="rounded-full border border-black/10 bg-[#faf6ef] px-3 py-1 text-xs font-medium text-black/70"
          >
            {participant}
          </span>
        ))}
      </div>

      <p className="text-xs leading-6 text-black/60">{shareLabel}</p>
    </section>
  );
}
