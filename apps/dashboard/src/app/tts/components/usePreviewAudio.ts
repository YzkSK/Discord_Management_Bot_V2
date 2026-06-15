"use client";

import { useEffect, useRef, useState } from "react";

export function usePreviewAudio() {
  const [playingId, setPlayingId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  async function playPreview(speakerId: number) {
    if (playingId !== null) return;
    setPlayingId(speakerId);
    try {
      const res = await fetch(`/api/tts/preview?speakerId=${speakerId}`);
      if (!res.ok) {
        setPlayingId(null);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { URL.revokeObjectURL(url); setPlayingId(null); audioRef.current = null; };
      audio.onerror = () => { URL.revokeObjectURL(url); setPlayingId(null); audioRef.current = null; };
      void audio.play();
    } catch (err: unknown) {
      console.warn("tts-dashboard: audio preview playback failed", err);
      setPlayingId(null);
    }
  }

  return { playingId, playPreview };
}
