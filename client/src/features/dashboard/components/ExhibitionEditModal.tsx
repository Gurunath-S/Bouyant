import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Exhibition } from '../../../types';
import { exhibitionService } from '../../../services/exhibitions/exhibitionService';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { DateInput } from '../../../components/ui/DateInput';
import { MultiImagePicker } from '../../../components/ui/MultiImagePicker';
import { InteractivePinMap } from '../../../components/ui/InteractivePinMap';
import { AlertCircle, CheckCircle2, Loader2, Save } from 'lucide-react';

interface ExhibitionEditModalProps {
  exhibition: Exhibition | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ExhibitionEditModal: React.FC<ExhibitionEditModalProps> = ({
  exhibition,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    venue: '',
    city: '',
    startDate: '',
    endDate: '',
    bannerUrl: '',
    status: 'DRAFT',
  });
  const [images, setImages] = useState<string[]>([]);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number }>({
    lat: 19.1551,
    lng: 72.8553,
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (exhibition) {
      // Format dates to YYYY-MM-DD for standard date input
      const formatToDateInput = (isoDate: string) => {
        try {
          return new Date(isoDate).toISOString().split('T')[0];
        } catch {
          return '';
        }
      };

      setFormData({
        title: exhibition.title || '',
        description: exhibition.description || '',
        venue: exhibition.venue || '',
        city: exhibition.city || '',
        startDate: formatToDateInput(exhibition.startDate),
        endDate: formatToDateInput(exhibition.endDate),
        bannerUrl: exhibition.bannerUrl || '',
        status: exhibition.status || 'DRAFT',
      });
      setImages(exhibition.bannerUrl ? [exhibition.bannerUrl] : []);
      setErrorMessage(null);
    }
  }, [exhibition]);

  if (!exhibition) return null;

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setErrorMessage('Exhibition title is required.');
      return;
    }
    if (!formData.venue.trim() || !formData.city.trim()) {
      setErrorMessage('Venue and city are required.');
      return;
    }
    if (!formData.startDate || !formData.endDate) {
      setErrorMessage('Start and end dates are required.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      await exhibitionService.updateExhibition(exhibition.id, formData);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to update exhibition:', err);
      const apiMsg = err.response?.data?.message || err.message || 'Failed to update exhibition.';
      setErrorMessage(apiMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Exhibition — ${exhibition.title}`}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
            Event Title *
          </label>
          <Input
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="e.g. Global MedTech Expo 2026"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={3}
            placeholder="Describe the trade fair theme, industry focus, and highlights..."
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none transition-colors"
          />
        </div>

        {/* Venue & City */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
              Venue / Convention Centre *
            </label>
            <Input
              value={formData.venue}
              onChange={(e) => handleChange('venue', e.target.value)}
              placeholder="e.g. Pragati Maidan"
              required
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
              City *
            </label>
            <Input
              value={formData.city}
              onChange={(e) => handleChange('city', e.target.value)}
              placeholder="e.g. New Delhi"
              required
            />
          </div>
        </div>

        {/* Interactive Pin Map */}
        <div className="space-y-1">
          <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
            Venue Pin Location & Directions
          </label>
          <InteractivePinMap
            latitude={coordinates.lat}
            longitude={coordinates.lng}
            venueName={formData.venue}
            cityName={formData.city}
            heightClass="h-56"
            onChangeCoordinates={(lat, lng) => setCoordinates({ lat, lng })}
            onSyncAddress={(addrData) => {
              if (addrData.city) handleChange('city', addrData.city);
            }}
            title="Interactive Venue Location Pin"
          />
        </div>

        {/* Dates (DD/MM/YYYY) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <DateInput
            label="Start Date"
            value={formData.startDate}
            onChange={(isoVal) => handleChange('startDate', isoVal)}
            required
            helperText="Format: DD/MM/YYYY"
          />
          <DateInput
            label="End Date"
            value={formData.endDate}
            onChange={(isoVal) => handleChange('endDate', isoVal)}
            required
            helperText="Format: DD/MM/YYYY"
          />
        </div>

        {/* Status Dropdown */}
        <div>
          <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
            Lifecycle Status *
          </label>
          <select
            value={formData.status}
            onChange={(e) => handleChange('status', e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-none transition-colors h-[38px]"
          >
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {/* Multi-Option Media & Banner Picker (No Presets) */}
        <MultiImagePicker
          images={images}
          coverImage={formData.bannerUrl}
          onChangeImages={(newImages, newCover) => {
            setImages(newImages);
            handleChange('bannerUrl', newCover);
          }}
          label="Exhibition Banners & Promotional Media"
        />

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={loading} type="button">
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 text-white shadow-xs"
            leftIcon={loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          >
            {loading ? 'Saving Changes...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
