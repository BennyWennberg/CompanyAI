import dotenv from 'dotenv';
import path from 'path';

// Korrekte .env Pfad-Auflösung
const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

// Debug: Environment-Variablen prüfen
console.log('🔧 Environment Check:');
console.log(`   ENV Path: ${envPath}`);
console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`   PORT: ${process.env.PORT}`);
console.log(`   OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? 'GESETZT ✅' : 'FEHLT ❌'}`);
console.log(`   GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? 'GESETZT ✅' : 'FEHLT ❌'}`);
console.log(`   RAG_EMBEDDING_PROVIDER: ${process.env.RAG_EMBEDDING_PROVIDER || 'DEFAULT (openai)'}`);

import app from './app';
import { EmailService } from './modules/support/services/emailService';
import { EmailReceiver } from './modules/support/services/emailReceiver';

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`🚀 Backend läuft auf Port ${PORT}`);
  console.log(`📍 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`📚 API Dokumentation: http://localhost:${PORT}/api/hello`);
  
  // E-Mail-Service initialisieren (optional, für Ticket-E-Mail-Integration)
  await EmailService.initialize();
  
  // E-Mail-Empfang starten (optional, für E-Mail-Antworten)
  await EmailReceiver.startEmailMonitoring();
});
