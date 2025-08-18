// Simple logger implementation
export interface Logger {
  info(message: string): void;
  error(message: string, error?: any): void;
  warn(message: string): void;
  debug(message: string): void;
}

class SimpleLogger implements Logger {
  info(message: string): void {
    console.log(`[INFO] ${new Date().toLocaleTimeString()} ${message}`);
  }

  error(message: string, error?: any): void {
    console.error(`[ERROR] ${new Date().toLocaleTimeString()} ${message}`, error || '');
  }

  warn(message: string): void {
    console.warn(`[WARN] ${new Date().toLocaleTimeString()} ${message}`);
  }

  debug(message: string): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${new Date().toLocaleTimeString()} ${message}`);
    }
  }
}

const logger = new SimpleLogger();
export default logger;
