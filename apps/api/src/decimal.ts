import { Problem } from './services.js';
export const SCALE=1_000_000n;
export const MAX=99_999_999_999_999_999_999n;
export function decimal(value:string,{positive=false,max=MAX}:{positive?:boolean;max?:bigint}={}){
 if(typeof value!=='string'||!/^(?:0|[1-9]\d{0,13})(?:\.\d{1,6})?$/.test(value)) throw new Problem(400,'DECIMAL_FORMAT','数量须为最多14位整数、6位小数的非负十进制文本');
 const [whole,fraction='']=value.split('.');const n=BigInt(whole!)*SCALE+BigInt(fraction.padEnd(6,'0'));
 if(n>max||(positive&&n===0n)) throw new Problem(422,'DECIMAL_RANGE','数量超出允许范围');
 return n;
}
export function formatDecimal(n:bigint){const sign=n<0n?'-':'',v=n<0n?-n:n;return `${sign}${v/SCALE}.${(v%SCALE).toString().padStart(6,'0')}`;}
export function multiplyUp(a:bigint,b:bigint){return (a*b+SCALE-1n)/SCALE;}
export function divideUp(a:bigint,b:bigint){return (a*SCALE+b-1n)/b;}
export function bounded(n:bigint){if(n>MAX)throw new Problem(422,'QUANTITY_OVERFLOW','展开结果超过数量上限');return n;}
