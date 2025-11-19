// Importación del modelo de juegos para interactuar con la base de datos
import juegosModelo from "../models/Juegos.js";

/**
 * Controlador de Juegos - Maneja las peticiones HTTP para la API de juegos
 * Proporciona métodos CRUD y funcionalidades adicionales para gestión de juegos y reseñas
 * Actúa como intermediario entre las rutas y el modelo de datos
 */
class juegosController {
    constructor() {}

    /**
     * Crea un nuevo juego en la base de datos
     * @route POST /api/juegos
     * @param {Object} req - Objeto de petición Express
     * @param {Object} req.body - Datos del juego a crear
     * @param {string} req.body.titulo - Título del juego (obligatorio)
     * @param {string|Array} req.body.genero - Género(s) del juego (obligatorio)
     * @param {number} req.body.añoLanzamiento - Año de lanzamiento (opcional)
     * @param {Object} res - Objeto de respuesta Express
     * @returns {Object} - Respuesta JSON con el juego creado o mensaje de error
     */
    // Crear un nuevo juego
    async create(req, res) {
        try {
            // Log para depuración - mostrar datos recibidos
            console.log('Received create request with body:', JSON.stringify(req.body, null, 2));
            const body = req.body || {};

            // Validaciones básicas de campos obligatorios
            // Validar que el título no esté vacío
            if (!body.titulo) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'El campo "título" es obligatorio',
                    field: 'titulo',
                    receivedData: body
                });
            }
            
            // Validar que el género no esté vacío
            if (!body.genero || (Array.isArray(body.genero) && body.genero.length === 0)) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'El campo "género" es obligatorio',
                    field: 'genero',
                    receivedData: body
                });
            }

            // Validar tipos de datos y formato
            // Validar que el año de lanzamiento sea un número válido
            if (body.añoLanzamiento && isNaN(Number(body.añoLanzamiento))) {
                return res.status(400).json({
                    success: false,
                    message: 'El año de lanzamiento debe ser un número válido',
                    field: 'añoLanzamiento'
                });
            }

            // Normalizar datos - asegurar que el año sea entero
            if (body.añoLanzamiento) {
                body.añoLanzamiento = parseInt(body.añoLanzamiento, 10);
            }

            // Log para depuración - mostrar datos final a crear
            console.log('Creating game with data:', JSON.stringify(body, null, 2));
            const created = await juegosModelo.create(body);
            console.log('Game created successfully:', created._id);
            
            // Respuesta exitosa con juego creado
            return res.status(201).json({ 
                success: true, 
                data: created, 
                message: 'Juego creado exitosamente' 
            });
            
        } catch (error) {
            // Log del error para depuración
            console.error('Error en create controller:', error);
            
            // Manejar diferentes tipos de errores de forma específica
            
            // Errores de validación de MongoDB/Mongoose
            if (error.name === 'ValidationError') {
                const messages = Object.values(error.errors).map(val => val.message);
                return res.status(400).json({
                    success: false,
                    message: 'Error de validación',
                    errors: messages,
                    error: error.message
                });
            }
            
            // Errores de duplicado (índices únicos)
            if (error.code === 11000) {
                return res.status(400).json({
                    success: false,
                    message: 'Ya existe un juego con este título',
                    error: error.message
                });
            }
            
            // Error genérico del servidor
            return res.status(500).json({ 
                success: false, 
                message: 'Error al crear el juego', 
                error: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    }

    /**
     * Obtiene todos los juegos de la base de datos con filtrado opcional
     * @route GET /api/juegos
     * @param {Object} req - Objeto de petición Express
     * @param {Object} req.query - Parámetros de consulta para filtrado
     * @param {string} req.query.genero - Filtrar por género específico
     * @param {string} req.query.plataforma - Filtrar por plataforma específica
     * @param {Object} res - Objeto de respuesta Express
     * @returns {Object} - Respuesta JSON con lista de juegos o mensaje de error
     */
    // Obtener todos los juegos (opcionalmente filtrar por query)
    async getAll(req, res) {
        try {
            // Construir filtro dinámico basado en parámetros de consulta
            const filter = {};
            // Soporte simple para filtrar por género o plataforma vía query string
            if (req.query.genero) filter.genero = { $in: [req.query.genero] };
            if (req.query.plataforma) filter.plataforma = { $in: [req.query.plataforma] };

            // Obtener lista de juegos con filtro aplicado
            const list = await juegosModelo.getAll(filter);
            return res.status(200).json({ success: true, data: list });
        } catch (error) {
            console.error('Error en getAll controller:', error);
            return res.status(500).json({ success: false, message: 'Error al obtener juegos', error: error.message });
        }
    }

    /**
     * Obtiene un juego específico por su ID
     * @route GET /api/juegos/:id
     * @param {Object} req - Objeto de petición Express
     * @param {string} req.params.id - ID del juego a buscar
     * @param {Object} res - Objeto de respuesta Express
     * @returns {Object} - Respuesta JSON con el juego encontrado o mensaje de error
     */
    // Obtener un juego por id
    async getOne(req, res) {
        try {
            const { id } = req.params;
            
            // Validar formato de ID antes de consultar la base de datos
            if (!id || id.length !== 24 || !/^[a-fA-F0-9]{24}$/.test(id)) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'ID de juego inválido. Debe ser un ObjectId de MongoDB válido (24 caracteres hexadecimales)',
                    receivedId: id
                });
            }
            
            // Buscar juego en la base de datos
            const game = await juegosModelo.getOne(id);
            if (!game) {
                // Juego no encontrado
                return res.status(404).json({ success: false, message: 'Juego no encontrado' });
            }
            // Juego encontrado exitosamente
            return res.status(200).json({ success: true, data: game });
        } catch (error) {
            console.error('Error en getOne controller:', error);
            return res.status(500).json({ success: false, message: 'Error al obtener el juego', error: error.message });
        }
    }

    /**
     * Actualiza parcialmente un juego existente
     * @route PUT /api/juegos/:id
     * @param {Object} req - Objeto de petición Express
     * @param {string} req.params.id - ID del juego a actualizar
     * @param {Object} req.body - Campos a actualizar del juego
     * @param {Object} res - Objeto de respuesta Express
     * @returns {Object} - Respuesta JSON con el juego actualizado o mensaje de error
     */
    // Actualizar un juego por id (parcialmente)
    async update(req, res) {
        try {
            const { id } = req.params;
            const body = req.body || {};
            
            // Actualizar juego en la base de datos
            const updated = await juegosModelo.update(id, body);
            
            if (!updated) {
                // Juego no encontrado para actualizar
                return res.status(404).json({ success: false, message: 'Juego no encontrado para actualizar' });
            }
            
            // Actualización exitosa
            return res.status(200).json({ success: true, data: updated, message: 'Juego actualizado' });
        } catch (error) {
            console.error('Error en update controller:', error);
            return res.status(500).json({ success: false, message: 'Error al actualizar el juego', error: error.message });
        }
    }

    /**
     * Elimina un juego de la base de datos
     * @route DELETE /api/juegos/:id
     * @param {Object} req - Objeto de petición Express
     * @param {string} req.params.id - ID del juego a eliminar
     * @param {Object} res - Objeto de respuesta Express
     * @returns {Object} - Respuesta JSON confirmando eliminación o mensaje de error
     */
    // Eliminar un juego por id
    async delete(req, res) {
        try {
            const { id } = req.params;
            
            // Eliminar juego de la base de datos
            const ok = await juegosModelo.delete(id);
            
            if (!ok) {
                // Juego no encontrado para eliminar
                return res.status(404).json({ success: false, message: 'Juego no encontrado para eliminar' });
            }
            
            // Eliminación exitosa
            return res.status(200).json({ success: true, message: 'Juego eliminado' });
        } catch (error) {
            console.error('Error en delete controller:', error);
            return res.status(500).json({ success: false, message: 'Error al eliminar el juego', error: error.message });
        }
    }

    /**
     * Agrega una nueva reseña a un juego específico
     * @route POST /api/juegos/:id/reseñas
     * @param {Object} req - Objeto de petición Express
     * @param {string} req.params.id - ID del juego al que se añadirá la reseña
     * @param {Object} req.body - Datos de la reseña
     * @param {string} req.body.nombreUsuario - Nombre del usuario (obligatorio)
     * @param {string} req.body.textoReseña - Texto de la reseña (obligatorio)
     * @param {number} req.body.calificaciones - Calificación de 0 a 5 (opcional)
     * @param {number} req.body.horasJugadas - Horas jugadas (opcional)
     * @param {string} req.body.dificultad - Dificultad percibida (opcional)
     * @param {boolean} req.body.recomendaria - Si lo recomendaría (opcional)
     * @param {Object} res - Objeto de respuesta Express
     * @returns {Object} - Respuesta JSON con la reseña creada o mensaje de error
     */
    // Agregar una reseña a un juego
    async addReseña(req, res) {
        try {
            const { id } = req.params;
            const body = req.body || {};
            
            // Validaciones básicas de campos obligatorios
            // Validar que el nombre de usuario no esté vacío
            if (!body.nombreUsuario) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'El campo "nombreUsuario" es obligatorio'
                });
            }
            
            // Validar que el texto de la reseña no esté vacío
            if (!body.textoReseña) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'El campo "textoReseña" es obligatorio'
                });
            }

            // Validar rango de calificación si se proporciona
            if (body.calificaciones !== undefined) {
                const rating = Number(body.calificaciones);
                if (isNaN(rating) || rating < 0 || rating > 5) {
                    return res.status(400).json({
                        success: false,
                        message: 'La calificación debe ser un número entre 0 y 5'
                    });
                }
            }
            
            // Crear reseña en la base de datos
            const reseña = await juegosModelo.addReseña(id, body);
            return res.status(201).json({ 
                success: true, 
                data: reseña, 
                message: 'Reseña agregada exitosamente' 
            });
        } catch (error) {
            console.error('Error en addReseña controller:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Error al agregar la reseña', 
                error: error.message 
            });
        }
    }

    /**
     * Obtiene todas las reseñas de un juego específico
     * @route GET /api/juegos/:id/reseñas
     * @param {Object} req - Objeto de petición Express
     * @param {string} req.params.id - ID del juego del que se obtendrán las reseñas
     * @param {Object} res - Objeto de respuesta Express
     * @returns {Object} - Respuesta JSON con lista de reseñas o mensaje de error
     */
    // Obtener todas las reseñas de un juego
    async getReseñas(req, res) {
        try {
            const { id } = req.params;
            
            // Obtener todas las reseñas del juego
            const reseñas = await juegosModelo.getReseñas(id);
            return res.status(200).json({ success: true, data: reseñas });
        } catch (error) {
            console.error('Error en getReseñas controller:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Error al obtener las reseñas', 
                error: error.message 
            });
        }
    }
}

// Exportar una instancia única del controlador (patrón Singleton)
export default new juegosController();
