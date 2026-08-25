import { create } from 'zustand';
import { Stall, StallCategory, StallStatus } from '../types';

interface FloorPlanState {
  selectedStall: Stall | null;
  selectedStallId: string | null;
  categoryFilter: StallCategory | 'ALL';
  selectedCategory: StallCategory | null;
  selectedStatus: StallStatus | null;
  zoomLevel: number;
  activeHeldStall: {
    stall: Stall;
    heldUntil: string;
  } | null;
  setSelectedStall: (stall: Stall | null) => void;
  setSelectedStallId: (id: string | null) => void;
  setCategoryFilter: (category: StallCategory | 'ALL') => void;
  setSelectedCategory: (category: StallCategory | null) => void;
  setSelectedStatus: (status: StallStatus | null) => void;
  setZoomLevel: (zoom: number | ((prev: number) => number)) => void;
  setActiveHeldStall: (holdData: { stall: Stall; heldUntil: string } | null) => void;
}

export const useFloorPlanStore = create<FloorPlanState>((set) => ({
  selectedStall: null,
  selectedStallId: null,
  categoryFilter: 'ALL',
  selectedCategory: null,
  selectedStatus: null,
  zoomLevel: 100,
  activeHeldStall: null,

  setSelectedStall: (stall) => set({ selectedStall: stall, selectedStallId: stall ? stall.id : null }),
  setSelectedStallId: (id) => set({ selectedStallId: id }),
  setCategoryFilter: (categoryFilter) => set({ categoryFilter, selectedCategory: categoryFilter === 'ALL' ? null : categoryFilter }),
  setSelectedCategory: (selectedCategory) => set({ selectedCategory, categoryFilter: selectedCategory || 'ALL' }),
  setSelectedStatus: (selectedStatus) => set({ selectedStatus }),
  setZoomLevel: (zoom) =>
    set((state) => ({
      zoomLevel: typeof zoom === 'function' ? zoom(state.zoomLevel) : zoom,
    })),
  setActiveHeldStall: (activeHeldStall) => set({ activeHeldStall }),
}));
