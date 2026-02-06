"use client"

import React, { useEffect, useState } from "react"
import { LogOut, MoveUpRight, Settings, CreditCard, FileText } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { Switch } from "@/components/ui/switch"

interface MenuItem {
  label: string
  value?: string
  href: string
  icon?: React.ReactNode
  external?: boolean
}

interface Profile01Props {
  name: string
  role: string
  avatar: string
  subscription?: string
}

const defaultProfile = {
  name: "Alex Morgan",
  role: "Portfolio Manager",
  avatar: "https://ferf1mheo22r9ira.public.blob.vercel-storage.com/avatar-02-albo9B0tWOSLXCVZh9rX9KFxXIVWMr.png",
  subscription: "Premium Plan",
} satisfies Required<Profile01Props>

export default function Profile01({
  name = defaultProfile.name,
  role = defaultProfile.role,
  avatar = defaultProfile.avatar,
  subscription = defaultProfile.subscription,
}: Partial<Profile01Props> = defaultProfile) {
  const [apiKey, setApiKey] = useState("")
  const [showApiKey, setShowApiKey] = useState(false)
  const [emailAlerts, setEmailAlerts] = useState(true)
  const [pushAlerts, setPushAlerts] = useState(false)
  const [weeklyReport, setWeeklyReport] = useState(true)
  const [twoFactor, setTwoFactor] = useState(true)
  const [currency, setCurrency] = useState("USD")
  const [language, setLanguage] = useState("en")
  const [timezone, setTimezone] = useState("GMT")

  useEffect(() => {
    const storedKey = window.localStorage.getItem("openai_api_key") || ""
    setApiKey(storedKey)
  }, [])

  useEffect(() => {
    if (apiKey) {
      window.localStorage.setItem("openai_api_key", apiKey)
    } else {
      window.localStorage.removeItem("openai_api_key")
    }
  }, [apiKey])

  const apiKeyIsValid = apiKey.length === 0 || apiKey.startsWith("sk-")

  const menuItems: MenuItem[] = [
    {
      label: "Subscription",
      value: subscription,
      href: "#",
      icon: <CreditCard className="w-4 h-4" />,
      external: false,
    },
    {
      label: "Terms & Policies",
      href: "#",
      icon: <FileText className="w-4 h-4" />,
      external: true,
    },
  ]

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
        <div className="relative px-6 pt-12 pb-6">
          <div className="flex items-center gap-4 mb-8">
            <div className="relative shrink-0">
              <Image
                src={avatar || "/placeholder.svg"}
                alt={name}
                width={72}
                height={72}
                className="rounded-full ring-4 ring-white dark:ring-zinc-900 object-cover"
              />
              <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-900" />
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{name}</h2>
              <p className="text-zinc-600 dark:text-zinc-400">{role}</p>
            </div>
          </div>
          <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-6" />
          <div className="space-y-2">
            {menuItems.slice(0, 1).map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center justify-between p-2 
                                    hover:bg-zinc-50 dark:hover:bg-zinc-800/50 
                                    rounded-lg transition-colors duration-200"
              >
                <div className="flex items-center gap-2">
                  {item.icon}
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{item.label}</span>
                </div>
                <div className="flex items-center">
                  {item.value && (
                    <span className="text-sm text-zinc-500 dark:text-zinc-400 mr-2">{item.value}</span>
                  )}
                  {item.external && <MoveUpRight className="w-4 h-4" />}
                </div>
              </Link>
            ))}

            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 space-y-3">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Settings</span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-zinc-700 dark:text-zinc-300">
                  <span>Email alerts</span>
                  <Switch checked={emailAlerts} onCheckedChange={setEmailAlerts} />
                </div>
                <div className="flex items-center justify-between text-sm text-zinc-700 dark:text-zinc-300">
                  <span>Push notifications</span>
                  <Switch checked={pushAlerts} onCheckedChange={setPushAlerts} />
                </div>
                <div className="flex items-center justify-between text-sm text-zinc-700 dark:text-zinc-300">
                  <span>Weekly report</span>
                  <Switch checked={weeklyReport} onCheckedChange={setWeeklyReport} />
                </div>
                <div className="flex items-center justify-between text-sm text-zinc-700 dark:text-zinc-300">
                  <span>Two-factor auth</span>
                  <Switch checked={twoFactor} onCheckedChange={setTwoFactor} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <label className="space-y-1">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">Currency</span>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1 text-sm text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">Language</span>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1 text-sm text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="en">English</option>
                    <option value="fr">Français</option>
                    <option value="es">Español</option>
                  </select>
                </label>
              </div>

              <label className="space-y-1 text-sm">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">ChatGPT API Key</span>
                <div className="flex items-center gap-2">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1 text-sm text-zinc-900 dark:text-zinc-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey((current) => !current)}
                    className="text-xs font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
                  >
                    {showApiKey ? "Masquer" : "Afficher"}
                  </button>
                </div>
                {!apiKeyIsValid && (
                  <span className="text-[11px] text-rose-500">La clé doit commencer par “sk-”.</span>
                )}
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Stored locally in your browser to enable the latest ChatGPT model for finance
                  agent responses.
                </span>
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                >
                  Create an OpenAI API key
                </a>
              </label>

              <label className="space-y-1 text-sm">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">Timezone</span>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1 text-sm text-zinc-900 dark:text-zinc-100"
                >
                  <option value="GMT">GMT (UTC+0)</option>
                  <option value="CET">CET (UTC+1)</option>
                  <option value="EST">EST (UTC-5)</option>
                </select>
              </label>
            </div>

            {menuItems.slice(1).map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center justify-between p-2 
                                    hover:bg-zinc-50 dark:hover:bg-zinc-800/50 
                                    rounded-lg transition-colors duration-200"
              >
                <div className="flex items-center gap-2">
                  {item.icon}
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{item.label}</span>
                </div>
                <div className="flex items-center">
                  {item.value && (
                    <span className="text-sm text-zinc-500 dark:text-zinc-400 mr-2">{item.value}</span>
                  )}
                  {item.external && <MoveUpRight className="w-4 h-4" />}
                </div>
              </Link>
            ))}

            <button
              type="button"
              className="w-full flex items-center justify-between p-2 
                                hover:bg-zinc-50 dark:hover:bg-zinc-800/50 
                                rounded-lg transition-colors duration-200"
            >
              <div className="flex items-center gap-2">
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Logout</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
