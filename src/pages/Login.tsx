// src/pages/Login.tsx
import { SignIn, SignUp } from '@clerk/nextjs'
import { useState } from 'react'

export const Login = () => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')

  return (
    <div className="min-h-screen flex items-center justify-center bg-creme-andino dark:bg-noche-lima py-16 px-4">
      <div className="bg-white dark:bg-noche-lima p-8 rounded-2xl shadow-xl w-full max-w-md">
        <h1 className="text-2xl font-playfair font-bold text-center mb-6 text-aji-rojo">
          {mode === 'signin' ? 'Entrar no SaborPeruano' : 'Criar Conta'}
        </h1>

        <div className="flex justify-center mb-6">
          <div className="flex rounded-lg overflow-hidden">
            <button
              onClick={() => setMode('signin')}
              className={`px-4 py-2 ${mode === 'signin' ? 'bg-aji-rojo text-white' : 'bg-creme-andino dark:bg-noche-lima text-gray-700 dark:text-gray-300'}`}
            >
              Entrar
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`px-4 py-2 ${mode === 'signup' ? 'bg-aji-rojo text-white' : 'bg-creme-andino dark:bg-noche-lima text-gray-700 dark:text-gray-300'}`}
            >
              Cadastrar
            </button>
          </div>
        </div>

        {mode === 'signin' ? (
          <SignIn
            path="/entrar"
            routing="path"
            signUpUrl="/cadastrar"
            appearance={{
              variables: { colorPrimary: '#C0392B' },
            }}
          />
        ) : (
          <SignUp
            path="/cadastrar"
            routing="path"
            signInUrl="/entrar"
            appearance={{
              variables: { colorPrimary: '#C0392B' },
            }}
          />
        )}
      </div>
    </div>
  )
}