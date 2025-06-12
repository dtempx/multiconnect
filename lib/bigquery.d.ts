export declare function query<T = any>(query: string, params?: Record<string, any>): Promise<T[]>;
export declare function insert(table: string, data: unknown): Promise<void>;
export declare function safeValue(value: unknown): string;
export declare function safeUrl(value: unknown): string;
