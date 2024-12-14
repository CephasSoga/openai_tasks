
export type SessionHistory = HistoryItem[];


export interface HistoryItem {
    type: 'sent' | 'received';
    timestamp: string;
    data: Record<string, any>;
}

export interface History {
    add(item: HistoryItem): void;
    getAll(): HistoryItem[];
    save(filePath: string): Promise<void>;
    load(filePath: string): Promise<void>;
}


export class FileBasedHistory implements History {
    private history: SessionHistory = [];
    public filePath: string;

    constructor(filePath: string) {
        this.filePath = filePath;
    }

    async add(item: HistoryItem): Promise<void> {
        Promise.resolve(this.history.push(item));
    }

    getAll(): HistoryItem[] {
        return this.history;
    }

    async save(): Promise<void> {
        try {
            const fs = require('fs').promises;
            await fs.writeFile(this.filePath, JSON.stringify(this.history, null, 2), "utf-8");
            console.log("Session history saved to", this.filePath);
        } catch (error) {
            console.error("Failed to save history:", error);
        }
    }

    async load(filePath: string): Promise<void> {
        try {
            const fs = require('fs').promises;
            const data = await fs.readFile(filePath, "utf-8");
            this.history = JSON.parse(data);
            console.log("Session history loaded from", filePath);
        } catch (error) {
            console.error("Failed to load history:", error);
        }
    }
}
