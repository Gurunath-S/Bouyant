/**
 * Helper utilities for smart stall typography on the floor plan canvas.
 * Handles automatic line-wrapping/splitting:
 * - When space permits 2 items: e.g. "A 10- 11" / "A-10-11" ->
 *     A-10
 *     11
 * - When space is tight horizontally (narrow booth < 42px):
 *     A
 *     10
 *     11
 * - Single-token preservation when space permits: e.g. "A10", "A-01"
 * - Dynamic zoom-compensation so text remains readable across all zoom levels.
 */

export interface StallTypographyResult {
  lines: string[];
  fontSize: number;
  lineHeight: number;
  startY: number;
  centerX: number;
}

/**
 * Evaluates whether a set of candidate lines can fit comfortably within
 * stall dimensions at or above a minimum readable font size with proper margins.
 */
const canFitLines = (
  candidateLines: string[],
  width: number,
  height: number,
  minFontSize = 12
): boolean => {
  const maxChars = Math.max(...candidateLines.map((l) => l.length));
  // Require at least 12% breathing room on each side (total 24%) so text never touches walls
  const maxW = (width * 0.76) / Math.max(1, maxChars * 0.60);

  const nLines = candidateLines.length;
  const lineSpacingRatio = nLines > 1 ? 1.16 : 1.0;
  const maxH =
    nLines === 1
      ? height * 0.65
      : (height * 0.78) / (nLines + (nLines - 1) * (lineSpacingRatio - 1));

  return maxW >= minFontSize && maxH >= minFontSize;
};

/**
 * Intelligent joiner for paired tokens (e.g. "A" + "10" -> "A-10")
 */
const joinTokens = (t0: string, t1: string, rawText: string): string => {
  const escaped0 = t0.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escaped1 = t1.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`${escaped0}\\s*([\\-_/])\\s*${escaped1}`, 'i');
  const match = rawText.match(regex);
  if (match && match[1]) {
    return `${t0}${match[1]}${t1}`;
  }
  // Standard exhibition format: letter prefix + number is joined with hyphen (e.g. "A-10")
  if (/^[A-Za-z]+$/.test(t0) && /^\d+$/.test(t1)) {
    return `${t0}-${t1}`;
  }
  return `${t0} ${t1}`;
};

/**
 * Splits and formats stall text into rows based on available space and token patterns.
 */
export const getStallTypography = (
  rawStallNumber: string | undefined | null,
  width: number,
  height: number,
  zoomLevel: number,
  xPosition: number,
  yPosition: number
): StallTypographyResult => {
  const centerX = xPosition + width / 2;
  const centerY = yPosition + height / 2;

  if (!rawStallNumber || !rawStallNumber.trim()) {
    return {
      lines: [''],
      fontSize: 12,
      lineHeight: 14,
      startY: centerY,
      centerX,
    };
  }

  const text = rawStallNumber.trim();
  // Split tokens by spaces, hyphens, slashes, or underscores
  const tokens = text.split(/[\s\-_/]+/).filter(Boolean);

  let lines: string[] = [text];

  if (tokens.length === 3) {
    // e.g. "A-10-11", "A 10- 11", "A 10- 5", "A-08-181"
    const twoLinePairing = [joinTokens(tokens[0], tokens[1], text), tokens[2]];

    // In narrow booths (< 42px width) with sufficient height (>= 38px),
    // 4+ characters like "A-08" or "A-10" crowd the borders.
    // Breaking into 3 lines (A / 08 / 181) is significantly clearer.
    const isNarrowColumn = width < 42 && height >= 38;

    if (!isNarrowColumn && canFitLines(twoLinePairing, width, height, 12)) {
      // Space permits 2 contents comfortably (e.g. A-10 / 11)
      lines = twoLinePairing;
    } else if (height >= 34) {
      // Space is tight horizontally: break into 3 separate rows: A / 10 / 11
      lines = tokens;
    } else {
      // Very shallow height: keep 2 lines as best feasible fit
      lines = twoLinePairing;
    }
  } else if (tokens.length >= 4) {
    // e.g. "A-10-11-12"
    const paired = [
      joinTokens(tokens[0], tokens[1], text),
      tokens.slice(2).join('-'),
    ];
    if (width >= 44 && canFitLines(paired, width, height, 12)) {
      lines = paired;
    } else if (height >= 48) {
      lines = tokens;
    } else {
      lines = paired;
    }
  } else if (tokens.length === 2) {
    // e.g. "A 10", "A-10", "B 05"
    // If stall has space horizontally, keep together on 1 line: "A-10" or "A 10"
    if (canFitLines([text], width, height, 12) && height <= width * 1.35) {
      lines = [text];
    } else {
      // Space is tight or stall is vertical; split into 2 rows: A / 10
      lines = tokens;
    }
  } else if (tokens.length === 1) {
    // Single token like "A10" or "B8"
    const letterDigitMatch = text.match(/^([A-Za-z]+)(\d+)$/);
    if (letterDigitMatch && width < 26 && height >= 48) {
      lines = [letterDigitMatch[1], letterDigitMatch[2]];
    } else {
      lines = [text];
    }
  }

  // --- Compute Zoom-Compensated Adaptive Font Size ---
  const scale = zoomLevel / 100;
  // Target readable screen pixels (minimum 11-13 screen px regardless of zoom)
  const targetScreenPx = scale < 0.65 ? 12 : scale < 0.9 ? 11 : 13;
  const svgTarget = targetScreenPx / Math.max(0.2, scale);

  // Desired normal SVG size relative to booth dimensions
  const normalSize = Math.max(12, Math.min(18, Math.min(width, height) * 0.28));
  const desiredSize = Math.max(normalSize, svgTarget);

  // Width constraint for selected lines
  const maxChars = Math.max(...lines.map((l) => l.length));
  const maxW = (width * 0.88) / Math.max(1, maxChars * 0.60);

  // Height constraint for selected lines
  const nLines = lines.length;
  const lineSpacingRatio = nLines > 1 ? 1.16 : 1.0;
  const maxH =
    nLines === 1
      ? height * 0.65
      : (height * 0.80) / (nLines + (nLines - 1) * (lineSpacingRatio - 1));

  const fontSize = Math.round(Math.max(10, Math.min(desiredSize, maxW, maxH)));
  const lineHeight = Math.round(fontSize * lineSpacingRatio);

  // Compute startY so all lines are vertically centered around centerY
  const totalTextSpan = (nLines - 1) * lineHeight;
  const startY = centerY - totalTextSpan / 2;

  return {
    lines,
    fontSize,
    lineHeight,
    startY,
    centerX,
  };
};
