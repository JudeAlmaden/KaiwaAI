import { Suspense } from "react";
import KanjiDetailClient from "./KanjiDetailClient";

type Props = {
  params: Promise<{ character: string }>;
};

export default async function KanjiDetailPage({ params }: Props) {
  const { character } = await params;
  const decodedChar = decodeURIComponent(character);

  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <div className="text-6xl">{decodedChar}</div>
        </div>
      }
    >
      <KanjiDetailClient character={decodedChar} />
    </Suspense>
  );
}
