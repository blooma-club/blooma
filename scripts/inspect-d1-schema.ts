
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const logFile = path.resolve(process.cwd(), 'd1-schema.log');
function log(message: string) {
    console.log(message);
    fs.appendFileSync(logFile, message + '\n');
}

fs.writeFileSync(logFile, '');

const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(envLocalPath)) {
    log('Loading .env.local');
    dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
    log('Loading .env');
    dotenv.config({ path: envPath });
}

const DEFAULT_API_BASE_URL = 'https://api.cloudflare.com/client/v4'

async function main() {
    log('--- Inspecting D1 Schema ---');

    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;
    const apiToken = process.env.CLOUDFLARE_D1_API_TOKEN;
    const apiBaseUrl = process.env.CLOUDFLARE_API_BASE_URL ?? DEFAULT_API_BASE_URL;

    if (!accountId || !databaseId || !apiToken) {
        log('❌ Missing environment variables');
        return;
    }

    const endpoint = `${apiBaseUrl}/accounts/${accountId}/d1/database/${databaseId}/query`;

    // Query table info for 'users'
    const sql = "PRAGMA table_info(users)";
    const params: any[] = [];

    log(`Executing SQL: ${sql}`);

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiToken}`,
            },
            body: JSON.stringify({ sql, params }),
        });

        const text = await response.text();
        if (!response.ok) {
            log(`❌ Request failed: ${response.status}`);
            log(text);
            return;
        }

        const json = JSON.parse(text);
        if (json.success) {
            log('✅ Success!');
            const rows = json.result[0].results;
            log('Schema Info:');
            log(JSON.stringify(rows, null, 2));
        } else {
            log('❌ API returned success: false');
            log(JSON.stringify(json, null, 2));
        }

    } catch (error) {
        log('❌ Fetch error');
        log(String(error));
    }
}

main();
