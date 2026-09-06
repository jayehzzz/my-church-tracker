import { describe, expect, it } from "vitest";
import {
  getNiceYScale,
  getBandCoordinates,
  makeSmoothCurve,
  makeAreaPath,
  formatMonthLabel,
  formatChartDate,
  getChartColor,
} from "./chartUtils.js";

describe("chartUtils", () => {
  describe("getNiceYScale", () => {
    it("handles zero or negative max values with sensible defaults", () => {
      const scale = getNiceYScale(0);
      expect(scale.max).toBe(4);
      expect(scale.ticks).toEqual([0, 1, 2, 3, 4]);
    });

    it("generates clean intervals and headroom for max=15", () => {
      const scale = getNiceYScale(15);
      expect(scale.max).toBeGreaterThanOrEqual(15);
      expect(scale.ticks).toContain(0);
      expect(scale.ticks[scale.ticks.length - 1]).toBe(scale.max);
      // Ticks should be evenly spaced
      const diff = scale.ticks[1] - scale.ticks[0];
      for (let i = 1; i < scale.ticks.length; i++) {
        expect(scale.ticks[i] - scale.ticks[i - 1]).toBe(diff);
      }
    });

    it("scales large values cleanly", () => {
      const scale = getNiceYScale(230);
      expect(scale.max).toBeGreaterThanOrEqual(230);
      expect(scale.interval % 10).toBe(0);
    });
  });

  describe("getBandCoordinates", () => {
    it("centers categories within their bands", () => {
      const { bandWidth, getCenterX } = getBandCoordinates(3, 450, 50);
      expect(bandWidth).toBe(150);
      expect(getCenterX(0)).toBe(50 + 75); // 125
      expect(getCenterX(1)).toBe(50 + 75 + 150); // 275
      expect(getCenterX(2)).toBe(50 + 75 + 300); // 425
    });

    it("handles single item", () => {
      const { bandWidth, getCenterX } = getBandCoordinates(1, 400, 50);
      expect(bandWidth).toBe(400);
      expect(getCenterX(0)).toBe(250);
    });
  });

  describe("makeSmoothCurve", () => {
    it("returns empty string for empty points", () => {
      expect(makeSmoothCurve([])).toBe("");
    });

    it("returns simple move for 1 point", () => {
      expect(makeSmoothCurve([{ x: 10, y: 20 }])).toBe("M 10 20");
    });

    it("returns line for 2 points", () => {
      expect(makeSmoothCurve([{ x: 10, y: 20 }, { x: 30, y: 40 }])).toBe("M 10 20 L 30 40");
    });

    it("generates cubic Bezier curve for 3 or more points", () => {
      const points = [
        { x: 10, y: 20 },
        { x: 30, y: 50 },
        { x: 50, y: 10 },
      ];
      const curve = makeSmoothCurve(points);
      expect(curve).toContain("C 20 20, 20 50, 30 50");
      expect(curve).toContain("C 40 50, 40 10, 50 10");
    });
  });

  describe("makeAreaPath", () => {
    it("returns empty string for empty points", () => {
      expect(makeAreaPath([], "y", 200)).toBe("");
    });

    it("closes the curve to the baseline", () => {
      const points = [
        { x: 10, y: 20 },
        { x: 50, y: 30 },
      ];
      const area = makeAreaPath(points, "y", 200);
      expect(area).toBe("M 10 20 L 50 30 L 50 200 L 10 200 Z");
    });
  });

  describe("formatMonthLabel", () => {
    it("formats month strings and numbers", () => {
      expect(formatMonthLabel("7")).toBe("Jul");
      expect(formatMonthLabel(8)).toBe("Aug");
      expect(formatMonthLabel("12")).toBe("Dec");
      expect(formatMonthLabel("Custom")).toBe("Custom");
    });
  });

  describe("getChartColor", () => {
    it("returns theme css variable hsl strings", () => {
      expect(getChartColor("primary")).toBe("hsl(var(--primary))");
      expect(getChartColor("info")).toBe("hsl(var(--info))");
      expect(getChartColor("warning")).toBe("hsl(var(--warning))");
      expect(getChartColor("nonexistent")).toBe("hsl(var(--primary))");
    });
  });
});
