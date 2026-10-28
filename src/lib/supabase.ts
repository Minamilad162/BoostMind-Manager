import {createClient} from '@supabase/supabase-js';
const url=import.meta.env.VITE_SUPABASE_URL?.trim();
const key=import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
export const configured=Boolean(url&&key&&!url.includes('YOUR_PROJECT'));
export const db=configured?createClient(url!,key!,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
export function requireDb(){if(!db)throw new Error('Supabase is not configured. See README / .env.example.');return db;}
