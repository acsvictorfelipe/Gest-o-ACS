import React, { useState, useEffect } from 'react';
import { supabase, fetchTableWithFilters } from '../lib/supabase';
import { syncService } from '../lib/syncService';
import { encryptionService } from '../lib/encryption';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from './Toast';
import { 
  User, 
  Search, 
  ChevronRight, 
  ChevronDown,
  MapPin, 
  Plus,
  Loader2,
  Baby,
  Stethoscope,
  Activity,
  HeartPulse,
  Pencil,
  Copy,
  Check,
  Filter,
  X,
  Trash2,
  AlertTriangle,
  AlertCircle,
  Smile,
  Bed,
  ArrowLeft,
  CheckCircle,
  ShieldAlert,
  Heart,
  Home,
  MessageCircle,
  Phone,
  CheckSquare,
  Calendar,
  UserPlus
} from 'lucide-react';
import { UI_CONFIG } from '../constants';
import { safeStorage } from '../lib/safeStorage';
import { AppUser, Patient } from '../types';

import { format, isSameDay } from 'date-fns';
import { calculateAge, getAgeInMonths, getAgeNumber, formatDate, getPatientLastVisitAt, isVisitLate, isPatientDiabetic, isPatientInsulinUser } from '../lib/dateUtils';
import { isAdminRole, isGestorRole } from '../lib/roleUtils';

import { usePatientList } from '../hooks/usePatientList';

export function PatientList({ user }: { user: AppUser | null }) {
  const navigate = useNavigate();
  const {
    patients,
    loading,
    searchTerm,
    setSearchTerm,
    activeFilter,
    setActiveFilter,
    deleteConfirm,
    setDeleteConfirm,
    deleting,
    householdsMap,
    selectedStreet,
    setSelectedStreet,
    getPatientAddress,
    isPatientSemDomicilio,
    availableStreets,
    sortPatientsByAddressNumber,
    filteredPatients,
    unpaginatedFilteredPatients,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalCount,
    totalPages,
    clearFilter,
    handleDelete,
    copyToClipboard,
    handleWhatsApp,
    getPrescriptionStatus,
    getAgentInfo
  } = usePatientList(user);

  const getCategoryIcon = (categories: string[]) => {
    if (categories?.includes('Gestante')) return <UI_CONFIG.categorias.gestantes.icon className="w-4 h-4" style={{ color: UI_CONFIG.categorias.gestantes.primary }} />;
    if (categories?.includes('Criança')) return <UI_CONFIG.categorias.criancas.icon className="w-4 h-4" style={{ color: UI_CONFIG.categorias.criancas.primary }} />;
    if (categories?.includes('Idoso')) return <UI_CONFIG.categorias.idosos.icon className="w-4 h-4" style={{ color: UI_CONFIG.categorias.idosos.primary }} />;
    if (categories?.includes('Hipertensos')) return <UI_CONFIG.categorias.hipertensos.icon className="w-4 h-4" style={{ color: UI_CONFIG.categorias.hipertensos.primary }} />;
    if (categories?.includes('Diabéticos')) return <UI_CONFIG.categorias.diabeticos.icon className="w-4 h-4" style={{ color: UI_CONFIG.categorias.diabeticos.primary }} />;
    return <UI_CONFIG.categorias.outros.icon className="w-4 h-4" style={{ color: UI_CONFIG.categorias.outros.primary }} />;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <header className="flex flex-col gap-1">
          <h2 className="text-2xl font-headline font-bold tracking-tight text-text-primary leading-none">
            {activeFilter === 'gestantes' ? 'Gestantes' :
             activeFilter === 'criancas' || activeFilter === 'crianças' ? 'Crianças' :
             activeFilter === 'idosos' ? 'Idosos' :
             activeFilter === 'acamados' ? 'Acamados / Domiciliados' :
             activeFilter === 'hipertensos' ? 'Hipertensos' :
             activeFilter === 'diabeticos' || activeFilter === 'diabéticos' ? 'Diabéticos' :
             activeFilter === 'diabeticos_insulina' || activeFilter === 'insulina' ? 'Diabéticos em Uso de Insulina' :
             activeFilter === 'adultos' ? 'Adultos' :
             activeFilter === 'saudemental' || activeFilter === 'saude-mental' ? 'Saúde Mental' :
             activeFilter === 'criancas_visitas_pendentes' || activeFilter === 'bebes-pendentes' ? 'Crianças ≤ 6 Meses com Visitas Pendentes' :
             activeFilter === 'vacinas_atrasadas' || activeFilter === 'vacinas_pendentes' ? 'Crianças com Vacinas Pendentes' :
             activeFilter === 'visitas_atrasadas' || activeFilter === 'visitas-atraso' ? 'Pacientes com Visitas Pendentes' :
             activeFilter === 'sem_domicilio' || activeFilter === 'sem-domicilio' ? 'Pessoas sem Domicílio Cadastrado' :
             activeFilter === 'receitas_vencendo' ? 'Receitas a Vencer' :
             activeFilter === 'sus_atualizado' ? 'SUS Atualizado' :
             activeFilter === 'falecidos' ? 'Falecidos / Óbitos' :
             'Pacientes'}
          </h2>
          <p className="text-[12px] text-slate-500 font-medium mt-1">Gerencie os atendimentos e registros da sua microárea.</p>
        </header>
        <button 
          onClick={() => navigate('/novo-cadastro')}
          className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 text-white rounded-xl font-semibold shadow-md shadow-teal-600/20 hover:bg-teal-700 transition-all text-sm"
        >
          <Plus className="w-5 h-5" />
          Novo Cadastro
        </button>
      </div>

      {/* Search Bar & Filters */}
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full flex-wrap xl:flex-nowrap">
            {/* 1. Campo de Busca */}
            <div className="relative group flex-1 min-w-[240px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-teal-600 transition-colors" />
              <input 
                type="text" 
                placeholder="Pesquisar por nome ou CNS..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-bg-secondary border border-border rounded-xl py-3 pl-11 pr-6 shadow-sm focus:ring-2 focus:ring-teal-600/10 focus:border-teal-600/30 transition-all text-[13px] font-medium text-slate-900 dark:text-white"
              />
            </div>

            {/* 2. Filtro Discreto de Pendências (Visitas, Vacinas, Domicílio e Insulina) */}
            <div className="relative min-w-[215px]">
              <AlertCircle className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 shrink-0 transition-colors ${
                ['visitas_atrasadas', 'visitas-atraso', 'criancas_visitas_pendentes', 'bebes-pendentes', 'vacinas_atrasadas', 'vacinas_pendentes', 'sem_domicilio', 'sem-domicilio', 'diabeticos_insulina', 'insulina'].includes(activeFilter)
                  ? 'text-amber-500'
                  : 'text-teal-600'
              }`} />
              <select
                value={
                  ['visitas_atrasadas', 'visitas-atraso', 'criancas_visitas_pendentes', 'bebes-pendentes', 'vacinas_atrasadas', 'vacinas_pendentes', 'sem_domicilio', 'sem-domicilio', 'diabeticos_insulina', 'insulina'].includes(activeFilter)
                    ? (activeFilter === 'visitas-atraso' ? 'visitas_atrasadas' : activeFilter === 'bebes-pendentes' ? 'criancas_visitas_pendentes' : activeFilter === 'vacinas_pendentes' ? 'vacinas_atrasadas' : activeFilter === 'sem-domicilio' ? 'sem_domicilio' : activeFilter === 'insulina' ? 'diabeticos_insulina' : activeFilter)
                    : ''
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) {
                    setActiveFilter(val);
                  } else if (['visitas_atrasadas', 'visitas-atraso', 'criancas_visitas_pendentes', 'bebes-pendentes', 'vacinas_atrasadas', 'vacinas_pendentes', 'sem_domicilio', 'sem-domicilio', 'diabeticos_insulina', 'insulina'].includes(activeFilter)) {
                    setActiveFilter('all');
                  }
                }}
                className={`w-full bg-bg-secondary border rounded-xl py-3 pl-11 pr-10 shadow-sm focus:ring-2 focus:ring-teal-600/10 focus:border-teal-600/30 transition-all text-[13px] font-bold appearance-none cursor-pointer ${
                  ['visitas_atrasadas', 'visitas-atraso', 'criancas_visitas_pendentes', 'bebes-pendentes', 'vacinas_atrasadas', 'vacinas_pendentes', 'sem_domicilio', 'sem-domicilio', 'diabeticos_insulina', 'insulina'].includes(activeFilter)
                    ? 'border-amber-500/60 text-amber-700 dark:text-amber-300 bg-amber-500/10 ring-1 ring-amber-500/20'
                    : 'border-border text-slate-800 dark:text-white'
                }`}
              >
                <option value="">⚡ Pendências / Alertas: Todas</option>
                <option value="visitas_atrasadas">⚠️ Visitas Pendentes (Geral)</option>
                <option value="criancas_visitas_pendentes">👶 Crianças ≤ 6m: Visitas Pendentes</option>
                <option value="vacinas_atrasadas">💉 Crianças: Vacinas Pendentes</option>
                <option value="diabeticos_insulina">💉 Diabéticos em Uso de Insulina</option>
                <option value="sem_domicilio">🏠 Sem Domicílio Cadastrado</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            {/* 3. Roteiro por Rua Dropdown Select */}
            <div className="relative min-w-[200px]">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-600 shrink-0" />
              <select
                value={selectedStreet}
                onChange={(e) => setSelectedStreet(e.target.value)}
                className="w-full bg-bg-secondary border border-border rounded-xl py-3 pl-11 pr-10 shadow-sm focus:ring-2 focus:ring-teal-600/10 focus:border-teal-600/30 transition-all text-[13px] font-bold text-slate-800 dark:text-white appearance-none cursor-pointer"
              >
                <option value="">🗺️ Roteiro por Rua (Todos)</option>
                {availableStreets.map(street => (
                  <option key={street} value={street}>{street}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            {/* 4. Categorias Dropdown Select */}
            <div className="relative min-w-[200px]">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-600 shrink-0" />
              <select
                value={
                  !['visitas_atrasadas', 'visitas-atraso', 'criancas_visitas_pendentes', 'bebes-pendentes', 'vacinas_atrasadas', 'vacinas_pendentes'].includes(activeFilter)
                    ? activeFilter
                    : 'all'
                }
                onChange={(e) => setActiveFilter(e.target.value)}
                className="w-full bg-bg-secondary border border-border rounded-xl py-3 pl-11 pr-10 shadow-sm focus:ring-2 focus:ring-teal-600/10 focus:border-teal-600/30 transition-all text-[13px] font-bold text-slate-800 dark:text-white appearance-none cursor-pointer"
              >
                {[
                  { id: 'all', label: '📂 Categorias (Todos)' },
                  { id: 'gestantes', label: 'Gestantes' },
                  { id: 'criancas', label: 'Crianças' },
                  { id: 'idosos', label: 'Idosos' },
                  { id: 'hipertensos', label: 'Hipertensos' },
                  { id: 'diabéticos', label: 'Diabéticos (Geral)' },
                  { id: 'diabeticos_insulina', label: '💉 Diabéticos em Uso de Insulina' },
                  { id: 'acamados', label: 'Acamados' },
                  { id: 'adultos', label: 'Adultos' },
                  { id: 'saudemental', label: 'Saúde Mental' },
                  { id: 'sem_domicilio', label: '🏠 Sem Domicílio Cadastrado' },
                  { id: 'receitas_vencendo', label: 'Receitas a Vencer' },
                  { id: 'sus_atualizado', label: 'SUS Atualizado' },
                  { id: 'falecidos', label: '💀 Falecidos / Óbitos' },
                ].map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mb-3 text-[#14B8A6]" />
          <p className="text-sm font-medium">Carregando dados...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Dynamic Search/Filter Stats */}
          {(searchTerm || selectedStreet || activeFilter !== 'all') && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-teal-50/45 dark:bg-emerald-950/10 border border-teal-100 dark:border-emerald-900/30 p-4 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2 text-teal-800 dark:text-teal-300 flex-wrap">
                <Search className="w-4 h-4 text-teal-600 shrink-0" />
                <p className="text-xs font-semibold">
                  Filtrando por: <span className="font-bold text-teal-700 dark:text-teal-400">
                    {activeFilter !== 'all' ? (
                      activeFilter === 'visitas_atrasadas' || activeFilter === 'visitas-atraso' ? '⚠️ Visitas Pendentes (Geral)' :
                      activeFilter === 'criancas_visitas_pendentes' || activeFilter === 'bebes-pendentes' ? '👶 Crianças ≤ 6m: Visitas Pendentes' :
                      activeFilter === 'vacinas_atrasadas' || activeFilter === 'vacinas_pendentes' ? '💉 Crianças: Vacinas Pendentes' :
                      activeFilter === 'diabeticos_insulina' || activeFilter === 'insulina' ? '💉 Diabéticos em Uso de Insulina' :
                      activeFilter === 'sem_domicilio' || activeFilter === 'sem-domicilio' ? '🏠 Sem Domicílio Cadastrado' :
                      `Categoria: ${activeFilter}`
                    ) : ''}
                    {activeFilter !== 'all' && (selectedStreet || searchTerm) ? ' • ' : ''}
                    {selectedStreet ? `Rua: ${selectedStreet}` : ''}
                    {selectedStreet && searchTerm ? ' • ' : ''}
                    {searchTerm ? `Termo: "${searchTerm}"` : ''}
                  </span>
                </p>
                <button
                  type="button"
                  onClick={clearFilter}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 ml-2 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 hover:bg-rose-100 transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  Limpar Filtros
                </button>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-100 dark:border-slate-800">
                  Resultado: {totalCount} {totalCount === 1 ? 'paciente' : 'pacientes'}
                </span>
                {((isAdminRole(user?.role) || isGestorRole(user?.role)) && searchTerm && (unpaginatedFilteredPatients || filteredPatients).length === 1) && (() => {
                  const singlePatient = (unpaginatedFilteredPatients || filteredPatients)[0];
                  const agentInfo = getAgentInfo(singlePatient);
                  if (!agentInfo) return null;
                  return (
                    <span 
                      className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg text-white flex items-center gap-1.5 shadow-sm"
                      style={{ backgroundColor: agentInfo.color }}
                      title={`Vinculado ao Agente ${agentInfo.name} na Microárea ${agentInfo.microarea || 'Geral'}`}
                    >
                      <User className="w-3.5 h-3.5" />
                      Vinculado a: {agentInfo.name} {agentInfo.microarea ? `(MA ${agentInfo.microarea})` : ''}
                    </span>
                  );
                })()}
                {(() => {
                  const householdsCount = (() => {
                    if (selectedStreet) {
                      return Object.values(householdsMap).filter((h: any) => 
                        (h.address || '').trim().toUpperCase() === selectedStreet
                      ).length;
                    }
                    if (searchTerm) {
                      const term = searchTerm.toLowerCase();
                      return Object.values(householdsMap).filter((h: any) => 
                        (h.address || '').toLowerCase().includes(term)
                      ).length;
                    }
                    return 0;
                  })();
                  
                  if (householdsCount === 0 && !selectedStreet) return null;
                  
                  return (
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#0284c7] bg-sky-50 dark:bg-sky-950/20 dark:text-sky-400 border border-sky-100 dark:border-sky-900/30 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                      <Home className="w-3.5 h-3.5" />
                      Domicílios: {householdsCount}
                    </span>
                  );
                })()}
                {(() => {
                  const totalSemDomicilio = (unpaginatedFilteredPatients || filteredPatients).filter(isPatientSemDomicilio).length;
                  return (
                    <button
                      type="button"
                      onClick={() => setActiveFilter(activeFilter === 'sem_domicilio' ? 'all' : 'sem_domicilio')}
                      className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer ${
                        activeFilter === 'sem_domicilio' || activeFilter === 'sem-domicilio'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-sm ring-2 ring-rose-600/30'
                          : totalSemDomicilio > 0 
                            ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/40' 
                            : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                      }`}
                      title={activeFilter === 'sem_domicilio' ? 'Clique para desativar o filtro' : 'Clique para filtrar apenas pessoas sem domicílio'}
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      Sem Domicílio: {totalSemDomicilio} {totalSemDomicilio === 1 ? 'pessoa' : 'pessoas'}
                    </button>
                  );
                })()}
              </div>
            </div>
          )}

          <div className="bg-bg-secondary rounded-3xl border border-border overflow-hidden shadow-sm shadow-slate-100">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-bg-primary/50">
                  <th className="px-8 py-5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">Paciente</th>
                  <th className="px-8 py-5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">Monitoramento</th>
                  <th className="px-8 py-5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">Idade</th>
                  <th className="px-8 py-5 text-[10px] font-semibold uppercase tracking-wider text-text-muted text-center">Situação</th>
                  <th className="px-8 py-5 text-[10px] font-semibold uppercase tracking-wider text-text-muted text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredPatients.length > 0 ? (
                  [...filteredPatients]
                    .sort(sortPatientsByAddressNumber)
                    .map((p) => {
                      const realVisitAt = getPatientLastVisitAt(p);
                      const isAtraso = isVisitLate(realVisitAt, p);
                      return (
                        <tr 
                          key={p.id} 
                          className="hover:bg-slate-50 transition-all cursor-pointer group"
                          onClick={() => navigate(`/editar-paciente/${p.id}`)}
                        >
                          <td className={`px-8 py-5 border-l-[6px] ${isPatientSemDomicilio(p) ? 'border-l-red-500' : 'border-l-emerald-500'}`}>
                            <div>
                              <div>
                                 <div className="flex items-center gap-2 flex-wrap">
                                   <p className="text-[14px] font-semibold text-text-primary leading-tight group-hover:text-teal-600 transition-colors uppercase">{p.name}</p>
                                    {p.clinical_data?.sus_atualizado === 'Sim' && (
                                      <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30 text-[9px] font-bold uppercase rounded-md shrink-0">
                                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                        SUS Atualizado
                                      </span>
                                    )}
                                    {p.clinical_data?.obito?.flg_obito && (
                                      <span className="flex items-center gap-1 px-2 py-0.5 bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-400 border border-rose-200 dark:border-rose-900/35 text-[9px] font-bold uppercase rounded-md shrink-0">
                                        💀 Óbito {p.clinical_data.obito.data_obito ? formatDate(p.clinical_data.obito.data_obito) : ''}
                                      </span>
                                    )}
                                   {(() => {
                                     const status = getPrescriptionStatus(p);
                                     if (status === 'vencida') {
                                       return (
                                         <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/40 text-[9px] font-bold uppercase rounded-md animate-pulse shrink-0 tracking-wider">
                                           <AlertCircle className="w-3 h-3 text-red-600 dark:text-red-400" />
                                           Receita Vencida
                                         </span>
                                       );
                                     }
                                     if (status === 'vencendo') {
                                       return (
                                         <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40 text-[9px] font-bold uppercase rounded-md animate-pulse shrink-0 tracking-wider">
                                           <AlertCircle className="w-3 h-3 text-amber-605 dark:text-amber-400" />
                                           Receita Vencendo
                                         </span>
                                       );
                                     }
                                     return null;
                                   })()}
                                 </div>
                                 <div className="flex items-center gap-3 mt-1">
                                   <p className="text-[11px] text-text-muted font-medium">{p.cns ? p.cns.replace(/(\d{3})(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4') : 'Sem CNS'}</p>
                                   {p.clinical_data?.contact && (
                                     <button 
                                       onClick={(e) => handleWhatsApp(e, p.clinical_data?.contact || '')}
                                       className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors border border-emerald-100"
                                     >
                                       <MessageCircle className="w-3 h-3" />
                                       <span className="text-[9px] font-bold uppercase">WhatsApp</span>
                                     </button>
                                   )}
                                 </div>
                                 <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                   <p className="text-[11px] text-teal-600 dark:text-teal-400 font-bold uppercase flex items-center gap-1 bg-teal-50/50 dark:bg-teal-950/20 px-2 py-0.5 rounded-md w-fit border border-teal-100/50 dark:border-teal-900/30">
                                     <MapPin className="w-3.5 h-3.5 shrink-0 text-teal-500" />
                                     {(() => {
                                       const addr = getPatientAddress(p);
                                       return addr.address ? `${addr.address}, ${addr.number}${addr.complement ? ` - ${addr.complement}` : ''}` : 'Sem endereço';
                                     })()}
                                   </p>
                                   {(isAdminRole(user?.role) || isGestorRole(user?.role)) && (() => {
                                     const agentInfo = getAgentInfo(p);
                                     if (!agentInfo) return null;
                                     return (
                                       <span 
                                         className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider text-white shadow-xs"
                                         style={{ backgroundColor: agentInfo.color }}
                                         title={`Vinculado ao Agente: ${agentInfo.name}`}
                                       >
                                         <User className="w-3 h-3" />
                                         Agente: {agentInfo.name} {agentInfo.microarea ? `(MA ${agentInfo.microarea})` : ''}
                                       </span>
                                     );
                                   })()}
                                 </div>
                              </div>
                            </div>
                          </td>
                        <td className="px-8 py-5">
                          <div className="flex flex-wrap gap-1.5">
                            {(() => {
                              const age = p.birth_date ? calculateAge(p.birth_date) : 0;
                              const ageNum = typeof age === 'number' ? age : parseInt(String(age));
                              const ageInMonths = p.birth_date ? getAgeInMonths(p.birth_date) : 0;
                              const displayCategories = [...(p.categories || [])];
                              
                              if (displayCategories.length === 0) {
                                if (ageNum >= 60) {
                                  displayCategories.push('Idoso');
                                } else if (ageInMonths <= 24) {
                                  displayCategories.push('Criança');
                                } else {
                                  displayCategories.push('Adulto');
                                }
                              }

                              return displayCategories.slice(0, 4).map((cat: string) => {
                                const catMap: Record<string, { primary: string; label: string }> = {
                                  'Gestante':            { primary: '#EC4899', label: 'Gestante' },
                                  'Criança':             { primary: '#3B82F6', label: 'Criança' },
                                  'Idoso':               { primary: '#F97316', label: 'Idoso' },
                                  'Adulto':              { primary: '#10B981', label: 'Adulto' },
                                  'AcamadoDomiciliado':  { primary: '#64748B', label: 'Acamado' },
                                  'SaudeMental':         { primary: '#6366F1', label: 'S. Mental' },
                                };
                                const matched = catMap[cat];
                                if (!matched) return null;
                                return (
                                  <span 
                                    key={cat} 
                                    className="px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight text-white" 
                                    style={{ backgroundColor: matched.primary }}
                                  >
                                    {matched.label}
                                  </span>
                                );
                              });
                            })()}
                            
                            {/* Clinical Indicators */}
                            {(p.clinical_data?.chronic?.hipertensao === 'Sim' || p.clinical_data?.adulto?.hipertensao === 'Sim' || p.clinical_data?.idoso?.hipertensao === 'Sim') && (
                              <span 
                                className="px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight text-white" 
                                style={{ backgroundColor: '#EF4444' }}
                              >
                                Hipertenso
                              </span>
                            )}
                            {isPatientDiabetic(p) && (
                              <span 
                                className="px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight text-white" 
                                style={{ backgroundColor: '#8B5CF6' }}
                              >
                                Diabético
                              </span>
                            )}
                            {isPatientInsulinUser(p) && (
                              <span 
                                className="px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight text-white bg-sky-600 dark:bg-sky-500 shadow-xs flex items-center gap-1 shrink-0"
                                title="Paciente em uso de Insulina"
                              >
                                💉 Insulina
                              </span>
                            )}
                            {p.categories?.includes('SaudeMental') && (
                              <span 
                                className="px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight text-white" 
                                style={{ backgroundColor: '#6366F1' }}
                              >
                                S. Mental
                              </span>
                            )}

                            {/* Indicador de Pré-Natal e Visita ACS para Gestantes */}
                            {(() => {
                              if (!p.categories?.includes('Gestante')) return null;
                              const g = p.clinical_data?.gestante;
                              const validConsultas = g?.consultas?.filter((c: string) => c && c.trim() !== '').length || 0;
                              const validVisitas = g?.visitasAcs?.filter((v: string) => v && v.trim() !== '').length || 0;
                              const pctCol = validConsultas >= 9 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-pink-50 text-pink-600 border-pink-100 dark:bg-pink-950/20 dark:text-pink-400 dark:border-pink-900/35';
                              const pctVis = validVisitas >= 3 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/35';
                              return (
                                <>
                                  <span className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight border ${pctCol}`}>
                                    Pré-Natal: {validConsultas}/9
                                  </span>
                                  <span className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight border ${pctVis}`}>
                                    Visitas ACS: {validVisitas}/3
                                  </span>
                                </>
                              );
                            })()}

                            {/* Indicador de Visita de 6 Meses para Bebês */}
                            {(() => {
                              if (!p.categories?.includes('Criança') || !p.birth_date) return null;
                              const ageInMonths = getAgeInMonths(p.birth_date);
                              if (ageInMonths > 6) return null;
                              const tem6m = !!p.clinical_data?.crianca?.visita6meses;
                              return (
                                <span
                                  className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight border ${
                                    tem6m
                                      ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                      : 'bg-amber-50 text-amber-600 border-amber-100 animate-pulse'
                                  }`}
                                >
                                  {tem6m ? '6m Realizada' : '6m Pendente'}
                                </span>
                              );
                            })()}
                          </div>
                        </td>
                        <td className="px-8 py-5">
                           <span className="text-[12px] font-semibold text-slate-600">{p.birth_date ? `${calculateAge(p.birth_date)}` : 'N/A'}</span>
                        </td>
                        <td className="px-8 py-5 text-center">
                          {isAtraso ? (
                            <span 
                              className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-50 dark:bg-red-950/20 text-red-500 border border-red-100 dark:border-red-900/30 text-[11px] font-extrabold shadow-sm mx-auto" 
                              title="Visita em Atraso"
                            >
                              !
                            </span>
                          ) : (
                            <span className="block w-5 h-5 mx-auto" aria-hidden="true" />
                          )}
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {p.household_id && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/domicilio/${p.household_id}`);
                                }}
                                className="p-2 rounded-xl text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/30 transition-all border border-transparent hover:border-teal-200 dark:hover:border-teal-900/40"
                                title="Ver Domicílio na Tela"
                              >
                                <Home className="w-4 h-4" />
                              </button>
                            )}
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 group-hover:text-teal-600 transition-colors">
                              <ChevronRight className="w-5 h-5 translate-x-0 group-hover:translate-x-1 transition-transform" />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-8 py-24 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <User className="w-10 h-10 text-slate-200" />
                        <p className="text-sm font-semibold text-text-muted">Nenhum cidadão encontrado.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {filteredPatients.length > 0 ? (
              [...filteredPatients]
                .sort(sortPatientsByAddressNumber)
                .map((p) => (
                <div 
                  key={p.id} 
                  className={`p-4 space-y-3 border-l-[6px] active:bg-slate-50 transition-colors ${
                    isPatientSemDomicilio(p) ? 'border-l-red-500' : 'border-l-emerald-500'
                  }`}
                  onClick={() => navigate(`/editar-paciente/${p.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-semibold text-text-primary dark:text-white leading-tight">{p.name}</h4>
                          {p.clinical_data?.sus_atualizado === 'Sim' && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30 text-[9px] font-bold uppercase rounded shrink-0">
                              <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              SUS Atualizado
                            </span>
                          )}
                          {p.clinical_data?.obito?.flg_obito && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-400 border border-rose-200 dark:border-rose-900/35 text-[9px] font-bold uppercase rounded shrink-0">
                              💀 Óbito {p.clinical_data.obito.data_obito ? formatDate(p.clinical_data.obito.data_obito) : ''}
                            </span>
                          )}
                          {(() => {
                            const realVisitAtMobile = getPatientLastVisitAt(p);
                            const isAtrasoMobile = isVisitLate(realVisitAtMobile, p);
                            return isAtrasoMobile ? (
                              <span 
                                className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-50 dark:bg-red-950/20 text-red-500 border border-red-100 dark:border-red-900/30 text-[9px] font-extrabold shadow-sm shrink-0" 
                                title="Visita em Atraso"
                              >
                                !
                              </span>
                            ) : null;
                          })()}
                        </div>
                        <div className="flex flex-col gap-1 mt-1">
                          <div className="flex items-center gap-2">
                            <p className="text-[10px] text-text-muted font-medium uppercase tracking-tight">CNS: {p.cns}</p>
                            {p.cns && (
                              <button 
                                onClick={(e) => copyToClipboard(p.cns, e)}
                                className="p-1 rounded"
                              >
                                <Copy className="w-3 h-3 text-text-muted" />
                              </button>
                            )}
                          </div>
                          {p.birth_date && (
                            <div className="flex items-center gap-2">
                              <p className="text-[10px] text-text-muted font-medium uppercase tracking-tight">Nasc: {formatDate(p.birth_date)}</p>
                              <button 
                                onClick={(e) => copyToClipboard(formatDate(p.birth_date), e)}
                                className="p-1 rounded"
                              >
                                <Copy className="w-3 h-3 text-text-muted" />
                              </button>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                            <p className="text-[10px] text-teal-600 dark:text-teal-400 font-bold uppercase flex items-center gap-1 bg-teal-50/50 dark:bg-teal-950/20 px-2 py-0.5 rounded-md w-fit border border-teal-100/50 dark:border-teal-900/30">
                              <MapPin className="w-3.5 h-3.5 shrink-0 text-teal-500" />
                              {(() => {
                                const addr = getPatientAddress(p);
                                return addr.address ? `${addr.address}, ${addr.number}${addr.complement ? ` - ${addr.complement}` : ''}` : 'Sem endereço';
                              })()}
                            </p>
                            {(isAdminRole(user?.role) || isGestorRole(user?.role)) && (() => {
                              const agentInfo = getAgentInfo(p);
                              if (!agentInfo) return null;
                              return (
                                <span 
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider text-white shadow-xs"
                                  style={{ backgroundColor: agentInfo.color }}
                                >
                                  <User className="w-2.5 h-2.5" />
                                  Agente: {agentInfo.name} {agentInfo.microarea ? `(MA ${agentInfo.microarea})` : ''}
                                </span>
                              );
                            })()}
                          </div>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {p.clinical_data?.contact && (
                              <button 
                                onClick={(e) => handleWhatsApp(e, p.clinical_data?.contact || '')}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500 text-white shadow-sm shadow-emerald-500/20 active:scale-95 transition-all w-fit"
                              >
                                <MessageCircle className="w-4 h-4" />
                                <span className="text-[11px] font-bold uppercase">WhatsApp</span>
                              </button>
                            )}
                        </div>
                      </div>
                    </div>
                      <div className="flex items-center gap-2">
                        {p.household_id && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/domicilio/${p.household_id}`);
                            }}
                            className="p-2 rounded-xl text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/30 transition-all border border-transparent hover:border-teal-200 dark:hover:border-teal-900/40"
                            title="Ver Domicílio na Tela"
                          >
                            <Home className="w-4 h-4" />
                          </button>
                        )}
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                      </div>
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {(() => {
                      const age = p.birth_date ? calculateAge(p.birth_date) : 0;
                      const ageNum = typeof age === 'number' ? age : parseInt(String(age));
                      const ageInMonths = p.birth_date ? getAgeInMonths(p.birth_date) : 0;
                      const displayCategories = [...(p.categories || [])];
                      
                      if (displayCategories.length === 0) {
                        if (ageNum >= 60) {
                          displayCategories.push('Idoso');
                        } else if (ageInMonths <= 24) {
                          displayCategories.push('Criança');
                        } else {
                          displayCategories.push('Adulto');
                        }
                      }

                      return displayCategories.map((cat: string) => {
                        const catMap: Record<string, { primary: string; label: string }> = {
                          'Gestante':            { primary: '#EC4899', label: 'Gestante' },
                          'Criança':             { primary: '#3B82F6', label: 'Criança' },
                          'Idoso':               { primary: '#F97316', label: 'Idoso' },
                          'Adulto':              { primary: '#10B981', label: 'Adulto' },
                          'AcamadoDomiciliado':  { primary: '#64748B', label: 'Acamado' },
                          'SaudeMental':         { primary: '#6366F1', label: 'S. Mental' },
                        };
                        const matched = catMap[cat];
                        if (!matched) return null;
                        return (
                          <span key={cat}
                            className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase whitespace-nowrap text-white"
                            style={{ backgroundColor: matched.primary }}
                          >
                            {matched.label}
                          </span>
                        );
                      });
                    })()}
                    
                    {/* clinical indicators */}
                    {(p.clinical_data?.chronic?.hipertensao === 'Sim' || p.clinical_data?.adulto?.hipertensao === 'Sim' || p.clinical_data?.idoso?.hipertensao === 'Sim') && (
                      <span 
                        className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase whitespace-nowrap text-white"
                        style={{ backgroundColor: '#EF4444' }}
                      >
                        Hipertenso
                      </span>
                    )}
                    {isPatientDiabetic(p) && (
                      <span 
                        className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase whitespace-nowrap text-white" 
                        style={{ backgroundColor: '#8B5CF6' }}
                      >
                        Diabético
                      </span>
                    )}
                    {isPatientInsulinUser(p) && (
                      <span 
                        className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase whitespace-nowrap text-white bg-sky-600 dark:bg-sky-500 shadow-xs flex items-center gap-1 shrink-0"
                        title="Paciente em uso de Insulina"
                      >
                        💉 Insulina
                      </span>
                    )}
                    {p.categories?.includes('SaudeMental') && (
                      <span 
                        className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase whitespace-nowrap italic border"
                        style={{ 
                          backgroundColor: `color-mix(in srgb, #A855F7, transparent 90%)`, 
                          color: '#A855F7', 
                          borderColor: `color-mix(in srgb, #A855F7, transparent 70%)` 
                        }}
                      >
                        S.M
                      </span>
                    )}

                    {!getPatientLastVisitAt(p) && (
                      <span className="px-1.5 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded text-[9px] font-semibold uppercase whitespace-nowrap">Visita Pendente</span>
                    )}

                    {/* Indicador de Pré-Natal e Visita ACS para Gestantes (mobile) */}
                    {(() => {
                      if (!p.categories?.includes('Gestante')) return null;
                      const g = p.clinical_data?.gestante;
                      const validConsultas = g?.consultas?.filter((c: string) => c && c.trim() !== '').length || 0;
                      const validVisitas = g?.visitasAcs?.filter((v: string) => v && v.trim() !== '').length || 0;
                      const pctCol = validConsultas >= 9 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-pink-50 text-pink-600 border-pink-100 dark:bg-pink-950/20 dark:text-pink-400 dark:border-pink-900/35';
                      const pctVis = validVisitas >= 3 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/35';
                      return (
                        <>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase whitespace-nowrap border ${pctCol}`}>
                            Pré-Natal: {validConsultas}/9
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase whitespace-nowrap border ${pctVis}`}>
                            ACS: {validVisitas}/3
                          </span>
                        </>
                      );
                    })()}

                    {/* Indicador de Visita de 6 Meses para Bebês (mobile) */}
                    {(() => {
                      if (!p.categories?.includes('Criança') || !p.birth_date) return null;
                      const ageInMonths = getAgeInMonths(p.birth_date);
                      if (ageInMonths > 6) return null;
                      const tem6m = !!p.clinical_data?.crianca?.visita6meses;
                      return (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase whitespace-nowrap border ${
                            tem6m
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                              : 'bg-amber-50 text-amber-600 border-amber-100 animate-pulse'
                          }`}
                        >
                          {tem6m ? '6m ✓' : '6m Pendente'}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              ))
            ) : (
              <div className="px-8 py-12 text-center text-slate-400 text-sm font-medium">
                Nenhum cidadão encontrado.
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {totalCount > 0 && (
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/60 border-t border-border dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-text-muted">
              <div className="flex items-center gap-2">
                <span>Exibindo página <strong>{currentPage}</strong> de <strong>{totalPages}</strong> ({totalCount} cidadãos cadastrados)</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <span>Por página:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-slate-700 dark:text-slate-200 focus:outline-none"
                  >
                    <option value={15}>15</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-bg-secondary dark:bg-slate-900 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-border dark:border-slate-800 animate-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-600 dark:text-red-400">
                <AlertTriangle className="w-8 h-8" />
              </div>
              
              <div className="space-y-1">
                <h3 className="text-xl font-semibold text-on-surface font-headline">Excluir Cadastro?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Esta ação é irreversível. Todos os dados do paciente e seu histórico de visitas serão removidos permanentemente.
                </p>
              </div>

              <div className="flex flex-col w-full gap-2">
                <button 
                  onClick={handleDelete}
                  disabled={deleting}
                  className="w-full py-3 bg-red-600 text-white rounded-xl font-semibold shadow-sm hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Excluindo...
                    </>
                  ) : (
                    'Sim, Excluir Cadastro'
                  )}
                </button>
                <button 
                  onClick={() => setDeleteConfirm(null)}
                  disabled={deleting}
                  className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

