"use client"

import React from "react"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { cn } from "@/lib/utils"
import { Bot, Send, User, Sparkles, RefreshCw, ChevronDown, ChevronUp } from "lucide-react"
import { useRef, useEffect, useState } from "react"
import { usePortfolio } from "@/lib/portfolio-context"

interface AIAdvisorProps {
  className?: string
}

export default function AIAdvisor({ className }: AIAdvisorProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [input, setInput] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { accounts, transactions, goals, totalBalance, stockActions } = usePortfolio()

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ id, messages }) => ({
        body: {
          message: messages[messages.length - 1],
          id,
          portfolioData: {
            accounts,
            transactions,
            goals,
            stockActions,
            totalBalance,
          },
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

  const suggestedQuestions = [
    "How can I optimize my portfolio?",
    "Am I saving enough for emergencies?",
    "How should I pay off my debt?",
    "Analyze my spending patterns",
  ]

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
        "bg-white dark:bg-zinc-900/70",
        "border border-zinc-100 dark:border-zinc-800",
        "rounded-xl shadow-sm backdrop-blur-xl",
        "flex flex-col",
        className
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "p-4 border-b border-zinc-100 dark:border-zinc-800",
          "flex items-center justify-between",
          "cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
          "transition-colors duration-200"
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
            <Bot className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              AI Financial Advisor
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Powered by GPT-4o Mini
            </p>
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
              className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Clear chat"
            >
              <RefreshCw className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            </button>
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
          )}
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[400px]">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <div className="p-3 rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <Sparkles className="w-6 h-6 text-zinc-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    Ask me anything about your finances
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    I have access to your complete portfolio data
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {suggestedQuestions.map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => {
                        setInput(question)
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-full",
                        "text-xs font-medium",
                        "bg-zinc-100 dark:bg-zinc-800",
                        "text-zinc-600 dark:text-zinc-300",
                        "hover:bg-zinc-200 dark:hover:bg-zinc-700",
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
                          ? "bg-zinc-900 dark:bg-zinc-100"
                          : "bg-emerald-100 dark:bg-emerald-900/30"
                      )}
                    >
                      {message.role === "user" ? (
                        <User className="w-3.5 h-3.5 text-zinc-100 dark:text-zinc-900" />
                      ) : (
                        <Bot className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      )}
                    </div>
                    <div
                      className={cn(
                        "flex-1 px-3 py-2 rounded-lg",
                        "text-sm",
                        message.role === "user"
                          ? "bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                      )}
                    >
                      <p className="whitespace-pre-wrap">{getMessageText(message)}</p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3">
                    <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                      <Bot className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1 px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
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
            className="p-3 border-t border-zinc-100 dark:border-zinc-800"
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your portfolio..."
                disabled={isLoading}
                className={cn(
                  "flex-1 px-3 py-2 rounded-lg",
                  "text-sm",
                  "bg-zinc-100 dark:bg-zinc-800",
                  "text-zinc-900 dark:text-zinc-100",
                  "placeholder:text-zinc-400 dark:placeholder:text-zinc-500",
                  "border border-transparent",
                  "focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "transition-colors duration-200"
                )}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className={cn(
                  "px-3 py-2 rounded-lg",
                  "bg-emerald-600 dark:bg-emerald-500",
                  "text-white",
                  "hover:bg-emerald-700 dark:hover:bg-emerald-600",
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
