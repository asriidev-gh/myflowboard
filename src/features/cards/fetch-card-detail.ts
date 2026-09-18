"use client";

import { loadCardDetailAction } from "@/features/cards/actions";
import type { CardDetail } from "@/features/cards/types";

export async function fetchCardDetail(cardId: string): Promise<CardDetail> {
  const result = await loadCardDetailAction(cardId);
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.data as CardDetail;
}
