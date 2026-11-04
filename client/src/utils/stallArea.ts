/**
 * Calculates and formats stall area in Square Meters (Sq.Mt / SQM).
 * 
 * Rules:
 * - If stall has physical dimensions (actualWidth and actualHeight in meters), area = actualWidth * actualHeight.
 * - If only canvas dimensions exist (width and height in px, where 20px = 1m), area = (width * height) / 400.
 * - If areaSqFt exists and > 40 (legacy square feet data), it converts to Sq.Mt via areaSqFt / 10.764.
 * - If areaSqFt exists and <= 40, it is already in square meters.
 * - Default fallback is 9 Sq.Mt (standard 3x3m booth).
 */
export function getStallAreaSqMt(stall: {
  actualWidth?: number | null;
  actualHeight?: number | null;
  width?: number | null;
  height?: number | null;
  areaSqFt?: number | null;
} | null | undefined): number {
  if (!stall) return 9;

  if (stall.actualWidth && stall.actualHeight) {
    return Number((Number(stall.actualWidth) * Number(stall.actualHeight)).toFixed(1));
  }

  if (stall.areaSqFt) {
    const val = Number(stall.areaSqFt);
    if (val > 40) {
      return Number((val / 10.764).toFixed(1));
    }
    return Number(val.toFixed(1));
  }

  if (stall.width && stall.height) {
    return Number(((Number(stall.width) / 20) * (Number(stall.height) / 20)).toFixed(1));
  }

  return 9;
}

export function formatStallArea(
  stall: {
    actualWidth?: number | null;
    actualHeight?: number | null;
    width?: number | null;
    height?: number | null;
    areaSqFt?: number | null;
  } | null | undefined,
  unit: 'Sq.Mt' | 'SQM' = 'Sq.Mt'
): string {
  const sqmt = getStallAreaSqMt(stall);
  return `${sqmt} ${unit}`;
}

export function getStallDimensionsText(stall: {
  actualWidth?: number | null;
  actualHeight?: number | null;
  width?: number | null;
  height?: number | null;
} | null | undefined): string {
  if (!stall) return '3m × 3m';
  if (stall.actualWidth && stall.actualHeight) {
    return `${stall.actualWidth}m × ${stall.actualHeight}m`;
  }
  if (stall.width && stall.height) {
    return `${(Number(stall.width) / 20).toFixed(1)}m × ${(Number(stall.height) / 20).toFixed(1)}m`;
  }
  return '3m × 3m';
}
