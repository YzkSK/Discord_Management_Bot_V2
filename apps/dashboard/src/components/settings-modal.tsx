"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

export function SettingsModal({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 pt-16"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="mx-4 w-full max-w-lg rounded-lg bg-[#2b2d31] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-end border-b border-[#1e1f22] px-4 py-2.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-[#80848e] hover:text-[#dbdee1] transition-colors"
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
