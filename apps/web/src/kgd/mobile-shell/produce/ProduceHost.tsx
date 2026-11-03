import { useLocation } from 'react-router-dom';
import { matchProduce } from './paths';
import { PlanAddPage, PlanDetailPage, PlanListPage } from './Plans';
import { ReportRecordPage, ReportWorkbenchPage } from './Reports';
import { SchedulePage } from './Schedule';
import { TaskListPage } from './Tasks';
import { WorkOrderAddPage, WorkOrderDetailPage, WorkOrderListPage } from './WorkOrders';
import './produce.css';

function detailId(pathname: string) {
  return pathname.split('/detail/')[1]?.split(/[/?]/)[0] ?? '';
}

export function ProduceHost({ keyword, onClearKeyword }: { keyword: string; onClearKeyword: () => void }) {
  const { pathname } = useLocation();
  const match = matchProduce(pathname);
  let page = null;
  if (pathname === '/ms/inside_produce_bill/list') page = <WorkOrderListPage keyword={keyword} />;
  else if (pathname.startsWith('/ms/inside_produce_bill/detail/')) page = <WorkOrderDetailPage id={detailId(pathname)} />;
  else if (pathname.startsWith('/ms/inside_produce_bill/add')) page = <WorkOrderAddPage />;
  else if (pathname === '/ms/productionTask/list') page = <TaskListPage keyword={keyword} />;
  else if (pathname === '/ms/work_report_workbench') page = <ReportWorkbenchPage />;
  else if (pathname === '/ms/work_repoty_record/list') page = <ReportRecordPage keyword={keyword} />;
  else if (pathname === '/ms/ProductionPlan/list') page = <PlanListPage keyword={keyword} />;
  else if (pathname.startsWith('/ms/ProductionPlan/add')) page = <PlanAddPage />;
  else if (pathname.startsWith('/ms/ProductionPlan/detail/')) page = <PlanDetailPage id={detailId(pathname)} />;
  else if (pathname === '/ms/ProductionScheduling/list') page = <SchedulePage keyword={keyword} />;
  if (!page) return null;
  return (
    <div className={`mp-root${match?.focus ? ' is-focus' : ''}`} data-testid="mp-root" data-leaf={match?.key || ''}>
      {keyword && (
        <div className="mp-kw">搜索：{keyword}<button type="button" onClick={onClearKeyword}>清除</button></div>
      )}
      {page}
    </div>
  );
}
