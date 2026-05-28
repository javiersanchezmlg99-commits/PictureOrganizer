export interface Photo {
  id: string;
  filename: string;
  file_path: string;
  species_name: string | null;
  scientific_name: string | null;
  confidence: number;
  category: string | null;
  location_lat: number | null;
  location_lng: number | null;
  inference_time_ms: number | null;
  created_at: string;
}

export interface PhotoMetadata {
  photo_id: string;
  all_predictions: string | null;
  raw_output: string | null;
}

export interface IdentificationResult {
  id: string;
  filename: string;
  species_name: string;
  scientific_name: string;
  confidence: number;
  category: string;
  inference_time_ms: number;
  all_predictions: Array<{ class: string; confidence: number }>;
}

export interface StatsData {
  total_photos: number;
  unique_species: number;
  avg_confidence: number;
  photos_today: number;
}

export interface SpeciesCount {
  species_name: string;
  count: number;
}

export interface TimelineEntry {
  month: string;
  count: number;
}

export interface CategoryCount {
  category: string;
  count: number;
}

export interface PhotoFilter {
  search?: string;
  category?: string;
  minConfidence?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface ElectronAPI {
  getPhotos: (filter?: PhotoFilter) => Promise<Photo[]>;
  getPhoto: (id: string) => Promise<Photo | null>;
  deletePhoto: (id: string) => Promise<void>;
  selectFiles: () => Promise<string[]>;
  identifyPhoto: (filePath: string) => Promise<IdentificationResult>;
  getStats: () => Promise<StatsData>;
  getTopSpecies: (limit?: number) => Promise<SpeciesCount[]>;
  getTimeline: () => Promise<TimelineEntry[]>;
  getCategoryDistribution: () => Promise<CategoryCount[]>;
  exportCsv: () => Promise<string>;
}
