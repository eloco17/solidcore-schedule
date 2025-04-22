import { NextResponse } from "next/server"
import { GITHUB_REPO } from "@/lib/config"

export async function GET() {
  try {
    // Test GitHub fetch
    console.log("Testing GitHub fetch...")
    const githubUrl = `https://raw.githubusercontent.com/${GITHUB_REPO.owner}/${GITHUB_REPO.repo}/${GITHUB_REPO.branch}/${GITHUB_REPO.dataPath}`

    const githubResponse = await fetch(githubUrl, { cache: "no-store" })

    let githubData = null
    let githubError = null

    if (githubResponse.ok) {
      try {
        githubData = await githubResponse.json()
      } catch (error) {
        githubError = `Error parsing GitHub data: ${error.message}`
      }
    } else {
      githubError = `GitHub response not OK: ${githubResponse.status} ${githubResponse.statusText}`
    }

    // Return debug info
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV,
      },
      github: {
        url: githubUrl,
        status: githubResponse.status,
        ok: githubResponse.ok,
        error: githubError,
        dataReceived: githubData ? true : false,
        dataSample: githubData
          ? {
              month: githubData.month,
              daysCount: githubData.days?.length,
              source: githubData._source,
            }
          : null,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Debug API error",
        message: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}

