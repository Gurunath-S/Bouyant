import React, { useState, useRef } from 'react';
import {
  Upload,
  Link2,
  Trash2,
  Star,
  Plus,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';

export interface MultiImagePickerProps {
  images: string[];
  coverImage?: string;
  onChangeImages: (images: string[], coverImage: string) => void;
  label?: string;
  helperText?: string;
  maxImages?: number;
}

export const MultiImagePicker: React.FC<MultiImagePickerProps> = ({
  images = [],
  coverImage = '',
  onChangeImages,
  label = 'Exhibition Banners & Media Gallery',
  helperText = 'Upload multiple images from your computer or add image URLs. The starred image serves as the main event cover banner.',
  maxImages = 10,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const effectiveCover = coverImage || images[0] || '';

  // Handle local files upload (multi-file support)
  const handleLocalFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > maxImages) {
      setErrorMessage(`You can add a maximum of ${maxImages} images.`);
      return;
    }

    setErrorMessage(null);
    const newImages: string[] = [];
    let filesProcessed = 0;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) {
        setErrorMessage('Only image files (PNG, JPG, WebP) are supported.');
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        setErrorMessage('One or more files exceed the 8MB size limit.');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          newImages.push(reader.result);
        }
        filesProcessed++;
        if (filesProcessed === files.length) {
          const updated = [...images, ...newImages];
          const newCover = effectiveCover || updated[0] || '';
          onChangeImages(updated, newCover);
        }
      };
      reader.readAsDataURL(file);
    });

    // Reset input so same file can be selected again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Handle adding image via URL
  const handleAddUrl = () => {
    let cleanUrl = urlInput.trim();
    if (!cleanUrl) return;

    // Auto-prefix https if missing protocol
    if (!/^https?:\/\//i.test(cleanUrl) && !cleanUrl.startsWith('data:')) {
      cleanUrl = `https://${cleanUrl}`;
    }

    if (images.includes(cleanUrl)) {
      setErrorMessage('This image URL has already been added.');
      return;
    }

    if (images.length >= maxImages) {
      setErrorMessage(`Maximum of ${maxImages} images reached.`);
      return;
    }

    setErrorMessage(null);
    const updated = [...images, cleanUrl];
    const newCover = effectiveCover || updated[0] || '';
    onChangeImages(updated, newCover);
    setUrlInput('');
  };

  // Remove an image
  const handleRemoveImage = (indexToRemove: number) => {
    const targetUrl = images[indexToRemove];
    const updated = images.filter((_, idx) => idx !== indexToRemove);
    let newCover = effectiveCover;
    if (effectiveCover === targetUrl) {
      newCover = updated[0] || '';
    }
    onChangeImages(updated, newCover);
  };

  // Set primary cover image
  const handleSetCover = (url: string) => {
    onChangeImages(images, url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
        <div>
          <label className="block text-xs font-bold text-slate-900 dark:text-slate-100">
            {label}
          </label>
          <p className="text-[11px] text-slate-500 mt-0.5">{helperText}</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
          <span className="font-bold text-purple-700 dark:text-purple-400">{images.length}</span> / {maxImages} Images
        </div>
      </div>

      {/* Input Methods: Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300">
        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`flex-1 py-1.5 px-3 rounded-md flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'upload'
              ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-xs font-bold'
              : 'hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Upload className="w-3.5 h-3.5 text-purple-600" />
          <span>Upload Files from Local Computer</span>
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
          <Link2 className="w-3.5 h-3.5 text-blue-600" />
          <span>Add via Web Image URL</span>
        </button>
      </div>

      {/* Upload Zone */}
      {activeTab === 'upload' && (
        <div className="p-5 border-2 border-dashed border-purple-200 dark:border-purple-800/60 rounded-xl bg-purple-50/20 dark:bg-purple-950/20 text-center space-y-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleLocalFiles}
            accept="image/png, image/jpeg, image/webp"
            multiple
            className="hidden"
          />

          <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-300 flex items-center justify-center mx-auto">
            <Upload className="w-5 h-5" />
          </div>

          <div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Select one or multiple images from your computer
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Supports PNG, JPG, or WebP. Hold Ctrl / Shift to select multiple photos at once.
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
            Choose Image Files
          </Button>
        </div>
      )}

      {/* URL Input Zone */}
      {activeTab === 'url' && (
        <div className="flex gap-2">
          <Input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddUrl();
              }
            }}
            placeholder="Paste any direct image link (https://...)"
            className="text-xs"
          />
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleAddUrl}
            disabled={!urlInput.trim() || images.length >= maxImages}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            className="bg-purple-600 hover:bg-purple-700 text-white shrink-0 text-xs"
          >
            Add Image
          </Button>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-[11px] rounded-lg flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="ml-auto underline font-bold text-[10px]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Gallery Grid */}
      {images.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Image Gallery Preview ({images.length})</span>
            <span className="text-[11px] text-purple-700 font-bold">
              ★ Click the star on any photo to set as Main Cover
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {images.map((imgUrl, index) => {
              const isCover = imgUrl === effectiveCover;
              return (
                <div
                  key={index}
                  className={`group relative h-32 rounded-xl overflow-hidden border-2 bg-slate-900 transition-all ${
                    isCover
                      ? 'border-purple-600 ring-2 ring-purple-600/30 shadow-md'
                      : 'border-slate-200 dark:border-slate-700 hover:border-purple-400'
                  }`}
                >
                  <img
                    src={imgUrl}
                    alt={`Event Media ${index + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      // Fallback for broken link
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=400&q=80';
                    }}
                  />

                  {/* Gradient Overlay with Badges & Actions */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/40 p-2 flex flex-col justify-between">
                    {/* Top Action Bar */}
                    <div className="flex items-center justify-between">
                      {isCover ? (
                        <span className="px-2 py-0.5 bg-purple-600 text-white font-extrabold text-[9px] uppercase tracking-wider rounded-md flex items-center gap-1 shadow-xs">
                          <Star className="w-2.5 h-2.5 fill-current" /> Main Cover
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSetCover(imgUrl)}
                          className="px-1.5 py-0.5 bg-black/60 hover:bg-purple-600 text-white text-[9px] rounded font-semibold transition-colors flex items-center gap-1 opacity-80 hover:opacity-100"
                          title="Set as Main Cover Banner"
                        >
                          <Star className="w-2.5 h-2.5" /> Make Cover
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="p-1 rounded-full bg-rose-600/90 hover:bg-rose-700 text-white transition-colors shadow-xs"
                        title="Delete image"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Bottom Label */}
                    <span className="text-[10px] font-mono text-white/90">
                      Photo #{index + 1}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-center bg-slate-50/50 dark:bg-slate-800/30 space-y-1">
          <ImageIcon className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            No images added yet
          </p>
          <p className="text-[11px] text-slate-400">
            Upload from local computer or add image URLs above
          </p>
        </div>
      )}
    </div>
  );
};
