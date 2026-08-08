const PROMPT = `
You extract data from Sandman Services LOAD AND TIME TICKET images.

Return ONLY valid JSON in this exact shape:
{
  "tickets": [
    {
      "Date": "",
      "Ticket #": "",
      "Shipper": "",
      "Customer": "",
      "Job #": "",
      "From": "",
      "Location": "",
      "Truck #": "",
      "Pit/Dump Vendor": "",
      "Pit Ticket #": "",
      "Driver": "",
      "Time Start": "",
      "Time Quit": "",
      "Time Type": "",
      "Material Type": "",
      "Quantity": ""
    }
  ]
}

Rules:
1. Date = DATE field.
2. Ticket # = PRO NUMBER.
3. Shipper = SHIPPER. If blank or unreadable, use "Sandman".
4. Customer = CUSTOMER NAME.
5. Job # = JOB#.
6. From = FROM.
7. Location = LOCATION.
8. Truck # = TRUCK NO.
9. Pit/Dump Vendor = vendor/pit/dump company explicitly shown on the ticket. If none is shown, use "Sandman".
10. Pit Ticket # = PIT TICKET NUMBER. If none, return "".
11. Driver = handwritten or printed driver name in/near DRIVER'S SIGNATURE. Ignore an X/check mark.
12. Time Start = START time if filled.
13. Time Quit = QUIT time if filled.
14. Time Type = "Demurrage" if either Time Start or Time Quit is present; otherwise "".
15. Material Type = DESCRIPTION OF COMMODITY.
16. Quantity = NET TONS OR YARDS. Keep numeric value only when possible.
17. Never invent values other than the allowed defaults.
18. Preserve leading zeros in Truck # and Pit Ticket #.
19. One ticket image = one ticket object.
`;

function extractText(data) {
  if (data.output_text) return data.output_text;
  const chunks = [];
  for (const item of (data.output || [])) {
    for (const c of (item.content || [])) {
      if (typeof c.text === "string") chunks.push(c.text);
    }
  }
  return chunks.join("\n");
}

function parseJson(text) {
  let t = String(text || "").trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/, "")
    .replace(/\s*```$/, "");
  const a = t.indexOf("{");
  const b = t.lastIndexOf("}");
  if (a >= 0 && b > a) t = t.slice(a, b + 1);
  return JSON.parse(t);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }


  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const expectedToken = process.env.SITE_AUTH_TOKEN || "";

  if (!expectedToken || token !== expectedToken) {
    return res.status(401).json({ error: "Unauthorized. Please sign in again." });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY is not configured on the server." });
  }

  const image = req.body?.image;
  if (!image || typeof image !== "string" || !image.startsWith("data:image/")) {
    return res.status(400).json({ error: "A ticket image is required." });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5-mini",
        input: [{
          role: "user",
          content: [
            { type: "input_text", text: PROMPT },
            { type: "input_image", image_url: image }
          ]
        }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "OpenAI request failed."
      });
    }

    const parsed = parseJson(extractText(data));
    return res.status(200).json({ tickets: parsed.tickets || [] });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Extraction failed." });
  }
}
