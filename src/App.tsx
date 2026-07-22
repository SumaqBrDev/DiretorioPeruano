import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ClerkProvider, useUser } from '@clerk/clerk-react';
import { useTranslation } from 'react-i18next';
import { Navbar } from './components/Navbar';
import { CookieBanner } from './components/CookieBanner';
import { Home } from './pages/Home';
import { Busca } from './pages/Busca';
import { Negocio } from './pages/Negocio';
import { Onboarding } from './pages/Onboarding';
import { Inbox } from './pages/Inbox';
import { Admin } from './pages/Admin';
import { Moderar } from './pages/Moderar';
import { Login } from './pages/Login';
import { Privacidade } from './pages/Privacidade';
import { Termos } from './pages/Termos';
import './App.css';

function AppRoutes() {
  const { isLoaded } = useUser();
  const { t } = useTranslation();

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-creme-andino dark:bg-zinc-950">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-aji-rojo border-t-transparent" />
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-creme-andino dark:bg-zinc-950 transition-colors duration-300">
        <Navbar />
        <main className="flex-grow w-full">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/busca" element={<Busca />} />
            <Route path="/negocio/:id" element={<Negocio />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/inbox" element={<Inbox />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/moderar" element={<Moderar />} />
            <Route path="/entrar" element={<Login />} />
            <Route path="/cadastrar" element={<Login />} />
            <Route path="/privacidade" element={<Privacidade />} />
            <Route path="/termos" element={<Termos />} />
          </Routes>
        </main>
        <CookieBanner />
        <footer className="bg-creme-andino dark:bg-zinc-950 border-t border-oro-inca/20 py-8 mt-auto">
          <div className="container mx-auto px-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                &copy; {new Date().getFullYear()} {t('brand.name')}. {t('footer.copyright')}
              </p>
              <nav className="flex items-center gap-6">
                <a
                  href="/privacidade"
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-aji-rojo dark:hover:text-aji-rojo transition-colors"
                >
                  {t('footer.privacy')}
                </a>
                <a
                  href="/termos"
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-aji-rojo dark:hover:text-aji-rojo transition-colors"
                >
                  {t('footer.terms')}
                </a>
              </nav>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}

function App() {
  const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

  if (!publishableKey) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 text-zinc-900 p-4 text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-2">Falta configuración de Clerk</h1>
        <p className="max-w-md">
          No se encontró la variable de entorno <code>VITE_CLERK_PUBLISHABLE_KEY</code>. 
          Por favor, configúrala en el panel de Netlify (Environment Variables) y vuelve a desplegar.
        </p>
      </div>
    );
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      appearance={{
        variables: {
          colorPrimary: '#C0392B',
        },
        elements: {
          formButtonPrimary: 'bg-aji-rojo hover:bg-aji-rojo/90 text-white',
          card: 'shadow-lg border border-oro-inca/20',
        },
      }}
      localization={{ locale: 'pt-BR' }}
    >
      <AppRoutes />
    </ClerkProvider>
  );
}

export default App;
