"use client"

import React from "react"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { cn } from "@/lib/utils"
import { Bot, Send, User, Sparkles, RefreshCw, ChevronDown, ChevronUp } from "lucide-react"
import { useRef, useEffect, useState } from "react"
import { usePortfolio } from "@/lib/portfolio-context"
import { loadSettingsSnapshot } from "@/lib/settings-store"

interface AIAdvisorProps {
  className?: string
}

export default function AIAdvisor({ className }: AIAdvisorProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [input, setInput] = useState("")
  const [uiLocale, setUiLocale] = useState<"fr" | "en">("fr")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const modelLabel = process.env.NEXT_PUBLIC_OPENAI_MODEL_LABEL || "GPT-5.3-Codex"
  const { accounts, transactions, goals, totalBalance, stockActions } = usePortfolio()

  useEffect(() => {
    const syncLocale = () => {
      const snapshot = loadSettingsSnapshot()
      setUiLocale(snapshot.language === "en" ? "en" : "fr")
    }

    syncLocale()
    const intervalId = window.setInterval(syncLocale, 2_500)
    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ id, messages }) => ({
        body: {
          messages,
          id,
          portfolioData: {
            accounts,
            transactions,
            goals,
            stockActions,
            totalBalance,
          },
          uiLocale,
        },
      }),
    }),
  })

  const isLoading = status === "streaming" || status === "submitted"

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage({ text: input })
    setInput("")
  }

  const handleClearChat = () => {
    setMessages([])
  }

  const copy =
    uiLocale === "en"
      ? {
          title: "AI Financial Advisor",
          subtitle: "Global control, instant insights, and guided execution.",
          clearTitle: "Clear chat",
          emptyTitle: "I monitor your finances and operations.",
          emptyDesc: "I can use your full portfolio data to guide your next actions.",
          inputPlaceholder: "Ask about your portfolio...",
          suggestions: [
            "How can I optimize my portfolio?",
            "Am I saving enough for emergencies?",
            "How should I pay off my debt?",
            "Analyze my spending patterns",
          ],
        }
      : {
          title: "Conseiller Financier IA",
          subtitle: "Pilotage global, insights instantanés et exécution guidée.",
          clearTitle: "Vider la conversation",
          emptyTitle: "Je supervise vos finances et vos opérations.",
          emptyDesc: "J’utilise vos données de portefeuille pour guider vos décisions.",
          inputPlaceholder: "Posez une question sur votre portefeuille...",
          suggestions: [
            "Comment optimiser mon portefeuille ?",
            "Mon épargne de précaution est-elle suffisante ?",
            "Quelle stratégie pour rembourser mes dettes ?",
            "Analyse mes dépenses récentes",
          ],
        }

  // Helper to extract text from message parts
  const getMessageText = (message: typeof messages[0]): string => {
    if (!message.parts || !Array.isArray(message.parts)) return ""
    return message.parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("")
  }

  return (
    <div
      className={cn(
        "w-full",
        "fx-panel",
        "flex flex-col",
        className
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "p-4 border-b border-border/60",
          "flex items-center justify-between",
          "cursor-pointer hover:bg-accent/40",
          "transition-colors duration-200"
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl border border-border/60 bg-primary/10">
            <Bot className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">{copy.title}</h2>
            <p className="text-xs text-muted-foreground">Powered by {modelLabel}</p>
            <p className="text-xs text-muted-foreground">{copy.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleClearChat()
              }}
              className="p-1.5 rounded-lg hover:bg-accent/60 transition-colors"
              title={copy.clearTitle}
            >
              <RefreshCw className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[400px]">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <div className="p-3 rounded-full bg-accent/60">
                  <Sparkles className="w-6 h-6 text-muted-foreground/70" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {copy.emptyTitle}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {copy.emptyDesc}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {copy.suggestions.map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => {
                        setInput(question)
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-full",
                        "text-xs font-medium",
                        "bg-accent/50",
                        "text-muted-foreground",
                        "hover:bg-accent/80 hover:text-foreground",
                        "transition-colors duration-200"
                      )}
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-3",
                      message.role === "user" ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    <div
                      className={cn(
                        "p-1.5 rounded-lg h-fit",
                        message.role === "user"
                          ? "bg-foreground"
                          : "bg-primary/10 border border-border/60"
                      )}
                    >
                      {message.role === "user" ? (
                        <User className="w-3.5 h-3.5 text-background" />
                      ) : (
                        <Bot className="w-3.5 h-3.5 text-primary" />
                      )}
                    </div>
                    <div
                      className={cn(
                        "flex-1 px-3 py-2 rounded-lg",
                        "text-sm",
                        message.role === "user"
                          ? "bg-foreground text-background"
                          : "bg-accent/60 text-foreground"
                      )}
                    >
                      <p className="whitespace-pre-wrap">{getMessageText(message)}</p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3">
                    <div className="p-1.5 rounded-lg bg-primary/10 border border-border/60">
                      <Bot className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="flex-1 px-3 py-2 rounded-lg bg-accent/60">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-muted-foreground/70 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 bg-muted-foreground/70 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 bg-muted-foreground/70 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input Area */}
          <form
            onSubmit={handleSubmit}
            className="p-3 border-t border-border/60"
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={copy.inputPlaceholder}
                disabled={isLoading}
                className={cn(
                  "flex-1 px-3 py-2 rounded-lg",
                  "text-sm",
                  "bg-background/40",
                  "text-foreground",
                  "placeholder:text-muted-foreground/70",
                  "border border-border/60",
                  "focus:outline-none focus:border-primary",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "transition-colors duration-200"
                )}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className={cn(
                  "px-3 py-2 rounded-lg",
                  "border border-border/60",
                  "bg-primary text-primary-foreground",
                  "hover:bg-primary/90",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "transition-colors duration-200"
                )}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  )
}
