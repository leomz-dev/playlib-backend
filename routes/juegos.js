import express from "express";

const route = express.Router();

import JuegosController from "../controllers/juegosController.js";

route.get("/", JuegosController.getAll);
route.get("/:id", JuegosController.getOne);
route.post("/", JuegosController.create);
route.put("/:id", JuegosController.update);
route.delete("/:id", JuegosController.delete);

export default route;
