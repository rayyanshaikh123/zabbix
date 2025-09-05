"use client"

import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/protected-route"

interface User {
  _id: string
  name: string
  email: string
  role: string
  createdAt: string
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [promoting, setPromoting] = useState<string | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }

  const promoteUser = async (userId: string) => {
    setPromoting(userId)
    try {
      const response = await fetch('/api/admin/promote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, role: 'admin' }),
      })

      if (response.ok) {
        // Refresh users list
        fetchUsers()
      } else {
        const error = await response.json()
        alert('Failed to promote user: ' + error.error)
      }
    } catch (error) {
      alert('Failed to promote user')
    } finally {
      setPromoting(null)
    }
  }

  return (
    <ProtectedRoute requireRole="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-balance">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Administrative controls and system management
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-semibold mb-2">User Management</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Manage user accounts and permissions
            </p>
            <div className="text-sm text-muted-foreground">
              Total Users: {users.length}
            </div>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-semibold mb-2">System Settings</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Configure system-wide settings
            </p>
            <button className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
              System Config
            </button>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-semibold mb-2">Security Logs</h3>
            <p className="text-sm text-muted-foreground mb-4">
              View security events and audit logs
            </p>
            <button className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
              View Logs
            </button>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">User Management</h3>
          {loading ? (
            <div className="text-center py-4">Loading users...</div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <div key={user._id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Role: {user.role} | Joined: {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded ${
                      user.role === 'admin'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role}
                    </span>
                    {user.role !== 'admin' && (
                      <button
                        onClick={() => promoteUser(user._id)}
                        disabled={promoting === user._id}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        {promoting === user._id ? 'Promoting...' : 'Make Admin'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {users.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  No users found
                </div>
              )}
            </div>
          )}
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">Database Management</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium mb-2">Collections</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• users - User authentication data</li>
                <li>• metrics_ts - Time series metrics</li>
                <li>• events - Alert and event data</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Actions</h4>
              <div className="space-y-2">
                <button className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 text-sm">
                  Backup Database
                </button>
                <button className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 text-sm">
                  View Indexes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
