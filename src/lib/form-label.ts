const FORM_LABELS: Record<string, string> = {
  dictionary: "Dictionary form",
  masu: "Polite present",
  masu_negative: "Polite negative",
  masu_past: "Polite past",
  masu_past_negative: "Polite past negative",
  te: "Te-form",
  plain_negative: "Plain negative",
  plain_past: "Plain past",
  plain_past_negative: "Plain past negative",
  negative: "Negative",
  past: "Past",
  past_negative: "Past negative",
};

export function formLabel(formType?: string | null): string | null {
  if (!formType || formType === "dictionary") return null;
  return FORM_LABELS[formType] ?? formType.replaceAll("_", " ");
}
