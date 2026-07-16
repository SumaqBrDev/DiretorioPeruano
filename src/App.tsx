import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ClerkProvider, useUser } from '@clerk/clerk-react';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { Busca } from './pages/Busca';
import { Negocio } from './pages/Negocio';
import { Onboarding } from './pages/Onboarding';
import { Inbox } from './pages/Inbox';
import { Admin } from './pages/Admin';
import { Moderar } from './pages/Moderar';
import { Login } from './pages/Login';
import './App.css';

function AppRoutes() {
  const { isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-creme-andino">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-aji-rojo border-t-transparent"></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-creme-andino dark:bg-noche-lima transition-colors duration-300">
        <Navbar />
        <main className="flex-grow container mx-auto px-4 py-8 w-full">
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
          </Routes>
        </main>
        <footer className="bg-creme-andino dark:bg-noche-lima border-t border-oro-inca/20 py-8 mt-auto">
          <div className="container mx-auto px-4 text-center text-gray-600 dark:text-gray-400">
            <p>&copy; 2025 SaborPeruano. Conectando o Perú ao Brasil.</p>
          </div>
        </footer>
      </div>
    </Router>
  );
}

function App() {
  const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string || 'pk_test_default';

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
