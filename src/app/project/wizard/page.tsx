'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { ArrowLeft, ArrowRight, Wand2 } from 'lucide-react'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { supabase } from '@/lib/supabase'

interface WizardAnswers {
  q1: string // 무엇을 만들것이냐?
  q2: string // 어떤 스타일을 원하냐?
  q3: string // 모델/배우를 생성하시겠습니까?
  q4: string // 추가적인 요청
}

export default function StoryboardWizardPage() {
  const router = useRouter()
  const { user } = useSupabase()
  const [currentStep, setCurrentStep] = useState(1)
  const [answers, setAnswers] = useState<WizardAnswers>({
    q1: '',
    q2: '',
    q3: '',
    q4: '',
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedScript, setGeneratedScript] = useState<string>('')
  const [projectId, setProjectId] = useState<string>('')
  const [isCreatingStoryboard, setIsCreatingStoryboard] = useState(false)
  const [showScriptPreview, setShowScriptPreview] = useState(false)

  const questions = [
    {
      id: 'q1',
      question: '무엇을 만들것이냐?',
      placeholder: '브랜드 캠페인에 사용할 숏 필름을 만들고싶어.',
      type: 'textarea' as const,
    },
    {
      id: 'q2',
      question: '어떤 스타일을 원하냐?',
      placeholder: '미적이면서 시네마틱한 영상',
      type: 'textarea' as const,
    },
    {
      id: 'q3',
      question: '모델/배우를 생성하시겠습니까?(없다면 업로드해주세요.)',
      placeholder: '예/업로드',
      type: 'textarea' as const,
    },
    {
      id: 'q4',
      question: '추가적인 요청을 주세요!',
      placeholder: '카메라 앵글이 다이나믹하면 좋겠어요',
      type: 'textarea' as const,
    },
  ]

  const handleAnswerChange = (questionId: keyof WizardAnswers, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value,
    }))
  }

  const handleNext = () => {
    if (currentStep < questions.length) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleGenerateScript = async () => {
    if (!user?.id) {
      alert('Please sign in to create a project')
      return
    }

    setIsGenerating(true)
    try {
      // Create project first
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          title: 'Guided Storyboard Project',
          description: `Generated from wizard: ${answers.q1}`,
          user_id: user.id,
          is_public: false,
        })
        .select()
        .single()

      if (projectError) {
        throw new Error(`Failed to create project: ${projectError.message}`)
      }

      setProjectId(project.id)

      // Generate script using the answers
      const brief = `Create a storyboard script based on these requirements:
1. What to create: ${answers.q1}
2. Style: ${answers.q2}
3. Model/Actor: ${answers.q3}
4. Additional requests: ${answers.q4}

Please generate a detailed storyboard script in English.`

      const scriptResponse = await fetch('/api/script/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brief: brief,
          tone: answers.q2, // Use the style as tone
          length: 'Short (30-60 seconds)',
        }),
      })

      if (!scriptResponse.ok) {
        throw new Error('Failed to generate script')
      }

      const scriptData = await scriptResponse.json()
      setGeneratedScript(scriptData.script)
      setShowScriptPreview(true)
    } catch (error) {
      console.error('Error generating script:', error)
      alert('Failed to generate script. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleGenerateStoryboard = async () => {
    if (!projectId || !generatedScript) {
      alert('Missing project or script data')
      return
    }

    setIsCreatingStoryboard(true)
    try {
      // Create storyboard with the generated script
      const storyboardResponse = await fetch('/api/storyboard/build', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: projectId,
          script: generatedScript,
          aspectRatio: '16:9',
          style: answers.q2, // Use the style from Q2
          aiModel: 'fal-ai/flux-1.1-pro',
        }),
      })

      if (!storyboardResponse.ok) {
        throw new Error('Failed to create storyboard')
      }

      const storyboardData = await storyboardResponse.json()

      // Redirect to the storyboard page
      // In the new architecture, storyboardId should equal projectId
      const storyboardId = storyboardData.storyboardId || projectId
      router.push(`/project/${projectId}/storyboard/${storyboardId}`)
    } catch (error) {
      console.error('Error creating storyboard:', error)
      alert('Failed to create storyboard. Please try again.')
    } finally {
      setIsCreatingStoryboard(false)
    }
  }

  const currentQuestion = questions[currentStep - 1]
  const isLastStep = currentStep === questions.length
  const canProceed = answers[currentQuestion.id as keyof WizardAnswers].trim().length > 0

  // Show loading state while generating script
  if (isGenerating) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Generating Script...</h2>
          <p className="text-neutral-400">Please wait while we create your storyboard script</p>
        </div>
      </div>
    )
  }

  // Show script preview if script has been generated
  if (showScriptPreview) {
    return (
      <div className="min-h-screen bg-black text-white">
        {/* Header */}
        <header className="w-full bg-black border-b-2 border-neutral-800 px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => setShowScriptPreview(false)}
              className="text-neutral-300 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Questions
            </Button>
            <div className="flex items-center gap-2">
              <img src="/blooma.svg" alt="Blooma Logo" className="w-8 h-8 object-contain" />
              <span className="text-xl font-bold">Generated Script Preview</span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto px-6 py-8">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Script Content */}
            <Card className="bg-neutral-900 border-neutral-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white">Generated Script</h2>
                <div className="text-sm text-neutral-400">
                  {generatedScript.split('\n').length} lines
                </div>
              </div>
              <div className="bg-neutral-800 rounded-lg p-4 max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm text-neutral-300 leading-relaxed font-mono">
                  {generatedScript}
                </pre>
              </div>
            </Card>

            {/* Model Preview & Actions */}
            <div className="space-y-6">
              {/* Model Preview Placeholder */}
              <Card className="bg-neutral-900 border-neutral-800 p-6">
                <h3 className="text-xl font-semibold mb-4 text-white">Model Preview</h3>
                <div className="bg-neutral-800 rounded-lg p-8 text-center">
                  <div className="w-32 h-32 bg-neutral-700 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <span className="text-neutral-400 text-sm">Model Image</span>
                  </div>
                  <p className="text-neutral-400 text-sm">
                    Model images will be generated based on your style preferences
                  </p>
                </div>
              </Card>

              {/* Action Buttons */}
              <Card className="bg-neutral-900 border-neutral-800 p-6">
                <h3 className="text-lg font-semibold mb-4 text-white">Next Steps</h3>
                <div className="space-y-3">
                  <Button
                    onClick={handleGenerateStoryboard}
                    disabled={isCreatingStoryboard}
                    className="w-full bg-white hover:bg-neutral-200 text-black font-medium"
                  >
                    {isCreatingStoryboard ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2" />
                        Creating Storyboard...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4 mr-2" />
                        Generate Storyboard
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowScriptPreview(false)}
                    className="w-full border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-white"
                  >
                    Edit Answers
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="w-full bg-black border-b-2 border-neutral-800 px-6 py-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="text-neutral-300 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <img src="/blooma.svg" alt="Blooma Logo" className="w-8 h-8 object-contain" />
            <span className="text-xl font-bold">Storyboard Wizard</span>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="w-full bg-neutral-900 px-6 py-2">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-neutral-300">
              Step {currentStep} of {questions.length}
            </span>
            <span className="text-sm text-neutral-300">
              {Math.round((currentStep / questions.length) * 100)}%
            </span>
          </div>
          <div className="w-full bg-neutral-700 rounded-full h-2">
            <div
              className="bg-white h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / questions.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <Card className="bg-neutral-900 border-neutral-800 p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">{currentQuestion.question}</h1>
            <p className="text-neutral-400">
              Please provide your answer below. This will help us generate the perfect storyboard
              for you.
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <Label htmlFor="answer" className="text-lg font-medium text-white mb-3 block">
                Your Answer
              </Label>
              <Textarea
                id="answer"
                value={answers[currentQuestion.id as keyof WizardAnswers]}
                onChange={e =>
                  handleAnswerChange(currentQuestion.id as keyof WizardAnswers, e.target.value)
                }
                placeholder={currentQuestion.placeholder}
                className="min-h-[120px] bg-neutral-800 border-neutral-700 text-white placeholder-neutral-400 focus:ring-2 focus:ring-white focus:border-white"
                rows={4}
              />
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1}
                className="border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-white"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>

              {isLastStep ? (
                <Button
                  onClick={handleGenerateScript}
                  disabled={!canProceed || isGenerating}
                  className="bg-white hover:bg-neutral-200 text-black font-medium"
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2" />
                      Generating Script...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Generate Script
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  disabled={!canProceed}
                  className="bg-white hover:bg-neutral-200 text-black"
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Summary of answers so far */}
        {currentStep > 1 && (
          <Card className="bg-neutral-900 border-neutral-800 p-6 mt-6">
            <h3 className="text-lg font-semibold mb-4 text-white">Your Answers So Far</h3>
            <div className="space-y-3">
              {questions.slice(0, currentStep - 1).map((q, index) => (
                <div key={q.id} className="text-sm">
                  <span className="text-neutral-400 font-medium">
                    Q{index + 1}: {q.question}
                  </span>
                  <p className="text-white mt-1">{answers[q.id as keyof WizardAnswers]}</p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </main>
    </div>
  )
}
