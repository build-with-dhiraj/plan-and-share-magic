import { Calendar } from "@/components/ui/calendar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

  // Desktop: use a Dialog (no trigger needed — parent controls open state)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-fit p-4">
        <DialogHeader>
          <DialogTitle className="text-base">Jump to Date</DialogTitle>
        </DialogHeader>
        <div className="flex justify-center">{calendarContent}</div>
      </DialogContent>
    </Dialog>
  );
}
