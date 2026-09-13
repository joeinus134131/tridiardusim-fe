/* eslint-disable @typescript-eslint/no-require-imports -- Portable Node build launcher. */
// Keep the user's running development server and its .next cache untouched.
const {spawnSync}=require('node:child_process');
const r=spawnSync(process.execPath,['node_modules/next/dist/bin/next','build','--webpack'],{stdio:'inherit',env:{...process.env,ARDUSIM_BUILD_DIR:'.next-production'}});process.exitCode=r.status??1;
