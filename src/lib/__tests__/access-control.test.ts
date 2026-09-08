import { describe, expect, it } from "vitest";
import { canAccessDealer, canAccessManufacturerDashboard } from "../access-control";
import type { Session } from "next-auth";

function dealerSession(dealerId: string | null): Session {
  return {
    expires: "2099-01-01T00:00:00.000Z",
    user: { id: "u1", role: "DEALER", dealerId },
  } as Session;
}

function manufacturerSession(): Session {
  return {
    expires: "2099-01-01T00:00:00.000Z",
    user: { id: "u2", role: "MANUFACTURER", dealerId: null },
  } as Session;
}

describe("canAccessDealer", () => {
  it("allows a dealer session whose dealerId matches", () => {
    expect(canAccessDealer(dealerSession("dealer_1"), "dealer_1")).toBe(true);
  });

  it("rejects a dealer session scoped to a different dealer", () => {
    expect(canAccessDealer(dealerSession("dealer_1"), "dealer_2")).toBe(false);
  });

  it("rejects a manufacturer-role session, even matching no dealer", () => {
    expect(canAccessDealer(manufacturerSession(), "dealer_1")).toBe(false);
  });

  it("rejects no session", () => {
    expect(canAccessDealer(null, "dealer_1")).toBe(false);
  });

  it("rejects a dealer session with a null dealerId", () => {
    expect(canAccessDealer(dealerSession(null), "dealer_1")).toBe(false);
  });
});

describe("canAccessManufacturerDashboard", () => {
  it("allows a manufacturer-role session", () => {
    expect(canAccessManufacturerDashboard(manufacturerSession())).toBe(true);
  });

  it("rejects a dealer-role session", () => {
    expect(canAccessManufacturerDashboard(dealerSession("dealer_1"))).toBe(false);
  });

  it("rejects no session", () => {
    expect(canAccessManufacturerDashboard(null)).toBe(false);
  });
});
