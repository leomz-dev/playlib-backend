import express from 'express';
import "dotenv/config";
import routesJuegos from './routes/juegos.js';
import dbClient from './config/dbClient.js';
import bodyParser from 'body-parser';
import cors from 'cors';

const app = express();

// Middleware
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// CORS Configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200 // For legacy browser support
};

app.use(cors(corsOptions));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'API is running' });
});

// API Routes
app.use('/api/juegos', routesJuegos);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Bienvenido a la API de PlayLib',
    endpoints: {
      juegos: '/api/juegos',
      health: '/health'
    },
    documentation: 'Documentación disponible en /docs' // Consider adding Swagger/OpenAPI docs
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada',
    path: req.originalUrl
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors: err.errors
    });
  }

  // Handle other errors
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
const startServer = async () => {
  try {
    const PORT = process.env.PORT || 5100;
    await dbClient.connectWithRetry();
    
    const server = app.listen(PORT, () => {
      console.log(`\n🚀 Servidor corriendo en http://localhost:${PORT}`);
      console.log(`📚 Base de datos: ${process.env.DB_NAME}@${process.env.SERVER_DB}`);
      console.log(`🌍 Frontend: ${process.env.FRONTEND_URL || 'http://localhost:3000'}\n`);
    });

    // Manejo de cierre limpio
    const shutdown = () => {
      console.log('\n🔌 Apagando el servidor...');
      server.close(() => {
        console.log('Servidor detenido');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

startServer();