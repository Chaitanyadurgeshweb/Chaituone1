import { Router } from "express";
import healthRouter from "./health.js";
import nmsRouter from "./nms.js";

const router = Router();

router.use(healthRouter);
router.use(nmsRouter);

export default router;
