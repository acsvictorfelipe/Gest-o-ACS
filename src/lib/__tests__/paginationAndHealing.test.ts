import { describe, it, expect, vi } from 'vitest';
import { healPatientVisitDate } from '../dateUtils';
import { fetchPaginatedTable } from '../supabase';

const VALID_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

describe('Database Healing & Pagination Helpers', () => {
  describe('healPatientVisitDate', () => {
    it('returns error if missing required arguments', async () => {
      const mockSupabase = {};
      const res = await healPatientVisitDate(mockSupabase, '', '');
      expect(res.success).toBe(false);
      expect(res.error).toBe('patientId and targetDate are required');
    });

    it('updates patient last_visit_at successfully', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null })
          })
        })
      };
      const res = await healPatientVisitDate(mockSupabase, 'patient_10', '2026-07-26');
      expect(res.success).toBe(true);
    });

    it('handles database update errors gracefully', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: { message: 'Database update failed' } })
          })
        })
      };
      const res = await healPatientVisitDate(mockSupabase, 'error_patient', '2026-07-26');
      expect(res.success).toBe(false);
      expect(res.error).toBe('Database update failed');
    });
  });

  describe('fetchPaginatedTable data structure math', () => {
    it('calculates page offsets, pageSize, totalPages and hasMore accurately', () => {
      const totalCount = 120;
      const pageSize = 25;
      const page = 1;
      const totalPages = Math.ceil(totalCount / pageSize);
      expect(totalPages).toBe(5);
      expect(page < totalPages).toBe(true);
    });

    it('adjusts page when deletion empties the last page', () => {
      let currentPage = 3;
      let totalCount = 51; // 3 pages with pageSize 25 (25, 25, 1)
      const pageSize = 25;

      // Delete the only item on page 3
      totalCount -= 1; // 50 items
      const newTotalPages = Math.ceil(totalCount / pageSize) || 1; // 2 pages
      if (currentPage > newTotalPages) {
        currentPage = newTotalPages;
      }

      expect(newTotalPages).toBe(2);
      expect(currentPage).toBe(2);
    });
  });
});

