import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { randomUUID } from 'crypto';

// Import Module
import { registerHRRoutes } from './modules/hr/orchestrator';
import { registerSupportRoutes } from './modules/support/orchestrator';
import { registerAIRoutes } from './modules/ai/orchestrator';
import { registerAdminRoutes } from './modules/admin/orchestrator';
import { registerAdminPortalRoutes, AdminPortalOrchestrator } from './modules/admin-portal/orchestrator';
import { registerAuthRoutes } from './modules/auth/orchestrator';

// Initialize Support DataStore
import './modules/support/core/dataStore';

// Initialize Support Email Service  
import { EmailService } from './modules/support/services/emailService';
import { requireAuth } from './modules/hr/core/auth';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './openapi';

// Import DataSources Integration
import { startDataSourceSync, handleGetUsers, handleGetDevices, handleCreateUser, handleCreateDevice, handleUpdateUser, handleUpdateDevice, handleDeleteUser, handleDeleteDevice, handleGetStats, handleGetSources, handleManualSync, handleGetSyncStatus } from './integrations';
import { seedManualUsersIfEmpty } from './datasources/manual';

// Import Permission Routes
import { permissionRoutes } from './routes/permission.routes';

const app = express();

// Middleware
app.use((req: any, _res, next) => { req.reqId = randomUUID(); next(); });
app.use(helmet());
app.use(cors({ origin: ['http://localhost:5173'] }));
app.use(morgan(':method :url :status :res[content-length] - :response-time ms reqId=:req[reqId]'));
app.use(express.json());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

// API Router für Module
const apiRouter = express.Router();

// Public Routes (ohne Authentifizierung)
app.get('/api/health', (req, res) => {
  res.json({ 
    message: 'CompanyAI Backend ist bereit!', 
    status: 'OK',
    timestamp: new Date().toISOString(),
    modules: ['hr', 'support', 'ai', 'admin', 'admin-portal', 'auth', 'data']
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
      },
      ai: {
        description: 'AI Chat (OpenAI/Gemini/Ollama) & RAG-gestützte Assistenten',
        endpoints: [
          'POST /api/ai/chat',
          'POST /api/ai/hr-assist',
          'POST /api/ai/rag/reindex'
        ]
      },
      admin: {
        description: 'System Administration & User Management',
        endpoints: [
          'GET /api/admin/users',
          'POST /api/admin/users',
          'PUT /api/admin/users/:id',
          'DELETE /api/admin/users/:id',
          'GET /api/admin/settings',
          'POST /api/admin/settings',
          'GET /api/admin/audit-logs',
          'GET /api/admin/system-stats'
        ]
      },
      'admin-portal': {
        description: 'Multi-Source User Integration (Entra, LDAP, Upload, Manual)',
        endpoints: [
          'POST /api/admin-portal/sync/:source',
          'GET /api/admin-portal/users',
          'POST /api/admin-portal/upload/process',
          'POST /api/admin-portal/manual/users',
          'GET /api/admin-portal/dashboard/stats',
          'GET /api/admin-portal/conflicts'
        ]
      },
      auth: {
        description: 'Multi-Provider Authentication (Admin, Manual, Entra, LDAP) + Enhanced Permissions',
        endpoints: [
          'POST /api/auth/admin-token',
          'POST /api/auth/manual-login',
          'POST /api/auth/entra-login',
          'POST /api/auth/ldap-login',
          'GET /api/auth/entra/callback',
          'GET /api/auth/providers',
          'GET /api/auth/test-tokens',
          '🔑 GET /api/auth/permissions',
          '🔑 POST /api/auth/permissions/invalidate',
          '🔑 GET /api/auth/permissions/status'
        ]
      },
      data: {
        description: 'DataSources Integration (Entra ID, Manual, CSV, etc.)',
        endpoints: [
          'GET /api/data/users',
          'GET /api/data/devices',
          'POST /api/data/users',
          'POST /api/data/devices',
          'PUT /api/data/users/:id',
          'PUT /api/data/devices/:id',
          'DELETE /api/data/users/:id',
          'DELETE /api/data/devices/:id',
          'GET /api/data/stats',
          'GET /api/data/sources',
          'POST /api/data/sync',
          'GET /api/data/sync/status'
        ]
      }
    }
  });
});

// Authentication-Info Route
app.get('/api/auth/info', (_req, res) => {
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

// Swagger UI
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api/openapi.json', (_req, res) => res.json(swaggerSpec));

// Auth Routes (OHNE requireAuth - da sie für Login verwendet werden)
registerAuthRoutes(apiRouter);

// Permission Routes (MIT Authentifizierung, daher nach requireAuth)
// Diese Routes verwenden ihr eigenes authenticateWithPermissions
apiRouter.use('/auth', permissionRoutes);

// Authentifizierung für alle API-Routes (außer Public Routes)
apiRouter.use(requireAuth);

// Module Routes registrieren
registerHRRoutes(apiRouter);
registerSupportRoutes(apiRouter);
registerAIRoutes(apiRouter);
registerAdminRoutes(apiRouter);
registerAdminPortalRoutes(apiRouter);

// DataSources API Routes registrieren
apiRouter.get('/data/users', handleGetUsers);
apiRouter.get('/data/devices', handleGetDevices);
apiRouter.post('/data/users', handleCreateUser);
apiRouter.post('/data/devices', handleCreateDevice);
apiRouter.put('/data/users/:id', handleUpdateUser);
apiRouter.put('/data/devices/:id', handleUpdateDevice);
apiRouter.delete('/data/users/:id', handleDeleteUser);
apiRouter.delete('/data/devices/:id', handleDeleteDevice);
apiRouter.get('/data/stats', handleGetStats);
apiRouter.get('/data/sources', handleGetSources);
apiRouter.post('/data/sync', handleManualSync);
apiRouter.get('/data/sync/status', handleGetSyncStatus);

// API Router mounten
app.use('/api', apiRouter);

// Starte DataSources Integration (automatische Synchronisation)
seedManualUsersIfEmpty();
startDataSourceSync();

// Admin-Portal initialisieren
AdminPortalOrchestrator.initialize().catch(error => {
  console.error('❌ Admin-Portal Initialisierung fehlgeschlagen:', error);
});

// Default route
app.get('/', (req, res) => {
  res.json({ 
    message: 'CompanyAI Backend API',
    version: '2.1.0',
    architecture: 'Modulbasiert',
    modules: ['hr', 'support', 'ai', 'admin', 'admin-portal', 'auth', 'data'],
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
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('Unbehandelter Fehler:', err);
  const isDevelopment = process.env.NODE_ENV !== 'production';
  res.status(err.status || 500).json({
    success: false,
    error: 'InternalServerError',
    message: 'Ein unerwarteter Fehler ist aufgetreten',
    ...(isDevelopment && { details: err.message, stack: err.stack })
  });
});

export default app;


