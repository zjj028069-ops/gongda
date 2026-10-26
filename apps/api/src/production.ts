import { createHash } from 'node:crypto';
import { postStock,releaseReservations } from './inventory.js';
import {lineCents,round as roundMoney,rate as priceRate,money as cashMoney} from './business-common.js';
import { freezeWage,wageView,postWage,workCosts,type WageSnapshot } from './accounting.js';
import type { FastifyInstance } from 'fastify';
import type { Sql } from './database.js';
import { decimal, formatDecimal, SCALE, bounded } from './decimal.js';
import { gateTenantWrite } from './assets.js';
import { Problem, requireAllScope, writeAudit, type Actor, type Services } from './services.js';

const uuid = { type: 'string', format: 'uuid' };
const text = (max: number) => ({ type: 'string', minLength: 1, maxLength: max, pattern: '^\\S(?:.*\\S)?$' });
const note = { type: 'string', maxLength: 2000 };
const reasonText = { type: 'string', minLength: 1, maxLength: 500 };
const decimalField = { type: 'string', pattern: '^(?:0|[1-9]\\d{0,13})(?:\\.\\d{1,6})?$' };
const requestKey = { type: 'string', minLength: 8, maxLength: 80, pattern: '^[A-Za-z0-9_.-]+$' };
const versionField = { type: 'integer', minimum: 1 };
const object = (required: string[], properties: Record<string, unknown>, optional: string[] = []) => ({ type: 'object', additionalProperties: false, required, properties: Object.fromEntries([...required, ...optional].map((key) => [key, properties[key]])) });
const idParams = object(['id'], { id: uuid });
const dateField = { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' };

type Leaf = { product_id: string; unit_id: string; code: string; name: string; unit_name: string; amount: bigint; paths: string[]; feeding: string | null; ambiguous: boolean };
type BomItemRow = { component_product_id: string; unit_id: string; component_code: string; component_name: string; unit_name: string; quantity: string; loss_rate: string; feeding_process_id: string | null; component_bom_version_id: string | null };
type StepRow = { id: string; sequence: number; process_id: string; process_code: string; process_name: string; standard_minutes: string; reporter_ids: string[]; auto_inbound: boolean };
type TaskRow = { id: string; work_order_id: string; sequence: number; route_step_id: string; process_id: string; process_snapshot: Record<string, unknown>; unit_ratio: string; plan_qty: string; is_output: boolean; execution: string; pause_source: string; previous_execution: string | null; approved_good: string; approved_defect: string; approved_rework: string; approved_scrap: string; version: number };
type WoRow = { id: string; code: string; product_id: string; unit_id: string; plan_qty: string; sales_order_id: string; sales_line_id: string; route_version_id: string; bom_version_id: string; warehouse_id: string; product_snapshot: Record<string, unknown>; route_name_snapshot: string; bom_revision: number; execution: string; order_paused: boolean; requires_fg_inspection: boolean; close_reason: string; version: number; started_at: string | null; completed_at: string | null; created_at: string };

const permit = (actor: Actor, permission: string) => { if (!actor.permissions.includes(permission)) throw new Problem(403, 'FORBIDDEN', '当前角色没有操作权限'); };
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const q = (value: string) => decimal(value.trim());
const money = (quantity: bigint, price: bigint) => { const rounded = (quantity * price + 5_000_000_000n) / 10_000_000_000n; return `${rounded / 100n}.${(rounded % 100n).toString().padStart(2, '0')}`; };
const mulCeil = (a: bigint, b: bigint) => bounded((a * b + SCALE - 1n) / SCALE);
const divFloor = (a: bigint, b: bigint) => { if (b <= 0n) throw new Problem(422, 'UNIT_RATIO', '任务单位关系必须为正数'); return (a * SCALE) / b; };
const needReason = (reason: string | undefined, message: string) => { const value = reason?.trim() ?? ''; if (!value) throw new Problem(422, 'REASON_REQUIRED', message); return value; };
function calendarDate(value: string | null | undefined) {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year!, (month ?? 1) - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== (month ?? 1) - 1 || date.getUTCDate() !== day) throw new Problem(422, 'INVALID_DATE', '计划日期不是有效公历日期');
  return value;
}

async function nextCode(sql: Sql, tenantId: string, docType: string, prefix: string) {
  await sql.query('INSERT INTO document_counters(tenant_id,doc_type,next_value) VALUES($1,$2,1) ON CONFLICT(tenant_id,doc_type) DO NOTHING', [tenantId, docType]);
  const row = (await sql.query<{ n: string }>('SELECT next_value::text AS n FROM document_counters WHERE doc_type=$1 FOR UPDATE', [docType])).rows[0];
  if (!row) throw new Problem(500, 'NUMBER_FAILED', '单据编号未能生成');
  const sequence = BigInt(row.n);
  await sql.query('UPDATE document_counters SET next_value=$1 WHERE doc_type=$2', [(sequence + 1n).toString(), docType]);
  return prefix + sequence.toString().padStart(6, '0');
}
async function beginCommand(sql: Sql, command: string, requestKeyValue: string, payloadHash: string) {
  const existing = (await sql.query<{ resource_id: string; payload_hash: string }>('SELECT resource_id,payload_hash FROM command_replays WHERE command=$1 AND request_key=$2', [command, requestKeyValue])).rows[0];
  if (!existing) return null;
  if (existing.payload_hash !== payloadHash) throw new Problem(409, 'REQUEST_KEY_CONFLICT', '同一请求标识不能用于不同内容');
  return existing.resource_id;
}
async function finishCommand(sql: Sql, tenantId: string, command: string, requestKeyValue: string, payloadHash: string, resourceType: string, resourceId: string) {
  await sql.query('INSERT INTO command_replays(tenant_id,command,request_key,payload_hash,resource_type,resource_id) VALUES($1,$2,$3,$4,$5,$6)', [tenantId, command, requestKeyValue, payloadHash, resourceType, resourceId]);
}
async function loadBom(sql: Sql, id: string) {
  const version = (await sql.query<{ id: string; bom_id: string; revision: number; route_version_id: string | null; output_quantity: string; parent_snapshot: { id: string; code: string; name: string; unit_id: string; unit_name: string; attribute: string } }>('SELECT id,bom_id,revision,route_version_id,output_quantity::text,parent_snapshot FROM bom_versions WHERE id=$1', [id])).rows[0];
  if (!version) throw new Problem(404, 'BOM_VERSION_NOT_FOUND', 'BOM版本不存在');
  if (!(await sql.query('SELECT id FROM bom_definitions WHERE id=$1 AND active', [version.bom_id])).rows[0]) throw new Problem(422, 'INACTIVE_REFERENCE', '停用的BOM不能用于下达新加工单，历史加工单快照继续保留');
  const items = (await sql.query<BomItemRow>("SELECT component_product_id,unit_id,component_snapshot->>'code' AS component_code,component_snapshot->>'name' AS component_name,component_snapshot->>'unit_name' AS unit_name,quantity::text,loss_rate::text,feeding_process_id,component_bom_version_id FROM bom_items WHERE version_id=$1 ORDER BY sequence", [id])).rows;
  return { version, items };
}
async function explode(sql: Sql, versionId: string, quantity: string) {
  const amount = decimal(quantity, { positive: true });
  const requirements = new Map<string, Leaf>();
  const cache = new Map<string, Awaited<ReturnType<typeof loadBom>>>();
  let nodes = 0;
  const visit = async (id: string, qty: bigint, ancestry: string[], path: string[]) => {
    if (++nodes > 10000 || ancestry.length > 32) throw new Problem(422, 'BOM_COMPLEXITY', 'BOM层级或节点过多');
    let data = cache.get(id);
    if (!data) { data = await loadBom(sql, id); cache.set(id, data); }
    const parent = data.version.parent_snapshot;
    if (ancestry.includes(parent.id)) throw new Problem(422, 'BOM_CYCLE', 'BOM存在产品循环引用');
    const next = [...ancestry, parent.id];
    const denominator = SCALE * decimal(data.version.output_quantity, { positive: true });
    for (const item of data.items) {
      if (++nodes > 10000) throw new Problem(422, 'BOM_COMPLEXITY', 'BOM节点过多');
      if (next.includes(item.component_product_id)) throw new Problem(422, 'BOM_CYCLE', 'BOM存在产品循环引用');
      const numerator = qty * decimal(item.quantity, { positive: true }) * (SCALE + decimal(item.loss_rate, { max: SCALE }));
      const needed = bounded((numerator + denominator - 1n) / denominator);
      if (item.component_bom_version_id) await visit(item.component_bom_version_id, needed, next, [...path, parent.code]);
      else {
        const key = `${item.component_product_id}:${item.unit_id}`;
        const linePath = [...path, parent.code, item.component_code].join(' → ');
        const current = requirements.get(key);
        if (current) {
          current.amount = bounded(current.amount + needed);
          current.paths.push(linePath);
          if (current.feeding !== item.feeding_process_id) { current.feeding = null; current.ambiguous = true; }
        } else requirements.set(key, { product_id: item.component_product_id, unit_id: item.unit_id, code: item.component_code, name: item.component_name, unit_name: item.unit_name, amount: needed, paths: [linePath], feeding: item.feeding_process_id, ambiguous: false });
      }
    }
  };
  await visit(versionId, amount, [], []);
  if (!requirements.size) throw new Problem(422, 'BOM_EMPTY', '冻结后的物料需求为空');
  return [...requirements.values()].sort((a, b) => a.code.localeCompare(b.code));
}
async function routeSteps(sql: Sql, versionId: string) {
  const version = (await sql.query<{ id: string; route_id: string; revision: number; name_snapshot: string }>('SELECT id,route_id,revision,name_snapshot FROM route_versions WHERE id=$1', [versionId])).rows[0];
  if (!version) throw new Problem(404, 'ROUTE_VERSION_NOT_FOUND', '路线版本不存在');
  if (!(await sql.query('SELECT id FROM process_routes WHERE id=$1 AND active', [version.route_id])).rows[0]) throw new Problem(422, 'INACTIVE_REFERENCE', '停用的路线不能用于下达新加工单');
  const steps = (await sql.query<StepRow>("SELECT id,sequence,process_id,process_snapshot->>'code' AS process_code,process_snapshot->>'name' AS process_name,process_snapshot->>'standard_minutes' AS standard_minutes,process_snapshot->'reporter_ids' AS reporter_ids,auto_inbound FROM route_steps WHERE version_id=$1 ORDER BY sequence", [versionId])).rows;
  if (!steps.length) throw new Problem(422, 'ROUTE_EMPTY', '路线版本没有工序');
  if ((await sql.query('SELECT id FROM processes WHERE id=ANY($1::uuid[]) AND NOT active LIMIT 1', [steps.map((step) => step.process_id)])).rows[0]) throw new Problem(422, 'INACTIVE_REFERENCE', '冻结路线包含已停用工序，不能下达新加工单');
  return { version, steps };
}
async function activeWarehouse(sql: Sql, id: string) {
  const row = (await sql.query<{ id: string; code: string; name: string }>('SELECT id,code,name FROM warehouses WHERE id=$1 AND active', [id])).rows[0];
  if (!row) throw new Problem(422, 'INVALID_REFERENCE', '仓库不存在、已停用或不属于当前企业');
  return row;
}
async function activeProduct(sql: Sql, id: string) {
  const row = (await sql.query<{ id: string; code: string; name: string; unit_id: string; unit_name: string; attribute: string }>('SELECT p.id,p.code,p.name,p.unit_id,u.name AS unit_name,p.attribute FROM products p JOIN units u ON u.tenant_id=p.tenant_id AND u.id=p.unit_id WHERE p.id=$1 AND p.active AND u.active', [id])).rows[0];
  if (!row) throw new Problem(422, 'INVALID_REFERENCE', '产品不存在、已停用或不属于当前企业');
  return row;
}

async function salesView(sql: Sql, id: string) {
  const order = (await sql.query<{ id: string; code: string; customer_id: string; customer_name: string; lifecycle: string; approval: string; note: string; promised_date: string | null; close_reason: string; version: number; created_at: string }>('SELECT o.id,o.code,o.customer_id,c.name AS customer_name,o.lifecycle,o.approval,o.note,o.promised_date::text,o.close_reason,o.version,o.created_at FROM sales_orders o JOIN customers c ON c.tenant_id=o.tenant_id AND c.id=o.customer_id WHERE o.id=$1', [id])).rows[0];
  if (!order) throw new Problem(404, 'SALES_ORDER_NOT_FOUND', '销售订单不存在');
  const lines = (await sql.query('SELECT id,line_no,product_id,product_snapshot,quantity::text,unit_price::text,extended_amount::text,scheduled_qty::text,shipped_qty::text FROM sales_order_lines WHERE order_id=$1 ORDER BY line_no', [id])).rows.map((line) => { const snap = line.product_snapshot as { code: string; name: string; unit_name: string }; return { id: line.id, line_no: line.line_no, product_id: line.product_id, product_code: snap.code, product_name: snap.name, unit_name: snap.unit_name, quantity: formatDecimal(q(String(line.quantity))), unit_price: formatDecimal(q(String(line.unit_price))), extended_amount: String(line.extended_amount), scheduled_qty: formatDecimal(q(String(line.scheduled_qty))), shipped_qty: formatDecimal(q(String(line.shipped_qty))) }; });
  return { order: { ...order, lines, persisted: true, effective: order.approval === 'approved' && (order.lifecycle === 'open' || order.lifecycle === 'closed') } };
}
async function taskViews(sql: Sql, workOrderId: string) {
  const tasks = (await sql.query<TaskRow>('SELECT id,work_order_id,sequence,route_step_id,process_id,process_snapshot,unit_ratio::text,plan_qty::text,is_output,execution,pause_source,previous_execution,wage_rule_version_id,approved_good::text,approved_defect::text,approved_rework::text,approved_scrap::text,version FROM work_order_tasks WHERE work_order_id=$1 ORDER BY sequence', [workOrderId])).rows;
  return tasks.map((task) => {
    const good = q(task.approved_good), plan = q(task.plan_qty), ratio = q(task.unit_ratio);
    const snap = task.process_snapshot;
    return { ...task, unit_ratio: formatDecimal(ratio), plan_qty: formatDecimal(plan), approved_good: formatDecimal(good), approved_defect: formatDecimal(q(task.approved_defect)), approved_rework: formatDecimal(q(task.approved_rework)), approved_scrap: formatDecimal(q(task.approved_scrap)), output_qty: formatDecimal(divFloor(good, ratio)), good_ratio: plan === 0n ? null : formatDecimal(divFloor(good, plan)), auto_inbound_executed: false, process_code: snap.code, process_name: snap.name };
  });
}
async function workOrderView(sql: Sql, id: string) {
  const order = (await sql.query<WoRow>('SELECT id,code,product_id,unit_id,plan_qty::text,sales_order_id,sales_line_id,route_version_id,bom_version_id,warehouse_id,product_snapshot,route_name_snapshot,bom_revision,execution,order_paused,requires_fg_inspection,close_reason,version,started_at,completed_at,created_at FROM work_orders WHERE id=$1', [id])).rows[0];
  if (!order) throw new Problem(404, 'WORK_ORDER_NOT_FOUND', '加工单不存在');
  const tasks = await taskViews(sql, id);
  const materials = (await sql.query<{ id: string; product_id: string; unit_id: string; required_qty: string; issued_qty: string; feeding_process_id: string | null; feeding_task_id: string | null; feeding_ambiguous: boolean; component_snapshot: { code: string; name: string; unit_name: string }; source_paths: string[] }>('SELECT id,product_id,unit_id,required_qty::text,issued_qty::text,feeding_process_id,feeding_task_id,feeding_ambiguous,component_snapshot,source_paths FROM work_order_materials WHERE work_order_id=$1 ORDER BY component_snapshot->>\'code\'', [id])).rows.map((row) => ({ ...row, required_qty: formatDecimal(q(row.required_qty)), issued_qty: formatDecimal(q(row.issued_qty)), product_code: row.component_snapshot.code, product_name: row.component_snapshot.name, unit_name: row.component_snapshot.unit_name }));
  const output = tasks.find((task) => task.is_output);
  const received = q((await sql.query<{ n: string }>("SELECT coalesce(sum(quantity),0)::text AS n FROM fg_receipts WHERE work_order_id=$1 AND approval='approved'", [id])).rows[0]!.n);
  const cost=await workCosts(sql,id);
  return { work_order: { ...order, plan_qty: formatDecimal(q(order.plan_qty)), tasks, materials, output_qty: output?.output_qty ?? '0.000000', received_qty: formatDecimal(received), persisted: true, wage_status:cost.wage_status, cost_status:cost.cost_status, auto_inbound_executed: false } };
}
async function lockWorkOrder(sql: Sql, id: string, version?: number) {
  const row = (await sql.query<WoRow>('SELECT id,code,product_id,unit_id,plan_qty::text,sales_order_id,sales_line_id,route_version_id,bom_version_id,warehouse_id,product_snapshot,route_name_snapshot,bom_revision,execution,order_paused,requires_fg_inspection,close_reason,version,started_at,completed_at,created_at FROM work_orders WHERE id=$1 FOR UPDATE', [id])).rows[0];
  if (!row) throw new Problem(404, 'WORK_ORDER_NOT_FOUND', '加工单不存在');
  if (version !== undefined && row.version !== version) throw new Problem(409, 'VERSION_CONFLICT', '加工单已被修改，请刷新');
  return row;
}
async function tasksOf(sql: Sql, workOrderId: string) {
  return (await sql.query<TaskRow>('SELECT id,work_order_id,sequence,route_step_id,process_id,process_snapshot,unit_ratio::text,plan_qty::text,is_output,execution,pause_source,previous_execution,wage_rule_version_id,approved_good::text,approved_defect::text,approved_rework::text,approved_scrap::text,version FROM work_order_tasks WHERE work_order_id=$1 ORDER BY sequence FOR UPDATE', [workOrderId])).rows;
}
async function syncExecution(sql: Sql, workOrderId: string) {
  const order = await lockWorkOrder(sql, workOrderId);
  if (order.execution === 'cancelled' || order.execution === 'completed') return;
  let tasks = await tasksOf(sql, workOrderId);
  if (!order.order_paused) {
    const doneBefore = (sequence: number) => tasks.every((task) => task.sequence >= sequence || task.execution === 'completed');
    if (!tasks.some((task) => task.execution === 'running')) {
      const next = tasks.find((task) => task.execution === 'not_started' && doneBefore(task.sequence));
      if (next) {
        await sql.query("UPDATE work_order_tasks SET execution='running',version=version+1 WHERE id=$1", [next.id]);
        tasks = await tasksOf(sql, workOrderId);
      }
    }
  }
  const execution = tasks.some((task) => task.execution === 'running') ? 'running' : order.order_paused || tasks.some((task) => task.execution === 'paused') ? 'paused' : tasks.every((task) => task.execution === 'not_started') ? 'not_started' : 'running';
  await sql.query('UPDATE work_orders SET execution=$1,started_at=CASE WHEN $1=\'running\' AND started_at IS NULL THEN now() ELSE started_at END,version=version+1,updated_at=now() WHERE id=$2', [execution, workOrderId]);
}
export async function refreshTaskQuantities(sql: Sql, taskId: string, sync = true) {
  const sums = (await sql.query<{ good: string; defect: string; rework: string; scrap: string; pending: string; undisposed: string }>("SELECT coalesce(sum(good_qty) FILTER (WHERE approval='approved'),0)::text AS good,coalesce(sum(defect_qty) FILTER (WHERE approval='approved'),0)::text AS defect,coalesce(sum(rework_qty) FILTER (WHERE approval='approved'),0)::text AS rework,coalesce(sum(scrap_qty) FILTER (WHERE approval='approved'),0)::text AS scrap,count(*) FILTER (WHERE approval='pending')::text AS pending,count(*) FILTER (WHERE approval='approved' AND defect_qty>rework_qty+scrap_qty)::text AS undisposed FROM production_reports WHERE task_id=$1", [taskId])).rows[0]!;
  const task = (await sql.query<TaskRow>('SELECT id,work_order_id,sequence,route_step_id,process_id,process_snapshot,unit_ratio::text,plan_qty::text,is_output,execution,pause_source,previous_execution,wage_rule_version_id,approved_good::text,approved_defect::text,approved_rework::text,approved_scrap::text,version FROM work_order_tasks WHERE id=$1 FOR UPDATE', [taskId])).rows[0];
  if (!task) throw new Problem(404, 'TASK_NOT_FOUND', '生产任务不存在');
  const repairs=(await sql.query<{good:string;pending:string}>("SELECT coalesce(sum(good_qty) FILTER(WHERE approval='approved'),0)::text AS good,count(*) FILTER(WHERE approval='pending')::text AS pending FROM rework_reports WHERE task_id=$1",[taskId])).rows[0]!;
  sums.pending=(BigInt(sums.pending)+BigInt(repairs.pending)).toString();
  const good = q(sums.good)+q(repairs.good), plan = q(task.plan_qty);
  let execution = task.execution;
  if (task.execution === 'running' && good >= plan && sums.pending === '0' && sums.undisposed === '0') execution = 'completed';
  if (task.execution === 'completed' && (good < plan || sums.pending !== '0' || sums.undisposed !== '0') && task.pause_source === 'none') execution = 'running';
  await sql.query('UPDATE work_order_tasks SET approved_good=$1,approved_defect=$2,approved_rework=$3,approved_scrap=$4,execution=$5,version=version+1 WHERE id=$6', [formatDecimal(good), formatDecimal(q(sums.defect)), formatDecimal(q(sums.rework)), formatDecimal(q(sums.scrap)), execution, taskId]);
  const order = await lockWorkOrder(sql, task.work_order_id);
  if (execution !== 'completed') {
    await sql.query("UPDATE work_order_tasks SET execution='not_started',version=version+1 WHERE work_order_id=$1 AND sequence>$2 AND execution='running' AND pause_source='none' AND NOT EXISTS (SELECT 1 FROM production_reports r WHERE r.task_id=work_order_tasks.id AND r.approval IN ('pending','approved'))", [task.work_order_id, task.sequence]);
  }
  if (sync && order.execution !== 'completed' && order.execution !== 'cancelled') await syncExecution(sql, task.work_order_id);
}
export async function assertOperator(sql: Sql, actor: Actor, processId: string, operatorId: string) {
  if (!(await sql.query('SELECT id FROM tenant_team_members WHERE id=$1', [operatorId])).rows[0]) throw new Problem(422, 'INVALID_OPERATOR', '实际操作者不是本企业启用成员');
  if (!(await sql.query('SELECT 1 FROM process_reporters WHERE process_id=$1 AND user_id=$2', [processId, operatorId])).rows[0]) throw new Problem(403, 'PROCESS_QUALIFICATION', '实际操作者没有该工序的当前报工资格；历史路线快照不能代替当前授权');
  if (operatorId !== actor.user_id && !actor.permissions.includes('production.approve')) throw new Problem(403, 'PROXY_REPORT_FORBIDDEN', '代报需要生产审核权限，且不能扩大工序资格');
}
async function recomputeIssued(sql: Sql, materialIds: string[]) {
  if (!materialIds.length) return;
  await sql.query("UPDATE work_order_materials m SET issued_qty=(SELECT coalesce(sum(l.quantity),0) FROM material_issue_lines l JOIN material_issues i ON i.tenant_id=l.tenant_id AND i.id=l.issue_id WHERE l.material_id=m.id AND i.approval='approved') WHERE m.id=ANY($1::uuid[])", [materialIds]);
}
async function recomputeShipped(sql: Sql, lineIds: string[]) {
  await sql.query("UPDATE sales_order_lines l SET shipped_qty=(SELECT coalesce(sum(sl.quantity),0) FROM shipment_lines sl JOIN shipments s ON s.tenant_id=sl.tenant_id AND s.id=sl.shipment_id WHERE sl.sales_line_id=l.id AND s.approval='approved') WHERE l.id=ANY($1::uuid[])", [lineIds]);
}
async function recomputeScheduled(sql: Sql, lineId: string) {
  await sql.query("UPDATE sales_order_lines SET scheduled_qty=(SELECT coalesce(sum(plan_qty),0) FROM work_orders WHERE sales_line_id=$1 AND execution<>'cancelled') WHERE id=$1", [lineId]);
}
function outputProductQty(task: { approved_good: string; unit_ratio: string; is_output: boolean }) {
  if (!task.is_output) return 0n;
  return divFloor(q(task.approved_good), q(task.unit_ratio));
}
async function inspectionCapacity(sql: Sql, workOrderId: string, quantity: bigint, excludingId: string | null = null) {
  const output = (await tasksOf(sql, workOrderId)).find((task) => task.is_output);
  const actualOutput = output ? outputProductQty(output) : 0n;
  const used = q((await sql.query<{ n: string }>("SELECT coalesce(sum(inspected_qty),0)::text AS n FROM inspections WHERE work_order_id=$1 AND state IN ('pending','completed') AND ($2::uuid IS NULL OR id<>$2)", [workOrderId, excludingId])).rows[0]!.n);
  if (used + quantity > actualOutput) throw new Problem(422, 'OVER_INSPECTION', '送检量不能超过末道已审核产出减去已送检量；不能重复检验同一批产出');
}

async function reportView(sql: Sql, id: string, a:Actor) {
  const row = (await sql.query<{ id: string; code: string; work_order_id: string; task_id: string; process_id: string; reporter_id: string; operator_id: string; good_qty: string; defect_qty: string; rework_qty: string; scrap_qty: string; defect_note: string; note: string; supplement: boolean; approval: string; reject_reason: string; wage_status: string; version: number; created_at: string }>('SELECT id,code,work_order_id,task_id,process_id,reporter_id,operator_id,good_qty::text,defect_qty::text,rework_qty::text,scrap_qty::text,defect_note,note,supplement,approval,reject_reason,wage_status,effective_seconds,version,created_at FROM production_reports WHERE id=$1', [id])).rows[0];
  if (!row) throw new Problem(404, 'REPORT_NOT_FOUND', '报工不存在');
  const defect = q(row.defect_qty), rework = q(row.rework_qty), scrap = q(row.scrap_qty);
  return { report: { ...row, good_qty: formatDecimal(q(row.good_qty)), defect_qty: formatDecimal(defect), rework_qty: formatDecimal(rework), scrap_qty: formatDecimal(scrap), disposition_pending: formatDecimal(defect - rework - scrap), ...(await wageView(sql,id,a)), persisted: true, posted: row.approval === 'approved' } };
}
async function issueView(sql: Sql, id: string) {
  const issue = (await sql.query<{ id: string; code: string; work_order_id: string; warehouse_id: string; approval: string; version: number; created_at: string }>('SELECT id,code,work_order_id,warehouse_id,approval,version,created_at FROM material_issues WHERE id=$1', [id])).rows[0];
  if (!issue) throw new Problem(404, 'MATERIAL_ISSUE_NOT_FOUND', '领料单不存在');
  const lines = (await sql.query('SELECT id,material_id,product_id,unit_id,quantity::text FROM material_issue_lines WHERE issue_id=$1 ORDER BY id', [id])).rows.map((line) => ({ ...line, quantity: formatDecimal(q(String(line.quantity))) }));
  return { material_issue: { ...issue, lines, persisted: true, posted: issue.approval === 'approved' } };
}
async function receiptView(sql: Sql, id: string) {
  const row = (await sql.query<{ id: string; code: string; work_order_id: string; task_id: string; warehouse_id: string; product_id: string; unit_id: string; quantity: string; approval: string; version: number; created_at: string }>('SELECT id,code,work_order_id,task_id,warehouse_id,product_id,unit_id,quantity::text,approval,version,created_at FROM fg_receipts WHERE id=$1', [id])).rows[0];
  if (!row) throw new Problem(404, 'FG_RECEIPT_NOT_FOUND', '成品入库单不存在');
  return { fg_receipt: { ...row, quantity: formatDecimal(q(row.quantity)), persisted: true, posted: row.approval === 'approved' } };
}
async function shipmentView(sql: Sql, id: string) {
  const row = (await sql.query<{ id: string; code: string; sales_order_id: string; warehouse_id: string; approval: string; version: number; created_at: string }>('SELECT id,code,sales_order_id,warehouse_id,approval,version,created_at FROM shipments WHERE id=$1', [id])).rows[0];
  if (!row) throw new Problem(404, 'SHIPMENT_NOT_FOUND', '发货单不存在');
  const lines = (await sql.query('SELECT id,sales_line_id,product_id,unit_id,quantity::text FROM shipment_lines WHERE shipment_id=$1 ORDER BY id', [id])).rows.map((line) => ({ ...line, quantity: formatDecimal(q(String(line.quantity))) }));
  return { shipment: { ...row, lines, persisted: true, posted: row.approval === 'approved' } };
}
async function adjustmentView(sql: Sql, id: string) {
  const row = (await sql.query<{ id: string; code: string; warehouse_id: string; product_id: string; unit_id: string; direction: 'in' | 'out'; quantity: string; reason: string; approval: string; version: number; created_at: string }>('SELECT id,code,warehouse_id,product_id,unit_id,direction,quantity::text,reason,approval,version,created_at FROM stock_adjustments WHERE id=$1', [id])).rows[0];
  if (!row) throw new Problem(404, 'ADJUSTMENT_NOT_FOUND', '库存调整不存在');
  return { stock_adjustment: { ...row, quantity: formatDecimal(q(row.quantity)), persisted: true, posted: row.approval === 'approved', kind: 'adjustment' } };
}
async function inspectionView(sql: Sql, id: string) {
  const row = (await sql.query<{ id: string; code: string; work_order_id: string; inspected_qty: string; good_qty: string; defect_qty: string; accepted_qty: string; conclusion: string; state: string; note: string; version: number; created_at: string }>('SELECT id,code,work_order_id,inspected_qty::text,good_qty::text,defect_qty::text,accepted_qty::text,conclusion,state,note,version,created_at FROM inspections WHERE id=$1', [id])).rows[0];
  if (!row) throw new Problem(404, 'INSPECTION_NOT_FOUND', '检验记录不存在');
  return { inspection: { ...row, inspected_qty: formatDecimal(q(row.inspected_qty)), good_qty: formatDecimal(q(row.good_qty)), defect_qty: formatDecimal(q(row.defect_qty)), accepted_qty: formatDecimal(q(row.accepted_qty)), persisted: true, sampling: '未实现，整批结论由本次显式判定决定' } };
}

export function registerProduction(app: FastifyInstance, services: Services) {
  const { database, authorize, context, actor } = services;
  const guard = authorize();
  const run = <T>(request: Parameters<typeof context>[0], work: (sql: Sql, a: Actor) => Promise<T>) => database.tenant(context(request), async (sql) => { const a = actor(request); requireAllScope(a); await gateTenantWrite(sql, context(request)); return work(sql, a); });

  app.get('/api/customers', { preHandler: guard }, (request) => database.tenant(context(request), async (sql) => { permit(actor(request), 'sales.read'); requireAllScope(actor(request)); return { items: (await sql.query('SELECT id,code,name,active,version,created_at FROM customers ORDER BY code LIMIT 200')).rows, limit: 200 }; }));
  app.post<{ Body: { request_key: string; code: string; name: string } }>('/api/customers', { preHandler: guard, schema: { body: object(['request_key', 'code', 'name'], { request_key: requestKey, code: text(64), name: text(200) }) } }, async (request, reply) => {
    const hash = digest(request.body);
    const result = await run(request, async (sql, a) => {
      permit(a, 'sales.write');
      const replay = await beginCommand(sql, 'customer.create', request.body.request_key, hash);
      if (replay) return { replayed: true, customer: (await sql.query('SELECT id,code,name,active,version FROM customers WHERE id=$1', [replay])).rows[0] };
      const id = (await sql.query<{ id: string }>('INSERT INTO customers(tenant_id,code,name) VALUES($1,$2,$3) RETURNING id', [a.tenant_id, request.body.code, request.body.name])).rows[0]!.id;
      await finishCommand(sql, a.tenant_id, 'customer.create', request.body.request_key, hash, 'customer', id);
      const customer = (await sql.query('SELECT id,code,name,active,version FROM customers WHERE id=$1', [id])).rows[0];
      await writeAudit(sql, a, 'customer.created', 'customer', id, null, customer);
      return { replayed: false, customer };
    });
    return reply.code(result.replayed ? 200 : 201).send(result);
  });
  app.patch<{ Params: { id: string }; Body: { version: number; name: string; active: boolean } }>('/api/customers/:id', { preHandler: guard, schema: { params: idParams, body: object(['version', 'name', 'active'], { version: versionField, name: text(200), active: { type: 'boolean' } }) } }, (request) => run(request, async (sql, a) => {
    permit(a, 'sales.write');
    const before = (await sql.query('SELECT id,code,name,active,version FROM customers WHERE id=$1 FOR UPDATE', [request.params.id])).rows[0];
    if (!before) throw new Problem(404, 'CUSTOMER_NOT_FOUND', '客户不存在');
    const updated = (await sql.query('UPDATE customers SET name=$1,active=$2,version=version+1,updated_at=now() WHERE id=$3 AND version=$4 RETURNING id,code,name,active,version', [request.body.name, request.body.active, request.params.id, request.body.version])).rows[0];
    if (!updated) throw new Problem(409, 'VERSION_CONFLICT', '客户已被修改，请刷新');
    await writeAudit(sql, a, 'customer.updated', 'customer', request.params.id, before, updated);
    return { customer: updated };
  }));

  app.get('/api/warehouses', { preHandler: guard }, (request) => database.tenant(context(request), async (sql) => { permit(actor(request), 'inventory.read'); requireAllScope(actor(request)); return { items: (await sql.query('SELECT id,code,name,active,version FROM warehouses ORDER BY code LIMIT 200')).rows, limit: 200 }; }));
  app.post<{ Body: { request_key: string; code: string; name: string } }>('/api/warehouses', { preHandler: guard, schema: { body: object(['request_key', 'code', 'name'], { request_key: requestKey, code: text(64), name: text(200) }) } }, async (request, reply) => {
    const hash = digest(request.body);
    const created = await run(request, async (sql, a) => {
      permit(a, 'inventory.write');
      const replay = await beginCommand(sql, 'warehouse.create', request.body.request_key, hash);
      if (replay) return { replayed: true, warehouse: (await sql.query('SELECT id,code,name,active,version FROM warehouses WHERE id=$1', [replay])).rows[0] };
      const id = (await sql.query<{ id: string }>('INSERT INTO warehouses(tenant_id,code,name) VALUES($1,$2,$3) RETURNING id', [a.tenant_id, request.body.code, request.body.name])).rows[0]!.id;
      await finishCommand(sql, a.tenant_id, 'warehouse.create', request.body.request_key, hash, 'warehouse', id);
      const warehouse = (await sql.query('SELECT id,code,name,active,version FROM warehouses WHERE id=$1', [id])).rows[0];
      await writeAudit(sql, a, 'warehouse.created', 'warehouse', id, null, warehouse);
      return { replayed: false, warehouse };
    });
    return reply.code(created.replayed ? 200 : 201).send(created);
  });

  app.get('/api/sales-orders', { preHandler: guard }, (request) => database.tenant(context(request), async (sql) => { permit(actor(request), 'sales.read'); requireAllScope(actor(request)); const items = (await sql.query<{ id: string }>('SELECT id FROM sales_orders ORDER BY created_at DESC LIMIT 200')).rows; return { items: await Promise.all(items.map(async (row) => (await salesView(sql, row.id)).order)), total: Number((await sql.query<{ n: string }>('SELECT count(*)::text AS n FROM sales_orders')).rows[0]!.n), limit: 200 }; }));
  app.get<{ Params: { id: string } }>('/api/sales-orders/:id', { preHandler: guard, schema: { params: idParams } }, (request) => database.tenant(context(request), async (sql) => { permit(actor(request), 'sales.read'); requireAllScope(actor(request)); return salesView(sql, request.params.id); }));
  app.post<{ Body: { request_key: string; customer_id: string; note?: string; promised_date?: string | null; lines: { product_id: string; quantity: string; unit_price: string }[] } }>('/api/sales-orders', { preHandler: guard, schema: { body: object(['request_key', 'customer_id', 'lines'], { request_key: requestKey, customer_id: uuid, note, promised_date: { anyOf: [dateField, { type: 'null' }] }, lines: { type: 'array', minItems: 1, maxItems: 50, items: object(['product_id', 'quantity', 'unit_price'], { product_id: uuid, quantity: decimalField, unit_price: decimalField }) } }, ['note', 'promised_date']) } }, async (request, reply) => {
    const hash = digest({ ...request.body, promised_date: request.body.promised_date ?? null, note: request.body.note ?? '' });
    const created = await run(request, async (sql, a) => {
      permit(a, 'sales.write');
      const replay = await beginCommand(sql, 'sales_order.create', request.body.request_key, hash);
      if (replay) return { replayed: true, ...(await salesView(sql, replay)) };
      if (!(await sql.query('SELECT id FROM customers WHERE id=$1 AND active', [request.body.customer_id])).rows[0]) throw new Problem(422, 'INVALID_REFERENCE', '客户不存在、已停用或不属于当前企业');
      const ids = request.body.lines.map((line) => line.product_id);
      if (new Set(ids).size !== ids.length) throw new Problem(422, 'DUPLICATE_LINE', '同一销售订单暂不重复同一产品；拆行留到后续改单');
      calendarDate(request.body.promised_date);
      const id = (await sql.query<{ id: string }>('INSERT INTO sales_orders(tenant_id,code,customer_id,note,promised_date,created_by) VALUES($1,$2,$3,$4,$5,$6) RETURNING id', [a.tenant_id, await nextCode(sql, a.tenant_id, 'SO', 'SO'), request.body.customer_id, request.body.note ?? '', request.body.promised_date ?? null, a.user_id])).rows[0]!.id;
      for (let index = 0; index < request.body.lines.length; index++) {
        const line = request.body.lines[index]!;
        const product = await activeProduct(sql, line.product_id);
        const quantity = decimal(line.quantity, { positive: true }), price = decimal(line.unit_price);
        await sql.query('INSERT INTO sales_order_lines(tenant_id,order_id,line_no,product_id,unit_id,quantity,unit_price,extended_amount,product_snapshot) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)', [a.tenant_id, id, index + 1, product.id, product.unit_id, formatDecimal(quantity), formatDecimal(price), money(quantity, price), JSON.stringify(product)]);
      }
      await finishCommand(sql, a.tenant_id, 'sales_order.create', request.body.request_key, hash, 'sales_order', id);
      const body = await salesView(sql, id);
      await writeAudit(sql, a, 'sales_order.created', 'sales_order', id, null, body.order);
      return { replayed: false, ...body };
    });
    return reply.code(created.replayed ? 200 : 201).send(created);
  });
  app.post<{ Params: { id: string }; Body: { action: string; version: number; reason?: string; request_key?: string } }>('/api/sales-orders/:id/actions', { preHandler: guard, schema: { params: idParams, body: object(['action', 'version'], { action: { type: 'string', enum: ['submit', 'approve', 'reject', 'withdraw', 'cancel', 'close', 'force_close'] }, version: versionField, reason: reasonText, request_key: requestKey }, ['reason', 'request_key']) } }, (request) => run(request, async (sql, a) => {
    const action = request.body.action;
    permit(a, action === 'submit' || action === 'withdraw' ? 'sales.write' : 'sales.approve');
    const hash = digest({ id: request.params.id, ...request.body, reason: request.body.reason ?? '' });
    if (request.body.request_key) { const replay = await beginCommand(sql, `sales_order.${action}`, request.body.request_key, hash); if (replay) return { replayed: true, ...(await salesView(sql, replay)) }; }
    const before = (await sql.query<{ id: string; lifecycle: string; approval: string; version: number }>('SELECT id,lifecycle,approval,version FROM sales_orders WHERE id=$1 FOR UPDATE', [request.params.id])).rows[0];
    if (!before) throw new Problem(404, 'SALES_ORDER_NOT_FOUND', '销售订单不存在');
    if (before.version !== request.body.version) throw new Problem(409, 'VERSION_CONFLICT', '销售订单已被修改，请刷新');
    let lifecycle = before.lifecycle, approval = before.approval, closeReason = '';
    const lines = (await sql.query<{ id: string; quantity: string; shipped_qty: string }>('SELECT id,quantity::text,shipped_qty::text FROM sales_order_lines WHERE order_id=$1', [before.id])).rows;
    if (action === 'submit') {
      if (lifecycle !== 'draft' || !['unsubmitted', 'rejected', 'withdrawn'].includes(approval)) throw new Problem(409, 'STATE_TRANSITION', '当前订单不能提交');
      if (!lines.length) throw new Problem(422, 'ORDER_INCOMPLETE', '订单至少要有一行有效明细');
      approval = 'pending';
    } else if (action === 'approve') {
      if (lifecycle !== 'draft' || approval !== 'pending') throw new Problem(409, 'STATE_TRANSITION', '只有待审核草稿可以审核');
      approval = 'approved'; lifecycle = 'open';
    } else if (action === 'reject') {
      if (approval !== 'pending') throw new Problem(409, 'STATE_TRANSITION', '只有待审核订单可以驳回');
      closeReason = needReason(request.body.reason, '驳回必须填写原因'); approval = 'rejected';
    } else if (action === 'withdraw') {
      if (approval !== 'pending') throw new Problem(409, 'STATE_TRANSITION', '只有待审核订单可以撤回');
      approval = 'withdrawn';
    } else if (action === 'cancel') {
      if (!['draft', 'open'].includes(lifecycle)) throw new Problem(409, 'STATE_TRANSITION', '当前订单不能取消');
      const downstream = (await sql.query("SELECT id FROM work_orders WHERE sales_order_id=$1 AND execution<>'cancelled' UNION ALL SELECT id FROM shipments WHERE sales_order_id=$1 AND approval IN ('pending','approved') LIMIT 1", [before.id])).rows[0];
      if (downstream) throw new Problem(409, 'DOWNSTREAM_EXISTS', '先取消或冲销后续加工单和发货');
      closeReason = needReason(request.body.reason, '取消必须填写原因'); lifecycle = 'cancelled';
    } else if (action === 'close' || action === 'force_close') {
      if (lifecycle !== 'open' || approval !== 'approved') throw new Problem(409, 'STATE_TRANSITION', '只有已开放订单可以关闭');
      const short = lines.some((line) => q(line.shipped_qty) < q(line.quantity));
      if (action === 'close' && short) throw new Problem(422, 'UNSHIPPED_QUANTITY', '仍有未发货数量，不能按全部履约关闭');
      if (action === 'force_close') closeReason = needReason(request.body.reason, '未完成履约的强制关闭必须填写原因');
      lifecycle = 'closed';
    }
    await sql.query('UPDATE sales_orders SET lifecycle=$1,approval=$2,close_reason=CASE WHEN $3=\'\' THEN close_reason ELSE $3 END,version=version+1,updated_at=now() WHERE id=$4', [lifecycle, approval, closeReason, before.id]);
    if (request.body.request_key) await finishCommand(sql, a.tenant_id, `sales_order.${action}`, request.body.request_key, hash, 'sales_order', before.id);
    const body = await salesView(sql, before.id);
    await writeAudit(sql, a, `sales_order.${action}`, 'sales_order', before.id, before, body.order);
    return { replayed: false, ...body };
  }));

  app.get<{ Querystring: { reportable?: string } }>('/api/work-orders', { preHandler: guard, schema: { querystring: { type: 'object', additionalProperties: false, properties: { reportable: { type: 'string', enum: ['1', 'true'] } } } } }, (request) => database.tenant(context(request), async (sql) => {
    const a = actor(request); permit(a, 'production.read'); requireAllScope(a);
    const reportable = request.query.reportable === '1' || request.query.reportable === 'true';
    const ids = reportable
      ? (await sql.query<{ id: string }>(a.permissions.includes('production.approve')
        ? "SELECT w.id FROM work_orders w WHERE w.execution='running' AND EXISTS (SELECT 1 FROM work_order_tasks t WHERE t.work_order_id=w.id AND t.execution='running') ORDER BY w.created_at DESC LIMIT 200"
        : "SELECT w.id FROM work_orders w WHERE w.execution='running' AND EXISTS (SELECT 1 FROM work_order_tasks t JOIN process_reporters r ON r.tenant_id=t.tenant_id AND r.process_id=t.process_id AND r.user_id=$1 WHERE t.work_order_id=w.id AND t.execution='running') ORDER BY w.created_at DESC LIMIT 200", a.permissions.includes('production.approve') ? [] : [a.user_id])).rows
      : (await sql.query<{ id: string }>('SELECT id FROM work_orders ORDER BY created_at DESC LIMIT 200')).rows;
    return { items: await Promise.all(ids.map(async (row) => (await workOrderView(sql, row.id)).work_order)), total: Number((await sql.query<{ n: string }>('SELECT count(*)::text AS n FROM work_orders')).rows[0]!.n), limit: 200 };
  }));
  app.get<{ Params: { id: string } }>('/api/work-orders/:id', { preHandler: guard, schema: { params: idParams } }, (request) => database.tenant(context(request), async (sql) => { permit(actor(request), 'production.read'); requireAllScope(actor(request)); return workOrderView(sql, request.params.id); }));
  app.post<{ Body: { request_key: string; sales_line_id: string; quantity: string; route_version_id: string; bom_version_id: string; warehouse_id: string; requires_fg_inspection?: boolean; require_cost?: boolean; unit_ratios?: { sequence: number; unit_ratio: string }[] } }>('/api/work-orders', { preHandler: guard, schema: { body: object(['request_key', 'sales_line_id', 'quantity', 'route_version_id', 'bom_version_id', 'warehouse_id'], { request_key: requestKey, sales_line_id: uuid, quantity: decimalField, route_version_id: uuid, bom_version_id: uuid, warehouse_id: uuid, requires_fg_inspection: { type: 'boolean' }, require_cost: { type: 'boolean' }, unit_ratios: { type: 'array', maxItems: 100, items: object(['sequence', 'unit_ratio'], { sequence: { type: 'integer', minimum: 1 }, unit_ratio: decimalField }) } }, ['requires_fg_inspection', 'require_cost', 'unit_ratios']) } }, async (request, reply) => {
    const hash = digest({ ...request.body, requires_fg_inspection: request.body.requires_fg_inspection ?? false, unit_ratios: request.body.unit_ratios ?? [] });
    const created = await run(request, async (sql, a) => {
      permit(a, 'production.write');
      const replay = await beginCommand(sql, 'work_order.create', request.body.request_key, hash);
      if (replay) return { replayed: true, ...(await workOrderView(sql, replay)) };
      const quantity = decimal(request.body.quantity, { positive: true });
      await activeWarehouse(sql, request.body.warehouse_id);
      const line = (await sql.query<{ id: string; order_id: string; product_id: string; unit_id: string; quantity: string; scheduled_qty: string; lifecycle: string; approval: string }>('SELECT l.id,l.order_id,l.product_id,l.unit_id,l.quantity::text,l.scheduled_qty::text,o.lifecycle,o.approval FROM sales_order_lines l JOIN sales_orders o ON o.tenant_id=l.tenant_id AND o.id=l.order_id WHERE l.id=$1 FOR UPDATE OF l,o', [request.body.sales_line_id])).rows[0];
      if (!line || line.lifecycle !== 'open' || line.approval !== 'approved') throw new Problem(422, 'SALES_LINE_NOT_OPEN', '只能对已审核开放的销售行下达加工单');
      if (q(line.scheduled_qty) + quantity > q(line.quantity)) throw new Problem(422, 'SCHEDULE_EXCEEDS_ORDER', '排产数量不能超过销售行未排数量');
      await activeProduct(sql, line.product_id);
      const bom = await loadBom(sql, request.body.bom_version_id);
      if (bom.version.parent_snapshot.id !== line.product_id) throw new Problem(422, 'PRODUCT_MISMATCH', 'BOM父件必须与销售行产品一致');
      if (bom.version.parent_snapshot.attribute !== 'manufactured') throw new Problem(422, 'PARENT_NOT_MANUFACTURED', '当前只为制造产品下达加工单');
      if (bom.version.parent_snapshot.unit_id !== line.unit_id) throw new Problem(422, 'UNIT_MISMATCH', '销售行单位与BOM父件单位不一致，当前不作换算');
      if (bom.version.route_version_id && bom.version.route_version_id !== request.body.route_version_id) throw new Problem(422, 'ROUTE_BOM_MISMATCH', 'BOM已绑定路线版本时，加工单必须冻结同一路线版本');
      const route = await routeSteps(sql, request.body.route_version_id);
      if (new Set((request.body.unit_ratios ?? []).map((item) => item.sequence)).size !== (request.body.unit_ratios ?? []).length) throw new Problem(422, 'DUPLICATE_UNIT_RATIO', '同一工序序号不能指定多条单位关系');
      const ratios = new Map((request.body.unit_ratios ?? []).map((item) => [item.sequence, item.unit_ratio]));
      if ([...ratios.keys()].some((sequence) => !route.steps.some((step) => step.sequence === sequence))) throw new Problem(422, 'UNIT_RATIO', '单位关系必须对应冻结路线中的工序序号');
      const product = bom.version.parent_snapshot;
      const id = (await sql.query<{ id: string }>('INSERT INTO work_orders(tenant_id,code,product_id,unit_id,plan_qty,sales_order_id,sales_line_id,route_version_id,bom_version_id,warehouse_id,product_snapshot,route_name_snapshot,bom_revision,requires_fg_inspection,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13,$14,$15) RETURNING id', [a.tenant_id, await nextCode(sql, a.tenant_id, 'WO', 'WO'), product.id, line.unit_id, formatDecimal(quantity), line.order_id, line.id, route.version.id, bom.version.id, request.body.warehouse_id, JSON.stringify(product), route.version.name_snapshot, bom.version.revision, request.body.requires_fg_inspection ?? false, a.user_id])).rows[0]!.id;
      await sql.query('UPDATE work_orders SET cost_required=$1 WHERE id=$2',[request.body.require_cost??false,id]);
      const taskIds = new Map<number, string>();
      for (const step of route.steps) {
        const ratio = decimal(ratios.get(step.sequence) ?? '1', { positive: true });
        const plan = mulCeil(quantity, ratio);
        const taskId = (await sql.query<{ id: string }>('INSERT INTO work_order_tasks(tenant_id,work_order_id,sequence,route_step_id,process_id,process_snapshot,unit_ratio,plan_qty,is_output) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9) RETURNING id', [a.tenant_id, id, step.sequence, step.id, step.process_id, JSON.stringify({ code: step.process_code, name: step.process_name, standard_minutes: step.standard_minutes, reporter_ids: step.reporter_ids, auto_inbound: step.auto_inbound }), formatDecimal(ratio), formatDecimal(plan), step.sequence === route.steps[route.steps.length - 1]!.sequence])).rows[0]!.id;
        taskIds.set(step.sequence, taskId);
      }
      const materials = await explode(sql, bom.version.id, formatDecimal(quantity));
      for (const material of materials) {
        await activeProduct(sql, material.product_id);
        if (!(await sql.query('SELECT id FROM units WHERE id=$1 AND active', [material.unit_id])).rows[0]) throw new Problem(422, 'INACTIVE_REFERENCE', '冻结物料的计量单位已停用，不能下达新加工单');
        const matches = route.steps.filter((step) => step.process_id === material.feeding);
        const taskId = !material.ambiguous && matches.length === 1 ? taskIds.get(matches[0]!.sequence) ?? null : null;
        await sql.query('INSERT INTO work_order_materials(tenant_id,work_order_id,product_id,unit_id,required_qty,feeding_process_id,feeding_task_id,feeding_ambiguous,component_snapshot,source_paths) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb)', [a.tenant_id, id, material.product_id, material.unit_id, formatDecimal(material.amount), material.ambiguous ? null : material.feeding, taskId, material.ambiguous || matches.length > 1, JSON.stringify({ code: material.code, name: material.name, unit_name: material.unit_name }), JSON.stringify(material.paths)]);
      }
      await recomputeScheduled(sql, line.id);
      await finishCommand(sql, a.tenant_id, 'work_order.create', request.body.request_key, hash, 'work_order', id);
      const body = await workOrderView(sql, id);
      await writeAudit(sql, a, 'work_order.created', 'work_order', id, null, { id, route_version_id: route.version.id, bom_version_id: bom.version.id, plan_qty: formatDecimal(quantity), materials: body.work_order.materials });
      return { replayed: false, ...body };
    });
    return reply.code(created.replayed ? 200 : 201).send(created);
  });
  app.post<{ Params: { id: string }; Body: { action: string; version: number; reason?: string; request_key?: string } }>('/api/work-orders/:id/actions', { preHandler: guard, schema: { params: idParams, body: object(['action', 'version'], { action: { type: 'string', enum: ['start', 'pause', 'resume', 'complete', 'cancel'] }, version: versionField, reason: reasonText, request_key: requestKey }, ['reason', 'request_key']) } }, (request) => run(request, async (sql, a) => {
    permit(a, 'production.write');
    const action = request.body.action;
    const hash = digest({ id: request.params.id, ...request.body, reason: request.body.reason ?? '' });
    if (request.body.request_key) { const replay = await beginCommand(sql, `work_order.${action}`, request.body.request_key, hash); if (replay) return { replayed: true, ...(await workOrderView(sql, replay)) }; }
    const order = await lockWorkOrder(sql, request.params.id, request.body.version);
    if (action === 'start') {
      if (order.execution !== 'not_started' || order.order_paused) throw new Problem(409, 'STATE_TRANSITION', '只有未开始的加工单可以开工');
      const short = (await sql.query<{ id: string }>('SELECT id FROM work_order_materials WHERE work_order_id=$1 AND issued_qty<required_qty LIMIT 1', [order.id])).rows[0];
      if (short) throw new Problem(422, 'MATERIALS_NOT_READY', '按当前暂定规则，开工前须领足冻结物料需求');
      await sql.query('UPDATE work_orders SET order_paused=false,updated_at=now() WHERE id=$1', [order.id]);
      await syncExecution(sql, order.id);
    } else     if (action === 'pause') {
      const tasks = await tasksOf(sql, order.id);
      if (order.order_paused || !['running','paused'].includes(order.execution) || (order.execution === 'paused' && !tasks.some((task) => task.pause_source === 'manual'))) throw new Problem(409, 'STATE_TRANSITION', '只有已开工且执行中的加工单可以暂停');
      needReason(request.body.reason, '暂停必须填写原因');
      await sql.query("UPDATE work_order_tasks SET previous_execution=execution,execution='paused',pause_source='order',version=version+1 WHERE work_order_id=$1 AND pause_source<>'manual' AND execution IN ('not_started','running')", [order.id]);
      await sql.query('UPDATE work_orders SET order_paused=true,updated_at=now() WHERE id=$1', [order.id]);
      await syncExecution(sql, order.id);
    } else if (action === 'resume') {
      if (!order.order_paused) throw new Problem(409, 'STATE_TRANSITION', '当前没有可解除的工单暂停');
      await sql.query("UPDATE work_order_tasks SET execution=previous_execution,pause_source='none',previous_execution=NULL,version=version+1 WHERE work_order_id=$1 AND pause_source='order'", [order.id]);
      await sql.query('UPDATE work_orders SET order_paused=false,updated_at=now() WHERE id=$1', [order.id]);
      for (const task of await tasksOf(sql, order.id)) if (task.execution === 'running') await refreshTaskQuantities(sql, task.id, false);
      await syncExecution(sql, order.id);
    } else if (action === 'complete') {
      if (!['running', 'paused'].includes(order.execution)) throw new Problem(409, 'STATE_TRANSITION', '当前加工单不能完工');
      if ((await sql.query("SELECT id FROM production_reports WHERE work_order_id=$1 AND approval='pending' LIMIT 1", [order.id])).rows[0]) throw new Problem(422, 'PENDING_REPORTS', '存在未审核报工');
      const tasks = await tasksOf(sql, order.id);
      if (tasks.some((task) => task.execution !== 'completed')) throw new Problem(422, 'TASKS_OPEN', '仍有未完成任务，不能完工');
      const output = tasks.find((task) => task.is_output);
      if (!output || outputProductQty(output) < q(order.plan_qty)) throw new Problem(422, 'GOOD_QUANTITY_INSUFFICIENT', '末道产出尚未达到计划数量');
      if (tasks.some((task) => q(task.approved_defect) > q(task.approved_rework) + q(task.approved_scrap))) throw new Problem(422, 'DISPOSITION_OPEN', '存在尚未处置完的不良，不能当作全部处理完成');
      if (order.requires_fg_inspection) {
        const accepted = q((await sql.query<{ n: string }>("SELECT coalesce(sum(accepted_qty),0)::text AS n FROM inspections WHERE work_order_id=$1 AND state='completed' AND conclusion='pass'", [order.id])).rows[0]!.n);
        if (accepted < q(order.plan_qty)) throw new Problem(422, 'QUALITY_REQUIRED', '本加工单要求成品检验放行后才能完工');
      }
      await sql.query("UPDATE work_orders SET execution='completed',order_paused=false,completed_at=now(),version=version+1,updated_at=now() WHERE id=$1", [order.id]);
    } else if (action === 'cancel') {
      if (['completed', 'cancelled'].includes(order.execution)) throw new Problem(409, 'STATE_TRANSITION', '已完成或已取消的加工单不能再次取消');
      const blocked = (await sql.query("SELECT id FROM production_reports WHERE work_order_id=$1 AND approval IN ('pending','approved') UNION ALL SELECT id FROM material_issues WHERE work_order_id=$1 AND approval IN ('pending','approved') UNION ALL SELECT id FROM fg_receipts WHERE work_order_id=$1 AND approval IN ('pending','approved') LIMIT 1", [order.id])).rows[0];
      if (blocked) throw new Problem(409, 'DOWNSTREAM_EXISTS', '先驳回或冲销报工、领料和成品入库');
      needReason(request.body.reason, '取消加工单必须填写原因');
      await releaseReservations(sql,a,order.id);
      await sql.query("UPDATE work_orders SET execution='cancelled',order_paused=false,close_reason=$2,version=version+1,updated_at=now() WHERE id=$1", [order.id, request.body.reason!.trim()]);
      await sql.query("UPDATE work_order_tasks SET execution='cancelled',version=version+1 WHERE work_order_id=$1 AND execution<>'completed'", [order.id]);
      await recomputeScheduled(sql, order.sales_line_id);
    }
    if (request.body.request_key) await finishCommand(sql, a.tenant_id, `work_order.${action}`, request.body.request_key, hash, 'work_order', order.id);
    const body = await workOrderView(sql, order.id);
    await writeAudit(sql, a, `work_order.${action}`, 'work_order', order.id, { execution: order.execution, version: order.version }, { execution: body.work_order.execution, version: body.work_order.version });
    return { replayed: false, ...body };
  }));
  app.post<{ Params: { id: string; taskId: string }; Body: { action: string; version: number; reason?: string } }>('/api/work-orders/:id/tasks/:taskId/actions', { preHandler: guard, schema: { params: object(['id', 'taskId'], { id: uuid, taskId: uuid }), body: object(['action', 'version'], { action: { type: 'string', enum: ['pause', 'resume'] }, version: versionField, reason: reasonText }, ['reason']) } }, (request) => run(request, async (sql, a) => {
    permit(a, 'production.write');
    const order = await lockWorkOrder(sql, request.params.id);
    if (order.order_paused || order.execution === 'completed' || order.execution === 'cancelled') throw new Problem(409, 'STATE_TRANSITION', '工单暂停、完工或取消后不能单独改任务暂停');
    const task = (await tasksOf(sql, order.id)).find((item) => item.id === request.params.taskId);
    if (!task || task.version !== request.body.version) throw new Problem(task ? 409 : 404, task ? 'VERSION_CONFLICT' : 'TASK_NOT_FOUND', task ? '任务已被修改，请刷新' : '生产任务不存在');
    if (request.body.action === 'pause') {
      if (task.execution !== 'running' || task.pause_source !== 'none') throw new Problem(409, 'STATE_TRANSITION', '只有执行中的任务可以手工暂停');
      needReason(request.body.reason, '手工暂停必须填写原因');
      await sql.query("UPDATE work_order_tasks SET previous_execution='running',execution='paused',pause_source='manual',version=version+1 WHERE id=$1", [task.id]);
    } else {
      if (task.pause_source !== 'manual') throw new Problem(409, 'STATE_TRANSITION', '只能恢复本任务自己的手工暂停');
      await sql.query('UPDATE work_order_tasks SET execution=$2,pause_source=\'none\',previous_execution=NULL,version=version+1 WHERE id=$1', [task.id, task.previous_execution ?? 'running']);
      await refreshTaskQuantities(sql, task.id, false);
    }
    await syncExecution(sql, order.id);
    const body = await workOrderView(sql, order.id);
    await writeAudit(sql, a, `task.${request.body.action}`, 'work_order_task', task.id, { pause_source: task.pause_source, execution: task.execution }, body.work_order.tasks.find((item) => item.id === task.id));
    return body;
  }));

  app.get<{ Querystring: { work_order_id?: string } }>('/api/production-reports', { preHandler: guard, schema: { querystring: { type: 'object', additionalProperties: false, properties: { work_order_id: uuid } } } }, (request) => database.tenant(context(request), async (sql) => {
    permit(actor(request), 'production.read'); requireAllScope(actor(request));
    const ids = (await sql.query<{ id: string }>(request.query.work_order_id ? 'SELECT id FROM production_reports WHERE work_order_id=$1 ORDER BY created_at DESC LIMIT 200' : 'SELECT id FROM production_reports ORDER BY created_at DESC LIMIT 200', request.query.work_order_id ? [request.query.work_order_id] : [])).rows;
    return { items: await Promise.all(ids.map(async (row) => (await reportView(sql, row.id,actor(request))).report)) };
  }));
  app.post<{ Body: { request_key: string; task_id: string; operator_id?: string; good_qty: string; defect_qty: string; rework_qty: string; scrap_qty: string; defect_note?: string; note?: string; effective_seconds?: number; supplement_id?:string; supplement?: boolean } }>('/api/production-reports', { preHandler: guard, schema: { body: object(['request_key', 'task_id', 'good_qty', 'defect_qty', 'rework_qty', 'scrap_qty'], { request_key: requestKey, task_id: uuid, operator_id: uuid, good_qty: decimalField, defect_qty: decimalField, rework_qty: decimalField, scrap_qty: decimalField, defect_note: { type: 'string', maxLength: 500 }, note, effective_seconds: {type:'integer',minimum:0,maximum:2678400}, supplement_id:uuid, supplement: { type: 'boolean' } }, ['operator_id', 'defect_note', 'note', 'effective_seconds', 'supplement_id', 'supplement']) } }, async (request, reply) => {
    const good = decimal(request.body.good_qty), defect = decimal(request.body.defect_qty), rework = decimal(request.body.rework_qty), scrap = decimal(request.body.scrap_qty);
    if (good + defect <= 0n && !(request.body.effective_seconds??0)) throw new Problem(422, 'EMPTY_REPORT', '良品与不良合计必须大于零，允许良品为零');
    if (rework + scrap > defect) throw new Problem(422, 'DISPOSITION_EXCEEDS_DEFECT', '返工与报废不能超过不良数量，差额保留为待处置');
    if (defect > 0n && !(request.body.defect_note ?? '').trim()) throw new Problem(422, 'DEFECT_NOTE_REQUIRED', '不良数量大于零时必须填写不良说明');
    const hash = digest({ ...request.body, operator_id: request.body.operator_id ?? null, defect_note: request.body.defect_note ?? '', note: request.body.note ?? '', supplement: request.body.supplement ?? false });
    const created = await run(request, async (sql, a) => {
      permit(a, 'production.report');
      if (request.body.supplement && !a.permissions.includes('production.approve')) throw new Problem(403, 'SUPPLEMENT_FORBIDDEN', '超过任务计划的补产需要生产审核权限');
      const replay = await beginCommand(sql, 'report.create', request.body.request_key, hash);
      if (replay) return { replayed: true, ...(await reportView(sql, replay,a)) };
      const task = (await sql.query<TaskRow>('SELECT t.id,t.work_order_id,t.sequence,t.route_step_id,t.process_id,t.process_snapshot,t.unit_ratio::text,t.plan_qty::text,t.is_output,t.execution,t.pause_source,t.previous_execution,t.approved_good::text,t.approved_defect::text,t.approved_rework::text,t.approved_scrap::text,t.version FROM work_order_tasks t WHERE t.id=$1 FOR UPDATE', [request.body.task_id])).rows[0];
      if (!task) throw new Problem(404, 'TASK_NOT_FOUND', '生产任务不存在');
      const order = await lockWorkOrder(sql, task.work_order_id);
      if (order.execution !== 'running' || task.execution !== 'running') throw new Problem(409, 'STATE_TRANSITION', '只有执行中的任务可以报工');
      const operatorId = request.body.operator_id ?? a.user_id;
      await assertOperator(sql, a, task.process_id, operatorId);
      const used = q((await sql.query<{ n: string }>("SELECT coalesce(sum(good_qty+defect_qty),0)::text AS n FROM production_reports WHERE task_id=$1 AND approval IN ('pending','approved')", [task.id])).rows[0]!.n);
      const usedGood = q((await sql.query<{ n: string }>("SELECT coalesce(sum(good_qty),0)::text AS n FROM production_reports WHERE task_id=$1 AND approval IN ('pending','approved')", [task.id])).rows[0]!.n);
      const repaired=q((await sql.query<{n:string}>("SELECT coalesce(sum(good_qty),0)::text AS n FROM rework_reports WHERE task_id=$1 AND approval IN ('pending','approved')",[task.id])).rows[0]!.n);
      let extra=0n;
      if(request.body.supplement_id){
        const source=(await sql.query<{quantity:string}>("SELECT quantity::text FROM production_supplements WHERE id=$1 AND task_id=$2 AND approval='approved'",[request.body.supplement_id,task.id])).rows[0];
        if(!source)throw new Problem(422,'SUPPLEMENT_SOURCE_REQUIRED','补产报工必须引用本任务已审批并领料的追加投入');
        const allocated=q((await sql.query<{n:string}>("SELECT coalesce(sum(good_qty+defect_qty),0)::text AS n FROM production_reports WHERE supplement_id=$1 AND approval IN ('pending','approved')",[request.body.supplement_id])).rows[0]!.n);
        if(allocated+good+defect>q(source.quantity))throw new Problem(422,'OVER_SUPPLEMENT','追加投入来源已经被报工占用');extra=q(source.quantity);
      }
      const authorized=q((await sql.query<{n:string}>("SELECT coalesce(sum(quantity),0)::text AS n FROM production_supplements WHERE task_id=$1 AND approval='approved'",[task.id])).rows[0]!.n);
      const previous=(await tasksOf(sql,order.id)).filter(t=>t.sequence<task.sequence).at(-1);
      const inputCap=previous?mulCeil(divFloor(q(previous.approved_good),q(previous.unit_ratio)),q(task.unit_ratio)):q(task.plan_qty);
      if (usedGood + repaired + good > q(task.plan_qty)) throw new Problem(422, 'OVER_PLAN', '净合格数量不能超过冻结任务计划，补产标记不能扩大成品上限');
      if(good+defect>0n&&used+good+defect>inputCap+(request.body.supplement_id?authorized:0n))throw new Problem(422,request.body.supplement?'SUPPLEMENT_SOURCE_REQUIRED':'OVER_PLAN','投入不能超过前道净合格来源或首道计划；额外投入必须引用审批领料来源');
      if (used + good + defect > q(task.plan_qty)+(request.body.supplement_id?authorized:0n)) throw new Problem(422, request.body.supplement ? 'SUPPLEMENT_SOURCE_REQUIRED' : 'OVER_PLAN', request.body.supplement ? '追加投入须有审批数量与追加领料来源；不能仅凭补产标记扩大投入' : '默认不允许总投入超过冻结任务计划');
      const id = (await sql.query<{ id: string }>('INSERT INTO production_reports(tenant_id,code,work_order_id,task_id,process_id,reporter_id,operator_id,good_qty,defect_qty,rework_qty,scrap_qty,defect_note,note,supplement,effective_seconds) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id', [a.tenant_id, await nextCode(sql, a.tenant_id, 'RP', 'RP'), order.id, task.id, task.process_id, a.user_id, operatorId, formatDecimal(good), formatDecimal(defect), formatDecimal(rework), formatDecimal(scrap), (request.body.defect_note ?? '').trim(), request.body.note ?? '', request.body.supplement ?? false,request.body.effective_seconds??0])).rows[0]!.id;
      const wage=await freezeWage(sql,order.product_id,task.process_id,formatDecimal(good),request.body.effective_seconds??0,(await sql.query<{wage_rule_version_id:string|null}>('SELECT wage_rule_version_id FROM work_order_tasks WHERE id=$1',[task.id])).rows[0]!.wage_rule_version_id);
      wage.worker_id=operatorId;wage.worker_name=(await sql.query<{display_name:string}>('SELECT display_name FROM tenant_team_members WHERE id=$1',[operatorId])).rows[0]!.display_name;
      if(good+defect===0n&&wage.mode!=='time')throw new Problem(422,'TIME_RULE_REQUIRED','零数量报工必须引用有效计时工价');
      if(wage.mode==='time'&&!(request.body.effective_seconds??0))throw new Problem(422,'TIME_REQUIRED','计时规则必须填写有效工时');
      await sql.query('UPDATE production_reports SET wage_snapshot=$1,wage_status=$2,effective_seconds=$3,supplement_id=$4 WHERE id=$5',[wage,wage.status,request.body.effective_seconds??0,request.body.supplement_id??null,id]);
      await finishCommand(sql, a.tenant_id, 'report.create', request.body.request_key, hash, 'production_report', id);
      const body = await reportView(sql, id,a);
      await writeAudit(sql, a, 'report.submitted', 'production_report', id, null, body.report);
      return { replayed: false, ...body };
    });
    return reply.code(created.replayed ? 200 : 201).send(created);
  });
  app.post<{ Params: { id: string }; Body: { action: string; version: number; reason?: string; request_key?: string } }>('/api/production-reports/:id/actions', { preHandler: guard, schema: { params: idParams, body: object(['action', 'version'], { action: { type: 'string', enum: ['approve', 'reject', 'reverse'] }, version: versionField, reason: reasonText, request_key: requestKey }, ['reason', 'request_key']) } }, (request) => run(request, async (sql, a) => {
    permit(a, 'production.approve');
    const action = request.body.action;
    const hash = digest({ id: request.params.id, ...request.body, reason: request.body.reason ?? '' });
    if (request.body.request_key) { const replay = await beginCommand(sql, `report.${action}`, request.body.request_key, hash); if (replay) return { replayed: true, ...(await reportView(sql, replay,a)) }; }
    const report = (await sql.query<{ id: string; work_order_id: string; task_id: string; approval: string; version: number; good_qty: string }>('SELECT id,work_order_id,task_id,approval,version,good_qty::text FROM production_reports WHERE id=$1 FOR UPDATE', [request.params.id])).rows[0];
    if (!report) throw new Problem(404, 'REPORT_NOT_FOUND', '报工不存在');
    if (report.version !== request.body.version) throw new Problem(409, 'VERSION_CONFLICT', '报工已被修改，请刷新');
    const order = await lockWorkOrder(sql, report.work_order_id);
    if (['completed', 'cancelled'].includes(order.execution)) throw new Problem(409, 'DOWNSTREAM_EXISTS', '加工单已完工或取消，不能再改报工');
    if (action === 'approve') {
      if (report.approval !== 'pending') throw new Problem(409, 'STATE_TRANSITION', '只有待审核报工可以审核');
      const task = (await tasksOf(sql, order.id)).find((item) => item.id === report.task_id)!;
      const pendingGood = q((await sql.query<{ n: string }>("SELECT coalesce(sum(good_qty+defect_qty),0)::text AS n FROM production_reports WHERE task_id=$1 AND approval='approved'", [task.id])).rows[0]!.n);
      const approvedGood = q((await sql.query<{ n: string }>("SELECT coalesce(sum(good_qty),0)::text AS n FROM production_reports WHERE task_id=$1 AND approval='approved'", [task.id])).rows[0]!.n);
      const current = (await sql.query<{ good: string; defect: string; supplement: boolean; supplement_id:string|null }>('SELECT good_qty::text AS good,defect_qty::text AS defect,supplement,supplement_id FROM production_reports WHERE id=$1', [report.id])).rows[0]!;
      const repaired=q((await sql.query<{n:string}>("SELECT coalesce(sum(good_qty),0)::text AS n FROM rework_reports WHERE task_id=$1 AND approval='approved'",[task.id])).rows[0]!.n);
      const extra=current.supplement_id?q((await sql.query<{n:string}>("SELECT coalesce(sum(quantity),0)::text AS n FROM production_supplements WHERE task_id=$1 AND approval='approved'",[task.id])).rows[0]!.n):0n;
      if (approvedGood + repaired + q(current.good) > q(task.plan_qty)) throw new Problem(422, 'OVER_PLAN', '审核后净合格数量将超过冻结计划');
      if (pendingGood + q(current.good) + q(current.defect) > q(task.plan_qty)+extra) throw new Problem(422, current.supplement ? 'SUPPLEMENT_SOURCE_REQUIRED' : 'OVER_PLAN', '审核后投入将超过计划，必须引用追加审批与领料来源');
      await postWage(sql,a,report.id);
      await sql.query("UPDATE production_reports SET approval='approved',version=version+1,updated_at=now() WHERE id=$1", [report.id]);
    } else if (action === 'reject') {
      if (report.approval !== 'pending') throw new Problem(409, 'STATE_TRANSITION', '只有待审核报工可以驳回');
      await sql.query("UPDATE production_reports SET approval='rejected',reject_reason=$2,version=version+1,updated_at=now() WHERE id=$1", [report.id, needReason(request.body.reason, '驳回必须填写原因')]);
    } else {
      if (report.approval !== 'approved') throw new Problem(409, 'STATE_TRANSITION', '只有已审核报工可以冲销');
      needReason(request.body.reason, '冲销报工必须填写原因');
      const task = (await tasksOf(sql, order.id)).find((item) => item.id === report.task_id)!;
      if (task.is_output && (await sql.query("SELECT id FROM inspections WHERE work_order_id=$1 AND state IN ('pending','completed') LIMIT 1", [order.id])).rows[0]) throw new Problem(409, 'DOWNSTREAM_EXISTS', '成品检验已经引用产出，须先处理检验来源');
      if ((await sql.query("SELECT r.id FROM production_reports r JOIN work_order_tasks t ON t.tenant_id=r.tenant_id AND t.id=r.task_id WHERE t.work_order_id=$1 AND t.sequence>$2 AND r.approval IN ('pending','approved') LIMIT 1", [order.id, task.sequence])).rows[0]) throw new Problem(409, 'DOWNSTREAM_EXISTS', '后续工序已有报工，须先处理下游');
      if((await sql.query("SELECT id FROM rework_reports WHERE source_report_id=$1 AND approval IN ('pending','approved') UNION ALL SELECT id FROM production_supplements WHERE task_id=$2 AND approval IN ('pending','approved') LIMIT 1",[report.id,task.id])).rows[0])throw new Problem(409,'DOWNSTREAM_EXISTS','源报工已经引用返工或追加投入，请先处理来源');
      await postWage(sql,a,report.id,true);
      await sql.query("UPDATE production_reports SET approval='reversed',version=version+1,updated_at=now() WHERE id=$1", [report.id]);
      await refreshTaskQuantities(sql, task.id);
      const refreshed = (await tasksOf(sql, order.id)).find((item) => item.is_output);
      const received = q((await sql.query<{ n: string }>("SELECT coalesce(sum(quantity),0)::text AS n FROM fg_receipts WHERE work_order_id=$1 AND approval='approved'", [order.id])).rows[0]!.n);
      if (refreshed && outputProductQty(refreshed) < received) throw new Problem(409, 'DOWNSTREAM_EXISTS', '冲销后末道产出将小于已入库数量');
    }
    if (action !== 'reverse') await refreshTaskQuantities(sql, report.task_id);
    if (request.body.request_key) await finishCommand(sql, a.tenant_id, `report.${action}`, request.body.request_key, hash, 'production_report', report.id);
    const body = await reportView(sql, report.id,a);
    await writeAudit(sql, a, `report.${action}`, 'production_report', report.id, { approval: report.approval }, { ...body.report, action_reason: request.body.reason?.trim() ?? '' });
    return { replayed: false, ...body };
  }));

  app.post<{ Body: { request_key: string; work_order_id: string; warehouse_id: string; lines: { material_id: string; quantity: string }[] } }>('/api/material-issues', { preHandler: guard, schema: { body: object(['request_key', 'work_order_id', 'warehouse_id', 'lines'], { request_key: requestKey, work_order_id: uuid, warehouse_id: uuid, lines: { type: 'array', minItems: 1, maxItems: 200, items: object(['material_id', 'quantity'], { material_id: uuid, quantity: decimalField }) } }) } }, async (request, reply) => {
    const hash = digest(request.body);
    const created = await run(request, async (sql, a) => {
      permit(a, 'inventory.write');
      const replay = await beginCommand(sql, 'material_issue.create', request.body.request_key, hash);
      if (replay) return { replayed: true, ...(await issueView(sql, replay)) };
      const order = await lockWorkOrder(sql, request.body.work_order_id);
      if (order.execution === 'cancelled' || order.execution === 'completed') throw new Problem(409, 'STATE_TRANSITION', '已取消或已完工的加工单不能领料');
      if (request.body.warehouse_id !== order.warehouse_id) throw new Problem(422, 'WAREHOUSE_MISMATCH', '领料仓库必须是加工单冻结的仓库');
      const ids = request.body.lines.map((line) => line.material_id);
      if (new Set(ids).size !== ids.length) throw new Problem(422, 'DUPLICATE_LINE', '同一领料单不能重复同一物料行');
      const id = (await sql.query<{ id: string }>('INSERT INTO material_issues(tenant_id,code,work_order_id,warehouse_id,created_by) VALUES($1,$2,$3,$4,$5) RETURNING id', [a.tenant_id, await nextCode(sql, a.tenant_id, 'MI', 'MI'), order.id, order.warehouse_id, a.user_id])).rows[0]!.id;
      for (const line of request.body.lines) {
        const material = (await sql.query<{ id: string; product_id: string; unit_id: string; required_qty: string; issued_qty: string }>('SELECT id,product_id,unit_id,required_qty::text,issued_qty::text FROM work_order_materials WHERE id=$1 AND work_order_id=$2 FOR UPDATE', [line.material_id, order.id])).rows[0];
        if (!material) throw new Problem(422, 'INVALID_REFERENCE', '领料行不属于该加工单');
        const quantity = decimal(line.quantity, { positive: true });
        const pending = q((await sql.query<{ n: string }>("SELECT coalesce(sum(l.quantity),0)::text AS n FROM material_issue_lines l JOIN material_issues i ON i.tenant_id=l.tenant_id AND i.id=l.issue_id WHERE l.material_id=$1 AND i.approval='pending'", [material.id])).rows[0]!.n);
        if (q(material.issued_qty) + pending + quantity > q(material.required_qty)) throw new Problem(422, 'OVER_ISSUE', '领料不能超过冻结需求，超领规则待确认');
        await sql.query('INSERT INTO material_issue_lines(tenant_id,issue_id,material_id,product_id,unit_id,quantity) VALUES($1,$2,$3,$4,$5,$6)', [a.tenant_id, id, material.id, material.product_id, material.unit_id, formatDecimal(quantity)]);
      }
      await finishCommand(sql, a.tenant_id, 'material_issue.create', request.body.request_key, hash, 'material_issue', id);
      const body = await issueView(sql, id);
      await writeAudit(sql, a, 'material_issue.created', 'material_issue', id, null, body.material_issue);
      return { replayed: false, ...body };
    });
    return reply.code(created.replayed ? 200 : 201).send(created);
  });
  app.post<{ Params: { id: string }; Body: { action: string; version: number; request_key?: string; reason?: string } }>('/api/material-issues/:id/actions', { preHandler: guard, schema: { params: idParams, body: object(['action', 'version'], { action: { type: 'string', enum: ['approve', 'reject', 'reverse'] }, version: versionField, request_key: requestKey, reason: reasonText }, ['request_key','reason']) } }, (request) => run(request, async (sql, a) => {
    permit(a, 'inventory.approve');
    const hash = digest({ id: request.params.id, ...request.body });
    if (request.body.request_key) { const replay = await beginCommand(sql, `material_issue.${request.body.action}`, request.body.request_key, hash); if (replay) return { replayed: true, ...(await issueView(sql, replay)) }; }
    const issue = (await sql.query<{ id: string; work_order_id: string; warehouse_id: string; approval: string; version: number }>('SELECT id,work_order_id,warehouse_id,approval,version FROM material_issues WHERE id=$1 FOR UPDATE', [request.params.id])).rows[0];
    if (!issue) throw new Problem(404, 'MATERIAL_ISSUE_NOT_FOUND', '领料单不存在');
    if (issue.version !== request.body.version) throw new Problem(409, 'VERSION_CONFLICT', '领料单已被修改，请刷新');
    const order = await lockWorkOrder(sql, issue.work_order_id);
    const lines = (await sql.query<{ id: string; material_id: string; product_id: string; unit_id: string; quantity: string }>('SELECT id,material_id,product_id,unit_id,quantity::text FROM material_issue_lines WHERE issue_id=$1 ORDER BY product_id,unit_id,id', [issue.id])).rows;
    if (request.body.action === 'approve') {
      if (issue.approval !== 'pending') throw new Problem(409, 'STATE_TRANSITION', '只有待审核领料可以过账');
      if (order.execution === 'cancelled') throw new Problem(409, 'STATE_TRANSITION', '已取消加工单不能领料过账');
      for (const line of lines) {
        const material = (await sql.query<{ required_qty: string; issued_qty: string }>('SELECT required_qty::text,issued_qty::text FROM work_order_materials WHERE id=$1 FOR UPDATE', [line.material_id])).rows[0]!;
        if (q(material.issued_qty) + q(line.quantity) > q(material.required_qty)) throw new Problem(422, 'OVER_ISSUE', '领料不能超过冻结需求');
        await postStock(sql, a, { warehouseId: issue.warehouse_id, productId: line.product_id, unitId: line.unit_id, direction: 'out', quantity: q(line.quantity), sourceType: 'material_issue', sourceId: issue.id, eventKey: `material_issue:${line.id}` });
      }
      await sql.query("UPDATE material_issues SET approval='approved',version=version+1,updated_at=now() WHERE id=$1", [issue.id]);
    } else if (request.body.action === 'reject') {
      if (issue.approval !== 'pending') throw new Problem(409, 'STATE_TRANSITION', '只有待审核领料可以驳回');
      await sql.query("UPDATE material_issues SET approval='rejected',version=version+1,updated_at=now() WHERE id=$1", [issue.id]);
    } else {
      if (issue.approval !== 'approved') throw new Problem(409, 'STATE_TRANSITION', '只有已过账领料可以冲销');
      needReason(request.body.reason, '冲销领料必须填写原因');
      if (order.started_at !== null || order.execution !== 'not_started' || (await sql.query("SELECT id FROM production_reports WHERE work_order_id=$1 AND approval IN ('pending','approved') LIMIT 1", [order.id])).rows[0]) throw new Problem(409, 'DOWNSTREAM_EXISTS', '加工单已经开工或有报工；当前仅支持未开工领料更正，不能把已投入材料整笔返库');
      if ((await sql.query("SELECT id FROM fg_receipts WHERE work_order_id=$1 AND approval='approved' LIMIT 1", [order.id])).rows[0]) throw new Problem(409, 'DOWNSTREAM_EXISTS', '已有成品入库，不能直接冲销领料');
      for (const line of lines) await postStock(sql, a, { warehouseId: issue.warehouse_id, productId: line.product_id, unitId: line.unit_id, direction: 'in', quantity: q(line.quantity), sourceType: 'material_issue', sourceId: issue.id, eventKey: `material_issue_reverse:${line.id}`, originalEventKey: `material_issue:${line.id}` });
      await sql.query("UPDATE material_issues SET approval='reversed',version=version+1,updated_at=now() WHERE id=$1", [issue.id]);
    }
    await recomputeIssued(sql, lines.map((line) => line.material_id));
    if (request.body.request_key) await finishCommand(sql, a.tenant_id, `material_issue.${request.body.action}`, request.body.request_key, hash, 'material_issue', issue.id);
    const body = await issueView(sql, issue.id);
    await writeAudit(sql, a, `material_issue.${request.body.action}`, 'material_issue', issue.id, { approval: issue.approval }, { ...body.material_issue, action_reason: request.body.reason?.trim() ?? '' });
    return { replayed: false, ...body };
  }));

  app.post<{ Body: { request_key: string; work_order_id: string; quantity: string } }>('/api/fg-receipts', { preHandler: guard, schema: { body: object(['request_key', 'work_order_id', 'quantity'], { request_key: requestKey, work_order_id: uuid, quantity: decimalField }) } }, async (request, reply) => {
    const hash = digest(request.body);
    const created = await run(request, async (sql, a) => {
      permit(a, 'inventory.write');
      const replay = await beginCommand(sql, 'fg_receipt.create', request.body.request_key, hash);
      if (replay) return { replayed: true, ...(await receiptView(sql, replay)) };
      const order = await lockWorkOrder(sql, request.body.work_order_id);
      if (order.execution === 'cancelled') throw new Problem(409, 'STATE_TRANSITION', '已取消加工单不能入库');
      const task = (await sql.query<{ id: string; is_output: boolean }>('SELECT id,is_output FROM work_order_tasks WHERE work_order_id=$1 AND is_output', [order.id])).rows[0];
      if (!task?.is_output) throw new Problem(422, 'OUTPUT_TASK_REQUIRED', '成品入库必须指向冻结路线的产出任务，不能把每道工序都入库');
      const quantity = decimal(request.body.quantity, { positive: true });
      const id = (await sql.query<{ id: string }>('INSERT INTO fg_receipts(tenant_id,code,work_order_id,task_id,warehouse_id,product_id,unit_id,quantity,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id', [a.tenant_id, await nextCode(sql, a.tenant_id, 'FG', 'FG'), order.id, task.id, order.warehouse_id, order.product_id, order.unit_id, formatDecimal(quantity), a.user_id])).rows[0]!.id;
      await finishCommand(sql, a.tenant_id, 'fg_receipt.create', request.body.request_key, hash, 'fg_receipt', id);
      const body = await receiptView(sql, id);
      await writeAudit(sql, a, 'fg_receipt.created', 'fg_receipt', id, null, body.fg_receipt);
      return { replayed: false, ...body };
    });
    return reply.code(created.replayed ? 200 : 201).send(created);
  });
  app.post<{ Params: { id: string }; Body: { action: string; version: number; request_key?: string; reason?: string } }>('/api/fg-receipts/:id/actions', { preHandler: guard, schema: { params: idParams, body: object(['action', 'version'], { action: { type: 'string', enum: ['approve', 'reject', 'reverse'] }, version: versionField, request_key: requestKey, reason: reasonText }, ['request_key','reason']) } }, (request) => run(request, async (sql, a) => {
    permit(a, 'inventory.approve');
    const hash = digest({ id: request.params.id, ...request.body });
    if (request.body.request_key) { const replay = await beginCommand(sql, `fg_receipt.${request.body.action}`, request.body.request_key, hash); if (replay) return { replayed: true, ...(await receiptView(sql, replay)) }; }
    const receipt = (await sql.query<{ id: string; work_order_id: string; warehouse_id: string; product_id: string; unit_id: string; quantity: string; approval: string; version: number }>('SELECT id,work_order_id,warehouse_id,product_id,unit_id,quantity::text,approval,version FROM fg_receipts WHERE id=$1 FOR UPDATE', [request.params.id])).rows[0];
    if (!receipt) throw new Problem(404, 'FG_RECEIPT_NOT_FOUND', '成品入库单不存在');
    if (receipt.version !== request.body.version) throw new Problem(409, 'VERSION_CONFLICT', '成品入库单已被修改，请刷新');
    const order = await lockWorkOrder(sql, receipt.work_order_id);
    const task = (await tasksOf(sql, order.id)).find((item) => item.is_output)!;
    const received = q((await sql.query<{ n: string }>("SELECT coalesce(sum(quantity),0)::text AS n FROM fg_receipts WHERE work_order_id=$1 AND approval='approved' AND id<>$2", [order.id, receipt.id])).rows[0]!.n);
    if (request.body.action === 'approve') {
      if (receipt.approval !== 'pending') throw new Problem(409, 'STATE_TRANSITION', '只有待审核成品入库可以过账');
      const available = outputProductQty(task);
      if (received + q(receipt.quantity) > available) throw new Problem(422, 'OVER_RECEIPT', '成品入库不能超过末道已审核净产出，其他工序报工不增加成品');
      if (order.requires_fg_inspection) {
        const accepted = q((await sql.query<{ n: string }>("SELECT coalesce(sum(accepted_qty),0)::text AS n FROM inspections WHERE work_order_id=$1 AND state='completed' AND conclusion='pass'", [order.id])).rows[0]!.n);
        if (accepted < received + q(receipt.quantity)) throw new Problem(422, 'QUALITY_REQUIRED', '检验放行数量不足，不能过账成品入库');
      }
      await postStock(sql, a, { warehouseId: receipt.warehouse_id, productId: receipt.product_id, unitId: receipt.unit_id, direction: 'in', quantity: q(receipt.quantity), sourceType: 'fg_receipt', sourceId: receipt.id, eventKey: `fg_receipt:${receipt.id}` });
      await sql.query("UPDATE fg_receipts SET approval='approved',version=version+1,updated_at=now() WHERE id=$1", [receipt.id]);
    } else if (request.body.action === 'reject') {
      if (receipt.approval !== 'pending') throw new Problem(409, 'STATE_TRANSITION', '只有待审核成品入库可以驳回');
      await sql.query("UPDATE fg_receipts SET approval='rejected',version=version+1,updated_at=now() WHERE id=$1", [receipt.id]);
    } else {
      if (receipt.approval !== 'approved') throw new Problem(409, 'STATE_TRANSITION', '只有已过账成品入库可以冲销');
      needReason(request.body.reason, '冲销成品入库必须填写原因');
      await postStock(sql, a, { warehouseId: receipt.warehouse_id, productId: receipt.product_id, unitId: receipt.unit_id, direction: 'out', quantity: q(receipt.quantity), sourceType: 'fg_receipt', sourceId: receipt.id, eventKey: `fg_receipt_reverse:${receipt.id}`, originalEventKey: `fg_receipt:${receipt.id}` });
      await sql.query("UPDATE fg_receipts SET approval='reversed',version=version+1,updated_at=now() WHERE id=$1", [receipt.id]);
    }
    if (request.body.request_key) await finishCommand(sql, a.tenant_id, `fg_receipt.${request.body.action}`, request.body.request_key, hash, 'fg_receipt', receipt.id);
    const body = await receiptView(sql, receipt.id);
    await writeAudit(sql, a, `fg_receipt.${request.body.action}`, 'fg_receipt', receipt.id, { approval: receipt.approval }, { ...body.fg_receipt, action_reason: request.body.reason?.trim() ?? '' });
    return { replayed: false, ...body };
  }));

  app.post<{ Body: { request_key: string; sales_order_id: string; warehouse_id: string; lines: { sales_line_id: string; quantity: string }[] } }>('/api/shipments', { preHandler: guard, schema: { body: object(['request_key', 'sales_order_id', 'warehouse_id', 'lines'], { request_key: requestKey, sales_order_id: uuid, warehouse_id: uuid, lines: { type: 'array', minItems: 1, maxItems: 50, items: object(['sales_line_id', 'quantity'], { sales_line_id: uuid, quantity: decimalField }) } }) } }, async (request, reply) => {
    const hash = digest(request.body);
    const created = await run(request, async (sql, a) => {
      permit(a, 'inventory.write');
      const replay = await beginCommand(sql, 'shipment.create', request.body.request_key, hash);
      if (replay) return { replayed: true, ...(await shipmentView(sql, replay)) };
      await activeWarehouse(sql, request.body.warehouse_id);
      const order = (await sql.query<{ id: string; lifecycle: string; approval: string }>('SELECT id,lifecycle,approval FROM sales_orders WHERE id=$1 FOR UPDATE', [request.body.sales_order_id])).rows[0];
      if (!order || order.lifecycle !== 'open' || order.approval !== 'approved') throw new Problem(422, 'SALES_ORDER_NOT_OPEN', '只能对已审核开放的销售订单发货');
      const id = (await sql.query<{ id: string }>('INSERT INTO shipments(tenant_id,code,sales_order_id,warehouse_id,created_by) VALUES($1,$2,$3,$4,$5) RETURNING id', [a.tenant_id, await nextCode(sql, a.tenant_id, 'SH', 'SH'), order.id, request.body.warehouse_id, a.user_id])).rows[0]!.id;
      const seen = new Set<string>();
      for (const line of request.body.lines) {
        if (seen.has(line.sales_line_id)) throw new Problem(422, 'DUPLICATE_LINE', '同一发货单不能重复同一销售行');
        seen.add(line.sales_line_id);
        const source = (await sql.query<{ id: string; product_id: string; unit_id: string; quantity: string; shipped_qty: string }>('SELECT id,product_id,unit_id,quantity::text,shipped_qty::text FROM sales_order_lines WHERE id=$1 AND order_id=$2 FOR UPDATE', [line.sales_line_id, order.id])).rows[0];
        if (!source) throw new Problem(422, 'INVALID_REFERENCE', '发货行不属于该销售订单');
        const quantity = decimal(line.quantity, { positive: true });
        const pending = q((await sql.query<{ n: string }>("SELECT coalesce(sum(sl.quantity),0)::text AS n FROM shipment_lines sl JOIN shipments s ON s.tenant_id=sl.tenant_id AND s.id=sl.shipment_id WHERE sl.sales_line_id=$1 AND s.approval='pending'", [source.id])).rows[0]!.n);
        if (q(source.shipped_qty) + pending + quantity > q(source.quantity)) throw new Problem(422, 'OVER_SHIP', '默认禁止超发');
        await sql.query('INSERT INTO shipment_lines(tenant_id,shipment_id,sales_line_id,product_id,unit_id,quantity) VALUES($1,$2,$3,$4,$5,$6)', [a.tenant_id, id, source.id, source.product_id, source.unit_id, formatDecimal(quantity)]);
      }
      await finishCommand(sql, a.tenant_id, 'shipment.create', request.body.request_key, hash, 'shipment', id);
      const body = await shipmentView(sql, id);
      await writeAudit(sql, a, 'shipment.created', 'shipment', id, null, body.shipment);
      return { replayed: false, ...body };
    });
    return reply.code(created.replayed ? 200 : 201).send(created);
  });
  app.post<{ Params: { id: string }; Body: { action: string; version: number; request_key?: string; reason?: string } }>('/api/shipments/:id/actions', { preHandler: guard, schema: { params: idParams, body: object(['action', 'version'], { action: { type: 'string', enum: ['approve', 'reject', 'reverse'] }, version: versionField, request_key: requestKey, reason: reasonText }, ['request_key','reason']) } }, (request) => run(request, async (sql, a) => {
    permit(a, 'inventory.approve');
    const hash = digest({ id: request.params.id, ...request.body });
    if (request.body.request_key) { const replay = await beginCommand(sql, `shipment.${request.body.action}`, request.body.request_key, hash); if (replay) return { replayed: true, ...(await shipmentView(sql, replay)) }; }
    const shipment = (await sql.query<{ id: string; sales_order_id: string; warehouse_id: string; approval: string; version: number }>('SELECT id,sales_order_id,warehouse_id,approval,version FROM shipments WHERE id=$1 FOR UPDATE', [request.params.id])).rows[0];
    if (!shipment) throw new Problem(404, 'SHIPMENT_NOT_FOUND', '发货单不存在');
    if (shipment.version !== request.body.version) throw new Problem(409, 'VERSION_CONFLICT', '发货单已被修改，请刷新');
    const salesOrder = (await sql.query<{ lifecycle: string; approval: string }>('SELECT lifecycle,approval FROM sales_orders WHERE id=$1 FOR UPDATE', [shipment.sales_order_id])).rows[0];
    const lines = (await sql.query<{ id: string; sales_line_id: string; product_id: string; unit_id: string; quantity: string }>('SELECT id,sales_line_id,product_id,unit_id,quantity::text FROM shipment_lines WHERE shipment_id=$1 ORDER BY product_id,unit_id,id', [shipment.id])).rows;
    if (request.body.action === 'approve') {
      if (shipment.approval !== 'pending') throw new Problem(409, 'STATE_TRANSITION', '只有待审核发货可以过账');
      if (!salesOrder || salesOrder.lifecycle !== 'open' || salesOrder.approval !== 'approved') throw new Problem(409, 'SALES_ORDER_NOT_OPEN', '销售订单已关闭、取消或未批准，当前发货不能过账');
      for (const line of lines) {
        const source = (await sql.query<{ quantity: string; shipped_qty: string }>('SELECT quantity::text,shipped_qty::text FROM sales_order_lines WHERE id=$1 FOR UPDATE', [line.sales_line_id])).rows[0]!;
        if (q(source.shipped_qty) + q(line.quantity) > q(source.quantity)) throw new Problem(422, 'OVER_SHIP', '默认禁止超发');
        await postStock(sql, a, { warehouseId: shipment.warehouse_id, productId: line.product_id, unitId: line.unit_id, direction: 'out', quantity: q(line.quantity), sourceType: 'shipment', sourceId: shipment.id, eventKey: `shipment:${line.id}` });
      }
      await sql.query("UPDATE shipments SET approval='approved',version=version+1,updated_at=now() WHERE id=$1", [shipment.id]);
    } else if (request.body.action === 'reject') {
      if (shipment.approval !== 'pending') throw new Problem(409, 'STATE_TRANSITION', '只有待审核发货可以驳回');
      await sql.query("UPDATE shipments SET approval='rejected',version=version+1,updated_at=now() WHERE id=$1", [shipment.id]);
    } else {
      if (shipment.approval !== 'approved') throw new Problem(409, 'STATE_TRANSITION', '只有已过账发货可以冲销');
      needReason(request.body.reason, '冲销发货必须填写原因');
      if (!salesOrder || salesOrder.lifecycle !== 'open') throw new Problem(409, 'DOWNSTREAM_EXISTS', '销售订单已关闭或取消；需先处理来源关闭，不能直接冲销发货留下未履约数量');
      for (const line of lines) await postStock(sql, a, { warehouseId: shipment.warehouse_id, productId: line.product_id, unitId: line.unit_id, direction: 'in', quantity: q(line.quantity), sourceType: 'shipment', sourceId: shipment.id, eventKey: `shipment_reverse:${line.id}`, originalEventKey: `shipment:${line.id}` });
      await sql.query("UPDATE shipments SET approval='reversed',version=version+1,updated_at=now() WHERE id=$1", [shipment.id]);
    }
    await recomputeShipped(sql, lines.map((line) => line.sales_line_id));
    if (request.body.request_key) await finishCommand(sql, a.tenant_id, `shipment.${request.body.action}`, request.body.request_key, hash, 'shipment', shipment.id);
    const body = await shipmentView(sql, shipment.id);
    await writeAudit(sql, a, `shipment.${request.body.action}`, 'shipment', shipment.id, { approval: shipment.approval }, { ...body.shipment, action_reason: request.body.reason?.trim() ?? '' });
    return { replayed: false, ...body };
  }));

  app.post<{ Body: { request_key: string; warehouse_id: string; product_id: string; direction: 'in' | 'out'; quantity: string; reason: string } }>('/api/stock-adjustments', { preHandler: guard, schema: { body: object(['request_key', 'warehouse_id', 'product_id', 'direction', 'quantity', 'reason'], { request_key: requestKey, warehouse_id: uuid, product_id: uuid, direction: { type: 'string', enum: ['in', 'out'] }, quantity: decimalField, reason: reasonText }) } }, async (request, reply) => {
    const hash = digest(request.body);
    const created = await run(request, async (sql, a) => {
      permit(a, 'inventory.write');
      const replay = await beginCommand(sql, 'adjustment.create', request.body.request_key, hash);
      if (replay) return { replayed: true, ...(await adjustmentView(sql, replay)) };
      await activeWarehouse(sql, request.body.warehouse_id);
      const product = await activeProduct(sql, request.body.product_id);
      const quantity = decimal(request.body.quantity, { positive: true });
      const id = (await sql.query<{ id: string }>('INSERT INTO stock_adjustments(tenant_id,code,warehouse_id,product_id,unit_id,direction,quantity,reason,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id', [a.tenant_id, await nextCode(sql, a.tenant_id, 'AD', 'AD'), request.body.warehouse_id, product.id, product.unit_id, request.body.direction, formatDecimal(quantity), request.body.reason.trim(), a.user_id])).rows[0]!.id;
      await finishCommand(sql, a.tenant_id, 'adjustment.create', request.body.request_key, hash, 'stock_adjustment', id);
      const body = await adjustmentView(sql, id);
      await writeAudit(sql, a, 'adjustment.created', 'stock_adjustment', id, null, body.stock_adjustment);
      return { replayed: false, ...body };
    });
    return reply.code(created.replayed ? 200 : 201).send(created);
  });
  app.post<{ Params: { id: string }; Body: { action: string; version: number; request_key?: string; reason?: string } }>('/api/stock-adjustments/:id/actions', { preHandler: guard, schema: { params: idParams, body: object(['action', 'version'], { action: { type: 'string', enum: ['approve', 'reject', 'reverse'] }, version: versionField, request_key: requestKey, reason: reasonText }, ['request_key','reason']) } }, (request) => run(request, async (sql, a) => {
    permit(a, 'inventory.approve');
    const hash = digest({ id: request.params.id, ...request.body });
    if (request.body.request_key) { const replay = await beginCommand(sql, `adjustment.${request.body.action}`, request.body.request_key, hash); if (replay) return { replayed: true, ...(await adjustmentView(sql, replay)) }; }
    const row = (await sql.query<{ id: string; warehouse_id: string; product_id: string; unit_id: string; direction: 'in' | 'out'; quantity: string; approval: string; version: number }>('SELECT id,warehouse_id,product_id,unit_id,direction,quantity::text,approval,version FROM stock_adjustments WHERE id=$1 FOR UPDATE', [request.params.id])).rows[0];
    if (!row) throw new Problem(404, 'ADJUSTMENT_NOT_FOUND', '库存调整不存在');
    if (row.version !== request.body.version) throw new Problem(409, 'VERSION_CONFLICT', '库存调整已被修改，请刷新');
    const opposite = row.direction === 'in' ? 'out' : 'in';
    if (request.body.action === 'approve') {
      if (row.approval !== 'pending') throw new Problem(409, 'STATE_TRANSITION', '只有待审核调整可以过账');
      await postStock(sql, a, { warehouseId: row.warehouse_id, productId: row.product_id, unitId: row.unit_id, direction: row.direction, quantity: q(row.quantity), sourceType: 'adjustment', sourceId: row.id, eventKey: `adjustment:${row.id}` });
      await sql.query("UPDATE stock_adjustments SET approval='approved',version=version+1,updated_at=now() WHERE id=$1", [row.id]);
    } else if (request.body.action === 'reject') {
      if (row.approval !== 'pending') throw new Problem(409, 'STATE_TRANSITION', '只有待审核调整可以驳回');
      await sql.query("UPDATE stock_adjustments SET approval='rejected',version=version+1,updated_at=now() WHERE id=$1", [row.id]);
    } else {
      if (row.approval !== 'approved') throw new Problem(409, 'STATE_TRANSITION', '只有已过账调整可以冲销');
      needReason(request.body.reason, '冲销库存调整必须填写原因');
      await postStock(sql, a, { warehouseId: row.warehouse_id, productId: row.product_id, unitId: row.unit_id, direction: opposite, quantity: q(row.quantity), sourceType: 'adjustment', sourceId: row.id, eventKey: `adjustment_reverse:${row.id}`, originalEventKey: `adjustment:${row.id}` });
      await sql.query("UPDATE stock_adjustments SET approval='reversed',version=version+1,updated_at=now() WHERE id=$1", [row.id]);
    }
    if (request.body.request_key) await finishCommand(sql, a.tenant_id, `adjustment.${request.body.action}`, request.body.request_key, hash, 'stock_adjustment', row.id);
    const body = await adjustmentView(sql, row.id);
    await writeAudit(sql, a, `adjustment.${request.body.action}`, 'stock_adjustment', row.id, { approval: row.approval }, { ...body.stock_adjustment, action_reason: request.body.reason?.trim() ?? '' });
    return { replayed: false, ...body };
  }));

  app.post<{ Body: { request_key: string; work_order_id: string; inspected_qty: string; good_qty: string; defect_qty: string; note?: string } }>('/api/inspections', { preHandler: guard, schema: { body: object(['request_key', 'work_order_id', 'inspected_qty', 'good_qty', 'defect_qty'], { request_key: requestKey, work_order_id: uuid, inspected_qty: decimalField, good_qty: decimalField, defect_qty: decimalField, note }, ['note']) } }, async (request, reply) => {
    const inspected = decimal(request.body.inspected_qty, { positive: true }), good = decimal(request.body.good_qty), defect = decimal(request.body.defect_qty);
    if (good + defect !== inspected) throw new Problem(422, 'INSPECTION_QUANTITY', '检验合格与不合格之和必须等于送检数量');
    const hash = digest({ ...request.body, note: request.body.note ?? '' });
    const created = await run(request, async (sql, a) => {
      permit(a, 'quality.write');
      const replay = await beginCommand(sql, 'inspection.create', request.body.request_key, hash);
      if (replay) return { replayed: true, ...(await inspectionView(sql, replay)) };
      const order = await lockWorkOrder(sql, request.body.work_order_id);
      if (order.execution === 'cancelled') throw new Problem(409, 'STATE_TRANSITION', '已取消加工单不能送检');
      await inspectionCapacity(sql, order.id, inspected);
      const id = (await sql.query<{ id: string }>('INSERT INTO inspections(tenant_id,code,work_order_id,inspected_qty,good_qty,defect_qty,note,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id', [a.tenant_id, await nextCode(sql, a.tenant_id, 'QC', 'QC'), order.id, formatDecimal(inspected), formatDecimal(good), formatDecimal(defect), request.body.note ?? '', a.user_id])).rows[0]!.id;
      await finishCommand(sql, a.tenant_id, 'inspection.create', request.body.request_key, hash, 'inspection', id);
      const body = await inspectionView(sql, id);
      await writeAudit(sql, a, 'inspection.created', 'inspection', id, null, body.inspection);
      return { replayed: false, ...body };
    });
    return reply.code(created.replayed ? 200 : 201).send(created);
  });
  app.post<{ Params: { id: string }; Body: { action: string; version: number; conclusion?: string; reason?:string; request_key?: string } }>('/api/inspections/:id/actions', { preHandler: guard, schema: { params: idParams, body: object(['action', 'version'], { action: { type: 'string', enum: ['complete','reverse','cancel'] }, version: versionField, reason:reasonText, conclusion: { type: 'string', enum: ['pass', 'fail'] }, request_key: requestKey }, ['conclusion', 'reason', 'request_key']) } }, (request) => run(request, async (sql, a) => {
    permit(a, 'quality.write');
    if (request.body.action==='complete'&&!request.body.conclusion) throw new Problem(422, 'CONCLUSION_REQUIRED', '完成检验必须给出合格或不合格结论');
    const hash = digest({ id: request.params.id, ...request.body });
    if (request.body.request_key) { const replay = await beginCommand(sql, 'inspection.'+request.body.action, request.body.request_key, hash); if (replay) return { replayed: true, ...(await inspectionView(sql, replay)) }; }
    const row = (await sql.query<{ id: string; work_order_id: string; inspected_qty: string; state: string; version: number; good_qty: string }>('SELECT id,work_order_id,inspected_qty::text,state,version,good_qty::text FROM inspections WHERE id=$1 FOR UPDATE', [request.params.id])).rows[0];
    if (!row) throw new Problem(404, 'INSPECTION_NOT_FOUND', '检验记录不存在');
    if (row.version !== request.body.version) throw new Problem(409, 'VERSION_CONFLICT', '检验记录已被修改，请刷新');
    const order = await lockWorkOrder(sql, row.work_order_id);
    if (order.execution === 'cancelled') throw new Problem(409, 'STATE_TRANSITION', '已取消加工单不能修改检验');
    if(request.body.action==='complete'){
      if(row.state!=='pending')throw new Problem(409,'STATE_TRANSITION','只有待检记录可完成');
      await inspectionCapacity(sql,row.work_order_id,q(row.inspected_qty),row.id);
      const accepted=request.body.conclusion==='pass'?q(row.good_qty):0n;
      await sql.query("UPDATE inspections SET state='completed',conclusion=$2,accepted_qty=$3,version=version+1,updated_at=now() WHERE id=$1",[row.id,request.body.conclusion,formatDecimal(accepted)]);
    }else{
      needReason(request.body.reason,'撤销或取消检验必须填写原因');
      if(request.body.action==='reverse'?row.state!=='completed':row.state!=='pending')throw new Problem(409,'STATE_TRANSITION','当前检验状态不能撤销或取消');
      if((await sql.query("SELECT id FROM fg_receipts WHERE work_order_id=$1 AND approval IN ('pending','approved') LIMIT 1",[row.work_order_id])).rows[0])throw new Problem(409,'DOWNSTREAM_EXISTS','已有引用放行结果的成品入库，先处理入库');
      await sql.query("UPDATE inspections SET state=$2,conclusion='pending',accepted_qty=0,version=version+1,updated_at=now() WHERE id=$1",[row.id,request.body.action==='reverse'?'reversed':'cancelled']);
    }
    if(request.body.request_key)await finishCommand(sql,a.tenant_id,'inspection.'+request.body.action,request.body.request_key,hash,'inspection',row.id);
    const body = await inspectionView(sql, row.id);
    await writeAudit(sql, a, 'inspection.'+request.body.action, 'inspection', row.id, { state: row.state }, {...body.inspection,action_reason:request.body.reason??''});
    return { replayed: false, ...body };
  }));

  app.get<{ Querystring: { work_order_id?: string } }>('/api/material-issues', { preHandler: guard, schema: { querystring: { type: 'object', additionalProperties: false, properties: { work_order_id: uuid } } } }, (request) => database.tenant(context(request), async (sql) => {
    permit(actor(request), 'inventory.read'); requireAllScope(actor(request));
    const ids = (await sql.query<{ id: string }>(request.query.work_order_id ? 'SELECT id FROM material_issues WHERE work_order_id=$1 ORDER BY created_at DESC LIMIT 100' : 'SELECT id FROM material_issues ORDER BY created_at DESC LIMIT 100', request.query.work_order_id ? [request.query.work_order_id] : [])).rows;
    return { items: await Promise.all(ids.map(async (row) => (await issueView(sql, row.id)).material_issue)), limit: 100 };
  }));
  app.get<{ Querystring: { work_order_id?: string } }>('/api/fg-receipts', { preHandler: guard, schema: { querystring: { type: 'object', additionalProperties: false, properties: { work_order_id: uuid } } } }, (request) => database.tenant(context(request), async (sql) => {
    permit(actor(request), 'inventory.read'); requireAllScope(actor(request));
    const ids = (await sql.query<{ id: string }>(request.query.work_order_id ? 'SELECT id FROM fg_receipts WHERE work_order_id=$1 ORDER BY created_at DESC LIMIT 100' : 'SELECT id FROM fg_receipts ORDER BY created_at DESC LIMIT 100', request.query.work_order_id ? [request.query.work_order_id] : [])).rows;
    return { items: await Promise.all(ids.map(async (row) => (await receiptView(sql, row.id)).fg_receipt)), limit: 100 };
  }));
  app.get<{ Querystring: { sales_order_id?: string } }>('/api/shipments', { preHandler: guard, schema: { querystring: { type: 'object', additionalProperties: false, properties: { sales_order_id: uuid } } } }, (request) => database.tenant(context(request), async (sql) => {
    permit(actor(request), 'inventory.read'); requireAllScope(actor(request));
    const ids = (await sql.query<{ id: string }>(request.query.sales_order_id ? 'SELECT id FROM shipments WHERE sales_order_id=$1 ORDER BY created_at DESC LIMIT 100' : 'SELECT id FROM shipments ORDER BY created_at DESC LIMIT 100', request.query.sales_order_id ? [request.query.sales_order_id] : [])).rows;
    return { items: await Promise.all(ids.map(async (row) => (await shipmentView(sql, row.id)).shipment)), limit: 100 };
  }));
  app.get('/api/stock-adjustments', { preHandler: guard }, (request) => database.tenant(context(request), async (sql) => {
    permit(actor(request), 'inventory.read'); requireAllScope(actor(request));
    const ids = (await sql.query<{ id: string }>('SELECT id FROM stock_adjustments ORDER BY created_at DESC LIMIT 100')).rows;
    return { items: await Promise.all(ids.map(async (row) => (await adjustmentView(sql, row.id)).stock_adjustment)), limit: 100 };
  }));
  app.get<{ Querystring: { work_order_id?: string } }>('/api/inspections', { preHandler: guard, schema: { querystring: { type: 'object', additionalProperties: false, properties: { work_order_id: uuid } } } }, (request) => database.tenant(context(request), async (sql) => {
    permit(actor(request), 'quality.read'); requireAllScope(actor(request));
    const ids = (await sql.query<{ id: string }>(request.query.work_order_id ? 'SELECT id FROM inspections WHERE work_order_id=$1 ORDER BY created_at DESC LIMIT 100' : 'SELECT id FROM inspections ORDER BY created_at DESC LIMIT 100', request.query.work_order_id ? [request.query.work_order_id] : [])).rows;
    return { items: await Promise.all(ids.map(async (row) => (await inspectionView(sql, row.id)).inspection)), limit: 100 };
  }));

  app.get('/api/stock/balances', { preHandler: guard }, (request) => database.tenant(context(request), async (sql) => { permit(actor(request), 'inventory.read'); requireAllScope(actor(request)); return { items: (await sql.query("SELECT b.warehouse_id,w.code AS warehouse_code,b.product_id,p.code AS product_code,p.name AS product_name,b.unit_id,u.name AS unit_name,b.on_hand::text,b.held_qty::text,b.blocked_qty::text,b.reserved_qty::text,(b.on_hand-b.held_qty-b.blocked_qty-b.reserved_qty)::text AS available_qty,b.version FROM stock_balances b JOIN warehouses w ON w.tenant_id=b.tenant_id AND w.id=b.warehouse_id JOIN products p ON p.tenant_id=b.tenant_id AND p.id=b.product_id JOIN units u ON u.tenant_id=b.tenant_id AND u.id=b.unit_id ORDER BY w.code,p.code")).rows.map((row) => ({ ...row, on_hand: formatDecimal(q(String(row.on_hand))) })), negative_stock_allowed: false }; }));
  app.get('/api/stock/ledger', { preHandler: guard }, (request) => database.tenant(context(request), async (sql) => { permit(actor(request), 'inventory.read'); requireAllScope(actor(request)); return { items: (await sql.query('SELECT id,warehouse_id,product_id,unit_id,direction,quantity::text,source_type,source_id,event_key,reversal_of,posted_at FROM stock_ledger ORDER BY posted_at DESC,id DESC LIMIT 200')).rows.map((row) => ({ ...row, quantity: formatDecimal(q(String(row.quantity))) })), limit: 200, append_only: true }; }));

  app.post<{Params:{id:string};Body:{request_key:string;version:number;good_qty:string;defect_qty:string;rework_qty:string;scrap_qty:string;effective_seconds?:number;defect_note?:string;reason:string}}>('/api/production-reports/:id/resubmit',{preHandler:guard,schema:{params:idParams,body:object(['request_key','version','good_qty','defect_qty','rework_qty','scrap_qty','reason'],{request_key:requestKey,version:versionField,good_qty:decimalField,defect_qty:decimalField,rework_qty:decimalField,scrap_qty:decimalField,effective_seconds:{type:'integer',minimum:0,maximum:2678400},defect_note:{type:'string',maxLength:500},reason:reasonText},['effective_seconds','defect_note'])}},r=>run(r,async(sql,a)=>{
    permit(a,'production.report');const b=r.body,hash=digest({id:r.params.id,...b}),prior=await beginCommand(sql,'report.resubmit',b.request_key,hash);if(prior)return {replayed:true,...await reportView(sql,prior,a)};
    needReason(b.reason,'重新提交必须填写更正原因');
    const old=(await sql.query<{id:string;task_id:string;operator_id:string;process_id:string;approval:string;version:number;wage_snapshot:WageSnapshot|null;effective_seconds:number;supplement_id:string|null}>('SELECT * FROM production_reports WHERE id=$1 FOR UPDATE',[r.params.id])).rows[0];if(!old)throw new Problem(404,'REPORT_NOT_FOUND','报工不存在');if(old.version!==b.version)throw new Problem(409,'VERSION_CONFLICT','报工已修改');if(old.approval!=='rejected')throw new Problem(409,'STATE_TRANSITION','仅驳回报工可更正后重提');
    const task=(await sql.query<TaskRow>('SELECT *,plan_qty::text,unit_ratio::text FROM work_order_tasks WHERE id=$1',[old.task_id])).rows[0]!,order=await lockWorkOrder(sql,task.work_order_id);
    if(task.execution!=='running'||order.execution!=='running')throw new Problem(409,'STATE_TRANSITION','只有当前执行中的任务可以重提报工');await assertOperator(sql,a,old.process_id,old.operator_id);
    const good=q(b.good_qty),bad=q(b.defect_qty),rework=q(b.rework_qty),scrap=q(b.scrap_qty),seconds=b.effective_seconds??old.effective_seconds;
    if(good+bad===0n&&!(old.wage_snapshot?.mode==='time'&&seconds>0))throw new Problem(422,'EMPTY_REPORT','空数量报工必须有冻结计时规则与有效工时');
    if(rework+scrap>bad)throw new Problem(422,'DISPOSITION_EXCEEDS_DEFECT','不良处置数量超出不良');
    if(bad>0n&&!b.defect_note?.trim())throw new Problem(422,'DEFECT_NOTE_REQUIRED','不良必须填写说明');
    const used=(await sql.query<{n:string;good:string}>("SELECT coalesce(sum(good_qty+defect_qty),0)::text AS n,coalesce(sum(good_qty),0)::text AS good FROM production_reports WHERE task_id=$1 AND approval IN ('pending','approved')",[task.id])).rows[0]!;
    const repairs=q((await sql.query<{n:string}>("SELECT coalesce(sum(good_qty),0)::text AS n FROM rework_reports WHERE task_id=$1 AND approval IN ('pending','approved')",[task.id])).rows[0]!.n);
    const previous=(await tasksOf(sql,order.id)).filter(t=>t.sequence<task.sequence).at(-1),cap=previous?mulCeil(divFloor(q(previous.approved_good),q(previous.unit_ratio)),q(task.unit_ratio)):q(task.plan_qty);
    let extra=0n;if(old.supplement_id){const source=(await sql.query<{quantity:string}>("SELECT quantity::text FROM production_supplements WHERE id=$1 AND approval='approved'",[old.supplement_id])).rows[0];if(!source)throw new Problem(422,'SUPPLEMENT_SOURCE_REQUIRED','追加投入来源失效');const usedSource=q((await sql.query<{n:string}>("SELECT coalesce(sum(good_qty+defect_qty),0)::text AS n FROM production_reports WHERE supplement_id=$1 AND approval IN ('pending','approved')",[old.supplement_id])).rows[0]!.n);if(usedSource+good+bad>q(source.quantity))throw new Problem(422,'OVER_SUPPLEMENT','追加来源超量');extra=q((await sql.query<{n:string}>("SELECT coalesce(sum(quantity),0)::text AS n FROM production_supplements WHERE task_id=$1 AND approval='approved'",[task.id])).rows[0]!.n);}
    if(q(used.good)+repairs+good>q(task.plan_qty)||q(used.n)+good+bad>cap+extra)throw new Problem(422,'OVER_PLAN','更正后报工超过投入来源或净合格上限');
    let snapshot=old.wage_snapshot;
    if(snapshot?.status==='priced'){const amount=snapshot.mode==='piece'?lineCents(good,snapshot.rate!):roundMoney(BigInt(seconds)*priceRate(snapshot.rate!),360_000_000n);snapshot={...snapshot,good_qty:formatDecimal(good),effective_seconds:seconds,amount_cents:amount.toString(),amount:cashMoney(amount)};if(snapshot.mode==='time'&&seconds===0)throw new Problem(422,'TIME_REQUIRED','计时工时须大于零');}
    await sql.query("UPDATE production_reports SET good_qty=$1,defect_qty=$2,rework_qty=$3,scrap_qty=$4,defect_note=$5,effective_seconds=$6,wage_snapshot=$7,approval='pending',reject_reason='',version=version+1,updated_at=now() WHERE id=$8",[b.good_qty,b.defect_qty,b.rework_qty,b.scrap_qty,b.defect_note??'',seconds,snapshot,old.id]);
    await finishCommand(sql,a.tenant_id,'report.resubmit',b.request_key,hash,'production_report',old.id);const result=await reportView(sql,old.id,a);await writeAudit(sql,a,'report.resubmitted','production_report',old.id,{approval:old.approval,version:old.version},{...result.report,reason:b.reason});return {replayed:false,...result};
  }));
}
