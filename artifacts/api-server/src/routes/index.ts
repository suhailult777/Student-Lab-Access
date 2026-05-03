import { Router, type IRouter } from "express";
import healthRouter from "./health";
import labsRouter from "./labs";
import bookingsRouter from "./bookings";
import paymentsRouter from "./payments";

const router: IRouter = Router();

router.use(healthRouter);
router.use(labsRouter);
router.use(bookingsRouter);
router.use(paymentsRouter);

export default router;
