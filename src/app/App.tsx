import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  Receipt,
  TrendingDown,
  Sun,
  Moon,
  LogOut,
} from "lucide-react";
import { Dashboard } from "./components/Dashboard";
import { Students } from "./components/Students";
import { Payments } from "./components/Payments";
import { Expenses } from "./components/Expenses";
import { Auth } from "./components/Auth";
import { supabase } from "./lib/supabase";
import { db } from "./lib/db";
import type { User } from "@supabase/supabase-js";

type Page = "dashboard" | "students" | "payments" | "expenses";

export default function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [user, setUser] = useState<User | null>(null);
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem("movix_theme") === "dark";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    const profile = await db.profile.get();
    if (profile?.nome) setUserName(profile.nome);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut({ scope: "local" }).catch(() => {});
    setUser(null);
    setUserName("");
    localStorage.removeItem("user-credencials");
  };

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("movix_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("movix_theme", "light");
    }
  }, [dark]);

  if (loading)
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <img
            src="/icon-192.png"
            alt="Movix"
            className="w-16 h-16 mx-auto mb-4 animate-pulse"
          />
          <p className="text-sm text-gray-400">Carregando...</p>
        </div>
      </div>
    );

  if (!user) return <Auth />;

  const displayName = userName || user.email?.split("@")[0] || "Usuário";

  const nav = [
    { id: "dashboard" as Page, name: "Dashboard", icon: LayoutDashboard },
    { id: "students" as Page, name: "Alunos", icon: Users },
    { id: "payments" as Page, name: "Pagamentos", icon: Receipt },
    { id: "expenses" as Page, name: "Gastos", icon: TrendingDown },
  ];

  const renderPage = () => {
    switch (page) {
      case "dashboard":
        return <Dashboard user={user} />;
      case "students":
        return <Students />;
      case "payments":
        return <Payments />;
      case "expenses":
        return <Expenses />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          {/* Logo */}
          <img
            src="/icon-192.png"
            alt="Movix"
            className="w-9 h-9 rounded-xl flex-shrink-0 object-cover"
          />
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold leading-tight text-gray-900 dark:text-white">
              Movix
            </h1>
            <p className="text-xs text-gray-400 leading-tight truncate">
              {displayName}
            </p>
          </div>
          <button
            onClick={() => setDark(!dark)}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
            title={dark ? "Modo claro" : "Modo escuro"}
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={handleSignOut}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-red-50 dark:hover:bg-red-950 text-gray-600 dark:text-gray-300 hover:text-red-500 transition-colors"
            title="Sair"
          >
            <LogOut className="w-4 h-4" />
          </button>
          <nav className="hidden md:flex gap-1">
            {nav.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setPage(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${page === item.id ? "bg-green-600 text-white" : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main>{renderPage()}</main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-40">
        <div className="grid grid-cols-4 max-w-2xl mx-auto">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = page === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className={`flex flex-col items-center gap-0.5 py-3 text-xs font-medium transition-colors ${active ? "text-green-600" : "text-gray-500 dark:text-gray-400"}`}
              >
                <Icon className="w-5 h-5" />
                {item.name}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
