import { PatientFormData } from '../../types/patient';

export const initialState: PatientFormData = {
  name: '',
  cns: '',
  responsibleCns: '',
  isFamilyResponsible: false,
  birthDate: '',
  gender: 'Feminino',
  visitDate: '',
  visitType: 'Rotina',
  visitSummary: '',
  address: '',
  number: '',
  complement: '',
  contact: '',
  messageContact: '',
  householdId: '',
  categories: [],
  clinicalData: {
    visitasGerais: [],
    socialBenefits: [],
    saudeMental: {
      notes: ''
    },
    chronic: {
      diabetes: 'Não',
      diabetesData: {
        avaliacaoPes: 'Não',
        hemoglobinaGlicada: 'Não',
        visitaAcs1: '',
        visitaAcs2: ''
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
        visitaAcs2: ''
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
      diabetes: 'Não',
      diabetesData: {
        avaliacaoPes: 'Não',
        hemoglobinaGlicada: 'Não',
        visitaAcs1: '',
        visitaAcs2: ''
      },
      hipertensao: 'Não',
      hipertensaoData: {
        consultas6Meses: 'Não',
        visitaAcs1: '',
        visitaAcs2: ''
      }
    },
    crianca: {
      consultas: [],
      visitasAcs: [],
      visita30dias: '',
      visita6meses: '',
      proximaVisitaSugerida: '',
      vacinas: {
        bcg: '',
        hepB_nascer: '',
        penta1: '',
        penta2: '',
        penta3: '',
        vip1: '',
        vip2: '',
        vip3: '',
        vipR: '',
        pneumo10_1: '',
        pneumo10_2: '',
        pneumo10_3: '',
        rotavirus1: '',
        rotavirus2: '',
        menC1: '',
        menC2: '',
        menC3: '',
        fa: '',
        scr1: '',
        dtp: '',
        hepA: '',
        scrv: '',
        penta2m: '',
        penta4m: '',
        penta6m: '',
        dtp15m: '',
        dtp4y: '',
        hepB: '',
        vip2m: '',
        vip4m: '',
        vip6m: '',
        vop15m: '',
        vop4y: '',
        scr2m: '',
        scr15m: '',
        pneumo2m: '',
        pneumo4m: '',
        pneumo12m: ''
      }
    },
    adulto: {
      diabetes: 'Não',
      diabetesData: {
        avaliacaoPes: 'Não',
        hemoglobinaGlicada: 'Não',
        visitaAcs1: '',
        visitaAcs2: ''
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
        visitaAcs2: ''
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
    }
  }
};
