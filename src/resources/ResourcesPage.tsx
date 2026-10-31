import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { ArrowLeft, BookOpen, Download, File, FileArchive, FileCode2, FileImage, FileText,
  Folder, FolderOpen, FolderPlus, HardDrive, LoaderCircle, Pencil, Plus, Search, Trash2, UploadCloud } from 'lucide-react';
import { Dialog, Field, FormButtons, Notice } from '../components/UI';
import {
  deleteResourceFile, deleteResourceFolder, listResourceFiles, listResourceFolders, RESOURCE_EXTENSIONS,
  saveResourceFolder, signedResourceUrl, uploadResourceFile, validateResourceFile,
  type ResourceFile, type ResourceFolder
} from './api';

function prettySize(size: number) {
  if(size >= 1048576) return `${(size/1048576).toFixed(1)} MB`;
  if(size >= 1024) return `${(size/1024).toFixed(1)} KB`;
  return `${size} B`;
}
function formatDate(input: string) { return new Date(input).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}); }
function FileSymbol({name}:{name:string}) {
  const ext=name.split('.').pop()?.toLowerCase();
  if(ext==='pdf'||ext==='txt'||ext==='md') return <FileText size={20}/>;
  if(['png','jpg','jpeg','webp'].includes(ext||'')) return <FileImage size={20}/>;
  if(['sql','json','csv'].includes(ext||'')) return <FileCode2 size={20}/>;
  if(ext==='zip') return <FileArchive size={20}/>;
  return <File size={20}/>;
}

export function ResourcesPage({admin}:{admin:boolean}) {
  const [folders,setFolders]=useState<ResourceFolder[]>([]);
  const [files,setFiles]=useState<ResourceFile[]>([]);
  const [selected,setSelected]=useState<string|null>(null);
  const [query,setQuery]=useState('');
  const [busy,setBusy]=useState(true);
  const [working,setWorking]=useState(false);
  const [error,setError]=useState('');
  const [success,setSuccess]=useState('');
  const [editing,setEditing]=useState<ResourceFolder|'new'|null>(null);
  const fileInput=useRef<HTMLInputElement>(null);

  const reload=useCallback(async()=>{
    setBusy(true);
    setError('');
    try{
      const [nextFolders,nextFiles]=await Promise.all([listResourceFolders(),listResourceFiles()]);
      setFolders(nextFolders);setFiles(nextFiles);
    }catch(e){setError(e instanceof Error?e.message:'Unable to load Resources. Run the Resources SQL migration first.');}
    finally{setBusy(false);}
  },[]);
  useEffect(()=>{void reload();},[reload]);

  const activeFolder=folders.find(f=>f.id===selected)??null;
  const selectedFiles=useMemo(()=>files.filter(f=>f.folder_id===selected),[files,selected]);
  const visibleFolders=useMemo(()=>folders.filter(folder=>{
    const matchingFiles=files.filter(f=>f.folder_id===folder.id);
    const needle=query.trim().toLowerCase();
    return !needle || [folder.title,folder.description,...matchingFiles.map(f=>f.file_name)].some(v=>v.toLowerCase().includes(needle));
  }),[folders,files,query]);
  const visibleFiles=useMemo(()=>selectedFiles.filter(f=>!query.trim()||f.file_name.toLowerCase().includes(query.trim().toLowerCase())),[selectedFiles,query]);
  const folderFileCount=(id:string)=>files.filter(f=>f.folder_id===id).length;
  function showFolder(id:string){setSelected(id);setQuery('');setError('');setSuccess('');}
  function openFolderEditor(folder:ResourceFolder|'new'){setEditing(folder);setError('');setSuccess('');}

  async function saveFolder(e:FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if(working)return;
    const form=new FormData(e.currentTarget);
    setWorking(true);setError('');setSuccess('');
    try{
      await saveResourceFolder({id:editing&&editing!=='new'?editing.id:undefined,title:String(form.get('title')??''),description:String(form.get('description')??'')});
      await reload();setEditing(null);setSuccess(editing==='new'?'Folder created.':'Folder updated.');
    }catch(e){setError(e instanceof Error?e.message:'Could not save folder.');}
    finally{setWorking(false);}
  }
  async function uploadFiles(e:ChangeEvent<HTMLInputElement>){
    const uploaded=Array.from(e.target.files??[]);
    e.target.value='';
    if(!uploaded.length || !selected || !admin)return;
    setWorking(true);setError('');setSuccess('');
    let count=0;
    const errors:string[]=[];
    for(const file of uploaded){
      try{validateResourceFile(file);await uploadResourceFile(selected,file);count++;}
      catch(e){errors.push(`${file.name}: ${e instanceof Error?e.message:'Upload failed'}`);}
    }
    try{await reload();}catch{ /* reload surfaces its own error */ }
    if(errors.length)setError(errors.join(' | '));
    if(count)setSuccess(`${count} file${count===1?'':'s'} uploaded successfully.`);
    setWorking(false);
  }
  async function openFile(record:ResourceFile, download:boolean){
    setError('');
    // Open a placeholder in the direct click gesture to avoid pop-up blocking during the signed URL request.
    const windowTab=download?null:window.open('about:blank','_blank');
    try{
      const link=await signedResourceUrl(record,download);
      if(download){
        const anchor=document.createElement('a');anchor.href=link;anchor.rel='noopener noreferrer';
        anchor.download=record.file_name;document.body.append(anchor);anchor.click();anchor.remove();
      }else if(windowTab){windowTab.opener=null;windowTab.location.replace(link);}
      else{setError('Allow pop-ups for this website to preview files, or use Download.');}
    }catch(e){windowTab?.close();setError(e instanceof Error?e.message:'File could not be opened.');}
  }
  async function removeFile(record:ResourceFile){
    if(!admin||!window.confirm(`Delete “${record.file_name}”? This cannot be undone.`))return;
    setWorking(true);setError('');setSuccess('');
    try{await deleteResourceFile(record);await reload();setSuccess('File deleted.');}
    catch(e){setError(e instanceof Error?e.message:'Unable to delete file.');}
    finally{setWorking(false);}
  }
  async function removeFolder(folder:ResourceFolder){
    if(!admin)return;
    if(folderFileCount(folder.id)){setError('This folder contains files. Delete its files before deleting the folder.');return;}
    if(!window.confirm(`Delete empty folder “${folder.title}”?`))return;
    setWorking(true);setError('');setSuccess('');
    try{await deleteResourceFolder(folder);setSelected(null);await reload();setSuccess('Folder deleted.');}
    catch(e){setError(e instanceof Error?e.message:'Unable to delete folder.');}
    finally{setWorking(false);}
  }

  return <div className="resources-page">
    <div className="title-bar resources-heading">
      <div><span className="eyebrow">TEAM KNOWLEDGE LIBRARY</span><h1>Resources</h1><p>Keep your UI references, master files, templates and team documents in one organized place.</p></div>
      <div className="title-actions">
        {admin&&<button className="btn primary" onClick={()=>openFolderEditor('new')}><FolderPlus size={17}/> New folder</button>}
      </div>
    </div>
    <div className="resources-overview">
      <div><span className="resources-overview-icon"><FolderOpen size={22}/></span><strong>{folders.length}</strong><small>Folders</small></div>
      <div><span className="resources-overview-icon blue"><FileText size={22}/></span><strong>{files.length}</strong><small>Files</small></div>
      <div><span className="resources-overview-icon green"><HardDrive size={22}/></span><strong>{prettySize(files.reduce((total,f)=>total+Number(f.size_bytes),0))}</strong><small>Storage used</small></div>
    </div>
    {error&&<Notice message={error}/>}{success&&<Notice message={success} kind="success"/>}
    <div className="resources-panel panel">
      <div className="resources-toolbar">
        <div className="resources-breadcrumb">
          <button className={!activeFolder?'selected':''} onClick={()=>showFolder('')}><FolderOpen size={17}/> All resources</button>
          {activeFolder&&<><span className="resources-slash">/</span><strong>{activeFolder.title}</strong></>}
        </div>
        <div className="resources-toolbar-right">
          <label className="resources-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search folders or files…" aria-label="Search Resources" /></label>
          {admin&&activeFolder&&<><button className="btn primary" disabled={busy||working} onClick={()=>fileInput.current?.click()}><UploadCloud size={16}/> Upload files</button><input ref={fileInput} className="resources-hidden-file" type="file" multiple accept={RESOURCE_EXTENSIONS.map(e=>'.'+e).join(',')} onChange={e=>void uploadFiles(e)}/></>}
        </div>
      </div>
      {working&&<div className="resources-working" role="status"><LoaderCircle className="resource-spin" size={17}/> Saving changes…</div>}
      {busy?<div className="resources-loading"><LoaderCircle className="resource-spin" size={24}/> Loading your library…</div>:
        activeFolder ?
          <>
            <div className="resources-inside-header">
              <button className="resources-back" title="Back to folders" onClick={()=>showFolder('')}><ArrowLeft size={19}/></button>
              <div className="resources-folder-icon large"><FolderOpen size={24}/></div>
              <div className="resources-inside-title"><h2>{activeFolder.title}</h2><p>{activeFolder.description||'No description added yet.'}</p><small>{selectedFiles.length} file{selectedFiles.length!==1?'s':''}</small></div>
              {admin&&<div className="resources-folder-actions"><button className="icon-btn" title="Edit folder" onClick={()=>openFolderEditor(activeFolder)}><Pencil size={17}/></button><button className="icon-btn danger" title="Delete folder" disabled={working} onClick={()=>void removeFolder(activeFolder)}><Trash2 size={17}/></button></div>}
            </div>
            {visibleFiles.length ? <div className="resources-files" role="list" aria-label={`Files in ${activeFolder.title}`}>
              {visibleFiles.map(record=><div className="resources-file-row" role="listitem" key={record.id}>
                <div className="resources-file-type"><FileSymbol name={record.file_name}/></div>
                <div className="resources-file-meta"><strong title={record.file_name}>{record.file_name}</strong><small>{prettySize(record.size_bytes)} · {formatDate(record.created_at)}</small></div>
                <div className="resources-file-actions"><button className="btn outline" onClick={()=>void openFile(record,false)}><BookOpen size={15}/> Open</button><button className="btn ghost" onClick={()=>void openFile(record,true)}><Download size={15}/> Download</button>{admin&&<button className="icon-btn danger" disabled={working} title={`Delete ${record.file_name}`} aria-label={`Delete ${record.file_name}`} onClick={()=>void removeFile(record)}><Trash2 size={16}/></button>}</div>
              </div>)}
            </div>:<div className="resources-empty"><FileText size={27}/><strong>{query?'No matching files':'This folder is empty'}</strong><span>{query?'Try a different search.':'Upload PDF, MD, DOCX, images or other supported files.'}</span>{admin&&!query&&<button className="btn outline" onClick={()=>fileInput.current?.click()}><Plus size={16}/> Upload first file</button>}</div>}
          </>
        : visibleFolders.length ? <div className="resources-folder-grid">
            {visibleFolders.map(folder=><div className="resources-folder-card" key={folder.id}>
              <button type="button" className="resources-folder-main" onClick={()=>showFolder(folder.id)} aria-label={`Open ${folder.title}`}>
                <span className="resources-folder-icon"><Folder size={25}/></span><strong>{folder.title}</strong><p>{folder.description||'Add a description for this folder.'}</p><small>{folderFileCount(folder.id)} file{folderFileCount(folder.id)===1?'':'s'}</small>
              </button>
              {admin&&<button className="resources-quick-edit" aria-label={`Edit ${folder.title}`} title="Edit folder" onClick={()=>openFolderEditor(folder)}><Pencil size={15}/></button>}
            </div>)}
          </div> : <div className="resources-empty"><Folder size={31}/><strong>{query?'No matching folders':'No resource folders yet'}</strong><span>{query?'Try another search.':'Start by creating a folder such as UI Components or Master Files.'}</span>{admin&&!query&&<button className="btn primary" onClick={()=>openFolderEditor('new')}><FolderPlus size={16}/> Create your first folder</button>}</div>}
      <div className="resources-footer-note"><span>{admin?'Admins can organize and upload files.':'You have read-only access to this library.'}</span><span>Private company library · 20 MB per file</span></div>
    </div>
    {editing&&<Dialog title={editing==='new'?'Create resource folder':'Edit resource folder'} subtitle="Give the folder a clear name and a description of what it contains." onClose={()=>{if(!working)setEditing(null);}}>
      <form onSubmit={e=>void saveFolder(e)}>
        <div className="form-grid"><Field label="Folder name *" wide><input name="title" autoFocus required maxLength={120} dir="auto" placeholder="e.g. UI Components" defaultValue={editing==='new'?'':editing.title}/></Field>
          <Field label="Description" wide><textarea name="description" rows={4} maxLength={2000} dir="auto" placeholder="Describe the reference files and how your team should use them…" defaultValue={editing==='new'?'':editing.description}/></Field>
        </div>
        {error&&<Notice message={error}/>}
        <FormButtons busy={working} onCancel={()=>setEditing(null)} label={editing==='new'?'Create folder':'Save changes'}/>
      </form>
    </Dialog>}
  </div>;
}
