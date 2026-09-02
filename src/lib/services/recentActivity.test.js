import { describe, it, expect } from "vitest";
import * as dashboardService from "./dashboardService.js";
import * as peopleService from "./peopleService.js";
import * as attendanceService from "./attendanceService.js";
import * as evangelismService from "./evangelismService.js";
import * as visitationsService from "./visitationsService.js";
import { getPersonById, mockPeople, mockEvangelismContacts, mockVisitations, mockPriorityQueue, mockMeetings, mockServices } from "../data/mockData.js";

describe("Dashboard Recent Activity and Person Profile Resolution", () => {
    it("resolves all member profiles in mockPeople", async () => {
        for (const person of mockPeople) {
            const p = getPersonById(person.id);
            expect(p).toBeDefined();
            expect(p.first_name).toBe(person.first_name);

            const result = await peopleService.getById(person.id);
            expect(result.error).toBeNull();
            expect(result.data).toBeDefined();
            expect(result.data.first_name).toBe(person.first_name);

            // Test secondary services for each member
            const att = await attendanceService.getByPerson(person.id);
            expect(att.error).toBeNull();
            expect(Array.isArray(att.data)).toBe(true);

            const ev = await evangelismService.getByInviter(person.id);
            expect(ev.error).toBeNull();
            expect(Array.isArray(ev.data)).toBe(true);

            const vis = await visitationsService.getByPerson(person.id);
            expect(vis.error).toBeNull();
            expect(Array.isArray(vis.data)).toBe(true);
        }
    });

    it("resolves all evangelism contacts in mockEvangelismContacts", async () => {
        for (const contact of mockEvangelismContacts) {
            const p = getPersonById(contact.id);
            expect(p).toBeDefined();
            expect(p.first_name).toBe(contact.first_name);

            const result = await peopleService.getById(contact.id);
            expect(result.error).toBeNull();
            expect(result.data).toBeDefined();
            expect(result.data.first_name).toBe(contact.first_name);

            // Test secondary services for each contact
            const att = await attendanceService.getByPerson(contact.id);
            expect(att.error).toBeNull();
            expect(Array.isArray(att.data)).toBe(true);

            const ev = await evangelismService.getByInviter(contact.id);
            expect(ev.error).toBeNull();
            expect(Array.isArray(ev.data)).toBe(true);

            const vis = await visitationsService.getByPerson(contact.id);
            expect(vis.error).toBeNull();
            expect(Array.isArray(vis.data)).toBe(true);
        }
    });

    it("resolves all priority queue people", async () => {
        for (const item of mockPriorityQueue) {
            const result = await peopleService.getById(item.personId);
            expect(result.error).toBeNull();
            expect(result.data).toBeDefined();
            expect(result.data.id).toBe(item.personId);
        }
    });

    it("returns comprehensive recent activities across all church domains (services, meetings, evangelism, visitations)", async () => {
        const activities = await dashboardService.getRecentActivities(100);
        expect(activities.length).toBeGreaterThan(0);

        const types = new Set(activities.map(a => a.type));
        expect(types.has("contact") || types.has("salvation")).toBe(true);
        expect(types.has("visitation")).toBe(true);
        expect(types.has("service")).toBe(true);
        expect(types.has("meeting")).toBe(true);

        for (const activity of activities) {
            expect(activity.id).toBeDefined();
            expect(activity.type).toBeDefined();
            expect(activity.description).toBeDefined();
            expect(activity.timestamp).toBeDefined();
            expect(activity.route).toBeDefined();
            expect(activity.routeLabel).toBeDefined();

            if (activity.personId) {
                const profileResult = await peopleService.getById(activity.personId);
                expect(profileResult.error).toBeNull();
                expect(profileResult.data).toBeDefined();
            }
        }
    });
});
