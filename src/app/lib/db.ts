import { supabase } from './supabase';
import type { Aluno, Pagamento, Gasto } from '../types';

export const db = {
  alunos: {
    getAll: async (): Promise<Aluno[]> => {
      const { data, error } = await supabase.from('alunos').select('*').order('rota_pos');
      if (error) { console.error(error); return []; }
      return (data || []).map(r => ({
        id: r.id,
        nomeCrianca: r.nome_crianca,
        nomeResponsavel: r.nome_responsavel || '',
        telefone: r.telefone || '',
        enderecoEmbarque: r.endereco_embarque || r.endereco || '',
        enderecoDesembarque: r.endereco_desembarque || r.endereco || '',
        enderecoUnico: r.endereco_unico !== false,
        percurso: r.percurso || 'ida e volta',
        escola: r.escola || '',
        turno: r.turno,
        valorMensalidade: Number(r.valor_mensalidade),
        diaVencimento: r.dia_vencimento,
        observacoes: r.observacoes || '',
        rotaPos: r.rota_pos,
        criadoEm: r.criado_em,
      }));
    },
    add: async (a: Omit<Aluno, 'id' | 'criadoEm'>) => {
      const { data: { session } } = await supabase.auth.getSession(); const user = session?.user;
      const { data, error } = await supabase.from('alunos').insert({
        user_id: user!.id,
        nome_crianca: a.nomeCrianca,
        nome_responsavel: a.nomeResponsavel,
        telefone: a.telefone,
        endereco_embarque: a.enderecoEmbarque,
        endereco_desembarque: a.enderecoUnico ? a.enderecoEmbarque : a.enderecoDesembarque,
        endereco_unico: a.enderecoUnico,
        percurso: a.percurso,
        escola: a.escola,
        turno: a.turno,
        valor_mensalidade: a.valorMensalidade,
        dia_vencimento: a.diaVencimento,
        observacoes: a.observacoes,
        rota_pos: a.rotaPos,
      }).select().single();
      if (error) { console.error(error); return null; }
      return data?.id;
    },
    update: async (id: string, a: Partial<Aluno>) => {
      const { error } = await supabase.from('alunos').update({
        nome_crianca: a.nomeCrianca,
        nome_responsavel: a.nomeResponsavel,
        telefone: a.telefone,
        endereco_embarque: a.enderecoEmbarque,
        endereco_desembarque: a.enderecoUnico ? a.enderecoEmbarque : a.enderecoDesembarque,
        endereco_unico: a.enderecoUnico,
        percurso: a.percurso,
        escola: a.escola,
        turno: a.turno,
        valor_mensalidade: a.valorMensalidade,
        dia_vencimento: a.diaVencimento,
        observacoes: a.observacoes,
        rota_pos: a.rotaPos,
      }).eq('id', id);
      if (error) console.error(error);
    },
    delete: async (id: string) => {
      await supabase.from('alunos').delete().eq('id', id);
    },
  },

  pagamentos: {
    getAll: async (): Promise<Pagamento[]> => {
      const { data, error } = await supabase.from('pagamentos').select('*').order('criado_em');
      if (error) { console.error(error); return []; }
      return (data || []).map(r => ({
        id: r.id, alunoId: r.aluno_id, mesReferencia: r.mes_referencia,
        valor: Number(r.valor), valorOriginal: Number(r.valor_original || r.valor),
        status: r.status, dataPagamento: r.data_pagamento || undefined,
        formaPagamento: r.forma_pagamento || undefined,
        multa: r.multa_valor ? { valor: Number(r.multa_valor), motivo: r.multa_motivo || '', dataAplicacao: r.multa_data || '' } : undefined,
        observacoes: r.observacoes || '', criadoEm: r.criado_em,
      }));
    },
    getByMonth: async (mes: string): Promise<Pagamento[]> => {
      const { data, error } = await supabase.from('pagamentos').select('*').eq('mes_referencia', mes);
      if (error) { console.error(error); return []; }
      return (data || []).map(r => ({
        id: r.id, alunoId: r.aluno_id, mesReferencia: r.mes_referencia,
        valor: Number(r.valor), valorOriginal: Number(r.valor_original || r.valor),
        status: r.status, dataPagamento: r.data_pagamento || undefined,
        formaPagamento: r.forma_pagamento || undefined,
        multa: r.multa_valor ? { valor: Number(r.multa_valor), motivo: r.multa_motivo || '', dataAplicacao: r.multa_data || '' } : undefined,
        observacoes: r.observacoes || '', criadoEm: r.criado_em,
      }));
    },
    add: async (p: Omit<Pagamento, 'id' | 'criadoEm'>) => {
      const { data: { session } } = await supabase.auth.getSession(); const user = session?.user;
      const { error } = await supabase.from('pagamentos').insert({
        user_id: user!.id, aluno_id: p.alunoId, mes_referencia: p.mesReferencia,
        valor: p.valor, valor_original: p.valorOriginal || p.valor, status: p.status,
        data_pagamento: p.dataPagamento || null, forma_pagamento: p.formaPagamento || null,
        multa_valor: p.multa?.valor || null, multa_motivo: p.multa?.motivo || null,
        multa_data: p.multa?.dataAplicacao || null,
      });
      if (error) console.error(error);
    },
    update: async (id: string, p: Partial<Pagamento>) => {
      const { error } = await supabase.from('pagamentos').update({
        valor: p.valor, valor_original: p.valorOriginal, status: p.status,
        data_pagamento: p.dataPagamento || null, forma_pagamento: p.formaPagamento || null,
        multa_valor: p.multa?.valor || null, multa_motivo: p.multa?.motivo || null,
        multa_data: p.multa?.dataAplicacao || null,
      }).eq('id', id);
      if (error) console.error(error);
    },
    delete: async (id: string) => { await supabase.from('pagamentos').delete().eq('id', id); },
  },

  gastos: {
    getAll: async (): Promise<Gasto[]> => {
      const { data, error } = await supabase.from('gastos').select('*').order('data', { ascending: false });
      if (error) { console.error(error); return []; }
      return (data || []).map(r => ({ id: r.id, data: r.data, categoria: r.categoria, valor: Number(r.valor), descricao: r.descricao || '', criadoEm: r.criado_em }));
    },
    getByMonth: async (ano: number, mes: number): Promise<Gasto[]> => {
      const start = `${ano}-${String(mes + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(ano, mes + 1, 0).getDate();
      const end = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      const { data, error } = await supabase.from('gastos').select('*').gte('data', start).lte('data', end).order('data', { ascending: false });
      if (error) { console.error(error); return []; }
      return (data || []).map(r => ({ id: r.id, data: r.data, categoria: r.categoria, valor: Number(r.valor), descricao: r.descricao || '', criadoEm: r.criado_em }));
    },
    add: async (g: Omit<Gasto, 'id' | 'criadoEm'>) => {
      const { data: { session } } = await supabase.auth.getSession(); const user = session?.user;
      const { error } = await supabase.from('gastos').insert({ user_id: user!.id, data: g.data, categoria: g.categoria, valor: g.valor, descricao: g.descricao });
      if (error) console.error(error);
    },
    delete: async (id: string) => { await supabase.from('gastos').delete().eq('id', id); },
  },

  profile: {
    get: async () => {
      const { data: { session } } = await supabase.auth.getSession(); const user = session?.user;
      if (!user) return null;
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      return data;
    },
    update: async (nome: string) => {
      const { data: { session } } = await supabase.auth.getSession(); const user = session?.user;
      if (!user) return;
      await supabase.from('profiles').update({ nome }).eq('id', user.id);
    },
  },
};
