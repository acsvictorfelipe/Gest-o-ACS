<div align="center">
<img width="1200" height="475" alt="Gestão ACS Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Gestão ACS - Portal do Agente Comunitário

O **Gestão ACS** é uma aplicação web moderna e responsiva projetada especificamente para Agentes Comunitários de Saúde (ACS). Este sistema facilita o cadastro e o acompanhamento de domicílios, pacientes e indicadores de saúde (como hipertensão, diabetes, gestantes e saúde mental), proporcionando uma ferramenta de gestão ágil, eficiente e intuitiva.

## 🌟 Recursos Principais

- **Gestão de Domicílios e Pacientes:** Cadastro completo e vinculado de domicílios e moradores, permitindo gerenciar perfis clínicos e socioeconômicos.
- **Formulário Clínico Dinâmico:** Seções especializadas para condições crônicas (Hipertensão, Diabetes), Saúde Mental, Gestantes, Crianças, Idosos e Acamados.
- **Registro e Histórico de Visitas:** Acompanhamento rotineiro com marcação de visitas, resumos clínicos e histórico detalhado por paciente e microárea.
- **Painel de Indicadores e Relatórios:** Gráficos interativos para monitorar a distribuição de grupos prioritários e fluxo de visitas diárias.
- **Gerenciamento de Usuários (Admin):** Controle de acesso com múltiplos níveis de permissão (Agente, Gestor, Administrador) e personalização por cor de microárea.
- **Tema Dinâmico (Light / Dark Mode):** Interface "SaaS-grade" projetada com variáveis CSS semânticas, garantindo acessibilidade, contraste perfeito e alto conforto visual.
- **Totalmente Responsivo:** Desenvolvido "Mobile-First" para que o ACS consiga utilizar o sistema em campo via celular, sem perder usabilidade.

## 🛠️ Tecnologias Utilizadas

Este projeto foi construído utilizando um stack moderno:

- **Frontend:** [React](https://reactjs.org/) (com TypeScript) e [Vite](https://vitejs.dev/)
- **Estilização:** [Tailwind CSS v4](https://tailwindcss.com/) com tokens semânticos
- **Ícones:** [Lucide React](https://lucide.dev/)
- **Gráficos:** [Recharts](https://recharts.org/)
- **Backend / Banco de Dados / Autenticação:** [Supabase](https://supabase.com/)
- **Geração de Relatórios (PDF):** `jspdf` e `jspdf-autotable`

## 🚀 Como Rodar Localmente

Siga os passos abaixo para configurar o ambiente de desenvolvimento em sua máquina.

### Pré-requisitos
- [Node.js](https://nodejs.org/) (versão 18 ou superior recomendada)
- Projeto e credenciais configuradas no [Supabase](https://supabase.com/)

### Instalação

1. Clone o repositório ou baixe os arquivos.
2. Acesse a pasta do projeto e instale as dependências:
   ```bash
   npm install
   ```
3. Crie um arquivo `.env` na raiz do projeto contendo suas variáveis do Supabase (Substitua as chaves pelas informações do seu painel Supabase):
   ```env
   VITE_SUPABASE_URL=sua_url_do_supabase
   VITE_SUPABASE_ANON_KEY=sua_anon_key_do_supabase
   ```
4. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
5. Acesse a aplicação no seu navegador padrão, geralmente em `http://localhost:5173`.

## 📁 Estrutura Básica do Projeto

- `/src/components`: Componentes e telas da interface (e.g. `PatientList`, `PatientForm`, `HouseholdView`, `Login`).
- `/src/lib`: Bibliotecas utilitárias e integrações (e.g. `supabase.ts`, utilitários de formatação de data).
- `/src/index.css`: Arquivo principal de estilos contendo as variáveis semânticas do tema claro/escuro.
- `/src/App.tsx`: Gerenciamento de rotas e estado global de autenticação e tema.

---
*Desenvolvido com foco na eficiência do SUS e no trabalho indispensável dos Agentes Comunitários de Saúde.*
