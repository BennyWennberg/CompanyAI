import app from './app';

const PORT = process.env.PORT || 5000;


app.listen(PORT, () => {
  console.log(`🚀 Backend läuft auf Port ${PORT}`);
  console.log(`📍 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`📚 API Dokumentation: http://localhost:${PORT}/api/hello`);
});
