import { UseFormSetValue, UseFormWatch } from 'react-hook-form';

interface CartSummaryProps {
  watch: UseFormWatch<any>;
  setValue: UseFormSetValue<any>;
  currentPrice: number;
  currentChildPrice: number;
  totalAmount: number;
  isProcessing: boolean;
  isValid: boolean;
}

const formatCurrency = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);

export function CartSummary({ watch, setValue, currentPrice, currentChildPrice, totalAmount, isProcessing, isValid }: CartSummaryProps) {
  const paxAdult = watch('paxAdult') || 1;
  const paxChild = watch('paxChild') || 0;
  const dpAmount = watch('depositPaid') || 0;

  return (
    <div className="w-full md:w-96 bg-slate-800 p-6 rounded-xl border border-slate-700 flex flex-col">
       <h2 className="text-xl font-bold text-white mb-6 border-b border-slate-700 pb-4">Ringkasan Reservasi</h2>
       
       <div className="flex-1 space-y-4">
          <div className="flex justify-between items-center text-slate-300">
             <span>Pax Dewasa ({paxAdult}x)</span>
             <span>{formatCurrency(paxAdult * currentPrice)}</span>
          </div>
          {paxChild > 0 && (
            <div className="flex justify-between items-center text-slate-300">
               <span>Pax Anak ({paxChild}x)</span>
               <span>{formatCurrency(paxChild * currentChildPrice)}</span>
            </div>
          )}
          
          <div className="border-t border-slate-700 pt-4 mt-4">
             <div className="flex justify-between items-end">
                <span className="text-slate-400">Total Biaya</span>
                <span className="text-2xl font-bold text-emerald-400">{formatCurrency(totalAmount)}</span>
             </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-700">
             <label className="text-sm font-medium text-slate-400 mb-2 block">Nominal Deposit (DP)</label>
             <div className="grid grid-cols-3 gap-2 mb-2">
               <button 
                 type="button" 
                 onClick={() => setValue('depositPaid', 0)} 
                 className={`p-2 rounded text-sm transition-colors border ${dpAmount === 0 ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold' : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'}`}
               >Bayar Nanti</button>
               <button 
                 type="button" 
                 onClick={() => setValue('depositPaid', totalAmount * 0.5)} 
                 className={`p-2 rounded text-sm transition-colors border ${totalAmount > 0 && dpAmount === (totalAmount * 0.5) ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold' : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'}`}
               >DP 50%</button>
               <button 
                 type="button" 
                 onClick={() => setValue('depositPaid', totalAmount)} 
                 className={`p-2 rounded text-sm transition-colors border ${totalAmount > 0 && dpAmount === totalAmount ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold' : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'}`}
               >Full</button>
             </div>
             <input 
                type="number" 
                placeholder="Atau ketik nominal manual" 
                value={dpAmount || ''} 
                onChange={e => setValue('depositPaid', parseFloat(e.target.value) || 0)} 
                className="w-full bg-slate-900 border border-slate-700 p-3 rounded-lg text-white" 
             />
          </div>
       </div>

       <button 
          type="submit"
          disabled={isProcessing || !isValid}
          className="w-full mt-6 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-2"
       >
          {isProcessing ? 'Memproses...' : (isValid ? 'Buat Reservasi' : 'Lengkapi Data')}
       </button>
    </div>
  );
}
