// src/pages/Login.tsx
import { useClerk } from '@clerk/clerk-react'
import { useReducer, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ConsentCheckboxes } from '../components/ConsentCheckboxes'
import { activeLegalDocs } from '../config/legal'
import {
  SIGNUP_INTENT_KEY,
  buildSignupIntent,
} from '../lib/signupIntent'
import {
  INITIAL_SIGNUP_STATE,
  signupConsentReducer,
} from '../lib/signupConsentMachine'

export const Login = () => {
  const { t } = useTranslation()
  const { openSignIn, openSignUp } = useClerk()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')

  // Signup consent gate (WU3, design D1): the pre-signup checkboxes capture UI
  // INTENT only — sessionStorage is NEVER evidence. Evidence is the append-only
  // ConsentRecord written by POST /api/consent after the Clerk redirect.
  const [, dispatch] = useReducer(signupConsentReducer, INITIAL_SIGNUP_STATE)
  const [mandatoryChecked, setMandatoryChecked] = useState(false)
  const [optionalChecked, setOptionalChecked] = useState<Record<string, boolean>>({
    marketing: false,
  })
  const [consentError, setConsentError] = useState<string | null>(null)

  // Mandatory docs = active registry docs whose purposes include 'service'
  // (today: terms_of_service + privacy_policy). Config-driven, never hardcoded.
  const activeServiceDocs = useMemo(
    () => activeLegalDocs().filter((d) => d.purposes.includes('service')),
    []
  )

  const handleSignIn = () => {
    openSignIn({ redirectUrl: '/' })
  }

  const handleSignUp = () => {
    setConsentError(null)
    if (!mandatoryChecked) {
      setConsentError(t('consent.errors.mandatory_required'))
      return
    }
    const legalVersions = activeServiceDocs.map((d) => d.id)
    const optionalAccepted = Object.entries(optionalChecked)
      .filter(([, checked]) => checked)
      .map(([id]) => id)

    let intent
    try {
      intent = buildSignupIntent(legalVersions, optionalAccepted)
    } catch {
      // No mandatory doc resolved (registry misconfigured) — stay blocked.
      setConsentError(t('consent.errors.mandatory_required'))
      return
    }

    dispatch({
      type: 'CHECK_INTENT',
      legalVersions,
      optionalAccepted,
      checkedAt: intent.ts,
    })
    // Persist UI intent only (D1); openSignUp keeps redirectUrl '/onboarding'.
    sessionStorage.setItem(SIGNUP_INTENT_KEY, JSON.stringify(intent))
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
            <>
              {/* Pre-signup consent gate: blocked until the mandatory checkbox
                  is checked. Legal links open in a new tab (no form data lost). */}
              <ConsentCheckboxes
                mandatoryChecked={mandatoryChecked}
                onMandatoryChange={(checked) => {
                  setMandatoryChecked(checked)
                  if (checked) setConsentError(null)
                }}
                optionalOptions={[{ id: 'marketing', labelKey: 'consent.optional.marketing' }]}
                optionalChecked={optionalChecked}
                onOptionalChange={(id, checked) =>
                  setOptionalChecked((prev) => ({ ...prev, [id]: checked }))
                }
                error={consentError}
              />
              <button
                onClick={handleSignUp}
                className="w-full bg-aji-rojo text-white py-3 rounded-xl font-semibold hover:bg-aji-rojo/90 active:scale-[0.98] transition-all shadow-lg"
              >
                {t('nav.signup')}
              </button>
            </>
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
