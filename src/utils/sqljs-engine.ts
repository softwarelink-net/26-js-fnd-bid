import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js'
import md5Sync from 'blueimp-md5'

export type UserRole =
  | 'ROLE_SUPER_ADMIN'
  | 'ROLE_FINANCE_DIRECTOR'
  | 'ROLE_OPS_ENGINEER'
  | 'ROLE_DECISION_MAKER'

export interface JsfndUser {
  id: string
  username: string
  full_name: string
  dept_name: string
  role: UserRole
  phone: string | null
  staff_code: string
  status: number
}

export interface ContributionUnit {
  id: string
  unit_account_no: string
  unit_name: string
  unit_nature: string
  active_employees_count: number
  deposit_ratio_pct: number
  monthly_collection_amount: number
  last_deposited_month: string
  account_status: string
  created_at: string
}

export interface ReconciliationRecord {
  id: string
  batch_no: string
  bank_code: string
  bank_name: string
  reconciled_date: string
  total_tx_count: number
  total_tx_amount: number
  center_recorded_amount: number
  bank_statement_amount: number
  difference_gap_amount: number
  reconciliation_verdict: string
  handler_staff_name: string
  cleared_at: string
}

export interface AntifraudAlarm {
  id: string
  alarm_sn: string
  applicant_name_masked: string
  applicant_idcard_masked: string
  extract_category: string
  requested_amount_yuan: number
  risk_trigger_rule: string
  risk_severity_level: string
  auto_intercept_status: number
  disposition_verdict: string
  investigator_name: string
  detected_at: string
}

export interface MortgageLoan {
  id: string
  loan_contract_no: string
  borrower_name_masked: string
  unit_affinity_name: string
  principal_amount_yuan: number
  loan_term_months: number
  annual_interest_rate: number
  current_overdue_days: number
  overdue_principal_interest: number
  collateral_property_geo: string
  loan_risk_tier: string
  updated_at: string
}

export interface SystemConfig {
  config_key: string
  config_value: string
  category: string
  description: string | null
}

export interface AuditLog {
  id: string
  user_id: string | null
  username: string | null
  action_name: string
  target_resource: string
  ip_address: string | null
  request_uri: string | null
  status_code: number | null
  created_at: string
}

export interface DashboardStats {
  totalPoolAssetYuan: number
  monthlyCollectionYuan: number
  monthlyExtractYuan: number
  liquidityBackupPct: number
  unitCount: number
  activeEmployees: number
  balancedBatches: number
  unbalancedBatches: number
  redAlarms: number
  pendingAlarms: number
  overdueLoanCount: number
  overdueRatePct: number
  opsSlaPct: number
  avgResponseMinutes: number
  bankDepositDistribution: Array<{ bank: string; amount: number }>
  cashflowTrend: Array<{ label: string; collection: number; extract: number }>
  riskRadar: Array<{ name: string; value: number }>
}

const SESSION_KEY = 'jsfnd_session_v1'

let SQL: SqlJsStatic | null = null
let db: Database | null = null
let readyPromise: Promise<void> | null = null

function escapeSql(text: string): string {
  return text.replace(/'/g, "''")
}

function rowsToObjects<T>(result: ReturnType<Database['exec']>): T[] {
  if (!result.length) return []
  const { columns, values } = result[0]
  return values.map((row) => {
    const obj: Record<string, unknown> = {}
    columns.forEach((col, idx) => {
      obj[col] = row[idx]
    })
    return obj as T
  })
}

export async function md5(text: string): Promise<string> {
  return md5Sync(text)
}

export function initSqlEngine(): Promise<void> {
  if (readyPromise) return readyPromise
  readyPromise = (async () => {
    SQL = await initSqlJs({
      locateFile: (file) => {
        if (file.endsWith('.wasm')) return `/sql-wasm.wasm`
        return `https://sql.js.org/dist/${file}`
      },
    })
    const response = await fetch('/data/jsfnd_database.sqlite')
    if (!response.ok) {
      throw new Error(`无法加载 SQLite 数据包: ${response.status}`)
    }
    const buffer = await response.arrayBuffer()
    db = new SQL.Database(new Uint8Array(buffer))
  })()
  return readyPromise
}

function ensureDb(): Database {
  if (!db) throw new Error('SQLite 引擎尚未就绪')
  return db
}

export async function waitForEngine(): Promise<void> {
  await initSqlEngine()
}

export async function login(username: string, password: string): Promise<JsfndUser> {
  await waitForEngine()
  const database = ensureDb()
  const hash = await md5(password)
  const result = database.exec(
    `SELECT id, username, full_name, dept_name, role, phone, staff_code, status
     FROM jsfnd_users WHERE username = '${escapeSql(username)}' AND password_hash = '${hash}' AND status = 1 LIMIT 1`,
  )
  const users = rowsToObjects<JsfndUser>(result)
  if (!users.length) {
    throw new Error('账号或密码错误，或账号已停用')
  }
  const user = users[0]
  localStorage.setItem(SESSION_KEY, JSON.stringify(user))
  database.run(
    `INSERT INTO jsfnd_audit_logs (id, user_id, username, action_name, target_resource, ip_address, request_uri, status_code)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [`log-${Date.now()}`, user.id, user.username, 'USER_LOGIN', 'AUTH_SESSION', '127.0.0.1', '/login', 200],
  )
  return user
}

export function logout(): void {
  localStorage.removeItem(SESSION_KEY)
}

export function getSession(): JsfndUser | null {
  const raw = localStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as JsfndUser
  } catch {
    return null
  }
}

export async function getContributionUnits(nature?: string): Promise<ContributionUnit[]> {
  await waitForEngine()
  const database = ensureDb()
  let sql = `SELECT * FROM jsfnd_contribution_units WHERE 1=1`
  if (nature) {
    sql += ` AND unit_nature = '${escapeSql(nature)}'`
  }
  sql += ` ORDER BY monthly_collection_amount DESC`
  return rowsToObjects<ContributionUnit>(database.exec(sql))
}

export async function getReconciliationRecords(): Promise<ReconciliationRecord[]> {
  await waitForEngine()
  const database = ensureDb()
  return rowsToObjects<ReconciliationRecord>(
    database.exec(`SELECT * FROM jsfnd_reconciliation_records ORDER BY reconciled_date DESC, batch_no ASC`),
  )
}

export async function executeReversal(batchNo: string, handlerName: string): Promise<void> {
  await waitForEngine()
  const database = ensureDb()
  database.run(
    `UPDATE jsfnd_reconciliation_records
     SET difference_gap_amount = 0.0,
         bank_statement_amount = center_recorded_amount,
         reconciliation_verdict = 'ROLLBACK_REVERSED',
         handler_staff_name = ?,
         cleared_at = CURRENT_TIMESTAMP
     WHERE batch_no = ?`,
    [handlerName, batchNo],
  )
  database.run(
    `INSERT INTO jsfnd_audit_logs (id, user_id, username, action_name, target_resource, ip_address, request_uri, status_code)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [`log-${Date.now()}`, null, handlerName, 'REVERSAL_EXECUTE', batchNo, '127.0.0.1', '/api/clearing/reversal-job', 200],
  )
}

export async function getAntifraudAlarms(): Promise<AntifraudAlarm[]> {
  await waitForEngine()
  const database = ensureDb()
  return rowsToObjects<AntifraudAlarm>(
    database.exec(`SELECT * FROM jsfnd_antifraud_alarms ORDER BY detected_at DESC`),
  )
}

export async function updateAlarmDisposition(alarmSn: string, verdict: string, investigator: string): Promise<void> {
  await waitForEngine()
  const database = ensureDb()
  database.run(
    `UPDATE jsfnd_antifraud_alarms SET disposition_verdict = ?, investigator_name = ? WHERE alarm_sn = ?`,
    [verdict, investigator, alarmSn],
  )
  database.run(
    `INSERT INTO jsfnd_audit_logs (id, user_id, username, action_name, target_resource, ip_address, request_uri, status_code)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [`log-${Date.now()}`, null, investigator, 'ALARM_CLOSE', alarmSn, '127.0.0.1', '/api/anti-fraud/confirm-lock', 200],
  )
}

export async function getMortgageLoans(tier?: string): Promise<MortgageLoan[]> {
  await waitForEngine()
  const database = ensureDb()
  let sql = `SELECT * FROM jsfnd_mortgage_loans WHERE 1=1`
  if (tier) {
    sql += ` AND loan_risk_tier = '${escapeSql(tier)}'`
  }
  sql += ` ORDER BY current_overdue_days DESC, principal_amount_yuan DESC`
  return rowsToObjects<MortgageLoan>(database.exec(sql))
}

export async function getSystemConfigs(): Promise<SystemConfig[]> {
  await waitForEngine()
  const database = ensureDb()
  return rowsToObjects<SystemConfig>(database.exec(`SELECT * FROM jsfnd_system_configs ORDER BY category`))
}

export async function updateSystemConfig(key: string, value: string): Promise<void> {
  await waitForEngine()
  const database = ensureDb()
  database.run(
    `UPDATE jsfnd_system_configs SET config_value = ?, updated_at = CURRENT_TIMESTAMP WHERE config_key = ?`,
    [value, key],
  )
}

export async function getAuditLogs(): Promise<AuditLog[]> {
  await waitForEngine()
  const database = ensureDb()
  return rowsToObjects<AuditLog>(
    database.exec(`SELECT * FROM jsfnd_audit_logs ORDER BY created_at DESC LIMIT 100`),
  )
}

export async function getDashboardStats(): Promise<DashboardStats> {
  await waitForEngine()
  const database = ensureDb()
  const units = rowsToObjects<ContributionUnit>(database.exec(`SELECT * FROM jsfnd_contribution_units`))
  const records = rowsToObjects<ReconciliationRecord>(database.exec(`SELECT * FROM jsfnd_reconciliation_records`))
  const alarms = rowsToObjects<AntifraudAlarm>(database.exec(`SELECT * FROM jsfnd_antifraud_alarms`))
  const loans = rowsToObjects<MortgageLoan>(database.exec(`SELECT * FROM jsfnd_mortgage_loans`))

  const monthlyCollectionYuan = units.reduce((s, u) => s + Number(u.monthly_collection_amount || 0), 0)
  const monthlyExtractYuan = alarms.reduce((s, a) => s + Number(a.requested_amount_yuan || 0), 0) * 12
  const totalPoolAssetYuan = monthlyCollectionYuan * 48 + 18600000000
  const liquidityBackupPct = 18.6
  const unitCount = units.length
  const activeEmployees = units.reduce((s, u) => s + Number(u.active_employees_count || 0), 0)
  const balancedBatches = records.filter((r) => r.reconciliation_verdict === 'BALANCED_OK').length
  const unbalancedBatches = records.filter((r) => r.reconciliation_verdict !== 'BALANCED_OK').length
  const redAlarms = alarms.filter((a) => a.risk_severity_level === 'LEVEL_RED_INTERCEPT').length
  const pendingAlarms = alarms.filter((a) => a.disposition_verdict === 'PENDING_VERIFY').length
  const overdueLoans = loans.filter((l) => Number(l.current_overdue_days) > 0)
  const overdueLoanCount = overdueLoans.length
  const overdueRatePct = loans.length
    ? Math.round((overdueLoanCount / loans.length) * 1000) / 10
    : 0

  const bankMap: Record<string, string> = {
    ICBC_BANK: '工商银行',
    CCB_BANK: '建设银行',
    BOC_BANK: '中国银行',
    JS_BANK: '江苏银行',
  }
  const bankDepositDistribution = records.map((r) => ({
    bank: bankMap[r.bank_code] || r.bank_code,
    amount: Number(r.total_tx_amount || 0),
  }))

  const cashflowTrend = [
    { label: '2026-04', collection: 42.8, extract: 18.2 },
    { label: '2026-05', collection: 44.1, extract: 19.5 },
    { label: '2026-06', collection: 45.6, extract: 21.0 },
    { label: '2026-07', collection: 46.2, extract: 20.4 },
    { label: '2026-08', collection: 47.7, extract: 22.1 },
    { label: '2026-09', collection: Math.round(monthlyCollectionYuan / 1e6) / 10, extract: 21.8 },
  ]

  const riskRadar = [
    { name: '套提拦截', value: 92 },
    { name: '对账平账', value: balancedBatches ? Math.round((balancedBatches / records.length) * 100) : 80 },
    { name: '备付流动性', value: Math.round(liquidityBackupPct * 4) },
    { name: '个贷资产', value: Math.max(40, 100 - overdueRatePct * 8) },
    { name: '运维 SLA', value: 96 },
    { name: '等保审计', value: 88 },
  ]

  return {
    totalPoolAssetYuan,
    monthlyCollectionYuan,
    monthlyExtractYuan,
    liquidityBackupPct,
    unitCount,
    activeEmployees,
    balancedBatches,
    unbalancedBatches,
    redAlarms,
    pendingAlarms,
    overdueLoanCount,
    overdueRatePct,
    opsSlaPct: 96.4,
    avgResponseMinutes: 12,
    bankDepositDistribution,
    cashflowTrend,
    riskRadar,
  }
}
