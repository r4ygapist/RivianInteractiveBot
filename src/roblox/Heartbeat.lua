--!nocheck
-- Place this script inside ServerScriptService in your Roblox game.

local HttpService = game:GetService("HttpService")
local RunService = game:GetService("RunService")
local Players = game:GetService("Players")
 
-- This URL must point to your bot's public web server endpoint for heartbeats.
local HEARTBEAT_URL = "https://rxavirus.onrender.com/heartbeat"

-- This should be a unique ID for the server instance. JobId is perfect for this.
local SERVER_ID = game.JobId

local lastHeartbeat = 0
-- How often to send a heartbeat, in seconds.
-- This MUST be less than the `heartbeatTimeout` in your bot's config.js (which is currently 30s).
local HEARTBEAT_INTERVAL = 15

RunService.Heartbeat:Connect(function(step)
	-- Use a simple timer to avoid sending requests every single frame
	if os.clock() - lastHeartbeat < HEARTBEAT_INTERVAL then
		return
	end

	lastHeartbeat = os.clock()

	-- Gather player data
	local playerList = {}
	for _, player in ipairs(Players:GetPlayers()) do
		table.insert(playerList, player.Name)
	end

	local payload = {
		serverId = SERVER_ID,
		players = playerList,
		playerCount = #playerList,
	}

	-- Asynchronously send the heartbeat to prevent lagging the game
	task.spawn(function()
		local success, result = pcall(function()
			return HttpService:RequestAsync({
				Url = HEARTBEAT_URL,
				Method = "POST",
				Headers = { ["Content-Type"] = "application/json" },
				Body = HttpService:JSONEncode(payload),
			})
		end)

		if success then
			if not result.Success then
				warn(("[Heartbeat] Request failed with code %d: %s | Body: %s"):format(result.StatusCode, result.StatusMessage, result.Body))
			end
		else
			warn("[Heartbeat] Failed to send heartbeat request:", result)
		end
	end)
end)