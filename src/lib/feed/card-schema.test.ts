import { test } from "node:test";
import assert from "node:assert/strict";
import { validateCards, CardValidationError } from "./card-schema";

const thesis = { kind: "thesis", locked: false, payload: { title: "T", body: "B" } };

test("a card keeps the row key it was given", () => {
  const id = "6f1c2d3e-4a5b-4c6d-8e9f-0a1b2c3d4e5f";
  const [card] = validateCards([{ ...thesis, id }]);
  assert.equal(card?.id, id);
});

test("a row key is normalised to lower case", () => {
  const [card] = validateCards([{ ...thesis, id: "6F1C2D3E-4A5B-4C6D-8E9F-0A1B2C3D4E5F" }]);
  assert.equal(card?.id, "6f1c2d3e-4a5b-4c6d-8e9f-0a1b2c3d4e5f");
});

test("a card without an id is a new row", () => {
  const [card] = validateCards([thesis]);
  assert.equal(card?.id, undefined);
  assert.equal("id" in (card ?? {}), false);
});

test("an id that is not a row key is refused", () => {
  assert.throws(() => validateCards([{ ...thesis, id: "c_abc12345" }]), CardValidationError);
  assert.throws(() => validateCards([{ ...thesis, id: 42 }]), CardValidationError);
});

test("the unlock card is never locked, with or without an id", () => {
  const [card] = validateCards([
    { kind: "unlock", locked: true, payload: {}, id: "6f1c2d3e-4a5b-4c6d-8e9f-0a1b2c3d4e5f" },
  ]);
  assert.equal(card?.locked, false);
});
