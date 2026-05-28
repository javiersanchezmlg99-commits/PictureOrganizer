import express from 'express';
import * as db from './database';
import { loadModels, identifyImage } from './inference';
import { generateThumbnail } from './thumbnails';
import { v4 as uuidv4 } from 'uuid';

export function startApiServer(port = 3001): void {
  const app = express();
  app.use(express.json());

  app.get('/api/photos', (_req, res) => {
    res.json(db.getAllPhotos());
  });

  app.get('/api/photos/:id', (req, res) => {
    const photo = db.getPhotoById(req.params.id);
    if (!photo) {
      res.status(404).json({ error: 'Photo not found' });
      return;
    }
    res.json(photo);
  });

  app.delete('/api/photos/:id', (req, res) => {
    db.deletePhoto(req.params.id);
    res.json({ ok: true });
  });

  app.post('/api/identify', async (req, res) => {
    const { filePath } = req.body;
    if (!filePath) {
      res.status(400).json({ error: 'filePath is required' });
      return;
    }
    try {
      await loadModels();
      const { detections, species, topSpecies, inferenceTimeMs } =
        await identifyImage(filePath);

      const animals = detections.filter(d => d.classId === 0);
      const bestAnimal = animals.length > 0
        ? animals.reduce((a, b) => (a.confidence > b.confidence ? a : b))
        : null;

      const id = uuidv4();
      const filename = filePath.split(/[\\/]/).pop() ?? 'unknown';
      const speciesName = species?.name ?? (bestAnimal?.label ?? 'Empty');
      const confidence = species?.confidence ?? (bestAnimal?.confidence ?? 0);
      const category = bestAnimal ? 'Animal' : 'Empty';

      db.insertPhoto({
        filename,
        file_path: filePath,
        species_name: speciesName,
        scientific_name: speciesName,
        confidence,
        category,
        inference_time_ms: inferenceTimeMs,
        all_predictions: topSpecies.length > 0
          ? topSpecies.map(s => ({ class: s.name, confidence: s.confidence }))
          : detections.map(d => ({ class: d.label, confidence: d.confidence })),
      });

      try { generateThumbnail(id, filePath); } catch { /* non-critical */ }

      res.json({
        id,
        filename,
        species_name: speciesName,
        confidence,
        category,
        inference_time_ms: inferenceTimeMs,
        detections: detections.length,
        top_species: topSpecies.slice(0, 5),
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get('/api/stats', (_req, res) => {
    res.json(db.getStats());
  });

  app.get('/api/species/top', (_req, res) => {
    res.json(db.getTopSpecies());
  });

  app.get('/api/timeline', (_req, res) => {
    res.json(db.getTimeline());
  });

  app.get('/api/categories', (_req, res) => {
    res.json(db.getCategoryDistribution());
  });

  app.get('/api/export/csv', (_req, res) => {
    const csv = db.exportToCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="fauna-export-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  });

  app.listen(port, '127.0.0.1', () => {
    console.log(`FAUNA ID API running on http://127.0.0.1:${port}`);
  });
}
