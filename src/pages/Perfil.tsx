// src/pages/Perfil.tsx
import { UserProfile, useUser } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

/**
 * /perfil — account self-service.
 *
 * The app had no way for a user to change their own name, email, password or
 * sessions: /preferencias is the LGPD consent and data-export hub, not a
 * profile editor. Identity is owned by Clerk, so account editing is delegated
 * to Clerk's own <UserProfile /> rather than hand-rolled: credential handling,
 * email verification, MFA and session revocation are security-critical surface
 * that must not be reimplemented here.
 *
 * Privacy and consent intentionally stay in /preferencias; this page links to
 * it so the two halves of "my account" remain reachable from each other.
 */
export const Perfil = () => {
  const { isLoaded, isSignedIn } = useUser();
  const { t } = useTranslation();

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-creme-andino dark:bg-zinc-950">
        <p className="text-gray-600 dark:text-gray-400">{t('profile.loading')}</p>
      </div>
    );
  }

  // Signed-out visitors get an explanation and a way in, never a blank screen.
  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-creme-andino dark:bg-zinc-950 px-4">
        <div className="w-full max-w-md text-center">
          <h1 className="font-playfair text-2xl font-bold text-noche-lima dark:text-white mb-3">
            {t('profile.signed_out_title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
            {t('profile.signed_out_description')}
          </p>
          <Link
            to="/"
            className="inline-block bg-aji-rojo text-white font-semibold px-6 py-3 rounded-lg hover:opacity-90 transition"
          >
            {t('profile.back_home')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-creme-andino dark:bg-zinc-950 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <header className="mb-6">
          <h1 className="font-playfair text-3xl font-bold text-noche-lima dark:text-white mb-2">
            {t('profile.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            {t('profile.description')}{' '}
            <Link to="/preferencias" className="text-aji-rojo underline underline-offset-2">
              {t('nav.privacy_preferences')}
            </Link>
            .
          </p>
        </header>

        <UserProfile routing="hash" />
      </div>
    </div>
  );
};
