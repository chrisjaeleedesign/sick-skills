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
  truncateFromMessage, copyMessagesTo,
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

  describe('truncateFromMessage', () => {
    let truncateChatId: string
    let promptId2: string

    beforeAll(async () => {
      const p = await createPrompt('Truncate test prompt')
      promptId2 = p.id
      const c = await createChat('Truncate test chat', promptId2, 0)
      truncateChatId = c.id
    })

    it('truncates middle message and everything after', async () => {
      const msg1 = {
        id: 'trunc-1',
        role: 'user' as const,
        timestamp: new Date().toISOString(),
        text: 'First',
        promptVersion: 0,
        promptState: DEFAULT_PROMPT_STATE,
        model: 'sonnet',
      }
      const msg2 = {
        id: 'trunc-2',
        role: 'assistant' as const,
        timestamp: new Date().toISOString(),
        text: 'Second',
        promptVersion: 0,
        promptState: DEFAULT_PROMPT_STATE,
        model: 'sonnet',
      }
      const msg3 = {
        id: 'trunc-3',
        role: 'user' as const,
        timestamp: new Date().toISOString(),
        text: 'Third',
        promptVersion: 0,
        promptState: DEFAULT_PROMPT_STATE,
        model: 'sonnet',
      }
      await appendMessage(truncateChatId, msg1)
      await appendMessage(truncateChatId, msg2)
      await appendMessage(truncateChatId, msg3)

      const kept = await truncateFromMessage(truncateChatId, 'trunc-2')
      expect(kept).toHaveLength(1)
      expect(kept[0].id).toBe('trunc-1')

      const remaining = await listMessages(truncateChatId)
      expect(remaining).toHaveLength(1)
      expect(remaining[0].text).toBe('First')
    })

    it('truncates first message removes everything', async () => {
      const c = await createChat('Truncate first test', promptId2, 0)
      const msgA = {
        id: 'a-1',
        role: 'user' as const,
        timestamp: new Date().toISOString(),
        text: 'Alpha',
        promptVersion: 0,
        promptState: DEFAULT_PROMPT_STATE,
        model: 'sonnet',
      }
      const msgB = {
        id: 'a-2',
        role: 'user' as const,
        timestamp: new Date().toISOString(),
        text: 'Beta',
        promptVersion: 0,
        promptState: DEFAULT_PROMPT_STATE,
        model: 'sonnet',
      }
      await appendMessage(c.id, msgA)
      await appendMessage(c.id, msgB)

      const kept = await truncateFromMessage(c.id, 'a-1')
      expect(kept).toHaveLength(0)

      const remaining = await listMessages(c.id)
      expect(remaining).toHaveLength(0)
    })

    it('returns all messages unchanged when messageId not found', async () => {
      const c = await createChat('Truncate missing test', promptId2, 0)
      const msg = {
        id: 'x-1',
        role: 'user' as const,
        timestamp: new Date().toISOString(),
        text: 'Only message',
        promptVersion: 0,
        promptState: DEFAULT_PROMPT_STATE,
        model: 'sonnet',
      }
      await appendMessage(c.id, msg)

      const kept = await truncateFromMessage(c.id, 'nonexistent')
      expect(kept).toHaveLength(1)
      expect(kept[0].id).toBe('x-1')

      const remaining = await listMessages(c.id)
      expect(remaining).toHaveLength(1)
      expect(remaining[0].id).toBe('x-1')
    })
  })

  describe('copyMessagesTo', () => {
    let sourceChatId: string
    let promptId3: string

    beforeAll(async () => {
      const p = await createPrompt('Copy test prompt')
      promptId3 = p.id
      const c = await createChat('Copy source chat', promptId3, 0)
      sourceChatId = c.id
    })

    it('copies messages up to and including specified ID', async () => {
      const msg1 = {
        id: 'copy-1',
        role: 'user' as const,
        timestamp: new Date().toISOString(),
        text: 'First',
        promptVersion: 0,
        promptState: DEFAULT_PROMPT_STATE,
        model: 'sonnet',
      }
      const msg2 = {
        id: 'copy-2',
        role: 'assistant' as const,
        timestamp: new Date().toISOString(),
        text: 'Second',
        promptVersion: 0,
        promptState: DEFAULT_PROMPT_STATE,
        model: 'sonnet',
      }
      const msg3 = {
        id: 'copy-3',
        role: 'user' as const,
        timestamp: new Date().toISOString(),
        text: 'Third',
        promptVersion: 0,
        promptState: DEFAULT_PROMPT_STATE,
        model: 'sonnet',
      }
      await appendMessage(sourceChatId, msg1)
      await appendMessage(sourceChatId, msg2)
      await appendMessage(sourceChatId, msg3)

      const targetChat = await createChat('Copy target chat', promptId3, 0)
      await copyMessagesTo(sourceChatId, targetChat.id, 'copy-2')

      const copied = await listMessages(targetChat.id)
      expect(copied).toHaveLength(2)
      expect(copied[0].id).toBe('copy-1')
      expect(copied[1].id).toBe('copy-2')
      expect(copied[1].text).toBe('Second')
    })

    it('throws when upToMessageId not found', async () => {
      const c = await createChat('Copy error test', promptId3, 0)
      const msg = {
        id: 'err-1',
        role: 'user' as const,
        timestamp: new Date().toISOString(),
        text: 'Message',
        promptVersion: 0,
        promptState: DEFAULT_PROMPT_STATE,
        model: 'sonnet',
      }
      await appendMessage(sourceChatId, msg)

      const targetChat = await createChat('Copy error target', promptId3, 0)
      await expect(copyMessagesTo(sourceChatId, targetChat.id, 'nonexistent-id')).rejects.toThrow(
        /Message nonexistent-id not found/
      )
    })
  })
})
