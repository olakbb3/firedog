import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { MovementService } from '@/services/movement.service';

export interface Movement {
  id: string;
  name: string;
  category: string | null;
  default_result_type:
    | 'weight'
    | 'time'
    | 'rounds_reps'
    | 'calories'
    | 'meters'
    | string;
}

interface Props {
  /** Selected movement (from list). */
  movement: Movement | null;
  /** Free-text custom name when no movement is picked. */
  customName: string;
  /** Fired when user picks a movement (clears customName). */
  onSelectMovement: (m: Movement) => void;
  /** Fired when user types a custom movement (clears movement). */
  onCustomNameChange: (name: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function MovementSelector({
  movement,
  customName,
  onSelectMovement,
  onCustomNameChange,
  placeholder = 'Select or type movement…',
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await MovementService.getAllMovements();
      if (cancelled) return;
      setMovements((data ?? []) as Movement[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const label = movement?.name || customName || '';

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return movements;
    return movements.filter((m) => m.name.toLowerCase().includes(q));
  }, [movements, search]);

  const exactMatch = useMemo(
    () =>
      movements.find(
        (m) => m.name.toLowerCase() === search.trim().toLowerCase(),
      ),
    [movements, search],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal',
            !label && 'text-muted-foreground',
          )}
        >
          <span className="truncate text-left">
            {label || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 w-[--radix-popover-trigger-width]"
        align="start"
      >
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput
              value={search}
              onValueChange={setSearch}
              placeholder="Search movements…"
              className="border-0"
            />
          </div>
          <CommandList>
            {loading && (
              <div className="py-6 text-center text-xs text-muted-foreground">
                Loading…
              </div>
            )}
            {!loading && (
              <>
                <CommandEmpty>
                  <div className="px-2 py-3 text-xs text-muted-foreground">
                    No matches.
                  </div>
                </CommandEmpty>
                {filtered.length > 0 && (
                  <CommandGroup heading="Movements">
                    {filtered.map((m) => {
                      const selected = movement?.id === m.id;
                      return (
                        <CommandItem
                          key={m.id}
                          value={m.id}
                          onSelect={() => {
                            onSelectMovement(m);
                            setOpen(false);
                            setSearch('');
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              selected ? 'opacity-100' : 'opacity-0',
                            )}
                          />
                          <div className="flex flex-col">
                            <span className="text-sm">{m.name}</span>
                            {m.category && (
                              <span className="text-[10px] text-muted-foreground">
                                {m.category}
                              </span>
                            )}
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                )}
                {search.trim() && !exactMatch && (
                  <CommandGroup heading="Custom">
                    <CommandItem
                      value={`__custom__${search}`}
                      onSelect={() => {
                        onCustomNameChange(search.trim());
                        setOpen(false);
                        setSearch('');
                      }}
                    >
                      <span className="text-sm">
                        Use “{search.trim()}”
                      </span>
                    </CommandItem>
                  </CommandGroup>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
