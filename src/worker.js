const json = (data, status=200) => new Response(JSON.stringify(data), {status, headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const now = () => Date.now();
const id = () => crypto.randomUUID();

async function hashPassword(password){
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:120000,hash:'SHA-256'},base,256);
  return `${b64(salt)}.${b64(new Uint8Array(bits))}`;
}
async function verifyPassword(password, stored){
  const [s,p] = stored.split('.'); if(!s||!p) return false;
  const salt=fromB64(s), expected=fromB64(p);
  const base=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
  const bits=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:120000,hash:'SHA-256'},base,256));
  if(bits.length!==expected.length) return false; let x=0; for(let i=0;i<bits.length;i++) x|=bits[i]^expected[i]; return x===0;
}
function b64(a){let s=''; for(const x of a)s+=String.fromCharCode(x); return btoa(s).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');}
function fromB64(s){s=s.replaceAll('-','+').replaceAll('_','/'); while(s.length%4)s+='='; const x=atob(s); return Uint8Array.from(x,c=>c.charCodeAt(0));}
function cookies(req){const c=req.headers.get('cookie')||''; return Object.fromEntries(c.split(';').map(x=>x.trim().split('=').map(decodeURIComponent)).filter(x=>x.length===2));}
async function auth(req,env){const sid=cookies(req).session; if(!sid)return null; const r=await env.DB.prepare('SELECT u.id,u.name,u.phone,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=? AND s.expires_at>?').bind(sid,now()).first(); return r||null;}
function setSessionCookie(sid){return `session=${encodeURIComponent(sid)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`}

async function routes(req,env){
  const url=new URL(req.url); const path=url.pathname; const method=req.method;
  if(path==='/api/me'&&method==='GET') return json({user:await auth(req,env)});
  if(path==='/api/register'&&method==='POST'){
    const b=await req.json(); if(!b.name||!b.phone||!b.password||b.password.length<6)return json({error:'أدخل الاسم والجوال وكلمة مرور 6 أحرف على الأقل'},400);
    const exists=await env.DB.prepare('SELECT id FROM users WHERE phone=?').bind(b.phone).first(); if(exists)return json({error:'رقم الجوال مسجل مسبقاً'},409);
    const uid=id(); const role=(b.phone===env.ADMIN_PHONE?'admin':'bidder');
    await env.DB.prepare('INSERT INTO users(id,name,phone,password_hash,role,created_at) VALUES(?,?,?,?,?,?)').bind(uid,b.name,b.phone,await hashPassword(b.password),role,now()).run();
    const sid=id(); await env.DB.prepare('INSERT INTO sessions(id,user_id,expires_at) VALUES(?,?,?)').bind(sid,uid,now()+604800000).run();
    return new Response(JSON.stringify({ok:true,user:{id:uid,name:b.name,phone:b.phone,role}}),{headers:{'content-type':'application/json','set-cookie':setSessionCookie(sid)}});
  }
  if(path==='/api/login'&&method==='POST'){
    const b=await req.json(); const u=await env.DB.prepare('SELECT * FROM users WHERE phone=?').bind(b.phone||'').first();
    if(!u||!(await verifyPassword(b.password||'',u.password_hash)))return json({error:'بيانات الدخول غير صحيحة'},401);
    const sid=id(); await env.DB.prepare('INSERT INTO sessions(id,user_id,expires_at) VALUES(?,?,?)').bind(sid,u.id,now()+604800000).run();
    return new Response(JSON.stringify({ok:true,user:{id:u.id,name:u.name,phone:u.phone,role:u.role}}),{headers:{'content-type':'application/json','set-cookie':setSessionCookie(sid)}});
  }
  if(path==='/api/logout'&&method==='POST'){
    const sid=cookies(req).session; if(sid) await env.DB.prepare('DELETE FROM sessions WHERE id=?').bind(sid).run();
    return new Response(JSON.stringify({ok:true}),{headers:{'content-type':'application/json','set-cookie':'session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'}});
  }
  if(path==='/api/auctions'&&method==='GET'){
    const rows=await env.DB.prepare('SELECT * FROM auctions ORDER BY ends_at DESC').all(); return json(rows.results||[]);
  }
  if(path==='/api/auctions/active'&&method==='GET'){
    let a=await env.DB.prepare("SELECT * FROM auctions WHERE status='active' ORDER BY ends_at ASC LIMIT 1").first();
    if(a&&a.ends_at<=now()){await env.DB.prepare("UPDATE auctions SET status='ended' WHERE id=?").bind(a.id).run(); a=null;}
    return json(a||null);
  }
  if(path.startsWith('/api/auctions/')&&path.endsWith('/bids')&&method==='GET'){
    const aid=path.split('/')[3]; const r=await env.DB.prepare('SELECT b.amount,b.created_at,u.name FROM bids b JOIN users u ON u.id=b.user_id WHERE b.auction_id=? ORDER BY b.created_at DESC LIMIT 30').bind(aid).all(); return json(r.results||[]);
  }
  if(path.startsWith('/api/auctions/')&&path.endsWith('/bid')&&method==='POST'){
    const u=await auth(req,env); if(!u)return json({error:'سجل الدخول للمزايدة'},401);
    const aid=path.split('/')[3]; const b=await req.json(); const a=await env.DB.prepare("SELECT * FROM auctions WHERE id=? AND status='active'").bind(aid).first();
    if(!a)return json({error:'المزاد غير متاح'},400); if(a.ends_at<=now())return json({error:'انتهى المزاد'},400);
    const amount=Number(b.amount); if(!Number.isInteger(amount)||amount<a.current_price+a.min_increment)return json({error:`أقل مزايدة هي ${(a.current_price+a.min_increment).toLocaleString('en-US')} ريال`},400);
    const bidId=id();
    await env.DB.batch([
      env.DB.prepare('INSERT INTO bids(id,auction_id,user_id,amount,created_at) VALUES(?,?,?,?,?)').bind(bidId,aid,u.id,amount,now()),
      env.DB.prepare('UPDATE auctions SET current_price=? WHERE id=? AND current_price<?').bind(amount,aid,amount)
    ]);
    return json({ok:true,amount});
  }
  if(path==='/api/admin/auctions'&&method==='POST'){
    const u=await auth(req,env); if(!u||u.role!=='admin')return json({error:'صلاحيات المدير مطلوبة'},403);
    const b=await req.json(); const aid=id(); const start=Number(b.starts_at)||now(); const end=Number(b.ends_at)||now()+3600000;
    await env.DB.prepare('INSERT INTO auctions(id,title,plate_letters_ar,plate_letters_en,plate_numbers,current_price,min_increment,starts_at,ends_at,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(aid,b.title||'لوحة مميزة',b.plate_letters_ar||'ع ع ب',b.plate_letters_en||'BEV',b.plate_numbers||'884',Number(b.current_price)||5000,Number(b.min_increment)||250,start,end,b.status||'active',now()).run(); return json({ok:true,id:aid});
  }
  if(path.startsWith('/api/admin/auctions/')&&path.endsWith('/status')&&method==='POST'){
    const u=await auth(req,env); if(!u||u.role!=='admin')return json({error:'صلاحيات المدير مطلوبة'},403); const aid=path.split('/')[4]; const b=await req.json();
    await env.DB.prepare('UPDATE auctions SET status=? WHERE id=?').bind(b.status,aid).run(); return json({ok:true});
  }
  return null;
}

export default {async fetch(req,env){try{const r=await routes(req,env); if(r)return r; return env.ASSETS.fetch(req);}catch(e){return json({error:'حدث خطأ في الخادم',detail:e.message},500);}}};
