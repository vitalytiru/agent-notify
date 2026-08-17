import type { Plugin } from "@opencode-ai/plugin"

const BIN = "@agent-notify@"

export const AgentNotifyPlugin: Plugin = async ({ $, directory }) => {
  const dir = directory.split("/").pop() ?? ""
  return {
    event: async ({ event }) => {
      if (event.type === "session.idle") {
        await $`${BIN} opencode complete "" ${dir}`.nothrow().quiet()
      }
      if (event.type === "permission.asked") {
        const what = event.properties.patterns.join(", ") || event.properties.permission
        await $`${BIN} opencode permission ${what} ${dir}`.nothrow().quiet()
      }
    },
  }
}
