'use client'

import { Check, Info, Minus } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

type ComparisionPlan = {
  name: string
  price: string
  popular?: boolean
}

const PLANS: ComparisionPlan[] = [
  { name: 'Small Brands', price: '$49' },
  { name: 'Agency', price: '$99', popular: true },
  { name: 'Studio', price: '$189' },
]

type ComparisonRow = {
  feature: string
  description?: string
  smallBrands: string | boolean
  agency: string | boolean
  studio: string | boolean
}

const COMPARISON_DATA: ComparisonRow[] = [
  {
    feature: 'Monthly Credits',
    description: 'Credits renew every month and do not roll over.',
    smallBrands: '3,000',
    agency: '7,000',
    studio: '14,000',
  },
  {
    feature: 'Est. Standard Images',
    description: 'Standard model images (15 credits each).',
    smallBrands: '~200',
    agency: '~466',
    studio: '~933',
  },
  {
    feature: 'Est. Pro Images',
    description: 'Pro model images (50 credits each).',
    smallBrands: '~60',
    agency: '~140',
    studio: '~280',
  },
  {
    feature: 'Standard Models',
    smallBrands: true,
    agency: true,
    studio: true,
  },
  {
    feature: 'Pro Models',
    description: 'Access to advanced, photorealistic models.',
    smallBrands: true,
    agency: true,
    studio: true,
  },
  {
    feature: '4K Resolution',
    description: 'Generate ultra-high definition images suitable for large prints.',
    smallBrands: false,
    agency: true,
    studio: true,
  },
  {
    feature: 'Model Library',
    description: 'Save your own model references for consistent characters.',
    smallBrands: '10 models',
    agency: '50 models',
    studio: 'Unlimited',
  },
  {
    feature: 'Commercial License',
    description: 'Full ownership and commercial rights to generated images.',
    smallBrands: true,
    agency: true,
    studio: true,
  },
]

export default function ComparePlans() {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h2 className="text-2xl font-semibold tracking-tight mb-3">Compare Plans</h2>
        <p className="text-muted-foreground">Find the right fit for your creative workflow.</p>
      </div>

      <div className="rounded-2xl border border-border/40 bg-card/50 overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border/40">
              <TableHead className="w-[30%] px-6 py-4">Feature</TableHead>
              {PLANS.map(plan => (
                <TableHead key={plan.name} className="w-[23%] text-center px-4 py-4">
                  <div className="flex flex-col items-center gap-1">
                    <span
                      className={`font-medium ${plan.popular ? 'text-primary' : 'text-foreground'}`}
                    >
                      {plan.name}
                    </span>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {COMPARISON_DATA.map((row, i) => (
              <TableRow key={i} className="hover:bg-muted/30 border-border/40">
                <TableCell className="px-6 py-4 align-top">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-sm">{row.feature}</span>
                    {row.description && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="w-3.5 h-3.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs text-xs">
                            {row.description}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center align-middle">
                  {renderCell(row.smallBrands)}
                </TableCell>
                <TableCell className="text-center align-middle bg-muted/50 font-medium">
                  {renderCell(row.agency)}
                </TableCell>
                <TableCell className="text-center align-middle">{renderCell(row.studio)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function renderCell(value: string | boolean) {
  if (value === true) {
    return <Check className="w-5 h-5 text-primary mx-auto" />
  }
  if (value === false) {
    return <Minus className="w-4 h-4 text-muted-foreground/30 mx-auto" />
  }
  return <span className="text-sm text-foreground/80">{value}</span>
}
