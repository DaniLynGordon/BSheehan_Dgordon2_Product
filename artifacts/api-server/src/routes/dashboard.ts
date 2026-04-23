import { Router } from "express";
import { requireAuth, getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { connectionsTable, followUpsTable } from "@workspace/db";
import { eq, and, isNull, isNotNull } from "drizzle-orm";

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

router.get("/dashboard/summary", async (req, res) => {
  try {
    const userId = getAuth(req).userId!;
    const now = new Date();

    // Strict day boundaries
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    const weekEnd = new Date(todayStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    // Reminder window: items due within 5 days that were originally scheduled 30+ days out
    const reminderWindowEnd = new Date(todayStart);
    reminderWindowEnd.setDate(reminderWindowEnd.getDate() + 5);
    const longTermThreshold = new Date(now);
    longTermThreshold.setDate(longTermThreshold.getDate() - 25); // scheduled at least 25 days ago to have been 30+ days out

    const allPending = await db
      .select()
      .from(followUpsTable)
      .where(and(eq(followUpsTable.userId, userId), isNull(followUpsTable.completedAt)));

    // Overdue = before today (strictly before start of today)
    const overdueList = allPending.filter((f) => f.scheduledDate < todayStart);

    // Today = due today
    const todayList = allPending.filter(
      (f) => f.scheduledDate >= todayStart && f.scheduledDate <= todayEnd,
    );

    // Upcoming = after today
    const upcomingList = allPending.filter((f) => f.scheduledDate > todayEnd);

    // This week = today + next 7 days (includes today)
    const weekList = allPending.filter(
      (f) => f.scheduledDate >= todayStart && f.scheduledDate <= weekEnd,
    );

    // Reminder: items due in next 5 days whose originalDueDate was 30+ days from creation
    // We approximate: originalDueDate is the same as scheduledDate when first created,
    // so check if time span from creation to originalDueDate was >= 30 days
    const reminderList = allPending.filter((f) => {
      const dueInWindow =
        f.scheduledDate >= todayStart && f.scheduledDate <= reminderWindowEnd;
      if (!dueInWindow) return false;
      const daysBetweenCreatedAndDue =
        (f.originalDueDate.getTime() - f.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      return daysBetweenCreatedAndDue >= 30;
    });

    const [overdueFollowUps, upcomingFollowUps, weekFollowUps, todayFollowUps, reminderFollowUps] =
      await Promise.all([
        withConnections(overdueList),
        withConnections(upcomingList.slice(0, 10)),
        withConnections(weekList),
        withConnections(todayList),
        withConnections(reminderList),
      ]);

    return res.json({
      todayCount: todayList.length,
      upcomingCount: upcomingList.length,
      overdueCount: overdueList.length,
      weekFollowUps,
      overdueFollowUps,
      upcomingFollowUps,
      todayFollowUps,
      reminderFollowUps,
    });
  } catch (err) {
    req.log.error({ err }, "getDashboardSummary failed");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/progress", async (req, res) => {
  try {
    const userId = getAuth(req).userId!;

    const allFollowUps = await db
      .select()
      .from(followUpsTable)
      .where(eq(followUpsTable.userId, userId));

    const totalScheduled = allFollowUps.length;
    const completed = allFollowUps.filter((f) => f.completedAt !== null);
    const totalCompleted = completed.length;

    const onTimeList = completed.filter(
      (f) => f.completedAt !== null && f.completedAt <= f.originalDueDate,
    );
    const onTimeCount = onTimeList.length;

    // Follow-through rate = on-time completions / total scheduled (the core metric)
    const followThroughRate =
      totalScheduled > 0 ? Math.round((onTimeCount / totalScheduled) * 100) : 0;

    // Completion rate = total completed / total scheduled
    const completionRate =
      totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0;

    const completedFollowUps = await withConnections(
      completed.sort(
        (a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0),
      ),
    );

    return res.json({
      totalScheduled,
      totalCompleted,
      onTimeCount,
      followThroughRate,
      completionRate,
      completedFollowUps,
    });
  } catch (err) {
    req.log.error({ err }, "getProgressStats failed");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
