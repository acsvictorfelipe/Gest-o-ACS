export function getRedirectFilter(categories: string[]): string {
  if (categories.includes('Gestante')) return 'gestantes';
  if (categories.includes('Criança')) return 'criancas';
  if (categories.includes('Idoso')) return 'idosos';
  if (categories.includes('Adulto')) return 'adultos';
  if (categories.includes('Hipertenso')) return 'hipertensos';
  if (categories.includes('Diabético')) return 'diabéticos';
  if (categories.includes('Acamado') || categories.includes('AcamadoDomiciliado')) return 'acamados';
  if (categories.includes('Domiciliado')) return 'domiciliados';
  return 'all';
}
