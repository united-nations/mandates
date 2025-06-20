'use client';

import { useState, useEffect, useRef } from 'react';
import { Check, ChevronDown, X, CheckSquare, Square, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

import { explainerTexts } from '@/lib/explainer-texts';

export interface SearchableDropdownOption {
  value: string;
  label: string;
  description?: string;
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

interface MultiSelectSearchableDropdownProps {
  options: SearchableDropdownOption[];
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyPlaceholder?: string;
  className?: string;
  maxDisplayItems?: number;
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
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const filteredOptions = options.filter(
    (option) =>
      (option.label && option.label.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (option.description && option.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  useEffect(() => {
    if (open) {
      setHighlightedIndex(-1);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    } else {
        setSearchTerm('');
    }
  }, [open]);

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [searchTerm]);

  useEffect(() => {
    if (highlightedIndex >= 0 && optionRefs.current[highlightedIndex]) {
      optionRefs.current[highlightedIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [highlightedIndex]);

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setOpen(false);
  };

  const handleClear = () => {
    onChange('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex].value);
        }
        break;
      case 'Escape':
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
          className={cn("w-full justify-between", !value && "text-muted-foreground", className)}
        >
          <span className="truncate">{displayValue}</span>
          <div className="flex items-center">
             {value && (
              <X
                className="h-4 w-4 shrink-0 opacity-50 hover:opacity-100 mr-2"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleClear();
                }}
              />
            )}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[--radix-popover-trigger-width] p-0 z-50 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2" 
        align="start"
        sideOffset={4}
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
          <ScrollArea className="max-h-60 overflow-y-auto">
            <div className="p-1">
              {filteredOptions.length === 0 ? (
                <div className="py-2 px-4 text-center text-sm text-muted-foreground">
                  {emptyPlaceholder}
                </div>
              ) : (
                filteredOptions.map((option, index) => (
                  <Button
                    key={option.value}
                    ref={(el) => {
                      if (el) optionRefs.current[index] = el;
                    }}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "w-full justify-between font-normal h-auto py-2",
                      highlightedIndex === index && "bg-accent text-accent-foreground"
                    )}
                    onClick={() => handleSelect(option.value)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    <div className="flex flex-col items-start text-left flex-1 min-w-0">
                      <span className="font-medium whitespace-normal text-left">{option.label}</span>
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
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function MultiSelectSearchableDropdown({
  options,
  values,
  onChange,
  placeholder = explainerTexts.ui.select.default,
  searchPlaceholder = explainerTexts.ui.select.search,
  emptyPlaceholder = explainerTexts.ui.select.empty,
  className,
  maxDisplayItems = 2,
}: MultiSelectSearchableDropdownProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const filteredOptions = options.filter(
    (option) =>
      (option.label && option.label.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (option.description && option.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Sort options to show selected items first
  const sortedOptions = [...filteredOptions].sort((a, b) => {
    const aSelected = values.includes(a.value);
    const bSelected = values.includes(b.value);
    if (aSelected && !bSelected) return -1;
    if (!aSelected && bSelected) return 1;
    return 0;
  });

  useEffect(() => {
    if (open) {
      setHighlightedIndex(-1);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    } else {
      setSearchTerm('');
    }
  }, [open]);

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [searchTerm]);

  useEffect(() => {
    if (highlightedIndex >= 0 && optionRefs.current[highlightedIndex]) {
      optionRefs.current[highlightedIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [highlightedIndex]);

  const handleSelect = (selectedValue: string) => {
    if (values.includes(selectedValue)) {
      onChange(values.filter(v => v !== selectedValue));
    } else {
      onChange([...values, selectedValue]);
    }
  };

  const handleSelectAll = () => {
    if (values.length === options.length) {
      onChange([]);
    } else {
      onChange(options.map(option => option.value));
    }
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const handleRemoveItem = (valueToRemove: string) => {
    onChange(values.filter(v => v !== valueToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < sortedOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : sortedOptions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && sortedOptions[highlightedIndex]) {
          handleSelect(sortedOptions[highlightedIndex].value);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        break;
    }
  };

  const getDisplayText = () => {
    if (values.length === 0) {
      return placeholder;
    }
    if (values.length === 1) {
      const selectedOption = options.find(option => option.value === values[0]);
      return selectedOption?.label || values[0];
    }
    return `${values.length} selected`;
  };

  const selectedOptions = values.map(value => 
    options.find(option => option.value === value)
  ).filter(Boolean) as SearchableDropdownOption[];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between",
            values.length === 0 && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">{getDisplayText()}</span>
          <div className="flex items-center">
            {values.length > 0 && (
              <Badge variant="secondary" className="ml-2 mr-2">
                {values.length}
              </Badge>
            )}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[--radix-popover-trigger-width] p-0 z-50 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2" 
        align="start"
        sideOffset={4}
      >
        <div className="flex flex-col">
          {/* Search input */}
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

          {/* Bulk actions */}
          <div className="p-2 border-b bg-muted/10">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8 px-2 text-xs"
              onClick={handleSelectAll}
            >
              {values.length === options.length ? (
                <>
                  <CheckSquare className="h-3 w-3 mr-2" />
                  Deselect All
                </>
              ) : (
                <>
                  <Square className="h-3 w-3 mr-2" />
                  Select All
                </>
              )}
            </Button>
          </div>

          {/* Options list */}
          <ScrollArea className="max-h-60 overflow-y-auto">
            <div className="p-1">
              {sortedOptions.length === 0 ? (
                <div className="py-2 px-4 text-center text-sm text-muted-foreground">
                  {emptyPlaceholder}
                </div>
              ) : (
                sortedOptions.map((option, index) => {
                  const isSelected = values.includes(option.value);
                  return (
                    <Button
                      key={option.value}
                      ref={(el) => {
                        if (el) optionRefs.current[index] = el;
                      }}
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "w-full justify-start font-normal h-auto py-2 px-2",
                        highlightedIndex === index && "bg-accent text-accent-foreground",
                        isSelected && "bg-primary/10"
                      )}
                      onClick={() => handleSelect(option.value)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                    >
                      <div className="flex items-center mr-2">
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4 text-primary" />
                        ) : (
                          <Square className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
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