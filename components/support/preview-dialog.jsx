"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"
import { DialogClose } from "@radix-ui/react-dialog"
import { useState, useEffect } from "react"

const getMediaDimensions = (url) => {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => {
      resolve({ width: 16, height: 9 })
    }
    img.src = url
  })
}

const calculateDialogSize = (mediaWidth, mediaHeight) => {
  const aspectRatio = mediaWidth / mediaHeight
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const headerHeight = 62
  const dialogPadding = 16
  const contentGap = 0
  const mediaBorder = 4
  const reservedHeight = headerHeight + dialogPadding + contentGap + mediaBorder
  const availableWidth = viewportWidth * 0.9 - 16 - mediaBorder
  const availableHeight = viewportHeight * 0.9 - reservedHeight
  
  let mediaWidth_calc, mediaHeight_calc, dialogWidth, dialogHeight

  if (aspectRatio > 1.5) {
    mediaWidth_calc = Math.min(availableWidth, availableHeight * aspectRatio)
    mediaHeight_calc = mediaWidth_calc / aspectRatio
  } else {
    mediaHeight_calc = Math.min(availableHeight, availableWidth / aspectRatio)
    mediaWidth_calc = mediaHeight_calc * aspectRatio
  }

  dialogWidth = mediaWidth_calc + 16 + mediaBorder
  dialogHeight = mediaHeight_calc + reservedHeight

  dialogWidth = Math.max(dialogWidth, 320)
  dialogHeight = Math.max(dialogHeight, 240)

  return { 
    width: Math.ceil(dialogWidth), 
    height: Math.ceil(dialogHeight),
    mediaWidth: Math.floor(mediaWidth_calc),
    mediaHeight: Math.floor(mediaHeight_calc)
  }
}

export function PreviewDialog({ isOpen, onOpenChange, url, desc }) {
  const [dimensions, setDimensions] = useState({ 
    width: 1080, 
    height: 720, 
    mediaWidth: 1064, 
    mediaHeight: 672 
  })

  useEffect(() => {
    if (!url || !isOpen) return

    getMediaDimensions(url).then((mediaDimensions) => {
      const dialogSize = calculateDialogSize(mediaDimensions.width, mediaDimensions.height)
      setDimensions(dialogSize)
    })
  }, [url, isOpen])

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent 
        className="p-2 overflow-hidden gap-1" 
        showCloseButton={false}
        style={{
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
          maxWidth: '95vw',
          maxHeight: '95vh'
        }}
      >
        <DialogHeader className="p-2 gap-0">
          <div className="w-full flex justify-between items-center gap-2">
            <DialogTitle>Screenshot</DialogTitle>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="size-6 shrink-0">
                <XIcon />
              </Button>
            </DialogClose>
          </div>
          <DialogDescription>{"#" + desc.replace(/ /g, "-").toLowerCase()}</DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-center flex-1 min-h-0">
          <img
            src={url}
            alt="Screenshot"
            style={{
              width: `${dimensions.mediaWidth}px`,
              height: `${dimensions.mediaHeight - 1}px`
            }}
            className="object-contain border rounded-md"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}