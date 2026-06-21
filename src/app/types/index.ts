export type Turno = 'manhã' | 'tarde';
export type StatusPagamento = 'pago' | 'pendente' | 'atrasado';
export type FormaPagamento = 'pix' | 'dinheiro';
export type Percurso = 'ida e volta' | 'só ida' | 'só volta';
export type CategoriaGasto =
  | 'combustível' | 'manutenção' | 'troca de óleo' | 'pneus'
  | 'seguro' | 'licenciamento/ipva' | 'lavagem' | 'multas' | 'outros';

export interface Aluno {
  id: string;
  nomeCrianca: string;
  nomeResponsavel: string;
  telefone: string;
  enderecoEmbarque: string;
  enderecoDesembarque: string;
  enderecoUnico: boolean;
  percurso: Percurso;
  escola: string;
  turno: Turno;
  valorMensalidade: number;
  diaVencimento: number;
  observacoes?: string;
  rotaPos: number;
  criadoEm: string;
}

export interface Multa {
  valor: number;
  motivo: string;
  dataAplicacao: string;
}

export interface Pagamento {
  id: string;
  alunoId: string;
  mesReferencia: string;
  valor: number;
  valorOriginal: number;
  multa?: Multa;
  status: StatusPagamento;
  dataPagamento?: string;
  formaPagamento?: FormaPagamento;
  observacoes?: string;
  criadoEm: string;
}

export interface Gasto {
  id: string;
  data: string;
  categoria: CategoriaGasto;
  valor: number;
  descricao: string;
  criadoEm: string;
}
