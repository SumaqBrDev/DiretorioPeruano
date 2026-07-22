import { useTranslation } from 'react-i18next';
import { Breadcrumb } from '../components/Breadcrumb';
import { ShieldCheck, Database, Clock, Eye, Lock, Trash } from '@phosphor-icons/react';
import { motion } from 'motion/react';

export const Privacidade = () => {
  const { t } = useTranslation();

  const sections = [
    {
      icon: ShieldCheck,
      title: 'Compromisso com a LGPD',
      content:
        'A ConectaPeru está comprometida com a proteção dos seus dados pessoais em conformidade com a Lei Geral de Proteção de Dados Pessoais (LGPD - Lei nº 13.709/2018). Esta política explica como coletamos, usamos, armazenamos e protegemos suas informações.',
    },
    {
      icon: Database,
      title: 'Dados Coletados',
      content:
        'Coletamos apenas os dados estritamente necessários para o funcionamento do diretório: nome, e-mail, informações do negócio (nome, endereço, telefone, horários, categoria, fotos), e avaliações enviadas por usuários. Não coletamos dados sensíveis como origem racial, convicção religiosa, opinião política, dados genéticos ou biométricos.',
    },
    {
      icon: Eye,
      title: 'Uso dos Dados',
      content:
        'O uso dos dados é exclusivo para o funcionamento da plataforma ConectaPeru. Não vendemos, alugamos ou repassamos seus dados a terceiros (data brokers). Seus dados são utilizados para: (a) operar e manter o diretório de negócios, (b) permitir que usuários encontrem e avaliem negócios, (c) enviar comunicações essenciais sobre sua conta, e (d) melhorar a experiência na plataforma.',
    },
    {
      icon: Clock,
      title: 'Tempo de Permanência (Retenção)',
      content:
        'Seus dados permanecerão armazenados apenas enquanto sua conta estiver ativa. Ao solicitar a exclusão da conta, todos os seus dados pessoais e informações do negócio serão permanentemente apagados de nossos servidores, exceto aqueles que a lei exige que mantenhamos por um período mínimo.',
    },
    {
      icon: Lock,
      title: 'Segurança dos Dados',
      content:
        'Implementamos medidas de segurança técnicas e organizacionais para proteger seus dados contra acesso não autorizado, alteração, divulgação ou destruição. Utilizamos criptografia em trânsito (TLS) e em repouso, controles de acesso rigorosos, e monitoramento contínuo de segurança.',
    },
    {
      icon: Trash,
      title: 'Seus Direitos (LGPD)',
      content:
        'Você tem direito a: (a) confirmar a existência de tratamento de seus dados, (b) acessar seus dados, (c) corrigir dados incompletos, inexatos ou desatualizados, (d) anonimizar, bloquear ou eliminar dados desnecessários, (e) portar seus dados a outro fornecedor, e (f) eliminar dados pessoais tratados com seu consentimento. Para exercer qualquer um destes direitos, entre em contato pelo e-mail: privacidade@conectaperu.com.br.',
    },
  ];

  return (
    <div className="min-h-screen bg-creme-andino dark:bg-zinc-950">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Breadcrumb
          items={[
            { label: t('nav.home'), href: '/' },
            { label: 'Política de Privacidade' },
          ]}
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-12 mt-6">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 tracking-tighter leading-none mb-4">
              Política de Privacidade
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Última atualização: Julho de 2026
            </p>
          </div>

          <div className="prose prose-gray dark:prose-invert max-w-none mb-12">
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-lg">
              A sua privacidade é importante para nós. Esta Política de Privacidade descreve como a{' '}
              <strong className="text-gray-900 dark:text-gray-100">ConectaPeru</strong> coleta, usa,
              armazena e protege os dados pessoais dos usuários, em conformidade com a{' '}
              <strong className="text-gray-900 dark:text-gray-100">
                Lei Geral de Proteção de Dados Pessoais (LGPD - Lei nº 13.709/2018)
              </strong>
              .
            </p>
          </div>

          <div className="grid gap-6">
            {sections.map((section, index) => {
              const Icon = section.icon;
              return (
                <motion.div
                  key={section.title}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.08 }}
                  className="bg-white dark:bg-zinc-800/80 rounded-xl p-6 border border-oro-inca/10 shadow-sm"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-aji-rojo/10 dark:bg-aji-rojo/20 rounded-lg flex items-center justify-center">
                      <Icon className="w-5 h-5 text-aji-rojo" weight="duotone" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        {section.title}
                      </h2>
                      <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                        {section.content}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-12 p-6 bg-white dark:bg-zinc-800/60 rounded-xl border border-oro-inca/10">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Consentimento
            </h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
              Ao cadastrar sua conta ou negócio na ConectaPeru, você declara estar ciente e de
              acordo com os termos desta Política de Privacidade. Caso não concorde, não utilize
              nossos serviços.
            </p>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Alterações nesta Política
            </h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Reservamo-nos o direito de modificar esta política a qualquer momento. Alterações
              significativas serão comunicadas através da plataforma ou por e-mail. Recomendamos
              revisar esta página periodicamente.
            </p>
          </div>

          <div className="mt-12 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Dúvidas sobre privacidade? Entre em contato:{' '}
              <a
                href="mailto:privacidade@conectaperu.com.br"
                className="text-aji-rojo hover:underline font-medium"
              >
                privacidade@conectaperu.com.br
              </a>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
