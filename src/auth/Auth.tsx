import {createContext,useCallback,useContext,useEffect,useMemo,useState,type ReactNode} from 'react';
import type {Session} from '@supabase/supabase-js';
import {db} from '../lib/supabase';
import type {Profile} from '../lib/types';
type Context={session:Session|null;profile:Profile|null;loading:boolean;error:string;signIn:(email:string,password:string)=>Promise<void>;signOut:()=>Promise<void>;reload:()=>Promise<void>};
const AuthContext=createContext<Context|null>(null);
export function AuthProvider({children}:{children:ReactNode}){
 const [session,setSession]=useState<Session|null>(null);const [profile,setProfile]=useState<Profile|null>(null);const [loading,setLoading]=useState(true);const [error,setError]=useState('');
 const loadProfile=useCallback(async(s:Session|null)=>{if(!db||!s){setProfile(null);return;}const {data,error:e}=await db.from('profiles').select('id,name,email,role,active,created_at').eq('id',s.user.id).maybeSingle();if(e)throw e;setProfile(data as Profile|null);},[]);
 useEffect(()=>{if(!db){setLoading(false);return;}let active=true;void db.auth.getSession().then(async({data})=>{if(!active)return;setSession(data.session);try{await loadProfile(data.session);}catch(e){setError(e instanceof Error?e.message:'Profile unavailable');}finally{if(active)setLoading(false);}});const {data:listener}=db.auth.onAuthStateChange((_event,s)=>{setSession(s);void loadProfile(s).catch(e=>setError(e instanceof Error?e.message:'Profile unavailable'));});return()=>{active=false;listener.subscription.unsubscribe();};},[loadProfile]);
 const signIn=async(email:string,password:string)=>{if(!db)throw new Error('Configure Supabase first');const {error:e}=await db.auth.signInWithPassword({email,password});if(e)throw e;};
 const signOut=async()=>{if(!db)return;await db.auth.signOut();setProfile(null);setSession(null);};
 const reload=async()=>{if(session)await loadProfile(session);};
 const value=useMemo(()=>({session,profile,loading,error,signIn,signOut,reload}),[session,profile,loading,error]);
 return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth(){const ctx=useContext(AuthContext);if(!ctx)throw new Error('Missing AuthProvider');return ctx;}
