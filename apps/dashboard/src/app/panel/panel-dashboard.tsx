"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { BookOpen, Mic2, Users } from "lucide-react";

import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";

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

const input =
  "w-full rounded-md border border-[#3f4147] bg-[#383a40] px-3 py-1.5 text-sm text-[#f2f3f5] placeholder-[#4e5058] focus:border-[#5865f2] focus:outline-none";

const label = "text-xs font-medium text-[#80848e]";

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
      .catch(() => toast.error("データの読み込みに失敗しました。"))
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
    try {
      const res = await fetch("/api/panel/speaker", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ guildId, speakerId })
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? "保存に失敗しました。");
        return;
      }
      const data = (await res.json()) as { setting: SpeakerSetting };
      setSetting(data.setting);
      toast.success("話者を変更しました。");
    } catch {
      toast.error("通信エラーが発生しました。");
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    setSaving(true);
    try {
      await fetch("/api/panel/speaker", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ guildId })
      });
      setSetting(null);
      const first = speakers[0];
      if (first) setSelectedId(String(first.id));
      toast.success("個人設定をリセットしました。サーバーデフォルトが使用されます。");
    } catch {
      toast.error("通信エラーが発生しました。");
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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-[#f2f3f5]">
          <Mic2 className="h-4 w-4 text-[#c9cdfb]" />
          TTS 話者設定
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-[#80848e]">読み込み中...</p>
        ) : (
          <form onSubmit={(e) => void handleSave(e)} className="flex flex-col gap-3">
            <p className={label}>
              現在の設定:{" "}
              <span className="text-[#dbdee1]">{currentLabel()}</span>
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
  const [pendingDeleteFrom, setPendingDeleteFrom] = useState<string | null>(null);

  const loadEntries = useCallback(() => {
    setLoading(true);
    fetch(`/api/panel/dictionary?guildId=${guildId}`)
      .then((r) => r.json() as Promise<{ entries: DictionaryEntry[] }>)
      .then((data) => setEntries(data.entries ?? []))
      .catch(() => toast.error("データの読み込みに失敗しました。"))
      .finally(() => setLoading(false));
  }, [guildId]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!fromText.trim() || !toText.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/panel/dictionary", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ guildId, fromText: fromText.trim(), toText: toText.trim() })
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? "登録に失敗しました。");
        return;
      }
      setFromText("");
      setToText("");
      toast.success("登録しました。");
      loadEntries();
    } catch {
      toast.error("通信エラーが発生しました。");
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
      toast.error("削除に失敗しました。");
    }
  }

  return (
    <>
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-[#f2f3f5]">
          <BookOpen className="h-4 w-4 text-[#c9cdfb]" />
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
            <span className="pb-1.5 text-[#80848e]">→</span>
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
        </form>

        {loading ? (
          <p className="text-sm text-[#80848e]">読み込み中...</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-[#80848e]">登録された辞書エントリはありません。</p>
        ) : (
          <div className="rounded-md border border-[#1e1f22]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1e1f22] text-left">
                  <th className="px-3 py-2 text-xs font-medium text-[#80848e]">変換前</th>
                  <th className="px-3 py-2 text-xs font-medium text-[#80848e]">変換後</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr
                    key={entry.fromText}
                    className="border-b border-[#1e1f22]/50 last:border-0"
                  >
                    <td className="px-3 py-2 font-mono text-sm text-[#dbdee1]">
                      {entry.fromText}
                    </td>
                    <td className="px-3 py-2 font-mono text-sm text-[#dbdee1]">
                      {entry.toText}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => setPendingDeleteFrom(entry.fromText)}
                        className="text-xs text-[#80848e] hover:text-red-400"
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

    {pendingDeleteFrom && (
      <ConfirmDialog
        title="辞書エントリを削除しますか？"
        description={`「${pendingDeleteFrom}」の変換ルールを削除します。`}
        onConfirm={() => {
          void handleDelete(pendingDeleteFrom);
          setPendingDeleteFrom(null);
        }}
        onCancel={() => setPendingDeleteFrom(null)}
      />
    )}
    </>
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
  const [deadlineDays, setDeadlineDays] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      .catch(() => toast.error("データの読み込みに失敗しました。"))
      .finally(() => setConfigLoading(false));
  }, [guildId]);

  const needsChannelPicker = !configChannelId;
  const capacityNum = parseInt(capacity, 10);
  const capacityInvalid = capacity !== "" && (isNaN(capacityNum) || capacityNum < 1 || capacityNum > 99);
  const deadlineDaysNum = parseInt(deadlineDays, 10);
  const deadlineDaysInvalid = deadlineDays.trim() !== "" && (isNaN(deadlineDaysNum) || deadlineDaysNum < 1 || deadlineDaysNum > 30);

  const canSubmit =
    genre.trim() &&
    content.trim() &&
    !capacityInvalid &&
    !deadlineDaysInvalid &&
    (!needsChannelPicker || selectedChannelId);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const cap = parseInt(capacity, 10);
    if (!genre.trim() || !content.trim() || !Number.isFinite(cap) || cap < 1 || cap > 99) {
      toast.error("全項目を正しく入力してください（定員: 1〜99）。");
      return;
    }
    if (needsChannelPicker && !selectedChannelId) {
      toast.error("投稿先チャンネルを選択してください。");
      return;
    }
    setSubmitting(true);
    try {
      const deadlineDaysParsed = deadlineDays.trim() === ""
        ? undefined
        : parseInt(deadlineDays.trim(), 10);
      if (deadlineDaysParsed !== undefined && (isNaN(deadlineDaysParsed) || deadlineDaysParsed < 1 || deadlineDaysParsed > 30)) {
        toast.error("締め切りは1〜30の整数を入力してください。");
        return;
      }

      const body: Record<string, unknown> = {
        guildId,
        genre: genre.trim(),
        capacity: cap,
        content: content.trim()
      };
      if (deadlineDaysParsed !== undefined) body.deadlineDays = deadlineDaysParsed;
      if (needsChannelPicker) body.channelId = selectedChannelId;

      const res = await fetch("/api/panel/recruitment", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "作成に失敗しました。");
        return;
      }
      setGenre("");
      setCapacity("4");
      setContent("");
      setDeadlineDays("");
      toast.success("募集を作成しました。");
    } catch {
      toast.error("通信エラーが発生しました。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-[#f2f3f5]">
          <Users className="h-4 w-4 text-[#c9cdfb]" />
          募集作成
        </CardTitle>
      </CardHeader>
      <CardContent>
        {configLoading ? (
          <p className="text-sm text-[#80848e]">読み込み中...</p>
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
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <p className={label}>タイトル</p>
                <span className={`text-xs tabular-nums ${genre.length >= 80 ? "text-red-400" : "text-[#80848e]"}`}>
                  {genre.length}/80
                </span>
              </div>
              <input
                type="text"
                maxLength={80}
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                placeholder="例: 原神　螺旋12層"
                className={input}
              />
            </div>
            <div className="flex flex-col gap-1">
              <p className={label}>定員（1〜99）</p>
              <input
                type="number"
                min={1}
                max={99}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className={`${input} w-24 ${capacityInvalid ? "border-red-500" : ""}`}
              />
              {capacityInvalid && <p className="text-xs text-red-400">1〜99の整数を入力してください</p>}
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <p className={label}>内容</p>
                <span className={`text-xs tabular-nums ${content.length >= 1000 ? "text-red-400" : "text-[#80848e]"}`}>
                  {content.length}/1000
                </span>
              </div>
              <textarea
                maxLength={1000}
                rows={3}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="募集の説明を入力..."
                className={input}
              />
            </div>
            <div className="flex flex-col gap-1">
              <p className={label}>締め切り（日数・省略で7日）</p>
              <input
                type="number"
                min={1}
                max={30}
                value={deadlineDays}
                onChange={(e) => setDeadlineDays(e.target.value)}
                placeholder="1〜30"
                className={`${input} w-24 ${deadlineDaysInvalid ? "border-red-500" : ""}`}
              />
              {deadlineDaysInvalid && <p className="text-xs text-red-400">1〜30の整数を入力してください</p>}
            </div>
            <div>
              <Button
                type="submit"
                size="sm"
                disabled={submitting || !canSubmit}
                title={!canSubmit ? "全項目を正しく入力してください" : undefined}
              >
                {submitting ? "作成中..." : "募集を作成"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
