import { promises as fs } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import type {
  Prompt, PromptSummary, PromptState, PromptVersion,
  Chat, ChatSummary, ChatMessage,
} from './workbench-types'
import { DEFAULT_PROMPT_STATE } from './workbench-types'

function getDir() {
  const base = process.env.WORKBENCH_DIR
    || path.resolve(process.cwd(), '..', '..', '..', '.agents', 'workbench')
  return {
    prompts: path.join(base, 'prompts'),
    chats: path.join(base, 'chats'),
  }
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true })
}

async function readJson<T>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, 'utf-8')
  return JSON.parse(raw) as T
}

async function writeJson(filePath: string, data: unknown) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2))
}

// ─── Prompts ────────────────────────────────────────────────────────────────

export async function createPrompt(name: string): Promise<Prompt> {
  const id = randomUUID()
  const now = new Date().toISOString()
  const dir = path.join(getDir().prompts, id)
  await ensureDir(path.join(dir, 'versions'))

  const meta: PromptSummary = { id, name, created: now, updated: now, currentVersion: 0 }
  await writeJson(path.join(dir, 'meta.json'), meta)
  await writeJson(path.join(dir, 'draft.json'), DEFAULT_PROMPT_STATE)

  return { ...meta, draft: DEFAULT_PROMPT_STATE }
}

export async function getPrompt(id: string): Promise<Prompt> {
  const dir = path.join(getDir().prompts, id)
  const [meta, draft] = await Promise.all([
    readJson<PromptSummary>(path.join(dir, 'meta.json')),
    readJson<PromptState>(path.join(dir, 'draft.json')),
  ])
  return { ...meta, draft }
}

export async function updatePromptDraft(id: string, draft: PromptState): Promise<void> {
  const now = new Date().toISOString()
  const dir = path.join(getDir().prompts, id)
  await writeJson(path.join(dir, 'draft.json'), draft)
  // touch updated
  const meta = await readJson<PromptSummary>(path.join(dir, 'meta.json'))
  await writeJson(path.join(dir, 'meta.json'), { ...meta, updated: now })
}

export async function updatePromptName(id: string, name: string): Promise<void> {
  const dir = path.join(getDir().prompts, id)
  const meta = await readJson<PromptSummary>(path.join(dir, 'meta.json'))
  await writeJson(path.join(dir, 'meta.json'), {
    ...meta,
    name,
    updated: new Date().toISOString(),
  })
}

export async function listPrompts(): Promise<PromptSummary[]> {
  await ensureDir(getDir().prompts)
  const entries = await fs.readdir(getDir().prompts)
  const summaries = await Promise.all(
    entries.map(id => readJson<PromptSummary>(path.join(getDir().prompts, id, 'meta.json')).catch(() => null))
  )
  return summaries.filter(Boolean).sort((a, b) =>
    new Date(b!.updated).getTime() - new Date(a!.updated).getTime()
  ) as PromptSummary[]
}

export async function deletePrompt(id: string): Promise<void> {
  await fs.rm(path.join(getDir().prompts, id), { recursive: true, force: true })
}

export async function savePromptVersion(id: string, note?: string): Promise<PromptVersion> {
  const prompt = await getPrompt(id)
  const version = prompt.currentVersion + 1
  const pv: PromptVersion = {
    version,
    state: prompt.draft,
    committed: new Date().toISOString(),
    note,
  }
  const dir = path.join(getDir().prompts, id)
  await writeJson(path.join(dir, 'versions', `v${version}.json`), pv)
  const meta = await readJson<PromptSummary>(path.join(dir, 'meta.json'))
  await writeJson(path.join(dir, 'meta.json'), {
    ...meta,
    currentVersion: version,
    updated: new Date().toISOString(),
  })
  return pv
}

export async function getPromptVersion(id: string, version: number): Promise<PromptVersion> {
  return readJson<PromptVersion>(
    path.join(getDir().prompts, id, 'versions', `v${version}.json`)
  )
}

export async function listPromptVersions(id: string): Promise<PromptVersion[]> {
  const dir = path.join(getDir().prompts, id, 'versions')
  await ensureDir(dir)
  const files = await fs.readdir(dir)
  const versions = await Promise.all(
    files.map(f => readJson<PromptVersion>(path.join(dir, f)))
  )
  return versions.sort((a, b) => b.version - a.version)
}

// ─── Chats ───────────────────────────────────────────────────────────────────

export async function createChat(title: string, promptId: string, promptVersion: number): Promise<Chat> {
  const id = randomUUID()
  const now = new Date().toISOString()
  const dir = path.join(getDir().chats, id)
  await ensureDir(dir)

  const chat: Chat = { id, title, created: now, updated: now, promptId, promptVersion }
  await writeJson(path.join(dir, 'meta.json'), chat)
  // Create empty messages file
  await fs.writeFile(path.join(dir, 'messages.jsonl'), '')

  return chat
}

export async function getChat(id: string): Promise<Chat> {
  return readJson<Chat>(path.join(getDir().chats, id, 'meta.json'))
}

export async function updateChatMeta(id: string, patch: Partial<Pick<Chat, 'title' | 'updated' | 'promptVersion'>>): Promise<void> {
  const chat = await getChat(id)
  await writeJson(path.join(getDir().chats, id, 'meta.json'), { ...chat, ...patch })
}

export async function deleteChat(id: string): Promise<void> {
  await fs.rm(path.join(getDir().chats, id), { recursive: true, force: true })
}

export async function listChats(): Promise<ChatSummary[]> {
  await ensureDir(getDir().chats)
  const entries = await fs.readdir(getDir().chats)
  const chats = await Promise.all(
    entries.map(async id => {
      const chat = await readJson<Chat>(path.join(getDir().chats, id, 'meta.json')).catch(() => null)
      if (!chat) return null
      const prompt = await readJson<PromptSummary>(path.join(getDir().prompts, chat.promptId, 'meta.json')).catch(() => null)
      return {
        ...chat,
        promptName: prompt?.name ?? 'Unknown',
      } satisfies ChatSummary
    })
  )
  return chats.filter(Boolean).sort((a, b) =>
    new Date(b!.updated).getTime() - new Date(a!.updated).getTime()
  ) as ChatSummary[]
}

export async function appendMessage(chatId: string, msg: ChatMessage): Promise<void> {
  const filePath = path.join(getDir().chats, chatId, 'messages.jsonl')
  await fs.appendFile(filePath, JSON.stringify(msg) + '\n')
  await updateChatMeta(chatId, { updated: new Date().toISOString() })
}

export async function listMessages(chatId: string): Promise<ChatMessage[]> {
  const filePath = path.join(getDir().chats, chatId, 'messages.jsonl')
  const raw = await fs.readFile(filePath, 'utf-8').catch(() => '')
  return raw
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line) as ChatMessage)
}
