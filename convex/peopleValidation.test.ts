import { describe, expect, it } from "vitest";
import {
    assertDate,
    canonicalMemberStatus,
    normalizeEmail,
    normalizePhone,
    validatePersonInput,
} from "./peopleValidation";

describe("person backend validation", () => {
    it("normalizes legacy status and contact comparison values", () => {
        expect(canonicalMemberStatus("visitor")).toBe("guest");
        expect(normalizeEmail("  Ada@Example.COM ")).toBe("ada@example.com");
        expect(normalizePhone("+44 (0) 7700-900 123")).toBe("4407700900123");
    });

    it("rejects invalid server-side statuses, dates, and email", () => {
        expect(() => validatePersonInput({ member_status: "new_believer" })).toThrow("unsupported");
        expect(() => assertDate("birthday", "2026-02-30")).toThrow("real calendar date");
        expect(() => validatePersonInput({ email: "not-an-email" })).toThrow("valid email");
    });

    it("accepts a complete, canonical person payload", () => {
        expect(() => validatePersonInput({
            first_name: "Ada",
            last_name: "Lovelace",
            member_status: "visitor",
            email: "ada@example.test",
            birthday: "1815-12-10",
            city: "London",
            state: "Greater London",
            zip_code: "SW1A 1AA",
        }, true)).not.toThrow();
    });
});
