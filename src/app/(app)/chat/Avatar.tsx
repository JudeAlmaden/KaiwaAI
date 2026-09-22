import Kai from "../../Kai";

/** A round avatar for a conversation/persona. Kai uses the brand mark; everyone
 *  else uses their emoji (personas) or initial (people/groups). */
export default function Avatar({
  name,
  emoji,
  size = 44,
}: {
  name?: string | null;
  emoji?: string | null;
  size?: number;
}) {
  const isKai = (name ?? "").trim().toLowerCase() === "kai";

  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-ai/10"
      style={{ width: size, height: size }}
    >
      {isKai ? (
        <Kai size={Math.round(size * 0.62)} />
      ) : emoji ? (
        <span style={{ fontSize: Math.round(size * 0.5) }}>{emoji}</span>
      ) : (
        <span
          className="font-bold uppercase text-indigo-ai"
          style={{ fontSize: Math.round(size * 0.4) }}
        >
          {(name ?? "?").charAt(0)}
        </span>
      )}
    </span>
  );
}
