const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const PERSON_STATUSES = ["guest", "member", "leader", "archived"] as const;

const allowedValues: Record<string, readonly string[]> = {
    gender: ["male", "female"],
    marital_status: ["single", "married", "beloved"],
    employment_status: ["employed", "unemployed", "student", "retired", "other"],
    degree_status: ["no_degree", "studying", "degree_completed"],
    church_role: ["no_role", "basonta"],
    role: ["no_role", "basonta_leader", "bacenta_leader"],
    activity_status: ["regular", "irregular", "dormant"],
    contact_category: [
        "not_assessed",
        "responsive",
        "non_responsive",
        "events_only",
        "big_events_only",
        "bacenta_mainly",
        "has_church",
        "do_not_contact",
        "wrong_number",
    ],
    contact_method: ["in_person", "phone", "text", "social_media", "event", "other"],
    entry_point: ["sunday_service", "bacenta_meeting", "evangelism", "referral", "other"],
};

const dateFields = [
    "birthday",
    "date_of_birth",
    "contact_date",
    "first_visit_date",
    "membership_date",
] as const;

export const clearablePersonFields = [
    "email",
    "phone",
    "address",
    "city",
    "state",
    "zip_code",
    "preferred_name",
    "birthday",
    "gender",
    "marital_status",
    "employment_status",
    "degree_status",
    "basontas",
    "church_role",
    "role",
    "activity_status",
    "leader_id",
    "contact_category",
    "contact_date",
    "contact_method",
    "invited_by_id",
    "entry_point",
    "notes",
    "first_visit_date",
    "membership_date",
    "is_baptised",
    "is_tither",
    "completed_schools",
    "lat",
    "lng",
    "avatar_url",
] as const;

export function canonicalMemberStatus(status: string | undefined) {
    return status === "visitor" ? "guest" : status;
}

export function normalizeEmail(value: string | undefined) {
    return value?.trim().toLowerCase() || undefined;
}

export function normalizePhone(value: string | undefined) {
    const digits = value?.replace(/\D/g, "") || "";
    return digits || undefined;
}

export function assertDate(field: string, value: unknown) {
    if (typeof value !== "string" || !DATE_PATTERN.test(value)) {
        throw new Error(`${field} must use the YYYY-MM-DD format`);
    }
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
        throw new Error(`${field} must be a real calendar date`);
    }
}

function assertAllowed(field: string, value: unknown, values: readonly string[]) {
    if (typeof value !== "string" || !values.includes(value)) {
        throw new Error(`${field} has an unsupported value`);
    }
}

/** Validates values after Convex argument validation, before database writes. */
export function validatePersonInput(input: Record<string, unknown>, creating = false) {
    if (creating) {
        for (const field of ["first_name", "last_name"]) {
            if (typeof input[field] !== "string" || !input[field].trim()) {
                throw new Error(`${field} is required`);
            }
        }
    }

    for (const field of ["first_name", "last_name"]) {
        if (field in input && (typeof input[field] !== "string" || !input[field].trim())) {
            throw new Error(`${field} cannot be blank`);
        }
    }

    if ("member_status" in input) {
        assertAllowed("member_status", canonicalMemberStatus(input.member_status as string), PERSON_STATUSES);
    }

    for (const [field, values] of Object.entries(allowedValues)) {
        if (field in input && input[field] !== undefined) assertAllowed(field, input[field], values);
    }

    for (const field of dateFields) {
        if (field in input && input[field] !== undefined) assertDate(field, input[field]);
    }

    if ("email" in input && input.email !== undefined) {
        const email = normalizeEmail(input.email as string);
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new Error("email must be a valid email address");
        }
    }

    for (const field of ["lat", "lng"] as const) {
        if (field in input && (typeof input[field] !== "number" || !Number.isFinite(input[field] as number))) {
            throw new Error(`${field} must be a finite number`);
        }
    }
}
