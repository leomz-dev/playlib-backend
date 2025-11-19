import express from "express";

const route = express.Router();

import JuegosController from "../controllers/juegosController.js";

route.get("/", JuegosController.getAll);
route.get("/:id", JuegosController.getOne);
route.post("/", JuegosController.create);
route.put("/:id", JuegosController.update);
route.delete("/:id", JuegosController.delete);

// Rutas para reseñas
route.post("/:id/reviews", JuegosController.addReseña);
route.get("/:id/reviews", JuegosController.getReseñas);
// Mantener rutas antiguas por compatibilidad (deprecated)
route.post("/:id/reseñas", JuegosController.addReseña);
route.get("/:id/reseñas", JuegosController.getReseñas);

export default route;
