export const Footer = () => {
  return (
    <footer className="bg-surface-light dark:bg-surface-dark py-6 border-t border-border-light dark:border-border-dark">
      <div className="container mx-auto px-4 text-center">
        <p className="text-text-light dark:text-text-dark">
          &copy; {new Date().getFullYear()} DiretorioPeruano. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
};