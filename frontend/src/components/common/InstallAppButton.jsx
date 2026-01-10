import { Smartphone, Download } from 'lucide-react';

export default function InstallButton({onDownloadClick}) {
 
  return (
    <div className="z-50 bg-white dark:bg-neutral-900 border-t border-purple-200 dark:border-purple-800/30 p-4">
      <button
        onClick={onDownloadClick}
        className="group relative w-full flex items-center justify-center gap-3 py-4 font-bold text-white 
                   bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-600 
                   hover:from-purple-800 hover:to-indigo-700
                   active:scale-[0.97] transition-all duration-200 
                   rounded-2xl shadow-xl shadow-purple-500/30"
      >
        {/* Lucide Smartphone icon represents the Android device */}
        <Smartphone className="w-6 h-6 group-hover:rotate-12 transition-transform" strokeWidth={2.5} />
        
        <span className="text-lg tracking-tight">Install OTArena App</span>
        
        <Download className="w-5 h-5 opacity-70 group-hover:translate-y-1 transition-transform" />

        {/* Glossy overlay effect */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
      </button>
      
      <p className="text-center text-[10px] uppercase tracking-widest text-purple-400 dark:text-purple-500 font-bold mt-3">
        Native Android Experience
      </p>
    </div>
  );
}