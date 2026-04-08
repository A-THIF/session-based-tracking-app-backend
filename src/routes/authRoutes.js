import express from "express";
import { generateToken } from "../controllers/authController.js";

const router = express.Router();

router.get("/", generateToken);

export default router;