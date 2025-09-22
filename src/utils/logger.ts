export class Logger {
    private context: string;

    constructor(context: string) {
        this.context = context;
    }

    info(message: string, ...meta: any[]) {
        console.log(`ℹ️ [${this.context}]`, message, ...meta);
    }

    error(message: string, ...meta: any[]) {
        console.error(`❌ [${this.context}]`, message, ...meta);
    }

    warn(message: string, ...meta: any[]) {
        console.warn(`⚠️ [${this.context}]`, message, ...meta);
    }

    debug(message: string, ...meta: any[]) {
        if (process.env.LOG_LEVEL === 'debug') {
            console.debug(`🐞 [${this.context}]`, message, ...meta);
        }
    }
}