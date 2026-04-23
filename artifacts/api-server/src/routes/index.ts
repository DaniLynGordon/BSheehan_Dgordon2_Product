import { Router, type IRouter } from "express";
import healthRouter from "./health";
import connectionsRouter from "./connections";
import followUpsRouter from "./followUps";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(connectionsRouter);
router.use(followUpsRouter);
router.use(dashboardRouter);

export default router;
