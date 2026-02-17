import { getDashboardPayload } from "../services/dashboardService.js";

export async function getDashboard(req, res) {
  try {
    const payload = await getDashboardPayload({
      authUserId: req.auth?.userId,
      authRole: req.auth?.role,
      queryAdminId: req.query.adminId,
    });

    return res.json(payload);
  } catch (error) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    console.error("[DASHBOARD] Erreur SQL:", error.message);
    return res.status(500).json({
      error: "Impossible de charger les donnees dashboard depuis MariaDB.",
      details: error.message,
    });
  }
}
