import { test } from "node:test";
import assert from "node:assert/strict";
import { normPhone } from "./area.ts";

test("India keeps the legacy 10-digit key", () => {
  assert.equal(normPhone("+91 98765 43210"), "9876543210");
  assert.equal(normPhone("098765 43210"), "09876543210".slice(-10));
  assert.equal(normPhone("98765 43210", "Pune, Maharashtra"), "9876543210");
});

test("same Dubai number in every format gets one key", () => {
  const k = "+971501234567";
  assert.equal(normPhone("+971 50 123 4567"), k);
  assert.equal(normPhone("+971 (0) 50 123 4567"), k);
  assert.equal(normPhone("00971501234567"), k);
  assert.equal(normPhone("050 123 4567", "Business Bay, Dubai"), k);
  assert.equal(normPhone("971501234567", "Dubai"), k);
});

test("different countries never collide", () => {
  assert.notEqual(normPhone("+1 415 555 0123"), normPhone("+91 415 555 0123"));
  assert.equal(normPhone("+1 415 555 0123"), "+14155550123");
  assert.equal(normPhone("(415) 555-0123", "Austin, Texas, USA"), "+14155550123");
});

test("too short or empty gives no key", () => {
  assert.equal(normPhone(""), "");
  assert.equal(normPhone(null), "");
  assert.equal(normPhone("12345"), "");
});
