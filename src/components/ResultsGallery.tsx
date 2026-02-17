import React from 'react';
import { Download, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { TryOnResult } from '../types';

interface ResultsGalleryProps {
  results: TryOnResult[];
}

const ResultsGallery: React.FC<ResultsGalleryProps> = ({ results }) => {
  if (results.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500 p-8 min-h-[400px]">
         <p>Results will appear here...</p>
      </div>
    );
  }

  return (
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
                <img src={result.modelPreview} alt="Model Input" className="w-full h-full object-cover opacity-70" />
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 text-xs text-white text-center">
                    Model
                </div>
             </div>
             
             {/* Garment Preview */}
             <div className="aspect-[3/4] bg-slate-900 rounded-lg overflow-hidden relative border border-slate-700">
                <img src={result.garmentPreview} alt="Garment Input" className="w-full h-full object-cover opacity-70" />
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
  );
};

export default ResultsGallery;
