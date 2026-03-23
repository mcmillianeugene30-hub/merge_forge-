"use client";

import { useQuery } from "@tanstack/react-query";
import type { Forge } from "@/lib/types";

export function useForges() {
  return useQuery<Forge[]>({
    queryKey: ["forges"],
    queryFn: async () => {
      const res = await fetch("/api/forges");
      if (!res.ok) throw new Error("Failed to fetch forges");
      const data = await res.json();
      return data.forges ?? [];
    },
  });
}
