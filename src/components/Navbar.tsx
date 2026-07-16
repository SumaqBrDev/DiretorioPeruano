import { Link, useLocation } from 'react-router-dom'
import { useUser, useClerk } from '@clerk/clerk-react'
import { useState } from 'react'

export const Navbar = () => {
  const { user, isLoaded } = useUser()
  const { openSignIn, openSignUp, signOut } = useClerk()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [language, setLanguage] = useState<'pt-BR' | 'es-PE'>('pt-BR')

  if (!isLoaded) return null

  const navLinks = [
    { path: '/', label: { 'pt-BR': 'Início', 'es-PE': 'Inicio' } },
    { path: '/busca', label: { 'pt-BR': 'Buscar', 'es-PE': 'Buscar' } },
    { path: '/inbox', label: { 'pt-BR': 'Inbox', 'es-PE': 'Bandeja' } },
  ]

  return (
    <header className="bg-white dark:bg-noche-lima shadow-sm border-b border-oro-inca/20 sticky top-0 z-50">
      <nav className="container mx-auto px-4" aria-label="Navegação principal">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2" aria-label="ConectaPerú - Início">
            <svg className="w-8 h-8 text-aji-rojo" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <circle cx="16" cy="16" r="14" stroke="#C0392B" strokeWidth="2"/>
              <path d="M16 8 L16 24" stroke="#C0392B" strokeWidth="2" strokeLinecap="round"/>
              <path d="M8 16 L24 16" stroke="#C0392B" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="16" cy="16" r="4" fill="#F39C12"/>
            </svg>
            <span className="font-playfair text-xl font-bold text-aji-rojo hidden sm:block">ConectaPerú</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map(({ path, label }) => (
              <Link
                key={path}
                to={path}
                className={`font-medium transition-colors ${
                  location.pathname === path
                    ? 'text-aji-rojo'
                    : 'text-gray-700 dark:text-gray-300 hover:text-aji-rojo'
                }`}
              >
                {label['pt-BR']}
              </Link>
            ))}

            {/* Language Selector */}
            <div className="relative">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'pt-BR' | 'es-PE')}
                className="bg-transparent border border-oro-inca/30 rounded-lg px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-aji-rojo"
                aria-label="Selecionar idioma"
              >
                <option value="pt-BR">🇧🇷 Português</option>
                <option value="es-PE">🇵🇪 Español</option>
              </select>
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center gap-3">
              {user ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-700 dark:text-gray-300 hidden sm:block">
                    Olá, {user.firstName || user.username || 'Usuário'}
                  </span>
                  {user.publicMetadata?.role === 'business' && (
                    <Link to="/onboarding" className="bg-aji-rojo text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-aji-rojo/90 transition-colors">
                      Meu Negócio
                    </Link>
                  )}
                  {user.publicMetadata?.role === 'admin' && (
                    <Link to="/admin" className="bg-oro-inca text-noche-lima px-4 py-2 rounded-lg text-sm font-medium hover:bg-oro-inca/90 transition-colors">
                      Admin
                    </Link>
                  )}
                  <button
                    onClick={() => signOut()}
                    className="text-gray-600 dark:text-gray-400 hover:text-aji-rojo text-sm font-medium"
                  >
                    Sair
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openSignIn({ redirectUrl: '/' })}
                    className="text-gray-700 dark:text-gray-300 hover:text-aji-rojo text-sm font-medium"
                  >
                    Entrar
                  </button>
                  <button
                    onClick={() => openSignUp({ redirectUrl: '/onboarding' })}
                    className="bg-aji-rojo text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-aji-rojo/90 transition-colors"
                  >
                    Cadastrar
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
            aria-label="Abrir menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div id="mobile-menu" className="md:hidden py-4 border-t border-oro-inca/20 animate-slide-down">
            <div className="flex flex-col gap-4">
              {navLinks.map(({ path, label }) => (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`font-medium py-2 px-2 rounded-lg ${
                    location.pathname === path
                      ? 'bg-aji-rojo/10 text-aji-rojo'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-aji-rojo/10 hover:text-aji-rojo'
                  }`}
                >
                  {label['pt-BR']}
                </Link>
              ))}
              <div className="pt-4 border-t border-oro-inca/20 flex flex-col gap-3">
                {!user ? (
                  <>
                    <button
                      onClick={() => openSignIn({ redirectUrl: '/' })}
                      className="w-full bg-aji-rojo text-white py-2 rounded-lg font-medium"
                    >
                      Entrar
                    </button>
                    <button
                      onClick={() => openSignUp({ redirectUrl: '/onboarding' })}
                      className="w-full border border-aji-rojo text-aji-rojo py-2 rounded-lg font-medium"
                    >
                      Cadastrar
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/onboarding" className="w-full bg-aji-rojo text-white py-2 rounded-lg font-medium text-center">
                      Meu Negócio
                    </Link>
                    {user.publicMetadata?.role === 'admin' && (
                      <Link to="/admin" className="w-full bg-oro-inca text-noche-lima py-2 rounded-lg font-medium text-center">
                        Admin
                      </Link>
                    )}
                    <button
                      onClick={() => signOut()}
                      className="w-full text-gray-700 dark:text-gray-300 py-2 font-medium"
                    >
                      Sair
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}

export default Navbar