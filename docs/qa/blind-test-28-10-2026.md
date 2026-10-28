# Blind test: 10 new videos (28 Oct 2026)

Branch `feat/interest-cart-extension`. The prompt, the alias table and the rules were **not changed** during this test: detection ran exactly as tuned on the first six videos (stored-result version `v4`, Claude Haiku at high effort). Each video was opened in Bar's Chrome with the real extension, which read the transcript itself and asked Stoa running locally. Then the stored result was deleted and the video opened again for a second, independent AI read.

**How to read the tables.** A *card* pops up beside the video; a *chip* only joins the "In this video" line. *Starts at* links to the moment the card (or chip) belongs to, from run 1 (run 2 when only run 2 found it). *Same* means both runs found the ticker with the same type and the same side; the *conditional* flag and the exact start time are not compared.

## Summary

| | |
|---|---|
| Videos | 10 (3 Hebrew, 7 English, 10 channels) |
| Transcripts read | 10 of 10, both runs |
| Cards found (run 1) | 42 |
| Cards I'm unsure about | 7 (Caterpillar, Intel, Chevron on r2pmF9zJobE; Meta on S1qUsBnFG_s; Nebius on LSoYG4ZuyIU; Meta on hblOwlplNoo; TQQQ on pyijqV6899Q) |
| Likely misses | 4 (CIFR, VGT, Broadcom as a card, the Tom Nash rapid-fire list) |
| Run-to-run agreement, ticker with type and side | **88%** (43 of 49) |
| Run-to-run agreement, which tickers were found at all | **96%** (47 of 49) |
| Cards that agreed exactly | 38 of 43 distinct cards (88%) |

Nine of the ten videos gave the same tickers in both runs; only the Micha.Stocks earnings preview did not (Visa and Chevron appeared once). The disagreements are almost all about the *side* (bull, bear or none) on companies the speaker discussed without a clear call.

## The videos

### 1. מייקרוסופט, גוגל ואמזון מדווחות, מה הן חייבות להראות לכם - חלק 2

Micha.Stocks · Hebrew · Earnings preview, many companies · 18:46 · https://www.youtube.com/watch?v=r2pmF9zJobE

| Ticker | Name | Starts at | Run 1 | Run 2 | Same |
|---|---|---|---|---|---|
| MSFT | Microsoft Corporation | [2:59](https://www.youtube.com/watch?v=r2pmF9zJobE&t=179s) | Card, no side | Card, no side | Yes |
| GOOGL | Alphabet Inc. | [4:45](https://www.youtube.com/watch?v=r2pmF9zJobE&t=285s) | Card, no side | Card, no side | Yes |
| LLY | Eli Lilly and Company | [7:22](https://www.youtube.com/watch?v=r2pmF9zJobE&t=442s) | Card, bull | Card, bull | Yes |
| MA | Mastercard Incorporated | [9:29](https://www.youtube.com/watch?v=r2pmF9zJobE&t=569s) | Card, bull | Card, bull | Yes |
| V | Visa Inc. | [9:35](https://www.youtube.com/watch?v=r2pmF9zJobE&t=575s) | Chip, bull | not found | **No** |
| CAT | Caterpillar, Inc. | [10:38](https://www.youtube.com/watch?v=r2pmF9zJobE&t=638s) | Card, no side | Card, bull (conditional) | **No** |
| AMZN | Amazon.com, Inc. | [11:49](https://www.youtube.com/watch?v=r2pmF9zJobE&t=709s) | Card, bull | Card, bull | Yes |
| INTC | Intel Corporation | [12:57](https://www.youtube.com/watch?v=r2pmF9zJobE&t=777s) | Card, bull | Card, no side | **No** |
| CVX | Chevron Corporation | [15:45](https://www.youtube.com/watch?v=r2pmF9zJobE&t=945s) | Card, no side | not found | **No** |

**Flags**

- Least stable video of the ten. Visa (chip) and Chevron (card) appeared in run 1 only. Caterpillar had no side in run 1 and a conditional bull in run 2; Intel was bull in run 1 and no side in run 2.
- Microsoft and Alphabet have no side in both runs. For an earnings preview that is plausible (the speaker sets out what to watch), but worth a look.

### 2. מה קורה בסקטור הניו קלאודס? IREN CIFR CRWV NBIS

Dvir Shalom (דביר שלום) · Hebrew · Sector deep dive · 29:56 · https://www.youtube.com/watch?v=S1qUsBnFG_s

| Ticker | Name | Starts at | Run 1 | Run 2 | Same |
|---|---|---|---|---|---|
| META | Meta Platforms, Inc. | [3:26](https://www.youtube.com/watch?v=S1qUsBnFG_s&t=206s) | Card, bull | Card, bull | Yes |
| CRWV | CoreWeave, Inc. | [3:40](https://www.youtube.com/watch?v=S1qUsBnFG_s&t=220s) | Card, bear | Card, bear | Yes |
| IREN | IREN Limited | [5:09](https://www.youtube.com/watch?v=S1qUsBnFG_s&t=309s) | Card, bear | Card, bear (conditional) | Yes |
| NBIS | Nebius Group N.V. | [5:12](https://www.youtube.com/watch?v=S1qUsBnFG_s&t=312s) | Card, bear | Card, bear (conditional) | Yes |
| APLD | Applied Digital Corporation | [5:12](https://www.youtube.com/watch?v=S1qUsBnFG_s&t=312s) | Card, bear | Card, bear (conditional) | Yes |

**Flags**

- **Missed: CIFR.** It is in the title. The AI named "Cipher Mining" in both runs; the company has since renamed itself Cipher Digital, and the symbol list knows only the new name, so the code matched nothing and dropped it.
- The stretches are very long and overlap (Applied Digital runs 0:47 to 28:49 in run 2), because the speaker discusses the five names together. Each card pops at its ticker's longest stretch, so several cards want the same few minutes.
- Meta is a bull card in a neocloud video. In the raw answer the speaker discusses Meta at length (3:26 to 13:20) as the neoclouds' customer, with a "hold". Plausible, but worth a look.

### 3. שמתי 100,000 שקל על המניה הזו (ועוד 3 מניות שאני קונה עכשיו)

ElevateTrading · Hebrew · Stocks I'm buying (penny stocks) · 8:07 · https://www.youtube.com/watch?v=VaHXDUGKSdY

| Ticker | Name | Starts at | Run 1 | Run 2 | Same |
|---|---|---|---|---|---|
| (none) | | | | | |

**Flags**

- No cards, in both runs, and that looks right. The video is about OTC penny stocks (NXGB, BCDS, AGCI, UGZ, VMAG) that are not listed on NYSE, Nasdaq, AMEX or TASE, so none resolves to a ticker Stoa covers. The AI did find and rate all of them.

### 4. Top Stocks I'm Buying To Get Rich Without Getting Lucky

Ticker Symbol: YOU · English · Stocks I'm buying list · 21:58 · https://www.youtube.com/watch?v=P8b2tsNSxRQ

| Ticker | Name | Starts at | Run 1 | Run 2 | Same |
|---|---|---|---|---|---|
| NVDA | NVIDIA Corporation | [6:31](https://www.youtube.com/watch?v=P8b2tsNSxRQ&t=391s) | Card, bull | Card, bull | Yes |
| GOOGL | Alphabet Inc. | [8:07](https://www.youtube.com/watch?v=P8b2tsNSxRQ&t=487s) | Card, bull | Card, bull | Yes |
| AVGO | Broadcom Inc. | [9:49](https://www.youtube.com/watch?v=P8b2tsNSxRQ&t=589s) | Chip, bull | Chip, bull | Yes |
| TSM | Taiwan Semiconductor Manufacturing Company Ltd. | [10:37](https://www.youtube.com/watch?v=P8b2tsNSxRQ&t=637s) | Card, bull | Card, bull | Yes |
| MU | Micron Technology, Inc. | [11:40](https://www.youtube.com/watch?v=P8b2tsNSxRQ&t=700s) | Card, bull | Card, bull | Yes |
| VRT | Vertiv Holdings, LLC Class A | [13:39](https://www.youtube.com/watch?v=P8b2tsNSxRQ&t=819s) | Card, bull | Card, bull | Yes |
| IREN | IREN Limited | [14:51](https://www.youtube.com/watch?v=P8b2tsNSxRQ&t=891s) | Card, bull | Card, bull | Yes |
| META | Meta Platforms, Inc. | [16:28](https://www.youtube.com/watch?v=P8b2tsNSxRQ&t=988s) | Card, bull | Card, bull | Yes |
| PLTR | Palantir Technologies Inc. | [17:42](https://www.youtube.com/watch?v=P8b2tsNSxRQ&t=1062s) | Card, bull | Card, bull | Yes |
| CRWD | CrowdStrike Holdings, Inc. | [19:00](https://www.youtube.com/watch?v=P8b2tsNSxRQ&t=1140s) | Card, bull | Card, bull | Yes |

**Flags**

- Broadcom got only a chip: 37 seconds of airtime and no outright "buy", although the whole video is "stocks I'm buying". The title is a buy list, so arguably every name in it should be a card.
- **Missed: VGT.** The speaker discusses the Vanguard Information Technology ETF (3:42 to 4:45) with an outright buy. The AI found it in both runs, but VGT is not in the alias table's ETF list and the symbol list holds no ETFs, so the code matched nothing and dropped it. (Found in the same runs' raw answers after this report was first written.)

### 5. 5 Stocks to Buy Creating $232 Billion for Investors

Let's Talk Money! with Joseph Hogue, CFA · English · List, over 30 minutes · 33:24 · https://www.youtube.com/watch?v=LSoYG4ZuyIU

| Ticker | Name | Starts at | Run 1 | Run 2 | Same |
|---|---|---|---|---|---|
| CRWV | CoreWeave, Inc. | [2:32](https://www.youtube.com/watch?v=LSoYG4ZuyIU&t=152s) | Card, bear | Card, bear | Yes |
| NBIS | Nebius Group N.V. | [12:48](https://www.youtube.com/watch?v=LSoYG4ZuyIU&t=768s) | Card, no side | Card, bear | **No** |
| APLD | Applied Digital Corporation | [15:12](https://www.youtube.com/watch?v=LSoYG4ZuyIU&t=912s) | Card, bear | Card, bear | Yes |
| ORCL | Oracle Corporation | [17:27](https://www.youtube.com/watch?v=LSoYG4ZuyIU&t=1047s) | Card, bear | Card, bear | Yes |
| AMZN | Amazon.com, Inc. | [19:20](https://www.youtube.com/watch?v=LSoYG4ZuyIU&t=1160s) | Card, no side | Card, no side | Yes |
| NVDA | NVIDIA Corporation | [22:54](https://www.youtube.com/watch?v=LSoYG4ZuyIU&t=1374s) | Card, bull | Card, bull | Yes |
| MU | Micron Technology, Inc. | [24:16](https://www.youtube.com/watch?v=LSoYG4ZuyIU&t=1456s) | Card, bull | Card, bull | Yes |
| AVGO | Broadcom Inc. | [25:30](https://www.youtube.com/watch?v=LSoYG4ZuyIU&t=1530s) | Card, bull | Card, bull | Yes |
| TSM | Taiwan Semiconductor Manufacturing Company Ltd. | [26:58](https://www.youtube.com/watch?v=LSoYG4ZuyIU&t=1618s) | Card, bull | Card, bull | Yes |
| ANET | Arista Networks, Inc. | [28:25](https://www.youtube.com/watch?v=LSoYG4ZuyIU&t=1705s) | Card, bull | Card, bull | Yes |

**Flags**

- Ten cards for a "5 stocks to buy" video: five bull (NVDA, MU, AVGO, TSM, ANET) and five bear or no side (CRWV, NBIS, APLD, ORCL, AMZN). The bear half looks like the speaker contrasting the AI spenders with the suppliers he picks; plausible, but check the first half.
- Nebius had no side in run 1 and bear in run 2.
- CoreWeave's card starts at 2:32 in run 1 and 9:54 in run 2 (same ticker and side, different stretch chosen).

### 6. Here's where I buy Lumentum ($LITE)

Stock Market Mentor · English · Single-stock deep dive · 12:37 · https://www.youtube.com/watch?v=O8EYOyljHyA

| Ticker | Name | Starts at | Run 1 | Run 2 | Same |
|---|---|---|---|---|---|
| LITE | Lumentum Holdings Inc. | [0:09](https://www.youtube.com/watch?v=O8EYOyljHyA&t=9s) | Card, bull (conditional) | Card, bull (conditional) | Yes |

**Flags**

- Clean. One card for the one stock, bull with a condition (a buy level).

### 7. Stock Market Slides After META & TSLA Earnings, LRCX Sees Supply Hitting Backlog

Schwab Network · English · Market recap · 9:14 · https://www.youtube.com/watch?v=hblOwlplNoo

| Ticker | Name | Starts at | Run 1 | Run 2 | Same |
|---|---|---|---|---|---|
| META | Meta Platforms, Inc. | [1:35](https://www.youtube.com/watch?v=hblOwlplNoo&t=95s) | Card, bull | Card, bull | Yes |
| TSLA | Tesla, Inc. | [5:27](https://www.youtube.com/watch?v=hblOwlplNoo&t=327s) | Card, no side | Card, no side | Yes |
| LRCX | Lam Research Corporation | [6:55](https://www.youtube.com/watch?v=hblOwlplNoo&t=415s) | Card, no side | Card, no side | Yes |

**Flags**

- Meta is bull although the title says the market slid after Meta's earnings. The speaker's own view can differ from the market's move, so this may be right; worth a look.

### 8. Growth Leads Before Fed, Huge Earnings; Tesla, Nucor, Tenet Healthcare In Focus

Investor's Business Daily · English · Market recap, heavy jargon, over 30 minutes · 30:52 · https://www.youtube.com/watch?v=pyijqV6899Q

| Ticker | Name | Starts at | Run 1 | Run 2 | Same |
|---|---|---|---|---|---|
| XLV | Health Care Select Sector SPDR Fund | [13:35](https://www.youtube.com/watch?v=pyijqV6899Q&t=815s) | Chip, bull | Chip, bull | Yes |
| XBI | SPDR S&P Biotech ETF | [13:40](https://www.youtube.com/watch?v=pyijqV6899Q&t=820s) | Chip, bull | Chip, bull | Yes |
| TQQQ | ProShares UltraPro QQQ | [15:30](https://www.youtube.com/watch?v=pyijqV6899Q&t=930s) | Chip, bull (conditional) | Card, bull (conditional) | **No** |
| TSLA | Tesla, Inc. | [15:54](https://www.youtube.com/watch?v=pyijqV6899Q&t=954s) | Card, bull (conditional) | Card, bull (conditional) | Yes |
| NUE | Nucor Corporation | [18:47](https://www.youtube.com/watch?v=pyijqV6899Q&t=1127s) | Card, bull | Card, bull | Yes |
| THC | Tenet Healthcare Corporation | [21:02](https://www.youtube.com/watch?v=pyijqV6899Q&t=1262s) | Card, no side | Card, no side | Yes |
| CAKE | The Cheesecake Factory Incorporated | [22:55](https://www.youtube.com/watch?v=pyijqV6899Q&t=1375s) | Chip, bull | Chip, bull (conditional) | Yes |
| STX | Seagate Technology Holdings PLC | [24:43](https://www.youtube.com/watch?v=pyijqV6899Q&t=1483s) | Chip, bear | Chip, bear | Yes |

**Flags**

- The three cards are exactly the three names in the title (Tesla, Nucor, Tenet Healthcare).
- TQQQ was a chip in run 1 and a card in run 2.
- Heavy jargon (buy points, bases, leveraged funds) caused no visible confusion.

### 9. MAJOR BUY: Last EASY Wealth Opportunity For Decades

Tom Nash · English · Thematic, ends in picks · 15:44 · https://www.youtube.com/watch?v=ZEImdkhIF6g

| Ticker | Name | Starts at | Run 1 | Run 2 | Same |
|---|---|---|---|---|---|
| ARM | Arm Holdings plc | [12:03](https://www.youtube.com/watch?v=ZEImdkhIF6g&t=723s) | Card, bull | Card, bull | Yes |
| APP | Applovin Corporation | [12:37](https://www.youtube.com/watch?v=ZEImdkhIF6g&t=757s) | Card, bull (conditional) | Card, bull | Yes |

**Flags**

- **Likely miss.** At 9:56 to 11:37 the speaker runs through a bullish list (Nvidia, AMD, TSMC, Vertiv, Zscaler, Zeta, Snowflake, Palantir, Salesforce, ServiceNow). The AI labelled those "other" rather than "quick pick", and the rules drop "other", so none became even a chip.
- AppLovin's conditional flag differs between runs.

### 10. Don't Say I Didn't Tell You | SOFI Earnings Preview

Stealth Wealth Investing · English · Single-stock earnings preview · 10:06 · https://www.youtube.com/watch?v=5PsNbwmc4Hc

| Ticker | Name | Starts at | Run 1 | Run 2 | Same |
|---|---|---|---|---|---|
| SOFI | SoFi Technologies, Inc. | [0:00](https://www.youtube.com/watch?v=5PsNbwmc4Hc&t=0s) | Card, bull (conditional) | Card, bull (conditional) | Yes |

**Flags**

- Clean. One card, bull with a condition (an earnings preview).

## Videos where no transcript could be read

None. All ten transcripts were read in both runs, including two in YouTube's newest transcript layout.

Two attempts on the Tom Nash video (ZEImdkhIF6g) were refused, not for the transcript but by Stoa's own limit of 30 new AI reads per hour from one address, which this test's volume (20 reads in about an hour, plus the earlier six-video runs) used up. That exposed a bug in the in-memory rate limiter, which counted refused requests too and so never let a retrying client back in; it is fixed in its own commit on this branch. Both runs of that video then completed normally and are the ones reported above.

## Method notes

- Videos picked on 28 Oct 2026 from YouTube searches limited to the last month, none of the six tuning videos, ten different channels.
- Raw AI answers (company names, roles, stances, never the transcript) were logged locally on the development server only and were used to explain the flags above.
- The fixes this suggests are listed separately, after this report, and none has been applied.

---

## Re-run after the fixes (28 Oct 2026, evening)

Bar asked for fixes 1 to 5 above and a re-run of the same ten videos, twice each, under the same
conditions (Bar's Chrome, the real extension, stored result cleared between runs; stored-result
version `v6`). What changed in the code:

1. Renamed companies: old names in the alias table, and a distinctive first word that begins
   exactly one listed name.
2. ETFs: about 150 funds instead of about 40, matched by name ignoring "ETF", "Fund", "Trust".
3. Prompt: a rapid run of named picks with a lean is a run of quick picks, never "other".
4. Two independent AI reads per new video, merged: a ticker either read found is kept, and where
   they disagree on the side no side is shown.
5. Prompt: in a "stocks I'm buying" video, each name presented as one of the picks counts as an
   explicit buy.

While re-running, a real bug turned up and was fixed before the measured runs: on long, name-dense
videos the model's thinking shares the 16,000-token answer allowance, so some answers stopped
mid-JSON and that read was lost (it was also the unexplained server error seen earlier). Reads are
now streamed with room for 64,000 tokens. The runs below are all after that fix.

### The numbers

| | Before the fixes | After the fixes |
|---|---|---|
| Transcripts read | 10 of 10 | 10 of 10 |
| Cards (run 1) | 42 | 64 |
| Chips (run 1) | 7 | 5 |
| Run-to-run agreement, ticker with type and side | 88% (43 of 49) | **73%** (57 of 78) |
| Run-to-run agreement, which tickers were found | 96% (47 of 49) | **86%** (67 of 78) |
| The four likely misses | CIFR, VGT, Broadcom as a card, Tom Nash's list all missed | **all four found** |

### What got better

- **CIFR** (Cipher Mining, now listed as Cipher Digital) found in both runs, bear, as the speaker
  said.
- **VGT** found in both runs as an ETF card with the speaker's buy.
- **Ticker Symbol: YOU** is now identical in both runs, 11 of 11, with Broadcom a card.
- **Tom Nash's rapid-fire list** (Nvidia, AMD, TSMC, Vertiv, Zscaler, Zeta, Snowflake, Palantir,
  Salesforce, ServiceNow) is now caught.
- **No false matches** from the new first-word rule or the wider ETF list: private companies
  (SpaceX, Anthropic, OpenAI) and sponsors still resolve to nothing, and the penny-stock video is
  still correctly empty.

### What got worse

- **Lists now pop as cards.** Fix 5 turns names into outright buys, so Tom Nash's ten-name list
  became ten cards (15 in all, against 2 before), where chips were intended. It also caught Dvir
  Shalom's own holdings, read out at 23:41 (McDonald's, PepsiCo, Lockheed Martin, General
  Dynamics), which are now cards in both runs; before, they were rightly filtered as a portfolio list.
- **Market recaps are noisier.** With 150 funds known, Investor's Business Daily now yields the
  S&P 500 as an SPY card, and sector funds (RSP, XLV, IBB) that come and go between runs: 14 tickers
  across the two runs, only 6 matching.
- **Two reads did not steady the sides.** Merging keeps any ticker either read found, so a name
  only one read mentions now appears in one run and not the other (Visa, Chevron, Snowflake,
  Meta and Alphabet in the Hogue video), and side disagreements still happen on the same
  borderline names (Microsoft, Tesla, Nebius). Each new video also costs twice as much.

### Per video, after the fixes

#### Micha.Stocks, earnings preview (r2pmF9zJobE, he) agreement 6/9
| Ticker | Name | Starts at | Run 1 | Run 2 | Same |
|---|---|---|---|---|---|
| MSFT | Microsoft | [2:59](https://www.youtube.com/watch?v=r2pmF9zJobE&t=179s) | Card, bull | Card, no side | **No** |
| GOOGL | Alphabet | [4:45](https://www.youtube.com/watch?v=r2pmF9zJobE&t=285s) | Card, no side | Card, no side | Yes |
| LLY | Eli Lilly | [7:22](https://www.youtube.com/watch?v=r2pmF9zJobE&t=442s) | Card, bull | Card, bull | Yes |
| MA | Mastercard | [9:29](https://www.youtube.com/watch?v=r2pmF9zJobE&t=569s) | Card, bull | Card, bull | Yes |
| CAT | Caterpillar | [10:38](https://www.youtube.com/watch?v=r2pmF9zJobE&t=638s) | Card, bull (conditional) | Card, bull (conditional) | Yes |
| AMZN | Amazon | [11:49](https://www.youtube.com/watch?v=r2pmF9zJobE&t=709s) | Card, bull | Card, bull | Yes |
| INTC | Intel | [12:57](https://www.youtube.com/watch?v=r2pmF9zJobE&t=777s) | Card, no side | Card, no side | Yes |
| CVX | Chevron | [15:45](https://www.youtube.com/watch?v=r2pmF9zJobE&t=945s) | Card, no side | Chip, bull | **No** |
| V | Visa | [9:35](https://www.youtube.com/watch?v=r2pmF9zJobE&t=575s) | not found | Chip, bull | **No** |

#### Dvir Shalom, neoclouds (S1qUsBnFG_s, he) agreement 8/10
| Ticker | Name | Starts at | Run 1 | Run 2 | Same |
|---|---|---|---|---|---|
| CRWV | CoreWeave | [3:22](https://www.youtube.com/watch?v=S1qUsBnFG_s&t=202s) | Card, bear | Card, bear | Yes |
| META | Meta | [9:23](https://www.youtube.com/watch?v=S1qUsBnFG_s&t=563s) | Card, bull | Card, bull | Yes |
| CIFR | Cipher Digital | [16:11](https://www.youtube.com/watch?v=S1qUsBnFG_s&t=971s) | Card, bear | Card, bear | Yes |
| IREN | IREN | [17:43](https://www.youtube.com/watch?v=S1qUsBnFG_s&t=1063s) | Card, bear | Card, bear | Yes |
| MCD | McDonald's | [23:41](https://www.youtube.com/watch?v=S1qUsBnFG_s&t=1421s) | Card, bull | Card, bull | Yes |
| PEP | PepsiCo | [23:44](https://www.youtube.com/watch?v=S1qUsBnFG_s&t=1424s) | Card, bull | Card, bull | Yes |
| LMT | Lockheed Martin | [23:44](https://www.youtube.com/watch?v=S1qUsBnFG_s&t=1424s) | Card, bull | Card, bull | Yes |
| GD | General Dynamics | [23:49](https://www.youtube.com/watch?v=S1qUsBnFG_s&t=1429s) | Card, bull | Card, bull | Yes |
| NBIS | Nebius | [5:12](https://www.youtube.com/watch?v=S1qUsBnFG_s&t=312s) | not found | Card, bear | **No** |
| APLD | Applied Digital | [5:12](https://www.youtube.com/watch?v=S1qUsBnFG_s&t=312s) | not found | Card, bear | **No** |

#### ElevateTrading, penny stocks (VaHXDUGKSdY, he) agreement 0/0
| Ticker | Name | Starts at | Run 1 | Run 2 | Same |
|---|---|---|---|---|---|
| (none) | | | | | |

#### Ticker Symbol: YOU, stocks I'm buying (P8b2tsNSxRQ, en) agreement 11/11
| Ticker | Name | Starts at | Run 1 | Run 2 | Same |
|---|---|---|---|---|---|
| VGT | Vanguard Information Technology ETF | [3:42](https://www.youtube.com/watch?v=P8b2tsNSxRQ&t=222s) | Card, bull | Card, bull | Yes |
| NVDA | Nvidia | [6:28](https://www.youtube.com/watch?v=P8b2tsNSxRQ&t=388s) | Card, bull | Card, bull | Yes |
| GOOGL | Alphabet | [8:30](https://www.youtube.com/watch?v=P8b2tsNSxRQ&t=510s) | Card, bull | Card, bull | Yes |
| AVGO | Broadcom | [9:49](https://www.youtube.com/watch?v=P8b2tsNSxRQ&t=589s) | Card, bull | Card, bull | Yes |
| TSM | TSMC | [10:37](https://www.youtube.com/watch?v=P8b2tsNSxRQ&t=637s) | Card, bull | Card, bull | Yes |
| MU | Micron Technology | [11:44](https://www.youtube.com/watch?v=P8b2tsNSxRQ&t=704s) | Card, bull | Card, bull | Yes |
| VRT | Vertiv | [13:39](https://www.youtube.com/watch?v=P8b2tsNSxRQ&t=819s) | Card, bull | Card, bull | Yes |
| IREN | IREN | [14:55](https://www.youtube.com/watch?v=P8b2tsNSxRQ&t=895s) | Card, bull | Card, bull | Yes |
| META | Meta | [16:28](https://www.youtube.com/watch?v=P8b2tsNSxRQ&t=988s) | Card, bull | Card, bull | Yes |
| PLTR | Palantir | [17:44](https://www.youtube.com/watch?v=P8b2tsNSxRQ&t=1064s) | Card, bull | Card, bull | Yes |
| CRWD | CrowdStrike | [19:00](https://www.youtube.com/watch?v=P8b2tsNSxRQ&t=1140s) | Card, bull | Card, bull | Yes |

#### Joseph Hogue, 5 stocks to buy (LSoYG4ZuyIU, en) agreement 11/12
| Ticker | Name | Starts at | Run 1 | Run 2 | Same |
|---|---|---|---|---|---|
| CRWV | CoreWeave | [9:54](https://www.youtube.com/watch?v=LSoYG4ZuyIU&t=594s) | Card, bear | Card, bear | Yes |
| NBIS | Nebius | [12:48](https://www.youtube.com/watch?v=LSoYG4ZuyIU&t=768s) | Card, no side | Card, bear | **No** |
| APLD | Applied Digital | [15:22](https://www.youtube.com/watch?v=LSoYG4ZuyIU&t=922s) | Card, bear | Card, bear | Yes |
| ORCL | Oracle | [17:27](https://www.youtube.com/watch?v=LSoYG4ZuyIU&t=1047s) | Card, bear | Card, bear | Yes |
| AMZN | Amazon | [19:20](https://www.youtube.com/watch?v=LSoYG4ZuyIU&t=1160s) | Card, no side | Card, no side | Yes |
| META | Meta | [20:48](https://www.youtube.com/watch?v=LSoYG4ZuyIU&t=1248s) | Card, no side | Card, no side | Yes |
| GOOGL | Alphabet | [20:48](https://www.youtube.com/watch?v=LSoYG4ZuyIU&t=1248s) | Card, no side | Card, no side | Yes |
| NVDA | Nvidia | [22:54](https://www.youtube.com/watch?v=LSoYG4ZuyIU&t=1374s) | Card, bull | Card, bull | Yes |
| MU | Micron Technology | [24:16](https://www.youtube.com/watch?v=LSoYG4ZuyIU&t=1456s) | Card, bull | Card, bull | Yes |
| AVGO | Broadcom | [25:30](https://www.youtube.com/watch?v=LSoYG4ZuyIU&t=1530s) | Card, bull | Card, bull | Yes |
| TSM | TSMC | [26:58](https://www.youtube.com/watch?v=LSoYG4ZuyIU&t=1618s) | Card, bull | Card, bull | Yes |
| ANET | Arista Networks | [28:25](https://www.youtube.com/watch?v=LSoYG4ZuyIU&t=1705s) | Card, bull | Card, bull | Yes |

#### Stock Market Mentor, Lumentum (O8EYOyljHyA, en) agreement 1/2
| Ticker | Name | Starts at | Run 1 | Run 2 | Same |
|---|---|---|---|---|---|
| LITE | Lumentum | [0:09](https://www.youtube.com/watch?v=O8EYOyljHyA&t=9s) | Card, bull (conditional) | Card, bull (conditional) | Yes |
| SNOW | Snowflake | [9:41](https://www.youtube.com/watch?v=O8EYOyljHyA&t=581s) | not found | Chip, bull (conditional) | **No** |

#### Schwab Network, market recap (hblOwlplNoo, en) agreement 2/3
| Ticker | Name | Starts at | Run 1 | Run 2 | Same |
|---|---|---|---|---|---|
| META | Meta | [1:35](https://www.youtube.com/watch?v=hblOwlplNoo&t=95s) | Card, bull | Card, bull | Yes |
| TSLA | Tesla | [5:27](https://www.youtube.com/watch?v=hblOwlplNoo&t=327s) | Card, no side | Card, bull | **No** |
| LRCX | Lam Research | [6:55](https://www.youtube.com/watch?v=hblOwlplNoo&t=415s) | Card, bear | Card, bear | Yes |

#### Investor's Business Daily, market recap (pyijqV6899Q, en) agreement 6/14
| Ticker | Name | Starts at | Run 1 | Run 2 | Same |
|---|---|---|---|---|---|
| IGV | iShares Expanded Tech-Software Sector ETF | [12:35](https://www.youtube.com/watch?v=pyijqV6899Q&t=755s) | Card, bull | Card, bull | Yes |
| XBI | SPDR S&P Biotech ETF | [13:40](https://www.youtube.com/watch?v=pyijqV6899Q&t=820s) | Chip, bull | Chip, bull | Yes |
| ARKG | ARK Genomic Revolution ETF | [14:05](https://www.youtube.com/watch?v=pyijqV6899Q&t=845s) | Card, no side | Card, bull | **No** |
| TQQQ | ProShares UltraPro QQQ | [15:30](https://www.youtube.com/watch?v=pyijqV6899Q&t=930s) | Chip, bull (conditional) | Card, bull (conditional) | **No** |
| TSLA | Tesla | [15:45](https://www.youtube.com/watch?v=pyijqV6899Q&t=945s) | Card, no side (conditional) | Card, bull (conditional) | **No** |
| NUE | Nucor | [18:47](https://www.youtube.com/watch?v=pyijqV6899Q&t=1127s) | Card, bull | Card, bull | Yes |
| THC | Tenet Healthcare | [21:02](https://www.youtube.com/watch?v=pyijqV6899Q&t=1262s) | Card, no side | Card, no side | Yes |
| CAKE | Cheesecake Factory | [22:55](https://www.youtube.com/watch?v=pyijqV6899Q&t=1375s) | Chip, bull | Chip, bull (conditional) | Yes |
| STX | Seagate Technology | [24:43](https://www.youtube.com/watch?v=pyijqV6899Q&t=1483s) | Chip, bear | Chip, bear | Yes |
| NXPI | NXP Semiconductors | [25:12](https://www.youtube.com/watch?v=pyijqV6899Q&t=1512s) | Chip, bear | not found | **No** |
| SPY | SPDR S&P 500 ETF Trust | [1:42](https://www.youtube.com/watch?v=pyijqV6899Q&t=102s) | not found | Card, no side | **No** |
| RSP | Invesco S&P 500 Equal Weight ETF | [10:01](https://www.youtube.com/watch?v=pyijqV6899Q&t=601s) | not found | Chip, bull | **No** |
| XLV | Health Care Select Sector SPDR | [13:36](https://www.youtube.com/watch?v=pyijqV6899Q&t=816s) | not found | Chip, bull | **No** |
| IBB | iShares Biotechnology ETF | [13:49](https://www.youtube.com/watch?v=pyijqV6899Q&t=829s) | not found | Chip, bull | **No** |

#### Tom Nash, major buy (ZEImdkhIF6g, en) agreement 11/16
| Ticker | Name | Starts at | Run 1 | Run 2 | Same |
|---|---|---|---|---|---|
| CRWD | CrowdStrike | [2:14](https://www.youtube.com/watch?v=ZEImdkhIF6g&t=134s) | Card, bull | Chip, bull | **No** |
| ASML | ASML | [2:14](https://www.youtube.com/watch?v=ZEImdkhIF6g&t=134s) | Card, bull | Chip, bull | **No** |
| AAPL | Apple | [2:14](https://www.youtube.com/watch?v=ZEImdkhIF6g&t=134s) | Card, bull | Chip, bull | **No** |
| VRT | Vertiv | [2:14](https://www.youtube.com/watch?v=ZEImdkhIF6g&t=134s) | Card, bull | Card, bull | Yes |
| NVDA | Nvidia | [2:14](https://www.youtube.com/watch?v=ZEImdkhIF6g&t=134s) | Card, bull | Card, bull | Yes |
| AMD | AMD | [2:14](https://www.youtube.com/watch?v=ZEImdkhIF6g&t=134s) | Card, bull | Card, bull | Yes |
| ZS | Zscaler | [11:26](https://www.youtube.com/watch?v=ZEImdkhIF6g&t=686s) | Card, bull | Card, bull | Yes |
| ZETA | Zeta Global | [11:26](https://www.youtube.com/watch?v=ZEImdkhIF6g&t=686s) | Card, bull | Card, bull | Yes |
| SNOW | Snowflake | [11:26](https://www.youtube.com/watch?v=ZEImdkhIF6g&t=686s) | Card, bull | Card, bull | Yes |
| PLTR | Palantir | [11:26](https://www.youtube.com/watch?v=ZEImdkhIF6g&t=686s) | Card, bull | Card, bull | Yes |
| CRM | Salesforce | [11:26](https://www.youtube.com/watch?v=ZEImdkhIF6g&t=686s) | Card, bull | Card, bull | Yes |
| NOW | ServiceNow | [11:26](https://www.youtube.com/watch?v=ZEImdkhIF6g&t=686s) | Card, bull | Card, bull | Yes |
| TSLA | Tesla | [11:26](https://www.youtube.com/watch?v=ZEImdkhIF6g&t=686s) | Card, bull | not found | **No** |
| ARM | Arm | [12:28](https://www.youtube.com/watch?v=ZEImdkhIF6g&t=748s) | Card, bull | Card, bull | Yes |
| APP | Applovin | [12:37](https://www.youtube.com/watch?v=ZEImdkhIF6g&t=757s) | Card, bull | Card, bull | Yes |
| TSM | TSMC | [10:06](https://www.youtube.com/watch?v=ZEImdkhIF6g&t=606s) | not found | Card, bull | **No** |

#### Stealth Wealth, SoFi preview (5PsNbwmc4Hc, en) agreement 1/1
| Ticker | Name | Starts at | Run 1 | Run 2 | Same |
|---|---|---|---|---|---|
| SOFI | SoFi Technologies | [0:00](https://www.youtube.com/watch?v=5PsNbwmc4Hc&t=0s) | Card, bull (conditional) | Card, bull (conditional) | Yes |

### What I would do next (not applied)

1. **Keep fixes 1 and 2**, with one guard: the broad-market funds (SPY, VOO, IVV, QQQ, DIA, IWM)
   count only when the speaker names the fund itself, not when the AI maps "the S&P 500" to it.
2. **Narrow fix 5**: a list video's picks become *chips* with a buy, not cards, unless discussed
   45+ seconds; and holdings read out ("my portfolio has...") stay filtered as a portfolio list.
3. **Change fix 4 to agreement, not union**: show a ticker only if both reads found it, and a card
   only if both made it one. That turns the second read into a check instead of a source of extra
   names, and should lift run-to-run agreement above where it started.
4. Then re-run these ten again to confirm, and add a fresh handful of unseen videos, since these
   ten have now been used for tuning too.

---

## Second re-run: the three follow-ups, plus five unseen videos (28 Oct 2026, night)

Applied: (1) the broad-market funds (SPY, VOO, IVV, QQQ, DIA, IWM and similar) count only when
the speaker names the fund; (2) picks in a list get a chip with the speaker's side, a card still
needs 45+ seconds of discussion or an outright buy / avoid said while discussing the name, and
the speaker reading out their own holdings is filtered again; (3) the two reads are merged by
agreement: a ticker only if both reads found it, a card only if both made it one. Stored results
`v7`. Same method: Bar's Chrome, the real extension, each video twice with the stored result
cleared. Five videos nobody had used before were added, from the last month: two Hebrew
(Micha.Stocks, Dvir Shalom), three English (a portfolio "what I'm buying", a multi-speaker CNBC
panel, a dividend ETF).

One more bug turned up on a fresh video and was fixed: SCHD (said by ticker, written by the AI as
"Schwab US Dividend Equity ETF") did not match the list's "Schwab U.S. Dividend Equity ETF", so
the dividend video came back empty in both runs. After the fix it gives SCHD, a bull card, in both
of two further runs; the table below uses those two.

### The numbers

| | Before any fix | Fixes 1 to 5 | Follow-ups (now) |
|---|---|---|---|
| **Ten known videos**: agreement on ticker, type and side | 88% (43 of 49) | 73% (57 of 78) | **87%** (58 of 67) |
| Ten known videos: same tickers found | 96% | 86% | **90%** |
| Ten known videos: cards / chips (run 1) | 42 / 7 | 64 / 5 | **44 / 22** |
| **Five unseen videos**: agreement on ticker, type and side | | | **83%** (19 of 23) |
| Five unseen videos: same tickers found | | | **87%** |
| Five unseen videos: cards / chips (run 1) | | | 11 / 10 |
| All fifteen | | | **86%** agreement, 89% same tickers |

Agreement is back to where it started, with the misses fixed and the noise gone:

- **Kept from fixes 1 to 5:** CIFR found in Dvir Shalom's video, VGT a card in the Ticker Symbol:
  YOU video (identical in both runs, 11 of 11), Tom Nash's rapid-fire list caught.
- **Noise removed:** Tom Nash's list is now 13 chips and 2 cards (Arm and AppLovin, which he
  actually discusses), not 15 cards; Dvir Shalom's read-out of his holdings is filtered again; the
  S&P 500 no longer becomes an SPY card in market recaps.
- **Unseen videos look right:** Micha's three stocks (Adobe, HubSpot, Spotify) identical in both
  runs; the CNBC panel identical in both runs; Dvir Shalom's portfolio video gives the defensive
  names he explains one by one (PepsiCo, Procter & Gamble, Waste Connections as cards; Walmart,
  T-Mobile, McDonald's, Lockheed as chips); the dividend video gives SCHD.

### What is still not right

- **Two reads that must agree can drop a real name.** In Dvir Shalom's neocloud video, Nebius and
  Applied Digital are discussed but one of the two reads missed them, so they are gone in both
  runs. The price of requiring agreement: fewer one-off extras, a few real names lost.
- **Broadcom in "stocks I'm buying" is a chip again.** By design of follow-up 2 (44 seconds and no
  outright "buy"), but it was one of the original misses.
- **The same borderline sides still flip:** Intel on Micha's earnings preview, Nebius on the Hogue
  video, Tesla on the IBD recap. These are names the speakers discuss without a clear call; the
  merge already shows them with no side when the two reads disagree within a run.
- **Market recaps still carry sector funds as chips** (RSP, XBI, IBB, TQQQ in the IBD recap) that
  come and go between runs.
- **The fresh "what I'm buying" portfolio video (Kai)** gives only chips plus one bear card on
  Marriott; Micron and Broadcom each appear in one run only.

### Per video

#### Micha.Stocks, earnings preview (r2pmF9zJobE, he) agreement 6/8
| Ticker | Name | Starts at | Run 1 | Run 2 | Same |
|---|---|---|---|---|---|
| MSFT | Microsoft | [2:59](https://www.youtube.com/watch?v=r2pmF9zJobE&t=179s) | Card, no side | Card, no side | Yes |
| GOOGL | Alphabet | [4:45](https://www.youtube.com/watch?v=r2pmF9zJobE&t=285s) | Card, no side | Card, no side (conditional) | Yes |
| LLY | Eli Lilly | [7:22](https://www.youtube.com/watch?v=r2pmF9zJobE&t=442s) | Card, bull | Card, bull | Yes |
| MA | Mastercard | [9:29](https://www.youtube.com/watch?v=r2pmF9zJobE&t=569s) | Card, bull | Card, bull | Yes |
| CAT | Caterpillar | [10:38](https://www.youtube.com/watch?v=r2pmF9zJobE&t=638s) | Card, bull (conditional) | Card, bull (conditional) | Yes |
| AMZN | Amazon | [11:49](https://www.youtube.com/watch?v=r2pmF9zJobE&t=709s) | Card, bull | Card, bull | Yes |
| INTC | Intel | [12:57](https://www.youtube.com/watch?v=r2pmF9zJobE&t=777s) | Card, bull | Card, no side | **No** |
| CVX | Chevron | [15:45](https://www.youtube.com/watch?v=r2pmF9zJobE&t=945s) | not found | Card, no side | **No** |

#### Dvir Shalom, neoclouds (S1qUsBnFG_s, he) agreement 3/4
| Ticker | Name | Starts at | Run 1 | Run 2 | Same |
|---|---|---|---|---|---|
| META | Meta | [3:24](https://www.youtube.com/watch?v=S1qUsBnFG_s&t=204s) | Card, bull | Card, bull | Yes |
| CRWV | CoreWeave | [3:40](https://www.youtube.com/watch?v=S1qUsBnFG_s&t=220s) | Card, bear | Card, bear | Yes |
| IREN | IREN | [4:16](https://www.youtube.com/watch?v=S1qUsBnFG_s&t=256s) | Card, bear | Card, bear | Yes |
| CIFR | Cipher Digital | [4:16](https://www.youtube.com/watch?v=S1qUsBnFG_s&t=256s) | Chip, bear | Card, bear | **No** |

#### ElevateTrading, penny stocks (VaHXDUGKSdY, he) agreement 0/0
| Ticker | Name | Starts at | Run 1 | Run 2 | Same |
|---|---|---|---|---|---|
| (none) | | | | | |

#### Ticker Symbol: YOU, stocks I'm buying (P8b2tsNSxRQ, en) agreement 11/11
| Ticker | Name | Starts at | Run 1 | Run 2 | Same |
|---|---|---|---|---|---|
| VGT | Vanguard Information Technology ETF | [3:42](https://www.youtube.com/watch?v=P8b2tsNSxRQ&t=222s) | Card, bull | Card, bull | Yes |
| NVDA | Nvidia | [6:31](https://www.youtube.com/watch?v=P8b2tsNSxRQ&t=391s) | Card, bull | Card, bull | Yes |
| GOOGL | Alphabet | [8:07](https://www.youtube.com/watch?v=P8b2tsNSxRQ&t=487s) | Card, bull | Card, bull | Yes |
| AVGO | Broadcom | [9:51](https://www.youtube.com/watch?v=P8b2tsNSxRQ&t=591s) | Chip, bull | Chip, bull | Yes |
| TSM | TSMC | [10:35](https://www.youtube.com/watch?v=P8b2tsNSxRQ&t=635s) | Card, bull | Card, bull | Yes |
| MU | Micron Technology | [11:44](https://www.youtube.com/watch?v=P8b2tsNSxRQ&t=704s) | Card, bull | Card, bull | Yes |
| VRT | Vertiv | [13:39](https://www.youtube.com/watch?v=P8b2tsNSxRQ&t=819s) | Card, bull | Card, bull | Yes |
| IREN | IREN | [14:53](https://www.youtube.com/watch?v=P8b2tsNSxRQ&t=893s) | Card, bull | Card, bull | Yes |
| META | Meta | [16:28](https://www.youtube.com/watch?v=P8b2tsNSxRQ&t=988s) | Card, bull | Card, bull | Yes |
| PLTR | Palantir | [17:40](https://www.youtube.com/watch?v=P8b2tsNSxRQ&t=1060s) | Card, bull | Card, bull | Yes |
| CRWD | CrowdStrike | [19:00](https://www.youtube.com/watch?v=P8b2tsNSxRQ&t=1140s) | Card, bull | Card, bull | Yes |

#### Joseph Hogue, 5 stocks to buy (LSoYG4ZuyIU, en) agreement 10/12
| Ticker | Name | Starts at | Run 1 | Run 2 | Same |
|---|---|---|---|---|---|
| CRWV | CoreWeave | [9:54](https://www.youtube.com/watch?v=LSoYG4ZuyIU&t=594s) | Card, bear | Card, bear | Yes |
| NBIS | Nebius | [12:48](https://www.youtube.com/watch?v=LSoYG4ZuyIU&t=768s) | Card, no side | Card, no side | Yes |
| APLD | Applied Digital | [15:12](https://www.youtube.com/watch?v=LSoYG4ZuyIU&t=912s) | Card, bear | Card, bear | Yes |
| ORCL | Oracle | [17:27](https://www.youtube.com/watch?v=LSoYG4ZuyIU&t=1047s) | Card, bear | Card, bear | Yes |
| AMZN | Amazon | [19:17](https://www.youtube.com/watch?v=LSoYG4ZuyIU&t=1157s) | Card, no side | Card, no side | Yes |
| META | Meta | [20:48](https://www.youtube.com/watch?v=LSoYG4ZuyIU&t=1248s) | Card, no side | not found | **No** |
| GOOGL | Alphabet | [20:54](https://www.youtube.com/watch?v=LSoYG4ZuyIU&t=1254s) | Card, no side | not found | **No** |
| NVDA | Nvidia | [22:54](https://www.youtube.com/watch?v=LSoYG4ZuyIU&t=1374s) | Card, bull | Card, bull | Yes |
| MU | Micron Technology | [24:16](https://www.youtube.com/watch?v=LSoYG4ZuyIU&t=1456s) | Card, bull | Card, bull | Yes |
| AVGO | Broadcom | [25:30](https://www.youtube.com/watch?v=LSoYG4ZuyIU&t=1530s) | Card, bull | Card, bull | Yes |
| TSM | TSMC | [26:58](https://www.youtube.com/watch?v=LSoYG4ZuyIU&t=1618s) | Card, bull | Card, bull | Yes |
| ANET | Arista Networks | [28:25](https://www.youtube.com/watch?v=LSoYG4ZuyIU&t=1705s) | Card, bull | Card, bull | Yes |

#### Stock Market Mentor, Lumentum (O8EYOyljHyA, en) agreement 1/1
| Ticker | Name | Starts at | Run 1 | Run 2 | Same |
|---|---|---|---|---|---|
| LITE | Lumentum | [0:09](https://www.youtube.com/watch?v=O8EYOyljHyA&t=9s) | Card, bull (conditional) | Card, bull (conditional) | Yes |

#### Schwab Network, market recap (hblOwlplNoo, en) agreement 3/3
| Ticker | Name | Starts at | Run 1 | Run 2 | Same |
|---|---|---|---|---|---|
| META | Meta | [1:43](https://www.youtube.com/watch?v=hblOwlplNoo&t=103s) | Card, bull | Card, bull | Yes |
| TSLA | Tesla | [5:27](https://www.youtube.com/watch?v=hblOwlplNoo&t=327s) | Card, no side | Card, no side | Yes |
| LRCX | Lam Research | [6:55](https://www.youtube.com/watch?v=hblOwlplNoo&t=415s) | Card, bear | Card, bear | Yes |

#### Investor's Business Daily, market recap (pyijqV6899Q, en) agreement 8/11
| Ticker | Name | Starts at | Run 1 | Run 2 | Same |
|---|---|---|---|---|---|
| RSP | Invesco S&P 500 Equal Weight ETF | [10:01](https://www.youtube.com/watch?v=pyijqV6899Q&t=601s) | Chip, bull | Chip, bull | Yes |
| IGV | iShares Expanded Tech-Software Sector ETF | [12:35](https://www.youtube.com/watch?v=pyijqV6899Q&t=755s) | Card, bull | Card, bull | Yes |
| XBI | SPDR S&P Biotech ETF | [13:40](https://www.youtube.com/watch?v=pyijqV6899Q&t=820s) | Chip, bull | not found | **No** |
| IBB | iShares Biotechnology ETF | [13:49](https://www.youtube.com/watch?v=pyijqV6899Q&t=829s) | Chip, bull | not found | **No** |
| ARKG | ARK Genomic Revolution ETF | [14:05](https://www.youtube.com/watch?v=pyijqV6899Q&t=845s) | Card, no side | Card, no side (conditional) | Yes |
| TQQQ | ProShares UltraPro QQQ | [15:30](https://www.youtube.com/watch?v=pyijqV6899Q&t=930s) | Chip, bull (conditional) | Chip, bull (conditional) | Yes |
| TSLA | Tesla | [15:45](https://www.youtube.com/watch?v=pyijqV6899Q&t=945s) | Card, no side (conditional) | Card, no side (conditional) | Yes |
| NUE | Nucor | [18:47](https://www.youtube.com/watch?v=pyijqV6899Q&t=1127s) | Card, bull | Card, bull | Yes |
| THC | Tenet Healthcare | [21:02](https://www.youtube.com/watch?v=pyijqV6899Q&t=1262s) | Card, no side | Card, no side | Yes |
| CAKE | Cheesecake Factory | [22:55](https://www.youtube.com/watch?v=pyijqV6899Q&t=1375s) | Chip, bull (conditional) | Chip, bull (conditional) | Yes |
| STX | Seagate Technology | [24:43](https://www.youtube.com/watch?v=pyijqV6899Q&t=1483s) | Chip, bear | not found | **No** |

#### Tom Nash, major buy (ZEImdkhIF6g, en) agreement 15/16
| Ticker | Name | Starts at | Run 1 | Run 2 | Same |
|---|---|---|---|---|---|
| CRWD | CrowdStrike | [2:16](https://www.youtube.com/watch?v=ZEImdkhIF6g&t=136s) | Chip, bull | Chip, bull | Yes |
| AMD | AMD | [2:16](https://www.youtube.com/watch?v=ZEImdkhIF6g&t=136s) | Chip, bull | Chip, bull | Yes |
| ASML | ASML | [2:20](https://www.youtube.com/watch?v=ZEImdkhIF6g&t=140s) | Chip, bull | Chip, bull | Yes |
| AAPL | Apple | [2:20](https://www.youtube.com/watch?v=ZEImdkhIF6g&t=140s) | Chip, bull | Chip, bull | Yes |
| NVDA | Nvidia | [9:59](https://www.youtube.com/watch?v=ZEImdkhIF6g&t=599s) | Chip, bull | Chip, bull | Yes |
| TSM | TSMC | [10:06](https://www.youtube.com/watch?v=ZEImdkhIF6g&t=606s) | Chip, bull | not found | **No** |
| VRT | Vertiv | [10:15](https://www.youtube.com/watch?v=ZEImdkhIF6g&t=615s) | Chip, bull | Chip, bull | Yes |
| ZS | Zscaler | [11:28](https://www.youtube.com/watch?v=ZEImdkhIF6g&t=688s) | Chip, bull | Chip, bull | Yes |
| ZETA | Zeta Global | [11:28](https://www.youtube.com/watch?v=ZEImdkhIF6g&t=688s) | Chip, bull | Chip, bull | Yes |
| SNOW | Snowflake | [11:32](https://www.youtube.com/watch?v=ZEImdkhIF6g&t=692s) | Chip, bull | Chip, bull | Yes |
| PLTR | Palantir | [11:32](https://www.youtube.com/watch?v=ZEImdkhIF6g&t=692s) | Chip, bull | Chip, bull | Yes |
| CRM | Salesforce | [11:32](https://www.youtube.com/watch?v=ZEImdkhIF6g&t=692s) | Chip, bull | Chip, bull | Yes |
| NOW | ServiceNow | [11:34](https://www.youtube.com/watch?v=ZEImdkhIF6g&t=694s) | Chip, bull | Chip, bull | Yes |
| TSLA | Tesla | [11:36](https://www.youtube.com/watch?v=ZEImdkhIF6g&t=696s) | Chip, bull | Chip, bull | Yes |
| APP | Applovin | [12:37](https://www.youtube.com/watch?v=ZEImdkhIF6g&t=757s) | Card, bull | Card, bull | Yes |
| ARM | Arm | [14:22](https://www.youtube.com/watch?v=ZEImdkhIF6g&t=862s) | Card, bull | Card, bull | Yes |

#### Stealth Wealth, SoFi preview (5PsNbwmc4Hc, en) agreement 1/1
| Ticker | Name | Starts at | Run 1 | Run 2 | Same |
|---|---|---|---|---|---|
| SOFI | SoFi Technologies | [0:00](https://www.youtube.com/watch?v=5PsNbwmc4Hc&t=0s) | Card, bull (conditional) | Card, bull (conditional) | Yes |

#### NEW: Micha.Stocks, "שלוש המניות האלו עושות משהו שכולם חיכו לו" (90jA5j6vIRQ, he) agreement 3/3
| Ticker | Name | Starts at | Run 1 | Run 2 | Same |
|---|---|---|---|---|---|
| ADBE | Adobe | [3:31](https://www.youtube.com/watch?v=90jA5j6vIRQ&t=211s) | Card, bull (conditional) | Card, bull (conditional) | Yes |
| HUBS | HubSpot | [5:28](https://www.youtube.com/watch?v=90jA5j6vIRQ&t=328s) | Card, bull (conditional) | Card, bull (conditional) | Yes |
| SPOT | Spotify Technology | [8:32](https://www.youtube.com/watch?v=90jA5j6vIRQ&t=512s) | Card, bull (conditional) | Card, bull (conditional) | Yes |

#### NEW: Dvir Shalom, "השינוי הגדול שעשיתי בתיק ההשקעות שלי" (36 min) (xYKSxOPKgaI, he) agreement 8/10
| Ticker | Name | Starts at | Run 1 | Run 2 | Same |
|---|---|---|---|---|---|
| USO | United States Oil Fund | [7:59](https://www.youtube.com/watch?v=xYKSxOPKgaI&t=479s) | Card, no side | Card, no side | Yes |
| GD | General Dynamics | [16:24](https://www.youtube.com/watch?v=xYKSxOPKgaI&t=984s) | Chip, bull | Card, bull | **No** |
| LMT | Lockheed Martin | [18:00](https://www.youtube.com/watch?v=xYKSxOPKgaI&t=1080s) | Chip, bull | Chip, bull | Yes |
| MCD | McDonald's | [18:19](https://www.youtube.com/watch?v=xYKSxOPKgaI&t=1099s) | Chip, bull | Chip, bull | Yes |
| PEP | PepsiCo | [19:03](https://www.youtube.com/watch?v=xYKSxOPKgaI&t=1143s) | Card, bull | Card, bull | Yes |
| PG | Procter & Gamble | [20:03](https://www.youtube.com/watch?v=xYKSxOPKgaI&t=1203s) | Card, bull | Card, bull | Yes |
| WMT | Walmart | [20:58](https://www.youtube.com/watch?v=xYKSxOPKgaI&t=1258s) | Chip, bull | Chip, bull | Yes |
| TMUS | T-Mobile US | [21:17](https://www.youtube.com/watch?v=xYKSxOPKgaI&t=1277s) | Chip, bull | Chip, bull | Yes |
| WCN | Waste Connections, Inc. Common Shares | [22:01](https://www.youtube.com/watch?v=xYKSxOPKgaI&t=1321s) | Card, bull | Card, bull | Yes |
| SCHD | Schwab U.S. Dividend Equity ETF | [22:56](https://www.youtube.com/watch?v=xYKSxOPKgaI&t=1376s) | not found | Card, bull | **No** |

#### NEW: Smart Money with Kai, "My Portfolio Passed $500K. Here's What I'm Buying" (pJpAj9LvTU8, en) agreement 3/5
| Ticker | Name | Starts at | Run 1 | Run 2 | Same |
|---|---|---|---|---|---|
| AMZN | Amazon | [6:52](https://www.youtube.com/watch?v=pJpAj9LvTU8&t=412s) | Chip, bull | Chip, bull | Yes |
| GOOGL | Alphabet | [7:27](https://www.youtube.com/watch?v=pJpAj9LvTU8&t=447s) | Chip, bull | Chip, bull | Yes |
| AVGO | Broadcom | [8:05](https://www.youtube.com/watch?v=pJpAj9LvTU8&t=485s) | Chip, bull | not found | **No** |
| MAR | Marriott International | [8:19](https://www.youtube.com/watch?v=pJpAj9LvTU8&t=499s) | Card, bear | Card, bear | Yes |
| MU | Micron Technology | [3:55](https://www.youtube.com/watch?v=pJpAj9LvTU8&t=235s) | not found | Chip, bull | **No** |

#### NEW: CNBC Television, "The Investment Committee prepares for a pivotal week" (muWuVTk-OLs, en) agreement 4/4
| Ticker | Name | Starts at | Run 1 | Run 2 | Same |
|---|---|---|---|---|---|
| GOOGL | Alphabet | [4:27](https://www.youtube.com/watch?v=muWuVTk-OLs&t=267s) | Card, bull (conditional) | Card, bull | Yes |
| META | Meta | [4:40](https://www.youtube.com/watch?v=muWuVTk-OLs&t=280s) | Card, bull (conditional) | Card, bull (conditional) | Yes |
| AMD | AMD | [6:07](https://www.youtube.com/watch?v=muWuVTk-OLs&t=367s) | Chip, bear | Chip, bear | Yes |
| AVGO | Broadcom | [6:07](https://www.youtube.com/watch?v=muWuVTk-OLs&t=367s) | Chip, bull | Chip, bull | Yes |

#### NEW: Investor Intellect, "My Top Dividend ETF Just Dipped, Here's What I'm Buying" (runs after the SCHD fix) (1EstjaHoV5E, en) agreement 1/1
| Ticker | Name | Starts at | Run 1 | Run 2 | Same |
|---|---|---|---|---|---|
| SCHD | Schwab U.S. Dividend Equity ETF | [0:00](https://www.youtube.com/watch?v=1EstjaHoV5E&t=0s) | Card, bull (conditional) | Card, bull (conditional) | Yes |

