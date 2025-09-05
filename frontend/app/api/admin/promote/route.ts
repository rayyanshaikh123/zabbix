import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getCollection } from "@/lib/mongo"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    // Only admins can promote users
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 }
      )
    }

    const { userId, role = 'admin' } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      )
    }

    const usersCollection = await getCollection("users")

    const result = await usersCollection.updateOne(
      { _id: userId },
      { $set: { role } }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: `User promoted to ${role} successfully`,
      userId: userId
    })

  } catch (error) {
    console.error("Promotion error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
