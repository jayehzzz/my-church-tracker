export const pageNames = {
  "/": "Dashboard",
  "/evangelism": "Evangelism",
  "/pipeline": "Follow-Up",
  "/services": "Sunday Services",
  "/meetings": "Meetings",
  "/memories": "Memories",
  "/people": "People",
  "/development": "Development",
  "/visitation": "Pastoral Care",
  "/reports": "Reports",
};

export const navigationGroups = [
  {
    label: "Overview",
    items: [{ icon: "home", label: pageNames["/"], href: "/" }],
  },
  {
    label: "People & care",
    items: [
      { icon: "pipeline", label: pageNames["/pipeline"], href: "/pipeline" },
      { icon: "user-group", label: pageNames["/people"], href: "/people" },
      { icon: "map-pin", label: pageNames["/visitation"], href: "/visitation" },
      { icon: "chart", label: pageNames["/development"], href: "/development" },
    ],
  },
  {
    label: "Outreach & gatherings",
    items: [
      { icon: "users", label: pageNames["/evangelism"], href: "/evangelism" },
      { icon: "calendar", label: pageNames["/services"], href: "/services" },
      { icon: "clock", label: pageNames["/meetings"], href: "/meetings" },
      { icon: "image", label: pageNames["/memories"], href: "/memories" },
    ],
  },
  {
    label: "Insights",
    items: [{ icon: "chart", label: pageNames["/reports"], href: "/reports" }],
  },
];

export function pageNameForPath(pathname) {
  if (pageNames[pathname]) return pageNames[pathname];
  if (pathname.startsWith("/people/")) return pageNames["/people"];
  return "Church Tracker";
}
