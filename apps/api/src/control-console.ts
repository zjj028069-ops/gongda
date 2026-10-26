import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Database, Sql } from './database.js';
import { Problem } from './services.js';
import { hashPassword, verifyPassword, tokenHash, secretToken, safeEqual } from './passwords.js';

type Operator = { id:string; username:string; display_name:string; csrf_token:string; token_hash:string; expires_at:string };
type Tenant = { id:string; slug:string; name:string; active:boolean; control_version:number; created_at:string };
const uuid = {type:'string',format:'uuid'};
const text = (max:number) => ({type:'string',minLength:1,maxLength:max,pattern:'^\\S(?:.*\\S)?$'});
const username = {type:'string',minLength:3,maxLength:80,pattern:'^[a-zA-Z0-9_.@-]+$'};
const password = {type:'string',minLength:12,maxLength:128};
const object = (required:string[],properties:Record<string,unknown>) => ({type:'object',additionalProperties:false,required,properties});
const idParams=object(['id'],{id:uuid});
const memberParams=object(['id','userId'],{id:uuid,userId:uuid});
const tenantSelect='SELECT id,slug,name,active,control_version,created_at FROM tenants';
const sessionSelect='SELECT a.id,a.username,a.display_name,s.csrf_token,s.token_hash,s.expires_at FROM control_sessions s JOIN control_admins a ON a.id=s.admin_id WHERE s.token_hash=$1 AND s.expires_at>now() AND a.active';
const publicSession = (a:Operator) => ({operator:{id:a.id,username:a.username,display_name:a.display_name},csrf_token:a.csrf_token,expires_at:a.expires_at});
async function audit(sql:Sql,a:Operator,action:string,tenantId:string|null,userId:string|null,before:unknown,after:unknown) {
  await sql.query('INSERT INTO control_audit(admin_id,actor_name,action,tenant_id,target_user_id,before_data,after_data) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb)',[a.id,a.display_name,action,tenantId,userId,before?JSON.stringify(before):null,after?JSON.stringify(after):null]);
}
async function tenant(sql:Sql,id:string) {
  await sql.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['tenant-admins:'+id]);
  const row=(await sql.query<Tenant>(tenantSelect+' WHERE id=$1 FOR UPDATE',[id])).rows[0];
  if(!row)throw new Problem(404,'TENANT_NOT_FOUND','企业不存在');
  return row;
}
async function initializeMember(sql:Sql,tenantId:string,userId:string,name:string,initializeTenant=false) {
  await sql.query("SELECT set_config('app.tenant_id',$1,true),set_config('app.user_id',$2,true)",[tenantId,userId]);
  await sql.exec('SET LOCAL ROLE gd_tenant');
  await sql.query('INSERT INTO tenant_member_profiles(tenant_id,user_id,display_name) VALUES($1,$2,$3)',[tenantId,userId,name]);
  if(initializeTenant) {
    await sql.query("INSERT INTO units(tenant_id,code,name) VALUES($1,'EA','个'),($1,'M','米'),($1,'SHEET','张')",[tenantId]);
    await sql.query('INSERT INTO tenant_service_limits(tenant_id) VALUES($1)',[tenantId]);
  }
  await sql.exec('SET LOCAL ROLE gd_control');
}
export async function registerControlConsole(app:FastifyInstance,db:Database,production:boolean) {
  const cookieName=production?'__Host-gd_control_session':'gd_control_session';
  const operators=new WeakMap<FastifyRequest,Operator>();
  const dummy=await hashPassword(secretToken());
  const authorize=async(r:FastifyRequest)=>{
    const raw=r.cookies[cookieName];
    if(!raw||raw.length>100)throw new Problem(401,'CONTROL_UNAUTHENTICATED','请先登录平台管理后台');
    const a=await db.control(async sql=>(await sql.query<Operator>(sessionSelect,[tokenHash(raw)])).rows[0]);
    if(!a)throw new Problem(401,'CONTROL_UNAUTHENTICATED','平台管理会话已失效');
    if(!['GET','HEAD','OPTIONS'].includes(r.method)) {
      const csrf=r.headers['x-csrf-token'];
      if(typeof csrf!=='string'||!safeEqual(csrf,a.csrf_token))throw new Problem(403,'CSRF_REJECTED','操作校验失败，请刷新后重试');
    }
    operators.set(r,a);
  };
  // Serialize operator commands and recheck session validity inside the write transaction.
  const write=async<T>(r:FastifyRequest,fn:(sql:Sql,a:Operator)=>Promise<T>)=>db.control(async sql=>{
    const prior=operators.get(r)!;
    await sql.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['control:'+prior.id]);
    const a=(await sql.query<Operator>(sessionSelect,[prior.token_hash])).rows[0];
    if(!a)throw new Problem(401,'CONTROL_UNAUTHENTICATED','平台管理会话已失效');
    return fn(sql,a);
  });
  app.post<{Body:{username:string;password:string}}>('/api/control/auth/login',{
    config:{rateLimit:{max:10,timeWindow:'1 minute'}},
    schema:{body:object(['username','password'],{username,password:{type:'string',minLength:1,maxLength:128}})},
  },async(r,reply)=>{
    const row=await db.control(async sql=>(await sql.query<{id:string;password_hash:string}>('SELECT id,password_hash FROM control_admins WHERE username=$1 AND active AND (SELECT count(*) FROM control_admins)=2',[r.body.username])).rows[0]);
    const valid=await verifyPassword(r.body.password,row?.password_hash??dummy);
    if(!row||!valid)throw new Problem(401,'INVALID_CONTROL_CREDENTIALS','平台管理员账号或密码不正确');
    const token=secretToken(),csrf=secretToken();
    const a=await db.control(async sql=>{
      await sql.query('DELETE FROM control_sessions WHERE expires_at<=now()');
      if(r.cookies[cookieName])await sql.query('DELETE FROM control_sessions WHERE token_hash=$1',[tokenHash(r.cookies[cookieName]!)]);
      await sql.query("INSERT INTO control_sessions(token_hash,csrf_token,admin_id,expires_at) VALUES($1,$2,$3,now()+interval '8 hours')",[tokenHash(token),csrf,row.id]);
      const result=(await sql.query<Operator>(sessionSelect,[tokenHash(token)])).rows[0];
      if(!result)throw new Problem(401,'CONTROL_UNAUTHENTICATED','平台账号已停用');
      await audit(sql,result,'control.login',null,null,null,null);
      return result;
    });
    reply.setCookie(cookieName,token,{path:'/',httpOnly:true,secure:production,sameSite:'lax',maxAge:8*3600});
    return publicSession(a);
  });
  app.get('/api/control/auth/me',{preHandler:authorize},async r=>publicSession(operators.get(r)!));
  app.get('/api/control/operators',{preHandler:authorize},()=>db.control(async sql=>({fixed_count:2,items:(await sql.query('SELECT id,slot,username,display_name,active,created_at FROM control_admins ORDER BY slot')).rows})));
  app.post('/api/control/auth/logout',{preHandler:authorize},async(r,reply)=>{
    await write(r,async(sql,a)=>{await sql.query('DELETE FROM control_sessions WHERE token_hash=$1',[a.token_hash]);await audit(sql,a,'control.logout',null,null,null,null);});
    reply.clearCookie(cookieName,{path:'/',secure:production,httpOnly:true,sameSite:'lax'});
    return {ok:true};
  });
  app.get<{Querystring:{q?:string;page?:string;page_size?:string}}>('/api/control/tenants',{
    preHandler:authorize,schema:{querystring:object([],{q:{type:'string',maxLength:100},page:{type:'string',pattern:'^[1-9]\\d{0,5}$'},page_size:{type:'string',pattern:'^[1-9]\\d?$|^100$'}})},
  },r=>db.control(async sql=>{
    const q=r.query.q??'',page=Number(r.query.page??1),size=Number(r.query.page_size??20);
    const where=" WHERE ($1='' OR position(lower($1) in lower(t.name||' '||t.slug))>0)";
    const total=Number((await sql.query<{total:string}>('SELECT count(*)::text AS total FROM tenants t'+where,[q])).rows[0]!.total);
    const items=(await sql.query('SELECT t.id,t.slug,t.name,t.active,t.control_version,t.created_at,(SELECT count(*)::integer FROM memberships m WHERE m.tenant_id=t.id AND m.active) AS member_count,(SELECT count(*)::integer FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.tenant_id=t.id AND m.active AND u.active AND m.role=\'admin\') AS admin_count FROM tenants t'+where+' ORDER BY t.created_at DESC,t.id LIMIT $2 OFFSET $3',[q,size,(page-1)*size])).rows;
    const summary=(await sql.query('SELECT count(*)::integer AS total,count(*) FILTER(WHERE active)::integer AS active,count(*) FILTER(WHERE NOT active)::integer AS disabled FROM tenants')).rows[0];
    return {items,total,summary};
  }));
  type CreateTenant={request_key:string;slug:string;name:string;admin_username:string;admin_name:string;password:string};
  app.post<{Body:CreateTenant}>('/api/control/tenants',{preHandler:authorize,schema:{body:object(['request_key','slug','name','admin_username','admin_name','password'],{
    request_key:{type:'string',minLength:8,maxLength:100,pattern:'^[a-zA-Z0-9_.-]+$'},slug:{type:'string',pattern:'^[a-z0-9][a-z0-9-]{1,62}$'},name:text(100),admin_username:username,admin_name:text(100),password,
  })}},async(r,reply)=>{
    const b=r.body,hash=await hashPassword(b.password);
    const requestData={slug:b.slug,name:b.name,admin_username:b.admin_username,admin_name:b.admin_name};
    const result=await write(r,async(sql,a)=>{
      const prior=(await sql.query<{tenant_id:string;user_id:string;request_data:typeof requestData}>('SELECT tenant_id,user_id,request_data FROM control_provision_requests WHERE admin_id=$1 AND request_key=$2',[a.id,b.request_key])).rows[0];
      if(prior) {
        if(Object.keys(requestData).some(key=>prior.request_data[key as keyof typeof requestData]!==requestData[key as keyof typeof requestData]))throw new Problem(409,'REQUEST_KEY_CONFLICT','相同请求标识不能用于不同开通内容');
        const existing=(await sql.query<Tenant>(tenantSelect+' WHERE id=$1',[prior.tenant_id])).rows[0]!;
        return {tenant:existing,admin:{id:prior.user_id,username:b.admin_username},replayed:true};
      }
      const t=(await sql.query<Tenant>('INSERT INTO tenants(slug,name) VALUES($1,$2) RETURNING id,slug,name,active,control_version,created_at',[b.slug,b.name])).rows[0]!;
      const u=(await sql.query<{id:string}>('INSERT INTO users(username,display_name,password_hash) VALUES($1,$2,$3) RETURNING id',[b.admin_username,b.admin_name,hash])).rows[0]!;
      await sql.query("INSERT INTO memberships(tenant_id,user_id,role) VALUES($1,$2,'admin')",[t.id,u.id]);
      await initializeMember(sql,t.id,u.id,b.admin_name,true);
      await sql.query('INSERT INTO control_provision_requests(admin_id,request_key,request_data,tenant_id,user_id) VALUES($1,$2,$3::jsonb,$4,$5)',[a.id,b.request_key,JSON.stringify(requestData),t.id,u.id]);
      await audit(sql,a,'tenant.provisioned',t.id,u.id,null,{...requestData,user_id:u.id});
      return {tenant:t,admin:{id:u.id,username:b.admin_username},replayed:false};
    });
    return reply.code(result.replayed?200:201).send(result);
  });
  app.patch<{Params:{id:string};Body:{version:number;name:string;active:boolean;reason:string}}>('/api/control/tenants/:id',{preHandler:authorize,schema:{params:idParams,body:object(['version','name','active','reason'],{version:{type:'integer',minimum:1},name:text(100),active:{type:'boolean'},reason:text(300)})}},r=>write(r,async(sql,a)=>{
    const before=await tenant(sql,r.params.id),b=r.body;
    if(before.control_version!==b.version)throw new Problem(409,'VERSION_CONFLICT','企业已被修改，请刷新');
    const updated=(await sql.query<Tenant>('UPDATE tenants SET name=$1,active=$2,control_version=control_version+1 WHERE id=$3 RETURNING id,slug,name,active,control_version,created_at',[b.name,b.active,before.id])).rows[0]!;
    if(!b.active)await sql.query('DELETE FROM sessions WHERE tenant_id=$1',[before.id]);
    await audit(sql,a,'tenant.updated',before.id,null,before,{...updated,reason:b.reason});
    return {tenant:updated};
  }));
  app.get<{Params:{id:string}}>('/api/control/tenants/:id/admins',{preHandler:authorize,schema:{params:idParams}},r=>db.control(async sql=>{
    const t=(await sql.query<Tenant>(tenantSelect+' WHERE id=$1',[r.params.id])).rows[0];
    if(!t)throw new Problem(404,'TENANT_NOT_FOUND','企业不存在');
    const items=(await sql.query('SELECT u.id,u.username,u.display_name,u.active AS identity_active,m.active,m.control_version,(SELECT count(*)::integer FROM memberships shared WHERE shared.user_id=u.id) AS membership_count FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.tenant_id=$1 AND m.role=\'admin\' ORDER BY u.username',[t.id])).rows;
    return {tenant:t,items};
  }));
  app.post<{Params:{id:string};Body:{username:string;display_name:string;password:string}}>('/api/control/tenants/:id/admins',{preHandler:authorize,schema:{params:idParams,body:object(['username','display_name','password'],{username,display_name:text(100),password})}},async(r,reply)=>{
    const hash=await hashPassword(r.body.password);
    const admin=await write(r,async(sql,a)=>{
      await tenant(sql,r.params.id);
      const b=r.body,u=(await sql.query<{id:string}>('INSERT INTO users(username,display_name,password_hash) VALUES($1,$2,$3) RETURNING id',[b.username,b.display_name,hash])).rows[0]!;
      await sql.query("INSERT INTO memberships(tenant_id,user_id,role) VALUES($1,$2,'admin')",[r.params.id,u.id]);
      await initializeMember(sql,r.params.id,u.id,b.display_name);
      const result={id:u.id,username:b.username,display_name:b.display_name,active:true,control_version:1};
      await audit(sql,a,'tenant.admin.created',r.params.id,u.id,null,result);
      return result;
    });
    return reply.code(201).send({admin});
  });
  app.patch<{Params:{id:string;userId:string};Body:{version:number;active:boolean;reason:string}}>('/api/control/tenants/:id/admins/:userId',{preHandler:authorize,schema:{params:memberParams,body:object(['version','active','reason'],{version:{type:'integer',minimum:1},active:{type:'boolean'},reason:text(300)})}},r=>write(r,async(sql,a)=>{
    const t=await tenant(sql,r.params.id),b=r.body;
    const before=(await sql.query<{active:boolean;control_version:number}>('SELECT active,control_version FROM memberships WHERE tenant_id=$1 AND user_id=$2 AND role=\'admin\' FOR UPDATE',[t.id,r.params.userId])).rows[0];
    if(!before)throw new Problem(404,'ADMIN_NOT_FOUND','该企业管理员不存在');
    if(before.control_version!==b.version)throw new Problem(409,'VERSION_CONFLICT','账号状态已变化，请刷新');
    if(before.active&&!b.active) {
      const others=(await sql.query('SELECT m.user_id FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.tenant_id=$1 AND m.user_id<>$2 AND m.role=\'admin\' AND m.active AND u.active LIMIT 1',[t.id,r.params.userId])).rows;
      if(!others.length)throw new Problem(409,'LAST_ADMIN','请先开通另一位管理员，不能停用最后一位有效管理员');
    }
    const admin=(await sql.query('UPDATE memberships SET active=$1,control_version=control_version+1 WHERE tenant_id=$2 AND user_id=$3 RETURNING user_id AS id,active,control_version',[b.active,t.id,r.params.userId])).rows[0]!;
    if(!b.active)await sql.query('DELETE FROM sessions WHERE tenant_id=$1 AND user_id=$2',[t.id,r.params.userId]);
    await audit(sql,a,'tenant.admin.updated',t.id,r.params.userId,before,{...admin,reason:b.reason});
    return {admin};
  }));
  app.post<{Params:{id:string;userId:string};Body:{password:string;reason:string}}>('/api/control/tenants/:id/admins/:userId/password',{preHandler:authorize,schema:{params:memberParams,body:object(['password','reason'],{password,reason:text(300)})}},async r=>{
    const hash=await hashPassword(r.body.password);
    return write(r,async(sql,a)=>{
      await tenant(sql,r.params.id);
      const membership=(await sql.query('SELECT user_id FROM memberships WHERE tenant_id=$1 AND user_id=$2 AND role=\'admin\'',[r.params.id,r.params.userId])).rows[0];
      if(!membership)throw new Problem(404,'ADMIN_NOT_FOUND','该企业管理员不存在');
      // A historical shared identity must never have another tenant's password silently changed.
      const memberships=Number((await sql.query<{count:string}>('SELECT count(*)::text AS count FROM memberships WHERE user_id=$1',[r.params.userId])).rows[0]!.count);
      if(memberships!==1)throw new Problem(409,'SHARED_IDENTITY','该账号属于多家企业，请先为企业建立独立管理员账号');
      await sql.query('UPDATE users SET password_hash=$1 WHERE id=$2',[hash,r.params.userId]);
      await sql.query('DELETE FROM sessions WHERE user_id=$1',[r.params.userId]);
      await audit(sql,a,'tenant.admin.password_reset',r.params.id,r.params.userId,null,{reason:r.body.reason,sessions_revoked:true});
      return {ok:true};
    });
  });
  app.get<{Querystring:{page?:string}}>('/api/control/audit',{preHandler:authorize,schema:{querystring:object([],{page:{type:'string',pattern:'^[1-9]\\d{0,5}$'}})}},r=>db.control(async sql=>{
    const total=Number((await sql.query<{total:string}>('SELECT count(*)::text AS total FROM control_audit')).rows[0]!.total);
    return {total,items:(await sql.query('SELECT a.id,a.actor_name,a.action,a.tenant_id,t.name AS tenant_name,a.target_user_id,a.before_data,a.after_data,a.created_at FROM control_audit a LEFT JOIN tenants t ON t.id=a.tenant_id ORDER BY a.created_at DESC,a.id DESC LIMIT 50 OFFSET $1',[(Number(r.query.page??1)-1)*50])).rows};
  }));
}
