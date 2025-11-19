// Importaciones necesarias para el modelo de juegos
import dbClient from "../config/dbClient.js";
import { ObjectId } from 'mongodb';

/**
 * Modelo de Juegos - Maneja todas las operaciones CRUD para la colección de juegos
 * Proporciona métodos para crear, leer, actualizar y eliminar juegos en la base de datos
 */
class JuegosModelo {
    constructor() {
        // Nombre de la colección en MongoDB
        this.colName = "games";
    }

    /**
     * Obtiene la colección de juegos de la base de datos
     * @returns {Collection} - Colección de MongoDB para juegos
     * @throws {Error} - Si la base de datos no está inicializada
     */
    _col() {
        if (!dbClient.db) throw new Error('Database not initialized. Call connectarDB() first.');
        return dbClient.db.collection(this.colName);
    }

    /**
     * Crea un nuevo juego en la base de datos
     * @param {Object} gameData - Datos del juego a crear
     * @param {string} gameData.titulo - Título del juego
     * @param {Array|string} gameData.genero - Género(s) del juego
     * @param {Array|string} gameData.plataforma - Plataforma(s) del juego
     * @param {number} gameData.añoLanzamiento - Año de lanzamiento
     * @param {string} gameData.desarrollador - Desarrollador del juego
     * @param {string} gameData.imagenPortada - URL de la imagen de portada
     * @param {string} gameData.descripcion - Descripción del juego
     * @param {boolean} gameData.completado - Estado de completado
     * @param {number} gameData.horasJugadas - Horas jugadas
     * @param {Array} gameData.reseñas - Lista de reseñas iniciales
     * @returns {Object} - Juego creado con su ID
     */
    async create(gameData) {
        try {    
            const col = this._col();
            // Estructura del nuevo juego con valores por defecto
            const newGame = {
                // Campos básicos del juego
                titulo: gameData.titulo || "",
                // Asegurar que género y plataforma siempre sean arrays
                genero: Array.isArray(gameData.genero) ? gameData.genero : [gameData.genero || ""],
                plataforma: Array.isArray(gameData.plataforma) ? gameData.plataforma : [gameData.plataforma || ""],
                añoLanzamiento: gameData.añoLanzamiento ? parseInt(gameData.añoLanzamiento) : null,
                desarrollador: gameData.desarrollador || "",
                imagenPortada: gameData.imagenPortada || "",
                descripcion: gameData.descripcion || "",
                // Estado y estadísticas
                completado: gameData.completado || false,
                fechaCreacion: new Date().toISOString(),
                horasJugadas: gameData.horasJugadas ? parseInt(gameData.horasJugadas) : 0,
                reseñas: gameData.reseñas || []
            };

            // Insertar el juego y retornar con su ID
            const result = await col.insertOne(newGame);
            return { ...newGame, _id: result.insertedId };
        } catch (error) {
            console.error('Error al crear juego:', error);
            throw error;
        }
    }

    /**
     * Obtiene todos los juegos de la base de datos
     * @param {Object} filter - Filtro de búsqueda opcional
     * @returns {Array} - Lista de juegos ordenados por fecha de creación (más reciente primero)
     */
    async getAll(filter = {}) {
        try {
            const col = this._col();
            // Buscar todos los juegos y ordenar por fecha de creación descendente
            const cursor = col.find(filter).sort({ fechaCreacion: -1 });
            const results = await cursor.toArray();
            return results;
        } catch (error) {
            console.error('Error al obtener juegos:', error);
            throw error;
        }
    }

    /**
     * Obtiene un juego específico por su ID
     * @param {string} id - ID del juego a buscar
     * @returns {Object|null} - Juego encontrado o null si no existe
     */
    async getOne(id) {
        try {
            // Validar que el ID sea un ObjectId válido
            if (!ObjectId.isValid(id)) {
                console.error('Formato de ObjectId inválido:', id);
                return null;
            }
            
            const col = this._col();
            const _id = new ObjectId(id);
            const game = await col.findOne({ _id });
            return game;
        } catch (error) {
            console.error('Error al obtener juego:', error);
            throw error;
        }
    }

    /**
     * Actualiza un juego existente
     * @param {string} id - ID del juego a actualizar
     * @param {Object} updateData - Datos a actualizar
     * @returns {Object|null} - Juego actualizado o null si no existe
     */
    async update(id, updateData) {
        try {
            if (!ObjectId.isValid(id)) {
                console.error('Formato de ObjectId inválido:', id);
                return null;
            }
            
            const col = this._col();
            const _id = new ObjectId(id);
            delete updateData._id; // Prevenir cambiar el _id
            const updatePayload = { $set: { ...updateData } };
            // Prevenir cambiar la fecha de creación
            if (updatePayload.$set.fechaCreacion) delete updatePayload.$set.fechaCreacion;
            const result = await col.findOneAndUpdate({ _id }, updatePayload, { returnDocument: 'after' });
            return result;
        } catch (error) {
            console.error('Error al actualizar juego:', error);
            throw error;
        }
    }

    /**
     * Elimina un juego por su ID
     * @param {string} id - ID del juego a eliminar
     * @returns {boolean} - true si se eliminó correctamente, false si no
     */
    async delete(id) {
        try {
            if (!ObjectId.isValid(id)) {
                console.error('Formato de ObjectId inválido:', id);
                return false;
            }
            
            const col = this._col();
            const _id = new ObjectId(id);
            const result = await col.deleteOne({ _id });
            return result.deletedCount === 1;
        } catch (error) {
            console.error('Error al eliminar juego:', error);
            throw error;
        }
    }

    /**
     * Añade una reseña a un juego específico
     * @param {string} juegoId - ID del juego al que se añadirá la reseña
     * @param {Object} reseñaData - Datos de la reseña
     * @param {string} reseñaData.nombreUsuario - Nombre del usuario que reseña
     * @param {string} reseñaData.textoReseña - Texto de la reseña
     * @param {number} reseñaData.calificaciones - Calificación (0-5)
     * @param {number} reseñaData.horasJugadas - Horas jugadas por el usuario
     * @param {string} reseñaData.dificultad - Dificultad percibida
     * @param {boolean} reseñaData.recomendaria - Si lo recomendaría
     * @returns {Object} - Reseña creada
     */
    async addReseña(juegoId, reseñaData) {
        try {
            if (!ObjectId.isValid(juegoId)) {
                console.error('Formato de ObjectId inválido:', juegoId);
                throw new Error('ID de juego inválido');
            }
            
            const col = this._col();
            const _id = new ObjectId(juegoId);
            
            // Crear nueva reseña con valores por defecto
            const newReseña = {
                _id: new ObjectId(), // ID único para la reseña
                juegoId: juegoId,
                nombreUsuario: reseñaData.nombreUsuario || "Anónimo",
                textoReseña: reseñaData.textoReseña || "",
                calificaciones: reseñaData.calificaciones || 0,
                horasJugadas: reseñaData.horasJugadas || 0,
                dificultad: reseñaData.dificultad || "Normal",
                recomendaria: reseñaData.recomendaria !== undefined ? reseñaData.recomendaria : true,
                fechaCreacion: new Date().toISOString()
            };

            // Añadir la reseña al array de reseñas del juego
            const result = await col.findOneAndUpdate(
                { _id },
                { $push: { reseñas: newReseña } },
                { returnDocument: 'after' }
            );
            
            return newReseña;
        } catch (error) {
            console.error('Error al añadir reseña:', error);
            throw error;
        }
    }

    /**
     * Obtiene todas las reseñas de un juego específico
     * @param {string} juegoId - ID del juego del que se obtendrán las reseñas
     * @returns {Array} - Lista de reseñas del juego
     */
    async getReseñas(juegoId) {
        try {
            if (!ObjectId.isValid(juegoId)) {
                console.error('Formato de ObjectId inválido:', juegoId);
                return [];
            }
            
            const col = this._col();
            const _id = new ObjectId(juegoId);
            // Buscar el juego y proyectar solo el campo reseñas
            const game = await col.findOne({ _id }, { projection: { reseñas: 1 } });
            return game?.reseñas || [];
        } catch (error) {
            console.error('Error al obtener reseñas:', error);
            throw error;
        }
    }
}

// Exportar una instancia única del modelo (patrón Singleton)
export default new JuegosModelo();
