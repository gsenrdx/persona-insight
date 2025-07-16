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
      <div className="h-10 w-10 rounded-full flex-shrink-0 overflow-hidden">
        {displayPersona.image ? (
          <Image
            src={displayPersona.image}
            alt={displayPersona.name}
            width={40}
            height={40}
            className="object-cover w-full h-full"
            unoptimized={displayPersona.image.includes('supabase.co')}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sm bg-gray-100 text-gray-700">
            {displayPersona.name.substring(0, 2)}
          </div>
        )}
      </div>
    </>
  )
}