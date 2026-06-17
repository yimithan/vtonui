import React, { useCallback } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { FileWithPreview } from '../types';

const DEFAULT_DESCRIPTION_CHIPS = ['Front', 'Side', 'Rear', 'Detail', 'Close-up'];

interface UploadZoneProps {
  label: string;
  multiple?: boolean;
  files: FileWithPreview[];
  onFilesChange: (files: FileWithPreview[]) => void;
  disabled?: boolean;
  /** Show a per-image description box (with quick-pick chips) under each thumbnail. */
  withDescriptions?: boolean;
  descriptionChips?: string[];
}

const UploadZone: React.FC<UploadZoneProps> = ({
  label,
  multiple = false,
  files,
  onFilesChange,
  disabled,
  withDescriptions = false,
  descriptionChips = DEFAULT_DESCRIPTION_CHIPS,
}) => {
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map((file: File) => ({
        file,
        preview: URL.createObjectURL(file)
      }));

      onFilesChange(multiple ? [...files, ...newFiles] : newFiles);
    }
  }, [files, multiple, onFilesChange]);

  const removeFile = (indexToRemove: number) => {
    onFilesChange(files.filter((_, index) => index !== indexToRemove));
  };

  const updateDescription = (idx: number, value: string) => {
    onFilesChange(files.map((f, i) => (i === idx ? { ...f, description: value } : f)));
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-slate-300">{label}</label>
      
      {/* Drop Zone Area */}
      <div className={`relative border-2 border-dashed rounded-xl transition-colors ${
        disabled 
          ? 'border-slate-700 bg-slate-800/50 cursor-not-allowed' 
          : 'border-slate-600 hover:border-indigo-500 bg-slate-800/50 hover:bg-slate-800'
      }`}>
        <input
          type="file"
          multiple={multiple}
          accept="image/*"
          onChange={handleFileChange}
          disabled={disabled}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
        
        <div className="p-6 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center mb-3">
            <Upload className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-sm text-slate-300 font-medium">
            Click to upload {multiple ? 'images' : 'image'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            JPG, PNG, WEBP up to 10MB
          </p>
        </div>
      </div>

      {/* Previews */}
      {files.length > 0 && (
        <div className={`grid gap-3 ${withDescriptions ? 'grid-cols-2' : multiple ? 'grid-cols-3' : 'grid-cols-1'}`}>
          {files.map((fileObj, idx) => (
            <div key={idx} className="space-y-1.5">
              <div className="relative group rounded-lg overflow-hidden border border-slate-700 bg-slate-800">
                <img
                  src={fileObj.preview}
                  alt="preview"
                  className="w-full h-32 object-cover"
                />
                {!disabled && (
                  <button
                    onClick={() => removeFile(idx)}
                    className="absolute top-1 right-1 p-1 bg-red-500/90 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <div className="absolute bottom-0 inset-x-0 bg-black/60 p-1.5 truncate">
                  <p className="text-[10px] text-slate-300 truncate px-1">
                    {fileObj.file.name}
                  </p>
                </div>
              </div>

              {withDescriptions && (
                <div className="space-y-1">
                  <input
                    type="text"
                    value={fileObj.description || ''}
                    onChange={(e) => updateDescription(idx, e.target.value)}
                    disabled={disabled}
                    placeholder="e.g. front view, side, rear, detail…"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-200 focus:ring-1 focus:ring-indigo-500 outline-none placeholder-slate-600 disabled:opacity-50"
                  />
                  {!disabled && (
                    <div className="flex flex-wrap gap-1">
                      {descriptionChips.map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => updateDescription(idx, chip)}
                          className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-300 hover:bg-indigo-600 hover:text-white transition-colors"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UploadZone;
