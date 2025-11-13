import { MongoClient, ServerApiVersion } from 'mongodb';

class DBClient {
  constructor() {
    this.client = null;
    this.db = null;
    this.connectionAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000; // 5 seconds
    this.initialize();
  }

  async initialize() {
    try {
      if (!process.env.USER_DB || !process.env.PASSWORD_DB || !process.env.SERVER_DB) {
        throw new Error('Missing required MongoDB environment variables');
      }

      const uri = `mongodb+srv://${process.env.USER_DB}:${encodeURIComponent(process.env.PASSWORD_DB)}@${process.env.SERVER_DB}/?retryWrites=true&w=majority&appName=Cluster0`;
      
      this.client = new MongoClient(uri, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        },
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      await this.connectWithRetry();
      this.setupEventListeners();
      
    } catch (error) {
      console.error('❌ Error initializing database connection:', error);
      this.handleConnectionError(error);
    }
  }

  async connectWithRetry() {
    try {
      await this.client.connect();
      this.db = this.client.db(process.env.DB_NAME || "test");
      this.connectionAttempts = 0; // Reset on successful connection
      console.log('✅ Successfully connected to MongoDB');
      return this.client;
    } catch (error) {
      this.connectionAttempts++;
      
      if (this.connectionAttempts < this.maxReconnectAttempts) {
        console.warn(`⚠️ Connection attempt ${this.connectionAttempts} failed. Retrying in ${this.reconnectDelay/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));
        return this.connectWithRetry();
      } else {
        throw new Error(`Failed to connect to MongoDB after ${this.maxReconnectAttempts} attempts: ${error.message}`);
      }
    }
  }

  setupEventListeners() {
    this.client.on('serverHeartbeatSucceeded', () => {
      console.log('💓 MongoDB heartbeat succeeded');
    });

    this.client.on('serverHeartbeatFailed', (event) => {
      console.warn('⚠️ MongoDB heartbeat failed:', event);
      this.handleConnectionError(new Error('MongoDB heartbeat failed'));
    });

    this.client.on('connectionPoolReady', () => {
      console.log('🔌 MongoDB connection pool ready');
    });

    this.client.on('connectionPoolClosed', (event) => {
      console.warn('⚠️ MongoDB connection pool closed:', event);
      this.handleConnectionError(new Error('MongoDB connection pool closed'));
    });
  }

  handleConnectionError(error) {
    console.error('❌ MongoDB connection error:', error);
    // Implement your error handling strategy here
    // For example, you might want to trigger a reconnection
    if (this.connectionAttempts < this.maxReconnectAttempts) {
      console.log('Attempting to reconnect...');
      setTimeout(() => this.connectWithRetry(), this.reconnectDelay);
    } else {
      console.error('Max reconnection attempts reached. Please check your MongoDB connection.');
      // In a production environment, you might want to gracefully shut down the application
      // process.exit(1);
    }
  }

  async closeConnection() {
    try {
      if (this.client) {
        await this.client.close();
        console.log('MongoDB connection closed');
      }
    } catch (error) {
      console.error('Error closing MongoDB connection:', error);
      throw error;
    }
  }

  // Add a method to check if the database is connected
  isConnected() {
    return this.client && this.client.topology && this.client.topology.isConnected();
  }

  // Get the database instance
  getDB() {
    if (!this.isConnected()) {
      throw new Error('Database not connected');
    }
    return this.db;
  }
}

// Create a singleton instance
export default new DBClient();