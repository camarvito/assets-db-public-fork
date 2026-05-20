import { describe, expect, it } from 'vitest';
import { parseMoneyInput } from '@assets-db/shared';

describe('parseMoneyInput', () => {
  describe('regra 1: . e , presentes — último separador é decimal', () => {
    it('formato pt-BR com milhar e decimal', () => {
      expect(parseMoneyInput('1.234,56')).toBe('1234.56');
    });

    it('formato US com milhar e decimal', () => {
      expect(parseMoneyInput('1,234.56')).toBe('1234.56');
    });

    it('múltiplos separadores de milhar pt-BR', () => {
      expect(parseMoneyInput('1.234.567,89')).toBe('1234567.89');
    });

    it('múltiplos separadores de milhar US', () => {
      expect(parseMoneyInput('1,234,567.89')).toBe('1234567.89');
    });
  });

  describe('regra 2: só vírgula → decimal', () => {
    it('decimal simples', () => {
      expect(parseMoneyInput('1234,56')).toBe('1234.56');
    });

    it('uma casa decimal', () => {
      expect(parseMoneyInput('1,5')).toBe('1.5');
    });

    it('múltiplas vírgulas é ambíguo — devolve sem mudança', () => {
      expect(parseMoneyInput('1,234,567')).toBe('1,234,567');
    });
  });

  describe('regra 3: só pontos, 2+ → todos são milhar', () => {
    it('dois pontos', () => {
      expect(parseMoneyInput('1.234.567')).toBe('1234567');
    });
  });

  describe('regra 4: um ponto, 3 dígitos depois → milhar', () => {
    it('milhar simples', () => {
      expect(parseMoneyInput('1.234')).toBe('1234');
    });

    it('outro milhar', () => {
      expect(parseMoneyInput('12.000')).toBe('12000');
    });
  });

  describe('regra 5: um ponto, outras quantidades depois → decimal', () => {
    it('uma casa', () => {
      expect(parseMoneyInput('1.5')).toBe('1.5');
    });

    it('duas casas', () => {
      expect(parseMoneyInput('1.50')).toBe('1.50');
    });

    it('quatro casas', () => {
      expect(parseMoneyInput('1.2345')).toBe('1.2345');
    });
  });

  describe('regra 6: sem separador → inteiro', () => {
    it('inteiro simples', () => {
      expect(parseMoneyInput('1234')).toBe('1234');
    });
  });

  describe('limpeza de prefixo e espaços', () => {
    it('remove prefixo R$', () => {
      expect(parseMoneyInput('R$ 1.234,56')).toBe('1234.56');
    });

    it('remove espaços externos e internos', () => {
      expect(parseMoneyInput('  10,50  ')).toBe('10.50');
    });

    it('R$ minúsculo também é removido', () => {
      expect(parseMoneyInput('r$10,50')).toBe('10.50');
    });
  });

  describe('input inválido devolve cleaned sem mudança', () => {
    it('letras', () => {
      expect(parseMoneyInput('abc')).toBe('abc');
    });

    it('mistura de letras e números', () => {
      expect(parseMoneyInput('10a,50')).toBe('10a,50');
    });

    it('string vazia', () => {
      expect(parseMoneyInput('')).toBe('');
    });

    it('só espaços', () => {
      expect(parseMoneyInput('   ')).toBe('');
    });
  });
});
