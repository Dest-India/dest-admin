"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"
import { DialogClose } from "@radix-ui/react-dialog"
import { useState, useEffect } from "react"

const getYouTubeVideoId = (url) => {
  const regex = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/
  const match = url.match(regex)
  return match ? match[1] : null
}

const getMediaDimensions = (src, type) => {
  return new Promise((resolve) => {
    if (type === "video") {
      // Default to 16:9 for videos
      resolve({ width: 1920, height: 1080 })
      return
    }

    if (type === "image") {
      const img = new Image()
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight })
      }
      img.onerror = () => {
        resolve({ width: 16, height: 9 }) // Default fallback
      }
      img.src = src
    } else {
      resolve({ width: 16, height: 9 }) // Default fallback
    }
  })
}

const calculateDialogSize = (mediaWidth, mediaHeight) => {
  const aspectRatio = mediaWidth / mediaHeight
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const headerHeight = 48
  const dialogPadding = 16
  const contentGap = -8
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

export function PreviewDialog({ isOpen = true, data }) {
  const [dimensions, setDimensions] = useState({ 
    width: 1080, 
    height: 720, 
    mediaWidth: 1064, 
    mediaHeight: 672 
  })

  useEffect(() => {
    if (!data || !isOpen) return

    getMediaDimensions(data.src, data.type).then((mediaDimensions) => {
      const dialogSize = calculateDialogSize(mediaDimensions.width, mediaDimensions.height)
      setDimensions(dialogSize)
    })
  }, [data, isOpen])

  if (!data) return null

  return (
      <DialogContent 
        className="p-2 rounded-2xl -gap-2 overflow-hidden" 
        showCloseButton={false}
        style={{
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
          maxWidth: '95vw',
          maxHeight: '95vh'
        }}
      >
        <DialogHeader>
          <div className="w-full flex justify-between items-center gap-2 p-2 [&>h2]:w-full [&>h2]:text-ellipsis [&>h2]:line-clamp-1 [&>h2]:break-all">
            <DialogTitle>{data.title}</DialogTitle>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="size-6 shrink-0">
                <XIcon />
              </Button>
            </DialogClose>
          </div>
          <DialogDescription />
        </DialogHeader>
        <div className="flex items-center justify-center flex-1 min-h-0">
          {data.type === "video" ? (
            (() => {
              const videoId = getYouTubeVideoId(data.src)
              return videoId ? (
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                  title={data.title}
                  style={{
                    width: `${dimensions.mediaWidth - 3}px`,
                    height: `${dimensions.mediaHeight}px`
                  }}
                  className="border rounded-md"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture;"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              ) : (
                <div className="text-center p-8">Invalid video URL</div>
              )
            })()
          ) : data.type === "image" ? (
            <img
              src={data.src}
              alt={data.title}
              style={{
                width: `${dimensions.mediaWidth}px`,
                height: `${dimensions.mediaHeight - 1}px`
              }}
              className="object-contain border rounded-md"
            />
          ) : (
            <div className="text-center p-8">Preview not available</div>
          )}
        </div>
      </DialogContent>
  )
}