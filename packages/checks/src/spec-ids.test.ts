import { describe, expect, it } from "vitest";
import {
  approvedIds,
  compareIds,
  idsFromSpec,
  idsFromTestSource,
} from "./spec-ids.ts";

describe("spec IDs", () => {
  it("CHK-1: reads status and requirement IDs from a spec, skipping struck-through ones", () => {
    const spec = [
      "---",
      "id: SHOP",
      "status: approved",
      "---",
      "### SHOP-1: Lists items",
      "### ~~SHOP-2: Retired~~",
      "### SHOP-3: Adds an item",
      "- mentions SHOP-9 in text",
    ].join("\n");

    expect(idsFromSpec(spec)).toEqual({
      status: "approved",
      ids: ["SHOP-1", "SHOP-3"],
      drafts: [],
    });
  });

  it("CHK-14: reads requirements marked [draft] in a spec", () => {
    const spec = [
      "---",
      "status: approved",
      "---",
      "### SHOP-1: Lists items",
      "### SHOP-4: Adds a coupon [draft]",
      "### ~~SHOP-5: Retired [draft]~~",
    ].join("\n");

    expect(idsFromSpec(spec)).toEqual({
      status: "approved",
      ids: ["SHOP-1", "SHOP-4"],
      drafts: ["SHOP-4"],
    });
  });

  it("CHK-15: approved IDs are the live, unmarked ones of an approved spec", () => {
    const body = [
      "### SHOP-1: Lists items",
      "### SHOP-4: Adds a coupon [draft]",
    ];
    const spec = (status: string) =>
      ["---", `status: ${status}`, "---", ...body].join("\n");

    expect(approvedIds(spec("approved"))).toEqual(["SHOP-1"]);
    expect(approvedIds(spec("draft"))).toEqual([]);
  });

  it("CHK-2: reads the IDs that test names start with, and no other IDs", () => {
    // Built from pieces, so this file's own test names are the only ones
    // the spec ID check sees here.
    const q = '"';
    const source = [
      `it(${q}SHOP-1: lists items${q}, () => {});`,
      `test.only(${q}SHOP-3: adds an item${q}, async () => {});`,
      `it.each([1])(${q}SHOP-4: case %s${q}, () => {});`,
      `it(${q}no id here${q}, () => {});`,
      `const title = ${q}SHOP-5: not a test name${q};`,
    ].join("\n");

    expect(idsFromTestSource(source)).toEqual(["SHOP-1", "SHOP-3", "SHOP-4"]);
  });

  it("CHK-3: reports approved IDs with no test, and test IDs with no approved requirement", () => {
    expect(compareIds(["A-1", "A-2", "B-1"], ["A-1", "B-1", "C-7"])).toEqual({
      untested: ["A-2"],
      unknown: ["C-7"],
    });
  });
});
