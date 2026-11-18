/** Browser voices expose names and locales, but no standard gender field. */
export function selectRajeshDeviceVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const maleNames = /\b(david|mark|george|james|daniel|alex|rishi|ravi|hemant|guy|ryan|thomas|aaron|fred)\b|\bmale\b/i;
  const femaleNames = /\bfemale\b|\b(zira|hazel|susan|samantha|victoria|karen|moira|tessa|heera|neerja|aria|jenny|sara)\b/i;
  const candidates = voices.filter(voice =>
    voice.localService && /^en(-|$)/i.test(voice.lang) &&
    maleNames.test(voice.name) && !femaleNames.test(voice.name)
  );
  return candidates.find(voice => /^en-in$/i.test(voice.lang)) || candidates[0];
}
