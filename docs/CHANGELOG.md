# Changelog

What changed on the Stoa site, newest first. One entry per merged batch.

Each entry says what a visitor would notice and what needs Krisi's attention —
schema he has to add, decisions waiting on him, or things deliberately left
unfixed. This is a log, not documentation: for the product model see
`docs/PRODUCT_MODEL.md`, for design tokens `docs/FRONTEND.md`, and for the
backend handoff `docs/BACKEND_BRIEF.md`.

---

## 2026-09-06 — Compose: the call says what it found, a half-call cannot pass, cards on the video get handles

**For someone using the site**

- **The call step tells you what it recognised.** Type a ticker and, a moment later, a tick
  appears under the field with the company and its exchange (`NVDA · NVIDIA Corporation ·
  NASDAQ`), and the current price is stated to be the level the call will lock at when you
  publish. A typo gets a cross and "was not found". Gold, oil, the Treasury yields and bitcoin
  work the same way under their own symbols (the helper line names them: XAUUSD, USOIL, UKOIL,
  US10Y, BTCUSD); a Treasury tenor says it is quoted as a yield, its target field reads *Target
  yield*, the move to target is in points, and it reminds you that up means bond prices down.
- **A ticker on its own is no longer a call.** The direction used to default to long, so a ticker
  with nothing else sailed through Continue as a complete long call, and worse, went out at
  publish as a publication with no call at all (the server only locks a call when it gets both).
  The direction now starts empty. Continue with a ticker and no direction stays put and says
  "A call needs a direction"; with a symbol still being checked it says to wait; with a symbol
  that resolved to nothing it refuses, because a call on a name that cannot be priced can never
  be graded. The publish button reads the same verdict. Every other step already held this line:
  Skip exists only for a step that is genuinely empty.
- **The Steelman is parked.** The card is an objection paired with your answer, and the system
  meant to supply the objection is not finished, so the surface was shipping ahead of the thing
  that gives it meaning. It is no longer offered in the card library, by intent or by shape.
  Nothing is deleted: any publication that already carries a Steelman card renders exactly as
  before, and a draft holding one can still open it. Parked, not cancelled.
- **Cards have a Done button.** Making or editing a card used to end nowhere: the X, Escape or
  Delete. The editor's footer now ends in a solid **Done**, with one line beside it saying the card
  is saved with the draft and can be reopened from the toolbox or the Cards step any time. Done
  closes and runs the draft save. On a live publication it says to press Save changes to record
  the edit, since saving there is a disclosed act. Delete is still there, but reads as a quiet
  secondary rather than the way out.
- **Cards on the video can be sized and faded.** Select an inset and it grows a brass corner
  handle: drag it to resize, and the box keeps its shape. A Size slider and an Opacity slider sit
  in the selected panel for keyboards and phones. Opacity applies in full frame too, where the
  video shows through.
- **Full frame no longer collides with anything.** It used to replace the picture with a sheet of
  paper and then let text and insets on the same seconds paint over the top. Now the video stays,
  dimmed, the card sits inside it with a small margin and scaled up to read like a slide, and
  anything else on those seconds waits until the full-frame visual is gone. Inset mode is
  unchanged, and the faithful preview shows exactly this.

**Found while in there**

- **A live publication's call step showed editable fields.** The ticker, direction and target
  could be changed and the changes were silently dropped on save. The step now shows the locked
  call as a statement.
- **A draft keeps only its ticker.** Direction, target and horizon are not stored on a draft (the
  `reports` row has no columns for them), so reopening a saved draft loses them and the direction
  now comes back empty. Noted for Krisi below.
- **Listing names carry trailing punctuation** from the exchange feed ("NVIDIA Corporation -").
  Tidied where the call step shows them; the rows themselves are untouched.
- **Typing GOLD finds Gold.com.** GOLD is a real NYSE listing, so the lookup says so; the metal is
  XAUUSD, and the helper line under the field says that too. Same for WTI (W&T Offshore).
- **The attestation card skips most of what the call step now accepts.** It only runs for a
  symbol of one to five letters, optionally `.TA`, so BRK-B and every macro symbol get no
  attestation. Left alone: the lookup already shows the live level, and the attestation's shape
  belongs to the attest-price function.
- **Devil's Advocate stays in the Assistant.** It is an Ask AI prompt that critiques the draft,
  not the Steelman surface, so it was left in place.
- On the fixture, pressing Done on a card runs the draft save, which reports "Sign in to
  continue" because there is no session. Expected there, and not on the real page.

**What needs Krisi**

- **Draft call fields.** A draft should keep its direction, target and horizon between sessions,
  which needs columns (or a versions read) on the draft. Today only the ticker survives.
- **Two more numbers for the burn-in.** A visual overlay may now carry `size` (inset width as a
  fraction of the frame width, 0.20 to 0.84, default 0.46; height at 42/46 of the width) and
  `opacity` (0.2 to 1, default 1). Full frame means: the video dimmed under ink at 62%, the visual
  inside a 4% margin, scaled with the frame, other overlays on the same seconds not painted.
  Overlays are still held in memory only; the pipeline and their storage remain the open item.

## 2026-09-04 — The other three pinned columns get the same fix

**For someone using the site**

- **Today's lists, a report's clip column and the Storefront preview all start
  where their page starts.** Each was pinned 80px down inside the page's
  scrolling column, allowing for a nav that is not inside that column, so each
  sat a band lower than the content beside it. All three now use the same
  frame Compose got in the previous batch: the page fills the room under the
  nav and its columns scroll on their own, so there is nothing to pin and
  nothing to get wrong.
- **The report page's reading-progress line now moves.** It followed the
  document's scroll, and the document never scrolls inside the app, so it had
  never moved. It follows the writing now.
- **On a phone, a report keeps its reading order**: headline, clip, writing,
  trust panels, comments.

**Found while in there**

- The nav's border-and-shadow-on-scroll has the same root-scroll problem as
  the progress line (it animates on the document's scroll) and so has never
  appeared inside the app shell. Left alone: it is cosmetic and belongs to the
  nav, not to these pages.
- A `/dev/branding` fixture now exists, and the private-shell copy the
  fixtures use lives in one place.
- The Storefront's share-link preview built its public link from the browser
  address on the client and as a bare path on the server, so React reported a
  hydration mismatch every time the page opened. It uses the site's canonical
  origin now.

**What needs Krisi**

- Nothing new.

## 2026-09-04 — Compose gets its room, one honest button, and a video editor made for analysts

**For someone using the site**

- **The band under the nav is gone, and the toolbox icons are no longer
  sliced.** Both had one cause: the compose header was pinned inside the
  page's scrolling column, and a pinned element there sits 2rem lower than it
  looks like it should, so the header dropped away from the nav and its
  bottom edge covered the top of the rail. Compose is now a frame that
  measures the room it has and fills it; the header sits at the top and the
  rail and the canvas scroll on their own underneath. Nothing is pinned to
  anything, so this cannot come back.
- **The canvas is a working surface.** It takes the standard page width
  rather than a reading measure, so the timeline, the deck and the publish
  panel have room. Only the write step keeps a measure for the words.
- **The toolbox exists only where it is useful.** On the call, video, tags
  and publish steps there is no rail, not a strip of two icons. It opens on
  write, cards and edit video, where a card can actually be dropped
  somewhere.
- **One button per step, and it tells the truth.** The separate skip buttons
  are gone. Nothing entered on an optional step reads *Skip*; enough entered
  reads *Continue*; something entered but incomplete reads *Continue* and,
  when pressed, says what is missing beside the button ("A target price
  needs a ticker. Add the ticker, or clear the target") and stays put.
  Taking a clip out is its own control beside Replace.
- **The template helper can be taken down**, and stays down on the next
  draft. Templates remain under Assistant.
- **The video editor is rebuilt around how CapCut, Instagram, TikTok and
  Descript work.** One picture above one filmstrip. Trim by dragging the
  gold ends of the strip. Drag text and cards where you want them on the
  picture; type text on the picture. Time anything by dragging the ends of
  its bar under the strip. Controls appear only for the thing you have
  selected; at rest there is play, the strip, and five things to add. The
  cover is a small folded row. Gone: the second track, the zoom slider, the
  frame-step buttons, the always-open settings panel and the three add
  buttons that opened it. Kept: trim, text, visuals with inset and cutaway,
  dragging cards from the toolbox, the faithful preview, and the promise that
  what you preview is exactly what publishes.
- **The headline wraps on a phone** instead of clipping; Enter moves to the
  standfirst.

**Found while in there**

- The dev fixture at `/dev/compose` let the window scroll, which hid the
  pinning bug; it now mounts the workspace inside a copy of the app shell.
- The edit-video step mounted a second card tray beside the timeline,
  duplicating the toolbox. Gone.
- Three other places pin a sticky column at `top-20` inside the app's
  scrolling column, where the nav is not: the Today sidebar, the report
  page's clip column and the branding studio. That leaves a band of 80px
  above them when scrolled rather than clipping anything; left as they are
  because Today's sidebar and the branding studio need a session to load,
  and noted here.
- On the fixture, the connected-piece picker logs a "Sign in to continue"
  error from a server action, which is expected without a session.

**What needs Krisi**

- Nothing new. Overlays are still held in memory only; the burn-in pipeline
  and storage for them remain the open item in the backend brief.

## 2026-09-02 — Compose stops arguing with itself, and two more themes

**For someone using the site**

- **The step tracker no longer hides behind the bar above it.** It was sitting
  in the page while the bar was pinned, so the moment you scrolled the step
  pills slid underneath and only their bottom edges showed. The bar and the
  tracker are now one pinned block, so the tracker is always there and always
  whole.
- **The Video / Research / Post tabs are gone.** They asked you to declare what
  you were making before you had made anything, and then argued with the
  sequence that actually decides it. What you are making is now read off the
  work: a publication with a clip is a video, one without is written. A quiet
  label says which, and there is nothing to set.
- **A video can now carry a written thesis.** The tabs made those two things
  mutually exclusive, which was never the intention. Text belongs to the write
  step and clips to the video step, so a publication can have either, both, or
  neither.
- **Step 1 is no longer a nearly empty page.** In video mode it used to show a
  headline and one line of dek on a very tall canvas, because the writing
  surface belonged to a different tab. It is always there now.
- **The toolbox gets out of the way.** It folds to its icons on the steps that
  do not build anything (the call, tags, publish) and opens again where a card
  deck or the assistant is actually useful. Open or close it yourself and it
  stays that way until you move to another step.
- **Two more themes in Markets.** *Gold's second life* on central bank buying
  and the debasement trade, mixing the metal with the miners and the funds; and
  *The long end* on term premium and what is moving yields, mixing the 5, 10 and
  30-year with the bond funds.
- **A yield now reads as a yield everywhere.** On the tape and in the theme
  tables the Treasury lines print as `4.796%` rather than a bare number sitting
  next to a fund's share price and looking like one.

**Found while auditing the sequence, and fixed**

- Moving between steps scrolled the window, which is not what scrolls inside
  the app, so a new step's heading stayed tucked under the pinned header.
- The note beside "Upload an image" could not wrap and was being squeezed into
  a one-word-wide column.
- On a phone the **Publish** button was pushed off the end of the bar, and the
  headline was set at a size a 390px screen could not hold.
- The publish gate still said "run the fact-check in Assistant" after the
  fact-check moved onto the publish step.

**What needs Krisi**

- Nothing new. Migrations `0062` and `0063` from the previous batch are still
  written and still unapplied.
- **New Posts cannot be created from Compose any more**, because the tab was the
  only way to start one. Existing Posts are untouched: they keep their own
  canvas and their character limit, and nothing converts them. There is an
  unwired `postNote()` server action that is the natural home for a quick-note
  composer if notes are wanted back as a first-class thing.

## 2026-09-01 — Compose leads you through it, edits are shown in public, and gold and oil become things you can call

**For someone using the site**

- **Compose walks you through it now, one step at a time.** It used to put
  everything on screen at once, which sounds generous and worked out as
  neglect: the optional parts were invisible and got skipped, evidence cards
  most of all. The order is the order you actually think in: write it, say what
  you are claiming, show the evidence, add the clip, edit the clip, tag it,
  send it out. The first time through it guides and a step you have not reached
  is locked; once you reach the end you can jump anywhere. Each step says
  whether it is done, empty, or safe to leave alone.
- **Cards get an actual invitation.** On an empty deck the cards step explains
  what a card is and what it does for a reader, and offers one obvious button
  to make the first one, plus one to draft them from what you have already
  written. This is the step that was being missed.
- **Skipping the video is a real choice.** A video publication with no clip
  cannot publish, so a plain skip used to walk you into a wall three steps
  later. "Continue without a video" now turns the piece into the written
  publication it has become, keeps everything you have written, and says so on
  the button.
- **Nothing was taken away.** The card tray and its library, dragging a card
  into your text or onto the timeline, the assistant, the provenance marks, the
  per-card locking, the burn-in warning, the format-switch warning and the
  video upload all work as before. The Publish details drawer is gone, because
  Publish is a step and a second panel with the same controls on it was the
  problem.
- **A published report can be edited, and the reader is told.** The headline,
  the standfirst, the thesis, the cards and the tags can all be corrected after
  publication. Every edit puts a small EDITED mark next to the byline; opening
  it says which parts changed and when. It is brass rather than red on purpose:
  correcting yourself in the open is the right thing to do and should not look
  like being caught.
- **The call still cannot be edited. Ever.** Ticker, direction, entry price,
  target, horizon and the resolution stay exactly as published. The mark opens
  by saying so.
- **A publication with no call can be deleted properly.** Not just hidden. If
  it carries a call, Delete is not offered at all and Archive is the only
  option, with the existing copy about the call staying on the record. Delete
  is irreversible and the confirmation says so plainly, in red, and asks you to
  type the word.
- **Gold, oil, Treasuries and bitcoin are now instruments you can call.** Each
  has its own page with the annotated chart, appears in search, shows on the
  tape, and works as a ticker in the call block. Searching "gold" or "oil" or
  "treasuries" finds them.
- **A new theme: the Iran conflict.** Crude, gold, the defence primes and the
  tanker owners, with the risk premium as the thread connecting them.

**What needs Krisi**

- **Two migrations are written and NOT applied.** There is no Supabase CLI, no
  access token and no SQL path to the project from this machine, so they were
  left for him rather than forced through.
  - `0062_delete_callless_publication.sql` permits an author to delete their own
    published or archived report **only when no `predictions` row points at it**,
    and lets that delete cascade to the body and the fact-check claims. It still
    refuses to delete anything carrying a call, at any status, and does not touch
    `prevent_prediction_delete` or any resolution.
  - `0063_public_edit_markers.sql` adds the `report_edits` table (publicly
    readable, insert-only, no update or delete policy at all) and loosens the
    lock so `title`, `summary`, `content_hash` and the body can change after
    publish. It still freezes `ticker`, `type`, `access`, `price`, `locked_at`
    and any return to draft, and does not touch `prevent_prediction_terms_edit`,
    so the call and its resolution stay frozen.
  - `content_hash` is deliberately allowed to move: it attests to what is
    actually published, and freezing it across an edit would leave it attesting
    to text that no longer exists.
- **Until they are applied**, the delete dialog and the edit save will be
  refused by the database and will report that refusal; the EDITED mark has no
  table to read and simply does not render. Nothing fails silently.
- **The 2-year Treasury is deliberately absent.** The data provider has no clean
  yield series for it, so it was left out rather than shown broken. Gold, WTI,
  Brent, the 5/10/30-year yields and bitcoin were each checked against the live
  provider and all return both quotes and chart history.

---

## 2026-09-01 — A published video actually arrives, cards reach the reader, and the phone chrome is rebuilt

**For someone using the site**

- **A video chosen in Compose now actually reaches the host.** Every upload from
  the UI has been failing silently. The browser set one header twice and the
  host rejected the transfer, so the video record was created with zero bytes
  behind it and the publication had nothing to play. The error that would have
  said so was wiped by an immediate redirect. Fixed, verified against the host
  from a real browser, and a failed upload now stays on screen and says why.
- **A finished video goes live on its own.** Nothing was promoting a clip once
  the host finished processing it: only one provider webhook has ever reached
  us, and every clip that ever went live was promoted by hand. A clip is now
  reconciled by the publication page itself when it is opened, by the webhook,
  and by a daily sweep behind both, so no single missed delivery can strand a
  video. A
  clip that lands ready under a published report is also marked live, which the
  compose path never did.
- **Evidence cards appear on the publication.** They were stored correctly and
  the page simply never rendered them. They now read as a strip above the
  thesis, and look the same as they do in the Feed. Profile and Today keep
  showing the CARDS badge, which is by design.
- **An image on a card is now uploaded.** The picker only made a preview that
  lived inside the tab that created it, so the card saved a link to nothing.
  This is why cards appeared to save correctly and then showed no picture.
- **An archived publication says it is archived**, in the Publications list and
  on the publication itself, with Restore where the bad news is. It used to look
  identical to a live one.
- **The phone top bar carries actions instead of a hamburger.** Wordmark, then
  search, Compose, Inbox with an unread dot, and the avatar. Nothing became
  unreachable: the four surfaces were already in the bottom bar, and Settings
  and Sign out are in the Account group the avatar leads to.
- **The bottom bar is a floating pill** inset from the edges, with the page
  visible behind and around it, and it shrinks to 80% as you scroll down and
  comes back as you scroll up. It cannot flicker on a resting thumb, and page
  bottoms now reserve room so the last row is never underneath it.
- **Two overlaps found auditing every surface at 390.** Resolved-call seals on
  an instrument chart stacked into an unreadable pile when calls resolved close
  together; they now take the nearest clear seat inside the plot. The
  Publications list printed NOTE twice.

**What needs Krisi's attention**

- **The Bunny webhook is still not registered.** Only one delivery has ever been
  processed, back on 22 August. The reconcile sweep means a video no longer
  depends on it, but the work is now carried by the reconcile-on-view path,
  with only a daily sweep behind it: a sub-daily cron is rejected on this
  Vercel plan and fails the deployment outright. So a clip nobody opens can sit
  unpromoted for up to a day. Registering the webhook against
  `/api/webhooks/bunny-stream?secret=...` makes it immediate and makes both
  fallbacks redundant.
- **The reported Feed overlap was not a layout fault.** With the video hidden,
  the dateline and the chips sit cleanly apart and the DOM holds exactly one
  chip pair. The second pair is inside the demo clips, which show a trading UI
  with their own tickers and LONG/SHORT chips in the same corner and style as
  ours. The scrim is stronger so ours reads as chrome, but real analyst video
  will carry whatever it carries, and this is worth knowing before reading a
  screenshot as a bug.
- **The demo clips are misleading in screenshots** for the same reason. Any
  review of Feed, Explore or Today layout using them should assume tickers and
  chips in the frame are the video, not the product.
- **Bar's own stuck video is not recoverable**: zero bytes reached the host, so
  the file only ever existed on his device. It needs re-uploading.
- **Left unfixed, deliberately:** the studio Publications list does not include
  CARDS in its content badge the way Profile and Today do (it would need a
  cards query per row), and `docs/MOTION.md` §A.4 still says nav must not
  animate, which the shrink-on-scroll bar is now a named exception to.

---

## 2026-09-01 — Composing a publication keeps what you wrote, and you can take one down

**For someone using the site**

- **A headline you type is no longer thrown away.** Publishing as a Post stores
  no headline and no body, so switching format to Post after writing threw both
  away on the next save, without a word. Publishing then locked that loss in.
  The switch now names exactly what it is about to drop and waits for an answer.
  This is what left a report reading "Untitled" with its writing gone.
- **The video you choose in Compose is actually uploaded.** The video rung let a
  creator pick a file, trim it, place overlays and choose a thumbnail while
  holding nothing but a preview URL inside the browser tab. No upload was ever
  started and no clip row was ever created, so the video could not appear on the
  published report. Compose now locks the report, uploads the clip, and then
  opens it. If the upload fails the report is still published and says so, rather
  than reading as a failed publish.
- **A Post shows its text in Publications instead of "Untitled".** The list read
  only the headline, which a Post never has. It now falls back to the post's own
  words, the way the public page already did.
- **Edit no longer leads to a not-found page.** Every publication offered Edit,
  but the compose route only ever loaded drafts, so Edit on anything published
  returned a 404. Published reports are locked in the database and genuinely
  cannot be edited, so Edit is now offered only on drafts, and the old URL sends
  you to the report instead of a dead end.
- **A publication can be archived.** There was no way to remove one at all.
  Archiving takes it off the Feed, Explore, search and your public profile, and
  it can be restored at any time. Archived work stays in your own Publications
  under an ARCHIVED filter.
- **Archiving is not a delete, and the dialog says so.** Stoa cannot delete a
  published report: the record, its text, its timestamp and its content hash stay
  exactly as published, and the archive is written to the audit log. **If the
  publication has a locked call, that call stays on your track record, keeps
  counting toward your accuracy and still resolves on its horizon date.** The
  dialog states this outright when a call is attached, so archiving cannot be
  mistaken for a way to bury a miss.

**Worth knowing**

- The three problems reported were all pre-existing, none of them caused by the
  recent Feed and video work. The lost headline and the broken Edit both date to
  the compose editor built on 30 June. The video was orphaned on 16 August, when
  the Publications rebuild replaced the list that carried the working "Add video"
  button; the rung added on 18 August looked like an uploader but was never
  wired to one. Archiving had simply never been built.
- The 455 seeded demo publications were written straight to the database, so
  none of this ever showed on them. It only affected publications composed
  through the interface.

**For Krisi**

- `StudioPublishedList` in `src/components/studio/studio-published-list.tsx` is
  dead code and is the only other place that carried the video upload flow.
  Nothing renders it. It should either come back deliberately or be deleted.
- The archive round trip was verified read-only against production data: 321 of
  400 sampled archived reports carry a locked call, and the track-record query
  still returns them, including a resolved miss. Writing to production was
  blocked by the sandbox, so the archive and restore actions themselves have not
  been exercised against the live database.
- `saveDraft` in `src/app/actions/reports.ts` ignores the error from its UPDATE
  branch, so a rejected draft save reports success. Left alone here because it
  was not one of the three reported problems, but it hides real failures.

---

## 2026-08-25 — Today shows its video, and the Feed can be swiped again

**For someone using the site**

- **Today leans towards publications you can watch.** Where a band decides what
  to show, a publication with a ready clip now counts for more. It is a
  preference and not a rule: a strong written report still leads the page when
  it is genuinely the strongest, and no band can turn into a wall of video.
  At most 70% of any band is video, and that is checked as the band fills, not
  just at the end, so the five items a phone shows of Trending Now are mixed
  too rather than five videos in a row.
- **The bands that were text-only now show the clip.** 112 publications have a
  ready clip and most of Today was not showing them. The three stories beside
  the lead, Trending Now, and the smaller items in a theme cluster all carry a
  thumbnail now. The lead and Your Desk already did.
- **A publication with no video still gets no image area at all.** Not a
  coloured square, not an empty frame: the headline simply starts at the top,
  the way a written report reads everywhere else. Nothing autoplays on Today.
- **Verdicts and Market news deliberately stay without pictures.** A verdict is
  a call the market graded and the seal is its image; the wire is not Stoa
  video.
- **Swiping sideways in the Feed works.** It never did on a phone. The evidence
  cards behind each clip, up to nine of them including the unlock, could only be
  reached through two small arrows on the frame, because the strip they live on
  was locked. Now a finger moves through them, and up and down still moves
  between publications.
- **The two directions no longer get in each other's way.** A sideways swipe
  moves through the evidence, an up-or-down swipe moves to the next publication,
  and a slightly diagonal one goes wherever it was mostly heading instead of
  doing nothing. Both snap cleanly and neither drags the page behind it.
- **The scrollbars are gone from the Feed.** A thin grey bar was sitting on the
  right edge of the reader, and a second one appeared across the video the
  moment the cards became swipeable.

**Checked on a phone-sized screen, not just built**

- **Explore's ticker and sector filters with the keyboard open.** The panel
  resizes to the space the keyboard leaves, the field stays at the top and the
  results stay visible and scrollable underneath. Typing narrows the list and it
  stays above the keyboard. Working as intended, no change needed.
- **The report page's video docking.** Start a clip, scroll into the writing,
  and it shrinks to the bottom-right corner and keeps playing, with a way back
  to its place in the page and a way to stop it. The page does not jump, because
  the space it left holds its height. Working as intended, no change needed.

**Needs Krisi's attention**

- Nothing schema-side. This batch is presentation and gesture handling only.

**Deliberately not done**

- **Your Desk still shows newest first.** It is the reader's own memberships and
  follows, and reordering someone's own subscriptions by format is a different
  kind of decision from ranking the public page. Say the word and it can take
  the same lean as the rest.
- **Real finger momentum on a physical phone was not exercised.** There is no
  device or iOS simulator on this machine, and the browser used for checking
  fires a touch-start but no touch-move, so a genuine drag could not be
  performed. What was verified instead is the mechanism the gestures run on:
  each container scrolls on exactly one axis, both snap exactly onto a card or
  a publication from any partial position, panning one axis does not move the
  other, and the pager follows a hand-panned track. Momentum and the browser's
  own diagonal axis-lock are its behaviour, not ours, and are worth a minute on
  a real handset before this ships.

## 2026-08-25 — Compose is a workspace, and cards belong to the publication

**For someone using the site**

- **The question "are you publishing with video?" is gone.** Compose no longer
  asks anything before you start. You get a headline, a dek, and two quiet rows:
  "+ Add video" and "+ Add research". A publication can have either, both, or
  neither.
- **The screen has a shape you can state in one sentence: left is what you build
  with, right is what you publish as.** The left rail holds your cards and the AI
  assistant. The middle holds the publication. The right holds the settings that
  get applied to it: the call, access, promote, and the checks that stand between
  a draft and publishing.
- **Cards are now one pool the whole publication draws on.** They were a step
  inside the video path, so building a deck meant going through the video
  recorder first, and a written report could not reach them at all. Now they sit
  at the top of the left rail with a count, each showing its name, a one-line
  summary, and its provenance tag.
- **You drag a card onto the video timeline or into the writing.** Drop it on the
  visual track and it becomes a timed overlay where you dropped it; drop it in
  the research and it becomes a figure at that point. The target lights up as you
  drag over it. The card stays in the tray afterwards, because the same card can
  be in both places, and each row tells you where it currently is.
- **Editing a card changes it everywhere at once.** A placement remembers which
  card it is, not a copy of it. Delete a card and it leaves both places rather
  than leaving a hole behind.
- **Dragging is not the only way.** Every card has a menu with "Place in video"
  and "Insert in research", which is what works on a phone and from a keyboard.
- **Adding a card starts from what you are trying to do**, not from a format
  list: make your case, prove it, compare, show the risk, your own. A Custom
  entry lists the same cards by shape for anyone who would rather pick a
  timeline than an intent.
- **Each module says what it holds.** "VIDEO 0:58", "RESEARCH 1,840 words", so
  you can see what the publication contains without scrolling through it.
- **Promote is a new section on the right**, and it is also reachable later from
  a publication that is already out, so promoting is not a decision you have to
  make at the moment of publishing.
- **The profile navigation is no longer on Compose.** It is not a tool for making
  a publication, and the left edge is now the toolbox.
- **On a narrow screen the toolbox is a drawer** opened from a button in the top
  bar that carries the card count, and the settings stack under the writing
  instead of being a third column there is no room for. On a laptop the toolbox
  collapses to icons.

**What it was before**

A fork, then a wizard. The first thing on the screen was "Are you publishing with
video?" with two answers, and the answer decided the shape of everything after
it. Video work got a rung containing the player, the trim, the timeline and,
inside that, the visual-overlay picker. Cards were reachable only from there.

They were not really reachable even then: the picker offered three fixed labels
("Price chart · entry & target", "Peer comparison", "Key stats") that looked like
cards and were strings. Nothing in Compose could create a card. The table, the
validation and the player's renderer all existed and had since the card engine
landed; the authoring end was never built, so `saveCards` had no caller.

**Two bugs found on the way, both losing data**

Tags were never read back from a draft. Compose started with an empty tag
selection whatever the draft actually held, so reopening a tagged publication
showed no tags, and the next save wrote that emptiness over the real ones. It is
now seeded from the draft.

The autosave saved stale tags. The save function read the current tag selection
but did not list it among the things that should rebuild the function, so the
thirty-second autosave kept writing whichever selection had been current earlier
in the session. Both are fixed.

**The part that usually breaks**

Reopening a draft could have shown the creator empty cards where their own gated
words used to be. The existing card reader deliberately strips the payload off
any locked card, which is exactly right for a reader without entitlement and
exactly wrong for the person who wrote it. Compose uses a separate author-side
read that keeps the payload, with an ownership check on top of the row-level
policy that already allows it.

The other one is the settings rail. On a narrow screen it stops being a column
and stacks under the writing, and it is moved by the layout rather than rendered
a second time. Two copies would have meant two sets of radio buttons sharing a
name and two labels pointing at the same field.

**For Krisi**

- **Promotion pricing is still undecided, and nothing here decides it.** The
  switch, the always-labelled rule and the after-publish entry point are built;
  the cost model is injected as a `PromoteModel` and the panel renders whatever
  it is handed, including nothing. Right now it says the price is not set and
  offers nothing selectable, so nothing can be sold at a price nobody has agreed.
  The four old fixed Boost packages are deliberately not wired in.
- **No migration.** Cards store what `publication_cards` already stores. A card's
  name, summary and provenance tag are derived from the payload rather than
  stored, so they cannot drift from the words on the card and no column was
  added.
- **Overlays still do not persist, and there is still no burn-in pipeline.** That
  was true before this batch and is unchanged: the workspace holds them in
  memory. The video module opens on an existing draft when that report has a
  clip, but its trim and overlays start empty. This is the same decision the
  build spec has open, and it is the main thing standing between the workspace
  and a publication whose overlays survive a reload.
- **The AI assistant's entries seed the Ask panel rather than calling dedicated
  pipelines.** Clicking one fills the prompt and leaves sending to the analyst,
  which is deliberate for anything that costs credits. "Generate cards from the
  thesis" in particular has no card-producing action behind it yet: the compose
  agent's action list can insert blocks into the document but cannot build a
  card. Devil's Advocate is priced at 4 credits with its own token budget.

---

## 2026-08-24 (later) — Explore's filters are searchable

**For someone using the site**

- **The ticker and sector filters are pickers you type into.** Clicking one
  opens a field; typing narrows the list; you choose from what is left. Names
  that start with what you typed come first. Before anything is typed the whole
  list is there, ordered most-covered first, so the control is still useful
  without searching.
- **The counts beside each option are gone.** No "(14)" and no "8
  publications", just the ticker or the sector. The ordering still carries
  coverage, which was the useful part.
- **On a phone it opens as a sheet**, with the field at the top and the results
  below it, sized to the space the on-screen keyboard leaves.

**What they were before**

A plain menu. A button opened a scrolling list, each row printing the option and
its publication count ("GS 2", "Software 5"), with no field and no way to type.
That is fine at a dozen tickers and unusable at the few hundred the list reaches
as the catalogue grows.

Worth recording, since it was asked: the earlier instruction to make these
searchable was never applied. The control had not changed since it was written
on 2026-08-18, and none of the commits that have touched this file since then
went near it.

**The part that usually breaks**

A list anchored under the trigger ends up behind the keyboard on a phone, so the
reader types and cannot see what they are choosing from. The sheet is sized from
`visualViewport`, which is the only thing that reports the space actually left.
Measured at a keyboard-sized viewport of 420px: the panel is 420, the list ends
at 419, the field is still visible, and 343px of a 616px list is showing and
scrolls.

**One thing to know about the option list**

The options come from what is on the wall, so today that is 14 tickers and 8
sectors rather than hundreds: Explore builds 30 tiles and the filter offers the
tickers those tiles cover. The picker scales to hundreds when the wall does.
Widening it to the whole catalogue would mean filtering could return
publications the wall never fetched, which is a different change and not this
one.

---

## 2026-08-24 — No slot without a video, and the report reads in two columns

**For someone using the site**

- **No publication without a video reserves space for one, anywhere.** The last
  holdout was the profile grid, where a written report sat inside a bordered
  16:9 box with its headline set into it. That box was an image slot with no
  image, kept so the grid rows lined up. Written reports are now their
  metadata, headline, dek and view count, and the grid is top-aligned so a
  shorter item simply ends sooner.
- **The report page reads in two columns.** The analyst's clip sits beside the
  writing rather than above it, so a reader can watch while reading instead of
  scrolling past the video to reach the words. The player is click-to-play, not
  autoplaying, and sticks within its column so it holds still for the length of
  the read.
- **On a phone the clip leads the page and then gets out of the way.** Once it
  is playing and has been scrolled past, it shrinks to a corner and keeps going,
  with a way back to its place in the page and a way to stop it.
- **A report with no video is a single column of writing**, unchanged.

**What needed no change**

- Markets publication rows already render through Today's row component, which
  stopped reserving a thumbnail in the previous batch.
- Explore and the Feed only ever query publications that have a clip.
- Today's lead and bands, the landing lead, and the profile lead tier were done
  in the previous batch.

**The placeholder now has exactly one use**

A clip that exists but whose poster frame Bunny has not produced yet. That is a
video with no still, not a publication with no video. Every other use is gone:
it is reached only through `ClipThumb`, from surfaces that have already
established a clip exists, plus two components that guard on the same condition.
If clips always arrived with a poster, the component would have no callers left.

**Two implementation notes worth keeping**

- Getting the phone order right (clip, writing, panels) needed `display:
  contents` on the layout wrappers below `lg`, which dissolves them so the clip
  and the trust panels can be ordered independently against the body. Without
  it the panels sat between the video and the first paragraph.
- The docked player is never re-parented. Moving an iframe in the DOM reloads
  it, which would restart the video at the exact moment it docked.

**Verified, and one thing not**

Checked signed out at 1440 and 390, on a report with a clip and one without.
The two-column layout, the sticky player, click-to-play, the phone stacking
order and the single-column no-video page all confirmed, including the sticky
geometry on a real report: a 763px block inside a 1087px column.

The phone docking is **not** confirmed. It depends on scrolling and on an
intersection observer, and the preview browser here never reports itself
visible, so the page does not scroll, observers do not fire and animation frames
do not run. The code is in and everything around it works; the behaviour itself
wants a real phone or a real browser window. To check it: open a report at
phone width, press play, and scroll into the text.

---

## 2026-08-23 (later still) — No video slot where there is no video

**For someone using the site**

- **Today no longer prefers publications with video when picking its lead.** It
  had been choosing the strongest publication *that has a clip*, falling back to
  the strongest overall, which meant a written report could be the best story of
  the day and still be demoted. Today is the reading surface; the lead is now
  simply the strongest item.
- **A publication with no video gets no image area.** Not a placeholder, not an
  empty frame, not a coloured block. It renders as a headline, dek and byline,
  the way a written report does everywhere else. Applied to Today's lead and
  rail posters, the Today row thumbnail, the landing lead, and the profile's
  lead tier, all four of which had been reserving a frame regardless and filling
  it with the analyst's colour.

**The one case the placeholder survives**

A clip that exists but whose poster frame Bunny has not produced yet. That is a
video with no still, which is not the same thing as a publication with no video,
and there the slot is legitimately a video slot.

**Selection versus rendering**

These are separate questions and only the first was asked about Today. A
profile's lead still prefers the analyst's video, because a profile is a
storefront rather than a reading surface. It obeys the same rendering rule when
the chosen publication has no clip.

**Verified**

Both branches, which the live data cannot currently produce on demand: every
demo analyst carries at least one clip. `/dev/today?lead=written` strips the
clip from the fixture lead, and `/dev/profile?pinned=r3` pins a written
publication as a profile lead. Checked at 1440 and 390. On the dev Today page
exactly eight media slots render for exactly the eight fixture items that have a
clip.

---

## 2026-08-23 (later) — Clips reach Today and the report page

**For someone using the site**

- **Today shows a real frame from the video** wherever a publication has a
  clip, on the lead and on every poster in the bands. It was showing a blank
  grey box with a play glyph. Nothing autoplays and nothing plays inline:
  pressing a poster opens the publication, which is the point of Today.
- **The report page now leads with the analyst's video.** The poster sits at the
  top with a clear play control, and pressing it plays the clip there on the
  page rather than sending the reader to the Feed. It does not autoplay; the
  reader chooses. Bunny's own controls are on, so it can be scrubbed and
  fullscreened.
- **The landing page's lead poster** had the same fault and is fixed with it.

**Why they were empty, and it was not the same reason twice**

- **Today knew about the clips all along.** It reads the same query the Feed and
  Explore read, and 78 of the 120 publications in its pool carry one. It drew
  the poster through Next's image optimiser, which fetches the file from our own
  server, where there is no referring page to send. The Bunny pull zone refuses
  that, so every thumbnail came back 403.

  Worth being precise, because the symptom misled: nothing fell back to the
  coloured placeholder. The placeholder is only reached when the thumbnail URL
  is null, and it was not null. It was a good URL our own optimiser could not
  fetch, so the surface showed neither a frame nor a placeholder. That is the
  same fault fixed for Explore and the Feed earlier today, in the two places
  that had not been converted.

- **The report page did not know.** There was no clip query and no video
  component on it at all. It was never wired, so no amount of ready clips would
  have shown anything.

- **Profiles were already fine.** They draw thumbnails with a plain image tag,
  so the pull zone serves them normally. The lead tier and the grid have been
  showing real frames since the clips went ready; nothing needed changing there.

**Checked and left alone**

- The coloured placeholder now appears only where a publication genuinely has no
  clip. Every poster on the site goes through one component, which falls back to
  the placeholder when there is no thumbnail, and the only other uses of it are
  the profile's written-report lead and a card that guards on the same condition.

**Known rough edge**

- Clips are portrait and several surfaces frame them landscape, so a 16:9 tile
  crops a portrait frame to its middle third. On Today's lead and the profile's
  lead tier that reads as a close crop rather than a full frame. Correct for a
  real talking head, where the middle third is the face, and left as it is
  rather than redesigning those tiles in a bug fix.

---

## 2026-08-23 — The Feed as designed, Discover retired, and Explore unblocked

**For someone using the site**

- **The Feed is the designed one.** Full-screen: one publication fills the
  viewport, scrolling snaps to the next, and the clip autoplays muted as it
  arrives and stops as it leaves. The clip and the publication's evidence cards
  share a single portrait stage, so moving sideways moves through the evidence:
  the analyst's face, then the case, then the unlock. Above the frame, the mono
  dateline; on the picture, ticker and direction chips, the seal when the call is
  resolved, and the analyst's identity band; beneath it, LIKE, DISCUSS, SAVE and
  SHARE with the pager at the right end. Keyboard throughout: up and down between
  publications, left and right through cards, a double right to the unlock card,
  M to mute, Space to pause.
- **Discover is gone.** Not renamed, retired. The Feed is the only video
  discovery surface and it is called Feed. The sections, the layout toggle, the
  text mosaic and the `?layout=` parameters have all gone with it. Old links
  still work: `/discover` permanently redirects to `/feed`.
- **Explore works again.** It had been showing "Nothing to explore yet" over a
  full catalogue. Tapping a tile now opens the Feed at that publication rather
  than a separate overlay player.
- **Thumbnails appear.** Every clip thumbnail on Explore, and the Feed's poster
  frame, had been rendering as a black rectangle.

**Why Explore was empty**

Two faults stacked, and both had to be true for the page to look broken.

- 111 of the 112 clips were still marked "processing", because the Bunny webhook
  that flips them to ready has never been registered. Explore only shows
  publications with a ready clip, so it had exactly one candidate.
- Explore's wall packs tiles into complete rows and discards an incomplete
  trailing row, so it ends flush. One tile cannot complete a row, so the one
  candidate was discarded too and the page rendered its empty state.

The Feed looked fine throughout because it was not showing video at all. It was
falling back to the old text mosaic, which read publications directly and never
needed a clip. That fallback was chosen by an env flag that was present but
empty, and an empty value counted as "explicitly off" rather than "unset". All
three are fixed: the clips are ready, a thin wall now renders a short row rather
than nothing, and the flag is deleted rather than corrected, because with the
mosaic gone it has nothing left to choose between.

**Also fixed**

- **Bunny thumbnails cannot go through Next's image optimiser.** The pull zone
  refuses requests with no `Referer`, and the optimiser fetches from our own
  server where there is no referring page: every request came back 403. They are
  now loaded as plain images, which the browser sends an origin with. The other
  fix is on the Bunny side, by allowing the no-referrer case, which is a
  deliberate security setting and not ours to flip.
- **The demo clips are portrait.** They were generated at 1280x720 before this
  design existed and sat letterboxed in the 9:16 stage. All 112 were regenerated
  at 1080x1920 and re-uploaded, and the previous Bunny assets were deleted first
  so the library holds one set.

**Where Discover appeared, and what happened to each**

- Routes: `(app)/discover/` and `dev/discover/` deleted; `/discover` redirects.
- Components: `components/discover/` (filter bar, report block, layout toggle)
  deleted, along with the Feed's tab bar, QuickPost composer, and the previous
  player and page wrappers that only Discover used.
- Links: the nav, the footer, the error and not-found pages, the error panel,
  Contact, Scoring, Subscriptions, the Dispatch and onboarding all pointed at
  `/discover`; all now point at `/feed`, or at `/explore` where they meant
  "browse analysts".
- Revalidation: seven `revalidatePath("/discover")` calls across the report,
  card, boost, social and publish paths now revalidate `/feed`.
- The `video_first_discover` feature flag, its helper and its env override:
  deleted.
- Boost placements `discover_researchers` and `discover_sidebar` renamed to
  `analyst_featured` and `analyst_sidebar`. Safe to rename because the `boosts`
  table has never been migrated, so no stored row carries the old values.
- Copy and comments across fourteen files, plus the sitemap entry.
- Docs: `CLAUDE.md`, `AGENTS.md`, `docs/PRODUCT_MODEL.md`, `docs/FRONTEND.md`,
  `README.md`, `docs/ROADMAP.md`, `docs/MOTION.md`, `docs/SCALE.md` and
  `docs/BACKEND.md`. CLAUDE.md and AGENTS.md are read at the start of every
  session and both said the Feed lives at `/discover`, so a stale line there
  would have kept steering work back to a surface that no longer exists.

**Needs Krisi**

- The Bunny webhook is still unregistered, so the 112 clips were promoted by
  polling again (`demo:video:check -- --promote`). Nothing has changed about
  items 16 and 17 in `docs/BACKEND_BRIEF.md`; they are still the fix.

**Left undone, deliberately**

- The QuickPost composer went with Discover. Analysts compose in Studio, which
  the nav's Write button already points at, so nothing is unreachable, but this
  did remove a one-line posting entry point rather than move it.
- The Researchers tab is gone and nothing replaced it. The two analyst boost
  packages are still priced and sold against a placement that now has no
  surface to render in.

---

## 2026-08-22 — Demo video, pass 2: a clip for every publication that should have one

**For someone using the site**

- Nothing is visibly different yet, and that is the intended stopping point.
  Explore and the Feed only show publications that carry a video clip, and the
  demo dataset had 455 publications and no video at all, so both surfaces were
  empty. There are now 112 clips generated and uploaded, one each for the three
  most recent publications of all 40 demo analysts. They sit in Bunny's
  "processing" state until the webhook is registered, so the surfaces stay empty
  until then; see below.
- The clips are honest placeholders, not pretend footage. Each one is the
  analyst's own placeholder thumbnail held for 30 to 85 seconds: their assigned
  colour, the same soft two-tone wash, the same abstract circle-and-shoulders
  figure at 20% opacity, with a slow drift of light across it so it reads as
  video rather than a frozen frame. No text, no initials, no stock footage of
  real people. At tile size it reads as a person on camera; at full size it is
  obviously synthetic, which is what a demo dataset should look like.
- An analyst is the same colour everywhere. The clips reuse `analystColor()`,
  the same id-seeded assignment the placeholder thumbnails already use, so an
  analyst's clip matches their placeholder on every surface.

**What was added**

- `npm run demo:video:generate` renders the clips into `demo-clips/`, which is
  gitignored, because 122 MB of mp4 has no business in the repo. Files are named for
  their report id so the upload step matches clip to publication by name rather
  than by guessing, and a manifest records the pairing.
- `npm run demo:video:upload` pushes them to Bunny and attaches a `video_clips`
  row to each publication. It resumes rather than duplicating if re-run, and
  deletes the Bunny asset again if the database row cannot be written, so a
  paid library never accumulates assets that teardown cannot see.
- `npm run demo:video:check` reports where every clip has got to on both sides,
  Bunny and the database, and is read-only unless given `--promote`.
- `npm run demo:teardown` already covers all of it: it reads the Bunny GUIDs out
  of the `video_clips` rows and deletes the assets before the rows. Confirmed
  against the real library: a dry run accounts for all 112.

**Needs Krisi**

- **Register the Bunny webhook.** Full URL, secret and the exact behaviour are
  in `docs/BACKEND_BRIEF.md` item 16. The handler was verified against the real
  library: wrong secret refused 401, right secret flips the clip to ready with
  Bunny's own CDN URLs and measured duration.
- **Registering it will not make these 112 clips ready.** Bunny fires on a
  status transition, and all 112 finished transcoding before any webhook existed
  to hear it. There is no pending delivery and Bunny does not replay. The
  registration covers future uploads; this batch needs one
  `npm run demo:video:check -- --promote` sweep, which is written and unrun.
- **This is not only a demo problem, and it is worse on the real path.** A
  creator whose upload finishes but whose webhook never lands cannot publish at
  all: the publish route refuses on `status !== 'ready'`, and captions are only
  ever requested by the webhook, so the "captions are still generating" gate
  never clears either. The clip sits in processing forever, nothing retries and
  nothing alerts. Item 17 asks Krisi to confirm the URL is genuinely saved and
  enabled in Bunny rather than just entered, and proposes a polling reconciler
  on the existing cron surface so a stuck clip heals itself.
- **The webhook never sets `published_at`.** It sets `status` and nothing else,
  while every discovery query filters on `status = 'ready' AND published_at IS
  NOT NULL`. The seeder sets it at insert so the demo does not need a second
  pass, but for real creator uploads the publish step is load-bearing and easy
  to miss. Item 16 has the detail.

**Found in passing, not fixed**

- Explore draws nothing at all below three ready clips. The wall packs into rows
  of six or three with `complete: true` and drops any incomplete trailing row,
  so one or two ready clips render as "Nothing to explore yet for this filter."
  Correct for a full wall, confusing while a dataset is filling up. Worth a
  short-row fallback if the empty state is ever reachable in production.
- `node_modules` on this machine was a full Next 15 install while `package.json`
  and the lockfile both specify Next 16, which broke `npm run lint` outright
  (`eslint-config-next/core-web-vitals` cannot resolve). `npm install` fixes it
  and left the lockfile untouched, so this was a stale local install rather than
  anything in the repo. Worth knowing because a dev server started before that
  install keeps running against the deleted modules and 500s on every route.

---

## 2026-08-21 — Live-audit fixes: the signed-out crash on Today and Markets, the Markets placeholders, report headlines, and honest demo data

**For someone using the site**

- `/home` (Today) no longer breaks for signed-out visitors. It was showing an
  error page instead of the front page, and "Try again" could not recover it.
  `/markets/NVDA` and every other ticker page failed roughly half the time with
  the same fault; that is fixed too.
- The error page keeps the site chrome. It used to replace the whole page with
  bare centred text — no logo, no nav, no footer — so a visitor who landed there
  had no way into the product. It now sits inside the normal layout. Its wording
  also agrees with itself: the copy, the button and the nav all call `/discover`
  the Feed, where the copy previously said "the feed", the button said "Go to
  Discover" and the nav said "Feed".
- Markets no longer prints an engineering note to visitors, and no longer shows
  three consecutive blocks of grey dashes. The Movement band is gone (its two
  columns needed data the quote path does not carry), the twelve sector cards
  now show their real coverage counts instead of "--", and the ETF rows show a
  real day change instead of "--" and "0 PUBLICATIONS".
- Report pages always open with a headline. Roughly a fifth of publications had
  no title at all, so the page began with a chip row, a timestamp and then the
  dek — and the body was that same dek repeated, giving the reader one sentence
  twice. On the page where someone decides whether to pay.
- Nothing on the site now explains its own implementation to the reader. Four
  pieces of copy did; the sector Performance band that existed only to carry one
  is gone, and the sector header no longer reserves an empty price slot.
- The demo data no longer reads as fake. Reseeded to 455 publications across 40
  analysts: no publication is untitled, no two share a headline or body text, no
  analyst is graded HIT and MISS on the same name, nobody is called "Demo
  Investor", no two commenters post identical text across 1,132 comments, and
  "[Demo post]" is gone. Every publication labelled CALL now actually carries a
  locked call (224 of 224), which was not true before.

**Needs Krisi**

- **The root cause is a trap that will recur.** `cachedPage()` wraps a builder
  in Next's `unstable_cache`. Anything inside that scope that reads `cookies()`
  throws — and the cookie-bound Supabase client reads cookies to construct
  itself. Two builders did that. Both cache entries are shared across all
  visitors, so they had no business reading one reader's session anyway. Rule
  for new code: inside `cachedPage`, use `createPublicClient()` from
  `src/lib/supabase/public.ts`, never `createClient()` from
  `src/lib/supabase/server.ts`. Worth an ESLint rule or a CI check; there is a
  call-graph taint pass in the batch notes that found all of them.
- **Movement on Markets is removed, not solved.** Bringing it back needs
  per-symbol day change and average volume on the *list* quote path. Today only
  the single-symbol snapshot carries them. Same for a sector-level day change,
  which needs a constituent-weighted index we do not build.
- **The demo reseed ran against the production project** (`--allow-prod`), since
  there is no dev or staging Supabase configured. Old demo content was archived,
  not deleted, so the rows are still there and hidden by RLS. A real dev project
  would make this safe to iterate on.
- **One publication on Bar's own account** (`@barams2023`, published 18 Aug) has
  an empty title and an empty body, so Today lists it as "Untitled research". It
  is real account data, not demo data, so it was left alone -- it needs a
  decision, not a fix.
- The Performance band on `/markets/sector/[sector]` is removed, not solved. A
  sector-level index needs a history of constituent prices, which the quote path
  does not carry. The sector day change shown in the header is real: the
  equal-weight average of the listed names.
- Two caveats were kept but rewritten out of engineering voice, and both still
  describe real gaps: Inbox notification preferences do not persist, and Compose
  overlays are previewed but not burned into the published video.
- Still open from before: `formula_version` columns on `profiles` and
  `moat_score_snapshots`, and the unresolved Track Score formula (docs describe
  a modified Elo, the shipped engine computes a Wilson composite).

---

## 2026-08-21 — Demo content is archived rather than deleted, and the content badge is earned

**For someone using the site** Publication lists separate live work from
archived work. A publication's content badge (`VIDEO · CALL · CARDS`) is now
built only from what is actually stored, rather than asserted.

**Needs Krisi** `purge_demo_author` cannot delete a locked report, so the reseed
archives instead. Archiving hides rows from readers via RLS — it does not remove
them. A real purge needs that migration.

---

## 2026-08-20 — Demo dataset: 40 analysts with publications, calls, cards and comments

**For someone using the site** The site has a populated body of research:
analysts with track records, resolved and open calls, evidence-card stacks,
comment threads, followers and paying subscribers. Markets charts also got
readable axes, so a price can actually be read off the plot.

**Needs Krisi** Every demo account is `@stoa.demo`, which is the scope
`npm run demo:teardown` keys off. No video yet, so the Feed relies on the later
video pass.

---

## 2026-08-20 — Backend brief items 1–6, plus scale and performance hardening

**For someone using the site** Pages render markedly faster, especially the
second visitor to Markets or Today. Evidence cards, instrument follows,
threaded discussions with likes, and publication tagging all went live.

**Needs Krisi** This is the batch that implements `docs/BACKEND_BRIEF.md`; see
`docs/BACKEND_BRIEF_STATUS.md` for what is done versus outstanding. Per-card
paywalling is enforced in RLS (migration 0051), not in the query, so any new
read path inherits it. Engagement events are insert-only and partitioned.

---

## 2026-08-18 — Feed completion, and the Compose fork with the video editor

**For someone using the site** `/discover` is the video Feed and is on by
default: a vertical stream with evidence cards, provenance inks, sealed cards,
the Steelman, stage markers and real discussions. Compose starts with a single
choice, video or written, and shows what each path reaches; the video rung has
thumbnail creation and a two-track overlay editor.

**Needs Krisi** Video storage is intended as built; the open gap is burn-in.

---

## 2026-08-18 — The landing page, and marketing copy rewritten around the record

**For someone using the site** A new public landing page: the doors, a glimpse
of Today, and verdicts beside the wall of faces. All marketing copy now argues
from the permanent record rather than from a rating.

**Needs Krisi** Nothing outstanding.

---

## 2026-08-18 — Today rebuilt as the daily newspaper, Explore added, Markets given a live tape

**For someone using the site** `/home` is Stoa's daily briefing — a lead,
what is trending, and the calls the market just graded. `/explore` is a wall of
faces that hands off to the Feed player. Markets gained a running tape, theme
momentum and theme pages, live day change and Yahoo news.

**Needs Krisi** Until engagement events accumulate, the lifecycle stages that
drive placement fall back to attention-per-day since arrival rather than a
windowed velocity. Thresholds are named constants in
`src/lib/lifecycle/stages.ts`.

---

## 2026-08-18 — The profile restructured into three tiers of the analyst's work

**For someone using the site** The analyst profile replaced its tab strip with
three tiers of work. The private area merged the investor sections (library,
subscriptions, following) and the creator sections (publications, track record,
audience, earnings, storefront) into one place, and the role switcher is gone.

**Needs Krisi** Nothing outstanding.

---

## 2026-08-18 — Public performance scoring and aggregated stance removed

**For someone using the site** No score, rating, rank, percentile or
leaderboard appears anywhere public, and no surface aggregates analysts into a
verdict — no long/short splits, average targets or consensus. Analysts appear as
an avatar and a name. Graded outcomes are still public, permanent and attached
to every call. Placement is driven by the lifecycle model, not by score.

**Needs Krisi** The engine still computes a private Track Score that only the
analyst sees. It must be settled before it is ever shown publicly again, and the
formula is unresolved — see `docs/PRODUCT_MODEL.md`, "the scoring formula is
unresolved".

---

## 2026-08-16 — Markets rebuilt as an editorial surface

**For someone using the site** Markets became a browsable editorial surface
rather than a screener: Explore bands, a stock page, sector pages, ETF pages,
an instrument sheet and full chart timeframes.

**Needs Krisi** Nothing outstanding.

---

## 2026-08-16 — Global nav rebuilt, and a platform-wide design-token audit

**For someone using the site** Consistent nav proportions, spacing and type
across every page. Ad-hoc per-page colours and arbitrary spacing values were
replaced by the token scale, and the paper background was warmed so it reads as
aged ledger rather than grey-green.

**Needs Krisi** `docs/FRONTEND.md` is the source of truth for tokens. Two
neutrals (`--surface`, `--surface-2`) are not derived from `--paper` and must be
moved by hand whenever it changes.
