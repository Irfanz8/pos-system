import { Calendar, Image as ImageIcon, Map, Clock } from 'lucide-react';
import { UseFormRegister, FieldErrors, UseFormSetValue } from 'react-hook-form';

interface PackageSelectorProps {
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
  packages: any[];
  selectedDate: string;
  selectedPackageId?: string;
  onDateChange: (date: string) => void;
  onPackageChange: (pkgId: string) => void;
  setValue?: UseFormSetValue<any>;
}

const formatCurrency = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);

export function PackageSelector({ register, errors, packages, selectedDate, selectedPackageId, onDateChange, onPackageChange, setValue }: PackageSelectorProps) {
  
  // Helper for quick date buttons
  const getOffsetDate = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };

  const today = getOffsetDate(0);
  const tomorrow = getOffsetDate(1);

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Date Fast Selector */}
      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
        <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
           <Calendar className="w-4 h-4 text-emerald-400" /> Kapan jadwal keberangkatannya?
        </h3>
        
        <div className="flex flex-wrap items-center gap-2">
           <button type="button" onClick={() => onDateChange(today)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${selectedDate === today ? 'bg-emerald-500 text-white shadow-md' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>Hari ini</button>
           <button type="button" onClick={() => onDateChange(tomorrow)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${selectedDate === tomorrow ? 'bg-emerald-500 text-white shadow-md' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>Besok</button>
           <div className="relative">
              <input 
                 type="date" 
                 {...register('bookingDate')}
                 onChange={(e) => {
                   register('bookingDate').onChange(e);
                   onDateChange(e.target.value);
                 }}
                 style={{ colorScheme: 'dark' }} 
                 className="bg-transparent border border-slate-600 pl-3 pr-2 py-1.5 h-full rounded-lg text-white text-sm outline-none focus:border-emerald-500 min-w-[140px]" 
              />
           </div>
        </div>
        {errors.bookingDate && <p className="text-red-400 text-xs mt-2">{errors.bookingDate.message as string}</p>}
      </div>

      {/* 2. Visual Package Grid */}
      <div>
         <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
            <Map className="w-4 h-4 text-emerald-400" /> Pilih Aktivitas / Wisata
         </h3>
         {errors.activityPackageId && <p className="text-red-400 text-xs mb-3 font-medium bg-red-500/10 p-2 rounded border border-red-500/20">{errors.activityPackageId.message as string}</p>}
         
         <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {packages?.map((p: any) => {
               const isSelected = selectedPackageId === p.id;
               return (
                  <div 
                     key={p.id}
                     onClick={() => onPackageChange(p.id)}
                     className={`cursor-pointer overflow-hidden rounded-xl border-2 transition-all ${isSelected ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'border-slate-700 bg-slate-800 hover:border-slate-500 hover:bg-slate-700/80'}`}
                  >
                     <div className="h-28 bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center relative">
                        {/* Placeholder for Image */}
                        <ImageIcon className="w-8 h-8 text-slate-600 opacity-50" />
                        
                        {/* Fake Duration tag */}
                        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1">
                           <Clock className="w-3 h-3" /> ~2 Jam
                        </div>
                     </div>
                     <div className="p-3">
                        <h4 className={`font-bold text-sm mb-1 ${isSelected ? 'text-emerald-400' : 'text-slate-200'}`}>{p.name}</h4>
                        <p className="text-white font-medium text-sm">{formatCurrency(p.basePrice)}</p>
                     </div>
                  </div>
               );
            })}
         </div>
         {/* Hidden input to satisfy react-hook-form native validation state */}
         <input type="hidden" {...register('activityPackageId')} />
      </div>
    </div>
  );
}
