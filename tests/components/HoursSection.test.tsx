import { createElement } from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HoursSection } from '../../src/components/HoursSection';
import type { DisplayBusiness } from '../../src/lib/localData';

function makeBusiness(hours: DisplayBusiness['hours']): DisplayBusiness {
  return {
    id: 1,
    name: 'Chifa Teste',
    category: 'restaurante',
    city: 'São Paulo - SP',
    address: 'Rua Peru, 123',
    rating: 4.8,
    reviewsCount: 12,
    tags: [],
    about: 'Comida peruana',
    images: [],
    hours,
    phone: '',
    whatsapp: '',
    website: '',
    email: '',
    latitude: 0,
    longitude: 0,
    menu: [],
    reviews: [],
  };
}

describe('HoursSection', () => {
  it('renders the real saved business hours entries', () => {
    render(
      createElement(HoursSection, {
        business: makeBusiness([
          { day: 'Segunda', time: '08:30 - 17:45', isOpen: true },
          { day: 'Terça', time: 'Fechado', isOpen: false },
        ]),
      })
    );

    const section = screen.getByRole('heading', { name: /horário de funcionamento/i }).closest('section');
    expect(section).not.toBeNull();
    expect(within(section as HTMLElement).getByText('Segunda')).toBeInTheDocument();
    expect(within(section as HTMLElement).getByText('08:30 - 17:45')).toBeInTheDocument();
    expect(within(section as HTMLElement).getByText('Terça')).toBeInTheDocument();
    expect(within(section as HTMLElement).getByText('Fechado')).toBeInTheDocument();
    expect(within(section as HTMLElement).queryByText('Horário não informado.')).not.toBeInTheDocument();
  });

  it('renders the empty state for legacy businesses with no saved hours', () => {
    render(createElement(HoursSection, { business: makeBusiness([]) }));

    expect(screen.getByText('Horário não informado.')).toBeInTheDocument();
    expect(screen.queryByText('09:00 - 18:00')).not.toBeInTheDocument();
  });
});
