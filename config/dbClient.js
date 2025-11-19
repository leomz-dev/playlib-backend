// Importaciones necesarias para la conexión con MongoDB
// MongoClient: Clase principal para establecer conexión con la base de datos
// ServerApiVersion: Enumeración para especificar la versión del API del servidor
import { MongoClient, ServerApiVersion } from 'mongodb';

/**
 * Cliente de Base de Datos MongoDB - Implementa el patrón Singleton
 * Gestiona la conexión con MongoDB Atlas, incluyendo reconexión automática y manejo de errores
 * Proporciona métodos para conectar, verificar estado y cerrar la conexión
 */
class DBClient {
  /**
   * Constructor de la clase DBClient
   * Inicializa las propiedades para el manejo de la conexión
   */
  constructor() {
    this.client = null; // Instancia del cliente MongoDB
    this.db = null; // Instancia de la base de datos
    this.connectionAttempts = 0; // Contador de intentos de conexión
    this.maxReconnectAttempts = 5; // Máximo número de intentos de reconexión
    this.reconnectDelay = 5000; // Tiempo de espera entre intentos (5 segundos)
  }

  /**
   * Conecta a la base de datos MongoDB
   * Implementa patrón Singleton - si ya existe conexión activa, la retorna
   * @returns {Promise<MongoClient>} - Cliente MongoDB conectado
   */
  async conectarDB() {
    // Verificar si ya existe una conexión activa para evitar múltiples conexiones
    if (this.client && this.isConnected()) {
      console.log('✅ Ya existe una conexión activa a MongoDB');
      return this.client;
    }
    // Si no hay conexión, inicializar una nueva
    return this.initialize();
  }

  /**
   * Inicializa la conexión con MongoDB Atlas
   * Configura el cliente con opciones de conexión y establece la conexión
   * @private
   */
  async initialize() {
    try {
      // Validar que las variables de entorno necesarias estén configuradas
      if (!process.env.USER_DB || !process.env.PASSWORD_DB || !process.env.SERVER_DB) {
        throw new Error('Faltan variables de entorno requeridas para MongoDB');
      }

      // Construir la URI de conexión con las credenciales del entorno
      // encodeURIComponent() asegura que caracteres especiales en la contraseña sean codificados correctamente
      const uri = `mongodb+srv://${process.env.USER_DB}:${encodeURIComponent(process.env.PASSWORD_DB)}@${process.env.SERVER_DB}/?retryWrites=true&w=majority&appName=Cluster0`;
      
      // Crear instancia del cliente MongoDB con configuración optimizada
      this.client = new MongoClient(uri, {
        serverApi: {
          version: ServerApiVersion.v1, // Versión estable del API
          strict: true, // Modo estricto para evitar comportamientos obsoletos
          deprecationErrors: true, // Lanzar errores para características obsoletas
        },
        maxPoolSize: 10, // Máximo de conexiones en el pool
        serverSelectionTimeoutMS: 5000, // Timeout para selección de servidor
        socketTimeoutMS: 45000, // Timeout para operaciones de socket
      });

      // Intentar conectar con lógica de reintentos
      await this.connectWithRetry();
      // Configurar listeners para eventos de conexión
      this.setupEventListeners();
      
    } catch (error) {
      console.error('❌ Error al inicializar la conexión a la base de datos:', error);
      this.handleConnectionError(error);
    }
  }

  /**
   * Conecta a MongoDB con lógica de reintentos
   * Implementa backoff exponencial simple para reconexiones
   * @private
   * @returns {Promise<MongoClient>} - Cliente MongoDB conectado
   * @throws {Error} - Si falla después del máximo de intentos
   */
  async connectWithRetry() {
    try {
      // Intentar establecer la conexión
      await this.client.connect();
      // Obtener referencia a la base de datos especificada en variables de entorno
      this.db = this.client.db(process.env.DB_NAME || "test");
      // Reiniciar contador de intentos en conexión exitosa
      this.connectionAttempts = 0;
      console.log('✅ Conexión exitosa a MongoDB');
      return this.client;
    } catch (error) {
      // Incrementar contador de intentos fallidos
      this.connectionAttempts++;
      
      // Verificar si aún quedan intentos disponibles
      if (this.connectionAttempts < this.maxReconnectAttempts) {
        console.warn(`⚠️ Intento de conexión ${this.connectionAttempts} falló. Reintentando en ${this.reconnectDelay/1000} segundos...`);
        // Esperar antes del próximo intento
        await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));
        // Llamada recursiva para reintentar conexión
        return this.connectWithRetry();
      } else {
        // Lanzar error si se excede el máximo de intentos
        throw new Error(`Falló la conexión a MongoDB después de ${this.maxReconnectAttempts} intentos: ${error.message}`);
      }
    }
  }

  /**
   * Configura los listeners para eventos de MongoDB
   * Monitorea el estado de la conexión y el pool de conexiones
   * @private
   */
  setupEventListeners() {
    // Evento: Heartbeat exitoso - indica que el servidor responde correctamente
    this.client.on('serverHeartbeatSucceeded', () => {
      console.log('💓 Heartbeat de MongoDB exitoso');
    });

    // Evento: Heartbeat fallido - posible problema de conexión
    this.client.on('serverHeartbeatFailed', (event) => {
      console.warn('⚠️ Heartbeat de MongoDB fallido:', event);
      this.handleConnectionError(new Error('Falló el heartbeat de MongoDB'));
    });

    // Evento: Pool de conexiones listo - todas las conexiones están disponibles
    this.client.on('connectionPoolReady', () => {
      console.log('🔌 Pool de conexiones de MongoDB listo');
    });

    // Evento: Pool de conexiones cerrado - todas las conexiones se cerraron
    this.client.on('connectionPoolClosed', (event) => {
      console.warn('⚠️ Pool de conexiones de MongoDB cerrado:', event);
      this.handleConnectionError(new Error('Pool de conexiones de MongoDB cerrado'));
    });
  }

  /**
   * Maneja errores de conexión y decide la estrategia de recuperación
   * Implementa lógica de reconexión automática basada en intentos
   * @private
   * @param {Error} error - Error de conexión ocurrido
   */
  handleConnectionError(error) {
    console.error('❌ Error de conexión a MongoDB:', error);
    
    // Estrategia de manejo de errores - intentar reconexión si quedan intentos
    if (this.connectionAttempts < this.maxReconnectAttempts) {
      console.log('Intentando reconectar...');
      // Programar reconexión después del tiempo de espera
      setTimeout(() => this.connectWithRetry(), this.reconnectDelay);
    } else {
      console.error('Se alcanzó el máximo de intentos de reconexión. Por favor, verifique su conexión a MongoDB.');
      // En producción, podríamos querer cerrar la aplicación gracefulmente
      // process.exit(1);
    }
  }

  /**
   * Cierra la conexión con MongoDB de forma segura
   * Libera recursos y limpia el estado del cliente
   * @returns {Promise<void>}
   */
  async closeConnection() {
    try {
      // Verificar si existe una conexión activa antes de cerrar
      if (this.client) {
        await this.client.close();
        console.log('Conexión a MongoDB cerrada');
      }
    } catch (error) {
      console.error('Error al cerrar la conexión a MongoDB:', error);
      throw error;
    }
  }

  /**
   * Verifica si la base de datos está conectada y disponible
   * Comprueba el estado de la topología del cliente MongoDB
   * @returns {boolean} - true si está conectado, false en caso contrario
   */
  isConnected() {
    return this.client && this.client.topology && this.client.topology.isConnected();
  }

  /**
   * Obtiene la instancia de la base de datos
   * Verifica que la conexión esté activa antes de retornar la DB
   * @returns {Db} - Instancia de la base de datos MongoDB
   * @throws {Error} - Si la base de datos no está conectada
   */
  getDB() {
    if (!this.isConnected()) {
      throw new Error('La base de datos no está conectada');
    }
    return this.db;
  }
}

// Crear una instancia singleton del cliente de base de datos
// Esto asegura que solo exista una conexión en toda la aplicación
export default new DBClient();