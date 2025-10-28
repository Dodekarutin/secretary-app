import { useState, useRef, useCallback } from "react";

export type AudioRecorderState = "idle" | "recording" | "paused";

export function useAudioRecorder() {
  const [state, setState] = useState<AudioRecorderState>("idle");
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // ブラウザがサポートする形式を選択
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "audio/wav";

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setState("recording");
      startTimeRef.current = Date.now();

      // タイマー開始
      timerRef.current = window.setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } catch (error) {
      console.error("マイクへのアクセスに失敗しました:", error);
      throw error;
    }
  }, []);

  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const mediaRecorder = mediaRecorderRef.current;
      if (!mediaRecorder || state !== "recording") {
        reject(new Error("録音が開始されていません"));
        return;
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mediaRecorder.mimeType,
        });

        // ストリームを停止
        mediaRecorder.stream.getTracks().forEach((track) => track.stop());

        // タイマーを停止
        if (timerRef.current !== null) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        setState("idle");
        setDuration(0);
        resolve(blob);
      };

      mediaRecorder.stop();
    });
  }, [state]);

  const cancelRecording = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder) return;

    // ストリームを停止
    mediaRecorder.stream.getTracks().forEach((track) => track.stop());

    // タイマーを停止
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }

    chunksRef.current = [];
    setState("idle");
    setDuration(0);
  }, []);

  return {
    state,
    duration,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
