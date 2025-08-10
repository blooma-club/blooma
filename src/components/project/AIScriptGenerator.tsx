'use client'

import React, { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Image from 'next/image'
import StepWizardForm, { WizardStep } from './StepWizardForm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Bot, 
  Copy, 
  Download, 
  RefreshCw,
  Zap,
  FileText,
  Users,
  Megaphone,
  PenTool,
  Share2,
  Package
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"

const aiModels = [
  { value: 'gpt-4', label: 'GPT-4', provider: 'OpenAI' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', provider: 'OpenAI' },
  { value: 'claude-3', label: 'Claude 3', provider: 'Anthropic' },
  { value: 'gemini-pro', label: 'Gemini Pro', provider: 'Google' },
]

const roleManagers = [
  {
    key: 'copywriting',
    label: 'Copywriting Manager',
    icon: Megaphone,
    description: 'Marketing copy, ads, and landing pages',
  avatar: '/managers/copywriting.svg',
    templates: [
      {
        name: 'Marketing Copy',
        prompt: 'Generate compelling marketing copy for a product launch. Include a hook, problem statement, solution, and call to action.',
      },
      {
        name: 'Sales Letter',
        prompt: 'Write a persuasive sales letter that builds trust, addresses pain points, and drives action.',
      },
      {
        name: 'Landing Page Copy',
        prompt: 'Create landing page copy with headlines, subheadings, benefits, and CTA that converts visitors.',
      },
    ]
  },
  {
    key: 'blog',
    label: 'Blog Manager',
    icon: PenTool,
    description: 'Blog posts, articles, and SEO content',
  avatar: '/managers/blog.svg',
    templates: [
      {
        name: 'Blog Post Outline',
        prompt: 'Create a detailed blog post outline with introduction, main points, subheadings, and conclusion.',
      },
      {
        name: 'How-to Article',
        prompt: 'Write a comprehensive how-to article with step-by-step instructions and helpful tips.',
      },
      {
        name: 'SEO Article',
        prompt: 'Create an SEO-optimized article with target keywords, meta descriptions, and engaging content.',
      },
    ]
  },
  {
    key: 'social',
    label: 'SNS Manager',
    icon: Share2,
    description: 'Social media posts and engagement content',
  avatar: '/managers/social.svg',
    templates: [
      {
        name: 'Social Media Content',
        prompt: 'Write engaging social media posts for different platforms (Twitter, LinkedIn, Instagram) with appropriate hashtags.',
      },
      {
        name: 'Twitter Thread',
        prompt: 'Create a compelling Twitter thread that tells a story and encourages engagement.',
      },
      {
        name: 'LinkedIn Post',
        prompt: 'Write a professional LinkedIn post that provides value and builds thought leadership.',
      },
    ]
  },
  {
    key: 'product',
    label: 'Product Manager',
    icon: Package,
    description: 'Product descriptions and feature explanations',
  avatar: '/managers/product.svg',
    templates: [
      {
        name: 'Product Description',
        prompt: 'Write a detailed product description that highlights features, benefits, and target audience.',
      },
      {
        name: 'Feature Announcement',
        prompt: 'Create an exciting product feature announcement that explains benefits and drives adoption.',
      },
      {
        name: 'Product Comparison',
        prompt: 'Write a product comparison that objectively highlights advantages and differentiators.',
      },
    ]
  },
]

const scriptTemplates = [
  {
    name: 'Marketing Copy',
    prompt: 'Generate compelling marketing copy for a product launch. Include a hook, problem statement, solution, and call to action.',
  },
  {
    name: 'Blog Post Outline',
    prompt: 'Create a detailed blog post outline with introduction, main points, subheadings, and conclusion.',
  },
  {
    name: 'Social Media Content',
    prompt: 'Write engaging social media posts for different platforms (Twitter, LinkedIn, Instagram) with appropriate hashtags.',
  },
  {
    name: 'Product Description',
    prompt: 'Write a detailed product description that highlights features, benefits, and target audience.',
  },
]

export default function AIScriptGenerator() {
  const [selectedRole, setSelectedRole] = useState('copywriting')
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  // Assistant form state to help build prompt
  // Step-by-step assistant state
  type AssistantKeys = 'contentType' | 'topic' | 'audience' | 'tone' | 'goal' | 'keyPoints' | 'cta' | 'keywords' | 'length';
  const assistantSteps: (WizardStep & { key: AssistantKeys })[] = [
    { key: 'contentType', label: 'Content Type', placeholder: 'e.g., Marketing Copy, Blog Post, Social Post', type: 'input', options: ['Marketing Copy','Blog Post','Social Post','Product Description'] },
    { key: 'topic', label: 'Topic/Title', placeholder: 'What is this about?', type: 'input', helperText: 'Keep it concise and specific.' },
    { key: 'audience', label: 'Audience', placeholder: 'Who will read this?', type: 'input', options: ['General','Developers','Marketers','Executives','Students'] },
    { key: 'tone', label: 'Tone', placeholder: 'e.g., Professional, Friendly, Persuasive', type: 'input', options: ['Professional','Friendly','Persuasive','Inspirational','Technical'] },
    { key: 'goal', label: 'Goal', placeholder: 'What should the script achieve?', type: 'input', options: ['Educate','Convert','Inform','Entertain','Engage'] },
    { key: 'keyPoints', label: 'Key Points (one per line)', placeholder: 'List the key points or outline, one per line', type: 'textarea', helperText: 'Use the options to quickly add common sections.', options: ['Hook','Problem','Solution','Evidence','Benefits','CTA'] },
    { key: 'cta', label: 'Call to Action', placeholder: 'What should readers do?', type: 'input', options: ['Sign up','Learn more','Buy now','Contact us','Subscribe'] },
    { key: 'keywords', label: 'Keywords', placeholder: 'comma,separated,keywords', type: 'input', helperText: 'Comma separated.', options: ['ai,generator,script','marketing,copy,cta','blog,outline,guide'] },
    { key: 'length', label: 'Length', placeholder: 'Short / Medium / Long or word count', type: 'input', options: ['Short','Medium','Long','~300 words','~600 words','~1200 words'] },
  ];
  const [assistant, setAssistant] = useState<Record<AssistantKeys, string>>({
    contentType: 'Script',
    topic: '',
    audience: '',
    tone: 'Professional',
    goal: '',
    keyPoints: '',
    cta: '',
    keywords: '',
    length: 'Medium',
  });
  const [step, setStep] = useState(0);
  const totalSteps = assistantSteps.length;

  const builtPrompt = useMemo(() => {
    const parts: string[] = [];
    if (assistant.contentType) parts.push(`Content Type: ${assistant.contentType}`);
    if (assistant.topic) parts.push(`Topic: ${assistant.topic}`);
    if (assistant.audience) parts.push(`Audience: ${assistant.audience}`);
    if (assistant.tone) parts.push(`Tone: ${assistant.tone}`);
    if (assistant.goal) parts.push(`Goal: ${assistant.goal}`);
    if (assistant.keyPoints) parts.push(`Key Points:\n- ${assistant.keyPoints.split('\n').filter(Boolean).join('\n- ')}`);
    if (assistant.cta) parts.push(`Call to Action: ${assistant.cta}`);
    if (assistant.keywords) parts.push(`Keywords: ${assistant.keywords}`);
    if (assistant.length) parts.push(`Length: ${assistant.length}`);
    return `Please write a high-quality ${assistant.contentType.toLowerCase() || 'script'} with the following details.\n\n${parts.join('\n')}`.trim();
  }, [assistant]);

  const activeManager = roleManagers.find(manager => manager.key === selectedRole) || roleManagers[0]

  const handleGenerate = async () => {
    if (!prompt.trim()) return
    setIsGenerating(true)
    // In a real app, call the AI API with the prompt here.
    setTimeout(() => setIsGenerating(false), 800)
  }

  const handleTemplateSelect = (template: typeof scriptTemplates[0]) => {
    setPrompt(template.prompt)
  }

  return (
    <div className="min-h-screen bg-[#F5F2ED] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Script Generator</h1>
              <p className="text-gray-600">Generate scripts and content using AI models</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Panel: Input & Settings */}
          <div className="lg:col-span-1 max-w-xs flex flex-col gap-4">
            {/* Role Manager Selection */}
            <Card className="border-2 border-gray-900 shadow-[2px_2px_0_0_#000000] p-3 flex flex-col gap-2">
              <CardHeader className="p-3 pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  <span>Role Manager</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 p-3">
                <div className="flex flex-col gap-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="default" className="w-full flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <Image src={activeManager.avatar} alt="avatar" width={24} height={24} className="rounded" />
                          <span className="font-medium">{activeManager.label}</span>
                        </div>
                        <Bot className="w-4 h-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-full">
                      <DropdownMenuLabel>Select Role Manager</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuRadioGroup value={selectedRole} onValueChange={setSelectedRole}>
                        {roleManagers.map((manager) => (
                          <DropdownMenuRadioItem key={manager.key} value={manager.key}>
                            <div className="flex items-center gap-3">
                              <Image src={manager.avatar} alt={manager.label} width={24} height={24} className="rounded" />
                              <div>
                                <div className="font-medium">{manager.label}</div>
                                <div className="text-xs text-gray-500">{manager.description}</div>
                              </div>
                            </div>
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>

            {/* Templates for Selected Role */}
            <Card className="border-2 border-gray-900 shadow-[2px_2px_0_0_#000000] p-3 flex flex-col gap-2">
              <CardHeader className="p-3 pb-2">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  <span>Templates</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 p-3">
                <div className="flex flex-col gap-2 w-full">
                  {activeManager.templates.map((template, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      className="w-full flex flex-col items-start text-left h-auto py-2 text-sm gap-0.5"
                      onClick={() => setPrompt(template.prompt)}
                    >
                      <span className="font-medium w-full text-left">{template.name}</span>
                      <span className="text-xs text-gray-500 truncate w-full text-left">{template.prompt.substring(0, 50)}...</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel: Input & Output */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            {/* Script Assistant Stepper (매니저 정보는 StepWizardForm 내부에서 profile로 표시) */}
            <Card className="border-2 border-gray-900 shadow-[2px_2px_0_0_#000000] p-4 flex flex-col">
              <CardHeader className="p-4 pb-2">
                <CardTitle>Script Assistant</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                <StepWizardForm
                  steps={assistantSteps}
                  value={assistant}
                  onChange={(v) => setAssistant(v as Record<AssistantKeys, string>)}
                  step={step}
                  setStep={setStep}
                  finishLabel="Insert into Prompt"
                  onComplete={() => setPrompt(builtPrompt)}
                  profile={{
                    avatar: activeManager.avatar,
                    label: activeManager.label,
                    description: activeManager.description,
                  }}
                />
                {step === totalSteps - 1 && (
                  <div className="mt-2">
                    <Label className="mb-1 block">Preview</Label>
                    <pre className="bg-gray-50 border border-gray-200 rounded p-3 text-sm whitespace-pre-wrap text-gray-800">{builtPrompt}</pre>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Prompt Input removed as requested */}
            {/* Removed Generated Output panel as requested */}
          </div>
        </div>
      </div>
    </div>
  )
}
