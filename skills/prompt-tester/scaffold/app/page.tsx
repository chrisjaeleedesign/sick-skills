import { redirect } from 'next/navigation'
import { listChats, createChat, createPrompt } from '@/app/lib/storage'

export default async function HomePage() {
  const chats = await listChats()
  if (chats.length > 0) {
    redirect(`/chats/${chats[0].id}`)
  }
  // No chats yet — create the first one
  const prompt = await createPrompt('My first prompt')
  const chat = await createChat('New chat', prompt.id, 0)
  redirect(`/chats/${chat.id}`)
}
