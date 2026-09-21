/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

declare module 'sql.js' {
  export interface SqlValue {
    [key: string]: string | number | null | Uint8Array
  }
  export interface QueryExecResult {
    columns: string[]
    values: SqlValue[][]
  }
  export interface Database {
    run(sql: string, params?: unknown[]): Database
    exec(sql: string): QueryExecResult[]
    prepare(sql: string): Statement
    export(): Uint8Array
    close(): void
  }
  export interface Statement {
    bind(params?: unknown[]): boolean
    step(): boolean
    getAsObject(params?: object): SqlValue
    free(): void
  }
  export interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | Buffer | null) => Database
  }
  export interface InitSqlJsConfig {
    locateFile?: (file: string) => string
  }
  export default function initSqlJs(config?: InitSqlJsConfig): Promise<SqlJsStatic>
}
