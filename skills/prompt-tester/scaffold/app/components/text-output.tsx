import ReactMarkdown from 'react-markdown'

export function TextOutput({ content }: { content: string }) {
  return (
    <div className="prose text-[14px] leading-relaxed text-[var(--color-text-1)]">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  )
}
