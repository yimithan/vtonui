import React from 'react';
import { Plus, Trash2, Shirt } from 'lucide-react';
import UploadZone from './UploadZone';
import { GarmentGroup, FileWithPreview } from '../types';

interface GarmentListProps {
  groups: GarmentGroup[];
  onGroupsChange: (groups: GarmentGroup[]) => void;
  disabled?: boolean;
}

const GarmentList: React.FC<GarmentListProps> = ({ groups, onGroupsChange, disabled }) => {
  
  const addGroup = () => {
    const newGroup: GarmentGroup = {
      id: crypto.randomUUID(),
      files: []
    };
    onGroupsChange([...groups, newGroup]);
  };

  const removeGroup = (id: string) => {
    onGroupsChange(groups.filter(g => g.id !== id));
  };

  const updateGroupFiles = (id: string, files: FileWithPreview[]) => {
    onGroupsChange(groups.map(g => g.id === id ? { ...g, files } : g));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-slate-300">
          Garments Queue ({groups.length})
        </label>
        <button
          onClick={addGroup}
          disabled={disabled}
          className="text-xs flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-3 h-3" />
          Add Garment
        </button>
      </div>

      <div className="space-y-4">
        {groups.map((group, index) => (
          <div key={group.id} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 relative group transition-all hover:border-slate-600">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-slate-400">
                <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold">
                  {index + 1}
                </div>
                <span className="text-sm font-medium">Garment #{index + 1}</span>
              </div>
              
              {groups.length > 1 && !disabled && (
                <button
                  onClick={() => removeGroup(group.id)}
                  className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                  title="Remove this garment"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <UploadZone
              label={`Garment Images`}
              multiple
              withDescriptions
              files={group.files}
              onFilesChange={(files) => updateGroupFiles(group.id, files)}
              disabled={disabled}
            />
          </div>
        ))}
      </div>
      
      {groups.length === 0 && (
         <div className="text-center p-8 border-2 border-dashed border-slate-800 rounded-xl">
            <p className="text-slate-500 text-sm">No garments added.</p>
            <button onClick={addGroup} className="mt-2 text-indigo-400 text-sm font-bold hover:underline">Add one now</button>
         </div>
      )}
    </div>
  );
};

export default GarmentList;
