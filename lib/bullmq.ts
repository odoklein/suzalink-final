import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

// ============================================
// FILE-BASED QUEUE (No Redis)
// ============================================

const QUEUE_BASE_DIR = path.join(process.cwd(), 'private', 'queue');

// Ensure directories exist
['pending', 'processing', 'completed', 'failed'].forEach(dir => {
    const fullPath = path.join(QUEUE_BASE_DIR, dir);
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
    }
});

export class FileQueue {
    name: string;

    constructor(name: string, options?: any) {
        this.name = name;
    }

    async add(name: string, data: any) {
        const jobId = randomUUID();
        const job = {
            id: jobId,
            name,
            data,
            timestamp: Date.now(),
            status: 'pending'
        };

        const filePath = path.join(QUEUE_BASE_DIR, 'pending', `${this.name}_${jobId}.json`);
        await fs.promises.writeFile(filePath, JSON.stringify(job, null, 2));

        console.log(`[FileQueue] Job ${jobId} added to pending.`);
        return { id: jobId };
    }
}

export const enrichmentQueue = new FileQueue('enrich-mission-list');
