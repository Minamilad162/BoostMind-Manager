import {useEffect,type FormEvent,type ReactNode} from 'react';
import {AlertTriangle,Check,ChevronDown,X} from 'lucide-react';
export function Dialog({title,subtitle,children,onClose,wide=false}:{title:string;subtitle?:string;children:ReactNode;onClose:()=>void;wide?:boolean}){
 useEffect(()=>{const fn=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose();};document.addEventListener('keydown',fn);return()=>document.removeEventListener('keydown',fn);},[onClose]);
 return <div className="modal-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}} role="presentation"><section className={'dialog'+(wide?' wide':'')} role="dialog" aria-modal="true" aria-label={title}><div className="dialog-head"><div><div className="eyebrow">BOOSTMIND WORKSPACE</div><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div><button className="icon-btn" aria-label="Close dialog" onClick={onClose}><X size={18}/></button></div>{children}</section></div>;
}
export function Field({label,children,wide=false}:{label:string;children:ReactNode;wide?:boolean}){return <label className={'field'+(wide?' span-2':'')}><span>{label}</span>{children}</label>;}
export function FormButtons({busy=false,onCancel,label='Save'}:{busy?:boolean;onCancel:()=>void;label?:string}){return <div className="form-actions"><button type="button" className="btn ghost" onClick={onCancel}>Cancel</button><button type="submit" className="btn primary" disabled={busy}>{busy?'Saving…':label}</button></div>;}
export function Notice({message,kind='error'}:{message:string;kind?:'error'|'info'|'success'}){return <div className={'notice '+kind}>{kind==='error'?<AlertTriangle size={16}/>:<Check size={16}/>}<span>{message}</span></div>;}
export const initials=(name:string)=>name.trim().split(/\s+/).slice(0,2).map(x=>x[0]?.toUpperCase()).join('')||'BM';
export function Avatar({name,small=false}:{name:string;small?:boolean}){return <span className={'avatar'+(small?' small':'')} title={name}>{initials(name)}</span>;}
export function Pill({children,tone='neutral'}:{children:ReactNode;tone?:'neutral'|'blue'|'green'|'orange'|'red'|'purple'}){return <span className={'pill '+tone}>{children}</span>;}
export function Empty({title,subtitle}:{title:string;subtitle?:string}){return <div className="empty"><div className="empty-orbit"><Check size={23}/></div><h3>{title}</h3><p>{subtitle||'Start by creating a new record.'}</p></div>;}
export function submitPrevent(fn:(form:FormData)=>void|Promise<void>){return (e:FormEvent<HTMLFormElement>)=>{e.preventDefault();void fn(new FormData(e.currentTarget));};}
export const inputValue=(f:FormData,key:string)=>String(f.get(key)??'').trim();
export function StatusSelect({value,options,onChange}:{value:string;options:{value:string;label:string}[];onChange:(v:string)=>void}){return <span className="select-wrap"><select value={value} onChange={e=>onChange(e.target.value)}>{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select><ChevronDown size={12}/></span>}
