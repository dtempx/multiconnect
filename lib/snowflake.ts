import snowflake from "snowflake-sdk";
import chalk from "chalk";
import { sleep } from "./utilities.js";

export interface LoadResult {
    file: string;
    status: string;
    rows_parsed: number;
    rows_loaded: number;
    error_limit: number;
    errors_seen: number;
    command: string;
}

export class SafeLiteral {
    text: string;
    constructor(text: string) {
        if (!/^[A-Za-z0-9(),'._-]*$/i.test(text))
            throw `Unsafe literal for query: "${text}"`;
        this.text = text;
    }
}

export type SnowflakeParams = Record<string, any> | any[];

let pool: snowflake.Pool<snowflake.Connection>;

export async function query<T = any>(query: string, params?: SnowflakeParams): Promise<T[]> {
    initializeConnectionPool();
    const t0 = Date.now();
    if (process.env.VERBOSE) {
        console.log();
        console.log(chalk.gray(query));
        if (params)
            console.log(chalk.gray(`QUERY PARAMS: ${JSON.stringify(params)}`));
    }

    const rows = await pool.use(async connection => {
        let result: snowflake.RowStatement;
        try {
            result = await connection.execute({
                sqlText: query,
                binds: formatBinds(params)
            });
        }
        catch (err) {
            const message = `${err instanceof Error ? err.message : JSON.stringify(err)}\nQUERY: ${query}${params ? `\nPARAMS: ${JSON.stringify(params)}` : ""}`;
            throw new Error(message);
        }
        const rows: T[] = [];
        await new Promise<void>((resolve, reject) =>
            result.streamRows()
                .on("data", row => rows.push(row))
                .on("end", resolve)
                .on("error", reject));
        return rows;
    });

    if (process.env.VERBOSE)
        console.log(chalk.gray(`(${rows.length} rows returned in ${((Date.now() - t0) / 1000).toFixed(3)} seconds)`));

    return rows.map(row => formatRow(row));
}

export async function execute(query: string, params?: SnowflakeParams): Promise<void> {
    initializeConnectionPool();
    const t0 = Date.now();

    if (process.env.VERBOSE) {
        console.log(chalk.gray(query));
        if (params)
            console.log(chalk.gray(JSON.stringify(params, null, 2)));
    }

    await pool.use(async connection => {
        const result = await connection.execute({
            sqlText: query,
            binds: formatBinds(params)
        });

        const t1 = Date.now();
        let status = result.getStatus();
        while (status === "fetching") {
            await sleep(100);
            status = result.getStatus();
        }
        if (process.env.VERBOSE) {
            const obj = {
                sqlText: result.getSqlText(),
                status: result.getStatus(),
                columns: result.getColumns(),
                numRows: result.getNumRows(),
                numUpdatedRows: result.getNumUpdatedRows(),
                sessionState: result.getSessionState(),
                requestId: result.getRequestId(),
                statementId: result.getStatementId(),
                queryId: result.getQueryId(),
                elapsed: Date.now() - t1
            };
            console.log(chalk.gray(JSON.stringify(obj)));
        }
    });

    if (process.env.VERBOSE)
        console.log(chalk.gray(`(query executed in ${((Date.now() - t0) / 1000).toFixed(3)} seconds)`));
}

export async function stage(stage_name: string, file: string): Promise<void> {
    const command = `PUT file://${file} @${stage_name} AUTO_COMPRESS=TRUE`;
    await execute(command);
}

export async function insert(table: string, data: Record<string, any> | Array<Record<string, any>>): Promise<void> {
    const list = Array.isArray(data) ? data : [data];
    if (list.length == 0)
        return;
    if (!/^[A-Za-z_][A-Za-z0-9._]*$/.test(table))
        throw `Unsafe table name for query: "${table}"`;

    const [obj] = list;
    const fields = Object.keys(obj).join(", ");
    const params: unknown[] = [];
    const select = list.map(obj => `SELECT ${encodeParamValues(obj, params)}`);
    const q = `INSERT INTO ${table}\n(${fields})\n${select.join(" UNION ALL\n")}`;
    await execute(q, params);
}

function encodeParamValues(obj: Record<string, unknown>, params: unknown[]): string {
    const result = [];
    for (const key of Object.keys(obj)) {
        const value = obj[key];
        if (value === null || value === undefined)
            result.push("NULL");
        else if (value instanceof SafeLiteral)
            result.push(value.text);
        else if (value instanceof Array)
            result.push(`PARSE_JSON(:${params.push(JSON.stringify(value))})::ARRAY`);
        else if (typeof value === "object" && value !== null && !(value instanceof Date))
            result.push(`PARSE_JSON(:${params.push(JSON.stringify(value))})`);
        else if (typeof value === "number")
            result.push(value);
        else if (typeof value === "boolean")
            result.push(value ? "TRUE" : "FALSE");
        else
            result.push(`:${params.push(value)}`);
    }
    return result.join(", ");
}

function initializeConnectionPool() {
    if (!process.env.SNOWFLAKE_CREDENTIALS)
        throw new Error("Required environment variable SNOWFLAKE_CREDENTIALS is undefined.");
    if (!pool) {
        const params = parseParams<snowflake.ConnectionOptions>(process.env.SNOWFLAKE_CREDENTIALS!);
        if (process.env.VERBOSE)
            console.log(chalk.gray(`SNOWFLAKE CONNECTION: ${JSON.stringify(params, null, 2)}`));
        pool = snowflake.createPool(params, { min: 0, max: parseInt(process.env.SNOWFLAKE_POOL_MAX!) || 1 });
    }
}

export function safeValue(value: unknown): string {
    if (typeof value === "string")
        return /^[a-z0-9,./_-]*$/i.test(value) && value.length <= 64 ? `'${value}'` : "null";
    else if (typeof value === "number")
        return String(value);
    else
        throw `Unsafe value for query: "${value}"`;
}

function formatBinds(params?: SnowflakeParams) {
    if (Array.isArray(params))
        return params;
    else if (typeof params === "object" && params !== null)
        return Object.values(params);
    else
        return undefined;
}

function formatRow(obj: any): any {
    const result: Record<string, any> = {};
    for (let key of Object.keys(obj))
        result[key.toLowerCase()] = formatObj(obj[key]);
    return result;
}

function formatObj(obj: any): any {
    if (obj === null || typeof obj !== "object")
        return obj;
    if (Array.isArray(obj))
        return obj.map(formatObj);
    return obj;
}

function parseParams<T extends {}>(text: string): T {
    if (!text)
        return {} as T;
    const result = {} as Partial<T>;
    const pairs = text.split(",").map(value => value.trim());
    for (const pair of pairs) {
        const [key, value] = pair.split(":").map(value => value.trim());
        (result as Record<string, string>)[key] = value;
    }
    return result as T;
}
