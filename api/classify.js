const PROJECTS = [
  "Hamilton Yard",
  "WS-742",
  "WS-725",
  "WS-743",
  "1316",
  "GLWA Plant Copeland St",
  "DWS-977",
  "DWS-969",
  "LG-23-MUPO"
];

const PROMPT = `
Read this trucking ticket page and identify the JOB#/project number.

Approved project/job values:
${PROJECTS.join(", ")}

Return ONLY JSON:
{
  "project": "",
  "recognized": false
}

Rules:
- Read JOB# first. Project number means the JOB#/project on the ticket.
- If the handwriting is a close match to one approved value, return the exact approved value and recognized=true.
- Be strict with numbers. Do not change one numeric project into another just because it is similar.
- If there is no project number, it is unreadable, or it does not match the approved list, project="" and recognized=false.
- Pit tickets or pages that do not belong to one approved project must be recognized=false.
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
    .replace(/^```json\s*/i,"")
    .replace(/^```\s*/,"")
    .replace(/\s*```$/,"");
  const a=t.indexOf("{"), b=t.lastIndexOf("}");
  if(a>=0 && b>a) t=t.slice(a,b+1);
  return JSON.parse(t);
}

export default async function handler(req,res){
  if(req.method !== "POST"){
    res.setHeader("Allow","POST");
    return res.status(405).json({error:"Method not allowed"});
  }

  const auth=req.headers.authorization || "";
  const token=auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const expectedToken=process.env.SITE_AUTH_TOKEN || "";
  if(!expectedToken || token !== expectedToken){
    return res.status(401).json({error:"Unauthorized. Please sign in again."});
  }

  if(!process.env.OPENAI_API_KEY){
    return res.status(500).json({error:"OPENAI_API_KEY is not configured on the server."});
  }

  const image=req.body?.image;
  if(!image || typeof image !== "string" || !image.startsWith("data:image/")){
    return res.status(400).json({error:"A ticket page image is required."});
  }

  try{
    const response=await fetch("https://api.openai.com/v1/responses",{
      method:"POST",
      headers:{
        "Authorization":`Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        model:process.env.OPENAI_MODEL || "gpt-5-mini",
        input:[{
          role:"user",
          content:[
            {type:"input_text",text:PROMPT},
            {type:"input_image",image_url:image}
          ]
        }]
      })
    });

    const data=await response.json();
    if(!response.ok){
      return res.status(response.status).json({
        error:data?.error?.message || "OpenAI project detection failed."
      });
    }

    const parsed=parseJson(extractText(data));
    const project=String(parsed.project || "").trim();
    const recognized=Boolean(parsed.recognized) && PROJECTS.includes(project);

    return res.status(200).json({
      project:recognized ? project : "",
      recognized
    });
  }catch(err){
    return res.status(500).json({error:err.message || "Project detection failed."});
  }
}
