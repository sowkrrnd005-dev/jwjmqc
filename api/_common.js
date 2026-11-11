import admin from 'firebase-admin';
import crypto from 'node:crypto';
const secret=process.env.SESSION_SECRET;
export function db(){if(!admin.apps.length){const raw=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;if(!raw)throw Error('FIREBASE_SERVICE_ACCOUNT_JSON 설정 필요');admin.initializeApp({credential:admin.credential.cert(JSON.parse(raw))})}return admin.firestore()}
function sign(v){return crypto.createHmac('sha256',secret).update(v).digest('hex')}
export function role(req){if(!secret)return null;const token=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('kpi_session='))?.slice(12);if(!token)return null;const [r,expiry,sig]=token.split('.');if(!['admin','viewer'].includes(r)||!expiry||!sig||Number(expiry)<Date.now())return null;const expected=sign(r+'.'+expiry);if(sig.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return null;return r}
export function session(res,r){if(!secret)throw Error('SESSION_SECRET 설정 필요');const exp=String(Date.now()+8*60*60*1000);const value=r+'.'+exp+'.'+sign(r+'.'+exp);res.setHeader('Set-Cookie','kpi_session='+value+'; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800')}
export function error(res,code,message){return res.status(code).json({error:message})}
