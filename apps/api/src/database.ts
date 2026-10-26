import { PGlite } from '@electric-sql/pglite';
import { Pool, type PoolClient } from 'pg';

const policyNames:Record<string,string>={products:'products_tenant',units:'units_tenant',audit_events:'audits_tenant',processes:'processes_tenant',process_reporters:'process_reporters_tenant',process_routes:'process_routes_tenant',route_versions:'route_versions_tenant',route_steps:'route_steps_tenant',bom_definitions:'bom_definitions_tenant',bom_versions:'bom_versions_tenant',bom_items:'bom_items_tenant'};
Object.assign(policyNames,Object.fromEntries(['departments','workshops','production_lines','tenant_roles','tenant_member_profiles','tenant_onboard_requests','numbering_rules','numbering_counters','numbering_allocations','extension_schemas','extension_schema_versions','extension_schema_publications','product_field_values','user_views','user_view_history','tenant_service_limits','attachments','event_rules','local_event_outbox','user_notifications','customers','warehouses','document_counters','command_replays','sales_orders','sales_order_lines','work_orders','work_order_tasks','work_order_materials','production_reports','material_issues','material_issue_lines','fg_receipts','shipments','shipment_lines','stock_adjustments','inspections','stock_balances','stock_ledger','suppliers','purchase_orders','purchase_order_lines','purchase_receipts','purchase_receipt_lines','incoming_inspections','stock_cost_events','mrp_batches','mrp_lines','stock_reservations','reservation_consumptions','wage_rules','wage_rule_versions','wage_events','open_items','payments','payment_allocations','financial_events','wage_settlements','wage_settlement_lines','production_supplements','supplement_materials','rework_reports','business_settings','expense_documents','expense_cost_events','warehouse_transfers','stock_counts'].map(t=>[t,t+'_tenant'])));
const tenantTables=Object.keys(policyNames);

export type Sql = {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[]; rowCount: number }>;
  exec(sql: string): Promise<void>;
};
export type TenantContext = { tenantId: string; userId: string };
export type DatabaseOptions = { mode: 'pglite' | 'postgres'; dataDir?: string; url?: string; production?: boolean };

export class Database {
  private embedded?: PGlite;
  private pool?: Pool;
  readonly mode: DatabaseOptions['mode'];
  constructor(options: DatabaseOptions) {
    this.mode = options.mode;
    if (options.production && options.mode !== 'postgres') throw new Error('生产环境必须使用独立PostgreSQL服务');
    if (options.mode === 'pglite') this.embedded = new PGlite(options.dataDir ?? 'memory://');
    else {
      if (!options.url) throw new Error('缺少DATABASE_URL');
      this.pool = new Pool({ connectionString: options.url, max: 10, ...(options.production ? { ssl: { rejectUnauthorized: true } } : {}) });
    }
  }
  private async transaction<T>(role: 'gd_auth' | 'gd_tenant' | 'gd_platform' | 'gd_control' | undefined, context: TenantContext | undefined, work: (sql: Sql) => Promise<T>): Promise<T> {
    const setup = async (sql: Sql) => {
      if (role) await sql.exec('SET LOCAL ROLE ' + role);
      if (context) await sql.query("SELECT set_config('app.tenant_id', $1, true), set_config('app.user_id', $2, true)", [context.tenantId, context.userId]);
    };
    if (this.embedded) return this.embedded.transaction(async (tx) => {
      const sql: Sql = {
        query: async <R>(statement: string, params: unknown[] = []) => {
          const result = await tx.query<R>(statement, params);
          return { rows: result.rows, rowCount: result.affectedRows ?? result.rows.length };
        },
        exec: async (statement) => { await tx.exec(statement); },
      };
      await setup(sql);
      return work(sql);
    });
    const client: PoolClient = await this.pool!.connect();
    try {
      await client.query('BEGIN');
      const sql: Sql = {
        query: async <R>(statement: string, params: unknown[] = []) => {
          const result = await client.query(statement, params);
          return { rows: result.rows as R[], rowCount: result.rowCount ?? result.rows.length };
        },
        exec: async (statement) => { await client.query(statement); },
      };
      await setup(sql);
      const result = await work(sql);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }
  auth<T>(work: (sql: Sql) => Promise<T>) { return this.transaction('gd_auth', undefined, work); }
  tenant<T>(context: TenantContext, work: (sql: Sql) => Promise<T>) { return this.transaction('gd_tenant', context, work); }
  identity<T>(context:TenantContext,work:(sql:Sql)=>Promise<T>){return this.transaction('gd_platform',context,work);}
  control<T>(work:(sql:Sql)=>Promise<T>){return this.transaction('gd_control',undefined,work);}
  admin<T>(work: (sql: Sql) => Promise<T>) { return this.transaction(undefined, undefined, work); }
  async assertSecurityConfiguration() {
    await this.admin(async (sql) => {
      const roles = (await sql.query<{ rolname:string; unsafe:boolean }>("SELECT rolname, rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb OR rolcanlogin OR rolinherit OR EXISTS(SELECT 1 FROM pg_auth_members m WHERE m.member=r.oid) AS unsafe FROM pg_roles r WHERE rolname IN ('gd_auth','gd_tenant','gd_platform','gd_directory','gd_control')")).rows;
      if (roles.length !== 5 || roles.some((role) => role.unsafe)) throw new Error('运行角色必须是无特权、不可登录且不继承其他角色的安全角色');
      const tables = (await sql.query<{ name:string; safe:boolean }>("SELECT c.relname AS name,c.relrowsecurity AND c.relforcerowsecurity AND o.rolname NOT IN ('gd_auth','gd_tenant','gd_platform') AS safe FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_roles o ON o.oid=c.relowner WHERE n.nspname='public' AND c.relname  = ANY($1::text[])",[tenantTables])).rows;
      if (tables.length !== tenantTables.length || tables.some((table) => !table.safe)) throw new Error('业务表必须强制RLS且不得属于运行角色');
      const appendOnly = (await sql.query<{ unsafe: boolean }>("SELECT bool_or(has_any_column_privilege('gd_tenant',c.oid,'UPDATE') OR has_table_privilege('gd_tenant',c.oid,'DELETE') OR has_table_privilege('gd_tenant',c.oid,'TRUNCATE')) AS unsafe FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=ANY($1::text[])", [['stock_ledger','command_replays','stock_cost_events','reservation_consumptions','wage_rule_versions','wage_events','financial_events','supplement_materials','expense_cost_events']])).rows[0];
      if (appendOnly?.unsafe) throw new Error('库存流水与命令记录必须只追加，运行角色不得修改列、删除或清空');
      const policies = (await sql.query<{ tablename:string; policyname:string; roles:string[]; cmd:string; permissive:string; qual:string; with_check:string }>("SELECT tablename,policyname,roles,cmd,permissive,qual,with_check FROM pg_policies WHERE schemaname='public' AND tablename  = ANY($1::text[])",[tenantTables])).rows;
      const normalize = (value:string) => value.replace(/[\s()]/g,'').toLowerCase();
      const expected = normalize("tenant_id::text = nullif(current_setting('app.tenant_id'::text,true),''::text)");
      const memberView=(await sql.query<{definition:string;safe:boolean}>("SELECT pg_get_viewdef(c.oid,true) AS definition,c.reloptions @> ARRAY['security_barrier=true'] AND o.rolname NOT IN ('gd_auth','gd_tenant','gd_platform') AS safe FROM pg_class c JOIN pg_roles o ON o.oid=c.relowner JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='tenant_team_members' AND c.relkind='v' AND o.rolname='gd_directory'")).rows[0];
      const expectedView=normalize("SELECT u.id,u.display_name,m.role FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.tenant_id::text=NULLIF(current_setting('app.tenant_id'::text,true),''::text) AND m.active AND u.active;");
      const exposed=(await sql.query<{unsafe:boolean}>("SELECT bool_or(has_table_privilege('gd_tenant',c.oid,'SELECT')) AS unsafe FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('users','memberships','tenants','sessions')")).rows[0];
      if(!memberView?.safe||normalize(memberView.definition)!==expectedView||exposed?.unsafe)throw new Error('企业成员视图或全局身份表授权不符合安全基线');
      const sealDefinitions:Record<string,{table:string;fn:string;type:number;deferred:boolean}>={
        route_steps_no_append:{table:'route_steps',fn:'prevent_saved_version_append',type:7,deferred:false},
        bom_items_no_append:{table:'bom_items',fn:'prevent_saved_version_append',type:7,deferred:false},
        route_version_complete:{table:'route_versions',fn:'require_complete_version',type:5,deferred:true},
        bom_version_complete:{table:'bom_versions',fn:'require_complete_version',type:5,deferred:true},
        route_header_complete:{table:'process_routes',fn:'require_complete_header',type:21,deferred:true},
        bom_header_complete:{table:'bom_definitions',fn:'require_complete_header',type:21,deferred:true},
        route_pointer_monotonic:{table:'process_routes',fn:'protect_version_pointer',type:19,deferred:false},
        bom_pointer_monotonic:{table:'bom_definitions',fn:'protect_version_pointer',type:19,deferred:false},
      };
      const seals=(await sql.query<{name:string;table:string;fn:string;type:number;deferred:boolean;safe:boolean}>("SELECT t.tgname AS name,c.relname AS table,p.proname AS fn,t.tgtype::integer AS type,t.tgdeferrable AND t.tginitdeferred AS deferred,t.tgenabled='O' AND t.tgqual IS NULL AND NOT p.prosecdef AND pn.nspname='public' AND owner.rolname NOT IN ('gd_auth','gd_tenant','gd_platform') AS safe FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_namespace pn ON pn.oid=p.pronamespace JOIN pg_roles owner ON owner.oid=p.proowner WHERE n.nspname='public' AND t.tgname=ANY($1::text[]) AND NOT t.tgisinternal",[Object.keys(sealDefinitions)])).rows;
      if(seals.length!==8||seals.some(t=>{const expected=sealDefinitions[t.name];return !expected||!t.safe||t.table!==expected.table||t.fn!==expected.fn||t.type!==expected.type||t.deferred!==expected.deferred;}))throw new Error('历史版本封存触发器不符合安全基线');
      const identity=(await sql.query<{safe:boolean}>("SELECT c.relrowsecurity AND c.relforcerowsecurity AND o.rolname NOT IN ('gd_auth','gd_tenant','gd_platform') AND NOT has_column_privilege('gd_platform','users','password_hash','SELECT') AND NOT has_table_privilege('gd_platform','users','UPDATE') AND NOT has_table_privilege('gd_auth','memberships','UPDATE') AS safe FROM pg_class c JOIN pg_roles o ON o.oid=c.relowner WHERE c.oid='public.memberships'::regclass")).rows[0];
      const membershipPolicies=(await sql.query<{policyname:string;roles:string[];cmd:string;qual:string;with_check:string}>("SELECT policyname,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname='public' AND tablename='memberships'")).rows;
      if(!identity?.safe||membershipPolicies.length!==4||!membershipPolicies.some(p=>p.policyname==='memberships_auth_read'&&p.roles.length===1&&p.roles[0]==='gd_auth'&&p.cmd==='SELECT'&&normalize(p.qual)==='true')||!membershipPolicies.some(p=>p.policyname==='memberships_platform_tenant'&&p.roles.length===1&&p.roles[0]==='gd_platform'&&p.cmd==='ALL'&&normalize(p.qual)===expected&&normalize(p.with_check)===expected))throw new Error('身份管理角色或企业成员隔离策略不符合安全基线');
      if(!membershipPolicies.some(p=>p.policyname==='memberships_control'&&p.roles.length===1&&p.roles[0]==='gd_control'&&p.cmd==='ALL'&&normalize(p.qual)==='true'&&normalize(p.with_check)==='true'))throw new Error('独立平台企业管理策略不符合基线');
      const controlUnsafe=(await sql.query<{unsafe:boolean}>("SELECT has_column_privilege('gd_control','users','password_hash','SELECT') OR has_table_privilege('gd_control','products','SELECT') OR has_table_privilege('gd_control','control_audit','UPDATE') OR has_table_privilege('gd_control','control_audit','DELETE') OR EXISTS(SELECT 1 FROM (VALUES('gd_auth'),('gd_tenant'),('gd_platform'),('gd_directory')) AS r(name) CROSS JOIN (VALUES('control_admins'),('control_sessions'),('control_audit'),('control_provision_requests')) AS t(name) WHERE has_any_column_privilege(r.name,t.name,'SELECT') OR has_table_privilege(r.name,t.name,'INSERT') OR has_table_privilege(r.name,t.name,'UPDATE') OR has_table_privilege(r.name,t.name,'DELETE')) AS unsafe")).rows[0];
      if(controlUnsafe?.unsafe)throw new Error('平台运营身份、审计和企业业务授权不符合隔离基线');
      const pairGuards=(await sql.query<{safe:boolean}>("SELECT count(*)=2 AS safe FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid WHERE t.tgrelid='control_admins'::regclass AND t.tgenabled='O' AND NOT p.prosecdef AND ((t.tgname='control_admin_pair' AND t.tgdeferrable AND t.tginitdeferred AND t.tgtype=29 AND p.proname='require_control_admin_pair') OR (t.tgname='control_admin_no_truncate' AND t.tgtype=34 AND p.proname='prevent_control_admin_truncate'))")).rows[0];
      const pairSlots=(await sql.query<{safe:boolean}>("SELECT (SELECT count(*)=2 FROM pg_constraint WHERE conrelid='control_admins'::regclass AND conname IN ('control_admins_slot_check','control_admins_slot_unique')) AND (SELECT attnotnull FROM pg_attribute WHERE attrelid='control_admins'::regclass AND attname='slot') AS safe")).rows[0];
      if(!pairGuards?.safe||!pairSlots?.safe)throw new Error('平台运营管理员必须保持固定两个账号的数据库约束');
      if(!membershipPolicies.some(p=>p.policyname==='memberships_directory_read'&&p.roles.length===1&&p.roles[0]==='gd_directory'&&p.cmd==='SELECT'&&normalize(p.qual)===expected))throw new Error('受限目录所有者的成员读取策略不符合基线');
      const eventTrigger=(await sql.query<{safe:boolean}>("SELECT t.tgenabled='O' AND t.tgtype=5 AND t.tgqual IS NULL AND p.proname='enqueue_local_audit_event' AND NOT p.prosecdef AND po.rolname NOT IN ('gd_auth','gd_tenant','gd_platform','gd_directory') AS safe FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_roles po ON po.oid=p.proowner WHERE t.tgname='audit_local_event' AND t.tgrelid='public.audit_events'::regclass AND NOT t.tgisinternal")).rows[0];
      if(!eventTrigger?.safe)throw new Error('本地审计事件队列触发器不符合可靠性基线');
      const names = policyNames;
      if (policies.length !== tenantTables.length || policies.some((policy) => names[policy.tablename] !== policy.policyname || policy.roles.length !== 1 || policy.roles[0] !== 'gd_tenant' || policy.cmd !== 'ALL' || policy.permissive !== 'PERMISSIVE' || normalize(policy.qual??'') !== expected || normalize(policy.with_check??'') !== expected)) {
        throw new Error('RLS策略与当前迁移基线不一致，拒绝启动');
      }
    });
  }

  async assertProductionRole() {
    await this.assertSecurityConfiguration();
    await this.admin(async (sql) => {
      const row = (await sql.query<{ unsafe: boolean }>("SELECT rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb OR EXISTS (SELECT 1 FROM pg_class c WHERE c.relowner = r.oid AND c.relname  = ANY($1::text[])) AS unsafe FROM pg_roles r WHERE rolname = current_user",[[...tenantTables,'tenant_team_members','tenants','users','memberships','sessions','schema_migrations','control_admins','control_sessions','control_audit','control_provision_requests']])).rows[0];
      if (!row || row.unsafe) throw new Error('生产应用数据库账号不能是超级用户、BYPASSRLS或业务表所有者');
      const ownsFunction=(await sql.query<{owned:boolean}>("SELECT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_roles r ON r.oid=p.proowner JOIN pg_namespace n ON n.oid=p.pronamespace WHERE r.rolname=current_user AND n.nspname='public' AND p.proname IN ('prevent_saved_version_append','require_complete_version','protect_version_pointer','require_complete_header','enqueue_local_audit_event')) AS owned")).rows[0];
      if(ownsFunction?.owned)throw new Error('生产运行账号不能拥有历史版本封存函数');
      const grants = (await sql.query<{ auth: boolean; tenant: boolean; platform:boolean; control:boolean }>("SELECT pg_has_role(current_user,'gd_auth','MEMBER') AS auth, pg_has_role(current_user,'gd_tenant','MEMBER') AS tenant, pg_has_role(current_user,'gd_platform','MEMBER') AS platform,pg_has_role(current_user,'gd_control','MEMBER') AS control")).rows[0];
      if (!grants?.auth || !grants.tenant || !grants.platform || !grants.control) throw new Error('应用账号缺少gd_auth/gd_tenant/gd_platform/gd_control角色授权');
    });
  }
  async close() { if (this.embedded) await this.embedded.close(); else await this.pool!.end(); }
}






