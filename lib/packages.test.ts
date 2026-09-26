import { test } from "node:test";
import assert from "node:assert/strict";
import { suggestPrice, packageForPrice, MIN_PRICE, MAX_PRICE } from "./packages.ts";

test("landing page is the cheapest tier", () => {
  const s = suggestPrice({ kind: "landing", pages: 1, extras: [] });
  assert.equal(s.price, MIN_PRICE);
  assert.equal(s.pkg.id, "starter");
});

test("business website lands in Premium", () => {
  const s = suggestPrice({ kind: "business", pages: 6, extras: [] });
  assert.equal(s.pkg.id, "premium");
  assert.ok(s.price >= 10000 && s.price <= 15000);
});

test("shop with payments, logins and booking is Growth or higher", () => {
  const s = suggestPrice({ kind: "shop", pages: 15, extras: ["payments", "logins", "booking"] });
  assert.ok(["growth", "custom"].includes(s.pkg.id));
});

test("price never leaves 5k..1 lakh", () => {
  const big = suggestPrice({ kind: "app", pages: 30, extras: ["cms", "payments", "booking", "logins", "blog", "branding", "photos"] });
  assert.equal(big.price, MAX_PRICE);
  assert.equal(packageForPrice(MAX_PRICE).id, "custom");
  assert.equal(packageForPrice(MIN_PRICE).id, "starter");
});

test("editable 15-page site is Premium Plus, a shop is Growth", () => {
  assert.equal(suggestPrice({ kind: "cms", pages: 15, extras: ["blog"] }).pkg.id, "plus");
  assert.equal(suggestPrice({ kind: "shop", pages: 15, extras: ["payments", "booking"] }).pkg.id, "growth");
});
