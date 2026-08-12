import { parseDraftFieldInput } from './editable-draft-field';

describe('parseDraftFieldInput', () => {
  it('splits ingredients by newline, trims, and drops empty lines', () => {
    const result = parseDraftFieldInput(
      'ingredients',
      '2 cenouras\n  3 ovos  \n\n1 xicara de acucar\n',
    );
    expect(result).toEqual(['2 cenouras', '3 ovos', '1 xicara de acucar']);
  });

  it('splits instructions by newline the same way', () => {
    const result = parseDraftFieldInput(
      'instructions',
      'Bata tudo\nAsse por 40 min\n',
    );
    expect(result).toEqual(['Bata tudo', 'Asse por 40 min']);
  });

  it('splits tags by comma, trims, and drops empty entries', () => {
    const result = parseDraftFieldInput('tags', ' sobremesa ,, facil,bolo ');
    expect(result).toEqual(['sobremesa', 'facil', 'bolo']);
  });

  it('trims title as a plain string', () => {
    expect(parseDraftFieldInput('title', '  Bolo de Cenoura  ')).toBe(
      'Bolo de Cenoura',
    );
  });

  it('trims source_url as a plain string', () => {
    expect(parseDraftFieldInput('source_url', '  https://example.com  ')).toBe(
      'https://example.com',
    );
  });
});
