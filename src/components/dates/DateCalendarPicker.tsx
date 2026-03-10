import { Calendar } from "@/components/ui/calendar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";

interface DateCalendarPickerProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DateCalendarPicker({ selectedDate, onDateSelect, open, onOpenChange }: DateCalendarPickerProps) {
  const isMobile = useIsMobile();

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      onDateSelect(date);
      onOpenChange(false);
    }
  };

  const calendarContent = (
    <Calendar
      mode="single"
      selected={selectedDate}
      onSelect={handleSelect}
      disabled={{ after: new Date() }}
      defaultMonth={selectedDate}
      className="pointer-events-auto"
    />
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-8">
          <SheetHeader className="mb-2">
            <SheetTitle className="text-base">Jump to Date</SheetTitle>
          </SheetHeader>
          <div className="flex justify-center">{calendarContent}</div>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: use a controlled popover (no trigger, managed by parent)
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <span /> {/* Hidden trigger — parent controls open state */}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        {calendarContent}
      </PopoverContent>
    </Popover>
  );
}
