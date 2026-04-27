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
  Activity
} from 'lucide-react';

export const UI_CONFIG = {
  categorias: {
    criancas: {
      label: 'Crianças',
      color: 'var(--color-cat-criancas)',
      icon: Baby
    },
    gestantes: {
      label: 'Gestantes',
      color: 'var(--color-cat-gestantes)',
      icon: Heart
    },
    idosos: {
      label: 'Idosos',
      color: 'var(--color-cat-idosos)',
      icon: Users
    },
    hipertensos: {
      label: 'Hipertensos',
      color: 'var(--color-cat-hipertensos)',
      icon: HeartPulse
    },
    diabeticos: {
      label: 'Diabéticos',
      color: 'var(--color-cat-diabeticos)',
      icon: Droplets
    },
    outros: {
      label: 'Outros',
      color: 'var(--color-cat-outros)',
      icon: UserCog
    },
    saudeMental: {
      label: 'Saúde Mental',
      color: '#A855F7',
      icon: Activity
    }
  },

  status: {
    sucesso: {
      color: 'var(--color-success)',
      icon: CheckCircle
    },
    alerta: {
      color: 'var(--color-warning)',
      icon: AlertCircle
    },
    erro: {
      color: 'var(--color-error)',
      icon: ShieldAlert
    },
    info: {
      color: 'var(--color-info)',
      icon: Eye
    }
  }
};
