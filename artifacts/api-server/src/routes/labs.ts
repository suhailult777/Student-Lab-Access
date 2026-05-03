import { Router, type IRouter } from "express";
import { db, labsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { GetLabsResponse, GetLabResponse, GetLabParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/labs", async (_req, res): Promise<void> => {
  const labs = await db.select().from(labsTable).where(eq(labsTable.isActive, true));
  res.json(GetLabsResponse.parse(labs));
});

router.get("/labs/:id", async (req, res): Promise<void> => {
  const params = GetLabParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [lab] = await db.select().from(labsTable).where(eq(labsTable.id, params.data.id));
  if (!lab) {
    res.status(404).json({ error: "Lab not found" });
    return;
  }
  res.json(GetLabResponse.parse(lab));
});

export default router;
