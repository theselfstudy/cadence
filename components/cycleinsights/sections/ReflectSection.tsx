// /components/cycleinsights/sections/ReflectSection.tsx
"use client";

import { useMemo, useState } from "react";
import type { ConsistentPattern, EmergingPattern, CoOccurrence, ReflectionPrompt } from "@/lib/insightUtils";
import { generateReflectionPrompts } from "@/lib/insightUtils";

// ============================================
// TYPES
// ============================================

interface ReflectSectionProps {
  consistentPatterns: ConsistentPattern[];
  emergingPatterns: EmergingPattern[];
  coOccurrences: CoOccurrence[];
  cycleCount: number;
  dismissedPromptIds: string[];
  onDismissPrompt: (promptId: string) => void;
}

// ============================================
// REFLECTION PROMPT CARD
// ============================================

interface ReflectionPromptCardProps {
  prompt: ReflectionPrompt;
  onAnswer: (promptId: string, answer: string) => void;
  onDismiss: (promptId: string) => void;
}

function ReflectionPromptCard({ prompt, onAnswer, onDismiss }: ReflectionPromptCardProps) {
  const [answered, setAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  const handleAnswer = (answer: string) => {
    setSelectedAnswer(answer);
    setAnswered(true);
    onAnswer(prompt.id, answer);
    
    // Auto-dismiss after a short delay
    setTimeout(() => {
      onDismiss(prompt.id);
    }, 1500);
  };

  const getCategoryIcon = () => {
    switch (prompt.category) {
      case 'pattern_check': return '🔄';
      case 'recent_change': return '🌱';
      case 'co_occurrence': return '🔗';
      case 'general_awareness': return '💭';
      default: return '💭';
    }
  };

  const getCategoryLabel = () => {
    switch (prompt.category) {
      case 'pattern_check': return 'About your patterns';
      case 'recent_change': return 'Something new';
      case 'co_occurrence': return 'Things that happen together';
      case 'general_awareness': return 'Reflection';
      default: return 'Reflection';
    }
  };

  if (answered) {
    return (
      <div className="bg-app-teal/10 border border-app-teal/20 rounded-xl p-4 transition-all">
        <div className="flex items-center gap-2 text-app-teal">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm font-medium">Thanks for reflecting</span>
        </div>
        {selectedAnswer && (
          <p className="text-xs text-app-gray mt-1">
            Your answer: {selectedAnswer}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-app-white border border-app-border rounded-xl p-4 space-y-3">
      {/* Category label */}
      <div className="flex items-center gap-2">
        <span className="text-lg">{getCategoryIcon()}</span>
        <span className="text-xs font-medium text-app-gray uppercase tracking-wide">
          {getCategoryLabel()}
        </span>
      </div>

      {/* Prompt text */}
      <p className="text-sm text-app-charcoal leading-relaxed">
        {prompt.prompt}
      </p>

      {/* Answer buttons */}
      <div className="flex flex-wrap gap-2 pt-1">
        {prompt.answerType === 'yes_no' && (
          <>
            <button
              onClick={() => handleAnswer('Yes')}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-app-teal text-app-teal hover:bg-app-teal hover:text-white transition-colors"
            >
              Yes
            </button>
            <button
              onClick={() => handleAnswer('No')}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-app-border text-app-charcoal hover:bg-app-cream transition-colors"
            >
              No
            </button>
            <button
              onClick={() => handleAnswer('Skip')}
              className="px-4 py-2 text-sm font-medium rounded-lg text-app-gray hover:text-app-charcoal transition-colors"
            >
              Skip
            </button>
          </>
        )}

        {prompt.answerType === 'accuracy' && (
          <>
            <button
              onClick={() => handleAnswer('Feels accurate')}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-app-teal text-app-teal hover:bg-app-teal hover:text-white transition-colors"
            >
              Feels accurate
            </button>
            <button
              onClick={() => handleAnswer('Not sure')}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-app-border text-app-charcoal hover:bg-app-cream transition-colors"
            >
              Not sure
            </button>
            <button
              onClick={() => handleAnswer('Skip')}
              className="px-4 py-2 text-sm font-medium rounded-lg text-app-gray hover:text-app-charcoal transition-colors"
            >
              Skip
            </button>
          </>
        )}

        {prompt.answerType === 'choice' && prompt.choices && (
          <>
            {prompt.choices.map((choice) => (
              <button
                key={choice}
                onClick={() => handleAnswer(choice)}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-app-border text-app-charcoal hover:border-app-teal hover:text-app-teal transition-colors"
              >
                {choice}
              </button>
            ))}
            <button
              onClick={() => handleAnswer('Skip')}
              className="px-4 py-2 text-sm font-medium rounded-lg text-app-gray hover:text-app-charcoal transition-colors"
            >
              Skip
            </button>
          </>
        )}

        {prompt.answerType === 'acknowledge' && (
          <button
            onClick={() => handleAnswer('Got it')}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-app-teal text-app-teal hover:bg-app-teal hover:text-white transition-colors"
          >
            Got it
          </button>
        )}
      </div>

      {/* Based on indicator */}
      <p className="text-xs text-app-gray pt-1">
        Based on: {prompt.basedOn}
      </p>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function ReflectSection({
  consistentPatterns,
  emergingPatterns,
  coOccurrences,
  cycleCount,
  dismissedPromptIds,
  onDismissPrompt,
}: ReflectSectionProps) {
  // Generate prompts
  const prompts = useMemo(() => {
    return generateReflectionPrompts(
      consistentPatterns,
      emergingPatterns,
      coOccurrences,
      dismissedPromptIds,
      cycleCount
    );
  }, [consistentPatterns, emergingPatterns, coOccurrences, dismissedPromptIds, cycleCount]);

  // Handler for when user answers (we don't store answers, just dismiss)
  const handleAnswer = (promptId: string, answer: string) => {
    // Answers aren't stored - they're just for the user's reflection
    console.log(`Reflection prompt ${promptId} answered: ${answer}`);
  };

  // No prompts available
  if (prompts.length === 0) {
    return (
      <div className="bg-app-cream/30 rounded-lg p-6 text-center">
        <span className="text-2xl block mb-2">💭</span>
        <p className="text-sm text-app-charcoal font-medium mb-1">
          No new reflections right now
        </p>
        <p className="text-xs text-app-gray">
          Check back after logging more entries or completing another cycle.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Intro text */}
      <p className="text-xs text-app-gray">
        Questions to help you notice patterns. These are not stored anywhere and are meant to bring your attention back to you and how you feel
      </p>

      {/* Prompt cards */}
      <div className="space-y-3">
        {prompts.map((prompt) => (
          <ReflectionPromptCard
            key={prompt.id}
            prompt={prompt}
            onAnswer={handleAnswer}
            onDismiss={onDismissPrompt}
          />
        ))}
      </div>

      {/* Privacy note */}
      <div className="bg-app-cream/50 rounded-lg p-3">
        <p className="text-xs text-app-gray">
          💡 These prompts are generated from your data and are meant to bring your attention to trends you might not be aware of.
        </p>
      </div>
    </div>
  );
}