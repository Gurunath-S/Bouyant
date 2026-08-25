import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { exhibitionService } from '../../../services/exhibitions/exhibitionService';
import { Exhibition } from '../../../types';
import { Button } from '../../../components/ui/Button';
import { Layers, Plus, Calendar, MapPin, Sparkles } from 'lucide-react';

export const AdminEventsPage: React.FC = () => {
  const navigate = useNavigate();
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const data = await exhibitionService.getExhibitions();
      setExhibitions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-6 h-6 text-purple-600" />
            Exhibition Event & Floor Plan Builder
          </h1>
          <p className="text-xs text-slate-500 mt-1">Configure trade fair events, publish interactive floor plans, and adjust stall capacity.</p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate('/admin/events/create')}
          leftIcon={<Sparkles className="w-4 h-4" />}
          className="bg-purple-600 hover:bg-purple-700 text-white shadow-sm"
        >
          Create Exhibition (Visual Floor Plan Studio)
        </Button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase tracking-wider font-bold">
              <th className="py-3.5 px-4">Event Title</th>
              <th className="py-3.5 px-4">Slug</th>
              <th className="py-3.5 px-4">Venue & Location</th>
              <th className="py-3.5 px-4">Event Dates</th>
              <th className="py-3.5 px-4 text-center">Capacity</th>
              <th className="py-3.5 px-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {exhibitions.map((e) => (
              <tr key={e.id} className="hover:bg-slate-50">
                <td className="py-3.5 px-4 font-bold text-slate-900">{e.title}</td>
                <td className="py-3.5 px-4 font-mono text-slate-500">{e.slug}</td>
                <td className="py-3.5 px-4">{e.venue}, {e.city}</td>
                <td className="py-3.5 px-4 text-slate-500">
                  {new Date(e.startDate).toLocaleDateString()} - {new Date(e.endDate).toLocaleDateString()}
                </td>
                <td className="py-3.5 px-4 text-center font-bold text-purple-700">{e.totalStalls} Stalls</td>
                <td className="py-3.5 px-4 text-center">
                  <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 font-bold text-[10px] rounded uppercase">
                    {e.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
