import { BigQuery, BigQueryDate, BigQueryDatetime, BigQueryTimestamp  } from "@google-cloud/bigquery";
import chalk from "chalk";

const bigquery = new BigQuery();

export async function query<T = any>(query: string, params?: Record<string, any>): Promise<T[]> {
    const t0 = Date.now();
    if (process.env.VERBOSE) {
        console.log();
        console.log(chalk.gray(query));
        if (params && Object.keys(params).length > 0)
            console.log(chalk.gray(`QUERY PARAMS: ${JSON.stringify(params)}`));
    }

    const [rows] = await bigquery.query({ query, params });
    if (process.env.VERBOSE)
        console.log(chalk.gray(`(${rows.length} rows returned in ${((Date.now() - t0) / 1000).toFixed(3)} seconds)`));

    return rows.map(row => formatRow(row));
}

export async function insert(table: string, data: unknown): Promise<void> {
    const [dataset_name, table_name] = table.split(".");
    await bigquery.dataset(dataset_name).table(table_name).insert(data);
}

export function safeValue(value: unknown): string {
    if (typeof value === "string")
        return /^[a-z0-9,./_-]*$/i.test(value) && value.length <= 64 ? `'${value}'` : "null";
    else if (typeof value === "number")
        return String(value);
    else
        throw `Unsafe value for query: "${value}"`;
}

export function safeUrl(value: unknown): string {
    if (typeof value === "string" && value.length < 500)
        return `'${new URL(value).href.replaceAll("'", "%60")}'`;
    else
        throw `Unsafe value for query: "${value}"`;
}

function formatRow(obj: any): any {
    if (obj === null || typeof obj !== "object")
        return obj;
    if (Array.isArray(obj))
        return obj.map(formatRow);
    if (obj instanceof BigQueryDate || obj instanceof BigQueryDatetime || obj instanceof BigQueryTimestamp)
        return new Date(obj.value);
    //if (Object.keys(obj).length === 1 && typeof obj.value === "string" && /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z?)?$/.test(obj.value))
        //return new Date(obj.value);
    const result: Record<string, any> = {};
    for (let key of Object.keys(obj))
        result[key] = formatRow(obj[key]);
    return result;
}
