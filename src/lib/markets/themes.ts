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
  /** A short editorial paragraph for the theme page: what the theme is. */
  about: string;
  tickers: string[];
}

export const MARKET_THEMES: MarketTheme[] = [
  {
    slug: "ai-buildout",
    name: "The AI buildout",
    deck: "The silicon, the power, and the buildings behind every model release.",
    about:
      "Every model release is paid for in silicon, power and concrete. This theme follows the companies that sell the picks and shovels: accelerators, the equipment that makes them, and the networking that ties a data centre together.",
    tickers: ["NVDA", "AVGO", "AMAT", "LRCX"],
  },
  {
    slug: "software-margin",
    name: "Software after the reset",
    deck: "Growth is cheaper to buy than it was; the question is who still compounds.",
    about:
      "The software multiple reset separated companies that grow into their valuation from companies that grew into their marketing. This theme follows the platforms whose margins survived and asks which ones still compound.",
    tickers: ["MSFT", "NOW", "SNOW", "PLTR"],
  },
  {
    slug: "obesity-drugs",
    name: "The weight-loss decade",
    deck: "One drug class is re-rating an entire sector's terminal value.",
    about:
      "GLP-1 drugs moved from diabetes to obesity to a list of indications that keeps growing. This theme follows the makers, the fast followers and the businesses whose demand curves the drugs quietly bend.",
    tickers: ["LLY", "MRK", "AMGN", "PFE"],
  },
  {
    slug: "energy-realism",
    name: "Energy realism",
    deck: "Demand forecasts keep rising while supply discipline holds.",
    about:
      "The transition is real and so is the barrel. This theme follows the producers and industrial-gas names that benefit while demand forecasts keep rising and capital discipline keeps supply from chasing them.",
    tickers: ["XOM", "CVX", "LIN"],
  },
  {
    slug: "payments-rails",
    name: "Who owns the rails",
    deck: "Incumbent networks, neobanks, and crypto venues competing for the same flow.",
    about:
      "Money moves over rails, and whoever owns the rails takes a toll on every transaction. This theme follows the incumbent networks, the challengers building beside them and the venues trying to route around them.",
    tickers: ["V", "MA", "COIN", "SOFI"],
  },
  {
    slug: "grid-capex",
    name: "The grid rebuild",
    deck: "Transformers, turbines and transmission: the least glamorous bottleneck in the AI trade.",
    about:
      "Data centres, electrification and an ageing grid all want the same transformers and switchgear at the same time. This theme follows the industrials with decade-long backlogs and the contractors building against them.",
    tickers: ["ETN", "GEV", "VRT", "PWR"],
  },
  {
    slug: "gold",
    name: "Gold's second life",
    deck: "Bought by central banks, held as a hedge against the currency it is priced in.",
    about:
      "Gold stopped trading like a commodity somewhere in the last three years. The marginal buyer is no longer a jeweller or a speculator but a central bank diversifying away from reserves it has watched be frozen, and that buying does not care what the price is. The old rule, that gold falls when real yields rise, has been breaking for long enough that the exception needs its own explanation: the debasement trade, a bet less on inflation than on the willingness of governments to keep issuing. Watch the metal against the miners. Producers carry the same ounce with a cost base attached, so they move further in both directions, and the gap between the two is the cleanest read on whether this is a monetary trade or an equity one.",
    tickers: ["XAUUSD", "GLD", "GDX", "NEM", "AEM", "FNV", "WPM", "RGLD"],
  },
  {
    slug: "treasuries",
    name: "The long end",
    deck: "Term premium is back, and the thirty-year is asking harder questions than the ten.",
    about:
      "For a decade the long end of the curve did what the front end told it to. It has stopped. Yields at thirty years are now moving on things the next policy meeting cannot settle: how much debt is coming, who is left to buy it once foreign central banks and the Fed have both stepped back, and what compensation a lender wants for locking money up that long. That compensation is the term premium, and its return is the single biggest change in this market. It is why the curve can steepen while the front end is falling, and why a strong auction can matter more to equities than a soft inflation print. Every long-duration asset on the platform is priced off this, so a call on the thirty-year is a call on the multiple of everything else.",
    tickers: ["US30Y", "US10Y", "US05Y", "TLT", "IEF", "LQD", "HYG"],
  },
  {
    slug: "iran-conflict",
    name: "The Iran conflict",
    deck: "Energy, defence, shipping, and the risk premium sitting under all three.",
    about:
      "A conflict around the Gulf is priced first in the barrel and then in everything the barrel touches. This theme follows the four places it shows up: crude, where a threat to the Strait of Hormuz moves Brent before it moves WTI; the defence primes whose order books lengthen; the tanker owners whose day rates rise with the insurance premium on the route; and gold, which absorbs the demand for somewhere safe to sit. The risk premium is the connecting thread, and it can leave these prices as quickly as it arrived.",
    tickers: [
      "UKOIL",
      "USOIL",
      "XAUUSD",
      "XOM",
      "CVX",
      "SLB",
      "LMT",
      "RTX",
      "NOC",
      "FRO",
      "STNG",
      "ZIM",
    ],
  },
  {
    slug: "memory-supercycle",
    name: "Memory's turn",
    deck: "High-bandwidth memory made a commodity business look, briefly, like a franchise.",
    about:
      "Memory has always been the cyclical end of semiconductors. HBM changed who the customer is and how much they care about price. This theme follows the memory makers and the equipment they depend on.",
    tickers: ["MU", "AMAT", "LRCX", "KLAC"],
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
