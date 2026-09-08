import test from "node:test";
import assert from "node:assert/strict";
import { classifyWebsite, scoreBusiness, pinColor } from "./score.ts";
import { DEFAULT_SCORING_WEIGHTS, DEFAULT_PRIORITY_CATEGORIES } from "../types.ts";

const W = DEFAULT_SCORING_WEIGHTS;
const P = DEFAULT_PRIORITY_CATEGORIES;

test("classifyWebsite: missing → none", () => {
  assert.equal(classifyWebsite(null), "none");
  assert.equal(classifyWebsite(""), "none");
  assert.equal(classifyWebsite("   "), "none");
});

test("classifyWebsite: social hosts → social", () => {
  assert.equal(classifyWebsite("https://www.facebook.com/joepizza"), "social");
  assert.equal(classifyWebsite("https://instagram.com/joepizza"), "social");
  assert.equal(classifyWebsite("https://linktr.ee/joe"), "social");
  assert.equal(classifyWebsite("https://joespizza.business.site"), "social");
  assert.equal(classifyWebsite("not-a-url"), "social");
});

test("classifyWebsite: real domain → real", () => {
  assert.equal(classifyWebsite("https://joespizza.com"), "real");
  assert.equal(classifyWebsite("http://www.joes-pizza.co.in/"), "real");
});

test("scoreBusiness: no website + few photos + undermarketed + priority = 80", () => {
  const r = scoreBusiness(
    { websiteStatus: "none", photoCount: 2, reviewCount: 8, rating: 4.6, types: ["restaurant"] },
    W,
    P,
  );
  assert.equal(r.score, 80);
  assert.deepEqual(
    r.factors.map((f) => f.key).sort(),
    ["fewPhotos", "noWebsite", "priorityCategory", "underMarketed"].sort(),
  );
});

test("scoreBusiness: social-only path caps lower", () => {
  const r = scoreBusiness(
    { websiteStatus: "social", photoCount: 1, reviewCount: 3, rating: 4.2, types: ["gym"] },
    W,
    P,
  );
  assert.equal(r.score, 50); // 20 + 10 + 10 + 10
});

test("scoreBusiness: real website, lots of photos, popular, off-list = 0", () => {
  const r = scoreBusiness(
    { websiteStatus: "real", photoCount: 25, reviewCount: 400, rating: 4.1, types: ["bank"] },
    W,
    P,
  );
  assert.equal(r.score, 0);
  assert.equal(r.factors.length, 0);
});

test("scoreBusiness: undermarketed needs rating >= 4.0", () => {
  const low = scoreBusiness(
    { websiteStatus: "real", photoCount: 10, reviewCount: 5, rating: 3.9, types: ["bank"] },
    W,
    P,
  );
  assert.equal(low.score, 0);
  const ok = scoreBusiness(
    { websiteStatus: "real", photoCount: 10, reviewCount: 5, rating: 4.0, types: ["bank"] },
    W,
    P,
  );
  assert.equal(ok.score, W.underMarketed);
});

test("scoreBusiness: score never exceeds 100 even with inflated weights", () => {
  const r = scoreBusiness(
    { websiteStatus: "none", photoCount: 0, reviewCount: 0, rating: 5, types: ["restaurant"] },
    { noWebsite: 90, socialOnly: 20, fewPhotos: 40, underMarketed: 40, priorityCategory: 40 },
    P,
  );
  assert.equal(r.score, 100);
});

test("pinColor: lead status wins, else website situation", () => {
  assert.equal(pinColor("none", "lost"), "red");
  assert.equal(pinColor("none", "won"), "purple");
  assert.equal(pinColor("none", "quoted"), "blue");
  assert.equal(pinColor("none", "not_contacted"), "orange");
  assert.equal(pinColor("social", "not_contacted"), "pink");
  assert.equal(pinColor("real", "not_contacted"), "green");
  assert.equal(pinColor("unknown", "not_contacted"), "green");
});
