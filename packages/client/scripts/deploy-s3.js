const { execSync } = require('child_process');
const bucket = process.env.S3_BUCKET;
if (!bucket) { console.error('Missing S3_BUCKET env var'); process.exit(1); }
execSync(`aws s3 sync dist s3://${bucket} --acl public-read --delete`, { stdio: 'inherit' });
console.log('Deployed to', `https://${bucket}.s3.amazonaws.com/index.html`);
