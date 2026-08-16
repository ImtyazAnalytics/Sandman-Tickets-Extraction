export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Reuse the same website login token protection.
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const expectedToken = process.env.SITE_AUTH_TOKEN || "";

  if (!expectedToken || token !== expectedToken) {
    return res.status(401).json({ error: "Unauthorized. Please sign in again." });
  }

  const webAppUrl = process.env.GOOGLE_SHEETS_WEBAPP_URL || "";
  const sheetsSecret = process.env.GOOGLE_SHEETS_SECRET || "";

  if (!webAppUrl || !sheetsSecret) {
    return res.status(500).json({
      error: "Google Sheets is not configured on the server."
    });
  }

  const tickets = req.body?.tickets;
  if (!Array.isArray(tickets) || !tickets.length) {
    return res.status(400).json({ error: "No ticket rows were provided." });
  }

  try {
    const response = await fetch(webAppUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify({
        secret: sheetsSecret,
        tickets
      }),
      redirect: "follow"
    });

    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("Google Apps Script returned an invalid response.");
    }

    if (!response.ok || data.ok === false) {
      throw new Error(data.error || "Google Sheets request failed.");
    }

    return res.status(200).json({
      ok: true,
      added: Number(data.added || 0),
      duplicates: Number(data.duplicates || 0)
    });
  } catch (err) {
    console.error("Google Sheets submit error:", err);
    return res.status(500).json({
      error: err.message || "Could not save to Google Sheets."
    });
  }
}
