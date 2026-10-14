import "server-only";

/**
 * FEATURE_INTEREST_CART: the one switch for the whole Interest Cart. This is
 * the only file that reads it; everything else asks `interestCartOpenTo`.
 *
 *   off (or unset, or anything unrecognised)  nothing of the cart mounts
 *   allowlist:a@x.com,b@y.com                 on for those signed-in accounts
 *   on                                        on for everyone (the launch setting)
 *
 * The allowlist lives in the environment, not here, so no account address is
 * committed to a public repository. Delete this file, its callers' checks and
 * the off-state tests (`npm run test:cart-off`) at launch.
 */
export type InterestCartFlag =
  | { state: "off" }
  | { state: "allowlist"; emails: string[] }
  | { state: "on" };

export function parseInterestCartFlag(raw: string | undefined | null): InterestCartFlag {
  const value = (raw ?? "").trim();
  if (value.toLowerCase() === "on") return { state: "on" };
  const list = /^allowlist:(.+)$/i.exec(value);
  if (list) {
    const emails = list[1]
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.includes("@"));
    if (emails.length > 0) return { state: "allowlist", emails };
  }
  return { state: "off" };
}

export function interestCartFlag(): InterestCartFlag {
  return parseInterestCartFlag(process.env.FEATURE_INTEREST_CART);
}

/** Whether the cart exists for this reader. `email` is null when signed out. */
export function interestCartOpenTo(email: string | null, flag: InterestCartFlag = interestCartFlag()): boolean {
  if (flag.state === "on") return true;
  if (flag.state === "allowlist") return Boolean(email) && flag.emails.includes(email!.trim().toLowerCase());
  return false;
}
