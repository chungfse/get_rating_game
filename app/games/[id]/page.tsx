import { getGame } from "@/lib/db/games";
import { notFound } from "next/navigation";
import ReviewsPageClient from "@/components/reviews/ReviewsPageClient";
import type { Metadata } from "next";

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const game = getGame(params.id);
  if (!game) return { title: "Game not found — GetRatingGame" };

  return {
    title: `${game.name} Reviews — GetRatingGame`,
    description: `Phân tích review của ${game.name} trên ${game.platform === "android" ? "Google Play" : "App Store"} bằng AI`,
  };
}

export default function GameReviewsPage({ params }: Props) {
  const game = getGame(params.id);
  if (!game) notFound();

  return <ReviewsPageClient game={game} />;
}
