/**
 * Chart Design System & Visualization Utilities
 * ===============================================
 * Standardizes layout, scales, geometry, and styling across all church dashboard charts.
 * 
 * Standards:
 * 1. Aspect Ratio: Use standard 1:1 pixel coordinate viewBox (e.g. 540x240) with uniform scaling
 *    (preserveAspectRatio="xMidYMid meet" or omitted). Never use preserveAspectRatio="none"
 *    where text, dots, or dashed lines are rendered to prevent horizontal stretching distortion.
 * 2. Headroom: Always calculate Y-scales with headroom (~15-25%) so peak values and labels
 *    never touch the ceiling or collide with chart headers.
 * 3. Categorical Centering: Column bands are centered at (index + 0.5) * bandWidth so bars
 *    and categorical points are never jammed into the outer edges (0% and 100%).
 * 4. Curves & Area: Line charts use smooth cubic Bézier curves and gentle gradient area fills.
 * 5. Offsets: Values sit comfortably above elements (y - 8 for bars, y - 10 for line points).
 */

export const DEFAULT_CHART_DIMENSIONS = {
  width: 540,
  height: 240,
  padding: {
    top: 32,
    right: 28,
    bottom: 42,
    left: 44,
  },
};

/**
 * Calculates clean, round tick intervals and scale maximum with headroom.
 * Ensures gridlines land on neat numbers (e.g., 5, 10, 15, 20) and highest data point has breathing room.
 * 
 * @param {number} maxValue - Maximum data value in dataset
 * @param {number} [targetIntervals=4] - Target number of divisions
 * @param {number} [headroom=1.2] - Multiplier for headroom above peak value
 * @returns {{ max: number, ticks: number[], interval: number }}
 */
export function getNiceYScale(maxValue, targetIntervals = 4, headroom = 1.2) {
  if (maxValue <= 0) {
    return { max: 4, ticks: [0, 1, 2, 3, 4], interval: 1 };
  }

  const rawInterval = (maxValue * headroom) / targetIntervals;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawInterval)));
  const residual = rawInterval / magnitude;

  let niceInterval;
  if (residual <= 1) niceInterval = 1 * magnitude;
  else if (residual <= 2) niceInterval = 2 * magnitude;
  else if (residual <= 2.5) niceInterval = 2.5 * magnitude;
  else if (residual <= 5) niceInterval = 5 * magnitude;
  else niceInterval = 10 * magnitude;

  const tickMax = Math.max(
    niceInterval * 3,
    Math.ceil((maxValue * (headroom - 0.05)) / niceInterval) * niceInterval
  );
  const count = Math.round(tickMax / niceInterval);
  const ticks = [];
  for (let i = 0; i <= count; i++) {
    ticks.push(Math.round(i * niceInterval));
  }

  return { max: tickMax, ticks, interval: niceInterval };
}

/**
 * Calculates categorical X-axis positions.
 * Ensures items are centered in their respective column bands with balanced margins.
 * 
 * @param {number} count - Total number of categories
 * @param {number} innerWidth - Available chart width (width - padding.left - padding.right)
 * @param {number} paddingLeft - Left padding
 * @returns {{ bandWidth: number, getCenterX: (index: number) => number }}
 */
export function getBandCoordinates(count, innerWidth, paddingLeft = 44) {
  const safeCount = Math.max(count, 1);
  const bandWidth = innerWidth / safeCount;

  return {
    bandWidth,
    getCenterX: (index) => paddingLeft + (index + 0.5) * bandWidth,
  };
}

/**
 * Generates an SVG path string for a smooth cubic Bézier curve.
 * 
 * @param {Array<{ x: number, [key: string]: any }>} points - Array of point objects
 * @param {string} [yKey='y'] - Property key for the Y coordinate
 * @returns {string} SVG path data (d attribute)
 */
export function makeSmoothCurve(points, yKey = 'y') {
  if (!points || !points.length) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0][yKey]}`;
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0][yKey]} L ${points[1].x} ${points[1][yKey]}`;
  }

  let path = `M ${points[0].x} ${points[0][yKey]}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = (prev.x + curr.x) / 2;
    path += ` C ${cpx} ${prev[yKey]}, ${cpx} ${curr[yKey]}, ${curr.x} ${curr[yKey]}`;
  }
  return path;
}

/**
 * Generates an SVG closed path for gradient area fill under a curve down to baseline.
 * 
 * @param {Array<{ x: number, [key: string]: any }>} points - Array of point objects
 * @param {string} yKey - Property key for the Y coordinate
 * @param {number} baseline - Y coordinate of the bottom baseline
 * @returns {string} SVG path data (d attribute)
 */
export function makeAreaPath(points, yKey, baseline) {
  if (!points || !points.length) return "";
  const curve = makeSmoothCurve(points, yKey);
  const last = points[points.length - 1];
  const first = points[0];
  return `${curve} L ${last.x} ${baseline} L ${first.x} ${baseline} Z`;
}

/**
 * Format month number (1-12) or string into standard 3-letter month abbreviation.
 * 
 * @param {string|number} month 
 * @returns {string}
 */
export function formatMonthLabel(month) {
  const monthIndex = Number(month) - 1;
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return monthNames[monthIndex] || String(month || "");
}

/**
 * Formats a date string for chart labels or tooltips.
 * 
 * @param {string} dateStr 
 * @param {'short'|'full'} [variant='short']
 * @returns {string}
 */
export function formatChartDate(dateStr, variant = 'short') {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return String(dateStr);

  if (variant === 'full') {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Groups dated chart points into calendar months or Monday-starting weeks.
 * Numeric series are averaged within each bucket so attendance-style metrics
 * remain comparable when changing the display scale.
 *
 * @param {Array<Record<string, any>>} points
 * @param {'month'|'week'|'day'} granularity
 * @param {'average'|'sum'} aggregation
 * @returns {Array<Record<string, any>>}
 */
export function groupChartPoints(points = [], granularity = 'day', aggregation = 'average') {
  if (granularity === 'day' || points.length < 2) return points;

  const buckets = new Map();
  for (const point of points) {
    const date = new Date(`${point.date}T12:00:00`);
    if (Number.isNaN(date.getTime())) continue;
    const key = granularity === 'month'
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      : (() => {
          const monday = new Date(date);
          const day = monday.getDay() || 7;
          monday.setDate(monday.getDate() - day + 1);
          return monday.toISOString().slice(0, 10);
        })();
    const bucket = buckets.get(key) || { key, points: [] };
    bucket.points.push(point);
    buckets.set(key, bucket);
  }

  return [...buckets.values()].sort((a, b) => a.key.localeCompare(b.key)).map(({ key, points: bucketPoints }) => {
    const first = bucketPoints[0];
    const numericKeys = Object.keys(first).filter((field) =>
      field !== 'id' && field !== 'date' && field !== 'label' && typeof first[field] === 'number',
    );
    const result = { ...first, date: granularity === 'month' ? `${key}-01` : key };
    for (const field of numericKeys) {
      const total = bucketPoints.reduce((sum, item) => sum + (Number(item[field]) || 0), 0);
      result[field] = Math.round(aggregation === 'sum' ? total : total / bucketPoints.length);
    }
    result.id = bucketPoints.length === 1 ? first.id : undefined;
    result.topic = bucketPoints.length === 1 ? first.topic : undefined;
    result.label = granularity === 'month'
      ? new Date(`${key}-01T12:00:00`).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
      : `Week of ${new Date(`${key}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
    return result;
  });
}

/**
 * Resolves a semantic color name into an HSL color string supported by the design tokens.
 * 
 * @param {string} [name='primary'] 
 * @returns {string}
 */
export function getChartColor(name = 'primary') {
  const supported = new Set(['primary', 'warning', 'info', 'success', 'destructive', 'secondary', 'muted']);
  const key = supported.has(name) ? name : 'primary';
  return `hsl(var(--${key}))`;
}
