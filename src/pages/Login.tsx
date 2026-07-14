import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginWithEmail } from '../services/firebase';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isEmpresa, setIsEmpresa] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await loginWithEmail(email, password);
      if (isEmpresa) {
        navigate('/dashboard');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError('Falha no login. Verifique suas credenciais.');
      console.error(err);
    }
  };

  return (
    <div className="py-16 flex items-center justify-center">
      <div className="bg-surface-light dark:bg-surface-dark p-8 rounded-lg shadow-sm w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">
          {isEmpresa ? 'Login para Empresas' : 'Login para Usuários'}
        </h1>
        
        {error && (
          <div className="mb-4 p-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded">
            {error}
          </div>
        )}
        
        <div className="flex justify-center mb-6">
          <div className="flex rounded-lg overflow-hidden">
            <button
              onClick={() => setIsEmpresa(false)}
              className={`px-4 py-2 ${!isEmpresa ? 'bg-primary text-white' : 'bg-surface-light dark:bg-surface-dark text-text-light dark:text-text-dark'}`}
            >
              Usuário
            </button>
            <button
              onClick={() => setIsEmpresa(true)}
              className={`px-4 py-2 ${isEmpresa ? 'bg-primary text-white' : 'bg-surface-light dark:bg-surface-dark text-text-light dark:text-text-dark'}`}
            >
              Empresa
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-text-light dark:text-text-dark"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-text-light dark:text-text-dark"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-primary hover:bg-primary-light text-white py-2 rounded-lg font-semibold transition-colors"
          >
            Entrar
          </button>
        </form>
        
        <div className="mt-6 text-center text-sm text-text-light dark:text-text-dark">
          <p>
            {isEmpresa ? 'Não tem uma conta?' : 'Primeira vez aqui?'} {' '}
            <button className="text-primary hover:underline">Cadastre-se</button>
          </p>
        </div>
      </div>
    </div>
  );
};