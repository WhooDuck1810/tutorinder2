import { formatDistanceToNow } from 'date-fns'
import type { Message } from '@/types/database'

interface ChatBubbleProps {
  message: Message
  isMine: boolean
}

export function ChatBubble({ message, isMine }: ChatBubbleProps) {
  const time = formatDistanceToNow(new Date(message.created_at), { addSuffix: true })

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-[72%] ${isMine ? 'bubble-in-right' : 'bubble-in-left'}`}>
        <div
          className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words"
          style={isMine ? {
            background: 'linear-gradient(135deg, rgba(0,192,232,0.22), rgba(238,131,200,0.18))',
            border: '1px solid rgba(0,192,232,0.3)',
            color: '#e8f4fd',
            borderBottomRightRadius: '6px',
          } : {
            background: '#1e2d42',
            border: '1px solid rgba(0,192,232,0.1)',
            color: '#e8f4fd',
            borderBottomLeftRadius: '6px',
          }}>
          {message.content}
        </div>
        <p className={`text-xs mt-1 ${isMine ? 'text-right' : 'text-left'}`}
          style={{ color: 'rgba(139,175,200,0.5)', fontFamily: 'var(--font-mono)', fontSize: '10px' }}>
          {time}
        </p>
      </div>
    </div>
  )
}
