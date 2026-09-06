import { v } from "convex/values";
import { queryFor } from "./lib/security";

const MAX_RESULTS = 12;

// Search stays inside the same row-level policy as the rest of the app. A
// leader therefore receives only people already in their permitted scope.
export const people = queryFor("search:people")({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const query = args.query.trim().toLowerCase();
    if (query.length < 2) return [];

    const terms = [...new Set(query.split(/\s+/).filter((term) => term.length >= 2))].slice(0, 2);
    const groups = await Promise.all(terms.flatMap((term) => [
      ctx.db.query("people").withSearchIndex("search_first_name", (q) => q.search("first_name", term)).take(MAX_RESULTS),
      ctx.db.query("people").withSearchIndex("search_last_name", (q) => q.search("last_name", term)).take(MAX_RESULTS),
    ]));

    return [...new Map(groups.flat().map((person) => [person._id, person])).values()]
      .sort((a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`))
      .slice(0, MAX_RESULTS)
      .map((person) => ({
        id: person._id,
        type: ["guest", "visitor", "new_believer"].includes(person.member_status) ? "contact" : "person",
        title: [person.preferred_name || person.first_name, person.last_name].filter(Boolean).join(" "),
        subtitle: person.member_status === "guest" ? "Guest" : person.member_status,
        icon: ["guest", "visitor", "new_believer"].includes(person.member_status) ? "users" : "user",
        href: `/people/${person._id}`,
      }));
  },
});
