import { Router, type IRouter } from "express";
import { db, modulesTable, moduleProgressTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/labs/:labId/modules", async (req, res): Promise<void> => {
  const labId = parseInt(req.params.labId, 10);
  if (isNaN(labId)) { res.status(400).json({ error: "Invalid labId" }); return; }

  const mods = await db
    .select({
      id: modulesTable.id,
      labId: modulesTable.labId,
      title: modulesTable.title,
      description: modulesTable.description,
      type: modulesTable.type,
      orderIndex: modulesTable.orderIndex,
      xp: modulesTable.xp,
    })
    .from(modulesTable)
    .where(and(eq(modulesTable.labId, labId), eq(modulesTable.isActive, true)))
    .orderBy(modulesTable.orderIndex);

  res.json(mods);
});

router.get("/modules/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [mod] = await db.select().from(modulesTable).where(eq(modulesTable.id, id));
  if (!mod) { res.status(404).json({ error: "Module not found" }); return; }

  res.json(mod);
});

router.get("/labs/:labId/progress", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const labId = parseInt(req.params.labId as string, 10);
  if (isNaN(labId)) { res.status(400).json({ error: "Invalid labId" }); return; }

  const mods = await db
    .select({ id: modulesTable.id })
    .from(modulesTable)
    .where(and(eq(modulesTable.labId, labId), eq(modulesTable.isActive, true)));

  const moduleIds = mods.map((m) => m.id);
  if (moduleIds.length === 0) { res.json([]); return; }

  const progress = await db
    .select()
    .from(moduleProgressTable)
    .where(eq(moduleProgressTable.userId, userId));

  res.json(progress.filter((p) => moduleIds.includes(p.moduleId)));
});

router.post("/modules/:id/submit", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [mod] = await db.select().from(modulesTable).where(eq(modulesTable.id, id));
  if (!mod) { res.status(404).json({ error: "Module not found" }); return; }

  const { answer, commandsCompleted } = req.body;
  const content = mod.content as any;

  let correct = false;
  let score = 0;
  let explanation = "";

  if (mod.type === "quiz") {
    const answers: number[] = answer;
    const questions = content.questions;
    let correct_count = 0;
    questions.forEach((q: any, i: number) => {
      if (answers[i] === q.correctIndex) correct_count++;
    });
    score = Math.round((correct_count / questions.length) * 100);
    correct = score >= 60;
    explanation = `You answered ${correct_count} of ${questions.length} correctly.`;
  } else if (mod.type === "terminal") {
    const required = content.steps.filter((s: any) => s.required).length;
    const done = Math.min(commandsCompleted || 0, required);
    score = Math.round((done / required) * 100);
    correct = score === 100;
    explanation = correct ? content.completionMessage : `Completed ${done} of ${required} required commands.`;
  } else if (mod.type === "flag") {
    correct = (answer || "").trim().toLowerCase() === content.flag.toLowerCase();
    score = correct ? 100 : 0;
    explanation = correct ? "Correct flag! Well done." : "Incorrect flag. Check your hints.";
  } else if (mod.type === "code") {
    correct = parseInt(answer, 10) === content.correctIndex;
    score = correct ? 100 : 0;
    explanation = correct ? content.explanation : "Incorrect. Review the code carefully.";
  }

  const existing = await db
    .select()
    .from(moduleProgressTable)
    .where(and(eq(moduleProgressTable.userId, userId), eq(moduleProgressTable.moduleId, id)));

  if (existing.length > 0) {
    const best = Math.max(existing[0].score ?? 0, score);
    await db
      .update(moduleProgressTable)
      .set({
        status: correct ? "completed" : "in_progress",
        score: best,
        attempts: existing[0].attempts + 1,
        completedAt: correct ? new Date() : existing[0].completedAt,
      })
      .where(and(eq(moduleProgressTable.userId, userId), eq(moduleProgressTable.moduleId, id)));
  } else {
    await db.insert(moduleProgressTable).values({
      userId,
      moduleId: id,
      status: correct ? "completed" : "in_progress",
      score,
      attempts: 1,
      completedAt: correct ? new Date() : null,
    });
  }

  res.json({ correct, score, explanation, xp: correct ? mod.xp : 0 });
});

export default router;
