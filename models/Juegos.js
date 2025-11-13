import dbClient from "../config/dbClient.js";
import { ObjectId } from 'mongodb';

class JuegosModelo {
    constructor() {
        this.colName = "games";
    }

    _col() {
        if (!dbClient.db) throw new Error('Database not initialized. Call connectarDB() first.');
        return dbClient.db.collection(this.colName);
    }

    async create(gameData) {
        try {    
            const col = this._col();
            const newGame = {
                titulo: gameData.titulo || "",
                genero: gameData.genero || "",
                plataforma: gameData.plataforma || "",
                añoLanzamiento: gameData.añoLanzamiento ? { $numberInt: String(gameData.añoLanzamiento) } : null,
                desarrollador: gameData.desarrollador || "",
                imagenPortada: gameData.imagenPortada || "",
                descripcion: gameData.descripcion || "",
                completado: gameData.completado || false,
                fechaCreacion: new Date().toISOString()
            };

            const result = await col.insertOne(newGame);
            return { ...newGame, _id: result.insertedId };
        } catch (error) {
            console.error('Error creating game:', error);
            throw error;
        }
    }

    async getAll(filter = {}) {
        try {
            const col = this._col();
            const cursor = col.find(filter).sort({ fechaCreacion: -1 });
            const results = await cursor.toArray();
            return results;
        } catch (error) {
            console.error('Error getting games:', error);
            throw error;
        }
    }

    async getOne(id) {
        try {
            const col = this._col();
            const _id = new ObjectId(id);
            const game = await col.findOne({ _id });
            return game;
        } catch (error) {
            console.error('Error getting game:', error);
            throw error;
        }
    }

    async update(id, updateData) {
        try {
            const col = this._col();
            const _id = new ObjectId(id);
            delete updateData._id; // Prevent changing the _id
            const updatePayload = { $set: { ...updateData } };
            // Prevent changing creation date
            if (updatePayload.$set.fechaCreacion) delete updatePayload.$set.fechaCreacion;
            const result = await col.findOneAndUpdate({ _id }, updatePayload, { returnDocument: 'after' });
            // console.log(result)
            return result;
        } catch (error) {
            console.error('Error updating game:', error);
            throw error;
        }
    }

    async delete(id) {
        try {
            const col = this._col();
            const _id = new ObjectId(id);
            const result = await col.deleteOne({ _id });
            return result.deletedCount === 1;
        } catch (error) {
            console.error('Error deleting game:', error);
            throw error;
        }
    }
}

export default new JuegosModelo();