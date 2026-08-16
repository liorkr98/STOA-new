/**
 * Editorial themes for the Markets Explore view.
 *
 * Themes are curation, not market data: an editor decides that "the AI
 * buildout" is a lens worth browsing and which listed names sit inside it.
 * This file is that editorial judgement, in the same spirit as `UNIVERSE`.
 * Everything shown against a theme at render time -- prices, publication
 * counts, analyst activity -- is read from real data.
 *
 * Constituents are drawn from `UNIVERSE`, so every symbol here resolves to a
 * real instrument page.
 */
export interface MarketTheme {
  slug: string;
  name: string;
  deck: string;
  tickers: string[];
}

export const MARKET_THEMES: MarketTheme[] = [
  {
    slug: "ai-buildout",
    name: "The AI buildout",
    deck: "The silicon, the power, and the buildings behind every model release.",
    tickers: ["NVDA", "AVGO", "AMAT", "LRCX"],
  },
  {
    slug: "software-margin",
    name: "Software after the reset",
    deck: "Growth is cheaper to buy than it was; the question is who still compounds.",
    tickers: ["MSFT", "NOW", "SNOW", "PLTR"],
  },
  {
    slug: "obesity-drugs",
    name: "The weight-loss decade",
    deck: "One drug class is re-rating an entire sector's terminal value.",
    tickers: ["LLY", "MRK", "AMGN", "PFE"],
  },
  {
    slug: "energy-realism",
    name: "Energy realism",
    deck: "Demand forecasts keep rising while supply discipline holds.",
    tickers: ["XOM", "CVX", "LIN"],
  },
  {
    slug: "payments-rails",
    name: "Who owns the rails",
    deck: "Incumbent networks, neobanks, and crypto venues competing for the same flow.",
    tickers: ["V", "MA", "COIN", "SOFI"],
  },
];

/**
 * The twelve sectors carried by the instrument table. Fixed order so the
 * Explore grid is stable between renders.
 */
export const MARKET_SECTORS: string[] = [
  "Semiconductors",
  "Software",
  "Internet",
  "Hardware",
  "Financials",
  "Healthcare",
  "Consumer",
  "Energy",
  "Industrials",
  "Materials",
  "Media",
  "Autos",
];
