const languages = {
  en: "English",
  hi: "हिन्दी · Hindi",
  ta: "தமிழ் · Tamil",
  te: "తెలుగు · Telugu",
} as const;

export type InterviewLanguage = keyof typeof languages;

export function LanguageSelect({ label, value, onChange, disabled = false }: {
  label: string;
  value: InterviewLanguage;
  onChange: (language: InterviewLanguage) => void;
  disabled?: boolean;
}) {
  return <label>{label}
    <select value={value} disabled={disabled} onChange={event => onChange(event.target.value as InterviewLanguage)}>
      {Object.entries(languages).map(([code, name]) => <option key={code} value={code}>{name}</option>)}
    </select>
  </label>;
}
