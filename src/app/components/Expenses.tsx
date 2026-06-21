import { useState, useEffect, useCallback } from 'react';
import { Trash2, ChevronLeft, ChevronRight, Fuel, Wrench, Droplets, Circle, Shield, FileText, Sparkles, AlertTriangle, MoreHorizontal, Loader2 } from 'lucide-react';
import { db } from '../lib/db';
import { formatCurrency, getCurrentMonth, getMonthName } from '../utils/calculations';
import type { Gasto, CategoriaGasto } from '../types';

const CATS: { key: CategoriaGasto; label: string; Icon: any }[] = [
  { key:'combustível', label:'Combustível', Icon:Fuel },
  { key:'manutenção', label:'Manutenção', Icon:Wrench },
  { key:'troca de óleo', label:'Troca de óleo', Icon:Droplets },
  { key:'pneus', label:'Pneus', Icon:Circle },
  { key:'seguro', label:'Seguro', Icon:Shield },
  { key:'licenciamento/ipva', label:'IPVA/Licenc.', Icon:FileText },
  { key:'lavagem', label:'Lavagem', Icon:Sparkles },
  { key:'multas', label:'Multas', Icon:AlertTriangle },
  { key:'outros', label:'Outros', Icon:MoreHorizontal },
];

function navMes(mes: string, d: number) {
  const [y,m] = mes.split('-').map(Number);
  const dt = new Date(y, m-1+d);
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`;
}

const today = () => new Date().toISOString().split('T')[0];

export function Expenses() {
  const [mes, setMes] = useState(getCurrentMonth());
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [catSel, setCatSel] = useState<CategoriaGasto|''>('');
  const [data, setData] = useState(today());
  const [valor, setValor] = useState('');
  const [desc, setDesc] = useState('');
  const [msg, setMsg] = useState<{text:string;ok:boolean}|null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [y,m] = mes.split('-').map(Number);
    setGastos(await db.gastos.getByMonth(y, m-1));
    setLoading(false);
  }, [mes]);

  useEffect(() => { load(); }, [load]);

  const addGasto = async () => {
    setMsg(null);
    if (!catSel) { setMsg({text:'Selecione uma categoria.',ok:false}); return; }
    if (!data) { setMsg({text:'Informe a data.',ok:false}); return; }
    const v = parseFloat(valor);
    if (!valor || isNaN(v) || v <= 0) { setMsg({text:'Informe um valor válido.',ok:false}); return; }
    setSaving(true);
    await db.gastos.add({ data, categoria: catSel, valor: v, descricao: desc } as any);
    setCatSel(''); setValor(''); setDesc(''); setData(today());
    await load();
    setSaving(false);
    setMsg({text:'Gasto adicionado!',ok:true});
    setTimeout(() => setMsg(null), 2500);
  };

  const delGasto = async (id: string) => {
    if (!confirm('Excluir gasto?')) return;
    await db.gastos.delete(id);
    await load();
  };

  const total = gastos.reduce((s,g) => s+g.valor, 0);
  const porCat = CATS.map(c => ({ ...c, total: gastos.filter(g=>g.categoria===c.key).reduce((s,g)=>s+g.valor,0) })).filter(c=>c.total>0);
  const maxCat = porCat.length ? Math.max(...porCat.map(c=>c.total)) : 1;

  const inp = 'w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100';
  const lbl = 'block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1';

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4 pb-24">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Gastos</h1>

      {/* Formulário */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-4">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">Registrar gasto</p>
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Categoria *</p>
          <div className="grid grid-cols-3 gap-2">
            {CATS.map(({ key, label, Icon }) => (
              <button key={key} type="button" onClick={() => setCatSel(key)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-xs font-medium transition-colors ${catSel===key ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                <Icon className="w-5 h-5" />{label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={lbl}>Data *</label><input type="date" value={data} onChange={e=>setData(e.target.value)} className={inp} /></div>
          <div><label className={lbl}>Valor (R$) *</label><input type="number" step="0.01" min="0.01" value={valor} onChange={e=>setValor(e.target.value)} placeholder="0,00" className={inp} /></div>
        </div>
        <div><label className={lbl}>Descrição</label><input type="text" value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Descreva o gasto..." className={inp} /></div>
        {msg && <p className={`text-sm ${msg.ok ? 'text-green-600' : 'text-red-500'}`}>{msg.text}</p>}
        <button onClick={addGasto} disabled={saving} className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}Adicionar gasto
        </button>
      </div>

      {/* Lista */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex items-center justify-between mb-4">
          <p className="font-semibold text-sm text-gray-900 dark:text-white">Gastos do mês</p>
          <div className="flex items-center gap-2">
            <button onClick={()=>setMes(navMes(mes,-1))} className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"><ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" /></button>
            <span className="text-xs font-medium min-w-[80px] text-center capitalize text-gray-700 dark:text-gray-300">{getMonthName(mes)}</span>
            <button onClick={()=>setMes(navMes(mes,1))} className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"><ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" /></button>
          </div>
        </div>

        {/* Barras por categoria */}
        {porCat.length > 0 && (
          <div className="space-y-2 mb-4 pb-4 border-b border-gray-100 dark:border-gray-800">
            {porCat.sort((a,b)=>b.total-a.total).map(c => (
              <div key={c.key}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600 dark:text-gray-400 capitalize">{c.label}</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(c.total)}</span>
                </div>
                <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-400 rounded-full" style={{ width:`${Math.round(c.total/maxCat*100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="space-y-2">{[...Array(3)].map((_,i)=><div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />)}</div>
        ) : gastos.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-6">Nenhum gasto neste mês</p>
        ) : gastos.map(g => {
          const cat = CATS.find(c=>c.key===g.categoria);
          const Icon = cat?.Icon || MoreHorizontal;
          return (
            <div key={g.id} className="flex items-center gap-3 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
              <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950 text-orange-500 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium capitalize text-gray-900 dark:text-white">{g.categoria}</p>
                <p className="text-xs text-gray-400">{g.data.split('-').reverse().join('/')}{g.descricao?` · ${g.descricao}`:''}</p>
              </div>
              <p className="font-bold text-sm text-orange-600 flex-shrink-0">{formatCurrency(g.valor)}</p>
              <button onClick={()=>delGasto(g.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950 text-red-400 rounded-lg flex-shrink-0"><Trash2 className="w-4 h-4" /></button>
            </div>
          );
        })}

        <div className="flex justify-between items-center pt-3 mt-2 border-t border-gray-100 dark:border-gray-800">
          <span className="text-sm text-gray-600 dark:text-gray-400">Total do mês</span>
          <span className="font-bold text-orange-600 text-lg">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
}
