import { Router } from "express";
import { requireAuth, getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { connectionsTable, followUpsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  CreateConnectionBody,
  GetConnectionParams,
  UpdateConnectionParams,
  UpdateConnectionBody,
  DeleteConnectionParams,
} from "@workspace/api-zod";

const router = Router();

router.use(requireAuth());

router.get("/connections", async (req, res) => {
  try {
    const userId = getAuth(req).userId!;
    const connections = await db
      .select()
      .from(connectionsTable)
      .where(eq(connectionsTable.userId, userId))
      .orderBy(connectionsTable.createdAt);
    return res.json(connections);
  } catch (err) {
    req.log.error({ err }, "listConnections failed");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/connections", async (req, res) => {
  try {
    const userId = getAuth(req).userId!;
    const parsed = CreateConnectionBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request body" });
    }
    const { name, notes, followUpDate } = parsed.data;

    const [connection] = await db
      .insert(connectionsTable)
      .values({ userId, name, notes: notes ?? null })
      .returning();

    if (followUpDate) {
      const due = new Date(followUpDate);
      await db.insert(followUpsTable).values({
        connectionId: connection.id,
        userId,
        scheduledDate: due,
        originalDueDate: due,
      });
    }

    return res.status(201).json(connection);
  } catch (err) {
    req.log.error({ err }, "createConnection failed");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/connections/:id", async (req, res) => {
  try {
    const userId = getAuth(req).userId!;
    const parsed = GetConnectionParams.safeParse({ id: Number(req.params.id) });
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid id" });
    }
    const { id } = parsed.data;
    const [connection] = await db
      .select()
      .from(connectionsTable)
      .where(and(eq(connectionsTable.id, id), eq(connectionsTable.userId, userId)));

    if (!connection) {
      return res.status(404).json({ error: "Not found" });
    }
    return res.json(connection);
  } catch (err) {
    req.log.error({ err }, "getConnection failed");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/connections/:id", async (req, res) => {
  try {
    const userId = getAuth(req).userId!;
    const paramsParsed = UpdateConnectionParams.safeParse({ id: Number(req.params.id) });
    if (!paramsParsed.success) {
      return res.status(400).json({ error: "Invalid id" });
    }
    const { id } = paramsParsed.data;
    const bodyParsed = UpdateConnectionBody.safeParse(req.body);
    if (!bodyParsed.success) {
      return res.status(400).json({ error: "Invalid request body" });
    }
    const updates: Record<string, unknown> = {};
    if (bodyParsed.data.name !== undefined) updates.name = bodyParsed.data.name;
    if (bodyParsed.data.notes !== undefined) updates.notes = bodyParsed.data.notes;

    const [connection] = await db
      .update(connectionsTable)
      .set(updates)
      .where(and(eq(connectionsTable.id, id), eq(connectionsTable.userId, userId)))
      .returning();

    if (!connection) {
      return res.status(404).json({ error: "Not found" });
    }
    return res.json(connection);
  } catch (err) {
    req.log.error({ err }, "updateConnection failed");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/connections/:id", async (req, res) => {
  try {
    const userId = getAuth(req).userId!;
    const parsed = DeleteConnectionParams.safeParse({ id: Number(req.params.id) });
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid id" });
    }
    const { id } = parsed.data;
    const deleted = await db
      .delete(connectionsTable)
      .where(and(eq(connectionsTable.id, id), eq(connectionsTable.userId, userId)))
      .returning();

    if (!deleted.length) {
      return res.status(404).json({ error: "Not found" });
    }
    return res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "deleteConnection failed");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
