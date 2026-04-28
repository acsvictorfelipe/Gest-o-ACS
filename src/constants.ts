import {
  Baby,
  Heart,
  Users,
  HeartPulse,
  Droplets,
  UserCog,
  CheckCircle,
  AlertCircle,
  ShieldAlert,
  Eye,
  Activity,
  Bed,
  Brain
} from 'lucide-react';

export const CATEGORY_PALETTE = {
  crianca: {
    primary: '#3B82F6',
    soft: '#DBEAFE',
    text: '#1D4ED8',
    icon: Baby,
    label: 'Criança'
  },
  gestante: {
    primary: '#EC4899',
    soft: '#FCE7F3',
    text: '#BE185D',
    icon: Heart,
    label: 'Gestante'
  },
  idoso: {
    primary: '#F97316',
    soft: '#FFEDD5',
    text: '#C2410C',
    icon: Users,
    label: 'Idoso'
  },
  hipertenso: {
    primary: '#EF4444',
    soft: '#FEE2E2',
    text: '#B91C1C',
    icon: HeartPulse,
    label: 'Hipertenso'
  },
  diabetico: {
    primary: '#8B5CF6',
    soft: '#EDE9FE',
    text: '#6D28D9',
    icon: Droplets,
    label: 'Diabético'
  },
  adulto: {
    primary: '#10B981',
    soft: '#D1FAE5',
    text: '#047857',
    icon: UserCog,
    label: 'Adulto'
  },
  saudeMental: {
    primary: '#6366F1',
    soft: '#E0E7FF',
    text: '#4338CA',
    icon: Brain,
    label: 'Saúde Mental'
  },
  acamado: {
    primary: '#64748B',
    soft: '#E2E8F0',
    text: '#334155',
    icon: Bed,
    label: 'Acamado / Domiciliado'
  },
  outros: {
    primary: '#94A3B8',
    soft: '#F1F5F9',
    text: '#475569',
    icon: UserCog,
    label: 'Outros'
  }
};

export const UI_CONFIG = {
  categorias: {
    criancas: CATEGORY_PALETTE.crianca,
    gestantes: CATEGORY_PALETTE.gestante,
    idosos: CATEGORY_PALETTE.idoso,
    hipertensos: CATEGORY_PALETTE.hipertenso,
    diabeticos: CATEGORY_PALETTE.diabetico,
    adultos: CATEGORY_PALETTE.adulto,
    saudeMental: CATEGORY_PALETTE.saudeMental,
    acamados: CATEGORY_PALETTE.acamado,
    outros: CATEGORY_PALETTE.outros
  },

  status: {
    sucesso: {
      color: '#10B981',
      icon: CheckCircle
    },
    alerta: {
      color: '#F59E0B',
      icon: AlertCircle
    },
    erro: {
      color: '#EF4444',
      icon: ShieldAlert
    },
    info: {
      color: '#3B82F6',
      icon: Eye
    }
  }
};
