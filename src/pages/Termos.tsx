import { useTranslation } from 'react-i18next';
import { Breadcrumb } from '../components/Breadcrumb';
import { FileText, UserCheck, Shield, Scales, Warning, EnvelopeSimple } from '@phosphor-icons/react';
import { motion } from 'motion/react';

export const Termos = () => {
  const { t } = useTranslation();

  const sections = [
    {
      icon: FileText,
      title: 'Aceitação dos Termos',
      content:
        'Ao acessar ou utilizar a plataforma ConectaPeru, você concorda em cumprir e estar vinculado a estes Termos de Serviço. Se você não concordar com qualquer parte destes termos, não deverá utilizar nossos serviços.',
    },
    {
      icon: UserCheck,
      title: 'Cadastro e Conta',
      content:
        'Para cadastrar um negócio ou enviar avaliações, é necessário criar uma conta. Você é responsável por manter a confidencialidade de suas credenciais de acesso e por todas as atividades realizadas em sua conta. As informações fornecidas devem ser verdadeiras, precisas e atualizadas.',
    },
    {
      icon: Shield,
      title: 'Responsabilidades do Usuário',
      content:
        'Você concorda em não utilizar a plataforma para: (a) publicar conteúdo falso, enganoso ou difamatório, (b) violar direitos de propriedade intelectual, (c) enviar spam ou conteúdo não solicitado, (d) tentar acessar áreas restritas sem autorização, (e) realizar qualquer atividade que possa danificar ou sobrecarregar a infraestrutura da plataforma.',
    },
    {
      icon: Scales,
      title: 'Moderação de Avaliações',
      content:
        'A ConectaPeru se reserva o direito de moderar, editar ou remover avaliações que violem estes termos. Avaliações devem ser baseadas em experiências reais e genuínas. São proibidas avaliações falsas, pagas, ou com intuito de prejudicar injustamente um negócio. Avaliações com linguagem ofensiva, discriminatória ou difamatória serão removidas. Usuários que reincidirem em violações poderão ter suas contas suspensas.',
    },
    {
      icon: Warning,
      title: 'Uso Aceitável do Diretório',
      content:
        'O diretório ConectaPeru destina-se exclusivamente à conexão entre a comunidade peruana e negócios no Brasil. Não é permitido: (a) cadastrar negócios que não sejam peruanos ou não estejam localizados no Brasil, (b) utilizar a plataforma para fins ilegais, (c) reproduzir ou distribuir conteúdo da plataforma sem autorização, (d) realizar engenharia reversa ou extrair dados de forma automatizada (scraping).',
    },
    {
      icon: EnvelopeSimple,
      title: 'Contato',
      content:
        'Para questões relacionadas a estes Termos de Serviço, entre em contato conosco através do e-mail: contato@conectaperu.com.br. Responderemos no prazo máximo de 5 dias úteis.',
    },
  ];

  return (
    <div className="min-h-screen bg-creme-andino dark:bg-zinc-950">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Breadcrumb
          items={[
            { label: t('nav.home'), href: '/' },
            { label: 'Termos de Serviço' },
          ]}
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-12 mt-6">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 tracking-tighter leading-none mb-4">
              Termos de Serviço
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Última atualização: Julho de 2026
            </p>
          </div>

          <div className="prose prose-gray dark:prose-invert max-w-none mb-12">
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-lg">
              Bem-vindo(a) à <strong className="text-gray-900 dark:text-gray-100">ConectaPeru</strong>.
              Estes Termos de Serviço regem o uso da plataforma, do site e dos serviços oferecidos
              pela ConectaPeru. Ao utilizar nossos serviços, você aceita estes termos integralmente.
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
              Disposições Gerais
            </h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
              Estes Termos de Serviço são regidos pelas leis da República Federativa do Brasil.
              Caso qualquer disposição destes termos seja considerada inválida ou inexequível, as
              demais disposições permanecerão em pleno vigor e efeito.
            </p>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Alterações nos Termos
            </h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Reservamo-nos o direito de modificar estes termos a qualquer momento. Notificaremos
              os usuários sobre alterações significativas através da plataforma ou por e-mail. O uso
              continuado dos serviços após tais alterações constitui aceitação dos novos termos.
            </p>
          </div>

          <div className="mt-12 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Dúvidas sobre os Termos de Serviço? Entre em contato:{' '}
              <a
                href="mailto:contato@conectaperu.com.br"
                className="text-aji-rojo hover:underline font-medium"
              >
                contato@conectaperu.com.br
              </a>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
