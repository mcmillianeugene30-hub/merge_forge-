"use client";

import { useQuery } from "@tanstack/react-query";
import type { Forge } from "@/lib/types";

export function useForge(forgeId: string) {
  return useQuery<Forge>({
    queryKey: ["forge", forgeId],
    queryFn: async () => {
      const res = await fetch(`/api/forges/${forgeId}`);
      if (!res.ok) throw new Error("Failed to fetch forge");
      const data = await res.json();
      return data.forge;
    },
    enabled: !!forgeId,
  });
}
