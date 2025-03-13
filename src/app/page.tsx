import { AuthForm } from '@/components/auth/auth-form'

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-4xl space-y-8 text-center">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Claiss
          </h1>
          <p className="text-lg text-muted-foreground sm:text-xl">
            Transform your lectures into searchable, AI-summarized notes
          </p>
        </div>

        <div className="mx-auto max-w-md">
          <AuthForm />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold">Record & Transcribe</h3>
            <p className="text-sm text-muted-foreground">
              Record lectures or upload audio files for instant transcription
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold">AI Summary</h3>
            <p className="text-sm text-muted-foreground">
              Get intelligent summaries of your lectures powered by GPT-4
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold">Search & Review</h3>
            <p className="text-sm text-muted-foreground">
              Easily search through your transcribed lectures and notes
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
