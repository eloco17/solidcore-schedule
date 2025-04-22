import type { ScheduleData } from "@/lib/types"

// Get current date info for mock data
const today = new Date()
const month = today.toLocaleString("default", { month: "long" }).toUpperCase()
const currentDay = today.getDay() // 0 = Sunday, 1 = Monday, etc.

// Create mock data with sessions for each day of the week
const weekdays = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]
const days = []

for (let i = 0; i < 7; i++) {
  const dayOffset = (i - currentDay + 7) % 7 // Calculate day offset from today
  const sessionDate = new Date(today)
  sessionDate.setDate(today.getDate() + dayOffset)

  const dayName = weekdays[i]
  const date = sessionDate.getDate()

  // Create more sessions per day (5-7 sessions)
  const sessions = []
  const sessionCount = 5 + Math.floor(Math.random() * 3) // 5-7 sessions

  for (let j = 0; j < sessionCount; j++) {
    // Generate realistic start times throughout the day
    let hour, minute, period

    if (j === 0) {
      // Early morning session
      hour = 6 + Math.floor(Math.random() * 2)
      minute = Math.random() > 0.5 ? "00" : "30"
      period = "AM"
    } else if (j === 1) {
      // Mid-morning session
      hour = 8 + Math.floor(Math.random() * 2)
      minute = Math.random() > 0.5 ? "00" : "30"
      period = "AM"
    } else if (j === 2) {
      // Late morning session
      hour = 10 + Math.floor(Math.random() * 2)
      minute = Math.random() > 0.5 ? "00" : "30"
      period = "AM"
    } else if (j === 3) {
      // Early afternoon session
      hour = 1 + Math.floor(Math.random() * 2)
      minute = Math.random() > 0.5 ? "00" : "30"
      period = "PM"
    } else if (j === 4) {
      // Mid-afternoon session
      hour = 3 + Math.floor(Math.random() * 2)
      minute = Math.random() > 0.5 ? "00" : "30"
      period = "PM"
    } else {
      // Evening session
      hour = 5 + Math.floor(Math.random() * 3)
      minute = Math.random() > 0.5 ? "00" : "30"
      period = "PM"
    }

    const startTime = `${hour}:${minute} ${period}`

    // End time is 1.5 hours after start
    let endHour = hour + 1
    const endMinute = minute === "00" ? "30" : "00"
    let endPeriod = period

    if (endHour === 12 && period === "AM") {
      endPeriod = "PM"
    } else if (endHour > 12) {
      endHour = endHour - 12
      endPeriod = "PM"
    }

    const endTime = `${endHour}:${endMinute} ${endPeriod}`

    // Skill levels based on time of day
    let skillLevel
    if (j === 0 || j === 3) {
      skillLevel = "All Levels"
    } else if (j === 1 || j === 4) {
      skillLevel = "3.0+"
    } else if (j === 2) {
      skillLevel = "3.5-4.0"
    } else {
      skillLevel = "2.5-3.0"
    }

    // Status more likely on weekends and evenings
    let status
    if ((dayName === "SATURDAY" || dayName === "SUNDAY") && j >= 3) {
      status = Math.random() > 0.3 ? (Math.random() > 0.5 ? "Waitlist" : "Reserve") : undefined
    } else if (j >= 4) {
      status = Math.random() > 0.5 ? (Math.random() > 0.5 ? "Waitlist" : "Reserve") : undefined
    } else {
      status = Math.random() > 0.8 ? (Math.random() > 0.5 ? "Waitlist" : "Reserve") : undefined
    }

    // Court location varies by session
    let location
    if (j % 3 === 0) {
      location = "Indoor Pickleball Court 4 – 7, PENN 1"
    } else if (j % 3 === 1) {
      location = "Indoor Pickleball Court 1 – 3, PENN 1"
    } else {
      location = "Indoor Pickleball Court 6 – 7, PENN 1"
    }

    sessions.push({
      id: `${dayName.toLowerCase()}-${j}`,
      startTime,
      endTime,
      title: `Pickleball Open Play: ${skillLevel}`,
      subtitle: j % 2 === 0 ? "Drill Session: Bring Your Own Partner" : undefined,
      location,
      status,
    })
  }

  days.push({
    name: dayName,
    date,
    highlight: i === currentDay,
    sessions,
  })
}

// Sort days by date
days.sort((a, b) => a.date - b.date)

export const scheduleData: ScheduleData = {
  month,
  days,
  _source: "initial_mock",
}

