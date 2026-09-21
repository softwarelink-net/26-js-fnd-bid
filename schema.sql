-- 1. 用户与住房资金中心人员信息表 (Users)
CREATE TABLE IF NOT EXISTS jsfnd_users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    dept_name TEXT NOT NULL,           -- 技术信息科, 资金归集科, 财务核算科, 贷款管理科, 驻场外包运维保障组
    role TEXT NOT NULL CHECK(role IN ('ROLE_SUPER_ADMIN', 'ROLE_FINANCE_DIRECTOR', 'ROLE_OPS_ENGINEER', 'ROLE_DECISION_MAKER')),
    phone TEXT,
    staff_code TEXT NOT NULL UNIQUE,   -- 机关编制号 / 驻场外包服务工号
    status INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. 系统全局配置与 Feature Flags (System Configs)
CREATE TABLE IF NOT EXISTS jsfnd_system_configs (
    config_key TEXT PRIMARY KEY,
    config_value TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. 省级机关缴存单位台账与资金归集表 (Enterprise Contribution Master)
CREATE TABLE IF NOT EXISTS jsfnd_contribution_units (
    id TEXT PRIMARY KEY,
    unit_account_no TEXT NOT NULL UNIQUE, -- 单位公积金账号 (如 GJJ-JS-001088)
    unit_name TEXT NOT NULL,             -- 江苏省工业和信息化厅 / 南京中医药大学 / 江苏省农业科学院
    unit_nature TEXT NOT NULL CHECK(unit_nature IN ('STATE_GOV_ORGAN', 'PUBLIC_INSTITUTION', 'SOE_ENTERPRISE')), -- 行政机关/事业单位/省属国企
    active_employees_count INTEGER NOT NULL, -- 缴存职工总人数
    deposit_ratio_pct REAL NOT NULL,     -- 单位缴存比例 (如 12.0%)
    monthly_collection_amount REAL NOT NULL, -- 月度汇缴总额 (元)
    last_deposited_month TEXT NOT NULL,  -- 最近汇缴月份 (2026-08)
    account_status TEXT DEFAULT 'ACTIVE_NORMAL' CHECK(account_status IN ('ACTIVE_NORMAL', 'SUSPENDED_FROZEN', 'SEALED_CLOSED')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. 银企直联实时结算与跨行日终对账表 (Direct Bank Clearing & Reconciliation)
CREATE TABLE IF NOT EXISTS jsfnd_reconciliation_records (
    id TEXT PRIMARY KEY,
    batch_no TEXT NOT NULL UNIQUE,       -- 对账批次号 (如 REC-JS-202609-001)
    bank_code TEXT NOT NULL CHECK(bank_code IN ('ICBC_BANK', 'CCB_BANK', 'BOC_BANK', 'JS_BANK')), -- 工行/建行/中行/江苏银行
    bank_name TEXT NOT NULL,             -- 中国建设银行南京汉中门支行
    reconciled_date DATE NOT NULL,       -- 对账日期
    total_tx_count INTEGER NOT NULL,     -- 交易笔数
    total_tx_amount REAL NOT NULL,       -- 发生总金额 (元)
    center_recorded_amount REAL NOT NULL,-- 资金中心核心账面金额 (元)
    bank_statement_amount REAL NOT NULL, -- 银行对账单返回金额 (元)
    difference_gap_amount REAL NOT NULL, -- 差额 (0.00 为平账，否则为长短款)
    reconciliation_verdict TEXT DEFAULT 'BALANCED_OK' CHECK(reconciliation_verdict IN ('BALANCED_OK', 'UNBALANCED_GAP', 'ROLLBACK_REVERSED')),
    handler_staff_name TEXT NOT NULL,
    cleared_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. 公积金提取风险阻断与反套提工单表 (Anti-Fraud Extraction Alarms)
CREATE TABLE IF NOT EXISTS jsfnd_antifraud_alarms (
    id TEXT PRIMARY KEY,
    alarm_sn TEXT NOT NULL UNIQUE,       -- 预警编号 (如 AF-JS-2026-088)
    applicant_name_masked TEXT NOT NULL, -- 提取人姓名脱敏 (如 赵*强)
    applicant_idcard_masked TEXT NOT NULL,-- 身份证脱敏
    extract_category TEXT NOT NULL CHECK(extract_category IN ('OFF_SITE_PURCHASE', 'RENTAL_DEDUCTION', 'MAJOR_DISEASE', 'LEAVING_CITY_TERMINATE')), -- 异地购房/租房提取/大病提取/离职销户
    requested_amount_yuan REAL NOT NULL, -- 申请提取金额 (元)
    risk_trigger_rule TEXT NOT NULL,     -- 触发风险规则 (如 频繁跨省短时购房过户疑似中介代办套现)
    risk_severity_level TEXT NOT NULL CHECK(risk_severity_level IN ('LEVEL_LOW_NOTICE', 'LEVEL_MEDIUM_REVIEW', 'LEVEL_RED_INTERCEPT')),
    auto_intercept_status INTEGER DEFAULT 1, -- 1: 系统已自动拦截并锁定资金
    disposition_verdict TEXT DEFAULT 'PENDING_VERIFY' CHECK(disposition_verdict IN ('PENDING_VERIFY', 'CONFIRMED_FRAUD_LOCKED', 'CLEARED_LEGITIMATE')),
    investigator_name TEXT NOT NULL,
    detected_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. 个人住房公积金贷款资产质量监测表 (Mortgage Loan Portfolios)
CREATE TABLE IF NOT EXISTS jsfnd_mortgage_loans (
    id TEXT PRIMARY KEY,
    loan_contract_no TEXT NOT NULL UNIQUE, -- 借款合同号 (如 LN-JS-2026-0888)
    borrower_name_masked TEXT NOT NULL,
    unit_affinity_name TEXT NOT NULL,    -- 所在单位 (如 江苏省人民医院)
    principal_amount_yuan REAL NOT NULL, -- 贷款本金 (元)
    loan_term_months INTEGER NOT NULL,   -- 贷款期限 (月)
    annual_interest_rate REAL NOT NULL,  -- 公积金贷款利率 (如 2.85%)
    current_overdue_days INTEGER DEFAULT 0, -- 逾期天数
    overdue_principal_interest REAL DEFAULT 0.0, -- 逾期本息额
    collateral_property_geo TEXT NOT NULL, -- 抵押房产脱敏空间地址 (南京市鼓楼区)
    loan_risk_tier TEXT DEFAULT 'TIER_NORMAL' CHECK(loan_risk_tier IN ('TIER_NORMAL', 'TIER_SPECIAL_ATTENTION', 'TIER_SUBPRIME_LOSS')),
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. 资金管理系统操作安全与涉密审计日志表 (Security Audit Trail)
CREATE TABLE IF NOT EXISTS jsfnd_audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    username TEXT,
    action_name TEXT NOT NULL,         -- REVERSAL_EXECUTE / ALARM_CLOSE / DATA_DESENSITIZE / MASK_OVERRIDE
    target_resource TEXT NOT NULL,
    ip_address TEXT,
    request_uri TEXT,
    status_code INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 种子数据初始化 (Seed Data)
-- ==============================================================================

-- 注入演示用户 (password_hash = MD5 of README demo passwords)
INSERT OR REPLACE INTO jsfnd_users (id, username, password_hash, full_name, dept_name, role, phone, staff_code) VALUES
('u-01', 'admin', 'ce5dec5f7d5cda41bd625bd6a23bb9aa', '系统管理员', '技术信息科', 'ROLE_SUPER_ADMIN', '025-83666812', 'JS-FND-TECH01'),
('u-02', 'director', 'f038c74d382fe8da1f410e4db5250a52', '李科长', '财务核算与风控科', 'ROLE_FINANCE_DIRECTOR', '025-83476186', 'JS-FND-DIR08'),
('u-03', 'ops_user', '463613ba15f924a1a9f4c1ed20e78c1c', '王工', '驻场外包运维项目组', 'ROLE_OPS_ENGINEER', '18961618232', 'JS-OPS-016'),
('u-04', 'leader', '5fa3c1e40a221e46fbabb44790283fc9', '中心主任', '中心领导办公室', 'ROLE_DECISION_MAKER', '025-83666000', 'JS-FND-LEAD01');

-- 注入 Feature Flags 与系统全局配置
INSERT OR REPLACE INTO jsfnd_system_configs (config_key, config_value, category, description) VALUES
('FEATURE_AUTO_REVERSAL_JOB', 'true', 'CLEARING_ENGINE', '日终对账出现跨行长短款时系统是否自动触发微流水冲正任务'),
('FEATURE_SM4_SENSITIVE_MASKING', 'true', 'SECURITY', '对公职人员名下公积金余额、借贷合同及身份证号启用国密 SM4 动态列级脱敏'),
('LIQUIDITY_BACKUP_ALERT_PCT', '15.0', 'FINANCE_POLICY', '沉淀流动备付金低于资金池总规模 15% 时自动向财务决策端发出告警');

-- 注入缴存单位台账
INSERT OR REPLACE INTO jsfnd_contribution_units (id, unit_account_no, unit_name, unit_nature, active_employees_count, deposit_ratio_pct, monthly_collection_amount, last_deposited_month, account_status) VALUES
('cu-01', 'GJJ-JS-001088', '江苏省工业和信息化厅机关', 'STATE_GOV_ORGAN', 420, 12.0, 1860000.0, '2026-08', 'ACTIVE_NORMAL'),
('cu-02', 'GJJ-JS-002045', '南京中医药大学教职工账户', 'PUBLIC_INSTITUTION', 2850, 12.0, 9450000.0, '2026-08', 'ACTIVE_NORMAL'),
('cu-03', 'GJJ-JS-003102', '江苏省铁路集团有限公司', 'SOE_ENTERPRISE', 1320, 12.0, 4820000.0, '2026-08', 'ACTIVE_NORMAL'),
('cu-04', 'GJJ-JS-004211', '江苏省人民医院职工账户', 'PUBLIC_INSTITUTION', 4680, 12.0, 16850000.0, '2026-08', 'ACTIVE_NORMAL'),
('cu-05', 'GJJ-JS-005088', '江苏省农业科学院机关', 'PUBLIC_INSTITUTION', 980, 12.0, 3560000.0, '2026-08', 'SUSPENDED_FROZEN'),
('cu-06', 'GJJ-JS-006330', '南京大学机关事务处', 'PUBLIC_INSTITUTION', 3200, 12.0, 11200000.0, '2026-08', 'ACTIVE_NORMAL');

-- 注入银企直联对账流水
INSERT OR REPLACE INTO jsfnd_reconciliation_records (id, batch_no, bank_code, bank_name, reconciled_date, total_tx_count, total_tx_amount, center_recorded_amount, bank_statement_amount, difference_gap_amount, reconciliation_verdict, handler_staff_name) VALUES
('rec-01', 'REC-JS-202609-001', 'CCB_BANK', '中国建设银行南京汉中门支行', '2026-09-14', 1450, 18500000.0, 18500000.0, 18500000.0, 0.0, 'BALANCED_OK', '王工'),
('rec-02', 'REC-JS-202609-002', 'ICBC_BANK', '中国工商银行南京新街口支行', '2026-09-14', 980, 12400000.0, 12400000.0, 12398500.0, 1500.0, 'ROLLBACK_REVERSED', '王工'),
('rec-03', 'REC-JS-202609-003', 'BOC_BANK', '中国银行南京鼓楼支行', '2026-09-14', 720, 8620000.0, 8620000.0, 8620000.0, 0.0, 'BALANCED_OK', '王工'),
('rec-04', 'REC-JS-202609-004', 'JS_BANK', '江苏银行南京城西支行', '2026-09-14', 560, 5340000.0, 5340000.0, 5338200.0, 1800.0, 'UNBALANCED_GAP', '李科长');

-- 注入反套提智能风控预警工单
INSERT OR REPLACE INTO jsfnd_antifraud_alarms (id, alarm_sn, applicant_name_masked, applicant_idcard_masked, extract_category, requested_amount_yuan, risk_trigger_rule, risk_severity_level, auto_intercept_status, disposition_verdict, investigator_name) VALUES
('af-01', 'AF-JS-2026-088', '赵*强', '320102198405******', 'OFF_SITE_PURCHASE', 450000.0, '异地三线城市非限购区短时产证过户且存在多家连续套现关联', 'LEVEL_RED_INTERCEPT', 1, 'CONFIRMED_FRAUD_LOCKED', '李科长'),
('af-02', 'AF-JS-2026-089', '孙*华', '320106199111******', 'RENTAL_DEDUCTION', 36000.0, '同一租赁不动产权证地址近三个月被三个不同缴存人重复申报提取', 'LEVEL_MEDIUM_REVIEW', 1, 'PENDING_VERIFY', '王工'),
('af-03', 'AF-JS-2026-090', '周*敏', '320104198812******', 'LEAVING_CITY_TERMINATE', 128000.0, '离职销户申请与社保缴费记录仍在职冲突，疑似虚假解除劳动关系材料', 'LEVEL_RED_INTERCEPT', 1, 'PENDING_VERIFY', '李科长'),
('af-04', 'AF-JS-2026-091', '吴*丽', '320105197603******', 'MAJOR_DISEASE', 85000.0, '大病提取发票与医保结算流水金额不一致，需人工复核', 'LEVEL_LOW_NOTICE', 0, 'CLEARED_LEGITIMATE', '王工');

-- 注入个贷资产监测数据
INSERT OR REPLACE INTO jsfnd_mortgage_loans (id, loan_contract_no, borrower_name_masked, unit_affinity_name, principal_amount_yuan, loan_term_months, annual_interest_rate, current_overdue_days, overdue_principal_interest, collateral_property_geo, loan_risk_tier) VALUES
('ln-01', 'LN-JS-2026-0888', '孙*芳', '南京中医药大学附属医院', 1000000.0, 360, 2.85, 0, 0.0, '南京市鼓楼区清凉门大街', 'TIER_NORMAL'),
('ln-02', 'LN-JS-2026-0889', '钱*峰', '江苏省农业科学院畜牧研究所', 800000.0, 240, 2.85, 42, 9420.5, '南京市玄武区钟灵街', 'TIER_SPECIAL_ATTENTION'),
('ln-03', 'LN-JS-2026-0890', '郑*丽', '江苏省工业和信息化厅', 650000.0, 300, 2.85, 0, 0.0, '南京市建邺区江东中路', 'TIER_NORMAL'),
('ln-04', 'LN-JS-2026-0891', '冯*军', '江苏省铁路集团有限公司', 1200000.0, 360, 2.85, 95, 28650.0, '南京市栖霞区仙林大道', 'TIER_SUBPRIME_LOSS');

-- 注入审计日志
INSERT OR REPLACE INTO jsfnd_audit_logs (id, user_id, username, action_name, target_resource, ip_address, request_uri, status_code) VALUES
('log-01', 'u-02', 'director', 'ALARM_CLOSE', 'AF-JS-2026-088', '10.32.145.15', '/api/anti-fraud/confirm-lock', 200),
('log-02', 'u-03', 'ops_user', 'REVERSAL_EXECUTE', 'REC-JS-202609-002', '10.32.145.88', '/api/clearing/reversal-job', 200),
('log-03', 'u-01', 'admin', 'DATA_DESENSITIZE', 'FEATURE_SM4_SENSITIVE_MASKING', '10.32.145.2', '/api/system/config', 200),
('log-04', 'u-03', 'ops_user', 'MASK_OVERRIDE', 'GJJ-JS-001088', '10.32.145.88', '/api/collection/unmask', 200);
