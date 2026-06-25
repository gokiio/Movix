# 📊 Análise Completa — Movix

> Sistema de gestão de pagamentos para motoristas de van escolar.  
> Stack: React 18 + TypeScript + Vite + TailwindCSS v4 + Supabase + PWA

---

## 🏗️ Estado Atual do Projeto

### O que está implementado e funcionando

| Módulo | Status | Observações |
|---|---|---|
| Autenticação (login/cadastro) | ✅ Funcional | Email + senha via Supabase Auth |
| Dashboard com métricas | ✅ Funcional | Cards, barra de progresso, lista de pendentes |
| CRUD de Alunos | ✅ Funcional | Inclui drag-and-drop para ordenar rota |
| CRUD de Pagamentos | ✅ Funcional | Gerar mês, confirmar, reverter, multas |
| CRUD de Gastos | ✅ Funcional | 9 categorias, gráfico de barras por categoria |
| Tema claro/escuro | ✅ Funcional | Persistido em localStorage |
| PWA (manifest + ícones) | ✅ Configurado | manifest.json + ícones presentes |
| Supabase como backend | ✅ Migrado | localStorage foi removido |

---

## 🚨 O que está FALTANDO ser feito

### 1. `calculations.ts` usa `storage` (código morto/quebrado)

> **[CRÍTICO]** As funções `calculateDashboardMetrics` e `initializeMonthlyPayments` ainda importam e chamam `storage` (que foi esvaziado). O `Dashboard.tsx` faz suas próprias chamadas ao `db.ts` corretamente, mas as funções do `calculations.ts` estão **inutilizáveis e enganosas**.

**Arquivo:** `src/app/utils/calculations.ts` (linhas 43–77)

```diff
- export const calculateDashboardMetrics = (...) => {
-   const alunos = storage.alunos.getAll(); // ← retorna [] sempre
-   const pagamentos = storage.pagamentos.getByMonth(...); // ← retorna [] sempre
- ...
```

**Ação:** Remover `calculateDashboardMetrics` e `initializeMonthlyPayments` de `calculations.ts` (ou reescrever como funções puras sem dependência de storage).

---

### 2. Sem TypeScript estrito / falta de `tsconfig` robusto

**Arquivo:** `tsconfig.json`  
Não há `strict: true`, `noImplicitAny`, `exactOptionalPropertyTypes`. Isso permite `as any` em muitos lugares do código.

**Exemplos de `as any` encontrados:**
- `Students.tsx:77` — `} as any`
- `Payments.tsx:62` — `} as any`
- `Payments.tsx:114` — `} as any`
- `Expenses.tsx:54` — `} as any`

**Ação:** Ajustar as interfaces de `db.add()` para aceitar os tipos corretos sem precisar de cast.

---

### 3. Sem tratamento de erro na camada `db.ts`

`src/app/lib/db.ts` usa `console.error` e retorna silenciosamente em caso de falha. O usuário não recebe nenhum feedback quando um `update` ou `delete` falha.

**Falta:**
- Lançar erros (`throw`) ou retornar `{ success, error }` estruturado
- Tratamento de erros de rede (offline/timeout)
- Toast de erro global via `sonner` (a lib já está instalada mas não é usada para erros)

---

### 4. `getSession()` chamado repetidamente em cada operação de `db.ts`

Cada função do `db.ts` chama `supabase.auth.getSession()` individualmente. Isso é redundante e pode causar race conditions.

**Ação:** Usar `supabase.auth.getUser()` uma vez e passar `userId` como parâmetro, ou criar um helper centralizado que retorna o usuário da sessão.

> ⚠️ A Supabase recomenda `getUser()` (valida no servidor) em vez de `getSession()` (local) para decisões de autorização.

---

### 5. Sem `service worker` / cache offline

O `manifest.json` está configurado, mas não há service worker registrado. O app não funciona offline.

**Ação:** Adicionar o plugin `vite-plugin-pwa` ou um `sw.js` manual para cache das páginas.

---

### 6. Sem `README.md`

O repositório não tem nenhum arquivo de documentação. Falta:
- Descrição do projeto
- Como rodar localmente (variáveis de ambiente, `pnpm install`, `pnpm dev`)
- Estrutura de tabelas do Supabase (schema SQL)
- Como fazer deploy

---

### 7. Sem schema SQL / migrações do Supabase

Não existe pasta `supabase/migrations/` nem um arquivo `.sql` documentando as tabelas (`alunos`, `pagamentos`, `gastos`, `profiles`).  
Se o banco for perdido ou precisar ser recriado, não há como saber a estrutura exata.

**Tabelas inferidas pelo código:**

```
alunos
  user_id, nome_crianca, nome_responsavel, telefone,
  endereco_embarque, endereco_desembarque, endereco_unico,
  percurso, escola, turno, valor_mensalidade,
  dia_vencimento, observacoes, rota_pos, criado_em

pagamentos
  user_id, aluno_id, mes_referencia, valor, valor_original,
  status, data_pagamento, forma_pagamento,
  multa_valor, multa_motivo, multa_data, observacoes, criado_em

gastos
  user_id, data, categoria, valor, descricao, criado_em

profiles
  id, nome
```

---

### 8. Sem RLS (Row Level Security) verificada

O `db.ts` filtra por `user_id` manualmente em cada query (`.eq('user_id', user.id)`), mas não há confirmação de que as políticas RLS estão ativadas no Supabase. Se RLS estiver desativada, qualquer usuário autenticado pode acessar dados de outros.

**Ação:** Verificar e ativar RLS em todas as tabelas no painel do Supabase.

---

### 9. Nav do header desktop fora de ordem

Em `src/app/App.tsx` (linhas 142–156), a `<nav>` desktop está **depois** dos botões de tema e logout, o que coloca a navegação na ordem errada visualmente:

```
Logo | Nome | 🌙 Logout | [Dashboard] [Alunos] [Pagamentos] [Gastos]
```

O esperado seria:

```
Logo | Nome | [Dashboard] [Alunos] [Pagamentos] [Gastos] | 🌙 Logout
```

---

### 10. `globals.css` não é importado

O arquivo `src/styles/globals.css` existe mas **não é importado** em `index.css`.

**Ação:** Adicionar `@import './globals.css';` no `index.css`, ou remover o arquivo se for obsoleto.

---

### 11. Sem página de Configurações / Perfil

O usuário não tem como alterar o nome (`profile.nome`) após o cadastro. A função `db.profile.update()` existe, mas não há UI para ela.

**Ação:** Criar uma página/modal de Configurações com edição de nome e (opcionalmente) alteração de senha.

---

### 12. Sem confirmação de e-mail no cadastro

O fluxo de registro (`Auth.tsx`) mostra "Conta criada! Faça login para continuar." mas não instrui o usuário a confirmar o e-mail caso o Supabase esteja configurado com confirmação obrigatória.

**Ação:** Verificar a configuração do Supabase e, se necessário, adicionar mensagem orientando o usuário a verificar a caixa de entrada.

---

## 💡 Melhorias Técnicas Recomendadas

### Arquitetura & Código

| # | Melhoria | Impacto |
|---|---|---|
| A1 | **Extrair lógica de negócio para hooks customizados** (`useAlunos`, `usePagamentos`, `useGastos`) | Alto — componentes ficam menores e reutilizáveis |
| A2 | **React Query / SWR** para cache e sincronização automática com o Supabase | Alto — elimina carregamentos duplicados e state manual |
| A3 | **Substituir `alert()` e `confirm()`** por modais/toasts do `sonner` ou `Dialog` do Radix | Médio — melhora UX e acessibilidade |
| A4 | **Substituir `navMes()`** duplicado em 3 componentes por uma função compartilhada em `calculations.ts` | Baixo — princípio DRY |
| A5 | **Adicionar `eslint` + `prettier`** ao projeto (`devDependencies`) | Médio — consistência e qualidade de código |
| A6 | **Tipagem do retorno `db.add()`** — atualmente retorna `string \| null \| undefined` | Médio — segurança de tipo |
| A7 | **Zod ou validação de formulários** via `react-hook-form` (já instalado) + resolver | Médio — a lib já está presente |

---

### UX & Funcionalidades

| # | Melhoria | Impacto |
|---|---|---|
| U1 | **Notificações push** para pagamentos atrasados | Alto — core do produto |
| U2 | **Exportar relatório** (PDF ou CSV) de pagamentos por mês | Alto — muito solicitado por usuários |
| U3 | **Botão de WhatsApp** no card do aluno (telefone clicável com mensagem pronta) | Alto — ação frequente do motorista |
| U4 | **Página de Configurações** com edição de nome, alteração de senha e tema | Médio |
| U5 | **Indicador de sincronização** (online/offline) | Médio — especialmente útil em PWA |
| U6 | **Filtro de gastos por categoria** na aba Gastos | Médio |
| U7 | **Gráfico de evolução** de receita vs gastos mês a mês no Dashboard | Médio — `recharts` já instalado |
| U8 | **Busca de endereço** integrada (via ViaCEP ou Google Places) no cadastro de aluno | Baixo-médio |
| U9 | **Campo "forma de pagamento preferencial"** no aluno para pré-preencher confirmação | Baixo |
| U10 | **Histórico completo** paginado no detalhe do aluno — atualmente limitado a 8 registros | Baixo |

---

### Performance & Build

| # | Melhoria | Impacto |
|---|---|---|
| P1 | **Lazy loading** das páginas com `React.lazy()` + `Suspense` | Médio — reduz bundle inicial |
| P2 | **`vite-plugin-pwa`** para service worker e cache offline real | Alto — viabiliza uso offline |
| P3 | **Limpar dependências não usadas** — há 40+ componentes Radix instalados, mas apenas ~5 são usados | Baixo-médio — bundle menor |
| P4 | **Adicionar `lint` e `typecheck` nos scripts** do `package.json` | Médio — qualidade de CI |

---

## 📦 Dependências não utilizadas (candidatas à remoção)

O projeto instala **todas** as dependências do shadcn/ui, mas usa apenas uma fração. Candidatas à remoção:

```
@radix-ui/react-accordion
@radix-ui/react-aspect-ratio
@radix-ui/react-collapsible
@radix-ui/react-context-menu
@radix-ui/react-hover-card
@radix-ui/react-menubar
@radix-ui/react-navigation-menu
@radix-ui/react-radio-group
@radix-ui/react-resizable-panels
@radix-ui/react-slider
@radix-ui/react-toggle
@radix-ui/react-toggle-group
embla-carousel-react
react-day-picker
react-slick
react-responsive-masonry
react-dnd
react-dnd-html5-backend
canvas-confetti
vaul
cmdk
input-otp
date-fns
recharts           ← instalado mas sem uso ativo na UI atual
```

---

## 🗂️ Resumo de Prioridades

### 🔴 Crítico (corrigir antes de usar em produção)

1. Remover/reescrever funções mortas em `calculations.ts`
2. Ativar e documentar RLS no Supabase
3. Criar schema SQL / migrações (`supabase/migrations/`)

### 🟡 Importante (próximas sprints)

4. Trocar `alert()`/`confirm()` por componentes UI (`sonner`, `Dialog`)
5. Adicionar tratamento de erro estruturado em `db.ts`
6. Usar `getUser()` em vez de `getSession()` na camada de dados
7. Criar `README.md` com instruções de setup e variáveis de ambiente
8. Corrigir ordem dos elementos no header desktop
9. Importar (ou remover) `globals.css`
10. Adicionar página de Perfil/Configurações

### 🟢 Melhorias (roadmap)

11. React Query para cache e sync automático
12. Botão de WhatsApp nos cards de alunos
13. Exportação de relatórios (PDF/CSV)
14. Lazy loading + `vite-plugin-pwa` para offline real
15. Gráfico de evolução mensal no Dashboard
16. Validação de formulários com `react-hook-form` + Zod
17. Limpar dependências não utilizadas
