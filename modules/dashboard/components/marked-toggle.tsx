"use client"

import { Button } from "@/components/ui/button"
import { StarIcon, StarOffIcon } from "lucide-react"
import React from "react"
import { useState, useEffect, forwardRef } from "react"
import { toast } from "sonner"
import { toggleStarMarked } from "../actions"
import type { ComponentProps } from "react"
import type { ComponentPropsWithoutRef } from "react"
// Derive the exact onClick type from Button's props
type ButtonClickEvent = Parameters<
  NonNullable<ComponentProps<typeof Button>["onClick"]>
>[0]

interface MarkedToggleButtonProps extends ComponentPropsWithoutRef<typeof Button> {
  markedForRevision: boolean
  id: string
}
export const MarkedToggleButton = forwardRef<HTMLButtonElement, MarkedToggleButtonProps>(
  ({ markedForRevision, id, onClick, className, children, ...props }, ref) => {
    const [isMarked, setIsMarked] = useState(markedForRevision)

    useEffect(() => {
      setIsMarked(markedForRevision)
    }, [markedForRevision])

    const handleToggle = async (event: ButtonClickEvent) => {
      onClick?.(event)

      const newMarkedState = !isMarked
      setIsMarked(newMarkedState)

      try {
        const res = await toggleStarMarked(id, newMarkedState)
        const { success, error, isMarked: serverMarked } = res

        if (serverMarked && !error && success) {
          toast.success("Added to Favorites successfully")
        } else {
          toast.success("Removed from Favorites successfully")
        }
      } catch (err) {
        console.error("Failed to toggle mark for revision:", err)
        setIsMarked(!newMarkedState)
      }
    }

    return (
      <Button
        ref={ref}
        variant="ghost"
        className={`flex items-center justify-start w-full px-2 py-1.5 text-sm rounded-md cursor-pointer ${className}`}
        onClick={handleToggle}
        {...props}
      >
        {isMarked ? (
          <StarIcon size={16} className="text-red-500 mr-2" />
        ) : (
          <StarOffIcon size={16} className="text-gray-500 mr-2" />
        )}
        {children || (isMarked ? "Remove Favorite" : "Add to Favorite")}
      </Button>
    )
  },
)

MarkedToggleButton.displayName = "MarkedToggleButton"