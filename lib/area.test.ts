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

test("US addresses without 'USA' still get +1 and a state area", () => {
  assert.equal(countryCodeFor("1234 Collins Ave, Miami Beach, FL 33139"), "1");
  assert.equal(countryCodeFor("Tampa, Florida"), "1");
  assert.equal(deriveArea("1234 Collins Ave, Miami Beach, FL 33139, USA"), "Florida");
  assert.equal(deriveArea("Tampa, Florida"), "Florida");
  assert.equal(countryCodeFor("Shop 4, Pune, Maharashtra 411001, India"), "91");
});

test("', FL' without a ZIP is Florida; ordinary words are not states", () => {
  assert.equal(deriveArea("Orlando, FL, United States"), "Florida");
  assert.equal(countryCodeFor("Shop 3, in the Mall, Pune"), "91");
});
