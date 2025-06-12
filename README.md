# warehouse-multiconnect

A simple, unified TypeScript library for connecting to multiple data warehouses with a consistent interface. Instead of juggling different SDKs and connection patterns - MultiConnect abstracts away the complexity so you can focus on your data.

## Supported Data Warehouses

- **BigQuery** - Google Cloud's serverless data warehouse
- **Snowflake** - Cloud-native data platform

## Why MultiConnect?

Instead of learning different APIs for each data warehouse:

```javascript
// Without MultiConnect - different patterns for each warehouse
import { BigQuery } from '@google-cloud/bigquery';
import snowflake from 'snowflake-sdk';

// BigQuery setup
const bigquery = new BigQuery({ projectId: 'my-project' });
const [rows] = await bigquery.query({ query: 'SELECT ...' });

// Snowflake setup  
const connection = snowflake.createConnection({ ... });
connection.connect();
connection.execute({ sqlText: 'SELECT ...', complete: callback });
```

Use one simple, consistent interface:

```javascript
// With MultiConnect - same pattern everywhere
import { bigquery, snowflake } from "multiconnect";

const bqRows = await bigquery.query("SELECT ...");
const sfRows = await snowflake.query("SELECT ...");
```

## Key Features

- **Unified Interface**: Same methods across all supported warehouses
- **Connection Pooling**: Automatic connection management for Snowflake
- **Parameterized Queries**: Safe parameter binding support
- **Data Normalization**: Consistent result formats across warehouses  
- **TypeScript Support**: Full type safety with TypeScript definitions
- **Error Handling**: Consistent error patterns across connectors

## Installation

```bash
npm install multiconnect
# or
yarn add multiconnect
```

## Quick Start

### Environment Setup

**BigQuery**: Uses Google Cloud default credentials or service account key
**Snowflake**: Set connection details in `SNOWFLAKE_CREDENTIALS` environment variable:
```bash
export SNOWFLAKE_CREDENTIALS="account:myaccount,username:myuser,password:mypass,database:mydb,warehouse:mywh"
```

## BigQuery example
```javascript
import { bigquery } from "multiconnect";

const query = "SELECT word, COUNT(*) as word_count FROM bigquery-public-data.samples.shakespeare GROUP BY ALL ORDER BY 2 DESC LIMIT 10";

const rows = await bigquery.query(query);
for (const row of rows)
    console.log(JSON.stringify(row));
```


## Snowflake example
```javascript
import { snowflake } from "multiconnect";

const query = "SELECT table_schema, table_name, table_type FROM INFORMATION_SCHEMA.TABLES WHERE table_schema != 'INFORMATION_SCHEMA' LIMIT 10";

const rows = await snowflake.query(query);
for (const row of rows)
    console.log(JSON.stringify(row));
```

## Usage Patterns

```javascript
import { bigquery, snowflake } from "multiconnect";

// Simple query
const results = await bigquery.query("SELECT * FROM my_table LIMIT 10");

// Insert data
await bigquery.insert("my_dataset.my_table", [
    { name: "John", age: 30 },
    { name: "Jane", age: 25 }
]);

// Insert data
await snowflake.insert("my_table", [
    { name: "Bob", age: 35 }
]);
```


## License

MIT
