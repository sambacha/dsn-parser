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


### Packaging

Generates a platform-dependant script used to register the custom URI handler 'dsn3:', which can be used to execute DSN3 from other applications.

```python3
#!/usr/bin/env python3
'''
Generates a platform-dependant script used to register the custom URI handler 'dsn3:',
which can be used to execute DSN3 from other applications.

How to use:
- once the 'dsn3:' URI handler is registered, other applications can invoke DSN3
- standard parameters MUST be URL-encoded and provided after the URI
'''

import os
import platform
import sys

n = platform.system()
text = None
outname = None

if n == 'Windows':
  template = r'''Windows Registry Editor Version 5.00

[HKEY_CURRENT_USER\Software\Classes\dsn3]
"URL Protocol"=""
@="URL:dsn3 protocol"

[HKEY_CURRENT_USER\Software\Classes\dsn3\DefaultIcon]
@="dsn3.exe,1"

[HKEY_CURRENT_USER\Software\Classes\dsn3\shell]

[HKEY_CURRENT_USER\Software\Classes\dsn3\shell\open]

[HKEY_CURRENT_USER\Software\Classes\dsn3\shell\open\command]
@="\"%s\" \"%%1\""
'''
  path = os.path.abspath(os.getcwd() + r'\..\..\dsn3_wincon.bat')
  text = template % path.replace('\\', '\\\\')
  outname = 'RegisterDsn3UriScheme.reg'

elif n == 'Linux':
  template = r'''#!/bin/sh
set -uex

if which xdg-mime > /dev/null; then
  DESKTOP_DIR="$HOME/.local/share/applications"
  DESKTOP_PATH="$DESKTOP_DIR/dsn3-opener.desktop"

  cat << EOF > "$DESKTOP_PATH"
[Desktop Entry]
Type=Application
Name=DSN3 scheme handler
Exec="{dsn3_bin_path}" %u
StartupNotify=true
MimeType=x-scheme-handler/dsn3;
EOF

  xdg-mime default "$DESKTOP_PATH" x-scheme-handler/dsn3
  update-desktop-database "$DESKTOP_DIR"
fi

if which gconftool-2 > /dev/null; then
  gconftool-2 -t string -s /desktop/gnome/url-handlers/dsn3/command '"{dsn3_bin_path}" "%s"'
  gconftool-2 -s /desktop/gnome/url-handlers/dsn3/needs_terminal false -t bool
  gconftool-2 -s /desktop/gnome/url-handlers/dsn3/enabled true -t bool
fi
'''
  path = os.path.abspath(os.getcwd() + r'/../../dsn3_linux.sh')
  text = template.format(dsn3_bin_path=path)
  outname = 'RegisterDsn3UriScheme.sh'

else:
  print('Not implemented for platform %s!' % n)
  sys.exit(-1)

with open(outname, 'w') as f:
  f.write(text)
print('Execute the generated file %s to register the DSN3 URI scheme.' % outname)
```
