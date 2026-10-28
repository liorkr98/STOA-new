import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanName, shortName } from "@/lib/extension/names";

test("the rule strips legal suffixes and listing tails", () => {
  assert.equal(cleanName("Goldman Sachs Group, Inc. (The)"), "Goldman Sachs");
  assert.equal(cleanName("Constellation Energy Corporation - Common Stock When-Issued"), "Constellation Energy");
  assert.equal(cleanName("The Kraft Heinz Company -"), "Kraft Heinz");
  assert.equal(cleanName("Vertiv Holdings, LLC Class A"), "Vertiv");
  assert.equal(cleanName("Taiwan Semiconductor Manufacturing Company Ltd."), "Taiwan Semiconductor Manufacturing");
  assert.equal(cleanName("Nebius Group N.V."), "Nebius");
  assert.equal(cleanName("Seagate Technology Holdings PLC"), "Seagate Technology");
  assert.equal(cleanName("IREN Limited"), "IREN");
  assert.equal(cleanName("Unusual Machines, Inc."), "Unusual Machines");
  assert.equal(cleanName("Teva Pharmaceutical Industries Limited American Depositary Shares"), "Teva Pharmaceutical Industries");
});

test("overrides win for common names", () => {
  assert.equal(shortName("GS", "Goldman Sachs Group, Inc. (The)"), "Goldman Sachs");
  assert.equal(shortName("TSM", "Taiwan Semiconductor Manufacturing Company Ltd."), "TSMC");
  assert.equal(shortName("CAKE", "The Cheesecake Factory Incorporated"), "Cheesecake Factory");
  assert.equal(shortName("LITE", "Lumentum Holdings Inc. -"), "Lumentum");
});
