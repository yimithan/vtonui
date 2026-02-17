import React, { useMemo, useState } from 'react';
import { Download, Loader2, AlertTriangle, CheckCircle2, Archive } from 'lucide-react';
import { TryOnResult } from '../types';
import JSZip from 'jszip';

interface ResultsGalleryProps {
  results: TryOnResult[];
}

const ResultsGallery: React.FC<ResultsGalleryProps> = ({ results }) => {
  const [isCreatingZip, setIsCreatingZip] = useState(false);

  const finishedResults = useMemo(
    () => results.filter(r => r.status === 'success' && r.generatedImage),
    [results]
  );

  const handleDownloadAll = async () => {
    setIsCreatingZip(true);
    
    try {
      const zip = new JSZip();
      
      // Add each image to the ZIP file
      for (let i = 0; i < finishedResults.length; i++) {
        const result = finishedResults[i];
        
        // Fetch the image data
        const response = await fetch(result.generatedImage!);
        const blob = await response.blob();
        
        // Add to ZIP with filename
        zip.file(`try-on-result-${i + 1}.png`, blob);
      }
      
      // Generate ZIP file
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      
      // Create download link
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = `try-on-results-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL object
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Error creating ZIP file:', error);
      alert('Failed to create ZIP file. Please try again.');
    } finally {
      setIsCreatingZip(false);
    }
  };

  if (results.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500 p-8 min-h-[400px]">
         <p>Results will appear here...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {finishedResults.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleDownloadAll}
            disabled={isCreatingZip}
            className={`px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg ${
              isCreatingZip
                ? 'bg-indigo-500 cursor-wait'
                : 'bg-indigo-600 hover:bg-indigo-500 hover:scale-[1.02] active:scale-[0.98]'
            } text-white`}
          >
            {isCreatingZip ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating ZIP...
              </>
            ) : (
              <>
                <Archive className="w-5 h-5" />
                Download ZIP ({finishedResults.length})
              </>
            )}
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 gap-6">
      {results.map((result, idx) => (
        <div 
          key={`${result.modelId}-${result.garmentId}`} 
          className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 overflow-hidden flex flex-col md:flex-row gap-4"
        >
          {/* Status / Input Column */}
          <div className="w-full md:w-1/3 flex flex-col gap-3">
             <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Result #{idx + 1}</span>
                {result.status === 'success' && <span className="text-xs bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Done</span>}
                {result.status === 'error' && <span className="text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Failed</span>}
                {(result.status === 'analyzing' || result.status === 'generating') && <span className="text-xs bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin"/> Processing</span>}
                {result.status === 'pending' && <span className="text-xs bg-slate-500/10 text-slate-400 px-2 py-0.5 rounded-full">Pending</span>}
             </div>
             
             {/* Model Preview */}
             <div className="aspect-[3/4] bg-slate-900 rounded-lg overflow-hidden relative border border-slate-700">
                <img src={result.modelPreview} alt={`Model reference for result ${idx + 1}`} className="w-full h-full object-cover opacity-70" />
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 text-xs text-white text-center">
                    Model
                </div>
             </div>
             
             {/* Garment Preview */}
             <div className="aspect-[3/4] bg-slate-900 rounded-lg overflow-hidden relative border border-slate-700">
                <img src={result.garmentPreview} alt={`Garment input for result ${idx + 1}`} className="w-full h-full object-cover opacity-70" />
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 text-xs text-white text-center">
                    Garment
                </div>
             </div>
             
             {result.error && (
                <div className="bg-red-500/10 text-red-400 p-3 rounded-lg text-xs border border-red-500/20">
                    {result.error}
                </div>
             )}
          </div>

          {/* Result Output Column */}
          <div className="w-full md:w-2/3 bg-slate-900/50 rounded-xl border border-slate-800 relative min-h-[300px] flex items-center justify-center group">
             {result.generatedImage ? (
                <>
                   <img src={result.generatedImage} alt="Result" className="w-full h-full object-contain max-h-[500px]" />
                   <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-4">
                        <a 
                          href={result.generatedImage} 
                          download={`try-on-result-${idx + 1}.png`}
                          className="bg-white text-slate-900 px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 hover:bg-slate-200 transition-colors shadow-lg"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </a>
                   </div>
                </>
             ) : (
                <div className="flex flex-col items-center justify-center text-slate-600">
                    {result.status === 'pending' ? (
                        <p className="text-sm">Waiting to start...</p>
                    ) : result.status === 'error' ? (
                        <AlertTriangle className="w-8 h-8 opacity-50" />
                    ) : (
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                    )}
                </div>
             )}
          </div>
        </div>
      ))}
      </div>
    </div>
  );
};

export default ResultsGallery;
