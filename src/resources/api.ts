import { requireDb } from '../lib/supabase';
import {fileExtension,validateResourceFile} from './validation';
export {RESOURCE_MAX_BYTES,RESOURCE_EXTENSIONS,validateResourceFile} from './validation';

export const RESOURCE_BUCKET = 'boostmind-resources';




export interface ResourceFolder {
  id: string;
  title: string;
  description: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}
export interface ResourceFile {
  id: string;
  folder_id: string;
  file_name: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: string;
  created_at: string;
}
export async function listResourceFolders(): Promise<ResourceFolder[]> {
  const { data, error } = await requireDb().from('resource_folders')
    .select('id,title,description,created_by,created_at,updated_at')
    .order('title',{ascending:true});
  if(error) throw error;
  return (data??[]) as ResourceFolder[];
}
export async function listResourceFiles(): Promise<ResourceFile[]> {
  const { data,error } = await requireDb().from('resource_files')
    .select('id,folder_id,file_name,storage_path,mime_type,size_bytes,uploaded_by,created_at')
    .order('created_at',{ascending:false});
  if(error) throw error;
  return (data??[]) as ResourceFile[];
}
export async function saveResourceFolder(input: {id?: string; title: string; description: string}): Promise<void> {
  const title = input.title.trim();
  const description = input.description.trim();
  if(!title || title.length > 120) throw new Error('Folder name is required (maximum 120 characters).');
  if(description.length > 2000) throw new Error('Description must be 2,000 characters or less.');
  const client = requireDb();
  const result = input.id
    ? await client.from('resource_folders').update({title,description}).eq('id',input.id)
    : await client.from('resource_folders').insert({title,description});
  if(result.error) throw result.error;
}
export async function uploadResourceFile(folderId: string,file: File): Promise<void> {
  validateResourceFile(file);
  if(!/^[a-f\d-]{36}$/i.test(folderId)) throw new Error('Select a valid folder.');
  const client=requireDb();
  const ext=fileExtension(file.name);
  const path=`${folderId}/${crypto.randomUUID()}.${ext}`;
  const {error:uploadError}=await client.storage.from(RESOURCE_BUCKET).upload(path,file,{
    contentType:file.type || 'application/octet-stream',upsert:false,cacheControl:'3600'
  });
  if(uploadError) throw uploadError;
  const {error:metadataError}=await client.from('resource_files').insert({
    folder_id:folderId,file_name:file.name,storage_path:path,
    mime_type:file.type || 'application/octet-stream',size_bytes:file.size
  });
  if(metadataError){
    const {error:cleanupError}=await client.storage.from(RESOURCE_BUCKET).remove([path]);
    if(cleanupError) throw new Error(`${metadataError.message}. Storage cleanup also failed; ask an admin to remove the orphaned object.`);
    throw metadataError;
  }
}
export async function signedResourceUrl(record: ResourceFile, download: boolean): Promise<string> {
  const {data,error}=await requireDb().storage.from(RESOURCE_BUCKET)
    .createSignedUrl(record.storage_path, 60, download?{download:record.file_name}:undefined);
  if(error || !data?.signedUrl) throw error ?? new Error('Unable to open file.');
  return data.signedUrl;
}
export async function deleteResourceFile(record: ResourceFile): Promise<void> {
  const client=requireDb();
  const {error:removeError}=await client.storage.from(RESOURCE_BUCKET).remove([record.storage_path]);
  if(removeError) throw removeError;
  const {error:dbError}=await client.from('resource_files').delete().eq('id',record.id);
  if(dbError) throw new Error(`File was deleted from storage, but its list entry could not be removed: ${dbError.message}`);
}
export async function deleteResourceFolder(folder: ResourceFolder): Promise<void> {
  const {error}=await requireDb().from('resource_folders').delete().eq('id',folder.id);
  if(error) throw error; // FK blocks deletion while files remain.
}
