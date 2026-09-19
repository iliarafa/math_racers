import { toast } from "@/hooks/use-toast";
import { rewardToast, type RewardNews } from "@/lib/trophies";

/** One toast for everything a session earned: badges, a pit stop spent or earned. */
export function announceRewards(news: RewardNews): void {
  const content = rewardToast(news);
  if (content) toast(content);
}
