import { z } from 'zod';

export const patientFormSchema = z.object({
  name: z.string().min(3, { message: "O nome completo deve ter pelo menos 3 caracteres" }),
  cns: z.string().optional().or(z.literal('')),
  createdAt: z.string().optional(),
  responsibleCns: z.string().optional().or(z.literal('')),
  isFamilyResponsible: z.boolean().default(false),
  birthDate: z.string().min(1, { message: "Data de nascimento é obrigatória" }),
  gender: z.string().min(1, { message: "Gênero é obrigatório" }),
  visitDate: z.string().optional(),
  visitType: z.string().default('Rotina'),
  visitSummary: z.string().optional(),
  address: z.string().min(1, { message: "Endereço é obrigatório" }),
  number: z.string().min(1, { message: "Número do endereço é obrigatório" }),
  complement: z.string().optional().or(z.literal('')),
  contact: z.string().optional().or(z.literal('')),
  contact2: z.string().optional().or(z.literal('')),
  messageContact: z.string().optional().or(z.literal('')),
  householdId: z.string().optional().or(z.literal('')),
  categories: z.array(z.string()).default([]),
  clinicalData: z.object({
    sus_atualizado: z.string().default('Não'),
    historicoGestacoes: z.array(z.any()).default([]),
    visitasGerais: z.array(z.any()).default([]),
    consultasGerais: z.array(z.any()).default([]),
    socialBenefits: z.array(z.string()).default([]),
    receitas: z.array(z.any()).default([]),
    saudeMental: z.object({
      notes: z.string().default('')
    }).default({ notes: '' }),
    chronic: z.object({
      diabetes: z.string().default('Não'),
      diabetesData: z.object({
        avaliacaoPes: z.string().default('Não'),
        hemoglobinaGlicada: z.string().default('Não'),
        visitaAcs1: z.string().default(''),
        visitaAcs2: z.string().default(''),
        usoInsulina: z.boolean().default(false)
      }).default({
        avaliacaoPes: 'Não',
        hemoglobinaGlicada: 'Não',
        visitaAcs1: '',
        visitaAcs2: '',
        usoInsulina: false
      }),
      hipertensao: z.string().default('Não'),
      hipertensaoData: z.object({
        consultas6Meses: z.string().default('Não'),
        visitaAcs1: z.string().default(''),
        visitaAcs2: z.string().default('')
      }).default({
        consultas6Meses: 'Não',
        visitaAcs1: '',
        visitaAcs2: ''
      })
    }).default({
      diabetes: 'Não',
      diabetesData: {
        avaliacaoPes: 'Não',
        hemoglobinaGlicada: 'Não',
        visitaAcs1: '',
        visitaAcs2: '',
        usoInsulina: false
      },
      hipertensao: 'Não',
      hipertensaoData: {
        consultas6Meses: 'Não',
        visitaAcs1: '',
        visitaAcs2: ''
      }
    }),
    acamadodomiciliado: z.object({
      dependencia: z.string().default('Total'),
      curativos: z.string().default('Não'),
      cuidador: z.string().default('Não'),
      usoFralda: z.string().default('Não'),
      tamanhoFralda: z.string().default(''),
      diabetes: z.string().default('Não'),
      diabetesData: z.object({
        avaliacaoPes: z.string().default('Não'),
        hemoglobinaGlicada: z.string().default('Não'),
        visitaAcs1: z.string().default(''),
        visitaAcs2: z.string().default(''),
        usoInsulina: z.boolean().default(false)
      }).default({
        avaliacaoPes: 'Não',
        hemoglobinaGlicada: 'Não',
        visitaAcs1: '',
        visitaAcs2: '',
        usoInsulina: false
      }),
      visitasAcsDiabetes: z.array(z.string()).default([]),
      hipertensao: z.string().default('Não'),
      hipertensaoData: z.object({
        consultas6Meses: z.string().default('Não'),
        visitaAcs1: z.string().default(''),
        visitaAcs2: z.string().default('')
      }).default({
        consultas6Meses: 'Não',
        visitaAcs1: '',
        visitaAcs2: ''
      }),
      observacoes: z.string().default('')
    }).default({
      dependencia: 'Total',
      curativos: 'Não',
      cuidador: 'Não',
      usoFralda: 'Não',
      tamanhoFralda: '',
      diabetes: 'Não',
      diabetesData: {
        avaliacaoPes: 'Não',
        hemoglobinaGlicada: 'Não',
        visitaAcs1: '',
        visitaAcs2: '',
        usoInsulina: false
      },
      visitasAcsDiabetes: [],
      hipertensao: 'Não',
      hipertensaoData: {
        consultas6Meses: 'Não',
        visitaAcs1: '',
        visitaAcs2: ''
      },
      observacoes: ''
    }),
    gestante: z.object({
      dum: z.string().default(''),
      dpp: z.string().default(''),
      consultas: z.array(z.string()).default([]),
      visitasAcs: z.array(z.string()).default([]),
      visitasAcsDiabetes: z.array(z.string()).default([]),
      dtpa: z.string().default('Não'),
      sifilis: z.string().default('NÃO REALIZADO'),
      hepatiteB: z.string().default('NÃO REALIZADO'),
      hiv: z.string().default('NÃO REALIZADO'),
      hepatiteC: z.string().default('NÃO REALIZADO'),
      puerperioConsulta: z.string().default(''),
      puerperioVisita: z.string().default(''),
      saudeBucal: z.string().default(''),
      planejamentoFamiliar: z.string().default('Não'),
      diabetes: z.string().default('Não'),
      diabetesData: z.object({
        avaliacaoPes: z.string().default('Não'),
        hemoglobinaGlicada: z.string().default('Não'),
        visitaAcs1: z.string().default(''),
        visitaAcs2: z.string().default(''),
        usoInsulina: z.boolean().default(false)
      }).default({
        avaliacaoPes: 'Não',
        hemoglobinaGlicada: 'Não',
        visitaAcs1: '',
        visitaAcs2: '',
        usoInsulina: false
      }),
      hipertensao: z.string().default('Não'),
      hipertensaoData: z.object({
        consultas6Meses: z.string().default('Não'),
        visitaAcs1: z.string().default(''),
        visitaAcs2: z.string().default('')
      }).default({
        consultas6Meses: 'Não',
        visitaAcs1: '',
        visitaAcs2: ''
      }),
      notes: z.string().default('')
    }).default({
      dum: '',
      dpp: '',
      consultas: [],
      visitasAcs: [],
      visitasAcsDiabetes: [],
      dtpa: 'Não',
      sifilis: 'NÃO REALIZADO',
      hepatiteB: 'NÃO REALIZADO',
      hiv: 'NÃO REALIZADO',
      hepatiteC: 'NÃO REALIZADO',
      puerperioConsulta: '',
      puerperioVisita: '',
      saudeBucal: '',
      planejamentoFamiliar: 'Não',
      diabetes: 'Não',
      diabetesData: {
        avaliacaoPes: 'Não',
        hemoglobinaGlicada: 'Não',
        visitaAcs1: '',
        visitaAcs2: '',
        usoInsulina: false
      },
      hipertensao: 'Não',
      hipertensaoData: {
        consultas6Meses: 'Não',
        visitaAcs1: '',
        visitaAcs2: ''
      },
      notes: ''
    }),
    crianca: z.object({
      consultas: z.array(z.string()).default([]),
      visitasAcs: z.array(z.string()).default([]),
      visita30dias: z.string().default(''),
      visita6meses: z.string().default(''),
      visita30diasNaoRealizada: z.boolean().default(false),
      visita6mesesNaoRealizada: z.boolean().default(false),
      proximaVisitaSugerida: z.string().default(''),
      vacinas: z.record(z.string(), z.any()).default({}),
      notes: z.string().default('')
    }).default({
      consultas: [],
      visitasAcs: [],
      visita30dias: '',
      visita6meses: '',
      visita30diasNaoRealizada: false,
      visita6mesesNaoRealizada: false,
      proximaVisitaSugerida: '',
      vacinas: {},
      notes: ''
    }),
    adulto: z.object({
      diabetes: z.string().default('Não'),
      diabetesData: z.object({
        avaliacaoPes: z.string().default('Não'),
        hemoglobinaGlicada: z.string().default('Não'),
        visitaAcs1: z.string().default(''),
        visitaAcs2: z.string().default(''),
        usoInsulina: z.boolean().default(false)
      }).default({
        avaliacaoPes: 'Não',
        hemoglobinaGlicada: 'Não',
        visitaAcs1: '',
        visitaAcs2: '',
        usoInsulina: false
      }),
      visitasAcsDiabetes: z.array(z.string()).default([]),
      hipertensao: z.string().default('Não'),
      hipertensaoData: z.object({
        consultas6Meses: z.string().default('Não'),
        visitaAcs1: z.string().default(''),
        visitaAcs2: z.string().default('')
      }).default({
        consultas6Meses: 'Não',
        visitaAcs1: '',
        visitaAcs2: ''
      }),
      notes: z.string().default('')
    }).default({
      diabetes: 'Não',
      diabetesData: {
        avaliacaoPes: 'Não',
        hemoglobinaGlicada: 'Não',
        visitaAcs1: '',
        visitaAcs2: '',
        usoInsulina: false
      },
      visitasAcsDiabetes: [],
      hipertensao: 'Não',
      hipertensaoData: {
        consultas6Meses: 'Não',
        visitaAcs1: '',
        visitaAcs2: ''
      },
      notes: ''
    }),
    idoso: z.object({
      diabetes: z.string().default('Não'),
      diabetesData: z.object({
        avaliacaoPes: z.string().default('Não'),
        hemoglobinaGlicada: z.string().default('Não'),
        visitaAcs1: z.string().default(''),
        visitaAcs2: z.string().default(''),
        usoInsulina: z.boolean().default(false)
      }).default({
        avaliacaoPes: 'Não',
        hemoglobinaGlicada: 'Não',
        visitaAcs1: '',
        visitaAcs2: '',
        usoInsulina: false
      }),
      visitasAcsDiabetes: z.array(z.string()).default([]),
      hipertensao: z.string().default('Não'),
      hipertensaoData: z.object({
        consultas6Meses: z.string().default('Não'),
        visitaAcs1: z.string().default(''),
        visitaAcs2: z.string().default('')
      }).default({
        consultas6Meses: 'Não',
        visitaAcs1: '',
        visitaAcs2: ''
      }),
      vacinaInfluenza: z.string().default('Não'),
      visitaAcs1: z.string().default(''),
      visitaAcs2: z.string().default(''),
      consultaMedicaAnualData: z.string().default('')
    }).default({
      diabetes: 'Não',
      diabetesData: {
        avaliacaoPes: 'Não',
        hemoglobinaGlicada: 'Não',
        visitaAcs1: '',
        visitaAcs2: '',
        usoInsulina: false
      },
      visitasAcsDiabetes: [],
      hipertensao: 'Não',
      hipertensaoData: {
        consultas6Meses: 'Não',
        visitaAcs1: '',
        visitaAcs2: ''
      },
      vacinaInfluenza: 'Não',
      visitaAcs1: '',
      visitaAcs2: '',
      consultaMedicaAnualData: ''
    }),
    rastreamento: z.object({
      exameCitopatologico: z.string().default('Não'),
      saudeSexualReprodutiva: z.string().default('Não'),
      mamografia: z.string().default('Não'),
      vacinaHpv: z.string().default('Não')
    }).default({
      exameCitopatologico: 'Não',
      saudeSexualReprodutiva: 'Não',
      mamografia: 'Não',
      vacinaHpv: 'Não'
    }),
    obito: z.object({
      flg_obito: z.boolean().default(false),
      data_obito: z.string().default(''),
      observacoes: z.string().default('')
    }).default({
      flg_obito: false,
      data_obito: '',
      observacoes: ''
    })
  }).default({
    sus_atualizado: 'Não',
    historicoGestacoes: [],
    visitasGerais: [],
    consultasGerais: [],
    socialBenefits: [],
    receitas: [],
    saudeMental: { notes: '' },
    chronic: {
      diabetes: 'Não',
      diabetesData: {
        avaliacaoPes: 'Não',
        hemoglobinaGlicada: 'Não',
        visitaAcs1: '',
        visitaAcs2: '',
        usoInsulina: false
      },
      hipertensao: 'Não',
      hipertensaoData: {
        consultas6Meses: 'Não',
        visitaAcs1: '',
        visitaAcs2: ''
      }
    },
    acamadodomiciliado: {
      dependencia: 'Total',
      curativos: 'Não',
      cuidador: 'Não',
      usoFralda: 'Não',
      tamanhoFralda: '',
      diabetes: 'Não',
      diabetesData: {
        avaliacaoPes: 'Não',
        hemoglobinaGlicada: 'Não',
        visitaAcs1: '',
        visitaAcs2: '',
        usoInsulina: false
      },
      visitasAcsDiabetes: [],
      hipertensao: 'Não',
      hipertensaoData: {
        consultas6Meses: 'Não',
        visitaAcs1: '',
        visitaAcs2: ''
      },
      observacoes: ''
    },
    gestante: {
      dum: '',
      dpp: '',
      consultas: [],
      visitasAcs: [],
      visitasAcsDiabetes: [],
      dtpa: 'Não',
      sifilis: 'NÃO REALIZADO',
      hepatiteB: 'NÃO REALIZADO',
      hiv: 'NÃO REALIZADO',
      hepatiteC: 'NÃO REALIZADO',
      puerperioConsulta: '',
      puerperioVisita: '',
      saudeBucal: '',
      planejamentoFamiliar: 'Não',
      diabetes: 'Não',
      diabetesData: {
        avaliacaoPes: 'Não',
        hemoglobinaGlicada: 'Não',
        visitaAcs1: '',
        visitaAcs2: '',
        usoInsulina: false
      },
      hipertensao: 'Não',
      hipertensaoData: {
        consultas6Meses: 'Não',
        visitaAcs1: '',
        visitaAcs2: ''
      },
      notes: ''
    },
    crianca: {
      consultas: [],
      visitasAcs: [],
      visita30dias: '',
      visita6meses: '',
      visita30diasNaoRealizada: false,
      visita6mesesNaoRealizada: false,
      proximaVisitaSugerida: '',
      vacinas: {},
      notes: ''
    },
    adulto: {
      diabetes: 'Não',
      diabetesData: {
        avaliacaoPes: 'Não',
        hemoglobinaGlicada: 'Não',
        visitaAcs1: '',
        visitaAcs2: '',
        usoInsulina: false
      },
      visitasAcsDiabetes: [],
      hipertensao: 'Não',
      hipertensaoData: {
        consultas6Meses: 'Não',
        visitaAcs1: '',
        visitaAcs2: ''
      },
      notes: ''
    },
    idoso: {
      diabetes: 'Não',
      diabetesData: {
        avaliacaoPes: 'Não',
        hemoglobinaGlicada: 'Não',
        visitaAcs1: '',
        visitaAcs2: '',
        usoInsulina: false
      },
      visitasAcsDiabetes: [],
      hipertensao: 'Não',
      hipertensaoData: {
        consultas6Meses: 'Não',
        visitaAcs1: '',
        visitaAcs2: ''
      },
      vacinaInfluenza: 'Não',
      visitaAcs1: '',
      visitaAcs2: '',
      consultaMedicaAnualData: ''
    },
    rastreamento: {
      exameCitopatologico: 'Não',
      saudeSexualReprodutiva: 'Não',
      mamografia: 'Não',
      vacinaHpv: 'Não'
    },
    obito: {
      flg_obito: false,
      data_obito: '',
      observacoes: ''
    }
  })
});

export type PatientFormValues = z.infer<typeof patientFormSchema>;

export const initialDefaultValues: PatientFormValues = {
  name: '',
  cns: '',
  createdAt: '',
  responsibleCns: '',
  isFamilyResponsible: false,
  birthDate: '',
  gender: '',
  visitDate: '',
  visitType: 'Rotina',
  visitSummary: '',
  address: '',
  number: '',
  complement: '',
  contact: '',
  contact2: '',
  messageContact: '',
  householdId: '',
  categories: [],
  clinicalData: {
    sus_atualizado: 'Não',
    historicoGestacoes: [],
    visitasGerais: [],
    consultasGerais: [],
    socialBenefits: [],
    receitas: [],
    saudeMental: {
      notes: ''
    },
    chronic: {
      diabetes: 'Não',
      diabetesData: {
        avaliacaoPes: 'Não',
        hemoglobinaGlicada: 'Não',
        visitaAcs1: '',
        visitaAcs2: '',
        usoInsulina: false
      },
      hipertensao: 'Não',
      hipertensaoData: {
        consultas6Meses: 'Não',
        visitaAcs1: '',
        visitaAcs2: ''
      }
    },
    acamadodomiciliado: {
      dependencia: 'Total',
      curativos: 'Não',
      cuidador: 'Não',
      usoFralda: 'Não',
      tamanhoFralda: '',
      diabetes: 'Não',
      diabetesData: {
        avaliacaoPes: 'Não',
        hemoglobinaGlicada: 'Não',
        visitaAcs1: '',
        visitaAcs2: '',
        usoInsulina: false
      },
      visitasAcsDiabetes: [],
      hipertensao: 'Não',
      hipertensaoData: {
        consultas6Meses: 'Não',
        visitaAcs1: '',
        visitaAcs2: ''
      },
      observacoes: ''
    },
    gestante: {
      dum: '',
      dpp: '',
      consultas: [],
      visitasAcs: [],
      visitasAcsDiabetes: [],
      dtpa: 'Não',
      sifilis: 'NÃO REALIZADO',
      hepatiteB: 'NÃO REALIZADO',
      hiv: 'NÃO REALIZADO',
      hepatiteC: 'NÃO REALIZADO',
      puerperioConsulta: '',
      puerperioVisita: '',
      saudeBucal: '',
      planejamentoFamiliar: 'Não',
      diabetes: 'Não',
      diabetesData: {
        avaliacaoPes: 'Não',
        hemoglobinaGlicada: 'Não',
        visitaAcs1: '',
        visitaAcs2: '',
        usoInsulina: false
      },
      hipertensao: 'Não',
      hipertensaoData: {
        consultas6Meses: 'Não',
        visitaAcs1: '',
        visitaAcs2: ''
      },
      notes: ''
    },
    crianca: {
      consultas: [],
      visitasAcs: [],
      visita30dias: '',
      visita6meses: '',
      visita30diasNaoRealizada: false,
      visita6mesesNaoRealizada: false,
      proximaVisitaSugerida: '',
      vacinas: {},
      notes: ''
    },
    adulto: {
      diabetes: 'Não',
      diabetesData: {
        avaliacaoPes: 'Não',
        hemoglobinaGlicada: 'Não',
        visitaAcs1: '',
        visitaAcs2: '',
        usoInsulina: false
      },
      visitasAcsDiabetes: [],
      hipertensao: 'Não',
      hipertensaoData: {
        consultas6Meses: 'Não',
        visitaAcs1: '',
        visitaAcs2: ''
      },
      notes: ''
    },
    idoso: {
      diabetes: 'Não',
      diabetesData: {
        avaliacaoPes: 'Não',
        hemoglobinaGlicada: 'Não',
        visitaAcs1: '',
        visitaAcs2: '',
        usoInsulina: false
      },
      visitasAcsDiabetes: [],
      hipertensao: 'Não',
      hipertensaoData: {
        consultas6Meses: 'Não',
        visitaAcs1: '',
        visitaAcs2: ''
      },
      vacinaInfluenza: 'Não',
      visitaAcs1: '',
      visitaAcs2: '',
      consultaMedicaAnualData: ''
    },
    rastreamento: {
      exameCitopatologico: 'Não',
      saudeSexualReprodutiva: 'Não',
      mamografia: 'Não',
      vacinaHpv: 'Não'
    },
    obito: {
      flg_obito: false,
      data_obito: '',
      observacoes: ''
    }
  }
};

export type PatientFormData = z.infer<typeof patientFormSchema>;
