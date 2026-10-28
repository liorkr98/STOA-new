import type { LegalSectionContent } from "@/lib/legal/content";

/**
 * The Stoa Interest Cart extension's privacy notice. DRAFT pending legal
 * review. The extension's first-run screen (extension/src/entrypoints/welcome)
 * says the same five things in short; keep the two in step.
 */
export const EXTENSION_PRIVACY_CONTENT: LegalSectionContent[] = [
  {
    title: "What the extension does",
    paragraphs: [
      "Stoa Interest Cart is a Chrome extension that works with YouTube. While you watch a finance video, it spots the stocks being discussed and shows a small card beside the video, where you can tap a bull or a bear. Each tap is saved to your Interest Cart on Stoa.",
      "It does nothing until you agree on its first-run screen, and nothing while you have it switched off in its popup.",
    ],
  },
  {
    title: "Where it works",
    bullets: [
      "Only on youtube.com, and only on a video's own page. It does nothing on Shorts, live streams, YouTube's home page or search results, or on any other website.",
      "Chrome lets it see youtube.com and nothing else. It cannot read your other tabs, your bookmarks or your history on other sites.",
    ],
  },
  {
    title: "What it reads",
    bullets: [
      "The captions (the transcript) of the video you are watching, in your own browser, from YouTube's own transcript panel. It opens that panel out of sight for a moment and closes it again.",
      "The video's id, title, channel name, length and whether it is live, from the page you are on.",
      "Where you are in the video (the playback time), so the card appears when a stock is discussed. This stays in your browser.",
    ],
  },
  {
    title: "What is sent to Stoa",
    bullets: [
      "The video's id, first, to check whether Stoa already knows which stocks that video discusses. If it does, nothing else is sent.",
      "If it does not, and you are signed in: the captions text with its timings, the caption language and the video's id. This happens once per video, for the first signed-in viewer only.",
      "When you tap a bull or a bear: the ticker, which side you tapped, and the video it came from: the video's id, its title and channel name as the page shows them at that moment, and the second in the video you tapped at.",
      "Your Stoa sign-in, so Stoa knows whose cart a tap belongs to.",
      "Never your browsing history, your YouTube account or watch history, your comments, or anything from any other site.",
    ],
  },
  {
    title: "What Stoa does with the captions",
    bullets: [
      "Stoa sends the captions to an AI service (Anthropic's Claude) once, to find which companies the speaker discusses, when, and the speaker's own view. Stoa then works out the tickers itself.",
      "Stoa keeps only the result for that video (the tickers, the times and the speaker's view) for 30 days, and shows it to every later viewer of that video. The captions themselves are not stored by Stoa.",
      "How long the AI provider keeps what it receives is governed by Stoa's agreement with that provider. [To be confirmed in legal review.]",
    ],
  },
  {
    title: "Your taps",
    bullets: [
      "Taps are saved to your Interest Cart on Stoa, tied to your Stoa account. Each tap keeps the video it came from (its title, channel and the moment you tapped), so your cart can show \"Where you saw it\" and take you back to that moment. A tap made on Stoa itself keeps the Stoa page it was made on.",
      "Where you saw each stock is visible only to you. It is not shown to analysts, other readers or anyone else, and it is not part of any total Stoa shows.",
      "You can see your taps in your cart and remove a ticker from the current week.",
      "If you tap while signed out, the taps are kept only in the extension on your computer until you sign in, then saved to your cart.",
      "Your taps are deleted with your Stoa account.",
    ],
  },
  {
    title: "What the extension keeps on your computer",
    bullets: [
      "Its own sign-in to Stoa, your taps until Stoa has them, this week's counts, your Quiet mode and on/off settings, and the date you agreed.",
      "Removing the extension from Chrome removes all of it.",
    ],
  },
  {
    title: "Turning it off",
    paragraphs: [
      "Click the Stoa icon in Chrome's toolbar and switch \"On YouTube\" off. Nothing is then read or sent until you switch it back on. You can also sign the extension out from the same popup, or remove it at chrome://extensions.",
    ],
  },
  {
    title: "Contact and changes",
    paragraphs: [
      "Questions about this notice can be sent through Stoa's contact page. If what the extension reads or sends changes, it will ask for your agreement again before doing anything new.",
    ],
  },
];
