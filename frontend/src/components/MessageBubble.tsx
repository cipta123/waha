import { Message } from '../lib/api';
import { classNames } from '../lib/utils';

interface MessageBubbleProps {
  message: Message;
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
  onReply: (message: Message) => void;
  onImageClick: (url: string) => void;
}

// Helper to get dynamic API URL for media
const fixLocalhostUrl = (url: string) => {
  if (typeof window === 'undefined' || !url) return url;
  // Replace localhost or 127.0.0.1 with current window hostname
  return url.replace(/:\/\/(localhost|127\.0\.0\.1)/, `://${window.location.hostname}`);
};

const getMediaUrl = (id: string) => {
  if (typeof window !== 'undefined') {
    return `http://${window.location.hostname}:4000/api/messages/media/${id}`;
  }
  return `http://localhost:4000/api/messages/media/${id}`;
};

export function MessageBubble({
  message,
  openMenuId,
  setOpenMenuId,
  onReply,
  onImageClick,
}: MessageBubbleProps) {
  const isAi = message.repliedBy === 'ai';
  const isHuman = message.repliedBy === 'human';
  const isOptimistic = message.id.startsWith('temp-');

  let bubbleColor = "bg-white border border-slate-200";
  if (message.direction === "outgoing") {
    if (isAi) {
      bubbleColor = "bg-blue-50 border border-blue-100";
    } else if (isHuman) {
      bubbleColor = "bg-green-50 border border-green-100";
    } else {
      bubbleColor = "bg-blue-100 text-blue-900 border border-blue-200"; // User sent
    }
  }

  return (
    <li
      className={classNames(
        "relative flex w-fit max-w-[85%] md:max-w-[60%] flex-col gap-1 rounded-2xl px-3 py-2 md:px-4 md:py-3 shadow-sm transition-all hover:shadow-md",
        message.direction === "outgoing" ? "self-end rounded-br-sm" : "self-start rounded-bl-sm",
        bubbleColor,
        isOptimistic ? "opacity-70" : "opacity-100"
      )}
    >
      {/* AI Robot Icon */}
      {isAi && (
        <span className="absolute -left-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] shadow-sm z-10">
          🤖
        </span>
      )}

      {/* Three-dot menu button */}
      <div className="absolute top-2 right-2">
        <button
          onClick={() => setOpenMenuId(openMenuId === message.id ? null : message.id)}
          className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100"
          title="Message options"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
            <circle cx="2" cy="8" r="1.5"/>
            <circle cx="8" cy="8" r="1.5"/>
            <circle cx="14" cy="8" r="1.5"/>
          </svg>
        </button>
        
        {/* Dropdown menu */}
        {openMenuId === message.id && (
          <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-10">
            <button
              onClick={() => {
                onReply(message);
                setOpenMenuId(null);
              }}
              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              Reply
            </button>
            <button
              onClick={() => {
                // TODO: Implement delete functionality
                setOpenMenuId(null);
              }}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {message.direction === "incoming" && message.senderName && (
        <p className="mb-1 text-xs font-semibold text-slate-500">{message.senderName}</p>
      )}
      
      {/* Display quoted message if exists */}
      {message.quotedMsg && (
        <div className="mb-2 border-l-4 border-slate-400 bg-slate-50 px-3 py-2 rounded">
          <p className="text-xs font-semibold text-slate-600">{message.quotedMsg.senderName || 'Unknown'}</p>
          <p className="text-xs text-slate-500 truncate">{message.quotedMsg.text}</p>
        </div>
      )}

      {message.mediaType === 'image' && message.mediaUrl && (
        <div className="mb-2">
          <img 
            src={
              message.mediaUrl.startsWith('http') || message.mediaUrl.startsWith('data:') 
                ? fixLocalhostUrl(message.mediaUrl)
                : getMediaUrl(message.id)
            }
            alt="Image" 
            className="max-w-full md:max-w-xs rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => {
              const url = message.mediaUrl && (message.mediaUrl.startsWith('http') || message.mediaUrl.startsWith('data:'))
                ? fixLocalhostUrl(message.mediaUrl)
                : getMediaUrl(message.id);
              if (url) onImageClick(url);
            }}
          />
        </div>
      )}

      <div className="flex items-end gap-2">
        {message.text && !message.text.startsWith('[') && (
          <p className="text-base leading-relaxed flex-1">{message.text}</p>
        )}
        <span className="flex items-center gap-1 text-[10px] opacity-60 whitespace-nowrap self-end pb-0.5 ml-auto">
          {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          {message.direction === "outgoing" && (
            <span className="text-base leading-none" style={{ letterSpacing: '-0.35em' }}>
              {message.ackStatus === 'read' && (
                <span className="font-extrabold" style={{ color: '#53bdeb' }}>✓✓</span>
              )}
              {message.ackStatus === 'delivered' && (
                <span className="text-gray-500 font-extrabold">✓✓</span>
              )}
              {message.ackStatus === 'sent' && (
                <span className="text-gray-500 font-extrabold">✓</span>
              )}
              {message.ackStatus === 'pending' && (
                <span className="text-gray-500 text-sm" style={{ letterSpacing: '0' }}>🕐</span>
              )}
              {message.ackStatus === 'failed' && (
                <span className="text-red-600 text-sm" style={{ letterSpacing: '0' }}>❌</span>
              )}
            </span>
          )}
        </span>
      </div>
    </li>
  );
}
