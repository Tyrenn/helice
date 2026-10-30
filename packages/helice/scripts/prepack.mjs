import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';

const REPO = 'https://github.com/Tyrenn/helice';
const RAW  = 'https://raw.githubusercontent.com/Tyrenn/helice/main';

// The root README and LICENSE stay the single source. npm only sees this folder, and resolves relative links from it
const readme = readFileSync('../../README.md', 'utf8')
	.replace(/src="\.\/(.+?)"/g, `src="${RAW}/$1"`)
	.replace(/\]\(\.\/(.+?)\)/g, (_, path) => `](${REPO}/${path.endsWith('/') ? 'tree' : 'blob'}/main/${path})`);

writeFileSync('README.md', readme);
copyFileSync('../../LICENSE', 'LICENSE');
