import React, { useState, useRef } from 'react';
import {
  Upload,
  Link2,
  Trash2,
  Star,
  Plus,
  Image as ImageIcon,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { uploadService } from '../../services/upload/uploadService';

export interface MultiImagePickerProps {
  images: string[];
  coverImage?: string;
  onChangeImages: (images: string[], coverImage: string) => void;
  label?: string;
  helperText?: string;
  maxImages?: number;
  disabled?: boolean;
}

export const MultiImagePicker: React.FC<MultiImagePickerProps> = ({
  images = [],
  coverImage = '',
  onChangeImages,
  label = 'Exhibition Banners & Media Gallery',
  helperText = 'Upload multiple images from your computer or add image URLs. The starred image serves as the main event cover banner.',
  maxImages = 10,
  disabled = false,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isValidatingUrl, setIsValidatingUrl] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const safeImages = Array.isArray(images) ? images.filter(Boolean) : [];
  const effectiveCover = coverImage || safeImages[0] || '';

  // Process and upload local files with instant optimistic preview
  const handleFilesUpload = async (fileList: FileList | File[]) => {
    const rawFiles = Array.from(fileList);
    if (rawFiles.length === 0) return;

    if (safeImages.length + rawFiles.length > maxImages) {
      setErrorMessage(`You can add a maximum of ${maxImages} images (currently ${safeImages.length}).`);
      return;
    }

    setErrorMessage(null);
    setIsUploading(true);
    setUploadingCount(rawFiles.length);

    // 1. Read all local files as Data URLs immediately (< 50ms)
    const readPromises = rawFiles.map((file) => {
      return new Promise<string>((resolve, reject) => {
        const isImage =
          file.type.startsWith('image/') ||
          /\.(jpe?g|png|webp|gif|svg|bmp|jfif)$/i.test(file.name);

        if (!isImage) {
          reject(new Error(`"${file.name}" is not a recognized image format.`));
          return;
        }

        if (file.size > 15 * 1024 * 1024) {
          reject(new Error(`"${file.name}" exceeds the 15MB size limit.`));
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            reject(new Error(`Failed to read file "${file.name}".`));
          }
        };
        reader.onerror = () => reject(new Error(`Error reading "${file.name}".`));
        reader.readAsDataURL(file);
      });
    });

    let localPreviews: string[] = [];
    try {
      localPreviews = await Promise.all(readPromises);
    } catch (readErr: any) {
      setErrorMessage(readErr.message || 'Failed to read one or more local files.');
      setIsUploading(false);
      setUploadingCount(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // 2. IMMEDIATE DISPLAY: Optimistically append local previews to gallery right away!
    const immediateImages = [...safeImages, ...localPreviews];
    const initialCover = effectiveCover || immediateImages[0] || '';
    onChangeImages(immediateImages, initialCover);

    // 3. Background Cloudinary upload to replace temporary Data URLs with permanent Cloudinary URLs
    try {
      const uploadTasks = localPreviews.map(async (dataUrl) => {
        try {
          const res = await uploadService.uploadImage(dataUrl, 'gallery');
          return { original: dataUrl, permanent: res.url || dataUrl };
        } catch (e) {
          console.warn('Cloudinary upload fallback to local preview:', e);
          return { original: dataUrl, permanent: dataUrl };
        }
      });

      const uploadResults = await Promise.all(uploadTasks);

      // Map uploaded permanent URLs back into images array
      const finalImages = immediateImages.map((img) => {
        const match = uploadResults.find((r) => r.original === img);
        return match ? match.permanent : img;
      });

      const finalCover =
        effectiveCover && !localPreviews.includes(effectiveCover)
          ? effectiveCover
          : finalImages[0] || '';

      onChangeImages(finalImages, finalCover);
    } catch (uploadErr: any) {
      console.warn('Cloudinary upload error:', uploadErr);
      // Photos remain visible via data URL fallback
    } finally {
      setIsUploading(false);
      setUploadingCount(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle local file selection from input
  const handleLocalFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFilesUpload(e.target.files);
    }
  };

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || isUploading) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesUpload(e.dataTransfer.files);
    }
  };

  // Handle adding image via URL with live image validation
  const handleAddUrl = () => {
    let cleanUrl = urlInput.trim();
    if (!cleanUrl || isValidatingUrl) return;

    // Auto-prefix https if missing protocol
    if (!/^https?:\/\//i.test(cleanUrl) && !cleanUrl.startsWith('data:')) {
      cleanUrl = `https://${cleanUrl}`;
    }

    // Validate standard URL format
    try {
      const parsed = new URL(cleanUrl);
      if (!['http:', 'https:'].includes(parsed.protocol) && !cleanUrl.startsWith('data:')) {
        setErrorMessage('Invalid URL protocol. Please enter an HTTP or HTTPS image URL.');
        return;
      }
    } catch {
      setErrorMessage('Please enter a valid web image URL (e.g. https://example.com/banner.jpg).');
      return;
    }

    if (safeImages.includes(cleanUrl)) {
      setErrorMessage('This image URL has already been added to the gallery.');
      return;
    }

    if (safeImages.length >= maxImages) {
      setErrorMessage(`Maximum of ${maxImages} images reached.`);
      return;
    }

    setErrorMessage(null);
    setIsValidatingUrl(true);

    // Verify that the URL actually points to an accessible, working image
    const testImg = new Image();
    let hasResolved = false;

    const timer = setTimeout(() => {
      if (!hasResolved) {
        hasResolved = true;
        testImg.src = '';
        setIsValidatingUrl(false);
        setErrorMessage('The image URL could not be loaded or timed out. Please check that the URL is directly accessible.');
      }
    }, 6000);

    testImg.onload = () => {
      if (hasResolved) return;
      hasResolved = true;
      clearTimeout(timer);
      setIsValidatingUrl(false);
      setErrorMessage(null);

      // Verified working image! Add to gallery
      const updated = [...safeImages, cleanUrl];
      const newCover = effectiveCover || updated[0] || '';
      onChangeImages(updated, newCover);
      setUrlInput('');
    };

    testImg.onerror = () => {
      if (hasResolved) return;
      hasResolved = true;
      clearTimeout(timer);
      setIsValidatingUrl(false);
      setErrorMessage('Invalid or non-working image URL. The link does not point to an accessible image. Please provide a direct, working image URL.');
    };

    testImg.src = cleanUrl;
  };

  // Remove an image
  const handleRemoveImage = (indexToRemove: number) => {
    const targetUrl = safeImages[indexToRemove];
    const updated = safeImages.filter((_, idx) => idx !== indexToRemove);
    let newCover = effectiveCover;
    if (effectiveCover === targetUrl) {
      newCover = updated[0] || '';
    }
    // Clean up failedImages tracking if removed
    if (failedImages[targetUrl]) {
      setFailedImages((prev) => {
        const next = { ...prev };
        delete next[targetUrl];
        return next;
      });
    }
    onChangeImages(updated, newCover);
  };

  // Set primary cover image
  const handleSetCover = (url: string) => {
    onChangeImages(safeImages, url);
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
          <span className="font-bold text-purple-700 dark:text-purple-400">
            {safeImages.length}
          </span>{' '}
          / {maxImages} Images
        </div>
      </div>

      {/* Input Methods: Tabs */}
      {!disabled && (
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-1.5 px-3 rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
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
            className={`flex-1 py-1.5 px-3 rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'url'
                ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-xs font-bold'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Link2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Add via Web Image URL</span>
          </button>
        </div>
      )}

      {/* Upload Zone */}
      {!disabled && activeTab === 'upload' && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`p-5 border-2 border-dashed rounded-xl text-center space-y-3 transition-colors ${
            isDragging
              ? 'border-purple-600 bg-purple-100/50 dark:bg-purple-900/30 ring-2 ring-purple-500/20'
              : 'border-purple-200 dark:border-purple-800/60 bg-purple-50/20 dark:bg-purple-950/20'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleLocalFiles}
            accept="image/*, .png, .jpg, .jpeg, .webp, .svg, .gif"
            multiple
            className="hidden"
          />

          <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-300 flex items-center justify-center mx-auto">
            {isUploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Upload className="w-5 h-5" />
            )}
          </div>

          <div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {isUploading
                ? `Processing ${uploadingCount} image${uploadingCount > 1 ? 's' : ''}...`
                : 'Select or drag & drop images from your computer'}
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
            disabled={isUploading || safeImages.length >= maxImages}
            leftIcon={
              isUploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )
            }
            className="bg-white dark:bg-slate-900 shadow-xs text-xs font-semibold cursor-pointer"
          >
            {isUploading ? 'Uploading to Gallery...' : 'Choose Image Files'}
          </Button>
        </div>
      )}

      {/* URL Input Zone */}
      {!disabled && activeTab === 'url' && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={urlInput}
              disabled={isValidatingUrl}
              onChange={(e) => {
                setUrlInput(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isValidatingUrl) {
                  e.preventDefault();
                  handleAddUrl();
                }
              }}
              placeholder="Paste direct image link (e.g. https://example.com/banner.jpg)"
              className="text-xs"
            />
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleAddUrl}
              disabled={!urlInput.trim() || safeImages.length >= maxImages || isValidatingUrl}
              leftIcon={
                isValidatingUrl ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )
              }
              className="bg-purple-600 hover:bg-purple-700 text-white shrink-0 text-xs cursor-pointer"
            >
              {isValidatingUrl ? 'Verifying URL...' : 'Add Image'}
            </Button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs rounded-xl flex items-start gap-2 animate-fadeIn shadow-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
          <div className="flex-1 leading-relaxed">
            <span className="font-bold block text-rose-900 dark:text-rose-100">Image URL Validation Error</span>
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="ml-2 text-rose-600 hover:text-rose-800 dark:text-rose-400 font-bold text-xs underline cursor-pointer shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Gallery Grid */}
      {safeImages.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span className="flex items-center gap-1.5">
              <span>Image Gallery Preview ({safeImages.length})</span>
              {isUploading && (
                <span className="inline-flex items-center gap-1 text-[10px] text-purple-600 bg-purple-50 dark:bg-purple-950 px-2 py-0.5 rounded-full font-medium">
                  <Loader2 className="w-2.5 h-2.5 animate-spin" /> Uploading in background
                </span>
              )}
            </span>
            {!disabled && (
              <span className="text-[11px] text-purple-700 dark:text-purple-400 font-bold">
                ★ Click the star on any photo to set as Main Cover
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {safeImages.map((imgUrl, index) => {
              const isCover = imgUrl === effectiveCover;
              const isPending = isUploading && imgUrl.startsWith('data:');

              return (
                <div
                  key={`${imgUrl.slice(0, 32)}-${index}`}
                  className={`group relative h-32 rounded-xl overflow-hidden border-2 bg-slate-900 transition-all ${
                    isCover
                      ? 'border-purple-600 ring-2 ring-purple-600/30 shadow-md'
                      : 'border-slate-200 dark:border-slate-700 hover:border-purple-400'
                  }`}
                >
                  {failedImages[imgUrl] ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/90 text-rose-300 p-3 text-center space-y-1.5 select-none">
                      <div className="w-8 h-8 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                        <AlertCircle className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-bold text-rose-200">Image Unavailable</span>
                      <span className="text-[9px] text-slate-400 leading-tight">Link broken or unreachable</span>
                    </div>
                  ) : (
                    <img
                      src={imgUrl}
                      alt={`Event Media ${index + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={() => {
                        setFailedImages((prev) => ({ ...prev, [imgUrl]: true }));
                      }}
                    />
                  )}

                  {/* Gradient Overlay with Badges & Actions */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-slate-950/45 p-2 flex flex-col justify-between">
                    {/* Top Action Bar */}
                    <div className="flex items-center justify-between">
                      {isCover ? (
                        <span className="px-2 py-0.5 bg-purple-600 text-white font-extrabold text-[9px] uppercase tracking-wider rounded-md flex items-center gap-1 shadow-xs">
                          <Star className="w-2.5 h-2.5 fill-current" /> Main Cover
                        </span>
                      ) : !disabled ? (
                        <button
                          type="button"
                          onClick={() => handleSetCover(imgUrl)}
                          className="px-1.5 py-0.5 bg-black/60 hover:bg-purple-600 text-white text-[9px] rounded font-semibold transition-colors flex items-center gap-1 opacity-80 hover:opacity-100 cursor-pointer"
                          title="Set as Main Cover Banner"
                        >
                          <Star className="w-2.5 h-2.5" /> Make Cover
                        </button>
                      ) : (
                        <div />
                      )}

                      {!disabled && (
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="p-1 rounded-full bg-rose-600/90 hover:bg-rose-700 text-white transition-colors shadow-xs cursor-pointer"
                          title="Delete image"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Bottom Label & Status */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-white/90">
                        Photo #{index + 1}
                      </span>
                      {isPending ? (
                        <span className="text-[9px] font-mono text-amber-300 flex items-center gap-0.5 bg-black/40 px-1 rounded">
                          <Loader2 className="w-2.5 h-2.5 animate-spin" /> saving...
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-0.5 bg-black/40 px-1 rounded">
                          <CheckCircle2 className="w-2.5 h-2.5" /> synced
                        </span>
                      )}
                    </div>
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
