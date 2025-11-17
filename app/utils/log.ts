import chalk from "chalk";
import { addServerLog } from "../server/logs/logStore";

export interface LogOptions {
  url?: string;
  status?: number | string;
  method?: string;
  message?: string;
  extra?: Record<string, any>;
}

export function log({ url, status, method, message, extra }: LogOptions) {
  const timestamp = new Date().toISOString();
  let statusColor = chalk.white;
  if (status) {
    if (typeof status === "number") {
      if (status >= 500) statusColor = chalk.red;
      else if (status >= 400) statusColor = chalk.yellow;
      else if (status >= 300) statusColor = chalk.magenta;
      else if (status >= 200) statusColor = chalk.green;
      else statusColor = chalk.cyan;
    }
  }
  const methodColor = method ? chalk.blue.bold : chalk.white;
  const urlColor = url ? chalk.cyan.underline : chalk.white;
  const msgColor = message ? chalk.whiteBright : chalk.white;

  let logMsg = `${chalk.gray(timestamp)} `;
  if (method) logMsg += `${methodColor(method)} `;
  if (url) logMsg += `${urlColor(url)} `;
  if (status !== undefined) logMsg += `${statusColor(status)} `;
  if (message) logMsg += `${msgColor(message)} `;
  if (extra) logMsg += chalk.gray(JSON.stringify(extra));

  console.log(logMsg);
  // If extra.logId is set, mirror this log to the in-memory server log store
  try {
    // Prefer explicit logId in extra; otherwise use last set global log id
    const maybeLogId =
      (extra as any)?.logId ||
      (extra as any)?.loggerId ||
      (globalThis as any).__CURRENT_LOG_ID__;
    if (maybeLogId) {
      addServerLog(String(maybeLogId), {
        level: String(status ?? "info"),
        message: message ?? "",
        extra,
      });
    }
  } catch (e) {
    // ignore
  }
}
