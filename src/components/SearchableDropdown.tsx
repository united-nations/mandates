"use client";

import { useState, useEffect, useRef } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

import { explainerTexts } from "@/lib/explainer-texts";

export interface SearchableDropdownOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface SearchableDropdownProps {
  options: SearchableDropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyPlaceholder?: string;
  className?: string;
}

export function SearchableDropdown({
  options,
  value,
  onChange,
  placeholder = explainerTexts.ui.select.default,
  searchPlaceholder = explainerTexts.ui.select.search,
  emptyPlaceholder = explainerTexts.ui.select.empty,
  className,
}: SearchableDropdownProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const filteredOptions = options.filter(
    (option) =>
      option.value === "---divider---" || // Always include dividers
      (option.label &&
        option.label.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (option.description &&
        option.description.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  useEffect(() => {
    if (open) {
      setHighlightedIndex(-1);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    } else {
      setSearchTerm("");
    }
  }, [open]);

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [searchTerm]);

  useEffect(() => {
    if (highlightedIndex >= 0 && optionRefs.current[highlightedIndex]) {
      optionRefs.current[highlightedIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [highlightedIndex]);

  const handleSelect = (
    selectedValue: string,
    option?: SearchableDropdownOption,
  ) => {
    // Prevent selecting disabled options
    if (option && option.disabled) {
      return;
    }
    onChange(selectedValue);
    setOpen(false);
  };

  const handleClear = () => {
    onChange("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => {
          let next = prev < filteredOptions.length - 1 ? prev + 1 : 0;
          // Skip dividers and disabled options
          while (
            next < filteredOptions.length &&
            (filteredOptions[next]?.value === "---divider---" ||
              filteredOptions[next]?.disabled)
          ) {
            next = next < filteredOptions.length - 1 ? next + 1 : 0;
            if (next === prev) break; // Prevent infinite loop
          }
          return next;
        });
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => {
          let next = prev > 0 ? prev - 1 : filteredOptions.length - 1;
          // Skip dividers and disabled options
          while (
            next >= 0 &&
            (filteredOptions[next]?.value === "---divider---" ||
              filteredOptions[next]?.disabled)
          ) {
            next = next > 0 ? next - 1 : filteredOptions.length - 1;
            if (next === prev) break; // Prevent infinite loop
          }
          return next;
        });
        break;
      case "Enter":
        e.preventDefault();
        if (
          highlightedIndex >= 0 &&
          filteredOptions[highlightedIndex] &&
          !filteredOptions[highlightedIndex].disabled
        ) {
          handleSelect(
            filteredOptions[highlightedIndex].value,
            filteredOptions[highlightedIndex],
          );
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
    }
  };

  const selectedOption = options.find((option) => option.value === value);
  const displayValue = selectedOption ? selectedOption.label : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between bg-white",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">{displayValue}</span>
          <div className="flex items-center">
            {value && (
              <div
                role="button"
                tabIndex={0}
                className="p-1 rounded-sm hover:bg-muted transition-colors cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleClear();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    handleClear();
                  }
                }}
              >
                <X className="h-3 w-3 opacity-50 hover:opacity-100" />
              </div>
            )}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-(--radix-popover-trigger-width) p-0 z-50 overflow-hidden rounded-md border bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
        side="bottom"
        align="start"
        sideOffset={4}
        avoidCollisions={false}
        sticky="always"
      >
        <div className="flex flex-col">
          <div className="p-2 border-b">
            <Input
              ref={inputRef}
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-9"
            />
          </div>
          <ScrollArea className="max-h-80 overflow-y-auto">
            <div className="p-1">
              {filteredOptions.length === 0 ? (
                <div className="py-2 px-4 text-center text-sm text-muted-foreground">
                  {emptyPlaceholder}
                </div>
              ) : (
                filteredOptions.map((option, index) => {
                  // Handle very light divider
                  if (option.value === "---divider---") {
                    return (
                      <div
                        key={option.value}
                        className="mx-2 my-1.5 border-b border-border/30"
                      />
                    );
                  }

                  return (
                    <Button
                      key={option.value}
                      ref={(el) => {
                        if (el) optionRefs.current[index] = el;
                      }}
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "w-full justify-between font-normal h-auto py-2",
                        highlightedIndex === index &&
                          "bg-un-blue/10! text-un-blue!",
                        option.disabled && "opacity-50 cursor-not-allowed",
                      )}
                      onClick={() => handleSelect(option.value, option)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      disabled={option.disabled}
                    >
                      <div className="flex flex-col items-start text-left flex-1 min-w-0">
                        <span className="font-medium whitespace-normal text-left">
                          {option.label}
                        </span>
                        {option.description && (
                          <span className="text-xs text-muted-foreground text-left whitespace-normal">
                            {option.description}
                          </span>
                        )}
                      </div>
                      {value === option.value && (
                        <Check className="h-4 w-4 shrink-0" />
                      )}
                    </Button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}
