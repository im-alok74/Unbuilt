import test from "node:test";
import assert from "node:assert/strict";
import { canMove } from "./types.ts";

test("reps cannot leave won or lost", () => {
  assert.equal(canMove("won", "new", false), false);
  assert.equal(canMove("won", "lost", false), false);
  assert.equal(canMove("lost", "contacted", false), false);
});

test("staff can reopen won and lost", () => {
  assert.equal(canMove("won", "negotiating", true), true);
  assert.equal(canMove("lost", "new", true), true);
});

test("open stages move freely, same-stage is a no-op", () => {
  assert.equal(canMove("new", "won", false), true);
  assert.equal(canMove("quoted", "lost", false), true);
  assert.equal(canMove("won", "won", false), true);
});
