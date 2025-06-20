import React from "react"
import Image from "next/image"
import { ExtendedMessage } from "../types"

interface ChatHeaderProps {
  message: ExtendedMessage
  personaData: any
}

export function ChatHeader({ message, personaData }: ChatHeaderProps) {
  if (message.role !== "assistant") return null
  
  const respondingPersona = message.respondingPersona
  const displayPersona = respondingPersona || {
    name: personaData.persona_title || personaData.name,
    image: personaData.image || personaData.avatar
  }
  
  return (
    <>
      <div className="h-9 w-9 rounded-full flex-shrink-0 border border-zinc-200 dark:border-zinc-700 overflow-hidden relative">
        {displayPersona.image ? (
          <Image
            src={displayPersona.image}
            alt={displayPersona.name}
            width={36}
            height={36}
            className="object-cover w-full h-full"
            unoptimized={displayPersona.image.includes('supabase.co')}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
            {displayPersona.name.substring(0, 2)}
          </div>
        )}
      </div>
    </>
  )
}