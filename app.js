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

// Configurar Express para decodificar caracteres codificados en URL correctamente
app.set('query parser', 'extended');
app.set('strict routing', false);

// Configuración de CORS
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200 // Para soporte de navegadores legacy
};

app.use(cors(corsOptions));

// Endpoint de verificación de estado
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'API está funcionando' });
});

// Rutas de la API
app.use('/api/juegos', routesJuegos);



// Manejo de rutas no encontradas (404)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada',
    path: req.originalUrl
  });
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Manejo de errores de validación
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors: err.errors
    });
  }

  // Manejo de otros errores
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Iniciar el servidor
const startServer = async () => {
  try {
    const PORT = process.env.PORT || 5100;
    await dbClient.conectarDB();
    
    const server = app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
      console.log(`📚 Base de datos: ${process.env.DB_NAME}@${process.env.SERVER_DB}`);
      console.log(`🌍 Frontend: ${process.env.FRONTEND_URL || 'http://localhost:3000'}\n`);
    });

    // Manejo de cierre limpio
    const shutdown = () => {
      console.log('🔌 Apagando el servidor...');
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