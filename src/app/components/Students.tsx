import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, X, Search, Eye, GripVertical, Loader2, MapPin, ArrowRight, ArrowLeft, ArrowLeftRight } from 'lucide-react';
import { db } from '../lib/db';
import { formatCurrency } from '../utils/calculations';
import type { Aluno, Turno, Percurso } from '../types';

const emptyForm = (): Omit<Aluno,'id'|'criadoEm'|'rotaPos'> => ({
  nomeCrianca:'', nomeResponsavel:'', telefone:'',
  enderecoEmbarque:'', enderecoDesembarque:'', enderecoUnico:true,
  percurso:'ida e volta',
  escola:'', turno:'manhã', valorMensalidade:0, diaVencimento:5, observacoes:'',
});

const MN = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

const PERCURSO_OPTS: { value: Percurso; label: string; Icon: any; color: string }[] = [
  { value:'ida e volta', label:'Ida e volta', Icon:ArrowLeftRight, color:'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
  { value:'só ida', label:'Só ida', Icon:ArrowRight, color:'bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800' },
  { value:'só volta', label:'Só volta', Icon:ArrowLeft, color:'bg-orange-50 dark:bg-orange-950 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800' },
];

const percursoIcon = (p: Percurso) => {
  if (p === 'só ida') return <ArrowRight className="w-3 h-3" />;
  if (p === 'só volta') return <ArrowLeft className="w-3 h-3" />;
  return <ArrowLeftRight className="w-3 h-3" />;
};
const percursoColor = (p: Percurso) => {
  if (p === 'só ida') return 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300';
  if (p === 'só volta') return 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300';
  return 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300';
};

export function Students() {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState<Aluno|null>(null);
  const [editingId, setEditingId] = useState<string|null>(null);
  const [search, setSearch] = useState('');
  const [filtroTurno, setFiltroTurno] = useState<''|'manhã'|'tarde'>('');
  const [filtroPercurso, setFiltroPercurso] = useState<''|Percurso>('');
  const [ordem, setOrdem] = useState<'rota'|'alfa'>('rota');
  const [formData, setFormData] = useState(emptyForm());
  const [dragId, setDragId] = useState<string|null>(null);
  const [dragOver, setDragOver] = useState<string|null>(null);
  const [histPags, setHistPags] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setAlunos(await db.alunos.getAll());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => { setFormData(emptyForm()); setEditingId(null); setShowForm(false); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await db.alunos.update(editingId, formData);
      } else {
        const maxRota = alunos.length ? Math.max(...alunos.map(a=>a.rotaPos||0)) : 0;
        const newId = await db.alunos.add({ ...formData, rotaPos: maxRota+1 });
        if (!newId) {
          alert('Não foi possível cadastrar o aluno. Verifique sua conexão e tente novamente.');
          setSaving(false);
          return;
        }
        if (formData.valorMensalidade > 0) {
          const mes = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}`;
          const pags = await db.pagamentos.getByMonth(mes);
          if (!pags.some(p => p.alunoId === newId)) {
            await db.pagamentos.add({ alunoId: newId, mesReferencia: mes, valor: formData.valorMensalidade, valorOriginal: formData.valorMensalidade, status: 'pendente' } as any);
          }
        }
      }
      await load();
      resetForm();
    } catch (err) {
      console.error('Erro ao salvar aluno:', err);
      alert('Ocorreu um erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (a: Aluno) => { setFormData(a); setEditingId(a.id); setShowForm(true); };
  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este aluno? Todos os pagamentos serão removidos.')) return;
    await db.alunos.delete(id); await load();
  };
  const handleDrop = async (targetId: string) => {
    if (!dragId || dragId===targetId) { setDragId(null); setDragOver(null); return; }
    const src = alunos.find(a=>a.id===dragId)!;
    const tgt = alunos.find(a=>a.id===targetId)!;
    await Promise.all([db.alunos.update(src.id,{rotaPos:tgt.rotaPos}), db.alunos.update(tgt.id,{rotaPos:src.rotaPos})]);
    setDragId(null); setDragOver(null); await load();
  };
  const verAluno = async (a: Aluno) => {
    setShowDetail(a);
    const all = await db.pagamentos.getAll();
    setHistPags(all.filter(p=>p.alunoId===a.id).sort((a,b)=>b.mesReferencia.localeCompare(a.mesReferencia)).slice(0,8));
  };

  const canDrag = ordem==='rota' && !search && !filtroTurno && !filtroPercurso;

  let lista = alunos.filter(a => {
    if (search && !a.nomeCrianca.toLowerCase().includes(search.toLowerCase()) && !a.nomeResponsavel.toLowerCase().includes(search.toLowerCase())) return false;
    if (filtroTurno && a.turno!==filtroTurno) return false;
    if (filtroPercurso && a.percurso!==filtroPercurso) return false;
    return true;
  });
  if (ordem==='rota') lista = lista.slice().sort((a,b)=>(a.rotaPos||999)-(b.rotaPos||999));
  else lista = lista.slice().sort((a,b)=>a.nomeCrianca.localeCompare(b.nomeCrianca,'pt-BR'));

  const inp = 'w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100';
  const lbl = 'block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1';

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Alunos <span className="text-sm text-gray-400 font-normal">({alunos.length})</span></h1>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"><Plus className="w-4 h-4" /> Novo aluno</button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[120px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Buscar..." value={search} onChange={e=>setSearch(e.target.value)} className={inp+' pl-9'} />
        </div>
        <select value={filtroTurno} onChange={e=>setFiltroTurno(e.target.value as any)} className={inp} style={{width:'auto'}}>
          <option value="">Todos turnos</option><option value="manhã">Manhã</option><option value="tarde">Tarde</option>
        </select>
        <select value={filtroPercurso} onChange={e=>setFiltroPercurso(e.target.value as any)} className={inp} style={{width:'auto'}}>
          <option value="">Todos percursos</option>
          <option value="ida e volta">Ida e volta</option>
          <option value="só ida">Só ida</option>
          <option value="só volta">Só volta</option>
        </select>
        <select value={ordem} onChange={e=>setOrdem(e.target.value as any)} className={inp} style={{width:'auto'}}>
          <option value="rota">Rota</option><option value="alfa">A-Z</option>
        </select>
      </div>
      {canDrag && <p className="text-xs text-gray-400 dark:text-gray-500 text-center">Arraste para reordenar a rota</p>}

      {loading ? (
        <div className="space-y-2">{[...Array(3)].map((_,i)=><div key={i} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 h-16 animate-pulse" />)}</div>
      ) : lista.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">{search ? 'Nenhum aluno encontrado' : 'Nenhum aluno cadastrado'}</div>
      ) : (
        <div className="space-y-2">
          {lista.map(aluno => (
            <div key={aluno.id} draggable={canDrag}
              onDragStart={()=>setDragId(aluno.id)} onDragOver={e=>{e.preventDefault();setDragOver(aluno.id)}}
              onDragLeave={()=>setDragOver(null)} onDrop={()=>handleDrop(aluno.id)}
              className={`bg-white dark:bg-gray-900 rounded-xl border p-4 flex items-center gap-3 transition-colors ${dragOver===aluno.id?'border-green-400 bg-green-50 dark:bg-green-950':'border-gray-200 dark:border-gray-800'}`}>
              {canDrag && <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0 cursor-grab" />}
              {ordem==='rota' && <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center flex-shrink-0">{aluno.rotaPos}</div>}
              <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 font-bold text-sm flex items-center justify-center flex-shrink-0">{aluno.nomeCrianca[0].toUpperCase()}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{aluno.nomeCrianca}</p>
                  <span className={`inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${percursoColor(aluno.percurso)}`}>
                    {percursoIcon(aluno.percurso)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{aluno.escola} · <span className="capitalize">{aluno.turno}</span> · {formatCurrency(aluno.valorMensalidade)}/mês</p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={()=>verAluno(aluno)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"><Eye className="w-4 h-4" /></button>
                <button onClick={()=>handleEdit(aluno)} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950 text-blue-600"><Pencil className="w-4 h-4" /></button>
                <button onClick={()=>handleDelete(aluno.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail */}
      {showDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-t-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Detalhes</h2>
              <button onClick={()=>setShowDetail(null)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 font-bold text-lg flex items-center justify-center">{showDetail.nomeCrianca[0].toUpperCase()}</div>
              <div>
                <p className="font-bold text-base text-gray-900 dark:text-white">{showDetail.nomeCrianca}</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400">{showDetail.escola} · <span className="capitalize">{showDetail.turno}</span></p>
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${percursoColor(showDetail.percurso)}`}>
                    {percursoIcon(showDetail.percurso)} {showDetail.percurso}
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm mb-4 pb-4 border-b border-gray-100 dark:border-gray-800">
              <div><p className="text-xs text-gray-400 uppercase tracking-wide">Responsável</p><p className="font-medium mt-0.5 text-gray-900 dark:text-white">{showDetail.nomeResponsavel||'-'}</p></div>
              <div><p className="text-xs text-gray-400 uppercase tracking-wide">Telefone</p><p className="font-medium mt-0.5 text-gray-900 dark:text-white">{showDetail.telefone||'-'}</p></div>
              <div><p className="text-xs text-gray-400 uppercase tracking-wide">Mensalidade</p><p className="font-medium mt-0.5 text-gray-900 dark:text-white">{formatCurrency(showDetail.valorMensalidade)}</p></div>
              <div><p className="text-xs text-gray-400 uppercase tracking-wide">Vencimento</p><p className="font-medium mt-0.5 text-gray-900 dark:text-white">Dia {showDetail.diaVencimento}</p></div>
              <div className="col-span-2">
                <p className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1"><MapPin className="w-3 h-3" /> Embarque</p>
                <p className="font-medium mt-0.5 text-gray-900 dark:text-white">{showDetail.enderecoEmbarque||'-'}</p>
              </div>
              {!showDetail.enderecoUnico && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1"><MapPin className="w-3 h-3" /> Desembarque</p>
                  <p className="font-medium mt-0.5 text-gray-900 dark:text-white">{showDetail.enderecoDesembarque||'-'}</p>
                </div>
              )}
              {showDetail.observacoes && <div className="col-span-2"><p className="text-xs text-gray-400 uppercase tracking-wide">Obs</p><p className="mt-0.5 text-gray-700 dark:text-gray-300">{showDetail.observacoes}</p></div>}
            </div>
            <p className="text-sm font-semibold mb-3 text-gray-900 dark:text-white">Histórico de pagamentos</p>
            {histPags.length === 0 ? <p className="text-sm text-gray-400 text-center py-4">Sem histórico</p> : histPags.map(p => {
              const [y,m] = p.mesReferencia.split('-');
              return (
                <div key={p.id} className="flex items-center justify-between py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{MN[parseInt(m)-1]}/{y}</p>
                    <p className="text-xs text-gray-400">Venc: dia {showDetail.diaVencimento}/{m}/{y}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.status==='pago'?'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300':p.status==='atrasado'?'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300':'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300'}`}>{p.status.charAt(0).toUpperCase()+p.status.slice(1)}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(p.valor)}</p>
                    {p.status==='pago' && <p className="text-xs text-gray-400">{p.dataPagamento?.split('-').reverse().join('/')||'-'} · {p.formaPagamento?.toUpperCase()||'-'}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-t-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border-t border-gray-200 dark:border-gray-700">
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{editingId ? 'Editar Aluno' : 'Novo Aluno'}</h2>
              <button onClick={resetForm} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className={lbl}>Nome da Criança *</label><input required type="text" value={formData.nomeCrianca} onChange={e=>setFormData({...formData,nomeCrianca:e.target.value})} className={inp} /></div>
                <div className="col-span-2"><label className={lbl}>Responsável</label><input type="text" value={formData.nomeResponsavel} onChange={e=>setFormData({...formData,nomeResponsavel:e.target.value})} className={inp} /></div>
                <div><label className={lbl}>Telefone</label><input type="tel" value={formData.telefone} onChange={e=>setFormData({...formData,telefone:e.target.value})} className={inp} /></div>
                <div><label className={lbl}>Escola</label><input type="text" value={formData.escola} onChange={e=>setFormData({...formData,escola:e.target.value})} className={inp} /></div>
                <div><label className={lbl}>Turno</label>
                  <select value={formData.turno} onChange={e=>setFormData({...formData,turno:e.target.value as Turno})} className={inp}>
                    <option value="manhã">Manhã</option><option value="tarde">Tarde</option>
                  </select>
                </div>
                <div><label className={lbl}>Mensalidade (R$)</label><input type="number" min="0" step="0.01" value={formData.valorMensalidade} onChange={e=>setFormData({...formData,valorMensalidade:parseFloat(e.target.value)||0})} className={inp} /></div>
                <div><label className={lbl}>Dia Vencimento</label><input type="number" min="1" max="31" value={formData.diaVencimento} onChange={e=>setFormData({...formData,diaVencimento:parseInt(e.target.value)||1})} className={inp} /></div>
              </div>

              {/* Percurso */}
              <div>
                <label className={lbl}>Percurso</label>
                <div className="grid grid-cols-3 gap-2">
                  {PERCURSO_OPTS.map(opt => {
                    const Icon = opt.Icon;
                    const selected = formData.percurso === opt.value;
                    return (
                      <button key={opt.value} type="button" onClick={() => setFormData({...formData, percurso: opt.value})}
                        className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-xs font-medium transition-colors ${selected ? opt.color + ' border-2' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                        <Icon className="w-5 h-5" />{opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Endereço */}
              <div>
                <label className={lbl}>Endereço de embarque</label>
                <input type="text" value={formData.enderecoEmbarque} onChange={e=>setFormData({...formData,enderecoEmbarque:e.target.value})} placeholder="Rua, número, bairro" className={inp} />
              </div>

              {/* Toggle endereço único */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <button type="button" onClick={() => setFormData({...formData, enderecoUnico: !formData.enderecoUnico})}
                  className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 relative ${formData.enderecoUnico ? 'bg-gray-300 dark:bg-gray-600' : 'bg-green-500'}`}>
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${formData.enderecoUnico ? 'left-1' : 'left-5'}`} />
                </button>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Endereço de desembarque diferente</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Ative se a criança é deixada em local diferente</p>
                </div>
              </div>

              {!formData.enderecoUnico && (
                <div>
                  <label className={lbl}>Endereço de desembarque</label>
                  <input type="text" value={formData.enderecoDesembarque} onChange={e=>setFormData({...formData,enderecoDesembarque:e.target.value})} placeholder="Rua, número, bairro" className={inp} />
                </div>
              )}

              <div><label className={lbl}>Observações</label><textarea rows={2} value={formData.observacoes} onChange={e=>setFormData({...formData,observacoes:e.target.value})} className={inp+' resize-none'} /></div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={resetForm} className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}{editingId ? 'Atualizar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
