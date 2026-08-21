/**
 * The demo dataset's writing.
 *
 * The old seed drew from a handful of authored takes and reused them across 40
 * analysts, so the same headline appeared under six bylines with byte-identical
 * body text, and short posts were written with no title at all and a body that
 * was the summary repeated. This module replaces that with a composition engine:
 * a thesis is assembled from a sector angle plus independently drawn mechanism,
 * evidence and risk paragraphs, and every headline and body is checked against
 * everything already issued, so no two publications share text.
 *
 * The combinatorial space is far larger than the ~460 publications the seed
 * needs: semiconductors alone offers 9 tickers x 8 angles x 2 headline forms,
 * and each angle composes 8 x 8 x 8 body variants on top of that.
 */

export type Direction = "long" | "short" | "hold";

/** One analytical thesis shape. `{C}` is replaced with the company short name. */
export type Angle = {
  id: string;
  d: Direction;
  /** Headline forms, already company-scoped by `{C}`. */
  heads: string[];
  /** The dek: the claim, one or two sentences. Never reused as body text. */
  deks: string[];
};

/** Paragraph banks shared across a sector's angles, so any angle can use any of them. */
export type SectorBank = {
  angles: Angle[];
  mechanism: string[];
  evidence: string[];
  risk: string[];
};

export const SHORT_NAME: Record<string, string> = {
  NVDA: "Nvidia", AVGO: "Broadcom", AMD: "AMD", MU: "Micron", INTC: "Intel",
  QCOM: "Qualcomm", TSM: "TSMC", ARM: "Arm", "TSEM.TA": "Tower Semiconductor",
  MSFT: "Microsoft", CRM: "Salesforce", SNOW: "Snowflake", PLTR: "Palantir",
  "NICE.TA": "NICE", "MNDY.TA": "monday.com", "CHKP.TA": "Check Point", "WIX.TA": "Wix",
  GOOGL: "Alphabet", META: "Meta", AMZN: "Amazon", UBER: "Uber", SHOP: "Shopify",
  NFLX: "Netflix", AAPL: "Apple", COIN: "Coinbase",
  JPM: "JPMorgan", GS: "Goldman Sachs", BAC: "Bank of America", V: "Visa", MA: "Mastercard",
  "POLI.TA": "Bank Hapoalim", "LUMI.TA": "Bank Leumi",
  LLY: "Eli Lilly", NVO: "Novo Nordisk", PFE: "Pfizer", "TEVA.TA": "Teva",
  XOM: "Exxon", CVX: "Chevron", OXY: "Occidental", SLB: "SLB",
  CAT: "Caterpillar", DE: "Deere", BA: "Boeing", LMT: "Lockheed Martin", "ESLT.TA": "Elbit",
  "ICL.TA": "ICL Group", TSLA: "Tesla",
};

export const SECTOR_BANKS: Record<string, SectorBank> = {
  semiconductors: {
    angles: [
      { id: "semi-power", d: "long", heads: ["{C}: the constraint moved downstream of the fab", "{C}: capacity is no longer the thing that gates revenue"], deks: ["Wafer supply stopped being the binding constraint two quarters ago. Substation interconnect and advanced packaging now set the delivery schedule, and neither is modelled.", "The bottleneck has migrated from lithography to packaging and power. That changes who captures the margin on every incremental unit."] },
      { id: "semi-attach", d: "long", heads: ["{C}: the attach rate is the number that matters", "{C}: the accessory line is compounding faster than the core"], deks: ["Attach on the adjacent silicon has risen for four consecutive quarters off a much smaller base. Mix alone carries the gross margin without a single extra unit shipped.", "The high-margin attach is growing twice as fast as the headline line. Consensus models it as an accessory rather than as the mix shift it has become."] },
      { id: "semi-second-source", d: "long", heads: ["{C} wins the second-source slot by default", "{C}: being the alternative is worth more than the benchmark suggests"], deks: ["Large buyers are writing second-source clauses into every accelerator contract. In a supply-constrained market the alternative prices far closer to the incumbent than the model assumes.", "Nobody wants a single supplier for a component this strategic. That procurement reflex is worth more to this name than any benchmark win."] },
      { id: "semi-inventory", d: "short", heads: ["{C}: channel inventory is doing the work the demand is not", "{C}: sell-in and sell-through have separated again"], deks: ["Distributor weeks-on-hand rose for the third straight quarter while sell-through was flat. Every prior instance of that gap closed through a guide-down, not a demand recovery.", "Revenue is being recognised into a channel that is not clearing it. The correction lands in the quarter after the one currently guided."] },
      { id: "semi-software", d: "short", heads: ["{C}: the hardware wins the benchmark and loses the deployment", "{C}: the software stack is the gap nobody prices"], deks: ["Framework parity is still a year and a half out for the workloads that actually pay. Hardware wins the evaluation and loses the rollout, and that shows up in guided revenue first.", "The toolchain is the moat and it is not this company's moat. Silicon parity without software parity converts at a fraction of the rate."] },
      { id: "semi-cycle", d: "long", heads: ["{C}: the cycle turned two quarters before the revisions will", "{C}: order intake bottomed and nobody has marked it"], deks: ["Bookings troughed two quarters ago and the revision cycle follows intake with a lag. Consensus is still anchored to the trough print.", "Lead times have started extending again at the component level. That has preceded every upturn in this industry and it has never once been priced early."] },
      { id: "semi-pricing", d: "long", heads: ["{C}: pricing is holding because the substitute does not exist", "{C}: this is a pricing structure, not a cycle"], deks: ["Contract pricing held firm while the commodity tier rolled over. There is no second source at the required specification, which makes this structural rather than cyclical.", "The premium tier has decoupled from the commodity tier on price. Substitution is the only thing that closes that gap and it is not technically available."] },
      { id: "semi-capex", d: "hold", heads: ["{C}: right franchise, wrong point in the capex cycle", "{C}: excellent asset, fully discounted"], deks: ["No argument with the business. The entry is the problem: the multiple already discounts two more years of a capex cycle that has historically run three.", "Positioning is crowded into the print and the options market is pricing a move the fundamentals are unlikely to deliver in either direction."] },
    ],
    mechanism: [
      "The mechanism is straightforward. Advanced packaging capacity is allocated a year ahead, so a unit that clears wafer test still waits on a substrate slot before it can be recognised as revenue. That queue, not the fab, is what sets the quarterly number.",
      "What drives this is mix rather than volume. The incremental unit carries a materially higher attach of adjacent silicon than the installed base does, so gross margin rises even in a quarter where units are flat.",
      "The chain runs through procurement policy rather than through engineering. Once a buyer mandates dual sourcing, the second supplier's volume is set by contract rather than won on benchmark, and pricing follows the constraint rather than the comparison.",
      "The transmission is through the channel. Revenue recognised on sell-in accumulates as distributor inventory, and the correction arrives when weeks-on-hand crosses the level at which distributors stop taking allocation.",
      "The operative constraint is qualification time. A design win converts to revenue only after the customer's own validation cycle, which runs three to five quarters, so today's win is a fiscal-year-after-next revenue event.",
      "The driver is the lead-time signal. Component lead times extend before bookings recover and bookings recover before revisions turn, so the observable sequence runs about two quarters ahead of the consensus number.",
      "Structurally this is a substitution question. Where a qualified alternative exists, price converges to the commodity tier within two cycles; where it does not, the premium persists until a new entrant qualifies, which takes years rather than quarters.",
      "The economics turn on utilisation. Fixed cost per wafer is set at the capacity decision; every point of utilisation above the planning assumption drops through at close to full incremental margin, and every point below does the reverse.",
    ],
    evidence: [
      "Three data points support it. Packaging capacity bookings at the two qualified subcontractors are sold out through the next four quarters, disclosed lead times extended again last month, and the company's own deferred revenue balance rose faster than billings for the second consecutive period.",
      "The disclosure supports this directly. Attach revenue was broken out for the first time last quarter and grew at roughly twice the rate of the core line, off a base small enough that the mix effect is still ahead of it rather than behind.",
      "Two procurement disclosures make the case. Both of the largest buyers have now confirmed multi-vendor accelerator strategies in their own filings, and neither framed it as a cost decision.",
      "The channel data is unambiguous. Distributor weeks-on-hand has risen in each of the last three reported periods while end-market sell-through was flat to down, which is the same configuration that preceded the last two guide-downs.",
      "The gap shows in the deployment data rather than the benchmark data. Announced design wins have run well ahead of disclosed production deployments for six quarters, and the spread has widened rather than closed.",
      "The qualification pipeline is visible in the customer disclosures rather than this company's. Two named accounts moved programmes into validation last quarter, which dates the revenue rather than merely implying it.",
      "Pricing disclosure carries it. Long-term agreements signed this quarter were struck above the prior cohort's realised price, which does not happen in a market where a substitute is available.",
      "Utilisation is the tell. The company guided to a utilisation rate below its own historical planning assumption while holding the capex number flat, which sets up the operating leverage in the following year rather than this one.",
    ],
    risk: [
      "The risk is a demand shock large enough to make the supply argument irrelevant. If end demand rolls over, a packaging queue stops being a constraint and starts being idle capacity, and the mix argument goes with it.",
      "The main risk is timing rather than direction. Cycles in this industry have turned early and then stalled for two quarters more than once, and the position is sized for that rather than against it.",
      "What breaks this is a credible second source qualifying faster than expected. That is a two-year process historically, but a buyer willing to accept a specification compromise could compress it, and the pricing structure would go with it.",
      "The obvious risk is that the channel clears without a guide-down, which happens when a genuine demand upturn lands on top of elevated inventory. That is the bull case and it is not impossible, only unsupported by the sell-through data.",
      "The risk is that software parity arrives faster than the historical base rate. Sustained investment has closed gaps like this before, and if it closes here the deployment discount disappears with it.",
      "Export controls are the risk that is not hedged here. A restriction round that removes a major end market would overwhelm the company-specific argument entirely, and there is no position size that makes that survivable.",
    ],
  },

  software: {
    angles: [
      { id: "sw-crossover", d: "long", heads: ["{C}: incremental revenue has passed incremental depreciation", "{C}: the capex drag just stopped being a drag"], deks: ["This was the first period where incremental revenue from the new fleet exceeded incremental depreciation on it. That crossover was the whole bear case.", "The spend is finally producing more than it costs to carry. Every quarter past the crossover compounds in the opposite direction to the last two years."] },
      { id: "sw-seat", d: "short", heads: ["{C}: seat growth is decelerating inside the disclosed number", "{C}: the aggregate is hiding the cohort"], deks: ["Total seats keep rising while the first enterprise cohort renews below plan. The blended number conceals that for roughly two more quarters.", "Net revenue retention is being carried by expansion in a shrinking number of accounts. That is a different business from the one the multiple assumes."] },
      { id: "sw-mix", d: "long", heads: ["{C}: cloud mix is past the margin inflection", "{C}: the mix shift is now accretive rather than dilutive"], deks: ["Cloud crossed two thirds of revenue and its gross margin is now above the legacy line. Every further point of mix is accretive, which was not true two years ago.", "The transition stopped costing margin this quarter. The rest of the migration now adds to it rather than subtracting."] },
      { id: "sw-pricing", d: "long", heads: ["{C}: pricing power is showing up in renewals, not in the list price", "{C}: the renewal cohort is converting above plan"], deks: ["Renewal cohorts are converting at higher realised pricing than management guided. The churn everyone feared has appeared in seat counts and not in dollars.", "List price is a distraction. Realised price per account has risen for five straight quarters, which is where pricing power actually shows up."] },
      { id: "sw-margin-bridge", d: "short", heads: ["{C}: the margin bridge has one bad assumption in it", "{C}: the cost programme has slipped twice without a new date"], deks: ["The path to the stated operating margin requires support headcount to fall another fifth. The remaining accounts are the ones that consume the most support.", "The savings target has been reiterated without a revised timeline. Reiterating the number while moving the date is how these programmes fail slowly."] },
      { id: "sw-ai-attach", d: "long", heads: ["{C}: the AI modules are selling into the installed base at full price", "{C}: attach is real and it is not discounted"], deks: ["The AI SKUs are attaching to existing accounts without the discounting that usually accompanies a new module. That is unusual and it is not in the model.", "Upsell into the installed base carries no acquisition cost. At this attach rate the contribution margin on the increment is close to the gross margin."] },
      { id: "sw-seat-denominator", d: "hold", heads: ["{C}: the AI story is real and the denominator is flat", "{C}: strong attach on a base that is not growing"], deks: ["Attach on the new modules is genuinely strong. Underlying seats are flat, and seats are the denominator the entire model runs on.", "Both things are true: the new product works, and there are no more people to sell it to at the current rate."] },
      { id: "sw-discount", d: "hold", heads: ["{C}: great asset, fully discounted", "{C}: nothing wrong with it except the price"], deks: ["The franchise is durable and the execution has been clean. At this multiple you are underwriting three flawless years, and I would rather own it materially lower.", "This is a quality question with a price answer. Everything the bulls say is true and already in the number."] },
    ],
    mechanism: [
      "The mechanism is a depreciation schedule. Capacity is expensed over its useful life while the revenue it enables lands immediately, so the reported margin is worst in the build year and best two years after it, entirely independent of demand.",
      "This runs through cohort behaviour rather than through the blended metric. Each enterprise cohort renews on its own anniversary, so a deteriorating recent cohort is invisible in the aggregate until it becomes a large enough share of the renewal base.",
      "The driver is gross margin arithmetic on the mix. Two revenue lines with different margins blend to a company number that moves purely with the weighting, so mix shift alone changes reported profitability without any operational improvement.",
      "The transmission is through realised price rather than list price. Discounting happens at the deal level, so realised price per seat captures pricing power that the published price schedule hides entirely.",
      "The operating leverage is in support cost per account, which does not scale with revenue. It scales with account complexity, and the accounts remaining after a migration are the complex ones by construction.",
      "The economics turn on customer acquisition cost. Selling a new module into an existing account carries almost none, so incremental contribution margin on upsell runs far closer to gross margin than the blended figure suggests.",
      "The constraint is the seat count. Consumption pricing sits on top of seats, so a flat denominator caps the expansion motion regardless of how well the new product attaches.",
      "The mechanism is duration. A multiple is a claim on a terminal growth rate, and at these levels the implied duration is longer than any enterprise software franchise has historically sustained without a re-rating.",
    ],
    evidence: [
      "The disclosure carries it. Management broke out the incremental contribution for the first time and it exceeded the incremental depreciation line, which is the first time that has been true since the build began.",
      "The cohort data is in the supplemental rather than the release. Net revenue retention for accounts acquired in the first enterprise wave has fallen for three consecutive quarters while the blended figure was flat.",
      "The mix is now explicit. Cloud passed two thirds of revenue this quarter and management confirmed its gross margin is above the on-premise line, which reverses the sign on every remaining point of transition.",
      "Realised pricing is disclosed indirectly but consistently. Revenue per account rose faster than seat count in each of the last five quarters, which only happens when discounting is narrowing.",
      "The headcount data undermines the bridge. Support headcount was flat sequentially against a plan that requires a double-digit decline, and no revised timeline accompanied the reiterated target.",
      "Attach is visible in the segment detail. The new modules contributed meaningfully to the quarter with no corresponding increase in sales and marketing, which is what upsell into an installed base looks like.",
      "Seats are the number management stopped emphasising. The metric moved from the release to the supplemental this year, and the growth rate in the supplemental is roughly flat.",
      "The comparison is the evidence. Peers with similar growth and margin profiles trade materially lower, and the gap has widened rather than narrowed over the last two quarters without a corresponding change in fundamentals.",
    ],
    risk: [
      "The risk is that the build cycle extends. If capacity commitments rise again the crossover resets, and the argument is postponed rather than wrong, which is the harder outcome to hold through.",
      "What breaks this is a re-acceleration in the weak cohort. Renewal behaviour has inflected before on a single product release, and one good release would invalidate the cohort argument entirely.",
      "The risk is that the migration stalls with the mix half-shifted. A stalled transition holds the blended margin at the worst point of the curve, and there is no obvious catalyst to restart it.",
      "Competitive discounting is the risk that would show up first in realised price. A well-funded competitor buying share would compress the exact metric this argument rests on.",
      "The main risk is that the cost programme lands late rather than never. Late still gets there, and a name trading on a margin story tends to re-rate on the delivery rather than on the timing.",
      "Multiple compression across the sector is the risk that is not company-specific and not hedged here. It would overwhelm the operating argument in either direction.",
    ],
  },

  internet: {
    angles: [
      { id: "net-take-rate", d: "long", heads: ["{C}: take rate is rising without a price increase", "{C}: monetisation is improving on mix rather than on price"], deks: ["Take rate rose again without a published price change, which means mix is doing the work. Mix-driven monetisation is durable in a way that price increases are not.", "The platform is monetising better on the same transaction. That is a product outcome rather than a pricing decision, and it does not invite the same response."] },
      { id: "net-ad-load", d: "short", heads: ["{C}: the ad load is close to its ceiling", "{C}: engagement is being converted rather than grown"], deks: ["Impressions per user have carried revenue for four quarters while time spent was flat. That is a conversion of existing engagement, and it has a ceiling.", "Revenue growth has decoupled from user growth in a way that has historically preceded a deceleration rather than a re-rating."] },
      { id: "net-capex", d: "short", heads: ["{C}: the capex line has outgrown the revenue it supports", "{C}: the spend is defensive and it is being described as offensive"], deks: ["Capital intensity has doubled against a revenue line growing at a fraction of that rate. The return on the increment has not been disclosed and probably cannot be.", "The buildout is being framed as opportunity and behaves like table stakes. Table stakes do not earn a return above cost of capital."] },
      { id: "net-unit-economics", d: "long", heads: ["{C}: the unit economics crossed over this year", "{C}: contribution margin per order is finally positive at scale"], deks: ["Contribution per transaction turned positive across every major market this year, not just the mature ones. Scale now helps rather than hurts.", "The business stopped buying growth. Incremental volume now carries positive contribution, which changes what the growth rate is worth."] },
      { id: "net-regulatory", d: "short", heads: ["{C}: the regulatory ceiling is now a modelling input", "{C}: two decisions this year set a cap nobody has incorporated"], deks: ["Two regulatory decisions this year established a ceiling on the monetisation rate. The models still extrapolate the pre-decision trajectory.", "This is no longer a headline risk. It is a disclosed constraint with a number attached, and the number is below the consensus path."] },
      { id: "net-cohort", d: "long", heads: ["{C}: the newest cohorts are monetising faster than the old ones", "{C}: cohort quality is improving, which almost never happens"], deks: ["Recent user cohorts reach the same revenue per user in roughly half the time earlier cohorts took. Improving cohort quality at this scale is rare and it compounds.", "The acquisition mix has shifted toward higher-intent users. That shows up in payback period long before it shows up in the revenue line."] },
      { id: "net-competition", d: "hold", heads: ["{C}: winning the category and paying for the privilege", "{C}: share gains that cost more than they return"], deks: ["Share is genuinely being taken. It is being taken with incentives that have not yet been withdrawn, and the economics of the retained cohort are still unproven.", "The competitive outcome looks settled and the profit outcome does not. Those are separate questions and only one of them is priced."] },
      { id: "net-discount", d: "hold", heads: ["{C}: the operational story is intact and the entry is not", "{C}: right thesis, wrong price"], deks: ["Nothing has changed about the business. Everything has changed about what you pay for it after a move that already discounts two years of the plan.", "I would own this lower and I would not chase it here. The disagreement is entirely about entry."] },
    ],
    mechanism: [
      "The mechanism is mix within the transaction. A shift toward higher-margin transaction types raises the blended take rate without any change to the posted rate, which is why it does not provoke the usual customer response.",
      "This works through ad load rather than through audience. Revenue per user rises as impressions per session rise, and impressions per session are bounded by an engagement budget that does not expand on command.",
      "The economics run through capital intensity. When capex grows faster than the revenue it supports, return on invested capital falls even if the revenue line accelerates, and the market usually notices that a year late.",
      "The driver is contribution margin per transaction, which nets incentives out of revenue. A business can grow gross revenue indefinitely at negative contribution, so the crossover is the only event that matters.",
      "The transmission is regulatory. A rate ceiling caps the monetisation term in the model directly, so it changes the terminal value rather than the near-term earnings, which is why the market underreacts initially.",
      "The mechanism is payback period. Faster monetisation of a new cohort shortens payback, which raises the amount of acquisition spend that clears the hurdle, which compounds into the growth rate.",
      "The economics turn on whether incentives are permanent. Share bought with a subsidy reverts when the subsidy does, so the retained-cohort economics are the only evidence that matters and they take two years to observe.",
      "The constraint is engagement, which is a fixed budget of attention. Every monetisation lever ultimately draws on the same pool, so levers are substitutes rather than complements.",
    ],
    evidence: [
      "The disclosure supports it. Blended take rate rose for the fourth consecutive quarter with no announced pricing change, and management attributed it to mix in the prepared remarks rather than in response to a question.",
      "The engagement data undercuts the revenue growth. Time spent per user was flat year over year while impressions per user rose double digits, which is a conversion of existing attention rather than an expansion of it.",
      "Capital intensity is the disclosed number that moved. Capex as a share of revenue roughly doubled over two years while revenue growth decelerated, and no return threshold for the increment has been given.",
      "Contribution margin is now broken out by market. It turned positive in the newest markets this year, which is the first time the cohort curve has looked the same outside the original geography.",
      "The regulatory decisions are public and quantified. Both set an explicit ceiling below the rate currently embedded in consensus, and neither is under appeal on a timeline that matters.",
      "The cohort table is in the supplemental. Users acquired in the last four quarters reach the same revenue per user roughly twice as fast as the cohorts from three years ago.",
      "Incentive spend is visible in the reconciliation. Share gains coincide with a rise in contra-revenue that has not stepped down, which leaves the retained economics unproven.",
      "The valuation gap is the evidence here rather than the fundamentals. The multiple expanded materially without a corresponding change in the growth or margin trajectory.",
    ],
    risk: [
      "The risk is that mix reverts. Mix-driven take rate is durable only while the underlying behaviour holds, and behaviour has shifted quickly in this category before.",
      "What breaks this is a genuine engagement re-acceleration, which would push the ceiling out far enough to make the load argument irrelevant for several more quarters.",
      "The risk is that the capex earns its return and the disclosure simply lags. That has happened in this sector before and it took two years to become visible.",
      "The main risk is competitive: a well-capitalised entrant willing to run negative contribution would reset the unit economics for everyone regardless of this company's discipline.",
      "Regulatory outcomes can be reversed or diluted in implementation, and an implementation that lands softer than the decision would remove the ceiling this argument depends on.",
      "A macro shock to advertising or discretionary transaction volume would overwhelm the company-specific case entirely, and it is not hedged in this position.",
    ],
  },

  financials: {
    angles: [
      { id: "fin-deposit-beta", d: "long", heads: ["{C}: deposit costs peaked before consensus thinks", "{C}: the funding cost inflection already happened"], deks: ["Interest-bearing deposit beta rolled over in the last disclosure and the mix shift out of non-interest-bearing has stopped. Net interest income guidance is set up to be raised.", "The expensive part of the funding rebuild is behind this bank. The market is still modelling it as ahead."] },
      { id: "fin-credit", d: "short", heads: ["{C}: credit normalisation is not in the card book", "{C}: the reserve is adequate and the earnings path is not"], deks: ["Card net charge-offs have tracked above the reserve build for two consecutive quarters. The reserve is adequate; the earnings path that assumes no further build is not.", "Normalisation is arriving faster than the provision schedule anticipates. That is an earnings problem before it is a capital problem."] },
      { id: "fin-fee", d: "long", heads: ["{C}: fee income is now carrying the quarter", "{C}: the non-spread businesses have compounded through the cycle"], deks: ["Fee lines grew through a period when spread income did not, which is what a diversified franchise is supposed to do and rarely does.", "The market values this as a rate-sensitive balance sheet. Half the earnings no longer behave that way."] },
      { id: "fin-capital", d: "long", heads: ["{C}: the capital build is finished and the return is not priced", "{C}: excess capital is about to become a distribution story"], deks: ["The bank cleared its required ratio with a buffer and the regulatory calendar is clear. What follows is distribution, and the payout is not in the multiple.", "Capital has been the constraint for three years and it stopped being one this quarter."] },
      { id: "fin-nim", d: "short", heads: ["{C}: margin guidance assumes a curve that is not there", "{C}: the NIM bridge depends on a repricing that has stalled"], deks: ["The guided margin path requires asset repricing at a pace the current curve does not support. The gap compounds each quarter it persists.", "Loan yields have stopped rising while funding costs have not fully stopped. That spread is the whole guide."] },
      { id: "fin-expense", d: "long", heads: ["{C}: positive operating leverage is finally showing up", "{C}: the efficiency ratio inflected without a restructuring charge"], deks: ["Revenue grew faster than expenses for the first time in three years and it happened without a one-off. That is the durable version of operating leverage.", "The cost base has been rebuilt and the revenue is arriving on top of it rather than alongside it."] },
      { id: "fin-book", d: "hold", heads: ["{C}: best in class, priced like it", "{C}: peak returns on equity is a poor entry point"], deks: ["Nothing is wrong with the franchise. Paying two times tangible book for a bank at peak return on equity is a bet on the cycle not turning.", "Quality is not in dispute. The price assumes the current return on equity is the through-cycle number, and it is not."] },
      { id: "fin-discount", d: "long", heads: ["{C}: the discount is now a governance question, not an earnings one", "{C}: the valuation gap widened and the earnings gap did not"], deks: ["The gap to global peers widened again this quarter while the earnings gap did not. What remains is a risk premium on process rather than on profits.", "Two of the three reasons for the historical discount have been addressed. The multiple has not moved."] },
    ],
    mechanism: [
      "The mechanism is deposit beta, the share of a rate move that passes into funding cost. Beta peaks after the rate cycle does, so the margin trough lags the rate peak by two to three quarters and then reverses mechanically.",
      "This runs through the provision line. Charge-offs hit earnings through the provision, and the provision is the reserve build plus the net charge-off, so a bank can be adequately reserved and still miss badly on earnings.",
      "The driver is revenue mix. Fee income does not reprice with the curve, so a rising fee share mechanically lowers the earnings beta to rates, which should compress the discount rate applied to the whole franchise.",
      "The economics turn on the regulatory capital constraint. Above the required ratio plus buffer, retained earnings have no productive use inside the bank, so they are returned; below it, they are trapped.",
      "The transmission is asset repricing. Fixed-rate assets reprice on a schedule set years ago, so the margin path is largely determined by the maturity ladder rather than by anything management does this year.",
      "Operating leverage in a bank is the gap between revenue growth and expense growth, and it is durable only when the expense base has been structurally reset rather than temporarily suppressed.",
      "The mechanism is the through-cycle return on equity. A multiple of book implies a sustainable return, and paying a peak multiple on a peak return double-counts the same optimism.",
      "The discount runs through the cost of equity rather than through earnings. Governance and disclosure quality enter the denominator, which is why the gap can widen while fundamentals converge.",
    ],
    evidence: [
      "The disclosure is explicit. Interest-bearing deposit beta declined sequentially for the first time this cycle and the non-interest-bearing mix was flat, which together mark the funding cost peak.",
      "The credit data is in the monthly filings rather than the quarterly release. Card net charge-offs have exceeded the reserve build for two consecutive periods, and the trend has not flattened.",
      "Segment reporting carries it. Fee-based revenue grew through a quarter in which net interest income fell, and the growth was spread across three separate fee lines rather than concentrated in one.",
      "Capital is the cleanest number here. The bank finished above its required ratio with a meaningful buffer and management confirmed no further build is planned.",
      "The maturity ladder is disclosed. The share of the book repricing in the next twelve months is materially lower than in the prior year, which caps how fast asset yields can rise.",
      "The expense evidence is that there was no charge. Revenue outgrew expenses without a restructuring item, which distinguishes this from the three prior attempts.",
      "The return on equity is at a cycle high by the bank's own long-run disclosure, and the multiple is at the high end of its own ten-year range at the same time.",
      "The peer comparison is the evidence. On the same forward earnings basis the discount to comparable franchises widened by several turns while relative earnings growth was unchanged.",
    ],
    risk: [
      "The risk is a renewed rate move that restarts deposit competition. Beta can re-accelerate quickly, and the margin argument would reverse with it.",
      "What breaks this is an unemployment move large enough to make the reserve inadequate rather than merely the earnings path wrong. That is a different and worse outcome.",
      "The main risk is that fee income proves more cyclical than it looks. Several of these lines are correlated with market levels, which is not the diversification the argument claims.",
      "Regulatory change is the risk that is not hedged. A revised capital requirement would trap the distribution this position depends on.",
      "The risk is that the curve steepens faster than assumed, which would make the repricing argument wrong in the direction that costs the most.",
      "A credit cycle would overwhelm the operating leverage argument entirely, and expense discipline is the first thing to break when revenue falls.",
    ],
  },

  healthcare: {
    angles: [
      { id: "hc-capacity", d: "long", heads: ["{C}: the constraint is manufacturing, not demand", "{C}: capacity is the whole story from here"], deks: ["Demand is established and supply is not. The next leg is decided by fill-finish capacity and payer coverage, which are logistics problems rather than scientific ones.", "Efficacy is settled. What remains is whether the company can make enough of it, and that is a capital project with a schedule."] },
      { id: "hc-script", d: "short", heads: ["{C}: script growth is decelerating into a harder comparison", "{C}: the guidance raise assumed the old trajectory"], deks: ["Prescription growth has slowed for three consecutive months against a base that gets materially tougher from here. The raise assumed the prior trajectory holds.", "The deceleration is visible in the weekly data and absent from the guidance. One of those has to move."] },
      { id: "hc-pipeline", d: "long", heads: ["{C}: the pipeline is worth more than the balance sheet discount", "{C}: three launches inside eighteen months, limited competition on two"], deks: ["Three launches land inside eighteen months with limited competition on two of them. The market still prices this as a levered generics business.", "The leverage that justified the discount has come down four turns while the pipeline improved. Neither has been re-rated."] },
      { id: "hc-payer", d: "short", heads: ["{C}: payer coverage is the gate and it is narrowing", "{C}: the reimbursement assumption is doing the work"], deks: ["Formulary decisions for next year narrowed coverage in two large books of business. Volume forecasts that assume current access are already stale.", "Access, not efficacy, sets the revenue. Access moved against this product and the model has not."] },
      { id: "hc-pricing", d: "long", heads: ["{C}: generic pricing is finally rational", "{C}: two competitors exited and pricing stabilised"], deks: ["Two competitors exited the injectable portfolio and pricing stabilised for the first time in years. A flat-price generics business at this leverage is a different security.", "The deflation that defined this industry has stopped in the categories that matter to this company."] },
      { id: "hc-catalyst", d: "long", heads: ["{C}: the readout is dated and the optionality is free", "{C}: a binary priced as though it has already failed"], deks: ["The trial reads out on a known date and the current price ascribes almost nothing to it. The asymmetry is the position, not the probability.", "Base business alone supports the current valuation, which makes the pipeline event free optionality with a calendar attached."] },
      { id: "hc-loe", d: "short", heads: ["{C}: the patent cliff arrives before the replacement does", "{C}: the bridge product is a year behind the erosion"], deks: ["Exclusivity lapses on a schedule and the replacement revenue arrives after it. The gap year is the problem and it is not in consensus.", "Erosion curves in this category are steep and well documented. The offsetting launch is not yet approved."] },
      { id: "hc-hold", d: "hold", heads: ["{C}: the science is right and the entry is not", "{C}: excellent asset at a price that needs everything to work"], deks: ["No disagreement about the product. The valuation requires flawless manufacturing scale-up and full payer coverage simultaneously.", "I want to own this and not here. The catalyst path is long and the entry assumes none of it slips."] },
    ],
    mechanism: [
      "The mechanism is capacity conversion. Fill-finish lines are built and validated on a multi-year schedule, and validated capacity, not demand, sets the revenue ceiling in any given year.",
      "This runs through the prescription data, which is reported weekly and leads reported revenue by a quarter. Deceleration in scripts therefore shows up in the model before it shows up in the release.",
      "The economics turn on exclusivity. A launch with limited competition earns close to monopoly economics for its exclusivity window, and the window length is known in advance.",
      "The transmission is formulary placement. A product's realised revenue is unit volume times net price after rebate, and formulary tier sets both, which is why access decisions move revenue more than efficacy data does.",
      "The driver is competitive structure. Generic pricing deflates while there are more than three suppliers and stabilises below that, so an exit is a step change rather than a trend improvement.",
      "The mechanism is probability-weighted optionality. When the base business alone covers the market capitalisation, a dated binary is a free call, and the position sizes to the asymmetry rather than to the odds.",
      "The economics turn on the erosion curve. Post-exclusivity revenue falls on a well-documented path, so the only question is whether replacement revenue arrives inside the gap.",
      "The constraint is that both scale-up and access have to work at once. They are independent risks, so the joint probability is materially lower than either alone, which is what a full price ignores.",
    ],
    evidence: [
      "Capacity is disclosed as a capital project with dates. Two additional lines are validated this year and a third next, which sets the supply curve independently of demand.",
      "The weekly script data is public. Growth has decelerated in each of the last three reported months against a comparison base that steepens from here.",
      "The pipeline evidence is regulatory rather than commercial. Three filings have accepted review dates inside eighteen months and two face no filed competitor.",
      "Formulary decisions for next year are published. Coverage narrowed in two large books, which mechanically lowers realised net price regardless of prescription volume.",
      "The competitive exits are confirmed in the exiting companies' own disclosures, and category pricing has been flat for two consecutive quarters for the first time in years.",
      "The readout date is fixed and disclosed. The current enterprise value is covered by the marketed portfolio on consensus numbers, which is what makes the event free.",
      "The exclusivity dates are public and the replacement filing has not yet been accepted, which places the launch after the erosion begins rather than before.",
      "The valuation embeds full capacity and full access on the disclosed timeline, with no allowance for the slippage that has occurred in two of the last three scale-ups in this category.",
    ],
    risk: [
      "The risk is a manufacturing failure or a regulatory hold on a new line, which converts a capacity story into a multi-quarter delay with no offset.",
      "What breaks this is a coverage expansion that re-accelerates scripts. Access decisions are revisited annually and one reversal would invalidate the deceleration argument.",
      "The risk is a competitor filing that removes the limited-competition assumption on one of the launches, which is the assumption doing most of the work.",
      "Pricing pressure from a payer coalition is the risk that is not company-specific and would overwhelm the access argument in either direction.",
      "A new entrant re-entering the category would restart deflation, and the pricing argument would go with it.",
      "Binary risk is exactly that: the readout can fail, and the position is sized so that outcome is survivable rather than hedged.",
    ],
  },

  energy: {
    angles: [
      { id: "en-breakeven", d: "long", heads: ["{C}: the project breakeven is below where the market models it", "{C}: full-cycle economics improved and the multiple did not"], deks: ["The latest development phase came in ahead of schedule and under budget. Full-cycle breakeven for the block is now low enough to turn the dividend into a lower-beta instrument.", "The asset base got cheaper to run while the sector multiple stayed where it was."] },
      { id: "en-refining", d: "short", heads: ["{C}: refining margins normalised faster than guidance admits", "{C}: the downstream contribution is reverting to mid-cycle"], deks: ["The downstream contribution that carried the last four quarters is reverting toward mid-cycle. Consensus is still extrapolating the peak.", "Crack spreads have already normalised. The earnings model has not been updated for it."] },
      { id: "en-capital-return", d: "hold", heads: ["{C}: the buyback is doing work the barrel is not", "{C}: excellent capital returns on a flat volume story"], deks: ["Capital returns are genuinely excellent and the underlying volume story is flat. That is a fine reason to own it and a poor reason to add here.", "Per-share metrics are improving because the share count is falling. The asset is not improving."] },
      { id: "en-discipline", d: "long", heads: ["{C}: capital discipline survived the last price spike", "{C}: the reinvestment rate stayed low when it did not have to"], deks: ["The company held its reinvestment rate through a price environment that historically triggers overbuilding. That is the whole investment case in this sector.", "Discipline is only observable under temptation, and this was the test."] },
      { id: "en-decline", d: "short", heads: ["{C}: base decline is accelerating underneath the headline production", "{C}: maintenance capital is rising to hold volumes flat"], deks: ["Holding production flat now requires more capital than it did two years ago. That is base decline showing up as capital intensity rather than as a volume miss.", "The production number looks stable because the spend is rising to keep it there."] },
      { id: "en-transition", d: "long", heads: ["{C}: the storage economics stopped needing the subsidy", "{C}: merchant economics now clear without support"], deks: ["Unsubsidised four-hour storage clears in three markets on merchant economics alone. That changes who the buyer is and how the contracts are written.", "The subsidy was the crutch and it is no longer load-bearing in the markets that set the price."] },
      { id: "en-contract", d: "long", heads: ["{C}: the backlog has repriced and the market has not noticed", "{C}: new contracts are being signed at materially better terms"], deks: ["Contracts signed this year carry both higher day rates and better cost-recovery terms than the backlog they replace. The mix improves mechanically for two years.", "Pricing power in this part of the chain shows up in contract terms long before it shows up in reported margin."] },
      { id: "en-hold", d: "hold", heads: ["{C}: the commodity call is doing all the work here", "{C}: a fine business with an unhedgeable input"], deks: ["Everything company-specific is working. The earnings are still primarily a function of a price nobody in this position can forecast.", "I would rather own the discipline than the barrel, and at this price you are paying for the barrel."] },
    ],
    mechanism: [
      "The mechanism is full-cycle breakeven, which includes development capital rather than just operating cost. A lower full-cycle breakeven raises the price band over which the distribution is safe, which is what changes the equity's risk profile.",
      "This runs through the crack spread. Refining earnings are the spread between product and crude prices, and that spread mean-reverts far faster than either underlying price does.",
      "The economics turn on share count. Buybacks raise per-share metrics without improving the asset, so the quality of the business and the trajectory of its per-share earnings can diverge for years.",
      "The driver is reinvestment rate: the share of cash flow put back into the ground. Low reinvestment converts a cyclical business into a distribution vehicle, and the discipline is only testable during a price spike.",
      "The transmission is base decline. Every producing asset declines, so maintenance capital is the spend required to hold volumes flat, and a rising maintenance requirement is a deteriorating asset reported as a stable one.",
      "The mechanism is merchant economics, meaning the project clears on market revenue alone. Once that threshold is crossed the addressable buyer set widens from subsidised programmes to anyone with a grid position.",
      "The economics run through contract terms rather than headline pricing. Cost-recovery provisions and duration change realised margin as much as the day rate does, and they are disclosed later.",
      "The constraint is that commodity price dominates the earnings variance. Company-specific improvements are real and second order against an input that moves more in a month than operations move in a year.",
    ],
    evidence: [
      "The project disclosure carries it. The latest phase was delivered under budget and ahead of schedule, and management gave a full-cycle breakeven for the block in the low thirties.",
      "Crack spreads are public and have already normalised toward the five-year average, while the guided downstream contribution still reflects the peak period.",
      "The share count is the clearest evidence. It has fallen meaningfully over two years while production volumes were flat, which fully accounts for the per-share improvement.",
      "Reinvestment rate is disclosed and it did not move through the price spike, which is the first time this company has passed that test.",
      "Maintenance capital is broken out. The spend required to hold volumes flat has risen materially over two years, which is base decline appearing as capital intensity.",
      "Three market operators have now cleared unsubsidised storage in their capacity auctions, which is the first evidence that merchant economics work without support.",
      "Contract terms are visible in the backlog disclosure. New awards carry both higher rates and improved cost recovery relative to the contracts rolling off.",
      "The sensitivity table in the filings makes the point: a ten percent move in the commodity price swings earnings by more than the entire operational improvement programme.",
    ],
    risk: [
      "The risk is a sustained price move below the breakeven band, which would put the distribution back in question regardless of project execution.",
      "What breaks this is a supply outage that re-widens crack spreads. Those happen without warning and would make the normalisation argument wrong for several quarters.",
      "The main risk is that capital discipline breaks at the next price spike, which is what has happened in every prior cycle in this industry.",
      "A regulatory or fiscal change in the host jurisdiction is the risk that is not hedged and would overwhelm the project economics entirely.",
      "The risk is that decline rates stabilise with a modest change in completion design, which has happened before and would remove the capital intensity argument.",
      "Policy reversal on storage support would not break merchant economics directly but would change the competitive set quickly enough to compress returns.",
    ],
  },

  industrials: {
    angles: [
      { id: "ind-backlog", d: "long", heads: ["{C}: the order book has outgrown its historical anchor", "{C}: backlog composition changed more than backlog size"], deks: ["Backlog from the new customer set passed the traditional one for the first time. That diversifies the political and cyclical risk the multiple has always carried.", "The size of the backlog is well known. Its composition changed this year and that has not been repriced."] },
      { id: "ind-conversion", d: "short", heads: ["{C}: the backlog is excellent and the delivery schedule is the risk", "{C}: demand was never the bottleneck, conversion is"], deks: ["Nothing is wrong with demand. Supply-chain conversion has slipped twice and the current price assumes it does not slip again.", "Book-to-bill is not the problem. Turning the book into revenue on schedule is, and the schedule has moved."] },
      { id: "ind-structural", d: "long", heads: ["{C}: this demand is structural, not cyclical", "{C}: multi-year commitments have replaced annual appropriations"], deks: ["Multi-year procurement commitments have replaced annual budget cycles across four major buyers. Order books that follow do not behave like a cycle.", "The funding mechanism changed, which changes the durability of the revenue rather than just its level."] },
      { id: "ind-capacity", d: "long", heads: ["{C}: capacity expansion is funded and the backlog already justifies it", "{C}: three plants come online against a book that runs past 2029"], deks: ["Three plant expansions come online within a year against a backlog that already extends past 2029. Conversion, not demand, has been the constraint.", "The capital is committed and the demand to fill it is contracted. That is an unusually low-risk expansion."] },
      { id: "ind-dealer", d: "short", heads: ["{C}: dealer inventory is absorbing the production", "{C}: retail demand and factory shipments have separated"], deks: ["Dealer inventories have risen for three quarters while retail sales were flat. Factory shipments are being absorbed by the channel rather than by customers.", "The production schedule has not yet acknowledged what the retail data has been saying since spring."] },
      { id: "ind-aftermarket", d: "long", heads: ["{C}: the aftermarket is the business and it is undervalued", "{C}: services revenue is compounding under a cyclical label"], deks: ["Aftermarket and services now contribute the majority of segment profit and grow independently of the equipment cycle. The whole company is still valued as a cyclical.", "The installed base generates recurring revenue that the cycle does not touch, and it has grown every year for a decade."] },
      { id: "ind-cost", d: "short", heads: ["{C}: fixed-price contracts and rising input costs do not mix", "{C}: the margin risk sits in contracts signed two years ago"], deks: ["A meaningful share of the backlog was priced before the input cost move and cannot be repriced. Those contracts convert at materially lower margin.", "The revenue is safe and the margin on it is not, which is the harder problem to communicate."] },
      { id: "ind-hold", d: "hold", heads: ["{C}: the cycle is right and the entry is late", "{C}: good business, priced for the whole upturn"], deks: ["The cyclical call is correct and largely realised. At this price you are underwriting the extension rather than the recovery.", "I would have owned this a year ago. Today the risk and reward have flipped."] },
    ],
    mechanism: [
      "The mechanism is backlog composition. Two order books of the same size behave differently if one is annually appropriated and the other is contractually committed, because only the second survives a budget cycle.",
      "This runs through conversion rate: the share of backlog that becomes revenue on schedule. A constrained supply chain lowers conversion without touching demand, so revenue misses while bookings look excellent.",
      "The economics turn on the funding mechanism. Multi-year commitments remove the annual re-authorisation risk, which lengthens the revenue duration and should compress the discount rate applied to it.",
      "The driver is capacity utilisation against a contracted book. An expansion built against committed demand carries far less risk than one built against forecast demand, and the market prices both the same way.",
      "The transmission is the channel. Factory shipments and retail sales can diverge for several quarters while dealers absorb inventory, and the correction arrives when floor-plan financing costs force a destock.",
      "The mechanism is the installed base. Equipment sold years ago generates parts and service revenue at higher margin and lower cyclicality, so the profit mix is far less cyclical than the revenue mix.",
      "The economics run through contract pricing. Fixed-price awards transfer input cost risk to the supplier, so an inflation move lands entirely in the margin on backlog signed before it.",
      "The constraint is where you are in the cycle. Cyclical earnings are highest at the point where the multiple should be lowest, and the two rarely align in the buyer's favour.",
    ],
    evidence: [
      "The backlog disclosure now splits by customer type, and the newer category passed the traditional one this year for the first time.",
      "Conversion is the number that missed. Book-to-bill remained above one while revenue came in below guidance, which isolates the problem to delivery rather than demand.",
      "The commitments are public. Four major buyers have moved to multi-year procurement frameworks, which is a documented change in mechanism rather than an inference from order flow.",
      "The expansion is disclosed with dates and costs, and the backlog it is being built against extends several years past the completion date.",
      "Dealer inventory is reported separately from factory shipments. It has risen in each of the last three quarters against flat retail sales.",
      "Segment reporting carries it. Aftermarket contributed the majority of segment operating profit while representing a minority of revenue, and it grew in a year when equipment did not.",
      "The backlog vintage is disclosed. A meaningful share was priced before the input cost move and the contracts contain no escalation clause.",
      "The cycle position is visible in the margin. Operating margin is at a cycle high and the multiple is not at a cycle low, which is the configuration that has historically produced poor forward returns.",
    ],
    risk: [
      "The risk is that the new customer set proves as cyclical as the old one once its own budget pressure arrives.",
      "What breaks this is a supply chain that resolves faster than expected, which would convert the backlog on schedule and make the conversion argument wrong.",
      "The main risk is political: multi-year commitments can be unwound by a change in government, and the duration argument depends on them not being.",
      "Execution risk on three simultaneous plant startups is real and has been mispriced in this industry before.",
      "The risk is a genuine retail re-acceleration that clears the channel without a production cut, which is the bull case and is not supported by the current data.",
      "A macro shock would compress the cyclical earnings faster than the aftermarket can offset, and that is not hedged here.",
    ],
  },

  autos: {
    angles: [
      { id: "auto-energy", d: "long", heads: ["{C}: storage is the line item that re-rates this", "{C}: the energy business has outgrown its label"], deks: ["Storage backlog now extends past combined installed capacity and grid operators are signing multi-year fixed-price contracts, which is the opposite of the vehicle business.", "The part of this company that behaves like an infrastructure business is growing fastest and is valued as an afterthought."] },
      { id: "auto-margin", d: "short", heads: ["{C}: the energy business cannot carry the vehicle multiple", "{C}: gross margin excluding credits is still compressing"], deks: ["Storage is the best part of this company and roughly a tenth of revenue. Vehicle gross margin excluding credits is still compressing and no plausible ramp closes that gap here.", "One good segment does not offset a deteriorating one that is nine times its size."] },
      { id: "auto-autonomy", d: "hold", heads: ["{C}: a 2028 asset priced as a 2026 one", "{C}: the technology is progressing and the regulation is not"], deks: ["The technology is genuinely progressing. The regulatory path in the two states that matter is not, and the discounted timeline requires both to move at once.", "The optionality is real and the date attached to it in the current price is not."] },
      { id: "auto-price", d: "short", heads: ["{C}: the price cuts bought volume and gave back the margin", "{C}: demand elasticity turned out to be worse than assumed"], deks: ["Each round of price reduction has produced less incremental volume than the last while costing the full margin. That is a demand curve flattening, not a share strategy.", "Volume responded once and has responded less every time since."] },
      { id: "auto-cost", d: "long", heads: ["{C}: cost per unit is falling faster than price", "{C}: the manufacturing curve is finally ahead of the pricing curve"], deks: ["Cost per vehicle fell faster than average selling price for the first time in six quarters. That is the only configuration in which this business scales profitably.", "Manufacturing efficiency has caught up with the pricing decisions taken two years ago."] },
      { id: "auto-hold", d: "hold", heads: ["{C}: right company for the decade, wrong price for the year", "{C}: the long-term case is intact and fully paid for"], deks: ["I do not disagree with where this ends up. I disagree with paying the terminal value today with the interim years unresolved.", "The structural case survives. The next four quarters are the problem and they are not discounted."] },
    ],
    mechanism: [
      "The mechanism is contract structure. Grid storage is sold on multi-year fixed-price agreements to counterparties with regulated revenue, which is a fundamentally different earnings stream from a consumer durable sold one at a time.",
      "This runs through segment weighting. A high-growth segment at a tenth of revenue needs several years of compounding before it can offset margin compression in the segment that is nine tenths of it.",
      "The economics turn on regulatory approval dates, which are not a function of technical readiness. A capability that works and cannot be deployed generates no revenue, so the timeline is set by the slower of the two.",
      "The driver is price elasticity. Each price cut trades margin for volume, and when the volume response decays the trade becomes value-destructive rather than share-accretive.",
      "The mechanism is the manufacturing cost curve against the pricing curve. Profitability improves only when unit cost falls faster than unit price, and those are independent processes.",
      "The constraint is discounting. Paying today for a cash flow several years out requires the intervening years to be at least neutral, and here they are the disputed part.",
    ],
    evidence: [
      "The backlog disclosure carries it. Contracted storage deployments extend beyond current and announced capacity combined, at fixed pricing disclosed in the filings.",
      "Segment revenue makes the scale problem explicit: the energy line is roughly a tenth of the total and vehicle gross margin excluding regulatory credits declined again this quarter.",
      "The regulatory position is public in both states and has not advanced in four quarters, while the technical demonstrations have.",
      "The elasticity is measurable across the price actions. Incremental volume per point of price reduction has declined with each successive round.",
      "The cost disclosure is the evidence. Cost per vehicle fell more than average selling price this quarter, reversing a six-quarter pattern.",
      "The valuation embeds the terminal outcome on the disclosed timeline with no discount for the interim margin trajectory.",
    ],
    risk: [
      "The risk is that storage capacity additions slip, which converts a contracted backlog into a delayed one and removes the near-term re-rating catalyst.",
      "What breaks the bear case is a faster energy ramp than the capacity plan implies, which would change the segment weighting sooner than the arithmetic suggests.",
      "Regulatory approval arriving earlier than expected is the risk to any position that depends on the timeline, and approvals have surprised in both directions.",
      "A genuine demand re-acceleration would restore elasticity and invalidate the pricing argument.",
      "Input cost inflation would reverse the cost curve argument directly, and it is not hedged in this position.",
    ],
  },

  media: {
    angles: [
      { id: "med-pricing", d: "long", heads: ["{C}: pricing power is showing up without churn", "{C}: the price increase did not cost the subscribers"], deks: ["The last price increase produced almost no measurable churn, which is the cleanest evidence of pricing power this business has ever produced.", "Willingness to pay was tested directly and the answer was better than the model assumed."] },
      { id: "med-content", d: "short", heads: ["{C}: content amortisation is flattering the current margin", "{C}: the cash cost and the reported cost have separated"], deks: ["Cash content spend has run above the amortised charge for several quarters. Reported margin improves while the cash economics do not.", "The accounting is not wrong and it is not the cash flow, and the gap has widened."] },
      { id: "med-ad-tier", d: "long", heads: ["{C}: the advertising tier is accretive per user, not dilutive", "{C}: the cheaper plan is earning more"], deks: ["Total revenue per user on the ad-supported tier has passed the equivalent subscription tier in the largest market. The cheap plan is the profitable one.", "The tier was launched as a retention tool and has turned into the better business."] },
      { id: "med-saturation", d: "short", heads: ["{C}: subscriber growth is now entirely price-led", "{C}: the addressable market argument has run out"], deks: ["Net additions in mature markets have been negative for two quarters and revenue growth is entirely price. That is a saturation profile.", "Growth from here requires either a new geography or a new price, and both have limits that are now visible."] },
      { id: "med-hold", d: "hold", heads: ["{C}: the strategy worked and the price reflects it", "{C}: excellent execution, unattractive entry"], deks: ["Everything management said they would do, they did. The multiple now assumes they do it again at the same rate for several more years.", "This is a fine business at an unfine price."] },
    ],
    mechanism: [
      "The mechanism is churn elasticity. A price increase is accretive only if the revenue gain exceeds the churn cost, and the elasticity is only observable after the fact.",
      "This runs through content accounting. Produced content is capitalised and amortised over its expected life, so reported cost and cash cost diverge whenever the production slate is growing.",
      "The economics turn on total revenue per user, which nets advertising and subscription together. A lower-priced tier with advertising can exceed a higher-priced tier without it.",
      "The driver is market penetration. Once a market saturates, revenue growth decomposes entirely into price, and price has an elasticity ceiling that penetration growth does not.",
      "The constraint is the multiple's implied duration. A high multiple on a subscription business assumes both continued net additions and continued pricing, and saturation removes one of them.",
    ],
    evidence: [
      "The churn disclosure supports it. The most recent price action produced a measured churn response well below the prior two, in the same markets.",
      "The cash flow statement carries the divergence. Cash spent on content exceeded the amortised charge again this quarter, and the gap has widened for four periods.",
      "Management disclosed total revenue per user by tier for the first time, and the advertising tier exceeded the equivalent subscription tier in the largest market.",
      "Net additions in the mature markets were negative for the second consecutive quarter while revenue grew, which isolates the growth to price.",
      "The multiple sits well above the subscription peer group on the same forward basis, with a lower disclosed net-add trajectory.",
    ],
    risk: [
      "The risk is that churn responds with a lag. Subscription churn often shows up one or two billing cycles after the price action rather than immediately.",
      "What breaks the accounting argument is a slate that stops growing, which would close the cash and amortisation gap without any change in strategy.",
      "The advertising market is cyclical, and a downturn would reverse the tier economics quickly.",
      "A successful new market entry would extend the penetration runway and invalidate the saturation argument.",
      "Competitive content spending is the risk that is not hedged and would compress margins across the category.",
    ],
  },

  hardware: {
    angles: [
      { id: "hw-services", d: "long", heads: ["{C}: the services line is the whole equity story now", "{C}: recurring revenue has quietly become the majority of profit"], deks: ["Services now contribute the majority of gross profit and grow independently of the hardware refresh cycle. The company is still valued on unit shipments.", "The installed base is the asset. The hardware is increasingly the acquisition cost for it."] },
      { id: "hw-cycle", d: "long", heads: ["{C}: the replacement cycle is longer than assumed and about to end", "{C}: the installed base is older than it has ever been"], deks: ["Average device age in the installed base is at a record and replacement cycles do not extend indefinitely. The pent-up upgrade is a when, not an if.", "Every quarter the cycle extends makes the eventual refresh larger."] },
      { id: "hw-margin", d: "short", heads: ["{C}: hardware margin is being defended with mix, not cost", "{C}: the average selling price is doing the work"], deks: ["Gross margin has held only because the mix skewed to premium models. Underlying cost per unit has not improved and the mix lever is nearly exhausted.", "Defending margin with mix works until the premium tier stops growing."] },
      { id: "hw-concentration", d: "short", heads: ["{C}: customer concentration is now the dominant risk", "{C}: two customers and a thin contract"], deks: ["Two customers account for the majority of revenue and neither has a long-term volume commitment. That is a structural discount the multiple does not carry.", "The revenue is high quality until the day it is not, and there is no contractual floor."] },
      { id: "hw-hold", d: "hold", heads: ["{C}: a durable franchise at a full price", "{C}: nothing to fix and nothing cheap about it"], deks: ["There is no operational problem to solve here. There is also no margin of safety at this multiple for a business with this cyclicality.", "Quality is not the question. Price is."] },
    ],
    mechanism: [
      "The mechanism is attach and retention on the installed base. Services revenue scales with active devices rather than with units sold, so it grows even in a weak hardware year.",
      "This runs through device age. Replacement demand is a function of the age distribution of the installed base, which is observable and which mean-reverts.",
      "The economics turn on mix versus cost. Margin defended by selling more expensive units is not the same as margin defended by making units more cheaply, and only the second is durable.",
      "The driver is contractual structure. Revenue concentrated in a small number of customers without volume commitments carries a higher cost of capital, whether or not the market applies one.",
      "The constraint is cyclicality. A hardware franchise earns a premium multiple only if the recurring share of profit is large enough to dampen the cycle, and that threshold is specific and measurable.",
    ],
    evidence: [
      "Segment reporting makes it explicit. Services contributed the majority of gross profit this year while representing a minority of revenue, and grew in a year when hardware declined.",
      "Management disclosed the installed base age distribution, and average device age is at a record.",
      "The margin bridge shows mix as the entire contribution. Cost per unit was flat while average selling price rose, which isolates the improvement to the mix lever.",
      "The concentration is disclosed in the filings, along with the absence of minimum volume commitments from either large customer.",
      "The recurring profit share is below the level at which peers have historically sustained a premium multiple.",
    ],
    risk: [
      "The risk is a services regulatory decision that changes the economics of the attach, which would remove the argument at a stroke.",
      "What breaks the cycle argument is a structural extension in device life, which has happened before and would push the refresh out indefinitely.",
      "The mix lever could extend further than expected if the premium tier keeps growing, which would make the margin argument early rather than wrong.",
      "Losing either large customer is the risk that dominates all others and is not hedged in this position.",
      "A broad multiple compression would hit this name harder than the market given the cyclicality.",
    ],
  },

  materials: {
    angles: [
      { id: "mat-pricing", d: "long", heads: ["{C}: contract pricing reset higher and the market missed it", "{C}: the annual reset landed above the spot narrative"], deks: ["Annual contract pricing settled above where the spot commentary implied. Contract, not spot, is the majority of this company's realised price.", "The spot market gets the headlines and the contract book gets the revenue."] },
      { id: "mat-cost", d: "long", heads: ["{C}: the cost position moved down the curve", "{C}: an energy input change that the model has not caught"], deks: ["A change in the energy input mix moved this producer down the global cost curve. Cost curve position, not price, determines who survives the trough.", "The margin improvement is structural rather than cyclical and it has not been reflected."] },
      { id: "mat-demand", d: "short", heads: ["{C}: end demand is destocking and the price is not reflecting it", "{C}: the order book is thinner than the spot price implies"], deks: ["Downstream customers are working through inventory and order intake has slowed for two quarters while spot prices held. Prices follow order books with a lag.", "The spot price is the last thing to move in a destock."] },
      { id: "mat-hold", d: "hold", heads: ["{C}: good asset, wrong point in the price cycle", "{C}: quality producer at a cyclical peak"], deks: ["This is a genuinely low-cost producer. Buying a commodity producer at a peak realised price has historically been a poor entry regardless of asset quality.", "The company is fine. The cycle position is the objection."] },
    ],
    mechanism: [
      "The mechanism is the contract-to-spot ratio. When most volume is sold on annual contracts, realised price follows the contract reset rather than the spot market, and the two can diverge for a full year.",
      "This runs through cost curve position. In a commodity, the marginal producer sets the price and everyone below them earns the spread, so moving down the curve is a permanent margin gain.",
      "The economics turn on the destocking cycle. Downstream inventory adjustments suppress order intake well before they suppress price, so order books lead prices by a quarter or two.",
      "The constraint is that a commodity producer's earnings are a function of a price it does not set, which caps how much company-specific improvement can be worth at a cyclical peak.",
    ],
    evidence: [
      "The contract settlement is disclosed and landed above the level implied by spot commentary, and contracts are the majority of volume.",
      "The energy contract change is in the filings and moves the producer's cash cost meaningfully relative to the disclosed global curve.",
      "Order intake has declined for two consecutive quarters while spot prices were flat, which is the classic destocking signature.",
      "Realised price is near the top of its ten-year range while the multiple is not near the bottom of its own.",
    ],
    risk: [
      "The risk is that the contract book reprices lower at the next reset if spot stays weak, which delays rather than reverses the argument.",
      "A competitor making the same input change would erode the relative cost advantage.",
      "A restock arriving earlier than expected would invalidate the demand argument quickly.",
      "Commodity price risk dominates and is not hedged in this position.",
    ],
  },
};

/** Callless commentary, anchored on a theme rather than a single name. */
export const NOTE_ANGLES: { tag: string; heads: string[]; deks: string[]; body: string[] }[] = [
  { tag: "ai-buildout", heads: ["The AI capex debate is really a depreciation debate", "Nobody is arguing about the spend, only about its useful life"], deks: ["Nobody disputes the spend. The disagreement is whether an accelerator is a three-year asset or a six-year one, and the sector's entire earnings power sits on that line.", "The capex number is agreed. The schedule it is written off over is not, and that single assumption swings sector earnings by more than any demand forecast."], body: ["Take the two ends of the range. On a three-year life the depreciation charge consumes most of the incremental revenue the fleet generates, and the buildout is roughly earnings-neutral for its duration. On six years it is materially accretive from the second year. Same revenue, same capex, opposite conclusion.", "The honest answer is that nobody knows yet, because no fleet of this generation has reached end of life. What can be observed is utilisation: hardware that is still fully utilised in year four is telling you something about its economic life that the accounting schedule is not.", "The reason this matters now rather than later is that the disclosure is about to force the question. Several operators are approaching the point where the original fleet's schedule expires, and how they treat it will set the convention for everyone else."] },
  { tag: "grid-capex", heads: ["Interconnect queues are the real constraint on the AI trade", "The binding constraint is a substation, not a fab"], deks: ["Three of the four largest datacenter corridors have utility interconnect backlogs past 2027. Everything downstream of that queue is capacity-gated regardless of chip supply.", "Compute is being built faster than the grid that has to power it, and the grid is the slower of the two to change."], body: ["The queue is a physical and regulatory process, not a commercial one. A new large load needs a transmission study, an upgrade allocation and a construction slot, and none of those compress in response to willingness to pay.", "This reframes several trades. If power is the constraint, then the companies that own interconnection rights, generation adjacency or on-site capability hold an option that has not been priced as one, while the chip supply chain is solving a problem that is no longer binding.", "The counterargument is behind-the-meter generation, which genuinely does bypass the queue. It is also capital intensive, permitting-constrained in its own way, and available at a scale well below the announced compute pipeline."] },
  { tag: "rates", heads: ["The front end has stopped believing the projected path", "Two-year yields and the dot plot have decoupled again"], deks: ["Two-year yields have decoupled from the projected policy path for six weeks. When that gap persists past a quarter, the projections have historically moved to the market rather than the reverse.", "The market and the committee disagree about next year, and the market has usually been the one that was right."], body: ["The mechanism is that the front end prices the expected path plus a term premium, so a persistent gap is either a disagreement about the reaction function or a change in the premium. Decomposing the two is the whole exercise.", "History is not subtle here. In the majority of episodes where the gap held for a full quarter, the projections converged toward the market rather than the market toward the projections.", "For positioning, the useful implication is not directional. It is that duration risk is currently asymmetric: the path is priced for one outcome, and the distribution around it is wider than the pricing implies in one direction only."] },
  { tag: "memory", heads: ["HBM pricing is holding because substitution does not exist", "This is a pricing structure rather than a memory cycle"], deks: ["Conventional memory pricing rolled over while high-bandwidth contracts held firm. There is no second source at the required bandwidth, which makes this structural.", "Two tiers of the same industry have decoupled on price, and only one of them has a substitute."], body: ["Commodity memory is a textbook cyclical: capacity is fungible, supply responds to price, and margins mean-revert. The high-bandwidth tier is not fungible, because qualification is customer-specific and takes years.", "That distinction shows up in contract structure. Commodity is sold near spot while the premium tier is sold on multi-quarter agreements at negotiated prices, and the second does not reprice when the first does.", "The risk to this view is capacity conversion. If enough conventional capacity can be converted to the premium tier inside two years, the structure becomes a cycle after all, and the current spread is temporary."] },
  { tag: "israel", heads: ["The local discount is now a governance question", "The valuation gap widened and the earnings gap did not"], deks: ["The discount to global peers widened again this quarter while relative earnings did not. What is left is a risk premium on process rather than on profits.", "Two of the three reasons usually given for the discount have been addressed. The multiple has not moved."], body: ["Decompose the discount and it has historically had three components: political risk, liquidity, and governance and disclosure standards. The first is unchanged, the second has improved materially with index inclusion, and the third is where the remaining gap sits.", "That matters because governance is the component a company can actually address on its own timetable. Several have, and the market has not yet differentiated between those that did and those that did not.", "The trade this implies is relative rather than directional: own the names that have closed the disclosure gap against the ones that have not, rather than owning the market and waiting for a re-rating that may not be general."] },
  { tag: "obesity-drugs", heads: ["The weight-loss trade moved from efficacy to distribution", "Manufacturing and coverage now decide this, not the science"], deks: ["Both leaders have proven the drug works. The next leg is decided by manufacturing capacity and payer coverage, which are logistics problems rather than scientific ones.", "The scientific question is closed. The industrial and reimbursement questions are open and are worth more."], body: ["When efficacy is established across a category, the differentiator becomes supply. Fill-finish capacity is the binding constraint and it is a multi-year capital project, so the supply curve for the next three years is already largely determined.", "The second gate is payer coverage, which sets net price rather than volume. A product with full access at a lower net price can generate more revenue than one with narrow access at a higher one, and formulary decisions are annual and public.", "The implication is that the differentiated analysis is now industrial. Tracking validated line capacity and formulary placement is closer to covering a specialty manufacturer than covering a biotech."] },
  { tag: "energy-transition", heads: ["Grid storage quietly stopped needing the subsidy", "Merchant economics now clear in three markets"], deks: ["Unsubsidised four-hour storage clears in three US markets on merchant economics alone. That changes who the buyer is and how projects are financed.", "The subsidy was load-bearing until this year. In the markets that matter it no longer is."], body: ["Merchant clearing means the project earns its return from market revenue without a support mechanism. Once that threshold is crossed the buyer set widens from programme-driven developers to anyone with a balance sheet and a grid position.", "It also changes the financing. Merchant projects can be underwritten on market revenue curves, which brings in a different and much larger pool of capital than subsidy-dependent projects can access.", "The caveat is that clearing at current spreads is not the same as clearing through a cycle. Spreads compress as storage penetration rises, and the projects being underwritten today are being underwritten on today's spreads."] },
  { tag: "defense", heads: ["European procurement is structural, not cyclical", "Multi-year frameworks have replaced annual appropriations"], deks: ["Multi-year procurement commitments have replaced annual appropriations across four major buyers. The order books that follow do not behave like a cycle.", "The funding mechanism changed this year, which changes the durability of the revenue rather than merely its level."], body: ["An annually appropriated order book carries re-authorisation risk every year, so it is correctly valued as cyclical. A multi-year framework removes that risk for its duration, which lengthens revenue duration and should lower the discount rate applied.", "The industrial constraint is conversion rather than demand. Capacity for munitions and long-lead components was sized for the previous regime and is being expanded now, which puts the revenue two to three years out rather than next year.", "The risk is political reversal, which is real but slower than it looks: frameworks of this type generally survive a single change of government because the contracts are already signed."] },
  { tag: "payments", heads: ["Take-rate compression is showing up where it matters", "Two decisions this year set a ceiling nobody has modelled"], deks: ["The networks held pricing for a decade. Two regulatory decisions this year set a ceiling the models have not incorporated.", "This is no longer a headline risk. It is a disclosed constraint with a number attached."], body: ["Take rate is the product of interchange, network fees and value-added services. Regulation has historically targeted only the first, which is why prior rounds did little damage. These decisions reach further.", "The effect is on terminal value rather than near-term earnings, which is why the market underreacts. A capped monetisation rate changes the growth rate in perpetuity even if next year's number is unaffected.", "The offset is value-added services, which remain unregulated and are growing faster than the core. Whether that is enough depends on mix arithmetic that is now the central question for the sector."] },
  { tag: "china", heads: ["The export-control cycle has a predictable second order", "Every restriction round produces a substitution push eighteen months later"], deks: ["Each restriction round has been followed by a domestic substitution push that lands about eighteen months later. We are approaching that lag on the most recent round.", "The first-order effect is a revenue hit. The second-order effect is a competitor, and it is the larger one."], body: ["The pattern has repeated across three rounds. Restriction removes a market, domestic programmes are funded in response, and a viable domestic alternative appears roughly six quarters later, at which point the lost market does not come back even if policy reverses.", "That asymmetry is the important part. The revenue lost to a control is recoverable in principle and the revenue lost to a qualified domestic competitor is not, because qualification is sticky.", "For the affected names the useful question is not what the next restriction does to this year's revenue. It is which product lines have a credible domestic substitute in development, because those are the ones where the loss is permanent."] },
  { tag: "inflation", heads: ["Services inflation is a wage story with a shelter lag", "Strip shelter and the print is already near target"], deks: ["Strip shelter and the services print is close to target. The remaining gap is a measurement lag, and positioning is set for the headline rather than the composition.", "The composition of the print matters more than its level right now, and the composition is better than the headline."], body: ["Shelter enters the index with a long lag because it is measured from a rolling sample of leases rather than from new-lease pricing. New-lease data has been decelerating for several quarters and the index has not yet reflected it.", "The rest of services tracks wages, and wage growth has been decelerating on every measure that is not the headline average, which is distorted by composition effects.", "The practical implication is that the disinflation already in the pipeline is larger than the current print suggests, and positioning built on the headline is positioned for a number that mechanically has to fall."] },
  { tag: "valuation", heads: ["What a market multiple assumes that nobody writes down", "The two inputs nobody states when they quote a multiple"], deks: ["A market multiple embeds a terminal growth rate and a discount rate. Both are currently at levels that require the other to be wrong.", "Quoting a multiple without stating its implied inputs hides the actual assumption being made."], body: ["Invert the multiple and it resolves to a required return given a growth assumption. At current levels the implied combination is either a terminal growth rate above the long-run nominal economy or an equity risk premium near historic lows.", "Neither is impossible on its own. Both simultaneously is the part worth flagging, because the usual defence of one implicitly assumes the other is conservative.", "This is not a timing argument. Multiples can hold implausible inputs for years. It is an argument about what the forward return distribution looks like from here, which is narrower and lower than the trailing experience."] },
];

/**
 * Reader comments are composed from three banks rather than picked from a fixed
 * list, because a fixed list of a dozen put identical text under different
 * commenters. Composition gives well over ten thousand combinations for the
 * ~1,200 comments the seed writes, and the seed still de-duplicates on top.
 */
export const COMMENT_OPENERS = [
  "Good piece.", "This is the clearest write-up I have seen on the name.", "Not convinced, but well argued.",
  "Been long since the last one.", "Respectfully, I think this overstates it.", "Finally someone put numbers on this.",
  "I have been waiting for someone to make this argument.", "Agree with the direction, less with the magnitude.",
  "This changed my mind.", "Reading this against my own model.", "Thanks for showing the workings.",
  "I hold the other side of this.", "Useful framing.", "This is the second-order point everyone skips.",
  "I came in sceptical.", "Good to see an invalidation level actually stated.", "This lines up with what I saw in the filings.",
  "Strong piece, one objection.", "I think the setup matters more than the thesis here.", "Been on the sidelines on this one.",
];
export const COMMENT_POINTS = [
  "The mix argument is the part I had not considered properly.",
  "The channel data is what makes this hard to dismiss.",
  "The comp table did more work for me than the narrative did.",
  "Second source in a constrained market is genuinely underrated.",
  "The cohort split is the detail that everyone leaves out.",
  "The capital intensity point is the one I keep coming back to.",
  "Splitting volume from price is what makes this legible.",
  "The lag between intake and revisions is the whole trade.",
  "The margin bridge is doing more work here than is acknowledged.",
  "The contract structure matters more than the headline rate.",
  "I had not appreciated how much of this is already in consensus.",
  "The regulatory ceiling being quantified changes the model, not just the headline.",
  "The distinction between adequate reserves and the earnings path is well made.",
  "The installed base argument is stronger than the cycle argument here.",
  "The utilisation assumption is where I disagree.",
  "The exclusivity window is the part the market keeps mispricing.",
  "The destocking signature is textbook and nobody is naming it.",
  "The point about conversion rather than demand is the right one.",
  "The depreciation schedule really is the whole disagreement.",
  "The elasticity decay across the price actions is the tell.",
];
export const COMMENT_CLOSERS = [
  "Where does this break if rates back up another 50bp?",
  "What is the level where you would walk away?",
  "How much of this do you think is already in the buy side's numbers?",
  "Does the thesis survive a soft guide next quarter?",
  "Curious whether you would still size it the same at a higher entry.",
  "What would you need to see to add rather than hold?",
  "Any view on how the read-across affects the rest of the group?",
  "Is there a cleaner way to express this than the equity?",
  "How are you thinking about the timing risk here?",
  "What does the bear actually have to be right about?",
  "Would you underwrite this without the catalyst date?",
  "Does the same logic apply to the closest comparable?",
  "How much does this depend on the macro cooperating?",
  "What is the base rate on this kind of setup working?",
  "Interested in what the kill switch looks like in practice.",
  "Has anything in the last print changed the entry you would take?",
];
export const AUTHOR_REPLY_OPENERS = [
  "Fair challenge.", "That is the right objection.", "Agreed on the first part, not the second.",
  "Good question.", "This is the one I get most.", "Reasonable, and I have thought about it a lot.",
  "You are right that I skipped over that.", "Partly yes.", "That is where I would push back.",
  "Honestly, that is the weakest part of the piece.",
];
export const AUTHOR_REPLY_BODIES = [
  "Invalidation is a close below the lock price on volume, and I should have written that into the card rather than leaving it implicit.",
  "The sell side has the direction and not the magnitude, and the magnitude is the entire trade here.",
  "Rates hit the multiple rather than the earnings path. A 50bp move costs perhaps two turns and does not touch the thesis.",
  "Early is a fair criticism of my last one on this name. The difference here is that the catalyst is dated rather than open-ended.",
  "It survives a soft guide. It does not survive a second one, which is why the horizon is short.",
  "I would size it smaller at a higher entry rather than skip it, because the asymmetry degrades gradually rather than cliff-edges.",
  "The read-across is real for the closest comparable and much weaker beyond it, because the contract structures differ.",
  "The bear has to be right that the channel clears without a guide-down. That is possible and it is not what the sell-through says.",
  "Without the catalyst date I would not underwrite it. The date is doing a lot of the work and I would rather say that plainly.",
  "The macro has to be neutral rather than helpful. If it is actively hostile this does not work and nothing in the position hedges that.",
  "The comp table took longer than the rest of the piece put together, so I am glad it was the useful part.",
  "That is the objection in the steelman card. My answer is that the supply response is slower this time, which changes the timing rather than the direction.",
];

/* ------------------------------------------------------------------ forge --- */

export type Composed = {
  ticker: string | null;
  direction: Direction;
  headline: string;
  /** The dek, stored as `reports.summary`. */
  dek: string;
  /** The full thesis, stored in `report_bodies`. Never the dek repeated. */
  body: string;
  themeTagHint: string | null;
};

function shuffled<T>(arr: readonly T[], rnd: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Issues publication text and guarantees that no two publications share a
 * headline or a body.
 *
 * Headline uniqueness is enforced by consuming (ticker, angle, headline-form)
 * triples: each is handed out at most once across the whole dataset. When an
 * analyst's own coverage list is exhausted the forge widens to the fallback
 * tickers rather than repeating a headline, which is why a heavily covered name
 * like NVDA cannot accumulate six identical titles under six bylines.
 */
export class ContentForge {
  private usedHead = new Set<string>();
  private usedBody = new Set<string>();
  private usedNote = new Set<string>();
  private usedComment = new Set<string>();

  constructor(
    private sectorOf: (ticker: string) => string | undefined,
    private themeOf: (ticker: string) => string | undefined,
    private rnd: () => number = Math.random,
  ) {}

  private bank(ticker: string): SectorBank | undefined {
    const sector = this.sectorOf(ticker);
    return sector ? SECTOR_BANKS[sector] : undefined;
  }

  /** Angles in `bank` that argue `direction`. */
  private anglesFor(bank: SectorBank, direction: Direction): Angle[] {
    const exact = bank.angles.filter((a) => a.d === direction);
    return exact.length ? exact : bank.angles;
  }

  /**
   * Order a bank so the entry written alongside `angleIndex` comes first.
   *
   * The banks are authored in the same order as their sector's angles, so
   * entry i argues the same point as angle i. Trying that one first keeps a
   * body arguing its own headline; the rest follow as fallbacks, which is what
   * lets uniqueness win when the preferred combination is already spent.
   */
  private aligned(bank: readonly string[], angleIndex: number): string[] {
    if (bank.length === 0) return [];
    const head = bank[angleIndex % bank.length];
    return [head, ...shuffled(bank.filter((x) => x !== head), this.rnd)];
  }

  private composeBody(
    bank: SectorBank,
    direction: Direction,
    name: string,
    target: number | null,
    angleIndex: number,
  ): string {
    const mech = this.aligned(bank.mechanism, angleIndex);
    const evid = this.aligned(bank.evidence, angleIndex);
    const risks = this.aligned(bank.risk, angleIndex);
    const stance =
      direction === "hold"
        ? `The position: no call. This is a name I want to own and not at this level, so there is nothing locked here and nothing for the record to grade. If the entry improves I will say so in a piece that does carry a call.`
        : `The position: ${direction} on ${name}, entry locked at publication and the exit dated rather than open-ended.${
            target ? ` The target is stated in the call block above and the horizon with it.` : ""
          } Sized to the catalyst rather than to conviction, with the invalidation written into the kill-switch card instead of left implicit.`;

    for (const m of mech) {
      for (const e of evid) {
        for (const r of risks) {
          const body = `${m}\n\n${e}\n\n${stance}\n\n${r}`;
          if (!this.usedBody.has(body)) {
            this.usedBody.add(body);
            return body;
          }
        }
      }
    }
    // Space exhausted for this sector: fall back to the least-bad unique combination.
    const body = `${mech[0]}\n\n${evid[0]}\n\n${stance}\n\n${risks[0]}\n\n${name} remains the cleanest way to express this in the sector.`;
    this.usedBody.add(body);
    return body;
  }

  /**
   * Compose a publication carrying a view on one of `tickers`, preferring the
   * earlier entries. Returns null only if every candidate headline is spent.
   */
  compose(tickers: string[], direction: Direction, targetKnown = true): Composed | null {
    for (const ticker of tickers) {
      const bank = this.bank(ticker);
      if (!bank) continue;
      const name = SHORT_NAME[ticker] ?? ticker.replace(".TA", "");
      for (const angle of shuffled(this.anglesFor(bank, direction), this.rnd)) {
        // Position in the sector's own angle list, which is the index the
        // mechanism / evidence / risk banks are written against.
        const angleIndex = Math.max(0, bank.angles.indexOf(angle));
        for (const form of shuffled(angle.heads, this.rnd)) {
          const headline = form.replace(/\{C\}/g, name);
          if (this.usedHead.has(headline)) continue;
          this.usedHead.add(headline);
          const dek = shuffled(angle.deks, this.rnd)[0].replace(/\{C\}/g, name);
          return {
            ticker,
            direction: angle.d,
            headline,
            dek,
            body: this.composeBody(bank, angle.d, name, targetKnown ? 1 : null, angleIndex),
            themeTagHint: this.themeOf(ticker) ?? null,
          };
        }
      }
    }
    return null;
  }

  /** A callless thematic note. Returns null once every note form is spent. */
  composeNote(): Composed | null {
    for (const note of shuffled(NOTE_ANGLES, this.rnd)) {
      for (const head of shuffled(note.heads, this.rnd)) {
        if (this.usedNote.has(head)) continue;
        this.usedNote.add(head);
        const paras = shuffled(note.body, this.rnd);
        const body = paras.join("\n\n");
        this.usedBody.add(body);
        return {
          ticker: null,
          direction: "hold",
          headline: head,
          dek: shuffled(note.deks, this.rnd)[0],
          body,
          themeTagHint: note.tag,
        };
      }
    }
    return null;
  }

  /** A reader comment, composed so no two commenters post the same text. */
  comment(): string {
    for (let i = 0; i < 400; i++) {
      const parts = [
        COMMENT_OPENERS[Math.floor(this.rnd() * COMMENT_OPENERS.length)],
        COMMENT_POINTS[Math.floor(this.rnd() * COMMENT_POINTS.length)],
        COMMENT_CLOSERS[Math.floor(this.rnd() * COMMENT_CLOSERS.length)],
      ];
      const text = parts.join(" ");
      if (!this.usedComment.has(text)) {
        this.usedComment.add(text);
        return text;
      }
    }
    const fallback = `${COMMENT_OPENERS[0]} ${COMMENT_POINTS[0]} ${COMMENT_CLOSERS[0]} (${this.usedComment.size})`;
    this.usedComment.add(fallback);
    return fallback;
  }

  /** An author reply, unique for the same reason. */
  reply(): string {
    for (let i = 0; i < 400; i++) {
      const text = `${AUTHOR_REPLY_OPENERS[Math.floor(this.rnd() * AUTHOR_REPLY_OPENERS.length)]} ${
        AUTHOR_REPLY_BODIES[Math.floor(this.rnd() * AUTHOR_REPLY_BODIES.length)]
      }`;
      if (!this.usedComment.has(text)) {
        this.usedComment.add(text);
        return text;
      }
    }
    const fallback = `${AUTHOR_REPLY_OPENERS[0]} ${AUTHOR_REPLY_BODIES[0]} (${this.usedComment.size})`;
    this.usedComment.add(fallback);
    return fallback;
  }

  stats() {
    return { headlines: this.usedHead.size, bodies: this.usedBody.size, notes: this.usedNote.size, comments: this.usedComment.size };
  }
}
