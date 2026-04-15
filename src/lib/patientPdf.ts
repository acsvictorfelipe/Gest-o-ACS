import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { calculateAge, formatDate } from './dateUtils';
import { PatientFormData } from '../types/patient';

const vaccineLabels: Record<string, string> = {
  penta2m: 'Penta 2 Meses',
  penta4m: 'Penta 4 Meses',
  penta6m: 'Penta 6 Meses',
  dtp15m: 'DTP 15 meses',
  dtp4y: 'DTP 4 anos',
  hepB: 'Hepatite B',
  vip2m: 'VIP 2 meses',
  vip4m: 'VIP 4 meses',
  vip6m: 'VIP 6 meses',
  vop15m: 'VOP 15 meses',
  vop4y: 'VOP 4 anos',
  scr2m: 'SCR 2 meses',
  scr15m: 'SCR 15 meses',
  pneumo2m: 'Pneumo10 2 meses',
  pneumo4m: 'Pneumo10 4 meses',
  pneumo12m: 'Pneumo10 12 meses',
  visitaAcs1: '1ª Visita ACS',
  visitaAcs2: '2ª Visita ACS',
  consultaMedicaAnualData: 'Consulta Médica Anual',
  avaliacaoPes: 'Avaliação dos Pés',
  consultas6Meses: 'Consultas nos últimos 6 meses',
  hemoglobinaGlicada: 'Hemoglobina Glicada',
  vacinaInfluenza: 'Vacina Influenza',
  exameCitopatologico: 'Exame Citopatológico',
  saudeSexualReprodutiva: 'Saúde Sexual Reprodutiva',
  mamografia: 'Mamografia',
  vacinaHpv: 'Vacina HPV'
};

export const generatePatientPDF = (formData: PatientFormData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(0, 72, 141);
  doc.text('Ficha Individual do Paciente', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth - 14, 28, { align: 'right' });
  
  // Personal Info
  doc.setFontSize(14);
  doc.setTextColor(0, 72, 141);
  doc.text('Informações Pessoais', 14, 40);
  
  const personalData = [
    ['Nome', formData.name || 'N/A'],
    ['CNS', formData.cns || 'N/A'],
    ['Data de Nascimento', formData.birthDate ? formatDate(formData.birthDate) : 'N/A'],
    ['Idade', formData.birthDate ? calculateAge(formData.birthDate) : 'N/A'],
    ['Gênero', formData.gender || 'N/A'],
    ['Contato', formData.contact || 'N/A'],
    ['Recado', formData.messageContact || 'N/A'],
    ['Endereço', `${formData.address}, ${formData.number}`],
    ['Categorias', formData.categories.join(', ') || 'N/A']
  ];

  autoTable(doc, {
    startY: 45,
    body: personalData,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } }
  });

  let currentY = (doc as any).lastAutoTable.finalY + 10;

  // Clinical Data
  formData.categories.forEach(cat => {
    const catId = cat.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const clinical = (formData.clinicalData as any)[catId];
    
    if (!clinical) return;

    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(14);
    doc.setTextColor(0, 72, 141);
    doc.text(`Dados Clínicos: ${cat}`, 14, currentY);
    currentY += 5;

    const clinicalRows: string[][] = [];
    Object.entries(clinical).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        if (value.length > 0) {
          clinicalRows.push([key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()), value.join(', ')]);
        }
      } else if (typeof value === 'object' && value !== null) {
        // Handle nested objects like vacinas, diabetesData, hipertensaoData
        Object.entries(value).forEach(([subKey, subValue]) => {
          if (subValue) {
            const label = vaccineLabels[subKey] || subKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            clinicalRows.push([label, String(subValue)]);
          }
        });
      } else if (value) {
        clinicalRows.push([key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()), String(value)]);
      }
    });

    if (clinicalRows.length > 0) {
      autoTable(doc, {
        startY: currentY,
        body: clinicalRows,
        theme: 'striped',
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } }
      });
      currentY = (doc as any).lastAutoTable.finalY + 10;
    } else {
      currentY += 10;
    }
  });

  // Rastreamento Data
  if (formData.clinicalData.rastreamento) {
    const rastreamentoRows: string[][] = [];
    Object.entries(formData.clinicalData.rastreamento).forEach(([key, value]) => {
      if (value && value !== 'Não') {
        rastreamentoRows.push([key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()), String(value)]);
      }
    });

    if (rastreamentoRows.length > 0) {
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(0, 72, 141);
      doc.text('Rastreamento e Prevenção', 14, currentY);
      currentY += 5;

      autoTable(doc, {
        startY: currentY,
        body: rastreamentoRows,
        theme: 'striped',
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } }
      });
      currentY = (doc as any).lastAutoTable.finalY + 10;
    }
  }

  doc.save(`Ficha_${formData.name.replace(/\s+/g, '_')}.pdf`);
};
