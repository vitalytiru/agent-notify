import type { Plugin } from "@opencode-ai/plugin"

const BIN = "@agent-notify@"

const subagents = new Set<string>()
const titles = new Map<string, string>()

export const AgentNotifyPlugin: Plugin = async ({ $, directory }) => {
  const dir = directory.split("/").pop() ?? ""

  const track = (sessionID: string, info: any) => {
    if (info?.parentID) subagents.add(sessionID)
    if (info?.title) titles.set(sessionID, info.title)
  }

  return {
    event: async ({ event }) => {
      const props = (event.properties ?? {}) as any
      if (event.type === "session.created" || event.type === "session.updated") {
        track(props.sessionID, props.info)
        return
      }
      if (
        event.type === "session.idle" ||
        (event.type === "session.status" && props.status?.type === "idle")
      ) {
        if (subagents.has(props.sessionID)) return
        const title = titles.get(props.sessionID) ?? ""
        await $`${BIN} opencode complete ${title} ${dir}`.nothrow().quiet()
      }
      if (event.type === "permission.asked") {
        if (subagents.has(props.sessionID)) return
        const what = props.patterns.join(", ") || props.permission
        await $`${BIN} opencode permission ${what} ${dir}`.nothrow().quiet()
      }
    },
  }
}
