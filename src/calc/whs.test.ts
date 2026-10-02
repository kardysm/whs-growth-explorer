import { describe, expect, it } from "vitest";
import { loadContext } from "./load.js";
import { whsAgeForLength, whsWeightZ } from "./whs.js";

const { whs } = loadContext();

describe("WHS chart helpers (refeeding-screen basis, D-023)", () => {
  it("whsAgeForLength inverts the mean length curve", () => {
    const at24 = whs.get("boys", "length", "mean", 24)!;
    expect(whsAgeForLength(whs, "boys", at24)!).toBeCloseTo(24, 1);
    expect(whsAgeForLength(whs, "boys", 500)).toBeNull();
  });

  it("whsWeightZ reproduces the known same-side z (boys 18 mo / 8 kg ≈ +1.66)", () => {
    expect(whsWeightZ(whs, "boys", 18, 8)!).toBeCloseTo(1.66, 1);
  });

  it("girls at the +1SD line → +1", () => {
    const p1 = whs.get("girls", "weight", "+1SD", 0)!;
    expect(whsWeightZ(whs, "girls", 0, p1)!).toBeCloseTo(1, 2);
  });

  it("extreme low weight fires the WHS screen (boys 18 mo / 4 kg ≈ −3.2)", () => {
    expect(whsWeightZ(whs, "boys", 18, 4)!).toBeLessThan(-3);
  });

  it("typical WHS weight no longer fires (boys 18 mo / 6.5 kg ≈ −0.2)", () => {
    expect(whsWeightZ(whs, "boys", 18, 6.5)!).toBeGreaterThan(-3);
  });

  it("length-matched screen returns a finite z for a WHS-typical length", () => {
    const a = whsAgeForLength(whs, "boys", 65)!;
    expect(Number.isFinite(whsWeightZ(whs, "boys", a, 4.5)!)).toBe(true);
  });
});
