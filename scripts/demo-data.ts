/**
 * Shared demo dataset: the 40 analysts, the ticker universe, and the authored
 * headline pools the seed draws from. Kept separate from the seed runner so the
 * teardown and any future video pass can import the same roster.
 *
 * Every account created from this file uses an @stoa.demo email, which is the
 * scoping rule the whole demo dataset is removable by.
 */

export const DEMO_EMAIL_DOMAIN = "@stoa.demo";
export const DEMO_PASSWORD = "stoademo123";

export type AnalystSeed = {
  handle: string;
  name: string;
  headline: string;
  bio: string;
  specialty: string;
  tags: string[];
  tickers: string[];
  /** Win-rate bias when simulating resolved calls (0.34 struggling, 0.74 strong). */
  skill: number;
  /** Publication count band. */
  minPubs: number;
  maxPubs: number;
  /** Days since the account joined. */
  joinedDaysAgo: number;
  sub: number;
  report: number;
  followers: number;
  verified?: boolean;
};

export const CORE_TICKERS = [
  "NVDA",
  "AVGO",
  "AMD",
  "MSFT",
  "TSLA",
  "XOM",
  "JPM",
  "TEVA.TA",
  "NICE.TA",
  "ESLT.TA",
] as const;

export const TAIL_TICKERS = [
  "AAPL", "GOOGL", "META", "AMZN", "NFLX", "CRM", "SNOW", "PLTR", "COIN", "UBER",
  "SHOP", "ARM", "MU", "INTC", "QCOM", "TSM", "LLY", "NVO", "PFE", "CVX",
  "OXY", "SLB", "GS", "BAC", "V", "MA", "CAT", "DE", "BA", "LMT",
  "WIX.TA", "MNDY.TA", "CHKP.TA", "POLI.TA", "LUMI.TA", "ICL.TA", "TSEM.TA",
] as const;

export const SECTOR_BY_TICKER: Record<string, string> = {
  NVDA: "semiconductors", AVGO: "semiconductors", AMD: "semiconductors", MU: "semiconductors",
  INTC: "semiconductors", QCOM: "semiconductors", TSM: "semiconductors", ARM: "semiconductors",
  "TSEM.TA": "semiconductors",
  MSFT: "software", CRM: "software", SNOW: "software", PLTR: "software",
  "NICE.TA": "software", "MNDY.TA": "software", "CHKP.TA": "software", "WIX.TA": "software",
  GOOGL: "internet", META: "internet", AMZN: "internet", NFLX: "media", UBER: "internet",
  SHOP: "internet", COIN: "financials",
  AAPL: "hardware",
  JPM: "financials", GS: "financials", BAC: "financials", V: "financials", MA: "financials",
  "POLI.TA": "financials", "LUMI.TA": "financials",
  LLY: "healthcare", NVO: "healthcare", PFE: "healthcare", "TEVA.TA": "healthcare",
  XOM: "energy", CVX: "energy", OXY: "energy", SLB: "energy",
  CAT: "industrials", DE: "industrials", BA: "industrials", LMT: "industrials",
  "ESLT.TA": "industrials", "ICL.TA": "materials",
  TSLA: "autos",
};

export const THEME_BY_TICKER: Record<string, string> = {
  NVDA: "ai-buildout", AVGO: "ai-buildout", AMD: "ai-buildout", MSFT: "ai-buildout",
  MU: "memory", TSM: "ai-buildout", ARM: "ai-buildout", "TSEM.TA": "memory",
  XOM: "oil-energy", CVX: "oil-energy", OXY: "oil-energy", SLB: "energy-transition",
  LLY: "obesity-drugs", NVO: "obesity-drugs", "TEVA.TA": "healthcare",
  V: "payments", MA: "payments", COIN: "payments",
  LMT: "defense", "ESLT.TA": "defense", BA: "space",
  CAT: "grid-capex", DE: "grid-capex",
  JPM: "rates", GS: "rates", "POLI.TA": "israel", "LUMI.TA": "israel",
  "NICE.TA": "israel", "CHKP.TA": "israel", "WIX.TA": "israel", "MNDY.TA": "israel",
  TSLA: "autos",
};

/**
 * Authored headline + deck pairs for the concentrated names, so the surfaces
 * that matter most read like real analyst work rather than generated filler.
 * `d` is the direction the take implies; the seed matches the call to it.
 */
type Take = { d: "long" | "short" | "hold"; headline: string; deck: string };

export const TAKES: Record<string, Take[]> = {
  NVDA: [
    { d: "long", headline: "Nvidia: the bottleneck moved to power, not silicon", deck: "Hopper-to-Blackwell transition is being read as a demand story. It is a substation story. Utilities in three of the four biggest datacenter corridors have interconnect queues past 2027, and that gates deliveries more than TSMC capacity does." },
    { d: "long", headline: "Nvidia's networking line is the tell everyone is skipping", deck: "InfiniBand plus Spectrum-X now compounds faster than the compute line off a much smaller base. If attach rates hold through the next two prints, the mix shift alone supports the multiple without a single extra GPU." },
    { d: "short", headline: "Nvidia: the hyperscaler order book is starting to double-count", deck: "Three of the top five customers have disclosed commitments that overlap with the same reserved capacity. Backlog is real, but the sell-side is adding numbers that the contracts do not let you add." },
    { d: "hold", headline: "Nvidia into the print: right company, wrong entry", deck: "No quarrel with the franchise. The setup is the problem. Positioning is crowded into the number and the options market is pricing a move the fundamentals are unlikely to deliver in either direction." },
    { d: "long", headline: "Nvidia: inference is the second act and it is underwritten", deck: "Training capex gets the headlines and inference gets the annuity. Token volumes at the three largest API providers grew faster than their GPU fleets last quarter, which only resolves one way." },
  ],
  AVGO: [
    { d: "long", headline: "Broadcom: custom silicon is quietly outgrowing the merchant market", deck: "Two hyperscaler XPU programs move into volume this year. The revenue lands at higher margin than VMware and with a stickier tail, and consensus still models it as lumpy project work." },
    { d: "long", headline: "Broadcom's VMware conversion is ahead of the migration schedule", deck: "Renewal cohorts are converting to subscription faster than management guided, and at higher realized pricing. The churn everyone feared has shown up in seat counts, not in dollars." },
    { d: "short", headline: "Broadcom: the software margin bridge has one bad assumption in it", deck: "The path to the stated operating margin assumes VMware support headcount falls another 20 percent. Renewal-cycle attrition data says the remaining accounts are the ones that need the most support." },
  ],
  AMD: [
    { d: "long", headline: "AMD: MI350 does not need to beat Blackwell, only to be second", deck: "Every large buyer is now writing a second-source clause into its accelerator contracts. AMD wins that slot by default, and second source in a supply-constrained market prices closer to first source than the model assumes." },
    { d: "short", headline: "AMD: the datacenter GPU ramp is running into its own software", deck: "ROCm parity is still eighteen months out for the frameworks that matter. Hardware wins the benchmark and loses the deployment, and that gap shows up in guided revenue before it shows up in the narrative." },
    { d: "long", headline: "AMD server CPU share is compounding while nobody watches", deck: "EPYC crossed a third of server unit share with the datacenter GPU story absorbing all the attention. The CPU line alone underwrites the current price." },
  ],
  MSFT: [
    { d: "long", headline: "Microsoft: Azure AI revenue is finally bigger than the capex drag", deck: "The first quarter where incremental AI revenue exceeded incremental depreciation on the AI fleet. That crossover is the whole bear case, and it just went away." },
    { d: "hold", headline: "Microsoft: great asset, fully discounted", deck: "Copilot attach is real and the Azure line is durable. At this multiple you are underwriting flawless execution on both for three years. I would rather own it 15 percent lower." },
    { d: "short", headline: "Microsoft: Copilot seat growth is decelerating inside the disclosed number", deck: "Total seats keep rising, but the paid-conversion cohort from the first enterprise wave is renewing below plan. The aggregate hides it for about two more quarters." },
  ],
  TSLA: [
    { d: "short", headline: "Tesla: the energy business cannot carry the auto multiple", deck: "Storage is the best part of this company and it is roughly a tenth of revenue. Auto gross margin ex-credits is still compressing, and no plausible energy ramp closes that gap at the current price." },
    { d: "long", headline: "Tesla: storage deployments are the line item that re-rates this", deck: "Megapack backlog now extends past the Lathrop and Shanghai capacity combined. Grid operators are signing multi-year contracts at fixed pricing, which is the opposite of the auto business." },
    { d: "hold", headline: "Tesla: robotaxi is a 2028 asset priced as a 2026 one", deck: "The technology is progressing. The regulatory path in the two states that matter is not, and the timeline the market is discounting requires both to move at once." },
  ],
  XOM: [
    { d: "long", headline: "Exxon: Guyana breakeven is now below where the market models it", deck: "Fourth development phase came in ahead of schedule and under budget. Full-cycle breakeven for the block is in the low 30s, which turns the dividend into a much lower-beta instrument than the sector multiple implies." },
    { d: "hold", headline: "Exxon: the buyback is doing the work the barrel is not", deck: "Capital returns are excellent and the underlying volume story is flat. That is a fine reason to own it and a poor reason to add here." },
    { d: "short", headline: "Exxon: refining margins normalized faster than guidance admits", deck: "The downstream contribution that carried the last four quarters is reverting toward mid-cycle. Consensus is still extrapolating the peak." },
  ],
  JPM: [
    { d: "long", headline: "JPMorgan: deposit costs peaked two quarters before consensus thinks", deck: "Interest-bearing deposit beta rolled over in the last disclosure and the mix shift out of non-interest-bearing has stopped. Net interest income guidance is set up to be raised, not cut." },
    { d: "short", headline: "JPMorgan: credit normalization is not priced in the card book", deck: "Card net charge-offs are tracking above the reserve build for the second consecutive quarter. The reserve is adequate; the earnings path that assumes no further build is not." },
    { d: "hold", headline: "JPMorgan: best-in-class, priced like it", deck: "Nothing wrong with the franchise. Two times tangible book for a bank at peak returns on equity is a bet on the cycle not turning." },
  ],
  "TEVA.TA": [
    { d: "long", headline: "Teva: the biosimilar pipeline is worth more than the debt discount", deck: "Three launches inside eighteen months with limited competition on two of them. The market still prices this as a levered generics business, and the leverage ratio has come down four turns." },
    { d: "short", headline: "Teva: Austedo growth is decelerating into a harder comp", deck: "Script growth has slowed for three consecutive months against a base that gets materially tougher. The guidance raise assumed the old trajectory holds." },
    { d: "long", headline: "Teva: the generics business is finally pricing rationally", deck: "Two competitors exited the injectable portfolio and pricing stabilized for the first time since 2019. A flat-price generics business at this leverage is a different security." },
  ],
  "NICE.TA": [
    { d: "long", headline: "NICE: CXone cloud mix is past the margin inflection", deck: "Cloud crossed two thirds of revenue and the gross margin on that line is now above the legacy on-prem business. Every further point of mix shift is accretive, which was not true two years ago." },
    { d: "hold", headline: "NICE: the AI story is real and the seat count is not growing", deck: "Attach on the AI modules is genuinely strong. Underlying agent seats are flat, and that is the denominator the whole model runs on." },
  ],
  "ESLT.TA": [
    { d: "long", headline: "Elbit: the European order book has outgrown the domestic one", deck: "Backlog from NATO members passed Israeli MoD orders for the first time. That diversifies the political risk the multiple has always carried, and the market has not repriced for it." },
    { d: "long", headline: "Elbit: munitions capacity is the constraint and it is being funded", deck: "Three plant expansions come online within a year against a backlog that already extends past 2029. Conversion, not demand, has been the bottleneck." },
    { d: "hold", headline: "Elbit: the backlog is excellent, the delivery schedule is the risk", deck: "Nothing wrong with demand. Supply-chain conversion has slipped twice, and the current price assumes it does not slip again." },
  ],
};

/** Plausible takes for the long-tail names, filled per ticker. */
export const TAIL_TAKES: Take[] = [
  { d: "long", headline: "{T}: the market is discounting a cycle that already turned", deck: "Order intake bottomed two quarters ago and the revision cycle follows intake with a lag. Consensus is anchored to the trough print." },
  { d: "short", headline: "{T}: margin guidance leans on a cost program that has slipped twice", deck: "The savings target has been reiterated without a revised timeline. Reiterating a number while moving the date is how these programs fail slowly." },
  { d: "long", headline: "{T}: free cash conversion is better than the headline earnings", deck: "Working capital release and lower maintenance capex mean cash earnings run well ahead of GAAP. On cash, this is materially cheaper than the screen suggests." },
  { d: "hold", headline: "{T}: right thesis, wrong price", deck: "The operational story is intact. The entry is not, after a move that already discounts two years of the plan." },
  { d: "short", headline: "{T}: the top-line beat came entirely from price, not volume", deck: "Volumes declined again while realized pricing carried the quarter. Price-led beats in this end market have historically preceded share loss." },
  { d: "long", headline: "{T}: a balance sheet that finally allows management to act", deck: "Net leverage is under two turns for the first time since the acquisition. That unlocks the buyback the equity story has been waiting on." },
];

/** Callless notes anchored on a theme rather than a single name. */
export const NOTE_TAKES: { tag: string; headline: string; deck: string }[] = [
  { tag: "ai-buildout", headline: "The AI capex debate is really a depreciation-schedule debate", deck: "Nobody disputes the spend. The disagreement is whether a GPU is a three-year asset or a six-year one, and the entire sector's earnings power sits on that one line." },
  { tag: "grid-capex", headline: "Interconnect queues are the real constraint on the AI trade", deck: "Three of the four largest datacenter corridors have utility interconnect backlogs past 2027. Everything downstream of that queue is capacity-gated regardless of chip supply." },
  { tag: "rates", headline: "The front end has stopped believing the dot plot", deck: "Two-year yields have decoupled from the projected path for six weeks now. When that gap persists past a quarter, the dots have historically moved to the market rather than the reverse." },
  { tag: "memory", headline: "HBM pricing is holding because the substitution does not exist", deck: "Conventional DRAM pricing rolled over while HBM contracts held firm. There is no second source at the required bandwidth, and that is a pricing structure, not a cycle." },
  { tag: "israel", headline: "The TASE discount to global peers is now a governance question", deck: "The valuation gap widened again this quarter and the earnings gap did not. What is left is a risk premium on process, not on profits." },
  { tag: "obesity-drugs", headline: "The weight-loss trade has moved from efficacy to distribution", deck: "Both leaders have proven the drug works. The next leg is decided by manufacturing capacity and payer coverage, which are logistics problems, not science ones." },
  { tag: "energy-transition", headline: "Grid storage economics quietly stopped needing the subsidy", deck: "Unsubsidized four-hour storage now clears in three US markets on merchant economics alone. That changes who the buyer is." },
  { tag: "defense", headline: "European defense budgets are structural, not cyclical", deck: "Multi-year procurement commitments have replaced annual appropriations across four major NATO members. The order books that follow do not behave like a cycle." },
  { tag: "payments", headline: "Take-rate compression is finally showing up where it matters", deck: "The networks held pricing for a decade. Two regulatory decisions this year set a ceiling that the models have not yet incorporated." },
  { tag: "china", headline: "The China export-control cycle has a predictable second order", deck: "Every restriction round has been followed by a domestic substitution push that lands eighteen months later. We are approaching that lag on the 2024 round." },
  { tag: "inflation", headline: "Services inflation is a wage story with a shelter lag attached", deck: "Strip shelter and the services print is already near target. The remaining gap is a measurement lag, and positioning is set for the headline rather than the composition." },
  { tag: "valuation", headline: "What a 20x multiple assumes that nobody writes down", deck: "A market multiple embeds a terminal growth rate and a discount rate. Both are currently at levels that require the other to be wrong." },
];

export const ANALYSTS: AnalystSeed[] = [
  { handle: "marcus_webb", name: "Marcus Webb", headline: "Multi-cap generalist. 15 years on the buy side.", bio: "Former PM at a long-only fund. A few high-conviction calls per quarter, and the tape grades them.", specialty: "Generalist", tags: ["valuation", "earnings"], tickers: ["NVDA", "MSFT", "JPM", "AVGO"], skill: 0.71, minPubs: 30, maxPubs: 38, joinedDaysAgo: 640, sub: 49, report: 15, followers: 24_800, verified: true },
  { handle: "maren_vos", name: "Maren Vos", headline: "Semis and AI infrastructure. Concentrated, high conviction.", bio: "Covering the accelerator supply chain end to end. I size around catalysts, not narratives.", specialty: "Semiconductors", tags: ["semiconductors", "ai-buildout"], tickers: ["NVDA", "AVGO", "AMD", "MU", "TSM"], skill: 0.68, minPubs: 32, maxPubs: 40, joinedDaysAgo: 520, sub: 39, report: 12, followers: 19_200, verified: true },
  { handle: "fatima_alhariri", name: "Fatima Al-Hariri", headline: "Healthcare and biotech catalysts. Event driven.", bio: "PhD pharmacology. PDUFA dates, trial readouts, and mispriced optionality in mid-cap biotech.", specialty: "Healthcare", tags: ["healthcare", "obesity-drugs", "event-driven"], tickers: ["LLY", "NVO", "PFE", "TEVA.TA"], skill: 0.66, minPubs: 12, maxPubs: 16, joinedDaysAgo: 480, sub: 35, report: 12, followers: 11_400, verified: true },
  { handle: "dhruv_anand", name: "Dhruv Anand", headline: "Deep value in industrials and energy. Patient, contrarian.", bio: "Graham-Dodd mindset with a macro overlay. I wait for forced sellers.", specialty: "Value / Energy", tags: ["energy", "industrials", "valuation"], tickers: ["XOM", "CVX", "OXY", "CAT"], skill: 0.62, minPubs: 9, maxPubs: 14, joinedDaysAgo: 410, sub: 19, report: 7, followers: 6_900, verified: true },
  { handle: "yuki_tanaka", name: "Yuki Tanaka", headline: "Asia tech supply chain and ADRs.", bio: "Tokyo based. The bridge between US listings and Asia fundamentals.", specialty: "Asia Tech", tags: ["semiconductors", "china"], tickers: ["TSM", "MU", "ARM", "QCOM"], skill: 0.61, minPubs: 8, maxPubs: 13, joinedDaysAgo: 390, sub: 22, report: 8, followers: 7_300, verified: true },
  { handle: "theo_marchetti", name: "Theo Marchetti", headline: "Macro-aware single names. Risk first.", bio: "Rates, FX and positioning drive my single-stock work. Every call has an invalidation level.", specialty: "Macro / Single-stock", tags: ["rates", "fx"], tickers: ["JPM", "GS", "MSFT"], skill: 0.58, minPubs: 10, maxPubs: 15, joinedDaysAgo: 360, sub: 24, report: 8, followers: 5_100 },
  { handle: "james_okonkwo", name: "James Okonkwo", headline: "Energy transition and traditional oil and gas.", bio: "Upstream, LNG and grid bottlenecks. Earnings revisions are the edge.", specialty: "Energy", tags: ["energy", "energy-transition", "grid-capex"], tickers: ["XOM", "SLB", "OXY", "CVX"], skill: 0.57, minPubs: 7, maxPubs: 12, joinedDaysAgo: 340, sub: 18, report: 6, followers: 4_400 },
  { handle: "lena_kowal", name: "Lena Kowalczyk", headline: "Consumer and software. Earnings driven.", bio: "Short-horizon work around prints. Unit economics and churn, not slide decks.", specialty: "Consumer / SaaS", tags: ["software", "consumer", "earnings"], tickers: ["MSFT", "CRM", "SNOW", "SHOP"], skill: 0.55, minPubs: 8, maxPubs: 13, joinedDaysAgo: 320, sub: 15, report: 5, followers: 3_800 },
  { handle: "priya_raman", name: "Priya Raman", headline: "Fintech and payments. Unit economics obsessed.", bio: "Former product lead at a neobank. I stress-test take rates, CAC and regulatory risk.", specialty: "Fintech", tags: ["payments", "financials"], tickers: ["V", "MA", "COIN", "JPM"], skill: 0.53, minPubs: 6, maxPubs: 11, joinedDaysAgo: 300, sub: 20, report: 7, followers: 4_950 },
  { handle: "olivia_grant", name: "Olivia Grant", headline: "Dividend growers and quality compounders.", bio: "Low turnover, long horizons. Durable returns on capital and management that allocates well.", specialty: "Dividends", tags: ["valuation", "financials"], tickers: ["JPM", "XOM", "V", "CAT"], skill: 0.51, minPubs: 5, maxPubs: 9, joinedDaysAgo: 280, sub: 12, report: 4, followers: 2_600 },
  { handle: "sara_cohen", name: "Sara Cohen", headline: "TASE tech and growth, from Tel Aviv.", bio: "Israeli equities in English. NICE, the CyberArk ecosystem and dual-listed names.", specialty: "Israel / TASE", tags: ["israel", "software"], tickers: ["NICE.TA", "CHKP.TA", "WIX.TA", "MNDY.TA"], skill: 0.59, minPubs: 30, maxPubs: 36, joinedDaysAgo: 470, sub: 29, report: 9, followers: 9_800, verified: true },
  { handle: "elena_petrova", name: "Elena Petrova", headline: "Contrarian shorts. Often wrong, occasionally very right.", bio: "A high-beta book of tactical shorts. Volatile record, and I publish all of it.", specialty: "Contrarian / Short", tags: ["short-thesis", "technicals"], tickers: ["TSLA", "NVDA", "COIN", "PLTR"], skill: 0.36, minPubs: 30, maxPubs: 38, joinedDaysAgo: 500, sub: 11, report: 4, followers: 8_200 },
  { handle: "adam_rosen", name: "Adam Rosen", headline: "Israeli defense and industrials.", bio: "Covering Elbit, IAI suppliers and the European procurement cycle.", specialty: "Defense", tags: ["defense", "israel", "industrials"], tickers: ["ESLT.TA", "LMT", "ICL.TA"], skill: 0.64, minPubs: 10, maxPubs: 15, joinedDaysAgo: 350, sub: 27, report: 9, followers: 6_100, verified: true },
  { handle: "nadia_haddad", name: "Nadia Haddad", headline: "Memory and storage cycles.", bio: "DRAM, NAND and HBM. The cycle is the thesis; timing it is the job.", specialty: "Memory", tags: ["memory", "semiconductors"], tickers: ["MU", "TSEM.TA", "NVDA"], skill: 0.60, minPubs: 7, maxPubs: 12, joinedDaysAgo: 290, sub: 21, report: 7, followers: 3_450 },
  { handle: "gabriel_stern", name: "Gabriel Stern", headline: "Banks and credit, US and Israel.", bio: "Deposit betas, reserve builds and the parts of a bank that break first.", specialty: "Financials", tags: ["financials", "credit", "rates"], tickers: ["JPM", "GS", "BAC", "POLI.TA", "LUMI.TA"], skill: 0.57, minPubs: 9, maxPubs: 14, joinedDaysAgo: 310, sub: 23, report: 8, followers: 4_700 },
  { handle: "hana_ito", name: "Hana Ito", headline: "Autos and the electrification supply chain.", bio: "From cells to charging. I model unit economics per vehicle, not per narrative.", specialty: "Autos", tags: ["autos", "energy-transition"], tickers: ["TSLA", "AMD"], skill: 0.49, minPubs: 6, maxPubs: 11, joinedDaysAgo: 260, sub: 14, report: 5, followers: 2_900 },
  { handle: "ruth_bergman", name: "Ruth Bergman", headline: "Israeli banks and the macro that moves them.", bio: "Tel Aviv based. Rates, shekel and the domestic credit cycle.", specialty: "Israel / Macro", tags: ["israel", "financials", "rates"], tickers: ["POLI.TA", "LUMI.TA", "ICL.TA"], skill: 0.56, minPubs: 8, maxPubs: 13, joinedDaysAgo: 300, sub: 18, report: 6, followers: 3_200 },
  { handle: "daniel_okafor", name: "Daniel Okafor", headline: "Enterprise software, seat counts first.", bio: "I care about net revenue retention and almost nothing else.", specialty: "Software", tags: ["software", "earnings"], tickers: ["CRM", "SNOW", "MSFT", "MNDY.TA"], skill: 0.54, minPubs: 7, maxPubs: 12, joinedDaysAgo: 270, sub: 17, report: 6, followers: 3_050 },
  { handle: "mira_solberg", name: "Mira Solberg", headline: "Nordic industrials and grid capex.", bio: "Electrification hardware, transformers and the interconnect bottleneck.", specialty: "Industrials", tags: ["grid-capex", "industrials"], tickers: ["CAT", "DE", "SLB"], skill: 0.58, minPubs: 6, maxPubs: 11, joinedDaysAgo: 250, sub: 16, report: 6, followers: 2_400 },
  { handle: "omar_farouk", name: "Omar Farouk", headline: "Oil macro and the majors.", bio: "Barrels, spreads and the capital discipline cycle.", specialty: "Oil", tags: ["oil-energy", "energy"], tickers: ["XOM", "CVX", "OXY"], skill: 0.52, minPubs: 7, maxPubs: 12, joinedDaysAgo: 240, sub: 15, report: 5, followers: 2_150 },
  { handle: "claire_dubois", name: "Claire Dubois", headline: "Luxury, consumer and the European tape.", bio: "Pricing power is the only moat I trust in consumer.", specialty: "Consumer", tags: ["consumer", "valuation"], tickers: ["V", "MA", "NFLX"], skill: 0.50, minPubs: 5, maxPubs: 10, joinedDaysAgo: 230, sub: 13, report: 5, followers: 1_900 },
  { handle: "tomer_avraham", name: "Tomer Avraham", headline: "Israeli small and mid caps.", bio: "The names no sell-side analyst covers. High variance, deep work.", specialty: "Israel / Small-cap", tags: ["israel", "valuation"], tickers: ["TSEM.TA", "ICL.TA", "WIX.TA"], skill: 0.47, minPubs: 8, maxPubs: 13, joinedDaysAgo: 220, sub: 12, report: 4, followers: 1_650 },
  { handle: "victor_reyes", name: "Victor Reyes", headline: "Event driven. Mergers, spins and forced sellers.", bio: "I trade the calendar, not the story.", specialty: "Event-driven", tags: ["event-driven", "valuation"], tickers: ["BA", "OXY", "PFE"], skill: 0.60, minPubs: 9, maxPubs: 14, joinedDaysAgo: 330, sub: 25, report: 9, followers: 4_100, verified: true },
  { handle: "anya_volkov", name: "Anya Volkov", headline: "Technicals and positioning.", bio: "Flows, gamma and where the marginal buyer has to come from.", specialty: "Technicals", tags: ["technicals", "rates"], tickers: ["NVDA", "TSLA", "MSFT"], skill: 0.45, minPubs: 10, maxPubs: 15, joinedDaysAgo: 210, sub: 10, report: 4, followers: 2_750 },
  { handle: "ben_shapiro_il", name: "Ben Shapira", headline: "Cyber and Israeli security software.", bio: "Check Point, CyberArk and the private pipeline behind them.", specialty: "Cyber", tags: ["israel", "software"], tickers: ["CHKP.TA", "NICE.TA"], skill: 0.63, minPubs: 7, maxPubs: 12, joinedDaysAgo: 280, sub: 26, report: 8, followers: 5_300, verified: true },
  { handle: "sofia_lindqvist", name: "Sofia Lindqvist", headline: "Healthcare services and payers.", bio: "The unglamorous half of healthcare, where the cash actually is.", specialty: "Healthcare", tags: ["healthcare", "valuation"], tickers: ["PFE", "LLY", "TEVA.TA"], skill: 0.55, minPubs: 6, maxPubs: 11, joinedDaysAgo: 200, sub: 16, report: 6, followers: 1_800 },
  { handle: "kwame_boateng", name: "Kwame Boateng", headline: "Materials, mining and the input cost cycle.", bio: "Copper, lithium and the things every other thesis depends on.", specialty: "Materials", tags: ["materials", "inflation"], tickers: ["ICL.TA", "CAT", "SLB"], skill: 0.51, minPubs: 5, maxPubs: 10, joinedDaysAgo: 190, sub: 14, report: 5, followers: 1_500 },
  { handle: "elior_shani", name: "Elior Shani", headline: "Israeli tech, private to public.", bio: "IPO pipeline, secondaries and the dual-listing arbitrage.", specialty: "Israel / IPO", tags: ["israel", "ipo"], tickers: ["MNDY.TA", "WIX.TA", "NICE.TA"], skill: 0.53, minPubs: 6, maxPubs: 11, joinedDaysAgo: 180, sub: 19, report: 7, followers: 2_050 },
  { handle: "grace_holloway", name: "Grace Holloway", headline: "Media, streaming and the content cost curve.", bio: "Subscriber economics after the growth-at-any-cost era.", specialty: "Media", tags: ["media", "consumer"], tickers: ["NFLX", "META", "GOOGL"], skill: 0.52, minPubs: 5, maxPubs: 10, joinedDaysAgo: 175, sub: 13, report: 5, followers: 1_720 },
  { handle: "raphael_moreau", name: "Raphael Moreau", headline: "Aerospace and space infrastructure.", bio: "Launch economics, satellite capex and the defense adjacency.", specialty: "Space", tags: ["space", "defense"], tickers: ["BA", "LMT", "ESLT.TA"], skill: 0.56, minPubs: 6, maxPubs: 11, joinedDaysAgo: 170, sub: 17, report: 6, followers: 1_640 },
  { handle: "iris_nakamura", name: "Iris Nakamura", headline: "Hardware and the consumer device cycle.", bio: "Bill of materials, replacement cycles and channel inventory.", specialty: "Hardware", tags: ["hardware", "consumer"], tickers: ["AAPL", "QCOM", "ARM"], skill: 0.48, minPubs: 5, maxPubs: 10, joinedDaysAgo: 165, sub: 12, report: 4, followers: 1_380 },
  { handle: "noah_feldman", name: "Noah Feldman", headline: "Small-cap discovery. High variance by design.", bio: "Many ideas, smaller size. The record is still forming, so judge the process.", specialty: "Small-cap", tags: ["valuation", "technicals"], tickers: ["PLTR", "COIN", "SNOW"], skill: 0.44, minPubs: 8, maxPubs: 13, joinedDaysAgo: 160, sub: 9, report: 3, followers: 1_250 },
  { handle: "leah_mizrahi", name: "Leah Mizrahi", headline: "Israeli consumer and retail.", bio: "The domestic economy from the shelf up.", specialty: "Israel / Consumer", tags: ["israel", "consumer"], tickers: ["ICL.TA", "POLI.TA"], skill: 0.50, minPubs: 5, maxPubs: 9, joinedDaysAgo: 150, sub: 11, report: 4, followers: 1_100 },
  { handle: "arjun_mehta", name: "Arjun Mehta", headline: "Cloud infrastructure and the capex cycle.", bio: "Where the hyperscaler dollar actually lands.", specialty: "Cloud", tags: ["ai-buildout", "software"], tickers: ["MSFT", "AMZN", "GOOGL", "AVGO"], skill: 0.61, minPubs: 7, maxPubs: 12, joinedDaysAgo: 145, sub: 20, report: 7, followers: 2_300 },
  { handle: "freya_andersen", name: "Freya Andersen", headline: "Rates, FX and the macro overlay.", bio: "I publish the macro that the single-name people should be reading.", specialty: "Macro", tags: ["rates", "fx", "inflation"], tickers: ["JPM", "GS"], skill: 0.54, minPubs: 6, maxPubs: 11, joinedDaysAgo: 140, sub: 18, report: 6, followers: 1_900 },
  { handle: "carlos_mendez", name: "Carlos Mendez", headline: "Just getting started on Stoa.", bio: "Publishing my first calls in public. Former equity sales, learning to put skin in the game.", specialty: "Learning", tags: ["valuation"], tickers: ["AAPL", "MSFT"], skill: 0.46, minPubs: 1, maxPubs: 2, joinedDaysAgo: 9, sub: 0, report: 0, followers: 62 },
  { handle: "tal_benari", name: "Tal Ben-Ari", headline: "New here. Israeli tech, mostly semis.", bio: "First publications going up now. Ten years in the industry, none of it in public.", specialty: "Israel / Semis", tags: ["israel", "semiconductors"], tickers: ["TSEM.TA", "NVDA"], skill: 0.55, minPubs: 1, maxPubs: 2, joinedDaysAgo: 6, sub: 0, report: 0, followers: 41 },
  { handle: "wei_zhang", name: "Wei Zhang", headline: "Recently joined. China tech and the export-control cycle.", bio: "Starting to publish the work I have been writing privately for years.", specialty: "China Tech", tags: ["china", "semiconductors"], tickers: ["TSM", "QCOM"], skill: 0.58, minPubs: 1, maxPubs: 2, joinedDaysAgo: 4, sub: 0, report: 0, followers: 28 },
  { handle: "hannah_pruitt", name: "Hannah Pruitt", headline: "New. Energy and utilities.", bio: "Grid economics, from a decade inside a utility planning desk.", specialty: "Utilities", tags: ["grid-capex", "energy"], tickers: ["XOM", "CAT"], skill: 0.52, minPubs: 1, maxPubs: 2, joinedDaysAgo: 2, sub: 0, report: 0, followers: 13 },
  { handle: "isaac_levy", name: "Isaac Levy", headline: "Quant-ish. Factor exposures behind single names.", bio: "I decompose every thesis into the factors that will actually drive it.", specialty: "Quant", tags: ["technicals", "valuation"], tickers: ["NVDA", "MSFT", "JPM", "TSLA"], skill: 0.59, minPubs: 9, maxPubs: 14, joinedDaysAgo: 135, sub: 22, report: 8, followers: 2_600 },
];

export type Intent = "hit" | "near" | "miss";

function r(min: number, max: number) {
  return min + Math.random() * (max - min);
}

/**
 * Resolved price engineered so `gradeOutcome` returns the intended outcome.
 * The seed picks the intent from the analyst's skill bias, then derives a price
 * that grades to it, rather than hoping random prices land on a usable spread.
 */
export function resolvedFor(
  intent: Intent,
  direction: "long" | "short" | "hold",
  lock: number,
  target: number | null,
) {
  const round2 = (n: number) => Math.round(n * 100) / 100;
  if (direction === "hold") {
    const drift = intent === "hit" ? r(0, 2.4) : intent === "near" ? r(3.4, 5.6) : r(7, 16);
    return round2(lock * (1 + (Math.random() < 0.5 ? drift : -drift) / 100));
  }
  const sign = direction === "long" ? 1 : -1;
  if (intent === "miss") return round2(lock * (1 - (sign * r(3, 14)) / 100));
  if (!target) {
    const pct = intent === "hit" ? r(6, 19) : r(2, 4.4);
    return round2(lock * (1 + (sign * pct) / 100));
  }
  const span = Math.abs(target - lock) / lock;
  const pct = intent === "hit" ? span * r(1.02, 1.35) : span * r(0.25, 0.7);
  return round2(lock * (1 + sign * pct));
}


function pct(p: number) {
  return Math.random() < p;
}
function isoDays(n: number) {
  return new Date(Date.now() + n * 86_400_000).toISOString();
}
function rnd2(n: number) {
  return Math.round(n * 100) / 100;
}
export function pickOne<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function buildCards(reportId: string, headline: string, deck: string, ticker: string | null, target: number | null, lock: number) {
  const cards: { report_id: string; position: number; kind: string; locked: boolean; payload: Record<string, unknown> }[] = [];
  let pos = 0;
  const add = (kind: string, locked: boolean, payload: Record<string, unknown>) => {
    cards.push({ report_id: reportId, position: pos++, kind, locked, payload });
  };

  add("thesis", false, { title: headline, body: deck });
  add("edge", false, {
    street: [
      { text: "Consensus models the cycle turning in the second half", ink: "plain" },
      { text: "Sell-side target clusters within 8% of spot", ink: "auto" },
    ],
    mine: [
      { text: "The turn already happened in order intake two quarters ago", ink: "plain" },
      { text: "My number is 14% above the street on the out year", ink: "creator_est" },
    ],
  });

  if (ticker && target) {
    add("path_to_target", pct(0.55), {
      steps: [
        { label: "Entry", value: { text: String(rnd2(lock)), ink: "auto" } },
        { label: "Out-year EPS", value: { text: "+18% vs consensus", ink: "creator_est" } },
        { label: "Exit multiple", value: { text: "22x, in line with the last cycle peak", ink: "creator_est" } },
      ],
      result: { text: String(rnd2(target)), ink: "creator_est" },
    });
  }

  if (pct(0.6)) {
    add("kill_switch", pct(0.5), {
      conditions: [
        { text: "Order intake declines two consecutive quarters", ink: "plain" },
        { text: "Gross margin below 44% on any print", ink: "creator_est" },
        { text: "Close below the lock price on above-average volume", ink: "plain" },
      ],
    });
  }

  if (pct(0.55)) {
    add("catalyst_timeline", false, {
      events: [
        { dateISO: isoDays(-34), label: "Q results, margin guide reiterated", past: true },
        { dateISO: isoDays(-9), label: "Analyst day, capex framework updated", past: true },
        { dateISO: isoDays(21), label: "Next print, the number that decides this", past: false },
      ],
    });
  }

  if (pct(0.4)) {
    add("checklist", pct(0.4), {
      rows: [
        { label: "Order intake inflected", status: "done", ink: "plain" },
        { label: "Pricing held through the renewal cycle", status: "done", ink: "auto" },
        { label: "Capacity expansion funded", status: "pending", ink: "creator_est" },
        { label: "Second source contract signed", status: "failed", ink: "plain" },
      ],
    });
  }

  return cards;
}

export const STEELMEN = [
  {
    objection: "Capacity additions announced this year land in exactly the window your target needs supply to stay tight.",
    answer: "They land, but they land at trailing-edge nodes. The tightness is at the leading edge, where the announced capacity is a rounding error until 2028.",
  },
  {
    objection: "You are underwriting a margin structure that has only held for three quarters.",
    answer: "Three quarters through a pricing reset that took two competitors out of the market. The structure is the consequence of the exits, not of the cycle.",
  },
  {
    objection: "If this were as mispriced as you say, the largest holders would have added rather than trimmed.",
    answer: "They trimmed for position-limit reasons that show up in the 13F footnotes. Two of the three added in the vehicles that do not have the limit.",
  },
];

