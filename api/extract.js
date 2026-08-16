const CANONICAL = {
  jobs: ["Hamilton Yard","WS-742","WS-725","WS-743","1316","GLWA Plant Copeland St","DWS-977","DWS-969","LG-23-MUPO"],
  trucks: ["1","104-AB","103-AB","104-BK","8","26","27","31","77","221","46","001-AB","009-AB","003-AB","006-AB","013-AB","0422-AB","015-AB","211-AB","07-AB","014-AB","05-AB","02-AB","08-AB","ABE","069-AR","90-Z","20","702-JD","02-SC","01-SC","00-SC","221-NT"],
  vendors: ["Customer Dumpsite","Sandman","WF Bulk","Ashley","Recycled A","Stoneco","Farmer C","Novi Crushed","Tri County Agg","I75 Aggregates","Koenig","Brumeister","Levy","ED Giraud","Michigan Gravel and Sand","Quest","Miller Bro","CB Asphalt","La Femina"],
  materials: ["1X3 Crushed Concrete","6A Limestone","Asphalt-Outbound","Class 2 Sand","Cobble Stone","Cold Patch","Concrete-Outbound","Dirt-Outbound","Dirt-Outbound- 1Way","MDOT 21AA Crushed Concrete","MDOT 21AA Limestone","MDOT 2NS Sand","Stoneco 1X3 Limestone","Top Soil","6A Crushed Concrete","Dirt-Outbound- 2Way","Dirt-Outbound Sandman Dump","Dirt-Outbound Bellville","Topsoil","Dirt Outbound Two Yard","Asphalt Outbound","Rap"]
};

const PROMPT = `
You extract data from Sandman Services LOAD AND TIME TICKET images.
Return ONLY valid JSON with a tickets array and these exact keys: Date, Ticket #, Shipper, Customer, Job #, From, Location, Truck #, Pit/Dump Vendor, Pit Ticket #, Driver, Time Start, Time Quit, Time Type, Material Type, Quantity.

Rules:
1. Date = DATE. Ticket # = PRO NUMBER. Customer = CUSTOMER NAME. Job # = JOB#. From = FROM. Location = LOCATION. Truck # = TRUCK NO.
2. Shipper = SHIPPER; if blank/unreadable use Sandman.
3. Pit/Dump Vendor = vendor/pit/dump company shown; if none use Sandman.
4. Pit Ticket # = PIT TICKET NUMBER; blank if none.
5. Driver = driver's printed/handwritten name, ignoring an X/check mark.
6. Time Start = START, Time Quit = QUIT. Time Type = Demurrage if either time is present; otherwise blank.
7. Material Type = DESCRIPTION OF COMMODITY. Quantity = NET TONS OR YARDS, numeric value when possible.
8. Preserve leading zeros in Truck # and Pit Ticket #. One ticket image = one ticket object.
9. If Customer looks like LGC, LGC Global, LGC Glob or a close handwriting variant, output LGC Global.
10. If FROM looks like EGT, set Shipper to ED Giraud.
11. Prefer these approved standard values when handwriting is a close match:
Jobs: ${CANONICAL.jobs.join(", ")}
Trucks: ${CANONICAL.trucks.join(", ")}
Vendors/Shippers: ${CANONICAL.vendors.join(", ")}
Materials: ${CANONICAL.materials.join(", ")}
12. For numeric/ID fields, do not guess to a different number unless the match is extremely close.
`;


function norm(v){return String(v||"").toLowerCase().replace(/&/g,"and").replace(/[^a-z0-9]/g,"");}
function lev(a,b){a=norm(a);b=norm(b);const m=a.length,n=b.length;if(!m)return n;if(!n)return m;const d=Array.from({length:m+1},()=>Array(n+1).fill(0));for(let i=0;i<=m;i++)d[i][0]=i;for(let j=0;j<=n;j++)d[0][j]=j;for(let i=1;i<=m;i++)for(let j=1;j<=n;j++){const c=a[i-1]===b[j-1]?0:1;d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+c);}return d[m][n];}
function sim(a,b){const aa=norm(a),bb=norm(b);if(!aa||!bb)return 0;if(aa===bb)return 1;if(aa.includes(bb)||bb.includes(aa)){const s=Math.min(aa.length,bb.length),l=Math.max(aa.length,bb.length);return .86+.14*(s/l);}return 1-lev(aa,bb)/Math.max(aa.length,bb.length);}
function best(value,list,threshold){const raw=String(value||"").trim();if(!raw)return raw;let winner=raw,score=0;for(const item of list){const s=sim(raw,item);if(s>score){score=s;winner=item;}}return score>=threshold?winner:raw;}
function standardizeTicket(t0){const t={...t0};const cn=norm(t["Customer"]);if(cn==="lgc"||cn.startsWith("lgcglobal")||sim(t["Customer"],"LGC Global")>=.66)t["Customer"]="LGC Global";
if(t["Job #"])t["Job #"]=best(t["Job #"],CANONICAL.jobs,/\d/.test(t["Job #"])?0.86:0.78);
if(t["Truck #"])t["Truck #"]=best(t["Truck #"],CANONICAL.trucks,0.91);
if(t["Shipper"])t["Shipper"]=best(t["Shipper"],CANONICAL.vendors,0.74);
if(t["Pit/Dump Vendor"])t["Pit/Dump Vendor"]=best(t["Pit/Dump Vendor"],CANONICAL.vendors,0.74);
if(sim(t["From"],"EGT")>=.72||norm(t["From"])==="egt")t["Shipper"]="ED Giraud";
if(t["Material Type"]){const aliases={classiisand:"Class 2 Sand",class2sand:"Class 2 Sand",classii:"Class 2 Sand",topsoil:"Topsoil",rap:"Rap",asphaltoutbound:"Asphalt Outbound"};const n=norm(t["Material Type"]);t["Material Type"]=aliases[n]||best(t["Material Type"],CANONICAL.materials,0.72);}
if(!String(t["Shipper"]||"").trim())t["Shipper"]="Sandman";if(!String(t["Pit/Dump Vendor"]||"").trim())t["Pit/Dump Vendor"]="Sandman";t["Time Type"]=(String(t["Time Start"]||"").trim()||String(t["Time Quit"]||"").trim())?"Demurrage":"";return t;}

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
    const tickets = (parsed.tickets || []).map(standardizeTicket);
    return res.status(200).json({ tickets });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Extraction failed." });
  }
}
