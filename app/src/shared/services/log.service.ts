export class Logger {
    static info(...args: string[]) {
        console.log(new Date().toLocaleString() + ' |', ...args);
    }
    static error(...args: string[]) {
        console.error(new Date().toLocaleString() + ' |', ...args);
    }
}