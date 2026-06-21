import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, Search, Receipt, ChevronLeft, ChevronRight, RotateCcw, Plus, X, AlertTriangle, Loader2 } from 'lucide-react';
import { db } from '../lib/db';
import { formatCurrency, getCurrentMonth, getMonthName, checkPaymentStatus } from '../utils/calculations';
import type { Pagamento, StatusPagamento, FormaPagamento, Aluno } from '../types';

function navMes(mes: string, d: number) {
  const [y,m] = mes.split('-').map(Number);
  const dt = new Date(y, m-1+d);
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`;
}
const MN = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function calcDias(mesRef: string, diaVenc: number): number {
  const [y,m] = mesRef.split('-').map(Number);
  const venc = new Date(y, m-1, diaVenc);
  const hoje = new Date(); hoje.setHours(0,0,0,0); venc.setHours(0,0,0,0);
  const diff = hoje.getTime() - venc.getTime();
  return diff > 0 ? Math.floor(diff/(1000*60*60*24)) : 0;
}

export function Payments() {
  const [mes, setMes] = useState(getCurrentMonth());
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<StatusPagamento|'todos'>('todos');
  const [confirmPag, setConfirmPag] = useState<Pagamento|null>(null);
  const [confData, setConfData] = useState('');
  const [confForma, setConfForma] = useState<FormaPagamento>('pix');
  const [multaPreview, setMultaPreview] = useState<{pag:Pagamento;aluno:Aluno;dias:number;valorMulta:number;total:number}|null>(null);
  const [showAvulso, setShowAvulso] = useState(false);
  const [avulso, setAvulso] = useState({alunoId:'',mes:getCurrentMonth(),valor:'',status:'pendente' as StatusPagamento,dataPagamento:'',formaPagamento:'pix' as FormaPagamento});
  const [historico, setHistorico] = useState<Pagamento[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [als, pags, hist] = await Promise.all([
      db.alunos.getAll(),
      db.pagamentos.getByMonth(mes),
      db.pagamentos.getAll(),
    ]);
    setAlunos(als);
    setPagamentos(pags);
    setHistorico(hist.filter(p=>p.status==='pago').sort((a,b)=>(b.dataPagamento||'').localeCompare(a.dataPagamento||'')).slice(0,12));
    setLoading(false);
  }, [mes]);

  useEffect(() => { load(); }, [load]);

  const getAluno = (id: string) => alunos.find(a=>a.id===id);

  const gerarMes = async () => {
    setSaving(true);
    const pags = await db.pagamentos.getByMonth(mes);
    const existIds = new Set(pags.map(p=>p.alunoId));
    let n = 0;
    for (const a of alunos) {
      if (!existIds.has(a.id)) {
        await db.pagamentos.add({ alunoId:a.id, mesReferencia:mes, valor:a.valorMensalidade, valorOriginal:a.valorMensalidade, status:'pendente' } as any);
        n++;
      }
    }
    await load();
    setSaving(false);
    alert(n > 0 ? `${n} pagamento(s) gerado(s)!` : 'Todos já têm pagamento neste mês.');
  };

  const confirmarPagamento = async () => {
    if (!confirmPag) return;
    setSaving(true);
    await db.pagamentos.update(confirmPag.id, { ...confirmPag, status:'pago', dataPagamento:confData, formaPagamento:confForma });
    setConfirmPag(null); await load(); setSaving(false);
  };

  const reverter = async (p: Pagamento) => {
    if (!confirm('Reverter para pendente?')) return;
    const al = getAluno(p.alunoId);
    const st = al ? checkPaymentStatus({...p,status:'pendente'}, al.diaVencimento) : 'pendente';
    await db.pagamentos.update(p.id, {...p, status:st, dataPagamento:undefined, formaPagamento:undefined});
    await load();
  };

  const abrirMulta = (p: Pagamento) => {
    const al = getAluno(p.alunoId); if (!al) return;
    const valorOrig = p.valorOriginal || p.valor;
    const dias = calcDias(p.mesReferencia, al.diaVencimento);
    const valorMulta = parseFloat((valorOrig*0.10 + dias*1.0).toFixed(2));
    setMultaPreview({ pag:p, aluno:al, dias, valorMulta, total: valorOrig+valorMulta });
  };

  const confirmarMulta = async () => {
    if (!multaPreview) return;
    const {pag, aluno, dias, valorMulta, total} = multaPreview;
    const valorOrig = pag.valorOriginal || pag.valor;
    setSaving(true);
    await db.pagamentos.update(pag.id, { ...pag, valor:total, valorOriginal:valorOrig, multa:{ valor:valorMulta, motivo:`10% + R$ 1,00/dia (${dias} dia${dias!==1?'s':''} de atraso)`, dataAplicacao:new Date().toISOString().split('T')[0] } });
    setMultaPreview(null); await load(); setSaving(false);
  };

  const removerMulta = async (p: Pagamento) => {
    if (!confirm('Remover multa?')) return;
    await db.pagamentos.update(p.id, {...p, valor:p.valorOriginal||p.valor, multa:undefined});
    await load();
  };

  const saveAvulso = async () => {
    if (!avulso.alunoId) { alert('Selecione um aluno'); return; }
    const al = getAluno(avulso.alunoId);
    const v = parseFloat(avulso.valor)||al?.valorMensalidade||0;
    setSaving(true);
    await db.pagamentos.add({ alunoId:avulso.alunoId, mesReferencia:avulso.mes, valor:v, valorOriginal:v, status:avulso.status, dataPagamento:avulso.status==='pago'?(avulso.dataPagamento||new Date().toISOString().split('T')[0]):undefined, formaPagamento:avulso.status==='pago'?avulso.formaPagamento:undefined } as any);
    setShowAvulso(false); await load(); setSaving(false);
  };

  const lista = pagamentos.filter(p => {
    const al = getAluno(p.alunoId); if (!al) return false;
    if (search && !al.nomeCrianca.toLowerCase().includes(search.toLowerCase())) return false;
    const st = checkPaymentStatus(p, al.diaVencimento);
    if (filtroStatus!=='todos' && st!==filtroStatus) return false;
    return true;
  }).map(p => ({ ...p, status: checkPaymentStatus(p, getAluno(p.alunoId)!.diaVencimento) }))
    .sort((a,b) => (getAluno(a.alunoId)?.nomeCrianca||'').localeCompare(getAluno(b.alunoId)?.nomeCrianca||'','pt-BR'));

  const card = 'bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800';
  const inp = 'w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100';
  const lbl = 'block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1';
  const btnOut = 'flex items-center gap-1.5 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors';

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4 pb-24">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Pagamentos</h1>
        <div className="flex items-center gap-2">
          <button onClick={()=>setMes(navMes(mes,-1))} className={btnOut} style={{padding:'6px 8px'}}><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm font-medium min-w-[90px] text-center capitalize text-gray-800 dark:text-gray-200">{getMonthName(mes)}</span>
          <button onClick={()=>setMes(navMes(mes,1))} className={btnOut} style={{padding:'6px 8px'}}><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={gerarMes} disabled={saving} className={btnOut}><Receipt className="w-4 h-4" /> Gerar mês</button>
        <button onClick={()=>{ setAvulso({alunoId:alunos[0]?.id||'',mes,valor:'',status:'pendente',dataPagamento:new Date().toISOString().split('T')[0],formaPagamento:'pix'}); setShowAvulso(true); }} className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"><Plus className="w-4 h-4" /> Avulso</button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[140px]"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" placeholder="Buscar..." value={search} onChange={e=>setSearch(e.target.value)} className={inp+' pl-9'} /></div>
        <select value={filtroStatus} onChange={e=>setFiltroStatus(e.target.value as any)} className={inp} style={{width:'auto'}}>
          <option value="todos">Todos</option><option value="pago">Pago</option><option value="pendente">Pendente</option><option value="atrasado">Atrasado</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(3)].map((_,i)=><div key={i} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 h-24 animate-pulse" />)}</div>
      ) : lista.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">Nenhum pagamento — clique em "Gerar mês"</div>
      ) : lista.map(p => {
        const al = getAluno(p.alunoId); if (!al) return null;
        const [y,m] = p.mesReferencia.split('-');
        const vencStr = `${String(al.diaVencimento).padStart(2,'0')}/${m}/${y}`;
        const temMulta = !!p.multa;
        const dias = p.status==='atrasado' ? calcDias(p.mesReferencia, al.diaVencimento) : 0;
        return (
          <div key={p.id} className={card+' p-4'}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 font-bold text-sm flex items-center justify-center flex-shrink-0">{al.nomeCrianca[0].toUpperCase()}</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{al.nomeCrianca}</p>
                <p className="text-xs text-gray-400">Venc: {vencStr}{p.status==='pago'?` · ${p.formaPagamento?.toUpperCase()}`:''}</p>
                {p.status==='atrasado' && !temMulta && <p className="text-xs text-red-500 font-medium mt-0.5">{dias} dia{dias!==1?'s':''} em atraso</p>}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-sm text-gray-900 dark:text-white">{formatCurrency(p.valor)}</p>
                {temMulta && <p className="text-xs text-red-500">+{formatCurrency(p.multa!.valor)} multa</p>}
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 inline-block ${p.status==='pago'?'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300':p.status==='atrasado'?'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300':'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300'}`}>{p.status.charAt(0).toUpperCase()+p.status.slice(1)}</span>
              </div>
            </div>
            {temMulta && (
              <div className="mt-2 px-3 py-2 bg-red-50 dark:bg-red-950 rounded-lg border border-red-100 dark:border-red-900">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium text-red-700 dark:text-red-300 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Multa: {formatCurrency(p.multa!.valor)}</p>
                    <p className="text-xs text-red-500 dark:text-red-400">{p.multa!.motivo}</p>
                  </div>
                  {p.status!=='pago' && <button onClick={()=>removerMulta(p)} className="text-xs text-red-500 hover:underline">Remover</button>}
                </div>
              </div>
            )}
            {p.status==='pago' && p.dataPagamento && <p className="text-xs text-gray-400 mt-2">Pago em: {p.dataPagamento.split('-').reverse().join('/')}</p>}
            <div className="flex gap-2 mt-3 justify-end flex-wrap">
              {p.status==='atrasado' && !temMulta && (
                <button onClick={()=>abrirMulta(p)} className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"><AlertTriangle className="w-3.5 h-3.5" /> Multar</button>
              )}
              {p.status==='pago'
                ? <button onClick={()=>reverter(p)} className={btnOut+' !text-xs !px-2.5 !py-1.5'}><RotateCcw className="w-3.5 h-3.5" /> Reverter</button>
                : <button onClick={()=>{ setConfirmPag(p); setConfData(new Date().toISOString().split('T')[0]); setConfForma('pix'); }} className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"><CheckCircle className="w-3.5 h-3.5" /> Confirmar</button>
              }
              <button onClick={async()=>{ if(confirm('Excluir?')){ await db.pagamentos.delete(p.id); await load(); } }} className="text-xs px-2.5 py-1.5 border border-red-200 dark:border-red-800 text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 transition-colors">Excluir</button>
            </div>
          </div>
        );
      })}

      <div className={card+' p-4'}>
        <h3 className="font-semibold text-sm mb-3 text-gray-900 dark:text-white">Histórico de recebimentos</h3>
        {historico.length===0 ? <p className="text-sm text-gray-400 text-center py-4">Nenhum pagamento realizado</p>
          : historico.map(p => {
            const al = getAluno(p.alunoId);
            const [y,m] = p.mesReferencia.split('-');
            return (
              <div key={p.id} className="flex items-center justify-between py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{al?.nomeCrianca||'?'}</p>
                  <p className="text-xs text-gray-400">{MN[parseInt(m)-1]}/{y} · {p.formaPagamento?.toUpperCase()||'-'}</p>
                  {p.multa && <p className="text-xs text-red-400">Incl. multa {formatCurrency(p.multa.valor)}</p>}
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm text-green-600">{formatCurrency(p.valor)}</p>
                  <p className="text-xs text-gray-400">{p.dataPagamento?.split('-').reverse().join('/')||'-'}</p>
                </div>
              </div>
            );
          })}
      </div>

      {/* Modal confirmar */}
      {confirmPag && (
        <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-t-2xl w-full max-w-lg p-5 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4"><h2 className="font-semibold text-lg text-gray-900 dark:text-white">Confirmar pagamento</h2><button onClick={()=>setConfirmPag(null)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button></div>
            <div className="bg-green-50 dark:bg-green-950 rounded-xl p-3 mb-4 text-sm text-green-800 dark:text-green-300"><strong>{getAluno(confirmPag.alunoId)?.nomeCrianca}</strong> · {formatCurrency(confirmPag.valor)}{confirmPag.multa&&<span className="ml-1 text-xs opacity-80">(incl. multa)</span>}</div>
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div><label className={lbl}>Data do recebimento</label><input type="date" value={confData} onChange={e=>setConfData(e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Forma</label><select value={confForma} onChange={e=>setConfForma(e.target.value as FormaPagamento)} className={inp}><option value="pix">PIX</option><option value="dinheiro">Dinheiro</option></select></div>
            </div>
            <button onClick={confirmarPagamento} disabled={saving} className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2">{saving&&<Loader2 className="w-4 h-4 animate-spin" />}Confirmar recebido</button>
          </div>
        </div>
      )}

      {/* Modal multa */}
      {multaPreview && (
        <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-t-2xl w-full max-w-lg p-5 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4"><h2 className="font-semibold text-lg text-gray-900 dark:text-white flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-500" /> Aplicar multa</h2><button onClick={()=>setMultaPreview(null)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button></div>
            <div className="bg-red-50 dark:bg-red-950 rounded-xl p-3 mb-4 text-sm text-red-800 dark:text-red-300"><strong>{multaPreview.aluno.nomeCrianca}</strong><span className="ml-2">{multaPreview.dias} dia{multaPreview.dias!==1?'s':''} em atraso</span></div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-5 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600 dark:text-gray-400"><span>Mensalidade original</span><span>{formatCurrency(multaPreview.pag.valorOriginal||multaPreview.pag.valor)}</span></div>
              <div className="flex justify-between text-red-500"><span>Multa 10%</span><span>+ {formatCurrency((multaPreview.pag.valorOriginal||multaPreview.pag.valor)*0.10)}</span></div>
              <div className="flex justify-between text-red-500"><span>R$ 1,00 × {multaPreview.dias} dia{multaPreview.dias!==1?'s':''}</span><span>+ {formatCurrency(multaPreview.dias*1.0)}</span></div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between font-bold text-gray-900 dark:text-white text-base"><span>Total a cobrar</span><span>{formatCurrency(multaPreview.total)}</span></div>
            </div>
            <div className="flex gap-3">
              <button onClick={()=>setMultaPreview(null)} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-700 dark:text-gray-300">Cancelar</button>
              <button onClick={confirmarMulta} disabled={saving} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2">{saving&&<Loader2 className="w-4 h-4 animate-spin" />}Confirmar multa</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal avulso */}
      {showAvulso && (
        <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-t-2xl w-full max-w-lg p-5 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4"><h2 className="font-semibold text-lg text-gray-900 dark:text-white">Pagamento avulso</h2><button onClick={()=>setShowAvulso(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button></div>
            <div className="space-y-4">
              <div><label className={lbl}>Aluno *</label><select value={avulso.alunoId} onChange={e=>setAvulso({...avulso,alunoId:e.target.value})} className={inp}>{alunos.map(a=><option key={a.id} value={a.id}>{a.nomeCrianca}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={lbl}>Mês</label><input type="month" value={avulso.mes} onChange={e=>setAvulso({...avulso,mes:e.target.value})} className={inp} /></div>
                <div><label className={lbl}>Valor (R$)</label><input type="number" step="0.01" value={avulso.valor} onChange={e=>setAvulso({...avulso,valor:e.target.value})} className={inp} /></div>
                <div><label className={lbl}>Status</label><select value={avulso.status} onChange={e=>setAvulso({...avulso,status:e.target.value as StatusPagamento})} className={inp}><option value="pendente">Pendente</option><option value="pago">Pago</option><option value="atrasado">Atrasado</option></select></div>
                <div><label className={lbl}>Forma</label><select value={avulso.formaPagamento} onChange={e=>setAvulso({...avulso,formaPagamento:e.target.value as FormaPagamento})} className={inp}><option value="pix">PIX</option><option value="dinheiro">Dinheiro</option></select></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={()=>setShowAvulso(false)} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300">Cancelar</button>
                <button onClick={saveAvulso} disabled={saving} className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2">{saving&&<Loader2 className="w-4 h-4 animate-spin" />}Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
