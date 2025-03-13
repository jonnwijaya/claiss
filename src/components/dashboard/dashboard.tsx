import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { AudioRecorder } from '@/components/recording/audio-recorder'

type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'error'

interface Lecture {
  id: string
  title: string
  description: string | null
  duration: number
  created_at: string
  processing_status?: ProcessingStatus
  transcription?: {
    content: string
    summary?: {
      content: string
      key_points: string[]
    }
  }
}

const statusStyles: Record<ProcessingStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  error: 'bg-red-100 text-red-800'
}

export function Dashboard() {
  const [lectures, setLectures] = useState<Lecture[]>([])
  const [selectedLecture, setSelectedLecture] = useState<Lecture | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchLectures()
    subscribeToLectures()
  }, [])

  const subscribeToLectures = () => {
    const subscription = supabase
      .channel('lectures-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lectures',
        },
        () => {
          fetchLectures()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }

  const fetchLectures = async () => {
    try {
      const { data: lecturesData, error: lecturesError } = await supabase
        .from('lectures')
        .select(`
          *,
          transcriptions (
            content,
            summaries (
              content,
              key_points
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (lecturesError) throw lecturesError

      // Check processing status for each lecture
      const lecturesWithStatus = await Promise.all(
        (lecturesData || []).map(async (lecture) => {
          if (!lecture.transcriptions || lecture.transcriptions.length === 0) {
            const { data: processingData } = await supabase
              .from('processing_status')
              .select('status')
              .eq('lecture_id', lecture.id)
              .single()

            return {
              ...lecture,
              processing_status: processingData?.status || 'pending'
            }
          }
          return {
            ...lecture,
            processing_status: 'completed'
          }
        })
      )

      setLectures(lecturesWithStatus)
    } catch (error) {
      console.error('Error fetching lectures:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const filteredLectures = lectures.filter(lecture => {
    const searchLower = searchQuery.toLowerCase()
    return (
      lecture.title.toLowerCase().includes(searchLower) ||
      (lecture.description?.toLowerCase().includes(searchLower)) ||
      (lecture.transcription?.content.toLowerCase().includes(searchLower))
    )
  })

  const getStatusBadge = (status: ProcessingStatus) => {
    return `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status]}`
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Your Lectures</h1>
        <Button onClick={() => setSelectedLecture(null)}>New Recording</Button>
      </div>

      {!selectedLecture ? (
        <div className="space-y-6">
          <AudioRecorder />
          
          <div className="flex items-center space-x-4">
            <input
              type="text"
              placeholder="Search lectures..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 p-2 border rounded bg-background text-foreground"
            />
          </div>

          {isLoading ? (
            <div className="text-center">Loading your lectures...</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredLectures.map((lecture) => (
                <div
                  key={lecture.id}
                  className="border rounded-lg p-4 cursor-pointer hover:border-primary transition-colors"
                  onClick={() => setSelectedLecture(lecture)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold">{lecture.title}</h3>
                    <span className={getStatusBadge(lecture.processing_status || 'pending')}>
                      {lecture.processing_status || 'pending'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(lecture.created_at)}
                  </p>
                  <p className="text-sm">Duration: {formatDuration(lecture.duration)}</p>
                  {lecture.description && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {lecture.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <Button
            variant="outline"
            onClick={() => setSelectedLecture(null)}
          >
            Back to Lectures
          </Button>

          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-semibold">{selectedLecture.title}</h2>
                <p className="text-muted-foreground">
                  Recorded on {formatDate(selectedLecture.created_at)}
                </p>
              </div>
              <span className={getStatusBadge(selectedLecture.processing_status || 'pending')}>
                {selectedLecture.processing_status || 'pending'}
              </span>
            </div>

            {selectedLecture.transcription ? (
              <div className="space-y-6">
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Transcription</h3>
                  <p className="whitespace-pre-wrap">
                    {selectedLecture.transcription.content}
                  </p>
                </div>

                {selectedLecture.transcription.summary && (
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-2">Summary</h3>
                    <p className="mb-4">
                      {selectedLecture.transcription.summary.content}
                    </p>
                    <h4 className="font-semibold mb-2">Key Points</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {selectedLecture.transcription.summary.key_points.map(
                        (point, index) => (
                          <li key={index} className="text-muted-foreground">
                            {point}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  {selectedLecture.processing_status === 'error'
                    ? 'An error occurred while processing this lecture.'
                    : selectedLecture.processing_status === 'processing'
                    ? 'Transcription in progress...'
                    : 'Waiting to start transcription...'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
