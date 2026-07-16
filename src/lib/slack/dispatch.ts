import { enqueueDigestItem, getAlertDelivery } from "@/lib/db/slack-alerts";
import { definitionForKey, type AlertKey } from "./settings";
import { notifySlack, type SlackBlock } from "./notify";

export async function dispatchAlert(
  input: {
    alertKey: AlertKey;
    text: string;
    blocks?: SlackBlock[];
    digestSummary?: string;
    digestDetail?: Record<string, unknown>;
  },
  opts?: { forceImmediate?: boolean },
): Promise<boolean> {
  const def = definitionForKey(input.alertKey);
  const delivery = opts?.forceImmediate ? "immediate" : await getAlertDelivery(input.alertKey);

  if (delivery === "off") return false;

  if (delivery === "digest") {
    await enqueueDigestItem({
      alertKey: input.alertKey,
      channel: def.channel,
      summaryText: input.digestSummary ?? input.text,
      detail: input.digestDetail ?? {},
    });
    return true;
  }

  return notifySlack({
    channel: def.channel,
    text: input.text,
    blocks: input.blocks,
  });
}
