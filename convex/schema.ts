import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    // Recovery snapshots are written atomically before relational deletion.
    // Deliberately no public mutation to restore or overwrite live records.
    record_recovery: defineTable({
        record_type: v.string(),
        record_id: v.string(),
        snapshot: v.any(),
        deleted_at: v.string(),
    }),
    // People - Unified table for Members, Guests, Leaders, and Contacts
    people: defineTable({
        // Identity
        first_name: v.string(),
        last_name: v.string(), // used for surname
        preferred_name: v.optional(v.string()), // Added from specs
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        address: v.optional(v.string()),
        city: v.optional(v.string()),
        state: v.optional(v.string()),
        zip_code: v.optional(v.string()),
        birthday: v.optional(v.string()), // Added from specs YYYY-MM-DD

        // Demographics
        gender: v.optional(v.string()), // "male" | "female"
        marital_status: v.optional(v.string()), // "single" | "married" | "beloved"
        employment_status: v.optional(v.string()), // "employed" | "unemployed" | "student" | "retired" | "other"
        degree_status: v.optional(v.string()), // "no_degree" | "studying" | "degree_completed"
        basontas: v.optional(v.array(v.string())), // Ministry groups: ["worship", "ushering", "media", "childrens", "choir", "dancing_stars"]

        // Geolocation
        lat: v.optional(v.float64()),
        lng: v.optional(v.float64()),
        avatar_url: v.optional(v.string()), // Profile picture

        // Status & Role (The Core State Machine)
        member_status: v.string(), // "guest", "member", "leader", "archived" (Normalized from visitor->guest)
        church_role: v.optional(v.string()), // "no_role" | "basonta" (membership, not leadership)
        role: v.optional(v.string()), // "basonta_leader", "bacenta_leader", "no_role" (Leadership roles only)
        activity_status: v.optional(v.string()), // "regular", "irregular", "dormant"
        leader_id: v.optional(v.string()), // Direct leader assignment

        // Evangelism / Contact Tracking (Merged from evangelism_contacts)
        contact_category: v.optional(v.string()), // "responsive", "non_responsive", "events_only", "do_not_contact", "has_church"
        contact_date: v.optional(v.string()), // Date first contacted
        contact_method: v.optional(v.string()), // Initial outreach channel
        invited_by_id: v.optional(v.id("people")), // Self-reference to who invited them
        notes: v.optional(v.string()), // Shared pastoral/outreach context

        // Spiritual Journey
        attendance_milestones: v.optional(v.object({
            first_visit_date: v.optional(v.string()),
            entry_point: v.optional(v.string()),
            salvation_decision: v.optional(v.boolean()),
            pipeline_stage: v.optional(v.string()),
            warmth_score: v.optional(v.string()),
            applied_first_visit_date: v.optional(v.string()),
            applied_entry_point: v.optional(v.string()),
            applied_salvation_decision: v.optional(v.boolean()),
            applied_pipeline_stage: v.optional(v.string()),
            applied_warmth_score: v.optional(v.string()),
        })),
        first_visit_date: v.optional(v.string()), // Manual history plus earliest recorded gathering.
        entry_point: v.optional(v.string()), // "sunday_service" | "bacenta_meeting" | "evangelism" | "referral" | "other"
        membership_date: v.optional(v.string()), // When they became a "Member"
        is_baptised: v.optional(v.boolean()),
        is_tither: v.optional(v.boolean()),
        completed_schools: v.optional(v.array(v.string())),
        merged_into_id: v.optional(v.id("people")), // Archived duplicate retained after a reviewed merge
        salvation_decision: v.optional(v.boolean()), // Made salvation decision during evangelism outreach

        // Pipeline Tracking (cached, updated by follow-up mutations)
        pipeline_stage: v.optional(v.string()),        // "new" | "contacted" | "promised" | "showed_up" | "no_show" | "cold" | "paused"
        warmth_score: v.optional(v.string()),          // "hot" | "warm" | "cool" | "cold" | "dead"
        total_follow_ups: v.optional(v.float64()),     // Cached count of follow-ups
        last_follow_up_date: v.optional(v.string()),   // For quick sorting/display
        promises_made: v.optional(v.float64()),        // Times they promised to come
        promises_kept: v.optional(v.float64()),        // Times they actually showed
        is_paused: v.optional(v.boolean()),            // Currently snoozed?
        pause_reason: v.optional(v.string()),          // "on_holiday" | "asked_to_pause" | "busy_period"
        resume_date: v.optional(v.string()),           // When to auto-resume follow-ups

        // System
        created_at: v.string(),
        updated_at: v.string(),
    }).index("by_member_status", ["member_status"])
        .index("by_last_name", ["last_name"])
        .index("by_contact_date", ["contact_date"])
        .index("by_invited_by", ["invited_by_id"])
        .index("by_merged_into", ["merged_into_id"])
        .index("by_pipeline_stage", ["pipeline_stage"])
        .index("by_warmth", ["warmth_score"])
        .searchIndex("search_first_name", { searchField: "first_name" })
        .searchIndex("search_last_name", { searchField: "last_name" }),


    // Services - Church services
    services: defineTable({
        request_id: v.optional(v.string()),
        service_date: v.string(),
        service_type: v.string(), // "sunday_service", "special_service"
        service_time: v.optional(v.string()),
        location: v.optional(v.string()),
        sermon_topic: v.optional(v.string()),
        sermon_speaker: v.optional(v.string()),
        notes: v.optional(v.string()),

        // Aggregates (calculated from meeting_attendance usually, but kept for cache)
        unnamed_attendance_count: v.optional(v.float64()),
        unnamed_guests_count: v.optional(v.float64()),
        unnamed_decisions_count: v.optional(v.float64()),
        unnamed_tithers_count: v.optional(v.float64()),
        total_attendance: v.optional(v.float64()),
        guests_count: v.optional(v.float64()),
        salvation_decisions: v.optional(v.float64()),
        tithers_count: v.optional(v.float64()),

        individuals: v.optional(v.array(v.string())), // Deprecated in favor of meeting_attendance? Keeping for now.
        photos: v.optional(v.array(v.string())),
        created_at: v.string(),
        updated_at: v.optional(v.string()),
    }).index("by_service_date", ["service_date"]),

    // Durable file references for service images. Browser object URLs are only
    // transient previews and must never be persisted in service records.
    service_photos: defineTable({
        service_id: v.optional(v.id("services")),
        storage_id: v.id("_storage"),
        original_filename: v.string(),
        content_type: v.string(),
        size_bytes: v.float64(),
        uploaded_by: v.string(),
        created_at: v.string(),
    }).index("by_service", ["service_id"])
      .index("by_storage", ["storage_id"]),

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

    // Meeting programmes describe the recurring gathering itself. A separate
    // meetings record is created for each dated occurrence.
    meeting_programs: defineTable({
        code: v.string(),
        name: v.string(),
        meeting_type: v.string(), // bacenta | flow_service | acts_prayer | shemen_prayer | workers_meeting | other
        category: v.string(), // bacenta | prayer | workers | other
        description: v.optional(v.string()),
        default_day: v.optional(v.string()),
        default_start_time: v.optional(v.string()),
        default_end_time: v.optional(v.string()),
        default_format: v.string(), // in_person | online | hybrid
        default_location: v.optional(v.string()),
        online_url: v.optional(v.string()),
        active: v.boolean(),
        created_at: v.string(),
        updated_at: v.string(),
    }).index("by_code", ["code"])
      .index("by_active", ["active"])
      .index("by_meeting_type", ["meeting_type"]),

    meeting_program_leaders: defineTable({
        program_id: v.id("meeting_programs"),
        person_id: v.id("people"),
        is_primary: v.boolean(),
        created_at: v.string(),
    }).index("by_program", ["program_id"])
      .index("by_person", ["person_id"])
      .index("by_program_person", ["program_id", "person_id"]),

    meeting_program_members: defineTable({
        program_id: v.id("meeting_programs"),
        person_id: v.id("people"),
        status: v.string(), // active | inactive
        joined_at: v.string(),
    }).index("by_program", ["program_id"])
      .index("by_person", ["person_id"])
      .index("by_program_person", ["program_id", "person_id"]),

    // Meetings - individual dated occurrences for a programme.
    meetings: defineTable({
        request_id: v.optional(v.string()),
        program_id: v.optional(v.id("meeting_programs")),
        title: v.optional(v.string()), // Used by one-off and special events.
        meeting_date: v.string(),
        meeting_type: v.string(), // Programme type or evangelistic_event | special_event | training | fellowship | other.
        start_time: v.optional(v.string()),
        end_time: v.optional(v.string()),
        duration_minutes: v.optional(v.float64()),
        format: v.optional(v.string()), // in_person | online | hybrid
        location: v.optional(v.string()),
        online_url: v.optional(v.string()),
        status: v.optional(v.string()), // scheduled | attendance_needed | completed | cancelled

        // Cached aggregates. Named attendance is synced from meeting_attendance;
        // total attendance also includes unnamed guests.
        attendance_count: v.optional(v.float64()),
        unnamed_guests_count: v.optional(v.float64()),
        leaders_count: v.optional(v.float64()),
        leader_id: v.optional(v.string()),

        notes: v.optional(v.string()),
        attendance_completed_at: v.optional(v.string()),
        created_at: v.string(),
        updated_at: v.optional(v.string()),
    }).index("by_meeting_date", ["meeting_date"])
        .index("by_meeting_type", ["meeting_type"])
        .index("by_program", ["program_id"])
        .index("by_status", ["status"]),

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
        first_timer: v.optional(v.boolean()), // First-ever gathering with this church.
        first_program_attendance: v.optional(v.boolean()), // First attendance at this recurring programme.
        status: v.optional(v.string()), // present | absent | excused

        created_at: v.string(),
    }).index("by_meeting", ["meeting_id"])
        .index("by_person", ["person_id"])
        .index("by_meeting_person", ["meeting_id", "person_id"]),

    // Visitations - Home visit records
    visitations: defineTable({
        request_id: v.optional(v.string()),
        person_id: v.optional(v.id("people")), // Who was visited (optional for name-only entries)
        person_visited_name: v.optional(v.string()), // Caching name
        visited_by_id: v.optional(v.id("people")), // Who did the visiting (Linked now)
        visited_by_name: v.optional(v.string()),

        visit_date: v.string(),
        status: v.optional(v.union(
            v.literal("completed"),
            v.literal("unsuccessful"),
            v.literal("cancelled"),
        )),
        interaction_type: v.optional(v.union(
            v.literal("home_visit"),
            v.literal("hospital_visit"),
            v.literal("church_meeting"),
            v.literal("phone_call"),
            v.literal("message"),
            v.literal("practical_support"),
            v.literal("other"),
        )),
        purpose: v.optional(v.union(
            v.literal("new_guest"),
            v.literal("attendance_concern"),
            v.literal("welfare"),
            v.literal("prayer"),
            v.literal("bereavement"),
            v.literal("membership"),
            v.literal("general_care"),
            v.literal("other"),
        )),
        outcome: v.string(), // "welcomed_encouraged", "prayer_request_received", "not_home", "concerns_shared", "invited_to_service"
        follow_up_required: v.boolean(),
        follow_up_date: v.optional(v.string()),
        source_task_id: v.optional(v.id("follow_up_tasks")),
        next_task_id: v.optional(v.id("follow_up_tasks")),
        notes: v.optional(v.string()),
        created_at: v.string(),
        updated_at: v.optional(v.string()),
    }).index("by_visit_date", ["visit_date"])
        .index("by_person", ["person_id"])
        .index("by_visitor", ["visited_by_id"])
        .index("by_follow_up", ["follow_up_required"])
        .index("by_source_task", ["source_task_id"]),

    // Activities - Activity log entries
    activities: defineTable({
        activity_type: v.string(),
        activity_date: v.string(),
        description: v.optional(v.string()),
        participants_count: v.optional(v.float64()),
        notes: v.optional(v.string()),
        created_at: v.string(),
    }).index("by_activity_date", ["activity_date"]),

    // Follow-Ups - Track every leader-contact interaction for the Pipeline
    follow_ups: defineTable({
        commitment_id: v.optional(v.id("gathering_commitments")),
        source_task_id: v.optional(v.id("follow_up_tasks")),
        source_visitation_id: v.optional(v.id("visitations")),
        care_status: v.optional(v.string()),
        contact_id: v.id("people"),         // The evangelism contact being followed up
        leader_id: v.id("people"),          // The leader who did the follow-up
        follow_up_date: v.string(),         // When this interaction happened (YYYY-MM-DD)
        method: v.string(),                 // "call" | "whatsapp" | "in_person" | "sms" | "other"
        outcome: v.string(),               // Includes positive, no-response, pause, re-engagement, and not_serious_now outcomes
        promised_date: v.optional(v.string()),   // If they promised to attend, which date?
        promise_fulfilled: v.optional(v.boolean()), // Did they actually show up? (resolved later)
        resume_date: v.optional(v.string()),     // For pause outcomes — when to resume follow-ups
        next_action_date: v.optional(v.string()), // When the next CRM task is due
        gathering_type: v.optional(v.union(
            v.literal("sunday_service"),
            v.literal("bacenta"),
            v.literal("special_event"),
        )),
        gathering_date: v.optional(v.string()),
        attendance_response: v.optional(v.union(
            v.literal("yes"),
            v.literal("maybe"),
            v.literal("no"),
        )),
        notes: v.optional(v.string()),           // Free text context
        created_at: v.string(),
    }).index("by_contact", ["contact_id"])
      .index("by_leader", ["leader_id"])
      .index("by_date", ["follow_up_date"])
      .index("by_promised_date", ["promised_date"]),

    // CRM ownership is deliberately separate from invited_by_id: the person who
    // met a contact is not necessarily the leader responsible for following up.
    follow_up_assignments: defineTable({
        person_id: v.id("people"),
        assigned_leader_id: v.id("people"),
        assigned_by_id: v.optional(v.id("people")),
        status: v.union(v.literal("active"), v.literal("ended")),
        assigned_at: v.string(),
        ended_at: v.optional(v.string()),
        created_at: v.string(),
        updated_at: v.string(),
    }).index("by_person", ["person_id"])
      .index("by_person_status", ["person_id", "status"])
      .index("by_leader_status", ["assigned_leader_id", "status"])
      .index("by_status", ["status"]),

    follow_up_tasks: defineTable({
        person_id: v.id("people"),
        assigned_leader_id: v.id("people"),
        created_by_id: v.optional(v.id("people")),
        due_date: v.string(),
        status: v.union(
            v.literal("open"),
            v.literal("completed"),
            v.literal("cancelled"),
        ),
        task_type: v.union(
            v.literal("first_contact"),
            v.literal("follow_up"),
            v.literal("sunday_confirmation"),
            v.literal("member_care"),
            v.literal("visitation"),
            v.literal("reengagement"),
            v.literal("other"),
        ),
        priority: v.union(
            v.literal("urgent"),
            v.literal("high"),
            v.literal("normal"),
            v.literal("low"),
        ),
        reason: v.optional(v.string()),
        automation_key: v.optional(v.string()), // e.g. quarterly_reengagement
        source_visitation_id: v.optional(v.id("visitations")),
        gathering_type: v.optional(v.union(
            v.literal("sunday_service"),
            v.literal("bacenta"),
            v.literal("special_event"),
        )),
        gathering_date: v.optional(v.string()),
        outcome: v.optional(v.string()),
        notes: v.optional(v.string()),
        completed_at: v.optional(v.string()),
        completed_by_id: v.optional(v.id("people")),
        created_at: v.string(),
        updated_at: v.string(),
    }).index("by_person", ["person_id"])
      .index("by_person_status", ["person_id", "status"])
      .index("by_assignee_status", ["assigned_leader_id", "status"])
      .index("by_status_due_date", ["status", "due_date"])
      .index("by_status_completed_at", ["status", "completed_at"]),

    gathering_commitments: defineTable({
        service_id: v.optional(v.id("services")),
        meeting_id: v.optional(v.id("meetings")),
        attendance_previous_status: v.optional(v.string()),
        person_id: v.id("people"),
        leader_id: v.id("people"),
        gathering_type: v.union(
            v.literal("sunday_service"),
            v.literal("bacenta"),
            v.literal("special_event"),
        ),
        gathering_date: v.string(),
        response: v.union(
            v.literal("yes"),
            v.literal("maybe"),
            v.literal("no"),
        ),
        resolution: v.union(
            v.literal("pending"),
            v.literal("attended"),
            v.literal("no_show"),
            v.literal("cancelled"),
        ),
        resolved_at: v.optional(v.string()),
        created_at: v.string(),
        updated_at: v.string(),
    }).index("by_person", ["person_id"])
      .index("by_person_date", ["person_id", "gathering_date"])
      .index("by_gathering", ["gathering_type", "gathering_date"])
      .index("by_date", ["gathering_date"])
      .index("by_leader_date", ["leader_id", "gathering_date"]),

    // Regular members are expected by default. This table stores weekly
    // confirmations and known absences, plus confirmations for irregular members.
    attendance_plans: defineTable({
        service_id: v.optional(v.id("services")),
        meeting_id: v.optional(v.id("meetings")),
        attendance_previous_status: v.optional(v.string()),
        person_id: v.id("people"),
        service_date: v.string(),
        status: v.union(
            v.literal("expected"),
            v.literal("away"),
            v.literal("confirmed"),
            v.literal("attended"),
            v.literal("absent"),
        ),
        leader_id: v.optional(v.id("people")), // May be absent on a derived actual-attendance plan.
        generated_from_attendance: v.optional(v.boolean()),
        notes: v.optional(v.string()),
        created_at: v.string(),
        updated_at: v.string(),
    }).index("by_person_date", ["person_id", "service_date"])
      .index("by_service_date", ["service_date"])
      .index("by_leader_date", ["leader_id", "service_date"]),

    // Explicit app access keyed by the verified identity tokenIdentifier.
    // Existing rows without a linked identity remain unable to sign in.
    security_audit: defineTable({
        actor_user_id: v.id("crm_users"),
        operation: v.string(),
        record_id: v.string(),
        created_at: v.string(),
    }).index("by_actor", ["actor_user_id"]),

    // A person must present a provider-verified identity before an owner can
    // approve them. Contact details here help the owner recognise a request;
    // the issuer + subject remain the only authentication key.
    access_requests: defineTable({
        external_auth_id: v.string(),
        display_name: v.optional(v.string()),
        email: v.optional(v.string()),
        status: v.union(v.literal("pending"), v.literal("approved")),
        requested_at: v.string(),
        updated_at: v.string(),
    }).index("by_external_auth_id", ["external_auth_id"])
      .index("by_status", ["status"]),

    crm_users: defineTable({
        can_view_confidential: v.optional(v.boolean()),
        person_id: v.optional(v.id("people")),
        external_auth_id: v.optional(v.string()),
        display_name: v.optional(v.string()),
        email: v.optional(v.string()),
        role: v.union(
            v.literal("owner"),
            v.literal("admin"),
            v.literal("leader"),
            v.literal("viewer"),
        ),
        status: v.union(v.literal("active"), v.literal("inactive")),
        created_at: v.string(),
        updated_at: v.string(),
    }).index("by_person", ["person_id"])
      .index("by_external_auth_id", ["external_auth_id"])
      .index("by_status", ["status"]),
});
