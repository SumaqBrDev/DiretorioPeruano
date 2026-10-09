import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HoursSection } from '../../src/components/HoursSection';
import { mapApiBusinessDetailToDisplay } from '../../src/lib/negocioDisplay';
import type { BusinessDetail } from '../../src/lib/api';

function makeBusinessDetail(hours: BusinessDetail['hours']): BusinessDetail {
  return {
    id: 'biz-12345',
    name: 'Chifa Público',
    category: 'restaurante',
    description: 'Comida peruana real',
    city: 'São Paulo',
    state: 'SP',
    address: { street: 'Rua Peru, 123', city: 'São Paulo', state: 'SP', zip: '01000-000' },
    cnpj: null,
    ownerFullName: '',
    ownerBirthCity: '',
    tags: ['ceviche'],
    photos: ['https://example.com/photo.jpg'],
    contact: {},
    rating: 4.7,
    reviewsCount: 3,
    email: '',
    phone: '+55 11 99999-1111',
    whatsapp: '+55 11 98888-2222',
    website: 'https://chifa.example.com',
    mapsUrl: 'https://maps.google.com/?q=chifa',
    hours,
  };
}

describe('Negocio business-detail display mapping', () => {
  it('maps API hours into the shape rendered by the detail HoursSection', () => {
    const business = mapApiBusinessDetailToDisplay(
      makeBusinessDetail([
        { day: 'Segunda', isOpen: true, open: '08:30', close: '17:45' },
        { day: 'Terça', isOpen: false, open: '', close: '' },
        { day: 'Quarta', isOpen: true, open: '08:30', close: '17:45' },
        { day: 'Quinta', isOpen: true, open: '08:30', close: '17:45' },
        { day: 'Sexta', isOpen: true, open: '08:30', close: '17:45' },
        { day: 'Sábado', isOpen: true, open: '11:00', close: '16:00' },
        { day: 'Domingo', isOpen: false, open: '', close: '' },
      ]),
      []
    );

    expect(business.hours).toEqual(
      expect.arrayContaining([
        { day: 'Segunda', time: '08:30 - 17:45', isOpen: true },
        { day: 'Terça', time: 'Fechado', isOpen: false },
        { day: 'Sábado', time: '11:00 - 16:00', isOpen: true },
      ])
    );
    expect(business.hours).not.toContainEqual(
      expect.objectContaining({ time: '09:00 - 18:00' })
    );
  });

  it('maps legacy hours=null to the page empty state instead of hardcoded sample hours', () => {
    const business = mapApiBusinessDetailToDisplay(makeBusinessDetail(null), []);

    expect(business.hours).toEqual([]);

    render(createElement(HoursSection, { business }));
    expect(screen.getByText('Horário não informado.')).toBeInTheDocument();
    expect(screen.queryByText('09:00 - 18:00')).not.toBeInTheDocument();
  });
});
