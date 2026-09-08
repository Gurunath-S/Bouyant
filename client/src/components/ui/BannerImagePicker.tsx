import React, { useState, useRef } from 'react';
import { Image as ImageIcon, Upload, Link2, Sparkles, Check, Trash2, AlertCircle } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';

export const BANNER_PRESETS = [
  {
    id: 'industrial',
    title: 'Industrial & Automation',
    category: 'Engineering',
    url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'tech',
    title: 'Enterprise Tech & AI Summit',
    category: 'Technology',
    url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'healthcare',
    title: 'Medical & Healthcare Expo',
    category: 'Healthcare',
    url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'construction',
    title: 'Building & Architecture',
    category: 'Construction',
    url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'energy',
    title: 'Clean Energy & Green Tech',
    category: 'Energy',
    url: 'https://images.unsplash.com/photo-1497440001374-f26997328c1b?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'agro',
    title: 'Food Tech & Agro World',
    category: 'Agriculture',
    url: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'fashion',
    title: 'Textiles & Fashion Expo',
    category: 'Lifestyle',
    url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'auto',
    title: 'Automotive & Mobility Show',
    category: 'Automotive',
    url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80',
  },
];

export interface BannerImagePickerProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  helperText?: string;
}

export const BannerImagePicker: React.FC<BannerImagePickerProps> = ({
  value,
  onChange,
  label = 'Exhibition Banner Image',
  helperText = 'Choose from curated industry presets, upload a local banner file, or specify an image URL.',
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'upload' | 'url'>('presets');
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle local file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate image format
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    // Limit to 6MB
    if (file.size > 6 * 1024 * 1024) {
      setUploadError('Image size exceeds 6MB. Please select a smaller image.');
      return;
    }

    setUploadError(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onChange(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyCustomUrl = () => {
    if (customUrlInput.trim()) {
      onChange(customUrlInput.trim());
      setCustomUrlInput('');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
          {label}
        </label>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" /> Remove Banner
          </button>
        )}
      </div>

      {/* Active Banner Preview Card */}
      {value ? (
        <div className="relative h-40 sm:h-48 w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-xs group bg-slate-900">
          <img
            src={value}
            alt="Selected Exhibition Banner"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent flex items-end justify-between p-3.5">
            <span className="text-white text-xs font-bold bg-slate-900/80 px-2.5 py-1 rounded-md backdrop-blur-xs flex items-center gap-1.5 border border-white/20">
              <Check className="w-3.5 h-3.5 text-emerald-400" /> Active Event Banner
            </span>
            <button
              type="button"
              onClick={() => onChange('')}
              className="px-2.5 py-1 bg-white/90 hover:bg-white text-slate-800 rounded-md text-xs font-bold transition-colors shadow-xs"
            >
              Change Image
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-center bg-slate-50/50 dark:bg-slate-800/30">
          <ImageIcon className="w-8 h-8 text-slate-400 mx-auto mb-1.5" />
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            No banner image selected yet
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">{helperText}</p>
        </div>
      )}

      {/* Mode Selector Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300">
        <button
          type="button"
          onClick={() => setActiveTab('presets')}
          className={`flex-1 py-1.5 px-3 rounded-md flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'presets'
              ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-xs font-bold'
              : 'hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-600" />
          <span>Curated Presets</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`flex-1 py-1.5 px-3 rounded-md flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'upload'
              ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-xs font-bold'
              : 'hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Upload className="w-3.5 h-3.5 text-blue-600" />
          <span>Upload from Device</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('url')}
          className={`flex-1 py-1.5 px-3 rounded-md flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'url'
              ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-xs font-bold'
              : 'hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Link2 className="w-3.5 h-3.5 text-slate-500" />
          <span>Web URL</span>
        </button>
      </div>

      {/* Tab 1: Presets Gallery */}
      {activeTab === 'presets' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          {BANNER_PRESETS.map((preset) => {
            const isSelected = value === preset.url;
            return (
              <div
                key={preset.id}
                onClick={() => onChange(preset.url)}
                className={`group relative h-24 rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                  isSelected
                    ? 'border-purple-600 ring-2 ring-purple-600/30 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 hover:border-purple-400'
                }`}
              >
                <img
                  src={preset.url}
                  alt={preset.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent p-2 flex flex-col justify-between">
                  <div className="flex justify-end">
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-xs">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-extrabold text-purple-300 block">
                      {preset.category}
                    </span>
                    <p className="text-[10px] font-bold text-white leading-tight line-clamp-1">
                      {preset.title}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 2: Local File Upload */}
      {activeTab === 'upload' && (
        <div className="p-4 border-2 border-dashed border-purple-200 dark:border-purple-800/60 rounded-xl bg-purple-50/30 dark:bg-purple-950/20 text-center space-y-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/png, image/jpeg, image/webp"
            className="hidden"
          />

          <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-300 flex items-center justify-center mx-auto">
            <Upload className="w-5 h-5" />
          </div>

          <div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Select an image from your local computer
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Supports high-resolution PNG, JPG, or WebP (up to 6MB)
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            leftIcon={<Upload className="w-3.5 h-3.5" />}
            className="bg-white dark:bg-slate-900 shadow-xs text-xs font-semibold"
          >
            Browse Local File
          </Button>

          {uploadError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-[11px] rounded-lg flex items-center gap-1.5 justify-center">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Custom Web URL */}
      {activeTab === 'url' && (
        <div className="flex gap-2 pt-1">
          <Input
            value={customUrlInput}
            onChange={(e) => setCustomUrlInput(e.target.value)}
            placeholder="Paste public image link (https://...)"
            className="text-xs"
          />
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleApplyCustomUrl}
            disabled={!customUrlInput.trim()}
            className="bg-purple-600 hover:bg-purple-700 text-white shrink-0 text-xs"
          >
            Apply URL
          </Button>
        </div>
      )}
    </div>
  );
};
