import type { InterestCartStore } from "@/lib/interest-cart/store";
import type { CartTap } from "@/lib/interest-cart/types";

/**
 * TEMPORARY, server side. The YouTube extension's taps come through
 * /api/extension/taps, which checks the account and shapes each tap with the
 * same `createInterestCart` as the site. There is no table to write to until
 * Krisi applies 0068 (`interest_taps`), and the cart itself lives in the
 * reader's browser (`TemporaryLocalCartStore`), so this store accepts the
 * tap and keeps nothing: the extension holds it until the reader's next
 * visit to Stoa, where the site's bridge moves it into the cart
 * (src/components/interest-cart/extension-bridge.ts). When the Supabase
 * adapter exists, the route uses it instead and the bridge goes.
 */
export class ExtensionRelayStore implements InterestCartStore {
  async insert(): Promise<{ inserted: boolean }> {
    return { inserted: true };
  }

  private unavailable(): never {
    throw new Error("The server keeps no taps until interest_taps exists");
  }

  async removeLatest(): Promise<CartTap | null> {
    return this.unavailable();
  }
  async removeTicker(): Promise<number> {
    return this.unavailable();
  }
  async restore(): Promise<number> {
    return this.unavailable();
  }
  async listBetween(): Promise<CartTap[]> {
    return this.unavailable();
  }
  async listWeekKeys(): Promise<string[]> {
    return this.unavailable();
  }
}
