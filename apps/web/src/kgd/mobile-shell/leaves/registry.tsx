import type { ComponentType } from 'react';
import {
  AiBomLeaf,
  AiCenterLeaf,
  AiDrawingLeaf,
  AiExtAppsLeaf,
  AiFactoryLeaf,
  AiGlossaryLeaf,
  AiQuickOrderLeaf,
  AiTrainLeaf,
} from './aiLeaves';
import { KnowledgeLeaf, NoticeLeaf } from './infoLeaves';
import {
  AuditLeaf,
  BasicsLeaf,
  CodeRulesLeaf,
  CompanyLeaf,
  DepartmentsLeaf,
  PersonalLeaf,
  RolesLeaf,
  SmsLeaf,
  TeamsLeaf,
  UsersLeaf,
} from './systemLeaves';

/** C8 AI + 信息 + 系统 20 叶 · key → 手机皮组件 */
export const C8_LEAF_REGISTRY: Record<string, ComponentType> = {
  'ai-train': AiTrainLeaf,
  'ai-center': AiCenterLeaf,
  'ai-factory': AiFactoryLeaf,
  'ai-bom': AiBomLeaf,
  'ai-quick-order': AiQuickOrderLeaf,
  'ai-drawing': AiDrawingLeaf,
  'ai-glossary': AiGlossaryLeaf,
  'ai-ext-apps': AiExtAppsLeaf,
  knowledge: KnowledgeLeaf,
  notice: NoticeLeaf,
  personal: PersonalLeaf,
  users: UsersLeaf,
  roles: RolesLeaf,
  teams: TeamsLeaf,
  departments: DepartmentsLeaf,
  audit: AuditLeaf,
  basics: BasicsLeaf,
  company: CompanyLeaf,
  sms: SmsLeaf,
  'code-rules': CodeRulesLeaf,
};

export const C8_LEAF_KEYS = Object.keys(C8_LEAF_REGISTRY);
