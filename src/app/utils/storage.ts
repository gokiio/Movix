// localStorage removido — usar lib/db.ts com Supabase
export const storage = { alunos: { getAll: ()=>[], save:()=>{}, add:()=>{}, update:()=>{}, delete:()=>{} }, pagamentos: { getAll:()=>[], save:()=>{}, add:()=>{}, update:()=>{}, delete:()=>{}, getByMonth:()=>[] }, gastos: { getAll:()=>[], save:()=>{}, add:()=>{}, update:()=>{}, delete:()=>{}, getByMonth:()=>[] } };
export const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2,9)}`;
