import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from "@aws-sdk/client-sqs";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Pool } from "pg";

const region = process.env.AWS_REGION || "us-east-1";
const queueUrl = process.env.QUEUE_URL;
const bucketName = process.env.BUCKET_NAME;

const sqsClient = new SQSClient({ region });
const s3Client = new S3Client({ region });

// DB connection pool — reused across all messages
const db = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "postgres",
    ssl: { rejectUnauthorized: false },
});

async function ensureTable() {
    await db.query(`
        CREATE TABLE IF NOT EXISTS processed_files (
            id        SERIAL PRIMARY KEY,
            file_key  TEXT NOT NULL,
            content   TEXT NOT NULL,
            processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    console.log("[Nexus] Table ready.");
}

async function processMessage(message: any) {
    try {
        const body = JSON.parse(message.Body);

        if (!body.Records) return;

        for (const record of body.Records) {
            const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
            console.log(`[Nexus] New file detected: s3://${bucketName}/${key}`);

            if (!key.endsWith(".txt")) {
                console.log(`[Nexus] Skipping non-txt file: ${key}`);
                continue;
            }

            // Download file from S3
            const response = await s3Client.send(new GetObjectCommand({ Bucket: bucketName, Key: key }));
            const content = await response.Body?.transformToString() ?? "";

            console.log("-----------------------------------------");
            console.log(`Content of ${key}:`);
            console.log(content);
            console.log("-----------------------------------------");

            // Persist to RDS
            await db.query(
                "INSERT INTO processed_files (file_key, content) VALUES ($1, $2)",
                [key, content]
            );
            console.log(`[Nexus] Saved '${key}' to database.`);
        }
    } catch (error) {
        console.error("[Nexus] Error processing message:", error);
    }
}

async function poll() {
    console.log(`[Nexus] Starting worker polling on ${queueUrl}...`);

    while (true) {
        try {
            const data = await sqsClient.send(new ReceiveMessageCommand({
                QueueUrl: queueUrl,
                WaitTimeSeconds: 20,
                MaxNumberOfMessages: 1,
            }));

            if (data.Messages) {
                for (const message of data.Messages) {
                    await processMessage(message);
                    await sqsClient.send(new DeleteMessageCommand({
                        QueueUrl: queueUrl,
                        ReceiptHandle: message.ReceiptHandle!,
                    }));
                }
            }
        } catch (error) {
            console.error("[Nexus] Error in polling loop:", error);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
}

if (!queueUrl || !bucketName) {
    console.error("[Nexus] Missing environment variables QUEUE_URL or BUCKET_NAME");
    process.exit(1);
}

// Connect to DB, ensure schema, then start polling
ensureTable()
    .then(() => poll())
    .catch(err => {
        console.error("[Nexus] Fatal startup error:", err);
        process.exit(1);
    });

process.on("SIGTERM", async () => {
    console.log("[Nexus] Worker shutting down...");
    await db.end();
    process.exit(0);
});
