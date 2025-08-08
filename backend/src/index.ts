import express from 'express';
import cors from 'cors';

// Import Module
import { registerHRRoutes } from './modules/hr/orchestrator';
import { registerSupportRoutes } from './modules/support/orchestrator';
import { requireAuth } from './modules/hr/core/auth';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// API Router für Module
const apiRouter = express.Router();

// Public Routes (ohne Authentifizierung)
app.get('/api/health', (req, res) => {
  res.json({ 
    message: 'CompanyAI Backend ist bereit!', 
    status: 'OK',
    timestamp: new Date().toISOString(),
    modules: ['hr', 'support'] // Liste der verfügbaren Module
  });
});

app.get('/api/hello', (req, res) => {
  res.json({ 
    message: 'Hallo von CompanyAI Backend!',
    data: 'Ihre modulare API ist aktiv',
    availableModules: {
      hr: {
        description: 'Human Resources Management',
        endpoints: [
          'GET /api/hr/employees',
          'POST /api/hr/employees', 
          'GET /api/hr/stats',
          'POST /api/hr/onboarding/plans',
          'POST /api/hr/reports'
        ]
      },
      support: {
        description: 'Customer Support & Ticket Management',
        endpoints: [
          'GET /api/support/tickets',
          'POST /api/support/tickets',
          'PUT /api/support/tickets/:id'
        ]
      }
    }
  });
});

// Authentication-Info Route
app.get('/api/auth/info', (req, res) => {
  res.json({
    message: 'CompanyAI Authentifizierung',
    info: 'Verwenden Sie Bearer Token in der Authorization-Header',
    testTokens: {
      admin: Buffer.from('admin@company.com').toString('base64'),
      hrManager: Buffer.from('hr.manager@company.com').toString('base64'),
      hrSpecialist: Buffer.from('hr.specialist@company.com').toString('base64')
    },
    usage: 'Authorization: Bearer <token>'
  });
});

// Authentifizierung für alle API-Routes (außer Public Routes)
apiRouter.use(requireAuth);

// Module Routes registrieren
registerHRRoutes(apiRouter);
registerSupportRoutes(apiRouter);

// API Router mounten
app.use('/api', apiRouter);

// Default route
app.get('/', (req, res) => {
  res.json({ 
    message: 'CompanyAI Backend API',
    version: '2.0.0',
    architecture: 'Modulbasiert',
    modules: ['hr', 'support'],
    documentation: '/api/hello'
  });
});

// 404 Handler für unbekannte Routen
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'NotFound',
    message: `Route ${req.method} ${req.path} nicht gefunden`
  });
});

// Globaler Error Handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Unbehandelter Fehler:', err);
  
  // Verhindere Fehler-Details in Produktion
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  res.status(err.status || 500).json({
    success: false,
    error: 'InternalServerError',
    message: 'Ein unerwarteter Fehler ist aufgetreten',
    ...(isDevelopment && { details: err.message, stack: err.stack })
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend läuft auf Port ${PORT}`);
  console.log(`📍 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`📚 API Dokumentation: http://localhost:${PORT}/api/hello`);
});
