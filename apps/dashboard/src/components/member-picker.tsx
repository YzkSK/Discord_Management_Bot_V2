"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "../lib/utils";

interface Member {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string;
}

interface MemberPickerProps {
  guildId: string;
  value: string;
  onChange: (userId: string) => void;
  placeholder?: string;
}

export function MemberPicker({ guildId, value, onChange, placeholder }: MemberPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Member[]>([]);
  const [selected, setSelected] = useState<Member | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear selection when value is reset externally
  useEffect(() => {
    if (!value) {
      setSelected(null);
      setQuery("");
    }
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleInput(q: string) {
    setQuery(q);
    setSelected(null);
    onChange("");
    setOpen(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) { setResults([]); return; }

    debounceRef.current = setTimeout(() => {
      setLoading(true);
      fetch(`/api/discord/guilds/${guildId}/members?q=${encodeURIComponent(q)}`)
        .then((r) => (r.ok ? r.json() : { members: [] }))
        .then((data: { members: Member[] }) => setResults(data.members))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 300);
  }

  function handleSelect(member: Member) {
    setSelected(member);
    setQuery("");
    onChange(member.id);
    setOpen(false);
    setResults([]);
  }

  return (
    <div ref={containerRef} className="relative">
      <div className={cn(
        "flex h-8 w-full items-center gap-2 rounded-md border border-[#3f4147] bg-[#1e1f22] px-2 text-sm text-[#dbdee1] transition-colors focus-within:border-[#5865f2]/60 focus-within:ring-1 focus-within:ring-[#5865f2]/30"
      )}>
        {selected ? (
          <>
            <img src={selected.avatarUrl} alt="" className="h-4 w-4 shrink-0 rounded-full" width={16} height={16} />
            <span className="min-w-0 flex-1 truncate">{selected.displayName}</span>
            <button
              type="button"
              onClick={() => { setSelected(null); onChange(""); setQuery(""); }}
              className="shrink-0 text-[#80848e] hover:text-[#dbdee1]"
              aria-label="選択を解除"
            >
              ×
            </button>
          </>
        ) : (
          <input
            className="flex-1 bg-transparent outline-none placeholder:text-[#80848e]"
            value={query}
            onChange={(e) => handleInput(e.target.value)}
            onFocus={() => query && setOpen(true)}
            placeholder={placeholder ?? "名前で検索..."}
          />
        )}
      </div>

      {open && (results.length > 0 || loading) && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-[#3f4147] bg-[#2b2d31] py-1 shadow-xl">
          {loading ? (
            <div className="px-3 py-2 text-xs text-[#80848e]">検索中...</div>
          ) : results.map((m) => (
            <button
              key={m.id}
              type="button"
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-[#3f4147]"
              onMouseDown={(e) => { e.preventDefault(); handleSelect(m); }}
            >
              <img src={m.avatarUrl} alt="" className="h-6 w-6 shrink-0 rounded-full" width={24} height={24} />
              <span className="min-w-0 flex-1 truncate text-sm text-[#dbdee1]">{m.displayName}</span>
              <span className="shrink-0 text-xs text-[#80848e]">@{m.username}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
