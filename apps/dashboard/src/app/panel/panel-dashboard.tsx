"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { BookOpen, Mic2, Users } from "lucide-react";

import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

interface VoicevoxSpeaker {
  id: number;
  label: string;
}

interface SpeakerSetting {
  speakerId: number;
}

interface DictionaryEntry {
  fromText: string;
  toText: string;
}

interface DiscordChannel {
  id: string;
  name: string;
}

type Feedback = { type: "ok" | "err"; text: string } | null;

const input =
  "w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-green-500 focus:outline-none";

const label = "text-xs font-medium text-zinc-400";

function FeedbackLine({ msg }: { msg: Feedback }) {
  if (!msg) return null;
  return (
    <p className={`text-xs ${msg.type === "ok" ? "text-green-400" : "text-red-400"}`}>
      {msg.text}
    </p>
  );
}

function Field({ labelText, children }: { labelText: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <p className={label}>{labelText}</p>
      {children}
    </div>
  );
}

export function PanelDashboard({ guildId }: { guildId: string }) {
  return (
    <div className="flex flex-col gap-4">
      <SpeakerPanel guildId={guildId} />
      <DictionaryPanel guildId={guildId} />
      <RecruitmentPanel guildId={guildId} />
    </div>
  );
}

function SpeakerPanel({ guildId }: { guildId: string }) {
  const [setting, setSetting] = useState<SpeakerSetting | null>(null);
  const [speakers, setSpeakers] = useState<VoicevoxSpeaker[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<Feedback>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/panel/speaker?guildId=${guildId}`).then(
        (r) => r.json() as Promise<{ setting: SpeakerSetting | null }>
      ),
      fetch(`/api/panel/speakers?guildId=${guildId}`).then(
        (r) => r.json() as Promise<{ speakers: VoicevoxSpeaker[] }>
      )
    ])
      .then(([settingData, speakersData]) => {
        const list = speakersData.speakers ?? [];
        setSpeakers(list);
        setSetting(settingData.setting);
        if (settingData.setting) {
          setSelectedId(String(settingData.setting.speakerId));
        } else {
          const first = list[0];
          if (first) setSelectedId(String(first.id));
        }
      })
      .catch(() => setMsg({ type: "err", text: "データの読み込みに失敗しました。" }))
      .finally(() => setLoading(false));
  }, [guildId]);

  function currentLabel() {
    if (!setting) return "サーバーデフォルト";
    const found = speakers.find((s) => s.id === setting.speakerId);
    return found ? found.label : `ID ${setting.speakerId}`;
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    const speakerId = parseInt(selectedId, 10);
    if (!Number.isFinite(speakerId) || speakerId < 0) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/panel/speaker", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ guildId, speakerId })
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setMsg({ type: "err", text: data.error ?? "保存に失敗しました。" });
        return;
      }
      const data = (await res.json()) as { setting: SpeakerSetting };
      setSetting(data.setting);
      setMsg({ type: "ok", text: "話者を変更しました。" });
    } catch {
      setMsg({ type: "err", text: "通信エラーが発生しました。" });
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    setSaving(true);
    setMsg(null);
    try {
      await fetch("/api/panel/speaker", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ guildId })
      });
      setSetting(null);
      const first = speakers[0];
      if (first) setSelectedId(String(first.id));
      setMsg({ type: "ok", text: "個人設定をリセットしました。サーバーデフォルトが使用されます。" });
    } catch {
      setMsg({ type: "err", text: "通信エラーが発生しました。" });
    } finally {
      setSaving(false);
    }
  }

  async function handlePreview() {
    if (!selectedId) return;
    const res = await fetch(`/api/tts/preview?speakerId=${selectedId}`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    new Audio(url).play();
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
            <p className={label}>
              現在の設定:{" "}
              <span className="text-zinc-300">{currentLabel()}</span>
            </p>
            <Field labelText="話者を選択">
              {speakers.length > 0 ? (
                <select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className={input}
                >
                  {speakers.map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      {s.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="number"
                  min={0}
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  placeholder="スピーカーID"
                  className={input}
                />
              )}
            </Field>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handlePreview()}
                disabled={!selectedId}
              >
                試聴
              </Button>
              <Button type="submit" size="sm" disabled={saving || !selectedId}>
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
            <FeedbackLine msg={msg} />
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
  const [msg, setMsg] = useState<Feedback>(null);

  const loadEntries = useCallback(() => {
    setLoading(true);
    fetch(`/api/panel/dictionary?guildId=${guildId}`)
      .then((r) => r.json() as Promise<{ entries: DictionaryEntry[] }>)
      .then((data) => setEntries(data.entries ?? []))
      .catch(() => setMsg({ type: "err", text: "データの読み込みに失敗しました。" }))
      .finally(() => setLoading(false));
  }, [guildId]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!fromText.trim() || !toText.trim()) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/panel/dictionary", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ guildId, fromText: fromText.trim(), toText: toText.trim() })
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setMsg({ type: "err", text: data.error ?? "登録に失敗しました。" });
        return;
      }
      setFromText("");
      setToText("");
      setMsg({ type: "ok", text: "登録しました。" });
      loadEntries();
    } catch {
      setMsg({ type: "err", text: "通信エラーが発生しました。" });
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
      setMsg({ type: "err", text: "削除に失敗しました。" });
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
        <form onSubmit={(e) => void handleAdd(e)} className="flex flex-col gap-3">
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
            <Field labelText="変換前">
              <input
                type="text"
                value={fromText}
                onChange={(e) => setFromText(e.target.value)}
                placeholder="例: ほげ"
                className={input}
              />
            </Field>
            <span className="pb-1.5 text-zinc-500">→</span>
            <Field labelText="変換後">
              <input
                type="text"
                value={toText}
                onChange={(e) => setToText(e.target.value)}
                placeholder="例: ほうげい"
                className={input}
              />
            </Field>
          </div>
          <div className="flex gap-2">
            <Button
              type="submit"
              size="sm"
              disabled={saving || !fromText.trim() || !toText.trim()}
            >
              {saving ? "登録中..." : "追加"}
            </Button>
          </div>
          <FeedbackLine msg={msg} />
        </form>

        {loading ? (
          <p className="text-sm text-zinc-500">読み込み中...</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-zinc-500">登録された辞書エントリはありません。</p>
        ) : (
          <div className="rounded-md border border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-left">
                  <th className="px-3 py-2 text-xs font-medium text-zinc-500">変換前</th>
                  <th className="px-3 py-2 text-xs font-medium text-zinc-500">変換後</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr
                    key={entry.fromText}
                    className="border-b border-zinc-800/50 last:border-0"
                  >
                    <td className="px-3 py-2 font-mono text-sm text-zinc-300">
                      {entry.fromText}
                    </td>
                    <td className="px-3 py-2 font-mono text-sm text-zinc-300">
                      {entry.toText}
                    </td>
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
  const [configChannelId, setConfigChannelId] = useState<string | null>(null);
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState("");
  const [configLoading, setConfigLoading] = useState(true);

  const [genre, setGenre] = useState("");
  const [capacity, setCapacity] = useState("4");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<Feedback>(null);

  useEffect(() => {
    setConfigLoading(true);
    fetch(`/api/panel/recruitment?guildId=${guildId}`)
      .then(
        (r) =>
          r.json() as Promise<{
            channelId: string | null;
            channels: DiscordChannel[] | null;
          }>
      )
      .then((data) => {
        setConfigChannelId(data.channelId);
        const list = data.channels ?? [];
        setChannels(list);
        const firstCh = list[0];
        if (firstCh) setSelectedChannelId(firstCh.id);
      })
      .catch(() => setMsg({ type: "err", text: "データの読み込みに失敗しました。" }))
      .finally(() => setConfigLoading(false));
  }, [guildId]);

  const needsChannelPicker = !configChannelId;
  const canSubmit =
    genre.trim() &&
    content.trim() &&
    (!needsChannelPicker || selectedChannelId);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const cap = parseInt(capacity, 10);
    if (!genre.trim() || !content.trim() || !Number.isFinite(cap) || cap < 1 || cap > 99) {
      setMsg({ type: "err", text: "全項目を正しく入力してください（定員: 1〜99）。" });
      return;
    }
    if (needsChannelPicker && !selectedChannelId) {
      setMsg({ type: "err", text: "投稿先チャンネルを選択してください。" });
      return;
    }
    setSubmitting(true);
    setMsg(null);
    try {
      const body: Record<string, unknown> = {
        guildId,
        genre: genre.trim(),
        capacity: cap,
        content: content.trim()
      };
      if (needsChannelPicker) body.channelId = selectedChannelId;

      const res = await fetch("/api/panel/recruitment", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMsg({ type: "err", text: data.error ?? "作成に失敗しました。" });
        return;
      }
      setGenre("");
      setCapacity("4");
      setContent("");
      setMsg({ type: "ok", text: "募集を作成しました。" });
    } catch {
      setMsg({ type: "err", text: "通信エラーが発生しました。" });
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
        {configLoading ? (
          <p className="text-sm text-zinc-500">読み込み中...</p>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3">
            {needsChannelPicker && (
              <Field labelText="投稿先チャンネル">
                {channels.length > 0 ? (
                  <select
                    value={selectedChannelId}
                    onChange={(e) => setSelectedChannelId(e.target.value)}
                    className={input}
                  >
                    {channels.map((c) => (
                      <option key={c.id} value={c.id}>
                        # {c.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-red-400">
                    チャンネル一覧を取得できませんでした。サーバー設定から募集チャンネルを設定してください。
                  </p>
                )}
              </Field>
            )}
            <Field labelText="タイトル（最大80文字）">
              <input
                type="text"
                maxLength={80}
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                placeholder="例: 原神　螺旋12層"
                className={input}
              />
            </Field>
            <Field labelText="定員（1〜99）">
              <input
                type="number"
                min={1}
                max={99}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className={`${input} w-24`}
              />
            </Field>
            <Field labelText="内容（最大1000文字）">
              <textarea
                maxLength={1000}
                rows={3}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="募集の説明を入力..."
                className={input}
              />
            </Field>
            <FeedbackLine msg={msg} />
            <div>
              <Button type="submit" size="sm" disabled={submitting || !canSubmit}>
                {submitting ? "作成中..." : "募集を作成"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
