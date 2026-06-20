"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";

export function SettingsModal({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-16"
      onClick={onClose}
    >
      <div
        className="mx-4 w-full max-w-lg rounded-lg border border-zinc-800 bg-zinc-900 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-end border-b border-zinc-800 px-4 py-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-zinc-400 hover:text-zinc-200"
            aria-label="閉じる"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
