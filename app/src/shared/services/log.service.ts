class LogService {
    info(...args: string[]) {
        console.log(new Date().toLocaleString() + ' | ', ...args);
    }
    error(...args: string[]) {
        console.error(new Date().toLocaleString() + ' | ', ...args);
    }
}
export default new LogService();