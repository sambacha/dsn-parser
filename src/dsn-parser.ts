import type { ParserResult } from './dsn-parser.type';
import {
  createErrorResult,
  isNonEmptyString,
  isValidNetworkPort,
  mergeDsnOverrides,
  removeUndefined,
} from './dsn-parser.util';
import { parseQueryParams } from './query-param-parser';

// prettier-ignore
/*eslint require-unicode-regexp: error */
const dsnRegexp = new RegExp(
  `^(?<driver>([a-z0-9_-]+)):\\/\\/((?<user>.+)?:(?<pass>.+)@)?(?<host>[^\\/:]+?)(:(?<port>\\d+)?)?(\\/(?<db>([\\.#@$a-z0-9_-])+))?(\\?(?<params>.+))?$`,
  'i'
);

export type ParseDsnOptions = {
  /** Whether to lowercase parsed driver name, default: false */
  lowercaseDriver?: boolean;
  /** Overrides parsed values by those one (except query params) */
  overrides?: Omit<Partial<ParsedDsn>, 'params'>;
};

const defaultOptions = {
  lowercaseDriver: false,
  overrides: {},
};

export type ParsedDsn = {
  driver: string;
  host: string;
  user?: string;
  pass?: string;
  port?: number;
  db?: string;
  /** Query params */
  params?: Record<string, number | string | boolean>;
};

export const parseDsn = (
  dsn: string,
  options?: ParseDsnOptions
): ParserResult => {
  if (!isNonEmptyString(dsn)) {
    return createErrorResult(
      typeof dsn !== 'string' ? 'INVALID_ARGUMENT' : 'EMPTY_DSN'
    );
  }
  const opts = { ...defaultOptions, ...(options || {}) };
  const { overrides = {}, lowercaseDriver } = opts;
  const matches = dsn.match(dsnRegexp);
  if (matches === null || !matches.groups) {
    return createErrorResult('PARSE_ERROR');
  }
  const parsed: Record<string, unknown> = {};
  Object.entries(matches.groups).forEach(([key, value]) => {
    if (typeof value === 'string') {
      switch (key) {
        case 'driver':
          parsed['driver'] = lowercaseDriver ? value.toLowerCase() : value;
          break;
        case 'port':
          parsed['port'] = Number.parseInt(value, 10);
          break;
        case 'params':
          parsed['params'] = parseQueryParams(value);
          break;
        default:
          parsed[key] = value;
      }
    }
  });
  const val = removeUndefined(
    mergeDsnOverrides(parsed as ParsedDsn, overrides)
  ) as ParsedDsn;
  if (val?.port && !isValidNetworkPort(val.port)) {
    return createErrorResult('INVALID_PORT', `Invalid port: ${val.port}`);
  }
  return {
    success: true,
    value: val,
  };
};
