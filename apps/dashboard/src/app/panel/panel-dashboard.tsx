"use client";

import { useEffect, useState, type FormEvent } from "react";
import { BookOpen, Mic2, Users } from "lucide-react";

import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { ErrorAlert } from "../../components/error-alert";

interface SpeakerSetting {
  speakerId: number;
}

interface DictionaryEntry {
  fromText: string;
  toText: string;
  priority: number;
  isEnabled: boolean;
  scope: string;
  userId: string | null;
}

export function PanelDashboard({ guildId }: { guildId: string }) {
  return (
    <div className="grid max-w-4xl gap-6">
      <SpeakerPanel guildId={guildId} />
      <DictionaryPanel guildId={guildId} />
      <RecruitmentPanel guildId={guildId} />
    </div>
  );
}

function SpeakerPanel({ guildId }: { guildId: string }) {
  const [setting, setSetting] = useState<SpeakerSetting | null>(null);
  const [loading, setLoading] = useState(true);
  const [speakerIdInput, setSpeakerIdInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/panel/speaker?guildId=${guildId}`)
      .then((r) => r.json() as Promise<{ setting: SpeakerSetting | null }>)
      .then((data) => {
        setSetting(data.setting);
        if (data.setting) {
          setSpeakerIdInput(String(data.setting.speakerId));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [guildId]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    const speakerId = parseInt(speakerIdInput, 10);
    if (!Number.isFinite(speakerId) || speakerId < 0) {
      setMessage({ type: "err", text: "スピーカーIDは0以上の整数で入力してください。" });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/panel/speaker", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ guildId, speakerId })
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setMessage({ type: "err", text: data.error ?? "保存に失敗しました。" });
        return;
      }
      const data = await res.json() as { setting: SpeakerSetting };
      setSetting(data.setting);
      setMessage({ type: "ok", text: "✅ 話者を変更しました。" });
    } catch {
      setMessage({ type: "err", text: "通信エラーが発生しました。" });
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    setSaving(true);
    setMessage(null);
    try {
      await fetch("/api/panel/speaker", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ guildId })
      });
      setSetting(null);
      setSpeakerIdInput("");
      setMessage({ type: "ok", text: "✅ 個人設定をリセットしました。サーバーデフォルトが使用されます。" });
    } catch {
      setMessage({ type: "err", text: "通信エラーが発生しました。" });
    } finally {
      setSaving(false);
    }
  }

  async function handlePreview() {
    const speakerId = parseInt(speakerIdInput, 10);
    if (!Number.isFinite(speakerId) || speakerId < 0) return;
    const res = await fetch(`/api/tts/preview?speakerId=${speakerId}`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    void audio.play();
  }

  return (
    <Card className="border-zinc-800 bg-zinc-900">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <Mic2 className="h-4 w-4 text-green-400" />
          TTS 話者設定
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-zinc-500">読み込み中...</p>
        ) : (
          <form onSubmit={(e) => void handleSave(e)} className="flex flex-col gap-3">
            <p className="text-xs text-zinc-500">
              現在の設定:{" "}
              <span className="font-mono text-zinc-300">
                {setting ? `ID ${setting.speakerId}` : "サーバーデフォルト"}
              </span>
            </p>
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                value={speakerIdInput}
                onChange={(e) => setSpeakerIdInput(e.target.value)}
                placeholder="スピーカーID"
                className="w-36 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-green-500 focus:outline-none"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handlePreview()}
                disabled={!speakerIdInput}
              >
                試聴
              </Button>
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? "保存中..." : "変更"}
              </Button>
              {setting && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleClear()}
                  disabled={saving}
                >
                  リセット
                </Button>
              )}
            </div>
            {message && (
              <p
                className={`text-xs ${message.type === "ok" ? "text-green-400" : "text-red-400"}`}
              >
                {message.text}
              </p>
            )}
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function DictionaryPanel({ guildId }: { guildId: string }) {
  const [entries, setEntries] = useState<DictionaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromText, setFromText] = useState("");
  const [toText, setToText] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  function loadEntries() {
    setLoading(true);
    fetch(`/api/panel/dictionary?guildId=${guildId}`)
      .then((r) => r.json() as Promise<{ entries: DictionaryEntry[] }>)
      .then((data) => setEntries(data.entries ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guildId]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!fromText.trim() || !toText.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/panel/dictionary", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ guildId, fromText: fromText.trim(), toText: toText.trim() })
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setMessage({ type: "err", text: data.error ?? "登録に失敗しました。" });
        return;
      }
      setFromText("");
      setToText("");
      setMessage({ type: "ok", text: "✅ 登録しました。" });
      loadEntries();
    } catch {
      setMessage({ type: "err", text: "通信エラーが発生しました。" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(from: string) {
    try {
      await fetch("/api/panel/dictionary", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ guildId, fromText: from })
      });
      loadEntries();
    } catch {
      setMessage({ type: "err", text: "削除に失敗しました。" });
    }
  }

  return (
    <Card className="border-zinc-800 bg-zinc-900">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <BookOpen className="h-4 w-4 text-green-400" />
          辞書登録（個人）
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form onSubmit={(e) => void handleAdd(e)} className="flex flex-wrap gap-2">
          <input
            type="text"
            value={fromText}
            onChange={(e) => setFromText(e.target.value)}
            placeholder="変換前"
            className="w-36 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-green-500 focus:outline-none"
          />
          <span className="self-center text-zinc-500">→</span>
          <input
            type="text"
            value={toText}
            onChange={(e) => setToText(e.target.value)}
            placeholder="変換後"
            className="w-36 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-green-500 focus:outline-none"
          />
          <Button type="submit" size="sm" disabled={saving || !fromText.trim() || !toText.trim()}>
            {saving ? "登録中..." : "追加"}
          </Button>
        </form>
        {message && (
          <p className={`text-xs ${message.type === "ok" ? "text-green-400" : "text-red-400"}`}>
            {message.text}
          </p>
        )}
        {loading ? (
          <p className="text-sm text-zinc-500">読み込み中...</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-zinc-500">登録された辞書エントリはありません。</p>
        ) : (
          <div className="rounded-md border border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500">
                  <th className="px-3 py-2">変換前</th>
                  <th className="px-3 py-2">変換後</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.fromText} className="border-b border-zinc-800/50 last:border-0">
                    <td className="px-3 py-2 font-mono text-zinc-300">{entry.fromText}</td>
                    <td className="px-3 py-2 font-mono text-zinc-300">{entry.toText}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => void handleDelete(entry.fromText)}
                        className="text-xs text-zinc-500 hover:text-red-400"
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RecruitmentPanel({ guildId }: { guildId: string }) {
  const [genre, setGenre] = useState("");
  const [capacity, setCapacity] = useState("4");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const cap = parseInt(capacity, 10);
    if (!genre.trim() || !content.trim() || !Number.isFinite(cap) || cap < 1 || cap > 99) {
      setMessage({ type: "err", text: "全項目を正しく入力してください（定員: 1〜99）。" });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/panel/recruitment", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ guildId, genre: genre.trim(), capacity: cap, content: content.trim() })
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setMessage({ type: "err", text: data.error ?? "作成に失敗しました。" });
        return;
      }
      setGenre("");
      setCapacity("4");
      setContent("");
      setMessage({ type: "ok", text: "✅ 募集を作成しました。" });
    } catch {
      setMessage({ type: "err", text: "通信エラーが発生しました。" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="border-zinc-800 bg-zinc-900">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <Users className="h-4 w-4 text-green-400" />
          募集作成
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-zinc-400">タイトル（最大80文字）</label>
            <input
              type="text"
              maxLength={80}
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              placeholder="例: 原神　螺旋12層"
              className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-green-500 focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-zinc-400">定員（1〜99）</label>
            <input
              type="number"
              min={1}
              max={99}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className="w-24 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-100 focus:border-green-500 focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-zinc-400">内容（最大1000文字）</label>
            <textarea
              maxLength={1000}
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="募集の説明を入力..."
              className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-green-500 focus:outline-none"
            />
          </div>
          {message && (
            <p className={`text-xs ${message.type === "ok" ? "text-green-400" : "text-red-400"}`}>
              {message.text}
            </p>
          )}
          <div>
            <Button
              type="submit"
              size="sm"
              disabled={submitting || !genre.trim() || !content.trim()}
            >
              {submitting ? "作成中..." : "募集を作成"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
