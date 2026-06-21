import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Users, DollarSign, Clock, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { db } from '../lib/db';
import { formatCurrency, getCurrentMonth, getMonthName, checkPaymentStatus } from '../utils/calculations';
import type { User } from '@supabase/supabase-js';

function navMes(mes: string, d: number) {
  const [y, m] = mes.split('-').map(Number);
  const dt = new Date(y, m - 1 + d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
}

export function Dashboard({ user }: { user: User | null }) {
  const [mes, setMes] = useState(getCurrentMonth());
  const [metrics, setMetrics] = useState({ totalAlunos:0, valorPrevisto:0, valorRecebido:0, valorPendente:0, valorAtrasado:0, totalGastos:0, lucroLiquido:0 });
  const [pendentes, setPendentes] = useState<{ nome:string; tel:string; valor:number; status:string }[]>([]);
  const [catChart, setCatChart] = useState<{ cat:string; total:number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (user) load(); }, [mes, user]);

  const load = async () => {
    setLoading(true);
    try {
      const [alunos, pagamentos, gastos] = await Promise.all([
        db.alunos.getAll(),
        db.pagamentos.getByMonth(mes),
        db.gastos.getByMonth(...(([y,m]) => [parseInt(y), parseInt(m)-1])(mes.split('-'))),
      ]);

      const alunoMap = new Map(alunos.map(a => [a.id, a]));
      const pagsComStatus = pagamentos
        .filter(p => alunoMap.has(p.alunoId))
        .map(p => ({ ...p, status: checkPaymentStatus(p, alunoMap.get(p.alunoId)!.diaVencimento) }));

      const valorPrevisto = alunos.reduce((s,a) => s+a.valorMensalidade, 0);
      const valorRecebido = pagsComStatus.filter(p=>p.status==='pago').reduce((s,p)=>s+p.valor,0);
      const valorPendente = pagsComStatus.filter(p=>p.status==='pendente').reduce((s,p)=>s+p.valor,0);
      const valorAtrasado = pagsComStatus.filter(p=>p.status==='atrasado').reduce((s,p)=>s+p.valor,0);
      const totalGastos = gastos.reduce((s,g)=>s+g.valor,0);

      setMetrics({ totalAlunos: alunos.length, valorPrevisto, valorRecebido, valorPendente, valorAtrasado, totalGastos, lucroLiquido: valorRecebido - totalGastos });

      setPendentes(pagsComStatus.filter(p=>p.status!=='pago').map(p => {
        const al = alunoMap.get(p.alunoId)!;
        return { nome: al.nomeCrianca, tel: al.telefone, valor: p.valor, status: p.status };
      }));

      const catMap: Record<string,number> = {};
      gastos.forEach(g => { catMap[g.categoria] = (catMap[g.categoria]||0) + g.valor; });
      setCatChart(Object.entries(catMap).map(([cat,total]) => ({ cat, total })).sort((a,b)=>b.total-a.total));
    } catch (e) {
      console.error('Dashboard load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const pct = metrics.valorPrevisto > 0 ? Math.round(metrics.valorRecebido / metrics.valorPrevisto * 100) : 0;

  const cards = [
    { label:'Alunos', value: String(metrics.totalAlunos), icon: Users, color:'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400' },
    { label:'Previsto', value: formatCurrency(metrics.valorPrevisto), icon: DollarSign, color:'bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400' },
    { label:'Recebido', value: formatCurrency(metrics.valorRecebido), icon: TrendingUp, color:'bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400' },
    { label:'Pendente', value: formatCurrency(metrics.valorPendente), icon: Clock, color:'bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400' },
    { label:'Atrasado', value: formatCurrency(metrics.valorAtrasado), icon: AlertCircle, color:'bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400' },
    { label:'Gastos', value: formatCurrency(metrics.totalGastos), icon: TrendingDown, color:'bg-orange-50 dark:bg-orange-950 text-orange-600 dark:text-orange-400' },
  ];

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-5 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Dashboard</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setMes(navMes(mes,-1))} className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"><ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" /></button>
          <span className="text-sm font-medium min-w-[110px] text-center capitalize text-gray-800 dark:text-gray-200">{getMonthName(mes)}</span>
          <button onClick={() => setMes(navMes(mes,1))} className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"><ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" /></button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3">{[...Array(6)].map((_,i) => <div key={i} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 h-20 animate-pulse" />)}</div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {cards.map(card => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${card.color} flex-shrink-0`}><Icon className="w-5 h-5" /></div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400">{card.label}</p>
                  <p className="text-base font-bold truncate text-gray-900 dark:text-white">{card.value}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600 dark:text-gray-400">Progresso de recebimento</span>
          <span className="font-semibold text-green-600">{pct}%</span>
        </div>
        <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className={`rounded-xl border-2 p-5 ${metrics.lucroLiquido >= 0 ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Lucro Líquido</p>
            <p className={`text-3xl font-bold mt-1 ${metrics.lucroLiquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(metrics.lucroLiquido)}</p>
          </div>
          {metrics.lucroLiquido >= 0 ? <TrendingUp className="w-10 h-10 text-green-500" /> : <TrendingDown className="w-10 h-10 text-red-500" />}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
        <h3 className="font-semibold mb-3 text-sm text-gray-900 dark:text-white">Pendentes / Atrasados</h3>
        {pendentes.length === 0
          ? <p className="text-sm text-gray-400 text-center py-4">Nenhum pendente este mês ✓</p>
          : pendentes.map((p,i) => (
            <div key={i} className="flex items-center justify-between gap-2 py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 font-bold text-sm flex items-center justify-center flex-shrink-0">{p.nome[0].toUpperCase()}</div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate text-gray-900 dark:text-white">{p.nome}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{p.tel}</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium block mb-1 ${p.status==='atrasado' ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' : 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300'}`}>{p.status.charAt(0).toUpperCase()+p.status.slice(1)}</span>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(p.valor)}</p>
              </div>
            </div>
          ))
        }
      </div>

      {catChart.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <h3 className="font-semibold mb-3 text-sm text-gray-900 dark:text-white">Gastos por categoria</h3>
          {catChart.map(c => (
            <div key={c.cat} className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600 dark:text-gray-400 capitalize">{c.cat}</span>
                <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(c.total)}</span>
              </div>
              <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-orange-400 rounded-full" style={{ width: `${Math.round(c.total/catChart[0].total*100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
