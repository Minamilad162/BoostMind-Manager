import {useCallback,useEffect,useMemo,useState} from 'react';
import type {Client,Feature,Project} from '../lib/types';
import {convertClients,convertFeatures,convertProjects,type InvoiceBalance} from './types';
import {listInvoices} from './api';
import {LegacyInvoiceStudioPage} from './InvoiceStudio';
import './invoice-legacy.css';

export function InvoiceWorkspace({projects,clients,features,initialProjectId,onRefresh}:{
 projects:Project[];clients:Client[];features:Feature[];initialProjectId?:string;onRefresh:()=>Promise<void>;
}){
 const [invoices,setInvoices]=useState<InvoiceBalance[]>([]);
 const [loading,setLoading]=useState(true);const [error,setError]=useState('');
 const refresh=useCallback(async()=>{setError('');try{setInvoices(await listInvoices(projects,clients));}catch(e){setError(e instanceof Error?e.message:'Unable to list invoices');}finally{setLoading(false);}},[projects,clients]);
 useEffect(()=>{void refresh();},[refresh]);
 const ordered=useMemo(()=>initialProjectId?[...projects].sort((a,b)=>Number(b.id===initialProjectId)-Number(a.id===initialProjectId)):projects,[projects,initialProjectId]);
 const handleSaved=async()=>{await onRefresh();await refresh();};
 return <section className="boost-invoice-root">
  {loading&&<p role="status">Loading invoices…</p>}
  {error&&<div role="alert" className="notice error">{error} <button className="btn ghost" onClick={()=>void refresh()}>Retry</button></div>}
  <LegacyInvoiceStudioPage projects={convertProjects(ordered)} clients={convertClients(clients)} services={convertFeatures(features)} invoices={invoices} onRefresh={handleSaved} initialProjectId={initialProjectId}/>
 </section>;
}
