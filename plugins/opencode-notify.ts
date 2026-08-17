import type { Plugin } from "@opencode-ai/plugin"

const BIN = "@agent-notify@"

export const AgentNotifyPlugin: Plugin = async ({ $, client, directory }) => {
  const dir = directory.split("/").pop() ?? ""

  const isMainSession = async (sessionID: string) => {
    try {
      const session = await client.session.get({ path: { id: sessionID } })
      return !session.parentID
    } catch {
      return true
    }
  }

  return {
    event: async ({ event }) => {
      if (event.type === "session.idle") {
        if (!(await isMainSession(event.properties.sessionID))) return
        await $`${BIN} opencode complete "" ${dir}`.nothrow().quiet()
      }
      if (event.type === "permission.asked") {
        if (!(await isMainSession(event.properties.sessionID))) return
        const what = event.properties.patterns.join(", ") || event.properties.permission
        await $`${BIN} opencode permission ${what} ${dir}`.nothrow().quiet()
      }
    },
  }
}
