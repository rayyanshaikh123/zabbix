import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getCollection } from "@/lib/mongo"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    // Only admins can view users
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 }
      )
    }

    const usersCollection = await getCollection("users")

    const users = await usersCollection
      .find({}, {
        projection: {
          password: 0 // Exclude password field
        }
      })
      .sort({ createdAt: -1 })
      .toArray()

    // Convert ObjectIds to strings for JSON serialization
    const formattedUsers = users.map(user => ({
      ...user,
      _id: user._id.toString()
    }))

    return NextResponse.json({
      users: formattedUsers,
      count: formattedUsers.length
    })

  } catch (error) {
    console.error("Users fetch error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
