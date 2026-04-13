import { Users, Phone, User as UserIcon } from 'lucide-react';
import { UseFormRegister, FieldErrors, UseFormSetValue, UseFormWatch } from 'react-hook-form';

interface GuestFormProps {
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
  setValue: UseFormSetValue<any>;
  watch: UseFormWatch<any>;
}

export function GuestForm({ register, errors, setValue, watch }: GuestFormProps) {
  const paxAdult = watch('paxAdult') || 1;
  const paxChild = watch('paxChild') || 0;

  return (
    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <Users className="w-5 h-5 text-emerald-400" /> Detail Peserta & Pemesan
      </h2>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="text-sm font-medium text-slate-400 mb-1 block">Dewasa</label>
          <div className="flex items-center gap-3">
            <button 
              type="button" 
              onClick={() => setValue('paxAdult', Math.max(1, paxAdult - 1))} 
              className="w-10 h-10 rounded-lg bg-slate-700 text-white font-bold"
            >-</button>
            <input 
              type="number" 
              {...register('paxAdult', { valueAsNumber: true })} 
              readOnly 
              className="w-16 bg-transparent text-white text-center font-bold text-xl outline-none" 
            />
            <button 
              type="button" 
              onClick={() => setValue('paxAdult', paxAdult + 1)} 
              className="w-10 h-10 rounded-lg bg-slate-700 text-white font-bold"
            >+</button>
          </div>
          {errors.paxAdult && <p className="text-red-400 text-xs mt-1">{errors.paxAdult.message as string}</p>}
        </div>
        
        <div>
          <label className="text-sm font-medium text-slate-400 mb-1 block">Anak-anak</label>
          <div className="flex items-center gap-3">
            <button 
              type="button" 
              onClick={() => setValue('paxChild', Math.max(0, paxChild - 1))} 
              className="w-10 h-10 rounded-lg bg-slate-700 text-white font-bold"
            >-</button>
            <input 
              type="number" 
              {...register('paxChild', { valueAsNumber: true })} 
              readOnly 
              className="w-16 bg-transparent text-white text-center font-bold text-xl outline-none" 
            />
            <button 
              type="button" 
              onClick={() => setValue('paxChild', paxChild + 1)} 
              className="w-10 h-10 rounded-lg bg-slate-700 text-white font-bold"
            >+</button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="relative">
            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input 
              type="text" 
              placeholder="Nama Perwakilan Pemesan" 
              {...register('guestName')} 
              className="w-full bg-slate-900 border border-slate-700 p-3 pl-10 rounded-lg text-white" 
            />
          </div>
          {errors.guestName && <p className="text-red-400 text-xs mt-1">{errors.guestName.message as string}</p>}
        </div>
        <div>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input 
              type="tel" 
              placeholder="Nomor WhatsApp" 
              {...register('guestPhone')} 
              className="w-full bg-slate-900 border border-slate-700 p-3 pl-10 rounded-lg text-white" 
            />
          </div>
          {errors.guestPhone && <p className="text-red-400 text-xs mt-1">{errors.guestPhone.message as string}</p>}
          <p className="text-xs text-slate-500 mt-1">Digunakan untuk mengirim e-ticket dan form digital waiver.</p>
        </div>
      </div>
    </div>
  );
}
