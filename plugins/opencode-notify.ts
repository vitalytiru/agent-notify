import type { Plugin } from "@opencode-ai/plugin"
import { appendFileSync } from "node:fs"

const BIN = "@agent-notify@"
const DEBUG_LOG = "/tmp/opencode-plugin-debug.log"

const dbg = (msg: string) => {
  try {
    appendFileSync(DEBUG_LOG, `${new Date().toISOString()} ${msg}\n`)
  } catch {}
}

export const AgentNotifyPlugin: Plugin = async ({ $, client, directory }) => {
  const dir = directory.split("/").pop() ?? ""

  const isMainSession = async (sessionID: string) => {
    try {
      const session = await client.session.get({ path: { id: sessionID } })
      dbg(`session.get ${sessionID} -> parentID=${JSON.stringify(session?.parentID)}`)
      return !session?.parentID
    } catch (e) {
      dbg(`session.get ${sessionID} FAILED: ${String(e)}`)
      return true
    }
  }

  return {
    event: async ({ event }) => {
      dbg(`event ${event.type} sessionID=${JSON.stringify((event.properties as any)?.sessionID)}`)
      if (event.type === "session.idle") {
        const ok = await isMainSession(event.properties.sessionID)
        dbg(`session.idle ${event.properties.sessionID} isMain=${ok}`)
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
