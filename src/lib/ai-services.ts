import { OpenAI } from 'openai'
import { env } from '@/env'
import { supabase } from './supabase'

interface SummaryResponse {
  summary: string
  keyPoints: string[]
}

const openai = new OpenAI({
  apiKey: env.NEXT_PUBLIC_OPENAI_API_KEY,
})

export async function transcribeAudio(lectureId: string, filePath: string) {
  try {
    // Get file from Supabase Storage
    const { data: fileData, error: fileError } = await supabase.storage
      .from('lecture-recordings')
      .download(filePath)

    if (fileError) throw fileError
    if (!fileData) throw new Error('No file data received')

    // Convert Blob to File for OpenAI API
    const audioFile = new File([fileData], 'audio.mp3', {
      type: 'audio/mpeg',
      lastModified: Date.now(),
    })

    // Transcribe using Whisper API
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en',
    })

    // Save transcription to database
    const { error: transcriptionError } = await supabase
      .from('transcriptions')
      .insert({
        lecture_id: lectureId,
        content: transcription.text,
        language: 'en',
        confidence: 0.9, // Whisper API currently doesn't provide confidence scores
      })

    if (transcriptionError) throw transcriptionError

    // Generate summary
    await generateSummary(lectureId, transcription.text)

    return transcription.text
  } catch (error) {
    console.error('Error in transcription process:', error)
    throw error
  }
}

export async function generateSummary(lectureId: string, transcriptionText: string) {
  try {
    // Get transcription ID
    const { data: transcriptionData, error: transcriptionError } = await supabase
      .from('transcriptions')
      .select('id')
      .eq('lecture_id', lectureId)
      .single()

    if (transcriptionError) throw transcriptionError
    if (!transcriptionData?.id) throw new Error('Transcription not found')

    // Generate summary using GPT-4
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at summarizing academic lectures. Create a concise summary and extract key points from the lecture transcript. Format the response as JSON with "summary" and "keyPoints" fields.',
        },
        {
          role: 'user',
          content: transcriptionText,
        },
      ],
      response_format: { type: 'json_object' },
    })

    const content = completion.choices[0].message.content
    if (!content) throw new Error('No summary content received from GPT-4')

    const summaryData = JSON.parse(content) as SummaryResponse

    // Save summary to database
    const { error: summaryError } = await supabase
      .from('summaries')
      .insert({
        transcription_id: transcriptionData.id,
        content: summaryData.summary,
        key_points: summaryData.keyPoints,
      })

    if (summaryError) throw summaryError

    return summaryData
  } catch (error) {
    console.error('Error in summary generation:', error)
    throw error
  }
}

export async function processLectureRecording(lectureId: string, filePath: string) {
  try {
    // Start transcription process
    const transcription = await transcribeAudio(lectureId, filePath)
    return transcription
  } catch (error) {
    console.error('Error processing lecture recording:', error)
    throw error
  }
}
