export interface VisitTemplate {
  id: string;
  type: string;
  category: 'Gestante & Puerpério' | 'Equipe Multiprofissional' | 'Geral & Cadastro' | 'Exames & Procedimentos' | 'Busca Ativa';
  label: string;
  defaultText: string;
}

export const VISIT_TEMPLATES: VisitTemplate[] = [
  // ── 1. Gestante & Puerpério ──────────────────────────────────────────
  {
    id: 'fechamento_prenatal',
    type: 'Fechamento Pré-Natal',
    category: 'Gestante & Puerpério',
    label: 'Fechamento Pré-Natal (Visita c/ Enfermeira)',
    defaultText: 'ENCERRAMENTO DE PRÉ-NATAL REALIZADO - VISITA DOMICILIAR REALIZADA COM ENFERMEIRA, ACOLHIMENTO E REVISÃO FINAL DE EXAMES DA GESTANTE. FORAM REPASSADAS ORIENTAÇÕES SOBRE INTERCORRÊNCIAS NO PÓS-PARTO E EXECUTADA CAPACITAÇÃO PRÁTICA EM MANOBRA DE DESENGASGO INFANTIL. A AÇÃO RESULTOU EM MAIOR CONFIANÇA DA MÃE QUANTO AO MANEJO DO RECÉM-NASCIDO E AUTOCUIDADO. ENTREGUE AGENDAMENTO DE CONSULTA PUERPERAL E PRIMEIRA CONSULTA DO BEBÊ E CARTÃO DO SUS.'
  },
  {
    id: 'fechamento_prenatal_rn',
    type: 'Fechamento Pré-Natal e 1ª Consulta RN',
    category: 'Gestante & Puerpério',
    label: 'Fechamento Pré-Natal e 1ª Consulta Recém-Nascido',
    defaultText: 'ENCERRAMENTO DE PRÉ-NATAL REALIZADO - ACOLHIMENTO E REVISÃO FINAL DE EXAMES DA GESTANTE. FORAM REPASSADAS ORIENTAÇÕES SOBRE INTERCORRÊNCIAS NO PÓS-PARTO E EXECUTADA CAPACITAÇÃO PRÁTICA EM MANOBRA DE DESENGASGO INFANTIL. A AÇÃO RESULTOU EM MAIOR CONFIANÇA DA MÃE QUANTO AO MANEJO DO RECÉM-NASCIDO E AUTOCUIDADO.\nENTREGUE AGENDAMENTO DE CONSULTA PUERPERAL E PRIMEIRA CONSULTA DO BEBÊ E CARTÃO DO SUS.'
  },
  {
    id: 'visita_gestante',
    type: 'Visita Gestante',
    category: 'Gestante & Puerpério',
    label: 'Visita Domiciliar Gestante (Acompanhamento)',
    defaultText: 'VISITA DOMICILIAR REALIZADA GESTANTE - CONSULTAS EM DIA / VACINAÇÃO ATUALIZADA, ORIENTADA SOBRE OS PERIGOS (PRESSÃO ALTA, SANGRAMENTO). CADASTRO ATUALIZADO. AGENDAMENTO DE CONSULTA DE RETORNO SOLICITADO À EQUIPE RESPONSÁVEL.'
  },

  // ── 2. Equipe Multiprofissional ─────────────────────────────────────
  {
    id: 'visita_medico_enfermeira',
    type: 'Médico / Enfermeira',
    category: 'Equipe Multiprofissional',
    label: 'Visita Domiciliar Médico / Enfermeira',
    defaultText: 'REALIZADA CONSULTA DOMICILIAR PELO MÉDICO -- OU ENFERMEIRA -- ORIENTAÇÕES SOBRE MANEJO DO PACIENTE ACAMADO, PREVENÇÃO DE LESÕES E ADMINISTRAÇÃO DE MEDICAMENTOS. CUIDADOR ORIENTADO E APTO A SEGUIR O PLANO DE CUIDADOS PARA GARANTIR E PREVENIR INTERNAÇÕES HOSPITALARES EVITÁVEIS.'
  },

  // ── 3. Geral & Cadastro ─────────────────────────────────────────────
  {
    id: 'atualizacao_cadastro',
    type: 'Atualização de Cadastro',
    category: 'Geral & Cadastro',
    label: 'Visita Domiciliar Atualização de Cadastro',
    defaultText: 'VISITA DOMICILIAR REALIZADA PARA ATUALIZAÇÃO DE CADASTRO E ACOMPANHAMENTO A SAÚDE DA FAMILIA. REALIZADA ORIENTAÇÃO SOBRE VACINAS, EXAMES E AGENDAMENTO DE CONSULTAS.'
  },
  {
    id: 'acompanhamento_rotina',
    type: 'Acompanhamento',
    category: 'Geral & Cadastro',
    label: 'Visita Domiciliar Acompanhamento',
    defaultText: 'VISITA DOMICILIAR REALIZADA PARA ATUALIZAÇÃO DE CADASTRO E ACOMPANHAMENTO A SAÚDE DA FAMILIA. REALIZADA ORIENTAÇÃO SOBRE VACINAS, EXAMES E AGENDAMENTO DE CONSULTAS.'
  },

  // ── 4. Exames & Procedimentos ───────────────────────────────────────
  {
    id: 'coleta_exames',
    type: 'Coleta de Exames',
    category: 'Exames & Procedimentos',
    label: 'Coleta Domiciliar de Exames',
    defaultText: 'REALIZADA COLETA DE EXAME DOMICILIAR E ACOMPANHAMENTO A SAÚDE DA FAMILIA. REALIZADA ORIENTAÇÃO SOBRE CONSULTA DE RETORNO COM ACS E MÉDICO SOBRE DEVOLUTIVA DE RESULTADO DO EXAME.'
  },

  // ── 5. Busca Ativa ──────────────────────────────────────────────────
  {
    id: 'busca_ativa',
    type: 'Busca Ativa',
    category: 'Busca Ativa',
    label: 'Busca Ativa (Entrega de Agendamento)',
    defaultText: 'VISITA DOMICILIAR REALIZADA, ENTREGUE EM MÃOS AGENDAMENTO NA DATA DE 00/00/0000 AS 00:00H.'
  }
];

export const VISIT_CATEGORIES = [
  'Gestante & Puerpério',
  'Equipe Multiprofissional',
  'Geral & Cadastro',
  'Exames & Procedimentos',
  'Busca Ativa'
] as const;

export function getTemplateForType(type: string): VisitTemplate | undefined {
  return VISIT_TEMPLATES.find(t => t.type.toLowerCase() === type.toLowerCase() || t.label.toLowerCase() === type.toLowerCase());
}
