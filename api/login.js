export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { username, password } = req.body || {};

  const expectedUser = process.env.SITE_USERNAME || "sandman";
  const expectedPass = process.env.SITE_PASSWORD || "";
  const authToken = process.env.SITE_AUTH_TOKEN || "";

  if (!expectedPass || !authToken) {
    return res.status(500).json({ error: "Login is not configured on the server." });
  }

  if (username === expectedUser && password === expectedPass) {
    return res.status(200).json({ token: authToken });
  }

  return res.status(401).json({ error: "Invalid username or password." });
}
