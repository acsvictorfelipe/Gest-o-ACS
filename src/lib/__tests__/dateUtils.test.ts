import { describe, it, expect } from 'vitest';
import { calculateAge, getAgeNumber, getAgeInMonths, formatDate, validateCNS } from '../dateUtils';

describe('Date Utilities and Business Logic', () => {
  describe('calculateAge', () => {
    it('returns empty string for empty inputs', () => {
      expect(calculateAge('')).toBe('');
    });

    it('returns standard years and months representation under 5 years old', () => {
      // Create a date 2 years and 3 months ago
      const birth = new Date();
      birth.setFullYear(birth.getFullYear() - 2);
      birth.setMonth(birth.getMonth() - 3);
      const birthStr = birth.toISOString().split('T')[0];

      const ageStr = calculateAge(birthStr);
      expect(ageStr).toContain('2 Anos');
      expect(ageStr).toContain('3 Meses');
    });

    it('returns only years representation for 5+ years old', () => {
      // Create a date 10 years ago
      const birth = new Date();
      birth.setFullYear(birth.getFullYear() - 10);
      const birthStr = birth.toISOString().split('T')[0];

      const ageStr = calculateAge(birthStr);
      expect(ageStr).toBe('10 Anos');
    });
  });

  describe('getAgeNumber', () => {
    it('returns numeric age accurately', () => {
      const birth = new Date();
      birth.setFullYear(birth.getFullYear() - 25);
      // set to yesterday to ensure exact subtraction
      birth.setDate(birth.getDate() - 1);
      const birthStr = birth.toISOString().split('T')[0];

      expect(getAgeNumber(birthStr)).toBe(25);
    });

    it('returns 0 for empty inputs', () => {
      expect(getAgeNumber('')).toBe(0);
    });
  });

  describe('getAgeInMonths', () => {
    it('calculates age in months accurately', () => {
      const birth = new Date();
      birth.setMonth(birth.getMonth() - 14);
      const birthStr = birth.toISOString().split('T')[0];

      expect(getAgeInMonths(birthStr)).toBe(14);
    });
  });

  describe('formatDate', () => {
    it('formats YYYY-MM-DD to DD/MM/YYYY', () => {
      expect(formatDate('2026-06-25')).toBe('25/06/2026');
    });

    it('handles ISO timestamp formats correctly', () => {
      expect(formatDate('2026-06-25T13:45:00.000Z')).toBe('25/06/2026');
    });

    it('returns original string if malformed', () => {
      expect(formatDate('invalid-date')).toBe('invalid-date');
    });
  });

  describe('validateCNS (National Health Card)', () => {
    it('returns false for empty or invalid length CNS', () => {
      expect(validateCNS('')).toBe(false);
      expect(validateCNS('123')).toBe(false);
    });

    it('returns false for invalid starting digit', () => {
      // starting with 3, 4, 5, 6 is invalid
      expect(validateCNS('334455667788990')).toBe(false);
    });

    it('validates a correct permanent CNS starting with 1 or 2', () => {
      // A valid permanent CNS has a specific checksum
      // 100553752630002 (valid 1-starting CNS)
      expect(validateCNS('100553752630002')).toBe(true);
    });

    it('validates a correct temporary CNS starting with 7, 8, or 9', () => {
      // A valid provisional CNS
      // 700407001140350 (valid 7-starting CNS)
      expect(validateCNS('700407001140350')).toBe(true);
    });

    it('rejects an invalid CNS checksum', () => {
      expect(validateCNS('111111111111111')).toBe(false);
    });
  });
});
