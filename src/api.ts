import express from 'express';
import * as db from './database';

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

  app.post('/api/identify', (_req, res) => {
    res.json({
      message: 'Demo mode — no model loaded',
      species_name: 'Unknown Species',
      scientific_name: 'Species incognita',
      confidence: 0,
      category: 'Unknown',
    });
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
