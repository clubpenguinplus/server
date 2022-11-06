const fs = require('fs');

fs.copyFileSync('SERVER-PRE-COMMIT', '.git/hooks/pre-commit');
fs.chmodSync('.git/hooks/pre-commit', 0o755);