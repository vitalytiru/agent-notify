import type { Plugin } from "@opencode-ai/plugin"

const BIN = "@agent-notify@"
const DEBUG_LOG = "/tmp/opencode-plugin-debug.log"

const dbg = async (msg: string) => {
  try {
    await Bun.write(DEBUG_LOG, `${new Date().toISOString()} ${msg}\n`, { append: true })
  } catch {}
}

export const AgentNotifyPlugin: Plugin = async ({ $, client, directory }) => {
  const dir = directory.split("/").pop() ?? ""

  const isMainSession = async (sessionID: string) => {
    try {
      const session = await client.session.get({ path: { id: sessionID } })
      await dbg(`session.get ${sessionID} -> parentID=${JSON.stringify(session?.parentID)}`)
      return !session?.parentID
    } catch (e) {
      await dbg(`session.get ${sessionID} FAILED: ${String(e)}`)
      return true
    }
  }

  return {
    event: async ({ event }) => {
      await dbg(`event ${event.type} sessionID=${JSON.stringify((event.properties as any)?.sessionID)}`)
      if (event.type === "session.idle") {
        const ok = await isMainSession(event.properties.sessionID)
        await dbg(`session.idle ${event.properties.sessionID} isMain=${ok}`)
        if (!ok) return
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
