import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'

// Override WORKBENCH_DIR before importing storage
const tmpDir = path.join(os.tmpdir(), `workbench-test-${Date.now()}`)
process.env.WORKBENCH_DIR = tmpDir

import {
  createPrompt, getPrompt, updatePromptDraft,
  savePromptVersion, getPromptVersion,
  createChat, getChat, listChats,
  appendMessage, listMessages,
} from '../app/lib/storage'
import { DEFAULT_PROMPT_STATE } from '../app/lib/workbench-types'

beforeAll(() => fs.mkdir(tmpDir, { recursive: true }))
afterAll(() => fs.rm(tmpDir, { recursive: true, force: true }))

describe('prompts', () => {
  let promptId: string

  it('creates a prompt', async () => {
    const p = await createPrompt('Test prompt')
    promptId = p.id
    expect(p.name).toBe('Test prompt')
    expect(p.currentVersion).toBe(0)
    expect(p.draft.model).toBe('sonnet')
  })

  it('reads back the prompt', async () => {
    const p = await getPrompt(promptId)
    expect(p.name).toBe('Test prompt')
  })

  it('updates the draft', async () => {
    await updatePromptDraft(promptId, { ...DEFAULT_PROMPT_STATE, model: 'gpt5' })
    const p = await getPrompt(promptId)
    expect(p.draft.model).toBe('gpt5')
  })

  it('saves a version', async () => {
    const v = await savePromptVersion(promptId)
    expect(v.version).toBe(1)
    const p = await getPrompt(promptId)
    expect(p.currentVersion).toBe(1)
  })

  it('loads a specific version', async () => {
    const v = await getPromptVersion(promptId, 1)
    expect(v.version).toBe(1)
    expect(v.state.model).toBe('gpt5')
  })
})

describe('chats', () => {
  let chatId: string
  let promptId: string

  beforeAll(async () => {
    const p = await createPrompt('Chat test prompt')
    promptId = p.id
  })

  it('creates a chat', async () => {
    const c = await createChat('My chat', promptId, 0)
    chatId = c.id
    expect(c.title).toBe('My chat')
    expect(c.promptId).toBe(promptId)
  })

  it('lists chats', async () => {
    const list = await listChats()
    const found = list.find(c => c.id === chatId)
    expect(found).toBeDefined()
    expect(found!.promptName).toBe('Chat test prompt')
  })

  it('appends and lists messages', async () => {
    const msg = {
      id: 'msg1',
      role: 'user' as const,
      timestamp: new Date().toISOString(),
      text: 'Hello',
      promptVersion: 0,
      promptState: DEFAULT_PROMPT_STATE,
      model: 'sonnet',
    }
    await appendMessage(chatId, msg)
    const msgs = await listMessages(chatId)
    expect(msgs).toHaveLength(1)
    expect(msgs[0].text).toBe('Hello')
  })
})
