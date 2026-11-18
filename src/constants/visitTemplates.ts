export interface VisitTemplate {
  id: string;
  type: string;
  category: 'Gestante & Puerpério' | 'Equipe Multiprofissional' | 'Geral & Cadastro' | 'Exames & Procedimentos' | 'Busca Ativa';
  label: string;
  defaultText: string;
}

export const VISIT_TEMPLATES: VisitTemplate[] = [
  // ── 1. Geral & Cadastro ─────────────────────────────────────────────
  {
    id: 'rotina',
    type: 'Rotina',
    category: 'Geral & Cadastro',
    label: 'Visita Domiciliar de Rotina',
    defaultText: 'VISITA DOMICILIAR DE ROTINA REALIZADA PELO ACS PARA ACOMPANHAMENTO DAS CONDIÇÕES DE SAÚDE DO CIDADÃO E DA FAMÍLIA. VERIFICADA A SITUAÇÃO VACINAL, ADESÃO AOS TRATAMENTOS E NECESSIDADES DE ATENDIMENTO NA UBS, COM ORIENTAÇÕES SOBRE PREVENÇÃO DE AGRAVOS E PROMOÇÃO À SAÚDE.'
  },
  {
    id: 'acompanhamento',
    type: 'Acompanhamento',
    category: 'Geral & Cadastro',
    label: 'Visita Domiciliar de Acompanhamento',
    defaultText: 'VISITA DOMICILIAR DE ACOMPANHAMENTO REALIZADA PELO ACS PARA MONITORAMENTO DO ESTADO CLÍNICO E CONTROLE DE COMORBIDADES (HIPERTENSÃO, DIABETES OU CONDIÇÕES CRÔNICAS). VERIFICADO O USO CONTÍNUO DE MEDICAÇÕES, VALIDADE DE RECEITAS E ORIENTADO RETORNO PROGRAMADO À UBS.'
  },
  {
    id: 'atualizacao_cadastro',
    type: 'Atualização de Cadastro',
    category: 'Geral & Cadastro',
    label: 'Atualização de Cadastro Domiciliar / Individual',
    defaultText: 'VISITA DOMICILIAR REALIZADA PARA ATUALIZAÇÃO DE CADASTRO INDIVIDUAL E DOMICILIAR NO E-SUS. CONFERIDOS DADOS PESSOAIS, COMPOSIÇÃO FAMILIAR, ENDEREÇO, CONTATO TELEFÔNICO, CARTÃO DO SUS E CONDICIONANTES SOCIAIS DA FAMÍLIA.'
  },
  {
    id: 'urgencia',
    type: 'Urgência',
    category: 'Geral & Cadastro',
    label: 'Visita por Demanda / Urgência',
    defaultText: 'VISITA DOMICILIAR REALIZADA EM CARÁTER DE URGÊNCIA/PRIORIDADE APÓS IDENTIFICAÇÃO DE QUEIXA AGUDA OU INTERCORRÊNCIA CLÍNICA. CIDADÃO E FAMÍLIA ORIENTADOS A PROCURAR ATENDIMENTO MÉDICO/ENFERMAGEM IMEDIATO NA UBS OU PRONTO ATENDIMENTO, COM COMUNICAÇÃO À EQUIPE DE SAÚDE.'
  },
  {
    id: 'ausente',
    type: 'Ausente',
    category: 'Geral & Cadastro',
    label: 'Cidadão / Domicílio Ausente',
    defaultText: 'TENTATIVA DE VISITA DOMICILIAR REALIZADA PELO ACS NA DATA REGISTRADA; PORÉM, O CIDADÃO/MORADORES ENCONTRAVAM-SE AUSENTES NO DOMICÍLIO NO MOMENTO DA ABORDAGEM. PROGRAMADA NOVA TENTATIVA DE VISITA PARA ACOMPANHAMENTO.'
  },

  // ── 2. Gestante & Puerpério ──────────────────────────────────────────
  {
    id: 'visita_gestante',
    type: 'Visita Gestante',
    category: 'Gestante & Puerpério',
    label: 'Visita Domiciliar Gestante (Pré-Natal)',
    defaultText: 'VISITA DOMICILIAR DE ACOMPANHAMENTO À GESTANTE REALIZADA PELO ACS. CONFERIDA A CADERNETA DA GESTANTE, FREQUÊNCIA ÀS CONSULTAS DE PRÉ-NATAL, EXAMES E SITUAÇÃO VACINAL. ORIENTADA QUANTO AOS SINAIS DE ALERTA (PRESSÃO ALTA, SANGRAMENTO, PERDA DE LÍQUIDO OU DOR INTENSA) E RETORNO AGENDADO NA UBS.'
  },
  {
    id: 'fechamento_prenatal',
    type: 'Fechamento Pré-Natal',
    category: 'Gestante & Puerpério',
    label: 'Fechamento Pré-Natal (Visita c/ Enfermeira)',
    defaultText: 'ENCERRAMENTO DE PRÉ-NATAL REALIZADO - VISITA DOMICILIAR EM CONJUNTO COM ENFERMEIRA PARA ACOLHIMENTO E REVISÃO FINAL DOS EXAMES DA GESTANTE. REPASSADAS ORIENTAÇÕES SOBRE SINAIS DE TRABALHO DE PARTO, INTERCORRÊNCIAS NO PÓS-PARTO E MANOBRA DE DESENGASGO INFANTIL. ENTREGUES OS AGENDAMENTOS DE CONSULTA PUERPERAL E PRIMEIRA CONSULTA DO RECÉM-NASCIDO.'
  },
  {
    id: 'fechamento_prenatal_rn',
    type: 'Fechamento Pré-Natal e 1ª Consulta RN',
    category: 'Gestante & Puerpério',
    label: 'Fechamento Pré-Natal e 1ª Consulta Recém-Nascido',
    defaultText: 'ENCERRAMENTO DE PRÉ-NATAL E ARTICULAÇÃO DA 1ª CONSULTA DO RECÉM-NASCIDO REALIZADOS. FEITA REVISÃO FINAL DE EXAMES DA GESTANTE, ORIENTAÇÕES SOBRE PUERPÉRIO, ALEITAMENTO MATERNO E MANOBRA DE DESENGASGO INFANTIL. ENTREGUES OS AGENDAMENTOS DA CONSULTA PUERPERAL, PRIMEIRA CONSULTA DO BEBÊ E ORIENTAÇÃO SOBRE DOCUMENTAÇÃO / CARTÃO DO SUS.'
  },
  {
    id: 'pos_parto',
    type: 'Pós-Parto',
    category: 'Gestante & Puerpério',
    label: 'Visita Domiciliar Puérpera (Pós-Parto)',
    defaultText: 'VISITA DOMICILIAR PUERPERAL REALIZADA PELO ACS PARA AVALIAÇÃO DO BEM-ESTAR DA MÃE NO PÓS-PARTO, CICATRIZAÇÃO, SANGRAMENTO, AMAMENTAÇÃO E APOIO FAMILIAR. VERIFICADO COMPARECIMENTO À CONSULTA PUERPERAL NA UBS E REPASSADAS ORIENTAÇÕES SOBRE SINAIS DE ALERTA E PLANEJAMENTO REPRODUTIVO.'
  },
  {
    id: 'recem_nascido',
    type: 'Recém-Nascido',
    category: 'Gestante & Puerpério',
    label: 'Visita Domiciliar ao Recém-Nascido',
    defaultText: 'VISITA DOMICILIAR AO RECÉM-NASCIDO REALIZADA PELO ACS. VERIFICADAS AS CONDIÇÕES GERAIS DO BEBÊ, ALEITAMENTO MATERNO EXCLUSIVO, CUIDADOS COM O COTO UMBILICAL, TESTES DE TRIAGEM NEONATAL (PEZINHO, ORELHINHA, OLHINHO, CORAÇÃOZINHO), CADERNETA DA CRIANÇA E VACINAS INICIAIS (BCG E HEPATITE B), ALÉM DA 1ª CONSULTA NA UBS.'
  },

  // ── 3. Equipe Multiprofissional ─────────────────────────────────────
  {
    id: 'visita_medico_enfermeira',
    type: 'Médico / Enfermeira',
    category: 'Equipe Multiprofissional',
    label: 'Visita Domiciliar Médico / Enfermeira',
    defaultText: 'VISITA DOMICILIAR COMPARTILHADA REALIZADA COM MÉDICO(A) E/OU ENFERMEIRO(A) DA ESF PARA AVALIAÇÃO CLÍNICA NO DOMICÍLIO. REPASSADAS ORIENTAÇÕES SOBRE MANEJO DO PACIENTE ACAMADO/DOMICILIADO, PREVENÇÃO DE LESÕES, ADMINISTRAÇÃO CORRETA DE MEDICAMENTOS E SEGUIMENTO DO PLANO DE CUIDADOS PARA PREVENIR INTERNAÇÕES EVITÁVEIS.'
  },

  // ── 4. Exames & Procedimentos ───────────────────────────────────────
  {
    id: 'coleta_exames',
    type: 'Coleta de Exames',
    category: 'Exames & Procedimentos',
    label: 'Coleta Domiciliar de Exames',
    defaultText: 'ACOMPANHAMENTO DE COLETA DOMICILIAR DE EXAMES LABORATORIAIS REALIZADA PELA EQUIPE DE SAÚDE. CIDADÃO E FAMÍLIA ORIENTADOS QUANTO AO PRAZO DE ENTREGA DOS RESULTADOS, AGENDAMENTO DE RETORNO NA UBS E CONTINUIDADE DO ACOMPANHAMENTO COM O ACS.'
  },

  // ── 5. Busca Ativa ──────────────────────────────────────────────────
  {
    id: 'busca_ativa',
    type: 'Busca Ativa',
    category: 'Busca Ativa',
    label: 'Busca Ativa (Entrega de Agendamento)',
    defaultText: 'VISITA DOMICILIAR DE BUSCA ATIVA REALIZADA PELO ACS PARA RECAPTAÇÃO E VÍNCULO DO CIDADÃO À UBS (CONSULTA, EXAME, VACINA OU ACOMPANHAMENTO PENDENTE). ENTREGUE EM MÃOS O COMPROVANTE DE AGENDAMENTO PARA O DIA 00/00/0000 ÀS 00:00H, COM REFORÇO SOBRE A IMPORTÂNCIA DO COMPARECIMENTO.'
  }
];

export const VISIT_CATEGORIES = [
  'Geral & Cadastro',
  'Gestante & Puerpério',
  'Equipe Multiprofissional',
  'Exames & Procedimentos',
  'Busca Ativa'
] as const;

export function getTemplateForType(type: string): VisitTemplate | undefined {
  return VISIT_TEMPLATES.find(t => t.type.toLowerCase() === type.toLowerCase() || t.label.toLowerCase() === type.toLowerCase());
}

export function isDefaultVisitTemplate(text: string): boolean {
  const normalized = (text || '').trim();
  if (!normalized) return false;
  return VISIT_TEMPLATES.some(t => t.defaultText.trim() === normalized);
}
