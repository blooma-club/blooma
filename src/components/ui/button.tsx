'use client'
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // 모든 버튼에 공통으로 적용될 기본 스타일
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none",
  {
    variants: {
      variant: {
        // "눌리는" 효과가 있는 기본 버튼
        default:
          "bg-white text-black border border-black font-semibold shadow-neo hover:translate-x-1 hover:translate-y-1 hover:shadow-none ",
        
        // ✨ 새로 추가된 "리버스" 버튼
        reverse:
          "bg-white text-black border border-black font-semibold hover:shadow-neo hover:-translate-x-1 hover:-translate-y-1",

        // 기존 primary 스타일 (네오-브루탈리즘 적용)
        primary:
          "bg-white text-black border border-black font-semibold hover:bg-blue-600 hover:text-white",
        
        // 그림자 없는 기본 스타일
        ghost: "hover:bg-black/10",
        
        // 링크 스타일
        link: "text-primary underline-offset-4 hover:underline",
        // group hover 시 버튼이 나타나는 효과
        fadein: "opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200",
        // group hover 시 버튼 스타일이 나타나는 효과 (텍스트는 항상 보임)
        fadeinoutline:
          "bg-transparent border border-transparent shadow-none text-black font-semibold transition-all duration-200 hover:bg-white hover:border-black hover:shadow-neo hover:-translate-x-1 hover:-translate-y-1",
      },
      size: {
        default: "h-10 px-6 py-2",
        sm: "h-9 rounded-md px-4",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };