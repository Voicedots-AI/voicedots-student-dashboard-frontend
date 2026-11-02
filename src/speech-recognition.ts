export type RecognitionResult = { isFinal?: boolean; [index: number]: { transcript?: string } };
export type RecognitionEvent = { resultIndex: number; results: ArrayLike<RecognitionResult> };
export type RecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort?: () => void;
};
type RecognitionConstructor = new () => RecognitionLike;
declare global {
  interface Window {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  }
}

export function cancelSpeechRecognition(instance: RecognitionLike) {
  if (instance.abort) instance.abort();
  else instance.stop();
}
