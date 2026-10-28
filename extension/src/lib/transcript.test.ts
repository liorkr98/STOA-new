import assert from "node:assert/strict";
import { test } from "node:test";
import { isAccessibilityLine, parseSegmentBlocks, parseTimestamp, transcriptLanguage } from "./transcript.ts";

test("timestamps", () => {
  assert.equal(parseTimestamp("0:08"), 8);
  assert.equal(parseTimestamp("4:19"), 259);
  assert.equal(parseTimestamp("1:02:03"), 3723);
  assert.equal(parseTimestamp("hello"), null);
});

test("classic markup: timestamp then words", () => {
  const segs = parseSegmentBlocks(["0:00\nאז סדרת סרטונים חדשה", "0:03\nמתוך הסדרה", "4:19\nנתראה בפרק הבא"], 262);
  assert.deepEqual(segs.map((s) => [s.start, s.end, s.text]), [
    [0, 3, "אז סדרת סרטונים חדשה"],
    [3, 259, "מתוך הסדרה"],
    [259, 262, "נתראה בפרק הבא"],
  ]);
});

test("newer markup: the screen-reader duration line is dropped", () => {
  const segs = parseSegmentBlocks(["0:08\n8 seconds\nGoldman Sachs reported", "1:05\n1 minute, 5 seconds\nand JPMorgan", "0:20\n20 שניות\nגולמן סקס"]);
  assert.deepEqual(segs.map((s) => s.text), ["Goldman Sachs reported", "גולמן סקס", "and JPMorgan"]);
});

test("a caption that is only a duration, with nothing after it, is kept", () => {
  assert.equal(parseSegmentBlocks(["0:10\n5 seconds"])[0].text, "5 seconds");
});

test("a duration inside a sentence is not an accessibility line", () => {
  assert.equal(isAccessibilityLine("wait 5 seconds and buy"), false);
  assert.equal(isAccessibilityLine("2 minutes, 1 second"), true);
  assert.equal(isAccessibilityLine("דקה אחת ו 5 שניות"), true);
  assert.equal(isAccessibilityLine("6 דקות, 54 שניות"), true);
});

test("chapter headings without a timestamp are skipped", () => {
  assert.equal(parseSegmentBlocks(["Intro", "0:01\nhello there"]).length, 1);
});

test("language from the panel label, then the script", () => {
  assert.equal(transcriptLanguage("Hebrew (auto-generated)", []), "he");
  assert.equal(transcriptLanguage("English", []), "en");
  assert.equal(transcriptLanguage(null, [{ start: 0, end: 1, text: "שלום לכולם היום" }]), "he");
});
