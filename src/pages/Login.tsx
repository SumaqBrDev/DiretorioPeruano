// src/pages/Login.tsx
import { useClerk } from '@clerk/clerk-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export const Login = () => {
  const { t } = useTranslation()
  const { openSignIn, openSignUp } = useClerk()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')

  const handleSignIn = () => {
    openSignIn({ redirectUrl: '/' })
  }

  const handleSignUp = () => {
    openSignUp({ redirectUrl: '/onboarding' })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-creme-andino dark:bg-zinc-950 py-16 px-4">
      <div className="bg-white dark:bg-zinc-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-oro-inca/20">
        <h1 className="text-2xl font-bold text-center mb-6 text-aji-rojo tracking-tighter">
          {mode === 'signin' ? `Entrar no ${t('brand.name')}` : 'Criar Conta'}
        </h1>

        <div className="flex justify-center mb-6">
          <div className="flex rounded-xl overflow-hidden border border-oro-inca/20">
            <button
              onClick={() => setMode('signin')}
              className={`px-6 py-2.5 text-sm font-medium transition-all ${
                mode === 'signin'
                  ? 'bg-aji-rojo text-white'
                  : 'bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:text-aji-rojo'
              }`}
            >
              {t('nav.login')}
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`px-6 py-2.5 text-sm font-medium transition-all ${
                mode === 'signup'
                  ? 'bg-aji-rojo text-white'
                  : 'bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:text-aji-rojo'
              }`}
            >
              {t('nav.signup')}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {mode === 'signin' ? (
            <button
              onClick={handleSignIn}
              className="w-full bg-aji-rojo text-white py-3 rounded-xl font-semibold hover:bg-aji-rojo/90 active:scale-[0.98] transition-all shadow-lg"
            >
              {t('nav.login')}
            </button>
          ) : (
            <button
              onClick={handleSignUp}
              className="w-full bg-aji-rojo text-white py-3 rounded-xl font-semibold hover:bg-aji-rojo/90 active:scale-[0.98] transition-all shadow-lg"
            >
              {t('nav.signup')}
            </button>
          )}
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2">
            {mode === 'signin' ? (
              <>
                Não tem conta?{' '}
                <button
                  onClick={() => setMode('signup')}
                  className="text-aji-rojo font-medium hover:underline"
                >
                  {t('nav.signup')}
                </button>
              </>
            ) : (
              <>
                Já tem conta?{' '}
                <button
                  onClick={() => setMode('signin')}
                  className="text-aji-rojo font-medium hover:underline"
                >
                  {t('nav.login')}
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
