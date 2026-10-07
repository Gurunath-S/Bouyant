import { create } from 'zustand';
import { Stall, StallCategory, StallStatus } from '../types';

interface FloorPlanState {
  selectedStalls: Stall[];
  selectedStallIds: string[];
  heldStallIds: string[];
  conflictingStallIds: string[];
  conflicts: Array<{ stallId: string; stallNumber: string; reason: string }>;
  categoryFilter: StallCategory | 'ALL';
  selectedCategory: StallCategory | null;
  selectedStatus: StallStatus | null;
  selectedHall: string;
  zoomLevel: number;
  baseZoomLevel: number;
  activeHeldStall: {
    stall: Stall;
    heldUntil: string;
  } | null;
  toggleStallSelection: (stall: Stall) => void;
  removeStallFromSelection: (stallId: string) => void;
  clearStallSelection: () => void;
  setHeldStallIds: (ids: string[]) => void;
  setConflicts: (conflicts: Array<{ stallId: string; stallNumber: string; reason: string }>) => void;
  clearConflicts: () => void;
  setCategoryFilter: (category: StallCategory | 'ALL') => void;
  setSelectedCategory: (category: StallCategory | null) => void;
  setSelectedStatus: (status: StallStatus | null) => void;
  setSelectedHall: (hall: string) => void;
  setZoomLevel: (zoom: number | ((prev: number) => number)) => void;
  setBaseZoomLevel: (zoom: number) => void;
  setActiveHeldStall: (holdData: { stall: Stall; heldUntil: string } | null) => void;
}

export const useFloorPlanStore = create<FloorPlanState>((set) => ({
  selectedStalls: [],
  selectedStallIds: [],
  heldStallIds: [],
  conflictingStallIds: [],
  conflicts: [],
  categoryFilter: 'ALL',
  selectedCategory: null,
  selectedStatus: null,
  selectedHall: 'ALL',
  zoomLevel: 100,
  baseZoomLevel: 100,
  activeHeldStall: null,

  toggleStallSelection: (stall) =>
    set((state) => {
      const isSelected = state.selectedStallIds.includes(stall.id);
      if (isSelected) {
        return {
          selectedStalls: state.selectedStalls.filter((s) => s.id !== stall.id),
          selectedStallIds: state.selectedStallIds.filter((id) => id !== stall.id),
          conflictingStallIds: state.conflictingStallIds.filter((id) => id !== stall.id),
          conflicts: state.conflicts.filter((c) => c.stallId !== stall.id),
        };
      }
      return {
        selectedStalls: [...state.selectedStalls, stall],
        selectedStallIds: [...state.selectedStallIds, stall.id],
      };
    }),
  removeStallFromSelection: (stallId) =>
    set((state) => ({
      selectedStalls: state.selectedStalls.filter((s) => s.id !== stallId),
      selectedStallIds: state.selectedStallIds.filter((id) => id !== stallId),
      heldStallIds: state.heldStallIds.filter((id) => id !== stallId),
      conflictingStallIds: state.conflictingStallIds.filter((id) => id !== stallId),
      conflicts: state.conflicts.filter((c) => c.stallId !== stallId),
    })),
  clearStallSelection: () => set({ selectedStalls: [], selectedStallIds: [], heldStallIds: [], conflictingStallIds: [], conflicts: [] }),
  setHeldStallIds: (heldStallIds) => set({ heldStallIds }),
  setConflicts: (conflicts) =>
    set({
      conflicts,
      conflictingStallIds: conflicts.map((c) => c.stallId),
    }),
  clearConflicts: () => set({ conflicts: [], conflictingStallIds: [] }),
  setCategoryFilter: (categoryFilter) => set({ categoryFilter, selectedCategory: categoryFilter === 'ALL' ? null : categoryFilter }),
  setSelectedCategory: (selectedCategory) => set({ selectedCategory, categoryFilter: selectedCategory || 'ALL' }),
  setSelectedStatus: (selectedStatus) => set({ selectedStatus }),
  setSelectedHall: (selectedHall) => set({ selectedHall }),
  setZoomLevel: (zoom) =>
    set((state) => ({
      zoomLevel: typeof zoom === 'function' ? zoom(state.zoomLevel) : zoom,
    })),
  setBaseZoomLevel: (baseZoomLevel) => set({ baseZoomLevel }),
  setActiveHeldStall: (activeHeldStall) => set({ activeHeldStall }),
}));
