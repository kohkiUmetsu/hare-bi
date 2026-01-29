import { RealtimeLoadingNote } from "./_components/realtime-loading-note";

export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div role="status" aria-live="polite" className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-3">
          <svg
            className="h-8 w-8 animate-spin text-[var(--accent-color)]"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="4" />
            <rect x="11" y="2" width="2" height="4" rx="1" />
            <rect x="11" y="18" width="2" height="4" rx="1" />
            <rect x="2" y="11" width="4" height="2" rx="1" />
            <rect x="18" y="11" width="4" height="2" rx="1" />
            <rect x="4.22" y="4.22" width="2" height="4" rx="1" transform="rotate(-45 5.22 6.22)" />
            <rect x="17.78" y="15.78" width="2" height="4" rx="1" transform="rotate(-45 18.78 17.78)" />
            <rect x="15.78" y="4.22" width="2" height="4" rx="1" transform="rotate(45 16.78 6.22)" />
            <rect x="4.22" y="15.78" width="2" height="4" rx="1" transform="rotate(45 5.22 17.78)" />
          </svg>
          <span className="text-sm text-neutral-600">Loading...</span>
        </div>
        <RealtimeLoadingNote />
      </div>
    </div>
  );
}
