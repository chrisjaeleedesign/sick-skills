'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useWorkbench } from '@/app/lib/workbench-context'

function groupByDate(chats: { id: string; title: string; updated: string; promptName: string; promptVersion: number }[]) {
  const now = new Date()
  const today = now.toDateString()
  const yesterday = new Date(now.getTime() - 86400000).toDateString()
  const groups: Record<string, typeof chats> = { Today: [], Yesterday: [], Older: [] }
  for (const c of chats) {
    const d = new Date(c.updated).toDateString()
    if (d === today) groups.Today.push(c)
    else if (d === yesterday) groups.Yesterday.push(c)
    else groups.Older.push(c)
  }
  return groups
}

export function ChatsSidebar() {
  const { chats, loadChats, createChat, deleteChat } = useWorkbench()
  const router = useRouter()
  const params = useParams()
  const activeChatId = params?.id as string | undefined

  useEffect(() => { loadChats() }, [loadChats])

  async function handleNew() {
    const chat = await createChat()
    router.push(`/chats/${chat.id}`)
  }

  const groups = groupByDate(chats)

  return (
    <div className="flex flex-col h-full p-3 gap-0">
      <div className="font-semibold text-[15px] tracking-tight mb-3">Workbench</div>

      <button
        onClick={handleNew}
        className="w-full bg-[var(--color-fg)] text-[var(--color-fg-inv)] text-[13px] font-medium py-2 px-3 mb-4 hover:opacity-90 active:opacity-80"
      >
        + New chat
      </button>

      <div className="flex-1 overflow-y-auto">
        {Object.entries(groups).map(([label, items]) => items.length === 0 ? null : (
          <div key={label}>
            <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-3)] font-mono mt-3 mb-1 px-1">
              {label}
            </div>
            {items.map(chat => (
              <div
                key={chat.id}
                onClick={() => router.push(`/chats/${chat.id}`)}
                className={`px-2 py-2 cursor-pointer rounded-none group ${
                  chat.id === activeChatId
                    ? 'bg-[var(--color-hover)]'
                    : 'hover:bg-[var(--color-hover)]'
                }`}
              >
                <div className="text-[13px] text-[var(--color-text-1)] truncate">{chat.title}</div>
                <div className="text-[10px] text-[var(--color-text-3)] font-mono mt-0.5">
                  {new Date(chat.updated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="text-[10px] text-[var(--color-text-3)] font-mono bg-[var(--color-border)] inline-block px-1 mt-1">
                  {chat.promptName} · v{chat.promptVersion || 'draft'}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
