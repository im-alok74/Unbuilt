import { test } from "node:test";
import assert from "node:assert/strict";
import { countryCodeFor, deriveArea } from "./area.ts";

test("area from address", () => {
  assert.equal(deriveArea("Shop 4, Business Bay, Dubai, UAE"), "Dubai");
  assert.equal(deriveArea("12 MG Road, Indiranagar, Bengaluru, Karnataka 560038, India"), "Bengaluru");
  assert.equal(deriveArea("Shop 4"), null);
});

test("country code from place", () => {
  assert.equal(countryCodeFor("Dubai"), "971");
  assert.equal(countryCodeFor("Pune Maharashtra"), "91");
  assert.equal(countryCodeFor(null), "91");
});

test("the place named last wins (name first, city last)", () => {
  assert.equal(countryCodeFor("Texas Roadhouse, Business Bay, Dubai"), "971");
  assert.equal(deriveArea("Texas Roadhouse, Business Bay, Dubai"), "Dubai");
  assert.equal(countryCodeFor("Saudi Cafe, Pune, India"), "91");
});
