import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    // People - Unified table for Members, Visitors, Leaders, and Contacts
    people: defineTable({
        // Identity
        first_name: v.string(),
        last_name: v.string(), // used for surname
        preferred_name: v.optional(v.string()), // Added from specs
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        address: v.optional(v.string()),
        birthday: v.optional(v.string()), // Added from specs YYYY-MM-DD

        // Geolocation
        lat: v.optional(v.float64()),
        lng: v.optional(v.float64()),
        avatar_url: v.optional(v.string()), // Profile picture

        // Status & Role (The Core State Machine)
        member_status: v.string(), // "guest", "member", "leader", "archived" (Normalized from visitor->guest)
        role: v.optional(v.string()), // "basonta_leader", "bacenta_leader", "basonta_worker", "no_role"
        activity_status: v.optional(v.string()), // "regular", "irregular", "dormant"
        leader_id: v.optional(v.string()), // Direct leader assignment

        // Evangelism / Contact Tracking (Merged from evangelism_contacts)
        contact_category: v.optional(v.string()), // "responsive", "non_responsive", "events_only", "do_not_contact", "has_church"
        contact_date: v.optional(v.string()), // Date first contacted
        invited_by_id: v.optional(v.id("people")), // Self-reference to who invited them

        // Spiritual Journey
        first_visit_date: v.optional(v.string()), // When they became a "First Timer"
        membership_date: v.optional(v.string()), // When they became a "Member"
        is_baptised: v.optional(v.boolean()),
        is_tither: v.optional(v.boolean()),
        salvation_decision: v.optional(v.boolean()), // Made salvation decision during evangelism outreach

        // System
        created_at: v.string(),
        updated_at: v.string(),
    }).index("by_member_status", ["member_status"])
        .index("by_last_name", ["last_name"])
        .index("by_contact_date", ["contact_date"])
        .index("by_invited_by", ["invited_by_id"]),


    // Services - Church services
    services: defineTable({
        service_date: v.string(),
        service_type: v.string(), // "sunday_service", "special_service"
        service_time: v.optional(v.string()),
        location: v.optional(v.string()),
        sermon_topic: v.optional(v.string()),
        sermon_speaker: v.optional(v.string()),

        // Aggregates (calculated from meeting_attendance usually, but kept for cache)
        total_attendance: v.optional(v.float64()),
        guests_count: v.optional(v.float64()),
        salvation_decisions: v.optional(v.float64()),
        tithers_count: v.optional(v.float64()),

        individuals: v.optional(v.array(v.string())), // Deprecated in favor of meeting_attendance? Keeping for now.
        photos: v.optional(v.array(v.string())),
        created_at: v.string(),
        updated_at: v.optional(v.string()),
    }).index("by_service_date", ["service_date"]),

    // Attendance - Links people to services (Legacy? Or specific to Services vs Meetings?)
    // Note: The specs mention a unified 'meetings' and 'meeting_attendance' for everything. 
    // We will keep 'services' distinct if the user prefers, but 'meeting_attendance' is the powerful one.
    // For now, I'll upgrade `attendance` to match the specs just in case it's used for Sunday services specifically.
    attendance: defineTable({
        service_id: v.id("services"),
        person_id: v.id("people"),

        // Metrics per person-service-instance
        made_salvation_decision: v.optional(v.boolean()),
        gave_tithe: v.optional(v.boolean()),
        first_timer: v.optional(v.boolean()), // Is this their first time?

        created_at: v.string(),
    }).index("by_service", ["service_id"])
        .index("by_person", ["person_id"]),

    // Meetings - Prayer meetings and group gatherings (Bacenta, Flow, etc)
    meetings: defineTable({
        meeting_date: v.string(),
        meeting_type: v.string(), // "bacenta", "flow_prayer", "all_night_prayer", "basonta", "sat", "farley_prayer"
        start_time: v.optional(v.string()),
        end_time: v.optional(v.string()),
        duration_minutes: v.optional(v.float64()),
        location: v.optional(v.string()),

        attendance_count: v.optional(v.float64()),
        leaders_count: v.optional(v.float64()),
        leader_id: v.optional(v.string()),

        notes: v.optional(v.string()),
        created_at: v.string(),
        updated_at: v.optional(v.string()),
    }).index("by_meeting_date", ["meeting_date"])
        .index("by_meeting_type", ["meeting_type"]),

    // Meeting Attendance - Unified attendance tracking
    meeting_attendance: defineTable({
        meeting_id: v.id("meetings"),
        person_id: v.id("people"),

        // Rich Metadata
        attended: v.optional(v.boolean()), // Default true if record exists, but good for explicit tracking
        made_salvation_decision: v.optional(v.boolean()),
        gave_tithe: v.optional(v.boolean()),

        arrived_late: v.optional(v.boolean()),
        left_early: v.optional(v.boolean()),

        created_at: v.string(),
    }).index("by_meeting", ["meeting_id"])
        .index("by_person", ["person_id"]),

    // Visitations - Home visit records
    visitations: defineTable({
        person_id: v.optional(v.id("people")), // Who was visited (optional for name-only entries)
        person_visited_name: v.optional(v.string()), // Caching name
        visited_by_id: v.optional(v.id("people")), // Who did the visiting (Linked now)
        visited_by_name: v.optional(v.string()),

        visit_date: v.string(),
        outcome: v.string(), // "welcomed_encouraged", "prayer_request_received", "not_home", "concerns_shared", "invited_to_service"
        follow_up_required: v.boolean(),
        follow_up_date: v.optional(v.string()),
        notes: v.optional(v.string()),
        created_at: v.string(),
        updated_at: v.optional(v.string()),
    }).index("by_visit_date", ["visit_date"])
        .index("by_person", ["person_id"])
        .index("by_follow_up", ["follow_up_required"]),

    // Activities - Activity log entries
    activities: defineTable({
        activity_type: v.string(),
        activity_date: v.string(),
        description: v.optional(v.string()),
        participants_count: v.optional(v.float64()),
        notes: v.optional(v.string()),
        created_at: v.string(),
    }).index("by_activity_date", ["activity_date"]),
});
