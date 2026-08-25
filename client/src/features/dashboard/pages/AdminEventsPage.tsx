import React, { useEffect, useState } from 'react';
import { exhibitionService } from '../../../services/exhibitions/exhibitionService';
import { Exhibition } from '../../../types';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { Layers, Plus, Calendar, MapPin, Edit3 } from 'lucide-react';

export const AdminEventsPage: React.FC = () => {
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // New Event Form State
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    venue: '',
    city: '',
    startDate: '',
    endDate: '',
    bannerUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80',
    totalStalls: 16,
  });

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

  const handleCreate = async () => {
    try {
      await exhibitionService.createExhibition(formData as any);
      setModalOpen(false);
      fetchEvents();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create exhibition event.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-6 h-6 text-purple-600" />
            Exhibition Event & Floor Plan Builder
          </h1>
          <p className="text-xs text-slate-500 mt-1">Configure trade fair events, publish floor plans, and adjust stall capacity.</p>
        </div>

        <Button variant="primary" size="sm" onClick={() => setModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
          Create New Exhibition
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
                <td className="py-3.5 px-4 text-center font-bold text-blue-700">{e.totalStalls} Stalls</td>
                <td className="py-3.5 px-4 text-center">
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[10px] rounded">
                    {e.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Create Exhibition Event">
        <div className="space-y-4">
          <Input
            label="Event Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
          />
          <Input
            label="URL Slug"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
          />
          <Input
            label="Venue Name"
            value={formData.venue}
            onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
          />
          <Input
            label="City"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Date"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            />
            <Input
              label="End Date"
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            />
          </div>
          <Button variant="primary" className="w-full mt-2" onClick={handleCreate}>
            Publish Exhibition Event
          </Button>
        </div>
      </Modal>
    </div>
  );
};
