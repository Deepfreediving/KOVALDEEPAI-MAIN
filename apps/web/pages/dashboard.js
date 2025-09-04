import { useState, useEffect } from 'react'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [diveLogs, setDiveLogs] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [showNewDiveForm, setShowNewDiveForm] = useState(false)
  const [newDive, setNewDive] = useState({
    date: new Date().toISOString().split('T')[0],
    discipline: 'CNF',
    targetDepth: '',
    reachedDepth: '',
    bottomTimeSeconds: '',
    location: '',
    notes: ''
  })

  useEffect(() => {
    // Check if user is logged in
    const userData = localStorage.getItem('kovalai_user')
    if (!userData) {
      window.location.href = '/login'
      return
    }
    
    setUser(JSON.parse(userData))
    loadDiveLogs()
  }, [])

  const loadDiveLogs = async () => {
    try {
      const response = await fetch('/api/supabase/dive-logs')
      const result = await response.json()
      
      if (response.ok) {
        setDiveLogs(result.diveLogs || [])
      } else {
        console.error('Failed to load dive logs:', result.error)
      }
    } catch (error) {
      console.error('Error loading dive logs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateDive = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch('/api/supabase/dive-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newDive)
      })

      const result = await response.json()

      if (response.ok) {
        setShowNewDiveForm(false)
        setNewDive({
          date: new Date().toISOString().split('T')[0],
          discipline: 'CNF',
          targetDepth: '',
          reachedDepth: '',
          bottomTimeSeconds: '',
          location: '',
          notes: ''
        })
        loadDiveLogs() // Reload the list
      } else {
        alert(`Error creating dive log: ${result.error}`)
      }
    } catch (error) {
      alert(`Error: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDiveChange = (e) => {
    const { name, value } = e.target
    setNewDive(prev => ({
      ...prev,
      [name]: value
    }))
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-blue-600">
            Welcome to KovalAI Dashboard
          </h1>
          <button
            onClick={() => {
              localStorage.removeItem('kovalai_user')
              localStorage.removeItem('kovalai_session')
              window.location.href = '/login'
            }}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Logout
          </button>
        </div>
        
        {user && (
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <h2 className="text-xl font-semibold mb-2">User Profile</h2>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Name:</strong> {user.user_metadata?.full_name || 'Not provided'}</p>
            <p><strong>Member since:</strong> {new Date(user.created_at).toLocaleDateString()}</p>
          </div>
        )}
      </div>

      <div className="bg-white shadow-lg rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Dive Logs</h2>
          <button
            onClick={() => setShowNewDiveForm(!showNewDiveForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            {showNewDiveForm ? 'Cancel' : 'New Dive Log'}
          </button>
        </div>

        {showNewDiveForm && (
          <form onSubmit={handleCreateDive} className="mb-6 p-4 border rounded-lg bg-gray-50">
            <h3 className="text-lg font-semibold mb-4">Create New Dive Log</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="date"
                name="date"
                value={newDive.date}
                onChange={handleDiveChange}
                required
                className="p-2 border rounded"
              />
              
              <select
                name="discipline"
                value={newDive.discipline}
                onChange={handleDiveChange}
                className="p-2 border rounded"
              >
                <option value="CNF">Constant No Fins (CNF)</option>
                <option value="CWT">Constant Weight (CWT)</option>
                <option value="CWTB">Constant Weight Bifins (CWTB)</option>
                <option value="FIM">Free Immersion (FIM)</option>
                <option value="STA">Static Apnea (STA)</option>
                <option value="DYN">Dynamic Apnea (DYN)</option>
              </select>
              
              <input
                type="number"
                name="targetDepth"
                placeholder="Target Depth (m)"
                value={newDive.targetDepth}
                onChange={handleDiveChange}
                className="p-2 border rounded"
              />
              
              <input
                type="number"
                name="reachedDepth"
                placeholder="Reached Depth (m)"
                value={newDive.reachedDepth}
                onChange={handleDiveChange}
                className="p-2 border rounded"
              />
              
              <input
                type="number"
                name="bottomTimeSeconds"
                placeholder="Bottom Time (seconds)"
                value={newDive.bottomTimeSeconds}
                onChange={handleDiveChange}
                className="p-2 border rounded"
              />
              
              <input
                type="text"
                name="location"
                placeholder="Location"
                value={newDive.location}
                onChange={handleDiveChange}
                className="p-2 border rounded"
              />
            </div>
            
            <textarea
              name="notes"
              placeholder="Notes"
              value={newDive.notes}
              onChange={handleDiveChange}
              className="w-full p-2 border rounded mt-4"
              rows="3"
            />
            
            <button
              type="submit"
              disabled={isLoading}
              className="bg-green-600 text-white px-6 py-2 rounded mt-4 hover:bg-green-700 disabled:bg-gray-400"
            >
              {isLoading ? 'Creating...' : 'Create Dive Log'}
            </button>
          </form>
        )}

        <div className="space-y-4">
          {diveLogs.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No dive logs yet. Create your first dive log to get started!
            </p>
          ) : (
            diveLogs.map((dive, index) => (
              <div key={dive.id || index} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold">
                    {dive.discipline} - {dive.location || 'Unknown Location'}
                  </h3>
                  <span className="text-sm text-gray-500">
                    {new Date(dive.date).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <strong>Target:</strong> {dive.target_depth || dive.targetDepth}m
                  </div>
                  <div>
                    <strong>Reached:</strong> {dive.reached_depth || dive.reachedDepth}m
                  </div>
                  <div>
                    <strong>Bottom Time:</strong> {dive.bottom_time || dive.bottomTimeSeconds}s
                  </div>
                  <div>
                    <strong>Total Time:</strong> {dive.total_dive_time || 'N/A'}s
                  </div>
                </div>
                
                {dive.notes && (
                  <p className="mt-2 text-sm text-gray-700">
                    <strong>Notes:</strong> {dive.notes}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
