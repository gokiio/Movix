import { Pagamento, StatusPagamento } from '../types';
import { storage } from './storage';

export const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export const formatDate = (date: string): string => {
  if (!date) return '-';
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y}`;
};

export const getCurrentMonth = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export const getMonthName = (mesReferencia: string): string => {
  const [year, month] = mesReferencia.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
};

export const checkPaymentStatus = (pagamento: Pagamento, diaVencimento: number): StatusPagamento => {
  if (pagamento.status === 'pago') return 'pago';
  const [year, month] = pagamento.mesReferencia.split('-');
  const vencimento = new Date(parseInt(year), parseInt(month) - 1, diaVencimento);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return hoje > vencimento ? 'atrasado' : 'pendente';
};

export interface DashboardMetrics {
  totalAlunos: number;
  valorPrevisto: number;
  valorRecebido: number;
  valorPendente: number;
  valorAtrasado: number;
  totalGastos: number;
  lucroLiquido: number;
}

export const calculateDashboardMetrics = (mesReferencia: string): DashboardMetrics => {
  const alunos = storage.alunos.getAll();
  const pagamentos = storage.pagamentos.getByMonth(mesReferencia);
  const [year, month] = mesReferencia.split('-');
  const gastos = storage.gastos.getByMonth(parseInt(year), parseInt(month) - 1);

  const valorPrevisto = alunos.reduce((sum, a) => sum + a.valorMensalidade, 0);
  const valorRecebido = pagamentos.filter(p => p.status === 'pago').reduce((sum, p) => sum + p.valor, 0);
  const valorPendente = pagamentos.filter(p => p.status === 'pendente').reduce((sum, p) => sum + p.valor, 0);
  const valorAtrasado = pagamentos.filter(p => p.status === 'atrasado').reduce((sum, p) => sum + p.valor, 0);
  const totalGastos = gastos.reduce((sum, g) => sum + g.valor, 0);

  return {
    totalAlunos: alunos.length,
    valorPrevisto, valorRecebido, valorPendente, valorAtrasado, totalGastos,
    lucroLiquido: valorRecebido - totalGastos,
  };
};

export const initializeMonthlyPayments = (mesReferencia: string) => {
  const alunos = storage.alunos.getAll();
  const existentes = storage.pagamentos.getByMonth(mesReferencia);
  alunos.forEach(aluno => {
    if (!existentes.some(p => p.alunoId === aluno.id)) {
      storage.pagamentos.add({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        alunoId: aluno.id, mesReferencia,
        valor: aluno.valorMensalidade,
        valorOriginal: aluno.valorMensalidade,
        status: 'pendente',
        criadoEm: new Date().toISOString(),
      });
    }
  });
};
