"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "./scroll-area"

interface ComboboxProps {
    options: { value: string; label: string }[];
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    searchPlaceholder: string;
    emptyPlaceholder: string;
    disabled?: boolean;
}

export function Combobox({ 
    options, 
    value, 
    onChange,
    placeholder,
    searchPlaceholder,
    emptyPlaceholder,
    disabled = false
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [commandValue, setCommandValue] = React.useState('');

  // Trim and compare values in a case-insensitive manner
  const selectedOption = options.find(
    (option) => option.value.trim().toLowerCase() === value.trim().toLowerCase()
  );

  const handleSelect = (currentValue: string) => {
    const trimmedValue = currentValue.trim();
    // Case-insensitive comparison for unselecting
    onChange(trimmedValue.toLowerCase() === value.trim().toLowerCase() ? "" : trimmedValue)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          <span className="truncate">
            {selectedOption ? selectedOption.label.trim() : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command value={commandValue} onValueChange={setCommandValue}>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyPlaceholder}</CommandEmpty>
            <ScrollArea className="h-72">
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value.trim()}
                  onSelect={handleSelect}
                  className="truncate"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedOption && selectedOption.value.trim().toLowerCase() === option.value.trim().toLowerCase()
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  <span className="truncate">{option.label.trim()}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            </ScrollArea>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
} 