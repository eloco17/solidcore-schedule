import path from "path"

// Configuration
const LIFETIME_URL = "https://my.lifetime.life/clubs/ny/penn-1/classes.html"
const CREDENTIALS = {
  username: process.env.LIFETIME_USERNAME,
  password: process.env.LIFETIME_PASSWORD,
}
const DATA_DIR = "./data"
const SCHEDULE_FILE = path.join(DATA_DIR, "schedule.json")
const BOOKINGS_FILE = path.join(DATA_DIR, "bookings.json")

// Rest of the code remains the same...

