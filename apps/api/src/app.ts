import Fastify, { type FastifyRequest } from 'fastify';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import type { Database, Sql } from './database.js';
import { Problem, defaultPermissions, productScope, assertProductScope, type Actor } from './services.js';
import {registerLocalEvents} from './local-events.js';
import {registerPlatform} from './platform.js';
import {registerConfiguration,saveProductFields,attachProductFields} from './configuration.js';
import {registerAssets,gateTenantWrite} from './assets.js';
import { registerMasters } from './masters.js';
import { registerPreview } from './design-preview.js';
import { registerProduction } from './production.js';
import { registerCorrections } from './production-corrections.js';
import { registerBusiness } from './business.js';
import { registerExpenses } from './expenses.js';
import { registerReports } from './reports.js';
import { registerWarehouseOperations } from './warehouse-operations.js';
import { registerControlConsole } from './control-console.js';
export { Problem } from './services.js';
import { hashPassword, verifyPassword, tokenHash, secretToken, safeEqual } from './passwords.js';

type Role = 'admin' | 'planner' | 'worker';
type Session = Actor & { token_hash: string; csrf_token: string; tenant_id: string; user_id: string; role: Role; tenant_name: string; tenant_slug: string; display_name: string; expires_at: string };
type Product = { id: string; code: string; name: string; specification: string; unit_id: string; unit_name: string; attribute: string; active: boolean; version: number; created_at: string; updated_at: string;created_by_id:string|null;department_id:string|null };

const unitId = { type: 'string', format: 'uuid' };
const productProperties = {
  code: { type: 'string', minLength: 1, maxLength: 64, pattern: '^\\S(?:.*\\S)?$' },
  name: { type: 'string', minLength: 1, maxLength: 200, pattern: '^\\S(?:.*\\S)?$' },
  specification: { type: 'string', maxLength: 500 },
  unit_id: unitId,
  attribute: { type: 'string', enum: ['manufactured','purchased'] },
  department_id:{anyOf:[unitId,{type:'null'}]},
  extension:{type:'object',additionalProperties:false,required:['schema_version_id','values'],properties:{schema_version_id:unitId,values:{type:'object',maxProperties:30}}},
};
const productSelect = 'SELECT p.created_by_id,p.department_id,p.id,p.code,p.name,p.specification,p.unit_id,u.name AS unit_name,p.attribute,p.active,p.version,p.created_at,p.updated_at FROM products p JOIN units u ON u.tenant_id=p.tenant_id AND u.id=p.unit_id';
const sessionSelect = 'SELECT s.token_hash,s.csrf_token,s.tenant_id,s.user_id,s.expires_at,m.role,t.name AS tenant_name,t.slug AS tenant_slug,u.display_name FROM sessions s JOIN users u ON u.id=s.user_id JOIN tenants t ON t.id=s.tenant_id JOIN memberships m ON m.tenant_id=s.tenant_id AND m.user_id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.active AND t.active AND m.active';
const publicSession = (session: Session) => ({
  csrf_token: session.csrf_token,
  user: { id: session.user_id, display_name: session.display_name },
  tenant: { id: session.tenant_id, name: session.tenant_name, slug: session.tenant_slug },
  role: session.role, permissions:session.permissions,data_scope:session.data_scope,department_id:session.department_id,expires_at: session.expires_at,
});
export async function createApp(database: Database, options: { production?: boolean; origin?: string; logger?: boolean; trustedProxy?: string[]; localEventsWorker?:boolean } = {}) {
  await database.assertSecurityConfiguration();
  const production = options.production ?? false;
  const cookieName = production ? '__Host-gd_session' : 'gd_session';
  const origin = options.origin ?? 'http://127.0.0.1:5173';
  const app = Fastify({
    bodyLimit: 1024 * 1024,
    trustProxy: options.trustedProxy ?? false,
    ajv: { customOptions: { removeAdditional: false, coerceTypes: false } },
    logger: options.logger ? { level: 'info', redact: ['req.headers.authorization','req.headers.cookie','req.body.password','req.body.content_base64','res.headers.set-cookie'] } : false,
  });
  await app.register(cookie);
  await app.register(rateLimit, { global: false });
  const sessions = new WeakMap<FastifyRequest, Session>();
  const dummyHash = await hashPassword(secretToken());
  app.addHook('onRequest', async (request, reply) => {
    reply.header('X-Content-Type-Options','nosniff').header('Cache-Control','no-store');
    if (!['GET','HEAD','OPTIONS'].includes(request.method) && request.headers.origin && request.headers.origin !== origin) {
      throw new Problem(403,'ORIGIN_REJECTED','请求来源不被允许');
    }
  });
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof Problem) return reply.code(error.status).send({ error: { code: error.code, message: error.message } });
    const knownError = error as { validation?: unknown; statusCode?: number; code?: string };
    if (knownError.validation) return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: '参数格式不正确，请检查必填项和字段范围' } });
    const code = knownError.code;
    if (code === '23505') return reply.code(409).send({ error: { code: 'DUPLICATE', message: request.url.startsWith('/api/control/') ? '企业标识或账号已存在，请更换后重试' : '本企业内已存在相同编码' } });
    if (code === '23503') return reply.code(422).send({ error: { code: 'INVALID_REFERENCE', message: '关联资料不存在或不属于当前企业' } });
    if (knownError.statusCode === 429) return reply.code(429).send({ error: { code: 'RATE_LIMITED', message: '操作频繁，请稍后重试' } });
    if (knownError.statusCode === 413) return reply.code(413).send({ error: { code: 'BODY_TOO_LARGE', message: '请求内容过大' } });
    if (knownError.statusCode === 400) return reply.code(400).send({ error: { code: 'INVALID_REQUEST', message: '请求内容格式不正确' } });
    request.log.error({ err: error }, '请求处理失败');
    return reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: '服务暂时无法处理请求' } });
  });
  app.setNotFoundHandler((_request, reply) => reply.code(404).send({ error: { code: 'NOT_FOUND', message: '接口不存在' } }));
  const decorate = async (session:Session):Promise<Session> => database.tenant({tenantId:session.tenant_id,userId:session.user_id},async sql=>{
    const profile=(await sql.query<{display_name:string;department_id:string|null;custom_role_id:string|null;permissions:string[]|null;data_scope:Actor['data_scope']|null;active:boolean|null}>('SELECT p.display_name,p.department_id,p.custom_role_id,r.permissions,r.data_scope,r.active FROM tenant_member_profiles p LEFT JOIN tenant_roles r ON r.tenant_id=p.tenant_id AND r.id=p.custom_role_id WHERE p.user_id=$1',[session.user_id])).rows[0];
    const custom=session.role!=='admin'&&profile?.custom_role_id;
    return {...session,display_name:profile?.display_name??session.display_name,department_id:profile?.department_id??null,permissions:custom?(profile.active?profile.permissions??[]:[]):defaultPermissions(session.role),data_scope:custom?profile.data_scope??'all':'all'};
  });
  const authorize = (roles: Role[] = ['admin','planner','worker']) => async (request: FastifyRequest) => {
    const token = request.cookies[cookieName];
    if (!token || token.length > 100) throw new Problem(401,'UNAUTHENTICATED','请先登录');
    const raw = await database.auth(async (sql) => (await sql.query<Session>(sessionSelect,[tokenHash(token)])).rows[0]);
    if (!raw) throw new Problem(401,'UNAUTHENTICATED','登录已失效，请重新登录');
    const session=await decorate(raw),path=request.url.split('?')[0]!;
    const master=/^\/api\/(products|units|processes|routes|route-versions|boms|bom-versions|team-members)(\/|$)/.test(path);
    const business=/^\/api\/(customers|warehouses|sales-orders|work-orders|production-reports|material-issues|fg-receipts|shipments|stock-adjustments|inspections|stock)(\/|$)/.test(path);
    const action=master?(['GET','HEAD'].includes(request.method)?'master.read':'master.write'):path==='/api/audit-events'?'audit.read':path==='/api/overview'||path.startsWith('/api/design-preview')?'master.read':null;
    if(action?!session.permissions.includes(action):!roles.includes(session.role))throw new Problem(403,'FORBIDDEN','当前角色没有操作权限');
    if(session.data_scope!=='all'&&(business||(master&&path!=='/api/products'&&!path.startsWith('/api/products/')&&path!=='/api/units'&&path!=='/api/team-members')||action==='master.write'||action==='audit.read'||path.startsWith('/api/design-preview')))throw new Problem(403,'DATA_SCOPE_UNSUPPORTED','当前功能尚需全企业数据范围');
    if (!['GET','HEAD','OPTIONS'].includes(request.method)) {
      const csrf = request.headers['x-csrf-token'];
      if (typeof csrf !== 'string' || !safeEqual(csrf,session.csrf_token)) throw new Problem(403,'CSRF_REJECTED','操作校验失败，请刷新后重试');
    }
    sessions.set(request,session);
  };
  const requirePermission=(permission:string)=>async(request:FastifyRequest)=>{await authorize()(request);if(!sessions.get(request)!.permissions.includes(permission))throw new Problem(403,'FORBIDDEN','当前角色没有操作权限');};
  const context = (request: FastifyRequest) => {
    const session = sessions.get(request)!;
    return { tenantId: session.tenant_id, userId: session.user_id };
  };
  const getProduct = async (sql: Sql, id: string):Promise<Product> => {const row=(await sql.query<Product>(productSelect + ' WHERE p.id=$1',[id])).rows[0];if(!row)throw new Problem(404,'PRODUCT_NOT_FOUND','产品不存在');return row;};
  const audit = async (sql: Sql, session: Session, action: string, id: string, before: unknown, after: unknown) => {
    const summary=(value:unknown)=>{if(!value||typeof value!=='object')return value;const row=value as Record<string,unknown>;const extension=row.extension as Record<string,unknown>|null|undefined;return {...row,extension:extension?{schema_version_id:extension.schema_version_id,revision:extension.revision}:null};};
    await sql.query('INSERT INTO audit_events(tenant_id,actor_id,actor_name,action,entity_type,entity_id,before_data,after_data) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb)',
      [session.tenant_id,session.user_id,session.display_name,action,'product',id,before ? JSON.stringify(summary(before)) : null,after ? JSON.stringify(summary(after)) : null]);
  };
  app.get('/health/live', async () => ({ status: 'ok' }));
  app.get('/health/ready', async (_request,reply) => {
    try { await database.auth((sql) => sql.query('SELECT 1')); return { status: 'ok' }; }
    catch { return reply.code(503).send({ status: 'unavailable' }); }
  });
  app.post<{ Body: { tenant_slug: string; username: string; password: string } }>('/api/auth/login', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    schema: { body: { type:'object', additionalProperties:false, required:['tenant_slug','username','password'], properties: {
      tenant_slug: { type:'string',pattern:'^[a-z0-9][a-z0-9-]{1,62}$' },
      username: { type:'string',minLength:3,maxLength:80 },
      password: { type:'string',minLength:1,maxLength:128 },
    } } },
  }, async (request,reply) => {
    const body = request.body;
    const user = await database.auth(async (sql) => (await sql.query<{ id:string; tenant_id:string; password_hash:string }>('SELECT u.id,u.password_hash,t.id AS tenant_id FROM users u JOIN memberships m ON m.user_id=u.id JOIN tenants t ON t.id=m.tenant_id WHERE u.username=$1 AND t.slug=$2 AND u.active AND m.active AND t.active',[body.username,body.tenant_slug])).rows[0]);
    const valid = await verifyPassword(body.password,user?.password_hash ?? dummyHash);
    if (!user || !valid) throw new Problem(401,'INVALID_CREDENTIALS','企业、账号或密码不正确');
    const token = secretToken(), csrf = secretToken();
    const session = await database.auth(async (sql) => {
      await sql.query('DELETE FROM sessions WHERE expires_at<=now()');
      await sql.query("INSERT INTO sessions(token_hash,csrf_token,user_id,tenant_id,expires_at) VALUES($1,$2,$3,$4,now()+interval '8 hours')",[tokenHash(token),csrf,user.id,user.tenant_id]);
      return (await sql.query<Session>(sessionSelect,[tokenHash(token)])).rows[0]!;
    });
    reply.setCookie(cookieName,token,{ path:'/', httpOnly:true, secure:production, sameSite:'lax', maxAge:8*3600 });
    return publicSession(await decorate(session));
  });
  app.get('/api/auth/me',{ preHandler:authorize() },async (request) => publicSession(sessions.get(request)!));
  app.post<{Body:{tenant_id:string}}>('/api/auth/switch-tenant',{preHandler:authorize(),schema:{body:{type:'object',additionalProperties:false,required:['tenant_id'],properties:{tenant_id:unitId}}}},async(request,reply)=>{
    const current=sessions.get(request)!,token=secretToken(),csrf=secretToken();
    const next=await database.auth(async sql=>{
      const own=(await sql.query('SELECT t.id FROM memberships m JOIN tenants t ON t.id=m.tenant_id JOIN users u ON u.id=m.user_id WHERE m.user_id=$1 AND m.tenant_id=$2 AND m.active AND t.active AND u.active',[current.user_id,request.body.tenant_id])).rows[0];
      if(!own)throw new Problem(403,'TENANT_NOT_AUTHORIZED','没有该企业的有效成员资格');
      await sql.query('DELETE FROM sessions WHERE token_hash=$1',[current.token_hash]);
      await sql.query("INSERT INTO sessions(token_hash,csrf_token,user_id,tenant_id,expires_at) VALUES($1,$2,$3,$4,now()+interval '8 hours')",[tokenHash(token),csrf,current.user_id,request.body.tenant_id]);
      return (await sql.query<Session>(sessionSelect,[tokenHash(token)])).rows[0]!;
    });
    reply.setCookie(cookieName,token,{path:'/',httpOnly:true,secure:production,sameSite:'lax',maxAge:8*3600});return publicSession(await decorate(next));
  });
  app.post('/api/auth/logout',{ preHandler:authorize() },async (request,reply) => {
    await database.auth((sql) => sql.query('DELETE FROM sessions WHERE token_hash=$1',[sessions.get(request)!.token_hash]));
    reply.clearCookie(cookieName,{ path:'/', secure:production, httpOnly:true, sameSite:'lax' });
    return { ok:true };
  });

  app.get<{ Querystring:{q?:string;page?:string;page_size?:string} }>('/api/products',{
    preHandler:authorize(),
    schema:{ querystring:{ type:'object',additionalProperties:false,properties:{
      q:{type:'string',maxLength:100},page:{type:'string',pattern:'^[1-9]\\d{0,5}$',default:'1'},
      page_size:{type:'string',pattern:'^[1-9]\\d{0,2}$',default:'20'},
    }} },
  },async (request) => database.tenant(context(request),async (sql) => {
    const { q='' } = request.query;
    const page=Number(request.query.page??'1'),page_size=Number(request.query.page_size??'20');
    if(page>100000||page_size>100)throw new Problem(400,'PAGINATION_RANGE','分页参数超出允许范围');
    const scope=productScope(sessions.get(request)!,'p',2);
    const where = " WHERE ($1='' OR position(lower($1) in lower(p.code||' '||p.name))>0) AND "+scope.clause;
    const total = Number((await sql.query<{total:string}>('SELECT count(*)::text AS total FROM products p'+where,[q,...scope.params])).rows[0]!.total);
    const items = (await sql.query<Product>(productSelect+where+` ORDER BY p.created_at DESC,p.id LIMIT $${2+scope.params.length} OFFSET $${3+scope.params.length}`,[q,...scope.params,page_size,(page-1)*page_size])).rows;
    return { items:await attachProductFields(sql,items,sessions.get(request)!),total };
  }));
  app.post<{Body:{code:string;name:string;specification?:string;unit_id:string;attribute:string;department_id?:string|null;extension?:{schema_version_id:string;values:Record<string,unknown>}}}>('/api/products',{
    preHandler:authorize(['admin','planner']),
    schema:{body:{type:'object',additionalProperties:false,required:['code','name','unit_id','attribute'],properties:productProperties}},
  },async (request,reply) => {
    const product = await database.tenant(context(request),async (sql) => {
      const b=request.body, session=sessions.get(request)!;
      if(b.department_id!==undefined&&!session.permissions.includes('organization.manage'))throw new Problem(403,'DEPARTMENT_ASSIGNMENT_FORBIDDEN','调整产品部门归属需要组织管理权限');
      await gateTenantWrite(sql,context(request),'products');
      const departmentId=b.department_id===undefined?session.department_id:b.department_id;
      if(departmentId&&!(await sql.query('SELECT id FROM departments WHERE id=$1 AND active',[departmentId])).rows[0])throw new Problem(422,'INVALID_REFERENCE','所属部门不存在或已停用');
      const validUnit=(await sql.query('SELECT id FROM units WHERE id=$1 AND active FOR UPDATE',[b.unit_id])).rows[0];
      if (!validUnit) throw new Problem(422,'INVALID_REFERENCE','单位不存在或不属于当前企业');
      const row=(await sql.query<{id:string}>('INSERT INTO products(tenant_id,code,name,specification,unit_id,attribute,created_by_id,department_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',[session.tenant_id,b.code,b.name,b.specification??'',b.unit_id,b.attribute,session.user_id,departmentId])).rows[0]!;
      await saveProductFields(sql,session,row.id,b.extension);
      const after=(await attachProductFields(sql,[(await getProduct(sql,row.id))!],session))[0];
      await audit(sql,session,'product.created',row.id,null,after);
      return after;
    });
    return reply.code(201).send({product});
  });
  app.patch<{Params:{id:string};Body:{version:number;name:string;specification:string;unit_id:string;attribute:string;active:boolean;department_id?:string|null;extension?:{schema_version_id:string;values:Record<string,unknown>}}}>('/api/products/:id',{
    preHandler:authorize(['admin','planner']),
    schema:{
      params:{type:'object',additionalProperties:false,required:['id'],properties:{id:unitId}},
      body:{type:'object',additionalProperties:false,required:['version','name','specification','unit_id','attribute','active'],properties:{
        version:{type:'integer',minimum:1},name:productProperties.name,specification:productProperties.specification,
        unit_id:unitId,attribute:productProperties.attribute,active:{type:'boolean'},department_id:productProperties.department_id,extension:productProperties.extension,
      }},
    },
  },async (request) => database.tenant(context(request),async (sql) => {
    await gateTenantWrite(sql,context(request));
    await assertProductScope(sql,sessions.get(request)!,request.params.id);
    const before=(await attachProductFields(sql,[(await getProduct(sql,request.params.id))!],sessions.get(request)!))[0];
    if (!before) throw new Problem(404,'PRODUCT_NOT_FOUND','产品不存在');
    const b=request.body;
    if(b.department_id!==undefined&&!sessions.get(request)!.permissions.includes('organization.manage'))throw new Problem(403,'DEPARTMENT_ASSIGNMENT_FORBIDDEN','调整产品部门归属需要组织管理权限');
    const departmentId=b.department_id===undefined?before.department_id:b.department_id;
    if(departmentId&&!(await sql.query('SELECT id FROM departments WHERE id=$1 AND active',[departmentId])).rows[0])throw new Problem(422,'INVALID_REFERENCE','所属部门不存在或已停用');
    if (!(await sql.query('SELECT id FROM units WHERE id=$1 AND active FOR UPDATE',[b.unit_id])).rows[0]) throw new Problem(422,'INVALID_REFERENCE','单位不存在或不属于当前企业');
    const updated=await sql.query('UPDATE products SET name=$1,specification=$2,unit_id=$3,attribute=$4,active=$5,version=version+1,updated_at=now()  ,department_id=$8 WHERE id=$6 AND version=$7 RETURNING id',[b.name,b.specification,b.unit_id,b.attribute,b.active,request.params.id,b.version,departmentId]);
    if (!updated.rows[0]) throw new Problem(409,'VERSION_CONFLICT','该资料已被其他人修改，请刷新后重试');
    await saveProductFields(sql,sessions.get(request)!,request.params.id,b.extension);
    const after=(await attachProductFields(sql,[await getProduct(sql,request.params.id)],sessions.get(request)!))[0];
    await audit(sql,sessions.get(request)!,'product.updated',request.params.id,before,after);
    return {product:after};
  }));
  app.get('/api/audit-events',{preHandler:authorize(['admin','planner'])},async (request) => database.tenant(context(request),async (sql) => {
    const a=sessions.get(request)!,hidden:string[]=[];
    if(!a.permissions.includes('organization.manage'))hidden.push('member','role','department','workshop','line','tenant');
    if(!a.permissions.includes('configuration.manage'))hidden.push('field_schema','number_rule','user_view','event_rule','calendar');
    if(!a.permissions.includes('tenant_service.manage'))hidden.push('tenant_service');
    if(!a.permissions.includes('payroll.read'))hidden.push('wage_rule','wage_settlement','rework_report');
    if(!a.permissions.includes('finance.read'))hidden.push('payment','expense','transfer','count');
    if(!a.permissions.includes('inventory.read'))hidden.push('transfer','count');
    if(!a.permissions.includes('procurement.read'))hidden.push('supplier','purchase_order','purchase_receipt');
    return {items:(await sql.query('SELECT id,action,entity_type,entity_id,actor_name,before_data,after_data,created_at FROM audit_events WHERE NOT(entity_type=ANY($1::text[])) ORDER BY created_at DESC,id LIMIT 100',[hidden])).rows};
  }));
  app.get('/api/overview',{preHandler:authorize()},async (request) => database.tenant(context(request),async (sql) => {
    const scope=productScope(sessions.get(request)!,'p');
    const counts=(await sql.query<{products:string;units:string}>('SELECT (SELECT count(*) FROM products p WHERE '+scope.clause+')::text AS products,(SELECT count(*) FROM units)::text AS units',scope.params)).rows[0]!;
    const auditEvents=!sessions.get(request)!.permissions.includes('audit.read')||sessions.get(request)!.data_scope!=='all' ? null : Number((await sql.query<{count:string}>('SELECT count(*)::text AS count FROM audit_events')).rows[0]!.count);
    const session=sessions.get(request)!;
    const workOrders=session.permissions.includes('production.read')&&session.data_scope==='all'?Number((await sql.query<{count:string}>('SELECT count(*)::text AS count FROM work_orders')).rows[0]!.count):null;
    return {products:Number(counts.products),units:Number(counts.units),audit_events:auditEvents,work_orders:workOrders,stage:'production_mainline'};
  }));
  const services = {database,authorize,requirePermission,context,actor:(request:FastifyRequest)=>sessions.get(request)!};
  await registerControlConsole(app,database,production);
  registerLocalEvents(app,services,{worker:options.localEventsWorker});
  registerPlatform(app,services,{allowTenantCreation:!production});
  registerConfiguration(app,services);
  registerAssets(app,services,{allowServiceConfiguration:!production});
  registerMasters(app,services);
  registerPreview(app,services);
  registerProduction(app,services);
  registerBusiness(app,services);
  registerExpenses(app,services);
  registerReports(app,services);
  registerWarehouseOperations(app,services);
  registerCorrections(app,services);
  return app;
}







