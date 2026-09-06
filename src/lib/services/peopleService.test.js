import { describe, expect, it } from "vitest";
import { preparePersonPayload } from "./peopleService.js";

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
