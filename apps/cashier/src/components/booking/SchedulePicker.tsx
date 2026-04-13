import { Clock, Info } from 'lucide-react';
import { UseFormSetValue, UseFormWatch } from 'react-hook-form';

interface SchedulePickerProps {
  loading: boolean;
  availability: any[];
  setValue: UseFormSetValue<any>;
  watch: UseFormWatch<any>;
}

export function SchedulePicker({ loading, availability, setValue, watch }: SchedulePickerProps) {
  const selectedSessionId = watch('sessionTimeId');
  const manualTime = watch('manualTime');

  const handleSelectSession = (id: string) => {
     setValue('sessionTimeId', id, { shouldValidate: true });
     setValue('manualTime', '', { shouldValidate: true });
  };

  const handleManualTime = (val: string) => {
     setValue('sessionTimeId', 'manual', { shouldValidate: true });
     setValue('manualTime', val, { shouldValidate: true });
  };

  return (
    <div>
      <h3 className="text-sm font-medium text-slate-400 mb-3 block flex items-center gap-2">
         <Clock className="w-4 h-4 text-emerald-400" /> Waktu Keberangkatan
      </h3>
      {loading ? (
        <div className="text-emerald-400 text-sm animate-pulse bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">Mengecek ketersediaan waktu untuk tanggal ini...</div>
      ) : (
        <div className="space-y-4">
          {availability && availability.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {availability.map((session: any) => {
                const isSelected = selectedSessionId === session.id;
                return (
                 <button 
                   key={session.id} 
                   type="button"
                   disabled={!session.isAvailable}
                   onClick={() => handleSelectSession(session.id)}
                   className={`px-4 py-2 rounded-full border-2 transition-all flex flex-col items-center ${isSelected ? 'bg-emerald-500 border-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]' : session.isAvailable ? 'bg-slate-700/50 border-slate-600 text-slate-300 hover:border-emerald-500/50' : 'bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed grayscale'}`}
                 >
                    <span className="font-bold text-sm">{session.startTime} {session.label && `(${session.label})`}</span>
                    {session.isAvailable ? (
                        <span className={`text-[10px] mt-0.5 ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>Sisa: {session.remainingCapacity}</span>
                    ) : (
                        <span className="text-[10px] mt-0.5 text-red-500 font-bold">Terisi Penuh</span>
                    )}
                 </button>
                )
              })}
            </div>
          )}
          
          <div className={`bg-slate-700 p-4 rounded-xl border-2 transition-all flex items-center justify-between gap-4 ${selectedSessionId === 'manual' ? 'border-emerald-500 bg-emerald-500/10' : 'border-transparent'}`}>
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
                    <Info className="w-4 h-4 text-slate-400" />
                </div>
                <p className="text-slate-300 text-xs max-w-[150px] font-medium leading-tight">Gunakan sesi kustom (manual) jika jadwal bebas.</p>
             </div>
             
             <div className="flex flex-col items-end gap-1">
                <input 
                   type="time" 
                   style={{ colorScheme: 'dark' }} 
                   value={manualTime || ''} 
                   onChange={e => handleManualTime(e.target.value)}
                   onClick={() => setValue('sessionTimeId', 'manual', { shouldValidate: true })}
                   className="bg-slate-900 border border-slate-600 focus:border-emerald-500 outline-none px-3 py-1.5 rounded-lg text-white font-bold cursor-pointer" 
                />
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
