import { toast } from "@/hooks/use-toast";
import { BADGES } from "@/lib/trophies";

/** One "Badge unlocked" toast per newly earned badge id. */
export function announceBadges(ids: readonly string[]): void {
  for (const id of ids) {
    toast({ title: 'Badge unlocked', description: BADGES.find((b) => b.id === id)?.label ?? id });
  }
}
