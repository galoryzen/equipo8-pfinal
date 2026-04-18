import { useEffect, useState } from 'react';

/**
 * Derives a live countdown from an ISO timestamp served by the backend. The
 * server is the source of truth — we only render what `hold_expires_at` says.
 */
export interface CountdownResult {
  remainingMs: number;
  expired: boolean;
  /** "mm:ss" format, "00:00" once expired. */
  label: string;
}

function computeRemaining(expiresAtIso: string | null | undefined): number {
  if (!expiresAtIso) return 0;
  const iso = expiresAtIso.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(expiresAtIso)
    ? expiresAtIso
    : `${expiresAtIso}Z`; // backend stores naive UTC — normalize to Z so JS parses as UTC
  const ms = new Date(iso).getTime() - Date.now();
  return ms > 0 ? ms : 0;
}

function formatLabel(ms: number): string {
  if (ms <= 0) return '00:00';
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function useCountdown(expiresAtIso: string | null | undefined): CountdownResult {
  const [remainingMs, setRemainingMs] = useState<number>(() => computeRemaining(expiresAtIso));

  useEffect(() => {
    // Recompute immediately when the expires-at changes (e.g. cart switched).
    setRemainingMs(computeRemaining(expiresAtIso));
    if (!expiresAtIso) return;
    const id = setInterval(() => {
      setRemainingMs(computeRemaining(expiresAtIso));
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAtIso]);

  return {
    remainingMs,
    expired: remainingMs <= 0,
    label: formatLabel(remainingMs),
  };
}
