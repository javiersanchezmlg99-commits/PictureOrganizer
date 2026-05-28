import { createContext, useContext, useState, type ReactNode } from 'react';

export type Lang = 'en' | 'es';

// ── UI translations ────────────────────────────────────────────────────

const UI: Record<Lang, Record<string, string>> = {
  en: {
    // Sidebar
    'nav.upload': 'Upload',
    'nav.identifications': 'Identifications',
    'nav.dashboard': 'Dashboard',
    'sidebar.title': 'FAUNA ID',
    'sidebar.subtitle': 'Wildlife Identification',
    'sidebar.models': 'MegaDetector + iNat21',

    // Upload
    'upload.title': 'Upload Photos',
    'upload.dragDrop': 'Drag & drop photos here',
    'upload.browse': 'or click to browse — JPG, PNG, WebP',
    'upload.newFiles': 'new file',
    'upload.newFilesPlural': 'new files',
    'upload.duplicates': 'duplicate',
    'upload.duplicatesPlural': 'duplicates',
    'upload.removeDuplicates': 'Remove duplicates',
    'upload.alreadyIdentified': 'Already identified',
    'upload.identify': 'Identify Species',
    'upload.processing': 'Processing',
    'upload.results': 'Results',
    'upload.otherPredictions': 'Other predictions:',

    // Identifications
    'id.title': 'Identifications',
    'id.searchPlaceholder': 'Search species...',
    'id.allSpecies': 'All species',
    'id.minConfidence': 'Min confidence:',
    'id.clearFilters': 'Clear filters',
    'id.sortBy': 'Sort by:',
    'id.sortDate': 'Date',
    'id.sortSpecies': 'Species',
    'id.sortConfidence': 'Confidence',
    'id.list': 'List',
    'id.grid': 'Grid',
    'id.identification': 'identification',
    'id.identificationPlural': 'identifications',
    'id.noMatch': 'No identifications match filters',
    'id.noData': 'No identifications yet',
    'id.adjustFilters': 'Try adjusting your filters',
    'id.uploadFirst': 'Upload and identify photos to see them here',
    'id.loading': 'Loading...',
    'id.date': 'Date',
    'id.filePath': 'File path',
    'id.deleteId': 'Delete identification',
    'id.unknown': 'Unknown',

    // Dashboard
    'dash.title': 'Dashboard',
    'dash.totalPhotos': 'Total Photos',
    'dash.uniqueSpecies': 'Unique Species',
    'dash.avgConfidence': 'Avg. Confidence',
    'dash.today': 'Today',
    'dash.topSpecies': 'Top Species',
    'dash.categories': 'Categories',
    'dash.timeline': 'Timeline (Monthly)',
    'dash.exportCsv': 'Export CSV',
    'dash.noData': 'No data yet — upload some photos first',

    // Common
    'common.scientificName': 'Scientific name',
    'common.language': 'Language',
  },
  es: {
    // Sidebar
    'nav.upload': 'Subir',
    'nav.identifications': 'Identificaciones',
    'nav.dashboard': 'Panel',
    'sidebar.title': 'FAUNA ID',
    'sidebar.subtitle': 'Identificación de fauna',
    'sidebar.models': 'MegaDetector + iNat21',

    // Upload
    'upload.title': 'Subir fotos',
    'upload.dragDrop': 'Arrastra y suelta fotos aquí',
    'upload.browse': 'o haz clic para buscar — JPG, PNG, WebP',
    'upload.newFiles': 'archivo nuevo',
    'upload.newFilesPlural': 'archivos nuevos',
    'upload.duplicates': 'duplicado',
    'upload.duplicatesPlural': 'duplicados',
    'upload.removeDuplicates': 'Quitar duplicados',
    'upload.alreadyIdentified': 'Ya identificado',
    'upload.identify': 'Identificar especies',
    'upload.processing': 'Procesando',
    'upload.results': 'Resultados',
    'upload.otherPredictions': 'Otras predicciones:',

    // Identifications
    'id.title': 'Identificaciones',
    'id.searchPlaceholder': 'Buscar especies...',
    'id.allSpecies': 'Todas las especies',
    'id.minConfidence': 'Confianza mín.:',
    'id.clearFilters': 'Limpiar filtros',
    'id.sortBy': 'Ordenar por:',
    'id.sortDate': 'Fecha',
    'id.sortSpecies': 'Especie',
    'id.sortConfidence': 'Confianza',
    'id.list': 'Lista',
    'id.grid': 'Cuadrícula',
    'id.identification': 'identificación',
    'id.identificationPlural': 'identificaciones',
    'id.noMatch': 'No hay identificaciones que coincidan',
    'id.noData': 'Sin identificaciones todavía',
    'id.adjustFilters': 'Prueba ajustando los filtros',
    'id.uploadFirst': 'Sube fotos e identifícalas para verlas aquí',
    'id.loading': 'Cargando...',
    'id.date': 'Fecha',
    'id.filePath': 'Ruta del archivo',
    'id.deleteId': 'Eliminar identificación',
    'id.unknown': 'Desconocido',

    // Dashboard
    'dash.title': 'Panel',
    'dash.totalPhotos': 'Total de fotos',
    'dash.uniqueSpecies': 'Especies únicas',
    'dash.avgConfidence': 'Confianza media',
    'dash.today': 'Hoy',
    'dash.topSpecies': 'Especies más vistas',
    'dash.categories': 'Categorías',
    'dash.timeline': 'Línea temporal (mensual)',
    'dash.exportCsv': 'Exportar CSV',
    'dash.noData': 'Sin datos — sube algunas fotos primero',

    // Common
    'common.scientificName': 'Nombre científico',
    'common.language': 'Idioma',
  },
};

// ── Context ────────────────────────────────────────────────────────────

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
  commonName: (scientific: string) => string;
}

const I18nContext = createContext<I18nContextValue>({
  lang: 'es',
  setLang: () => {},
  t: (key) => key,
  commonName: (s) => s,
});

export function useI18n() {
  return useContext(I18nContext);
}

// ── Common names (loaded async from JSON) ──────────────────────────────

let commonNamesData: Record<string, { en: string; es: string }> = {};

export function setCommonNames(data: Record<string, { en: string; es: string }>) {
  commonNamesData = data;
}

// ── Provider ───────────────────────────────────────────────────────────

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    // Persist language preference
    try {
      const saved = localStorage.getItem('fauna-id-lang');
      if (saved === 'en' || saved === 'es') return saved;
    } catch {}
    return 'es';
  });

  const changeLang = (newLang: Lang) => {
    setLang(newLang);
    try { localStorage.setItem('fauna-id-lang', newLang); } catch {}
  };

  const t = (key: string): string => {
    return UI[lang]?.[key] ?? UI['en']?.[key] ?? key;
  };

  const commonName = (scientific: string): string => {
    if (!scientific || scientific === 'Empty' || scientific === 'animal') return t('id.unknown');
    const entry = commonNamesData[scientific];
    if (entry) {
      return entry[lang] || entry['en'] || scientific;
    }
    return scientific;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang: changeLang, t, commonName }}>
      {children}
    </I18nContext.Provider>
  );
}
