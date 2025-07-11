import { FileQuestion } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'

interface ProjectIconProps {
  icon?: string
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = {
  sm: { emoji: 'text-base', image: 16, fallback: 16 },
  md: { emoji: 'text-lg', image: 20, fallback: 20 },
  lg: { emoji: 'text-2xl', image: 24, fallback: 24 },
}

export function ProjectIcon({ icon, name, size = 'md', className = '' }: ProjectIconProps) {
  const [imageError, setImageError] = useState(false)
  const sizes = sizeMap[size]

  // No icon provided
  if (!icon) {
    return <FileQuestion className={`text-stone-400 ${className}`} size={sizes.fallback} />
  }

  // Check if it's a URL (starts with http:// or https:// or /)
  const isUrl = icon.startsWith('http://') || icon.startsWith('https://') || icon.startsWith('/')

  // Handle image URLs
  if (isUrl && !imageError) {
    return (
      <div className={`relative inline-flex items-center justify-center ${className}`}>
        <Image
          src={icon}
          alt={`${name} icon`}
          width={sizes.image}
          height={sizes.image}
          className="rounded"
          onError={() => setImageError(true)}
        />
      </div>
    )
  }

  // Handle emojis or text icons
  // Simple emoji detection - if it's 1-2 chars and not alphanumeric, assume emoji
  const isEmoji = icon.length <= 2 && !/^[a-zA-Z0-9]+$/.test(icon)

  if (isEmoji) {
    return <span className={`${sizes.emoji} ${className}`}>{icon}</span>
  }

  // Fallback for text that's not an emoji (e.g., "DK" for devkit)
  return (
    <div
      className={`inline-flex items-center justify-center rounded bg-stone-200 text-stone-600 font-medium ${className}`}
      style={{
        width: sizes.image,
        height: sizes.image,
        fontSize: sizes.image * 0.5,
      }}
    >
      {icon.slice(0, 2).toUpperCase()}
    </div>
  )
}
