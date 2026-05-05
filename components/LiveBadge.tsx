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
    <section className="space-y-3 rounded-[24px] border-2 border-black bg-white p-4 shadow-pop">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 rounded-full border-2 border-black bg-black px-3 py-1 text-xs font-bold text-white">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-shuiro animate-live-blink" />
            LIVE
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-black/40">
              Room {roomId}
            </p>
            <p className="text-sm font-semibold text-black">{statusLabel}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onShareRoom}
          className="rounded-full border-2 border-black bg-washi px-3 py-2 text-xs font-bold text-black shadow-pop-sm"
        >
          URL共有
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {participants.map((participant) => (
          <span
            key={participant}
            className="rounded-full border-2 border-black bg-cream px-3 py-1 text-xs font-semibold text-black shadow-pop-sm"
          >
            {participant}
          </span>
        ))}
      </div>

      <p className="text-xs text-black/60">{shareLabel}</p>
    </section>
  );
}
