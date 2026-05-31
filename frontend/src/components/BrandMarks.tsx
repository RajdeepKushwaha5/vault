import { Compass, Github, NotepadText } from 'lucide-react'

export function CompassMark({ className = 'h-10 w-10' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {/* Sleek minimalist organic coral branch logo matching withcoral.com */}
      <path d="M12 22V14" />
      <path d="M12 14c-1.5-0.8-3-2-3-4 0-1.2 0.8-2 0.8-2M9 10c-1-0.8-2-1.2-2.5-2.2 0-0.8 0.4-1.5 0.4-1.5" />
      <path d="M12 14c1.5-0.8 3-2 3-4 0-1.2-0.8-2-0.8-2M15 10c1-0.8 2-1.2 2.5-2.2 0-0.8-0.4-1.5-0.4-1.5" />
      <path d="M12 14V8c0-1.5-0.8-2.5-0.8-2.5" />
      <path d="M12 8c0.8-0.8 0.8-2.5 0.8-2.5" />
    </svg>
  )
}

export function SourceLogo({ source, className = 'h-4 w-4' }: { source: string; className?: string }) {
  const key = source.toLowerCase().replace(/[_\s-]/g, '')
  if (key.includes('calendar')) return <CalendarLogo className={className} />
  if (key.includes('gmail')) return <GmailLogo className={className} />
  if (key.includes('github')) return <Github className={className} />
  if (key.includes('notion')) return <NotionLogo className={className} />
  if (key.includes('todoist')) return <TodoistLogo className={className} />
  if (key.includes('slack')) return <SlackLogo className={className} />
  if (key.includes('discord')) return <DiscordLogo className={className} />
  if (key.includes('coral')) return <CoralLogo className={className} />
  if (key.includes('personal') || key.includes('context')) return <Compass className={className} style={{ color: '#a78bfa' }} />
  return <NotepadText className={className} />
}

export function CoralLogo({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {/* Sleek branch-art logo matching the withcoral.com aesthetic */}
      <path d="M12 21v-6.5" />
      <path d="M12 14.5c-1.2-0.7-2.5-1.5-2.5-3 0-0.9 0.6-1.5 0.6-1.5M9 11.5c-0.8-0.6-1.6-1-2-1.8 0-0.6 0.3-1.1 0.3-1.1" />
      <path d="M12 14.5c1.2-0.7 2.5-1.5 2.5-3 0-0.9-0.6-1.5-0.6-1.5M15 11.5c0.8-0.6 1.6-1 2-1.8 0-0.6-0.3-1.1-0.3-1.1" />
      <path d="M12 14.5v-4.5c0-1.2-0.6-2-0.6-2" />
      <path d="M12 10c0.6-0.6 0.6-2 0.6-2" />
    </svg>
  )
}

function CalendarLogo({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="3" fill="#fff" />
      <path d="M7 4h10a3 3 0 0 1 3 3v2H4V7a3 3 0 0 1 3-3Z" fill="#4285F4" />
      <path d="M4 9h4v11H7a3 3 0 0 1-3-3V9Z" fill="#34A853" />
      <path d="M16 9h4v8a3 3 0 0 1-3 3h-1V9Z" fill="#FBBC04" />
      <path d="M8 9h8v11H8V9Z" fill="#fff" />
      <path d="M9.5 15.9h1.8v-4.1H9.8l-.4.9h.9v3.2Zm4.1.1c1.2 0 2-.7 2-1.7 0-.7-.4-1.2-1-1.4.5-.2.8-.7.8-1.3 0-.9-.7-1.5-1.8-1.5-.8 0-1.5.3-1.9.9l.7.8c.3-.3.6-.5 1.1-.5s.8.2.8.6-.3.6-.9.6h-.5v1h.5c.7 0 1 .2 1 .7s-.4.7-1 .7c-.5 0-.9-.2-1.2-.6l-.7.8c.4.6 1.1.9 2.1.9Z" fill="#1F1F1F" />
      <path d="M4 9h16" stroke="#EA4335" strokeWidth="1.5" />
    </svg>
  )
}

function GmailLogo({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.5 6.5h15v11h-15z" fill="#fff" />
      <path d="M4.5 6.5 12 12l7.5-5.5v2.8L12 14.8 4.5 9.3V6.5Z" fill="#EA4335" />
      <path d="M4.5 6.5v11h3V8.7L4.5 6.5Z" fill="#34A853" />
      <path d="M19.5 6.5v11h-3V8.7l3-2.2Z" fill="#4285F4" />
      <path d="M7.5 17.5h9V15h-9v2.5Z" fill="#FBBC04" opacity=".85" />
    </svg>
  )
}

function NotionLogo({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="3" fill="#fff" stroke="#111" strokeWidth="1.7" />
      <path d="M8 17V7.8h1.7l5.1 6.4V7.8H17V17h-1.7l-5.1-6.4V17H8Z" fill="#111" />
    </svg>
  )
}

function TodoistLogo({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <rect width="24" height="24" rx="3" fill="#fff" />
      <path
        fill="#e44232"
        d="M21 0H3C1.35 0 0 1.35 0 3v3.858s3.854 2.24 4.098 2.38c.31.18.694.177 1.004 0 .26-.147 8.02-4.608 8.136-4.675.279-.161.58-.107.748-.01.164.097.606.348.84.48.232.134.221.502.013.622l-9.712 5.59c-.346.2-.69.204-1.048.002C3.478 10.907.998 9.463 0 8.882v2.02l4.098 2.38c.31.18.694.177 1.004 0 .26-.147 8.02-4.609 8.136-4.676.279-.16.58-.106.748-.008.164.096.606.347.84.48.232.133.221.5.013.62-.208.121-9.288 5.346-9.712 5.59-.346.2-.69.205-1.048.002C3.478 14.951.998 13.506 0 12.926v2.02l4.098 2.38c.31.18.694.177 1.004 0 .26-.147 8.02-4.609 8.136-4.676.279-.16.58-.106.748-.009.164.097.606.348.84.48.232.133.221.502.013.622l-9.712 5.59c-.346.199-.69.204-1.048.001C3.478 18.994.998 17.55 0 16.97V21c0 1.65 1.35 3 3 3h18c1.65 0 3-1.35 3-3V3c0-1.65-1.35-3-3-3z"
      />
    </svg>
  )
}

function SlackLogo({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {/* Yellow arm — left horizontal */}
      <rect x="3" y="10" width="8" height="4" rx="2" fill="#ECB22E"/>
      <circle cx="5" cy="12" r="2" fill="#ECB22E"/>
      {/* Red arm — top vertical */}
      <rect x="10" y="3" width="4" height="8" rx="2" fill="#E01E5A"/>
      <circle cx="12" cy="5" r="2" fill="#E01E5A"/>
      {/* Blue arm — right horizontal */}
      <rect x="13" y="10" width="8" height="4" rx="2" fill="#36C5F0"/>
      <circle cx="19" cy="12" r="2" fill="#36C5F0"/>
      {/* Green arm — bottom vertical */}
      <rect x="10" y="13" width="4" height="8" rx="2" fill="#2EB67D"/>
      <circle cx="12" cy="19" r="2" fill="#2EB67D"/>
    </svg>
  )
}

function DiscordLogo({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        fill="#5865F2"
        d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3a.07.07 0 0 0-.08.04c-.21.37-.44.86-.6 1.24a18.3 18.3 0 0 0-5.47 0A12.6 12.6 0 0 0 8.67 3a.08.08 0 0 0-.08.04A19.7 19.7 0 0 0 3.7 4.4a.07.07 0 0 0-.03.03C.53 9.05-.32 13.58.1 18.06a.08.08 0 0 0 .03.05 19.9 19.9 0 0 0 5 2.24.08.08 0 0 0 .08-.03c.46-.63.87-1.3 1.22-2a.08.08 0 0 0-.04-.1 13.1 13.1 0 0 1-1.87-.9.08.08 0 0 1-.01-.13c.13-.1.25-.2.37-.29a.07.07 0 0 1 .08-.01c3.93 1.79 8.18 1.79 12.06 0a.07.07 0 0 1 .08.01c.12.1.24.2.37.29a.08.08 0 0 1-.01.12 12.3 12.3 0 0 1-1.87.9.08.08 0 0 0-.04.11c.36.7.77 1.36 1.23 2a.08.08 0 0 0 .08.02 19.8 19.8 0 0 0 5.01-2.24.08.08 0 0 0 .03-.05c.5-5.18-.84-9.67-3.55-13.66a.06.06 0 0 0-.03-.03ZM8.02 15.33c-1.18 0-2.16-1.08-2.16-2.42s.96-2.42 2.16-2.42c1.21 0 2.18 1.1 2.16 2.42 0 1.34-.96 2.42-2.16 2.42Zm7.96 0c-1.18 0-2.16-1.08-2.16-2.42s.95-2.42 2.16-2.42c1.21 0 2.17 1.1 2.16 2.42 0 1.34-.95 2.42-2.16 2.42Z"
      />
    </svg>
  )
}
