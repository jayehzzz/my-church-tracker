import { describe, expect, it } from "vitest";
import { formatJourneyStatus, formatLeadershipRole, normalizeJourneyStatus, preparePersonPayload } from "./peopleService.js";

describe("person payloads", () => {
  it("keeps a complete address when creating a person", () => {
    expect(preparePersonPayload({
      first_name: " Ada ", last_name: " Lovelace ", address: " 12 St James's Square ",
      city: " London ", state: " Greater London ", zip_code: " SW1Y 4LB ",
    })).toMatchObject({
      first_name: "Ada", last_name: "Lovelace", address: "12 St James's Square",
      city: "London", state: "Greater London", zip_code: "SW1Y 4LB",
    });
  });

  it("sends explicit clearing instructions without clearing omitted fields", () => {
    expect(preparePersonPayload({ email: "", city: null, first_name: "Ada" }, { forUpdate: true }))
      .toEqual({ first_name: "Ada", clear_fields: ["email", "city"] });
    expect(preparePersonPayload({ first_name: "Ada" }, { forUpdate: true }))
      .toEqual({ first_name: "Ada" });
  });
});

describe("people journey labels", () => {
  it("keeps outreach contacts distinct from guests and canonicalizes legacy visitors", () => {
    expect(normalizeJourneyStatus("visitor")).toBe("guest");
    expect(normalizeJourneyStatus("contact")).toBe("contact");
    expect(formatJourneyStatus("contact")).toBe("Outreach Contact");
    expect(formatJourneyStatus("guest")).toBe("Non-member");
    expect(formatJourneyStatus()).toBe("Not recorded");
  });

  it("formats leadership roles separately from journey status", () => {
    expect(formatLeadershipRole("bacenta_leader")).toBe("Bacenta Leader");
    expect(formatLeadershipRole("basonta_leader")).toBe("Basonta Leader");
    expect(formatLeadershipRole("no_role")).toBe("No leadership role");
  });
});
