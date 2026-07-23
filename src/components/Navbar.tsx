import { Link, useLocation } from 'react-router-dom';
import { useUser, useClerk } from '@clerk/clerk-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { List, X, SignOut } from '@phosphor-icons/react';
import { LanguageToggle } from './LanguageToggle';

export const Navbar = () => {
  const { t } = useTranslation();
  const { user, isLoaded } = useUser();
  const { openSignIn, openSignUp, signOut } = useClerk();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  if (!isLoaded) return null;

  const SUPERADMIN_CLERK_ID = 'user_3GsBXtg23VQOhHPN3HCF1oCN4Eq';
  const isSuperAdmin = user?.id === SUPERADMIN_CLERK_ID;
  const publicMeta = user?.publicMetadata || {};
  const isAdmin = (publicMeta.role === 'admin' || publicMeta.rol === 'admin') && !isSuperAdmin;

  const navLinks = [
    { path: '/', label: t('nav.home') },
    { path: '/busca', label: t('nav.search') },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-oro-inca/20 sticky top-0 z-50">
      <nav className="container mx-auto px-4" aria-label="Navegação principal">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2.5"
            aria-label={`${t('brand.name')} - ${t('nav.home')}`}
          >
            {/* CP Logo Mark */}
            <svg className="w-8 h-8 shrink-0" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <circle cx="16" cy="16" r="14" stroke="#C0392B" strokeWidth="2" />
              <path d="M12 10 L20 10 L20 16 L12 16 Z" fill="#C0392B" />
              <path d="M12 16 L20 22 L12 22 Z" fill="#F39C12" />
              <text x="16" y="20" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" fontFamily="Geist, sans-serif">CP</text>
            </svg>
            <span className="font-bold text-lg text-aji-rojo hidden sm:block">
              {t('brand.name')}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map(({ path, label }) => (
              <Link
                key={path}
                to={path}
                className={`text-sm font-medium transition-colors ${
                  isActive(path)
                    ? 'text-aji-rojo'
                    : 'text-gray-600 dark:text-gray-400 hover:text-aji-rojo'
                }`}
              >
                {label}
              </Link>
            ))}

            {/* Language Toggle */}
            <LanguageToggle />

            {/* Auth Section */}
            <div className="flex items-center gap-3">
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-aji-rojo/10 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-aji-rojo to-oro-inca flex items-center justify-center text-white text-xs font-bold">
                      {(user.firstName || user.username || 'U')?.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-300 hidden lg:block">
                      {user.firstName || user.username || ''}
                    </span>
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-zinc-800 rounded-xl shadow-xl border border-oro-inca/20 py-2 z-50">
                      <div className="px-4 py-2 border-b border-oro-inca/10 mb-1">
                        <p className="text-sm font-medium text-noche-lima dark:text-white truncate">{user.fullName || user.username || 'Usuário'}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.primaryEmailAddress?.emailAddress || ''}</p>
                      </div>
                      {/* Superadmin/Admin não precisa de Meu Negócio — têm painéis próprios */}
                      {!isAdmin && !isSuperAdmin && (
                        <Link
                          to="/meu-negocio"
                          onClick={() => setUserMenuOpen(false)}
                          className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-aji-rojo/10 hover:text-aji-rojo"
                        >
                          🏪 Meu Negócio
                        </Link>
                      )}
                      <Link
                        to="/inbox"
                        onClick={() => setUserMenuOpen(false)}
                        className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-aji-rojo/10 hover:text-aji-rojo"
                      >
                        💬 {t('nav.inbox')}
                      </Link>
                      {isAdmin && (
                        <Link
                          to="/admin"
                          onClick={() => setUserMenuOpen(false)}
                          className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-aji-rojo/10 hover:text-aji-rojo"
                        >
                          ⚙️ Admin
                        </Link>
                      )}
                      {isSuperAdmin && (
                        <Link
                          to="/admin/super"
                          onClick={() => setUserMenuOpen(false)}
                          className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-aji-rojo/10 hover:text-aji-rojo"
                        >
                          👑 SuperAdmin
                        </Link>
                      )}
                      <hr className="my-1 border-oro-inca/20" />
                      <button
                        onClick={() => { signOut(); setUserMenuOpen(false); }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-aji-rojo/10 hover:text-aji-rojo flex items-center gap-2"
                      >
                        <SignOut size={16} />
                        {t('nav.logout')}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openSignIn({ redirectUrl: '/' })}
                    className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-aji-rojo transition-colors px-3 py-1.5"
                  >
                    {t('nav.login')}
                  </button>
                  <button
                    onClick={() => openSignUp({ redirectUrl: '/onboarding' })}
                    className="bg-aji-rojo text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-aji-rojo/90 active:scale-[0.98] transition-all"
                  >
                    {t('nav.signup')}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 md:hidden">
            <LanguageToggle />
            <button
              className="p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            >
              {mobileMenuOpen ? <X size={24} /> : <List size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div id="mobile-menu" className="md:hidden py-4 border-t border-oro-inca/20">
            <div className="flex flex-col gap-2">
              {navLinks.map(({ path, label }) => (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`font-medium py-2.5 px-3 rounded-lg text-sm ${
                    isActive(path)
                      ? 'bg-aji-rojo/10 text-aji-rojo'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-aji-rojo/10 hover:text-aji-rojo'
                  }`}
                >
                  {label}
                </Link>
              ))}
              <div className="pt-4 mt-2 border-t border-oro-inca/20 flex flex-col gap-2">
                {!user ? (
                  <>
                    <button
                      onClick={() => { openSignIn({ redirectUrl: '/' }); setMobileMenuOpen(false); }}
                      className="w-full bg-aji-rojo text-white py-2.5 rounded-lg font-medium text-sm"
                    >
                      {t('nav.login')}
                    </button>
                    <button
                      onClick={() => { openSignUp({ redirectUrl: '/onboarding' }); setMobileMenuOpen(false); }}
                      className="w-full border border-aji-rojo text-aji-rojo py-2.5 rounded-lg font-medium text-sm"
                    >
                      {t('nav.signup')}
                    </button>
                  </>
                ) : (
                  <>
                    {/* Superadmin/Admin não precisa de Meu Negócio — têm painéis próprios */}
                    {!isAdmin && !isSuperAdmin && (
                      <Link
                        to="/onboarding"
                        onClick={() => setMobileMenuOpen(false)}
                        className="w-full bg-aji-rojo text-white py-2.5 rounded-lg font-medium text-sm text-center"
                      >
                        {t('nav.my_business')}
                      </Link>
                    )}
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setMobileMenuOpen(false)}
                        className="w-full bg-oro-inca text-noche-lima py-2.5 rounded-lg font-medium text-sm text-center"
                      >
                        {t('nav.admin')}
                      </Link>
                    )}
                    {isSuperAdmin && (
                      <Link
                        to="/admin/super"
                        onClick={() => setMobileMenuOpen(false)}
                        className="w-full border border-oro-inca text-oro-inca py-2.5 rounded-lg font-medium text-sm text-center"
                      >
                        👑 SuperAdmin
                      </Link>
                    )}
                    <button
                      onClick={() => { signOut(); setMobileMenuOpen(false); }}
                      className="w-full text-gray-600 dark:text-gray-400 py-2.5 font-medium text-sm flex items-center justify-center gap-2"
                    >
                      <SignOut size={16} />
                      {t('nav.logout')}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Navbar;
