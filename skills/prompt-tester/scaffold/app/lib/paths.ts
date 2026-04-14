import path from 'path'

export const WORKBENCH_DIR = path.resolve(process.cwd(), '..', '..', '..', '.agents', 'workbench')
export const IMAGES_DIR = path.join(WORKBENCH_DIR, 'images')
export const CHATS_DIR = path.join(WORKBENCH_DIR, 'chats')
export const PROMPTS_DIR = path.join(WORKBENCH_DIR, 'prompts')
