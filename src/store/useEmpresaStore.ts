import { create } from 'zustand';
import { Empresa } from '../types/Empresa';

interface EmpresaState {
  empresas: Empresa[];
  fetchEmpresas: (filters: { query: string }) => Promise<void>;
}

export const useEmpresaStore = create<EmpresaState>((set) => ({
  empresas: [],
  fetchEmpresas: async (filters) => {
    // Simular chamada à API
    const mockEmpresas: Empresa[] = Array(10).fill(0).map((_, i) => ({
      id: i.toString(),
      name: `Empresa ${i + 1} - ${filters.query || 'Exemplo'}`,
      description: `Descrição da Empresa ${i + 1}.`,
      category: ['Restaurante', 'Loja', 'Serviço'][i % 3],
      location: ['Lima', 'Cusco', 'Arequipa'][i % 3],
      address: `Rua ${i + 1}, ${Math.floor(Math.random() * 1000)}, ${['Lima', 'Cusco', 'Arequipa'][i % 3]}`,
      phone: `+51 987654${i.toString().padStart(3, '0')}`,
      email: `contato@empresa${i + 1}.com`,
      website: `https://empresa${i + 1}.com`,
      rating: parseFloat((Math.random() * 5).toFixed(1)),
    }));
    set({ empresas: mockEmpresas });
  },
}));