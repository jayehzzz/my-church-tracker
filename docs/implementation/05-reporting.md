# 05 — Consistent metrics and safe report exports

After Task 04, centralize reporting definitions used by Dashboard, Services, Meetings, Evangelism, People, and Reports. Include only completed/held gatherings in actual-attendance metrics. Distinguish attendance visits, unique people, guest attendances, first timers, prayer sessions, and successful care. Label intentionally unfiltered directories clearly.

Use consistent date/time handling and like-for-like comparison periods. Ensure graphs, summaries, drilldowns, and exports derive from the same filtered records. Prevent future/scheduled meetings from diluting completed-meeting averages. Repair prayer-hours and visits-completed calculations. Keep UI labels faithful to what is counted.

Make CSV serialization safe for untrusted text and deliberate about phone numbers and spreadsheet formulas. Do not attempt database backup here; Task 06 owns recovery.

Starting points: `dashboardService.js`, `meetingAnalytics.js`, `personMetrics.js`, `exportUtils.js`, route metric calculations, and shared chart utilities.

Complete when: a fixture with one completed 20-person meeting and one future meeting reports one held meeting averaging 20; repeat guests do not become additional first timers; non-prayer and unsuccessful/cancelled care records are classified correctly; period boundaries are tested; related screens and exports agree. Use focused calculation tests and browser verification. Update the handoff.
