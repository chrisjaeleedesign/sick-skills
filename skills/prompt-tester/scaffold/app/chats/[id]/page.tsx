'use client'

import { useEffect } from 'react'
import { useParams } from 'next/navigation'
import { WorkbenchShell } from '@/app/components/workbench-shell'
import { ChatsSidebar } from '@/app/components/chats-sidebar'
import { ChatView } from '@/app/components/chat-view'
import { PromptRail } from '@/app/components/prompt-rail'
import { useWorkbench } from '@/app/lib/workbench-context'

export default function ChatPage() {
  const params = useParams()
  const id = params?.id as string
  const { openChat } = useWorkbench()

  useEffect(() => {
    if (id) openChat(id)
  }, [id, openChat])

  return (
    <WorkbenchShell
      sidebar={<ChatsSidebar />}
      main={<ChatView />}
      rail={<PromptRail />}
    />
  )
}
