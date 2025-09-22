import React from 'react'
import { Eye } from 'lucide-react'

interface DiffItem {
  left: string | null
  left_best: string | null
  left_highlighted: string
  right: string | null
  right_best: string | null
  right_highlighted: string
  score: number
}

interface DiffData {
  score: number
  diff: DiffItem[]
}

function parseText(text: string) {
  if (!text) return null
  
  const parts = []
  let remaining = text
  let key = 0
  
  while (remaining) {
    // Find strikethrough
    const strikeMatch = remaining.match(/~~([^~]+)~~/)
    // Find highlight
    const highlightMatch = remaining.match(/\*\*([^*]+)\*\*/)
    
    const strikeIndex = strikeMatch ? remaining.indexOf(strikeMatch[0]) : -1
    const highlightIndex = highlightMatch ? remaining.indexOf(highlightMatch[0]) : -1
    
    if (strikeIndex === -1 && highlightIndex === -1) {
      // No more matches, add remaining text
      parts.push(<span key={key}>{remaining}</span>)
      break
    }
    
    const nextMatch = (strikeIndex !== -1 && highlightIndex !== -1) 
      ? (strikeIndex < highlightIndex ? 'strike' : 'highlight')
      : (strikeIndex !== -1 ? 'strike' : 'highlight')
    
    const matchIndex = nextMatch === 'strike' ? strikeIndex : highlightIndex
    const match = nextMatch === 'strike' ? strikeMatch : highlightMatch
    
    // Add text before match
    if (matchIndex > 0) {
      parts.push(<span key={key++}>{remaining.substring(0, matchIndex)}</span>)
    }
    
    // Add styled match
    if (nextMatch === 'strike' && match) {
      parts.push(<span key={key++} style={{backgroundColor: 'color-mix(in srgb, red, transparent 70%)'}}>{match[1]}</span>)
    } else if (match) {
      parts.push(<span key={key++} style={{backgroundColor: 'color-mix(in srgb, lightgreen, transparent 70%)'}}>{match[1]}</span>)
    }
    
    // Continue with remaining text
    remaining = remaining.substring(matchIndex + (match?.[0]?.length || 0))
  }
  
  return parts
}

function ButtonPart ({ text, position, focus, setFocus }: {
  text: string
  position: string | null
  focus: string | null
  setFocus: (position: string | null) => void
}) {
  const getRoundedClasses = () => {
    if (position === 'left') return 'rounded-l-lg'
    if (position === 'right') return 'rounded-r-lg'
    return ''
  }
  
  return (
    <button
      className={`px-4 py-2 text-button transition-colors ${getRoundedClasses()} ${
        position === 'left' ? 'border-r border-border' : ''
      } ${
        position === 'right' ? 'border-l border-border' : ''
      } ${
        focus === position 
          ? 'bg-primary text-primary-foreground' 
          : 'hover:bg-muted text-primary'
      }`}
      onClick={() => setFocus(position)}
    >
      {text}
    </button>
  )
}

function Button ({ focus, setFocus }: {
  focus: string | null
  setFocus: (position: string | null) => void
}) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-card">
      <ButtonPart position='left' text='Focus Left' {...{ focus, setFocus }} />
      <ButtonPart position={null} text='Compare Both' {...{ focus, setFocus }} />
      <ButtonPart position='right' text='Focus Right' {...{ focus, setFocus }} />
    </div>
  )
}

function FocusToggle ({ position, focus, setFocus }: {
  position: 'left' | 'right'
  focus: string | null
  setFocus: (position: string | null) => void
}) {
  const isActive = focus === position
  const isFaded = focus !== null && focus !== position
  
  return (
    <button
      className={`p-0.5 rounded transition-all duration-200 ${
        isActive 
          ? 'text-un-blue bg-un-blue/10' 
          : isFaded
          ? 'text-gray-400 opacity-50'
          : 'text-gray-600 hover:text-un-blue hover:bg-gray-100'
      }`}
      onClick={(e) => {
        e.stopPropagation()
        setFocus(isActive ? null : position)
      }}
      title={isActive ? 'Show both columns' : `Focus on ${position} column`}
    >
      <Eye className="h-3 w-3" />
    </button>
  )
}

function Item ({ content, color, light }: {
  content: string
  color?: string
  light?: boolean
}) {
  const getColorClasses = () => {
    if (!color) return content ? 'bg-card' : ''
    switch (color) {
      case 'red': return 'bg-red-50'
      case 'lightgreen': return 'bg-green-50'
      case 'yellow': return 'bg-yellow-50'
      case 'blue': return 'bg-blue-50'
      default: return content ? 'bg-card' : ''
    }
  }
  
  return (
    <div className={`
      rounded-md p-3 text-left flex-1 text-body
      ${getColorClasses()}
      ${light ? 'opacity-30' : 'opacity-100'}
      transition-opacity min-h-[2.5rem] flex items-start
    `}>
      <div className="w-full">
        {parseText(content || '')}
      </div>
    </div>
  )
}

function Comparison ({ item, focus = 'right' }: {
  item: DiffItem
  focus?: string | null
}) {
  const isAdded = item.right && !item.left && !item.left_best
  const isRemoved = item.left && !item.right && !item.right_best
  if ((focus === 'left' && !item.left) || (focus === 'right' && !item.right))
    return <></>
  return (
    <div className="grid grid-cols-2 gap-4 w-full">
      {item.left ? (
        <Item
          content={isRemoved ? item.left : item.left_highlighted}
          color={
            isRemoved ? 'red' : 
            // isMoved ? 'yellow' : isAligned ? 'blue' : 
            undefined
          }
          light={focus === 'right'}
        />
      ) : (
        <Item content={item.left_highlighted} light />
      )}
      {item.right ? (
        <Item
          content={isAdded ? item.right : item.right_highlighted}
          color={
            isAdded
              ? 'lightgreen'
              // : isMoved
              // ? 'yellow'
              // : isAligned
              // ? 'blue'
              : undefined
          }
          light={focus === 'left'}
        />
      ) : (
        <Item content={item.right_highlighted} light />
      )}
    </div>
  )
}

export { Button, FocusToggle, Comparison, type DiffData }
