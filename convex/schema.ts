import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    // People - Church members, visitors, and leaders
    people: defineTable({
        first_name: v.string(),
        last_name: v.string(),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        member_status: v.string(), // "member", "visitor", "leader", "archived"
        role: v.optional(v.string()), // "basonta_leader", "bacenta_leader", "basonta_worker", "no_role"
        activity_status: v.optional(v.string()), // "regular", "irregular", "dormant"
        leader_id: v.optional(v.string()),
        address: v.optional(v.string()),
        lat: v.optional(v.float64()),
        lng: v.optional(v.float64()),
        avatar_url: v.optional(v.string()),
        membership_date: v.optional(v.string()),
        created_at: v.string(),
        updated_at: v.string(),
    }).index("by_member_status", ["member_status"])
        .index("by_last_name", ["last_name"]),

    // Services - Church services
    services: defineTable({
        service_date: v.string(),
        service_type: v.string(), // "sunday_service", "special_service"
        service_time: v.optional(v.string()),
        location: v.optional(v.string()),
        sermon_topic: v.optional(v.string()),
        sermon_speaker: v.optional(v.string()),
        total_attendance: v.optional(v.float64()),
        guests_count: v.optional(v.float64()),
        salvation_decisions: v.optional(v.float64()),
        tithers_count: v.optional(v.float64()),
        individuals: v.optional(v.array(v.string())),
        photos: v.optional(v.array(v.string())),
        created_at: v.string(),
        updated_at: v.optional(v.string()),
    }).index("by_service_date", ["service_date"]),

    // Attendance - Links people to services
    attendance: defineTable({
        service_id: v.id("services"),
        person_id: v.id("people"),
        created_at: v.string(),
    }).index("by_service", ["service_id"])
        .index("by_person", ["person_id"]),

    // Evangelism Contacts - Outreach records
    evangelism_contacts: defineTable({
        first_name: v.string(),
        last_name: v.optional(v.string()),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        address: v.optional(v.string()),
        contact_date: v.string(),
        response: v.string(), // "responsive", "non_responsive", "events_only", "do_not_contact", "has_church"
        follow_up_date: v.optional(v.string()),
        converted: v.boolean(),
        conversion_date: v.optional(v.string()),
        status: v.optional(v.string()),
        attended_church: v.optional(v.boolean()),
        salvation_decision: v.optional(v.boolean()),
        invited_by_id: v.optional(v.string()),
        added_as_person_id: v.optional(v.id("people")),
        comments: v.optional(v.array(v.string())),
        created_at: v.string(),
        updated_at: v.optional(v.string()),
    }).index("by_contact_date", ["contact_date"])
        .index("by_response", ["response"])
        .index("by_converted", ["converted"]),

    // Meetings - Prayer meetings and group gatherings
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

    // Meeting Attendance - Links people to meetings
    meeting_attendance: defineTable({
        meeting_id: v.id("meetings"),
        person_id: v.id("people"),
        created_at: v.string(),
    }).index("by_meeting", ["meeting_id"])
        .index("by_person", ["person_id"]),

    // Visitations - Home visit records
    visitations: defineTable({
        person_id: v.id("people"),
        person_visited_name: v.optional(v.string()),
        visited_by_name: v.optional(v.string()),
        visited_by_id: v.optional(v.string()),
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
