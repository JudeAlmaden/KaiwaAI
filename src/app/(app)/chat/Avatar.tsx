import Image from "next/image";

/** A round avatar for a conversation/persona. Kai uses the chibi character art;
 *  everyone else uses their emoji (personas) or initial (people/groups). */
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
        /* Crop to the full standing chibi on the left of the sprite sheet */
        <span
          className="overflow-hidden rounded-full"
          style={{ width: size, height: size }}
        >
          <Image
            src="/assets/svg/image.png"
            alt="Kai"
            width={size * 2.8}
            height={size * 2.8}
            style={{
              marginTop: size * 0.18,
              marginLeft: -(size * 0.9),
              objectFit: "cover",
            }}
            draggable={false}
          />
        </span>
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
