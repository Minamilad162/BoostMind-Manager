export const RESOURCE_MAX_BYTES = 20 * 1024 * 1024;
export const RESOURCE_EXTENSIONS = ['pdf','md','txt','doc','docx','xls','xlsx','ppt','pptx','csv','json','sql','png','jpg','jpeg','webp','zip'] as const;
const allowedExtensions = new Set<string>(RESOURCE_EXTENSIONS);

export function fileExtension(name: string): string {
  return name.split('.').pop()?.toLowerCase() ?? '';
}
export function validateResourceFile(file: File): void {
  const name = file.name;
  if (!name || name.length > 255 || /[\\/]/.test(name) || !allowedExtensions.has(fileExtension(name))) {
    throw new Error(`Unsupported file. Accepted: ${RESOURCE_EXTENSIONS.map(e=>'.'+e).join(', ')}`);
  }
  if (file.size < 1 || file.size > RESOURCE_MAX_BYTES) {
    throw new Error(`“${name}” must be between 1 byte and 20 MB.`);
  }
}
