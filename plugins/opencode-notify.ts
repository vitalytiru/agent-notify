import type { Plugin } from "@opencode-ai/plugin"

const BIN = "@agent-notify@"

const subagents = new Set<string>()
const titles = new Map<string, string>()
const results = new Map<string, string>()

export const AgentNotifyPlugin: Plugin = async ({ $, directory }) => {
  const dir = directory.split("/").pop() ?? ""

  const track = (sessionID: string, info: any) => {
    if (info?.parentID) subagents.add(sessionID)
    if (info?.title) titles.set(sessionID, info.title)
  }

  const trackMessage = (message: any) => {
    if (!message?.sessionID || message.role !== "assistant") return
    const text = (message.parts ?? [])
      .filter((p: any) => p.type === "text" && p.text)
      .map((p: any) => p.text)
      .join("\n")
      .trim()
    if (text) results.set(message.sessionID, text)
  }

  return {
    event: async ({ event }) => {
      const props = (event.properties ?? {}) as any
      if (event.type === "session.created" || event.type === "session.updated") {
        track(props.sessionID, props.info)
        if (props.info?.summary?.files) {
          const s = props.info.summary
          const files = `${s.files} file${s.files === 1 ? "" : "s"} changed`
          const diff = s.additions || s.deletions ? ` (+${s.additions}/-${s.deletions})` : ""
          titles.set(props.sessionID, `${titles.get(props.sessionID) ?? ""} — ${files}${diff}`)
        }
        return
      }
      if (event.type === "message.updated") {
        trackMessage(props.info)
        return
      }
      if (
        event.type === "session.idle" ||
        (event.type === "session.status" && props.status?.type === "idle")
      ) {
        if (subagents.has(props.sessionID)) return
        const title = titles.get(props.sessionID) ?? ""
        const result = results.get(props.sessionID) ?? ""
        await $`${BIN} opencode complete ${result || title} ${dir}`.nothrow().quiet()
      }
      if (event.type === "permission.asked") {
        if (subagents.has(props.sessionID)) return
        const what = props.patterns.join(", ") || props.permission
        await $`${BIN} opencode permission ${what} ${dir}`.nothrow().quiet()
      }
    },
  }
}
