"use server";

import { requireUserId } from "@/features/boards/queries";
import {
  searchAccessible,
  type SearchHit,
} from "@/features/search/queries";

export async function searchAction(
  query: string,
): Promise<{ ok: true; results: SearchHit[] } | { ok: false; error: string }> {
  try {
    const userId = await requireUserId();
    const results = await searchAccessible(userId, query);
    return { ok: true, results };
  } catch {
    return { ok: false, error: "You must be signed in." };
  }
}
