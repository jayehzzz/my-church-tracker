export const CHURCH_ROLE_OPTIONS = [
  { value: "no_role", label: "No Role" },
  { value: "basonta", label: "Basonta" },
];

export const DEGREE_STATUS_OPTIONS = [
  { value: "no_degree", label: "No Degree" },
  { value: "studying", label: "Studying" },
  { value: "degree_completed", label: "Degree Completed" },
];

export const CHURCH_SCHOOL_OPTIONS = [
  { value: "annual_global_exams", label: "Annual Global Exams" },
  { value: "fruitful_believers_school", label: "Fruitful Believers School" },
  { value: "proof_of_shepherding_exams", label: "Proof of Shepherding Exams" },
  { value: "school_of_apologetics", label: "School of Apologetics" },
  { value: "school_of_solid_foundation", label: "School of Solid Foundation" },
  { value: "school_of_the_world", label: "School of the World" },
  { value: "school_of_victorious_living", label: "School of Victorious Living" },
  { value: "school_of_evangelism", label: "School of Evangelism" },
];

const labelFor = (options, value, fallback) =>
  options.find((option) => option.value === value)?.label || value || fallback;

export function formatChurchRole(value) {
  return labelFor(CHURCH_ROLE_OPTIONS, value, "No Role");
}

export function formatDegreeStatus(value) {
  return labelFor(DEGREE_STATUS_OPTIONS, value, "—");
}

export function formatChurchSchool(value) {
  return labelFor(CHURCH_SCHOOL_OPTIONS, value, value || "—");
}

export function normalizeCompletedSchools(values = []) {
  const aliases = {
    proof_of_shepherding_exam: "proof_of_shepherding_exams",
  };
  const allowed = new Set(CHURCH_SCHOOL_OPTIONS.map((option) => option.value));

  return [...new Set(values.map((value) => aliases[value] || value))].filter(
    (value) => allowed.has(value),
  );
}
