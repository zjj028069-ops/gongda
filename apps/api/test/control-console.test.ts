import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import type {FastifyInstance} from 'fastify';
import {Database} from '../src/database.js';
import {migrate} from '../src/migrations.js';
import {createApp} from '../src/app.js';
import {hashPassword} from '../src/passwords.js';

let db:Database,app:FastifyInstance;
const password='Console-Test-Only-Long!';
type Login={cookie:string;csrf:string};
let control:Login;
let first:{id:string;slug:string;control_version:number};
let firstAdmin:string;
const h=(a:Login,write=false)=>({cookie:a.cookie,...(write?{'x-csrf-token':a.csrf}:{})});
const payload=(suffix:string)=>({slug:'control-'+suffix,name:'控制台企业'+suffix,admin_username:'tenant.'+suffix,admin_name:'企业管理员'+suffix,password,request_key:randomUUID()});
async function login(url:string,body:unknown,target=app):Promise<Login>{
 const r=await target.inject({method:'POST',url,payload:body as object});assert.equal(r.statusCode,200,r.body);
 const raw=r.headers['set-cookie'];const cookie=(Array.isArray(raw)?raw[0]:raw)!.split(';')[0]!;
 return {cookie,csrf:r.json().csrf_token};
}
before(async()=>{
 db=new Database({mode:'pglite'});await migrate(db);
 await db.admin(async sql=>{const hash=await hashPassword(password);for(const slot of [1,2])await sql.query('INSERT INTO control_admins(slot,username,display_name,password_hash) VALUES($1,$2,$3,$4)',[slot,slot===1?'platform.test':'platform.second','平台运营员'+slot,hash]);});
 app=await createApp(db,{localEventsWorker:false});
 control=await login('/api/control/auth/login',{username:'platform.test',password});
});
after(async()=>{await app?.close();await db?.close();});

test('平台固定两个账号：第二账号可登录，数据库拒绝第三账号及删除或清空',async()=>{
 await assert.rejects(db.admin(sql=>sql.query("DELETE FROM control_admins WHERE username='platform.second'")),/exactly two/);
 const second=await login('/api/control/auth/login',{username:'platform.second',password});
 const directory=await app.inject({url:'/api/control/operators',headers:h(second)});assert.equal(directory.statusCode,200);assert.equal(directory.json().fixed_count,2);assert.equal(directory.json().items.length,2);assert.ok(!directory.body.includes('password_hash'));
 await assert.rejects(db.admin(sql=>sql.query("INSERT INTO control_admins(slot,username,display_name,password_hash) VALUES(3,'third.test','禁止第三个','unused')")),/check constraint/);
 await assert.rejects(db.admin(sql=>sql.query("INSERT INTO control_admins(slot,username,display_name,password_hash) VALUES(1,'third.test','禁止重复槽位','unused')")),/unique constraint/);
 await assert.rejects(db.admin(sql=>sql.exec('TRUNCATE control_admins CASCADE')),/cannot be truncated/);
 assert.equal((await db.admin(sql=>sql.query('SELECT id FROM control_admins'))).rows.length,2);
 assert.equal((await app.inject({method:'POST',url:'/api/control/operators',headers:h(control,true),payload:{}})).statusCode,404);
 await app.inject({method:'POST',url:'/api/control/auth/logout',headers:h(second,true)});
});

test('平台身份独立、最小数据库授权、匿名和企业Cookie不可进入平台',async()=>{
 assert.equal((await app.inject({url:'/api/control/tenants'})).statusCode,401);
 assert.equal((await app.inject({url:'/api/products',headers:h(control)})).statusCode,401);
 await assert.rejects(db.tenant({tenantId:randomUUID(),userId:randomUUID()},sql=>sql.query('SELECT * FROM control_admins')),/permission denied/);
 await assert.rejects(db.control(sql=>sql.query('SELECT password_hash FROM users')),/permission denied/);
 await assert.rejects(db.control(sql=>sql.query('SELECT * FROM products')),/permission denied/);
 await assert.rejects(db.control(sql=>sql.query('DELETE FROM control_audit')),/permission denied/);
});
test('企业与管理员、单位和配额原子创建；同请求重试不重复',async()=>{
 const b=payload('one');
 const noCsrf=await app.inject({method:'POST',url:'/api/control/tenants',headers:h(control),payload:b});assert.equal(noCsrf.statusCode,403);
 const origin=await app.inject({method:'POST',url:'/api/control/tenants',headers:{...h(control,true),origin:'https://foreign.invalid'},payload:b});assert.equal(origin.statusCode,403);
 const [r,retry]=await Promise.all([1,2].map(()=>app.inject({method:'POST',url:'/api/control/tenants',headers:h(control,true),payload:b})));
 assert.deepEqual([r!.statusCode,retry!.statusCode].sort(),[200,201]);assert.equal(r!.json().tenant.id,retry!.json().tenant.id);
 first=r!.json().tenant;firstAdmin=r!.json().admin.id;
 assert.ok(!r!.body.includes(password));
 const clash=await app.inject({method:'POST',url:'/api/control/tenants',headers:h(control,true),payload:{...b,name:'变更名字'}});assert.equal(clash.statusCode,409);
 const company=await login('/api/auth/login',{tenant_slug:first.slug,username:'tenant.one',password});
 assert.equal((await app.inject({url:'/api/control/tenants',headers:h(company)})).statusCode,401);
 assert.equal((await app.inject({url:'/api/units',headers:h(company)})).json().items.length,3);
 assert.equal((await app.inject({url:'/api/products',headers:h(company)})).json().total,0);
 const count=await db.admin(async sql=>(await sql.query<{n:string}>('SELECT count(*)::text AS n FROM control_audit WHERE action=\'tenant.provisioned\' AND tenant_id=$1',[first.id])).rows[0]!.n);assert.equal(count,'1');
});
test('重复账号和审计失败时企业、身份和初始化数据一起回滚',async()=>{
 const b=payload('duplicate');b.admin_username='tenant.one';
 const r=await app.inject({method:'POST',url:'/api/control/tenants',headers:h(control,true),payload:b});assert.equal(r.statusCode,409,r.body);
 assert.equal((await db.admin(sql=>sql.query('SELECT id FROM tenants WHERE slug=$1',[b.slug]))).rows.length,0);
 await db.admin(sql=>sql.exec("CREATE FUNCTION reject_control_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='tenant.provisioned' THEN RAISE EXCEPTION 'test rollback'; END IF; RETURN NEW; END $$; CREATE TRIGGER reject_control_audit BEFORE INSERT ON control_audit FOR EACH ROW EXECUTE FUNCTION reject_control_audit()"));
 try {
  const failed=payload('rollback');const response=await app.inject({method:'POST',url:'/api/control/tenants',headers:h(control,true),payload:failed});assert.equal(response.statusCode,500);
  assert.equal((await db.admin(sql=>sql.query('SELECT id FROM tenants WHERE slug=$1',[failed.slug]))).rows.length,0);
  assert.equal((await db.admin(sql=>sql.query('SELECT id FROM users WHERE username=$1',[failed.admin_username]))).rows.length,0);
 } finally {await db.admin(sql=>sql.exec('DROP TRIGGER reject_control_audit ON control_audit; DROP FUNCTION reject_control_audit()'));}
});
test('两企业管理员只属于各自企业，平台搜索分页不泄露密码',async()=>{
 const r=await app.inject({method:'POST',url:'/api/control/tenants',headers:h(control,true),payload:payload('two')});assert.equal(r.statusCode,201,r.body);
 const company=await login('/api/auth/login',{tenant_slug:first.slug,username:'tenant.one',password});
 const other=await app.inject({method:'POST',url:'/api/auth/switch-tenant',headers:h(company,true),payload:{tenant_id:r.json().tenant.id}});assert.equal(other.statusCode,403);
 const list=await app.inject({url:'/api/control/tenants?q=control-one&page_size=1',headers:h(control)});assert.equal(list.json().total,1);assert.equal(list.json().items[0].id,first.id);assert.equal(list.json().summary.total,2);
 const admins=await app.inject({url:`/api/control/tenants/${first.id}/admins`,headers:h(control)});assert.equal(admins.json().items[0].username,'tenant.one');assert.ok(!admins.body.includes('password_hash'));
});
test('停用企业立即注销旧会话、阻止登录；恢复也不复活旧会话，版本冲突拒绝',async()=>{
 const company=await login('/api/auth/login',{tenant_slug:first.slug,username:'tenant.one',password});
 const change={version:1,name:'暂停验收企业',active:false,reason:'测试停用'};
 const r=await app.inject({method:'PATCH',url:'/api/control/tenants/'+first.id,headers:h(control,true),payload:change});assert.equal(r.statusCode,200,r.body);
 assert.equal((await app.inject({url:'/api/products',headers:h(company)})).statusCode,401);
 const disabled=await app.inject({method:'POST',url:'/api/auth/login',payload:{tenant_slug:first.slug,username:'tenant.one',password}});assert.equal(disabled.statusCode,401);
 assert.equal((await app.inject({method:'PATCH',url:'/api/control/tenants/'+first.id,headers:h(control,true),payload:change})).statusCode,409);
 const restored=await app.inject({method:'PATCH',url:'/api/control/tenants/'+first.id,headers:h(control,true),payload:{...change,version:2,active:true}});assert.equal(restored.statusCode,200);
 assert.equal((await app.inject({url:'/api/products',headers:h(company)})).statusCode,401);
 await login('/api/auth/login',{tenant_slug:first.slug,username:'tenant.one',password});
});
test('新增企业管理员、保护最后管理员、停用和密码重置撤销会话',async()=>{
 const path=`/api/control/tenants/${first.id}/admins`;
 const disable=await app.inject({method:'PATCH',url:path+'/'+firstAdmin,headers:h(control,true),payload:{version:1,active:false,reason:'保护测试'}});assert.equal(disable.statusCode,409);assert.equal(disable.json().error.code,'LAST_ADMIN');
 const added=await app.inject({method:'POST',url:path,headers:h(control,true),payload:{username:'tenant.backup',display_name:'备用管理员',password}});assert.equal(added.statusCode,201,added.body);
 const original=await login('/api/auth/login',{tenant_slug:first.slug,username:'tenant.one',password});
 const suspended=await app.inject({method:'PATCH',url:path+'/'+firstAdmin,headers:h(control,true),payload:{version:1,active:false,reason:'停用原账号'}});assert.equal(suspended.statusCode,200,suspended.body);
 assert.equal((await app.inject({url:'/api/products',headers:h(original)})).statusCode,401);
 const backup=await login('/api/auth/login',{tenant_slug:first.slug,username:'tenant.backup',password});
 const newPassword='Reset-Password-Only-Test!';
 const reset=await app.inject({method:'POST',url:path+'/'+added.json().admin.id+'/password',headers:h(control,true),payload:{password:newPassword,reason:'重置测试'}});assert.equal(reset.statusCode,200,reset.body);
 assert.equal((await app.inject({url:'/api/products',headers:h(backup)})).statusCode,401);
 const wrong=await app.inject({method:'POST',url:'/api/auth/login',payload:{tenant_slug:first.slug,username:'tenant.backup',password}});assert.equal(wrong.statusCode,401);
 await login('/api/auth/login',{tenant_slug:first.slug,username:'tenant.backup',password:newPassword});
 const log=await app.inject({url:'/api/control/audit',headers:h(control)});assert.ok(log.json().items.some((e:{action:string})=>e.action==='tenant.admin.password_reset'));assert.ok(!log.body.includes(newPassword)&&!log.body.includes(password)&&!log.body.includes('password_hash'));
});
test('共享旧身份不能跨企业重置密码；不存在目标不写审计',async()=>{
 const second=(await db.admin(sql=>sql.query<{id:string}>('SELECT id FROM tenants WHERE slug=\'control-two\''))).rows[0]!.id;
 await db.admin(sql=>sql.query("INSERT INTO memberships(tenant_id,user_id,role) VALUES($1,$2,'admin')",[second,firstAdmin]));
 const r=await app.inject({method:'POST',url:`/api/control/tenants/${first.id}/admins/${firstAdmin}/password`,headers:h(control,true),payload:{password:'Must-Not-Change-Other!',reason:'共享保护'}});assert.equal(r.statusCode,409);assert.equal(r.json().error.code,'SHARED_IDENTITY');
 const missing=await app.inject({method:'POST',url:`/api/control/tenants/${first.id}/admins/${randomUUID()}/password`,headers:h(control,true),payload:{password:'Must-Not-Change-Other!',reason:'错目标'}});assert.equal(missing.statusCode,404);
});
test('生产Cookie、平台登录限流及退出后的旧Cookie拒绝',async()=>{
 const prod=await createApp(db,{production:true,origin:'https://platform.test',localEventsWorker:false});
 try {
  const p=await login('/api/control/auth/login',{username:'platform.test',password},prod);assert.ok(p.cookie.startsWith('__Host-gd_control_session='));
  const loginResponse=await prod.inject({method:'POST',url:'/api/control/auth/login',payload:{username:'platform.test',password}});const raw=String(loginResponse.headers['set-cookie']);assert.ok(raw.includes('Secure')&&raw.includes('HttpOnly')&&raw.includes('SameSite=Lax'));
 }finally{await prod.close();}
 for(let i=0;i<10;i++)await app.inject({method:'POST',url:'/api/control/auth/login',remoteAddress:'127.0.0.88',payload:{}});
 assert.equal((await app.inject({method:'POST',url:'/api/control/auth/login',remoteAddress:'127.0.0.88',payload:{}})).statusCode,429);
 assert.equal((await app.inject({method:'POST',url:'/api/control/auth/logout',headers:h(control,true)})).statusCode,200);
 assert.equal((await app.inject({url:'/api/control/tenants',headers:h(control)})).statusCode,401);
});
