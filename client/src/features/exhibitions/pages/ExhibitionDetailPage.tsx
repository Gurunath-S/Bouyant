import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { exhibitionService } from '../../../services/exhibitions/exhibitionService';
import { stallService } from '../../../services/stalls/stallService';
import { Exhibition, FloorPlan, Stall } from '../../../types';
import { FloorPlanCanvas } from '../../floor-plan/components/FloorPlanCanvas';
import { StallFilterBar } from '../../floor-plan/components/StallFilterBar';
import { StallHoverCard } from '../../floor-plan/components/StallHoverCard';
import { useFloorPlanStore } from '../../../stores/floorPlanStore';
import { Button } from '../../../components/ui/Button';
import { Calendar, MapPin, ArrowLeft, Layers, Info } from 'lucide-react';

export const ExhibitionDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [exhibition, setExhibition] = useState<Exhibition | null>(null);
  const [floorPlan, setFloorPlan] = useState<FloorPlan | null>(null);
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [loading, setLoading] = useState(true);

  const { selectedStallId, setSelectedStallId, zoomLevel, setZoomLevel } = useFloorPlanStore();

  useEffect(() => {
    if (slug) fetchEventData();
  }, [slug]);

  const fetchEventData = async () => {
    try {
      setLoading(true);
      const expo = await exhibitionService.getExhibitionBySlug(slug!);
      setExhibition(expo);

      if (expo.floorPlans && expo.floorPlans.length > 0) {
        const fp = expo.floorPlans[0];
        setFloorPlan(fp);
        const stallsData = await stallService.getStallsByFloorPlan(fp.id);
        setStalls(stallsData);
      }
    } catch (err) {
      console.error('Failed to load exhibition details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleHoldStall = async (stallId: string) => {
    try {
      const res = await stallService.holdStall(stallId);
      // Refresh stalls list
      if (floorPlan) {
        const updated = await stallService.getStallsByFloorPlan(floorPlan.id);
        setStalls(updated);
      }
      // Navigate to checkout
      navigate(`/checkout?stallId=${stallId}`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reserve stall. Another client may have reserved it.');
    }
  };

  const selectedStall = stalls.find((s) => s.id === selectedStallId);

  if (loading) {
    return <div className="p-12 text-center text-slate-500 font-medium animate-pulse">Loading Exhibition Floor Plan...</div>;
  }

  if (!exhibition) {
    return (
      <div className="p-12 text-center bg-white border border-slate-200 rounded-xl space-y-3">
        <h3 className="text-lg font-bold text-slate-900">Exhibition Event Not Found</h3>
        <Button variant="outline" onClick={() => navigate('/exhibitions')}>
          Back to Exhibitions
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Event Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <button
            onClick={() => navigate('/exhibitions')}
            className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1 mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Exhibitions
          </button>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 font-bold text-[10px] rounded uppercase">
              {exhibition.status}
            </span>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{exhibition.title}</h1>
          </div>
          <p className="text-xs text-slate-600">{exhibition.description}</p>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" /> {exhibition.venue}, {exhibition.city}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {new Date(exhibition.startDate).toLocaleDateString()} - {new Date(exhibition.endDate).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Available Stalls</p>
            <p className="text-xl font-extrabold text-slate-900 font-mono">
              {stalls.filter((s) => s.status === 'AVAILABLE').length} / {stalls.length}
            </p>
          </div>
        </div>
      </div>

      {/* Filter & Canvas Controls Toolbar */}
      <StallFilterBar stalls={stalls} onZoomChange={(z) => setZoomLevel(z)} currentZoom={zoomLevel} />

      {/* SVG Canvas Area + Slide-over Drawer Layout */}
      <div className="relative flex gap-6 items-start">
        <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs p-4">
          <FloorPlanCanvas stalls={stalls} onStallSelect={(s) => setSelectedStallId(s.id)} />
        </div>

        {/* Right Slide-over Details Drawer */}
        {selectedStall && (
          <StallHoverCard
            stall={selectedStall}
            onClose={() => setSelectedStallId(null)}
            onHold={() => handleHoldStall(selectedStall.id)}
          />
        )}
      </div>
    </div>
  );
};
