import { describe, it, expect } from 'vitest';
import { VISIT_TEMPLATES, getTemplateForType, isDefaultVisitTemplate } from '../visitTemplates';

describe('visitTemplates', () => {
  it('provides unique default texts for all visit types', () => {
    const normalizedTexts = VISIT_TEMPLATES.map(t => t.defaultText.trim());
    const uniqueTexts = new Set(normalizedTexts);
    expect(uniqueTexts.size).toBe(VISIT_TEMPLATES.length);

    for (const template of VISIT_TEMPLATES) {
      expect(template.defaultText.trim().length).toBeGreaterThan(20);
      expect(getTemplateForType(template.type)?.id).toBe(template.id);
      expect(isDefaultVisitTemplate(template.defaultText)).toBe(true);
    }
  });

  it('distinguishes custom text from default template text', () => {
    expect(isDefaultVisitTemplate('')).toBe(false);
    expect(isDefaultVisitTemplate('Visita personalizada pelo ACS com observações próprias.')).toBe(false);
  });
});
