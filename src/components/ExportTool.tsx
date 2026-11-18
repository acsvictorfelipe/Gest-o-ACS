import React, { useState, useEffect, useMemo } from 'react';
import { supabase, fetchTableWithFilters } from '../lib/supabase';
import { 
  Download, 
  FileText, 
  Loader2, 
  Users, 
  Heart, 
  Activity, 
  FileSpreadsheet, 
  Gift, 
  Baby, 
  Smile, 
  Bed, 
  Home, 
  Brain, 
  CheckCircle2, 
  Sparkles,
  ShieldAlert,
  Droplets
} from 'lucide-react';
import { 
  calculateAge, 
  getAgeInMonths, 
  getAgeNumber,
  formatDate, 
  isPatientChild, 
  isPatientDiabetic, 
  isPatientInsulinUser, 
  isPatientHipertenso, 
  isPatientBolsaFamilia, 
  VACCINE_SCHEDULE 
} from '../lib/dateUtils';
import { useToast } from './Toast';

type ExportType = 
  | 'clinical_all'
  | 'bolsa_familia'
  | 'gestantes'
  | 'criancas'
  | 'diabetes'
  | 'hypertension'
  | 'idosos'
  | 'acamados'
  | 'saude_mental'
  | 'domicilios'
  | 'basic';

interface ExportOption {
  id: ExportType;
  title: string;
  description: string;
  icon: React.ElementType;
  badgeColor: string;
  color: string;
  activeColor: string;
}

export function ExportTool({ user }: { user: any }) {
  const { warning, success, error: toastError } = useToast();
  const [loading, setLoading] = useState(false);
  const [exportCount, setExportCount] = useState(0);
  const [selectedType, setSelectedType] = useState<ExportType>('clinical_all');
  const [counts, setCounts] = useState<Record<ExportType, number> | null>(null);
  const [fetchingCounts, setFetchingCounts] = useState(false);

  useEffect(() => {
    async function loadCounts() {
      if (!user) return;
      setFetchingCounts(true);
      try {
        const [patientsData, householdsData] = await Promise.all([
          fetchTableWithFilters<any>('patients', user, {
            select: 'id, name, birth_date, categories, clinical_data'
          }),
          fetchTableWithFilters<any>('households', user, {
            select: 'id'
          })
        ]);

        const patients = patientsData || [];
        const households = householdsData || [];

        const newCounts: Record<ExportType, number> = {
          clinical_all: patients.length,
          bolsa_familia: patients.filter(p => isPatientBolsaFamilia(p)).length,
          gestantes: patients.filter(p => p.categories?.includes('Gestante')).length,
          criancas: patients.filter(p => isPatientChild(p)).length,
          diabetes: patients.filter(p => isPatientDiabetic(p)).length,
          hypertension: patients.filter(p => isPatientHipertenso(p)).length,
          idosos: patients.filter(p => {
            const ageNum = p.birth_date ? getAgeNumber(p.birth_date) : 0;
            return p.categories?.includes('Idoso') || (ageNum >= 60 && !isPatientChild(p));
          }).length,
          acamados: patients.filter(p => p.categories?.includes('AcamadoDomiciliado') || p.categories?.includes('Acamado')).length,
          saude_mental: patients.filter(p => p.categories?.includes('SaudeMental') || p.categories?.includes('Saúde Mental')).length,
          domicilios: households.length,
          basic: patients.length
        };

        setCounts(newCounts);
      } catch (err) {
        console.error('Error fetching preview counts:', err);
      } finally {
        setFetchingCounts(false);
      }
    }
    loadCounts();
  }, [user]);

  const safeString = (str: any): string => {
    if (str === null || str === undefined) return '""';
    const cleaned = String(str).replace(/"/g, '""').trim();
    return `"${cleaned}"`;
  };

  const getVaccineStatus = (p: any) => {
    const c = p.clinical_data?.crianca || {};
    const ageInMonths = p.birth_date ? getAgeInMonths(p.birth_date) : 0;
    const vacinas = c.vacinas || {};
    
    const dueVaccines = VACCINE_SCHEDULE
      .filter(group => group.age <= ageInMonths)
      .flatMap(group => group.vaccines);
      
    const pendentes = dueVaccines
      .filter(v => vacinas[v.id] !== 'Sim')
      .map(v => v.label);

    const tomadasKeys = Object.entries(vacinas)
      .filter(([_, v]) => v === 'Sim' || (typeof v === 'string' && v.length > 5))
      .map(([k, _]) => k);

    return {
      totalTomadas: tomadasKeys.length,
      totalPendentes: pendentes.length,
      pendentesList: pendentes.join(' | ') || 'Nenhuma (Em dia)'
    };
  };

  const exportData = async () => {
    setLoading(true);
    try {
      let headers: string[] = [];
      const csvRows: string[][] = [];
      let filename = `gestao_acs_${selectedType}_${new Date().toISOString().split('T')[0]}.csv`;

      if (selectedType === 'domicilios') {
        const households = await fetchTableWithFilters<any>('households', user, {
          select: '*, patients(id, name, birth_date, cns, is_family_responsible, categories, contact, clinical_data)',
          orderBy: { column: 'address', ascending: true }
        });

        if (!households || households.length === 0) {
          warning('Nenhum domicílio encontrado para exportação.');
          return;
        }

        const getResidentCategories = (p: any): string[] => {
          if (!p) return [];
          const set = new Set<string>();
          const rawCats: string[] = Array.isArray(p.categories) ? p.categories : [];

          rawCats.forEach(c => {
            if (!c || c === 'Geral' || c === 'Todas') return;
            if (c === 'Hipertensos' || c === 'Hipertenso') set.add('Hipertenso');
            else if (c === 'Diabéticos' || c === 'Diabético' || c === 'Diabetico') set.add('Diabético');
            else if (c === 'AcamadoDomiciliado' || c === 'Acamado' || c === 'Domiciliado') set.add('Acamado');
            else if (c === 'SaudeMental' || c === 'Saúde Mental') set.add('Saúde Mental');
            else if (c === 'Gestantes' || c === 'Gestante') set.add('Gestante');
            else if (c === 'Crianças' || c === 'Criança' || c === 'Crianca') set.add('Criança');
            else if (c === 'Idosos' || c === 'Idoso') set.add('Idoso');
            else if (c === 'Adultos' || c === 'Adulto') set.add('Adulto');
            else set.add(c);
          });

          if (isPatientHipertenso(p)) set.add('Hipertenso');
          if (isPatientDiabetic(p)) set.add('Diabético');
          if (isPatientChild(p)) set.add('Criança');

          const age = p.birth_date ? getAgeNumber(p.birth_date) : null;
          if (age !== null) {
            if (age >= 60) set.add('Idoso');
            else if (age >= 18 && !set.has('Criança') && !set.has('Gestante') && !set.has('Idoso') && set.size === 0) {
              set.add('Adulto');
            }
          }

          return Array.from(set);
        };

        headers = [
          'Logradouro / Endereço',
          'Número',
          'Complemento',
          'Bairro',
          'Microárea',
          'Telefone de Contato',
          'Responsável Familiar - Nome',
          'Responsável Familiar - Data de Nascimento',
          'Responsável Familiar - Idade',
          'Responsável Familiar - Categorias',
          'Responsável Familiar - Bolsa Família',
          'Dependentes (Nome - Nasc - Idade - Categorias - Bolsa Família)',
          'Total de Moradores Cadastrados'
        ];
        const extractHouseNumber = (numStr?: string | null): { num: number; suffix: string } => {
          if (!numStr) return { num: Infinity, suffix: '' };
          const clean = String(numStr).trim();
          if (!clean || /^s\/?n/i.test(clean) || /sem n/i.test(clean)) {
            return { num: Infinity, suffix: clean };
          }
          const leadingMatch = clean.match(/^(\d+)(.*)$/);
          if (leadingMatch) {
            return { num: parseInt(leadingMatch[1], 10), suffix: leadingMatch[2].trim().toLowerCase() };
          }
          const anyDigitMatch = clean.match(/(\d+)/);
          if (anyDigitMatch) {
            return { num: parseInt(anyDigitMatch[1], 10), suffix: clean.toLowerCase() };
          }
          return { num: Infinity, suffix: clean.toLowerCase() };
        };

        const sortedHouseholds = [...households].sort((a: any, b: any) => {
          const streetA = (a.address || '').trim().toLowerCase();
          const streetB = (b.address || '').trim().toLowerCase();
          const streetComp = streetA.localeCompare(streetB, 'pt-BR', { sensitivity: 'base', numeric: true });
          if (streetComp !== 0) return streetComp;

          const numA = extractHouseNumber(a.number);
          const numB = extractHouseNumber(b.number);
          if (numA.num !== numB.num) return numA.num - numB.num;
          return numA.suffix.localeCompare(numB.suffix, 'pt-BR', { numeric: true });
        });

        sortedHouseholds.forEach((h: any) => {
          const residents: any[] = h.patients || [];
          
          let responsible = residents.find((r: any) => r.is_family_responsible);
          if (!responsible && h.responsible_name) {
            const cleanHResp = h.responsible_name.trim().toLowerCase();
            responsible = residents.find((r: any) => r.name?.trim().toLowerCase() === cleanHResp);
          }
          if (!responsible && h.responsible_cns) {
            responsible = residents.find((r: any) => r.cns?.trim() === h.responsible_cns?.trim());
          }
          if (!responsible && residents.length > 0 && !h.responsible_name) {
            responsible = residents[0];
          }

          const dependents = residents.filter((r: any) => r.id !== responsible?.id);
          const contact = h.contact || responsible?.contact || responsible?.clinical_data?.contact || (dependents.find((d: any) => d.contact || d.clinical_data?.contact)?.contact) || '';
          const respName = responsible?.name || h.responsible_name || 'Não informado';
          const respBirth = responsible?.birth_date ? formatDate(responsible.birth_date) : '';
          const respAge = responsible?.birth_date ? calculateAge(responsible.birth_date) : '';
          const respCats = getResidentCategories(responsible).join(', ');
          const respBF = responsible && isPatientBolsaFamilia(responsible) ? 'Sim (Bolsa Família)' : 'Não';

          const dependentsFormatted = dependents.length > 0
            ? dependents.map((d: any) => {
                const dAge = d.birth_date ? calculateAge(d.birth_date) : '';
                const dNasc = d.birth_date ? formatDate(d.birth_date) : 'N/I';
                const dCats = getResidentCategories(d).join(', ');
                const dBF = isPatientBolsaFamilia(d) ? 'Bolsa Família' : '';
                const tagInfo = [dCats ? `Cat: ${dCats}` : '', dBF].filter(Boolean).join(' | ');
                return `${d.name} (${dNasc}${dAge ? ` - ${dAge}` : ''}${tagInfo ? ` [${tagInfo}]` : ''})`;
              }).join(' ; ')
            : '-';

          csvRows.push([
            safeString(h.address),
            safeString(h.number || 'S/N'),
            safeString(h.complement || ''),
            safeString(h.neighborhood || ''),
            safeString(h.microarea || user?.microarea || ''),
            safeString(contact),
            safeString(respName),
            safeString(respBirth),
            safeString(respAge),
            safeString(respCats || 'Não informada'),
            safeString(respBF),
            safeString(dependentsFormatted),
            safeString(residents.length || (h.responsible_name ? 1 : 0))
          ]);
        });

        setExportCount(households.length);
      } else {
        const patients = await fetchTableWithFilters<any>('patients', user, {
          select: '*, households(address, number, complement, microarea, responsible_name)',
          orderBy: { column: 'name', ascending: true }
        });

        if (!patients || patients.length === 0) {
          warning('Nenhum paciente encontrado para exportação.');
          return;
        }

        // Apply filtering
        let filteredData = patients;
        if (selectedType === 'bolsa_familia') {
          filteredData = patients.filter(p => isPatientBolsaFamilia(p));
        } else if (selectedType === 'gestantes') {
          filteredData = patients.filter(p => p.categories?.includes('Gestante'));
        } else if (selectedType === 'criancas') {
          filteredData = patients.filter(p => isPatientChild(p));
        } else if (selectedType === 'diabetes') {
          filteredData = patients.filter(p => isPatientDiabetic(p));
        } else if (selectedType === 'hypertension') {
          filteredData = patients.filter(p => isPatientHipertenso(p));
        } else if (selectedType === 'idosos') {
          filteredData = patients.filter(p => {
            const ageNum = p.birth_date ? getAgeNumber(p.birth_date) : 0;
            return p.categories?.includes('Idoso') || (ageNum >= 60 && !isPatientChild(p));
          });
        } else if (selectedType === 'acamados') {
          filteredData = patients.filter(p => p.categories?.includes('AcamadoDomiciliado') || p.categories?.includes('Acamado'));
        } else if (selectedType === 'saude_mental') {
          filteredData = patients.filter(p => p.categories?.includes('SaudeMental') || p.categories?.includes('Saúde Mental'));
        }

        if (filteredData.length === 0) {
          warning('Nenhum paciente atende aos critérios do filtro selecionado.');
          return;
        }

        setExportCount(filteredData.length);

        // 1. RELATÓRIO CLÍNICO GERAL (COMPLETO COM TODOS OS INDICADORES)
        if (selectedType === 'clinical_all') {
          headers = [
            'Nome Completo',
            'Cartão SUS (CNS)',
            'Data de Nascimento',
            'Idade (Anos)',
            'Sexo',
            'Microárea',
            'Logradouro / Endereço',
            'Número',
            'Complemento',
            'Responsável Familiar',
            'Telefone / WhatsApp',
            'Telefone Recado',
            'Categorias',
            'Bolsa Família',
            'Benefícios Sociais',
            'Hipertensão Arterial',
            'Consultas Hipertensão (Últimos 6 meses)',
            'Diabetes',
            'Uso de Insulina (Insulino-dependente)',
            'Avaliação dos Pés (Diabetes)',
            'Hemoglobina Glicada (Diabetes)',
            'Gestante (DUM)',
            'Gestante (DPP)',
            'Gestante - Consultas Pré-Natal',
            'Gestante - Visitas ACS',
            'Gestante - Teste Sífilis',
            'Gestante - Teste HIV',
            'Gestante - Teste Hepatite B',
            'Gestante - Teste Hepatite C',
            'Gestante - Vacina dTpa',
            'Gestante - Saúde Bucal',
            'Criança - Consultas Puericultura',
            'Criança - Visitas ACS',
            'Criança - Visita 30 Dias Realizada',
            'Criança - Visita 6 Meses Realizada',
            'Criança - Vacinas Pendentes/Atrasadas',
            'Idoso - Vacina Influenza Anual',
            'Idoso - Consulta Médica Anual',
            'Acamado - Grau de Dependência',
            'Acamado - Uso de Fralda',
            'Acamado - Tamanho Fralda',
            'Acamado - Realiza Curativos',
            'Acamado - Possui Cuidador',
            'Saúde Mental (Observações)',
            'SUS Atualizado',
            'Falecido / Óbito'
          ];

          filteredData.forEach((p: any) => {
            const c = p.clinical_data || {};
            const age = p.birth_date ? calculateAge(p.birth_date) : '';
            const isDiab = isPatientDiabetic(p) ? 'Sim' : 'Não';
            const isInsulin = isPatientInsulinUser(p) ? 'Sim' : 'Não';
            const isHip = isPatientHipertenso(p) ? 'Sim' : 'Não';
            const isBF = isPatientBolsaFamilia(p) ? 'Sim' : 'Não';

            const diabSec = [c.chronic, c.adulto, c.idoso, c.gestante, c.acamadodomiciliado].find(s => s?.diabetes === 'Sim');
            const hipSec = [c.chronic, c.adulto, c.idoso, c.gestante, c.acamadodomiciliado].find(s => s?.hipertensao === 'Sim' || s?.pressaoAlta === 'Sim');
            const dData = diabSec?.diabetesData || c.chronic?.diabetesData || c.adulto?.diabetesData || c.idoso?.diabetesData || c.gestante?.diabetesData || c.acamadodomiciliado?.diabetesData || {};
            const hData = hipSec?.hipertensaoData || c.chronic?.hipertensaoData || c.adulto?.hipertensaoData || c.idoso?.hipertensaoData || c.gestante?.hipertensaoData || c.acamadodomiciliado?.hipertensaoData || {};

            const g = c.gestante || {};
            const isGest = p.categories?.includes('Gestante') ? 'Sim' : 'Não';
            const gConsultas = isGest === 'Sim' ? String(g.consultas?.filter((x: string) => x).length || 0) : 'N/A';
            const gVisitas = isGest === 'Sim' ? String(g.visitasAcs?.filter((x: string) => x).length || 0) : 'N/A';

            const cr = c.crianca || {};
            const isCr = isPatientChild(p) ? 'Sim' : 'Não';
            const crConsultas = isCr === 'Sim' ? String(cr.consultas?.filter((x: string) => x).length || 0) : 'N/A';
            const crVisitas = isCr === 'Sim' ? String(cr.visitasAcs?.filter((x: string) => x).length || 0) : 'N/A';
            const crVacinas = isCr === 'Sim' ? getVaccineStatus(p).pendentesList : 'N/A';

            const idoso = c.idoso || {};
            const ageNum = p.birth_date ? getAgeNumber(p.birth_date) : 0;
            const isId = (p.categories?.includes('Idoso') || (ageNum >= 60 && !isPatientChild(p))) ? 'Sim' : 'Não';

            const ac = c.acamadodomiciliado || {};
            const isAc = p.categories?.includes('AcamadoDomiciliado') ? 'Sim' : 'Não';

            const sm = c.saudeMental || {};
            const benefits = Array.isArray(c.socialBenefits) ? c.socialBenefits.join(' | ') : '';

            const addr = c.address || p.households?.address || p.address || '';
            const num = c.number || c.address_number || p.households?.number || p.number || '';
            const comp = c.complement || c.address_complement || p.households?.complement || p.complement || '';
            const resp = p.households?.responsible_name || (p.is_family_responsible ? 'Titular' : (p.responsible_cns || '-'));

            csvRows.push([
              safeString(p.name),
              safeString(p.cns),
              safeString(p.birth_date ? formatDate(p.birth_date) : ''),
              safeString(age),
              safeString(p.gender || ''),
              safeString(p.microarea || p.households?.microarea || user?.microarea || ''),
              safeString(addr),
              safeString(num),
              safeString(comp),
              safeString(resp),
              safeString(c.contact || p.contact || ''),
              safeString(c.contact2 || p.contact2 || ''),
              safeString((p.categories || []).join(' | ')),
              safeString(isBF),
              safeString(benefits),
              safeString(isHip),
              safeString(hData.consultas6Meses || 'Não'),
              safeString(isDiab),
              safeString(isInsulin),
              safeString(dData.avaliacaoPes || 'Não'),
              safeString(dData.hemoglobinaGlicada || 'Não'),
              safeString(g.dum ? formatDate(g.dum) : ''),
              safeString(g.dpp ? formatDate(g.dpp) : ''),
              safeString(gConsultas),
              safeString(gVisitas),
              safeString(g.sifilis || 'NÃO REALIZADO'),
              safeString(g.hiv || 'NÃO REALIZADO'),
              safeString(g.hepatiteB || 'NÃO REALIZADO'),
              safeString(g.hepatiteC || 'NÃO REALIZADO'),
              safeString(g.dtpa || 'Não'),
              safeString(g.avaliacaoBucal || (g.saudeBucal ? formatDate(g.saudeBucal) : 'Não realizada')),
              safeString(crConsultas),
              safeString(crVisitas),
              safeString(cr.visita30dias ? formatDate(cr.visita30dias) : (cr.visita30diasNaoRealizada ? 'Justificada' : 'Pendente')),
              safeString(cr.visita6meses ? formatDate(cr.visita6meses) : (cr.visita6mesesNaoRealizada ? 'Justificada' : 'Pendente')),
              safeString(crVacinas),
              safeString(isId === 'Sim' ? (idoso.vacinaInfluenza || 'Não') : 'N/A'),
              safeString(isId === 'Sim' ? (idoso.consultaMedicaAnualData ? formatDate(idoso.consultaMedicaAnualData) : 'Não') : 'N/A'),
              safeString(isAc === 'Sim' ? (ac.dependencia || 'Total') : 'N/A'),
              safeString(isAc === 'Sim' ? (ac.usoFralda || 'Não') : 'N/A'),
              safeString(isAc === 'Sim' ? (ac.tamanhoFralda || '') : 'N/A'),
              safeString(isAc === 'Sim' ? (ac.curativos || 'Não') : 'N/A'),
              safeString(isAc === 'Sim' ? (ac.cuidador || 'Não') : 'N/A'),
              safeString(sm.notes || ''),
              safeString(c.sus_atualizado || 'Não'),
              safeString(c.obito?.flg_obito ? `Sim (${c.obito.data_obito ? formatDate(c.obito.data_obito) : 'Data N/I'})` : 'Não')
            ]);
          });

        // 2. BOLSA FAMÍLIA
        } else if (selectedType === 'bolsa_familia') {
          headers = [
            'Nome do Beneficiário',
            'Cartão SUS (CNS)',
            'Data de Nascimento',
            'Idade (Anos)',
            'Sexo',
            'Microárea',
            'Logradouro / Endereço',
            'Número',
            'Complemento',
            'Responsável Familiar / Titular',
            'Telefone / WhatsApp',
            'Benefícios Sociais',
            'Grupo Prioritário / Condicionalidade',
            'Hipertensão',
            'Diabetes (Insulina)',
            'Categorias do Paciente'
          ];

          filteredData.forEach((p: any) => {
            const c = p.clinical_data || {};
            const age = p.birth_date ? calculateAge(p.birth_date) : '';
            const ageNum = p.birth_date ? getAgeNumber(p.birth_date) : 0;
            const ageInM = p.birth_date ? getAgeInMonths(p.birth_date) : 999;
            
            let grupo = 'Beneficiário Geral';
            if (p.categories?.includes('Gestante')) {
              grupo = 'Gestante (Pré-Natal)';
            } else if (isPatientChild(p)) {
              grupo = ageInM <= 84 ? `Criança (${age} - Puericultura/Vacina)` : `Criança/Adolescente (${age})`;
            } else if (ageNum >= 60) {
              grupo = 'Idoso';
            }

            const addr = c.address || p.households?.address || p.address || '';
            const num = c.number || c.address_number || p.households?.number || p.number || '';
            const comp = c.complement || c.address_complement || p.households?.complement || p.complement || '';
            const resp = p.households?.responsible_name || (p.is_family_responsible ? 'Titular' : (p.responsible_cns || '-'));
            const benefits = Array.isArray(c.socialBenefits) && c.socialBenefits.length > 0 ? c.socialBenefits.join(' | ') : 'Bolsa Família';

            const diabStatus = isPatientDiabetic(p) ? (isPatientInsulinUser(p) ? 'Sim (Usa Insulina)' : 'Sim (Não usa insulina)') : 'Não';

            csvRows.push([
              safeString(p.name),
              safeString(p.cns),
              safeString(p.birth_date ? formatDate(p.birth_date) : ''),
              safeString(age),
              safeString(p.gender || ''),
              safeString(p.microarea || p.households?.microarea || user?.microarea || ''),
              safeString(addr),
              safeString(num),
              safeString(comp),
              safeString(resp),
              safeString(c.contact || p.contact || ''),
              safeString(benefits),
              safeString(grupo),
              safeString(isPatientHipertenso(p) ? 'Sim' : 'Não'),
              safeString(diabStatus),
              safeString((p.categories || []).join(' | '))
            ]);
          });

        // 3. GESTANTES
        } else if (selectedType === 'gestantes') {
          headers = [
            'Nome da Gestante',
            'Cartão SUS (CNS)',
            'Data de Nascimento',
            'Idade (Anos)',
            'Contato / WhatsApp',
            'Logradouro / Endereço',
            'Número',
            'Complemento',
            'Microárea',
            'DUM (Última Menstruação)',
            'DPP (Data Provável do Parto)',
            'Total Consultas Pré-Natal',
            'Total Visitas ACS Realizadas',
            'Teste Rápido Sífilis',
            'Teste Rápido HIV',
            'Teste Rápido Hepatite B',
            'Teste Rápido Hepatite C',
            'Vacina dTpa',
            'Consulta Odontológica / Saúde Bucal',
            'Hipertensão / Pré-Eclâmpsia',
            'Diabetes Gestacional'
          ];

          filteredData.forEach((p: any) => {
            const c = p.clinical_data || {};
            const g = c.gestante || {};
            const age = p.birth_date ? calculateAge(p.birth_date) : '';
            const validConsultas = g.consultas?.filter((x: string) => x).length || 0;
            const validVisitas = g.visitasAcs?.filter((x: string) => x).length || 0;

            const addr = c.address || p.households?.address || p.address || '';
            const num = c.number || c.address_number || p.households?.number || p.number || '';
            const comp = c.complement || c.address_complement || p.households?.complement || p.complement || '';

            csvRows.push([
              safeString(p.name),
              safeString(p.cns),
              safeString(p.birth_date ? formatDate(p.birth_date) : ''),
              safeString(age),
              safeString(c.contact || p.contact || ''),
              safeString(addr),
              safeString(num),
              safeString(comp),
              safeString(p.microarea || p.households?.microarea || user?.microarea || ''),
              safeString(g.dum ? formatDate(g.dum) : ''),
              safeString(g.dpp ? formatDate(g.dpp) : ''),
              safeString(validConsultas),
              safeString(validVisitas),
              safeString(g.sifilis || 'NÃO REALIZADO'),
              safeString(g.hiv || 'NÃO REALIZADO'),
              safeString(g.hepatiteB || 'NÃO REALIZADO'),
              safeString(g.hepatiteC || 'NÃO REALIZADO'),
              safeString(g.dtpa || 'Não'),
              safeString(g.avaliacaoBucal || (g.saudeBucal ? formatDate(g.saudeBucal) : 'Não realizada')),
              safeString(g.hipertensao || g.pressaoAlta || 'Não'),
              safeString(g.diabetes || 'Não')
            ]);
          });

        // 4. CRIANÇAS
        } else if (selectedType === 'criancas') {
          headers = [
            'Nome da Criança',
            'Cartão SUS (CNS)',
            'Data de Nascimento',
            'Idade (Anos)',
            'Idade (Meses)',
            'Sexo',
            'Responsável Familiar',
            'Contato / WhatsApp',
            'Logradouro / Endereço',
            'Número',
            'Complemento',
            'Microárea',
            'Total Consultas Puericultura',
            'Total Visitas ACS Realizadas',
            'Visita 30 Dias (Primeiro Mês)',
            'Visita 6 Meses',
            'Status de Vacinas',
            'Vacinas Pendentes / Atrasadas',
            'Recebe Bolsa Família'
          ];

          filteredData.forEach((p: any) => {
            const c = p.clinical_data || {};
            const cr = c.crianca || {};
            const age = p.birth_date ? calculateAge(p.birth_date) : '';
            const ageInM = p.birth_date ? getAgeInMonths(p.birth_date) : 0;
            const validConsultas = cr.consultas?.filter((x: string) => x).length || 0;
            const validVisitas = cr.visitasAcs?.filter((x: string) => x).length || 0;
            const vacStats = getVaccineStatus(p);

            const addr = c.address || p.households?.address || p.address || '';
            const num = c.number || c.address_number || p.households?.number || p.number || '';
            const comp = c.complement || c.address_complement || p.households?.complement || p.complement || '';
            const resp = p.households?.responsible_name || (p.is_family_responsible ? 'Titular' : (p.responsible_cns || '-'));

            csvRows.push([
              safeString(p.name),
              safeString(p.cns),
              safeString(p.birth_date ? formatDate(p.birth_date) : ''),
              safeString(age),
              safeString(ageInM),
              safeString(p.gender || ''),
              safeString(resp),
              safeString(c.contact || p.contact || ''),
              safeString(addr),
              safeString(num),
              safeString(comp),
              safeString(p.microarea || p.households?.microarea || user?.microarea || ''),
              safeString(validConsultas),
              safeString(validVisitas),
              safeString(cr.visita30dias ? formatDate(cr.visita30dias) : (cr.visita30diasNaoRealizada ? 'Justificada' : 'Pendente')),
              safeString(cr.visita6meses ? formatDate(cr.visita6meses) : (cr.visita6mesesNaoRealizada ? 'Justificada' : 'Pendente')),
              safeString(vacStats.totalPendentes > 0 ? 'Com Vacinas Pendentes' : 'Vacinação em Dia'),
              safeString(vacStats.pendentesList),
              safeString(isPatientBolsaFamilia(p) ? 'Sim' : 'Não')
            ]);
          });

        // 5. DIABETES
        } else if (selectedType === 'diabetes') {
          headers = [
            'Nome do Paciente',
            'Cartão SUS (CNS)',
            'Data de Nascimento',
            'Idade (Anos)',
            'Sexo',
            'Contato / WhatsApp',
            'Logradouro / Endereço',
            'Número',
            'Complemento',
            'Microárea',
            'Diabetes (Confirmado)',
            'Faz Uso de Insulina (Toma Insulina)',
            'Avaliação dos Pés',
            'Hemoglobina Glicada Solicitada/Avaliada',
            'Última Visita ACS - 1',
            'Última Visita ACS - 2',
            'Hipertensão Associada'
          ];

          filteredData.forEach((p: any) => {
            const c = p.clinical_data || {};
            const diabSec = [c.chronic, c.adulto, c.idoso, c.gestante, c.acamadodomiciliado].find(s => s?.diabetes === 'Sim');
            const dData = diabSec?.diabetesData || c.chronic?.diabetesData || c.adulto?.diabetesData || c.idoso?.diabetesData || c.gestante?.diabetesData || c.acamadodomiciliado?.diabetesData || {};
            const age = p.birth_date ? calculateAge(p.birth_date) : '';

            const addr = c.address || p.households?.address || p.address || '';
            const num = c.number || c.address_number || p.households?.number || p.number || '';
            const comp = c.complement || c.address_complement || p.households?.complement || p.complement || '';

            csvRows.push([
              safeString(p.name),
              safeString(p.cns),
              safeString(p.birth_date ? formatDate(p.birth_date) : ''),
              safeString(age),
              safeString(p.gender || ''),
              safeString(c.contact || p.contact || ''),
              safeString(addr),
              safeString(num),
              safeString(comp),
              safeString(p.microarea || p.households?.microarea || user?.microarea || ''),
              'Sim',
              safeString(isPatientInsulinUser(p) ? 'Sim' : 'Não'),
              safeString(dData.avaliacaoPes || 'Não'),
              safeString(dData.hemoglobinaGlicada || 'Não'),
              safeString(dData.visitaAcs1 ? formatDate(dData.visitaAcs1) : ''),
              safeString(dData.visitaAcs2 ? formatDate(dData.visitaAcs2) : ''),
              safeString(isPatientHipertenso(p) ? 'Sim' : 'Não')
            ]);
          });

        // 6. HIPERTENSÃO
        } else if (selectedType === 'hypertension') {
          headers = [
            'Nome do Paciente',
            'Cartão SUS (CNS)',
            'Data de Nascimento',
            'Idade (Anos)',
            'Sexo',
            'Contato / WhatsApp',
            'Logradouro / Endereço',
            'Número',
            'Complemento',
            'Microárea',
            'Hipertensão (Confirmada)',
            'Consultas Médicas nos Últimos 6 Meses',
            'Última Visita ACS - 1',
            'Última Visita ACS - 2',
            'Diabetes Associado',
            'Usa Insulina'
          ];

          filteredData.forEach((p: any) => {
            const c = p.clinical_data || {};
            const hipSec = [c.chronic, c.adulto, c.idoso, c.gestante, c.acamadodomiciliado].find(s => s?.hipertensao === 'Sim' || s?.pressaoAlta === 'Sim');
            const hData = hipSec?.hipertensaoData || c.chronic?.hipertensaoData || c.adulto?.hipertensaoData || c.idoso?.hipertensaoData || c.gestante?.hipertensaoData || c.acamadodomiciliado?.hipertensaoData || {};
            const age = p.birth_date ? calculateAge(p.birth_date) : '';

            const addr = c.address || p.households?.address || p.address || '';
            const num = c.number || c.address_number || p.households?.number || p.number || '';
            const comp = c.complement || c.address_complement || p.households?.complement || p.complement || '';

            csvRows.push([
              safeString(p.name),
              safeString(p.cns),
              safeString(p.birth_date ? formatDate(p.birth_date) : ''),
              safeString(age),
              safeString(p.gender || ''),
              safeString(c.contact || p.contact || ''),
              safeString(addr),
              safeString(num),
              safeString(comp),
              safeString(p.microarea || p.households?.microarea || user?.microarea || ''),
              'Sim',
              safeString(hData.consultas6Meses || 'Não'),
              safeString(hData.visitaAcs1 ? formatDate(hData.visitaAcs1) : ''),
              safeString(hData.visitaAcs2 ? formatDate(hData.visitaAcs2) : ''),
              safeString(isPatientDiabetic(p) ? 'Sim' : 'Não'),
              safeString(isPatientInsulinUser(p) ? 'Sim' : 'Não')
            ]);
          });

        // 7. IDOSOS
        } else if (selectedType === 'idosos') {
          headers = [
            'Nome do Idoso',
            'Cartão SUS (CNS)',
            'Data de Nascimento',
            'Idade (Anos)',
            'Sexo',
            'Contato / WhatsApp',
            'Logradouro / Endereço',
            'Número',
            'Complemento',
            'Microárea',
            'Vacina Influenza Anual',
            'Consulta Médica Anual Realizada',
            'Hipertensão Arterial',
            'Diabetes',
            'Uso de Insulina',
            'Acamado / Domiciliado'
          ];

          filteredData.forEach((p: any) => {
            const c = p.clinical_data || {};
            const idoso = c.idoso || {};
            const age = p.birth_date ? calculateAge(p.birth_date) : '';

            const addr = c.address || p.households?.address || p.address || '';
            const num = c.number || c.address_number || p.households?.number || p.number || '';
            const comp = c.complement || c.address_complement || p.households?.complement || p.complement || '';

            csvRows.push([
              safeString(p.name),
              safeString(p.cns),
              safeString(p.birth_date ? formatDate(p.birth_date) : ''),
              safeString(age),
              safeString(p.gender || ''),
              safeString(c.contact || p.contact || ''),
              safeString(addr),
              safeString(num),
              safeString(comp),
              safeString(p.microarea || p.households?.microarea || user?.microarea || ''),
              safeString(idoso.vacinaInfluenza || 'Não'),
              safeString(idoso.consultaMedicaAnualData ? formatDate(idoso.consultaMedicaAnualData) : 'Não informada'),
              safeString(isPatientHipertenso(p) ? 'Sim' : 'Não'),
              safeString(isPatientDiabetic(p) ? 'Sim' : 'Não'),
              safeString(isPatientInsulinUser(p) ? 'Sim' : 'Não'),
              safeString(p.categories?.includes('AcamadoDomiciliado') ? 'Sim' : 'Não')
            ]);
          });

        // 8. ACAMADOS
        } else if (selectedType === 'acamados') {
          headers = [
            'Nome do Cidadão',
            'Cartão SUS (CNS)',
            'Data de Nascimento',
            'Idade (Anos)',
            'Contato / WhatsApp',
            'Logradouro / Endereço',
            'Número',
            'Complemento',
            'Microárea',
            'Grau de Dependência',
            'Faz Uso de Fraldas',
            'Tamanho da Fralda',
            'Necessita de Curativos',
            'Possui Cuidador',
            'Hipertensão',
            'Diabetes'
          ];

          filteredData.forEach((p: any) => {
            const c = p.clinical_data || {};
            const ac = c.acamadodomiciliado || {};
            const age = p.birth_date ? calculateAge(p.birth_date) : '';

            const addr = c.address || p.households?.address || p.address || '';
            const num = c.number || c.address_number || p.households?.number || p.number || '';
            const comp = c.complement || c.address_complement || p.households?.complement || p.complement || '';

            csvRows.push([
              safeString(p.name),
              safeString(p.cns),
              safeString(p.birth_date ? formatDate(p.birth_date) : ''),
              safeString(age),
              safeString(c.contact || p.contact || ''),
              safeString(addr),
              safeString(num),
              safeString(comp),
              safeString(p.microarea || p.households?.microarea || user?.microarea || ''),
              safeString(ac.dependencia || 'Total'),
              safeString(ac.usoFralda || 'Não'),
              safeString(ac.tamanhoFralda || ''),
              safeString(ac.curativos || 'Não'),
              safeString(ac.cuidador || 'Não'),
              safeString(isPatientHipertenso(p) ? 'Sim' : 'Não'),
              safeString(isPatientDiabetic(p) ? 'Sim' : 'Não')
            ]);
          });

        // 9. SAÚDE MENTAL
        } else if (selectedType === 'saude_mental') {
          headers = [
            'Nome do Paciente',
            'Cartão SUS (CNS)',
            'Data de Nascimento',
            'Idade (Anos)',
            'Contato / WhatsApp',
            'Logradouro / Endereço',
            'Número',
            'Complemento',
            'Microárea',
            'Observações / Medicações / Acompanhamento',
            'Outras Categorias'
          ];

          filteredData.forEach((p: any) => {
            const c = p.clinical_data || {};
            const sm = c.saudeMental || {};
            const age = p.birth_date ? calculateAge(p.birth_date) : '';

            const addr = c.address || p.households?.address || p.address || '';
            const num = c.number || c.address_number || p.households?.number || p.number || '';
            const comp = c.complement || c.address_complement || p.households?.complement || p.complement || '';

            csvRows.push([
              safeString(p.name),
              safeString(p.cns),
              safeString(p.birth_date ? formatDate(p.birth_date) : ''),
              safeString(age),
              safeString(c.contact || p.contact || ''),
              safeString(addr),
              safeString(num),
              safeString(comp),
              safeString(p.microarea || p.households?.microarea || user?.microarea || ''),
              safeString(sm.notes || 'Sem observações detalhadas'),
              safeString((p.categories || []).join(' | '))
            ]);
          });

        // 10. BÁSICO
        } else {
          headers = [
            'Nome do Paciente',
            'Cartão SUS (CNS)',
            'Data de Nascimento',
            'Idade (Anos)',
            'Sexo',
            'Contato Primário',
            'Contato Recado',
            'Endereço',
            'Número',
            'Complemento',
            'Responsável Familiar',
            'Microárea',
            'Categorias'
          ];

          filteredData.forEach((p: any) => {
            const c = p.clinical_data || {};
            const age = p.birth_date ? calculateAge(p.birth_date) : '';
            const addr = c.address || p.households?.address || p.address || '';
            const num = c.number || c.address_number || p.households?.number || p.number || '';
            const comp = c.complement || c.address_complement || p.households?.complement || p.complement || '';
            const resp = p.households?.responsible_name || (p.is_family_responsible ? 'Titular' : (p.responsible_cns || '-'));

            csvRows.push([
              safeString(p.name),
              safeString(p.cns),
              safeString(p.birth_date ? formatDate(p.birth_date) : ''),
              safeString(age),
              safeString(p.gender || ''),
              safeString(c.contact || p.contact || ''),
              safeString(c.contact2 || p.contact2 || ''),
              safeString(addr),
              safeString(num),
              safeString(comp),
              safeString(resp),
              safeString(p.microarea || p.households?.microarea || user?.microarea || ''),
              safeString((p.categories || []).join(' | '))
            ]);
          });
        }
      }

      // Construct CSV with UTF-8 BOM and ';' delimiter for perfect PT-BR Excel compatibility
      const csvContent = [
        headers.map(h => `"${h.replace(/"/g, '""')}"`).join(';'),
        ...csvRows.map(row => row.join(';'))
      ].join('\r\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      success('Planilha gerada e baixada com sucesso!');
    } catch (err: any) {
      console.error('Export error:', err);
      toastError('Erro ao exportar dados para planilha: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const options: ExportOption[] = [
    {
      id: 'clinical_all',
      title: 'Relatório Geral Completo (Todos os Indicadores)',
      description: 'Todos os pacientes com todas as informações: Hipertensão, Diabetes, Insulina, Gestantes, Crianças, Vacinas, Idosos, Acamados, Bolsa Família e SUS.',
      icon: FileSpreadsheet,
      badgeColor: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300',
      color: 'bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400 border-purple-100 dark:border-purple-900/30',
      activeColor: 'ring-2 ring-purple-500 border-purple-500 bg-purple-50/40 dark:bg-purple-950/20'
    },
    {
      id: 'bolsa_familia',
      title: 'Beneficiários do Bolsa Família',
      description: 'Relação nominal de todos os beneficiários com responsável familiar, endereço, contatos e condicionalidades de saúde (Gestantes e Crianças).',
      icon: Gift,
      badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
      color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30',
      activeColor: 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20'
    },
    {
      id: 'gestantes',
      title: 'Gestantes (Pré-Natal & Indicadores)',
      description: 'DUM, DPP, consultas de pré-natal, visitas ACS, testes rápidos (Sífilis, HIV, Hepatites), vacina dTpa e saúde bucal.',
      icon: Heart,
      badgeColor: 'bg-pink-100 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300',
      color: 'bg-pink-50 text-pink-600 dark:bg-pink-950/30 dark:text-pink-400 border-pink-100 dark:border-pink-900/30',
      activeColor: 'ring-2 ring-pink-500 border-pink-500 bg-pink-50/40 dark:bg-pink-950/20'
    },
    {
      id: 'criancas',
      title: 'Crianças (Puericultura & Vacinas)',
      description: 'Consultas de puericultura, visitas ACS (30 dias / 6 meses), status de vacinação e relação detalhada de vacinas atrasadas.',
      icon: Baby,
      badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
      color: 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400 border-blue-100 dark:border-blue-900/30',
      activeColor: 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/40 dark:bg-blue-950/20'
    },
    {
      id: 'diabetes',
      title: 'Diabéticos & Uso de Insulina',
      description: 'Filtrar diabéticos com dados de uso contínuo de insulina, avaliação dos pés, hemoglobina glicada e acompanhamento ACS.',
      icon: Activity,
      badgeColor: 'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300',
      color: 'bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400 border-violet-100 dark:border-violet-900/30',
      activeColor: 'ring-2 ring-violet-500 border-violet-500 bg-violet-50/40 dark:bg-violet-950/20'
    },
    {
      id: 'hypertension',
      title: 'Pacientes com Hipertensão',
      description: 'Filtrar hipertensos com consultas dos últimos 6 meses, visitas ACS e comorbidades associadas.',
      icon: Heart,
      badgeColor: 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300',
      color: 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 border-red-100 dark:border-red-900/30',
      activeColor: 'ring-2 ring-red-500 border-red-500 bg-red-50/40 dark:bg-red-950/20'
    },
    {
      id: 'idosos',
      title: 'Idosos (60+ anos)',
      description: 'Acompanhamento geriátrico, vacina influenza anual, consulta médica anual, hipertensão e diabetes.',
      icon: Smile,
      badgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
      color: 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 border-amber-100 dark:border-amber-900/30',
      activeColor: 'ring-2 ring-amber-500 border-amber-500 bg-amber-50/40 dark:bg-amber-950/20'
    },
    {
      id: 'acamados',
      title: 'Acamados e Domiciliados',
      description: 'Grau de dependência física, uso e tamanho de fraldas, necessidade de curativos e cuidador.',
      icon: Bed,
      badgeColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
      color: 'bg-slate-50 text-slate-600 dark:bg-slate-900 border-slate-200 dark:border-slate-800',
      activeColor: 'ring-2 ring-slate-500 border-slate-500 bg-slate-50/60'
    },
    {
      id: 'saude_mental',
      title: 'Saúde Mental',
      description: 'Cidadãos em acompanhamento de saúde mental com medicações, observações clínicas e visitas.',
      icon: Brain,
      badgeColor: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300',
      color: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30',
      activeColor: 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50/40'
    },
    {
      id: 'domicilios',
      title: 'Cadastro de Domicílios & Famílias',
      description: 'Logradouro, número, complemento, telefone, responsável familiar (nasc/idade) e relação detalhada de dependentes.',
      icon: Home,
      badgeColor: 'bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300',
      color: 'bg-teal-50 text-teal-600 dark:bg-teal-950/30 dark:text-teal-400 border-teal-100 dark:border-teal-900/30',
      activeColor: 'ring-2 ring-teal-500 border-teal-500 bg-teal-50/40'
    },
    {
      id: 'basic',
      title: 'Cadastro Básico Geral',
      description: 'Dados pessoais, telefone de contato, responsável familiar e endereço completo de todos os cidadãos.',
      icon: Users,
      badgeColor: 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300',
      color: 'bg-sky-50 text-sky-600 dark:bg-sky-950/30 dark:text-sky-400 border-sky-100 dark:border-sky-900/30',
      activeColor: 'ring-2 ring-sky-500 border-sky-500 bg-sky-50/40'
    }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 px-6 py-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <header className="flex flex-col gap-1">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white uppercase flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-teal-600" />
            Exportação de Indicadores para Excel
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium tracking-tight">
            Exporte planilhas em CSV formatadas com codificação UTF-8 BOM e separadores compatíveis com o Microsoft Excel.
          </p>
        </header>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {options.map((option) => {
          const Icon = option.icon;
          const isActive = selectedType === option.id;
          const countVal = counts ? counts[option.id] : null;

          return (
            <div
              key={option.id}
              onClick={() => setSelectedType(option.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                isActive 
                  ? `${option.activeColor} shadow-md scale-[1.01]` 
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${option.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="space-y-0.5 flex-1">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase leading-snug">
                    {option.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium line-clamp-2 leading-relaxed">
                    {option.description}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                {fetchingCounts ? (
                  <div className="h-4 w-20 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                ) : countVal !== null ? (
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${option.badgeColor}`}>
                    {countVal} {option.id === 'domicilios' ? (countVal === 1 ? 'domicílio' : 'domicílios') : (countVal === 1 ? 'registro' : 'registros')}
                  </span>
                ) : null}
                <span className={`text-[10px] font-bold uppercase ${isActive ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'}`}>
                  {isActive ? 'Selecionado ✓' : 'Selecionar'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center flex flex-col items-center justify-center space-y-4 shadow-sm">
        <div className="max-w-lg space-y-1.5">
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Você selecionou: <span className="text-teal-600 dark:text-teal-400 uppercase font-black">{options.find(o => o.id === selectedType)?.title}</span>
          </p>
          {fetchingCounts ? (
            <p className="text-xs text-slate-400 dark:text-slate-500 animate-pulse font-bold uppercase">
              Carregando contagem de registros...
            </p>
          ) : counts !== null ? (
            <p className="text-xs font-black text-slate-900 dark:text-white uppercase bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-lg inline-block border border-slate-200 dark:border-slate-700">
              📊 {counts[selectedType]} {selectedType === 'domicilios' ? (counts[selectedType] === 1 ? 'domicílio será incluído na planilha' : 'domicílios serão incluídos na planilha') : (counts[selectedType] === 1 ? 'paciente será incluído na planilha' : 'pacientes serão incluídos na planilha')}
            </p>
          ) : null}
          <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 leading-relaxed">
            O arquivo gerado inclui cabeçalhos detalhados, codificação com marca de ordem de byte UTF-8 (BOM) e separador de ponto e vírgula (<code className="text-teal-600 dark:text-teal-400 font-bold">;</code>) para abrir perfeitamente formatado no Microsoft Excel sem desconfigurar acentuações.
          </p>
        </div>

        <button
          onClick={exportData}
          disabled={loading}
          className="px-8 py-3.5 bg-teal-600 text-white font-bold rounded-xl shadow-lg shadow-teal-600/20 hover:bg-teal-700 transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider text-xs cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Gerando Planilha Excel...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Baixar Planilha Excel (.CSV)
            </>
          )}
        </button>

        {exportCount > 0 && !loading && (
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-2 rounded-xl inline-block border border-emerald-200 dark:border-emerald-900/40 animate-in fade-in">
            ✓ Exportação de {exportCount} registro(s) gerada com sucesso!
          </p>
        )}
      </div>
    </div>
  );
}
