import type { Plugin } from "@opencode-ai/plugin"

const BIN = "@agent-notify@"

export const AgentNotifyPlugin: Plugin = async ({ $, client, directory }) => {
  const dir = directory.split("/").pop() ?? ""

  const isMainSession = async (sessionID: string) => {
    try {
      const session = await client.session.get({ path: { id: sessionID } })
      return !session?.parentID
    } catch {
      return true
    }
  }

  return {
    event: async ({ event }) => {
      const props = (event.properties ?? {}) as any
      if (
        event.type === "session.idle" ||
        (event.type === "session.status" && props.status?.type === "idle")
      ) {
        if (!(await isMainSession(props.sessionID))) return
        await $`${BIN} opencode complete "" ${dir}`.nothrow().quiet()
      }
      if (event.type === "permission.asked") {
        if (!(await isMainSession(props.sessionID))) return
        const what = props.patterns.join(", ") || props.permission
        await $`${BIN} opencode permission ${what} ${dir}`.nothrow().quiet()
      }
    },
  }
}
