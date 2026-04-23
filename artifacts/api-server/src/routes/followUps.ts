import { Router } from "express";
import { requireAuth, getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { connectionsTable, followUpsTable } from "@workspace/db";
import { eq, and, isNull, isNotNull, lt } from "drizzle-orm";
import {
  CreateFollowUpBody,
  GetFollowUpParams,
  UpdateFollowUpParams,
  UpdateFollowUpBody,
  DeleteFollowUpParams,
  CompleteFollowUpParams,
  ListFollowUpsQueryParams,
} from "@workspace/api-zod";

const router = Router();

router.use(requireAuth());

async function withConnection(followUp: typeof followUpsTable.$inferSelect) {
  const [connection] = await db
    .select()
    .from(connectionsTable)
    .where(eq(connectionsTable.id, followUp.connectionId));
  return { ...followUp, connection };
}

async function withConnections(followUpList: (typeof followUpsTable.$inferSelect)[]) {
  return Promise.all(followUpList.map(withConnection));
}

router.get("/follow-ups", async (req, res) => {
  try {
    const userId = getAuth(req).userId!;
    const parsed = ListFollowUpsQueryParams.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid query params" });
    }
    const { connectionId, status } = parsed.data;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const conditions = [eq(followUpsTable.userId, userId)];
    if (connectionId !== undefined) {
      conditions.push(eq(followUpsTable.connectionId, connectionId));
    }
    if (status === "completed") {
      conditions.push(isNotNull(followUpsTable.completedAt));
    } else if (status === "pending") {
      conditions.push(isNull(followUpsTable.completedAt));
    } else if (status === "overdue") {
      conditions.push(isNull(followUpsTable.completedAt));
      conditions.push(lt(followUpsTable.scheduledDate, todayStart));
    }

    const rows = await db
      .select()
      .from(followUpsTable)
      .where(and(...conditions))
      .orderBy(followUpsTable.scheduledDate);

    return res.json(await withConnections(rows));
  } catch (err) {
    req.log.error({ err }, "listFollowUps failed");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/follow-ups", async (req, res) => {
  try {
    const userId = getAuth(req).userId!;
    const parsed = CreateFollowUpBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request body" });
    }
    const { connectionId, scheduledDate } = parsed.data;

    const [conn] = await db
      .select()
      .from(connectionsTable)
      .where(and(eq(connectionsTable.id, connectionId), eq(connectionsTable.userId, userId)));
    if (!conn) {
      return res.status(400).json({ error: "Connection not found or does not belong to user" });
    }

    const due = new Date(scheduledDate);
    const [followUp] = await db
      .insert(followUpsTable)
      .values({ connectionId, userId, scheduledDate: due, originalDueDate: due })
      .returning();

    return res.status(201).json(await withConnection(followUp));
  } catch (err) {
    req.log.error({ err }, "createFollowUp failed");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/follow-ups/:id", async (req, res) => {
  try {
    const userId = getAuth(req).userId!;
    const parsed = GetFollowUpParams.safeParse({ id: Number(req.params.id) });
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid id" });
    }
    const { id } = parsed.data;
    const [followUp] = await db
      .select()
      .from(followUpsTable)
      .where(and(eq(followUpsTable.id, id), eq(followUpsTable.userId, userId)));

    if (!followUp) {
      return res.status(404).json({ error: "Not found" });
    }
    return res.json(await withConnection(followUp));
  } catch (err) {
    req.log.error({ err }, "getFollowUp failed");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/follow-ups/:id", async (req, res) => {
  try {
    const userId = getAuth(req).userId!;
    const paramsParsed = UpdateFollowUpParams.safeParse({ id: Number(req.params.id) });
    if (!paramsParsed.success) {
      return res.status(400).json({ error: "Invalid id" });
    }
    const { id } = paramsParsed.data;
    const bodyParsed = UpdateFollowUpBody.safeParse(req.body);
    if (!bodyParsed.success) {
      return res.status(400).json({ error: "Invalid request body" });
    }

    const updates: Record<string, unknown> = {};
    if (bodyParsed.data.scheduledDate !== undefined) {
      updates.scheduledDate = new Date(bodyParsed.data.scheduledDate);
    }

    const [followUp] = await db
      .update(followUpsTable)
      .set(updates)
      .where(and(eq(followUpsTable.id, id), eq(followUpsTable.userId, userId)))
      .returning();

    if (!followUp) {
      return res.status(404).json({ error: "Not found" });
    }
    return res.json(await withConnection(followUp));
  } catch (err) {
    req.log.error({ err }, "updateFollowUp failed");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/follow-ups/:id", async (req, res) => {
  try {
    const userId = getAuth(req).userId!;
    const parsed = DeleteFollowUpParams.safeParse({ id: Number(req.params.id) });
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid id" });
    }
    const { id } = parsed.data;
    const deleted = await db
      .delete(followUpsTable)
      .where(and(eq(followUpsTable.id, id), eq(followUpsTable.userId, userId)))
      .returning();

    if (!deleted.length) {
      return res.status(404).json({ error: "Not found" });
    }
    return res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "deleteFollowUp failed");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/follow-ups/:id/complete", async (req, res) => {
  try {
    const userId = getAuth(req).userId!;
    const parsed = CompleteFollowUpParams.safeParse({ id: Number(req.params.id) });
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid id" });
    }
    const { id } = parsed.data;
    const [followUp] = await db
      .update(followUpsTable)
      .set({ completedAt: new Date() })
      .where(and(eq(followUpsTable.id, id), eq(followUpsTable.userId, userId)))
      .returning();

    if (!followUp) {
      return res.status(404).json({ error: "Not found" });
    }
    return res.json(await withConnection(followUp));
  } catch (err) {
    req.log.error({ err }, "completeFollowUp failed");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
