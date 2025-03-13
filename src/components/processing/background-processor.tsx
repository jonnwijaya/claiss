import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { processLectureRecording } from '@/lib/ai-services'

interface ProcessingStatus {
  lectureId: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  error?: string
}

export function BackgroundProcessor() {
  const [processingQueue, setProcessingQueue] = useState<ProcessingStatus[]>([])

  useEffect(() => {
    const fetchPendingLectures = async () => {
      try {
        const { data: lectures, error } = await supabase
          .from('lectures')
          .select(`
            id,
            file_path,
            transcriptions (id)
          `)
          .is('transcriptions.id', null)

        if (error) {
          console.error('Error fetching pending lectures:', error)
          return
        }

        // Add pending lectures to queue
        const newQueue = lectures.map(lecture => ({
          lectureId: lecture.id,
          status: 'pending' as const,
        }))

        setProcessingQueue(prev => [...prev, ...newQueue])
      } catch (error) {
        if (error instanceof Error) {
          console.error('Error in fetchPendingLectures:', error.message)
        } else {
          console.error('Unknown error in fetchPendingLectures:', error)
        }
      }
    }

    // Set up real-time subscription for new lectures
    const lecturesSubscription = supabase
      .channel('lectures-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'lectures',
        },
        (payload) => {
          setProcessingQueue(prev => [
            ...prev,
            {
              lectureId: payload.new.id,
              status: 'pending',
            },
          ])
        }
      )
      .subscribe()

    // Initial fetch
    fetchPendingLectures()

    return () => {
      lecturesSubscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const processNextInQueue = async () => {
      const pendingItem = processingQueue.find(item => item.status === 'pending')
      
      if (!pendingItem) return

      try {
        // Update status to processing
        setProcessingQueue(prev =>
          prev.map(item =>
            item.lectureId === pendingItem.lectureId
              ? { ...item, status: 'processing' }
              : item
          )
        )

        // Get lecture details
        const { data: lecture, error: lectureError } = await supabase
          .from('lectures')
          .select('file_path')
          .eq('id', pendingItem.lectureId)
          .single()

        if (lectureError) throw lectureError
        if (!lecture?.file_path) throw new Error('No file path found for lecture')

        // Process the lecture
        await processLectureRecording(pendingItem.lectureId, lecture.file_path)

        // Update status to completed
        setProcessingQueue(prev =>
          prev.map(item =>
            item.lectureId === pendingItem.lectureId
              ? { ...item, status: 'completed' }
              : item
          )
        )

        // Update processing status in database
        await supabase
          .from('processing_status')
          .upsert({
            lecture_id: pendingItem.lectureId,
            status: 'completed'
          })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
        console.error('Error processing lecture:', errorMessage)
        
        // Update status to error
        setProcessingQueue(prev =>
          prev.map(item =>
            item.lectureId === pendingItem.lectureId
              ? { ...item, status: 'error', error: errorMessage }
              : item
          )
        )

        // Update processing status in database
        await supabase
          .from('processing_status')
          .upsert({
            lecture_id: pendingItem.lectureId,
            status: 'error',
            error_message: errorMessage
          })
      }
    }

    // Process items in queue
    if (processingQueue.some(item => item.status === 'pending')) {
      processNextInQueue()
    }
  }, [processingQueue])

  return null // This is a background component, no UI needed
}
