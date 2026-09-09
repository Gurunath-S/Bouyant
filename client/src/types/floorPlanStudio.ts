import { StallCategory, StallStatus } from './index';

export interface HallZone {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
}

export type FacilityType =
  | 'entrance'
  | 'exit'
  | 'registration'
  | 'restroom'
  | 'food-court'
  | 'dining'
  | 'stage'
  | 'shutter'
  | 'custom-zone'
  | 'corridor';

export interface FacilityObject {
  id: string;
  type: FacilityType;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number; // 0, 90, 180, 270
  color?: string;
}

export interface AnnotationObject {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize?: number;
  rotation?: number;
  color?: string;
}

export interface FloorPlanLayoutData {
  canvasWidth: number;
  canvasHeight: number;
  gridSize: number; // Pixels per meter (default: 20px = 1m)
  snapInterval: number; // Snap increment in meters (0.5, 1, or 2)
  halls: HallZone[];
  facilities: FacilityObject[];
  annotations: AnnotationObject[];
  backgroundImageUrl?: string;
  backgroundOpacity?: number;
}

export interface DraftStallItem {
  id: string;
  stallNumber: string;
  name?: string;
  category: StallCategory;
  price: number;
  areaSqFt: number;
  width: number; // in pixels (e.g. 60px = 3m)
  height: number; // in pixels (e.g. 60px = 3m)
  xPosition: number;
  yPosition: number;
  status: StallStatus;
  rotation?: number; // 0, 90, 180, 270
}

export type StudioTool =
  | 'select'
  | 'marquee'
  | 'pan'
  | 'hall'
  | 'stall'
  | 'stall-row'
  | 'facility'
  | 'zone'
  | 'text';

export interface SelectedItemReference {
  type: 'stall' | 'hall' | 'facility' | 'annotation';
  id: string;
}

export interface StarterTemplate {
  id: string;
  name: string;
  description: string;
  previewHallsCount: number;
  previewStallsCount: number;
  layoutData: FloorPlanLayoutData;
  stalls: DraftStallItem[];
}
