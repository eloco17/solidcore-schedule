const express = require("express")
const bodyParser = require("body-parser")
const cors = require("cors")
const fs = require("fs").promises
const path = require("path")
const { CloudTasksClient } = require("@google-cloud/tasks")
const axios = require("axios")

const app = express()
const port = process.env.PORT || 8080

// Environment variables
const GCP_PROJECT = process.env.GCP_PROJECT || "el3152-cloud-2022"
const GCP_LOCATION = process.env.GCP_LOCATION || "us-east4"
const TASK_QUEUE = process.env.TASK_QUEUE || "pickleball-bot-queue"
const BOT_SERVICE_URL = process.env.BOT_SERVICE_URL || "https://pickleball-bot-726368815164.us-east4.run.app/run-bot"

// Initialize Cloud Tasks client
const tasksClient = new CloudTasksClient()

// Middleware
app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

// In-memory storage for tasks (in production, use a database)
let tasks = {}

// Helper function to save tasks to a file
async function saveTasks() {
  try {
    const dataDir = "/tmp"
    await fs.writeFile(path.join(dataDir, "tasks.json"), JSON.stringify(tasks))
  } catch (error) {
    console.error("Error saving tasks:", error)
  }
}

// Helper function to load tasks from a file
async function loadTasks() {
  try {
    const dataDir = "/tmp"
    const data = await fs.readFile(path.join(dataDir, "tasks.json"), "utf8")
    tasks = JSON.parse(data)
  } catch (error) {
    console.error("Error loading tasks (this is normal on first run):", error)
    tasks = {}
  }
}

// Function to calculate the correct sessionOpeningTime (7 days and 22 hours before)
function calculateSessionOpeningTime(sessionDate, sessionTime) {
  // Parse the date (format: YYYY-MM-DD)
  const [year, month, day] = sessionDate.split("-").map((num) => Number.parseInt(num, 10))

  // Parse the time (format: h:mm A)
  const [timePart, ampm] = sessionTime.split(" ")
  let [hours, minutes] = timePart.split(":").map((num) => Number.parseInt(num, 10))

  // Convert to 24-hour format
  if (ampm.toUpperCase() === "PM" && hours < 12) {
    hours += 12
  } else if (ampm.toUpperCase() === "AM" && hours === 12) {
    hours = 0
  }

  // Create a Date object for the session time
  const sessionDateTime = new Date(year, month - 1, day, hours, minutes)

  // Calculate the opening time (7 days and 22 hours before session time)
  const openingTime = new Date(sessionDateTime)
  openingTime.setDate(openingTime.getDate() - 7) // Subtract 7 days
  openingTime.setHours(openingTime.getHours() - 22) // Subtract 22 hours

  console.log("Session time:", sessionDateTime.toLocaleString())
  console.log("Opening time:", openingTime.toLocaleString())

  return openingTime.toISOString()
}

// Load tasks on startup
loadTasks().catch(console.error)

// Health check endpoint
app.get("/", (req, res) => {
  res.status(200).send("Pickleball Scheduler Service is running")
})

// Schedule a multi-user pickleball bot
app.post("/scheduleMultiUserPickleballBot", async (req, res) => {
  try {
    console.log("Received request to schedule multi-user pickleball bot")

    // Extract request data
    const {
      sessionId,
      scheduledTime,
      lifetime_username,
      lifetime_password,
      member_id,
      user_id,
      primary_name,
      secondary_name,
      title,
      day,
      date,
      min_start_time,
      locationName,
      desired_score,
      calculated_schedule_time,
    } = req.body

    // Validate required fields
    if (!sessionId || !lifetime_username || !lifetime_password || !date || !min_start_time) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: sessionId, lifetime_username, lifetime_password, date, and min_start_time are required",
      })
    }

    // Calculate the correct sessionOpeningTime
    const sessionOpeningTime = calculateSessionOpeningTime(date, min_start_time)

    // Use the calculated time or the provided time if available
    const finalScheduledTime = calculated_schedule_time || scheduledTime || sessionOpeningTime

    console.log(`Scheduling task for session ${sessionId} at ${finalScheduledTime}`)
    console.log(`Session opening time: ${sessionOpeningTime}`)

    // Find event ID for the class
    const scheduleDate = new Date(date);
    const eventId = await findEventId(scheduleDate, min_start_time, desired_score);
    
    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: "Could not find matching class for the specified time and level"
      });
    }

    console.log(`Found event ID: ${eventId} for the class`);

    // Create a Cloud Tasks queue path
    const parent = tasksClient.queuePath(GCP_PROJECT, GCP_LOCATION, TASK_QUEUE)

    // Convert the scheduled time to a timestamp
    const scheduledTimestamp = new Date(finalScheduledTime)

    // Prepare the task payload
    const payload = {
      lifetime_username,
      lifetime_password,
      member_id: member_id || "",
      user_id,
      primary_name: primary_name || "",
      secondary_name: secondary_name || "",
      title,
      day,
      date,
      min_start_time,
      location: locationName,
      desired_score,
      sessionId,
      eventId, // Add event ID to payload
    }

    // Create the task
    const task = {
      httpRequest: {
        httpMethod: "POST",
        url: BOT_SERVICE_URL,
        headers: {
          "Content-Type": "application/json",
        },
        body: Buffer.from(JSON.stringify(payload)).toString("base64"),
      },
      scheduleTime: {
        seconds: scheduledTimestamp.getTime() / 1000,
      },
    }

    try {
      // Create the Cloud Task
      const [response] = await tasksClient.createTask({ parent, task })
      console.log(`Task ${response.name} created successfully`)

      // Store the task in memory
      tasks[sessionId] = {
        sessionId,
        scheduledTime: finalScheduledTime,
        user_id,
        sessionData: {
          lifetime_username,
          lifetime_password,
          member_id: member_id || "", // Add member_id to session data
          user_id,
          primary_name: primary_name || "",
          secondary_name: secondary_name || "",
          title,
          day,
          date,
          min_start_time,
          location: locationName,
          desired_score,
        },
        sessionOpeningTime,
        createdAt: new Date().toISOString(),
        taskName: response.name,
      }

      // Save tasks to file
      await saveTasks()

      // Return success response
      return res.status(200).json({
        success: true,
        message: "Multi-user task scheduled successfully",
        taskName: response.name,
        scheduledTime: finalScheduledTime,
        sessionOpeningTime,
      })
    } catch (error) {
      console.error("Error creating Cloud Task:", error)

      // Fallback to in-memory storage if Cloud Tasks fails
      console.log("Falling back to in-memory storage")

      // Store the task in memory
      tasks[sessionId] = {
        sessionId,
        scheduledTime: finalScheduledTime,
        user_id,
        sessionData: {
          lifetime_username,
          lifetime_password,
          member_id: member_id || "", // Add member_id to session data
          user_id,
          primary_name: primary_name || "",
          secondary_name: secondary_name || "",
          title,
          day,
          date,
          min_start_time,
          location: locationName,
          desired_score,
        },
        sessionOpeningTime,
        createdAt: new Date().toISOString(),
        error: error.message,
      }

      // Save tasks to file
      await saveTasks()

      // Return success response with a warning
      return res.status(200).json({
        success: true,
        message: "Task scheduled in memory (Cloud Tasks failed)",
        warning: error.message,
        scheduledTime: finalScheduledTime,
        sessionOpeningTime,
      })
    }
  } catch (error) {
    console.error("Error scheduling multi-user pickleball bot:", error)
    return res.status(500).json({
      success: false,
      message: `Error scheduling task: ${error.message}`,
    })
  }
})

// Check job status - Support both GET and POST methods
app.get("/checkJobStatus", async (req, res) => {
  try {
    console.log("Received GET request to check job status")

    // Extract parameters from query params
    const sessionId = req.query.sessionId
    const userId = req.query.userId || req.query.user_id

    console.log(`Checking job status for sessionId: ${sessionId}, userId: ${userId}`)

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameter: sessionId",
      })
    }

    // Check if the task exists in our scheduler memory
    const taskExists = tasks[sessionId] !== undefined

    if (taskExists) {
      console.log(`Task ${sessionId} exists in scheduler memory`)

      // Calculate current status based on scheduled time
      const now = new Date()
      const scheduledTime = new Date(tasks[sessionId].scheduledTime)
      const sessionOpeningTime = new Date(tasks[sessionId].sessionOpeningTime)

      let status = "scheduled"
      let statusMessage = "Job is scheduled but has not started yet"

      if (now >= scheduledTime) {
        status = "in_progress"
        statusMessage = "First script should be running or completed"

        if (now >= sessionOpeningTime) {
          status = "completed"
          statusMessage = "Session booking should be completed"
        }
      }

      return res.status(200).json({
        success: true,
        exists: true,
        status: status,
        message: statusMessage,
        details: {
          scheduledTime: tasks[sessionId].scheduledTime,
          sessionData: tasks[sessionId].sessionData,
          sessionOpeningTime: tasks[sessionId].sessionOpeningTime,
          isMultiUser: true,
        },
      })
    } else {
      console.log(`Task ${sessionId} does not exist in scheduler memory`)

      return res.status(200).json({
        success: true,
        exists: false,
        status: "not_found",
        message: "No job found with the provided sessionId",
      })
    }
  } catch (error) {
    console.error("Error checking job status:", error)
    return res.status(500).json({
      success: false,
      message: `Error checking job status: ${error.message}`,
    })
  }
})

app.post("/checkJobStatus", async (req, res) => {
  try {
    console.log("Received POST request to check job status")

    // Extract parameters from request body
    const sessionId = req.body.sessionId
    const userId = req.body.userId || req.body.user_id

    console.log(`Checking job status for sessionId: ${sessionId}, userId: ${userId}`)

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameter: sessionId",
      })
    }

    // Check if the task exists in our scheduler memory
    const taskExists = tasks[sessionId] !== undefined

    if (taskExists) {
      console.log(`Task ${sessionId} exists in scheduler memory`)

      // Calculate current status based on scheduled time
      const now = new Date()
      const scheduledTime = new Date(tasks[sessionId].scheduledTime)
      const sessionOpeningTime = new Date(tasks[sessionId].sessionOpeningTime)

      let status = "scheduled"
      let statusMessage = "Job is scheduled but has not started yet"

      if (now >= scheduledTime) {
        status = "in_progress"
        statusMessage = "First script should be running or completed"

        if (now >= sessionOpeningTime) {
          status = "completed"
          statusMessage = "Session booking should be completed"
        }
      }

      return res.status(200).json({
        success: true,
        exists: true,
        status: status,
        message: statusMessage,
        details: {
          scheduledTime: tasks[sessionId].scheduledTime,
          sessionData: tasks[sessionId].sessionData,
          sessionOpeningTime: tasks[sessionId].sessionOpeningTime,
          isMultiUser: true,
        },
      })
    } else {
      console.log(`Task ${sessionId} does not exist in scheduler memory`)

      return res.status(200).json({
        success: true,
        exists: false,
        status: "not_found",
        message: "No job found with the provided sessionId",
      })
    }
  } catch (error) {
    console.error("Error checking job status:", error)
    return res.status(500).json({
      success: false,
      message: `Error checking job status: ${error.message}`,
    })
  }
})

// Delete job - Support both DELETE and POST methods
app.delete("/deleteJob", async (req, res) => {
  try {
    console.log("Received DELETE request to delete job")

    // Extract parameters from query params
    const sessionId = req.query.sessionId
    const userId = req.query.userId || req.query.user_id

    console.log(`Deleting job for sessionId: ${sessionId}, userId: ${userId}`)

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameter: sessionId",
      })
    }

    // Check if the task exists
    const taskExists = tasks[sessionId] !== undefined

    if (taskExists) {
      // If we have a Cloud Tasks task name, try to delete it
      if (tasks[sessionId].taskName) {
        try {
          await tasksClient.deleteTask({ name: tasks[sessionId].taskName })
          console.log(`Cloud Task ${tasks[sessionId].taskName} deleted successfully`)
        } catch (error) {
          console.error("Error deleting Cloud Task:", error)
          // Continue with local deletion even if Cloud Task deletion fails
        }
      }

      // Delete the task from memory
      delete tasks[sessionId]

      // Save tasks to file
      await saveTasks()

      console.log(`Task ${sessionId} deleted successfully`)

      return res.status(200).json({
        success: true,
        message: "Job deleted successfully",
      })
    } else {
      console.log(`Task ${sessionId} does not exist, nothing to delete`)

      return res.status(200).json({
        success: true,
        message: "Job does not exist, nothing to delete",
      })
    }
  } catch (error) {
    console.error("Error deleting job:", error)
    return res.status(500).json({
      success: false,
      message: `Error deleting job: ${error.message}`,
    })
  }
})

app.post("/deleteJob", async (req, res) => {
  try {
    console.log("Received POST request to delete job")

    // Extract parameters from request body
    const sessionId = req.body.sessionId
    const userId = req.body.userId || req.body.user_id

    console.log(`Deleting job for sessionId: ${sessionId}, userId: ${userId}`)

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameter: sessionId",
      })
    }

    // Check if the task exists
    const taskExists = tasks[sessionId] !== undefined

    if (taskExists) {
      // If we have a Cloud Tasks task name, try to delete it
      if (tasks[sessionId].taskName) {
        try {
          await tasksClient.deleteTask({ name: tasks[sessionId].taskName })
          console.log(`Cloud Task ${tasks[sessionId].taskName} deleted successfully`)
        } catch (error) {
          console.error("Error deleting Cloud Task:", error)
          // Continue with local deletion even if Cloud Task deletion fails
        }
      }

      // Delete the task from memory
      delete tasks[sessionId]

      // Save tasks to file
      await saveTasks()

      console.log(`Task ${sessionId} deleted successfully`)

      return res.status(200).json({
        success: true,
        message: "Job deleted successfully",
      })
    } else {
      console.log(`Task ${sessionId} does not exist, nothing to delete`)

      return res.status(200).json({
        success: true,
        message: "Job does not exist, nothing to delete",
      })
    }
  } catch (error) {
    console.error("Error deleting job:", error)
    return res.status(500).json({
      success: false,
      message: `Error deleting job: ${error.message}`,
    })
  }
})

// Catch-all route for debugging
app.all("*", (req, res) => {
  console.log(`Received ${req.method} request to ${req.path}`)
  console.log("Headers:", req.headers)
  console.log("Query parameters:", req.query)
  console.log("Body:", req.body)

  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.path}`,
    timestamp: new Date().toISOString(),
  })
})

// Start the server
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`)
})

// Handle shutdown gracefully
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server')
  server.close(() => {
    console.log('HTTP server closed')
  })
})

// Export for Cloud Run
module.exports = app

// Function to find event ID for a class
async function findEventId(targetDate, targetTime, minScore) {
  try {
    // Format date for API (YYYY-MM-DD)
    const formattedDate = targetDate.toISOString().split('T')[0];
    
    console.log(`Searching for class on ${formattedDate} at ${targetTime} with minScore ${minScore}`);
    
    // Make API call to get classes
    const response = await axios.get(
      `https://api.lifetimefitness.com/sys/registrations/V3/ux/event?startDate=${formattedDate}&endDate=${formattedDate}`,
      { headers: defaultHeaders }
    );
    
    if (response.status === 200) {
      const events = response.data;
      console.log(`Found ${events.length} events for the date`);
      
      // Find matching event
      const matchingEvent = events.find(event => {
        const eventTime = new Date(event.startDateTime);
        const eventHour = eventTime.getHours();
        const eventMinute = eventTime.getMinutes();
        const [targetHour, targetMinute] = targetTime.split(':').map(Number);
        
        // Log each event being checked
        console.log(`Checking event: ${event.eventId} at ${eventHour}:${eventMinute} with title: ${event.title}`);
        
        // Check if time matches
        const timeMatches = eventHour === targetHour && eventMinute === targetMinute;
        
        // Check if score range matches
        let scoreMatches = false;
        if (event.title && event.title.includes('Pickleball')) {
          // Extract score range from title (e.g., "2.75-3.25")
          const scoreMatch = event.title.match(/(\d+\.\d+)-(\d+\.\d+)/);
          if (scoreMatch) {
            const [_, minRange, maxRange] = scoreMatch;
            const targetScore = parseFloat(minScore);
            scoreMatches = targetScore >= parseFloat(minRange) && targetScore <= parseFloat(maxRange);
          }
        }
        
        return timeMatches && scoreMatches;
      });
      
      if (matchingEvent) {
        console.log(`Found matching event: ${matchingEvent.eventId} with title: ${matchingEvent.title}`);
        return matchingEvent.eventId;
      } else {
        console.log('No matching event found');
        return null;
      }
    } else {
      console.error(`API returned status ${response.status}`);
      return null;
    }
  } catch (error) {
    console.error('Error finding event ID:', error.message);
    if (error.response) {
      console.error('API Response:', error.response.data);
    }
    return null;
  }
}

