import { useTranslation } from 'react-i18next';
import type { ContactFields, ContactErrors } from '../lib/businessContact';

interface ContactFieldsFormProps {
  value: ContactFields;
  errors?: ContactErrors;
  onChange: (next: ContactFields) => void;
  disabled?: boolean;
}

interface FieldConfig {
  key: keyof ContactFields;
  label: string;
  placeholder: string;
  hint?: string;
  type?: string;
}

const FIELDS: FieldConfig[] = [
  {
    key: 'phone',
    label: 'Telefone',
    placeholder: '(11) 3456-7890',
    hint: 'Aparece no botão "Telefone" da sua página.',
    type: 'tel',
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    placeholder: '(11) 98765-4321',
    hint: 'Aparece no botão "Conversar agora". Para número de fora do Brasil, use +51...',
    type: 'tel',
  },
  {
    key: 'email',
    label: 'E-mail de contato',
    placeholder: 'contato@seunegocio.com.br',
    type: 'email',
  },
  {
    key: 'website',
    label: 'Site ou rede social',
    placeholder: 'seunegocio.com.br',
  },
  {
    key: 'mapsUrl',
    label: 'Link do Google Maps',
    placeholder: 'https://maps.app.goo.gl/...',
    hint: 'No app do Google Maps: abra seu negócio → Compartilhar → Copiar link. Se deixar em branco, usamos o endereço cadastrado.',
  },
];

/**
 * Contact details shared by registration and editing.
 *
 * These fields back the TELEFONE / WHATSAPP / COMO CHEGAR buttons that the
 * public page already renders. Before this form existed the buttons had
 * nothing to show, so every field here maps to something visible.
 */
export function ContactFieldsForm({ value, errors = {}, onChange, disabled }: ContactFieldsFormProps) {
  const { t } = useTranslation();

  const set = (key: keyof ContactFields) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, [key]: e.target.value });

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-zinc-900 dark:text-white">
          {t('business.contact.title', 'Contato e localização')}
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {t(
            'business.contact.subtitle',
            'Esses dados viram os botões de contato na sua página. Todos são opcionais.',
          )}
        </p>
      </div>

      {FIELDS.map((field) => {
        const error = errors[field.key];
        const inputId = `contact-${field.key}`;

        return (
          <div key={field.key}>
            <label
              htmlFor={inputId}
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              {field.label}
            </label>
            <input
              id={inputId}
              type={field.type || 'text'}
              value={value[field.key] || ''}
              onChange={set(field.key)}
              placeholder={field.placeholder}
              disabled={disabled}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${inputId}-error` : field.hint ? `${inputId}-hint` : undefined}
              className={`w-full px-4 py-2 rounded-xl border bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white disabled:opacity-50 ${
                error
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-zinc-300 dark:border-zinc-700 focus:ring-aji-rojo'
              } focus:outline-none focus:ring-2`}
            />
            {error ? (
              <p id={`${inputId}-error`} role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            ) : field.hint ? (
              <p id={`${inputId}-hint`} className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {field.hint}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export default ContactFieldsForm;
