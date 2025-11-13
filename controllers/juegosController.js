import juegosModelo from "../models/Juegos.js";

class juegosController {
    constructor() {}

    // Crear un nuevo juego
    async create(req, res) {
        try {
            console.log('Received create request with body:', JSON.stringify(req.body, null, 2));
            const body = req.body || {};

            // Validaciones básicas
            if (!body.titulo) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'El campo "título" es obligatorio',
                    field: 'titulo',
                    receivedData: body
                });
            }
            
            if (!body.genero) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'El campo "género" es obligatorio',
                    field: 'genero',
                    receivedData: body
                });
            }

            // Validar tipos de datos
            if (body.añoLanzamiento && isNaN(Number(body.añoLanzamiento))) {
                return res.status(400).json({
                    success: false,
                    message: 'El año de lanzamiento debe ser un número válido',
                    field: 'añoLanzamiento'
                });
            }

            // Asegurar que el año de lanzamiento sea un número entero
            if (body.añoLanzamiento) {
                body.añoLanzamiento = parseInt(body.añoLanzamiento, 10);
            }

            console.log('Creating game with data:', JSON.stringify(body, null, 2));
            const created = await juegosModelo.create(body);
            console.log('Game created successfully:', created._id);
            
            return res.status(201).json({ 
                success: true, 
                data: created, 
                message: 'Juego creado exitosamente' 
            });
            
        } catch (error) {
            console.error('Error en create controller:', error);
            
            // Manejar errores de validación de MongoDB
            if (error.name === 'ValidationError') {
                const messages = Object.values(error.errors).map(val => val.message);
                return res.status(400).json({
                    success: false,
                    message: 'Error de validación',
                    errors: messages,
                    error: error.message
                });
            }
            
            // Manejar errores de duplicado
            if (error.code === 11000) {
                return res.status(400).json({
                    success: false,
                    message: 'Ya existe un juego con este título',
                    error: error.message
                });
            }
            
            // Otros errores
            return res.status(500).json({ 
                success: false, 
                message: 'Error al crear el juego', 
                error: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    }

    // Obtener todos los juegos (opcionalmente filtrar por query)
    async getAll(req, res) {
        try {
            const filter = {};
            // Soporte simple para filtrar por genero o plataforma vía query string
            if (req.query.genero) filter.genero = req.query.genero;
            if (req.query.plataforma) filter.plataforma = req.query.plataforma;

            const list = await juegosModelo.getAll(filter);
            return res.status(200).json({ success: true, data: list });
        } catch (error) {
            console.error('Error en getAll controller:', error);
            return res.status(500).json({ success: false, message: 'Error al obtener juegos', error: error.message });
        }
    }

    // Obtener un juego por id
    async getOne(req, res) {
        try {
            const { id } = req.params;
            const game = await juegosModelo.getOne(id);
            if (!game) return res.status(404).json({ success: false, message: 'Juego no encontrado' });
            return res.status(200).json({ success: true, data: game });
        } catch (error) {
            console.error('Error en getOne controller:', error);
            return res.status(500).json({ success: false, message: 'Error al obtener el juego', error: error.message });
        }
    }

    // Actualizar un juego por id (parcialmente)
    async update(req, res) {
        try {
            const { id } = req.params;
            const body = req.body || {};
            const updated = await juegosModelo.update(id, body);
            // console.log('Update result:', updated);
            if (!updated) return res.status(404).json({ success: false, message: 'Juego no encontrado para actualizar' });
            return res.status(200).json({ success: true, data: updated, message: 'Juego actualizado' });
        } catch (error) {
            console.error('Error en update controller:', error);
            return res.status(500).json({ success: false, message: 'Error al actualizar el juego', error: error.message });
        }
    }

    // Eliminar un juego por id
    async delete(req, res) {
        try {
            const { id } = req.params;
            const ok = await juegosModelo.delete(id);
            if (!ok) return res.status(404).json({ success: false, message: 'Juego no encontrado para eliminar' });
            return res.status(200).json({ success: true, message: 'Juego eliminado' });
        } catch (error) {
            console.error('Error en delete controller:', error);
            return res.status(500).json({ success: false, message: 'Error al eliminar el juego', error: error.message });
        }
    }
}

export default new juegosController();