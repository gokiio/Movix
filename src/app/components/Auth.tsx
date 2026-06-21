import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Lock, Eye, EyeOff, Loader2, User } from 'lucide-react';

export function Auth() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    if (mode === 'register') {
      const { error } = await supabase.auth.signUp({ email, password, options: { data: { nome } } });
      if (error) setMsg({ text: error.message, ok: false });
      else setMsg({ text: 'Conta criada! Faça login para continuar.', ok: true });
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg({ text: 'E-mail ou senha incorretos.', ok: false });
    }
    setLoading(false);
  };

  const inp = 'w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500';

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-gray-950 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/icon-192.png" alt="Movix" className="w-24 h-24 mx-auto mb-4 drop-shadow-lg rounded-2xl" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Movix</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gestão de Pagamentos Escolares</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-6">
            <button onClick={() => setMode('login')} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${mode === 'login' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>Entrar</button>
            <button onClick={() => setMode('register')} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${mode === 'register' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>Criar conta</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Seu nome</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" required value={nome} onChange={e => setNome(e.target.value)} placeholder="Como quer ser chamado" className={inp + ' pl-10'} />
                </div>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">E-mail</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" className={inp + ' pl-10'} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Senha</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type={showPass ? 'text' : 'password'} required minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" className={inp + ' pl-10 pr-10'} />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {msg && <p className={`text-xs px-3 py-2 rounded-lg ${msg.ok ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400'}`}>{msg.text}</p>}

            <button type="submit" disabled={loading} className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">Seus dados ficam salvos com segurança na nuvem.</p>
      </div>
    </div>
  );
}
