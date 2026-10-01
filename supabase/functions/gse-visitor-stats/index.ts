// Only anonymous browser identifiers are accepted; no calculator inputs are sent.
const origin = 'https://leefoxai.github.io';
const headers = {'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store','Content-Type':'application/json','Vary':'Origin'};
const reply = (body, status=200) => new Response(JSON.stringify(body),{status,headers});
Deno.serve(async req => {
 if(req.headers.get('origin') !== origin) return reply({error:'origin'},403);
 if(req.method === 'OPTIONS') return new Response(null,{status:204,headers});
 if(req.method !== 'POST') return reply({error:'method'},405);
 try {
  const keys = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') || '{}');
  const allowed = keys.default;
  if(!allowed || req.headers.get('apikey') !== allowed) return reply({error:'unauthorized'},401);
  const raw = await req.text();
  if(raw.length > 256) return reply({error:'body'},413);
  let body;
  try { body=JSON.parse(raw); } catch { return reply({error:'json'},400); }
  const id=body?.visitor_id;
  if(id !== null && (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))) return reply({error:'visitor'},400);
  let hash=null;
  if(id) hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('gse-degree-planner:'+id.toLowerCase()))),b=>b.toString(16).padStart(2,'0')).join('');
  const secret=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}').default;
  if(!secret) return reply({error:'configuration'},503);
  const result=await fetch(Deno.env.get('SUPABASE_URL')+'/rest/v1/rpc/gse_record_visit',{
   method:'POST',headers:{apikey:secret,'Content-Type':'application/json'},
   body:JSON.stringify({p_visitor_hash:hash}),signal:AbortSignal.timeout(5000)
  });
  if(!result.ok) return reply({error:'database'},503);
  return reply(await result.json());
 } catch { return reply({error:'unavailable'},503); }
});

