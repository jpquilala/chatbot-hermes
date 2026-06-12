"use client";

type SuggestedChipProps = {
  children: string;
  onClick?: (value: string) => void;
};

export function SuggestedChip({ children, onClick }: SuggestedChipProps) {
  return (
    <button
      type="button"
      onClick={() => onClick?.(children)}
      className="rounded-full border border-white/10 bg-white/[.06] px-4 py-2 text-left text-sm text-white/78 transition hover:border-court-gold/60 hover:bg-court-gold/12 hover:text-court-gold"
    >
      {children}
    </button>
  );
}
