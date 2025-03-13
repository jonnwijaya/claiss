import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'

export function AudioRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } catch (error) {
      console.error('Error accessing microphone:', error)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }

  const uploadRecording = async () => {
    if (!audioBlob) return

    try {
      const fileName = `recording-${Date.now()}.webm`
      const { data, error } = await supabase.storage
        .from('lecture-recordings')
        .upload(fileName, audioBlob)

      if (error) throw error

      // Create lecture entry in database
      const { error: dbError } = await supabase
        .from('lectures')
        .insert({
          title: 'New Recording',
          duration: recordingTime,
          file_path: data.path
        })

      if (dbError) throw dbError

      // Reset state
      setAudioBlob(null)
      setRecordingTime(0)
    } catch (error) {
      console.error('Error uploading recording:', error)
    }
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center space-x-4">
        {!isRecording ? (
          <Button onClick={startRecording} variant="default">
            Start Recording
          </Button>
        ) : (
          <Button onClick={stopRecording} variant="destructive">
            Stop Recording
          </Button>
        )}
      </div>

      {isRecording && (
        <div className="text-center">
          <p className="text-lg font-mono">Recording: {formatTime(recordingTime)}</p>
        </div>
      )}

      {audioBlob && !isRecording && (
        <div className="space-y-2">
          <audio src={URL.createObjectURL(audioBlob)} controls className="w-full" />
          <Button onClick={uploadRecording} className="w-full">
            Upload Recording
          </Button>
        </div>
      )}
    </div>
  )
}
