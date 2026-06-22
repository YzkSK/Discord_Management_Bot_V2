"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { DashboardLoc, TtsDictionaryEntry, TtsSettingsResponse } from "../components/shared";

export function useTtsSettings(
  guildId: string | null,
  loc: DashboardLoc
) {
  const [ttsSettings, setTtsSettings] = useState<TtsSettingsResponse | null>(null);
  const [ttsDefaultSpeakerId, setTtsDefaultSpeakerId] = useState("");
  const [ttsUserSpeakerUserId, setTtsUserSpeakerUserId] = useState("");
  const [ttsUserSpeakerId, setTtsUserSpeakerId] = useState("");
  const [ttsDictionaryScope, setTtsDictionaryScope] = useState<"guild" | "user">("guild");
  const [ttsDictionaryUserId, setTtsDictionaryUserId] = useState("");
  const [ttsDictionaryFromText, setTtsDictionaryFromText] = useState("");
  const [ttsDictionaryToText, setTtsDictionaryToText] = useState("");
  const [ttsDictionaryPriority, setTtsDictionaryPriority] = useState("0");
  const [ttsDictionaryEnabled, setTtsDictionaryEnabled] = useState(true);
  const [savingTtsDictionary, setSavingTtsDictionary] = useState(false);
  const [savingTtsSpeaker, setSavingTtsSpeaker] = useState(false);

  useEffect(() => {
    if (!guildId) return;
    fetchTtsSettings(guildId)
      .then((tts) => {
        setTtsSettings(tts);
        setTtsDefaultSpeakerId(tts.guildDefaultSpeaker?.speakerId.toString() ?? "");
      })
      .catch((e: unknown) => toast.error(toErrorMessage(e)));
  }, [guildId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function saveTtsDefaultSpeaker() {
    if (!guildId) return;
    setSavingTtsSpeaker(true);
    try {
      const data = await patchTtsSpeaker({
        guildId,
        speakerId: Number(ttsDefaultSpeakerId),
        target: "guild-default"
      });
      setTtsDefaultSpeakerId(data.setting.speakerId.toString());
      setTtsSettings(await fetchTtsSettings(guildId));
      toast.success(loc.ttsSpeakerSaved);
    } catch (e) {
      toast.error(toErrorMessage(e));
    } finally {
      setSavingTtsSpeaker(false);
    }
  }

  async function saveTtsUserSpeaker() {
    if (!guildId) return;
    setSavingTtsSpeaker(true);
    try {
      await patchTtsSpeaker({
        guildId,
        speakerId: Number(ttsUserSpeakerId),
        target: "user",
        userId: ttsUserSpeakerUserId
      });
      setTtsUserSpeakerId("");
      setTtsUserSpeakerUserId("");
      setTtsSettings(await fetchTtsSettings(guildId));
      toast.success(loc.ttsSpeakerSaved);
    } catch (e) {
      toast.error(toErrorMessage(e));
    } finally {
      setSavingTtsSpeaker(false);
    }
  }

  async function deleteTtsSpeaker(input: { target: "guild-default" | "user"; userId?: string }) {
    if (!guildId) return;
    setSavingTtsSpeaker(true);
    try {
      await deleteTtsSpeakerSetting({ guildId, ...input });
      if (input.target === "guild-default") setTtsDefaultSpeakerId("");
      setTtsSettings(await fetchTtsSettings(guildId));
      toast.success(loc.ttsSpeakerDeleted);
    } catch (e) {
      toast.error(toErrorMessage(e));
    } finally {
      setSavingTtsSpeaker(false);
    }
  }

  async function saveTtsDictionaryEntry() {
    if (!guildId) return;
    setSavingTtsDictionary(true);
    try {
      await patchTtsDictionaryEntry({
        fromText: ttsDictionaryFromText,
        guildId,
        isEnabled: ttsDictionaryEnabled,
        priority: Number(ttsDictionaryPriority),
        scope: ttsDictionaryScope,
        toText: ttsDictionaryToText,
        ...(ttsDictionaryScope === "user" ? { userId: ttsDictionaryUserId } : {})
      });
      setTtsDictionaryFromText("");
      setTtsDictionaryToText("");
      setTtsDictionaryUserId("");
      setTtsDictionaryPriority("0");
      setTtsDictionaryEnabled(true);
      setTtsSettings(await fetchTtsSettings(guildId));
      toast.success(loc.ttsDictionarySaved);
    } catch (e) {
      toast.error(toErrorMessage(e));
    } finally {
      setSavingTtsDictionary(false);
    }
  }

  async function deleteTtsDictionary(entry: TtsDictionaryEntry) {
    if (!guildId) return;
    setSavingTtsDictionary(true);
    try {
      await deleteTtsDictionaryEntry({
        fromText: entry.fromText,
        guildId,
        scope: entry.scope,
        ...(entry.userId ? { userId: entry.userId } : {})
      });
      setTtsSettings(await fetchTtsSettings(guildId));
      toast.success(loc.ttsDictionaryDeleted);
    } catch (e) {
      toast.error(toErrorMessage(e));
    } finally {
      setSavingTtsDictionary(false);
    }
  }

  return {
    ttsSettings,
    ttsDefaultSpeakerId,
    setTtsDefaultSpeakerId,
    ttsUserSpeakerUserId,
    setTtsUserSpeakerUserId,
    ttsUserSpeakerId,
    setTtsUserSpeakerId,
    ttsDictionaryScope,
    setTtsDictionaryScope,
    ttsDictionaryUserId,
    setTtsDictionaryUserId,
    ttsDictionaryFromText,
    setTtsDictionaryFromText,
    ttsDictionaryToText,
    setTtsDictionaryToText,
    ttsDictionaryPriority,
    setTtsDictionaryPriority,
    ttsDictionaryEnabled,
    setTtsDictionaryEnabled,
    savingTtsDictionary,
    savingTtsSpeaker,
    saveTtsDefaultSpeaker,
    saveTtsUserSpeaker,
    deleteTtsSpeaker,
    saveTtsDictionaryEntry,
    deleteTtsDictionary,
  };
}

async function fetchTtsSettings(guildId: string): Promise<TtsSettingsResponse> {
  const query = new URLSearchParams({ guildId });
  const r = await fetch(`/api/tts-settings?${query.toString()}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`Failed to load TTS settings (${r.status})`);
  return (await r.json()) as TtsSettingsResponse;
}

async function patchTtsSpeaker(input:
  | { guildId: string; speakerId: number; target: "guild-default" }
  | { guildId: string; speakerId: number; target: "user"; userId: string }
) {
  const r = await fetch("/api/tts-settings", {
    body: JSON.stringify({ ...input, kind: "speaker" }),
    headers: { "content-type": "application/json" },
    method: "PATCH"
  });
  if (!r.ok) throw new Error(`Failed to save TTS speaker (${r.status})`);
  return (await r.json()) as { setting: { speakerId: number } };
}

async function deleteTtsSpeakerSetting(input:
  | { guildId: string; target: "guild-default" }
  | { guildId: string; target: "user"; userId?: string }
) {
  const r = await fetch("/api/tts-settings", {
    body: JSON.stringify({ ...input, kind: "speaker" }),
    headers: { "content-type": "application/json" },
    method: "DELETE"
  });
  if (!r.ok) throw new Error(`Failed to delete TTS speaker (${r.status})`);
}

async function patchTtsDictionaryEntry(input: {
  fromText: string;
  guildId: string;
  isEnabled: boolean;
  priority: number;
  scope: "guild" | "user";
  toText: string;
  userId?: string;
}) {
  const r = await fetch("/api/tts-settings", {
    body: JSON.stringify({ ...input, kind: "dictionary" }),
    headers: { "content-type": "application/json" },
    method: "PATCH"
  });
  if (!r.ok) throw new Error(`Failed to save TTS dictionary (${r.status})`);
}

async function deleteTtsDictionaryEntry(input: {
  fromText: string;
  guildId: string;
  scope: "guild" | "user";
  userId?: string;
}) {
  const r = await fetch("/api/tts-settings", {
    body: JSON.stringify({ ...input, kind: "dictionary" }),
    headers: { "content-type": "application/json" },
    method: "DELETE"
  });
  if (!r.ok) throw new Error(`Failed to delete TTS dictionary (${r.status})`);
}

function toErrorMessage(e: unknown) {
  return e instanceof Error ? e.message : "TTS settings request failed";
}
