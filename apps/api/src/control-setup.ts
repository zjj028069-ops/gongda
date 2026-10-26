import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {Database} from './database.js';
import {migrate} from './migrations.js';
import {readConfig,projectRoot} from './config.js';
import {hashPassword,secretToken} from './passwords.js';

const config=readConfig();
const db=new Database({mode:config.mode,url:config.url,dataDir:config.dataDir,production:config.production});
const file=resolve(projectRoot,'.local/platform-admin-credentials.txt');
try {
 if(!config.production)await migrate(db);
 const existing=await db.admin(async sql=>(await sql.query<{slot:number;username:string}>('SELECT slot,username FROM control_admins ORDER BY slot')).rows);
 if(existing.length===2)console.log('固定两位平台管理员已存在，未覆盖任何账号或密码。本机凭据文件：.local/platform-admin-credentials.txt');
 else {
  const missing:{slot:number;username:string;password:string;hash:string}[]=[];
  for(const slot of [1,2]) {
   if(existing.some(a=>a.slot===slot))continue;
   const username=(slot===1?process.env.CONTROL_ADMIN_USERNAME:process.env.CONTROL_ADMIN_SECOND_USERNAME)??(slot===1?'platform.owner':'platform.ops');
   const password=(slot===1?process.env.CONTROL_ADMIN_PASSWORD:process.env.CONTROL_ADMIN_SECOND_PASSWORD)??(config.production?'':secretToken());
   if(!/^[a-zA-Z0-9_.@-]{3,80}$/.test(username)||password.length<12||password.length>128)throw new Error('生产环境须为两个平台账号分别设置CONTROL_ADMIN_USERNAME/PASSWORD与CONTROL_ADMIN_SECOND_USERNAME/PASSWORD，密码至少12字符');
   missing.push({slot,username,password,hash:await hashPassword(password)});
  }
  let previous='';
  if(!config.production){try{previous=await readFile(file,'utf8');}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}}
  await db.admin(async sql=>{
   await sql.query('LOCK TABLE control_admins IN EXCLUSIVE MODE');
   const now=(await sql.query<{slot:number;username:string}>('SELECT slot,username FROM control_admins ORDER BY slot')).rows;
   if(now.length!==existing.length||now.some((a,i)=>a.slot!==existing[i]?.slot||a.username!==existing[i]?.username))throw new Error('另一初始化任务已修改平台账号，未覆盖；请重新运行检查');
   for(const a of missing)await sql.query('INSERT INTO control_admins(slot,username,display_name,password_hash) VALUES($1,$2,$3,$4)',[a.slot,a.username,'平台运营管理员'+a.slot,a.hash]);
   if(!config.production){
    await mkdir(resolve(projectRoot,'.local'),{recursive:true});
    const details=missing.map(a=>['平台账号 '+a.slot,'账号：'+a.username,'密码：'+a.password,''].join('\n')).join('\n');
    await writeFile(file,(previous?previous.trimEnd()+'\n\n':'仅供本机开发，禁止公开分享。\n入口：http://127.0.0.1:5173/platform-admin\n平台身份与企业账号独立，固定两个账号。\n\n')+details,{mode:0o600});
   }
  });
  console.log('两位平台运营管理员已就绪；未覆盖已有密码。'+(config.production?'凭据来自环境变量，未输出。':'新增随机凭据已保存到 .local/platform-admin-credentials.txt，未向日志输出密码。'));
 }
}finally{await db.close();}
