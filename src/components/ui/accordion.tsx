import * as React from "react"
import * as AccordionPrimitive from "@radix-ui/react-accordion"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"

const Accordion = AccordionPrimitive.Root

const AccordionItem = React.forwardRef<
    React.ElementRef<typeof AccordionPrimitive.Item>,
    React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
    <AccordionPrimitive.Item
        ref={ref}
        className={cn("border-b", className)}
        {...props}
    />
))
AccordionItem.displayName = "AccordionItem"

const AccordionTrigger = React.forwardRef<
    React.ElementRef<typeof AccordionPrimitive.Trigger>,
    React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
    <AccordionPrimitive.Header className="flex">
        <AccordionPrimitive.Trigger
            ref={ref}
            className={cn(
                "flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180",
                className
            )}
            {...props}
        >
            {children}
            <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
        </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
))
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName

const AccordionContent = React.forwardRef<
    React.ElementRef<typeof AccordionPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
    <AccordionPrimitive.Content
        ref={ref}
        className="overflow-hidden data-[state=open]:overflow-visible text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
        {...props}
    >
        <div className={cn("pb-4 pt-0", className)}>{children}</div>
    </AccordionPrimitive.Content>
))
AccordionContent.displayName = AccordionPrimitive.Content.displayName

interface AccordionTriggerWithToggleProps
    extends React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger> {
    checked?: boolean
    onCheckedChange?: (checked: boolean) => void
    toggleLabel?: string
}

const AccordionTriggerWithToggle = React.forwardRef<
    React.ElementRef<typeof AccordionPrimitive.Trigger>,
    AccordionTriggerWithToggleProps
>(({ className, children, checked, onCheckedChange, toggleLabel = "Auto", ...props }, ref) => (
    <AccordionPrimitive.Header className="flex">
        <AccordionPrimitive.Trigger
            ref={ref}
            className={cn(
                "flex flex-1 items-center justify-between py-4 font-medium transition-all hover:no-underline",
                className
            )}
            {...props}
        >
            {children}
            <div
                className="flex items-center gap-2"
                onClick={(e) => e.stopPropagation()}
            >
                {checked !== undefined && (
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                        {toggleLabel}
                    </span>
                )}
                {checked !== undefined && (
                    <Switch
                        checked={checked}
                        onCheckedChange={onCheckedChange}
                        className="h-4 w-7 data-[state=checked]:bg-foreground data-[state=unchecked]:bg-muted"
                    />
                )}
            </div>
        </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
))
AccordionTriggerWithToggle.displayName = "AccordionTriggerWithToggle"

export { Accordion, AccordionItem, AccordionTrigger, AccordionTriggerWithToggle, AccordionContent }

