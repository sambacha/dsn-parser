# `data source name parser`

## Overview

- query params
- validations
- assertions 

### Validation

`parseDsn` wraps its result in a [discriminated union](#) to enable the retrieval of validation errors. No `try... catch`needed and full typescript support.


Reason codes are guaranteed in semantic versions and messages does not leak credentials

```typescript
const parsed = parseDsn("redis://localhost:65636");
assert.deepEqual(parsed, {
  success: false,
  reason: "INVALID_PORT",
  message: "Invalid port: 65636",
});
if (!parsed.success) {
  // `success: false` narrows the type to
  // {
  //   reason: 'PARSE_ERROR'|'INVALID_ARGUMENT'|...
  //   message: string
  // }
  log(parsed.reason);
}
```

| Reason               | Message                 | Comment         |
| -------------------- | ----------------------- | --------------- |
| `'PARSE_ERROR'`      | `Cannot parse DSN`      | _Regexp failed_ |
| `'INVALID_ARGUMENT'` | `DSN must be a string`  |                 |
| `'EMPTY_DSN'`        | `DSN cannot be empty`   |                 |
| `'INVALID_PORT'`     | `Invalid port: ${port}` | [1-65535]       |



## Usage

```typescript
import { parseDsn } from 'dsnp';

const dsn = 'redis://user:p@/ss@localhost:6379/0?ssl=true''

const parsed = parseDsn(dsn);

if (parsed.success) {
  assert.deepEqual(parsed.value, {
    driver: 'redis',
    pass: 'p@/ss',
    host: 'localhost',
    user: 'user',
    port: 6379,
    db: '0',
    params: {
      ssl: true,
    },
  });
} else {
  assert.deepEqual(parsed, {
    success: false,
    // Reasons might vary
    reason: 'INVALID_PORT',
    message: 'Invalid http port: 12345678',
  });
}
```


| Params            | Type                   | Description                               |
| ----------------- | ---------------------- | ----------------------------------------- |
| `lowercaseDriver` | `<boolean>`            | Driver name in lowercase, default `false` |
| `overrides`       | `DSN must be a string` |                                           |
