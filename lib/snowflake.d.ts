export interface LoadResult {
    file: string;
    status: string;
    rows_parsed: number;
    rows_loaded: number;
    error_limit: number;
    errors_seen: number;
    command: string;
}
export declare class SafeLiteral {
    text: string;
    constructor(text: string);
}
export type SnowflakeParams = Record<string, any> | any[];
export declare function query<T = any>(query: string, params?: SnowflakeParams): Promise<T[]>;
export declare function execute(query: string, params?: SnowflakeParams): Promise<void>;
export declare function stage(stage_name: string, file: string): Promise<void>;
export declare function insert(table: string, data: Record<string, any> | Array<Record<string, any>>): Promise<void>;
export declare function safeValue(value: unknown): string;
