import { Router, type IRouter } from "express";
import healthRouter from "./health";
import casesRouter from "./cases";
import evidenceRouter from "./evidence";
import timelineRouter from "./timeline";
import yaraRouter from "./yara";
import searchRouter from "./search";
import statsRouter from "./stats";
import reportsRouter from "./reports";

const router: IRouter = Router();

router.use(healthRouter);
router.use(statsRouter);
router.use(casesRouter);
router.use(evidenceRouter);
router.use(timelineRouter);
router.use(yaraRouter);
router.use(searchRouter);
router.use(reportsRouter);

export default router;
